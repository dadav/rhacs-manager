import Joyride, { STATUS, type CallBackProps, type Step } from "react-joyride";
import { useTranslation } from "react-i18next";

interface GuidedTourProps {
  run: boolean;
  onComplete: () => void;
  isSecTeam?: boolean;
}

export function GuidedTour({ run, onComplete, isSecTeam }: GuidedTourProps) {
  const { t, i18n } = useTranslation();

  const steps: Step[] = [
    {
      target: '[data-tour="sidebar-nav"]',
      content: t("tour.sidebarNav"),
      placement: "right",
      disableBeacon: true,
    },
    {
      target: '[data-tour="scope-selector"]',
      content: t("tour.scopeSelector"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-dashboard"]',
      content: t("tour.navDashboard"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-vulnerabilities"]',
      content: t("tour.navCves"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-remediations"]',
      content: t("tour.navRemediations"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-risk-acceptances"]',
      content: t("tour.navRiskAcceptances"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-priorities"]',
      content: t("tour.navPriorities"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-escalations"]',
      content: t("tour.navEscalations"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-badges"]',
      content: t("tour.navBadges"),
      placement: "right",
    },
    {
      target: '[data-tour="nav-suppression-rules"]',
      content: t("tour.navSuppressionRules"),
      placement: "right",
    },
    ...(isSecTeam
      ? [
          {
            target: '[data-tour="nav-settings"]',
            content: t("tour.navSettings"),
            placement: "right" as const,
          },
          {
            target: '[data-tour="nav-audit-log"]',
            content: t("tour.navAuditLog"),
            placement: "right" as const,
          },
        ]
      : []),
    {
      target: '[data-tour="help-button"]',
      content: t("tour.helpButton"),
      placement: "bottom",
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
    }
  };

  return (
    <Joyride
      key={i18n.language}
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      callback={handleCallback}
      locale={{
        back: t("tour.back"),
        close: t("tour.close"),
        last: t("tour.close"),
        next: t("tour.next"),
        nextLabelWithProgress: t("tour.nextWithProgress"),
        skip: t("tour.skip"),
      }}
      styles={{
        options: {
          primaryColor: "#0066cc",
          zIndex: 10000,
        },
        tooltipContent: {
          fontSize: 14,
          padding: "12px 16px",
        },
        buttonNext: {
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 4,
        },
        buttonBack: {
          fontSize: 13,
          color: "#6a6e73",
        },
        buttonSkip: {
          fontSize: 13,
          color: "#6a6e73",
        },
      }}
    />
  );
}
