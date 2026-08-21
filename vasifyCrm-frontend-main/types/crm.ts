

export type TechService =
  | "website"
  | "whatsapp"
  | "lms"
  | "crm"
  | "digital_marketing"
  | "mobile_app"
  | "devops"
  | "ml_project"
  | "admin_panel"
  | "excel_extractor"
  | "word_editor"
  | "website_mobile"
  | "other"

// ─── Lead Sources ─────────────────────────────────────────────────────────────

export type LeadSource =
  | "referral"
  | "website"
  | "whatsapp"
  | "manual"
  | "social"
  | "other"

// ─── Pipeline Stages (SOW §3) ─────────────────────────────────────────────────

export type PipelineStage =
  | "lead"
  | "demo"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"

// ─── Recurring Interval ───────────────────────────────────────────────────────

export type RecurringInterval = "weekly" | "monthly" | "quarterly" | "yearly"

// ─── Customer (SOW §2.1) ─────────────────────────────────────────────────────

export interface Customer {
  id:               string
  name:             string
  email:            string
  phone:            string
  company?:         string
  address?:         string
  city?:            string
  state?:           string
  zipCode?:         string
  country?:         string
  status:           "active" | "inactive" | "prospect"
  source?:          LeadSource | string
  assignedTo:       string
  tags:             string[]
  notes?:           string
  createdAt:        Date | string
  updatedAt:        Date | string
  lastContactDate?: Date | string | null
  totalValue:       number
  whatsappNumber?:  string
  service?:         TechService | string | null
  referredBy?:      string | null

  // ── Deal Value breakdown (Customers table "Deal Value" column) ───────────
  // dealValue       = Total agreed amount for the deal
  // paidAmount      = Amount the client has paid so far (advance/installments) —
  //                   this is a cumulative running total, updated every time a
  //                   CustomerPayment is recorded (see below) or via "Edit Total".
  // expectedAmount  = Remaining / Due — ALWAYS derived as dealValue - paidAmount.
  //                   Never set directly by the user; recalculated and saved
  //                   every time dealValue or paidAmount changes.
  dealValue?:       number | null
  paidAmount?:      number | null   // ✅ NEW
  expectedAmount?:  number | null   // ✅ NEW — represents "Remaining / Due"

  // Customers-page extra fields (sales_rep / closure_date / business_type etc.)
  assignedUser?:    string | null
  salesRep?:        string | null
  businessType?:    string | null
  onboardingDate?:  Date | string | null
  renewalDate?:     Date | string | null
  closureDate?:     Date | string | null
  bloodGroup?:      string | null
  dateOfBirth?:     Date | string | null

  // Invoice defaults
  defaultTaxRate?:      number | null
  defaultDueDays?:      number | null
  defaultInvoiceNotes?: string | null

  // Recurring billing
  recurringEnabled?:  boolean
  recurringInterval?: RecurringInterval | null
  recurringAmount?:   number | null
  recurringService?:  string | null

  // Legacy pricing fields
  serviceType?:  string | null
  oneTimePrice?: number | null
  monthlyPrice?: number | null
  manualPrice?:  number | null
}

export interface CustomerPayload {
  name:             string
  phone:            string
  email?:           string
  whatsappNumber?:  string
  company?:         string
  address?:         string
  city?:            string
  state?:           string
  zipCode?:         string
  country?:         string
  status:           Customer["status"]
  source?:          LeadSource | string
  notes?:           string
  tags?:            string[]
  assignedTo?:      string
  totalValue?:      number
  lastContactDate?: Date | string | null
  service?:         TechService | string
  referredBy?:      string
  dealValue?:       number | null
  paidAmount?:      number | null   // ✅ NEW
  expectedAmount?:  number | null   // ✅ NEW
  defaultTaxRate?:      number
  defaultDueDays?:      number
  defaultInvoiceNotes?: string
  recurringEnabled?:    boolean
  recurringInterval?:   RecurringInterval
  recurringAmount?:     number
  recurringService?:    string
  createdAt?: Date | string
  updatedAt?: Date | string
  leadId?:    string
}

