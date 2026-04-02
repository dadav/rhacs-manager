"""PDF report generator for CVE exports using fpdf2."""

from datetime import datetime
from io import BytesIO

from fpdf import FPDF
from fpdf.fonts import FontFace

TRANSLATIONS: dict[str, dict] = {
    "de": {
        "severity_labels": {0: "UNBEKANNT", 1: "GERING", 2: "MITTEL", 3: "HOCH", 4: "KRITISCH"},
        "priority_labels": {"critical": "Kritisch", "high": "Hoch", "medium": "Mittel", "low": "Gering"},
        "ra_status_labels": {
            "requested": "Beantragt",
            "approved": "Genehmigt",
            "rejected": "Abgelehnt",
            "expired": "Abgelaufen",
        },
        "page_header": "RHACS CVE Manager - Schwachstellenbericht",
        "page_label": "Seite",
        "report_title": "Schwachstellenbericht",
        "report_subtitle": "RHACS CVE Manager",
        "time_suffix": "Uhr",
        "empty_message": "Keine Schwachstellen fuer den Export gefunden.",
        "stat_total": "CVEs gesamt",
        "stat_critical": "Hoch / Kritisch",
        "stat_fixable": "Behebbar",
        "stat_clusters": "Cluster",
        "section_severity": "Verteilung nach Schweregrad",
        "section_stats": "Weitere Kennzahlen",
        "section_export": "Exportdetails",
        "label_deployments": "Deployments:",
        "label_prioritized": "Priorisiert:",
        "label_risk_acceptances": "Risikoakzeptanzen:",
        "label_created_by": "Erstellt von:",
        "label_unknown_user": "Unbekannt",
        "label_filters": "Filter:",
        "label_no_filters": "Keine (alle sichtbaren CVEs)",
        "label_severity": "Schweregrad:",
        "label_cvss": "CVSS:",
        "label_cvss_desc": "Technischer Schweregrad (0-10)",
        "label_epss": "EPSS:",
        "label_epss_desc": "Wahrscheinlichkeit aktiver Ausnutzung",
        "label_fixable": "Behebbar:",
        "label_fix_version": "Fix-Version:",
        "label_first_seen": "Erstmals gesehen:",
        "label_published": "Veröffentlicht:",
        "label_yes": "Ja",
        "label_no": "Nein",
        "label_priority": "PRIORITAET:",
        "label_deadline": "Frist:",
        "label_ra": "RISIKOAKZEPTANZ:",
        "section_components": "Betroffene Komponenten",
        "table_component": "Komponente",
        "table_version": "Version",
        "table_fix_version": "Fix-Version",
        "table_os": "OS",
        "section_deployments": "Betroffene Deployments",
        "table_deployment": "Deployment",
        "table_namespace": "Namespace",
        "table_cluster": "Cluster",
        "table_image": "Image",
        # Filter labels
        "filter_search": "Suche",
        "filter_severity": "Schweregrad",
        "filter_fixable_yes": "Behebbar: Ja",
        "filter_fixable_no": "Behebbar: Nein",
        "filter_prioritized": "Nur priorisierte",
        "filter_component": "Komponente",
        "filter_ra_status": "RA-Status",
        "filter_cluster": "Cluster",
        "filter_namespace": "Namespace",
    },
    "en": {
        "severity_labels": {0: "UNKNOWN", 1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"},
        "priority_labels": {"critical": "Critical", "high": "High", "medium": "Medium", "low": "Low"},
        "ra_status_labels": {
            "requested": "Requested",
            "approved": "Approved",
            "rejected": "Rejected",
            "expired": "Expired",
        },
        "page_header": "RHACS CVE Manager - Vulnerability Report",
        "page_label": "Page",
        "report_title": "Vulnerability Report",
        "report_subtitle": "RHACS CVE Manager",
        "time_suffix": "",
        "empty_message": "No vulnerabilities found for export.",
        "stat_total": "Total CVEs",
        "stat_critical": "High / Critical",
        "stat_fixable": "Fixable",
        "stat_clusters": "Clusters",
        "section_severity": "Distribution by Severity",
        "section_stats": "Additional Metrics",
        "section_export": "Export Details",
        "label_deployments": "Deployments:",
        "label_prioritized": "Prioritized:",
        "label_risk_acceptances": "Risk Acceptances:",
        "label_created_by": "Created by:",
        "label_unknown_user": "Unknown",
        "label_filters": "Filters:",
        "label_no_filters": "None (all visible CVEs)",
        "label_severity": "Severity:",
        "label_cvss": "CVSS:",
        "label_cvss_desc": "Technical severity score (0-10)",
        "label_epss": "EPSS:",
        "label_epss_desc": "Probability of active exploitation",
        "label_fixable": "Fixable:",
        "label_fix_version": "Fix Version:",
        "label_first_seen": "First Seen:",
        "label_published": "Published:",
        "label_yes": "Yes",
        "label_no": "No",
        "label_priority": "PRIORITY:",
        "label_deadline": "Deadline:",
        "label_ra": "RISK ACCEPTANCE:",
        "section_components": "Affected Components",
        "table_component": "Component",
        "table_version": "Version",
        "table_fix_version": "Fix Version",
        "table_os": "OS",
        "section_deployments": "Affected Deployments",
        "table_deployment": "Deployment",
        "table_namespace": "Namespace",
        "table_cluster": "Cluster",
        "table_image": "Image",
        # Filter labels
        "filter_search": "Search",
        "filter_severity": "Severity",
        "filter_fixable_yes": "Fixable: Yes",
        "filter_fixable_no": "Fixable: No",
        "filter_prioritized": "Prioritized only",
        "filter_component": "Component",
        "filter_ra_status": "RA Status",
        "filter_cluster": "Cluster",
        "filter_namespace": "Namespace",
    },
}

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


def _get_translations(lang: str) -> dict:
    return TRANSLATIONS.get(lang, TRANSLATIONS["de"])


def _sanitize_text(text: str) -> str:
    """Replace Unicode characters unsupported by latin-1 built-in fonts."""
    for char, replacement in _UNICODE_REPLACEMENTS.items():
        text = text.replace(char, replacement)
    return text.encode("latin-1", errors="replace").decode("latin-1")


SEVERITY_COLORS = {
    0: (150, 150, 150),  # grey
    1: (59, 150, 61),  # green
    2: (236, 122, 8),  # orange
    3: (200, 80, 20),  # dark orange
    4: (201, 25, 11),  # red
}

# Usable width = 210mm - 2*10mm margin = 190mm
PAGE_WIDTH = 190

HEADER_STYLE = FontFace(emphasis="BOLD", color=(255, 255, 255), fill_color=(50, 50, 50), size_pt=7)


class CvePdf(FPDF):
    """Custom PDF with header/footer for CVE reports."""

    def __init__(self, total_pages: int, t: dict):
        super().__init__()
        self._total_pages = total_pages
        self._skip_header = False
        self._t = t

    def header(self):
        if self._skip_header:
            return
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, self._t["page_header"], new_x="LMARGIN", new_y="NEXT")
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"{self._t['page_label']} {self.page_no()}/{self._total_pages}", align="C")


