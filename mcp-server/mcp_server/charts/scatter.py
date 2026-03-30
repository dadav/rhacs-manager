"""Scatter plot renderer."""

from .colors import COLOR_GRID, COLOR_TEXT_SECONDARY
from .primitives import svg_circle, svg_legend, svg_line, svg_no_data, svg_text, svg_wrap

MAX_POINTS = 200


def render_scatter_chart(
    points: list[dict],
    x_key: str,
    y_key: str,
    color_key: str | None = None,
    color_map: dict[str, str] | None = None,
    label_key: str | None = None,
    title: str = "",
    x_label: str = "",
    y_label: str = "",
    width: int = 600,
    height: int = 400,
) -> str:
    """Render a scatter plot.

    Args:
        points: List of data dicts.
        x_key: Key for x-axis values.
        y_key: Key for y-axis values.
        color_key: Key in each point dict that determines the color group.
        color_map: Mapping of color_key values to fill colors.
        label_key: Key for point labels (shown on hover/tooltip).
        title: Chart title.
        x_label: X-axis label.
        y_label: Y-axis label.
        width: SVG width.
        height: SVG height.
    """
    if not points:
        return svg_no_data(width, height, title=title)

    truncated = len(points) > MAX_POINTS
    display_points = points[:MAX_POINTS]

    padding_top = 50 if title else 30
    padding_bottom = 55
    padding_left = 60
    padding_right = 20

    chart_w = width - padding_left - padding_right
    chart_h = height - padding_top - padding_bottom

    x_vals = [p.get(x_key, 0) for p in display_points]
    y_vals = [p.get(y_key, 0) for p in display_points]

    x_min, x_max = min(x_vals), max(x_vals)
    y_min, y_max = min(y_vals), max(y_vals)

    # Add padding to ranges
    x_range = x_max - x_min or 1
    y_range = y_max - y_min or 1
    x_min -= x_range * 0.05
    x_max += x_range * 0.05
    y_min -= y_range * 0.05
    y_max += y_range * 0.05
    x_range = x_max - x_min
    y_range = y_max - y_min

    parts: list[str] = []

    if title:
        parts.append(svg_text(width / 2, 24, title, font_size=14, weight="bold"))

    # Grid
    for i in range(5):
        # Y grid
        gy = padding_top + chart_h - chart_h * i / 4
        parts.append(svg_line(padding_left, gy, padding_left + chart_w, gy, stroke=COLOR_GRID))
        y_val = y_min + y_range * i / 4
        parts.append(
            svg_text(padding_left - 8, gy + 4, f"{y_val:.2f}", font_size=9, anchor="end", fill=COLOR_TEXT_SECONDARY)
        )

        # X grid
        gx = padding_left + chart_w * i / 4
        parts.append(svg_line(gx, padding_top, gx, padding_top + chart_h, stroke=COLOR_GRID))
        x_val = x_min + x_range * i / 4
        parts.append(svg_text(gx, padding_top + chart_h + 16, f"{x_val:.1f}", font_size=9, fill=COLOR_TEXT_SECONDARY))

    # Axis labels
    if x_label:
        parts.append(svg_text(padding_left + chart_w / 2, height - 8, x_label, font_size=11, fill=COLOR_TEXT_SECONDARY))
    if y_label:
        parts.append(
            svg_text(
                14,
                padding_top + chart_h / 2,
                y_label,
                font_size=11,
                fill=COLOR_TEXT_SECONDARY,
                transform=f"rotate(-90,14,{padding_top + chart_h / 2})",
            )
        )

    # Points
    default_color = "#0066cc"
    for p in display_points:
        xv = p.get(x_key, 0)
        yv = p.get(y_key, 0)
        px = padding_left + ((xv - x_min) / x_range) * chart_w
        py = padding_top + chart_h - ((yv - y_min) / y_range) * chart_h

        color = default_color
        if color_key and color_map:
            group = str(p.get(color_key, ""))
            color = color_map.get(group, default_color)

        parts.append(svg_circle(px, py, 4, color, stroke="#fff", stroke_width=0.5))

    # Truncation note
    if truncated:
        parts.append(
            svg_text(
                width - padding_right,
                padding_top - 8,
                f"Showing {MAX_POINTS} of {len(points)} points",
                font_size=9,
                anchor="end",
                fill=COLOR_TEXT_SECONDARY,
            )
        )

    # Legend
    if color_map:
        legend_items = [(label, color) for label, color in color_map.items()]
        parts.append(svg_legend(legend_items, padding_left, height - 14, font_size=10))

    return svg_wrap("\n".join(parts), width, height, title=title)
