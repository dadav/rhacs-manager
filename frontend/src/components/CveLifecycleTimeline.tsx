import { ProgressStep, ProgressStepper } from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import { CveDetail, RiskStatus } from "../types";

export function CveLifecycleTimeline({ cve }: { cve: CveDetail }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'de' ? 'de-DE' : 'en-US';
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale) : undefined;

  type Step = { id: string; label: string; date: string | null; done: boolean };

  const steps: Step[] = [
    {
      id: "published",
      label: t('cveDetail.published'),
      date: cve.published_on,
      done: !!cve.published_on,
    },
    {
      id: "discovered",
      label: t('cveDetail.discovered'),
      date: cve.first_seen,
      done: !!cve.first_seen,
    },
  ];

  steps.push(
    {
      id: "esc-1",
      label: t('cveDetail.escalationLevel', { level: 1 }),
      date: cve.escalation_level1_at ?? cve.escalation_level1_expected,
      done: !!cve.escalation_level1_at,
    },
    {
      id: "esc-2",
      label: t('cveDetail.escalationLevel', { level: 2 }),
      date: cve.escalation_level2_at ?? cve.escalation_level2_expected,
      done: !!cve.escalation_level2_at,
    },
    {
      id: "esc-3",
      label: t('cveDetail.escalationLevel', { level: 3 }),
      date: cve.escalation_level3_at ?? cve.escalation_level3_expected,
      done: !!cve.escalation_level3_at,
    },
  );

  if (cve.has_priority) {
    steps.push({
      id: "prioritized",
      label: t('cveDetail.prioritized'),
      date: cve.priority_created_at,
      done: true,
    });
  }
  if (cve.has_risk_acceptance) {
    steps.push({
      id: "ra-requested",
      label: t('cveDetail.riskRequested'),
      date: cve.risk_acceptance_requested_at,
      done: true,
    });
  }
  if (cve.risk_acceptance_reviewed_at) {
    const reviewLabel =
      cve.risk_acceptance_status === RiskStatus.approved
        ? t('cveDetail.riskApproved')
        : cve.risk_acceptance_status === RiskStatus.rejected
          ? t('cveDetail.riskRejected')
          : t('cveDetail.riskReviewed');
    steps.push({
      id: "ra-reviewed",
      label: reviewLabel,
      date: cve.risk_acceptance_reviewed_at,
      done: true,
    });
  }

  const fixed = steps.slice(0, 5); // published, discovered, esc-1, esc-2, esc-3
  const sortable = steps.slice(5);
  sortable.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const sorted = [...fixed, ...sortable];

  const currentIdx = sorted.findIndex((s) => !s.done);
  const lastDoneIdx = currentIdx === -1 ? sorted.length - 1 : currentIdx;

  return (
    <ProgressStepper aria-label={t('cveDetail.lifecycle')}>
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
