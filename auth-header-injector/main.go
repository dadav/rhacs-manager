package main

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
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
	ListenAddr           string
	UpstreamAddr         string
	ClusterName          string
	NamespaceAnnotation  string
	GroupAnnotation      string
	EmailAnnotation      string
	CacheTTLSeconds      int
	KubeAPIURL           string
	GroupCacheTTLSeconds int
	AllNamespacesGroups  []string // groups that get wildcard (*) namespace access
}

func loadConfig() config {
	c := config{
		ListenAddr:          envOrDefault("LISTEN_ADDR", ":8081"),
		UpstreamAddr:        envOrDefault("UPSTREAM_ADDR", "http://localhost:8080"),
		ClusterName:         os.Getenv("CLUSTER_NAME"),
		NamespaceAnnotation: envOrDefault("NAMESPACE_ANNOTATION", "rhacs-manager.io/users"),
		GroupAnnotation:     envOrDefault("GROUP_ANNOTATION", "rhacs-manager.io/groups"),
		EmailAnnotation:     envOrDefault("EMAIL_ANNOTATION", "rhacs-manager.io/escalation-email"),
		CacheTTLSeconds:     300,
		KubeAPIURL:          envOrDefault("KUBE_API_URL", "https://kubernetes.default.svc"),
		GroupCacheTTLSeconds: 60,
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
	if v := os.Getenv("GROUP_CACHE_TTL_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			c.GroupCacheTTLSeconds = n
		}
	}
	if v := os.Getenv("ALL_NAMESPACES_GROUPS"); v != "" {
		for _, g := range strings.Split(v, ",") {
			g = strings.ToLower(strings.TrimSpace(g))
			if g != "" {
				c.AllNamespacesGroups = append(c.AllNamespacesGroups, g)
			}
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

// nsCache maps lowercase usernames and group names to the namespaces they can access,
// and namespaces to their escalation email addresses.
type nsCache struct {
	mu        sync.RWMutex
	userToNS  map[string][]string // username -> []namespace
	groupToNS map[string][]string // group -> []namespace
	nsEmails  map[string]string   // namespace -> escalation email
	fetchedAt time.Time
}

func (c *nsCache) namespacesForUser(username string) []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.userToNS[strings.ToLower(username)]
}

func (c *nsCache) namespacesForGroups(groups []string) []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	seen := make(map[string]bool)
	var result []string
	for _, g := range groups {
		for _, ns := range c.groupToNS[strings.ToLower(strings.TrimSpace(g))] {
			if !seen[ns] {
				seen[ns] = true
				result = append(result, ns)
			}
		}
	}
	return result
}

func (c *nsCache) emailForNamespace(ns string) string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.nsEmails[ns]
}

func (c *nsCache) update(userToNS, groupToNS map[string][]string, nsEmails map[string]string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.userToNS = userToNS
	c.groupToNS = groupToNS
	c.nsEmails = nsEmails
	c.fetchedAt = time.Now()
}

// tokenGroupsCache caches token -> groups lookups to avoid per-request API calls.
type tokenGroupsCache struct {
	mu      sync.RWMutex
	entries map[string]tokenGroupsEntry
	ttl     time.Duration
}

type tokenGroupsEntry struct {
	groups    []string
	fetchedAt time.Time
}

func newTokenGroupsCache(ttl time.Duration) *tokenGroupsCache {
	return &tokenGroupsCache{
		entries: make(map[string]tokenGroupsEntry),
		ttl:     ttl,
	}
}

func (c *tokenGroupsCache) get(token string) ([]string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	entry, ok := c.entries[token]
	if !ok || time.Since(entry.fetchedAt) > c.ttl {
		return nil, false
	}
	return entry.groups, true
}

func (c *tokenGroupsCache) set(token string, groups []string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[token] = tokenGroupsEntry{groups: groups, fetchedAt: time.Now()}

	// Evict expired entries periodically (when cache grows large).
	if len(c.entries) > 1000 {
		now := time.Now()
		for k, v := range c.entries {
			if now.Sub(v.fetchedAt) > c.ttl {
				delete(c.entries, k)
			}
		}
	}
}

// openShiftUserResponse is the relevant subset of the OpenShift user API response.
type openShiftUserResponse struct {
	Groups []string `json:"groups"`
}

// fetchUserGroups calls the OpenShift user API to get the groups for a token.
func fetchUserGroups(kubeAPIURL, token string, httpClient *http.Client) ([]string, error) {
	reqURL := kubeAPIURL + "/apis/user.openshift.io/v1/users/~"
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call user API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return nil, fmt.Errorf("user API returned %d: %s", resp.StatusCode, string(body))
	}

	var user openShiftUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("decode user response: %w", err)
	}
	return user.Groups, nil
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
	groupToNS := make(map[string][]string)
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

		// Group annotation
		groupAnnotation, ok := ns.Annotations[cfg.GroupAnnotation]
		if ok && strings.TrimSpace(groupAnnotation) != "" {
			for _, raw := range strings.Split(groupAnnotation, ",") {
				group := strings.ToLower(strings.TrimSpace(raw))
				if group != "" {
					groupToNS[group] = append(groupToNS[group], ns.Name)
				}
			}
		}

		// Email annotation
		email, ok := ns.Annotations[cfg.EmailAnnotation]
		if ok && strings.TrimSpace(email) != "" {
			nsEmails[ns.Name] = strings.TrimSpace(email)
		}
	}

	cache.update(userToNS, groupToNS, nsEmails)
	slog.Info("namespace cache refreshed",
		"mapped_users", len(userToNS),
		"mapped_groups", len(groupToNS),
		"namespaces_with_email", len(nsEmails),
	)
}

