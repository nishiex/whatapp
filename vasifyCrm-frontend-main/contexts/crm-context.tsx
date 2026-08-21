
"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import type {
  Customer,
  CustomerPayment,
  Lead,
  Deal,
  Task,
  Invoice,
  RenewalReminder,
  Renewal,
  Retainer,
  RetainerPayment,
} from "@/types/crm"
import {
  customersApi,
  leadsApi,
  invoicesApi,
  renewalsApi,
  retainersApi,
  getAuthToken,
} from "@/lib/api"

// =============================================================================
// Internal types
// =============================================================================

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface LeadFilters {
  status?: string
  priority?: string
  service?: string
  source?: string
  assignedTo?: string
  createdBy?: string
  followUpDue?: string
  search?: string
  phone?: string
  nextAction?: string
  dateSort?: string
  page?: number
  limit?: number
  [key: string]: unknown
}

// =============================================================================
// Context shape
// =============================================================================

interface CRMContextType {
  customers: Customer[]
  leads: Lead[]
  invoices: Invoice[]
  renewalReminders: RenewalReminder[]
  renewals: Renewal[]
  users: User[]

  deals: Deal[]
  tasks: Task[]

  currentUser: User | null
  setCurrentUser: (user: User | null) => void

  leadFilters: LeadFilters
  setLeadFilters: React.Dispatch<React.SetStateAction<LeadFilters>>

  isLoading: boolean
  error: string | null

  addCustomer: (c: Omit<Customer, "id" | "createdAt" | "updatedAt">) => Promise<boolean>
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<boolean>
  deleteCustomer: (id: string) => Promise<boolean>
  moveCustomerToLead: (id: string) => Promise<boolean>

  // 🆕 NEW — Customer Payment ledger (Monthly Payment Tracker)
  customerPayments: CustomerPayment[]
  addCustomerPayment: (customerId: string, data: { amount: number; paymentDate: string; notes?: string }) => Promise<boolean>
  deleteCustomerPayment: (customerId: string, paymentId: string) => Promise<boolean>
  refreshCustomerPayments: () => Promise<void>

  addLead: (l: Omit<Lead, "id" | "createdAt" | "updatedAt">) => Promise<boolean>
  updateLead: (id: string, l: Partial<Lead> & { sales_form_data?: any }) => Promise<boolean>
  deleteLead: (id: string) => Promise<boolean>
  // convertLead: (id: string, customerData?: any) => Promise<boolean>
  convertLead: (id: string, customerData?: any) => Promise<Customer | null>
  addInvoice: (inv: Omit<Invoice, "id" | "createdAt" | "updatedAt">, payload?: any) => Promise<boolean>
  updateInvoice: (id: string, inv: Partial<Invoice>, payload?: any) => Promise<boolean>
  deleteInvoice: (id: string) => Promise<boolean>

  addRenewal: (r: Omit<Renewal, "id" | "createdAt" | "updatedAt">) => Promise<boolean>
  updateRenewal: (id: string, r: Partial<Renewal>) => Promise<boolean>
  deleteRenewal: (id: string) => Promise<boolean>
  addRenewalReminder: (r: Omit<RenewalReminder, "id" | "createdAt" | "updatedAt">) => Promise<boolean>
  updateRenewalReminder: (id: string, r: Partial<RenewalReminder>) => Promise<boolean>
  deleteRenewalReminder: (id: string) => Promise<boolean>

  addDeal: (d: any) => Promise<boolean>
  updateDeal: (id: string, d: any) => Promise<boolean>
  deleteDeal: (id: string) => Promise<boolean>
  addTask: (t: any) => Promise<boolean>
  updateTask: (id: string, t: any) => Promise<boolean>
  deleteTask: (id: string) => Promise<boolean>

  refreshData: () => Promise<void>
  refreshCustomers: () => Promise<void>
  refreshLeads: () => Promise<void>
  refreshInvoices: () => Promise<void>
  refreshRenewals: () => Promise<void>
  refreshUsers: () => Promise<void>
  refreshDeals: () => Promise<void>
  refreshTasks: () => Promise<void>

  retainers: Retainer[]
  retainerPayments: RetainerPayment[]

  addRetainer: (data: Partial<Retainer>) => Promise<boolean>
  updateRetainer: (id: string, data: Partial<Retainer>) => Promise<boolean>
  deleteRetainer: (id: string) => Promise<boolean>
  renewRetainer: (id: string, renewalDate: string) => Promise<boolean>
  refreshRetainers: () => Promise<void>

  addRetainerPayment: (data: Partial<RetainerPayment>) => Promise<boolean>
  updateRetainerPayment: (id: string, data: Partial<RetainerPayment>) => Promise<boolean>
}

// =============================================================================
// Context
// =============================================================================

const CRMContext = createContext<CRMContextType | undefined>(undefined)

// =============================================================================
// Normalizers
// =============================================================================

const toDate = (v: unknown): Date | null => {
  if (!v) return null
  if (v instanceof Date) return v
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? null : d
}

const num = (v: unknown, fallback = 0): number => {
  if (typeof v === "number") return v
  const n = Number(v ?? fallback)
  return isNaN(n) ? fallback : n
}

