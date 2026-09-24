import { Card, CardBody, Label } from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { Link } from "react-router";
import { useScopedLink } from "../../hooks/useScope";
import { useTranslation } from "react-i18next";
import type { ComponentFix, FixFirstItem } from "../../types";
import { SeverityBadge } from "../common/SeverityBadge";
import { EpssBadge } from "../common/EpssBadge";
import { ChartCardTitle } from "./ChartCardTitle";

interface FixFirstListProps {
  data: FixFirstItem[];
}

// Show at most this many component upgrades per CVE; the rest collapse into "+N".
const MAX_COMPONENTS_SHOWN = 2;

function ComponentUpgrades({ fixes }: { fixes: ComponentFix[] }) {
  const { t } = useTranslation();
  const shown = fixes.slice(0, MAX_COMPONENTS_SHOWN);
  const hidden = fixes.length - shown.length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
      {shown.map((f) => (
        <span key={`${f.component_name}@${f.component_version}`} style={{ whiteSpace: "nowrap" }}>
          <strong>{f.component_name}</strong> {f.component_version}
          {f.fixed_by && (
            <span style={{ color: "var(--pf-t--global--text--color--status--success--default)" }}>
              {" "}&rarr; {f.fixed_by}
            </span>
          )}
        </span>
      ))}
      {hidden > 0 && (
        <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>
          {t("dashboard.fixFirstMoreComponents", { count: hidden })}
        </span>
      )}
    </div>
  );
}

export function FixFirstList({ data }: FixFirstListProps) {
  const scopedLink = useScopedLink();
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
                <Th>{t("dashboard.fixFirstComponent")}</Th>
                <Th>{t("dashboard.fixFirstFix")}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((cve) => (
                <Tr key={cve.cve_id}>
                  <Td>
                    <Link
                      to={scopedLink(`/vulnerabilities/${cve.cve_id}`)}
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
                    {cve.component_fixes.length > 0 ? (
                      <ComponentUpgrades fixes={cve.component_fixes} />
                    ) : (
                      <span style={{ color: "var(--pf-t--global--text--color--subtle)" }}>-</span>
                    )}
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
