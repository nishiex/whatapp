// "use client"

// import { useMemo, useState } from "react"
// import { useCRM } from "@/contexts/crm-context"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import {
//   Phone, MessageCircle, CheckCircle, Clock,
//   UserPlus, ReceiptText, ChevronRight, X,
//   Calendar, ArrowRight, PhoneCall,
// } from "lucide-react"
// import type { Lead, Invoice } from "@/types/crm"

// // ─── SOW Design System ────────────────────────────────────────────────────────
// // Primary: #3A7AFE | Success: #22C55E | Warning: #F59E0B
// // Danger: #EF4444  | Background: #F8FAFC | Cards: #FFFFFF
// // No gradients | No ALL CAPS | border-radius: 12px | Inter font

// const formatCurrency = (v: number) =>
//   `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`

// const formatDate = (v: unknown) => {
//   if (!v) return "—"
//   const d = v instanceof Date ? v : new Date(v as string)
//   return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
// }

// const SERVICE_LABELS: Record<string, string> = {
//   haemodialysis: "Home Haemodialysis",
//   hdf:           "HDF At-home",
//   peritoneal:    "Peritoneal Dialysis",
//   nursing:       "ANM/GNM Nurse",
//   other:         "Other",
// }

// const SOURCE_LABELS: Record<string, string> = {
//   whatsapp:        "WhatsApp",
//   "booking-engine":"Booking",
//   website:         "Website",
//   manual:          "Manual",
//   referral:        "Referral",
//   other:           "Other",
// }

// const LEAD_STATUS_LABELS: Record<string, string> = {
//   "qualified-lead":  "Qualified",
//   "free-inspection": "Inspection",
//   "quotation":       "Quotation",
//   "installation":    "Installed",
//   "closed":          "Closed",
// }

// // ─── Section header ───────────────────────────────────────────────────────────

// function SectionTitle({
//   icon, title, count, countColor = "bg-gray-100 text-gray-600",
// }: {
//   icon: React.ReactNode; title: string
//   count: number; countColor?: string
// }) {
//   return (
//     <div className="flex items-center gap-3 mb-4">
//       <div className="text-gray-400">{icon}</div>
//       <h2 className="text-base font-semibold text-gray-800">{title}</h2>
//       <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${countColor}`}>
//         {count}
//       </span>
//     </div>
//   )
// }

// // ─── Empty section placeholder ────────────────────────────────────────────────

// function EmptySection({ message }: { message: string }) {
//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 px-5 py-8 text-center">
//       <CheckCircle className="h-8 w-8 text-[#22C55E] mx-auto mb-2 opacity-60" />
//       <p className="text-sm font-medium text-gray-400">{message}</p>
//     </div>
//   )
// }

// // ─── Follow-up row ────────────────────────────────────────────────────────────

// function FollowUpRow({
//   lead, isOverdue, onCall, onWhatsApp, onDone,
// }: {
//   lead: Lead; isOverdue: boolean
//   onCall:    (l: Lead) => void
//   onWhatsApp:(l: Lead) => void
//   onDone:    (l: Lead) => void
// }) {
//   const [isDone, setIsDone] = useState(false)

//   const handleDone = () => {
//     setIsDone(true)
//     onDone(lead)
//   }

//   if (isDone) return null

//   const fud     = (lead as any).follow_up_date as string
//   const phone   = (lead as any).phone ?? ""
//   const service = (lead as any).service ?? ""
//   const today   = new Date(); today.setHours(0,0,0,0)
//   const fuDate  = new Date(fud); fuDate.setHours(0,0,0,0)
//   const daysOD  = Math.floor((today.getTime() - fuDate.getTime()) / 86_400_000)

//   return (
//     <div className={`bg-white rounded-2xl border px-5 py-4 flex items-center gap-4 transition-all ${
//       isOverdue ? "border-red-100" : "border-gray-100"
//     }`}>
//       {/* Avatar */}
//       <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-semibold text-sm ${
//         isOverdue ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
//       }`}>
//         {lead.name?.charAt(0)?.toUpperCase() ?? "P"}
//       </div>

//       {/* Info */}
//       <div className="flex-1 min-w-0">
//         <div className="flex items-center gap-2 flex-wrap">
//           <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
//           {isOverdue && daysOD > 0 && (
//             <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full shrink-0">
//               {daysOD}d overdue
//             </span>
//           )}
//           {!isOverdue && (
//             <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
//               Today
//             </span>
//           )}
//         </div>
//         <div className="flex items-center gap-2 mt-0.5 flex-wrap">
//           {phone && (
//             <span className="text-xs text-gray-400">{phone}</span>
//           )}
//           {service && (
//             <span className="text-xs text-teal-600 font-medium">
//               {SERVICE_LABELS[service] ?? service}
//             </span>
//           )}
//           <span className="text-xs text-gray-300">
//             {LEAD_STATUS_LABELS[lead.status as string] ?? lead.status}
//           </span>
//         </div>
//       </div>

