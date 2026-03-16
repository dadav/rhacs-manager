import { Card, CardBody } from "@patternfly/react-core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { ComponentCveCount } from "../../types";
import {
  FIXABLE_COLOR,
  UNFIXABLE_COLOR,
  CHART_TICK_FILL,
  CHART_GRID_STROKE,
  chartTooltipStyle,
  chartTooltipWrapperStyle,
} from "../../tokens";
import { ChartCardTitle } from "./ChartCardTitle";

interface TopComponentsProps {
  data: ComponentCveCount[];
  onBarClick: (componentName: string, fixable: boolean) => void;
}

export function TopComponents({ data, onBarClick }: TopComponentsProps) {
  const { t } = useTranslation();

  return (
    <Card style={{ overflow: "visible" }}>
      <ChartCardTitle
        title={t("dashboard.topVulnerableComponents")}
        helpKey="dashboard.help.topVulnerableComponents"
      />
      <CardBody>
        <ResponsiveContainer
          width="100%"
          height={data.length * 40 + 20}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: CHART_TICK_FILL }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="component_name"
              tick={{ fontSize: 11, fill: CHART_TICK_FILL }}
              width={200}
              interval={0}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              wrapperStyle={chartTooltipWrapperStyle}
            />
            <Legend wrapperStyle={{ color: "inherit" }} />
            <Bar
              dataKey="fixable_count"
              name={t("dashboard.fixable")}
              stackId="fix"
              fill={FIXABLE_COLOR}
              isAnimationActive={false}
              style={{ cursor: "pointer" }}
              onClick={(entry) =>
                onBarClick(
                  (entry as unknown as { component_name: string })
                    .component_name,
                  true,
                )
              }
            />
            <Bar
              dataKey="unfixable_count"
              name={t("dashboard.unfixable")}
              stackId="fix"
              fill={UNFIXABLE_COLOR}
              isAnimationActive={false}
              style={{ cursor: "pointer" }}
              onClick={(entry) =>
                onBarClick(
                  (entry as unknown as { component_name: string })
                    .component_name,
                  false,
                )
              }
            />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