func main() {
	cfg := loadConfig()

	slog.Info("starting auth-header-injector",
		"listen", cfg.ListenAddr,
		"upstream", cfg.UpstreamAddr,
		"cluster", cfg.ClusterName,
		"annotation", cfg.NamespaceAnnotation,
		"group_annotation", cfg.GroupAnnotation,
		"email_annotation", cfg.EmailAnnotation,
		"cache_ttl_seconds", cfg.CacheTTLSeconds,
		"group_cache_ttl_seconds", cfg.GroupCacheTTLSeconds,
		"all_namespaces_groups", cfg.AllNamespacesGroups,
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
		userToNS:  make(map[string][]string),
		groupToNS: make(map[string][]string),
		nsEmails:  make(map[string]string),
	}

	tokenCache := newTokenGroupsCache(time.Duration(cfg.GroupCacheTTLSeconds) * time.Second)

	// HTTP client for OpenShift user API calls (skip TLS verification for in-cluster).
	apiHTTPClient := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
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
			r.Header.Set("X-Forwarded-Groups", "")
			proxy.ServeHTTP(w, r)
			return
		}

		// Resolve user-based namespaces.
		userNamespaces := cache.namespacesForUser(user)

		// Resolve group-based namespaces via OpenShift user API.
		var userGroups []string
		accessToken := r.Header.Get("X-Forwarded-Access-Token")
		if accessToken != "" {
			groups, ok := tokenCache.get(accessToken)
			if !ok {
				var err error
				groups, err = fetchUserGroups(cfg.KubeAPIURL, accessToken, apiHTTPClient)
				if err != nil {
					slog.Warn("failed to fetch user groups", "user", user, "error", err)
					// Cache empty result to avoid re-hitting the API on every request.
					groups = []string{}
					tokenCache.set(accessToken, groups)
				} else {
					tokenCache.set(accessToken, groups)
					slog.Debug("fetched user groups from API", "user", user, "groups", groups)
				}
			}
			userGroups = groups
		}

		// Also check X-Forwarded-Groups header from oauth-proxy (if already set).
		if fwdGroups := r.Header.Get("X-Forwarded-Groups"); fwdGroups != "" && len(userGroups) == 0 {
			for _, g := range strings.Split(fwdGroups, ",") {
				g = strings.TrimSpace(g)
				if g != "" {
					userGroups = append(userGroups, g)
				}
			}
		}

		// Check if user belongs to an all-namespaces group.
		if len(cfg.AllNamespacesGroups) > 0 {
			allNSGroupSet := make(map[string]bool, len(cfg.AllNamespacesGroups))
			for _, g := range cfg.AllNamespacesGroups {
				allNSGroupSet[g] = true
			}
			for _, g := range userGroups {
				if allNSGroupSet[strings.ToLower(strings.TrimSpace(g))] {
					r.Header.Set("X-Forwarded-Namespaces", "*")
					r.Header.Set("X-Forwarded-Namespace-Emails", "")
					if len(userGroups) > 0 {
						r.Header.Set("X-Forwarded-Groups", strings.Join(userGroups, ","))
					}
					slog.Debug("wildcard namespace access",
						"user", user,
						"group", g,
					)
					proxy.ServeHTTP(w, r)
					return
				}
			}
		}

		groupNamespaces := cache.namespacesForGroups(userGroups)

		// Merge and deduplicate namespaces.
		seen := make(map[string]bool, len(userNamespaces))
		allNamespaces := make([]string, 0, len(userNamespaces)+len(groupNamespaces))
		for _, ns := range userNamespaces {
			seen[ns] = true
			allNamespaces = append(allNamespaces, ns)
		}
		for _, ns := range groupNamespaces {
			if !seen[ns] {
				seen[ns] = true
				allNamespaces = append(allNamespaces, ns)
			}
		}

		var nsPairs []string
		var emailPairs []string
		for _, ns := range allNamespaces {
			nsPairs = append(nsPairs, ns+":"+cfg.ClusterName)
			if email := cache.emailForNamespace(ns); email != "" {
				emailPairs = append(emailPairs, ns+":"+cfg.ClusterName+"="+email)
			}
		}
		r.Header.Set("X-Forwarded-Namespaces", strings.Join(nsPairs, ","))
		r.Header.Set("X-Forwarded-Namespace-Emails", strings.Join(emailPairs, ","))

		// Set X-Forwarded-Groups from the resolved user groups.
		if len(userGroups) > 0 {
			r.Header.Set("X-Forwarded-Groups", strings.Join(userGroups, ","))
		}

		slog.Debug("resolved namespaces",
			"user", user,
			"groups", userGroups,
			"namespaces", strings.Join(nsPairs, ","),
		)
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
