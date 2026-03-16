import { Card, CardBody } from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { useTranslation } from "react-i18next";
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
                  <Td
                    style={{ fontFamily: "monospace", cursor: "pointer" }}
                    onClick={() => onClusterClick(row.cluster)}
                  >
                    {row.cluster}
                  </Td>
                  {HEATMAP_COLS.map((col) => {
                    const val = row[col];
                    const bgAlpha =
                      val > 0 ? Math.min(0.3 + val / 50, 1) : 0;
                    return (
                      <Td
                        key={col}
                        style={{
                          textAlign: "right",
                          background:
                            val > 0
                              ? `rgba(${HEATMAP_RGB[col]},${bgAlpha})`
                              : "transparent",
                          color: val > 0 ? "#151515" : "inherit",
                          cursor: val > 0 ? "pointer" : "default",
                        }}
                        onClick={
                          val > 0
                            ? () =>
                                onCellClick(
                                  row.cluster,
                                  HEATMAP_SEVERITY_INDEX[col],
                                )
                            : undefined
                        }
                      >
                        {val > 0 ? val : "\u2013"}
                      </Td>
                    );
                  })}
                  <Td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    onClick={() => onClusterClick(row.cluster)}
                  >
                    {row.total}
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