def _draw_severity_bar(pdf: CvePdf, severity: int):
    """Draw a colored severity indicator bar at the top of the CVE page."""
    color = SEVERITY_COLORS.get(severity, (150, 150, 150))
    pdf.set_fill_color(*color)
    pdf.rect(10, pdf.get_y(), PAGE_WIDTH, 4, style="F")
    pdf.ln(6)


def _draw_priority_badge(pdf: CvePdf, priority_level: str, deadline: str | datetime | None = None):
    """Draw a prominent priority badge below the CVE title."""
    t = pdf._t
    pdf.set_fill_color(200, 40, 20)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 10)

    translated = t["priority_labels"].get(priority_level, priority_level)
    label = f"{t['label_priority']} {translated.upper()}"
    if deadline:
        if isinstance(deadline, datetime):
            deadline = deadline.strftime("%d.%m.%Y")
        label += f"  |  {t['label_deadline']} {deadline}"

    badge_w = pdf.get_string_width(label) + 10
    pdf.cell(badge_w, 8, _sanitize_text(label), new_x="LMARGIN", new_y="NEXT", fill=True)
    pdf.ln(2)


def _draw_ra_badge(pdf: CvePdf, ra_status: str):
    """Draw a risk acceptance status badge."""
    t = pdf._t
    label = t["ra_status_labels"].get(ra_status, ra_status)
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

    text = f"{t['label_ra']} {label.upper()}"
    badge_w = pdf.get_string_width(text) + 10
    pdf.cell(badge_w, 8, _sanitize_text(text), new_x="LMARGIN", new_y="NEXT", fill=True)
    pdf.ln(2)


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
    pdf.set_fill_color(255, 255, 255)

    with pdf.table(
        col_widths=col_widths,
        headings_style=HEADER_STYLE,
        cell_fill_color=None,
        cell_fill_mode="NONE",
        line_height=pdf.font_size * 2.5,
        text_align="LEFT",
        borders_layout="HORIZONTAL_LINES",
        first_row_as_headings=True,
        padding=1,
    ) as table:
        header_row = table.row()
        for hdr in headers:
            header_row.cell(_sanitize_text(hdr))

        for row_data in rows:
            row = table.row()
            for cell_text in row_data:
                row.cell(_sanitize_text(cell_text))


