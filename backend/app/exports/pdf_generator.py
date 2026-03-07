"""PDF report generator for CVE exports using fpdf2."""

from datetime import datetime
from io import BytesIO

from fpdf import FPDF
from fpdf.fonts import FontFace

SEVERITY_LABELS = {0: "UNBEKANNT", 1: "GERING", 2: "MITTEL", 3: "HOCH", 4: "KRITISCH"}

# Characters that can't be encoded in latin-1 (used by fpdf2 built-in fonts)
_UNICODE_REPLACEMENTS = {
    "\u2014": "-",  # em dash
    "\u2013": "-",  # en dash
    "\u2018": "'",  # left single quote
    "\u2019": "'",  # right single quote
    "\u201c": '"',  # left double quote
    "\u201d": '"',  # right double quote
    "\u2026": "...",  # ellipsis
}


def _sanitize_text(text: str) -> str:
    """Replace Unicode characters unsupported by latin-1 built-in fonts."""
    for char, replacement in _UNICODE_REPLACEMENTS.items():
        text = text.replace(char, replacement)
    return text.encode("latin-1", errors="replace").decode("latin-1")


SEVERITY_COLORS = {
    0: (150, 150, 150),  # grey
    1: (59, 150, 61),    # green
    2: (236, 122, 8),    # orange
    3: (200, 80, 20),    # dark orange
    4: (201, 25, 11),    # red
}

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

# Usable width = 210mm - 2*10mm margin = 190mm
PAGE_WIDTH = 190

HEADER_STYLE = FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=(50, 50, 50), size_pt=7)
EVEN_ROW_COLOR = (248, 248, 248)
ODD_ROW_COLOR = (255, 255, 255)


class CvePdf(FPDF):
    """Custom PDF with header/footer for CVE reports."""

    def __init__(self, total_pages: int):
        super().__init__()
        self._total_pages = total_pages

    def header(self):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, "RHACS CVE Manager - Schwachstellenbericht", new_x="LMARGIN", new_y="NEXT")
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"Seite {self.page_no()}/{self._total_pages}", align="C")


def _draw_severity_bar(pdf: CvePdf, severity: int):
    """Draw a colored severity indicator bar at the top of the CVE page."""
    color = SEVERITY_COLORS.get(severity, (150, 150, 150))
    pdf.set_fill_color(*color)
    pdf.rect(10, pdf.get_y(), PAGE_WIDTH, 4, style="F")
    pdf.ln(6)


def _draw_priority_badge(pdf: CvePdf, priority_level: str, deadline: str | datetime | None = None):
    """Draw a prominent priority badge below the CVE title."""
    pdf.set_fill_color(200, 40, 20)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)

    translated = PRIORITY_LABELS.get(priority_level, priority_level)
    label = f"PRIORITAET: {translated.upper()}"
    if deadline:
        if isinstance(deadline, datetime):
            deadline = deadline.strftime("%d.%m.%Y")
        label += f"  |  Frist: {deadline}"

    badge_w = pdf.get_string_width(label) + 10
    pdf.cell(badge_w, 8, _sanitize_text(label), new_x="END", fill=True)
    pdf.ln(4)


def _draw_ra_badge(pdf: CvePdf, ra_status: str):
    """Draw a risk acceptance status badge."""
    label = RA_STATUS_LABELS.get(ra_status, ra_status)
    colors = {
        "requested": (0, 102, 204),
        "approved": (40, 140, 50),
        "rejected": (180, 50, 30),
        "expired": (140, 140, 140),
    }
    color = colors.get(ra_status, (100, 100, 100))
    pdf.set_fill_color(*color)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)

    text = f"RISIKOAKZEPTANZ: {label.upper()}"
    badge_w = pdf.get_string_width(text) + 10
    pdf.cell(badge_w, 8, _sanitize_text(text), new_x="END", fill=True)
    pdf.ln(4)


def _draw_info_row(pdf: CvePdf, label: str, value: str, description: str = ""):
    """Draw a label: value row with optional description."""
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(50, 6, _sanitize_text(label), new_x="END")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(30, 30, 30)
    if description:
        pdf.cell(30, 6, _sanitize_text(value), new_x="END")
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(0, 6, _sanitize_text(description), new_x="LMARGIN", new_y="NEXT")
    else:
        pdf.cell(0, 6, _sanitize_text(value), new_x="LMARGIN", new_y="NEXT")


