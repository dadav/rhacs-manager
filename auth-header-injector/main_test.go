package main

import (
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

// serve runs one request through newProxyHandler and returns the headers the
// upstream observed. fetchGroups stubs the OpenShift group lookup.
func serve(t *testing.T, cfg config, cache *nsCache, fetchInfo func(string) ([]string, string, error), reqHeaders map[string]string) http.Header {
	t.Helper()
	cfg.ClusterName = "cluster-a"
	rec := &recordingHandler{}
	handler := newProxyHandler(rec, cache, newTokenGroupsCache(time.Minute), cfg, fetchInfo)

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

func noGroups(string) ([]string, string, error) { return nil, "", nil }

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
	fetchInfo := func(string) ([]string, string, error) { return []string{"dev-team"}, "", nil }

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

	fetchInfo := func(string) ([]string, string, error) { return nil, "Alice Example", nil }

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