//       {/* SOW: Action buttons */}
//       <div className="flex items-center gap-2 shrink-0">
//         <Button
//           size="sm"
//           onClick={() => onCall(lead)}
//           disabled={!phone}
//           className="h-8 px-3 rounded-xl bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-xs font-medium gap-1.5 shadow-none"
//         >
//           <PhoneCall className="h-3.5 w-3.5" />
//           Call
//         </Button>
//         <Button
//           size="sm"
//           variant="outline"
//           onClick={() => onWhatsApp(lead)}
//           disabled={!phone}
//           className="h-8 px-3 rounded-xl border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-200 hover:bg-green-50 text-xs font-medium gap-1.5"
//         >
//           <MessageCircle className="h-3.5 w-3.5" />
//           WhatsApp
//         </Button>
//         <Button
//           size="sm"
//           variant="ghost"
//           onClick={handleDone}
//           className="h-8 w-8 p-0 rounded-xl text-gray-300 hover:text-[#22C55E] hover:bg-green-50"
//           title="Mark as done"
//         >
//           <CheckCircle className="h-4 w-4" />
//         </Button>
//       </div>
//     </div>
//   )
// }

// // ─── New Lead row ─────────────────────────────────────────────────────────────

// function NewLeadRow({ lead, onCall, onWhatsApp }: {
//   lead: Lead
//   onCall:     (l: Lead) => void
//   onWhatsApp: (l: Lead) => void
// }) {
//   const phone   = (lead as any).phone ?? ""
//   const source  = (lead as any).source ?? ""
//   const service = (lead as any).service ?? ""

//   const sourceColor: Record<string, string> = {
//     whatsapp:        "bg-green-50 text-green-600 border-green-100",
//     "booking-engine":"bg-blue-50 text-blue-600 border-blue-100",
//     website:         "bg-cyan-50 text-cyan-600 border-cyan-100",
//     manual:          "bg-gray-50 text-gray-500 border-gray-100",
//     referral:        "bg-amber-50 text-amber-600 border-amber-100",
//   }

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
//       {/* Avatar */}
//       <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 font-semibold text-sm text-[#3A7AFE]">
//         {lead.name?.charAt(0)?.toUpperCase() ?? "L"}
//       </div>

//       {/* Info */}
//       <div className="flex-1 min-w-0">
//         <div className="flex items-center gap-2 flex-wrap">
//           <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
//           <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${sourceColor[source] ?? "bg-gray-50 text-gray-500 border-gray-100"}`}>
//             {SOURCE_LABELS[source] ?? source}
//           </span>
//         </div>
//         <div className="flex items-center gap-2 mt-0.5 flex-wrap">
//           {phone && <span className="text-xs text-gray-400">{phone}</span>}
//           {service && (
//             <span className="text-xs text-teal-600 font-medium">
//               {SERVICE_LABELS[service] ?? service}
//             </span>
//           )}
//         </div>
//       </div>

//       {/* Actions */}
//       <div className="flex items-center gap-2 shrink-0">
//         <Button
//           size="sm"
//           onClick={() => onCall(lead)}
//           disabled={!phone}
//           className="h-8 px-3 rounded-xl bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-xs font-medium gap-1.5 shadow-none"
//         >
//           <PhoneCall className="h-3.5 w-3.5" />
//           Call
//         </Button>
//         <Button
//           size="sm"
//           variant="outline"
//           onClick={() => onWhatsApp(lead)}
//           disabled={!phone}
//           className="h-8 px-3 rounded-xl border-gray-200 text-gray-600 hover:text-green-600 hover:border-green-200 hover:bg-green-50 text-xs font-medium gap-1.5"
//         >
//           <MessageCircle className="h-3.5 w-3.5" />
//           WhatsApp
//         </Button>
//       </div>
//     </div>
//   )
// }

// // ─── Invoice row ──────────────────────────────────────────────────────────────

// function InvoiceRow({ invoice }: { invoice: Invoice }) {
//   const total    = Number((invoice as any).total) || 0
//   const daysOver = invoice.dueDate
//     ? Math.floor((Date.now() - new Date(invoice.dueDate as string).getTime()) / 86_400_000)
//     : 0

//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 px-5 py-4 flex items-center gap-4">
//       {/* Icon */}
//       <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
//         <ReceiptText className="h-5 w-5 text-amber-500" />
//       </div>

