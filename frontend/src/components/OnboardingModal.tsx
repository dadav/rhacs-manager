import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import {
  BanIcon,
  BugIcon,
  ChartLineIcon,
  ClipboardCheckIcon,
  ExclamationTriangleIcon,
  ListIcon,
  OptimizeIcon,
  ShieldAltIcon,
} from "@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding, authKeys } from "../api/auth";
import type { ComponentType, SVGAttributes } from "react";

interface WorkflowStep {
  labelKey: string;
  color: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { labelKey: "onboarding.workflow.step1", color: "#0066cc" },
  { labelKey: "onboarding.workflow.step2", color: "#ec7a08" },
  { labelKey: "onboarding.workflow.step3", color: "#3e8635" },
  { labelKey: "onboarding.workflow.step4", color: "#6753ac" },
];

interface FeatureItem {
  icon: ComponentType<SVGAttributes<SVGElement>>;
  color: string;
  titleKey: string;
  descKey: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: ChartLineIcon,
    color: "#0066cc",
    titleKey: "onboarding.features.dashboard.title",
    descKey: "onboarding.features.dashboard.desc",
  },
  {
    icon: BugIcon,
    color: "#c9190b",
    titleKey: "onboarding.features.cves.title",
    descKey: "onboarding.features.cves.desc",
  },
  {
    icon: ShieldAltIcon,
    color: "#3e8635",
    titleKey: "onboarding.features.risk.title",
    descKey: "onboarding.features.risk.desc",
  },
  {
    icon: ExclamationTriangleIcon,
    color: "#f0ab00",
    titleKey: "onboarding.features.escalations.title",
    descKey: "onboarding.features.escalations.desc",
  },
  {
    icon: ClipboardCheckIcon,
    color: "#6753ac",
    titleKey: "onboarding.features.remediations.title",
    descKey: "onboarding.features.remediations.desc",
  },
  {
    icon: ListIcon,
    color: "#ec7a08",
    titleKey: "onboarding.features.priorities.title",
    descKey: "onboarding.features.priorities.desc",
  },
  {
    icon: BanIcon,
    color: "#8a8d90",
    titleKey: "onboarding.features.suppressions.title",
    descKey: "onboarding.features.suppressions.desc",
  },
  {
    icon: OptimizeIcon,
    color: "#009596",
    titleKey: "onboarding.features.badges.title",
    descKey: "onboarding.features.badges.desc",
  },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isFirstTime?: boolean;
  onDismiss?: () => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  isFirstTime = true,
  onDismiss,
}: OnboardingModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      onDismiss?.();
    },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    if (isFirstTime) {
      mutation.mutate();
    } else {
      onClose?.();
      onDismiss?.();
    }
  };

  return (
    <Modal
      isOpen
      onClose={handleClose}
      variant="medium"
      aria-label={t("onboarding.title")}
    >
      <ModalHeader title={t("onboarding.title")} />
      <ModalBody>
        <p
          style={{
            marginBottom: 24,
            fontSize: 14,
            color: "var(--pf-t--global--text--color--subtle)",
          }}
        >
          {t("onboarding.description")}
        </p>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 8 }}>
            {t("onboarding.workflow.title")}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.labelKey} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${step.color}18`, border: `2px solid ${step.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: step.color,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--pf-t--global--text--color--regular)', whiteSpace: 'nowrap' }}>
                    {t(step.labelKey)}
                  </span>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div style={{ width: 40, height: 2, background: 'var(--pf-t--global--border--color--default)', margin: '0 4px', marginBottom: 20 }} />
                )}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleKey}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 12,
                  borderRadius: 8,
                  border:
                    "1px solid var(--pf-t--global--border--color--default)",
                  background:
                    "var(--pf-t--global--background--color--secondary--default)",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${feature.color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    style={{ fontSize: 18, color: feature.color }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      marginBottom: 2,
                    }}
                  >
                    {t(feature.titleKey)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--pf-t--global--text--color--subtle)",
                      lineHeight: 1.4,
                    }}
                  >
                    {t(feature.descKey)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleClose}
          isLoading={isFirstTime && mutation.isPending}
          isDisabled={isFirstTime && mutation.isPending}
        >
          {t("onboarding.button")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
