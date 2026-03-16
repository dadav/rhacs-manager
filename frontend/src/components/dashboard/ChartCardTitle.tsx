import { Button, CardTitle, Popover } from "@patternfly/react-core";
import { OutlinedQuestionCircleIcon } from "@patternfly/react-icons";
import { useTranslation } from "react-i18next";

interface ChartCardTitleProps {
  title: string;
  helpKey: string;
  children?: React.ReactNode;
}

export function ChartCardTitle({
  title,
  helpKey,
  children,
}: ChartCardTitleProps) {
  const { t } = useTranslation();
  return (
    <CardTitle>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {title}
          <Popover bodyContent={t(helpKey)} position="top">
            <Button
              variant="plain"
              aria-label={t("app.showHelp")}
              style={{ padding: "2px 4px" }}
            >
              <OutlinedQuestionCircleIcon
                style={{
                  color: "var(--pf-t--global--text--color--subtle)",
                  fontSize: 14,
                }}
              />
            </Button>
          </Popover>
        </span>
        {children}
      </div>
    </CardTitle>
  );
}
