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
}

type Phase = "discover" | "prioritize" | "remediate" | "verify";

const TERMINAL_REMEDIATION_STATUSES = new Set<RemediationStatus>([
  RemediationStatus.resolved,
  RemediationStatus.verified,
  RemediationStatus.wont_fix,
]);

function computePhases(cve: CveDetail, remediations: RemediationItem[] | undefined) {
  const hasApprovedRa = cve.has_risk_acceptance && cve.risk_acceptance_status === RiskStatus.approved;

  const allRemediationsTerminal =
    remediations !== undefined &&
    remediations.length > 0 &&
    remediations.every((r) => TERMINAL_REMEDIATION_STATUSES.has(r.status));

  const allRemediationsVerified =
    remediations !== undefined &&
    remediations.length > 0 &&
    remediations.every((r) => r.status === RemediationStatus.verified);

  const phases: Record<Phase, boolean> = {
    discover: true,
    prioritize: cve.has_priority,
    remediate: hasApprovedRa || allRemediationsTerminal,
    verify: hasApprovedRa || allRemediationsVerified,
  };

  return phases;
}

function getCurrentPhase(phases: Record<Phase, boolean>): Phase {
  const order: Phase[] = ["discover", "prioritize", "remediate", "verify"];
  for (const phase of order) {
    if (!phases[phase]) return phase;
  }
  return "verify";
}

export function CveWorkflowStepper({ cve, remediations }: CveWorkflowStepperProps) {
  const { t } = useTranslation();

  const phases = computePhases(cve, remediations);
  const currentPhase = getCurrentPhase(phases);
  const allComplete = Object.values(phases).every(Boolean);

  const steps: { id: Phase; labelKey: string }[] = [
    { id: "discover", labelKey: "cveDetail.workflowDiscover" },
    { id: "prioritize", labelKey: "cveDetail.workflowPrioritize" },
    { id: "remediate", labelKey: "cveDetail.workflowRemediate" },
    { id: "verify", labelKey: "cveDetail.workflowVerify" },
  ];

  const hintKeys: Record<Phase, string> = {
    discover: "cveDetail.hintPrioritize",
    prioritize: "cveDetail.hintPrioritize",
    remediate: "cveDetail.hintRemediate",
    verify: "cveDetail.hintVerify",
  };

  const hintVariant = allComplete ? "success" : "info";
  const hintMessage = allComplete
    ? t("cveDetail.hintComplete")
    : t(hintKeys[currentPhase]);

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
