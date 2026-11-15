"""StackRox component sources verified against the vendored release tag.

SourceType: https://github.com/stackrox/stackrox/blob/4.11.6/proto/storage/image.proto#L140-L149
"""

import logging
import re

logger = logging.getLogger(__name__)

COMPONENT_SOURCE_NAMES: dict[int, str] = {
    0: "os",
    1: "python",
    2: "java",
    3: "ruby",
    4: "nodejs",
    5: "dotnetcoreruntime",
    6: "infrastructure",
    7: "go",
}
OS_SOURCE_CODE = 0
_ARCHIVE = re.compile(r"(?:^|/)([^/:]+\.(?:jar|war|ear|zip|whl|egg|gem|nupkg|tar\.gz|tgz))(?=[:/]|$)", re.IGNORECASE)


def source_name(code: int | None) -> str:
    name = COMPONENT_SOURCE_NAMES.get(code)
    if name is None:
        if code is not None:
            logger.warning("Unknown StackRox SourceType value, treating as 'other'", extra={"source_code": code})
        return "other"
    return name


def embedded_in(component_name: str, location: str | None) -> str | None:
    """Outermost archive containing a different or nested component artifact."""
    if not location:
        return None
    archive = _ARCHIVE.search(location)
    if archive is None:
        return None
    filename = archive.group(1)
    artifact = component_name.rsplit(":", 1)[-1].rsplit("/", 1)[-1].casefold()
    if location[archive.end() :].startswith(":") or artifact not in filename.casefold():
        return filename
    return None
