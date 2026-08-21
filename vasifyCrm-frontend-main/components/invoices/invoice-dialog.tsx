
"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Plus, Trash2, Search, ChevronDown } from "lucide-react"
import { useCRM } from "@/contexts/crm-context"
import type { Invoice } from "@/types/crm"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["draft", "sent", "pending", "paid", "overdue", "cancelled"]

const EMPTY_ITEM = () => ({ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, amount: 0, hsn: "998313" })

const EMPTY_FORM = {
  customerId:         "",
  status:             "draft" as string,
  issueDate:          new Date().toISOString().slice(0, 10),
  dueDate:            "",
  tax:                18,
  discount:           0,
  notes:              "",
  isRecurring:        false,
  recurringFrequency: "monthly",
  recurringCycles:    "",
  recurringStartDate: "",
  recurringEndDate:   "",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
  id:          string
  description: string
  quantity:    number
  rate:        number
  amount:      number
  hsn:         string
}

interface Props {
  invoice:        Invoice | null        // null = create mode
  open:           boolean
  onOpenChange:   (open: boolean) => void
}

// ─── Customer Picker ──────────────────────────────────────────────────────────

function CustomerPicker({
  customers,
  value,
  onChange,
  disabled,
}: {
  customers: any[]
  value:     string
  onChange:  (id: string, customer: any) => void
  disabled?: boolean
}) {
  const [search, setSearch]   = useState("")
  const [open,   setOpen]     = useState(false)

  const selected  = customers.find((c) => c.id === value)
  const filtered  = customers.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm text-left transition-colors
          ${value
            ? "border-[#3A7AFE] bg-blue-50 text-gray-900"
            : "border-gray-200 bg-white text-gray-400"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#3A7AFE] cursor-pointer"}`}
      >
        <span className={value ? "text-gray-900 font-medium" : "text-gray-400"}>
          {selected
            ? `${selected.name}${selected.company ? ` — ${selected.company}` : ""}`
            : "Select customer..."}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, company, phone..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-[#3A7AFE] focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No customers found</p>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onChange(c.id, c); setOpen(false); setSearch("") }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0
                      ${c.id === value ? "bg-blue-50" : ""}`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[c.company, c.phone, c.email].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Line Item Row ────────────────────────────────────────────────────────────

function ItemRow({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  item:     LineItem
  index:    number
  onChange: (id: string, field: keyof LineItem, value: any) => void
  onRemove: (id: string) => void
  canRemove: boolean
}) {
  const inputCls = "rounded-lg border border-gray-200 focus:border-[#3A7AFE] focus:outline-none text-sm px-2 py-1.5 w-full bg-white"

  const handleQtyRate = (field: "quantity" | "rate", val: string) => {
    const n = parseFloat(val) || 0
    const qty  = field === "quantity" ? n  : item.quantity
    const rate = field === "rate"     ? n  : item.rate
    onChange(item.id, field,    n)
    onChange(item.id, "amount", parseFloat((qty * rate).toFixed(2)))
  }

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-2 text-center text-xs text-gray-400 w-8">{index + 1}</td>
      <td className="py-2 pr-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange(item.id, "description", e.target.value)}
          placeholder="Service / item description"
          className={inputCls}
        />
      </td>
      <td className="py-2 pr-2 w-20">
        <input
          type="text"
          value={item.hsn}
          onChange={(e) => onChange(item.id, "hsn", e.target.value)}
          placeholder="HSN"
          className={inputCls}
        />
      </td>
      <td className="py-2 pr-2 w-16">
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => handleQtyRate("quantity", e.target.value)}
          className={inputCls}
        />
      </td>
      <td className="py-2 pr-2 w-24">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.rate}
          onChange={(e) => handleQtyRate("rate", e.target.value)}
          className={inputCls}
        />
      </td>
      <td className="py-2 pr-2 w-24">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.amount}
          onChange={(e) => onChange(item.id, "amount", parseFloat(e.target.value) || 0)}
          className={inputCls}
        />
      </td>
      <td className="py-2 w-8 text-center">
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function InvoiceDialog({ invoice, open, onOpenChange }: Props) {
  const { customers, addInvoice, updateInvoice } = useCRM()
  const isEdit = !!invoice

  const [form,    setForm]    = useState(EMPTY_FORM)
  const [items,   setItems]   = useState<LineItem[]>([EMPTY_ITEM()])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<"details" | "items" | "settings">("details")

  // ── Populate form when editing ────────────────────────────────────────────

  useEffect(() => {
    if (!open) return

    if (invoice) {
      setForm({
        customerId:         (invoice as any).customerId   || (invoice as any).customer_id || "",
        status:             invoice.status                || "draft",
        issueDate:          invoice.issueDate
                              ? new Date(invoice.issueDate).toISOString().slice(0, 10)
                              : new Date().toISOString().slice(0, 10),
        dueDate:            invoice.dueDate
                              ? new Date(invoice.dueDate).toISOString().slice(0, 10)
                              : "",
        tax:                typeof invoice.tax === "number" ? invoice.tax : 18,
        discount:           typeof invoice.discount === "number" ? invoice.discount : 0,
        notes:              invoice.notes || "",
        isRecurring:        !!(invoice as any).isRecurring,
        recurringFrequency: (invoice as any).recurringFrequency || "monthly",
        recurringCycles:    String((invoice as any).recurringCycles || ""),
        recurringStartDate: (invoice as any).recurringStartDate
                              ? new Date((invoice as any).recurringStartDate).toISOString().slice(0, 10)
                              : "",
        recurringEndDate:   (invoice as any).recurringEndDate
                              ? new Date((invoice as any).recurringEndDate).toISOString().slice(0, 10)
                              : "",
      })
      const existingItems: LineItem[] = Array.isArray((invoice as any).items) && (invoice as any).items.length > 0
        ? (invoice as any).items.map((it: any) => ({
            id:          it.id || crypto.randomUUID(),
            description: it.description || "",
            quantity:    Number(it.quantity) || 1,
            rate:        Number(it.rate)     || 0,
            amount:      Number(it.amount)   || 0,
            hsn:         it.hsn || "998313",
          }))
        : [EMPTY_ITEM()]
      setItems(existingItems)
    } else {
      setForm(EMPTY_FORM)
      setItems([EMPTY_ITEM()])
    }
    setTab("details")
    setError(null)
  }, [open, invoice])

  // ── Customer pre-fill ─────────────────────────────────────────────────────

  const handleCustomerChange = useCallback((id: string, customer: any) => {
    setForm((prev) => ({
      ...prev,
      customerId: id,
      tax:        typeof customer.defaultTaxRate === "number"
                    ? customer.defaultTaxRate
                    : Number(customer.default_tax_rate || prev.tax),
      notes:      customer.defaultInvoiceNotes || customer.default_invoice_notes || prev.notes,
      dueDate:    (() => {
        const days = Number(customer.defaultDueDays ?? customer.default_due_days ?? 5)
        const d    = new Date()
        d.setDate(d.getDate() + days)
        return d.toISOString().slice(0, 10)
      })(),
    }))
  }, [])

  // ── Line items helpers ────────────────────────────────────────────────────

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it))
  }
  const addItem    = () => setItems((prev) => [...prev, EMPTY_ITEM()])
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const taxAmt   = (subtotal * (Number(form.tax) || 0)) / 100
  const total    = subtotal + taxAmt - (Number(form.discount) || 0)

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.customerId) { setError("Please select a customer."); setTab("details"); return }
    if (items.some((it) => !it.description.trim())) { setError("All items need a description."); setTab("items"); return }

    setSaving(true)
    try {
      const payload = {
        customerId:         form.customerId,
        status:             form.status,
        issueDate:          form.issueDate,
        dueDate:            form.dueDate || null,
        amount:             subtotal,
        tax:                Number(form.tax),
        discount:           Number(form.discount),
        total,
        notes:              form.notes || null,
        isRecurring:        form.isRecurring,
        recurringFrequency: form.isRecurring ? form.recurringFrequency : null,
        recurringCycles:    form.isRecurring && form.recurringCycles ? Number(form.recurringCycles) : null,
        recurringStartDate: form.isRecurring ? form.recurringStartDate || null : null,
        recurringEndDate:   form.isRecurring ? form.recurringEndDate   || null : null,
        items: items.map(({ description, quantity, rate, amount, hsn }) => ({
          description, quantity, rate, amount, hsn,
        })),
      }

      let ok: boolean
      if (isEdit) {
        ok = await updateInvoice(invoice!.id, {} as any, payload)
      } else {
        ok = await addInvoice({} as any, payload)
      }

      if (ok) {
        onOpenChange(false)
      } else {
        setError("Failed to save invoice. Please try again.")
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.")
    } finally {
      setSaving(false)
    }
  }

  // ── Input class ───────────────────────────────────────────────────────────

  const inputCls = "rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none text-sm px-3 py-2 w-full bg-white h-9"
  const selectCls = "rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none text-sm px-3 py-2 w-full bg-white h-9 text-gray-900"

  if (!open) return null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? "Edit Invoice" : "New Invoice"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit
                ? `Editing ${(invoice as any).invoiceNumber || "invoice"}`
                : "Create a new invoice linked to a customer"}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-0 border-b border-gray-100 shrink-0">
          {(["details", "items", "settings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 capitalize transition-colors ${
                tab === t
                  ? "border-[#3A7AFE] text-[#3A7AFE]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "details" ? "Customer & Details"
               : t === "items" ? `Line Items (${items.length})`
               : "Settings"}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Error */}
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ── Tab: Customer & Details ── */}
            {tab === "details" && (
              <div className="space-y-5">

                {/* Customer picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Customer <span className="text-red-500">*</span>
                  </label>
                  <CustomerPicker
                    customers={customers}
                    value={form.customerId}
                    onChange={handleCustomerChange}
                    disabled={isEdit}   // can't re-assign customer on edit
                  />
                  {isEdit && (
                    <p className="text-xs text-gray-400 mt-1">Customer cannot be changed after invoice is created.</p>
                  )}
                </div>

                {/* Customer preview card */}
                {form.customerId && (() => {
                  const c = customers.find((x) => x.id === form.customerId)
                  if (!c) return null
                  return (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[c.company, c.phone, c.email].filter(Boolean).join(" · ")}
                      </p>
                      {(c.city || c.state) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {[c.city, c.state, c.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  )
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                      className={selectCls}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Invoice date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Date</label>
                    <input
                      type="date"
                      value={form.issueDate}
                      onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  {/* Due date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  {/* GST rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      GST Rate (%)
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">Split as CGST + SGST</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.tax}
                      onChange={(e) => setForm((p) => ({ ...p, tax: parseFloat(e.target.value) || 0 }))}
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Notes / subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Notes / Subject
                    <span className="ml-1.5 text-xs text-gray-400 font-normal">Shown on the PDF as subject line</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    placeholder="e.g. WhatsApp Platform and Marketing Monthly Advance"
                    className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none text-sm px-3 py-2 w-full bg-white resize-none"
                  />
                </div>
              </div>
            )}

            {/* ── Tab: Line Items ── */}
            {tab === "items" && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 text-left text-xs font-semibold text-gray-400 w-8">#</th>
                        <th className="pb-2 text-left text-xs font-semibold text-gray-400">Description</th>
                        <th className="pb-2 text-left text-xs font-semibold text-gray-400 w-20">HSN/SAC</th>
                        <th className="pb-2 text-left text-xs font-semibold text-gray-400 w-16">Qty</th>
                        <th className="pb-2 text-left text-xs font-semibold text-gray-400 w-24">Rate (₹)</th>
                        <th className="pb-2 text-left text-xs font-semibold text-gray-400 w-24">Amount (₹)</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          index={idx}
                          onChange={updateItem}
                          onRemove={removeItem}
                          canRemove={items.length > 1}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 text-sm text-[#3A7AFE] hover:text-[#2563EB] font-medium px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <Plus size={15} /> Add Line Item
                </button>

                {/* Totals preview */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Sub Total</span>
                    <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      CGST {form.tax / 2}% + SGST {form.tax / 2}% = GST {form.tax}%
                    </span>
                    <span className="font-semibold text-gray-900">₹{taxAmt.toFixed(2)}</span>
                  </div>
                  {Number(form.discount) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-semibold text-red-500">−₹{Number(form.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-base font-bold border-t border-gray-200 pt-2">
                    <span className="text-gray-900">Total Payable</span>
                    <span className="text-[#3A7AFE]">₹{total.toFixed(2)}</span>
                  </div>

                  {/* Discount field inline */}
                  <div className="flex items-center gap-3 pt-2">
                    <label className="text-sm text-gray-500 whitespace-nowrap">Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.discount}
                      onChange={(e) => setForm((p) => ({ ...p, discount: parseFloat(e.target.value) || 0 }))}
                      className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none text-sm px-3 py-1.5 w-36 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Settings ── */}
            {tab === "settings" && (
              <div className="space-y-5">

                {/* Recurring toggle */}
                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Recurring Invoice</p>
                    <p className="text-xs text-gray-400 mt-0.5">Auto-generate this invoice on a schedule</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, isRecurring: !p.isRecurring }))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      form.isRecurring ? "bg-[#3A7AFE]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        form.isRecurring ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {form.isRecurring && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Frequency</label>
                      <select
                        value={form.recurringFrequency}
                        onChange={(e) => setForm((p) => ({ ...p, recurringFrequency: e.target.value }))}
                        className={selectCls}
                      >
                        {["weekly","monthly","quarterly","yearly"].map((f) => (
                          <option key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cycles (leave blank = indefinite)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.recurringCycles}
                        onChange={(e) => setForm((p) => ({ ...p, recurringCycles: e.target.value }))}
                        placeholder="e.g. 12"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={form.recurringStartDate}
                        onChange={(e) => setForm((p) => ({ ...p, recurringStartDate: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={form.recurringEndDate}
                        onChange={(e) => setForm((p) => ({ ...p, recurringEndDate: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
            {/* Total preview in footer */}
            <div className="text-sm">
              <span className="text-gray-400">Total: </span>
              <span className="font-bold text-gray-900">₹{total.toFixed(2)}</span>
              {items.length > 0 && (
                <span className="text-gray-400 ml-2 text-xs">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-5 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>

              {/* Tab navigation / submit */}
              {tab === "details" && (
                <button
                  type="button"
                  onClick={() => setTab("items")}
                  className="px-5 py-2 bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Next: Line Items →
                </button>
              )}
              {tab === "items" && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : isEdit ? "Update Invoice" : "Create Invoice"}
                </button>
              )}
              {tab === "settings" && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : isEdit ? "Update Invoice" : "Create Invoice"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}