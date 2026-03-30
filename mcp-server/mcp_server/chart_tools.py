"""MCP chart tools — SVG visualization of dashboard and CVE data.

Each tool fetches data from the backend API and returns an SVG chart as a string.
All chart tools are read-only and always registered.
"""

import logging
from collections.abc import Callable

from mcp.server.fastmcp import Context, FastMCP

from .api_client import AuthContext, RhacsManagerClient
from .charts.bar import render_bar_chart, render_stacked_bar_chart
from .charts.colors import (
    COLOR_FIXABLE,
    COLOR_UNFIXABLE,
    severity_color,
    severity_label,
)
from .charts.heatmap import render_heatmap
from .charts.line import render_line_chart
from .charts.pie import render_pie_chart
from .charts.scatter import render_scatter_chart

logger = logging.getLogger(__name__)


def register_chart_tools(
    mcp: FastMCP,
    client: RhacsManagerClient,
    extract_auth: Callable[[Context], AuthContext],
) -> None:
    """Register all chart tools on the MCP server."""

    @mcp.tool()
    async def chart_severity_distribution(ctx: Context) -> str:
        """Generate an SVG horizontal bar chart showing CVE counts by severity level.

        Displays how many CVEs exist at each severity (Critical, Important,
        Moderate, Low, Unknown) in the user's visible namespaces.

        Returns SVG XML.
        """
        auth = extract_auth(ctx)
        logger.debug("chart_severity_distribution called by user=%s", auth.forwarded_user)
        dashboard = await client.get_dashboard_parsed(auth)
        data = dashboard.get("severity_distribution", [])

        # Build color map and readable labels
        color_map = {}
        for item in data:
            level = item.get("severity", 0)
            item["label"] = severity_label(level)
            color_map[item["label"]] = severity_color(level)

        # Sort by severity descending (Critical first)
        data.sort(key=lambda x: x.get("severity", 0), reverse=True)

        return render_bar_chart(
            data,
            x_key="label",
            y_key="count",
            color_map=color_map,
            title="CVE Severity Distribution",
            horizontal=True,
            height=250,
        )

    @mcp.tool()
    async def chart_cve_trend(ctx: Context) -> str:
        """Generate an SVG line chart showing CVE count trends over time by severity.

        Displays four severity series (Critical, Important, Moderate, Low) as
        lines over a date range, showing how the CVE landscape changes.

        Returns SVG XML.
        """
        auth = extract_auth(ctx)
        logger.debug("chart_cve_trend called by user=%s", auth.forwarded_user)
        dashboard = await client.get_dashboard_parsed(auth)
        data = dashboard.get("cve_trend", [])

        series = [
            {"key": "critical", "color": severity_color(4), "label": "Critical"},
            {"key": "important", "color": severity_color(3), "label": "Important"},
            {"key": "moderate", "color": severity_color(2), "label": "Moderate"},
            {"key": "low", "color": severity_color(1), "label": "Low"},
        ]

        return render_line_chart(
            data,
            x_key="date",
            series=series,
            title="CVE Trend Over Time",
        )

    @mcp.tool()
    async def chart_fixability(ctx: Context, include_trend: bool = False) -> str:
        """Generate an SVG pie chart showing fixable vs unfixable CVE breakdown.

        Optionally includes a trend line chart showing fixability changes over time.

        Args:
            include_trend: If True, appends a fixable/unfixable trend line chart.

        Returns SVG XML (one or two charts concatenated).
        """
        auth = extract_auth(ctx)
        logger.debug("chart_fixability called by user=%s", auth.forwarded_user)
        dashboard = await client.get_dashboard_parsed(auth)

        breakdown = dashboard.get("fixability_breakdown", {})
        slices = [
            {"label": "Fixable", "value": breakdown.get("fixable", 0)},
            {"label": "Unfixable", "value": breakdown.get("unfixable", 0)},
        ]
        color_map = {"Fixable": COLOR_FIXABLE, "Unfixable": COLOR_UNFIXABLE}

        pie_svg = render_pie_chart(
            slices,
            value_key="value",
            label_key="label",
            color_map=color_map,
            title="Fixability Breakdown",
        )

        if not include_trend:
            return pie_svg

        trend_data = dashboard.get("fixable_trend", [])
        series = [
            {"key": "fixable", "color": COLOR_FIXABLE, "label": "Fixable"},
            {"key": "unfixable", "color": COLOR_UNFIXABLE, "label": "Unfixable"},
        ]
        trend_svg = render_line_chart(
            trend_data,
            x_key="date",
            series=series,
            title="Fixability Trend Over Time",
        )

        return pie_svg + "\n" + trend_svg

    @mcp.tool()
    async def chart_epss_matrix(ctx: Context) -> str:
        """Generate an SVG scatter plot of CVSS score vs EPSS probability.

        Each point represents a CVE, colored by severity. Helps identify CVEs
        that are both high-severity and high-exploitation-probability.
        Capped at 200 points with a truncation note if exceeded.

        Returns SVG XML.
        """
        auth = extract_auth(ctx)
        logger.debug("chart_epss_matrix called by user=%s", auth.forwarded_user)
        dashboard = await client.get_dashboard_parsed(auth)
        data = dashboard.get("epss_matrix", [])

        # Map severity int to label for color grouping
        for item in data:
            item["severity_label"] = severity_label(item.get("severity", 0))

        color_map = {severity_label(i): severity_color(i) for i in range(5)}

        return render_scatter_chart(
            data,
            x_key="cvss",
            y_key="epss",
            color_key="severity_label",
            color_map=color_map,
            label_key="cve_id",
            title="CVSS vs EPSS Matrix",
            x_label="CVSS Score",
            y_label="EPSS Probability",
        )

    @mcp.tool()
    async def chart_cluster_heatmap(ctx: Context) -> str:
        """Generate an SVG heatmap showing CVE counts per cluster and severity.

        Rows are clusters, columns are severity levels. Cell color intensity
        indicates the count. Capped at 20 clusters.

        Returns SVG XML.
        """
        auth = extract_auth(ctx)
        logger.debug("chart_cluster_heatmap called by user=%s", auth.forwarded_user)
        dashboard = await client.get_dashboard_parsed(auth)
        data = dashboard.get("cluster_heatmap", [])

        columns = ["critical", "important", "moderate", "low", "unknown"]
        column_labels = {
            "critical": "Critical",
            "important": "Important",
            "moderate": "Moderate",
            "low": "Low",
            "unknown": "Unknown",
        }

        return render_heatmap(
            data,
            row_key="cluster",
            columns=columns,
            column_labels=column_labels,
            title="Cluster CVE Heatmap",
        )

    @mcp.tool()
    async def chart_aging(ctx: Context) -> str:
        """Generate an SVG bar chart showing CVE aging distribution.

        Displays how many CVEs fall into each age bucket (e.g., 0-7 days,
        8-30 days, etc.), highlighting how long vulnerabilities remain open.

        Returns SVG XML.
        """
        auth = extract_auth(ctx)
        logger.debug("chart_aging called by user=%s", auth.forwarded_user)
        dashboard = await client.get_dashboard_parsed(auth)
        data = dashboard.get("aging_distribution", [])

        return render_bar_chart(
            data,
            x_key="bucket",
            y_key="count",
            title="CVE Aging Distribution",
            horizontal=False,
        )

    @mcp.tool()
    async def chart_top_components(ctx: Context) -> str:
        """Generate an SVG stacked bar chart of the most vulnerable components.

        Shows the top components by CVE count, with stacked segments for
        fixable vs unfixable CVEs.

        Returns SVG XML.
        """
        auth = extract_auth(ctx)
        logger.debug("chart_top_components called by user=%s", auth.forwarded_user)
        dashboard = await client.get_dashboard_parsed(auth)
        data = dashboard.get("top_vulnerable_components", [])

        return render_stacked_bar_chart(
            data,
            x_key="component_name",
            stack_keys=["fixable_count", "unfixable_count"],
            stack_colors={
                "fixable_count": COLOR_FIXABLE,
                "unfixable_count": COLOR_UNFIXABLE,
            },
            stack_labels={
                "fixable_count": "Fixable",
                "unfixable_count": "Unfixable",
            },
            title="Top Vulnerable Components",
            horizontal=True,
        )