//       {/* Info */}
//       <div className="flex-1 min-w-0">
//         <p className="text-sm font-semibold text-gray-900 truncate">
//           {(invoice as any).customerName ?? "—"}
//         </p>
//         <div className="flex items-center gap-2 mt-0.5">
//           <span className="text-xs font-mono text-gray-400">{invoice.invoiceNumber}</span>
//           <span className="text-xs text-gray-300">·</span>
//           <span className="text-xs text-gray-400">Due {formatDate(invoice.dueDate)}</span>
//         </div>
//       </div>

//       {/* Amount + status */}
//       <div className="text-right shrink-0">
//         <p className="text-sm font-bold text-gray-900">{formatCurrency(total)}</p>
//         {invoice.status === "overdue" && daysOver > 0 && (
//           <p className="text-[10px] font-semibold text-red-500 mt-0.5">{daysOver}d overdue</p>
//         )}
//         {invoice.status === "pending" && (
//           <p className="text-[10px] font-semibold text-amber-500 mt-0.5">Pending</p>
//         )}
//       </div>
//     </div>
//   )
// }

// // ─── Main Component ───────────────────────────────────────────────────────────

// export function TodayView() {
//   const { leads, invoices = [] } = useCRM()

//   // ── Follow-ups: overdue + due today ───────────────────────────────────────
//   const { overdueFollowUps, todayFollowUps } = useMemo(() => {
//     const today = new Date(); today.setHours(0,0,0,0)
//     const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)

//     const overdue: Lead[] = []
//     const todayDue: Lead[] = []

//     leads
//       .filter(l => !["installation","closed"].includes(l.status as string))
//       .forEach(l => {
//         const fu = (l as any).follow_up_date
//         if (!fu) return
//         const d = new Date(fu); d.setHours(0,0,0,0)
//         if (d < today)      overdue.push(l)
//         else if (d <= todayEnd) todayDue.push(l)
//       })

//     // Sort: oldest overdue first
//     overdue.sort((a, b) =>
//       new Date((a as any).follow_up_date).getTime() - new Date((b as any).follow_up_date).getTime()
//     )

//     return { overdueFollowUps: overdue, todayFollowUps: todayDue }
//   }, [leads])

//   const allFollowUps = [...overdueFollowUps, ...todayFollowUps]

//   // ── New leads: created today ──────────────────────────────────────────────
//   const newLeadsToday = useMemo(() => {
//     const todayStart = new Date(); todayStart.setHours(0,0,0,0)
//     return leads
//       .filter(l => {
//         const d = new Date((l as any).created_at ?? l.createdAt ?? 0)
//         return d >= todayStart
//       })
//       .sort((a, b) =>
//         new Date((b as any).created_at ?? b.createdAt ?? 0).getTime() -
//         new Date((a as any).created_at ?? a.createdAt ?? 0).getTime()
//       )
//   }, [leads])

//   // ── Pending invoices ──────────────────────────────────────────────────────
//   const pendingInvoices = useMemo(() =>
//     invoices
//       .filter(i => ["overdue","pending","sent"].includes(i.status))
//       .sort((a, b) => {
//         // overdue first, then by amount
//         if (a.status === "overdue" && b.status !== "overdue") return -1
//         if (b.status === "overdue" && a.status !== "overdue") return  1
//         return (Number((b as any).total) || 0) - (Number((a as any).total) || 0)
//       })
//   , [invoices])

//   // ── Totals ────────────────────────────────────────────────────────────────
//   const pendingTotal = pendingInvoices.reduce((s, i) => s + (Number((i as any).total) || 0), 0)

//   // ── Action handlers ───────────────────────────────────────────────────────
//   const handleCall = (lead: Lead) => {
//     const phone = (lead as any).phone
//     if (!phone) return alert("No phone number for this patient.")
//     window.open(`tel:${phone}`, "_self")
//   }

//   const handleWhatsApp = (lead: Lead) => {
//     const phone = (lead as any).phone || lead.whatsappNumber
//     if (!phone) return alert("No number available.")
//     const clean = phone.replace(/\D/g, "")
//     const msg   = encodeURIComponent("Hi, following up on your Renalease enquiry. How can we help?")
//     window.open(`https://wa.me/${clean}?text=${msg}`, "_blank", "noopener,noreferrer")
//   }

//   const handleDone = async (lead: Lead) => {
//     // Optimistic UI — actual follow-up date clearing handled by parent update
//     console.log("Marked done:", lead.id)
//   }

