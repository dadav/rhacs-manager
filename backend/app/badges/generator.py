"""SVG badge generator — Shields.io style, no external dependencies."""


def _text_width(text: str) -> int:
    """Approximate pixel width for Verdana 11px (each char ~6.5px avg)."""
    return max(len(text) * 7, 30)


def generate_badge_svg(
    critical: int,
    high: int,
    moderate: int,
    low: int,
    label: str = "CVEs",
) -> str:
    if critical > 0:
        right_color = "#e05d44"  # red
        parts = [f"{critical} kritisch"]
        if high:
            parts.append(f"{high} hoch")
    elif high > 0:
        right_color = "#fe7d37"  # orange
        parts = [f"{high} hoch"]
    elif moderate > 0:
        right_color = "#dfb317"  # yellow
        parts = [f"{moderate} mittel"]
    else:
        right_color = "#4c1"    # green
        parts = ["Keine Kritischen"]

    right_text = " · ".join(parts)
    left_w = _text_width(label) + 10
    right_w = _text_width(right_text) + 10
    total_w = left_w + right_w

    # Text x positions (centered in each half)
    left_x = left_w // 2 + 1
    right_x = left_w + right_w // 2

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{total_w}" height="20">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="r">
      <rect width="{total_w}" height="20" rx="3" fill="#fff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="{left_w}" height="20" fill="#555"/>
    <rect x="{left_w}" width="{right_w}" height="20" fill="{right_color}"/>
    <rect width="{total_w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="{left_x}" y="15" fill="#010101" fill-opacity=".3">{label}</text>
    <text x="{left_x}" y="14">{label}</text>
    <text x="{right_x}" y="15" fill="#010101" fill-opacity=".3">{right_text}</text>
    <text x="{right_x}" y="14">{right_text}</text>
  </g>
</svg>"""
    return svg
