import { Label, Tooltip } from "@patternfly/react-core";
import { EyeIcon } from "@patternfly/react-icons";
import { useTranslation } from "react-i18next";

interface ViewerIndicatorProps {
  viewers: { user_id: string; username: string }[];
}

export function ViewerIndicator({ viewers }: ViewerIndicatorProps) {
  const { t } = useTranslation();

  if (viewers.length === 0) return null;

  const names = viewers.map((v) => v.username).join(", ");

  return (
    <Tooltip content={t("presence.tooltip", { users: names })}>
      <Label color="blue" icon={<EyeIcon />}>
        {viewers.length === 1
          ? t("presence.viewing_one", { user: viewers[0].username })
          : t("presence.viewing_many", { count: viewers.length })}
      </Label>
    </Tooltip>
  );
}