//   // ── Start Calls: open phone for first overdue/today lead ─────────────────
//   const handleStartCalls = () => {
//     const first = allFollowUps[0]
//     if (!first) return
//     const phone = (first as any).phone
//     if (phone) window.open(`tel:${phone}`, "_self")
//   }

//   // ─── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-[#F8FAFC]">

//       {/* ── Page Header ────────────────────────────────────────────────── */}
//       <div className="bg-white border-b border-gray-100 px-6 py-5">
//         <div className="max-w-3xl mx-auto flex items-center justify-between">
//           <div>
//             <div className="flex items-center gap-2">
//               <h1 className="text-xl font-semibold text-gray-900">Today's Work</h1>
//               <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
//                 {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
//               </span>
//             </div>
//             <p className="text-sm text-gray-400 mt-0.5">
//               {allFollowUps.length > 0
//                 ? `${allFollowUps.length} follow-up${allFollowUps.length !== 1 ? "s" : ""} need your attention`
//                 : "You're all caught up for today"}
//             </p>
//           </div>

//           {/* SOW: CTA buttons */}
//           <div className="flex items-center gap-2">
//             {allFollowUps.length > 0 && (
//               <Button
//                 onClick={handleStartCalls}
//                 className="bg-[#3A7AFE] hover:bg-[#2563EB] text-white rounded-xl px-4 py-2 text-sm font-medium gap-2 shadow-sm"
//               >
//                 <Phone className="h-4 w-4" />
//                 Start Calls
//               </Button>
//             )}
//             <Button
//               variant="outline"
//               onClick={() => window.location.href = "/leads"}
//               className="rounded-xl border-gray-200 text-gray-600 hover:text-[#3A7AFE] hover:border-[#3A7AFE] px-4 py-2 text-sm font-medium gap-2"
//             >
//               View Leads
//               <ArrowRight className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* ── Progress bar (visual motivation for doctors) ───────────────── */}
//       {allFollowUps.length > 0 && (
//         <div className="bg-white border-b border-gray-50">
//           <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
//             <span className="text-xs text-gray-400 shrink-0">Daily progress</span>
//             <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
//               <div
//                 className="h-full bg-[#22C55E] rounded-full transition-all duration-500"
//                 style={{ width: "0%" }}
//               />
//             </div>
//             <span className="text-xs text-gray-400 shrink-0">
//               0 / {allFollowUps.length} done
//             </span>
//           </div>
//         </div>
//       )}

//       <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">

//         {/* ── SECTION 1: Follow-ups Due (SOW §1) ─────────────────────── */}
//         <section>
//           <SectionTitle
//             icon={<Clock className="h-4 w-4" />}
//             title="Follow-ups Due"
//             count={allFollowUps.length}
//             countColor={
//               allFollowUps.length > 0
//                 ? "bg-red-50 text-red-500"
//                 : "bg-gray-100 text-gray-400"
//             }
//           />

//           {allFollowUps.length === 0 ? (
//             <EmptySection message="No follow-ups due today. Great work!" />
//           ) : (
//             <div className="space-y-2.5">
//               {/* Overdue first with visual separator */}
//               {overdueFollowUps.length > 0 && (
//                 <>
//                   <p className="text-xs font-medium text-red-400 px-1 mb-2">
//                     Overdue — {overdueFollowUps.length} lead{overdueFollowUps.length !== 1 ? "s" : ""}
//                   </p>
//                   {overdueFollowUps.map(lead => (
//                     <FollowUpRow
//                       key={lead.id}
//                       lead={lead}
//                       isOverdue={true}
//                       onCall={handleCall}
//                       onWhatsApp={handleWhatsApp}
//                       onDone={handleDone}
//                     />
//                   ))}
//                 </>
//               )}
//               {todayFollowUps.length > 0 && (
//                 <>
//                   {overdueFollowUps.length > 0 && (
//                     <p className="text-xs font-medium text-amber-500 px-1 mt-4 mb-2">
//                       Today — {todayFollowUps.length} lead{todayFollowUps.length !== 1 ? "s" : ""}
//                     </p>
//                   )}
//                   {todayFollowUps.map(lead => (
//                     <FollowUpRow
//                       key={lead.id}
//                       lead={lead}
//                       isOverdue={false}
//                       onCall={handleCall}
//                       onWhatsApp={handleWhatsApp}
//                       onDone={handleDone}
//                     />
//                   ))}
//                 </>
//               )}
//             </div>
//           )}
//         </section>

