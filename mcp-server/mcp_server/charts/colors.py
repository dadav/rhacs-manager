"""PatternFly-aligned color palette for severity levels and chart elements."""

# Severity colors (PatternFly 6)
SEVERITY_COLORS: dict[int, str] = {
    0: "#6a6e73",  # Unknown — PF grey
    1: "#3e8635",  # Low — PF green
    2: "#f4c145",  # Moderate — PF yellow
    3: "#f0ab00",  # Important — PF gold/orange
    4: "#c9190b",  # Critical — PF red
}

SEVERITY_LABELS: dict[int, str] = {
    0: "Unknown",
    1: "Low",
    2: "Moderate",
    3: "Important",
    4: "Critical",
}

# Fixability colors
COLOR_FIXABLE = "#0066cc"
COLOR_UNFIXABLE = "#c9190b"

# General chart colors
COLOR_AXIS = "#d2d2d2"
COLOR_TEXT = "#151515"
COLOR_TEXT_SECONDARY = "#6a6e73"
COLOR_GRID = "#f0f0f0"
COLOR_BACKGROUND = "#ffffff"

# Heatmap scale (light to dark red)
HEATMAP_SCALE = ["#fce4e4", "#f4b4b4", "#e06666", "#c9190b", "#7d1007"]


def severity_color(level: int) -> str:
    return SEVERITY_COLORS.get(level, SEVERITY_COLORS[0])


def severity_label(level: int) -> str:
    return SEVERITY_LABELS.get(level, SEVERITY_LABELS[0])
