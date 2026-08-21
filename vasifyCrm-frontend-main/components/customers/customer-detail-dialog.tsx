

// "use client"

// import { useMemo } from "react"
// import { useRouter } from "next/navigation"
// import { useCRM } from "@/contexts/crm-context"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Separator } from "@/components/ui/separator"
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
// } from "@/components/ui/dialog"
// import {
//   Phone, Mail, MapPin, Calendar, Tag,
//   MessageSquare, FileText, X, Briefcase,
//   RefreshCw, IndianRupee, Building2, Globe, Edit,
//   UserCheck, TrendingUp, AlertTriangle, Clock,
//   User, DollarSign, CalendarCheck, BadgeCheck,
// } from "lucide-react"
// import type { Customer } from "@/types/crm"
// import {
//   SERVICE_LABELS, BUSINESS_TYPE_LABELS, formatDate, displayEmail,
// } from "./customers-content"

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt = (v: unknown): string => {
//   if (v == null || v === "") return "—"
//   const n = Number(v)
//   if (isNaN(n)) return "—"
//   return `₹${n.toLocaleString("en-IN")}`
// }

// const parseTags = (raw: unknown): string[] => {
//   if (!raw) return []
//   if (Array.isArray(raw)) return raw.filter(Boolean)
//   try { return JSON.parse(raw as string) } catch { return [] }
// }

// // ─── Clean notes: strip auto-generated summary blocks ─────────────────────────
// // Removes "[Auto summary]…" blocks that the backend injects so only
// // human-written notes are shown to the user.
// const cleanNotes = (raw: string | null | undefined): string => {
//   if (!raw) return ""
//   // Remove every "[Auto summary]" block (from "[Auto summary]" to the next blank line pair)
//   const stripped = raw
//     .replace(/\[Auto summary\][\s\S]*?(?=\n\n|\[Auto summary\]|$)/g, "")
//     .replace(/\[From Lead\][^\n]*/g, "")   // remove [From Lead] lines too
//     .trim()
//   return stripped
// }

// // ─── Status colours ───────────────────────────────────────────────────────────

// const STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
//   active:   { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400", label: "Active"   },
//   inactive: { badge: "bg-gray-100   text-gray-500    border-gray-200",    dot: "bg-gray-300",    label: "Inactive" },
//   prospect: { badge: "bg-blue-50    text-blue-700    border-blue-200",    dot: "bg-blue-400",    label: "Prospect" },
// }

// // ─── Invoice status colours ───────────────────────────────────────────────────

// const INV_STYLE: Record<string, string> = {
//   paid:      "bg-emerald-100 text-emerald-800 border-emerald-200",
//   overdue:   "bg-red-100     text-red-800     border-red-200",
//   pending:   "bg-amber-100   text-amber-800   border-amber-200",
//   draft:     "bg-gray-100    text-gray-600    border-gray-200",
//   sent:      "bg-blue-100    text-blue-800    border-blue-200",
//   cancelled: "bg-gray-100    text-gray-500    border-gray-200",
// }

// // ─── Small reusable atoms ─────────────────────────────────────────────────────

// function Label({ children }: { children: React.ReactNode }) {
//   return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{children}</p>
// }

// function Value({ children, empty }: { children: React.ReactNode; empty?: boolean }) {
//   return (
//     <p className={`text-sm font-medium ${empty ? "text-gray-300" : "text-gray-800"}`}>
//       {children}
//     </p>
//   )
// }

// // A simple labelled field used in grids
// function Field({ label, value, icon: Icon, accent }: {
//   label: string
//   value?: React.ReactNode
//   icon?: React.ElementType
//   accent?: string
// }) {
//   const isEmpty = !value || value === "—"
//   return (
//     <div className="flex items-start gap-2.5">
//       {Icon && (
//         <div className={`mt-0.5 shrink-0 ${accent ?? "text-gray-300"}`}>
//           <Icon className="h-3.5 w-3.5" />
//         </div>
//       )}
//       <div className="min-w-0">
//         <Label>{label}</Label>
//         <Value empty={isEmpty}>{isEmpty ? "—" : value}</Value>
//       </div>
//     </div>
//   )
// }

// // Section card wrapper
// function Section({ title, icon: Icon, children, accent, extra }: {
//   title: string
//   icon?: React.ElementType
//   children: React.ReactNode
//   accent?: string
//   extra?: React.ReactNode
// }) {
//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
//       <div className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-100 ${accent ?? "bg-white"}`}>
//         <div className="flex items-center gap-2">
//           {Icon && <Icon className="h-4 w-4 text-gray-400" />}
//           <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
//         </div>
//         {extra}
//       </div>
//       <div className="px-5 py-4">{children}</div>
//     </div>
//   )
// }

// // Stat highlight tile used in billing sidebar
// function StatTile({ label, value, sub, color }: {
//   label: string; value: string; sub?: string; color: string
// }) {
//   return (
//     <div className={`rounded-xl px-4 py-3 border ${color}`}>
//       <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">{label}</p>
//       <p className="text-xl font-bold">{value}</p>
//       {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
//     </div>
//   )
// }

// // ─── Props ────────────────────────────────────────────────────────────────────

// interface Props {
//   open:                boolean
//   onOpenChange:        (open: boolean) => void
//   customer:            Customer | null
//   onCallCustomer?:     (c: Customer) => void
//   onEmailCustomer?:    (c: Customer) => void
//   onWhatsAppCustomer?: (c: Customer) => void
//   onScheduleMeeting?:  (c: Customer) => void
//   onEditCustomer?:     (c: Customer) => void
// }

// // ─── Main component ───────────────────────────────────────────────────────────

// export function CustomerDetailDialog({
//   open, onOpenChange, customer,
//   onCallCustomer, onEmailCustomer, onWhatsAppCustomer,
//   onScheduleMeeting, onEditCustomer,
// }: Props) {
//   const { invoices = [] } = useCRM()
//   const router = useRouter()

//   // ── Invoice stats ────────────────────────────────────────────────────────
//   const customerInvoices = useMemo(
//     () => customer ? invoices.filter((i) => i.customerId === customer.id || (i as any).customer_id === customer.id) : [],
//     [invoices, customer]
//   )
//   const paidAmt    = useMemo(() => customerInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (Number(i.total) || 0), 0), [customerInvoices])
//   const pendingAmt = useMemo(() => customerInvoices.filter((i) => ["pending","draft","sent"].includes(i.status ?? "")).reduce((s, i) => s + (Number(i.total) || 0), 0), [customerInvoices])
//   const overdueAmt = useMemo(() => customerInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (Number(i.total) || 0), 0), [customerInvoices])
//   const overdueCount = useMemo(() => customerInvoices.filter((i) => i.status === "overdue").length, [customerInvoices])

//   // ── Derived fields from customer ─────────────────────────────────────────
//   const c = customer
//   const svc          = c?.service ?? ""
//   const tags         = parseTags(c?.tags)
//   const st           = STATUS_STYLE[c?.status ?? "active"] ?? STATUS_STYLE.active
//   const notes        = cleanNotes(c?.notes)  // ← strips [Auto summary] blocks

//   // ── Renewal badge for retainer ───────────────────────────────────────────
//   const renewalBadge = useMemo(() => {
//     if (!c?.recurringEnabled || !(c as any).renewalDate) return null
//     const days = Math.ceil((new Date((c as any).renewalDate).getTime() - Date.now()) / 86_400_000)
//     if (days < 0)   return { label: "Expired",            cls: "bg-red-50 text-red-700 border-red-200",       icon: "expired" as const }
//     if (days === 0) return { label: "Expires today",       cls: "bg-red-50 text-red-700 border-red-200",       icon: "expired" as const }
//     if (days <= 7)  return { label: `Renews in ${days}d`,  cls: "bg-amber-50 text-amber-700 border-amber-200", icon: "soon" as const    }
//     if (days <= 30) return { label: `Renews in ${days}d`,  cls: "bg-blue-50 text-blue-700 border-blue-200",    icon: "soon" as const    }
//     return null
//   }, [c])

//   // ── Empty guard ──────────────────────────────────────────────────────────
//   if (!c) {
//     return (
//       <Dialog open={open} onOpenChange={onOpenChange}>
//         <DialogContent className="max-w-sm rounded-2xl">
//           <DialogHeader>
//             <DialogTitle>No client selected</DialogTitle>
//             <DialogDescription>Select a client to view their details.</DialogDescription>
//           </DialogHeader>
//         </DialogContent>
//       </Dialog>
//     )
//   }

//   const visibleInvoices = customerInvoices.slice(0, 4)
//   const moreCount       = customerInvoices.length - visibleInvoices.length

//   // ─── Render ───────────────────────────────────────────────────────────────
//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="max-w-5xl w-full sm:max-w-[92vw] h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border border-gray-100 shadow-2xl">

//         {/* ══ Fixed header bar ════════════════════════════════════════════ */}
//         <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 bg-white shrink-0">

//           {/* Avatar + name + badges */}
//           <div className="flex items-start gap-4 min-w-0 flex-1">
//             <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100 flex items-center justify-center shrink-0">
//               <span className="text-lg font-bold text-[#3A7AFE]">
//                 {c.name?.charAt(0)?.toUpperCase() ?? "C"}
//               </span>
//             </div>

//             <div className="min-w-0 flex-1">
//               <h2 className="text-lg font-bold text-gray-900 truncate leading-tight">{c.name || "Unnamed"}</h2>
//               {c.company && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.company}</p>}

//               {/* Status + service + alert badges */}
//               <div className="flex flex-wrap gap-1.5 mt-2">
//                 {/* Status */}
//                 <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-0.5 rounded-full ${st.badge}`}>
//                   <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
//                   {st.label}
//                 </span>

//                 {/* Service */}
//                 {svc && (
//                   <span className="inline-flex items-center gap-1 text-xs font-semibold bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full">
//                     <Briefcase className="h-3 w-3" />
//                     {SERVICE_LABELS[svc] ?? svc}
//                   </span>
//                 )}

//                 {/* Retainer badge */}
//                 {c.recurringEnabled && (
//                   <span className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
//                     <RefreshCw className="h-3 w-3" />
//                     Retainer
//                   </span>
//                 )}

//                 {/* Renewal warning */}
//                 {renewalBadge && (
//                   <span className={`inline-flex items-center gap-1 text-xs font-semibold border px-2.5 py-0.5 rounded-full ${renewalBadge.cls}`}>
//                     {renewalBadge.icon === "expired"
//                       ? <AlertTriangle className="h-3 w-3" />
//                       : <Clock className="h-3 w-3" />}
//                     {renewalBadge.label}
//                   </span>
//                 )}

//                 {/* Overdue invoices warning */}
//                 {overdueCount > 0 && (
//                   <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full">
//                     <AlertTriangle className="h-3 w-3" />
//                     {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}
//                   </span>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Header action buttons */}
//           <div className="flex items-center gap-2 shrink-0">
//             {onEditCustomer && (
//               <Button
//                 variant="outline" size="sm"
//                 onClick={() => { onOpenChange(false); onEditCustomer(c) }}
//                 className="rounded-xl border-gray-200 text-gray-600 text-xs font-semibold px-3 h-8 gap-1.5 hidden sm:flex"
//               >
//                 <Edit className="h-3.5 w-3.5" />
//                 Edit
//               </Button>
//             )}
//             <button
//               onClick={() => onOpenChange(false)}
//               className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
//             >
//               <X className="h-4 w-4" />
//             </button>
//           </div>
//         </div>

//         {/* ══ Scrollable body ═════════════════════════════════════════════ */}
//         <div className="flex-1 overflow-y-auto bg-[#F4F6FA]">
//           <div className="px-5 py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

//             {/* ════ LEFT / MAIN column (2/3) ════════════════════════════ */}
//             <div className="lg:col-span-2 space-y-5">

//               {/* ── Contact Details ────────────────────────────────────── */}
//               <Section title="Contact Details" icon={User}>
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
//                   <Field label="Phone" value={c.phone} icon={Phone} accent="text-blue-400" />

//                   {(c as any).whatsappNumber && c.phone !== (c as any).whatsappNumber ? (
//                     <Field label="WhatsApp" value={(c as any).whatsappNumber} icon={MessageSquare} accent="text-green-500" />
//                   ) : null}

//                   {displayEmail(c.email) ? (
//                     <Field
//                       label="Email"
//                       icon={Mail}
//                       accent="text-violet-400"
//                       value={
//                         <a href={`mailto:${c.email}`} className="text-[#3A7AFE] hover:underline break-all">
//                           {displayEmail(c.email)}
//                         </a>
//                       }
//                     />
//                   ) : null}

//                   {c.company && <Field label="Company" value={c.company} icon={Building2} accent="text-gray-400" />}

//                   {(c.address || c.city) && (
//                     <Field
//                       label="Address"
//                       icon={MapPin}
//                       accent="text-rose-400"
//                       value={[c.address, c.city, c.state, c.zipCode].filter(Boolean).join(", ")}
//                     />
//                   )}

//                   <Field label="Country" value={c.country ?? "India"} icon={Globe} accent="text-gray-400" />
//                 </div>

//                 {/* Tags */}
//                 {tags.length > 0 && (
//                   <>
//                     <Separator className="my-4" />
//                     <div>
//                       <Label>Tags</Label>
//                       <div className="flex flex-wrap gap-1.5 mt-1.5">
//                         {tags.map((t) => (
//                           <span key={t} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 font-medium px-2.5 py-0.5 rounded-full">
//                             {t}
//                           </span>
//                         ))}
//                       </div>
//                     </div>
//                   </>
//                 )}
//               </Section>

//               {/* ── Deal & Sales Info ──────────────────────────────────── */}
//               <Section title="Deal & Sales Info" icon={TrendingUp}>
//                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
//                   <Field
//                     label="Service"
//                     icon={Briefcase}
//                     accent="text-violet-500"
//                     value={SERVICE_LABELS[svc] ?? svc || undefined}
//                   />
//                   <Field
//                     label="Business Type"
//                     icon={Building2}
//                     accent="text-blue-400"
//                     value={
//                       BUSINESS_TYPE_LABELS[(c as any).businessType ?? ""] ??
//                       (c as any).businessType ?? undefined
//                     }
//                   />
//                   <Field
//                     label="Assigned User"
//                     icon={UserCheck}
//                     accent="text-indigo-500"
//                     value={(c as any).assignedUser ?? undefined}
//                   />
//                   <Field
//                     label="Lead Source"
//                     icon={Globe}
//                     accent="text-gray-400"
//                     value={c.source?.replace(/-/g, " ")}
//                   />
//                   <Field
//                     label="Onboarding Date"
//                     icon={Calendar}
//                     accent="text-emerald-500"
//                     value={formatDate((c as any).onboardingDate ?? c.createdAt)}
//                   />
//                   <Field
//                     label="Last Contact"
//                     icon={Clock}
//                     accent="text-amber-500"
//                     value={formatDate(c.lastContactDate)}
//                   />
//                   {/* NEW: Closure Date */}
//                   {(c as any).closureDate && (
//                     <Field
//                       label="Closure Date"
//                       icon={CalendarCheck}
//                       accent="text-rose-500"
//                       value={formatDate((c as any).closureDate)}
//                     />
//                   )}
//                   {/* NEW: Deal Value */}
//                   {(c as any).dealValue != null && (
//                     <Field
//                       label="Deal Value"
//                       icon={DollarSign}
//                       accent="text-emerald-600"
//                       value={fmt((c as any).dealValue)}
//                     />
//                   )}
//                 </div>
//               </Section>

//               {/* ── Retainer Plan (only if enabled) ───────────────────── */}
//               {c.recurringEnabled && (
//                 <Section
//                   title="Monthly Retainer Plan"
//                   icon={RefreshCw}
//                   accent={renewalBadge?.icon === "expired" ? "bg-red-50" : renewalBadge?.icon === "soon" ? "bg-amber-50" : "bg-white"}
//                   extra={
//                     renewalBadge ? (
//                       <span className={`inline-flex items-center gap-1 text-[11px] font-semibold border px-2 py-0.5 rounded-full ${renewalBadge.cls}`}>
//                         {renewalBadge.icon === "expired"
//                           ? <AlertTriangle className="h-3 w-3" />
//                           : <Clock className="h-3 w-3" />}
//                         {renewalBadge.label}
//                       </span>
//                     ) : null
//                   }
//                 >
//                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
//                     <Field label="Frequency" icon={RefreshCw} value={c.recurringInterval ?? "Monthly"} />
//                     <Field label="Amount" icon={IndianRupee} accent="text-violet-500" value={fmt(c.recurringAmount)} />
//                     <Field label="Plan / Service" icon={Briefcase} value={c.recurringService ?? undefined} />
//                     <Field label="Next Renewal" icon={Calendar} accent="text-emerald-500" value={formatDate((c as any).renewalDate)} />
//                   </div>
//                 </Section>
//               )}

//               {/* ── Notes ─────────────────────────────────────────────── */}
//               {/* Only show if there are human-written notes (after stripping auto-blocks) */}
//               {notes && (
//                 <Section title="Notes" icon={FileText}>
//                   <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
//                     {notes}
//                   </p>
//                 </Section>
//               )}

//               {/* ── Invoices ──────────────────────────────────────────── */}
//               <Section
//                 title="Invoices"
//                 icon={FileText}
//                 extra={
//                   customerInvoices.length > 0 ? (
//                     <span className="text-xs text-gray-400 font-medium">
//                       {customerInvoices.length} total
//                     </span>
//                   ) : null
//                 }
//               >
//                 {customerInvoices.length === 0 ? (
//                   <div className="text-center py-8">
//                     <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
//                     <p className="text-sm text-gray-400">No invoices yet</p>
//                     <button
//                       type="button"
//                       onClick={() => { onOpenChange(false); router.push(`/invoices/new?customerId=${c.id}`) }}
//                       className="mt-3 text-xs text-[#3A7AFE] font-semibold hover:underline"
//                     >
//                       + Create first invoice
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="space-y-2">
//                     {visibleInvoices.map((inv) => (
//                       <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
//                         <div className="min-w-0">
//                           <p className="text-xs font-bold font-mono text-gray-700">{inv.invoiceNumber}</p>
//                           <p className="text-[11px] text-gray-400 mt-0.5">
//                             Issued {formatDate(inv.issueDate)}
//                             {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ""}
//                           </p>
//                         </div>
//                         <div className="flex items-center gap-2 shrink-0">
//                           <p className="text-sm font-bold text-gray-800">{fmt(inv.total)}</p>
//                           <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${INV_STYLE[inv.status ?? "draft"] ?? INV_STYLE.draft}`}>
//                             {(inv.status ?? "draft").charAt(0).toUpperCase() + (inv.status ?? "draft").slice(1)}
//                           </span>
//                         </div>
//                       </div>
//                     ))}

//                     {moreCount > 0 && (
//                       <button
//                         type="button"
//                         onClick={() => { onOpenChange(false); router.push(`/invoices?customerId=${c.id}`) }}
//                         className="w-full py-2.5 text-xs text-[#3A7AFE] font-semibold hover:bg-blue-50 rounded-xl transition-colors"
//                       >
//                         View {moreCount} more invoice{moreCount !== 1 ? "s" : ""} →
//                       </button>
//                     )}
//                   </div>
//                 )}
//               </Section>
//             </div>

//             {/* ════ RIGHT sidebar (1/3) ════════════════════════════════ */}
//             <div className="space-y-5">

//               {/* ── Quick Actions ──────────────────────────────────────── */}
//               <Section title="Quick Actions">
//                 <div className="space-y-2">
//                   <button
//                     type="button"
//                     disabled={!c.phone}
//                     onClick={() => onCallCustomer?.(c)}
//                     className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 hover:text-[#3A7AFE] text-sm font-medium text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
//                   >
//                     <Phone className="h-4 w-4 shrink-0" />
//                     Call Client
//                   </button>
//                   <button
//                     type="button"
//                     disabled={!(c as any).whatsappNumber && !c.phone}
//                     onClick={() => onWhatsAppCustomer?.(c)}
//                     className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-100 hover:text-green-700 text-sm font-medium text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
//                   >
//                     <MessageSquare className="h-4 w-4 shrink-0" />
//                     WhatsApp
//                   </button>
//                   {displayEmail(c.email) && (
//                     <button
//                       type="button"
//                       onClick={() => onEmailCustomer ? onEmailCustomer(c) : window.open(`mailto:${c.email}`, "_self")}
//                       className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-violet-50 hover:border-violet-100 hover:text-violet-700 text-sm font-medium text-gray-700 transition-colors"
//                     >
//                       <Mail className="h-4 w-4 shrink-0" />
//                       Send Email
//                     </button>
//                   )}
//                   <button
//                     type="button"
//                     onClick={() => onScheduleMeeting?.(c)}
//                     className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-100 hover:text-amber-700 text-sm font-medium text-gray-700 transition-colors"
//                   >
//                     <Calendar className="h-4 w-4 shrink-0" />
//                     Schedule Meeting
//                   </button>
//                   <button
//                     type="button"
//                     onClick={() => { onOpenChange(false); router.push(`/invoices/new?customerId=${c.id}`) }}
//                     className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-700 text-sm font-medium text-gray-700 transition-colors"
//                   >
//                     <FileText className="h-4 w-4 shrink-0" />
//                     Create Invoice
//                   </button>
//                   {onEditCustomer && (
//                     <button
//                       type="button"
//                       onClick={() => { onOpenChange(false); onEditCustomer(c) }}
//                       className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors sm:hidden"
//                     >
//                       <Edit className="h-4 w-4 shrink-0" />
//                       Edit Client
//                     </button>
//                   )}
//                 </div>
//               </Section>

//               {/* ── Billing Summary ────────────────────────────────────── */}
//               <Section title="Billing Summary" icon={IndianRupee}>
//                 <div className="space-y-2.5">
//                   <StatTile
//                     label="Total Deal Value"
//                     value={fmt(c.totalValue)}
//                     color="bg-gray-50 border-gray-100 text-gray-700"
//                   />
//                   {(c as any).dealValue != null && (
//                     <StatTile
//                       label="This Deal"
//                       value={fmt((c as any).dealValue)}
//                       color="bg-blue-50 border-blue-100 text-blue-700"
//                     />
//                   )}
//                   <StatTile
//                     label="Revenue Received"
//                     value={fmt(paidAmt)}
//                     sub={`${customerInvoices.filter((i) => i.status === "paid").length} paid invoice${customerInvoices.filter((i) => i.status === "paid").length !== 1 ? "s" : ""}`}
//                     color="bg-emerald-50 border-emerald-100 text-emerald-700"
//                   />
//                   {pendingAmt > 0 && (
//                     <StatTile
//                       label="Pending Amount"
//                       value={fmt(pendingAmt)}
//                       color="bg-amber-50 border-amber-100 text-amber-700"
//                     />
//                   )}
//                   {overdueAmt > 0 && (
//                     <StatTile
//                       label="Overdue"
//                       value={fmt(overdueAmt)}
//                       sub={`${overdueCount} overdue invoice${overdueCount !== 1 ? "s" : ""}`}
//                       color="bg-red-50 border-red-200 text-red-700"
//                     />
//                   )}
//                   {c.recurringEnabled && c.recurringAmount && (
//                     <StatTile
//                       label={`Monthly Retainer`}
//                       value={fmt(c.recurringAmount)}
//                       sub={`per ${c.recurringInterval ?? "month"}`}
//                       color="bg-violet-50 border-violet-100 text-violet-700"
//                     />
//                   )}
//                 </div>

//                 {/* Key dates */}
//                 <Separator className="my-4" />
//                 <div className="space-y-3">
//                   <Field label="Client Since" icon={BadgeCheck} accent="text-gray-400" value={formatDate(c.createdAt)} />
//                   {(c as any).closureDate && (
//                     <Field label="Closure Date" icon={CalendarCheck} accent="text-rose-400" value={formatDate((c as any).closureDate)} />
//                   )}
//                   {c.recurringEnabled && (c as any).renewalDate && (
//                     <Field label="Next Renewal" icon={RefreshCw} accent="text-indigo-400" value={formatDate((c as any).renewalDate)} />
//                   )}
//                 </div>
//               </Section>

//             </div>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }



//testing



"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  Phone, Mail, MapPin, Calendar, Tag,
  MessageSquare, FileText, X, Briefcase,
  RefreshCw, IndianRupee, Building2, Globe, Edit,
  UserCheck, TrendingUp, AlertTriangle, Clock,
  User, DollarSign, CalendarCheck, BadgeCheck,
} from "lucide-react"
import type { Customer } from "@/types/crm"
import {
  SERVICE_LABELS, BUSINESS_TYPE_LABELS, formatDate, displayEmail,
} from "./customers-content"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: unknown): string => {
  if (v == null || v === "") return "—"
  const n = Number(v)
  if (isNaN(n)) return "—"
  return `₹${n.toLocaleString("en-IN")}`
}

