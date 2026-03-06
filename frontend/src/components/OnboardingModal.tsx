import {
  Button,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeOnboarding, authKeys } from "../api/auth";

interface OnboardingModalProps {
  isOpen: boolean;
}

export function OnboardingModal({ isOpen }: OnboardingModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });

  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      onClose={() => mutation.mutate()}
      variant="medium"
      aria-label={t("onboarding.title")}
    >
      <ModalHeader title={t("onboarding.title")} />
      <ModalBody>
        <p style={{ marginBottom: 16 }}>{t("onboarding.description")}</p>
        <List>
          <ListItem>{t("onboarding.featureDashboard")}</ListItem>
          <ListItem>{t("onboarding.featureCves")}</ListItem>
          <ListItem>{t("onboarding.featureRisk")}</ListItem>
          <ListItem>{t("onboarding.featureEscalations")}</ListItem>
          <ListItem>{t("onboarding.featureBadges")}</ListItem>
        </List>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => mutation.mutate()}
          isLoading={mutation.isPending}
          isDisabled={mutation.isPending}
        >
          {t("onboarding.button")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