//         {/* ── SECTION 2: New Leads (SOW §2) ──────────────────────────── */}
//         <section>
//           <div className="flex items-center justify-between mb-4">
//             <div className="flex items-center gap-3">
//               <UserPlus className="h-4 w-4 text-gray-400" />
//               <h2 className="text-base font-semibold text-gray-800">New Leads Today</h2>
//               <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
//                 newLeadsToday.length > 0
//                   ? "bg-blue-50 text-[#3A7AFE]"
//                   : "bg-gray-100 text-gray-400"
//               }`}>
//                 {newLeadsToday.length}
//               </span>
//             </div>
//             {newLeadsToday.length > 0 && (
//               <button
//                 type="button"
//                 onClick={() => window.location.href = "/leads"}
//                 className="text-xs text-[#3A7AFE] font-medium hover:underline flex items-center gap-1"
//               >
//                 View all <ChevronRight className="h-3.5 w-3.5" />
//               </button>
//             )}
//           </div>

//           {newLeadsToday.length === 0 ? (
//             <EmptySection message="No new leads yet today. Check back soon!" />
//           ) : (
//             <div className="space-y-2.5">
//               {newLeadsToday.map(lead => (
//                 <NewLeadRow
//                   key={lead.id}
//                   lead={lead}
//                   onCall={handleCall}
//                   onWhatsApp={handleWhatsApp}
//                 />
//               ))}
//             </div>
//           )}
//         </section>

//         {/* ── SECTION 3: Pending Invoices (SOW §3) ───────────────────── */}
//         <section>
//           <div className="flex items-center justify-between mb-4">
//             <div className="flex items-center gap-3">
//               <ReceiptText className="h-4 w-4 text-gray-400" />
//               <h2 className="text-base font-semibold text-gray-800">Pending Invoices</h2>
//               <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
//                 pendingInvoices.length > 0
//                   ? "bg-amber-50 text-amber-600"
//                   : "bg-gray-100 text-gray-400"
//               }`}>
//                 {pendingInvoices.length}
//               </span>
//             </div>
//             {pendingInvoices.length > 0 && (
//               <span className="text-xs font-semibold text-gray-500">
//                 Total: {formatCurrency(pendingTotal)}
//               </span>
//             )}
//           </div>

//           {pendingInvoices.length === 0 ? (
//             <EmptySection message="All invoices are settled. No pending payments." />
//           ) : (
//             <div className="space-y-2.5">
//               {pendingInvoices.slice(0, 8).map(inv => (
//                 <InvoiceRow key={inv.id} invoice={inv} />
//               ))}
//               {pendingInvoices.length > 8 && (
//                 <button
//                   type="button"
//                   onClick={() => window.location.href = "/invoices"}
//                   className="w-full text-center text-xs text-[#3A7AFE] font-medium py-3 bg-white rounded-2xl border border-gray-100 hover:border-[#3A7AFE] transition-colors"
//                 >
//                   View {pendingInvoices.length - 8} more invoices →
//                 </button>
//               )}
//             </div>
//           )}
//         </section>

//         {/* ── All clear state ─────────────────────────────────────────── */}
//         {allFollowUps.length === 0 && newLeadsToday.length === 0 && pendingInvoices.length === 0 && (
//           <div className="flex flex-col items-center justify-center py-20 text-center">
//             <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4 border border-green-100">
//               <CheckCircle className="h-8 w-8 text-[#22C55E]" />
//             </div>
//             <h3 className="text-lg font-semibold text-gray-800 mb-1">You're all done!</h3>
//             <p className="text-sm text-gray-400 max-w-xs">
//               No follow-ups, no new leads, no pending invoices. Enjoy a productive day!
//             </p>
//           </div>
//         )}

//       </div>
//     </div>
//   )
// }




//testing


"use client"

import { useMemo, useState } from "react"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import {
  Phone, MessageCircle, CheckCircle, Clock,
  UserPlus, ReceiptText, ChevronRight,
  ArrowRight, PhoneCall, CalendarCheck,
} from "lucide-react"
import type { Lead, Invoice } from "@/types/crm"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`

const formatDate = (v: unknown) => {
  if (!v) return "—"
  const d = v instanceof Date ? v : new Date(v as string)
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

const SERVICE_LABELS: Record<string, string> = {
  haemodialysis: "Home Haemodialysis",
  hdf:           "HDF At-home",
  peritoneal:    "Peritoneal Dialysis",
  nursing:       "ANM/GNM Nurse",
  other:         "Other",
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp:         "WhatsApp",
  "booking-engine": "Booking",
  website:          "Website",
  manual:           "Manual",
  referral:         "Referral",
  other:            "Other",
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  "qualified-lead":  "Qualified",
  "free-inspection": "Inspection",
  "quotation":       "Quotation",
  "installation":    "Installed",
  "closed":          "Closed",
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionTitle({
  icon, title, count, countColor = "bg-gray-100 text-gray-500",
}: {
  icon: React.ReactNode
  title: string
  count: number
  countColor?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-gray-400">{icon}</div>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${countColor}`}>
        {count}
      </span>
    </div>
  )
}