const parseTags = (raw: unknown): string[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try { return JSON.parse(raw as string) } catch { return [] }
}

// ─── Clean notes: strip auto-generated summary blocks ─────────────────────────
// Removes "[Auto summary]…" blocks that the backend injects so only
// human-written notes are shown to the user.
const cleanNotes = (raw: string | null | undefined): string => {
  if (!raw) return ""
  // Remove every "[Auto summary]" block (from "[Auto summary]" to the next blank line pair)
  const stripped = raw
    .replace(/\[Auto summary\][\s\S]*?(?=\n\n|\[Auto summary\]|$)/g, "")
    .replace(/\[From Lead\][^\n]*/g, "")   // remove [From Lead] lines too
    .trim()
  return stripped
}

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  active:   { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400", label: "Active"   },
  inactive: { badge: "bg-gray-100   text-gray-500    border-gray-200",    dot: "bg-gray-300",    label: "Inactive" },
  prospect: { badge: "bg-blue-50    text-blue-700    border-blue-200",    dot: "bg-blue-400",    label: "Prospect" },
}

// ─── Invoice status colours ───────────────────────────────────────────────────

const INV_STYLE: Record<string, string> = {
  paid:      "bg-emerald-100 text-emerald-800 border-emerald-200",
  overdue:   "bg-red-100     text-red-800     border-red-200",
  pending:   "bg-amber-100   text-amber-800   border-amber-200",
  draft:     "bg-gray-100    text-gray-600    border-gray-200",
  sent:      "bg-blue-100    text-blue-800    border-blue-200",
  cancelled: "bg-gray-100    text-gray-500    border-gray-200",
}

