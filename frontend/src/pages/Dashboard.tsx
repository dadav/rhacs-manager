import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  PageSection,
  Popover,
  Spinner,
  Title,
} from "@patternfly/react-core";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getErrorMessage } from "../utils/errors";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { useDashboard } from "../api/dashboard";

import { useAuth } from "../hooks/useAuth";
import { useScope } from "../hooks/useScope";
import { EpssRiskMatrix } from "../components/charts/EpssRiskMatrix";
import { SeverityDonut } from "../components/charts/SeverityDonut";
import { TrendLine } from "../components/charts/TrendLine";
import { EpssBadge } from "../components/common/EpssBadge";
import { SeverityBadge } from "../components/common/SeverityBadge";
import { OutlinedQuestionCircleIcon } from "@patternfly/react-icons";

// Severity labels are resolved inside the component via t() calls

function ChartCardTitle({
  title,
  helpKey,
  children,
}: {
  title: string;
  helpKey: string;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <CardTitle>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {title}
          <Popover bodyContent={t(helpKey)} position="top">
            <Button
              variant="plain"
              aria-label={t("app.showHelp")}
              style={{ padding: "2px 4px" }}
            >
              <OutlinedQuestionCircleIcon
                style={{
                  color: "var(--pf-t--global--text--color--subtle)",
                  fontSize: 14,
                }}
              />
            </Button>
          </Popover>
        </span>
        {children}
      </div>
    </CardTitle>
  );
}

function StatCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}) {
  return (
    <Card isCompact style={{ height: "100%" }}>
      <CardBody
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: color ?? "var(--pf-v6-global--Color--100)",
            lineHeight: 1.2,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--pf-v6-global--Color--200)",
            marginTop: 4,
          }}
        >
          {label}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: "#ec7a08", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const { isSecTeam } = useAuth();
  const navigate = useNavigate();
  const { scopeParams } = useScope();
  const { data, isLoading, error } = useDashboard(scopeParams);
  const dateLocale = i18n.language === "de" ? "de-DE" : "en-US";
  // "currentColor" inherits the text color from the parent Card/CardBody,
  // which PatternFly sets correctly for both light and dark themes.
  const chartTickFill = "currentColor";
  const chartGridStroke = "var(--pf-t--global--border--color--default, #d2d2d2)";
  const chartTooltipStyle: React.CSSProperties = {
    backgroundColor:
      "var(--pf-v6-global--BackgroundColor--100, var(--pf-t--global--background--color--primary--default, #fff))",
    border:
      "1px solid var(--pf-t--global--border--color--default, #d2d2d2)",
    color:
      "var(--pf-v6-global--Color--100, var(--pf-t--global--text--color--regular, #151515))",
  };
  const chartTooltipWrapperStyle: React.CSSProperties = { zIndex: 10 };
  const severityLabels = [
    t("severity.0"),
    t("severity.1"),
    t("severity.2"),
    t("severity.3"),
    t("severity.4"),
  ];

  if (isLoading)
    return (
      <PageSection>
        <Spinner aria-label={t("common.loading")} />
      </PageSection>
    );
  if (error)
    return (
      <PageSection>
        <Alert
          variant="danger"
          title={`${t("common.error")}: ${getErrorMessage(error)}`}
        />
      </PageSection>
    );
  if (!data) return null;

  const heatmapCols = [
    "unknown",
    "low",
    "moderate",
    "important",
    "critical",
  ] as const;
  const heatmapSeverityIndex: Record<(typeof heatmapCols)[number], number> = {
    unknown: 0,
    low: 1,
    moderate: 2,
    important: 3,
    critical: 4,
  };
  const heatmapRgb: Record<(typeof heatmapCols)[number], string> = {
    unknown: "210,210,210",
    low: "190,225,244",
    moderate: "249,224,162",
    important: "244,182,120",
    critical: "249,185,183",
  };

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">
          {t("dashboard.title")}
        </Title>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Stat cards */}
          <GridItem span={3}>
            <Link
              to="/vulnerabilities"
              style={{
                textDecoration: "none",
                display: "block",
                height: "100%",
              }}
            >
              <StatCard
                label={t("dashboard.totalCves")}
                value={data.stat_total_cves}
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <Link
              to="/vulnerabilities?severity=4&fixable=true"
              style={{
                textDecoration: "none",
                display: "block",
                height: "100%",
              }}
            >
              <StatCard
                label={t("dashboard.fixableCriticalCves")}
                value={data.stat_fixable_critical_cves}
                color="#c9190b"
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <Link
              to="/escalations"
              style={{
                textDecoration: "none",
                display: "block",
                height: "100%",
              }}
            >
              <StatCard
                label={t("dashboard.escalations")}
                value={data.stat_escalations}
                color={data.stat_escalations > 0 ? "#ec7a08" : undefined}
                subtitle={
                  data.stat_upcoming_escalations > 0
                    ? `${data.stat_upcoming_escalations} ${t("dashboard.upcoming")}`
                    : undefined
                }
              />
            </Link>
          </GridItem>
          <GridItem span={3}>
            <Link
              to="/risk-acceptances?status=requested"
              style={{
                textDecoration: "none",
                display: "block",
                height: "100%",
              }}
            >
              <StatCard
                label={t("dashboard.openRiskAcceptances")}
                value={data.stat_open_risk_acceptances}
                color={
                  data.stat_open_risk_acceptances > 0 ? "#ec7a08" : undefined
                }
              />
            </Link>
          </GridItem>

          {/* EPSS Highlight Zone */}
          {data.priority_cves.length > 0 && (
            <GridItem span={12}>
              <Alert
                variant="warning"
                isInline
                title={t("dashboard.priorityCves")}
              >
                <p style={{ marginBottom: 8, fontSize: 13 }}>
                  {t("dashboard.priorityCvesDescription")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.priority_cves.map((cve) => (
                    <Link
                      key={cve.cve_id}
                      to={`/vulnerabilities/${cve.cve_id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        background: "var(--pf-v6-global--BackgroundColor--100)",
                        border: "1px solid #ec7a08",
                        borderRadius: 4,
                        textDecoration: "none",
                        color: "var(--pf-v6-global--Color--100)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{cve.cve_id}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                          background: "rgba(236, 122, 8, 0.18)",
                          color: "#ec7a08",
                          border: "1px solid rgba(236, 122, 8, 0.45)",
                          padding: "1px 5px",
                          borderRadius: 3,
                        }}
                      >
                        PRIO
                      </span>
                      <SeverityBadge severity={cve.severity} />
                      <EpssBadge value={cve.epss_probability} />
                    </Link>
                  ))}
                </div>
              </Alert>
            </GridItem>
          )}

          {data.high_epss_cves.length > 0 && (
            <GridItem span={12}>
              <Alert variant="warning" isInline title={t("dashboard.highEpss")}>
                <p style={{ marginBottom: 8, fontSize: 13 }}>
                  {t("dashboard.highEpssDescription")}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.high_epss_cves.map((cve) => (
                    <Link
                      key={cve.cve_id}
                      to={`/vulnerabilities/${cve.cve_id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        background: "var(--pf-v6-global--BackgroundColor--100)",
                        border: "1px solid #f0ab00",
                        borderRadius: 4,
                        textDecoration: "none",
                        color: "var(--pf-v6-global--Color--100)",
                        fontSize: 13,
                      }}
                    >
                      <strong>{cve.cve_id}</strong>
                      <SeverityBadge severity={cve.severity} />
                      <EpssBadge value={cve.epss_probability} />
                    </Link>
                  ))}
                </div>
              </Alert>
            </GridItem>
          )}

          {/* EPSS Risk Matrix + Risk Acceptance Pipeline + Charts */}
          {data.epss_matrix.length > 0 && (
            <GridItem span={isSecTeam ? 8 : 12}>
              <Card>
                <ChartCardTitle
                  title={t("dashboard.epssMatrix")}
                  helpKey="dashboard.help.epssMatrix"
                />
                <CardBody>
                  <EpssRiskMatrix
                    data={data.epss_matrix}
                    onDotClick={(cveId) =>
                      navigate(`/vulnerabilities/${cveId}`)
                    }
                  />
                </CardBody>
              </Card>
            </GridItem>
          )}

          {isSecTeam && (
            <GridItem span={data.epss_matrix.length > 0 ? 4 : 4}>
              <Card style={{ height: "100%" }}>
                <ChartCardTitle
                  title={t("dashboard.pipeline")}
                  helpKey="dashboard.help.pipeline"
                >
                  <Link to="/risk-acceptances" style={{ fontSize: 12 }}>
                    {t("dashboard.viewAll")}
                  </Link>
                </ChartCardTitle>
                <CardBody>
                  {(
                    ["requested", "approved", "rejected", "expired"] as const
                  ).map((status) => {
                    const labels: Record<string, string> = {
                      requested: t("status.requested"),
                      approved: t("status.approved"),
                      rejected: t("status.rejected"),
                      expired: t("status.expired"),
                    };
                    const colors: Record<string, string> = {
                      requested: "#0066cc",
                      approved: "#1e8f19",
                      rejected: "#c9190b",
                      expired: "#8a8d90",
                    };
                    return (
                      <Link
                        key={status}
                        to={`/risk-acceptances?status=${status}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 0",
                          borderBottom:
                            "1px solid var(--pf-t--global--border--color--default)",
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{labels[status]}</span>
                        <Badge
                          style={{
                            background: colors[status],
                            color: "#fff",
                            padding: "2px 8px",
                          }}
                        >
                          {data.risk_acceptance_pipeline[status]}
                        </Badge>
                      </Link>
                    );
                  })}
                </CardBody>
              </Card>
            </GridItem>
          )}

          <GridItem span={6}>
            <Card style={{ height: "100%", overflow: "visible" }}>
              <ChartCardTitle
                title={t("dashboard.severityDistribution")}
                helpKey="dashboard.help.severityDistribution"
              />
              <CardBody>
                <SeverityDonut
                  data={data.severity_distribution}
                  onSegmentClick={(severity) =>
                    navigate(`/vulnerabilities?severity=${severity}`)
                  }
                />
              </CardBody>
            </Card>
          </GridItem>

          {/* Fixability Breakdown Donut — side by side with severity */}
          {(data.fixability_breakdown.fixable > 0 ||
            data.fixability_breakdown.unfixable > 0) && (
            <GridItem span={6}>
              <Card style={{ height: "100%", overflow: "visible" }}>
                <ChartCardTitle
                  title={t("dashboard.fixabilityBreakdown")}
                  helpKey="dashboard.help.fixabilityBreakdown"
                />
                <CardBody>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: t("dashboard.fixable"),
                            value: data.fixability_breakdown.fixable,
                            fixable: "true",
                          },
                          {
                            name: t("dashboard.unfixable"),
                            value: data.fixability_breakdown.unfixable,
                            fixable: "false",
                          },
                        ]}
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        style={{ cursor: "pointer" }}
                        onClick={(_, index) =>
                          navigate(`/vulnerabilities?fixable=${index === 0 ? "true" : "false"}`)
                        }
                      >
                        <Cell fill="#1e8f19" />
                        <Cell fill="#c9190b" />
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} wrapperStyle={chartTooltipWrapperStyle} />
                      <Legend
                        wrapperStyle={{ color: "inherit" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Fixable Trend (Stacked Area) */}
          {data.fixable_trend.length > 0 && (
            <GridItem span={12}>
              <Card style={{ overflow: "visible" }}>
                <ChartCardTitle
                  title={t("dashboard.fixableTrend")}
                  helpKey="dashboard.help.fixableTrend"
                />
                <CardBody>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={data.fixable_trend}
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTickFill }} />
                      <YAxis tick={{ fontSize: 10, fill: chartTickFill }} allowDecimals={false} />
                      <Tooltip contentStyle={chartTooltipStyle} wrapperStyle={chartTooltipWrapperStyle} />
                      <Legend wrapperStyle={{ color: "inherit" }} />
                      <Area
                        type="monotone"
                        dataKey="fixable"
                        name={t("dashboard.fixable")}
                        stackId="1"
                        fill="#1e8f19"
                        stroke="#1e8f19"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="unfixable"
                        name={t("dashboard.unfixable")}
                        stackId="1"
                        fill="#c9190b"
                        stroke="#c9190b"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Cluster Heatmap */}
          {data.cluster_heatmap.length > 0 && (
            <GridItem span={12}>
              <Card>
                <ChartCardTitle
                  title={t("dashboard.clusterHeatmap")}
                  helpKey="dashboard.help.clusterHeatmap"
                />
                <CardBody>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 13,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background:
                              "var(--pf-t--global--background--color--secondary--default)",
                          }}
                        >
                          <th
                            style={{ padding: "8px 12px", textAlign: "left" }}
                          >
                            {t("common.cluster")}
                          </th>
                          {severityLabels.map((l) => (
                            <th
                              key={l}
                              style={{
                                padding: "8px 12px",
                                textAlign: "right",
                              }}
                            >
                              {l}
                            </th>
                          ))}
                          <th
                            style={{
                              padding: "8px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                            }}
                          >
                            {t("common.total")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.cluster_heatmap.map((row) => (
                          <tr
                            key={row.cluster}
                            style={{
                              borderBottom:
                                "1px solid var(--pf-t--global--border--color--default)",
                            }}
                          >
                            <td
                              style={{
                                padding: "8px 12px",
                                fontFamily: "monospace",
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                navigate(
                                  `/vulnerabilities?cluster=${encodeURIComponent(row.cluster)}`,
                                )
                              }
                            >
                              {row.cluster}
                            </td>
                            {heatmapCols.map((col) => {
                              const val = row[col];
                              const bgAlpha =
                                val > 0 ? Math.min(0.3 + val / 50, 1) : 0;
                              return (
                                <td
                                  key={col}
                                  style={{
                                    padding: "8px 12px",
                                    textAlign: "right",
                                    background:
                                      val > 0
                                        ? `rgba(${heatmapRgb[col]},${bgAlpha})`
                                        : "transparent",
                                    color: val > 0 ? "#151515" : "inherit",
                                    cursor: val > 0 ? "pointer" : "default",
                                  }}
                                  onClick={
                                    val > 0
                                      ? () =>
                                          navigate(
                                            `/vulnerabilities?severity=${heatmapSeverityIndex[col]}&cluster=${encodeURIComponent(row.cluster)}`,
                                          )
                                      : undefined
                                  }
                                >
                                  {val > 0 ? val : "–"}
                                </td>
                              );
                            })}
                            <td
                              style={{
                                padding: "8px 12px",
                                textAlign: "right",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                navigate(
                                  `/vulnerabilities?cluster=${encodeURIComponent(row.cluster)}`,
                                )
                              }
                            >
                              {row.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* CVE Aging Distribution */}
          {data.aging_distribution.some((b) => b.count > 0) &&
            (() => {
              const bucketRanges: Record<string, [number, number | undefined]> =
                {
                  "0-7": [0, 7],
                  "8-30": [8, 30],
                  "31-90": [31, 90],
                  "91-180": [91, 180],
                  "180+": [181, undefined],
                };
              const agingData = data.aging_distribution.map((b) => ({
                ...b,
                bucketLabel: t(`dashboard.ageBuckets.${b.bucket}`),
              }));
              return (
                <GridItem span={6}>
                  <Card style={{ overflow: "visible" }}>
                    <ChartCardTitle
                      title={t("dashboard.aging")}
                      helpKey="dashboard.help.aging"
                    />
                    <CardBody>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={agingData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                          <XAxis
                            dataKey="bucketLabel"
                            tick={{ fontSize: 10, fill: chartTickFill }}
                          />
                          <YAxis tick={{ fontSize: 10, fill: chartTickFill }} />
                          <Tooltip contentStyle={chartTooltipStyle} wrapperStyle={chartTooltipWrapperStyle} />
                          <Bar
                            dataKey="count"
                            name="CVEs"
                            fill="#0066cc"
                            isAnimationActive={false}
                            style={{ cursor: "pointer" }}
                            onClick={(entry) => {
                              const range =
                                bucketRanges[(entry as unknown as { bucket: string }).bucket];
                              if (!range) return;
                              const params = new URLSearchParams();
                              params.set("age_min", String(range[0]));
                              if (range[1] !== undefined)
                                params.set("age_max", String(range[1]));
                              navigate(`/vulnerabilities?${params.toString()}`);
                            }}
                          >
                            {agingData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  i >= 3
                                    ? "#c9190b"
                                    : i >= 2
                                      ? "#ec7a08"
                                      : "#0066cc"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                </GridItem>
              );
            })()}

          <GridItem
            span={data.aging_distribution.some((b) => b.count > 0) ? 6 : 12}
          >
            <Card>
              <ChartCardTitle
                title={t("dashboard.trend")}
                helpKey="dashboard.help.trend"
              />
              <CardBody>
                <TrendLine data={data.cve_trend} />
              </CardBody>
            </Card>
          </GridItem>

          {/* CVEs per Namespace — stacked by severity */}
          {data.cves_per_namespace.length > 0 &&
            (() => {
              const nsData = data.cves_per_namespace.slice(0, 10);
              const hasMultiCluster = nsData.some((ns) => ns.cluster_count > 1);
              const barHeight = hasMultiCluster ? 48 : 40;
              return (
                <GridItem span={12}>
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
                          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fill: chartTickFill }}
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
                              const ns = nsData.find(
                                (n) => n.namespace === payload.value,
                              );
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
                                    <tspan
                                      x={x}
                                      dy={14}
                                      fontSize={9}
                                      opacity={0.7}
                                    >
                                      {ns.cluster_count} {t("common.cluster")}
                                    </tspan>
                                  )}
                                </text>
                              );
                            }}
                          />
                          <Tooltip contentStyle={chartTooltipStyle} wrapperStyle={chartTooltipWrapperStyle} />
                          <Legend wrapperStyle={{ color: "inherit" }} />
                          <Bar
                            dataKey="critical"
                            name={t("severity.4")}
                            stackId="sev"
                            fill="#a30000"
                            isAnimationActive={false}
                            style={{ cursor: "pointer" }}
                            onClick={(entry) =>
                              navigate(
                                `/vulnerabilities?namespace=${encodeURIComponent((entry as unknown as { namespace: string }).namespace)}&severity=4`,
                              )
                            }
                          />
                          <Bar
                            dataKey="important"
                            name={t("severity.3")}
                            stackId="sev"
                            fill="#c9190b"
                            isAnimationActive={false}
                            style={{ cursor: "pointer" }}
                            onClick={(entry) =>
                              navigate(
                                `/vulnerabilities?namespace=${encodeURIComponent((entry as unknown as { namespace: string }).namespace)}&severity=3`,
                              )
                            }
                          />
                          <Bar
                            dataKey="moderate"
                            name={t("severity.2")}
                            stackId="sev"
                            fill="#ec7a08"
                            isAnimationActive={false}
                            style={{ cursor: "pointer" }}
                            onClick={(entry) =>
                              navigate(
                                `/vulnerabilities?namespace=${encodeURIComponent((entry as unknown as { namespace: string }).namespace)}&severity=2`,
                              )
                            }
                          />
                          <Bar
                            dataKey="low"
                            name={t("severity.1")}
                            stackId="sev"
                            fill="#2b9af3"
                            isAnimationActive={false}
                            style={{ cursor: "pointer" }}
                            onClick={(entry) =>
                              navigate(
                                `/vulnerabilities?namespace=${encodeURIComponent((entry as unknown as { namespace: string }).namespace)}&severity=1`,
                              )
                            }
                          />
                          <Bar
                            dataKey="unknown"
                            name={t("severity.0")}
                            stackId="sev"
                            fill="#d2d2d2"
                            isAnimationActive={false}
                            style={{ cursor: "pointer" }}
                            onClick={(entry) =>
                              navigate(
                                `/vulnerabilities?namespace=${encodeURIComponent((entry as unknown as { namespace: string }).namespace)}&severity=0`,
                              )
                            }
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardBody>
                  </Card>
                </GridItem>
              );
            })()}

          {/* Top Vulnerable Components — stacked by fixability */}
          {data.top_vulnerable_components.length > 0 && (
            <GridItem span={12}>
              <Card style={{ overflow: "visible" }}>
                <ChartCardTitle
                  title={t("dashboard.topVulnerableComponents")}
                  helpKey="dashboard.help.topVulnerableComponents"
                />
                <CardBody>
                  <ResponsiveContainer
                    width="100%"
                    height={data.top_vulnerable_components.length * 40 + 20}
                  >
                    <BarChart
                      data={data.top_vulnerable_components}
                      layout="vertical"
                      margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: chartTickFill }}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="component_name"
                        tick={{ fontSize: 11, fill: chartTickFill }}
                        width={200}
                        interval={0}
                      />
                      <Tooltip contentStyle={chartTooltipStyle} wrapperStyle={chartTooltipWrapperStyle} />
                      <Legend wrapperStyle={{ color: "inherit" }} />
                      <Bar
                        dataKey="fixable_count"
                        name={t("dashboard.fixable")}
                        stackId="fix"
                        fill="#1e8f19"
                        isAnimationActive={false}
                        style={{ cursor: "pointer" }}
                        onClick={(entry) =>
                          navigate(
                            `/vulnerabilities?component=${encodeURIComponent((entry as unknown as { component_name: string }).component_name)}&fixable=true&advanced=1`,
                          )
                        }
                      />
                      <Bar
                        dataKey="unfixable_count"
                        name={t("dashboard.unfixable")}
                        stackId="fix"
                        fill="#c9190b"
                        isAnimationActive={false}
                        style={{ cursor: "pointer" }}
                        onClick={(entry) =>
                          navigate(
                            `/vulnerabilities?component=${encodeURIComponent((entry as unknown as { component_name: string }).component_name)}&fixable=false&advanced=1`,
                          )
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  );
}
