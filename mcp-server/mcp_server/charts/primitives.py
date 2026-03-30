"""Low-level SVG building blocks for chart rendering.

All functions return SVG XML fragments as strings. No external dependencies.
"""

from html import escape

from .colors import COLOR_AXIS, COLOR_TEXT, COLOR_TEXT_SECONDARY


def text_width(text: str, font_size: float = 11) -> int:
    """Approximate pixel width for Verdana at a given font size.

    Uses a 0.62 ratio (avg char width / font size) which works reasonably
    for Verdana. Same heuristic as the badge generator.
    """
    return max(int(len(text) * font_size * 0.62), 20)


def svg_wrap(inner: str, width: int, height: int, title: str = "") -> str:
    """Wrap SVG content in a root <svg> element with viewBox."""
    title_el = f"  <title>{escape(title)}</title>\n" if title else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}" '
        f'font-family="Verdana,Geneva,DejaVu Sans,sans-serif">\n'
        f"{title_el}"
        f"{inner}"
        f"</svg>"
    )


def svg_rect(x: float, y: float, w: float, h: float, fill: str, rx: float = 0) -> str:
    rx_attr = f' rx="{rx}"' if rx else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"{rx_attr}/>'


def svg_text(
    x: float,
    y: float,
    text: str,
    font_size: float = 11,
    anchor: str = "middle",
    fill: str = COLOR_TEXT,
    weight: str = "normal",
    transform: str = "",
) -> str:
    weight_attr = f' font-weight="{weight}"' if weight != "normal" else ""
    transform_attr = f' transform="{transform}"' if transform else ""
    return (
        f'<text x="{x}" y="{y}" font-size="{font_size}" text-anchor="{anchor}" '
        f'fill="{fill}"{weight_attr}{transform_attr}>{escape(str(text))}</text>'
    )


def svg_line(x1: float, y1: float, x2: float, y2: float, stroke: str = COLOR_AXIS, width: float = 1) -> str:
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{width}"/>'


def svg_circle(cx: float, cy: float, r: float, fill: str, stroke: str = "none", stroke_width: float = 1) -> str:
    stroke_attr = f' stroke="{stroke}" stroke-width="{stroke_width}"' if stroke != "none" else ""
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{stroke_attr}/>'


def svg_path(d: str, fill: str = "none", stroke: str = COLOR_TEXT, width: float = 1) -> str:
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"/>'


def svg_legend(items: list[tuple[str, str]], x: float, y: float, font_size: float = 10) -> str:
    """Render a horizontal legend with color swatches.

    Args:
        items: List of (label, color) tuples.
        x: Starting x position.
        y: Starting y position.
        font_size: Legend text size.
    """
    parts: list[str] = []
    offset = 0.0
    swatch_size = font_size
    gap = 6
    for label, color in items:
        parts.append(svg_rect(x + offset, y, swatch_size, swatch_size, color, rx=2))
        parts.append(
            svg_text(
                x + offset + swatch_size + 4,
                y + swatch_size - 1,
                label,
                font_size=font_size,
                anchor="start",
                fill=COLOR_TEXT_SECONDARY,
            )
        )
        offset += swatch_size + 4 + text_width(label, font_size) + gap
    return "\n".join(parts)


def svg_no_data(width: int, height: int, title: str = "") -> str:
    """Render a 'No data available' placeholder chart."""
    inner = svg_text(width / 2, height / 2, "No data available", font_size=14, fill=COLOR_TEXT_SECONDARY)
    return svg_wrap(inner, width, height, title=title)
