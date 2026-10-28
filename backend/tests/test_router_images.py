"""Image detail: summary cards use the scope-independent CVE scores."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.routers import images as images_router
from tests.conftest import make_current_user


def _app_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.__iter__ = lambda self: iter([])
    db.execute.return_value = result
    return db


def _cve_row(cve_id: str, cvss: float, severity: int) -> dict:
    return {
        "cve_id": cve_id,
        "severity": severity,
        "cvss": cvss,
        "epss_probability": 0.5,
        "impact_score": 0.0,
        "fixable": False,
        "fixed_by": None,
        "affected_deployments": 1,
        "first_seen": None,
        "published_on": None,
        "fix_available_since": None,
    }


@pytest.fixture
def patch_sx():
    with patch.object(images_router, "sx") as mock_sx:
        # StackRox's own per-image topcvss is stale (0.0) after a feed update.
        mock_sx.get_image_metadata = AsyncMock(
            return_value={"id": "sha256:abc", "name_fullname": "registry/app:1", "topcvss": 0.0}
        )
        mock_sx.get_image_layers = AsyncMock(return_value=[])
        mock_sx.get_image_cve_timeline = AsyncMock(return_value=[])
        mock_sx.get_cves_for_image = AsyncMock(return_value=[])
        yield mock_sx


async def _detail():
    return await images_router.get_image_detail(
        image_id="sha256:abc",
        cluster=None,
        namespace=None,
        ignore_thresholds=False,
        current_user=make_current_user(is_sec_team=True, has_all_namespaces=True),
        app_db=_app_db(),
        sx_db=AsyncMock(),
    )


async def test_top_cvss_comes_from_effective_cve_scores(patch_sx):
    patch_sx.get_cves_for_image.return_value = [_cve_row("CVE-A", 8.1, 4), _cve_row("CVE-B", 5.0, 2)]

    detail = await _detail()

    assert detail.top_cvss == 8.1
    assert detail.critical_cves == 1


async def test_top_cvss_is_zero_without_cves(patch_sx):
    detail = await _detail()

    assert detail.top_cvss == 0.0