// ─── normalizeCustomer ────────────────────────────────────────────────────────
// FIX: maps all new DB columns (sales_rep → assignedUser, closure_date,
//      deal_value, business_type, onboarding_date, renewal_date)
// ✅ NEW: paid_amount → paidAmount, expected_amount → expectedAmount
//      (expectedAmount now represents "Remaining / Due" = dealValue - paidAmount,
//      always computed client-side and sent as a plain number to save — see
//      DealValueCell in customers-content.tsx)
const normalizeCustomer = (raw: any): Customer => ({
  id: String(raw.id),
  name: raw.name ?? "",
  email: raw.email ?? "",
  phone: raw.phone ?? "",
  company: raw.company ?? "",
  address: raw.address ?? "",
  city: raw.city ?? "",
  state: raw.state ?? "",
  zipCode: raw.zip_code ?? raw.zipCode ?? "",
  country: raw.country ?? "India",
  status: raw.status ?? "prospect",
  source: raw.source ?? "manual",
  assignedTo: raw.assigned_to ?? raw.assignedTo ?? "",
  whatsappNumber: raw.whatsapp_number ?? raw.whatsappNumber ?? "",
  tags: Array.isArray(raw.tags)
    ? raw.tags
    : (() => { try { return raw.tags ? JSON.parse(raw.tags) : [] } catch { return [] } })(),
  notes: raw.notes ?? "",
  totalValue: num(raw.total_value ?? raw.totalValue),
  createdAt: toDate(raw.created_at ?? raw.createdAt) ?? (raw.created_at ?? raw.createdAt),
  updatedAt: toDate(raw.updated_at ?? raw.updatedAt) ?? (raw.updated_at ?? raw.updatedAt),
  lastContactDate: toDate(raw.last_contact_date ?? raw.lastContactDate) ?? (raw.last_contact_date ?? raw.lastContactDate ?? null),

  service: raw.service ?? null,
  bloodGroup: raw.blood_group ?? raw.bloodGroup ?? null,
  dateOfBirth: raw.date_of_birth ?? raw.dateOfBirth ?? null,
  referredBy: raw.referred_by ?? raw.referredBy ?? null,

  defaultTaxRate: raw.default_tax_rate != null ? num(raw.default_tax_rate ?? raw.defaultTaxRate) : undefined,
  defaultDueDays: raw.default_due_days != null ? num(raw.default_due_days ?? raw.defaultDueDays) : undefined,
  defaultInvoiceNotes: raw.default_invoice_notes ?? raw.defaultInvoiceNotes ?? null,

  recurringEnabled: !!(raw.recurring_enabled ?? raw.recurringEnabled),
  recurringInterval: raw.recurring_interval ?? raw.recurringInterval ?? null,
  recurringAmount: raw.recurring_amount != null ? num(raw.recurring_amount ?? raw.recurringAmount) : null,
  recurringService: raw.recurring_service ?? raw.recurringService ?? null,

  serviceType: raw.service_type ?? raw.serviceType ?? null,
  oneTimePrice: raw.one_time_price != null ? num(raw.one_time_price) : null,
  monthlyPrice: raw.monthly_price != null ? num(raw.monthly_price) : null,
  manualPrice: raw.manual_price != null ? num(raw.manual_price) : null,

  // ── FIX: New fields — map snake_case DB columns to camelCase ────────────
  // sales_rep column is reused for assignedUser (the responsible person name)
  assignedUser: raw.sales_rep ?? raw.assignedUser ?? null,
  salesRep: raw.sales_rep ?? raw.salesRep ?? null,  // backward compat
  businessType: raw.business_type ?? raw.businessType ?? null,
  onboardingDate: raw.onboarding_date ?? raw.onboardingDate ?? null,
  renewalDate: raw.renewal_date ?? raw.renewalDate ?? null,
  // NEW columns added by migration.sql
  closureDate: raw.closure_date ?? raw.closureDate ?? null,
  dealValue: raw.deal_value != null
    ? num(raw.deal_value ?? raw.dealValue)
    : (raw.dealValue != null ? num(raw.dealValue) : null),

  // ✅ NEW: Paid Amount + Remaining/Due (Deal Value column sub-fields)
  paidAmount: raw.paid_amount != null
    ? num(raw.paid_amount ?? raw.paidAmount)
    : (raw.paidAmount != null ? num(raw.paidAmount) : null),
  expectedAmount: raw.expected_amount != null
    ? num(raw.expected_amount ?? raw.expectedAmount)
    : (raw.expectedAmount != null ? num(raw.expectedAmount) : null),
})

// ─── normalizeCustomerPayment ──────────────────────────────────────────────────
// 🆕 NEW — maps customer_payments rows (snake_case from MySQL) to the
// camelCase CustomerPayment shape used throughout the frontend.
const normalizeCustomerPayment = (raw: any): CustomerPayment => ({
  id: String(raw.id),
  customerId: String(raw.customer_id ?? raw.customerId ?? ""),
  amount: num(raw.amount),
  paymentDate: typeof (raw.payment_date ?? raw.paymentDate) === "string"
    ? (raw.payment_date ?? raw.paymentDate).slice(0, 10)
    : (raw.payment_date ?? raw.paymentDate ?? ""),
  notes: raw.notes ?? null,
  createdBy: raw.created_by ?? raw.createdBy ?? null,
  createdAt: toDate(raw.created_at ?? raw.createdAt) ?? (raw.created_at ?? raw.createdAt),
  customerName: raw.customer_name ?? raw.customerName ?? undefined,
})

