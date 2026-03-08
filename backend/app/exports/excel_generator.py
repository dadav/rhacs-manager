"""Excel export/import for CVE data and risk acceptance batch creation."""

from datetime import datetime
from io import BytesIO

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


SEVERITY_LABELS = {0: "Unbekannt", 1: "Gering", 2: "Mittel", 3: "Hoch", 4: "Kritisch"}

PRIORITY_LABELS = {
    "critical": "Kritisch",
    "high": "Hoch",
    "medium": "Mittel",
    "low": "Gering",
}

RA_STATUS_LABELS = {
    "requested": "Beantragt",
    "approved": "Genehmigt",
    "rejected": "Abgelehnt",
    "expired": "Abgelaufen",
}

DATA_COLUMNS = [
    ("CVE-ID", 18),
    ("Schweregrad", 14),
    ("CVSS", 8),
    ("EPSS", 10),
    ("Komponente", 22),
    ("Version", 14),
    ("Behebbar", 10),
    ("Fix-Version", 16),
    ("Image", 40),
    ("Erstmals gesehen", 16),
    ("Veröffentlicht", 16),
    ("Priorität", 12),
    ("RA-Status", 14),
    ("RA-Begründung (ausfüllen)", 44),
    ("RA-Ablaufdatum (optional, JJJJ-MM-TT)", 34),
]

INSTRUCTIONS_TEXT = """ANLEITUNG — CVE-Risikoakzeptanz per Excel-Import

So erstellen Sie Risikoakzeptanzen über diesen Excel-Import:

1. BEGRÜNDUNG AUSFÜLLEN
   Tragen Sie in der Spalte "RA-Begründung (ausfüllen)" (Spalte N) Ihre Begründung für die Risikoakzeptanz ein.
   - Mindestens 10 Zeichen, maximal 5000 Zeichen.
   - Nur Zeilen mit ausgefüllter Begründung werden importiert.

2. ABLAUFDATUM (OPTIONAL)
   Tragen Sie in der Spalte "RA-Ablaufdatum (optional, JJJJ-MM-TT)" (Spalte O) ein optionales Ablaufdatum ein.
   - Format: JJJJ-MM-TT (z.B. 2025-12-31)
   - Wenn leer, wird kein Ablaufdatum gesetzt.

3. GELTUNGSBEREICH
   Beim Import wird der Geltungsbereich automatisch ermittelt:
   - Alle betroffenen Namespaces des Benutzers werden für die CVE berücksichtigt (Namespace-Scope).

4. IMPORT
   Laden Sie die ausgefüllte Datei im CVE-Manager hoch:
   - Schwachstellen → "Excel importieren"
   - Vorschau prüfen → "Importieren" bestätigen

HINWEISE:
- Ändern Sie NICHT die Spaltenreihenfolge oder -namen in Sheet "CVE-Daten".
- Nur Team-Mitglieder können importieren (Security-Team hat keine Import-Berechtigung).
- Bereits existierende aktive Risikoakzeptanzen für dieselbe CVE+Scope werden nicht dupliziert.
"""


