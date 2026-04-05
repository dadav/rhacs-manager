import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import {
  ArrowRightIcon,
} from "@patternfly/react-icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding, authKeys } from "../api/auth";

interface TaskStep {
  labelKey: string;
  descKey: string;
  color: string;
}

const TASK_STEPS: TaskStep[] = [
  { labelKey: "onboarding.tasks.scope.title", descKey: "onboarding.tasks.scope.desc", color: "#0066cc" },
  { labelKey: "onboarding.tasks.dashboard.title", descKey: "onboarding.tasks.dashboard.desc", color: "#3e8635" },
  { labelKey: "onboarding.tasks.cve.title", descKey: "onboarding.tasks.cve.desc", color: "#ec7a08" },
  { labelKey: "onboarding.tasks.action.title", descKey: "onboarding.tasks.action.desc", color: "#6753ac" },
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
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--pf-t--global--text--color--subtle)', marginBottom: 12 }}>
          {t("onboarding.tasks.heading")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TASK_STEPS.map((step, i) => (
            <div
              key={step.labelKey}
              style={{
                display: "flex",
                gap: 12,
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--pf-t--global--border--color--default)",
                background: "var(--pf-t--global--background--color--secondary--default)",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `${step.color}18`,
                  border: `2px solid ${step.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: step.color,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                  {t(step.labelKey)}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--pf-t--global--text--color--subtle)",
                    lineHeight: 1.4,
                  }}
                >
                  {t(step.descKey)}
                </div>
              </div>
              <ArrowRightIcon style={{ flexShrink: 0, color: step.color, marginTop: 8 }} />
            </div>
          ))}
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