def _draw_stat_card(
    pdf: CvePdf, x: float, y: float, w: float, h: float, value: str, label: str, color: tuple[int, int, int]
):
    """Draw a rounded stat card with large value and small label."""
    with pdf.local_context(fill_opacity=0.08):
        pdf.set_fill_color(*color)
        pdf.rect(x, y, w, h, style="F", round_corners=True, corner_radius=3)

    pdf.set_fill_color(*color)
    pdf.rect(x, y + 3, 1.5, h - 6, style="F")

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*color)
    pdf.set_xy(x + 6, y + 4)
    pdf.cell(w - 8, 12, _sanitize_text(value), new_x="LEFT")

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.set_xy(x + 6, y + 16)
    pdf.cell(w - 8, 6, _sanitize_text(label), new_x="LEFT")


def _draw_severity_bar_horizontal(
    pdf: CvePdf, x: float, y: float, w: float, h: float, severity_counts: dict[int, int], total: int
):
    """Draw a stacked horizontal bar showing severity distribution."""
    if total == 0:
        return
    with pdf.local_context(fill_opacity=0.06):
        pdf.set_fill_color(0, 0, 0)
        pdf.rect(x, y, w, h, style="F", round_corners=True, corner_radius=h / 2)

    offset = 0.0
    for sev_val in [4, 3, 2, 1, 0]:
        count = severity_counts.get(sev_val, 0)
        if count == 0:
            continue
        seg_w = (count / total) * w
        color = SEVERITY_COLORS.get(sev_val, (150, 150, 150))
        pdf.set_fill_color(*color)
        pdf.rect(x + offset, y, seg_w, h, style="F")
        offset += seg_w


def _draw_severity_legend_row(
    pdf: CvePdf, x: float, y: float, severity: int, count: int, total: int, severity_labels: dict[int, str]
):
    """Draw one row of the severity legend with dot, label, count, percentage."""
    color = SEVERITY_COLORS.get(severity, (150, 150, 150))
    pct = f"{count / total * 100:.0f}%" if total else "0%"

    pdf.set_fill_color(*color)
    pdf.circle(x + 2, y + 3, 2.5, style="F")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(60, 60, 60)
    pdf.set_xy(x + 8, y)
    pdf.cell(28, 7, _sanitize_text(severity_labels.get(severity, "?")))

    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(30, 30, 30)
    pdf.set_xy(x + 36, y)
    pdf.cell(10, 7, str(count), align="R")

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(140, 140, 140)
    pdf.set_xy(x + 50, y)
    pdf.cell(12, 7, pct, align="R")


def _draw_metadata_row(pdf: CvePdf, icon_char: str, label: str, value: str):
    """Draw a metadata row with a small icon placeholder, label, and value."""
    y = pdf.get_y()
    pdf.set_fill_color(230, 235, 245)
    pdf.circle(14, y + 3, 3, style="F")
    pdf.set_font("Helvetica", "B", 6)
    pdf.set_text_color(80, 100, 140)
    pdf.set_xy(12, y + 0.5)
    pdf.cell(5, 6, icon_char, align="C")

    pdf.set_xy(20, y)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(28, 6, _sanitize_text(label), new_x="END")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 6, _sanitize_text(value), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)