// ─── Sub-group Label ──────────────────────────────────────────────────────────

function SubLabel({ color, dot, children }: {
  color: string; dot: string; children: React.ReactNode
}) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-semibold pb-1.5 ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {children}
    </div>
  )
}

// ─── Follow-up Row ────────────────────────────────────────────────────────────

function FollowUpRow({ lead, isOverdue, onCall, onWhatsApp, onDone }: {
  lead: Lead
  isOverdue: boolean
  onCall:     (l: Lead) => void
  onWhatsApp: (l: Lead) => void
  onDone:     (l: Lead) => void
}) {
  const [isDone, setIsDone] = useState(false)
  if (isDone) return null

  const phone   = (lead as any).phone ?? ""
  const service = (lead as any).service ?? ""
  const fud     = (lead as any).follow_up_date as string
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const fuDate  = new Date(fud); fuDate.setHours(0, 0, 0, 0)
  const daysOD  = Math.floor((today.getTime() - fuDate.getTime()) / 86_400_000)

  return (
    <div className={`bg-white rounded-xl px-4 py-3 flex items-center gap-3 transition-all border-y border-r ${
      isOverdue
        ? "border-red-100 border-l-2 border-l-red-400"
        : "border-amber-100 border-l-2 border-l-amber-400"
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-semibold text-xs ${
        isOverdue ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
      }`}>
        {lead.name?.charAt(0)?.toUpperCase() ?? "P"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
          {isOverdue && daysOD > 0 && (
            <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full shrink-0">
              {daysOD}d overdue
            </span>
          )}
          {!isOverdue && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
              Today
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {phone && <span className="text-xs text-gray-400">{phone}</span>}
          {phone && service && <span className="text-[10px] text-gray-300">·</span>}
          {service && (
            <span className="text-xs text-teal-600 font-medium">
              {SERVICE_LABELS[service] ?? service}
            </span>
          )}
          {service && (
            <>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-xs text-gray-400">
                {LEAD_STATUS_LABELS[lead.status as string] ?? lead.status}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={() => onCall(lead)}
          disabled={!phone}
          className="h-7 px-2.5 rounded-lg bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-xs font-medium gap-1 shadow-none"
        >
          <PhoneCall className="h-3 w-3" />
          Call
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onWhatsApp(lead)}
          disabled={!phone}
          className="h-7 px-2.5 rounded-lg border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 hover:bg-green-50 text-xs font-medium gap-1"
        >
          <MessageCircle className="h-3 w-3" />
          WhatsApp
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setIsDone(true); onDone(lead) }}
          title="Mark as done"
          className="h-7 w-7 p-0 rounded-lg text-gray-300 hover:text-[#22C55E] hover:bg-green-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── New Lead Row ─────────────────────────────────────────────────────────────

function NewLeadRow({ lead, onCall, onWhatsApp }: {
  lead: Lead
  onCall:     (l: Lead) => void
  onWhatsApp: (l: Lead) => void
}) {
  const phone   = (lead as any).phone ?? ""
  const source  = (lead as any).source ?? ""
  const service = (lead as any).service ?? ""

  const sourceStyle: Record<string, string> = {
    whatsapp:         "bg-green-50 text-green-700 border-green-100",
    "booking-engine": "bg-blue-50 text-blue-700 border-blue-100",
    website:          "bg-cyan-50 text-cyan-700 border-cyan-100",
    manual:           "bg-gray-50 text-gray-500 border-gray-100",
    referral:         "bg-amber-50 text-amber-700 border-amber-100",
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 font-semibold text-xs text-[#3A7AFE]">
        {lead.name?.charAt(0)?.toUpperCase() ?? "L"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
          {source && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
              sourceStyle[source] ?? "bg-gray-50 text-gray-500 border-gray-100"
            }`}>
              {SOURCE_LABELS[source] ?? source}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {phone && <span className="text-xs text-gray-400">{phone}</span>}
          {phone && service && <span className="text-[10px] text-gray-300">·</span>}
          {service && (
            <span className="text-xs text-teal-600 font-medium">
              {SERVICE_LABELS[service] ?? service}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={() => onCall(lead)}
          disabled={!phone}
          className="h-7 px-2.5 rounded-lg bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-xs font-medium gap-1 shadow-none"
        >
          <PhoneCall className="h-3 w-3" />
          Call
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onWhatsApp(lead)}
          disabled={!phone}
          className="h-7 px-2.5 rounded-lg border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 hover:bg-green-50 text-xs font-medium gap-1"
        >
          <MessageCircle className="h-3 w-3" />
          WhatsApp
        </Button>
      </div>
    </div>
  )
}

// ─── Invoice Row ──────────────────────────────────────────────────────────────

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const total     = Number((invoice as any).total) || 0
  const isOverdue = invoice.status === "overdue"
  const daysOver  = isOverdue && invoice.dueDate
    ? Math.floor((Date.now() - new Date(invoice.dueDate as string).getTime()) / 86_400_000)
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isOverdue ? "bg-red-50" : "bg-amber-50"
      }`}>
        <ReceiptText className={`h-4 w-4 ${isOverdue ? "text-red-400" : "text-amber-500"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {(invoice as any).customerName ?? "—"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[11px] font-mono text-gray-400">{invoice.invoiceNumber}</span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-xs text-gray-400">Due {formatDate(invoice.dueDate)}</span>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(total)}</p>
        {isOverdue && daysOver > 0 && (
          <p className="text-[10px] font-semibold text-red-500 mt-0.5">{daysOver}d overdue</p>
        )}
        {invoice.status === "pending" && (
          <p className="text-[10px] font-semibold text-amber-500 mt-0.5">Pending</p>
        )}
        {invoice.status === "sent" && (
          <p className="text-[10px] font-semibold text-blue-500 mt-0.5">Sent</p>
        )}
      </div>
    </div>
  )
}

// ─── All Clear Banner ─────────────────────────────────────────────────────────

function AllClearBanner() {
  const day = new Date().toLocaleDateString("en-IN", { weekday: "long" })
  return (
    <div className="bg-white rounded-xl border border-green-100 px-5 py-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
        <CalendarCheck className="h-5 w-5 text-[#22C55E]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">All clear for {day}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          No follow-ups, new leads, or pending invoices right now.
        </p>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TodayView() {
  const { leads, invoices = [] } = useCRM()

  // ── Follow-ups ────────────────────────────────────────────────────────────
  const { overdueFollowUps, todayFollowUps } = useMemo(() => {
    const today    = new Date(); today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const overdue: Lead[]  = []
    const todayDue: Lead[] = []

    leads
      .filter(l => !["installation", "closed"].includes(l.status as string))
      .forEach(l => {
        const fu = (l as any).follow_up_date
        if (!fu) return
        const d = new Date(fu); d.setHours(0, 0, 0, 0)
        if (d < today)          overdue.push(l)
        else if (d <= todayEnd) todayDue.push(l)
      })

    overdue.sort((a, b) =>
      new Date((a as any).follow_up_date).getTime() -
      new Date((b as any).follow_up_date).getTime()
    )

    return { overdueFollowUps: overdue, todayFollowUps: todayDue }
  }, [leads])

  const allFollowUps = [...overdueFollowUps, ...todayFollowUps]

  // ── New leads today ───────────────────────────────────────────────────────
  const newLeadsToday = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    return leads
      .filter(l => new Date((l as any).created_at ?? l.createdAt ?? 0) >= todayStart)
      .sort((a, b) =>
        new Date((b as any).created_at ?? b.createdAt ?? 0).getTime() -
        new Date((a as any).created_at ?? a.createdAt ?? 0).getTime()
      )
  }, [leads])

  // ── Pending invoices ──────────────────────────────────────────────────────
  const pendingInvoices = useMemo(() =>
    invoices
      .filter(i => ["overdue", "pending", "sent"].includes(i.status))
      .sort((a, b) => {
        if (a.status === "overdue" && b.status !== "overdue") return -1
        if (b.status === "overdue" && a.status !== "overdue") return  1
        return (Number((b as any).total) || 0) - (Number((a as any).total) || 0)
      })
  , [invoices])

  const pendingTotal = pendingInvoices.reduce((s, i) => s + (Number((i as any).total) || 0), 0)

  const allClear =
    allFollowUps.length === 0 &&
    newLeadsToday.length === 0 &&
    pendingInvoices.length === 0

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCall = (lead: Lead) => {
    const phone = (lead as any).phone
    if (!phone) return alert("No phone number for this patient.")
    window.open(`tel:${phone}`, "_self")
  }

  const handleWhatsApp = (lead: Lead) => {
    const phone = (lead as any).phone || lead.whatsappNumber
    if (!phone) return alert("No number available.")
    const clean = phone.replace(/\D/g, "")
    const msg   = encodeURIComponent("Hi, following up on your Renalease enquiry. How can we help?")
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank", "noopener,noreferrer")
  }

  const handleDone = async (lead: Lead) => {
    console.log("Marked done:", lead.id)
  }

  const handleStartCalls = () => {
    const first = allFollowUps[0]
    if (!first) return
    const phone = (first as any).phone
    if (phone) window.open(`tel:${phone}`, "_self")
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Page Header: full width, no max-w cap ──────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-semibold text-gray-900">Today's Work</h1>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {allFollowUps.length > 0
              ? `${allFollowUps.length} follow-up${allFollowUps.length !== 1 ? "s" : ""} need your attention`
              : allClear
                ? "You're all caught up for today"
                : "Here's what needs your attention"}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {allFollowUps.length > 0 && (
            <Button
              onClick={handleStartCalls}
              className="bg-[#3A7AFE] hover:bg-[#2563EB] text-white rounded-lg px-3 py-1.5 text-xs font-medium gap-1.5 h-8 shadow-none"
            >
              <Phone className="h-3.5 w-3.5" />
              Start Calls
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.location.href = "/leads"}
            className="rounded-lg border-gray-200 text-gray-500 hover:text-[#3A7AFE] hover:border-[#3A7AFE] px-3 py-1.5 text-xs font-medium gap-1.5 h-8"
          >
            View Leads
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Content: full width with consistent horizontal padding ─────── */}
      <div className="px-6 py-5 space-y-5">

        {/* ALL CLEAR: single compact banner */}
        {allClear && <AllClearBanner />}

        {/* ── Follow-ups ──────────────────────────────────────────────── */}
        {allFollowUps.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <SectionTitle
                icon={<Clock className="h-3.5 w-3.5" />}
                title="Follow-ups Due"
                count={allFollowUps.length}
                countColor="bg-red-50 text-red-600"
              />
            </div>

            <div className="space-y-1.5">
              {overdueFollowUps.length > 0 && (
                <>
                  <SubLabel color="text-red-500" dot="bg-red-400">
                    Overdue — {overdueFollowUps.length} lead{overdueFollowUps.length !== 1 ? "s" : ""}
                  </SubLabel>
                  {overdueFollowUps.map(lead => (
                    <FollowUpRow
                      key={lead.id}
                      lead={lead}
                      isOverdue
                      onCall={handleCall}
                      onWhatsApp={handleWhatsApp}
                      onDone={handleDone}
                    />
                  ))}
                </>
              )}

              {todayFollowUps.length > 0 && (
                <div className={overdueFollowUps.length > 0 ? "pt-2" : ""}>
                  {overdueFollowUps.length > 0 && (
                    <SubLabel color="text-amber-500" dot="bg-amber-400">
                      Today — {todayFollowUps.length} lead{todayFollowUps.length !== 1 ? "s" : ""}
                    </SubLabel>
                  )}
                  <div className="space-y-1.5">
                    {todayFollowUps.map(lead => (
                      <FollowUpRow
                        key={lead.id}
                        lead={lead}
                        isOverdue={false}
                        onCall={handleCall}
                        onWhatsApp={handleWhatsApp}
                        onDone={handleDone}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── New Leads ───────────────────────────────────────────────── */}
        {newLeadsToday.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <SectionTitle
                icon={<UserPlus className="h-3.5 w-3.5" />}
                title="New Leads Today"
                count={newLeadsToday.length}
                countColor="bg-blue-50 text-blue-600"
              />
              <button
                type="button"
                onClick={() => window.location.href = "/leads"}
                className="text-[11px] text-[#3A7AFE] font-medium hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1.5">
              {newLeadsToday.map(lead => (
                <NewLeadRow
                  key={lead.id}
                  lead={lead}
                  onCall={handleCall}
                  onWhatsApp={handleWhatsApp}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Pending Invoices ────────────────────────────────────────── */}
        {pendingInvoices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <SectionTitle
                icon={<ReceiptText className="h-3.5 w-3.5" />}
                title="Pending Invoices"
                count={pendingInvoices.length}
                countColor="bg-amber-50 text-amber-600"
              />
              <span className="text-[11px] font-semibold text-gray-500">
                Total: {formatCurrency(pendingTotal)}
              </span>
            </div>

            <div className="space-y-1.5">
              {pendingInvoices.slice(0, 8).map(inv => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
              {pendingInvoices.length > 8 && (
                <button
                  type="button"
                  onClick={() => window.location.href = "/invoices"}
                  className="w-full text-center text-xs text-[#3A7AFE] font-medium py-2.5 bg-white rounded-xl border border-gray-100 hover:border-[#3A7AFE] transition-colors"
                >
                  View {pendingInvoices.length - 8} more invoices →
                </button>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}