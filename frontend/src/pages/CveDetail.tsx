import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  ExpandableSection,
  Grid,
  GridItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageSection,
  Pagination,
  Skeleton,
  TextArea,
  TextInput,
  Title,
} from "@patternfly/react-core";
import { Table, Thead, Tbody, Tr, Th, Td } from "@patternfly/react-table";
import { CheckCircleIcon } from "@patternfly/react-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "../utils/errors";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useAddCveComment, useCveComments, useCveDetail } from "../api/cves";
import { useCreateSuppressionRule } from "../api/suppressionRules";
import { useRemediationsByCve } from "../api/remediations";
import { MentionTextArea, renderMentions } from "../components/MentionTextArea";
import { CveWorkflowStepper } from "../components/CveWorkflowStepper";
import { CveLifecycleTimeline } from "../components/CveLifecycleTimeline";
import { CveRemediationSection } from "../components/CveRemediation";
import { EpssBadge } from "../components/common/EpssBadge";
import { SeverityBadge } from "../components/common/SeverityBadge";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../hooks/useScope";
import { CveDetail as CveDetailType, RiskStatus } from "../types";
import {
  STATUS_COLORS,
  BRAND_BLUE,
  FIXABLE_COLOR,
} from "../tokens";

const SUMMARY_KEYWORDS = ["DOCUMENTATION", "STATEMENT", "MITIGATION"] as const;
type SummaryKeyword = (typeof SUMMARY_KEYWORDS)[number];

interface SummarySection {
  keyword: SummaryKeyword;
  text: string;
}

function parseSummary(raw: string): SummarySection[] | null {
  const pattern = new RegExp(
    `\\b(${SUMMARY_KEYWORDS.join("|")})\\s*:\\s*`,
    "g"
  );
  const matches = [...raw.matchAll(pattern)];
  if (matches.length === 0) return null;

  const sections: SummarySection[] = [];
  for (let i = 0; i < matches.length; i++) {
    const keyword = matches[i][1] as SummaryKeyword;
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const text = raw.slice(start, end).trim();
    if (text) sections.push({ keyword, text });
  }
  return sections.length > 0 ? sections : null;
}

const SUMMARY_KEYWORD_I18N: Record<SummaryKeyword, string> = {
  DOCUMENTATION: "cveDetail.summaryDocumentation",
  STATEMENT: "cveDetail.summaryStatement",
  MITIGATION: "cveDetail.summaryMitigation",
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Tr>
      <Td
        style={{
          fontWeight: 600,
          fontSize: 13,
          color: "#6a6e73",
          width: 200,
        }}
      >
        {label}
      </Td>
      <Td style={{ fontSize: 13 }}>{value}</Td>
    </Tr>
  );
}

