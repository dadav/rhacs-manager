import { Card, CardBody } from "@patternfly/react-core";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { FixableTrendPoint } from "../../types";
import {
  FIXABLE_COLOR,
  UNFIXABLE_COLOR,
  CHART_TICK_FILL,
  CHART_GRID_STROKE,
  chartTooltipStyle,
  chartTooltipWrapperStyle,
} from "../../tokens";
import { ChartCardTitle } from "./ChartCardTitle";

interface FixableTrendProps {
  data: FixableTrendPoint[];
}

export function FixableTrend({ data }: FixableTrendProps) {
  const { t } = useTranslation();

  return (
    <Card style={{ overflow: "visible" }}>
      <ChartCardTitle
        title={t("dashboard.fixableTrend")}
        helpKey="dashboard.help.fixableTrend"
      />
      <CardBody>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: CHART_TICK_FILL }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_TICK_FILL }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              wrapperStyle={chartTooltipWrapperStyle}
            />
            <Legend wrapperStyle={{ color: "inherit" }} />
            <Area
              type="monotone"
              dataKey="fixable"
              name={t("dashboard.fixable")}
              stackId="1"
              fill={FIXABLE_COLOR}
              stroke={FIXABLE_COLOR}
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="unfixable"
              name={t("dashboard.unfixable")}
              stackId="1"
              fill={UNFIXABLE_COLOR}
              stroke={UNFIXABLE_COLOR}
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
