import {
  Nav,
  NavGroup,
  NavItem,
  NavList,
  Page,
  PageSidebar,
  PageSidebarBody,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  MastheadToggle,
  PageToggleButton,
  SkipToContent,
  Spinner,
  PageSection,
  Tooltip,
  Button,
  EmptyState,
  EmptyStateBody,
} from "@patternfly/react-core";
import { BarsIcon, GithubIcon, GlobeIcon, MoonIcon, OutlinedQuestionCircleIcon, SunIcon } from "@patternfly/react-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "./hooks/useAuth";
import { useScope, buildScopedTo } from "./hooks/useScope";
import { NotificationBell } from "./components/notifications/NotificationBell";
import { ScopeSelector } from "./components/scope/ScopeSelector";
import { Dashboard } from "./pages/Dashboard";
import { CveList } from "./pages/CveList";
import { CveDetail } from "./pages/CveDetail";
import { RiskAcceptances } from "./pages/RiskAcceptances";
import { RiskAcceptanceDetail } from "./pages/RiskAcceptanceDetail";
import { Priorities } from "./pages/Priorities";
import { PriorityDetail } from "./pages/PriorityDetail";
import { Escalations } from "./pages/Escalations";
import { Settings } from "./pages/Settings";
import { AuditLog } from "./pages/AuditLog";
import { Badges } from "./pages/Badges";
import { Remediations } from "./pages/Remediations";
import { SuppressionRules } from "./pages/SuppressionRules";
import { ImageDetail } from "./pages/ImageDetail";
import { OnboardingModal } from "./components/OnboardingModal";
import { GuidedTour } from "./components/GuidedTour";
import { ErrorBoundary } from "./components/ErrorBoundary";

interface NavEntry {
  to: string;
  labelKey: string;
}

const TEAM_NAV_ITEMS: NavEntry[] = [
  { to: "/dashboard", labelKey: "nav.dashboard" },
  { to: "/vulnerabilities", labelKey: "nav.cves" },
  { to: "/remediations", labelKey: "nav.remediations" },
  { to: "/risk-acceptances", labelKey: "nav.riskAcceptances" },
  { to: "/priorities", labelKey: "nav.priorities" },
  { to: "/escalations", labelKey: "nav.escalations" },
  { to: "/badges", labelKey: "nav.badges" },
  { to: "/suppression-rules", labelKey: "nav.suppressionRules" },
];

const SEC_NAV_ITEMS: NavEntry[] = [
  { to: "/settings", labelKey: "nav.settings" },
  { to: "/audit-log", labelKey: "nav.auditLog" },
];