export function CveDetail() {
  const { cveId } = useParams<{ cveId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';
  const { isSecTeam } = useAuth();
  const { scopeParams } = useScope();
  const { data: cve, isLoading, error } = useCveDetail(cveId ?? "");
  const { data: comments } = useCveComments(cveId ?? "");

  // Scroll to a specific comment when navigating via notification link
  useEffect(() => {
    if (location.hash && comments) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.outline = "2px solid var(--pf-t--global--color--blue--default)";
        el.style.borderRadius = "4px";
        const timer = setTimeout(() => { el.style.outline = ""; }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [location.hash, comments]);
  const { data: workflowRemediations } = useRemediationsByCve(cveId ?? "", scopeParams);
  const addComment = useAddCveComment(cveId ?? "");
  const [newComment, setNewComment] = useState("");
  const [deploymentFilter, setDeploymentFilter] = useState("");
  const [deploymentPage, setDeploymentPage] = useState(1);
  const deploymentPerPage = 20;

  const [showFpModal, setShowFpModal] = useState(false);
  const [fpReason, setFpReason] = useState("");
  const [fpRefUrl, setFpRefUrl] = useState("");
  const [fpError, setFpError] = useState("");
  const [fpSuccess, setFpSuccess] = useState(false);
  const [fpScopeMode, setFpScopeMode] = useState<"all" | "namespace">("all");
  const [fpSelectedNamespaces, setFpSelectedNamespaces] = useState<Set<string>>(new Set());
  const createSuppression = useCreateSuppressionRule();

  function resetFpForm() {
    setFpReason("");
    setFpRefUrl("");
    setFpError("");
    setFpScopeMode("all");
    setFpSelectedNamespaces(new Set());
  }

  const affectedNamespacePairs: Array<{ namespace: string; cluster_name: string }> = cve
    ? Array.from(
        new Map(
          cve.affected_deployments_list.map((d) => [
            `${d.namespace}:${d.cluster_name}`,
            { namespace: d.namespace, cluster_name: d.cluster_name },
          ])
        ).values()
      ).sort((a, b) => `${a.namespace}:${a.cluster_name}`.localeCompare(`${b.namespace}:${b.cluster_name}`))
    : [];

  function toggleFpNamespace(key: string) {
    setFpSelectedNamespaces((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleFpSubmit() {
    setFpError("");
    const scope =
      fpScopeMode === "all"
        ? { mode: "all" as const, targets: [] }
        : {
            mode: "namespace" as const,
            targets: Array.from(fpSelectedNamespaces).map((key) => {
              const [namespace, cluster_name] = key.split(":");
              return { cluster_name, namespace };
            }),
          };
    try {
      await createSuppression.mutateAsync({
        type: "cve",
        cve_id: cveId ?? null,
        reason: fpReason,
        reference_url: fpRefUrl || null,
        scope,
      });
      setShowFpModal(false);
      resetFpForm();
      setFpSuccess(true);
    } catch (e) {
      setFpError(getErrorMessage(e));
    }
  }

  const STATUS_LABELS: Record<RiskStatus, string> = {
    [RiskStatus.requested]: t('status.requested'),
    [RiskStatus.approved]: t('status.approved'),
    [RiskStatus.rejected]: t('status.rejected'),
    [RiskStatus.expired]: t('status.expired'),
  };

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment.mutateAsync(newComment);
    setNewComment("");
  }

  if (isLoading)
    return (
      <PageSection>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton width="40%" height="24px" />
          <Skeleton width="60%" height="32px" />
          <Grid hasGutter>
            <GridItem span={6}>
              <Skeleton height="200px" />
            </GridItem>
            <GridItem span={6}>
              <Skeleton height="200px" />
            </GridItem>
            <GridItem span={12}>
              <Skeleton height="120px" />
            </GridItem>
          </Grid>
        </div>
      </PageSection>
    );
  if (error)
    return (
      <PageSection>
        <Alert variant="danger" title={`${t('common.error')}: ${getErrorMessage(error)}`} />
      </PageSection>
    );
  if (!cve) return null;

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem
            onClick={() => navigate("/vulnerabilities")}
            style={{ cursor: "pointer" }}
          >
            {t('nav.cves')}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{cve.cve_id}</BreadcrumbItem>
        </Breadcrumb>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 8,
          }}
        >
          <Title
            headingLevel="h1"
            size="xl"
            style={{ fontFamily: "monospace" }}
          >
            {cve.cve_id}
          </Title>
          <SeverityBadge severity={cve.severity} />
          {cve.has_priority && (
            <Label color="orange" isCompact>
              {t('cveDetail.prioritizedLabel')}
            </Label>
          )}
          {cve.has_risk_acceptance && cve.risk_acceptance_status && (
            <Label
              isCompact
              style={{
                background: STATUS_COLORS[cve.risk_acceptance_status],
                color: "#fff",
              }}
            >
              {STATUS_LABELS[cve.risk_acceptance_status]}
            </Label>
          )}
          {cve.is_suppressed && (
            <Label color="green" isCompact>
              {t('suppressionRules.suppressedLabel')}
            </Label>
          )}
          {!cve.is_suppressed && cve.suppression_requested && (
            <Label color="blue" isCompact>
              {t('suppressionRules.suppressionRequestedLabel')}
            </Label>
          )}
        </div>
      </PageSection>

      {cve.priority_reason && (
        <PageSection variant="default" style={{ paddingTop: 0 }}>
          <Alert
            variant="warning"
            isInline
            title={t('cveDetail.prioritization')}
          >
            <p>{cve.priority_reason}</p>
            {cve.priority_set_by_name && (
              <p style={{ fontSize: 12, color: "#6a6e73", marginTop: 4 }}>
                — {cve.priority_set_by_name}
                {cve.priority_created_at &&
                  `, ${new Date(cve.priority_created_at).toLocaleDateString(dateLocale)}`}
              </p>
            )}
          </Alert>
        </PageSection>
      )}

      <PageSection variant="default" style={{ paddingTop: 0 }}>
        <CveWorkflowStepper cve={cve} remediations={workflowRemediations} isSecTeam={isSecTeam} />
        <ExpandableSection
          toggleText={t('cveDetail.lifecycle')}
          style={{ marginTop: 16 }}
        >
          <CveLifecycleTimeline cve={cve} />
        </ExpandableSection>
      </PageSection>

      <PageSection variant="default" isFilled>
        <Grid hasGutter>
          <GridItem span={6}>
            <Card>
              <CardTitle>{t('common.details')}</CardTitle>
              <CardBody style={{ padding: 0 }}>
                <Table variant="compact" borders={false}>
                  <Tbody>
                    <DetailRow
                      label={t('cves.cveId')}
                      value={
                        <span style={{ fontFamily: "monospace" }}>
                          {cve.cve_id}
                        </span>
                      }
                    />
                    {cve.summary && (() => {
                      const cleaned = cve.summary.replace(/<br\s*\/?>/g, "\n");
                      const sections = parseSummary(cleaned);
                      return (
                        <DetailRow
                          label={t('cveDetail.summary')}
                          value={
                            sections ? (
                              <div>
                                {sections.map((s, i) => (
                                  <div key={i} style={{ marginBottom: i < sections.length - 1 ? 12 : 0 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                      {t(SUMMARY_KEYWORD_I18N[s.keyword])}
                                    </div>
                                    <div style={{ whiteSpace: "pre-wrap", fontSize: "0.9em" }}>
                                      {s.text}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ whiteSpace: "pre-wrap", fontSize: "0.9em" }}>
                                {cleaned}
                              </span>
                            )
                          }
                        />
                      );
                    })()}
                    <DetailRow
                      label={t('cveDetail.references')}
                      value={
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {cve.cvss_metric_urls.length > 0 ? (
                            cve.cvss_metric_urls.map((m) => (
                              <a
                                key={m.url}
                                href={m.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: BRAND_BLUE }}
                              >
                                {m.source}
                              </a>
                            ))
                          ) : (
                            <>
                              <a
                                href={`https://access.redhat.com/security/cve/${cve.cve_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: BRAND_BLUE }}
                              >
                                {t('cveDetail.redHatSecurity')}
                              </a>
                              <a
                                href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: BRAND_BLUE }}
                              >
                                {t('cveDetail.nvd')}
                              </a>
                            </>
                          )}
                          {cve.link && !cve.cvss_metric_urls.some((m) => m.url === cve.link) && (
                            <a
                              href={cve.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: BRAND_BLUE }}
                            >
                              {t('cveDetail.primaryLink')}
                            </a>
                          )}
                          {cve.advisory_name && cve.advisory_link && (
                            <a
                              href={cve.advisory_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: BRAND_BLUE }}
                            >
                              {cve.advisory_name}
                            </a>
                          )}
                        </div>
                      }
                    />
                    <DetailRow
                      label={t('cveDetail.contactEmail')}
                      value={
                        cve.contact_emails.length > 0 ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {cve.contact_emails.map((email) => (
                              <a key={email} href={`mailto:${email}`} style={{ color: BRAND_BLUE }}>
                                {email}
                              </a>
                            ))}
                          </div>
                        ) : (
                          "–"
                        )
                      }
                    />
                    <DetailRow
                      label={t('cves.severity')}
                      value={<SeverityBadge severity={cve.severity} />}
                    />
                    <DetailRow
                      label="CVSS"
                      value={
                        <span
                          style={{
                            fontWeight: cve.cvss >= 9 ? 700 : 400,
                            color: cve.cvss >= 9 ? "#c9190b" : "inherit",
                          }}
                        >
                          {cve.cvss.toFixed(1)}
                        </span>
                      }
                    />
                    <DetailRow
                      label="EPSS"
                      value={<EpssBadge value={cve.epss_probability} />}
                    />
                    <DetailRow
                      label={t('cves.fixable')}
                      value={
                        cve.fixable ? (
                          <span style={{ color: FIXABLE_COLOR }}>{t('cveDetail.yesFixable')}</span>
                        ) : (
                          <span style={{ color: "#8a8d90" }}>{t('cveDetail.noFixable')}</span>
                        )
                      }
                    />
                    {cve.fixed_by && (
                      <DetailRow
                        label={t('cves.fixVersion')}
                        value={
                          <span
                            style={{ fontFamily: "monospace", fontSize: 11 }}
                          >
                            {cve.fixed_by}
                          </span>
                        }
                      />
                    )}
                    <DetailRow
                      label={t('cves.firstSeen')}
                      value={
                        cve.first_seen
                          ? new Date(cve.first_seen).toLocaleDateString(dateLocale)
                          : "–"
                      }
                    />
                    <DetailRow
                      label={t('cves.publishedOn')}
                      value={
                        cve.published_on
                          ? new Date(cve.published_on).toLocaleDateString(
                              dateLocale,
                            )
                          : "–"
                      }
                    />
                    {cve.operating_system && (
                      <DetailRow
                        label={t('cves.operatingSystem')}
                        value={cve.operating_system}
                      />
                    )}
                    {cve.priority_deadline && (
                      <DetailRow
                        label={t('cves.deadline')}
                        value={new Date(
                          cve.priority_deadline,
                        ).toLocaleDateString(dateLocale)}
                      />
                    )}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          </GridItem>

          <GridItem span={6}>
            <Card>
              <CardTitle>{t('cveDetail.actions')}</CardTitle>
              <CardBody>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {cve.risk_acceptance_status === RiskStatus.approved ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <CheckCircleIcon
                        style={{
                          fontSize: 24,
                          color: FIXABLE_COLOR,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: FIXABLE_COLOR,
                          fontWeight: 600,
                        }}
                      >
                        {t('cveDetail.riskAccepted')}
                      </span>
                    </div>
                  ) : !isSecTeam ? (
                    <Button
                      variant="primary"
                      isDisabled={
                        cve.risk_acceptance_status === RiskStatus.requested
                      }
                      onClick={() =>
                        navigate(`/risk-acceptances/neu?cve=${cve.cve_id}`)
                      }
                    >
                      {t('cveDetail.requestRiskAcceptance')}
                    </Button>
                  ) : null}
                  {cve.has_risk_acceptance && (
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#6a6e73",
                          marginBottom: 8,
                        }}
                      >
                        {t('cveDetail.existingRiskAcceptance')}{" "}
                        {cve.risk_acceptance_status &&
                          STATUS_LABELS[cve.risk_acceptance_status]}
                        )
                      </p>
                      <div
                        style={{ display: "flex", flexDirection: "column", gap: 8 }}
                      >
                        {cve.risk_acceptance_id && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              navigate(
                                `/risk-acceptances/${cve.risk_acceptance_id}`,
                              )
                            }
                          >
                            {t('cveDetail.viewRiskAcceptance')}
                          </Button>
                        )}
                        {cve.risk_acceptance_id &&
                          (cve.risk_acceptance_status === RiskStatus.approved ||
                            cve.risk_acceptance_status ===
                              RiskStatus.rejected) && (
                            <Button
                              variant="secondary"
                              onClick={() =>
                                navigate(
                                  `/risk-acceptances/${cve.risk_acceptance_id}?edit=1`,
                                )
                              }
                            >
                              {t('cveDetail.editRiskAcceptance')}
                            </Button>
                          )}
                      </div>
                    </div>
                  )}
                  {cve.is_suppressed ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <CheckCircleIcon
                        style={{
                          fontSize: 24,
                          color: FIXABLE_COLOR,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: FIXABLE_COLOR,
                          fontWeight: 600,
                        }}
                      >
                        {t('cveDetail.falsePositiveSuppressed')}
                      </span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/suppression-rules")}
                      >
                        {t('cveDetail.viewSuppressionRule')}
                      </Button>
                    </div>
                  ) : cve.suppression_requested ? (
                    <div>
                      <Label color="blue" isCompact>
                        {t('cveDetail.falsePositiveRequested')}
                      </Label>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/suppression-rules")}
                        style={{ marginLeft: 8 }}
                      >
                        {t('cveDetail.viewSuppressionRule')}
                      </Button>
                    </div>
                  ) : fpSuccess ? (
                    <Alert
                      variant="success"
                      isInline
                      title={t('cveDetail.fpSubmitSuccess')}
                    />
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => setShowFpModal(true)}
                    >
                      {t('cveDetail.requestFalsePositive')}
                    </Button>
                  )}

                  {!isSecTeam && (
                    <Button
                      variant="secondary"
                      onClick={() => document.getElementById('remediation-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      {t('cveDetail.createRemediationBtn')}
                    </Button>
                  )}
                  <Button
                    variant="link"
                    onClick={() => navigate("/vulnerabilities")}
                  >
                    {t('cveDetail.backToList')}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {cve.components.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>
                  {t('cveDetail.componentsCount', { count: cve.components.length })}
                </CardTitle>
                <CardBody style={{ padding: 0 }}>
                  <Table variant="compact">
                    <Thead>
                      <Tr>
                        <Th>{t('cves.componentName')}</Th>
                        <Th>{t('cves.componentVersion')}</Th>
                        <Th>{t('cves.fixable')}</Th>
                        <Th>{t('cves.fixVersion')}</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cve.components.map((c, i) => (
                        <Tr key={i}>
                          <Td style={{ fontFamily: "monospace" }}>
                            {c.component_name}
                          </Td>
                          <Td style={{ fontFamily: "monospace", fontSize: 11 }}>
                            {c.component_version}
                          </Td>
                          <Td>
                            {c.fixable ? (
                              <span style={{ color: FIXABLE_COLOR }}>✓</span>
                            ) : (
                              <span style={{ color: "#8a8d90" }}>✗</span>
                            )}
                          </Td>
                          <Td style={{ fontFamily: "monospace", fontSize: 11 }}>
                            {c.fixed_by ?? "–"}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {cve.affected_deployments_list.length > 0 &&
            (() => {
              const filterLower = deploymentFilter.toLowerCase();
              const filtered = deploymentFilter
                ? cve.affected_deployments_list.filter(
                    (d) =>
                      d.deployment_name.toLowerCase().includes(filterLower) ||
                      d.namespace.toLowerCase().includes(filterLower) ||
                      d.cluster_name.toLowerCase().includes(filterLower) ||
                      d.image_name.toLowerCase().includes(filterLower),
                  )
                : cve.affected_deployments_list;
              const pageStart = (deploymentPage - 1) * deploymentPerPage;
              const pageItems = filtered.slice(
                pageStart,
                pageStart + deploymentPerPage,
              );
              return (
                <GridItem span={12}>
                  <Card>
                    <CardTitle>
                      {t('cveDetail.deploymentsCount', { count: cve.affected_deployments_list.length })}
                    </CardTitle>
                    <CardBody>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 12,
                        }}
                      >
                        <TextInput
                          type="search"
                          value={deploymentFilter}
                          onChange={(_, v) => {
                            setDeploymentFilter(v);
                            setDeploymentPage(1);
                          }}
                          placeholder={t('cveDetail.deploymentFilterPlaceholder')}
                          style={{ flex: 1 }}
                          aria-label={t('cveDetail.deploymentFilterLabel')}
                        />
                        {deploymentFilter && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            {t('cveDetail.filteredOf', { filtered: filtered.length, total: cve.affected_deployments_list.length })}
                          </span>
                        )}
                      </div>
                    </CardBody>
                    <CardBody style={{ padding: 0 }}>
                      <Table variant="compact" isStickyHeader style={{ tableLayout: "fixed" }}>
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
                          {pageItems.length > 0 ? (
                            pageItems.map((d) => (
                              <Tr key={`${d.deployment_id}-${d.image_name}`}>
                                <Td
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.deployment_name}
                                </Td>
                                <Td
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.namespace}
                                </Td>
                                <Td
                                  style={{
                                    fontSize: 11,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.cluster_name}
                                </Td>
                                <Td
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
                                      to={`/images/${encodeURIComponent(d.image_id)}`}
                                      style={{ color: BRAND_BLUE }}
                                    >
                                      {d.image_name}
                                    </Link>
                                  ) : d.image_name}
                                </Td>
                                <Td
                                  style={{
                                    fontSize: 11,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.first_seen
                                    ? new Date(d.first_seen).toLocaleDateString(dateLocale)
                                    : "–"}
                                </Td>
                              </Tr>
                            ))
                          ) : (
                            <Tr>
                              <Td
                                colSpan={5}
                                style={{
                                  textAlign: "center",
                                  color:
                                    "var(--pf-t--global--text--color--subtle)",
                                  fontSize: 13,
                                }}
                              >
                                {t('cveDetail.noDeployments')}
                              </Td>
                            </Tr>
                          )}
                        </Tbody>
                      </Table>
                    </CardBody>
                    {filtered.length > deploymentPerPage && (
                      <CardBody style={{ paddingTop: 0 }}>
                        <Pagination
                          itemCount={filtered.length}
                          perPage={deploymentPerPage}
                          page={deploymentPage}
                          onSetPage={(_, p) => setDeploymentPage(p)}
                          isCompact
                        />
                      </CardBody>
                    )}
                  </Card>
                </GridItem>
              );
            })()}
          <GridItem span={12}>
            <CveRemediationSection cveId={cve.cve_id} deployments={cve.affected_deployments_list} />
          </GridItem>

          <GridItem span={12}>
            <Card>
              <CardTitle>{t('cveDetail.commentsCount', { count: comments?.length ?? 0 })}</CardTitle>
              <CardBody>
                {comments && comments.length > 0 ? (
                  <div style={{ marginBottom: 20 }}>
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        id={`comment-${c.id}`}
                        style={{
                          padding: 12,
                          marginBottom: 10,
                          background:
                            "var(--pf-t--global--background--color--secondary--default)",
                          borderLeft: `3px solid ${c.is_sec_team ? "var(--pf-t--global--color--blue--default)" : "var(--pf-t--global--border--color--default)"}`,
                          borderRadius: "0 4px 4px 0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: c.is_sec_team
                                ? "var(--pf-t--global--color--blue--default)"
                                : "var(--pf-t--global--text--color--regular)",
                            }}
                          >
                            {c.username}
                            {c.is_sec_team && (
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontSize: 10,
                                  background: BRAND_BLUE,
                                  color: "#fff",
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                }}
                              >
                                {t('cveDetail.secLabel')}
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            {new Date(c.created_at).toLocaleString(dateLocale)}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.5,
                          }}
                        >
                          {renderMentions(c.message)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--pf-t--global--text--color--subtle)",
                      marginBottom: 16,
                    }}
                  >
                    {t('cveDetail.noComments')}
                  </p>
                )}
                <form onSubmit={handleAddComment}>
                  <MentionTextArea
                    value={newComment}
                    onChange={setNewComment}
                    rows={3}
                    placeholder={t('cveDetail.commentPlaceholder')}
                    style={{ marginBottom: 8 }}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    isLoading={addComment.isPending}
                    isDisabled={!newComment.trim()}
                  >
                    {t('cveDetail.sendComment')}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>

      <Modal
        isOpen={showFpModal}
        onClose={() => { setShowFpModal(false); resetFpForm(); }}
        aria-label={t('cveDetail.requestFalsePositive')}
        variant="medium"
      >
        <ModalHeader title={`${t('cveDetail.requestFalsePositive')} — ${cveId}`} />
        <ModalBody>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>
                {t('cveDetail.fpReasonLabel')}
              </label>
              <TextArea
                value={fpReason}
                onChange={(_, v) => setFpReason(v)}
                placeholder={t('cveDetail.fpReasonPlaceholder')}
                rows={3}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 4 }}>
                {t('cveDetail.fpReferenceLabel')}
              </label>
              <TextInput
                value={fpRefUrl}
                onChange={(_, v) => setFpRefUrl(v)}
                placeholder="https://..."
                aria-label={t('cveDetail.fpReferenceLabel')}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 8 }}>
                {t('suppressionRules.scopeLabel')}
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="fp-scope"
                    checked={fpScopeMode === "all"}
                    onChange={() => setFpScopeMode("all")}
                  />
                  <span style={{ fontSize: 13 }}>{t('suppressionRules.scopeAll')}</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="fp-scope"
                    checked={fpScopeMode === "namespace"}
                    onChange={() => setFpScopeMode("namespace")}
                  />
                  <span style={{ fontSize: 13 }}>{t('suppressionRules.scopeNamespace')}</span>
                </label>
                {fpScopeMode === "namespace" && (
                  <div style={{
                    marginLeft: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    maxHeight: 200,
                    overflowY: "auto",
                    border: "1px solid var(--pf-t--global--border--color--default)",
                    borderRadius: 4,
                    padding: 8,
                  }}>
                    {affectedNamespacePairs.length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--pf-t--global--text--color--subtle)" }}>
                        {t('cveDetail.noDeployments')}
                      </span>
                    ) : (
                      affectedNamespacePairs.map((pair) => {
                        const key = `${pair.namespace}:${pair.cluster_name}`;
                        return (
                          <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={fpSelectedNamespaces.has(key)}
                              onChange={() => toggleFpNamespace(key)}
                            />
                            <span style={{ fontSize: 12, fontFamily: "monospace" }}>
                              {pair.namespace}
                              <span style={{ color: "var(--pf-t--global--text--color--subtle)", marginLeft: 4 }}>
                                ({pair.cluster_name})
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            {fpError && <Alert variant="danger" isInline title={fpError} />}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={handleFpSubmit}
            isLoading={createSuppression.isPending}
            isDisabled={
              createSuppression.isPending ||
              fpReason.length < 10 ||
              (fpScopeMode === "namespace" && fpSelectedNamespaces.size === 0)
            }
          >
            {t('suppressionRules.submit')}
          </Button>
          <Button variant="link" onClick={() => { setShowFpModal(false); resetFpForm(); }}>
            {t('common.cancel')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

