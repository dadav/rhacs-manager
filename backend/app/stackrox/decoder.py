"""Decode protobuf-serialized ImageCVEV2 data from the StackRox central DB."""

import logging

from google.protobuf.message import DecodeError

from .proto.storage.cve_pb2 import ImageCVEV2

logger = logging.getLogger(__name__)

# Map protobuf Source enum values to human-readable names
_SOURCE_NAMES = {
    0: "unknown",
    1: "Red Hat",
    2: "OSV",
    3: "NVD",
}


def decode_cve_protobuf(data: bytes) -> dict:
    """Decode an ImageCVEV2 protobuf message and extract useful fields.

    Returns a dict with:
        summary: CVE description text
        link: primary reference URL (NVD or distro tracker)
        references: list of {"uri": str, "tags": list[str]}
        cvss_metric_urls: list of {"source": str, "url": str}
    """
    msg = ImageCVEV2()
    try:
        msg.ParseFromString(data)
    except DecodeError:
        logger.warning("Failed to decode ImageCVEV2 protobuf (%d bytes)", len(data))
        return {"summary": None, "link": None, "references": [], "cvss_metric_urls": []}

    info = msg.cve_base_info

    references = [{"uri": ref.URI, "tags": list(ref.tags)} for ref in info.references if ref.URI]

    cvss_metric_urls = [
        {"source": _SOURCE_NAMES.get(m.source, str(m.source)), "url": m.url} for m in info.cvss_metrics if m.url
    ]

    return {
        "summary": info.summary or None,
        "link": info.link or None,
        "references": references,
        "cvss_metric_urls": cvss_metric_urls,
    }
