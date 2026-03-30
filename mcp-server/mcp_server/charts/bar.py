"""Bar chart renderer — vertical and horizontal, simple and stacked."""

from .colors import COLOR_GRID, COLOR_TEXT_SECONDARY
from .primitives import svg_legend, svg_line, svg_no_data, svg_rect, svg_text, svg_wrap, text_width


def render_bar_chart(
    bars: list[dict],
    x_key: str,
    y_key: str,
    color_map: dict[str, str] | None = None,
    color_key: str | None = None,
    title: str = "",
    width: int = 600,
    height: int = 350,
    horizontal: bool = False,
) -> str:
    """Render a bar chart.

    Args:
        bars: List of data dicts, each with at least x_key and y_key.
        x_key: Key for category labels.
        y_key: Key for numeric values.
        color_map: Optional mapping of x_key values to fill colors.
        color_key: Alternative: key in each dict that holds a color string.
        title: Chart title.
        width: SVG width.
        height: SVG height.
        horizontal: If True, render horizontal bars.
    """
    if not bars:
        return svg_no_data(width, height, title=title)

    padding_top = 50 if title else 30
    padding_bottom = 50
    padding_left = 60
    padding_right = 20

    if horizontal:
        # For horizontal bars, we need more left padding for labels
        max_label_len = max(len(str(b.get(x_key, ""))) for b in bars)
        padding_left = max(80, text_width("x" * min(max_label_len, 20)) + 20)

    chart_w = width - padding_left - padding_right
    chart_h = height - padding_top - padding_bottom
    max_val = max(b.get(y_key, 0) for b in bars) or 1

    parts: list[str] = []

    # Title
    if title:
        parts.append(svg_text(width / 2, 24, title, font_size=14, weight="bold"))

    if horizontal:
        bar_h = min(chart_h / len(bars) * 0.7, 30)
        gap = (chart_h - bar_h * len(bars)) / max(len(bars), 1)

        # Grid lines
        for i in range(5):
            gx = padding_left + chart_w * i / 4
            parts.append(svg_line(gx, padding_top, gx, padding_top + chart_h, stroke=COLOR_GRID))
            val = int(max_val * i / 4)
            parts.append(svg_text(gx, height - padding_bottom + 16, str(val), font_size=9, fill=COLOR_TEXT_SECONDARY))

        for i, bar in enumerate(bars):
            label = str(bar.get(x_key, ""))
            val = bar.get(y_key, 0)
            bw = (val / max_val) * chart_w if max_val else 0
            by = padding_top + i * (bar_h + gap) + gap / 2

            color = _resolve_color(bar, label, color_map, color_key, i)
            parts.append(svg_rect(padding_left, by, bw, bar_h, color, rx=2))

            # Label on left
            display_label = label[:20] + "..." if len(label) > 20 else label
            parts.append(
                svg_text(
                    padding_left - 6,
                    by + bar_h / 2 + 4,
                    display_label,
                    font_size=10,
                    anchor="end",
                    fill=COLOR_TEXT_SECONDARY,
                )
            )

            # Value on bar
            if bw > 30:
                parts.append(
                    svg_text(
                        padding_left + bw - 6, by + bar_h / 2 + 4, str(val), font_size=10, anchor="end", fill="#fff"
                    )
                )
            else:
                parts.append(
                    svg_text(
                        padding_left + bw + 4,
                        by + bar_h / 2 + 4,
                        str(val),
                        font_size=10,
                        anchor="start",
                        fill=COLOR_TEXT_SECONDARY,
                    )
                )
    else:
        bar_w = min(chart_w / len(bars) * 0.7, 60)
        gap = (chart_w - bar_w * len(bars)) / max(len(bars) + 1, 1)

        # Y-axis grid lines
        for i in range(5):
            gy = padding_top + chart_h - chart_h * i / 4
            parts.append(svg_line(padding_left, gy, padding_left + chart_w, gy, stroke=COLOR_GRID))
            val = int(max_val * i / 4)
            parts.append(
                svg_text(padding_left - 8, gy + 4, str(val), font_size=9, anchor="end", fill=COLOR_TEXT_SECONDARY)
            )

        for i, bar in enumerate(bars):
            label = str(bar.get(x_key, ""))
            val = bar.get(y_key, 0)
            bh = (val / max_val) * chart_h if max_val else 0
            bx = padding_left + gap + i * (bar_w + gap)
            by = padding_top + chart_h - bh

            color = _resolve_color(bar, label, color_map, color_key, i)
            parts.append(svg_rect(bx, by, bar_w, bh, color, rx=2))

            # X-axis label
            display_label = label[:10] + ".." if len(label) > 10 else label
            parts.append(
                svg_text(
                    bx + bar_w / 2, height - padding_bottom + 16, display_label, font_size=9, fill=COLOR_TEXT_SECONDARY
                )
            )

            # Value above bar
            parts.append(svg_text(bx + bar_w / 2, by - 4, str(val), font_size=9, fill=COLOR_TEXT_SECONDARY))

    return svg_wrap("\n".join(parts), width, height, title=title)


