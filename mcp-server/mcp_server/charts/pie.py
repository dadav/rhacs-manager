"""Pie chart renderer."""

import math

from .colors import COLOR_TEXT_SECONDARY
from .primitives import svg_legend, svg_no_data, svg_path, svg_text, svg_wrap


def render_pie_chart(
    slices: list[dict],
    value_key: str,
    label_key: str,
    color_map: dict[str, str],
    title: str = "",
    size: int = 300,
) -> str:
    """Render a pie chart.

    Args:
        slices: List of data dicts with at least value_key and label_key.
        value_key: Key for numeric values.
        label_key: Key for slice labels.
        color_map: Mapping of label values to fill colors.
        title: Chart title.
        size: SVG width and height (square).
    """
    # Filter out zero slices
    slices = [s for s in slices if s.get(value_key, 0) > 0]
    if not slices:
        return svg_no_data(size, size, title=title)

    total = sum(s.get(value_key, 0) for s in slices)
    if total <= 0:
        return svg_no_data(size, size, title=title)

    padding_top = 40 if title else 10
    padding_bottom = 30  # legend space
    cx = size / 2
    cy = padding_top + (size - padding_top - padding_bottom) / 2
    radius = min(cx - 20, cy - padding_top - 10, (size - padding_top - padding_bottom) / 2 - 5)

    parts: list[str] = []

    if title:
        parts.append(svg_text(size / 2, 24, title, font_size=14, weight="bold"))

    start_angle = -math.pi / 2  # Start from top

    for s in slices:
        val = s.get(value_key, 0)
        label = str(s.get(label_key, ""))
        pct = val / total
        sweep = pct * 2 * math.pi

        if pct >= 1.0:
            # Full circle — draw as a circle
            parts.append(f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="{color_map.get(label, "#6a6e73")}"/>')
        else:
            end_angle = start_angle + sweep
            x1 = cx + radius * math.cos(start_angle)
            y1 = cy + radius * math.sin(start_angle)
            x2 = cx + radius * math.cos(end_angle)
            y2 = cy + radius * math.sin(end_angle)
            large_arc = 1 if sweep > math.pi else 0

            d = f"M{cx},{cy} L{x1:.1f},{y1:.1f} A{radius},{radius} 0 {large_arc},1 {x2:.1f},{y2:.1f} Z"
            parts.append(svg_path(d, fill=color_map.get(label, "#6a6e73"), stroke="#fff", width=1))

            # Label outside the slice (for slices > 8%)
            if pct > 0.08:
                mid_angle = start_angle + sweep / 2
                label_r = radius + 16
                lx = cx + label_r * math.cos(mid_angle)
                ly = cy + label_r * math.sin(mid_angle)
                parts.append(svg_text(lx, ly + 4, f"{val}", font_size=9, fill=COLOR_TEXT_SECONDARY))

            start_angle = end_angle

    # Legend
    legend_items = [(str(s.get(label_key, "")), color_map.get(str(s.get(label_key, "")), "#6a6e73")) for s in slices]
    parts.append(svg_legend(legend_items, 10, size - 18, font_size=10))

    return svg_wrap("\n".join(parts), size, size, title=title)