// ─────────────────────────────────────────────────────────────────────────────
// 🆕 NEW — Customer Payment ledger
// ─────────────────────────────────────────────────────────────────────────────
// One row per ACTUAL payment received, each with its own date. This is the
// historical detail behind Customer.paidAmount/expectedAmount (which remain
// simple running totals, unchanged). Powers the Monthly Payment Tracker and
// the month filter on the Clients page — both group these by paymentDate.
// Backed by the `customer_payments` table — see migration_customer_payments.sql.
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerPayment {
  id:           string
  customerId:   string
  amount:       number
  paymentDate:  string            // ISO YYYY-MM-DD — the date the payment was actually received
  notes?:       string | null
  createdBy?:   string | null
  createdAt?:   string | Date

  // Present on the "all payments" endpoint (GET /customers/payments), joined
  // from the customers table for display without a second lookup.
  customerName?: string

  // ── snake_case variants returned by backend ───────────────────────────────
  customer_id?:   string
  payment_date?:  string
  created_by?:    string | null
  created_at?:    string | Date
  customer_name?: string
}

// ─── Lead (SOW §2.2) ─────────────────────────────────────────────────────────

export interface Lead {
  id:             string
  name:           string
  email:          string
  phone?:         string
  company?:       string
  whatsappNumber?: string
  source:         LeadSource | string
  status:         PipelineStage | string
  priority:       "low" | "medium" | "high"
  service?:       TechService | string | null

  // SOW §2.3: Deal amounts
  estimatedValue:  number
  totalAmount?:    number
  expectedAmount?: number 
  amountReceived?: number
  paymentMode?:    "upi" | "bank_transfer" | "cash" | null

  // Sales metadata
  salesOwner?:  string | null
  dealStatus?:  string | null
  referredBy?:  string | null

  // Dates
  expectedCloseDate?: Date | string | null
  followUpDate?:      Date | string | null

  // Assignment
  assignedTo:          string
  createdBy?:          string | null
  created_user_name?:  string | null
  assigned_user_name?: string | null

  // Conversion
  isConverted?:           boolean
  convertedCustomerId?:   string | null

  notes?: string

  // Next action
  nextAction?: "call" | "demo" | "follow-up" | null
  next_action?: "call" | "demo" | "follow-up" | null

  pipelineStage?: PipelineStage | string

  // Follow-up snake_case (from DB)
  follow_up_date?:  string | null
  follow_up_notes?: string | null
  follow_up_time?:  string | null
  followUpHistory?:    FollowUpEntry[]
  follow_up_history?:  FollowUpEntry[]

  // Sales / deal form data
  sales_form_data?: Record<string, any> | null
  salesFormDraft?:  Record<string, any> | null
  dealFormDraft?:   Record<string, any> | null
  deal_form_draft?: Record<string, any> | null

  // Lead form draft (auto-save)
  lead_form_draft?:     Record<string, any> | null
  lead_form_is_draft?:  number
  lead_form_saved_at?:  string | null

  // Payment history
  paymentHistory?:   PaymentEntry[]
  payment_history?:  PaymentEntry[]

  // snake_case aliases from DB
  referred_by?:      string | null
  estimated_value?:  number
   expected_amount?:  number   
  createdAt: Date | string
  updatedAt: Date | string
}

export interface FollowUpEntry {
  id?:            string
  follow_up_date?: string
  followUpDate?:  string
  notes?:         string
  completed?:     boolean
  created_at?:    string
  createdAt?:     string
}

export interface PaymentEntry {
  id?:           string
  date?:         string
  payment_date?: string
  amount:        number
  mode?:         string
  payment_mode?: string
  remarks?:      string
}

// ─── Invoice (SOW §2.7 partial) ──────────────────────────────────────────────

export type InvoiceStatus =
  | "draft" | "sent" | "pending" | "paid" | "overdue" | "cancelled"

export interface InvoiceItem {
  id?:          string
  description:  string
  quantity:     number
  rate:         number
  amount:       number
  breakdown?:   string | null
}