// ─── normalizeLead ────────────────────────────────────────────────────────────
const normalizeLead = (raw: any): Lead => {
  let salesFormData: Record<string, any> | null = null
  if (raw.sales_form_data) {
    try {
      salesFormData =
        typeof raw.sales_form_data === "string"
          ? JSON.parse(raw.sales_form_data)
          : raw.sales_form_data
    } catch {
      salesFormData = null
    }
  }

  let leadFormDraft: Record<string, any> | null = null
  const rawDraft = raw.lead_form_draft ?? raw.leadFormDraft ?? null
  if (rawDraft) {
    try {
      leadFormDraft = typeof rawDraft === "string" ? JSON.parse(rawDraft) : rawDraft
    } catch {
      leadFormDraft = null
    }
  }

  const rawEstVal = raw.estimated_value ?? raw.estimatedValue ?? 0
  const estimatedValue = num(typeof rawEstVal === "string" ? parseFloat(rawEstVal) || 0 : rawEstVal)
  const rawExpAmt = raw.expected_amount ?? raw.expectedAmount ?? 0
  const expectedAmount = num(typeof rawExpAmt === "string" ? parseFloat(rawExpAmt) || 0 : rawExpAmt)

  return {
    id: String(raw.id),
    name: raw.name ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    company: raw.company ?? "",
    whatsappNumber: raw.whatsapp_number ?? raw.whatsappNumber ?? "",
    source: raw.source ?? "manual",
    status: raw.status ?? "qualified-lead",
    priority: raw.priority ?? "medium",
    service: raw.service ?? null,
    estimatedValue,
    expectedCloseDate: toDate(raw.expected_close_date ?? raw.expectedCloseDate) ?? (raw.expected_close_date ?? raw.expectedCloseDate ?? null),
    expectedAmount,
    expected_amount: expectedAmount,
    followUpDate: toDate(raw.follow_up_date ?? raw.followUpDate) ?? (raw.follow_up_date ?? raw.followUpDate ?? null),
    referredBy: raw.referred_by ?? raw.referredBy ?? null,
    assignedTo: raw.assigned_to ?? raw.assignedTo ?? "",
    createdBy: raw.created_by ?? raw.createdBy ?? null,
    isConverted: !!(raw.is_converted ?? raw.isConverted ?? (raw.status === "installation") ?? !!raw.converted_customer_id),
    convertedCustomerId: raw.converted_customer_id ?? raw.convertedCustomerId ?? null,
    notes: raw.notes ?? "",
    createdAt: toDate(raw.created_at ?? raw.createdAt) ?? (raw.created_at ?? raw.createdAt),
    updatedAt: toDate(raw.updated_at ?? raw.updatedAt) ?? (raw.updated_at ?? raw.updatedAt),
    follow_up_date: raw.follow_up_date ?? null,
    follow_up_time: raw.follow_up_time ?? null,
    referred_by: raw.referred_by ?? null,
    assigned_user_name: raw.assigned_user_name ?? null,
    created_user_name: raw.created_user_name ?? null,
    requested_service: raw.requested_service ?? null,
    estimated_value: estimatedValue,
    next_action: raw.next_action ?? null,
    sales_form_data: salesFormData,
    lead_form_draft: leadFormDraft,
    lead_form_is_draft: raw.lead_form_is_draft ?? raw.leadFormIsDraft ?? 0,
    lead_form_saved_at: raw.lead_form_saved_at ?? raw.leadFormSavedAt ?? null,
  } as any
}

// ─── normalizeInvoice ─────────────────────────────────────────────────────────
const normalizeInvoice = (raw: any, fallback?: Partial<Invoice>): Invoice => {
  const amount = num(raw.amount ?? fallback?.amount)
  const taxRate = num(raw.tax ?? fallback?.tax)
  const discount = num(raw.discount ?? fallback?.discount)
  const total = typeof raw.total === "number"
    ? raw.total
    : amount + (amount * taxRate / 100) - discount

  return {
    id: String(raw.id),
    customerId: String(raw.customer_id ?? raw.customerId ?? fallback?.customerId ?? ""),
    customerName: raw.customer_name ?? raw.customerName ?? fallback?.customerName ?? "",
    invoiceNumber: raw.invoice_number ?? raw.invoiceNumber ?? fallback?.invoiceNumber ?? "",
    status: raw.status ?? fallback?.status ?? "draft",
    amount,
    tax: taxRate,
    discount,
    total,
    issueDate: toDate(raw.issue_date ?? raw.issueDate ?? raw.created_at) ?? (raw.issue_date ?? raw.created_at ?? null),
    dueDate: toDate(raw.due_date ?? raw.dueDate) ?? (raw.due_date ?? raw.dueDate ?? null),
    paidDate: toDate(raw.paid_date ?? raw.paidDate) ?? (raw.paid_date ?? raw.paidDate ?? null),
    isRecurring: !!(raw.is_recurring ?? raw.isRecurring),
    recurringFrequency: raw.recurring_frequency ?? raw.recurringFrequency ?? null,
    recurringCycles: raw.recurring_cycles ?? raw.recurringCycles ?? null,
    recurringStartDate: toDate(raw.recurring_start_date ?? raw.recurringStartDate) ?? null,
    recurringEndDate: toDate(raw.recurring_end_date ?? raw.recurringEndDate) ?? null,
    notes: raw.notes ?? fallback?.notes ?? "",
    items: Array.isArray(raw.items) ? raw.items : (fallback?.items ?? []),
    createdAt: toDate(raw.created_at ?? raw.createdAt) ?? (raw.created_at ?? new Date()),
    updatedAt: toDate(raw.updated_at ?? raw.updatedAt) ?? (raw.updated_at ?? new Date()),
  }
}

// ─── normalizeRenewal ─────────────────────────────────────────────────────────
const normalizeRenewal = (raw: any): Renewal => ({
  id: String(raw.id),
  customerId: String(raw.customer_id ?? raw.customerId ?? ""),
  service: raw.service ?? "",
  amount: num(raw.amount),
  expiryDate: toDate(raw.expiry_date ?? raw.expiryDate) ?? (raw.expiry_date ?? raw.expiryDate ?? null),
  status: raw.status ?? "active",
  reminderDays: num(raw.reminder_days ?? raw.reminderDays, 30),
  notes: raw.notes ?? "",
  createdAt: toDate(raw.created_at ?? raw.createdAt) ?? new Date(),
  updatedAt: toDate(raw.updated_at ?? raw.updatedAt) ?? new Date(),
})

