export type EntityType = 'HOLDING' | 'DIVISION'
export type UserRole = 'CEO' | 'HEAD' | 'FINANCE' | 'DESIGN' | 'STAFF'
export type TransactionType = 'INCOME' | 'EXPENSE'
export type BillingStatus = 'PENDING' | 'APPROVED'
export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
export type InvoiceStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'SENT'
export type LogStatus = 'SUBMITTED' | 'REVIEWED_BY_CEO' | 'NEEDS_ACTION'
export type WorkspaceType = 'GENERAL' | 'WEATSO' | 'LOKAL' | 'EVORY' | 'COLABZ' | 'LADDIFY'
export type SalesKitCategory = 'portfolio' | 'pricelist_public' | 'pricelist_internal' | 'brand_asset'

export interface Entity {
  id: string
  name: string
  type: EntityType
  logo_key: string | null
  primary_color: string | null
}

export interface Profile {
  id: string
  entity_id: string
  full_name: string
  avatar_url?: string | null
  roles: UserRole[] // <-- INI YANG MENGHILANGKAN ERROR ANDA
  created_at: string
  entity?: Entity
}

export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE'

export interface ChartOfAccount {
  id: string
  account_class: AccountClass
  account_code: string
  account_name: string
  is_bank: boolean
  is_active: boolean
  created_at: string
}

export interface DivisionFinancialSetting {
  entity_id: string
  monthly_auto_approve_limit: number
  current_month_usage: number
  last_reset_month: string
  updated_at: string
  entity?: Entity
}

export interface JournalEntry {
  id: string
  transaction_date: string
  reference_number: string
  description: string
  entity_id: string
  proof_storage_key: string | null
  status: ApprovalStatus
  created_by: string | null
  approved_by: string | null
  created_at: string
  entity?: Entity
  creator?: Profile
  approver?: Profile
  lines?: JournalLine[]
}

export interface JournalLine {
  id: string
  journal_id: string
  account_id: string
  debit: number
  credit: number
  created_at: string
  account?: ChartOfAccount
}

export interface Stakeholder {
  id: string
  name: string
  type: 'OWNER' | 'INVESTOR'
  equity_percentage: number
  profit_split_percentage: number
  is_active: boolean
  created_at: string
}

export interface DividendDistribution {
  id: string
  stakeholder_id: string
  period_month: string
  net_profit_amount: number
  distributed_amount: number
  journal_id: string | null
  created_at: string
  stakeholder?: Stakeholder
  journal?: JournalEntry
}

export interface InvoiceItem {
  name: string
  qty: number
  unit_price: number
}

export interface Invoice {
  id: string
  entity_id: string
  created_by: string | null
  client_name: string
  client_address: string | null
  client_phone: string | null
  items: InvoiceItem[]
  notes: string | null
  total_amount: number
  status: InvoiceStatus
  approved_by: string | null
  approved_at: string | null
  pdf_storage_key: string | null
  invoice_number: string | null
  created_at: string
  entity?: Entity
  creator?: Profile
  approver?: Profile
}

export interface InternalBilling {
  id: string
  from_entity_id: string
  to_entity_id: string
  amount: number
  description: string
  status: ApprovalStatus
  created_by: string | null
  approved_by: string | null
  created_at: string
  from_entity_data?: Entity
  to_entity_data?: Entity
  creator?: Profile
  approver?: Profile
}

export interface LogAttachment {
  key: string
  filename: string
  size: number
}

// ─── Workspace Metadata types per division ───────────────────────────────────

export interface GeneralMetadata {
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  assignee?: string
  due_date?: string
}

export interface WeatsoMetadata {
  sprint?: string
  github_link?: string
  tech_stack?: string[]
  bug_count?: number
  sprint_status?: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
}

export interface LokalMetadata {
  sales_volume?: number
  top_product?: string
  stock_alert?: boolean
  channel?: string
}

export interface EvoryMetadata {
  event_date?: string
  venue?: string
  vendor_status?: 'PENDING' | 'CONFIRMED' | 'DONE'
  guest_count?: number
  guest_star?: string
}

export interface ColabzMetadata {
  showreel_progress?: number
  class_schedule?: string
  student_count?: number
  content_type?: string
}

export interface LaddifyMetadata {
  provider?: string
  client_status?: 'ACTIVE' | 'INACTIVE' | 'PROSPECT'
  margin?: number
  smm_platform?: string
}

export type WorkspaceMetadata =
  | GeneralMetadata
  | WeatsoMetadata
  | LokalMetadata
  | EvoryMetadata
  | ColabzMetadata
  | LaddifyMetadata

export interface WorkspaceLog {
  id: string
  entity_id: string
  created_by: string | null
  title: string
  content: string
  log_type: WorkspaceType
  metadata: WorkspaceMetadata | null
  attachments: LogAttachment[] | null
  status: LogStatus
  assigned_to: string | null
  deadline: string | null
  ceo_notes: string | null
  reviewed_at: string | null
  created_at: string
  entity?: Entity
  creator?: Profile
}

// ─── Sales Kit ───────────────────────────────────────────────────────────────

export interface SalesKitItem {
  id: string
  entity_id: string | null
  title: string
  description: string | null
  category: SalesKitCategory
  file_key: string
  file_size: number | null
  file_type: string | null
  is_public: boolean
  created_by: string | null
  created_at: string
  entity?: Entity
  creator?: Profile
}

// ─── RBAC HIERARCHY LOGIC ──────────────────────────────────────────────────

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  CEO: 1,
  HEAD: 2,
  FINANCE: 3,
  DESIGN: 4,
  STAFF: 5
};

export const getHighestRole = (roles: UserRole[] | undefined | null): UserRole | null => {
  if (!roles || roles.length === 0) return null;
  return roles.reduce((prev, curr) => 
    ROLE_HIERARCHY[curr] < ROLE_HIERARCHY[prev] ? curr : prev
  , roles[0]);
};