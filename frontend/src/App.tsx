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
  Spinner,
  Alert,
  PageSection,
  Tooltip,
  Button,
} from "@patternfly/react-core";
import { BarsIcon, MoonIcon, SunIcon } from "@patternfly/react-icons";
import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import { Escalations } from "./pages/Escalations";
import { Settings } from "./pages/Settings";
import { AuditLog } from "./pages/AuditLog";
import { Badges } from "./pages/Badges";
import { OnboardingModal } from "./components/OnboardingModal";

interface NavEntry {
  to: string;
  label: string;
}

const TEAM_NAV_ITEMS: NavEntry[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/schwachstellen", label: "Schwachstellen" },
  { to: "/risikoakzeptanzen", label: "Risikoakzeptanzen" },
  { to: "/prioritaeten", label: "Prioritäten" },
  { to: "/eskalationen", label: "Eskalationen" },
  { to: "/badges", label: "SVG-Badges" },
];

const SEC_NAV_ITEMS: NavEntry[] = [
  { to: "/einstellungen", label: "Einstellungen" },
  { to: "/audit-log", label: "Audit-Log" },
];

export function App() {
  const location = useLocation();
  const { user, isLoading, isSecTeam } = useAuth();
  const { scopeSearchString } = useScope();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("pf-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("pf-v6-theme-dark", isDark);
    localStorage.setItem("pf-theme", isDark ? "dark" : "light");
  }, [isDark]);

  if (isLoading) {
    return (
      <PageSection>
        <Spinner aria-label="Authentifizierung..." />
      </PageSection>
    );
  }

  if (!user) {
    return (
      <PageSection>
        <Alert
          variant="danger"
          title="Nicht authentifiziert. Bitte melden Sie sich an."
        />
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
            aria-label="Navigation ein-/ausblenden"
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
              viewBox="0 0 24 28"
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
              <Tooltip content="Sicherheitsteam-Rolle" position="bottom">
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
          <Button
            variant="plain"
            aria-label={isDark ? "Helles Design" : "Dunkles Design"}
            onClick={() => setIsDark((d) => !d)}
            style={{ color: "#e0e0e0" }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </Button>
          <NotificationBell />
        </div>
      </MastheadContent>
    </Masthead>
  );

  const sidebar = (
    <PageSidebar isSidebarOpen={sidebarOpen}>
      <PageSidebarBody>
        <ScopeSelector />
        <Nav aria-label="Navigation">
          <NavList>
            <NavGroup title="Allgemein">
              {TEAM_NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.to}
                  isActive={location.pathname.startsWith(item.to)}
                >
                  <Link to={scopedLink(item.to)}>{item.label}</Link>
                </NavItem>
              ))}
            </NavGroup>
            {isSecTeam && (
              <NavGroup title="Admin">
                {SEC_NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.to}
                    isActive={location.pathname.startsWith(item.to)}
                  >
                    <Link to={scopedLink(item.to)}>{item.label}</Link>
                  </NavItem>
                ))}
              </NavGroup>
            )}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  );

  return (
    <Page masthead={masthead} sidebar={sidebar} isManagedSidebar={false}>
      <OnboardingModal isOpen={!user.onboarding_completed} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/schwachstellen" element={<CveList />} />
        <Route path="/schwachstellen/:cveId" element={<CveDetail />} />
        <Route path="/risikoakzeptanzen" element={<RiskAcceptances />} />
        <Route
          path="/risikoakzeptanzen/:id"
          element={<RiskAcceptanceDetail />}
        />
        <Route path="/prioritaeten" element={<Priorities />} />
        <Route path="/eskalationen" element={<Escalations />} />
        <Route
          path="/einstellungen"
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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Page>
  );
}