def _draw_summary_page(pdf: CvePdf, cves: list[dict], metadata: dict):
    """Draw a visually polished summary first page."""
    t = pdf._t
    severity_labels = t["severity_labels"]

    pdf._skip_header = True
    pdf.add_page()
    pdf._skip_header = False

    # --- Hero banner ---
    pdf.set_fill_color(25, 40, 65)
    pdf.rect(0, 0, 210, 52, style="F")

    pdf.set_fill_color(45, 120, 215)
    pdf.rect(0, 52, 210, 1.5, style="F")

    pdf.set_xy(15, 12)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 12, _sanitize_text(t["report_title"]), new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(15, 26)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(160, 185, 220)
    pdf.cell(0, 7, t["report_subtitle"], new_x="LMARGIN", new_y="NEXT")

    # Date on banner (right-aligned)
    created_at = metadata.get("created_at", datetime.utcnow())
    if isinstance(created_at, datetime):
        date_str = created_at.strftime("%d.%m.%Y")
        time_suffix = t["time_suffix"]
        time_str = created_at.strftime("%H:%M") + (f" {time_suffix}" if time_suffix else "")
    else:
        date_str = str(created_at)
        time_str = ""
    pdf.set_xy(120, 14)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(180, 200, 230)
    pdf.cell(75, 6, _sanitize_text(date_str), align="R")
    if time_str:
        pdf.set_xy(120, 21)
        pdf.cell(75, 6, _sanitize_text(time_str), align="R")

    pdf.set_y(60)

    # --- Compute statistics ---
    total = len(cves)
    severity_counts: dict[int, int] = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
    fixable_count = 0
    prioritized_count = 0
    ra_count = 0
    total_deployments: set[str] = set()
    total_clusters: set[str] = set()

    for cve in cves:
        sev = cve.get("severity", 0)
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        if cve.get("fixable"):
            fixable_count += 1
        if cve.get("priority_level"):
            prioritized_count += 1
        if cve.get("risk_acceptance_status"):
            ra_count += 1
        for d in cve.get("deployments", []):
            total_deployments.add(d.get("deployment_name", ""))
            cl = d.get("cluster_name", "")
            if cl:
                total_clusters.add(cl)

    critical_count = severity_counts.get(4, 0) + severity_counts.get(3, 0)

    # --- Stat cards row ---
    card_y = pdf.get_y()
    card_h = 28
    card_w = 44
    gap = 2.7

    _draw_stat_card(pdf, 10, card_y, card_w, card_h, str(total), t["stat_total"], (45, 120, 215))
    _draw_stat_card(
        pdf, 10 + card_w + gap, card_y, card_w, card_h, str(critical_count), t["stat_critical"], (201, 25, 11)
    )
    _draw_stat_card(
        pdf, 10 + 2 * (card_w + gap), card_y, card_w, card_h, str(fixable_count), t["stat_fixable"], (59, 150, 61)
    )
    _draw_stat_card(
        pdf,
        10 + 3 * (card_w + gap),
        card_y,
        card_w,
        card_h,
        str(len(total_clusters)),
        t["stat_clusters"],
        (120, 80, 180),
    )

    pdf.set_y(card_y + card_h + 10)

    # --- Severity distribution section ---
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 8, _sanitize_text(t["section_severity"]), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    bar_y = pdf.get_y()
    _draw_severity_bar_horizontal(pdf, 10, bar_y, PAGE_WIDTH, 8, severity_counts, total)
    pdf.set_y(bar_y + 14)

    for sev_val in [4, 3, 2, 1, 0]:
        count = severity_counts.get(sev_val, 0)
        if count > 0:
            _draw_severity_legend_row(pdf, 10, pdf.get_y(), sev_val, count, total, severity_labels)
            pdf.set_y(pdf.get_y() + 8)

    pdf.ln(6)

    # --- Separator ---
    pdf.set_draw_color(220, 225, 235)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    # --- Additional stats ---
    if prioritized_count or ra_count or len(total_deployments) > 0:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 8, _sanitize_text(t["section_stats"]), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        stats_items = [
            ("D", t["label_deployments"], str(len(total_deployments))),
        ]
        if prioritized_count:
            stats_items.append(("P", t["label_prioritized"], str(prioritized_count)))
        if ra_count:
            stats_items.append(("R", t["label_risk_acceptances"], str(ra_count)))

        for icon, label, value in stats_items:
            _draw_metadata_row(pdf, icon, label, value)

        pdf.ln(4)
        pdf.set_draw_color(220, 225, 235)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(6)

    # --- Export details ---
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 8, _sanitize_text(t["section_export"]), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    username = metadata.get("username", t["label_unknown_user"])
    _draw_metadata_row(pdf, "U", t["label_created_by"], username)

    # Active filters
    filters = metadata.get("filters", {})
    active_filters: list[str] = []
    if filters.get("search"):
        active_filters.append(f"{t['filter_search']}: {filters['search']}")
    if filters.get("severity") is not None:
        active_filters.append(f"{t['filter_severity']}: {severity_labels.get(filters['severity'], '?')}")
    if filters.get("fixable") is not None:
        active_filters.append(t["filter_fixable_yes"] if filters["fixable"] else t["filter_fixable_no"])
    if filters.get("prioritized_only"):
        active_filters.append(t["filter_prioritized"])
    if filters.get("component"):
        active_filters.append(f"{t['filter_component']}: {filters['component']}")
    if filters.get("risk_status"):
        active_filters.append(f"{t['filter_ra_status']}: {filters['risk_status']}")
    if filters.get("cluster"):
        active_filters.append(f"{t['filter_cluster']}: {filters['cluster']}")
    if filters.get("namespace"):
        active_filters.append(f"{t['filter_namespace']}: {filters['namespace']}")
    if filters.get("cvss_min") is not None:
        active_filters.append(f"CVSS >= {filters['cvss_min']:.1f}")
    if filters.get("epss_min") is not None:
        active_filters.append(f"EPSS >= {filters['epss_min'] * 100:.0f}%")

    filter_text = ", ".join(active_filters) if active_filters else t["label_no_filters"]
    _draw_metadata_row(pdf, "F", t["label_filters"], filter_text)