export interface Invoice {
  id:             string
  customerId:     string
  customerName?:  string
  invoiceNumber:  string
  status:         InvoiceStatus
  amount:         number
  tax:            number
  discount?:      number
  total?:         number
  issueDate?:     Date | string | null
  dueDate?:       Date | string | null
  paidDate?:      Date | string | null
  isRecurring?:        boolean
  recurringFrequency?: RecurringInterval | null
  recurringCycles?:    number | null
  recurringStartDate?: Date | string | null
  recurringEndDate?:   Date | string | null
  items:   InvoiceItem[]
  notes?:  string
  createdAt: Date | string
  updatedAt: Date | string
}

// ─────────────────────────────────────────────────────────────────────────────
// SOW §2.5 — RETAINER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export type RetainerStatus = "active" | "inactive" | "expired"

// Matches RETAINER_SERVICES array in backend route exactly
export type RetainerService =
  | "whatsapp"
  | "website"
  | "digital_marketing"
  | "crm"
  | "lms"
  | "mobile_app"
  | "admin_panel"
  | "devops"
  | "social-media"
  | "other"

export interface Retainer {
  // Backend uses UUID → id is always string
  id: string

  // Client details
  clientName:   string
  customerId?:  string | null   // optional link to customers table (SOW §2.5)

  // Service & financials
  service:       RetainerService | string
  monthlyAmount: number

  // SOW §2.5: Key dates
  startDate:   string            // ISO YYYY-MM-DD
  renewalDate: string            // next renewal due date

  // Status
  status: RetainerStatus

  // Contact
  phone?:          string
  whatsappNumber?: string

  notes?: string

  // Audit
  createdBy?:       string | null
  createdAt?:       string | Date
  updatedAt?:       string | Date
  created_by_name?: string | null  // joined from users table

  // ── snake_case variants returned by backend ───────────────────────────────
  // Kept for dual-key resolver (r() helper) in RetainersContent component
  client_name?:     string
  customer_id?:     string | null
  monthly_amount?:  number
  start_date?:      string
  renewal_date?:    string
  whatsapp_number?: string
  created_by?:      string | null
  created_at?:      string | Date
  updated_at?:      string | Date

  // Computed by backend DATEDIFF — present on GET / and GET /:id responses
  days_to_renewal?: number
  daysToRenewal?:   number        // camelCase alias if normalised by context
}

// ─────────────────────────────────────────────────────────────────────────────
// SOW §2.5: Retainer Stats
// Shape returned by GET /api/retainers/stats
// ─────────────────────────────────────────────────────────────────────────────

export interface RetainerStatRow {
  totalRetainers:  number
  activeCount:     number
  inactiveCount:   number
  expiredCount:    number
  mrr:             number   // SUM of active monthly_amount
  renewingAlert:   number   // active retainers due within 7 days
  renewingWarn:    number   // active retainers due within 30 days
  overdueRenewals: number   // active but past renewal_date
}

export interface RetainerServiceBreakdown {
  service: string
  count:   number
  revenue: number
}

export interface UpcomingRenewal {
  id:                  string
  client_name:         string
  service:             string
  monthly_amount:      number
  renewal_date:        string
  days_until_renewal:  number
}

export interface RetainerMrrTrend {
  month:        string   // "YYYY-MM"
  mrr:          number
  newRetainers: number
}

export interface RetainerStatsResponse {
  stats:            RetainerStatRow
  serviceBreakdown: RetainerServiceBreakdown[]
  upcomingRenewals: UpcomingRenewal[]
  mrrTrend:         RetainerMrrTrend[]
}

// ─────────────────────────────────────────────────────────────────────────────
// SOW §2.6 — MONTHLY RETAINER TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export type RetainerPaymentStatus = "paid" | "pending" | "partial"
export type RetainerPaymentMode   = "upi" | "bank_transfer" | "cash"