// ─── normalizeRetainer ────────────────────────────────────────────────────────
const normalizeRetainer = (raw: any): Retainer => ({
  id: String(raw.id),
  clientName: raw.client_name ?? raw.clientName ?? "",
  customerId: raw.customer_id ?? raw.customerId ?? null,
  service: raw.service ?? "other",
  monthlyAmount: num(raw.monthly_amount ?? raw.monthlyAmount),
  startDate: raw.start_date ?? raw.startDate ?? "",
  renewalDate: raw.renewal_date ?? raw.renewalDate ?? "",
  status: raw.status ?? "active",
  phone: raw.phone ?? undefined,
  whatsappNumber: raw.whatsapp_number ?? raw.whatsappNumber ?? undefined,
  notes: raw.notes ?? undefined,
  createdBy: raw.created_by ?? raw.createdBy ?? null,
  createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  updatedAt: raw.updated_at ?? raw.updatedAt ?? new Date().toISOString(),
  client_name: raw.client_name,
  monthly_amount: raw.monthly_amount,
  start_date: raw.start_date,
  renewal_date: raw.renewal_date,
})

// =============================================================================
// Provider
// =============================================================================

export function CRMProvider({ children }: { children: React.ReactNode }) {

  const [customers, setCustomers] = useState<Customer[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [renewalReminders, setRenewalReminders] = useState<RenewalReminder[]>([])
  const [renewals, setRenewals] = useState<Renewal[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [retainers, setRetainers] = useState<Retainer[]>([])
  const [retainerPayments, setRetainerPayments] = useState<RetainerPayment[]>([])
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([])   // 🆕 NEW

  const [deals] = useState<Deal[]>([])
  const [tasks] = useState<Task[]>([])

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [leadFilters, setLeadFilters] = useState<LeadFilters>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const invoicesRef = useRef<Invoice[]>([])
  useEffect(() => { invoicesRef.current = invoices }, [invoices])

  const leadFiltersRef = useRef<LeadFilters>(leadFilters)
  useEffect(() => { leadFiltersRef.current = leadFilters }, [leadFilters])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) { setIsLoading(false); return }
    void refreshData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    void refreshLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadFilters])

  // ==========================================================================
  // Refresh helpers
  // ==========================================================================

  const refreshData = async () => {
    const token = getAuthToken()
    if (!token) { setIsLoading(false); return }
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([
        refreshCustomers(),
        refreshLeads(),
        refreshInvoices(),
        refreshRenewals(),
        refreshRetainers(),
        refreshUsers(),
        refreshCustomerPayments(),   // 🆕 NEW
      ])
    } catch (err) {
      console.error("Failed to load CRM data:", err)
      setError(err instanceof Error ? err.message : "Failed to load CRM data")
    } finally {
      setIsLoading(false)
    }
  }

  // const refreshUsers = async () => {
  //   try {
  //     const token = getAuthToken()
  //     if (!token) { setUsers([]); return }
  //     const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  //     const res  = await fetch(`${base}/users`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     })
  //     if (res.ok) {
  //       const data = await res.json()
  //       setUsers(Array.isArray(data.users) ? data.users : [])
  //     } else {
  //       setUsers([])
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch users:", err)
  //     setUsers([])
  //   }
  // }

  const refreshUsers = async () => {
    try {
      const token = getAuthToken()
      if (!token) { setUsers([]); return }
      const base = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api"
      const res = await fetch(`${base}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data.users) ? data.users : [])
      } else {
        setUsers([])
      }
    } catch (err) {
      console.error("Failed to fetch users:", err)
      setUsers([])
    }
  }
  const refreshCustomers = async () => {
    try {
      const res = await customersApi.getAll({ limit: 100 })
      setCustomers((res.customers || []).map(normalizeCustomer))
    } catch (err) {
      console.error("Failed to fetch customers:", err)
      throw err
    }
  }

  // ── 🆕 NEW: refreshCustomerPayments ───────────────────────────────────────
  // Loads the full payment ledger (across all customers) once, the same way
  // refreshUsers/refreshCustomers do — the Monthly Payment Tracker then groups
  // this client-side by month, matching how every other filter on that page
  // already works (load full list, filter/group in the browser).
  // const refreshCustomerPayments = async () => {
  //   try {
  //     const token = getAuthToken()
  //     if (!token) { setCustomerPayments([]); return }
  //     const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  //     const res  = await fetch(`${base}/customers/payments`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     })
  //     if (res.ok) {
  //       const data = await res.json()
  //       setCustomerPayments((data.payments || []).map(normalizeCustomerPayment))
  //     } else {
  //       setCustomerPayments([])
  //     }
  //   } catch (err) {
  //     console.error("Failed to fetch customer payments:", err)
  //     setCustomerPayments([])
  //   }
  // }


  const refreshCustomerPayments = async () => {
    try {
      const token = getAuthToken()
      if (!token) { setCustomerPayments([]); return }
      const base = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api"
      const res = await fetch(`${base}/customers/payments`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        setCustomerPayments((data.payments || []).map(normalizeCustomerPayment))
      } else {
        setCustomerPayments([])
      }
    } catch (err) {
      console.error("Failed to fetch customer payments:", err)
      setCustomerPayments([])
    }
  }

  const refreshLeads = useCallback(async () => {
    try {
      const filters = leadFiltersRef.current
      const params: any = {}
      if (filters.status && filters.status !== "all") params.status = filters.status
      if (filters.priority && filters.priority !== "all") params.priority = filters.priority
      if (filters.service && filters.service !== "all") params.service = filters.service
      if (filters.source && filters.source !== "all") params.source = filters.source
      if (filters.followUpDue && filters.followUpDue !== "all") params.followUpDue = filters.followUpDue
      if (filters.assignedTo && filters.assignedTo !== "all") params.assignedTo = filters.assignedTo
      if (filters.createdBy && filters.createdBy !== "all") params.createdBy = filters.createdBy
      if (filters.search) params.search = filters.search
      if (filters.phone) params.phone = filters.phone
      if (filters.nextAction && filters.nextAction !== "all") params.nextAction = filters.nextAction
      if (filters.dateSort) params.dateSort = filters.dateSort
      params.page = filters.page ?? 1
      params.limit = filters.limit ?? 100
      const res = await leadsApi.getAll(params)
      setLeads((res.leads || []).map(normalizeLead))
    } catch (err) {
      console.error("Failed to fetch leads:", err)
      throw err
    }
  }, [])

  const refreshInvoices = async () => {
    try {
      const res = await invoicesApi.getAll({ limit: 100 })
      setInvoices((res.invoices || []).map((inv) => normalizeInvoice(inv)))
    } catch (err) {
      console.error("Failed to fetch invoices:", err)
      throw err
    }
  }

  const refreshRenewals = async () => {
    try {
      const [renewalsRes, remindersRes] = await Promise.all([
        renewalsApi.getAll({ limit: 100 }),
        renewalsApi.getReminders(),
      ])
      setRenewals((renewalsRes.renewals || []).map(normalizeRenewal))
      setRenewalReminders(
        (remindersRes.reminders || []).map((rr: any) => ({
          ...rr,
          createdAt: toDate(rr.created_at ?? rr.createdAt) ?? new Date(),
          updatedAt: toDate(rr.updated_at ?? rr.updatedAt) ?? new Date(),
          expiryDate: toDate(rr.expiry_date ?? rr.expiryDate) ?? null,
          lastReminderSent: toDate(rr.last_reminder_sent ?? rr.lastReminderSent) ?? null,
          reminderDays: Array.isArray(rr.reminderDays ?? rr.reminder_days)
            ? (rr.reminderDays ?? rr.reminder_days)
            : (() => {
              try { return JSON.parse(rr.reminderDays ?? rr.reminder_days ?? "[]") }
              catch { return [] }
            })(),
        }))
      )
    } catch (err) {
      console.error("Failed to fetch renewals:", err)
    }
  }

  const refreshRetainers = useCallback(async () => {
    try {
      const res = await retainersApi.getAll({ limit: 100 })
      setRetainers((res.retainers || []).map(normalizeRetainer))
    } catch (err) {
      console.error("Failed to fetch retainers:", err)
      setRetainers([])
    }
  }, [])

  const refreshDeals = async () => { }
  const refreshTasks = async () => { }

  // ==========================================================================
  // Customer CRUD
  // ==========================================================================

  const addCustomer = async (
    data: Omit<Customer, "id" | "createdAt" | "updatedAt">,
  ): Promise<boolean> => {
    try {
      const payload = {
        ...data,
        totalValue: data.totalValue != null && (data.totalValue as any) !== ""
          ? Number(data.totalValue) : 0,
      }
      const res = await customersApi.create(payload)
      if (!res.customer) return false

      const c = normalizeCustomer(res.customer)
      setCustomers((prev) => [c, ...prev])

      if ((res as any).invoice) {
        setInvoices((prev) => [
          normalizeInvoice((res as any).invoice, { customerId: c.id, customerName: c.name }),
          ...prev,
        ])
      }

      return true
    } catch (err) {
      console.error("Failed to add customer:", err)
      throw err
    }
  }

  // ── FIX: updateCustomer — optimistically patches local state with the
  //    partial payload so the UI reflects changes instantly, even before
  //    the server response is fully normalised. This fixes the issue where
  //    assignedUser / closureDate / dealValue were saved to the DB but the
  //    UI showed stale values because normalizeCustomer wasn't re-run.
  // ✅ NEW: paidAmount and expectedAmount get the same numeric-coercion
  //    treatment as dealValue, both in the outgoing payload and in the
  //    optimistic local patch — these three are always saved together from
  //    DealValueCell, so they need identical handling.
  const updateCustomer = async (id: string, data: Partial<Customer>): Promise<boolean> => {
    try {
      // Build the payload, coercing numeric fields
      const payload: any = { ...data }
      if ("totalValue" in payload) {
        payload.totalValue = payload.totalValue != null && payload.totalValue !== ""
          ? Number(payload.totalValue) : 0
      }
      if ("dealValue" in payload) {
        payload.dealValue = payload.dealValue != null && payload.dealValue !== ""
          ? Number(payload.dealValue) : null
      }
      if ("paidAmount" in payload) {                                   // ✅ NEW
        payload.paidAmount = payload.paidAmount != null && payload.paidAmount !== ""
          ? Number(payload.paidAmount) : null
      }
      if ("expectedAmount" in payload) {                               // ✅ NEW
        payload.expectedAmount = payload.expectedAmount != null && payload.expectedAmount !== ""
          ? Number(payload.expectedAmount) : null
      }

      // ── Optimistic update: reflect changes in the UI immediately ──────────
      // This ensures columns like dealValue / paidAmount / expectedAmount /
      // closureDate / assignedUser update in the table without waiting for
      // the server round-trip.
      setCustomers((prev) =>
        prev.map((cu) => {
          if (cu.id !== id) return cu
          return {
            ...cu,
            ...data,
            // Coerce numeric fields in the optimistic patch too
            ...(("dealValue" in data) && {
              dealValue: data.dealValue != null && (data.dealValue as any) !== ""
                ? Number(data.dealValue) : null,
            }),
            ...(("paidAmount" in data) && {                            // ✅ NEW
              paidAmount: data.paidAmount != null && (data.paidAmount as any) !== ""
                ? Number(data.paidAmount) : null,
            }),
            ...(("expectedAmount" in data) && {                        // ✅ NEW
              expectedAmount: data.expectedAmount != null && (data.expectedAmount as any) !== ""
                ? Number(data.expectedAmount) : null,
            }),
            ...(("totalValue" in data) && {
              totalValue: data.totalValue != null && (data.totalValue as any) !== ""
                ? Number(data.totalValue) : 0,
            }),
          }
        })
      )

      // ── Server round-trip ─────────────────────────────────────────────────
      const res = await customersApi.update(id, payload)
      if (!res.customer) {
        // Rollback: re-fetch from server to ensure consistency
        await refreshCustomers()
        return false
      }

      // Apply the authoritative server response
      const normalized = normalizeCustomer(res.customer)
      setCustomers((prev) => prev.map((cu) => cu.id === id ? normalized : cu))
      return true
    } catch (err) {
      console.error("Failed to update customer:", err)
      // Rollback optimistic update on error
      await refreshCustomers().catch(() => { })
      throw err
    }
  }

  const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
      await customersApi.delete(id)
      setCustomers((prev) => prev.filter((c) => c.id !== id))
      return true
    } catch (err) {
      console.error("Failed to delete customer:", err)
      return false
    }
  }

  const moveCustomerToLead = async (id: string): Promise<boolean> => {
    try {
      await customersApi.moveToLead(id)
      setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, status: "inactive" } : c))
      await refreshLeads()
      return true
    } catch (err) {
      console.error("Failed to move customer to lead:", err)
      return false
    }
  }

  // ==========================================================================
  // 🆕 NEW — Customer Payment ledger CRUD
  // ==========================================================================
  // Raw fetch() (same pattern as refreshUsers above) rather than going through
  // customersApi, since these are brand-new endpoints not yet part of that
  // wrapper. If your lib/api.ts already defines a matching customersApi
  // method, feel free to swap these calls for it later — the behaviour here
  // is otherwise identical.

  const addCustomerPayment = async (
    customerId: string,
    data: { amount: number; paymentDate: string; notes?: string }
  ): Promise<boolean> => {
    try {
      // ── Optimistic update — bump paidAmount/expectedAmount locally right
      // away (same approach as updateCustomer's optimistic patch above), so
      // the Deal Value column / Due column / KPI tiles feel instant.
      setCustomers((prev) =>
        prev.map((cu) => {
          if (cu.id !== customerId) return cu
          const dealValue = (cu as any).dealValue
          if (dealValue == null) return cu
          const newPaid = ((cu as any).paidAmount ?? 0) + data.amount
          const newDue = Math.max(dealValue - newPaid, 0)
          return { ...cu, paidAmount: newPaid, expectedAmount: newDue } as Customer
        })
      )

      const token = getAuthToken()
      const base = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api"
      const res = await fetch(`${base}/customers/${customerId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Rollback the optimistic patch — re-sync from server
        await refreshCustomers().catch(() => { })
        throw new Error(json?.error || "Failed to record payment")
      }

      // Apply the authoritative customer snapshot + prepend the new ledger row
      if (json.customer) {
        setCustomers((prev) => prev.map((cu) => cu.id === customerId ? normalizeCustomer(json.customer) : cu))
      }
      if (json.payment) {
        setCustomerPayments((prev) => [normalizeCustomerPayment(json.payment), ...prev])
      }
      return true
    } catch (err) {
      console.error("Failed to add customer payment:", err)
      throw err
    }
  }

  const deleteCustomerPayment = async (customerId: string, paymentId: string): Promise<boolean> => {
    try {
      const token = getAuthToken()
      const base = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api"
      const res = await fetch(`${base}/customers/${customerId}/payments/${paymentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || "Failed to remove payment")
      }
      setCustomerPayments((prev) => prev.filter((p) => p.id !== paymentId))
      await refreshCustomers()
      return true
    } catch (err) {
      console.error("Failed to delete customer payment:", err)
      return false
    }
  }

  // ==========================================================================
  // Lead CRUD
  // ==========================================================================

  const addLead = async (
    data: Omit<Lead, "id" | "createdAt" | "updatedAt">,
  ): Promise<boolean> => {
    try {
      const res = await leadsApi.create(data)
      if (!res.lead) return false
      setLeads((prev) => [normalizeLead(res.lead), ...prev])
      return true
    } catch (err) {
      console.error("Failed to add lead:", err)
      return false
    }
  }

  const updateLead = async (
    id: string,
    data: Partial<Lead> & { sales_form_data?: any; salesFormData?: any; next_action?: string },
  ): Promise<boolean> => {
    try {
      const payload: Record<string, any> = {}

      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue
        switch (key) {
          case "sales_form_data":
          case "salesFormData": {
            payload["sales_form_data"] = typeof value === "string" ? value : JSON.stringify(value)
            break
          }
          case "next_action":
          case "nextAction":
            payload["next_action"] = value
            break
          case "lead_form_draft":
          case "leadFormDraft": {
            payload["lead_form_draft"] = typeof value === "string" ? value : JSON.stringify(value)
            break
          }
          case "lead_form_is_draft":
          case "leadFormIsDraft":
            payload["lead_form_is_draft"] = value
            break
          case "lead_form_saved_at":
          case "leadFormSavedAt":
            payload["lead_form_saved_at"] = value
            break
          case "expectedCloseDate":
          case "followUpDate": {
            if (value === null) {
              payload[key] = null
            } else if (value instanceof Date) {
              payload[key] = toLocalDate(value)
            } else if (typeof value === "string" && value.includes("T")) {
              const d = new Date(value)
              payload[key] = isNaN(d.getTime()) ? value.split("T")[0] : toLocalDate(d)
            } else {
              payload[key] = value
            }
            break
          }
          default:
            payload[key] = value
        }
      }

      if (Object.keys(payload).length === 0) {
        console.warn("[updateLead] No fields to update — skipping API call")
        return true
      }

      const res = await leadsApi.update(id, payload)
      if (!res.lead) return false
      setLeads((prev) => prev.map((l) => l.id === id ? normalizeLead(res.lead) : l))
      return true
    } catch (err) {
      console.error("Failed to update lead:", err)
      return false
    }
  }

  const toLocalDate = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  const deleteLead = async (id: string): Promise<boolean> => {
    try {
      await leadsApi.delete(id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
      return true
    } catch (err) {
      console.error("Failed to delete lead:", err)
      return false
    }
  }

  // const convertLead = async (id: string, customerData?: any): Promise<boolean> => {
  //   try {
  //     const res = await leadsApi.convertToCustomer(id, { ...customerData, fromLead: true })
  //     if (!res.customer) {
  //       if ((res as any).error) throw new Error((res as any).error)
  //       return false
  //     }
  //     const c = normalizeCustomer(res.customer)
  //     setCustomers((prev) => {
  //       const exists = prev.some((cu) => cu.id === c.id)
  //       return exists ? prev.map((cu) => cu.id === c.id ? c : cu) : [c, ...prev]
  //     })
  //     setLeads((prev) =>
  //       prev.map((l) =>
  //         l.id === id
  //           ? { ...l, status: "installation", isConverted: true, convertedCustomerId: c.id }
  //           : l
  //       )
  //     )
  //     await Promise.all([refreshCustomers(), refreshLeads()])
  //     return true
  //   } catch (err: any) {
  //     console.error("Failed to convert lead:", err)
  //     alert(err?.message || "Failed to convert lead to client")
  //     return false
  //   }
  // }


  //testing (pop up message)

  const convertLead = async (id: string, customerData?: any): Promise<Customer | null> => {
    try {
      const res = await leadsApi.convertToCustomer(id, { ...customerData, fromLead: true })
      if (!res.customer) {
        if ((res as any).error) throw new Error((res as any).error)
        return null   // ✅ was: return false
      }
      const c = normalizeCustomer(res.customer)
      setCustomers((prev) => {
        const exists = prev.some((cu) => cu.id === c.id)
        return exists ? prev.map((cu) => cu.id === c.id ? c : cu) : [c, ...prev]
      })
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, status: "installation", isConverted: true, convertedCustomerId: c.id }
            : l
        )
      )
      await Promise.all([refreshCustomers(), refreshLeads()])
      return c   // ✅ was: return true
    } catch (err: any) {
      console.error("Failed to convert lead:", err)
      alert(err?.message || "Failed to convert lead to client")
      return null   // ✅ was: return false
    }
  }
  // ==========================================================================
  // Invoice CRUD
  // ==========================================================================

  const buildInvoicePayload = (data: Partial<Invoice>) => {
    const subtotal = data.items?.reduce((s, it) => s + (it.amount ?? 0), 0) ?? data.amount ?? 0
    const taxRate = typeof data.tax === "number" ? data.tax : Number(data.tax ?? 0) || 0
    const discount = typeof data.discount === "number" ? data.discount : Number(data.discount ?? 0) || 0
    const taxAmount = subtotal * taxRate / 100
    const total = subtotal + taxAmount - discount
    return {
      customerId: data.customerId,
      amount: subtotal,
      tax: taxRate,
      discount,
      total,
      status: data.status,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      notes: data.notes,
      isRecurring: data.isRecurring,
      recurringFrequency: data.recurringFrequency,
      recurringCycles: data.recurringCycles,
      recurringStartDate: data.recurringStartDate,
      recurringEndDate: data.recurringEndDate,
      items: data.items?.map(({ description, quantity, rate, amount }) => ({
        description, quantity, rate, amount,
      })) ?? [],
    }
  }

  const addInvoice = async (
    data: Omit<Invoice, "id" | "createdAt" | "updatedAt">,
    apiPayload?: any,
  ): Promise<boolean> => {
    try {
      const payload = apiPayload ?? buildInvoicePayload(data)
      const res = await invoicesApi.create(payload)
      if (!res.invoice) return false
      setInvoices((prev) => [normalizeInvoice(res.invoice, data), ...prev])
      return true
    } catch (err) {
      console.error("Failed to add invoice:", err)
      return false
    }
  }

  const updateInvoice = async (
    id: string,
    data: Partial<Invoice>,
    apiPayload?: any,
  ): Promise<boolean> => {
    try {
      const payload = apiPayload ?? buildInvoicePayload(data)
      const res = await invoicesApi.update(id, payload)
      if (!res.invoice) return false
      const fallbackStatus = invoicesRef.current.find((iv) => iv.id === id)?.status ?? "draft"
      const normalized = normalizeInvoice(res.invoice, {
        ...data, status: data.status ?? fallbackStatus,
      })
      setInvoices((prev) => prev.map((inv) => inv.id === id ? normalized : inv))
      return true
    } catch (err) {
      console.error("Failed to update invoice:", err)
      return false
    }
  }

  const deleteInvoice = async (id: string): Promise<boolean> => {
    try {
      await invoicesApi.delete(id)
      setInvoices((prev) => prev.filter((inv) => inv.id !== id))
      return true
    } catch (err) {
      console.error("Failed to delete invoice:", err)
      return false
    }
  }

  // ==========================================================================
  // Renewal CRUD
  // ==========================================================================

  const addRenewal = async (data: Omit<Renewal, "id" | "createdAt" | "updatedAt">): Promise<boolean> => {
    try {
      const res = await renewalsApi.create(data)
      if (!res.renewal) return false
      setRenewals((prev) => [normalizeRenewal(res.renewal), ...prev])
      return true
    } catch (err) {
      console.error("Failed to add renewal:", err)
      throw err
    }
  }

  const updateRenewal = async (id: string, data: Partial<Renewal>): Promise<boolean> => {
    try {
      const res = await renewalsApi.update(id, data)
      if (!res.renewal) return false
      setRenewals((prev) => prev.map((r) => r.id === id ? normalizeRenewal(res.renewal) : r))
      return true
    } catch (err) {
      console.error("Failed to update renewal:", err)
      return false
    }
  }

  const deleteRenewal = async (id: string): Promise<boolean> => {
    try {
      await renewalsApi.delete(id)
      setRenewals((prev) => prev.filter((r) => r.id !== id))
      return true
    } catch (err) {
      console.error("Failed to delete renewal:", err)
      return false
    }
  }

  const addRenewalReminder = async (_: any): Promise<boolean> => false
  const updateRenewalReminder = async (_id: string, _: any): Promise<boolean> => false
  const deleteRenewalReminder = async (_id: string): Promise<boolean> => false

  // ==========================================================================
  // Retainer CRUD
  // ==========================================================================

  const addRetainer = async (data: Partial<Retainer>): Promise<boolean> => {
    try {
      const res = await retainersApi.create(data)
      if (!res.retainer) return false
      await refreshRetainers()
      return true
    } catch (err) {
      console.error("Failed to add retainer:", err)
      throw err
    }
  }

  const updateRetainer = async (id: string, data: Partial<Retainer>): Promise<boolean> => {
    try {
      const res = await retainersApi.update(id, data)
      if (!res.retainer) return false
      setRetainers((prev) => prev.map((r) => r.id === id ? normalizeRetainer(res.retainer) : r))
      return true
    } catch (err) {
      console.error("Failed to update retainer:", err)
      return false
    }
  }

  const deleteRetainer = async (id: string): Promise<boolean> => {
    try {
      await retainersApi.delete(id)
      setRetainers((prev) => prev.filter((r) => r.id !== id))
      return true
    } catch (err) {
      console.error("Failed to delete retainer:", err)
      return false
    }
  }

  const renewRetainer = async (id: string, renewalDate: string): Promise<boolean> => {
    try {
      const res = await retainersApi.renew(id, { renewalDate } as any)
      if (!res.retainer) return false
      setRetainers((prev) => prev.map((r) => r.id === id ? normalizeRetainer(res.retainer) : r))
      return true
    } catch (err) {
      console.error("Failed to renew retainer:", err)
      return false
    }
  }

  const addRetainerPayment = async (data: Partial<RetainerPayment>): Promise<boolean> => {
    try {
      const res = await retainersApi.createPayment(data)
      if (!res.payment) return false
      setRetainerPayments((prev) => [res.payment, ...prev])
      return true
    } catch (err) {
      console.error("Failed to add retainer payment:", err)
      return false
    }
  }

  const updateRetainerPayment = async (id: string, data: Partial<RetainerPayment>): Promise<boolean> => {
    try {
      const res = await retainersApi.updatePayment(id, data)
      if (!res.payment) return false
      setRetainerPayments((prev) => prev.map((p) => p.id === id ? res.payment : p))
      return true
    } catch (err) {
      console.error("Failed to update retainer payment:", err)
      return false
    }
  }

  // ==========================================================================
  // Deal / Task stubs
  // ==========================================================================

  const addDeal = async (_: any): Promise<boolean> => false
  const updateDeal = async (_id: string, _: any): Promise<boolean> => false
  const deleteDeal = async (_id: string): Promise<boolean> => false
  const addTask = async (_: any): Promise<boolean> => false
  const updateTask = async (_id: string, _: any): Promise<boolean> => false
  const deleteTask = async (_id: string): Promise<boolean> => false

  // ==========================================================================
  // Context value
  // ==========================================================================

  const value: CRMContextType = {
    customers, leads, invoices, renewalReminders, renewals, users,
    deals, tasks,
    currentUser, setCurrentUser,
    leadFilters, setLeadFilters,
    isLoading, error,
    addCustomer, updateCustomer, deleteCustomer, moveCustomerToLead,
    customerPayments, addCustomerPayment, deleteCustomerPayment, refreshCustomerPayments,   // 🆕 NEW
    addLead, updateLead, deleteLead, convertLead,
    addInvoice, updateInvoice, deleteInvoice,
    addRenewal, updateRenewal, deleteRenewal,
    addRenewalReminder, updateRenewalReminder, deleteRenewalReminder,
    addDeal, updateDeal, deleteDeal,
    addTask, updateTask, deleteTask,
    refreshData, refreshCustomers, refreshLeads, refreshInvoices,
    refreshRenewals, refreshUsers, refreshDeals, refreshTasks,
    retainers, retainerPayments,
    addRetainer, updateRetainer, deleteRetainer, renewRetainer, refreshRetainers,
    addRetainerPayment, updateRetainerPayment,
  }

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>
}

// =============================================================================
// Hook
// =============================================================================

export function useCRM() {
  const ctx = useContext(CRMContext)
  if (!ctx) throw new Error("useCRM must be used within a CRMProvider")
  return ctx
}