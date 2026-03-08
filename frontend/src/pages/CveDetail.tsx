import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  PageSection,
  Pagination,
  ProgressStep,
  ProgressStepper,
  Spinner,
  TextArea,
  TextInput,
  Title,
} from "@patternfly/react-core";
import { CheckCircleIcon } from "@patternfly/react-icons";
import { useState } from "react";
import { getErrorMessage } from "../utils/errors";
import { useNavigate, useParams } from "react-router-dom";
import { useAddCveComment, useCveComments, useCveDetail } from "../api/cves";
import { useRemediationsByCve, useCreateRemediation, useUpdateRemediation } from "../api/remediations";
import { EpssBadge } from "../components/common/EpssBadge";
import { SeverityBadge } from "../components/common/SeverityBadge";
import { useAuth } from "../hooks/useAuth";
import { useScope } from "../hooks/useScope";
import { CveDetail as CveDetailType, RiskStatus, RemediationStatus } from "../types";
import type { RemediationItem } from "../types";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <tr>
      <td
        style={{
          padding: "8px 12px",
          fontWeight: 600,
          fontSize: 13,
          color: "#6a6e73",
          width: 200,
        }}
      >
        {label}
      </td>
      <td style={{ padding: "8px 12px", fontSize: 13 }}>{value}</td>
    </tr>
  );
}

const STATUS_COLORS: Record<RiskStatus, string> = {
  [RiskStatus.requested]: "#0066cc",
  [RiskStatus.approved]: "#1e8f19",
  [RiskStatus.rejected]: "#c9190b",
  [RiskStatus.expired]: "#8a8d90",
};

const STATUS_LABELS: Record<RiskStatus, string> = {
  [RiskStatus.requested]: "Beantragt",
  [RiskStatus.approved]: "Genehmigt",
  [RiskStatus.rejected]: "Abgelehnt",
  [RiskStatus.expired]: "Abgelaufen",
};

function CveLifecycleTimeline({ cve }: { cve: CveDetailType }) {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("de-DE") : undefined;

  type Step = { id: string; label: string; date: string | null; done: boolean };

  // Always-visible steps
  const steps: Step[] = [
    {
      id: "published",
      label: "Veröffentlicht",
      date: cve.published_on,
      done: !!cve.published_on,
    },
    {
      id: "discovered",
      label: "Entdeckt",
      date: cve.first_seen,
      done: !!cve.first_seen,
    },
  ];

  // Escalation steps — always visible, show expected date if not yet triggered
  steps.push(
    {
      id: "esc-1",
      label: "Eskalation Stufe 1",
      date: cve.escalation_level1_at ?? cve.escalation_level1_expected,
      done: !!cve.escalation_level1_at,
    },
    {
      id: "esc-2",
      label: "Eskalation Stufe 2",
      date: cve.escalation_level2_at ?? cve.escalation_level2_expected,
      done: !!cve.escalation_level2_at,
    },
    {
      id: "esc-3",
      label: "Eskalation Stufe 3",
      date: cve.escalation_level3_at ?? cve.escalation_level3_expected,
      done: !!cve.escalation_level3_at,
    },
  );

  // Conditional steps — only shown if they happened
  if (cve.has_priority) {
    steps.push({
      id: "prioritized",
      label: "Priorisiert",
      date: cve.priority_created_at,
      done: true,
    });
  }
  if (cve.has_risk_acceptance) {
    steps.push({
      id: "ra-requested",
      label: "Risikoakz. beantragt",
      date: cve.risk_acceptance_requested_at,
      done: true,
    });
  }
  if (cve.risk_acceptance_reviewed_at) {
    const reviewLabel =
      cve.risk_acceptance_status === RiskStatus.approved
        ? "Risikoakz. genehmigt"
        : cve.risk_acceptance_status === RiskStatus.rejected
          ? "Risikoakz. abgelehnt"
          : "Risikoakz. geprüft";
    steps.push({
      id: "ra-reviewed",
      label: reviewLabel,
      date: cve.risk_acceptance_reviewed_at,
      done: true,
    });
  }

  // Sort all steps after the fixed "published/discovered" pair by date
  const fixed = steps.slice(0, 2);
  const sortable = steps.slice(2);
  sortable.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    // Preserve original order for same-date steps (e.g. escalation levels)
    return sortable.indexOf(a) - sortable.indexOf(b);
  });
  const sorted = [...fixed, ...sortable];

  const currentIdx = sorted.findIndex((s) => !s.done);
  const lastDoneIdx = currentIdx === -1 ? sorted.length - 1 : currentIdx;

  return (
    <ProgressStepper aria-label="CVE Lebenszyklus">
      {sorted.map((step, i) => {
        let variant: "success" | "info" | "pending" | "danger";
        if (step.done) {
          if (
            step.id === "ra-reviewed" &&
            cve.risk_acceptance_status === RiskStatus.rejected
          ) {
            variant = "danger";
          } else if (step.id.startsWith("esc-")) {
            variant = "danger";
          } else {
            variant = "success";
          }
        } else if (i === currentIdx) {
          variant = "info";
        } else {
          variant = "pending";
        }
        return (
          <ProgressStep
            key={step.id}
            variant={variant}
            isCurrent={currentIdx === -1 ? i === lastDoneIdx : i === currentIdx}
            id={`step-${step.id}`}
            titleId={`step-${step.id}-title`}
            description={fmt(step.date)}
          >
            {step.label}
          </ProgressStep>
        );
      })}
    </ProgressStepper>
  );
}

