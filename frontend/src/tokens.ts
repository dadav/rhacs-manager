import type React from "react";

/**
 * Shared design tokens used across the frontend.
 * Centralizes magic color values and chart styles so pages stay consistent.
 */

// Severity colors — used in tables, badges, charts
export const SEVERITY_COLORS = {
  critical: "#a30000",
  important: "#c9190b",
  moderate: "#ec7a08",
  low: "#0066cc",
  unknown: "#8a8d90",
} as const;

// Chart-fill severity colors (slightly different shades for better chart contrast)
export const CHART_SEVERITY_COLORS = {
  4: "#c9190b",
  3: "#ec7a08",
  2: "#f0ab00",
  1: "#0066cc",
  0: "#8a8d90",
} as const;

// Stat card accent colors
export const STAT_ACCENT = {
  danger: "#c9190b",
  warning: "#ec7a08",
  success: "#1e8f19",
  info: "#0066cc",
  neutral: "var(--pf-t--global--border--color--default)",
} as const;

// Status colors for risk acceptances and suppression rules
export const STATUS_COLORS = {
  requested: "#0066cc",
  approved: "#1e8f19",
  rejected: "#c9190b",
  expired: "#8a8d90",
} as const;

// Escalation level colors
export const LEVEL_COLORS: Record<number, string> = {
  1: "#ec7a08",
  2: "#c9190b",
  3: "#7d1007",
};

// Priority level colors
export const PRIORITY_COLORS = {
  critical: "#c9190b",
  high: "#ec7a08",
  medium: "#f0ab00",
  low: "#0066cc",
} as const;

// Remediation status → PF Label color mapping
export const REMEDIATION_LABEL_COLORS: Record<
  string,
  "blue" | "orange" | "green" | "teal" | "grey"
> = {
  open: "blue",
  in_progress: "orange",
  resolved: "green",
  verified: "teal",
  wont_fix: "grey",
};

// Fixability colors
export const FIXABLE_COLOR = "#1e8f19";
export const UNFIXABLE_COLOR = "#c9190b";

// Brand / link color
export const BRAND_BLUE = "#0066cc";

// Heatmap severity RGB values (for alpha-blended backgrounds)
export const HEATMAP_RGB: Record<string, string> = {
  unknown: "210,210,210",
  low: "190,225,244",
  moderate: "249,224,162",
  important: "244,182,120",
  critical: "249,185,183",
};

// Heatmap severity → numeric index
export const HEATMAP_SEVERITY_INDEX: Record<string, number> = {
  unknown: 0,
  low: 1,
  moderate: 2,
  important: 3,
  critical: 4,
};

// Theme-aware Recharts styles
export const chartTooltipStyle: React.CSSProperties = {
  backgroundColor:
    "var(--pf-v6-global--BackgroundColor--100, var(--pf-t--global--background--color--primary--default, #fff))",
  border:
    "1px solid var(--pf-t--global--border--color--default, #d2d2d2)",
  color:
    "var(--pf-v6-global--Color--100, var(--pf-t--global--text--color--regular, #151515))",
};

export const chartTooltipWrapperStyle: React.CSSProperties = { zIndex: 10 };

export const CHART_TICK_FILL = "currentColor";
export const CHART_GRID_STROKE =
  "var(--pf-t--global--border--color--default, #d2d2d2)";
