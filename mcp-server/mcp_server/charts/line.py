"""Line chart renderer — multi-series time-series support."""

from .colors import COLOR_GRID, COLOR_TEXT_SECONDARY
from .primitives import svg_legend, svg_line, svg_no_data, svg_path, svg_text, svg_wrap


def render_line_chart(
    points: list[dict],
    x_key: str,
    series: list[dict],
    title: str = "",
    width: int = 600,
    height: int = 350,
) -> str:
    """Render a multi-series line chart.

    Args:
        points: List of data dicts sorted by x_key, each containing x_key and series value keys.
        x_key: Key for the x-axis (typically a date string).
        series: List of series configs, each with "key", "color", and "label".
            Example: [{"key": "critical", "color": "#c9190b", "label": "Critical"}]
        title: Chart title.
        width: SVG width.
        height: SVG height.
    """
    if not points or not series:
        return svg_no_data(width, height, title=title)

    padding_top = 50 if title else 30
    padding_bottom = 60
    padding_left = 55
    padding_right = 20

    chart_w = width - padding_left - padding_right
    chart_h = height - padding_top - padding_bottom

    # Compute max value across all series
    max_val = 0
    for p in points:
        for s in series:
            max_val = max(max_val, p.get(s["key"], 0))
    max_val = max_val or 1

    # Round up to a nice grid value
    max_val = _nice_max(max_val)

    parts: list[str] = []

    if title:
        parts.append(svg_text(width / 2, 24, title, font_size=14, weight="bold"))

    # Y-axis grid
    grid_steps = 4
    for i in range(grid_steps + 1):
        gy = padding_top + chart_h - chart_h * i / grid_steps
        parts.append(svg_line(padding_left, gy, padding_left + chart_w, gy, stroke=COLOR_GRID))
        val = int(max_val * i / grid_steps)
        parts.append(svg_text(padding_left - 8, gy + 4, str(val), font_size=9, anchor="end", fill=COLOR_TEXT_SECONDARY))

    # X-axis labels (show ~6 evenly spaced labels)
    n = len(points)
    label_count = min(n, 6)
    for i in range(label_count):
        idx = int(i * (n - 1) / max(label_count - 1, 1)) if label_count > 1 else 0
        lx = padding_left + (idx / max(n - 1, 1)) * chart_w
        label = str(points[idx].get(x_key, ""))
        # Shorten date labels (e.g., "2024-03-15" -> "03-15")
        if len(label) == 10 and label[4] == "-":
            label = label[5:]
        parts.append(svg_text(lx, padding_top + chart_h + 16, label, font_size=9, fill=COLOR_TEXT_SECONDARY))

    # Draw each series line
    for s in series:
        key = s["key"]
        color = s["color"]
        path_parts: list[str] = []

        for i, p in enumerate(points):
            val = p.get(key, 0)
            px = padding_left + (i / max(n - 1, 1)) * chart_w
            py = padding_top + chart_h - (val / max_val) * chart_h
            cmd = "M" if i == 0 else "L"
            path_parts.append(f"{cmd}{px:.1f},{py:.1f}")

        parts.append(svg_path(" ".join(path_parts), stroke=color, width=2))

    # Legend
    legend_items = [(s["label"], s["color"]) for s in series]
    parts.append(svg_legend(legend_items, padding_left, height - 16, font_size=10))

    return svg_wrap("\n".join(parts), width, height, title=title)


def _nice_max(val: float) -> float:
    """Round up to a nice grid-friendly value."""
    if val <= 0:
        return 1
    magnitude = 10 ** len(str(int(val))) / 10
    for nice in [1, 2, 2.5, 5, 10]:
        candidate = nice * magnitude
        if candidate >= val:
            return candidate
    return val