export interface RetainerPayment {
  id:             string
  retainerId:     string
  paymentMonth:   string                    // ISO first day of month e.g. 2026-05-01
  expectedAmount: number
  receivedAmount: number
  paymentStatus:  RetainerPaymentStatus
  paymentDate?:   string | null
  paymentMode?:   RetainerPaymentMode | null
  remarks?:       string | null
  recordedBy?:    string | null
  createdAt?:     string | Date
  updatedAt?:     string | Date

  // Joined from retainers table (present in GET /:id/payments response)
  client_name?:              string
  service?:                  string
  retainer_monthly_amount?:  number

  // Convenience aliases for tracking table UI (SOW §2.6)
  retainerClientName?: string
  retainerService?:    string
  clientName?:         string

  // ── snake_case from backend ───────────────────────────────────────────────
  retainer_id?:     string
  payment_month?:   string
  expected_amount?: number
  received_amount?: number
  payment_status?:  RetainerPaymentStatus
  payment_date?:    string | null
  payment_mode?:    RetainerPaymentMode | null
  recorded_by?:     string | null
}

// SOW §2.6: Shape returned by GET /api/retainers/payments/summary
export interface RetainerMonthlySummaryRow {
  retainer_id:      string
  client_name:      string
  service:          string
  expected_amount:  number
  phone?:           string
  whatsapp_number?: string
  retainer_status:  RetainerStatus

  // Payment record (null if not yet created for this month)
  payment_id?:      string | null
  payment_month?:   string | null
  received_amount?: number | null
  payment_status?:  RetainerPaymentStatus | null
  payment_date?:    string | null
  payment_mode?:    RetainerPaymentMode | null
  remarks?:         string | null
}

export interface RetainerMonthlySummaryTotals {
  totalExpected: number
  totalReceived: number
  paidCount:     number
  pendingCount:  number
  total:         number
}

export interface RetainerMonthlySummaryResponse {
  month:    string
  summary:  RetainerMonthlySummaryTotals
  retainers: RetainerMonthlySummaryRow[]
}

// ─── Renewal (legacy — kept so existing imports don't break) ─────────────────

export interface Renewal {
  id:          string
  customerId:  string
  service:     string
  amount:      number
  expiryDate:  Date | string | null
  status:      "active" | "expiring" | "expired" | "renewed"
  reminderDays?: number
  notes?:      string
  createdAt:   Date | string
  updatedAt:   Date | string
}

export interface RenewalReminder {
  id:               string
  customerId:       string
  serviceType:      string
  serviceName:      string
  expiryDate:       Date | string
  reminderDays:     number[]
  lastReminderSent?: Date | string
  status:           "active" | "renewed" | "expired" | "cancelled"
  whatsappTemplate: string
  createdAt:        Date | string
  updatedAt:        Date | string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id:        string
  name:      string
  email:     string
  role:      "admin" | "user"
  avatar?:   string
  isActive:  boolean
  createdAt: Date | string
}

// ─── Deal (stub — SOW uses Lead pipeline instead) ────────────────────────────

/** @deprecated Vasifytech uses the Lead pipeline for deal tracking. */
export interface Deal {
  id:                string
  title:             string
  customerId:        string
  value:             number
  stage:
    | "prospecting" | "qualification" | "proposal"
    | "negotiation" | "closed-won" | "closed-lost"
  probability:       number
  expectedCloseDate: Date | string
  actualCloseDate?:  Date | string
  assignedTo:        string
  products:          string[]
  notes:             string
  createdAt:         Date | string
  updatedAt:         Date | string
}

// ─── Task (stub) ──────────────────────────────────────────────────────────────

/** @deprecated Not used in this phase of Vasifytech CRM. */
export interface Task {
  id:          string
  title:       string
  description: string
  type:        "call" | "email" | "meeting" | "follow-up" | "demo" | "other"
  priority:    "low" | "medium" | "high"
  status:      "pending" | "in-progress" | "completed" | "cancelled"
  assignedTo:  string
  relatedTo:   { type: "customer" | "lead" | "deal"; id: string }
  dueDate:     Date | string
  completedAt?: Date | string
  createdAt:   Date | string
  updatedAt:   Date | string
}
export {}