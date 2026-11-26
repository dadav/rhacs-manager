import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  ProgressStep,
  ProgressStepper,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import type { AffectedDeployment, CveDetail } from "../types";
import { RiskStatus, RemediationStatus } from "../types";
import type { RemediationItem } from "../types";

export type Phase = "discover" | "assess" | "prioritize" | "remediate" | "resolve";

// "done" is the only state rendered green. Started-but-unfinished work is "in_progress",
// so a remediation that is only being worked on never looks complete.
export type PhaseState = "done" | "in_progress" | "todo";

export type ActivityKind = "remediating" | "awaiting_approval" | "partial_coverage";

export interface PhaseStatus {
  state: PhaseState;
  activity?: ActivityKind;
}

// Per-row coverage annotations computed by the backend for the current visible scope.
export type WorkflowDeployment = Pick<
  AffectedDeployment,
  "risk_acceptance_status" | "remediation_status" | "is_suppressed"
>;

export type WorkflowCve = Pick<
  CveDetail,
  "has_priority" | "has_risk_acceptance" | "risk_acceptance_status" | "no_longer_affected"
> & {
  affected_deployments_list: WorkflowDeployment[];
};

export type WorkflowRemediation = Pick<RemediationItem, "status">;

interface CveWorkflowStepperProps {
  cve: WorkflowCve;
  remediations: WorkflowRemediation[] | undefined;
  isSecTeam: boolean;
}

const TERMINAL_REMEDIATION_STATUSES = new Set<string>([
  RemediationStatus.resolved,
  RemediationStatus.verified,
  RemediationStatus.wont_fix,
]);

// A row is complete only through an approved risk acceptance or a terminal remediation.
// Suppression alone never completes a row. Rows are not deduplicated by deployment:
// each row can be a different vulnerable image of the same deployment.
function isDeploymentCovered(row: WorkflowDeployment): boolean {
  if (row.risk_acceptance_status === RiskStatus.approved) return true;
  return TERMINAL_REMEDIATION_STATUSES.has(row.remediation_status ?? "");
}

// Nonempty affected list: only the row annotations count. The aggregate risk acceptance
// status and remediation records without a visible row are ignored on purpose.
function computeCoverageRemediatePhase(rows: WorkflowDeployment[]): PhaseStatus {
  const uncovered = rows.filter((r) => !isDeploymentCovered(r));
  if (uncovered.length === 0) return { state: "done" };
  if (uncovered.some((r) => r.remediation_status === RemediationStatus.in_progress)) {
    return { state: "in_progress", activity: "remediating" };
  }
  if (uncovered.some((r) => r.risk_acceptance_status === RiskStatus.requested)) {
    return { state: "in_progress", activity: "awaiting_approval" };
  }
  if (uncovered.length < rows.length) return { state: "in_progress", activity: "partial_coverage" };
  return { state: "todo" };
}

// Empty affected list never resolves vacuously. Only a CVE that StackRox no longer reports
// in the scope can resolve, and only once every visible remediation is terminal.
function computeNoDeploymentsRemediatePhase(
  cve: WorkflowCve,
  remediations: WorkflowRemediation[],
): PhaseStatus {
  if (!cve.no_longer_affected) return { state: "todo" };
  const allTerminal =
    remediations.length > 0 && remediations.every((r) => TERMINAL_REMEDIATION_STATUSES.has(r.status));
  if (allTerminal) return { state: "done" };
  if (remediations.some((r) => r.status !== RemediationStatus.open)) {
    return { state: "in_progress", activity: "remediating" };
  }
  if (cve.has_risk_acceptance && cve.risk_acceptance_status === RiskStatus.requested) {
    return { state: "in_progress", activity: "awaiting_approval" };
  }
  return { state: "todo" };
}

export function computePhases(
  cve: WorkflowCve,
  remediations: WorkflowRemediation[] | undefined,
  activePhases: Phase[],
): Record<Phase, PhaseStatus> {
  const list = remediations ?? [];
  const rows = cve.affected_deployments_list;
  const remediate =
    rows.length > 0 ? computeCoverageRemediatePhase(rows) : computeNoDeploymentsRemediatePhase(cve, list);
  const isFinished = remediate.state === "done";

  const allPhases: Record<Phase, PhaseStatus> = {
    discover: { state: "done" },
    // Any risk acceptance or remediation record is evidence that the CVE was assessed.
    assess: { state: cve.has_risk_acceptance || list.length > 0 ? "done" : "todo" },
    prioritize: { state: cve.has_priority ? "done" : "todo" },
    remediate,
    resolve: { state: isFinished ? "done" : "todo" },
  };

  const phases: Partial<Record<Phase, PhaseStatus>> = {};
  for (const phase of activePhases) {
    phases[phase] = allPhases[phase];
  }
  return phases as Record<Phase, PhaseStatus>;
}

export function getCurrentPhase(phases: Record<Phase, PhaseStatus>, order: Phase[]): Phase {
  for (const phase of order) {
    if (phases[phase].state !== "done") return phase;
  }
  return order[order.length - 1];
}

