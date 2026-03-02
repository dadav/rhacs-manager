package main

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

type config struct {
	ListenAddr          string
	UpstreamAddr        string
	ClusterName         string
	NamespaceAnnotation string
	EmailAnnotation     string
	CacheTTLSeconds     int
}

func loadConfig() config {
	c := config{
		ListenAddr:          envOrDefault("LISTEN_ADDR", ":8081"),
		UpstreamAddr:        envOrDefault("UPSTREAM_ADDR", "http://localhost:8080"),
		ClusterName:         os.Getenv("CLUSTER_NAME"),
		NamespaceAnnotation: envOrDefault("NAMESPACE_ANNOTATION", "rhacs-manager.io/users"),
		EmailAnnotation:     envOrDefault("EMAIL_ANNOTATION", "rhacs-manager.io/escalation-email"),
		CacheTTLSeconds:     300,
	}
	if c.ClusterName == "" {
		slog.Error("CLUSTER_NAME is required")
		os.Exit(1)
	}
	if v := os.Getenv("CACHE_TTL_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			c.CacheTTLSeconds = n
		}
	}
	return c
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// nsCache maps lowercase usernames to the namespaces they can access,
// and namespaces to their escalation email addresses.
type nsCache struct {
	mu        sync.RWMutex
	userToNS  map[string][]string // username -> []namespace
	nsEmails  map[string]string   // namespace -> escalation email
	fetchedAt time.Time
}

func (c *nsCache) namespacesForUser(username string) []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.userToNS[strings.ToLower(username)]
}

func (c *nsCache) emailForNamespace(ns string) string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.nsEmails[ns]
}

func (c *nsCache) update(userToNS map[string][]string, nsEmails map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.userToNS = userToNS
	c.nsEmails = nsEmails
	c.fetchedAt = time.Now()
}

// refreshLoop periodically fetches namespace annotations and rebuilds the cache.
func refreshLoop(ctx context.Context, client kubernetes.Interface, cache *nsCache, cfg config) {
	ticker := time.NewTicker(time.Duration(cfg.CacheTTLSeconds) * time.Second)
	defer ticker.Stop()

	// Initial fetch.
	fetchAndUpdate(ctx, client, cache, cfg)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			fetchAndUpdate(ctx, client, cache, cfg)
		}
	}
}

func fetchAndUpdate(ctx context.Context, client kubernetes.Interface, cache *nsCache, cfg config) {
	nsList, err := client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		slog.Error("failed to list namespaces", "error", err)
		return // keep serving stale data
	}

	userToNS := make(map[string][]string)
	nsEmails := make(map[string]string)

	for _, ns := range nsList.Items {
		// User annotation
		annotation, ok := ns.Annotations[cfg.NamespaceAnnotation]
		if ok && strings.TrimSpace(annotation) != "" {
			for _, raw := range strings.Split(annotation, ",") {
				username := strings.ToLower(strings.TrimSpace(raw))
				if username != "" {
					userToNS[username] = append(userToNS[username], ns.Name)
				}
			}
		}

		// Email annotation
		email, ok := ns.Annotations[cfg.EmailAnnotation]
		if ok && strings.TrimSpace(email) != "" {
			nsEmails[ns.Name] = strings.TrimSpace(email)
		}
	}

	cache.update(userToNS, nsEmails)
	slog.Info("namespace cache refreshed",
		"namespaces_with_users", len(userToNS),
		"namespaces_with_email", len(nsEmails),
		"mapped_users", len(userToNS),
	)
}

func main() {
	cfg := loadConfig()

	slog.Info("starting namespace-resolver",
		"listen", cfg.ListenAddr,
		"upstream", cfg.UpstreamAddr,
		"cluster", cfg.ClusterName,
		"annotation", cfg.NamespaceAnnotation,
		"email_annotation", cfg.EmailAnnotation,
		"cache_ttl_seconds", cfg.CacheTTLSeconds,
	)

	// K8s client (in-cluster).
	restCfg, err := rest.InClusterConfig()
	if err != nil {
		slog.Error("failed to get in-cluster config", "error", err)
		os.Exit(1)
	}
	clientset, err := kubernetes.NewForConfig(restCfg)
	if err != nil {
		slog.Error("failed to create k8s client", "error", err)
		os.Exit(1)
	}

	cache := &nsCache{
		userToNS: make(map[string][]string),
		nsEmails: make(map[string]string),
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go refreshLoop(ctx, clientset, cache, cfg)

	// Reverse proxy to upstream (nginx).
	upstream, err := url.Parse(cfg.UpstreamAddr)
	if err != nil {
		slog.Error("invalid UPSTREAM_ADDR", "error", err)
		os.Exit(1)
	}
	proxy := httputil.NewSingleHostReverseProxy(upstream)

	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		user := r.Header.Get("X-Forwarded-User")
		if user == "" {
			// No user header -- forward with empty namespaces.
			r.Header.Set("X-Forwarded-Namespaces", "")
			r.Header.Set("X-Forwarded-Namespace-Emails", "")
			proxy.ServeHTTP(w, r)
			return
		}

		namespaces := cache.namespacesForUser(user)
		var nsPairs []string
		var emailPairs []string
		for _, ns := range namespaces {
			nsPairs = append(nsPairs, ns+":"+cfg.ClusterName)
			if email := cache.emailForNamespace(ns); email != "" {
				emailPairs = append(emailPairs, ns+":"+cfg.ClusterName+"="+email)
			}
		}
		r.Header.Set("X-Forwarded-Namespaces", strings.Join(nsPairs, ","))
		r.Header.Set("X-Forwarded-Namespace-Emails", strings.Join(emailPairs, ","))

		slog.Debug("resolved namespaces", "user", user, "namespaces", strings.Join(nsPairs, ","))
		proxy.ServeHTTP(w, r)
	})

	server := &http.Server{
		Addr:         cfg.ListenAddr,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	slog.Info("listening", "addr", cfg.ListenAddr)
	if err := server.ListenAndServe(); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
