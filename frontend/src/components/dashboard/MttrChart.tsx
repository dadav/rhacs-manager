import { Card, CardBody, EmptyState, EmptyStateBody } from "@patternfly/react-core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { MttrSeverity } from "../../types";
import {
  CHART_SEVERITY_COLORS,
  CHART_TICK_FILL,
  CHART_GRID_STROKE,
  chartTooltipStyle,
  chartTooltipWrapperStyle,
} from "../../tokens";
import { ChartCardTitle } from "./ChartCardTitle";

interface MttrChartProps {
  data: MttrSeverity[];
}

export function MttrChart({ data }: MttrChartProps) {
  const { t } = useTranslation();

  const severityLabels = [
    t("severity.0"),
    t("severity.1"),
    t("severity.2"),
    t("severity.3"),
    t("severity.4"),
  ];

  const severityColorMap: Record<number, string> = {
    0: "#8a8d90",
    1: "#2b9af3",
    2: "#ec7a08",
    3: "#c9190b",
    4: "#7d1007",
  };

  const formatMttr = (days: number): string => {
    if (days >= 1) return `${Math.round(days)} ${t("dashboard.mttrDays")}`;
    const hours = days * 24;
    if (hours >= 1) return `${hours.toFixed(1)} h`;
    return `${(hours * 60).toFixed(0)} min`;
  };

  const hasData = data.some((m) => m.count > 0);

  const mttrData = data.map((m) => ({
    ...m,
    label: severityLabels[m.severity] || severityLabels[0],
    fill: severityColorMap[m.severity] || severityColorMap[0],
  }));

  return (
    <Card style={{ overflow: "visible", height: "100%" }}>
      <ChartCardTitle
        title={t("dashboard.mttr")}
        helpKey="dashboard.help.mttr"
      />
      <CardBody>
        {!hasData ? (
          <EmptyState>
            <EmptyStateBody>{t("common.noData")}</EmptyStateBody>
          </EmptyState>
        ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={mttrData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: CHART_TICK_FILL }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_TICK_FILL }}
              label={{
                value: t("dashboard.mttrDays"),
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: CHART_TICK_FILL },
              }}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              wrapperStyle={chartTooltipWrapperStyle}
              formatter={(value, _name, props) => [
                `${formatMttr(value as number)} (${(props.payload as { count: number }).count} ${t("dashboard.mttrCount")})`,
                (props.payload as { label: string }).label,
              ]}
            />
            <Bar
              dataKey="avg_days"
              isAnimationActive={false}
              minPointSize={3}
            >
              {mttrData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
}