def generate_cve_excel(rows: list[dict]) -> bytes:
    """Generate an Excel workbook with CVE data and instruction sheet.

    Each dict in `rows` should contain:
      cve_id, severity, cvss, epss_probability, component_name, component_version,
      fixable, fixed_by, image_name, first_seen, published_on, priority_level,
      risk_acceptance_status
    """
    wb = Workbook()

    # Sheet 1: CVE-Daten
    ws = wb.active
    ws.title = "CVE-Daten"

    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="0066CC", end_color="0066CC", fill_type="solid")

    # Find indices for editable columns (Begründung, Ablaufdatum) and EPSS
    col_names = [name for name, _ in DATA_COLUMNS]
    begr_col = col_names.index("RA-Begründung (ausfüllen)") + 1
    ablauf_col = col_names.index("RA-Ablaufdatum (optional, JJJJ-MM-TT)") + 1
    epss_col = col_names.index("EPSS") + 1
    editable_cols = [begr_col, ablauf_col]

    for col_idx, (col_name, col_width) in enumerate(DATA_COLUMNS, start=1):
        cell = ws.cell(row=1, column=col_idx, value=col_name)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        ws.column_dimensions[cell.column_letter].width = col_width

    # Highlight editable column headers
    editable_fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")
    for col_idx in editable_cols:
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = PatternFill(start_color="EC7A08", end_color="EC7A08", fill_type="solid")

    for row_idx, row_data in enumerate(rows, start=2):
        severity = row_data.get("severity", 0)
        first_seen = row_data.get("first_seen")
        published_on = row_data.get("published_on")

        values = [
            row_data.get("cve_id", ""),
            SEVERITY_LABELS.get(severity, "Unbekannt"),
            round(row_data.get("cvss", 0), 1),
            row_data.get("epss_probability", 0),  # raw 0-1 value, formatted as percentage
            row_data.get("component_name", ""),
            row_data.get("component_version", ""),
            "Ja" if row_data.get("fixable") else "Nein",
            row_data.get("fixed_by", "") or "",
            row_data.get("image_name", ""),
            first_seen.strftime("%Y-%m-%d") if isinstance(first_seen, datetime) else str(first_seen or ""),
            published_on.strftime("%Y-%m-%d") if isinstance(published_on, datetime) else str(published_on or ""),
            PRIORITY_LABELS.get(row_data.get("priority_level", ""), row_data.get("priority_level", "")) or "",
            RA_STATUS_LABELS.get(row_data.get("risk_acceptance_status", ""), row_data.get("risk_acceptance_status", "")) or "",
            "",  # Begründung (empty for user to fill)
            "",  # Ablaufdatum (empty for user to fill)
        ]

        for col_idx, val in enumerate(values, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            # Apply percentage format to EPSS column
            if col_idx == epss_col:
                cell.number_format = '0.00%'
            # Highlight editable cells
            if col_idx in editable_cols:
                cell.fill = editable_fill

    last_col = get_column_letter(len(DATA_COLUMNS))
    ws.auto_filter.ref = f"A1:{last_col}{len(rows) + 1}"
    ws.freeze_panes = "A2"

    # Sheet 2: Anleitung
    ws_help = wb.create_sheet("Anleitung")
    ws_help.column_dimensions["A"].width = 100
    ws_help.cell(row=1, column=1, value="CVE-Import Anleitung").font = Font(bold=True, size=14)
    for line_idx, line in enumerate(INSTRUCTIONS_TEXT.strip().split("\n"), start=3):
        ws_help.cell(row=line_idx, column=1, value=line)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def parse_import_excel(file_bytes: bytes) -> list[dict]:
    """Parse an uploaded Excel file and extract rows with non-empty Begründung.

    Returns a list of dicts with keys:
      cve_id, justification, expires_at
    """
    wb = load_workbook(BytesIO(file_bytes), read_only=True, data_only=True)

    if "CVE-Daten" not in wb.sheetnames:
        raise ValueError("Sheet 'CVE-Daten' nicht gefunden")

    ws = wb["CVE-Daten"]

    # Read header row to find column indices
    headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    expected = {name for name, _ in DATA_COLUMNS}
    header_set = {h for h in headers if h is not None}
    missing = expected - header_set
    if missing:
        raise ValueError(f"Fehlende Spalten: {', '.join(sorted(missing))}")

    col_map = {name: idx for idx, name in enumerate(headers) if name is not None}

    results: list[dict] = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        justification_idx = col_map.get("RA-Begründung (ausfüllen)")
        if justification_idx is None:
            continue
        justification = row[justification_idx]
        if not justification or not str(justification).strip():
            continue

        justification = str(justification).strip()

        # Parse expires_at
        expires_at_idx = col_map.get("RA-Ablaufdatum (optional, JJJJ-MM-TT)")
        expires_at = None
        if expires_at_idx is not None:
            raw_date = row[expires_at_idx]
            if raw_date:
                raw_str = str(raw_date).strip()
                if raw_str:
                    try:
                        expires_at = datetime.strptime(raw_str[:10], "%Y-%m-%d")
                    except ValueError:
                        if isinstance(raw_date, datetime):
                            expires_at = raw_date

        cve_id = str(row[col_map["CVE-ID"]] or "").strip()

        results.append({
            "cve_id": cve_id,
            "justification": justification,
            "expires_at": expires_at,
        })

    wb.close()
    return results
