"""Excel export: every affected image/component is listed, and the import keeps working."""

from datetime import datetime
from io import BytesIO

import pytest
from openpyxl import Workbook, load_workbook

from app.exports.excel_generator import (
    MAX_CELL_CHARS,
    MAX_CELL_LINES,
    TRANSLATIONS,
    _cell_lines,
    generate_cve_excel,
    parse_import_excel,
)
from app.routers.exports import unique_component_labels, unique_image_names

IMAGES = ["docker.io/library/nats:2.10.10", "quay.io/foo/bar:1.2", "registry.example/baz:3.0"]
COMPONENTS = ["libssl 3.0.7", "openssl 3.0.7"]


def _row(**overrides) -> dict:
    row = {
        "cve_id": "CVE-2024-1234",
        "severity": 4,
        "cvss": 9.8,
        "epss_probability": 0.42,
        "components": COMPONENTS,
        "fixable": True,
        "fixed_by": "3.0.9",
        "image_names": IMAGES,
        "first_seen": datetime(2024, 1, 2),
        "published_on": datetime(2024, 1, 1),
        "priority_level": "",
        "risk_acceptance_status": "",
    }
    row.update(overrides)
    return row


def _sheet(rows: list[dict], lang: str = "en"):
    wb = load_workbook(BytesIO(generate_cve_excel(rows, lang=lang)))
    ws = wb[TRANSLATIONS[lang]["sheet_data"]]
    headers = [c.value for c in ws[1]]
    return wb, ws, headers


def _cell(ws, headers: list, header: str, row: int = 2):
    return ws.cell(row=row, column=headers.index(header) + 1)


class TestGenerateCveExcel:
    def test_lists_every_image_and_component_on_own_line(self):
        _, ws, headers = _sheet([_row()])
        image = _cell(ws, headers, "Image")
        assert image.value == "\n".join(IMAGES)
        assert image.alignment.wrap_text is True
        assert _cell(ws, headers, "Image Count").value == 3
        assert _cell(ws, headers, "Component").value == "libssl 3.0.7\nopenssl 3.0.7"
        assert "Version" not in headers
        assert all("(+" not in str(c.value) for c in ws[2])

    @pytest.mark.parametrize(
        ("images", "expected_cell", "expected_count"),
        [(["quay.io/a:1"], "quay.io/a:1", 1), ([], None, 0)],
    )
    def test_single_or_no_image(self, images, expected_cell, expected_count):
        _, ws, headers = _sheet([_row(image_names=images)])
        assert _cell(ws, headers, "Image").value == expected_cell
        assert _cell(ws, headers, "Image Count").value == expected_count

    def test_german_headers(self):
        _, ws, headers = _sheet([_row()], lang="de")
        assert _cell(ws, headers, "Anzahl Images").value == 3
        assert _cell(ws, headers, "Komponente").value == "libssl 3.0.7\nopenssl 3.0.7"

    def test_editable_columns_and_epss_format_unchanged(self):
        _, ws, headers = _sheet([_row()])
        assert headers.index("RA Justification (fill in)") + 1 == 14  # column N
        assert headers.index("RA Expiry Date (optional, YYYY-MM-DD)") + 1 == 15  # column O
        assert ws["N1"].fill.start_color.rgb.endswith("EC7A08")
        assert ws["O2"].fill.start_color.rgb.endswith("FFF3CD")
        assert _cell(ws, headers, "EPSS").number_format == "0.00%"

    def test_overflow_keeps_true_count(self):
        images = [f"quay.io/team/image-{i}:1.0" for i in range(400)]
        _, ws, headers = _sheet([_row(image_names=images)])
        assert _cell(ws, headers, "Image Count").value == 400
        assert _cell(ws, headers, "Image").value.endswith(f"… and {400 - (MAX_CELL_LINES - 1)} more")


