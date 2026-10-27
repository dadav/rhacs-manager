package main

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// recordingHandler is a stub upstream that captures the headers it receives.
type recordingHandler struct {
	got http.Header
}

func (h *recordingHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.got = r.Header.Clone()
	w.WriteHeader(http.StatusOK)
}

func newTestCache(userToNS, groupToNS map[string][]string) *nsCache {
	c := &nsCache{
		userToNS:  map[string][]string{},
		groupToNS: map[string][]string{},
		nsEmails:  map[string]string{},
	}
	c.update(userToNS, groupToNS, map[string]string{})
	return c
}

type fetchInfoFunc = func(ctx context.Context, token string) (userInfo, error)

// serve runs one request through newProxyHandler and returns the headers the
// upstream observed. fetchInfo stubs the OpenShift user/identity lookup.
func serve(t *testing.T, cfg config, cache *nsCache, fetchInfo fetchInfoFunc, reqHeaders map[string]string) http.Header {
	t.Helper()
	return serveWithCache(t, cfg, cache, newTokenInfoCache(time.Minute), fetchInfo, reqHeaders)
}

func serveWithCache(
	t *testing.T,
	cfg config,
	cache *nsCache,
	tokenCache *tokenInfoCache,
	fetchInfo fetchInfoFunc,
	reqHeaders map[string]string,
) http.Header {
	t.Helper()
	cfg.ClusterName = "cluster-a"
	rec := &recordingHandler{}
	handler := newProxyHandler(rec, cache, tokenCache, cfg, fetchInfo)

	req := httptest.NewRequest(http.MethodGet, "/cves", nil)
	for k, v := range reqHeaders {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	handler(w, req)
	if rec.got == nil {
		t.Fatal("upstream handler was not called")
	}
	return rec.got
}

func noGroups(context.Context, string) (userInfo, error) {
	return userInfo{EmailResolved: true}, nil
}

func TestSpoofedForwardedGroupsIgnoredWhenUntrusted(t *testing.T) {
	cfg := config{TrustForwardedGroups: false, AllNamespacesGroups: []string{"sec-team"}}
	cache := newTestCache(nil, nil)

	got := serve(t, cfg, cache, noGroups, map[string]string{
		"X-Forwarded-User":   "alice",
		"X-Forwarded-Groups": "sec-team", // spoofed all-namespaces group
	})

	if ns := got.Get("X-Forwarded-Namespaces"); ns == "*" {
		t.Errorf("spoofed group escalated to wildcard namespaces: got %q", ns)
	}
	if g := got.Get("X-Forwarded-Groups"); g != "" {
		t.Errorf("inbound X-Forwarded-Groups was not stripped: got %q", g)
	}
}

func TestTrustedFallbackAppliesWhenNoTokenGroups(t *testing.T) {
	cfg := config{TrustForwardedGroups: true, AllNamespacesGroups: []string{"sec-team"}}
	cache := newTestCache(nil, nil)

	got := serve(t, cfg, cache, noGroups, map[string]string{
		"X-Forwarded-User":   "alice",
		"X-Forwarded-Groups": "sec-team",
	})

	if ns := got.Get("X-Forwarded-Namespaces"); ns != "*" {
		t.Errorf("trusted fallback should grant wildcard: got %q", ns)
	}
}

func TestTrustedFallbackNotUsedWhenTokenGroupsPresent(t *testing.T) {
	cfg := config{TrustForwardedGroups: true, AllNamespacesGroups: []string{"sec-team"}}
	cache := newTestCache(nil, map[string][]string{"dev-team": {"payments"}})

	// Token lookup returns real groups; the spoofed sec-team header must be ignored.
	fetchInfo := func(context.Context, string) (userInfo, error) {
		return userInfo{Groups: []string{"dev-team"}, EmailResolved: true}, nil
	}

	got := serve(t, cfg, cache, fetchInfo, map[string]string{
		"X-Forwarded-User":         "alice",
		"X-Forwarded-Access-Token": "tok",
		"X-Forwarded-Groups":       "sec-team",
	})

	if ns := got.Get("X-Forwarded-Namespaces"); ns == "*" {
		t.Errorf("token groups present; spoofed sec-team must not grant wildcard: got %q", ns)
	}
	if ns := got.Get("X-Forwarded-Namespaces"); ns != "payments:cluster-a" {
		t.Errorf("expected dev-team namespaces, got %q", ns)
	}
	if g := got.Get("X-Forwarded-Groups"); g != "dev-team" {
		t.Errorf("expected resolved groups dev-team, got %q", g)
	}
}

func TestNoUserForcesEmptyHeaders(t *testing.T) {
	cfg := config{TrustForwardedGroups: true, AllNamespacesGroups: []string{"sec-team"}}
	cache := newTestCache(nil, nil)

	got := serve(t, cfg, cache, noGroups, map[string]string{
		// No X-Forwarded-User. Everything below is attacker-supplied.
		"X-Forwarded-Namespaces": "evil:cluster-a",
		"X-Forwarded-Groups":     "sec-team",
	})

	for _, h := range []string{"X-Forwarded-Namespaces", "X-Forwarded-Namespace-Emails", "X-Forwarded-Groups"} {
		if v := got.Get(h); v != "" {
			t.Errorf("%s should be forced empty for no-user requests, got %q", h, v)
		}
	}
}

func TestFullNameForwardedFromUserAPI(t *testing.T) {
	cfg := config{TrustForwardedGroups: false}
	cache := newTestCache(map[string][]string{"alice": {"payments"}}, nil)

	fetchInfo := func(context.Context, string) (userInfo, error) {
		return userInfo{FullName: "Alice Example", EmailResolved: true}, nil
	}

	got := serve(t, cfg, cache, fetchInfo, map[string]string{
		"X-Forwarded-User":         "alice",
		"X-Forwarded-Access-Token": "tok",
	})

	if fn := got.Get("X-Forwarded-Full-Name"); fn != "Alice Example" {
		t.Errorf("expected resolved full name, got %q", fn)
	}
}

func TestSpoofedFullNameStripped(t *testing.T) {
	cfg := config{TrustForwardedGroups: false}
	cache := newTestCache(map[string][]string{"alice": {"payments"}}, nil)

	// No token lookup -> no server-resolved name; the spoofed inbound value must
	// never reach the upstream.
	got := serve(t, cfg, cache, noGroups, map[string]string{
		"X-Forwarded-User":      "alice",
		"X-Forwarded-Full-Name": "Administrator",
	})

	if fn := got.Get("X-Forwarded-Full-Name"); fn != "" {
		t.Errorf("spoofed full name was not stripped: got %q", fn)
	}
}

func TestFullNameClearedForNoUser(t *testing.T) {
	cfg := config{TrustForwardedGroups: true}
	cache := newTestCache(nil, nil)

	got := serve(t, cfg, cache, noGroups, map[string]string{
		"X-Forwarded-Full-Name": "Administrator",
	})

	if fn := got.Get("X-Forwarded-Full-Name"); fn != "" {
		t.Errorf("full name should be stripped for no-user requests, got %q", fn)
	}
}

func TestUserNamespacesResolved(t *testing.T) {
	cfg := config{TrustForwardedGroups: false}
	cache := newTestCache(map[string][]string{"alice": {"payments"}}, nil)

	got := serve(t, cfg, cache, noGroups, map[string]string{
		"X-Forwarded-User": "alice",
	})

	if ns := got.Get("X-Forwarded-Namespaces"); ns != "payments:cluster-a" {
		t.Errorf("expected payments:cluster-a, got %q", ns)
	}
}

func TestResolvedEmailReplacesOAuthProxyPlaceholder(t *testing.T) {
	cfg := config{TrustForwardedGroups: false}
	cache := newTestCache(map[string][]string{"alice": {"payments"}}, nil)
	fetchInfo := func(context.Context, string) (userInfo, error) {
		return userInfo{Email: "alice@example.com", EmailResolved: true}, nil
	}

	got := serve(t, cfg, cache, fetchInfo, map[string]string{
		"X-Forwarded-User":         "alice",
		"X-Forwarded-Access-Token": "tok",
		"X-Forwarded-Email":        "alice@cluster.local",
	})

	if e := got.Get("X-Forwarded-Email"); e != "alice@example.com" {
		t.Errorf("expected resolved email, got %q", e)
	}
}

func TestResolvedEmailOnWildcardPath(t *testing.T) {
	cfg := config{AllNamespacesGroups: []string{"sec-team"}}
	cache := newTestCache(nil, nil)
	fetchInfo := func(context.Context, string) (userInfo, error) {
		return userInfo{Groups: []string{"sec-team"}, Email: "alice@example.com", EmailResolved: true}, nil
	}

	got := serve(t, cfg, cache, fetchInfo, map[string]string{
		"X-Forwarded-User":         "alice",
		"X-Forwarded-Access-Token": "tok",
		"X-Forwarded-Email":        "alice@cluster.local",
	})

	if ns := got.Get("X-Forwarded-Namespaces"); ns != "*" {
		t.Fatalf("expected wildcard namespaces, got %q", ns)
	}
	if e := got.Get("X-Forwarded-Email"); e != "alice@example.com" {
		t.Errorf("expected resolved email on wildcard path, got %q", e)
	}
}

func TestPlaceholderEmailStrippedWhenNotResolved(t *testing.T) {
	cfg := config{TrustForwardedGroups: false}
	cache := newTestCache(map[string][]string{"alice": {"payments"}}, nil)

	cases := map[string]fetchInfoFunc{
		"no email at IdP": func(context.Context, string) (userInfo, error) {
			return userInfo{EmailResolved: true}, nil
		},
		"identity lookup failed": func(context.Context, string) (userInfo, error) {
			return userInfo{EmailResolved: false}, nil
		},
	}
	for name, fetchInfo := range cases {
		t.Run(name, func(t *testing.T) {
			got := serve(t, cfg, cache, fetchInfo, map[string]string{
				"X-Forwarded-User":         "alice",
				"X-Forwarded-Access-Token": "tok",
				"X-Forwarded-Email":        "alice@cluster.local",
			})
			if e := got.Get("X-Forwarded-Email"); e != "" {
				t.Errorf("inbound email must be stripped, got %q", e)
			}
		})
	}
}

func TestEmailStrippedForNoUser(t *testing.T) {
	got := serve(t, config{}, newTestCache(nil, nil), noGroups, map[string]string{
		"X-Forwarded-Email": "admin@example.com",
	})
	if e := got.Get("X-Forwarded-Email"); e != "" {
		t.Errorf("email should be stripped for no-user requests, got %q", e)
	}
}

func TestUnresolvedEmailCachedBriefly(t *testing.T) {
	cfg := config{TrustForwardedGroups: false}
	cache := newTestCache(map[string][]string{"alice": {"payments"}}, nil)
	tokenCache := newTokenInfoCache(time.Minute)
	headers := map[string]string{"X-Forwarded-User": "alice", "X-Forwarded-Access-Token": "tok"}

	calls := 0
	failing := func(context.Context, string) (userInfo, error) {
		calls++
		return userInfo{Groups: []string{"dev-team"}, FullName: "Alice", EmailResolved: false}, nil
	}
	got := serveWithCache(t, cfg, cache, tokenCache, failing, headers)
	if fn := got.Get("X-Forwarded-Full-Name"); fn != "Alice" {
		t.Errorf("full name must survive an email failure, got %q", fn)
	}

	entry := tokenCache.entries["tok"]
	if entry.ttl != unresolvedInfoTTL {
		t.Fatalf("unresolved entry should use the short TTL, got %v", entry.ttl)
	}

	// Simulate the short TTL expiring; the next request must retry the lookup.
	entry.fetchedAt = time.Now().Add(-2 * unresolvedInfoTTL)
	tokenCache.entries["tok"] = entry
	recovered := func(context.Context, string) (userInfo, error) {
		calls++
		return userInfo{Groups: []string{"dev-team"}, Email: "alice@example.com", EmailResolved: true}, nil
	}
	got = serveWithCache(t, cfg, cache, tokenCache, recovered, headers)
	if calls != 2 {
		t.Fatalf("expected a retry after the short TTL, got %d calls", calls)
	}
	if e := got.Get("X-Forwarded-Email"); e != "alice@example.com" {
		t.Errorf("expected recovered email, got %q", e)
	}
	if tokenCache.entries["tok"].ttl != time.Minute {
		t.Errorf("resolved entry should use the normal TTL")
	}
}

func identityJSON(email string) []byte {
	return []byte(`{"extra":{"email":"` + email + `"}}`)
}

func TestResolveIdentityEmailPicksFirstNonEmpty(t *testing.T) {
	identities := map[string][]byte{
		"htpasswd:alice": []byte(`{"providerName":"htpasswd"}`),
		"oidc:abc":       identityJSON(" alice@example.com "),
	}
	getIdentity := func(_ context.Context, name string) ([]byte, error) { return identities[name], nil }

	email, err := resolveIdentityEmail(context.Background(), []string{"htpasswd:alice", "oidc:abc"}, getIdentity)
	if err != nil {
		t.Fatal(err)
	}
	if email != "alice@example.com" {
		t.Errorf("expected alice@example.com, got %q", email)
	}
}

func TestResolveIdentityEmailNoIdentities(t *testing.T) {
	email, err := resolveIdentityEmail(context.Background(), nil, nil)
	if err != nil || email != "" {
		t.Errorf("expected empty success, got %q, %v", email, err)
	}
}

func TestResolveIdentityEmailErrorIsNotEmptySuccess(t *testing.T) {
	getIdentity := func(context.Context, string) ([]byte, error) { return nil, errors.New("forbidden") }
	if _, err := resolveIdentityEmail(context.Background(), []string{"oidc:abc"}, getIdentity); err == nil {
		t.Error("expected an error when the identity fetch fails")
	}
}

func stalledIdentity(ctx context.Context, _ string) ([]byte, error) {
	<-ctx.Done()
	return nil, ctx.Err()
}

func fetchUserStub(context.Context, string) (openShiftUserResponse, error) {
	return openShiftUserResponse{FullName: " Alice ", Groups: []string{"dev-team"}, Identities: []string{"oidc:abc"}}, nil
}

func TestResolveUserInfoStalledIdentityHitsDeadline(t *testing.T) {
	start := time.Now()
	info, err := resolveUserInfo(context.Background(), "tok", fetchUserStub, stalledIdentity, 50*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Errorf("stalled identity lookup not bounded: took %v", elapsed)
	}
	if info.EmailResolved {
		t.Error("timed-out lookup must be unresolved")
	}
	if info.FullName != "Alice" || len(info.Groups) != 1 {
		t.Errorf("groups and full name must survive the timeout, got %+v", info)
	}
}

func TestResolveUserInfoCancelledRequestReturnsPromptly(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan userInfo, 1)
	go func() {
		info, _ := resolveUserInfo(ctx, "tok", fetchUserStub, stalledIdentity, time.Minute)
		done <- info
	}()
	cancel()
	select {
	case info := <-done:
		if info.EmailResolved {
			t.Error("cancelled lookup must be unresolved")
		}
		if info.FullName != "Alice" {
			t.Errorf("full name must survive cancellation, got %q", info.FullName)
		}
	case <-time.After(time.Second):
		t.Fatal("resolution did not exit after request cancellation")
	}
}

