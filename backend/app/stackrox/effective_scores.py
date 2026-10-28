"""Scope-independent CVE scores ("freshest scan wins").

StackRox stores severity/CVSS/EPSS per image row in ``image_cves_v2``, and only
images that get rescanned pick up feed updates. A MAX over the rows of one scope
(cluster, namespace, image) can therefore show a stale score, e.g. 0.0 in one
cluster while the same CVE is 8.1 org-wide. This module computes one global
score per (CVE, feed) and per CVE and keeps it in process memory. The shared
``CVE_ROWS_CTE`` joins it in through bound array params (``effective_score_params``),
so every query sees the same score regardless of scope.

Rule (``FEED_SCORES_SQL``):
  1. v2-model rows only, with a known feed (``origin IS NOT NULL``).
  2. Per (CVE, feed, component name): the rows from the most recently scanned
     image (``images_v2.scan_scantime``). Rows tied at that time: MAX.
     The component is part of the key because one feed rates the same CVE
     differently per package (e.g. Go ``stdlib`` 0.0 vs ``golang.org/x/net`` 5.3).
  3. Per (CVE, feed): MAX over component names -> feed rating (``feed_score``).
  4. Per CVE: MAX over feeds -> CVE score (bound into ``CVE_ROWS_CTE``).
CVEs absent from the map (only NULL-origin or legacy rows) and every query run
before the first successful load fall back to the raw row values.

Each process (backend replicas, worker) refreshes its own copy every
``REFRESH_INTERVAL_SECONDS`` via ``run_refresh_loop``; scores may lag StackRox
by that interval. All loads (loop and on-demand) run under ``_load_lock``, so a
load always starts after the previous one published and an older query result
can never overwrite a newer one.
"""

import asyncio
import logging
import time
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

REFRESH_INTERVAL_SECONDS = 300
# After a failed on-demand load, requests use raw scores for this long before retrying.
LOAD_RETRY_SECONDS = 60

FEED_SCORES_SQL = """
    WITH ranked AS (
        SELECT ic.cvebaseinfo_cve AS cve_id,
               ic.origin,
               ic.severity,
               ic.cvss,
               ic.cvebaseinfo_epss_epssprobability AS epss,
               rank() OVER (
                   PARTITION BY ic.cvebaseinfo_cve, ic.origin, comp.name
                   ORDER BY iv.scan_scantime DESC NULLS LAST
               ) AS freshness_rank
        FROM image_cves_v2 ic
        JOIN images_v2 iv ON iv.id = ic.imageidv2
        JOIN image_component_v2 comp ON comp.id = ic.componentid
        WHERE ic.origin IS NOT NULL
          AND ic.cvebaseinfo_cve IS NOT NULL
    )
    SELECT cve_id,
           origin,
           COALESCE(MAX(severity), 0)      AS severity,
           COALESCE(MAX(cvss), 0)::float8  AS cvss,
           COALESCE(MAX(epss), 0)::float8  AS epss
    FROM ranked
    WHERE freshness_rank = 1
    GROUP BY cve_id, origin
"""


@dataclass(frozen=True)
class Score:
    severity: int
    cvss: float
    epss: float


@dataclass(frozen=True)
class EffectiveScores:
    """Immutable snapshot; swapped as a whole so readers never see a half-built map."""

    feed_scores: dict[tuple[str, int], Score]
    cve_params: dict[str, list[Any]]
    loaded_at: float


_state: EffectiveScores | None = None
_last_failed_at: float | None = None
_load_lock = asyncio.Lock()


def _empty_params() -> dict[str, list[Any]]:
    return {"es_cve_ids": [], "es_severity": [], "es_cvss": [], "es_epss": []}


