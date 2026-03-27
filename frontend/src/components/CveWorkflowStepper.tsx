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

type Phase = "discover" | "assess" | "prioritize" | "remediate" | "verify" | "resolve";

const TERMINAL_REMEDIATION_STATUSES = new Set<RemediationStatus>([
  RemediationStatus.resolved,
  RemediationStatus.verified,
  RemediationStatus.wont_fix,
]);

function computePhases(
  cve: CveDetail,
  remediations: RemediationItem[] | undefined,
  activePhases: Phase[],
  isMember: boolean,
) {
  const hasApprovedRa = cve.has_risk_acceptance && cve.risk_acceptance_status === RiskStatus.approved;

  const allRemediationsTerminal =
    remediations !== undefined &&
    remediations.length > 0 &&
    remediations.every((r) => TERMINAL_REMEDIATION_STATUSES.has(r.status));

  const allRemediationsVerified =
    remediations !== undefined &&
    remediations.length > 0 &&
    remediations.every((r) => r.status === RemediationStatus.verified);

  const hasAnyRemediation =
    remediations !== undefined && remediations.length > 0;

  const anyRemediationInProgress =
    remediations !== undefined &&
    remediations.some((r) => r.status !== RemediationStatus.open);

  const allPhases: Record<Phase, boolean> = {
    discover: true,
    assess: cve.has_risk_acceptance || hasAnyRemediation,
    prioritize: cve.has_priority,
    remediate: hasApprovedRa || allRemediationsTerminal,
    verify: hasApprovedRa || allRemediationsVerified,
    resolve: hasApprovedRa || allRemediationsTerminal,
  };

  if (isMember) {
    allPhases.remediate = cve.has_risk_acceptance || anyRemediationInProgress;
  }

  const phases: Partial<Record<Phase, boolean>> = {};
  for (const phase of activePhases) {
    phases[phase] = allPhases[phase];
  }
  return phases as Record<Phase, boolean>;
}

function getCurrentPhase(phases: Record<Phase, boolean>, order: Phase[]): Phase {
  for (const phase of order) {
    if (!phases[phase]) return phase;
  }
  return order[order.length - 1];
}

const SEC_TEAM_PHASES: Phase[] = ["discover", "prioritize", "remediate", "verify"];
const MEMBER_PHASES: Phase[] = ["discover", "assess", "remediate", "resolve"];

const SEC_TEAM_STEPS: { id: Phase; labelKey: string }[] = [
  { id: "discover", labelKey: "cveDetail.workflowDiscover" },
  { id: "prioritize", labelKey: "cveDetail.workflowPrioritize" },
  { id: "remediate", labelKey: "cveDetail.workflowRemediate" },
  { id: "verify", labelKey: "cveDetail.workflowVerify" },
];

const MEMBER_STEPS: { id: Phase; labelKey: string }[] = [
  { id: "discover", labelKey: "cveDetail.workflowDiscover" },
  { id: "assess", labelKey: "cveDetail.workflowAssess" },
  { id: "remediate", labelKey: "cveDetail.workflowRemediate" },
  { id: "resolve", labelKey: "cveDetail.workflowResolve" },
];

const SEC_TEAM_HINTS: Partial<Record<Phase, string>> = {
  discover: "cveDetail.hintPrioritize",
  prioritize: "cveDetail.hintPrioritize",
  remediate: "cveDetail.hintRemediate",
  verify: "cveDetail.hintVerify",
};

const MEMBER_HINTS: Partial<Record<Phase, string>> = {
  discover: "cveDetail.hintAssess",
  assess: "cveDetail.hintAssess",
  remediate: "cveDetail.hintRemediate",
  resolve: "cveDetail.hintResolve",
};

export function CveWorkflowStepper({ cve, remediations, isSecTeam }: CveWorkflowStepperProps) {
  const { t } = useTranslation();

  const activePhases = isSecTeam ? SEC_TEAM_PHASES : MEMBER_PHASES;
  const steps = isSecTeam ? SEC_TEAM_STEPS : MEMBER_STEPS;
  const hintKeys = isSecTeam ? SEC_TEAM_HINTS : MEMBER_HINTS;

  const phases = computePhases(cve, remediations, activePhases, !isSecTeam);
  const currentPhase = getCurrentPhase(phases, activePhases);
  const allComplete = activePhases.every((p) => phases[p]);

  const hintVariant = allComplete ? "success" : "info";
  const hintMessage = allComplete
    ? t("cveDetail.hintComplete")
    : t(hintKeys[currentPhase] ?? "cveDetail.hintRemediate");

  return (
    <Card>
      <CardTitle>{t("cveDetail.workflowStatus")}</CardTitle>
      <CardBody>
        <ProgressStepper aria-label={t("cveDetail.workflowStatus")}>
          {steps.map((step) => {
            const done = phases[step.id];
            const isCurrent = step.id === currentPhase;
            let variant: "success" | "info" | "pending";
            if (done) {
              variant = "success";
            } else if (isCurrent) {
              variant = "info";
            } else {
              variant = "pending";
            }
            return (
              <ProgressStep
                key={step.id}
                variant={variant}
                isCurrent={isCurrent && !allComplete}
                id={`workflow-${step.id}`}
                titleId={`workflow-${step.id}-title`}
              >
                {t(step.labelKey)}
              </ProgressStep>
            );
          })}
        </ProgressStepper>
        <Alert
          variant={hintVariant}
          isInline
          isPlain
          title={hintMessage}
          style={{ marginTop: 12 }}
        />
      </CardBody>
    </Card>
  );
}
