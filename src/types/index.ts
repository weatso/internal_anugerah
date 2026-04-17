export type EntityType = 'HOLDING' | 'DIVISION'
export type UserRole = 'CEO' | 'HEAD' | 'FINANCE' | 'STAFF'
export type TransactionType = 'INCOME' | 'EXPENSE'
export type BillingStatus = 'PENDING' | 'APPROVED'
export type InvoiceStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'SENT'
export type LogStatus = 'SUBMITTED' | 'REVIEWED_BY_CEO' | 'NEEDS_ACTION'

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
  role: UserRole
  created_at: string
  entity?: Entity
}

export interface Transaction {
  id: string
  entity_id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  proof_storage_key: string | null
  created_by: string | null
  source_billing_id: string | null
  created_at: string
  entity?: Entity
  creator?: Profile
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
  source_transaction_id: string | null
  from_entity: string
  to_entity: string
  amount: number
  description: string | null
  status: BillingStatus
  approved_at: string | null
  approved_by: string | null
  created_at: string
  from_entity_data?: Entity
  to_entity_data?: Entity
}

export interface LogAttachment {
  key: string
  filename: string
  size: number
}

export interface WorkspaceLog {
  id: string
  entity_id: string
  created_by: string | null
  title: string
  content: string
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
