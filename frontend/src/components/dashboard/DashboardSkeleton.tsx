import { Grid, GridItem, PageSection, Title } from "@patternfly/react-core";
import { Skeleton } from "@patternfly/react-core";
import { useTranslation } from "react-i18next";

export function DashboardSkeleton() {
  const { t } = useTranslation();

  return (
    <>
      <PageSection variant="default">
        <Title headingLevel="h1" size="xl">
          {t("dashboard.title")}
        </Title>
      </PageSection>
      <PageSection>
        <Grid hasGutter>
          {[0, 1, 2, 3].map((i) => (
            <GridItem span={3} key={i}>
              <Skeleton className="skeleton-card" />
            </GridItem>
          ))}
          <GridItem span={6}>
            <Skeleton className="skeleton-chart" />
          </GridItem>
          <GridItem span={6}>
            <Skeleton className="skeleton-chart" />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );
}