class TestCellLines:
    def test_fits_unchanged(self):
        assert _cell_lines(["a", "b"], "… and {n} more") == "a\nb"

    def test_line_limit(self):
        result = _cell_lines([f"v{i}" for i in range(300)], "… and {n} more")
        lines = result.split("\n")
        assert len(lines) == MAX_CELL_LINES
        assert lines[-1] == f"… and {300 - (MAX_CELL_LINES - 1)} more"

    def test_char_limit(self):
        values = ["x" * 1000 for _ in range(100)]
        result = _cell_lines(values, "… und {n} weitere")
        assert len(result) <= MAX_CELL_CHARS
        kept = result.count("\n")
        assert result.endswith(f"… und {100 - kept} weitere")

    def test_single_oversized_value(self):
        result = _cell_lines(["x" * (MAX_CELL_CHARS + 10)], "… and {n} more")
        assert result == "… and 1 more"


class TestImportRoundTrip:
    @pytest.mark.parametrize("lang", ["de", "en"])
    def test_generated_file_imports(self, lang):
        wb, ws, headers = _sheet([_row()], lang=lang)
        just_col = headers.index(TRANSLATIONS[lang]["columns"][13][0]) + 1
        expiry_col = headers.index(TRANSLATIONS[lang]["columns"][14][0]) + 1
        ws.cell(row=2, column=just_col, value="Not reachable in our setup")
        ws.cell(row=2, column=expiry_col, value="2027-01-31")
        buf = BytesIO()
        wb.save(buf)

        rows = parse_import_excel(buf.getvalue(), lang)
        assert rows == [
            {
                "cve_id": "CVE-2024-1234",
                "justification": "Not reachable in our setup",
                "expires_at": datetime(2027, 1, 31),
            }
        ]

    @pytest.mark.parametrize(
        "headers",
        [
            # Pre-change export layout: separate Component/Version, no image count column.
            [
                "CVE-ID",
                "Severity",
                "CVSS",
                "EPSS",
                "Component",
                "Version",
                "Fixable",
                "Fix Version",
                "Image",
                "First Seen",
                "Published",
                "Priority",
                "RA Status",
                "RA Justification (fill in)",
                "RA Expiry Date (optional, YYYY-MM-DD)",
            ],
            # Reordered and reduced to the columns the import reads.
            ["RA Expiry Date (optional, YYYY-MM-DD)", "RA Justification (fill in)", "CVE-ID"],
        ],
    )
    def test_legacy_and_reordered_headers_import(self, headers):
        wb = Workbook()
        ws = wb.active
        ws.title = "CVE Data"
        ws.append(headers)
        values = {
            "CVE-ID": "CVE-2023-0001",
            "RA Justification (fill in)": "Mitigated by network policy",
            "RA Expiry Date (optional, YYYY-MM-DD)": "",
        }
        ws.append([values.get(h, "x") for h in headers])
        buf = BytesIO()
        wb.save(buf)

        rows = parse_import_excel(buf.getvalue(), "en")
        assert rows == [{"cve_id": "CVE-2023-0001", "justification": "Mitigated by network policy", "expires_at": None}]

    def test_missing_required_column_rejected(self):
        wb = Workbook()
        ws = wb.active
        ws.title = "CVE Data"
        ws.append(["CVE-ID", "RA Justification (fill in)"])
        buf = BytesIO()
        wb.save(buf)

        with pytest.raises(ValueError, match="RA Expiry Date"):
            parse_import_excel(buf.getvalue(), "en")


class TestRowLists:
    def test_image_names_unique_sorted_non_empty(self):
        deployments = [
            {"image_name": "quay.io/b:1"},
            {"image_name": "quay.io/a:1"},
            {"image_name": "quay.io/b:1"},
            {"image_name": ""},
            {"image_name": None},
        ]
        assert unique_image_names(deployments) == ["quay.io/a:1", "quay.io/b:1"]

    def test_component_labels_deduped_and_null_version(self):
        components = [
            {"component_name": "openssl", "component_version": "3.0.7", "fixable": True, "fixed_by": "3.0.9"},
            {"component_name": "openssl", "component_version": "3.0.7", "fixable": False, "fixed_by": None},
            {"component_name": "glibc", "component_version": None},
            {"component_name": "", "component_version": "1.0"},
        ]
        assert unique_component_labels(components) == ["glibc", "openssl 3.0.7"]
