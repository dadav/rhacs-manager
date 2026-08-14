from app.services.escalation_preview import UpcomingEscalation, filter_upcoming_escalations


def _item(cve_id: str, *, severity: int, level: int, days: int) -> UpcomingEscalation:
    return UpcomingEscalation(
        cve_id=cve_id,
        severity=severity,
        epss_probability=0.5,
        current_age_days=30,
        next_level=level,
        days_until_escalation=days,
    )


ITEMS = [
    _item("CVE-ALPHA", severity=4, level=3, days=1),
    _item("CVE-BETA", severity=3, level=2, days=3),
    _item("CVE-GAMMA", severity=4, level=2, days=7),
]


def _filter(**overrides):
    params = {
        "search": None,
        "next_level": None,
        "severity": None,
        "days_max": None,
        "page": 1,
        "page_size": 20,
    }
    params.update(overrides)
    return filter_upcoming_escalations(ITEMS, **params)


def test_filters_upcoming_by_search_level_severity_and_urgency():
    assert [item.cve_id for item in _filter(search="alpha")[0]] == ["CVE-ALPHA"]
    assert [item.cve_id for item in _filter(next_level=2)[0]] == ["CVE-BETA", "CVE-GAMMA"]
    assert [item.cve_id for item in _filter(severity=4)[0]] == ["CVE-ALPHA", "CVE-GAMMA"]
    assert [item.cve_id for item in _filter(days_max=3)[0]] == ["CVE-ALPHA", "CVE-BETA"]


def test_combines_filters_before_pagination():
    items, total = _filter(severity=4, days_max=3, page=1, page_size=1)
    assert total == 1
    assert [item.cve_id for item in items] == ["CVE-ALPHA"]


def test_paginates_upcoming_results_and_preserves_total():
    items, total = _filter(page=2, page_size=2)
    assert total == 3
    assert [item.cve_id for item in items] == ["CVE-GAMMA"]
