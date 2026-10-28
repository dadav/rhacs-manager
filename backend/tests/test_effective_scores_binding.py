"""Static guards for the effective-score CTE contract (no database needed).

CVE_ROWS_CTE and EFFECTIVE_SCORES_CTE reference :es_* bind params. A query that
interpolates either one without binding ``effective_score_params()`` fails at
runtime, which mocked unit tests would never notice.
"""

import ast
import asyncio
from pathlib import Path

from app.stackrox import effective_scores
from app.stackrox.queries._common import CVE_ROWS_CTE, EFFECTIVE_SCORES_CTE

QUERIES_DIR = Path(__file__).resolve().parents[1] / "app" / "stackrox" / "queries"
CTE_NAMES = {"CVE_ROWS_CTE", "EFFECTIVE_SCORES_CTE"}


def _functions_using_cte() -> list[tuple[str, ast.AsyncFunctionDef | ast.FunctionDef]]:
    found = []
    for path in sorted(QUERIES_DIR.glob("*.py")):
        tree = ast.parse(path.read_text())
        for node in tree.body:
            if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            names = {n.id for n in ast.walk(node) if isinstance(n, ast.Name)}
            if names & CTE_NAMES:
                found.append((f"{path.name}:{node.name}", node))
    return found


def test_every_cte_user_binds_effective_score_params():
    functions = _functions_using_cte()
    assert len(functions) > 30, "expected to find the CVE_ROWS_CTE users"
    missing = []
    for label, node in functions:
        calls = {n.func.id for n in ast.walk(node) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)}
        if "effective_score_params" not in calls:
            missing.append(label)
    assert missing == []


def test_cte_declares_all_bound_params():
    for param in effective_scores._empty_params():
        assert f":{param}" in EFFECTIVE_SCORES_CTE
    assert CVE_ROWS_CTE.startswith(EFFECTIVE_SCORES_CTE)


def test_build_effective_scores_takes_max_across_feeds():
    snapshot = effective_scores.build_effective_scores(
        [
            {"cve_id": "CVE-1", "origin": 7, "severity": 3, "cvss": 6.0, "epss": 0.2},
            {"cve_id": "CVE-1", "origin": 4, "severity": 2, "cvss": 7.2, "epss": 0.1},
            {"cve_id": "CVE-2", "origin": 7, "severity": None, "cvss": None, "epss": None},
        ],
        loaded_at=0.0,
    )
    params = snapshot.cve_params
    scores = zip(params["es_severity"], params["es_cvss"], params["es_epss"], strict=True)
    by_cve = dict(zip(params["es_cve_ids"], scores, strict=True))
    assert by_cve == {"CVE-1": (3, 7.2, 0.2), "CVE-2": (0, 0.0, 0.0)}
    assert snapshot.feed_scores[("CVE-1", 4)] == effective_scores.Score(severity=2, cvss=7.2, epss=0.1)


async def test_params_are_empty_when_nothing_loaded_and_load_failed(monkeypatch):
    effective_scores.reset_effective_scores()
    monkeypatch.setattr(effective_scores, "_last_failed_at", 1000.0)
    # A recent failure suppresses on-demand loading, so no database is touched.
    monkeypatch.setattr(effective_scores.time, "monotonic", lambda: 1010.0)
    params = await effective_scores.effective_score_params()
    assert params == {"es_cve_ids": [], "es_severity": [], "es_cvss": [], "es_epss": []}


class _FakeRow:
    def __init__(self, mapping: dict):
        self._mapping = mapping


class _FakeSession:
    """Returns fixed FEED_SCORES_SQL rows; optionally blocks until ``release`` is set."""

    def __init__(self, cvss: float, release: asyncio.Event | None = None):
        self.cvss = cvss
        self.release = release
        self.started = asyncio.Event()

    async def execute(self, _sql, _params=None):
        self.started.set()
        if self.release is not None:
            await self.release.wait()
        return [_FakeRow({"cve_id": "CVE-RACE", "origin": 7, "severity": 4, "cvss": self.cvss, "epss": 0.5})]


async def test_overlapping_refreshes_never_publish_an_older_result():
    """A slow refresh started first must not overwrite a refresh started after it."""
    release_old = asyncio.Event()
    old = _FakeSession(cvss=0.0, release=release_old)
    new = _FakeSession(cvss=8.1)

    old_task = asyncio.create_task(effective_scores.refresh_effective_scores(old))
    await old.started.wait()
    new_task = asyncio.create_task(effective_scores.refresh_effective_scores(new))
    await asyncio.sleep(0)  # let the newer refresh run as far as it can
    release_old.set()
    await asyncio.gather(old_task, new_task)

    assert effective_scores.feed_score("CVE-RACE", 7).cvss == 8.1