export function App() {
  const location = useLocation();
  const { user, isLoading, isSecTeam } = useAuth();
  const { scopeSearchString } = useScope();
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("pf-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("pf-v6-theme-dark", isDark);
    localStorage.setItem("pf-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleLanguage = () => {
    const next = i18n.language === "de" ? "en" : "de";
    i18n.changeLanguage(next);
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 16 }}>
        <Spinner size="xl" aria-label={t("app.authenticating")} />
        <span style={{ fontSize: 14, color: "var(--pf-t--global--text--color--subtle)" }}>
          {t("app.authenticating")}
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <PageSection>
        <EmptyState
          headingLevel="h2"
          titleText={t("app.notAuthenticated")}
          variant="lg"
          status="danger"
        >
          <EmptyStateBody>
            {t("app.notAuthenticated")}
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  const scopedLink = (to: string) => buildScopedTo(to, scopeSearchString);

  const masthead = (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton
            variant="plain"
            aria-label={t("app.toggleNav")}
            isSidebarOpen={sidebarOpen}
            onSidebarToggle={() => setSidebarOpen((o) => !o)}
          >
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <Link
            to={scopedLink("/dashboard")}
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* OCP-style product icon: red shield shape */}
            <svg
              width="24"
              height="28"
              viewBox="0 0 24 32"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 0L0 5v10c0 7.5 5.1 14.5 12 16.5C18.9 29.5 24 22.5 24 15V5L12 0z"
                fill="#ee0000"
              />
              <path
                d="M7 14l3 3 7-7"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: "-0.01em",
              }}
            >
              RHACS CVE Manager
            </span>
          </Link>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 16,
            paddingRight: 16,
          }}
        >
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
            {user.username}
            {isSecTeam && (
              <Tooltip content={t("app.secTeamRole")} position="bottom">
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    background: "#ee0000",
                    color: "#fff",
                    padding: "1px 6px",
                    borderRadius: 3,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    cursor: "default",
                  }}
                >
                  SEC
                </span>
              </Tooltip>
            )}
          </span>
          <Tooltip content={t("app.switchLanguage")} position="bottom">
            <Button
              variant="plain"
              aria-label={t("app.switchLanguage")}
              onClick={toggleLanguage}
              style={{ color: "#e0e0e0", fontWeight: 600, fontSize: 13 }}
            >
              <GlobeIcon style={{ marginRight: 4 }} />
              {i18n.language === "de" ? "DE" : "EN"}
            </Button>
          </Tooltip>
          <Button
            variant="plain"
            aria-label={isDark ? t("app.lightTheme") : t("app.darkTheme")}
            onClick={() => setIsDark((d) => !d)}
            style={{ color: "#e0e0e0" }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </Button>
          <Tooltip content={t("app.showHelp")} position="bottom">
            <Button
              variant="plain"
              aria-label={t("app.showHelp")}
              onClick={() => setRunTour(true)}
              data-tour="help-button"
              style={{ color: "#e0e0e0" }}
            >
              <OutlinedQuestionCircleIcon />
            </Button>
          </Tooltip>
          <NotificationBell />
        </div>
      </MastheadContent>
    </Masthead>
  );

  const sidebar = (
    <PageSidebar isSidebarOpen={sidebarOpen}>
      <PageSidebarBody>
        <div data-tour="scope-selector">
          <ScopeSelector />
        </div>
        <Nav aria-label="Navigation" data-tour="sidebar-nav">
          <NavList>
            <NavGroup title={t("nav.general")}>
              {TEAM_NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.to}
                    isActive={location.pathname.startsWith(item.to)}
                  >
                    <Link to={scopedLink(item.to)} data-tour={`nav-${item.to.slice(1)}`}>{t(item.labelKey)}</Link>
                  </NavItem>
                ))}
            </NavGroup>
            {isSecTeam && (
              <NavGroup title={t("nav.admin")}>
                {SEC_NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.to}
                    isActive={location.pathname.startsWith(item.to)}
                  >
                    <Link to={scopedLink(item.to)} data-tour={`nav-${item.to.slice(1)}`}>{t(item.labelKey)}</Link>
                  </NavItem>
                ))}
              </NavGroup>
            )}
          </NavList>
        </Nav>
      </PageSidebarBody>
      <PageSidebarBody>
        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--pf-t--global--border--color--default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          <span>v{__APP_VERSION__}</span>
          <a
            href="https://github.com/dadav/rhacs-manager"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            style={{ color: "inherit", display: "flex", alignItems: "center" }}
          >
            <GithubIcon style={{ fontSize: 20 }} />
          </a>
        </div>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page
      masthead={masthead}
      sidebar={sidebar}
      isManagedSidebar={false}
      skipToContent={<SkipToContent href="#main-content">Skip to content</SkipToContent>}
      mainContainerId="main-content"
    >
      <OnboardingModal
        isOpen={!user.onboarding_completed}
        isFirstTime
        onDismiss={() => setRunTour(true)}
      />
      <GuidedTour run={runTour} onComplete={() => setRunTour(false)} isSecTeam={isSecTeam} />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vulnerabilities" element={<CveList />} />
          <Route path="/vulnerabilities/:cveId" element={<CveDetail />} />
          <Route path="/images/:imageId" element={<ImageDetail />} />
          <Route path="/remediations" element={<Remediations />} />
          <Route path="/risk-acceptances" element={<RiskAcceptances />} />
          <Route
            path="/risk-acceptances/:id"
            element={<RiskAcceptanceDetail />}
          />
          <Route path="/priorities" element={<Priorities />} />
          <Route path="/priorities/:id" element={<PriorityDetail />} />
          <Route path="/escalations" element={<Escalations />} />
          <Route
            path="/settings"
            element={
              isSecTeam ? <Settings /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/audit-log"
            element={
              isSecTeam ? <AuditLog /> : <Navigate to="/dashboard" replace />
            }
          />
          <Route path="/badges" element={<Badges />} />
          <Route path="/suppression-rules" element={<SuppressionRules />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </Page>
  );
}
