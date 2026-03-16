import { Card, CardBody } from "@patternfly/react-core";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTranslation } from "react-i18next";
import type { FixabilityCount } from "../../types";
import {
  FIXABLE_COLOR,
  UNFIXABLE_COLOR,
  chartTooltipStyle,
  chartTooltipWrapperStyle,
} from "../../tokens";
import { ChartCardTitle } from "./ChartCardTitle";

interface FixabilityDonutProps {
  data: FixabilityCount;
  onSegmentClick: (fixable: boolean) => void;
}

export function FixabilityDonut({ data, onSegmentClick }: FixabilityDonutProps) {
  const { t } = useTranslation();

  const pieData = [
    {
      name: t("dashboard.fixable"),
      value: data.fixable,
      fixable: true,
    },
    {
      name: t("dashboard.unfixable"),
      value: data.unfixable,
      fixable: false,
    },
  ];

  return (
    <Card style={{ height: "100%", overflow: "visible" }}>
      <ChartCardTitle
        title={t("dashboard.fixabilityBreakdown")}
        helpKey="dashboard.help.fixabilityBreakdown"
      />
      <CardBody>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              nameKey="name"
              style={{ cursor: "pointer" }}
              onClick={(_, index) => onSegmentClick(index === 0)}
            >
              <Cell fill={FIXABLE_COLOR} />
              <Cell fill={UNFIXABLE_COLOR} />
            </Pie>
            <Tooltip
              contentStyle={chartTooltipStyle}
              wrapperStyle={chartTooltipWrapperStyle}
            />
            <Legend wrapperStyle={{ color: "inherit" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
