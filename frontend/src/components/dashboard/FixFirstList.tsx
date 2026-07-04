import { Card, CardBody, Label } from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { CveListItem } from "../../types";
import { SeverityBadge } from "../common/SeverityBadge";
import { EpssBadge } from "../common/EpssBadge";
import { ChartCardTitle } from "./ChartCardTitle";

interface FixFirstListProps {
  data: CveListItem[];
}

export function FixFirstList({ data }: FixFirstListProps) {
  const { t } = useTranslation();
  if (data.length === 0) return null;

  return (
    <Card>
      <ChartCardTitle
        title={t("dashboard.fixFirst")}
        helpKey="dashboard.help.fixFirst"
      />
      <CardBody>
        <div style={{ overflowX: "auto" }}>
          <Table variant="compact">
            <Thead>
              <Tr>
                <Th>CVE</Th>
                <Th>{t("dashboard.fixFirstSeverity")}</Th>
                <Th>EPSS</Th>
                <Th style={{ textAlign: "right" }}>
                  {t("dashboard.fixFirstDeployments")}
                </Th>
                <Th>{t("dashboard.fixFirstFix")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((cve) => (
                <Tr key={cve.cve_id}>
                  <Td>
                    <Link
                      to={`/vulnerabilities/${cve.cve_id}`}
                      style={{ fontWeight: 700 }}
                    >
                      {cve.cve_id}
                    </Link>
                    {cve.has_priority && (
                      <span className="prio-badge" style={{ marginLeft: 8 }}>
                        PRIO
                      </span>
                    )}
                  </Td>
                  <Td>
                    <SeverityBadge severity={cve.severity} />
                  </Td>
                  <Td>
                    <EpssBadge value={cve.epss_probability} />
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    {cve.affected_deployments}
                  </Td>
                  <Td>
                    {cve.fixable ? (
                      <Label color="green" isCompact>
                        {cve.fixed_by
                          ? t("dashboard.fixFirstFixedBy", {
                              version: cve.fixed_by,
                            })
                          : t("dashboard.fixFirstFixAvailable")}
                      </Label>
                    ) : (
                      <Label color="grey" isCompact>
                        {t("dashboard.fixFirstNoFix")}
                      </Label>
                    )}
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
