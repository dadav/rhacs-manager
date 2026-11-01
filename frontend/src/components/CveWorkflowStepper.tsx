import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  ProgressStep,
  ProgressStepper,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import type { CveDetail } from "../types";
import { RiskStatus, RemediationStatus } from "../types";
import type { RemediationItem } from "../types";

interface CveWorkflowStepperProps {
  cve: CveDetail;
  remediations: RemediationItem[] | undefined;
  isSecTeam: boolean;
}

export type Phase = "discover" | "assess" | "prioritize" | "remediate" | "resolve";

// "done" is the only state rendered green. Started-but-unfinished work is "in_progress",
// so a remediation that is only being worked on never looks complete.
export type PhaseState = "done" | "in_progress" | "todo";

export type ActivityKind = "remediating" | "awaiting_approval";

export interface PhaseStatus {
  state: PhaseState;
  activity?: ActivityKind;
}

export type WorkflowCve = Pick<
  CveDetail,
  "has_priority" | "has_risk_acceptance" | "risk_acceptance_status"
>;

export type WorkflowRemediation = Pick<RemediationItem, "status">;

const TERMINAL_REMEDIATION_STATUSES = new Set<RemediationStatus>([
  RemediationStatus.resolved,
  RemediationStatus.verified,
  RemediationStatus.wont_fix,
]);

function computeRemediatePhase(
  isFinished: boolean,
  anyRemediationStarted: boolean,
  hasRequestedRa: boolean,
): PhaseStatus {
  if (isFinished) return { state: "done" };
  if (anyRemediationStarted) return { state: "in_progress", activity: "remediating" };
  if (hasRequestedRa) return { state: "in_progress", activity: "awaiting_approval" };
  return { state: "todo" };
}

export function computePhases(
  cve: WorkflowCve,
  remediations: WorkflowRemediation[] | undefined,
  activePhases: Phase[],
): Record<Phase, PhaseStatus> {
  const list = remediations ?? [];
  const hasApprovedRa =
    cve.has_risk_acceptance && cve.risk_acceptance_status === RiskStatus.approved;
  const hasRequestedRa =
    cve.has_risk_acceptance && cve.risk_acceptance_status === RiskStatus.requested;

  const allRemediationsTerminal =
    list.length > 0 && list.every((r) => TERMINAL_REMEDIATION_STATUSES.has(r.status));
  const anyRemediationStarted = list.some((r) => r.status !== RemediationStatus.open);

  // Rejected or expired risk acceptances never complete remediate/resolve.
  const isFinished = hasApprovedRa || allRemediationsTerminal;

  const allPhases: Record<Phase, PhaseStatus> = {
    discover: { state: "done" },
    assess: { state: cve.has_risk_acceptance || list.length > 0 ? "done" : "todo" },
    prioritize: { state: cve.has_priority ? "done" : "todo" },
    remediate: computeRemediatePhase(isFinished, anyRemediationStarted, hasRequestedRa),
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
};

const ACTIVITY_STATE_ARIA_KEYS: Record<ActivityKind, string> = {
  remediating: "cveDetail.workflowStateInProgress",
  awaiting_approval: "cveDetail.workflowStateAwaitingApproval",
};

const ACTIVITY_HINT_KEYS: Record<ActivityKind, string> = {
  remediating: "cveDetail.hintRemediateInProgress",
  awaiting_approval: "cveDetail.hintAwaitingApproval",
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
