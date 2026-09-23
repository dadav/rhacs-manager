"""Ordering of scanner fix-version strings."""

import pytest

from app.services.version_compare import compare_versions, highest_version, is_comparable, rank_versions


@pytest.mark.parametrize(
    ("older", "newer"),
    [
        ("1.9", "1.10"),
        ("3.0.7", "3.0.9"),
        ("1.2", "1.2.1"),
        ("1.0rc1", "1.0"),
        ("1.0a1", "1.0b1"),
        ("v1.22.3", "v1.22.10"),
        ("1.1.1l-150400.7.7.1", "1.1.1w-150700.9.37"),
        ("0:1.1.1w-150700.9.37", "1:0.1"),
        ("2.47-1build3", "2.47-1ubuntu0.24.04.1"),
        ("1.0~rc1", "1.0"),
        ("3.0.7-27.el9", "3.0.7-29.el9_4"),
        (
            "v4.16.0-202507081835.p0.g2d0c5f3.assembly.stream.el9",
            "v4.16.0-202507211806.p0.g650a3cd.assembly.stream.el9",
        ),
        ("v4.16.0-202507211806.p0.g650a3cd.assembly.stream.el9", "4.17.0-202409101338.p0.gb0d86a0.assembly.stream.el9"),
    ],
)
def test_orders_versions(older, newer):
    assert compare_versions(older, newer) == -1
    assert compare_versions(newer, older) == 1


def test_missing_epoch_equals_zero_epoch():
    assert compare_versions("0:1.2.3-1.el9", "1.2.3-1.el9") == 0


def test_final_release_beats_prerelease():
    assert highest_version(["1.0rc1", "1.0"]) == "1.0"


def test_highest_version_ignores_empty_values():
    assert highest_version([None, "", "1.9", "1.10", "1.2"]) == "1.10"
    assert highest_version([None, " "]) is None


@pytest.mark.parametrize("value", ["%%%", "latest", "see advisory"])
def test_non_version_strings_are_not_comparable(value):
    assert not is_comparable(value)


def test_rank_keeps_non_comparable_candidates_and_flags_uncertainty():
    best, ordered, uncertain = rank_versions(["%%%", "1.0", "1.2", None])

    assert best == "1.2"
    assert ordered == ["1.2", "1.0", "%%%"]
    assert uncertain is True


def test_rank_without_any_comparable_candidate():
    assert rank_versions(["latest"]) == (None, ["latest"], True)


def test_rank_all_comparable_is_certain():
    assert rank_versions(["3.0.9", "3.0.10"]) == ("3.0.10", ["3.0.10", "3.0.9"], False)