def generate_cve_pdf(cves: list[dict], metadata: dict | None = None, lang: str = "de") -> bytes:
    """Generate a PDF report with a summary page followed by one page per CVE.

    Each dict in `cves` should contain:
      - cve_id, severity, cvss, epss_probability
      - fixable, fixed_by, first_seen, published_on
      - components: [{component_name, component_version, fixable, fixed_by}]
      - deployments: [{deployment_name, namespace, cluster_name, image_name}]
      - priority_level, priority_deadline (optional)
      - risk_acceptance_status (optional)

    `metadata` optionally contains: username, created_at, filters (dict).
    `lang` selects the output language ("de" or "en").
    """
    if metadata is None:
        metadata = {}

    t = _get_translations(lang)

    if not cves:
        pdf = CvePdf(total_pages=1, t=t)
        pdf.add_page()
        pdf.set_font("Helvetica", "", 12)
        pdf.cell(0, 20, _sanitize_text(t["empty_message"]), align="C")
        buf = BytesIO()
        pdf.output(buf)
        return buf.getvalue()

    pdf = CvePdf(total_pages=len(cves) + 1, t=t)

    _draw_summary_page(pdf, cves, metadata)

    severity_labels = t["severity_labels"]

    for cve in cves:
        pdf.add_page()

        severity = cve.get("severity", 0)
        severity_label = severity_labels.get(severity, severity_labels.get(0, "UNKNOWN"))

        _draw_severity_bar(pdf, severity)

        # CVE title
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 10, cve["cve_id"], new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        # Priority and RA badges
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

        # Info section
        _draw_info_row(pdf, t["label_severity"], severity_label)
        _draw_info_row(pdf, t["label_cvss"], f"{cve.get('cvss', 0):.1f}", t["label_cvss_desc"])
        _draw_info_row(pdf, t["label_epss"], f"{cve.get('epss_probability', 0) * 100:.0f}%", t["label_epss_desc"])
        _draw_info_row(pdf, t["label_fixable"], t["label_yes"] if cve.get("fixable") else t["label_no"])
        if cve.get("fixed_by"):
            _draw_info_row(pdf, t["label_fix_version"], cve["fixed_by"])

        first_seen = cve.get("first_seen")
        if first_seen:
            if isinstance(first_seen, datetime):
                first_seen = first_seen.strftime("%d.%m.%Y")
            _draw_info_row(pdf, t["label_first_seen"], str(first_seen))

        published_on = cve.get("published_on")
        if published_on:
            if isinstance(published_on, datetime):
                published_on = published_on.strftime("%d.%m.%Y")
            _draw_info_row(pdf, t["label_published"], str(published_on))

        pdf.ln(4)
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(4)

        # Components table
        components = cve.get("components", [])
        if components:
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 8, _sanitize_text(t["section_components"]), new_x="LMARGIN", new_y="NEXT")
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
            _draw_table(
                pdf,
                [t["table_component"], t["table_version"], t["table_fix_version"], t["table_os"]],
                comp_rows,
                (70, 40, 45, 35),
            )
            pdf.ln(4)

        # Deployments table
        deployments = cve.get("deployments", [])
        if deployments:
            pdf.set_draw_color(200, 200, 200)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(4)

            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(0, 8, _sanitize_text(t["section_deployments"]), new_x="LMARGIN", new_y="NEXT")
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
            _draw_table(
                pdf,
                [t["table_deployment"], t["table_namespace"], t["table_cluster"], t["table_image"]],
                dep_rows,
                (42, 38, 25, 85),
            )
            pdf.ln(4)

    buf = BytesIO()
    pdf.output(buf)
    return buf.getvalue()
