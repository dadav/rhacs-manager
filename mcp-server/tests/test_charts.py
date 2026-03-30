"""Tests for SVG chart renderers."""

from mcp_server.charts.bar import render_bar_chart, render_stacked_bar_chart
from mcp_server.charts.colors import severity_color, severity_label
from mcp_server.charts.heatmap import render_heatmap
from mcp_server.charts.line import render_line_chart
from mcp_server.charts.pie import render_pie_chart
from mcp_server.charts.primitives import svg_no_data, svg_rect, svg_text, text_width
from mcp_server.charts.scatter import render_scatter_chart

# -- primitives --


def test_text_width_scales_with_length():
    assert text_width("hello") > text_width("hi")


def test_svg_rect_output():
    result = svg_rect(10, 20, 100, 50, "#ff0000", rx=3)
    assert 'x="10"' in result
    assert 'fill="#ff0000"' in result
    assert 'rx="3"' in result


def test_svg_text_escapes_html():
    result = svg_text(0, 0, "<script>alert(1)</script>")
    assert "<script>" not in result
    assert "&lt;script&gt;" in result


def test_svg_no_data_returns_valid_svg():
    result = svg_no_data(400, 200, title="Test")
    assert result.startswith("<svg")
    assert result.endswith("</svg>")
    assert "No data available" in result


# -- colors --


def test_severity_color_known():
    assert severity_color(4) == "#c9190b"  # Critical


def test_severity_color_unknown_defaults():
    assert severity_color(99) == "#6a6e73"  # falls back to Unknown


def test_severity_label_known():
    assert severity_label(4) == "Critical"


# -- bar chart --


def test_bar_chart_basic():
    data = [
        {"name": "A", "value": 10},
        {"name": "B", "value": 20},
        {"name": "C", "value": 5},
    ]
    result = render_bar_chart(data, x_key="name", y_key="value", title="Test Bar")
    assert result.startswith("<svg")
    assert result.endswith("</svg>")
    assert "Test Bar" in result
    assert "20" in result


def test_bar_chart_horizontal():
    data = [{"name": "X", "value": 15}]
    result = render_bar_chart(data, x_key="name", y_key="value", horizontal=True)
    assert result.startswith("<svg")
    assert "15" in result


def test_bar_chart_empty():
    result = render_bar_chart([], x_key="name", y_key="value")
    assert "No data available" in result


def test_bar_chart_with_color_map():
    data = [
        {"sev": "Critical", "count": 5},
        {"sev": "Low", "count": 10},
    ]
    colors = {"Critical": "#c9190b", "Low": "#3e8635"}
    result = render_bar_chart(data, x_key="sev", y_key="count", color_map=colors)
    assert "#c9190b" in result
    assert "#3e8635" in result


# -- stacked bar chart --


def test_stacked_bar_chart():
    data = [
        {"comp": "openssl", "fixable_count": 3, "unfixable_count": 2},
        {"comp": "curl", "fixable_count": 5, "unfixable_count": 1},
    ]
    result = render_stacked_bar_chart(
        data,
        x_key="comp",
        stack_keys=["fixable_count", "unfixable_count"],
        stack_colors={"fixable_count": "#0066cc", "unfixable_count": "#c9190b"},
        title="Components",
    )
    assert result.startswith("<svg")
    assert "Components" in result


def test_stacked_bar_chart_empty():
    result = render_stacked_bar_chart(
        [],
        x_key="comp",
        stack_keys=["a", "b"],
        stack_colors={"a": "#000", "b": "#fff"},
    )
    assert "No data available" in result


# -- line chart --


def test_line_chart_basic():
    data = [
        {"date": "2024-01-01", "critical": 5, "low": 10},
        {"date": "2024-01-02", "critical": 3, "low": 12},
        {"date": "2024-01-03", "critical": 7, "low": 8},
    ]
    series = [
        {"key": "critical", "color": "#c9190b", "label": "Critical"},
        {"key": "low", "color": "#3e8635", "label": "Low"},
    ]
    result = render_line_chart(data, x_key="date", series=series, title="Trend")
    assert result.startswith("<svg")
    assert "Trend" in result
    assert "Critical" in result


def test_line_chart_empty():
    result = render_line_chart([], x_key="date", series=[])
    assert "No data available" in result


# -- pie chart --


def test_pie_chart_basic():
    data = [
        {"label": "Fixable", "value": 30},
        {"label": "Unfixable", "value": 10},
    ]
    colors = {"Fixable": "#0066cc", "Unfixable": "#c9190b"}
    result = render_pie_chart(data, value_key="value", label_key="label", color_map=colors, title="Fix")
    assert result.startswith("<svg")
    assert "Fix" in result


def test_pie_chart_single_slice():
    data = [{"label": "All", "value": 100}]
    result = render_pie_chart(data, value_key="value", label_key="label", color_map={"All": "#000"})
    assert result.startswith("<svg")
    assert "<circle" in result  # Full circle for 100%


def test_pie_chart_empty():
    result = render_pie_chart([], value_key="value", label_key="label", color_map={})
    assert "No data available" in result


def test_pie_chart_zero_values():
    data = [{"label": "A", "value": 0}, {"label": "B", "value": 0}]
    result = render_pie_chart(data, value_key="value", label_key="label", color_map={})
    assert "No data available" in result


# -- scatter chart --


def test_scatter_chart_basic():
    data = [
        {"cvss": 7.5, "epss": 0.3, "severity": 4, "cve_id": "CVE-2024-001"},
        {"cvss": 3.2, "epss": 0.01, "severity": 1, "cve_id": "CVE-2024-002"},
    ]
    colors = {"Critical": "#c9190b", "Low": "#3e8635"}
    for item in data:
        item["sev_label"] = severity_label(item["severity"])
    result = render_scatter_chart(
        data, x_key="cvss", y_key="epss", color_key="sev_label", color_map=colors, title="EPSS Matrix"
    )
    assert result.startswith("<svg")
    assert "EPSS Matrix" in result


def test_scatter_chart_empty():
    result = render_scatter_chart([], x_key="x", y_key="y")
    assert "No data available" in result


def test_scatter_chart_truncation():
    data = [{"x": i, "y": i * 0.1} for i in range(300)]
    result = render_scatter_chart(data, x_key="x", y_key="y", title="Big")
    assert "Showing 200 of 300" in result


# -- heatmap --


def test_heatmap_basic():
    data = [
        {"cluster": "prod-a", "critical": 5, "important": 10, "moderate": 20},
        {"cluster": "dev-b", "critical": 0, "important": 2, "moderate": 8},
    ]
    result = render_heatmap(
        data,
        row_key="cluster",
        columns=["critical", "important", "moderate"],
        title="Cluster Heatmap",
    )
    assert result.startswith("<svg")
    assert "Cluster Heatmap" in result
    assert "prod-a" in result


def test_heatmap_empty():
    result = render_heatmap([], row_key="cluster", columns=["a"])
    assert "No data available" in result


def test_heatmap_truncation():
    data = [{"cluster": f"c-{i}", "a": i} for i in range(25)]
    result = render_heatmap(data, row_key="cluster", columns=["a"])
    assert "Showing 20 of 25" in result