func TestResolveUserInfoSuccess(t *testing.T) {
	getIdentity := func(context.Context, string) ([]byte, error) { return identityJSON("alice@example.com"), nil }
	info, err := resolveUserInfo(context.Background(), "tok", fetchUserStub, getIdentity, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	if !info.EmailResolved || info.Email != "alice@example.com" {
		t.Errorf("expected resolved email, got %+v", info)
	}
}

func TestCancelledLookupNotCachedOrForwarded(t *testing.T) {
	cfg := config{ClusterName: "cluster-a", AllNamespacesGroups: []string{"sec-team"}}
	cache := newTestCache(nil, nil)
	tokenCache := newTokenInfoCache(time.Minute)
	rec := &recordingHandler{}

	ctx, cancel := context.WithCancel(context.Background())
	cancelling := func(ctx context.Context, _ string) (userInfo, error) {
		cancel()
		<-ctx.Done()
		return userInfo{}, ctx.Err()
	}
	req := httptest.NewRequest(http.MethodGet, "/cves", nil).WithContext(ctx)
	req.Header.Set("X-Forwarded-User", "alice")
	req.Header.Set("X-Forwarded-Access-Token", "tok")
	newProxyHandler(rec, cache, tokenCache, cfg, cancelling)(httptest.NewRecorder(), req)

	if rec.got != nil {
		t.Error("cancelled request must not be forwarded upstream")
	}
	if _, ok := tokenCache.get("tok"); ok {
		t.Fatal("cancelled lookup must not be cached")
	}

	// The next request with the same valid token resolves its real groups.
	resolved := func(context.Context, string) (userInfo, error) {
		return userInfo{Groups: []string{"sec-team"}, EmailResolved: true}, nil
	}
	got := serveWithCache(t, cfg, cache, tokenCache, resolved, map[string]string{
		"X-Forwarded-User":         "alice",
		"X-Forwarded-Access-Token": "tok",
	})
	if ns := got.Get("X-Forwarded-Namespaces"); ns != "*" {
		t.Errorf("expected wildcard from real groups after cancellation, got %q", ns)
	}
	if g := got.Get("X-Forwarded-Groups"); g != "sec-team" {
		t.Errorf("expected sec-team group after cancellation, got %q", g)
	}
}

func TestUserLookupFailureFailsClosed(t *testing.T) {
	cfg := config{ClusterName: "cluster-a", AllNamespacesGroups: []string{"sec-team"}}
	cache := newTestCache(nil, nil)
	tokenCache := newTokenInfoCache(time.Minute)
	headers := map[string]string{"X-Forwarded-User": "alice", "X-Forwarded-Access-Token": "tok"}

	failing := func(context.Context, string) (userInfo, error) { return userInfo{}, errors.New("boom") }
	rec := &recordingHandler{}
	req := httptest.NewRequest(http.MethodGet, "/cves", nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	newProxyHandler(rec, cache, tokenCache, cfg, failing)(w, req)

	if rec.got != nil {
		t.Error("request must not be forwarded with unresolved groups")
	}
	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", w.Code)
	}
	if ra := w.Header().Get("Retry-After"); ra != "5" {
		t.Errorf("expected Retry-After 5, got %q", ra)
	}
	if _, ok := tokenCache.get("tok"); ok {
		t.Fatal("failed lookup must not be cached")
	}

	// Recovery: the next request retries and keeps sec-team / wildcard access.
	resolved := func(context.Context, string) (userInfo, error) {
		return userInfo{Groups: []string{"sec-team"}, EmailResolved: true}, nil
	}
	got := serveWithCache(t, cfg, cache, tokenCache, resolved, headers)
	if ns := got.Get("X-Forwarded-Namespaces"); ns != "*" {
		t.Errorf("expected wildcard after recovery, got %q", ns)
	}
	if g := got.Get("X-Forwarded-Groups"); g != "sec-team" {
		t.Errorf("expected sec-team after recovery, got %q", g)
	}
}
