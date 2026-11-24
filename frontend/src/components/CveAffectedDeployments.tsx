import { Card, CardBody, CardTitle, Tooltip } from '@patternfly/react-core'
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table'
import { BanIcon, ShieldAltIcon, WrenchIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useScope, buildScopedTo } from '../hooks/useScope'
import { useFilteredPagination } from '../hooks/useFilteredPagination'
import { formatDate } from '../utils/format'
import { BRAND_BLUE, STATUS_COLORS } from '../tokens'
import { type AffectedDeployment, RiskStatus } from '../types'
import { FilteredListEmptyState, FilteredListPagination, FilteredListToolbar } from './common/FilteredListControls'

// Small per-deployment coverage indicators: a CVE-level risk acceptance,
// remediation, or false-positive may only cover a subset of the affected
// deployments. Each icon is wrapped in a Tooltip explaining the coverage.
function DeploymentCoverageIcons({ deployment }: { deployment: AffectedDeployment }) {
  const { t } = useTranslation();

  const remStatusLabels: Record<string, string> = {
    open: t("remediations.statusOpen"),
    in_progress: t("remediations.statusInProgress"),
    resolved: t("remediations.statusResolved"),
    verified: t("remediations.statusVerified"),
    wont_fix: t("remediations.statusWontFix"),
  };

  const ra = deployment.risk_acceptance_status;
  const rem = deployment.remediation_status;
  const suppressed = deployment.is_suppressed;

  if (!ra && !rem && !suppressed) return null;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 6, flexShrink: 0 }}>
      {ra && (
        <Tooltip
          content={
            ra === RiskStatus.approved
              ? t("cveDetail.coverage.riskAcceptanceApproved")
              : t("cveDetail.coverage.riskAcceptanceRequested")
          }
        >
          <ShieldAltIcon
            style={{
              fontSize: 11,
              color: ra === RiskStatus.approved ? STATUS_COLORS.approved : STATUS_COLORS.requested,
            }}
          />
        </Tooltip>
      )}
      {rem && (
        <Tooltip content={t("cveDetail.coverage.remediation", { status: remStatusLabels[rem] ?? rem })}>
          <WrenchIcon style={{ fontSize: 11, color: "#ec7a08" }} />
        </Tooltip>
      )}
      {suppressed && (
        <Tooltip content={t("cveDetail.coverage.falsePositive")}>
          <BanIcon style={{ fontSize: 11, color: STATUS_COLORS.approved }} />
        </Tooltip>
      )}
    </span>
  );
}

/** Component roll-up of everything fixable in one deployment (CveList component view). */
function deploymentFixesUrl(d: { deployment_id: string; deployment_name: string; namespace: string; cluster_name: string }): string {
  // Pin the list scope to the deployment's own namespace so a narrower sidebar
  // scope cannot hide it; buildScopedTo keeps these and adds ignore_thresholds.
  const q = new URLSearchParams({
    view: "component",
    cluster: d.cluster_name,
    ns: d.namespace,
    deployment_id: d.deployment_id,
    deployment_label: `${d.cluster_name}/${d.namespace}/${d.deployment_name}`,
  });
  return `/vulnerabilities?${q.toString()}`;
}

export function CveAffectedDeployments({ deployments }: { deployments: AffectedDeployment[] }) {
  const { t, i18n } = useTranslation()
  const { scopeSearchString } = useScope()
  const scopedLink = (to: string) => buildScopedTo(to, scopeSearchString)
  const list = useFilteredPagination(deployments, deployment => [deployment.deployment_name, deployment.namespace, deployment.cluster_name, deployment.image_name])
  if (!deployments.length) return null
  const title = t('cves.affectedDeployments')

  return (
    <Card style={{ minWidth: 0 }}>
      <CardTitle>{t('cveDetail.deploymentsCount', { count: deployments.length })}</CardTitle>
      <CardBody>
        <FilteredListToolbar list={list} id="cve-deployments" label={title} placeholder={t('cveDetail.deploymentFilterPlaceholder')} />
      </CardBody>
      <CardBody style={{ padding: 0 }}>
        <Table variant="compact" isStickyHeader aria-label={title} style={{ tableLayout: 'fixed' }}>
          <Thead>
            <Tr>
              <Th width={20}>{t('cves.deploymentName')}</Th>
              <Th width={15}>{t('cves.namespace')}</Th>
              <Th width={10}>{t('cves.cluster')}</Th>
              <Th width={40}>{t('cves.imageName')}</Th>
              <Th width={15}>{t('cves.firstSeen')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {list.pageItems.map(d => (
              <Tr key={`${d.deployment_id}-${d.image_name}`}>
                <Td dataLabel={t("cves.deploymentName")} style={{ fontSize: 11 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minWidth: 0,
                    }}
                  >
                    <Link
                      to={scopedLink(deploymentFixesUrl(d))}
                      title={t("cveDetail.deploymentFixesLink")}
                      style={{
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.deployment_name}
                    </Link>
                    <DeploymentCoverageIcons deployment={d} />
                  </span>
                </Td>
                <Td dataLabel={t("cves.namespace")}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.namespace}
                </Td>
                <Td dataLabel={t("cves.cluster")}
                  style={{
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.cluster_name}
                </Td>
                <Td dataLabel={t("cves.imageName")}
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={d.image_name}
                >
                  {d.image_id ? (
                    <Link
                      to={scopedLink(`/images/${encodeURIComponent(d.image_id)}`)}
                      style={{ color: BRAND_BLUE }}
                    >
                      {d.image_name}
                    </Link>
                  ) : d.image_name}
                </Td>
                <Td dataLabel={t("cves.firstSeen")}
                  style={{
                    fontSize: 11,
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatDate(d.first_seen, i18n.language)}
                </Td>
              </Tr>
            ))}
            {!list.filteredCount && <FilteredListEmptyState colSpan={5} onClear={() => list.setSearch('')} />}
          </Tbody>
        </Table>
      </CardBody>
      {list.filteredCount > list.perPage && <CardBody><FilteredListPagination list={list} id="cve-deployments" label={title} position="bottom" /></CardBody>}
    </Card>
  )
}
