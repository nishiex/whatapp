export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  status: "active" | "inactive" | "prospect"
  source: string
  assignedTo: string
  tags: string[]
  notes: string
  createdAt: Date
  updatedAt: Date
  lastContactDate?: Date
  totalValue: number
  whatsappNumber?: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  source: "website" | "referral" | "social" | "advertisement" | "cold-call" | "other"
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed-won" | "closed-lost"
  priority: "low" | "medium" | "high"
  assignedTo: string
  estimatedValue: number
  notes: string
  createdAt: Date
  updatedAt: Date
  expectedCloseDate?: Date
  whatsappNumber?: string
}

export interface Deal {
  id: string
  title: string
  customerId: string
  value: number
  stage: "prospecting" | "qualification" | "proposal" | "negotiation" | "closed-won" | "closed-lost"
  probability: number
  expectedCloseDate: Date
  actualCloseDate?: Date
  assignedTo: string
  products: string[]
  notes: string
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  title: string
  description: string
  type: "call" | "email" | "meeting" | "follow-up" | "demo" | "other"
  priority: "low" | "medium" | "high"
  status: "pending" | "in-progress" | "completed" | "cancelled"
  assignedTo: string
  relatedTo: {
    type: "customer" | "lead" | "deal"
    id: string
  }
  dueDate: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  customerId: string
  invoiceNumber: string
  amount: number
  tax: number
  total: number
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
  dueDate: Date
  paidDate?: Date
  items: InvoiceItem[]
  notes: string
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "sales" | "support"
  avatar?: string
  isActive: boolean
  createdAt: Date
}

export interface RenewalReminder {
  id: string
  customerId: string
  serviceType: "whatsapp-panel" | "website" | "hosting" | "domain" | "other"
  serviceName: string
  expiryDate: Date
  reminderDays: number[]
  lastReminderSent?: Date
  status: "active" | "renewed" | "expired" | "cancelled"
  whatsappTemplate: string
  createdAt: Date
  updatedAt: Date
}

export interface Renewal {
  id: string
  customerId: string
  service: string
  amount: number
  expiryDate: string
  status: "active" | "expiring" | "expired" | "renewed"
  reminderDays?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}
