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
import type { NamespaceCveCount } from "../../types";
import {
  CHART_TICK_FILL,
  CHART_GRID_STROKE,
  chartTooltipStyle,
  chartTooltipWrapperStyle,
} from "../../tokens";
import { ChartCardTitle } from "./ChartCardTitle";

interface NamespaceBreakdownProps {
  data: NamespaceCveCount[];
  onBarClick: (namespace: string, severity: number) => void;
}

export function NamespaceBreakdown({
  data,
  onBarClick,
}: NamespaceBreakdownProps) {
  const { t } = useTranslation();
  const nsData = data.slice(0, 10);
  const hasMultiCluster = nsData.some((ns) => ns.cluster_count > 1);
  const barHeight = hasMultiCluster ? 48 : 40;

  const severityBars = [
    { dataKey: "critical", severity: 4, fill: "#a30000" },
    { dataKey: "important", severity: 3, fill: "#c9190b" },
    { dataKey: "moderate", severity: 2, fill: "#ec7a08" },
    { dataKey: "low", severity: 1, fill: "#2b9af3" },
    { dataKey: "unknown", severity: 0, fill: "#d2d2d2" },
  ];

  return (
    <Card style={{ overflow: "visible" }}>
      <ChartCardTitle
        title={t("dashboard.cvesPerNamespace")}
        helpKey="dashboard.help.cvesPerNamespace"
      />
      <CardBody>
        <ResponsiveContainer
          width="100%"
          height={Math.max(120, nsData.length * barHeight + 20)}
        >
          <BarChart
            data={nsData}
            layout="vertical"
            margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
            barSize={hasMultiCluster ? 20 : undefined}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: CHART_TICK_FILL }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="namespace"
              width={200}
              interval={0}
              tick={({
                x,
                y,
                payload,
              }: {
                x: string | number;
                y: string | number;
                payload: { value: string };
              }) => {
                const ns = nsData.find((n) => n.namespace === payload.value);
                return (
                  <text
                    x={x}
                    y={y}
                    textAnchor="end"
                    fontSize={11}
                    fill="currentColor"
                  >
                    <tspan
                      x={x}
                      dy={ns && ns.cluster_count > 1 ? -6 : 4}
                    >
                      {payload.value}
                    </tspan>
                    {ns && ns.cluster_count > 1 && (
                      <tspan x={x} dy={14} fontSize={9} opacity={0.7}>
                        {ns.cluster_count} {t("common.cluster")}
                      </tspan>
                    )}
                  </text>
                );
              }}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              wrapperStyle={chartTooltipWrapperStyle}
            />
            <Legend wrapperStyle={{ color: "inherit" }} />
            {severityBars.map((bar) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={t(`severity.${bar.severity}`)}
                stackId="sev"
                fill={bar.fill}
                isAnimationActive={false}
                style={{ cursor: "pointer" }}
                onClick={(entry) =>
                  onBarClick(
                    (entry as unknown as { namespace: string }).namespace,
                    bar.severity,
                  )
                }
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
