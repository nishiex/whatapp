
"use client"

import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Send,
  Edit,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Phone,
  Mail,
  X,
  MessageCircle,
} from "lucide-react"
import type { Invoice } from "@/types/crm"

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatDate = (value: unknown) => {
  if (!value) return "—"
  const d = value instanceof Date ? value : new Date(value as string)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Number to words for Indian Rupee
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function numToWords(n: number): string {
  if (n === 0) return "Zero"
  if (n < 0) return "Minus " + numToWords(-n)
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
  if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "")
  if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "")
  if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "")
  return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "")
}

function amountInWords(amount: number): string {
  const rupees = Math.floor(amount)
  const paise = Math.round((amount - rupees) * 100)
  let words = "Indian Rupee " + numToWords(rupees) + " Only"
  if (paise > 0) words = "Indian Rupee " + numToWords(rupees) + " and " + numToWords(paise) + " Paise Only"
  return words
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-gray-100 text-gray-700 border-gray-300",       icon: <FileText className="h-3.5 w-3.5" /> },
  sent:      { label: "Sent",      color: "bg-blue-100 text-blue-800 border-blue-300",        icon: <Send className="h-3.5 w-3.5" /> },
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-800 border-yellow-300",  icon: <Clock className="h-3.5 w-3.5" /> },
  paid:      { label: "Paid",      color: "bg-emerald-100 text-emerald-800 border-emerald-300",icon: <CheckCircle className="h-3.5 w-3.5" /> },
  overdue:   { label: "Overdue",   color: "bg-red-100 text-red-800 border-red-300",           icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-300",     icon: <XCircle className="h-3.5 w-3.5" /> },
}
const getStatusMeta = (s: string) => STATUS_META[s] ?? STATUS_META.draft

// ─── COMPONENT ────────────────────────────────────────────────────────────────

interface InvoiceDetailDialogProps {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditInvoice?: (invoice: Invoice) => void
  onDownloadInvoice?: (invoice: Invoice) => void
  onSendInvoice?: (invoice: Invoice) => void
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
  onEditInvoice,
  onDownloadInvoice,
  onSendInvoice,
}: InvoiceDetailDialogProps) {
  if (!invoice) return null
  const inv = invoice as any

  // ── Computed values ────────────────────────────────────────────────────────
  const subtotal =
    inv.items?.reduce((s: number, it: any) => s + Number(it.amount ?? 0), 0) ??
    (typeof invoice.amount === "number" ? invoice.amount : Number(invoice.amount ?? 0) || 0)

  const gstRate    = invoice.tax ?? 18
  const cgstRate   = gstRate / 2
  const sgstRate   = gstRate / 2
  const cgstAmount = (subtotal * cgstRate) / 100
  const sgstAmount = (subtotal * sgstRate) / 100
  const total      = inv.total ?? subtotal + cgstAmount + sgstAmount

  const statusMeta      = getStatusMeta(invoice.status)
  const customerName    = inv.customerName    ?? inv.customer_name    ?? "—"
  const customerEmail   = inv.customerEmail   ?? inv.customer_email   ?? ""
  const customerPhone   = inv.customerPhone   ?? inv.customer_phone   ?? ""
  const customerCompany = inv.customerCompany ?? inv.customer_company ?? ""
  const customerAddress = inv.customerAddress ?? inv.customer_address ?? ""
  const placeOfSupply   = inv.placeOfSupply   ?? inv.place_of_supply  ?? "Maharashtra (27)"
  const terms           = inv.terms           ?? "Due on Receipt"
  const poNumber        = inv.poNumber        ?? inv.po_number        ?? ""

  const isOverdue =
    invoice.status !== "paid" &&
    invoice.status !== "cancelled" &&
    invoice.dueDate &&
    new Date(invoice.dueDate as string) < new Date()

  const isRecurring = !!(inv.isRecurring ?? inv.is_recurring)

  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : inv.service
      ? [{ description: inv.service, quantity: 1, rate: subtotal, amount: subtotal, hsn: "998313", cgstRate, sgstRate, cgstAmount, sgstAmount }]
      : []

  const termsLabel = (() => {
    const map: Record<string, string> = {
      due_on_receipt: "Due on Receipt",
      net_7:  "Net 7",  net_15: "Net 15",
      net_30: "Net 30", net_45: "Net 45", net_60: "Net 60",
    }
    return map[terms] ?? terms
  })()

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    /**
     * Sheet slides in from the right and covers ~80% of the viewport.
     * We override Shadcn's default width with an inline style.
     * The `side="right"` default is correct.
     */
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 overflow-hidden border-l border-slate-200 shadow-2xl"
        style={{ width: "80vw", maxWidth: "1200px" }}
        // Hide Shadcn's built-in close button — we have our own in the action bar
        hideCloseButton
      >
        {/* ── Outer flex so action bar stays sticky and content scrolls ── */}
        <div className="flex flex-col h-full bg-white">

          {/* ── ACTION BAR ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-3 bg-slate-900 shrink-0">
            <div className="flex items-center gap-2">
              <Badge className={`${statusMeta.color} border font-bold flex items-center gap-1.5 text-xs`}>
                {statusMeta.icon} {statusMeta.label}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-600 text-white border-0 text-xs font-bold">
                  <AlertTriangle className="h-3 w-3 mr-1" />Overdue
                </Badge>
              )}
              {isRecurring && (
                <Badge className="bg-violet-600 text-white border-0 text-xs font-bold">
                  <RefreshCw className="h-3 w-3 mr-1" />Recurring
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditInvoice?.(invoice)}
                className="text-white hover:bg-white/20 gap-1.5 font-semibold rounded-lg h-8"
              >
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDownloadInvoice?.(invoice)}
                className="text-white hover:bg-white/20 gap-1.5 font-semibold rounded-lg h-8"
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </Button>
              <Button
                size="sm"
                onClick={() => onSendInvoice?.(invoice)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5 font-bold rounded-lg h-8 shadow transition-all"
              >
                <MessageCircle className="h-3.5 w-3.5 text-white" /> Send on WhatsApp
              </Button>
              <button
                onClick={() => onOpenChange(false)}
                className="ml-1 text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── SCROLLABLE INVOICE BODY ─────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            {/* White "paper" with generous horizontal padding */}
            <div className="max-w-5xl mx-auto px-8 py-8">

              {/* ── Company Header ──────────────────────────────────────── */}
              <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-200">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-white font-black text-xl tracking-tight">V</span>
                  </div>
                  <div>
                    <div className="font-black text-2xl text-slate-900 mb-1">Vasify Technologies Pvt. Ltd.</div>
                    <div className="text-xs text-slate-500 space-y-0.5 leading-relaxed">
                      <div>Axiom Milan CHS, 607, 22 Datta Mandir road</div>
                      <div>Dhanakurwadi, Kandivali West, Mumbai Maharashtra 400067, India</div>
                      <div className="mt-1">
                        <span className="font-semibold text-slate-600">Company ID:</span> U62011MH2024PTC421417
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">GSTIN:</span> 27AAKCV0353N1ZW &nbsp;|&nbsp;
                        <span className="font-semibold text-slate-600">PAN:</span> AAKCV0353N
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Tax ID:</span> MUMV33878F &nbsp;|&nbsp;
                        www.vasifytech.com
                      </div>
                    </div>
                  </div>
                </div>

                {/* TAX INVOICE + meta */}
                <div className="text-right shrink-0 ml-6">
                  <div className="text-4xl font-black text-slate-900 tracking-tight mb-4">TAX INVOICE</div>
                  <div className="space-y-1.5 text-sm">
                    {[
                      ["#",               invoice.invoiceNumber ?? inv.invoice_number ?? "—"],
                      ["Invoice Date",    formatDate(inv.issueDate ?? inv.issue_date)],
                      ["Terms",          termsLabel],
                      ["Due Date",       formatDate(invoice.dueDate)],
                      ...(poNumber ? [["P.O.#", poNumber]] : []),
                      ["Place of Supply", placeOfSupply],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="flex items-center justify-end gap-4">
                        <span className="text-slate-400 font-medium text-xs">{lbl}</span>
                        <span className={`font-semibold text-sm ${lbl === "Due Date" && isOverdue ? "text-red-600" : "text-slate-800"}`}>
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Subject ─────────────────────────────────────────────── */}
              {poNumber && (
                <div className="mb-5 pb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Subject:</span>
                  <span className="text-sm text-slate-700 font-medium">{poNumber}</span>
                </div>
              )}

              {/* ── Bill To / Ship To ────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-5 mb-7">
                {(["Bill To", "Ship To"] as const).map((label) => (
                  <div key={label} className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</div>
                    <div className="space-y-1">
                      <div className="font-black text-slate-900">
                        {customerCompany || customerName}
                      </div>
                      {customerCompany && (
                        <div className="text-sm font-semibold text-slate-700">{customerName}</div>
                      )}
                      {customerAddress && (
                        <div className="text-xs text-slate-500 whitespace-pre-line leading-relaxed mt-1">
                          {customerAddress}
                        </div>
                      )}
                      {label === "Bill To" && (
                        <>
                          {customerPhone && (
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                              <Phone className="h-3 w-3" /> {customerPhone}
                            </div>
                          )}
                          {customerEmail && (
                            <div className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Mail className="h-3 w-3" /> {customerEmail}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Line Items Table ─────────────────────────────────────── */}
              <div className="mb-7 border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="text-left px-3 py-3 text-xs font-bold w-8">#</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">Item &amp; Description</th>
                      <th className="text-center px-3 py-3 text-xs font-bold w-20">HSN/SAC</th>
                      <th className="text-center px-3 py-3 text-xs font-bold w-12">Qty</th>
                      <th className="text-right px-3 py-3 text-xs font-bold w-24">Rate</th>
                      <th className="text-center px-2 py-3 text-xs font-bold w-14">CGST %</th>
                      <th className="text-right px-3 py-3 text-xs font-bold w-20">CGST Amt</th>
                      <th className="text-center px-2 py-3 text-xs font-bold w-14">SGST %</th>
                      <th className="text-right px-3 py-3 text-xs font-bold w-20">SGST Amt</th>
                      <th className="text-right px-4 py-3 text-xs font-bold w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-10 text-slate-400">No items</td>
                      </tr>
                    ) : (
                      items.map((it: any, i: number) => {
                        const itemAmount   = Number(it.amount ?? 0)
                        const itemCgstRate = it.cgstRate ?? it.cgst_rate ?? cgstRate
                        const itemSgstRate = it.sgstRate ?? it.sgst_rate ?? sgstRate
                        const itemCgstAmt  = it.cgstAmount ?? it.cgst_amount ?? (itemAmount * itemCgstRate) / 100
                        const itemSgstAmt  = it.sgstAmount ?? it.sgst_amount ?? (itemAmount * itemSgstRate) / 100
                        const hsn          = it.hsn || it.hsnCode || "998313"

                        let breakdown: { label: string; amount: number }[] | null = null
                        try {
                          breakdown = typeof it.breakdown === "string" ? JSON.parse(it.breakdown) : it.breakdown
                        } catch { breakdown = null }

                        return (
                          <tr
                            key={i}
                            className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                          >
                            <td className="px-3 py-3.5 text-slate-400 text-xs font-semibold align-top">{i + 1}</td>
                            <td className="px-4 py-3.5 align-top">
                              <div className="font-semibold text-slate-800">{it.description || "Service"}</div>
                              {Array.isArray(breakdown) && breakdown.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  {breakdown.map((b, bi) => (
                                    <div key={bi} className="text-xs text-slate-500 flex justify-between gap-4">
                                      <span>• {b.label}</span>
                                      <span className="font-medium">{formatCurrency(Number(b.amount ?? 0))}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-center text-xs text-slate-500 font-mono align-top">{hsn}</td>
                            <td className="px-3 py-3.5 text-center text-xs text-slate-600 font-semibold align-top">{it.quantity ?? 1}</td>
                            <td className="px-3 py-3.5 text-right text-sm font-semibold text-slate-800 align-top">
                              {formatCurrency(Number(it.rate ?? itemAmount))}
                            </td>
                            <td className="px-2 py-3.5 text-center text-xs text-slate-600 align-top">{itemCgstRate}%</td>
                            <td className="px-3 py-3.5 text-right text-xs font-semibold text-slate-700 align-top">
                              {formatCurrency(itemCgstAmt)}
                            </td>
                            <td className="px-2 py-3.5 text-center text-xs text-slate-600 align-top">{itemSgstRate}%</td>
                            <td className="px-3 py-3.5 text-right text-xs font-semibold text-slate-700 align-top">
                              {formatCurrency(itemSgstAmt)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-bold text-slate-900 align-top">
                              {formatCurrency(itemAmount)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Totals + Amount in Words ─────────────────────────────── */}
              <div className="flex gap-6 mb-7">
                {/* Left: words + notes + company */}
                <div className="flex-1 space-y-5">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Total In Words
                    </div>
                    <div className="text-sm font-bold text-slate-800 italic">{amountInWords(total)}</div>
                  </div>

                  {invoice.notes && (
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</div>
                      <div className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</div>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 space-y-0.5">
                    <div className="font-semibold text-slate-600">VASIFY TECHNOLOGIES PRIVATE LIMITED</div>
                    <div>www.vasifytech.com &nbsp;|&nbsp; UIN : U62011MH2024PTC421417</div>
                  </div>
                </div>

                {/* Right: summary totals */}
                <div className="w-72 shrink-0">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {[
                          { label: "Sub Total",            val: formatCurrency(subtotal),  bold: false, bg: "" },
                          { label: `CGST @ ${cgstRate}%`,  val: formatCurrency(cgstAmount), bold: false, bg: "" },
                          { label: `SGST @ ${sgstRate}%`,  val: formatCurrency(sgstAmount), bold: false, bg: "" },
                        ].map(({ label, val }) => (
                          <tr key={label} className="border-b border-slate-100">
                            <td className="px-4 py-2.5 text-sm text-slate-500">{label}</td>
                            <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-800">{val}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-900">
                          <td className="px-4 py-3 font-black text-white text-sm">Total</td>
                          <td className="px-4 py-3 text-right font-black text-white text-base">
                            {formatCurrency(total)}
                          </td>
                        </tr>
                        <tr className="bg-emerald-50 border border-emerald-200 border-t-0">
                          <td className="px-4 py-3 font-bold text-slate-700 text-sm">Balance Due</td>
                          <td className="px-4 py-3 text-right font-black text-slate-900 text-base">
                            {formatCurrency(invoice.status === "paid" ? 0 : total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Badge className={`${statusMeta.color} border font-bold flex items-center gap-1.5 text-xs px-3 py-1.5`}>
                      {statusMeta.icon} {statusMeta.label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* ── Terms & Conditions + Payment Details ─────────────────── */}
              <div className="grid grid-cols-2 gap-6 pt-5 border-t border-slate-200">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Terms &amp; Conditions
                  </div>
                  <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
                    <li>Payment due within 5 days of the invoice date.</li>
                    <li>Invoice disputes must be communicated within 15 days of the invoice date.</li>
                    <li>Contact us at sales@vasifytech.com for any payment-related inquiries.</li>
                  </ol>
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Payment Details
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-700">Vasify Technologies Pvt. Ltd.</div>
                    <div>UPI ID: vasifytechnologiesprivateli2529@aubank</div>
                    <div>A/C Number: 2502267573096282</div>
                    <div>Customer ID: 39818327</div>
                    <div>IFSC Code: AUBL0002675</div>
                    <div>Au Bank Swift Code: AUBLINBBXXX</div>
                    <div>Branch: Kandivali Mahavir Nagar</div>
                  </div>
                </div>
              </div>

              {/* ── Footer ───────────────────────────────────────────────── */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 italic">
                  This electronically generated invoice does not necessitate a signature.
                </p>
              </div>

              {/* ── Recurring info ───────────────────────────────────────── */}
              {isRecurring && (
                <div className="mt-5 bg-violet-50 border border-violet-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-black text-violet-800">Recurring Billing</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {[
                      {
                        label: "Frequency",
                        value: inv.recurringFrequency ?? inv.recurring_frequency
                          ? ((inv.recurringFrequency ?? inv.recurring_frequency).charAt(0).toUpperCase() +
                             (inv.recurringFrequency ?? inv.recurring_frequency).slice(1))
                          : "—",
                      },
                      {
                        label: "Cycles",
                        value: (inv.recurringCycles ?? inv.recurring_cycles)
                          ? `${inv.recurringCycles ?? inv.recurring_cycles} invoices`
                          : "—",
                      },
                      { label: "Start Date", value: formatDate(inv.recurringStartDate ?? inv.recurring_start_date) },
                      {
                        label: "End Date",
                        value: (inv.recurringEndDate ?? inv.recurring_end_date)
                          ? formatDate(inv.recurringEndDate ?? inv.recurring_end_date)
                          : "Open-ended",
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white border border-violet-100 rounded-lg p-2.5">
                        <div className="text-violet-500 font-black uppercase tracking-wide mb-0.5 text-[10px]">{label}</div>
                        <div className="font-bold text-violet-900">{value}</div>
                      </div>
                    ))}
                    {(inv.recurringCycles ?? inv.recurring_cycles) > 0 && (
                      <div className="col-span-2 md:col-span-4 bg-violet-100 rounded-lg px-4 py-2.5 flex justify-between">
                        <span className="font-bold text-violet-700">Total over all cycles</span>
                        <span className="font-black text-violet-900">
                          {formatCurrency(total * (inv.recurringCycles ?? inv.recurring_cycles))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>{/* /max-w-5xl */}
          </div>{/* /scrollable body */}
        </div>{/* /flex col */}
      </SheetContent>
    </Sheet>
  )
}