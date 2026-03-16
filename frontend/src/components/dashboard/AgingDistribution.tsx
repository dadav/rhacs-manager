import { Card, CardBody } from "@patternfly/react-core";
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
import type { AgingBucket } from "../../types";
import {
  BRAND_BLUE,
  SEVERITY_COLORS,
  CHART_TICK_FILL,
  CHART_GRID_STROKE,
  chartTooltipStyle,
  chartTooltipWrapperStyle,
} from "../../tokens";
import { ChartCardTitle } from "./ChartCardTitle";

const BUCKET_RANGES: Record<string, [number, number | undefined]> = {
  "0-7": [0, 7],
  "8-30": [8, 30],
  "31-90": [31, 90],
  "91-180": [91, 180],
  "180+": [181, undefined],
};

interface AgingDistributionProps {
  data: AgingBucket[];
  onBucketClick: (ageMin: number, ageMax: number | undefined) => void;
}

export function AgingDistribution({
  data,
  onBucketClick,
}: AgingDistributionProps) {
  const { t } = useTranslation();

  const agingData = data.map((b) => ({
    ...b,
    bucketLabel: t(`dashboard.ageBuckets.${b.bucket}`),
  }));

  return (
    <Card style={{ overflow: "visible" }}>
      <ChartCardTitle
        title={t("dashboard.aging")}
        helpKey="dashboard.help.aging"
      />
      <CardBody>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={agingData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
            <XAxis
              dataKey="bucketLabel"
              tick={{ fontSize: 10, fill: CHART_TICK_FILL }}
            />
            <YAxis tick={{ fontSize: 10, fill: CHART_TICK_FILL }} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              wrapperStyle={chartTooltipWrapperStyle}
            />
            <Bar
              dataKey="count"
              name="CVEs"
              fill={BRAND_BLUE}
              isAnimationActive={false}
              style={{ cursor: "pointer" }}
              onClick={(entry) => {
                const range =
                  BUCKET_RANGES[
                    (entry as unknown as { bucket: string }).bucket
                  ];
                if (!range) return;
                onBucketClick(range[0], range[1]);
              }}
            >
              {agingData.map((_, i) => (
                <Cell
                  key={i}
                  fill={
                    i >= 3
                      ? SEVERITY_COLORS.important
                      : i >= 2
                        ? SEVERITY_COLORS.moderate
                        : BRAND_BLUE
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