def build_effective_scores(rows: Iterable[Mapping[str, Any]], loaded_at: float) -> EffectiveScores:
    """Build the snapshot from ``FEED_SCORES_SQL`` rows (cve_id, origin, severity, cvss, epss)."""
    feed_scores: dict[tuple[str, int], Score] = {}
    cve_scores: dict[str, Score] = {}
    for row in rows:
        score = Score(
            severity=int(row["severity"] or 0),
            cvss=float(row["cvss"] or 0),
            epss=float(row["epss"] or 0),
        )
        feed_scores[(row["cve_id"], int(row["origin"]))] = score
        current = cve_scores.get(row["cve_id"])
        if current is None:
            cve_scores[row["cve_id"]] = score
        else:
            cve_scores[row["cve_id"]] = Score(
                severity=max(current.severity, score.severity),
                cvss=max(current.cvss, score.cvss),
                epss=max(current.epss, score.epss),
            )

    params = _empty_params()
    for cve_id, score in cve_scores.items():
        params["es_cve_ids"].append(cve_id)
        params["es_severity"].append(score.severity)
        params["es_cvss"].append(score.cvss)
        params["es_epss"].append(score.epss)
    return EffectiveScores(feed_scores=feed_scores, cve_params=params, loaded_at=loaded_at)


def set_effective_scores(rows: Iterable[Mapping[str, Any]]) -> EffectiveScores:
    """Replace the process-wide snapshot. Used by refreshes and tests."""
    global _state, _last_failed_at
    snapshot = build_effective_scores(rows, time.monotonic())
    _state = snapshot
    _last_failed_at = None
    return snapshot


def reset_effective_scores() -> None:
    """Forget the snapshot so the next query loads on demand. Tests only."""
    global _state, _last_failed_at
    _state = None
    _last_failed_at = None


async def refresh_effective_scores(session: AsyncSession) -> EffectiveScores:
    """Recompute the snapshot from StackRox and swap it in (serialized with every other load)."""
    async with _load_lock:
        return await _refresh_unlocked(session)


async def _refresh_unlocked(session: AsyncSession) -> EffectiveScores:
    """Query and publish. Caller must hold ``_load_lock``."""
    started = time.monotonic()
    result = await session.execute(text(FEED_SCORES_SQL))
    snapshot = set_effective_scores(dict(row._mapping) for row in result)
    logger.info(
        "Effective CVE scores refreshed",
        extra={
            "feed_rows": len(snapshot.feed_scores),
            "cves": len(snapshot.cve_params["es_cve_ids"]),
            "duration_ms": round((time.monotonic() - started) * 1000),
        },
    )
    return snapshot


async def _load_on_demand() -> EffectiveScores | None:
    """First load when a query runs before the refresh loop finished.

    Uses its own session so a failure never aborts the caller's transaction.
    """
    global _last_failed_at
    async with _load_lock:
        if _state is not None:
            return _state
        if _last_failed_at is not None and time.monotonic() - _last_failed_at < LOAD_RETRY_SECONDS:
            return None
        from ..database import StackRoxSessionLocal

        try:
            async with StackRoxSessionLocal() as session:
                return await _refresh_unlocked(session)
        except Exception:
            _last_failed_at = time.monotonic()
            logger.exception(
                "Effective CVE scores could not be loaded; using raw per-image scores",
                extra={"retry_after_seconds": LOAD_RETRY_SECONDS},
            )
            return None


async def effective_score_params() -> dict[str, list[Any]]:
    """Bind params for ``CVE_ROWS_CTE`` / ``EFFECTIVE_SCORES_CTE`` (``:es_*``).

    Empty arrays (no snapshot yet, load failed) make the SQL fall back to raw row scores.
    """
    snapshot = _state
    if snapshot is None:
        snapshot = await _load_on_demand()
    if snapshot is None:
        return _empty_params()
    return snapshot.cve_params


def feed_score(cve_id: str, origin: int | None) -> Score | None:
    """Freshest-scan rating of one feed for one CVE, or None when unknown."""
    snapshot = _state
    if snapshot is None or origin is None:
        return None
    return snapshot.feed_scores.get((cve_id, origin))


async def run_refresh_loop(interval_seconds: int = REFRESH_INTERVAL_SECONDS) -> None:
    """Refresh the snapshot now and then every ``interval_seconds``; keeps the last good map on errors."""
    from ..database import StackRoxSessionLocal

    while True:
        try:
            async with StackRoxSessionLocal() as session:
                await refresh_effective_scores(session)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "Effective CVE score refresh failed; keeping previous snapshot",
                extra={"has_snapshot": _state is not None, "retry_in_seconds": interval_seconds},
            )
        await asyncio.sleep(interval_seconds)
