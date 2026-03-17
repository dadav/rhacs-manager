"""Unit tests for auth header parsing functions."""

import pytest
from fastapi import HTTPException

from app.auth.middleware import _parse_namespace_emails_header, _parse_namespaces_header


class TestParseNamespacesHeader:
    def test_valid_pairs(self):
        result = _parse_namespaces_header("ns1:cluster1,ns2:cluster2")
        assert result == [("ns1", "cluster1"), ("ns2", "cluster2")]

    def test_empty_string(self):
        assert _parse_namespaces_header("") == []

    def test_whitespace_only(self):
        assert _parse_namespaces_header("   ") == []

    def test_entries_without_colon_skipped(self):
        result = _parse_namespaces_header("ns1:cluster1,bad_entry,ns2:cluster2")
        assert result == [("ns1", "cluster1"), ("ns2", "cluster2")]

    def test_whitespace_trimmed(self):
        result = _parse_namespaces_header(" ns1 : cluster1 , ns2 : cluster2 ")
        assert result == [("ns1", "cluster1"), ("ns2", "cluster2")]

    def test_empty_parts_skipped(self):
        result = _parse_namespaces_header(":cluster1")
        assert result == []

    def test_max_count_exceeded(self, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "max_namespace_count", 2)
        with pytest.raises(HTTPException) as exc_info:
            _parse_namespaces_header("a:c1,b:c2,c:c3")
        assert exc_info.value.status_code == 400

    def test_max_count_at_limit(self, monkeypatch):
        from app.config import settings

        monkeypatch.setattr(settings, "max_namespace_count", 2)
        result = _parse_namespaces_header("a:c1,b:c2")
        assert len(result) == 2


class TestParseNamespaceEmailsHeader:
    def test_valid_triples(self):
        result = _parse_namespace_emails_header(
            "ns1:cluster1=a@x.com,ns2:cluster2=b@y.com"
        )
        assert result == [
            ("ns1", "cluster1", "a@x.com"),
            ("ns2", "cluster2", "b@y.com"),
        ]

    def test_empty(self):
        assert _parse_namespace_emails_header("") == []

    def test_missing_equals_skipped(self):
        result = _parse_namespace_emails_header("ns1:cluster1,ns2:cluster2=b@y.com")
        assert result == [("ns2", "cluster2", "b@y.com")]

    def test_missing_colon_skipped(self):
        result = _parse_namespace_emails_header("badentry=a@x.com,ns1:c1=b@y.com")
        assert result == [("ns1", "c1", "b@y.com")]

    def test_empty_email_skipped(self):
        result = _parse_namespace_emails_header("ns1:cluster1=")
        assert result == []
