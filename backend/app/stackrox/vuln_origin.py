"""Map StackRox ``image_cves_v2.origin`` integers to stable API names.

Values mirror ``storage.VulnOrigin`` in StackRox ``proto/storage/cve.proto``
(added in ACS 4.11.6): the vulnerability feed that produced a finding. An
aggregator such as OSV counts as its own origin. NULL means the row was
scanned before 4.11.6 and carries no origin.
"""

import logging

logger = logging.getLogger(__name__)

VULN_ORIGIN_NAMES: dict[int, str] = {
    0: "other",
    1: "osv",
    2: "alpine",
    3: "amazon",
    4: "debian",
    5: "oracle",
    6: "photon",
    7: "red_hat",
    8: "suse",
    9: "ubuntu",
}

ORIGIN_CODES: dict[str, int] = {name: code for code, name in VULN_ORIGIN_NAMES.items()}


def origin_name(code: int | None) -> str | None:
    """Name for one origin code. NULL stays None; unknown codes (newer ACS) become ``other``."""
    if code is None:
        return None
    name = VULN_ORIGIN_NAMES.get(code)
    if name is None:
        logger.warning("Unknown StackRox VulnOrigin value, treating as 'other'", extra={"origin_code": code})
        return "other"
    return name


def origin_names(codes: list[int | None] | None) -> list[str]:
    """Sorted unique names for a list of origin codes, dropping NULLs."""
    names = {origin_name(code) for code in codes or []}
    return sorted(name for name in names if name is not None)


def origin_filter_sql(origin: str) -> tuple[str, dict[str, object]]:
    """Per-row SQL predicate on ``ic.origin`` for one API origin name, plus its bind params.

    Must agree with ``origin_name``: ``other`` covers code 0 *and* any code this module
    does not know yet (feeds added by newer ACS releases); NULL (pre-4.11.6) never matches.
    Callers aggregate it per CVE, e.g. ``BOOL_OR(<predicate>)``.
    """
    if origin == "other":
        named_codes = sorted(code for code, name in VULN_ORIGIN_NAMES.items() if name != "other")
        return (
            "(ic.origin IS NOT NULL AND ic.origin <> ALL(:origin_named_codes))",
            {"origin_named_codes": named_codes},
        )
    return "ic.origin = :origin_code", {"origin_code": ORIGIN_CODES[origin]}
