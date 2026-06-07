import { Card, CardBody } from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import type { ClusterHeatmapRow } from "../../types";
import { HEATMAP_RGB, HEATMAP_SEVERITY_INDEX } from "../../tokens";
import { ChartCardTitle } from "./ChartCardTitle";

const HEATMAP_COLS = [
  "unknown",
  "low",
  "moderate",
  "important",
  "critical",
] as const;

// Reset styles so the keyboard-accessible <button> reads as plain cell text.
const cellButtonStyle: CSSProperties = {
  display: "block",
  width: "100%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
  padding: "6px 8px",
};

interface ClusterHeatmapProps {
  data: ClusterHeatmapRow[];
  onClusterClick: (cluster: string) => void;
  onCellClick: (cluster: string, severity: number) => void;
}

export function ClusterHeatmap({
  data,
  onClusterClick,
  onCellClick,
}: ClusterHeatmapProps) {
  const { t } = useTranslation();
  const severityLabels = [
    t("severity.0"),
    t("severity.1"),
    t("severity.2"),
    t("severity.3"),
    t("severity.4"),
  ];

  return (
    <Card>
      <ChartCardTitle
        title={t("dashboard.clusterHeatmap")}
        helpKey="dashboard.help.clusterHeatmap"
      />
      <CardBody>
        <div style={{ overflowX: "auto" }}>
          <Table variant="compact" isStickyHeader>
            <Thead>
              <Tr>
                <Th>{t("common.cluster")}</Th>
                {severityLabels.map((l) => (
                  <Th key={l} style={{ textAlign: "right" }}>
                    {l}
                  </Th>
                ))}
                <Th style={{ textAlign: "right", fontWeight: 700 }}>
                  {t("common.total")}
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((row) => (
                <Tr key={row.cluster}>
                  <Td style={{ fontFamily: "monospace", padding: 0 }}>
                    <button
                      type="button"
                      onClick={() => onClusterClick(row.cluster)}
                      aria-label={t("dashboard.heatmapClusterLabel", {
                        cluster: row.cluster,
                      })}
                      style={{
                        ...cellButtonStyle,
                        textAlign: "left",
                        fontFamily: "monospace",
                      }}
                    >
                      {row.cluster}
                    </button>
                  </Td>
                  {HEATMAP_COLS.map((col) => {
                    const val = row[col];
                    const bgAlpha =
                      val > 0 ? Math.min(0.3 + val / 50, 1) : 0;
                    const severityIndex = HEATMAP_SEVERITY_INDEX[col];
                    return (
                      <Td
                        key={col}
                        style={{
                          textAlign: "right",
                          padding: val > 0 ? 0 : undefined,
                          background:
                            val > 0
                              ? `rgba(${HEATMAP_RGB[col]},${bgAlpha})`
                              : "transparent",
                          color: val > 0 ? "#151515" : "inherit",
                        }}
                      >
                        {val > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              onCellClick(row.cluster, severityIndex)
                            }
                            aria-label={t("dashboard.heatmapCellLabel", {
                              count: val,
                              severity: severityLabels[severityIndex],
                              cluster: row.cluster,
                            })}
                            style={{
                              ...cellButtonStyle,
                              textAlign: "right",
                            }}
                          >
                            {val}
                          </button>
                        ) : (
                          "–"
                        )}
                      </Td>
                    );
                  })}
                  <Td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      padding: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onClusterClick(row.cluster)}
                      aria-label={t("dashboard.heatmapClusterLabel", {
                        cluster: row.cluster,
                      })}
                      style={{
                        ...cellButtonStyle,
                        textAlign: "right",
                        fontWeight: 700,
                      }}
                    >
                      {row.total}
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  );
}
