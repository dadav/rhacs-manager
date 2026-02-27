export enum Severity {
  UNKNOWN = 0,
  LOW = 1,
  MODERATE = 2,
  IMPORTANT = 3,
  CRITICAL = 4,
}

export enum RiskStatus {
  requested = 'requested',
  approved = 'approved',
  rejected = 'rejected',
  expired = 'expired',
}

export enum PriorityLevel {
  critical = 'critical',
  high = 'high',
  medium = 'medium',
  low = 'low',
}

export enum NotificationType {
  risk_comment = 'risk_comment',
  risk_approved = 'risk_approved',
  risk_rejected = 'risk_rejected',
  risk_expiring = 'risk_expiring',
  new_priority = 'new_priority',
  escalation = 'escalation',
  new_critical_cve = 'new_critical_cve',
}

export enum UserRole {
  team_member = 'team_member',
  sec_team = 'sec_team',
}

export interface CveListItem {
  cve_id: string
  severity: Severity
  cvss: number
  epss_probability: number
  impact_score: number
  fixable: boolean
  fixed_by: string | null
  affected_images: number
  affected_deployments: number
  first_seen: string | null
  operating_system?: string | null
  has_priority: boolean
  priority_level: PriorityLevel | null
  priority_deadline: string | null
  has_risk_acceptance: boolean
  risk_acceptance_status: RiskStatus | null
  risk_acceptance_id: string | null
}

export interface AffectedDeployment {
  deployment_id: string
  deployment_name: string
  namespace: string
  cluster_name: string
  image_name: string
}

export interface AffectedComponent {
  component_name: string
  component_version: string
  fixable: boolean
  fixed_by: string | null
}

export interface CveDetail extends CveListItem {
  affected_deployments_list: AffectedDeployment[]
  components: AffectedComponent[]
}

export interface CveComment {
  id: string
  cve_id: string
  user_id: string
  username: string
  message: string
  created_at: string
  is_sec_team: boolean
}

export interface RiskAcceptance {
  id: string
  cve_id: string
  team_id: string
  team_name: string
  status: RiskStatus
  justification: string
  scope: RiskScope
  expires_at: string | null
  created_at: string
  created_by: string
  created_by_name: string
  reviewed_by: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  comment_count: number
}

export type RiskScopeMode = 'all' | 'namespace' | 'image' | 'deployment'

export interface RiskScopeTarget {
  cluster_name: string
  namespace: string
  image_name?: string | null
  deployment_id?: string | null
}

export interface RiskScope {
  mode: RiskScopeMode
  targets: RiskScopeTarget[]
}

export interface RiskComment {
  id: string
  risk_acceptance_id: string
  user_id: string
  username: string
  message: string
  created_at: string
  is_sec_team: boolean
}

export interface CvePriority {
  id: string
  cve_id: string
  priority: PriorityLevel
  reason: string
  set_by: string
  set_by_name: string
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  read: boolean
  created_at: string
}

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  team_id: string | null
  is_sec_team: boolean
}

export interface TeamNamespace {
  id: string
  team_id: string
  namespace: string
  cluster_name: string
}

export interface Team {
  id: string
  name: string
  email: string
  created_at: string
  namespaces: TeamNamespace[]
}

export interface EscalationRule {
  severity_min: number
  epss_threshold: number
  days_to_level1: number
  days_to_level2: number
  days_to_level3: number
}

export interface GlobalSettings {
  id: string
  min_cvss_score: number
  min_epss_score: number
  escalation_rules: EscalationRule[]
  digest_day: number
  management_email: string
  updated_by: string | null
  updated_at: string
}

export interface BadgeToken {
  id: string
  team_id: string
  namespace: string | null
  cluster_name: string | null
  token: string
  label: string
  created_at: string
  badge_url: string
}

export interface SeverityCount {
  severity: Severity
  count: number
}

export interface NamespaceCveCount {
  namespace: string
  count: number
}

export interface CveTrendPoint {
  date: string
  count: number
}

export interface TeamDashboardData {
  stat_total_cves: number
  stat_critical_cves: number
  stat_fixable_cves: number
  stat_open_risk_acceptances: number
  stat_overdue_deadlines: number
  stat_avg_epss: number
  severity_distribution: SeverityCount[]
  cves_per_namespace: NamespaceCveCount[]
  priority_cves: CveListItem[]
  high_epss_cves: CveListItem[]
  cve_trend: CveTrendPoint[]
}

export interface EpssMatrixPoint {
  cve_id: string
  cvss: number
  epss: number
  severity: Severity
}

export interface ClusterHeatmapRow {
  cluster: string
  unknown: number
  low: number
  moderate: number
  important: number
  critical: number
  total: number
}

export interface TeamHealthScore {
  team_id: string
  team_name: string
  total_cves: number
  critical_cves: number
  avg_epss: number
  overdue_items: number
  open_risk_acceptances: number
  risk_score: number
}

export interface FixabilityByTeam {
  team_name: string
  fixable: number
  unfixable: number
}

export interface AgingBucket {
  bucket: string
  count: number
}

export interface RiskAcceptancePipeline {
  requested: number
  approved: number
  rejected: number
  expired: number
}

export interface ThresholdPreview {
  total_cves: number
  visible_cves: number
  hidden_cves: number
}

export interface SecDashboardData {
  epss_matrix: EpssMatrixPoint[]
  cluster_heatmap: ClusterHeatmapRow[]
  team_scoreboard: TeamHealthScore[]
  fixability_by_team: FixabilityByTeam[]
  aging_distribution: AgingBucket[]
  risk_acceptance_pipeline: RiskAcceptancePipeline
  total_cves: number
  total_critical: number
  avg_epss: number
  total_teams: number
  cves_last_7_days: number
  threshold_preview: ThresholdPreview
}

export interface Escalation {
  id: string
  cve_id: string
  team_id: string
  team_name: string
  level: number
  triggered_at: string
  notified: boolean
}

export interface AuditEntry {
  id: string
  user_id: string | null
  username: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown>
  created_at: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface Namespace {
  namespace: string
  cluster_name: string
}
