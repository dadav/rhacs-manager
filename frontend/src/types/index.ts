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
  remediation_created = 'remediation_created',
  remediation_status = 'remediation_status',
  remediation_overdue = 'remediation_overdue',
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
  published_on: string | null
  operating_system?: string | null
  has_priority: boolean
  priority_level: PriorityLevel | null
  priority_deadline: string | null
  component_names: string[]
  has_risk_acceptance: boolean
  risk_acceptance_status: RiskStatus | null
  risk_acceptance_id: string | null
  is_suppressed: boolean
  suppression_requested: boolean
}

export enum SuppressionStatus {
  requested = 'requested',
  approved = 'approved',
  rejected = 'rejected',
}

export type SuppressionType = 'component' | 'cve'

export type SuppressionScopeMode = 'all' | 'namespace'

export interface SuppressionScopeTarget {
  cluster_name: string
  namespace: string
}

export interface SuppressionScope {
  mode: SuppressionScopeMode
  targets: SuppressionScopeTarget[]
}

export interface SuppressionRule {
  id: string
  status: SuppressionStatus
  type: SuppressionType
  component_name: string | null
  version_pattern: string | null
  cve_id: string | null
  reason: string
  reference_url: string | null
  review_comment: string | null
  created_at: string
  created_by: string
  created_by_name: string
  reviewed_by: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
  matched_cve_count: number
  scope: SuppressionScope | null
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
  contact_emails: string[]
  priority_reason: string | null
  priority_set_by_name: string | null
  priority_created_at: string | null
  risk_acceptance_requested_at: string | null
  risk_acceptance_reviewed_at: string | null
  escalation_level1_at: string | null
  escalation_level2_at: string | null
  escalation_level3_at: string | null
  escalation_level1_expected: string | null
  escalation_level2_expected: string | null
  escalation_level3_expected: string | null
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

export interface UserNamespace {
  namespace: string
  cluster_name: string
}

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  is_sec_team: boolean
  onboarding_completed: boolean
  namespaces: UserNamespace[]
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
  escalation_warning_days: number
  digest_day: number
  management_email: string
  updated_by: string | null
  updated_at: string
}

export interface BadgeToken {
  id: string
  created_by: string
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
  critical: number
  important: number
  moderate: number
  low: number
  unknown: number
  cluster_count: number
}

export interface CveTrendPoint {
  date: string
  count: number
}

export interface DashboardData {
  stat_total_cves: number
  stat_escalations: number
  stat_upcoming_escalations: number
  stat_fixable_critical_cves: number
  stat_open_risk_acceptances: number
  severity_distribution: SeverityCount[]
  cves_per_namespace: NamespaceCveCount[]
  priority_cves: CveListItem[]
  high_epss_cves: CveListItem[]
  cve_trend: CveTrendPoint[]
  epss_matrix: EpssMatrixPoint[]
  cluster_heatmap: ClusterHeatmapRow[]
  aging_distribution: AgingBucket[]
  top_vulnerable_components: ComponentCveCount[]
  risk_acceptance_pipeline: RiskAcceptancePipeline
  fixability_breakdown: FixabilityCount
  fixable_trend: FixableTrendPoint[]
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

export interface AgingBucket {
  bucket: string
  count: number
}

export interface ComponentCveCount {
  component_name: string
  cve_count: number
  fixable_count: number
  unfixable_count: number
}

export interface RiskAcceptancePipeline {
  requested: number
  approved: number
  rejected: number
  expired: number
}

export interface FixabilityCount {
  fixable: number
  unfixable: number
}

export interface FixableTrendPoint {
  date: string
  fixable: number
  unfixable: number
}

export interface ThresholdInfo {
  min_cvss_score: number
  min_epss_score: number
}

export interface ThresholdPreview {
  total_cves: number
  visible_cves: number
  hidden_cves: number
}


export interface Escalation {
  id: string
  cve_id: string
  namespace: string
  cluster_name: string
  level: number
  triggered_at: string
  notified: boolean
}

export interface UpcomingEscalation {
  cve_id: string
  severity: number
  epss_probability: number
  current_age_days: number
  next_level: number
  days_until_escalation: number
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

export enum RemediationStatus {
  open = 'open',
  in_progress = 'in_progress',
  resolved = 'resolved',
  verified = 'verified',
  wont_fix = 'wont_fix',
}

export interface RemediationItem {
  id: string
  cve_id: string
  namespace: string
  cluster_name: string
  status: RemediationStatus
  assigned_to: string | null
  assigned_to_name: string | null
  created_by: string
  created_by_name: string
  resolved_by: string | null
  resolved_by_name: string | null
  target_date: string | null
  notes: string | null
  resolved_at: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  is_overdue: boolean
}

export interface RemediationStats {
  open: number
  in_progress: number
  resolved: number
  verified: number
  wont_fix: number
  overdue: number
}

export interface ImageCveGroup {
  image_name: string
  image_id: string
  total_cves: number
  critical_cves: number
  high_cves: number
  medium_cves: number
  low_cves: number
  max_cvss: number
  max_epss: number
  fixable_cves: number
  affected_deployments: number
  namespaces: string[]
  clusters: string[]
}

export interface ImageCveDetail {
  cve_id: string
  severity: Severity
  cvss: number
  epss_probability: number
  impact_score: number
  fixable: boolean
  fixed_by: string | null
  affected_deployments: number
  first_seen: string | null
  published_on: string | null
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
