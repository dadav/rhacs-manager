"""Grid heatmap renderer."""

import math

from .colors import COLOR_TEXT_SECONDARY, HEATMAP_SCALE
from .primitives import svg_no_data, svg_rect, svg_text, svg_wrap, text_width

MAX_ROWS = 20


def render_heatmap(
    rows: list[dict],
    row_key: str,
    columns: list[str],
    column_labels: dict[str, str] | None = None,
    color_scale: list[str] | None = None,
    title: str = "",
    width: int = 600,
) -> str:
    """Render a grid heatmap.

    Args:
        rows: List of data dicts, each with row_key and numeric values for each column.
        row_key: Key for row labels.
        columns: List of column keys to display.
        column_labels: Display labels for columns (defaults to column keys).
        color_scale: List of colors from low to high intensity.
        title: Chart title.
        width: SVG width.
    """
    if not rows or not columns:
        return svg_no_data(width, 200, title=title)

    truncated = len(rows) > MAX_ROWS
    display_rows = rows[:MAX_ROWS]
    scale = color_scale or HEATMAP_SCALE
    col_labels = column_labels or {c: c for c in columns}

    # Compute global max for color scaling
    global_max = 0
    for row in display_rows:
        for col in columns:
            global_max = max(global_max, row.get(col, 0))
    global_max = global_max or 1

    # Layout
    padding_top = 70 if title else 50
    padding_bottom = 30
    max_label_len = max(len(str(r.get(row_key, ""))) for r in display_rows)
    padding_left = max(80, text_width("x" * min(max_label_len, 20)) + 20)
    padding_right = 20

    cell_w = (width - padding_left - padding_right) / len(columns)
    cell_h = 28
    height = int(padding_top + len(display_rows) * cell_h + padding_bottom)

    parts: list[str] = []

    if title:
        parts.append(svg_text(width / 2, 24, title, font_size=14, weight="bold"))

    # Column headers
    for j, col in enumerate(columns):
        cx = padding_left + j * cell_w + cell_w / 2
        label = col_labels.get(col, col)
        parts.append(svg_text(cx, padding_top - 10, label, font_size=10, fill=COLOR_TEXT_SECONDARY))

    # Cells
    for i, row in enumerate(display_rows):
        label = str(row.get(row_key, ""))
        ry = padding_top + i * cell_h

        # Row label
        display_label = label[:20] + "..." if len(label) > 20 else label
        parts.append(
            svg_text(
                padding_left - 8,
                ry + cell_h / 2 + 4,
                display_label,
                font_size=10,
                anchor="end",
                fill=COLOR_TEXT_SECONDARY,
            )
        )

        for j, col in enumerate(columns):
            val = row.get(col, 0)
            cell_x = padding_left + j * cell_w

            color = _intensity_color(val, global_max, scale)
            parts.append(svg_rect(cell_x + 1, ry + 1, cell_w - 2, cell_h - 2, color, rx=3))

            # Value text (use white text on dark cells)
            text_fill = "#fff" if val > global_max * 0.5 else COLOR_TEXT_SECONDARY
            if val > 0:
                parts.append(svg_text(cell_x + cell_w / 2, ry + cell_h / 2 + 4, str(val), font_size=10, fill=text_fill))

    if truncated:
        parts.append(
            svg_text(
                width / 2,
                height - 10,
                f"Showing {MAX_ROWS} of {len(rows)} rows",
                font_size=9,
                fill=COLOR_TEXT_SECONDARY,
            )
        )

    return svg_wrap("\n".join(parts), width, height, title=title)


def _intensity_color(value: float, max_value: float, scale: list[str]) -> str:
    """Map a value to a color on the scale."""
    if value <= 0 or max_value <= 0:
        return "#f5f5f5"
    # Use log scale for better distribution
    ratio = math.log1p(value) / math.log1p(max_value)
    idx = min(int(ratio * (len(scale) - 1)), len(scale) - 1)
    return scale[idx]