export function CveDetail() {
  const { cveId } = useParams<{ cveId: string }>();
  const navigate = useNavigate();
  const { data: cve, isLoading, error } = useCveDetail(cveId ?? "");
  const { data: comments } = useCveComments(cveId ?? "");
  const addComment = useAddCveComment(cveId ?? "");
  const [newComment, setNewComment] = useState("");
  const [deploymentFilter, setDeploymentFilter] = useState("");
  const [deploymentPage, setDeploymentPage] = useState(1);
  const deploymentPerPage = 20;

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment.mutateAsync(newComment);
    setNewComment("");
  }

  if (isLoading)
    return (
      <PageSection>
        <Spinner aria-label="Laden" />
      </PageSection>
    );
  if (error)
    return (
      <PageSection>
        <Alert variant="danger" title={`Fehler: ${getErrorMessage(error)}`} />
      </PageSection>
    );
  if (!cve) return null;

  return (
    <>
      <PageSection variant="default">
        <Breadcrumb>
          <BreadcrumbItem
            onClick={() => navigate("/schwachstellen")}
            style={{ cursor: "pointer" }}
          >
            Schwachstellen
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
              PRIORISIERT
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
        </div>
      </PageSection>

      {cve.priority_reason && (
        <PageSection variant="default" style={{ paddingTop: 0 }}>
          <Alert
            variant="warning"
            isInline
            title="Priorisierung"
          >
            <p>{cve.priority_reason}</p>
            {cve.priority_set_by_name && (
              <p style={{ fontSize: 12, color: "#6a6e73", marginTop: 4 }}>
                — {cve.priority_set_by_name}
                {cve.priority_created_at &&
                  `, ${new Date(cve.priority_created_at).toLocaleDateString("de-DE")}`}
              </p>
            )}
          </Alert>
        </PageSection>
      )}

      <PageSection variant="default" style={{ paddingTop: 0 }}>
        <Card>
          <CardTitle>Lebenszyklus</CardTitle>
          <CardBody>
            <CveLifecycleTimeline cve={cve} />
          </CardBody>
        </Card>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {/* Core details */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Details</CardTitle>
              <CardBody style={{ padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <DetailRow
                      label="CVE-ID"
                      value={
                        <span style={{ fontFamily: "monospace" }}>
                          {cve.cve_id}
                        </span>
                      }
                    />
                    <DetailRow
                      label="Referenzen"
                      value={
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <a
                            href={`https://access.redhat.com/security/cve/${cve.cve_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Red Hat Security
                          </a>
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            NVD
                          </a>
                        </div>
                      }
                    />
                    <DetailRow
                      label="Kontakt E-Mail"
                      value={
                        cve.contact_emails.length > 0 ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {cve.contact_emails.map((email) => (
                              <a key={email} href={`mailto:${email}`}>
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
                      label="Schweregrad"
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
                      label="Behebbar"
                      value={
                        cve.fixable ? (
                          <span style={{ color: "#1e8f19" }}>✓ Ja</span>
                        ) : (
                          <span style={{ color: "#8a8d90" }}>✗ Nein</span>
                        )
                      }
                    />
                    {cve.fixed_by && (
                      <DetailRow
                        label="Fix-Version"
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
                      label="Erstmals gesehen"
                      value={
                        cve.first_seen
                          ? new Date(cve.first_seen).toLocaleDateString("de-DE")
                          : "–"
                      }
                    />
                    <DetailRow
                      label="Veröffentlicht am"
                      value={
                        cve.published_on
                          ? new Date(cve.published_on).toLocaleDateString(
                              "de-DE",
                            )
                          : "–"
                      }
                    />
                    {cve.operating_system && (
                      <DetailRow
                        label="Betriebssystem"
                        value={cve.operating_system}
                      />
                    )}
                    {cve.priority_deadline && (
                      <DetailRow
                        label="Deadline"
                        value={new Date(
                          cve.priority_deadline,
                        ).toLocaleDateString("de-DE")}
                      />
                    )}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </GridItem>

          {/* Actions */}
          <GridItem span={6}>
            <Card>
              <CardTitle>Aktionen</CardTitle>
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
                          color: "#1e8f19",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: "#1e8f19",
                          fontWeight: 600,
                        }}
                      >
                        Risiko akzeptiert
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      isDisabled={
                        cve.risk_acceptance_status === RiskStatus.requested
                      }
                      onClick={() =>
                        navigate(`/risikoakzeptanzen/neu?cve=${cve.cve_id}`)
                      }
                    >
                      Risikoakzeptanz beantragen
                    </Button>
                  )}
                  {cve.has_risk_acceptance && (
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#6a6e73",
                          marginBottom: 8,
                        }}
                      >
                        Bereits eine Risikoakzeptanz vorhanden (Status:{" "}
                        {cve.risk_acceptance_status &&
                          STATUS_LABELS[cve.risk_acceptance_status]}
                        )
                      </p>
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        {cve.risk_acceptance_id && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              navigate(
                                `/risikoakzeptanzen/${cve.risk_acceptance_id}`,
                              )
                            }
                          >
                            Zur Risikoakzeptanz
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
                                  `/risikoakzeptanzen/${cve.risk_acceptance_id}?edit=1`,
                                )
                              }
                            >
                              Risikoakzeptanz ändern
                            </Button>
                          )}
                      </div>
                    </div>
                  )}
                  <Button
                    variant="link"
                    onClick={() => navigate("/schwachstellen")}
                  >
                    Zurück zur Liste
                  </Button>
                </div>
              </CardBody>
            </Card>
          </GridItem>

          {/* Affected components */}
          {cve.components.length > 0 && (
            <GridItem span={12}>
              <Card>
                <CardTitle>
                  Betroffene Komponenten ({cve.components.length})
                </CardTitle>
                <CardBody style={{ padding: 0 }}>
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
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>
                          Komponente
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>
                          Version
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>
                          Behebbar
                        </th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>
                          Fix-Version
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cve.components.map((c, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom:
                              "1px solid var(--pf-t--global--border--color--default)",
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 12px",
                              fontFamily: "monospace",
                            }}
                          >
                            {c.component_name}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontFamily: "monospace",
                              fontSize: 11,
                            }}
                          >
                            {c.component_version}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {c.fixable ? (
                              <span style={{ color: "#1e8f19" }}>✓</span>
                            ) : (
                              <span style={{ color: "#8a8d90" }}>✗</span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontFamily: "monospace",
                              fontSize: 11,
                            }}
                          >
                            {c.fixed_by ?? "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {/* Affected deployments */}
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
                      Betroffene Deployments (
                      {cve.affected_deployments_list.length})
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
                          placeholder="Filtern nach Deployment, Namespace, Cluster oder Image…"
                          style={{ flex: 1 }}
                          aria-label="Deployments filtern"
                        />
                        {deploymentFilter && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            {filtered.length} von{" "}
                            {cve.affected_deployments_list.length}
                          </span>
                        )}
                      </div>
                    </CardBody>
                    <CardBody style={{ padding: 0 }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: 13,
                          tableLayout: "fixed",
                        }}
                      >
                        <colgroup>
                          <col style={{ width: "18%" }} />
                          <col style={{ width: "18%" }} />
                          <col style={{ width: "18%" }} />
                          <col style={{ width: "46%" }} />
                        </colgroup>
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
                              Deployment
                            </th>
                            <th
                              style={{ padding: "8px 12px", textAlign: "left" }}
                            >
                              Namespace
                            </th>
                            <th
                              style={{ padding: "8px 12px", textAlign: "left" }}
                            >
                              Cluster
                            </th>
                            <th
                              style={{ padding: "8px 12px", textAlign: "left" }}
                            >
                              Image
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.length > 0 ? (
                            pageItems.map((d) => (
                              <tr
                                key={d.deployment_id}
                                style={{
                                  borderBottom:
                                    "1px solid var(--pf-t--global--border--color--default)",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.deployment_name}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.namespace}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontSize: 11,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.cluster_name}
                                </td>
                                <td
                                  style={{
                                    padding: "8px 12px",
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={d.image_name}
                                >
                                  {d.image_name}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={4}
                                style={{
                                  padding: "16px 12px",
                                  textAlign: "center",
                                  color:
                                    "var(--pf-t--global--text--color--subtle)",
                                  fontSize: 13,
                                }}
                              >
                                Keine Deployments gefunden.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
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
          {/* Remediations */}
          <GridItem span={12}>
            <CveRemediationSection cveId={cve.cve_id} deployments={cve.affected_deployments_list} />
          </GridItem>

          {/* Comments */}
          <GridItem span={12}>
            <Card>
              <CardTitle>Kommentare ({comments?.length ?? 0})</CardTitle>
              <CardBody>
                {comments && comments.length > 0 ? (
                  <div style={{ marginBottom: 20 }}>
                    {comments.map((c) => (
                      <div
                        key={c.id}
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
                                  background: "#0066cc",
                                  color: "#fff",
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                }}
                              >
                                SEC
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--pf-t--global--text--color--subtle)",
                            }}
                          >
                            {new Date(c.created_at).toLocaleString("de-DE")}
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
                          {c.message}
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
                    Noch keine Kommentare.
                  </p>
                )}
                <form onSubmit={handleAddComment}>
                  <TextArea
                    value={newComment}
                    onChange={(_, v) => setNewComment(v)}
                    rows={3}
                    placeholder="Kommentar hinzufügen..."
                    style={{ marginBottom: 8 }}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    isLoading={addComment.isPending}
                    isDisabled={!newComment.trim()}
                  >
                    Kommentar senden
                  </Button>
                </form>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
}

const REM_STATUS_LABELS: Record<string, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  resolved: 'Behoben',
  verified: 'Verifiziert',
  wont_fix: 'Wird nicht behoben',
}

const REM_STATUS_COLORS: Record<string, 'blue' | 'orange' | 'green' | 'teal' | 'grey'> = {
  open: 'blue',
  in_progress: 'orange',
  resolved: 'green',
  verified: 'teal',
  wont_fix: 'grey',
}

function CveRemediationSection({
  cveId,
  deployments,
}: {
  cveId: string
  deployments: { namespace: string; cluster_name: string }[]
}) {
  const { isSecTeam } = useAuth()
  const { scopeParams } = useScope()
  const { data: remediations, isLoading } = useRemediationsByCve(cveId, scopeParams)
  const createMutation = useCreateRemediation()
  const [showForm, setShowForm] = useState(false)
  const [selectedNs, setSelectedNs] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')

  // Unique namespaces from deployments
  const namespaces = Array.from(
    new Map(
      deployments.map(d => [`${d.namespace}:${d.cluster_name}`, d])
    ).values()
  )

  // Filter to namespaces that don't already have a remediation
  const existingKeys = new Set(
    (remediations ?? []).map(r => `${r.namespace}:${r.cluster_name}`)
  )
  const availableNs = namespaces.filter(
    d => !existingKeys.has(`${d.namespace}:${d.cluster_name}`)
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNs) return
    const [namespace, cluster_name] = selectedNs.split(':')
    await createMutation.mutateAsync({
      cve_id: cveId,
      namespace,
      cluster_name,
      target_date: targetDate || null,
      notes: notes || null,
    })
    setShowForm(false)
    setSelectedNs('')
    setTargetDate('')
    setNotes('')
  }

  return (
    <Card>
      <CardTitle>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Behebungen ({remediations?.length ?? 0})</span>
          {!isSecTeam && availableNs.length > 0 && !showForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              Behebung starten
            </Button>
          )}
        </div>
      </CardTitle>
      <CardBody>
        {isLoading ? (
          <Spinner size="md" aria-label="Laden" />
        ) : remediations && remediations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {remediations.map(r => (
              <RemediationCard key={r.id} item={r} isSecTeam={isSecTeam} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--pf-t--global--text--color--subtle)', margin: 0 }}>
            Keine Behebungen für diese CVE.
          </p>
        )}

        {showForm && (
          <form onSubmit={handleCreate} style={{ marginTop: 16, padding: 12, border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Namespace *</label>
                <select
                  value={selectedNs}
                  onChange={e => setSelectedNs(e.target.value)}
                  style={{
                    display: 'block', width: '100%', marginTop: 4, height: 36, padding: '0 8px',
                    border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4,
                    background: 'var(--pf-t--global--background--color--primary--default)',
                    color: 'var(--pf-t--global--text--color--regular)', fontSize: 13,
                  }}
                >
                  <option value="">Namespace wählen...</option>
                  {availableNs.map(d => (
                    <option key={`${d.namespace}:${d.cluster_name}`} value={`${d.namespace}:${d.cluster_name}`}>
                      {d.cluster_name}/{d.namespace}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Zieldatum</label>
                <TextInput
                  type="date"
                  value={targetDate}
                  onChange={(_, v) => setTargetDate(v)}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600 }}>Notizen</label>
                <TextArea
                  value={notes}
                  onChange={(_, v) => setNotes(v)}
                  rows={2}
                  placeholder="Optionale Notizen..."
                  style={{ marginTop: 4 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="submit" variant="primary" size="sm" isLoading={createMutation.isPending} isDisabled={!selectedNs}>
                  Erstellen
                </Button>
                <Button variant="link" size="sm" onClick={() => setShowForm(false)}>
                  Abbrechen
                </Button>
              </div>
              {createMutation.isError && (
                <Alert variant="danger" isInline title={getErrorMessage(createMutation.error)} />
              )}
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}

function RemediationCard({ item, isSecTeam }: { item: RemediationItem; isSecTeam: boolean }) {
  const updateMutation = useUpdateRemediation(item.id)
  const [showWontFix, setShowWontFix] = useState(false)
  const [wontFixReason, setWontFixReason] = useState('')

  const canVerify = isSecTeam && item.status === RemediationStatus.resolved
  const canProgress = item.status === RemediationStatus.open
  const canResolve = item.status === RemediationStatus.in_progress
  const canWontFix = item.status === RemediationStatus.open || item.status === RemediationStatus.in_progress
  const canReopen = item.status === RemediationStatus.wont_fix

  function handleWontFix() {
    if (!wontFixReason.trim()) return
    updateMutation.mutate(
      { status: 'wont_fix', wont_fix_reason: wontFixReason },
      { onSuccess: () => { setShowWontFix(false); setWontFixReason('') } },
    )
  }

  return (
    <div style={{
      padding: 12,
      border: '1px solid var(--pf-t--global--border--color--default)',
      borderRadius: 4,
      borderLeft: `3px solid ${
        item.is_overdue ? '#c9190b'
        : item.status === RemediationStatus.verified ? '#009596'
        : item.status === RemediationStatus.resolved ? '#1e8f19'
        : item.status === RemediationStatus.in_progress ? '#ec7a08'
        : item.status === RemediationStatus.wont_fix ? '#8a8d90'
        : 'var(--pf-t--global--color--brand--default)'
      }`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {item.cluster_name}/{item.namespace}
        </span>
        <Label color={REM_STATUS_COLORS[item.status] ?? 'grey'}>
          {REM_STATUS_LABELS[item.status] ?? item.status}
        </Label>
      </div>
      <div style={{ fontSize: 12, color: 'var(--pf-t--global--text--color--subtle)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {item.assigned_to_name && <span>Zugewiesen: {item.assigned_to_name}</span>}
        {item.target_date && (
          <span style={{ color: item.is_overdue ? '#c9190b' : undefined, fontWeight: item.is_overdue ? 600 : 400 }}>
            Fällig: {new Date(item.target_date).toLocaleDateString('de-DE')}
            {item.is_overdue && ' (überfällig)'}
          </span>
        )}
        <span>Erstellt: {new Date(item.created_at).toLocaleDateString('de-DE')} von {item.created_by_name}</span>
      </div>
      {item.notes && (
        <p style={{ fontSize: 12, margin: '6px 0 0', color: 'var(--pf-t--global--text--color--regular)', whiteSpace: 'pre-wrap' }}>
          {item.notes}
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {canProgress && (
          <Button variant="secondary" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'in_progress' })}>
            Starten
          </Button>
        )}
        {canResolve && (
          <Button variant="secondary" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'resolved' })}>
            Als behoben markieren
          </Button>
        )}
        {canVerify && (
          <Button variant="primary" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'verified' })}>
            Verifizieren
          </Button>
        )}
        {canWontFix && !showWontFix && (
          <Button variant="link" size="sm" isDanger onClick={() => setShowWontFix(true)}>
            Wird nicht behoben
          </Button>
        )}
        {canReopen && (
          <Button variant="link" size="sm" isLoading={updateMutation.isPending} onClick={() => updateMutation.mutate({ status: 'open' })}>
            Wiedereröffnen
          </Button>
        )}
      </div>
      {showWontFix && (
        <div style={{ marginTop: 8, padding: 10, border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Begründung *</label>
          <TextArea
            value={wontFixReason}
            onChange={(_, v) => setWontFixReason(v)}
            rows={2}
            placeholder="Warum wird diese CVE nicht behoben?"
            style={{ marginTop: 4 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="danger" size="sm" isLoading={updateMutation.isPending} isDisabled={!wontFixReason.trim()} onClick={handleWontFix}>
              Bestätigen
            </Button>
            <Button variant="link" size="sm" onClick={() => { setShowWontFix(false); setWontFixReason('') }}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
