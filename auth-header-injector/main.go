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
	"sync/atomic"
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
	// TrustForwardedGroups allows falling back to the inbound X-Forwarded-Groups
	// header when token-based group lookup yields nothing. Off by default: a client
	// could otherwise spoof the header to claim sec-team / all-namespaces membership.
	// Only enable when this injector exclusively receives traffic from oauth-proxy.
	TrustForwardedGroups bool
}

func loadConfig() config {
	c := config{
		ListenAddr:           envOrDefault("LISTEN_ADDR", ":8081"),
		UpstreamAddr:         envOrDefault("UPSTREAM_ADDR", "http://localhost:8080"),
		ClusterName:          os.Getenv("CLUSTER_NAME"),
		NamespaceAnnotation:  envOrDefault("NAMESPACE_ANNOTATION", "rhacs-manager.io/users"),
		GroupAnnotation:      envOrDefault("GROUP_ANNOTATION", "rhacs-manager.io/groups"),
		EmailAnnotation:      envOrDefault("EMAIL_ANNOTATION", "rhacs-manager.io/escalation-email"),
		CacheTTLSeconds:      300,
		KubeAPIURL:           envOrDefault("KUBE_API_URL", "https://kubernetes.default.svc"),
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
	if v := os.Getenv("TRUST_FORWARDED_GROUPS"); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			c.TrustForwardedGroups = b
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

// cacheStaleAfterRefreshes is how many refresh intervals the namespace cache may
// miss before it fails closed. A failed refresh keeps the previous data, so
// without this limit revoked annotations would stay granted indefinitely.
const cacheStaleAfterRefreshes = 3

// staleWarnInterval rate-limits the "namespace cache stale" warning.
const staleWarnInterval = time.Minute

// nsCache maps lowercase usernames and group names to the namespaces they can access,
// and namespaces to their escalation email addresses.
type nsCache struct {
	mu        sync.RWMutex
	userToNS  map[string][]string // username -> []namespace
	groupToNS map[string][]string // group -> []namespace
	nsEmails  map[string]string   // namespace -> escalation email
	fetchedAt time.Time
	// maxAge is how old fetchedAt may get before reads return nothing (fail
	// closed). Zero disables the check.
	maxAge time.Duration
	// lastStaleWarn holds the UnixNano of the last stale warning.
	lastStaleWarn atomic.Int64
}

func newNSCache(maxAge time.Duration) *nsCache {
	return &nsCache{
		userToNS:  make(map[string][]string),
		groupToNS: make(map[string][]string),
		nsEmails:  make(map[string]string),
		maxAge:    maxAge,
	}
}

// usable reports whether the cached data may be served. The caller holds c.mu.
func (c *nsCache) usable() bool {
	if c.maxAge <= 0 {
		return true
	}
	if !c.fetchedAt.IsZero() && time.Since(c.fetchedAt) <= c.maxAge {
		return true
	}
	now := time.Now().UnixNano()
	last := c.lastStaleWarn.Load()
	if now-last >= int64(staleWarnInterval) && c.lastStaleWarn.CompareAndSwap(last, now) {
		slog.Warn("namespace cache stale, serving no annotation-based namespaces",
			"fetched_at", c.fetchedAt,
			"max_age", c.maxAge,
		)
	}
	return false
}

func (c *nsCache) namespacesForUser(username string) []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if !c.usable() {
		return nil
	}
	return c.userToNS[strings.ToLower(username)]
}

func (c *nsCache) namespacesForGroups(groups []string) []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if !c.usable() {
		return nil
	}

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
	if !c.usable() {
		return ""
	}
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
// unresolvedInfoTTL is how long a partial user lookup (email unresolved) is
// cached, and the Retry-After hint when the user lookup itself fails. It is
// short so a transient API failure is retried soon.
const unresolvedInfoTTL = 5 * time.Second

// identityLookupTimeout bounds the whole identity email lookup for one token, so
// a stalled Identity API never holds a request back for long.
const identityLookupTimeout = 5 * time.Second

// userInfo is everything resolved server-side for one access token.
type userInfo struct {
	Groups   []string
	FullName string
	// Email is the first non-empty extra.email of the user's OpenShift identities.
	Email string
	// EmailResolved is false when the identity lookup failed or timed out. An
	// empty Email with EmailResolved=true means the IdP provides no email.
	EmailResolved bool
}

type tokenInfoCache struct {
	mu      sync.RWMutex
	entries map[string]tokenInfoEntry
	ttl     time.Duration
}

type tokenInfoEntry struct {
	info      userInfo
	fetchedAt time.Time
	ttl       time.Duration
}

func newTokenInfoCache(ttl time.Duration) *tokenInfoCache {
	return &tokenInfoCache{
		entries: make(map[string]tokenInfoEntry),
		ttl:     ttl,
	}
}

func (c *tokenInfoCache) get(token string) (userInfo, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	entry, ok := c.entries[token]
	if !ok || time.Since(entry.fetchedAt) > entry.ttl {
		return userInfo{}, false
	}
	return entry.info, true
}

func (c *tokenInfoCache) set(token string, info userInfo) {
	c.setWithTTL(token, info, c.ttl)
}

func (c *tokenInfoCache) setWithTTL(token string, info userInfo, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[token] = tokenInfoEntry{info: info, fetchedAt: time.Now(), ttl: ttl}

	// Evict expired entries periodically (when cache grows large).
	if len(c.entries) > 1000 {
		now := time.Now()
		for k, v := range c.entries {
			if now.Sub(v.fetchedAt) > v.ttl {
				delete(c.entries, k)
			}
		}
	}
}

// openShiftUserResponse is the relevant subset of the OpenShift user API response.
type openShiftUserResponse struct {
	FullName   string   `json:"fullName"`
	Groups     []string `json:"groups"`
	Identities []string `json:"identities"`
}

// openShiftIdentityResponse is the relevant subset of an OpenShift Identity.
// extra.email is filled by OIDC/LDAP/GitHub/Google identity providers.
type openShiftIdentityResponse struct {
	Extra map[string]string `json:"extra"`
}

// fetchUserInfo calls the OpenShift user API (users/~) with the user's own token.
func fetchUserInfo(ctx context.Context, kubeAPIURL, token string, httpClient *http.Client) (openShiftUserResponse, error) {
	reqURL := kubeAPIURL + "/apis/user.openshift.io/v1/users/~"
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return openShiftUserResponse{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := httpClient.Do(req)
	if err != nil {
		return openShiftUserResponse{}, fmt.Errorf("call user API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return openShiftUserResponse{}, fmt.Errorf("user API returned %d: %s", resp.StatusCode, string(body))
	}

	var user openShiftUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return openShiftUserResponse{}, fmt.Errorf("decode user response: %w", err)
	}
	return user, nil
}

// resolveIdentityEmail returns the first non-empty extra.email across the user's
// identities, in order. Any fetch or decode error aborts with that error, so a
// partial lookup is never reported as "no email".
func resolveIdentityEmail(
	ctx context.Context,
	identities []string,
	getIdentity func(ctx context.Context, name string) ([]byte, error),
) (string, error) {
	for _, name := range identities {
		if err := ctx.Err(); err != nil {
			return "", fmt.Errorf("identity lookup aborted: %w", err)
		}
		raw, err := getIdentity(ctx, name)
		if err != nil {
			return "", fmt.Errorf("get identity %q: %w", name, err)
		}
		var identity openShiftIdentityResponse
		if err := json.Unmarshal(raw, &identity); err != nil {
			return "", fmt.Errorf("decode identity %q: %w", name, err)
		}
		if email := strings.TrimSpace(identity.Extra["email"]); email != "" {
			return email, nil
		}
	}
	return "", nil
}

// resolveUserInfo fetches groups and full name with the user's token, then the
// identity email with one bounded deadline. An email failure keeps groups and
// full name and only marks the email unresolved.
func resolveUserInfo(
	ctx context.Context,
	token string,
	fetchUser func(ctx context.Context, token string) (openShiftUserResponse, error),
	getIdentity func(ctx context.Context, name string) ([]byte, error),
	timeout time.Duration,
) (userInfo, error) {
	user, err := fetchUser(ctx, token)
	if err != nil {
		return userInfo{}, err
	}
	info := userInfo{Groups: user.Groups, FullName: strings.TrimSpace(user.FullName)}

	idCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	email, err := resolveIdentityEmail(idCtx, user.Identities, getIdentity)
	if err != nil {
		slog.Warn("failed to resolve identity email", "identities", user.Identities, "error", err)
		return info, nil
	}
	info.Email = email
	info.EmailResolved = true
	return info, nil
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
		return // keep the previous data; reads fail closed once it exceeds the cache maxAge
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

// newProxyHandler builds the request handler that resolves namespaces/groups and
// proxies upstream. fetchInfo resolves a token's groups, full name, and identity
// email (injected so tests can stub it without a live API).
func newProxyHandler(
	proxy http.Handler,
	cache *nsCache,
	tokenCache *tokenInfoCache,
	cfg config,
	fetchInfo func(ctx context.Context, token string) (userInfo, error),
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Full name and email are server-resolved from the OpenShift User and
		// Identity APIs. Strip any inbound value up front so a client can never
		// spoof them to the upstream. This also drops oauth-proxy's placeholder
		// X-Forwarded-Email (<user>@cluster.local), which is not a real mailbox.
		r.Header.Del("X-Forwarded-Full-Name")
		r.Header.Del("X-Forwarded-Email")
		// The origin cluster tells the backend which peer clusters (cross-cluster
		// access sets) may add namespaces. Always overwrite any client value.
		r.Header.Set("X-Forwarded-Cluster", cfg.ClusterName)

		user := r.Header.Get("X-Forwarded-User")
		if user == "" {
			// No user header -- forward with empty namespaces/groups so a client
			// cannot smuggle any of these values to the upstream.
			r.Header.Set("X-Forwarded-Namespaces", "")
			r.Header.Set("X-Forwarded-Namespace-Emails", "")
			r.Header.Set("X-Forwarded-Groups", "")
			proxy.ServeHTTP(w, r)
			return
		}

		// Resolve user-based namespaces.
		userNamespaces := cache.namespacesForUser(user)

		// Resolve groups, full name, and email via the OpenShift APIs.
		var info userInfo
		accessToken := r.Header.Get("X-Forwarded-Access-Token")
		if accessToken != "" {
			cached, ok := tokenCache.get(accessToken)
			if ok {
				info = cached
			} else {
				fetched, err := fetchInfo(r.Context(), accessToken)
				if ctxErr := r.Context().Err(); ctxErr != nil {
					// The client went away mid-lookup. The result says nothing about
					// the token, so neither cache it nor forward a request built from
					// it: empty groups would downgrade namespaces and role upstream.
					slog.Debug("request cancelled during user lookup", "user", user, "error", ctxErr)
					return
				}
				switch {
				case err != nil:
					// Fail closed: forwarding with empty groups would drop group-based
					// namespaces, wildcard access, and sec-team membership, and the
					// backend would persist the downgraded role. Nothing is cached, so
					// the next request retries the lookup.
					slog.Warn("failed to fetch user info", "user", user, "error", err)
					w.Header().Set("Retry-After", strconv.Itoa(int(unresolvedInfoTTL.Seconds())))
					http.Error(w, "user lookup failed, retry shortly", http.StatusServiceUnavailable)
					return
				case !fetched.EmailResolved:
					// Groups and full name are usable; only the email lookup failed.
					// Retry it soon instead of caching the gap for the full TTL.
					info = fetched
					tokenCache.setWithTTL(accessToken, info, unresolvedInfoTTL)
				default:
					info = fetched
					tokenCache.set(accessToken, info)
					slog.Debug("fetched user info from API", "user", user, "groups", info.Groups)
				}
			}
		}
		userGroups := info.Groups

		// Set the resolved full name (empty is fine; the backend falls back to
		// the username for display).
		if info.FullName != "" {
			r.Header.Set("X-Forwarded-Full-Name", info.FullName)
		}

		// Set the resolved email only when known. An absent header tells the
		// backend to keep the stored address.
		if info.EmailResolved && info.Email != "" {
			r.Header.Set("X-Forwarded-Email", info.Email)
		}

		// The inbound X-Forwarded-Groups header is client-controllable, so it is
		// only used as a fallback when explicitly trusted. When untrusted, strip it
		// up front so a spoofed value can never reach the upstream via any later
		// path (e.g. the wildcard branch or the empty-userGroups case below).
		if cfg.TrustForwardedGroups {
			if fwdGroups := r.Header.Get("X-Forwarded-Groups"); fwdGroups != "" && len(userGroups) == 0 {
				for _, g := range strings.Split(fwdGroups, ",") {
					g = strings.TrimSpace(g)
					if g != "" {
						userGroups = append(userGroups, g)
					}
				}
			}
		} else {
			r.Header.Del("X-Forwarded-Groups")
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
	}
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
		"trust_forwarded_groups", cfg.TrustForwardedGroups,
	)

	// K8s client (in-cluster).
	restCfg, err := rest.InClusterConfig()
	if err != nil {
		slog.Error("failed to get in-cluster config", "error", err)
		os.Exit(1)
	}
	// Backstop for every clientset call; client-go's zero default means no timeout.
	restCfg.Timeout = 10 * time.Second
	clientset, err := kubernetes.NewForConfig(restCfg)
	if err != nil {
		slog.Error("failed to create k8s client", "error", err)
		os.Exit(1)
	}

	cache := newNSCache(cacheStaleAfterRefreshes * time.Duration(cfg.CacheTTLSeconds) * time.Second)

	tokenCache := newTokenInfoCache(time.Duration(cfg.GroupCacheTTLSeconds) * time.Second)

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

	fetchUser := func(ctx context.Context, token string) (openShiftUserResponse, error) {
		return fetchUserInfo(ctx, cfg.KubeAPIURL, token, apiHTTPClient)
	}
	// Identities are read with the service account: user tokens cannot get them.
	getIdentity := func(ctx context.Context, name string) ([]byte, error) {
		return clientset.CoreV1().RESTClient().Get().
			AbsPath("/apis/user.openshift.io/v1/identities", name).
			DoRaw(ctx)
	}
	fetchInfo := func(ctx context.Context, token string) (userInfo, error) {
		return resolveUserInfo(ctx, token, fetchUser, getIdentity, identityLookupTimeout)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.HandleFunc("/", newProxyHandler(proxy, cache, tokenCache, cfg, fetchInfo))

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