def render_stacked_bar_chart(
    bars: list[dict],
    x_key: str,
    stack_keys: list[str],
    stack_colors: dict[str, str],
    stack_labels: dict[str, str] | None = None,
    title: str = "",
    width: int = 600,
    height: int = 380,
    horizontal: bool = True,
) -> str:
    """Render a stacked bar chart.

    Args:
        bars: List of data dicts.
        x_key: Key for category labels.
        stack_keys: Keys to stack (rendered in order, left-to-right or bottom-to-top).
        stack_colors: Color for each stack key.
        stack_labels: Display label for each stack key (defaults to key name).
        title: Chart title.
        width: SVG width.
        height: SVG height.
        horizontal: If True, render horizontal stacked bars.
    """
    if not bars:
        return svg_no_data(width, height, title=title)

    labels = stack_labels or {k: k for k in stack_keys}
    padding_top = 50 if title else 30
    padding_bottom = 60  # room for legend
    padding_right = 20

    max_label_len = max(len(str(b.get(x_key, ""))) for b in bars)
    padding_left = max(80, text_width("x" * min(max_label_len, 20)) + 20) if horizontal else 60

    chart_w = width - padding_left - padding_right
    chart_h = height - padding_top - padding_bottom
    max_val = max(sum(b.get(k, 0) for k in stack_keys) for b in bars) or 1

    parts: list[str] = []

    if title:
        parts.append(svg_text(width / 2, 24, title, font_size=14, weight="bold"))

    if horizontal:
        bar_h = min(chart_h / len(bars) * 0.7, 30)
        gap = (chart_h - bar_h * len(bars)) / max(len(bars), 1)

        for i, bar in enumerate(bars):
            label = str(bar.get(x_key, ""))
            by = padding_top + i * (bar_h + gap) + gap / 2
            offset = 0.0

            display_label = label[:20] + "..." if len(label) > 20 else label
            parts.append(
                svg_text(
                    padding_left - 6,
                    by + bar_h / 2 + 4,
                    display_label,
                    font_size=10,
                    anchor="end",
                    fill=COLOR_TEXT_SECONDARY,
                )
            )

            total = sum(bar.get(k, 0) for k in stack_keys)
            for key in stack_keys:
                val = bar.get(key, 0)
                if val <= 0:
                    continue
                seg_w = (val / max_val) * chart_w
                parts.append(svg_rect(padding_left + offset, by, seg_w, bar_h, stack_colors[key], rx=0))
                offset += seg_w

            # Total value
            parts.append(
                svg_text(
                    padding_left + offset + 4,
                    by + bar_h / 2 + 4,
                    str(total),
                    font_size=10,
                    anchor="start",
                    fill=COLOR_TEXT_SECONDARY,
                )
            )
    else:
        bar_w = min(chart_w / len(bars) * 0.7, 60)
        gap_size = (chart_w - bar_w * len(bars)) / max(len(bars) + 1, 1)

        # Y-axis grid
        for i in range(5):
            gy = padding_top + chart_h - chart_h * i / 4
            parts.append(svg_line(padding_left, gy, padding_left + chart_w, gy, stroke=COLOR_GRID))
            val = int(max_val * i / 4)
            parts.append(
                svg_text(padding_left - 8, gy + 4, str(val), font_size=9, anchor="end", fill=COLOR_TEXT_SECONDARY)
            )

        for i, bar in enumerate(bars):
            label = str(bar.get(x_key, ""))
            bx = padding_left + gap_size + i * (bar_w + gap_size)
            offset = 0.0

            for key in stack_keys:
                val = bar.get(key, 0)
                if val <= 0:
                    continue
                seg_h = (val / max_val) * chart_h
                by = padding_top + chart_h - offset - seg_h
                parts.append(svg_rect(bx, by, bar_w, seg_h, stack_colors[key], rx=0))
                offset += seg_h

            display_label = label[:10] + ".." if len(label) > 10 else label
            parts.append(
                svg_text(
                    bx + bar_w / 2, padding_top + chart_h + 16, display_label, font_size=9, fill=COLOR_TEXT_SECONDARY
                )
            )

    # Legend
    legend_items = [(labels.get(k, k), stack_colors[k]) for k in stack_keys]
    parts.append(svg_legend(legend_items, padding_left, height - 20, font_size=10))

    return svg_wrap("\n".join(parts), width, height, title=title)


# Default color palette for bars without explicit color mapping
_DEFAULT_COLORS = ["#0066cc", "#4cb140", "#f0ab00", "#c9190b", "#6a6e73", "#009596", "#5752d1"]


def _resolve_color(bar: dict, label: str, color_map: dict[str, str] | None, color_key: str | None, index: int) -> str:
    if color_key and color_key in bar:
        return bar[color_key]
    if color_map and label in color_map:
        return color_map[label]
    return _DEFAULT_COLORS[index % len(_DEFAULT_COLORS)]