def _draw_table(pdf: CvePdf, headers: list[str], rows: list[list[str]], col_widths: tuple[float, ...]):
    """Draw a table using fpdf2's Table API for consistent column widths."""
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(30, 30, 30)
    pdf.set_draw_color(200, 200, 200)

    with pdf.table(
        col_widths=col_widths,
        headings_style=HEADER_STYLE,
        cell_fill_color=EVEN_ROW_COLOR,
        cell_fill_mode="ROWS",
        line_height=pdf.font_size * 2.5,
        text_align="LEFT",
        borders_layout="ALL",
        first_row_as_headings=True,
        padding=1,
    ) as table:
        # Header row
        header_row = table.row()
        for hdr in headers:
            header_row.cell(_sanitize_text(hdr))

        # Data rows
        for row_data in rows:
            row = table.row()
            for cell_text in row_data:
                row.cell(_sanitize_text(cell_text))


def generate_cve_pdf(cves: list[dict]) -> bytes:
    """Generate a PDF report with one page per CVE.

    Each dict in `cves` should contain:
      - cve_id, severity, cvss, epss_probability
      - fixable, fixed_by, first_seen, published_on
      - components: [{component_name, component_version, fixable, fixed_by}]
      - deployments: [{deployment_name, namespace, cluster_name, image_name}]
      - priority_level, priority_deadline (optional)
      - risk_acceptance_status (optional)
    """
    if not cves:
        pdf = CvePdf(total_pages=1)
        pdf.add_page()
        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 20, "Keine Schwachstellen fuer den Export gefunden.", align="C")
        buf = BytesIO()
        pdf.output(buf)
        return buf.getvalue()

    pdf = CvePdf(total_pages=len(cves))

    for cve in cves:
        pdf.add_page()

        severity = cve.get("severity", 0)
        severity_label = SEVERITY_LABELS.get(severity, "UNBEKANNT")

        # Severity color bar
        _draw_severity_bar(pdf, severity)

        # CVE title
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 10, cve["cve_id"], new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        # Priority and RA badges — prominent, right after title
        priority_level = cve.get("priority_level")
        ra_status = cve.get("risk_acceptance_status")
        if priority_level:
            _draw_priority_badge(pdf, priority_level, cve.get("priority_deadline"))
        if ra_status:
            _draw_ra_badge(pdf, ra_status)
        if priority_level or ra_status:
            pdf.ln(2)

        # Separator
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)

        # Info section with metric explanations
        _draw_info_row(pdf, "Schweregrad:", severity_label)
        _draw_info_row(
            pdf, "CVSS:", f"{cve.get('cvss', 0):.1f}",
            "Technischer Schweregrad (0-10)",
        )
        _draw_info_row(
            pdf, "EPSS:", f"{cve.get('epss_probability', 0) * 100:.0f}%",
            "Wahrscheinlichkeit aktiver Ausnutzung",
        )
        _draw_info_row(pdf, "Behebbar:", "Ja" if cve.get("fixable") else "Nein")
        if cve.get("fixed_by"):
            _draw_info_row(pdf, "Fix-Version:", cve["fixed_by"])

        first_seen = cve.get("first_seen")
        if first_seen:
            if isinstance(first_seen, datetime):
                first_seen = first_seen.strftime("%d.%m.%Y")
            _draw_info_row(pdf, "Erstmals gesehen:", str(first_seen))

        published_on = cve.get("published_on")
        if published_on:
            if isinstance(published_on, datetime):
                published_on = published_on.strftime("%d.%m.%Y")
            _draw_info_row(pdf, "Veröffentlicht:", str(published_on))

        pdf.ln(4)
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)

        # Components table
        components = cve.get("components", [])
        if components:
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 8, "Betroffene Komponenten", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)

            comp_rows = [
                [
                    c.get("component_name", ""),
                    c.get("component_version", ""),
                    c.get("fixed_by", "") or "",
                    c.get("operating_system", "") or "",
                ]
                for c in components
            ]
            _draw_table(pdf, ["Komponente", "Version", "Fix-Version", "OS"], comp_rows, (70, 40, 45, 35))
            pdf.ln(4)

        # Deployments table
        deployments = cve.get("deployments", [])
        if deployments:
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(4)

            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 8, "Betroffene Deployments", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)

            dep_rows = [
                [
                    d.get("deployment_name", ""),
                    d.get("namespace", ""),
                    d.get("cluster_name", ""),
                    d.get("image_name", ""),
                ]
                for d in deployments
            ]
            _draw_table(pdf, ["Deployment", "Namespace", "Cluster", "Image"], dep_rows, (42, 38, 25, 85))
            pdf.ln(4)

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