export const SEC_TEAM_PHASES: Phase[] = ["discover", "prioritize", "remediate", "resolve"];
export const MEMBER_PHASES: Phase[] = ["discover", "assess", "remediate", "resolve"];

const STEP_LABEL_KEYS: Record<Phase, string> = {
  discover: "cveDetail.workflowDiscover",
  assess: "cveDetail.workflowAssess",
  prioritize: "cveDetail.workflowPrioritize",
  remediate: "cveDetail.workflowRemediate",
  resolve: "cveDetail.workflowResolve",
};

const SEC_TEAM_HINTS: Partial<Record<Phase, string>> = {
  discover: "cveDetail.hintPrioritize",
  prioritize: "cveDetail.hintPrioritize",
  remediate: "cveDetail.hintRemediate",
  resolve: "cveDetail.hintResolve",
};

const MEMBER_HINTS: Partial<Record<Phase, string>> = {
  discover: "cveDetail.hintAssess",
  assess: "cveDetail.hintAssess",
  remediate: "cveDetail.hintRemediate",
  resolve: "cveDetail.hintResolve",
};

const ACTIVITY_DESCRIPTION_KEYS: Record<ActivityKind, string> = {
  remediating: "cveDetail.workflowInProgress",
  awaiting_approval: "cveDetail.workflowAwaitingApproval",
  partial_coverage: "cveDetail.workflowPartialCoverage",
};

const ACTIVITY_STATE_ARIA_KEYS: Record<ActivityKind, string> = {
  remediating: "cveDetail.workflowStateInProgress",
  awaiting_approval: "cveDetail.workflowStateAwaitingApproval",
  partial_coverage: "cveDetail.workflowStatePartialCoverage",
};

const ACTIVITY_HINT_KEYS: Record<ActivityKind, string> = {
  remediating: "cveDetail.hintRemediateInProgress",
  awaiting_approval: "cveDetail.hintAwaitingApproval",
  partial_coverage: "cveDetail.hintPartialCoverage",
};

type StepVariant = "success" | "info" | "pending";

function stepVariant(status: PhaseStatus, isCurrent: boolean): StepVariant {
  if (status.state === "done") return "success";
  if (isCurrent) return "info";
  return "pending";
}

function stepStateAriaKey(status: PhaseStatus, isCurrent: boolean): string {
  if (status.state === "done") return "cveDetail.workflowStateDone";
  if (isCurrent && status.activity) return ACTIVITY_STATE_ARIA_KEYS[status.activity];
  if (isCurrent) return "cveDetail.workflowStateCurrent";
  return "cveDetail.workflowStatePending";
}

export function CveWorkflowStepper({ cve, remediations, isSecTeam }: CveWorkflowStepperProps) {
  const { t } = useTranslation();

  const activePhases = isSecTeam ? SEC_TEAM_PHASES : MEMBER_PHASES;
  const hintKeys = isSecTeam ? SEC_TEAM_HINTS : MEMBER_HINTS;

  const phases = computePhases(cve, remediations, activePhases);
  const currentPhase = getCurrentPhase(phases, activePhases);
  const allComplete = activePhases.every((p) => phases[p].state === "done");
  const currentActivity = phases[currentPhase].activity;

  // While remediations are still loading (or failed to load) the next step is unknown,
  // so no hint is shown rather than a possibly wrong "create a remediation" prompt.
  const showHint = remediations !== undefined;
  let hintMessage: string;
  if (allComplete) {
    hintMessage = t("cveDetail.hintComplete");
  } else if (currentActivity) {
    hintMessage = t(ACTIVITY_HINT_KEYS[currentActivity]);
  } else {
    hintMessage = t(hintKeys[currentPhase] ?? "cveDetail.hintRemediate");
  }

  return (
    <Card>
      <CardTitle>{t("cveDetail.workflowStatus")}</CardTitle>
      <CardBody>
        <ProgressStepper aria-label={t("cveDetail.workflowStatus")}>
          {activePhases.map((phase) => {
            const status = phases[phase];
            const isCurrent = phase === currentPhase && !allComplete;
            const label = t(STEP_LABEL_KEYS[phase]);
            const description =
              isCurrent && status.activity ? t(ACTIVITY_DESCRIPTION_KEYS[status.activity]) : undefined;
            return (
              <ProgressStep
                key={phase}
                variant={stepVariant(status, isCurrent)}
                isCurrent={isCurrent}
                description={description}
                aria-label={t("cveDetail.workflowStepAria", {
                  step: label,
                  status: t(stepStateAriaKey(status, isCurrent)),
                })}
                id={`workflow-${phase}`}
                titleId={`workflow-${phase}-title`}
              >
                {label}
              </ProgressStep>
            );
          })}
        </ProgressStepper>
        {showHint && (
          <Alert
            variant={allComplete ? "success" : "info"}
            isInline
            isPlain
            title={hintMessage}
            style={{ marginTop: 12 }}
          />
        )}
      </CardBody>
    </Card>
  );
}
