import {
  Nav,
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
} from '@patternfly/react-core'
import { BarsIcon } from '@patternfly/react-icons'
import { useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './hooks/useAuth'
import { NotificationBell } from './components/notifications/NotificationBell'
import { Dashboard } from './pages/Dashboard'
import { SecDashboard } from './pages/SecDashboard'
import { CveList } from './pages/CveList'
import { CveDetail } from './pages/CveDetail'
import { RiskAcceptances } from './pages/RiskAcceptances'
import { RiskAcceptanceDetail } from './pages/RiskAcceptanceDetail'
import { Priorities } from './pages/Priorities'
import { Escalations } from './pages/Escalations'
import { Settings } from './pages/Settings'
import { TeamAdmin } from './pages/TeamAdmin'
import { AuditLog } from './pages/AuditLog'
import { Badges } from './pages/Badges'

interface NavEntry {
  to: string
  label: string
  secOnly?: boolean
}

const NAV_ITEMS: NavEntry[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/sec-dashboard', label: 'Sicherheits-Dashboard', secOnly: true },
  { to: '/schwachstellen', label: 'Schwachstellen' },
  { to: '/risikoakzeptanzen', label: 'Risikoakzeptanzen' },
  { to: '/prioritaeten', label: 'Prioritäten' },
  { to: '/eskalationen', label: 'Eskalationen', secOnly: true },
  { to: '/einstellungen', label: 'Einstellungen', secOnly: true },
  { to: '/teams', label: 'Teams', secOnly: true },
  { to: '/audit-log', label: 'Audit-Log', secOnly: true },
  { to: '/badges', label: 'SVG-Badges' },
]

export function App() {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, isLoading, isSecTeam } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (isLoading) {
    return (
      <PageSection>
        <Spinner aria-label="Authentifizierung..." />
      </PageSection>
    )
  }

  if (!user) {
    return (
      <PageSection>
        <Alert variant="danger" title="Nicht authentifiziert. Bitte melden Sie sich an." />
      </PageSection>
    )
  }

  const visibleNav = NAV_ITEMS.filter(item => !item.secOnly || isSecTeam)

  const masthead = (
    <Masthead>
      <MastheadMain>
        <MastheadToggle>
          <PageToggleButton
            variant="plain"
            aria-label="Navigation ein-/ausblenden"
            isSidebarOpen={sidebarOpen}
            onSidebarToggle={() => setSidebarOpen(o => !o)}
          >
            <BarsIcon />
          </PageToggleButton>
        </MastheadToggle>
        <MastheadBrand>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: 16 }}>
            RHACS CVE Manager
          </Link>
        </MastheadBrand>
      </MastheadMain>
      <MastheadContent>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, paddingRight: 16 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            {user.username}
            {isSecTeam && (
              <span style={{ marginLeft: 6, fontSize: 10, background: '#ec7a08', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>
                SEC
              </span>
            )}
          </span>
          <NotificationBell />
        </div>
      </MastheadContent>
    </Masthead>
  )

  const sidebar = (
    <PageSidebar isSidebarOpen={sidebarOpen}>
      <PageSidebarBody>
        <Nav aria-label="Navigation">
          <NavList>
            {visibleNav.map(item => (
              <NavItem key={item.to} isActive={location.pathname.startsWith(item.to)}>
                <Link to={item.to} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {item.label}
                </Link>
              </NavItem>
            ))}
          </NavList>
        </Nav>
      </PageSidebarBody>
    </PageSidebar>
  )

  return (
    <Page masthead={masthead} sidebar={sidebar} isManagedSidebar={false}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sec-dashboard" element={isSecTeam ? <SecDashboard /> : <Navigate to="/dashboard" replace />} />
        <Route path="/schwachstellen" element={<CveList />} />
        <Route path="/schwachstellen/:cveId" element={<CveDetail />} />
        <Route path="/risikoakzeptanzen" element={<RiskAcceptances />} />
        <Route path="/risikoakzeptanzen/:id" element={<RiskAcceptanceDetail />} />
        <Route path="/prioritaeten" element={<Priorities />} />
        <Route path="/eskalationen" element={isSecTeam ? <Escalations /> : <Navigate to="/dashboard" replace />} />
        <Route path="/einstellungen" element={isSecTeam ? <Settings /> : <Navigate to="/dashboard" replace />} />
        <Route path="/teams" element={isSecTeam ? <TeamAdmin /> : <Navigate to="/dashboard" replace />} />
        <Route path="/audit-log" element={isSecTeam ? <AuditLog /> : <Navigate to="/dashboard" replace />} />
        <Route path="/badges" element={<Badges />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Page>
  )
}
