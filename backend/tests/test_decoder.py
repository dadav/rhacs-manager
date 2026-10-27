"""Decoding serialized ImageCVEV2 blobs with the vendored StackRox 4.11.6 proto."""

from app.stackrox.decoder import decode_cve_protobuf
from app.stackrox.proto.storage import cve_pb2


def test_decodes_4_11_6_blob_with_origin():
    msg = cve_pb2.ImageCVEV2(
        id="row-1",
        origin=cve_pb2.VULN_ORIGIN_RED_HAT,
        cve_base_info=cve_pb2.CVEInfo(
            cve="CVE-2026-0001",
            summary="Heap overflow",
            link="https://access.redhat.com/security/cve/CVE-2026-0001",
            references=[cve_pb2.CVEInfo.Reference(URI="https://example.test/advisory", tags=["vendor"])],
        ),
    )

    decoded = decode_cve_protobuf(msg.SerializeToString())

    assert decoded["summary"] == "Heap overflow"
    assert decoded["link"] == "https://access.redhat.com/security/cve/CVE-2026-0001"
    assert decoded["references"] == [{"uri": "https://example.test/advisory", "tags": ["vendor"]}]


def test_vendored_proto_knows_origin_field():
    assert cve_pb2.ImageCVEV2.DESCRIPTOR.fields_by_name["origin"].number == 18


def test_invalid_blob_returns_empty_result():
    decoded = decode_cve_protobuf(b"\xff\xff\xff")

    assert decoded == {"summary": None, "link": None, "references": [], "cvss_metric_urls": []}
