"""Package version ordering for scanner ``fixedby`` strings.

Scanner fix versions come from many ecosystems (PyPI/semver ``3.0.9``, ``1.0rc1``,
Go ``v1.22.3``, RPM ``0:1.1.1w-150700.9.37``, Debian ``2.47-1ubuntu0.24.04.1``).
No single spec covers all of them, so ordering is layered:

1. Both strings parse as PEP 440 (``packaging.version``): compare with it. This
   ranks pre-releases below the final release (``1.0rc1`` < ``1.0``).
2. Otherwise, if both look like package versions (optional ``epoch:``, then an
   optional ``v`` and a digit, e.g. OpenShift ``v4.16.0-2025….el9``): RPM
   ``rpmvercmp`` with epoch, ignoring the ``v``. ``1.10`` > ``1.9``, numeric runs
   compare numerically, ``~`` marks a pre-release.
3. Anything else is *not comparable*. ``rank_versions`` keeps such strings as
   candidates and flags the result as uncertain instead of dropping them.

SQL ``MAX(fixedby)`` compares strings lexically and gets ``1.9`` > ``1.10``
wrong; use this module wherever a single target is picked.
"""

import functools
import re

from packaging.version import InvalidVersion, Version

_SEGMENT_RE = re.compile(r"[0-9]+|[A-Za-z]+|~")
_PACKAGE_VERSION_RE = re.compile(r"^(\d+:)?[vV]?\d[A-Za-z0-9.+~_:-]*$")


def _pep440(version: str) -> Version | None:
    try:
        return Version(version)
    except InvalidVersion:
        return None


def is_comparable(version: str) -> bool:
    """True if the string can be ordered by PEP 440 or the RPM-style fallback."""
    v = version.strip()
    return bool(v) and (_pep440(v) is not None or _PACKAGE_VERSION_RE.match(v) is not None)


def _split_epoch(version: str) -> tuple[int, str]:
    """Split ``epoch:rest`` and drop a ``v`` prefix before a digit from ``rest``."""
    head, sep, rest = version.partition(":")
    epoch, rest = (int(head), rest) if sep and head.isdigit() else (0, version)
    if rest[:1] in ("v", "V") and rest[1:2].isdigit():
        rest = rest[1:]
    return epoch, rest


def _rpmvercmp(a: str, b: str) -> int:
    """rpmvercmp on the epoch-less remainder. Returns -1, 0, or 1."""
    seg_a = _SEGMENT_RE.findall(a)
    seg_b = _SEGMENT_RE.findall(b)
    for x, y in zip(seg_a, seg_b, strict=False):
        # '~' sorts before everything, including the end of the string (pre-release).
        if x == "~" or y == "~":
            if x != y:
                return -1 if x == "~" else 1
            continue
        x_num, y_num = x.isdigit(), y.isdigit()
        if x_num and y_num:
            if int(x) != int(y):
                return -1 if int(x) < int(y) else 1
        elif x_num != y_num:
            # A numeric segment is newer than an alphabetic one.
            return 1 if x_num else -1
        elif x != y:
            return -1 if x < y else 1
    if len(seg_a) == len(seg_b):
        return 0
    longer, sign = (seg_a, 1) if len(seg_a) > len(seg_b) else (seg_b, -1)
    extra = longer[min(len(seg_a), len(seg_b))]
    # A trailing '~' segment means "older than without it".
    return -sign if extra == "~" else sign


def compare_versions(a: str, b: str) -> int:
    """Return -1 if ``a`` < ``b``, 0 if equal, 1 if ``a`` > ``b``.

    Only meaningful when both are ``is_comparable``; never raises.
    """
    a, b = a.strip(), b.strip()
    pa, pb = _pep440(a), _pep440(b)
    if pa is not None and pb is not None:
        return (pa > pb) - (pa < pb)
    epoch_a, rest_a = _split_epoch(a)
    epoch_b, rest_b = _split_epoch(b)
    if epoch_a != epoch_b:
        return -1 if epoch_a < epoch_b else 1
    return _rpmvercmp(rest_a, rest_b)


def rank_versions(candidates: list[str | None]) -> tuple[str | None, list[str], bool]:
    """Order fix-version candidates, highest first.

    Returns ``(best, ordered, uncertain)``:
    - ``best``: highest comparable candidate, or None if there is none.
    - ``ordered``: all distinct non-empty candidates; comparable ones first
      (highest first), then non-comparable ones in lexical order.
    - ``uncertain``: True if any candidate is not comparable, so ``best`` may
      not be the version that fixes everything.
    """
    distinct = sorted({c.strip() for c in candidates if c and c.strip()})
    comparable = [c for c in distinct if is_comparable(c)]
    other = [c for c in distinct if not is_comparable(c)]
    comparable.sort(key=functools.cmp_to_key(compare_versions), reverse=True)
    best = comparable[0] if comparable else None
    return best, comparable + other, bool(other)


def highest_version(versions: list[str | None]) -> str | None:
    """Highest comparable version, or None when there is none."""
    return rank_versions(versions)[0]