// ─── Small reusable atoms ─────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{children}</p>
}

function Value({ children, empty }: { children: React.ReactNode; empty?: boolean }) {
  return (
    <p className={`text-sm font-medium ${empty ? "text-gray-300" : "text-gray-800"}`}>
      {children}
    </p>
  )
}

// A simple labelled field used in grids
function Field({ label, value, icon: Icon, accent }: {
  label: string
  value?: React.ReactNode
  icon?: React.ElementType
  accent?: string
}) {
  const isEmpty = !value || value === "—"
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className={`mt-0.5 shrink-0 ${accent ?? "text-gray-300"}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="min-w-0">
        <Label>{label}</Label>
        <Value empty={isEmpty}>{isEmpty ? "—" : value}</Value>
      </div>
    </div>
  )
}

// Section card wrapper
function Section({ title, icon: Icon, children, accent, extra }: {
  title: string
  icon?: React.ElementType
  children: React.ReactNode
  accent?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-100 ${accent ?? "bg-white"}`}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
        {extra}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// Stat highlight tile used in billing sidebar
function StatTile({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className={`rounded-xl px-4 py-3 border ${color}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:                boolean
  onOpenChange:        (open: boolean) => void
  customer:            Customer | null
  onCallCustomer?:     (c: Customer) => void
  onEmailCustomer?:    (c: Customer) => void
  onWhatsAppCustomer?: (c: Customer) => void
  onScheduleMeeting?:  (c: Customer) => void
  onEditCustomer?:     (c: Customer) => void
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerDetailDialog({
  open, onOpenChange, customer,
  onCallCustomer, onEmailCustomer, onWhatsAppCustomer,
  onScheduleMeeting, onEditCustomer,
}: Props) {
  const { invoices = [] } = useCRM()
  const router = useRouter()

  // ── Invoice stats ────────────────────────────────────────────────────────
  const customerInvoices = useMemo(
    () => customer ? invoices.filter((i) => i.customerId === customer.id || (i as any).customer_id === customer.id) : [],
    [invoices, customer]
  )
  const paidAmt    = useMemo(() => customerInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (Number(i.total) || 0), 0), [customerInvoices])
  const pendingAmt = useMemo(() => customerInvoices.filter((i) => ["pending","draft","sent"].includes(i.status ?? "")).reduce((s, i) => s + (Number(i.total) || 0), 0), [customerInvoices])
  const overdueAmt = useMemo(() => customerInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (Number(i.total) || 0), 0), [customerInvoices])
  const overdueCount = useMemo(() => customerInvoices.filter((i) => i.status === "overdue").length, [customerInvoices])

  // ── Derived fields from customer ─────────────────────────────────────────
  const c = customer
  const svc          = c?.service ?? ""
  const tags         = parseTags(c?.tags)
  const st           = STATUS_STYLE[c?.status ?? "active"] ?? STATUS_STYLE.active
  const notes        = cleanNotes(c?.notes)  // ← strips [Auto summary] blocks

  // ── Renewal badge for retainer ───────────────────────────────────────────
  const renewalBadge = useMemo(() => {
    if (!c?.recurringEnabled || !(c as any).renewalDate) return null
    const days = Math.ceil((new Date((c as any).renewalDate).getTime() - Date.now()) / 86_400_000)
    if (days < 0)   return { label: "Expired",            cls: "bg-red-50 text-red-700 border-red-200",       icon: "expired" as const }
    if (days === 0) return { label: "Expires today",       cls: "bg-red-50 text-red-700 border-red-200",       icon: "expired" as const }
    if (days <= 7)  return { label: `Renews in ${days}d`,  cls: "bg-amber-50 text-amber-700 border-amber-200", icon: "soon" as const    }
    if (days <= 30) return { label: `Renews in ${days}d`,  cls: "bg-blue-50 text-blue-700 border-blue-200",    icon: "soon" as const    }
    return null
  }, [c])

  // ── Empty guard ──────────────────────────────────────────────────────────
  if (!c) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>No client selected</DialogTitle>
            <DialogDescription>Select a client to view their details.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const visibleInvoices = customerInvoices.slice(0, 4)
  const moreCount       = customerInvoices.length - visibleInvoices.length

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full sm:max-w-[92vw] h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border border-gray-100 shadow-2xl">

        {/* ══ Fixed header bar ════════════════════════════════════════════ */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 bg-white shrink-0">

          {/* Avatar + name + badges */}
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-100 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-[#3A7AFE]">
                {c.name?.charAt(0)?.toUpperCase() ?? "C"}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-gray-900 truncate leading-tight">{c.name || "Unnamed"}</h2>
              {c.company && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.company}</p>}

              {/* Status + service + alert badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {/* Status */}
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-2.5 py-0.5 rounded-full ${st.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>

                {/* Service */}
                {svc && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full">
                    <Briefcase className="h-3 w-3" />
                    {SERVICE_LABELS[svc] ?? svc}
                  </span>
                )}

                {/* Retainer badge */}
                {c.recurringEnabled && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                    <RefreshCw className="h-3 w-3" />
                    Retainer
                  </span>
                )}

                {/* Renewal warning */}
                {renewalBadge && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold border px-2.5 py-0.5 rounded-full ${renewalBadge.cls}`}>
                    {renewalBadge.icon === "expired"
                      ? <AlertTriangle className="h-3 w-3" />
                      : <Clock className="h-3 w-3" />}
                    {renewalBadge.label}
                  </span>
                )}

                {/* Overdue invoices warning */}
                {overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueCount} overdue invoice{overdueCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onEditCustomer && (
              <Button
                variant="outline" size="sm"
                onClick={() => { onOpenChange(false); onEditCustomer(c) }}
                className="rounded-xl border-gray-200 text-gray-600 text-xs font-semibold px-3 h-8 gap-1.5 hidden sm:flex"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ══ Scrollable body ═════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto bg-[#F4F6FA]">
          <div className="px-5 py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ════ LEFT / MAIN column (2/3) ════════════════════════════ */}
            <div className="lg:col-span-2 space-y-5">

              {/* ── Contact Details ────────────────────────────────────── */}
              <Section title="Contact Details" icon={User}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="Phone" value={c.phone} icon={Phone} accent="text-blue-400" />

                  {(c as any).whatsappNumber && c.phone !== (c as any).whatsappNumber ? (
                    <Field label="WhatsApp" value={(c as any).whatsappNumber} icon={MessageSquare} accent="text-green-500" />
                  ) : null}

                  {displayEmail(c.email) ? (
                    <Field
                      label="Email"
                      icon={Mail}
                      accent="text-violet-400"
                      value={
                        <a href={`mailto:${c.email}`} className="text-[#3A7AFE] hover:underline break-all">
                          {displayEmail(c.email)}
                        </a>
                      }
                    />
                  ) : null}

                  {c.company && <Field label="Company" value={c.company} icon={Building2} accent="text-gray-400" />}

                  {(c.address || c.city) && (
                    <Field
                      label="Address"
                      icon={MapPin}
                      accent="text-rose-400"
                      value={[c.address, c.city, c.state, c.zipCode].filter(Boolean).join(", ")}
                    />
                  )}

                  <Field label="Country" value={c.country ?? "India"} icon={Globe} accent="text-gray-400" />
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {tags.map((t) => (
                          <span key={t} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 font-medium px-2.5 py-0.5 rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </Section>

              {/* ── Deal & Sales Info ──────────────────────────────────── */}
              <Section title="Deal & Sales Info" icon={TrendingUp}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <Field
                    label="Service"
                    icon={Briefcase}
                    accent="text-violet-500"
                    value={SERVICE_LABELS[svc] ?? svc || undefined}
                  />
                  <Field
                    label="Business Type"
                    icon={Building2}
                    accent="text-blue-400"
                    value={
                      BUSINESS_TYPE_LABELS[(c as any).businessType ?? ""] ??
                      (c as any).businessType ?? undefined
                    }
                  />
                  <Field
                    label="Assigned User"
                    icon={UserCheck}
                    accent="text-indigo-500"
                    value={(c as any).assignedUser ?? undefined}
                  />
                  <Field
                    label="Lead Source"
                    icon={Globe}
                    accent="text-gray-400"
                    value={c.source?.replace(/-/g, " ")}
                  />
                  <Field
                    label="Onboarding Date"
                    icon={Calendar}
                    accent="text-emerald-500"
                    value={formatDate((c as any).onboardingDate ?? c.createdAt)}
                  />
                  <Field
                    label="Last Contact"
                    icon={Clock}
                    accent="text-amber-500"
                    value={formatDate(c.lastContactDate)}
                  />
                  {/* NEW: Closure Date */}
                  {(c as any).closureDate && (
                    <Field
                      label="Closure Date"
                      icon={CalendarCheck}
                      accent="text-rose-500"
                      value={formatDate((c as any).closureDate)}
                    />
                  )}
                  {/* NEW: Deal Value */}
                  {(c as any).dealValue != null && (
                    <Field
                      label="Deal Value"
                      icon={DollarSign}
                      accent="text-emerald-600"
                      value={fmt((c as any).dealValue)}
                    />
                  )}
                </div>
              </Section>

              {/* ── Retainer Plan (only if enabled) ───────────────────── */}
              {c.recurringEnabled && (
                <Section
                  title="Monthly Retainer Plan"
                  icon={RefreshCw}
                  accent={renewalBadge?.icon === "expired" ? "bg-red-50" : renewalBadge?.icon === "soon" ? "bg-amber-50" : "bg-white"}
                  extra={
                    renewalBadge ? (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold border px-2 py-0.5 rounded-full ${renewalBadge.cls}`}>
                        {renewalBadge.icon === "expired"
                          ? <AlertTriangle className="h-3 w-3" />
                          : <Clock className="h-3 w-3" />}
                        {renewalBadge.label}
                      </span>
                    ) : null
                  }
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                    <Field label="Frequency" icon={RefreshCw} value={c.recurringInterval ?? "Monthly"} />
                    <Field label="Amount" icon={IndianRupee} accent="text-violet-500" value={fmt(c.recurringAmount)} />
                    <Field label="Plan / Service" icon={Briefcase} value={c.recurringService ?? undefined} />
                    <Field label="Next Renewal" icon={Calendar} accent="text-emerald-500" value={formatDate((c as any).renewalDate)} />
                  </div>
                </Section>
              )}

              {/* ── Notes ─────────────────────────────────────────────── */}
              {/* Only show if there are human-written notes (after stripping auto-blocks) */}
              {notes && (
                <Section title="Notes" icon={FileText}>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                    {notes}
                  </p>
                </Section>
              )}

              {/* ── Invoices ──────────────────────────────────────────── */}
              <Section
                title="Invoices"
                icon={FileText}
                extra={
                  customerInvoices.length > 0 ? (
                    <span className="text-xs text-gray-400 font-medium">
                      {customerInvoices.length} total
                    </span>
                  ) : null
                }
              >
                {customerInvoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No invoices yet</p>
                    <button
                      type="button"
                      onClick={() => { onOpenChange(false); router.push(`/invoices/new?customerId=${c.id}`) }}
                      className="mt-3 text-xs text-[#3A7AFE] font-semibold hover:underline"
                    >
                      + Create first invoice
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleInvoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-bold font-mono text-gray-700">{inv.invoiceNumber}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Issued {formatDate(inv.issueDate)}
                            {inv.dueDate ? ` · Due ${formatDate(inv.dueDate)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-bold text-gray-800">{fmt(inv.total)}</p>
                          <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${INV_STYLE[inv.status ?? "draft"] ?? INV_STYLE.draft}`}>
                            {(inv.status ?? "draft").charAt(0).toUpperCase() + (inv.status ?? "draft").slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {moreCount > 0 && (
                      <button
                        type="button"
                        onClick={() => { onOpenChange(false); router.push(`/invoices?customerId=${c.id}`) }}
                        className="w-full py-2.5 text-xs text-[#3A7AFE] font-semibold hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        View {moreCount} more invoice{moreCount !== 1 ? "s" : ""} →
                      </button>
                    )}
                  </div>
                )}
              </Section>
            </div>

            {/* ════ RIGHT sidebar (1/3) ════════════════════════════════ */}
            <div className="space-y-5">

              {/* ── Quick Actions ──────────────────────────────────────── */}
              <Section title="Quick Actions">
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={!c.phone}
                    onClick={() => onCallCustomer?.(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 hover:text-[#3A7AFE] text-sm font-medium text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    Call Client
                  </button>
                  <button
                    type="button"
                    disabled={!(c as any).whatsappNumber && !c.phone}
                    onClick={() => onWhatsAppCustomer?.(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-green-50 hover:border-green-100 hover:text-green-700 text-sm font-medium text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    WhatsApp
                  </button>
                  {displayEmail(c.email) && (
                    <button
                      type="button"
                      onClick={() => onEmailCustomer ? onEmailCustomer(c) : window.open(`mailto:${c.email}`, "_self")}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-violet-50 hover:border-violet-100 hover:text-violet-700 text-sm font-medium text-gray-700 transition-colors"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      Send Email
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onScheduleMeeting?.(c)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-amber-50 hover:border-amber-100 hover:text-amber-700 text-sm font-medium text-gray-700 transition-colors"
                  >
                    <Calendar className="h-4 w-4 shrink-0" />
                    Schedule Meeting
                  </button>
                  <button
                    type="button"
                    onClick={() => { onOpenChange(false); router.push(`/invoices/new?customerId=${c.id}`) }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-700 text-sm font-medium text-gray-700 transition-colors"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Create Invoice
                  </button>
                  {onEditCustomer && (
                    <button
                      type="button"
                      onClick={() => { onOpenChange(false); onEditCustomer(c) }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors sm:hidden"
                    >
                      <Edit className="h-4 w-4 shrink-0" />
                      Edit Client
                    </button>
                  )}
                </div>
              </Section>

              {/* ── Billing Summary ────────────────────────────────────── */}
              <Section title="Billing Summary" icon={IndianRupee}>
                <div className="space-y-2.5">
                  <StatTile
                    label="Total Deal Value"
                    value={fmt(c.totalValue)}
                    color="bg-gray-50 border-gray-100 text-gray-700"
                  />
                  {(c as any).dealValue != null && (
                    <StatTile
                      label="This Deal"
                      value={fmt((c as any).dealValue)}
                      color="bg-blue-50 border-blue-100 text-blue-700"
                    />
                  )}
                  <StatTile
                    label="Revenue Received"
                    value={fmt(paidAmt)}
                    sub={`${customerInvoices.filter((i) => i.status === "paid").length} paid invoice${customerInvoices.filter((i) => i.status === "paid").length !== 1 ? "s" : ""}`}
                    color="bg-emerald-50 border-emerald-100 text-emerald-700"
                  />
                  {pendingAmt > 0 && (
                    <StatTile
                      label="Pending Amount"
                      value={fmt(pendingAmt)}
                      color="bg-amber-50 border-amber-100 text-amber-700"
                    />
                  )}
                  {overdueAmt > 0 && (
                    <StatTile
                      label="Overdue"
                      value={fmt(overdueAmt)}
                      sub={`${overdueCount} overdue invoice${overdueCount !== 1 ? "s" : ""}`}
                      color="bg-red-50 border-red-200 text-red-700"
                    />
                  )}
                  {c.recurringEnabled && c.recurringAmount && (
                    <StatTile
                      label={`Monthly Retainer`}
                      value={fmt(c.recurringAmount)}
                      sub={`per ${c.recurringInterval ?? "month"}`}
                      color="bg-violet-50 border-violet-100 text-violet-700"
                    />
                  )}
                </div>

                {/* Key dates */}
                <Separator className="my-4" />
                <div className="space-y-3">
                  <Field label="Client Since" icon={BadgeCheck} accent="text-gray-400" value={formatDate(c.createdAt)} />
                  {(c as any).closureDate && (
                    <Field label="Closure Date" icon={CalendarCheck} accent="text-rose-400" value={formatDate((c as any).closureDate)} />
                  )}
                  {c.recurringEnabled && (c as any).renewalDate && (
                    <Field label="Next Renewal" icon={RefreshCw} accent="text-indigo-400" value={formatDate((c as any).renewalDate)} />
                  )}
                </div>
              </Section>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


