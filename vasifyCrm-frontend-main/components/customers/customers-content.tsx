
// "use client"

// import { useMemo, useState, useCallback, useRef, useEffect } from "react"
// import { useCRM } from "@/contexts/crm-context"
// import { useAuth } from "@/contexts/auth-context"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select"
// import {
//   DropdownMenu, DropdownMenuContent, DropdownMenuItem,
//   DropdownMenuSeparator, DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel,
//   AlertDialogContent, AlertDialogDescription,
//   AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
// } from "@/components/ui/alert-dialog"
// import { CustomerDialog }       from "./customer-dialog"
// import { CustomerDetailDialog } from "./customer-detail-dialog"
// import {
//   Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
//   Phone, MessageCircle, Undo2, Building2, CheckCircle2,
//   XCircle, Download, Filter, Pencil, Check, X, Calendar,
//   Users, TrendingUp, UserCheck, UserX, ArrowUpRight,
//   Wallet, IndianRupee,
// } from "lucide-react"
// import type { Customer } from "@/types/crm"

// // ─── Constants ────────────────────────────────────────────────────────────────

// export const SERVICE_LABELS: Record<string, string> = {
//   "whatsapp-api":    "WhatsApp API",
//   "web-development": "Web Development",
//   "seo":             "SEO / Marketing",
//   "social-media":    "Social Media",
//   "crm-development": "CRM Development",
//   "app-development": "App Development",
//   "cloud-hosting":   "Cloud & Hosting",
//   "it-support":      "IT Support",
//   "other":           "Other",
// }

// export const BUSINESS_TYPE_LABELS: Record<string, string> = {
//   "startup":    "Startup",
//   "sme":        "SME",
//   "enterprise": "Enterprise",
//   "agency":     "Agency",
//   "ecommerce":  "E-commerce",
//   "ngo":        "NGO / Non-Profit",
//   "individual": "Individual / Freelancer",
//   "other":      "Other",
// }

// const STATUS_CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
//   active:   { label: "Active",   dot: "bg-emerald-400", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
//   inactive: { label: "Inactive", dot: "bg-gray-300",    cls: "bg-gray-50    text-gray-500    border-gray-200"   },
//   prospect: { label: "Prospect", dot: "bg-blue-400",    cls: "bg-blue-50    text-blue-700    border-blue-200"   },
// }

// const STATUS_FILTERS = [
//   { value: "all",      label: "All"      },
//   { value: "active",   label: "Active"   },
//   { value: "prospect", label: "Prospect" },
//   { value: "inactive", label: "Inactive" },
// ]

// const TILE_GRADIENTS = {
//   total:    ["#6D5DF6", "#8B7CF8"] as [string, string],
//   active:   ["#1E5FE0", "#2E7BF6"] as [string, string],
//   prospect: ["#D97706", "#F59E0B"] as [string, string],
//   deal:     ["#0E8FD9", "#23B6E0"] as [string, string],
//   payment:  ["#E11D48", "#F43F5E"] as [string, string],
//   paid:     ["#0FA968", "#22C97E"] as [string, string],
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// export const formatDate = (v: unknown): string => {
//   if (!v) return "—"
//   const d = v instanceof Date ? v : new Date(v as string)
//   return isNaN(d.getTime()) ? "—"
//     : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
// }

// export const displayEmail = (email: string | undefined): string | null => {
//   if (!email) return null
//   const syntheticDomains = ["@manual.", "@booking.", "@whatsapp."]
//   return syntheticDomains.some((d) => email.includes(d)) ? null : email
// }

// const formatCurrency = (v: unknown): string => {
//   if (v == null || v === "") return "—"
//   const n = Number(v)
//   if (isNaN(n)) return "—"
//   if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
//   if (n >= 1_000)     return `₹${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
//   return `₹${n.toLocaleString("en-IN")}`
// }

// const computeRemaining = (total: number | null | undefined, paid: number | null | undefined): number => {
//   const t = total ?? 0
//   const p = paid  ?? 0
//   return Math.max(t - p, 0)
// }

// // ─── Count-up hook ────────────────────────────────────────────────────────────

// function useCountUp(target: number, durationMs = 800) {
//   const [value, setValue] = useState(0)
//   const startRef = useRef<number | null>(null)
//   const fromRef  = useRef(0)
//   useEffect(() => {
//     fromRef.current = value; startRef.current = null
//     let raf: number
//     const tick = (ts: number) => {
//       if (startRef.current === null) startRef.current = ts
//       const t = Math.min((ts - startRef.current) / durationMs, 1)
//       const e = 1 - Math.pow(1 - t, 3)
//       setValue(fromRef.current + (target - fromRef.current) * e)
//       if (t < 1) raf = requestAnimationFrame(tick)
//     }
//     raf = requestAnimationFrame(tick)
//     return () => cancelAnimationFrame(raf)
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [target])
//   return value
// }

// // ─── CSV export ───────────────────────────────────────────────────────────────

// const exportToCSV = (customers: Customer[]) => {
//   const headers = [
//     "Name","Company","Phone","Email","Service","Business Type",
//     "Status","Assigned User",
//     "Deal Value Total (₹)","Paid Amount (₹)","Remaining / Due (₹)",
//     "Total Value (₹)",
//     "Closure Date","Onboarding Date","City","State",
//   ]
//   const rows = customers.map((c) => {
//     const total = (c as any).dealValue ?? null
//     const paid  = (c as any).paidAmount ?? null
//     return [
//       c.name ?? "", c.company ?? "", c.phone ?? "",
//       displayEmail(c.email) ?? "",
//       SERVICE_LABELS[c.service ?? ""] ?? c.service ?? "",
//       BUSINESS_TYPE_LABELS[(c as any).businessType ?? ""] ?? (c as any).businessType ?? "",
//       c.status ?? "", (c as any).assignedUser ?? "",
//       total ?? "",
//       paid ?? "",
//       total != null ? computeRemaining(total, paid) : "",
//       c.totalValue ?? 0,
//       (c as any).closureDate ? formatDate((c as any).closureDate) : "",
//       (c as any).onboardingDate ? formatDate((c as any).onboardingDate) : formatDate(c.createdAt),
//       c.city ?? "", c.state ?? "",
//     ]
//   })
//   const escape = (val: unknown) => {
//     const s = String(val ?? "")
//     return s.includes(",") || s.includes('"') || s.includes("\n")
//       ? `"${s.replace(/"/g, '""')}"` : s
//   }
//   const csv  = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n")
//   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
//   const url  = URL.createObjectURL(blob)
//   const a    = document.createElement("a")
//   a.href     = url
//   a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`
//   a.click()
//   URL.revokeObjectURL(url)
// }

// // ─── Toast ────────────────────────────────────────────────────────────────────

// type ToastType = { message: string; type: "success" | "error" }

// function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
//   return (
//     <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium animate-in slide-in-from-bottom-3 ${
//       toast.type === "success"
//         ? "bg-white border-emerald-100 text-emerald-700"
//         : "bg-white border-red-100 text-red-600"
//     }`}>
//       {toast.type === "success"
//         ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
//         : <XCircle      className="h-4 w-4 text-red-500 shrink-0" />}
//       {toast.message}
//       <button onClick={onDismiss} className="ml-1 text-gray-300 hover:text-gray-500 transition-colors">
//         <X className="h-3.5 w-3.5" />
//       </button>
//     </div>
//   )
// }

// // ─── Gradient KPI Tile (matches Leads page) ────────────────────────────────────

// function GradientTile({
//   label, rawValue, displayValue, gradient, sub, icon: Icon,
// }: {
//   label: string; rawValue: number; displayValue?: string
//   gradient: [string, string]; sub?: string; icon: React.ElementType
// }) {
//   const animated = useCountUp(rawValue)
//   const display  = displayValue ?? Math.round(animated).toLocaleString("en-IN")
//   return (
//     <div
//       className="relative overflow-hidden rounded-2xl p-4 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default select-none"
//       style={{ background: `linear-gradient(135deg,${gradient[0]},${gradient[1]})` }}
//     >
//       <div className="absolute -right-4 -top-5 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
//       <div className="absolute -right-1 -bottom-6 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
//       <div className="relative flex items-start justify-between gap-2">
//         <div className="min-w-0 flex-1">
//           <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 truncate">{label}</p>
//           <p className="text-2xl font-extrabold mt-1.5 tabular-nums leading-none tracking-tight">{display}</p>
//           {sub && (
//             <div className="flex items-center gap-0.5 mt-2">
//               <ArrowUpRight className="h-3 w-3 text-white/60 shrink-0" />
//               <span className="text-[11px] font-semibold text-white/75 truncate">{sub}</span>
//             </div>
//           )}
//         </div>
//         <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
//           <Icon className="h-[18px] w-[18px] text-white" />
//         </div>
//       </div>
//     </div>
//   )
// }

// // ─── UserCell ─────────────────────────────────────────────────────────────────

// interface UserCellProps {
//   customer: Customer
//   crmUsers: { id: string; name: string }[]
//   onSave:   (id: string, value: string) => Promise<void>
// }

// function UserCell({ customer, crmUsers, onSave }: UserCellProps) {
//   const currentUser = (customer as any).assignedUser as string | null
//   const [editing, setEditing]   = useState(false)
//   const [value,   setValue]     = useState(currentUser ?? "")
//   const [saving,  setSaving]    = useState(false)
//   const [showDrop, setShowDrop] = useState(false)
//   const inputRef                = useRef<HTMLInputElement>(null)
//   const wrapRef                 = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     if (!editing) setValue((customer as any).assignedUser ?? "")
//   }, [(customer as any).assignedUser, editing])

//   const startEdit = (e: React.MouseEvent) => {
//     e.stopPropagation()
//     setValue((customer as any).assignedUser ?? "")
//     setEditing(true)
//     setShowDrop(true)
//     setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 20)
//   }

//   const cancel = (e?: React.MouseEvent) => {
//     e?.stopPropagation()
//     setEditing(false)
//     setShowDrop(false)
//     setValue((customer as any).assignedUser ?? "")
//   }

//   const save = async (val?: string) => {
//     const finalVal = (val ?? value).trim()
//     setSaving(true)
//     await onSave(customer.id, finalVal)
//     setSaving(false)
//     setEditing(false)
//     setShowDrop(false)
//   }

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     e.stopPropagation()
//     if (e.key === "Enter")  { save() }
//     if (e.key === "Escape") { cancel() }
//   }

//   useEffect(() => {
//     if (!editing) return
//     const h = (e: MouseEvent) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { save() }
//     }
//     document.addEventListener("mousedown", h)
//     return () => document.removeEventListener("mousedown", h)
//   }, [editing, value])

//   const filtered = crmUsers.filter(
//     (u) => !value || u.name.toLowerCase().includes(value.toLowerCase())
//   ).slice(0, 6)

//   if (editing) {
//     return (
//       <div ref={wrapRef} className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
//         <input
//           ref={inputRef}
//           type="text"
//           value={value}
//           onChange={(e) => { setValue(e.target.value); setShowDrop(true) }}
//           onKeyDown={handleKeyDown}
//           disabled={saving}
//           placeholder="Name or pick below…"
//           className="w-28 h-7 text-xs border border-[#3A7AFE] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#3A7AFE]/20 disabled:opacity-50"
//         />
//         <button onClick={() => save()} disabled={saving}
//           className="h-6 w-6 rounded-lg bg-[#3A7AFE] hover:bg-[#2563EB] text-white flex items-center justify-center transition-colors disabled:opacity-50 shrink-0" title="Save">
//           {saving
//             ? <span className="h-2.5 w-2.5 border border-white border-t-transparent rounded-full animate-spin block" />
//             : <Check className="h-3 w-3" />}
//         </button>
//         <button onClick={cancel}
//           className="h-6 w-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0" title="Cancel">
//           <X className="h-3 w-3" />
//         </button>
//         {showDrop && filtered.length > 0 && (
//           <div className="absolute left-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px] max-h-40 overflow-y-auto">
//             {filtered.map((u) => (
//               <button key={u.id} type="button"
//                 onMouseDown={(e) => { e.preventDefault(); setValue(u.name); save(u.name) }}
//                 className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left text-xs">
//                 <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 shrink-0">
//                   {u.name.charAt(0).toUpperCase()}
//                 </span>
//                 <span className="text-gray-700 font-medium truncate">{u.name}</span>
//               </button>
//             ))}
//           </div>
//         )}
//       </div>
//     )
//   }

//   return (
//     <div className="group/user flex items-center gap-1.5 cursor-pointer min-w-0" onClick={startEdit} title="Click to assign user">
//       {currentUser ? (
//         <>
//           <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 shrink-0">
//             {currentUser.charAt(0).toUpperCase()}
//           </div>
//           <span className="text-xs text-gray-700 font-medium truncate">{currentUser}</span>
//         </>
//       ) : (
//         <span className="text-xs text-gray-300 italic">Assign…</span>
//       )}
//       <Pencil className="h-2.5 w-2.5 text-gray-300 opacity-0 group-hover/user:opacity-100 transition-opacity shrink-0 ml-0.5" />
//     </div>
//   )
// }

// // ─── Deal Value Cell ──────────────────────────────────────────────────────────

// interface DealValueCellProps {
//   customer: Customer
//   onSave:   (id: string, values: { dealValue: number | null; paidAmount: number | null; expectedAmount: number | null }) => Promise<void>
// }

// function DealValueCell({ customer, onSave }: DealValueCellProps) {
//   const dealValue  = (customer as any).dealValue  as number | null | undefined
//   const paidAmount = (customer as any).paidAmount as number | null | undefined
//   const dueNow     = computeRemaining(dealValue, paidAmount)

//   const [open,    setOpen]    = useState(false)
//   const [mode,    setMode]    = useState<"add" | "edit">("add")
//   const [totalIn, setTotalIn] = useState("")
//   const [paidIn,  setPaidIn]  = useState("")
//   const [addIn,   setAddIn]   = useState("")
//   const [saving,  setSaving]  = useState(false)
//   const [err,     setErr]     = useState("")
//   const totalRef = useRef<HTMLInputElement>(null)
//   const addRef   = useRef<HTMLInputElement>(null)
//   const wrapRef  = useRef<HTMLDivElement>(null)

//   const openPopover = (e: React.MouseEvent) => {
//     e.stopPropagation()
//     setErr("")
//     setTotalIn(dealValue  != null ? String(dealValue)  : "")
//     setPaidIn(paidAmount != null ? String(paidAmount) : "")
//     setAddIn("")
//     const startMode = dealValue != null ? "add" : "edit"
//     setMode(startMode)
//     setOpen(true)
//     setTimeout(() => { (startMode === "add" ? addRef : totalRef).current?.focus() }, 30)
//   }

//   const cancel = (e?: React.MouseEvent) => { e?.stopPropagation(); setOpen(false) }

//   const liveTotalEdit = totalIn.trim() === "" ? 0 : Number(totalIn)
//   const livePaidEdit  = paidIn.trim()  === "" ? 0 : Number(paidIn)
//   const liveDueEdit   = computeRemaining(liveTotalEdit, livePaidEdit)

//   const liveAddAmount    = addIn.trim() === "" ? 0 : Number(addIn)
//   const livePaidAfterAdd = (paidAmount ?? 0) + liveAddAmount
//   const liveDueAfterAdd  = computeRemaining(dealValue, livePaidAfterAdd)

//   const saveAddPayment = async (e?: React.MouseEvent) => {
//     e?.stopPropagation()
//     setErr("")
//     if (dealValue == null) { setErr("Set a total amount first"); return }
//     const amt = addIn.trim() === "" ? 0 : Number(addIn)
//     if (isNaN(amt) || amt <= 0) { setErr("Enter a payment amount greater than 0"); return }
//     const newPaid = (paidAmount ?? 0) + amt
//     if (newPaid > dealValue) { setErr("This payment would exceed the total amount"); return }
//     const due = computeRemaining(dealValue, newPaid)
//     setSaving(true)
//     await onSave(customer.id, { dealValue, paidAmount: newPaid, expectedAmount: due })
//     setSaving(false)
//     setOpen(false)
//   }

//   const saveEditTotals = async (e?: React.MouseEvent) => {
//     e?.stopPropagation()
//     setErr("")
//     const t = totalIn.trim() === "" ? null : Number(totalIn)
//     const p = paidIn.trim()  === "" ? null : Number(paidIn)
//     if (t != null && (isNaN(t) || t < 0)) { setErr("Enter a valid total amount"); return }
//     if (p != null && (isNaN(p) || p < 0)) { setErr("Enter a valid paid amount"); return }
//     if (t != null && p != null && p > t)  { setErr("Paid amount can't exceed total"); return }
//     const due = t != null ? computeRemaining(t, p) : null
//     setSaving(true)
//     await onSave(customer.id, { dealValue: t, paidAmount: p, expectedAmount: due })
//     setSaving(false)
//     setOpen(false)
//   }

//   const handleKey = (e: React.KeyboardEvent, submit: () => void) => {
//     e.stopPropagation()
//     if (e.key === "Enter")  submit()
//     if (e.key === "Escape") cancel()
//   }

//   useEffect(() => {
//     if (!open) return
//     const h = (e: MouseEvent) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
//     }
//     document.addEventListener("mousedown", h)
//     return () => document.removeEventListener("mousedown", h)
//   }, [open])

//   return (
//     <div ref={wrapRef} className="relative flex items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
//       <div className="flex flex-col leading-tight">
//         <span className={`text-sm font-semibold tabular-nums ${dealValue != null ? "text-gray-800" : "text-gray-300"}`}>
//           {dealValue != null ? formatCurrency(dealValue) : "—"}
//         </span>
//         {dealValue != null && (
//           <span className="text-[10px] text-gray-400 tabular-nums">
//             Paid {formatCurrency(paidAmount ?? 0)} · Due{" "}
//             <span className={dueNow > 0 ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
//               {formatCurrency(dueNow)}
//             </span>
//           </span>
//         )}
//       </div>
//       <button type="button" onClick={openPopover} title="Add payment / edit total"
//         className="h-5 w-5 rounded-md flex items-center justify-center text-gray-300 hover:text-[#3A7AFE] hover:bg-blue-50 transition-colors shrink-0 mt-0.5">
//         <Pencil className="h-3 w-3" />
//       </button>

//       {open && (
//         <div className="absolute left-0 top-9 z-40 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2.5 min-w-[240px]" onClick={(e) => e.stopPropagation()}>
//           <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
//             <button type="button" onClick={() => dealValue != null && setMode("add")} disabled={dealValue == null}
//               className={`flex-1 h-6 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${mode === "add" ? "bg-white text-[#3A7AFE] shadow-sm" : "text-gray-500"}`}>
//               Add Payment
//             </button>
//             <button type="button" onClick={() => setMode("edit")}
//               className={`flex-1 h-6 rounded-md text-[11px] font-semibold transition-colors ${mode === "edit" ? "bg-white text-[#3A7AFE] shadow-sm" : "text-gray-500"}`}>
//               Edit Total
//             </button>
//           </div>

//           {mode === "add" ? (
//             <>
//               <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-0.5">
//                 <div className="flex items-center justify-between text-[11px]">
//                   <span className="text-gray-400">Total</span>
//                   <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(dealValue)}</span>
//                 </div>
//                 <div className="flex items-center justify-between text-[11px]">
//                   <span className="text-gray-400">Paid so far</span>
//                   <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(paidAmount ?? 0)}</span>
//                 </div>
//               </div>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-medium text-gray-400">Payment received now</label>
//                 <div className="relative">
//                   <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
//                   <input ref={addRef} type="number" min="0" value={addIn}
//                     onChange={(e) => { setAddIn(e.target.value); setErr("") }}
//                     onKeyDown={(e) => handleKey(e, saveAddPayment)}
//                     disabled={saving} placeholder="e.g. 15000"
//                     className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:opacity-50" />
//                 </div>
//               </div>
//               <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
//                 <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">New Remaining</span>
//                 <span className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency(liveDueAfterAdd)}</span>
//               </div>
//               <div className="flex items-center gap-1.5">
//                 <button onClick={saveAddPayment} disabled={saving}
//                   className="flex-1 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
//                   {saving ? <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="h-3.5 w-3.5" />}
//                   Add Payment
//                 </button>
//                 <button onClick={cancel} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0">
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               </div>
//               {err && <p className="text-[11px] text-red-500">{err}</p>}
//               <p className="text-[10px] text-gray-400">Adds to the existing paid amount — won't overwrite it.</p>
//             </>
//           ) : (
//             <>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-medium text-gray-400">Total Amount</label>
//                 <div className="relative">
//                   <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
//                   <input ref={totalRef} type="number" min="0" value={totalIn}
//                     onChange={(e) => { setTotalIn(e.target.value); setErr("") }}
//                     onKeyDown={(e) => handleKey(e, saveEditTotals)}
//                     disabled={saving} placeholder="0"
//                     className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#3A7AFE] focus:ring-2 focus:ring-[#3A7AFE]/10 disabled:opacity-50" />
//                 </div>
//               </div>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-medium text-gray-400">Total Paid (overwrites)</label>
//                 <div className="relative">
//                   <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
//                   <input type="number" min="0" value={paidIn}
//                     onChange={(e) => { setPaidIn(e.target.value); setErr("") }}
//                     onKeyDown={(e) => handleKey(e, saveEditTotals)}
//                     disabled={saving} placeholder="0"
//                     className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:opacity-50" />
//                 </div>
//               </div>
//               <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
//                 <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Remaining / Due</span>
//                 <span className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency(liveDueEdit)}</span>
//               </div>
//               <div className="flex items-center gap-1.5">
//                 <button onClick={saveEditTotals} disabled={saving}
//                   className="flex-1 h-8 rounded-xl bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
//                   {saving ? <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="h-3.5 w-3.5" />}
//                   Save
//                 </button>
//                 <button onClick={cancel} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0">
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               </div>
//               {err && <p className="text-[11px] text-red-500">{err}</p>}
//               <p className="text-[10px] text-gray-400">Use this to correct totals. Due recalculates automatically.</p>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── Closure Date Cell ────────────────────────────────────────────────────────

// function ClosureDateCell({ customer, onSave }: { customer: Customer; onSave: (id: string, date: string | null) => Promise<void> }) {
//   const closureDate = (customer as any).closureDate as string | null | undefined
//   const [saving, setSaving] = useState(false)
//   const inputRef = useRef<HTMLInputElement>(null)

//   const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     e.stopPropagation()
//     setSaving(true)
//     await onSave(customer.id, e.target.value || null)
//     setSaving(false)
//   }

//   const triggerPicker = (e: React.MouseEvent) => {
//     e.stopPropagation()
//     inputRef.current?.showPicker?.()
//     inputRef.current?.click()
//   }

//   const rawDate = closureDate
//     ? (typeof closureDate === "string"
//         ? closureDate.slice(0, 10)
//         : new Date(closureDate as any).toISOString().slice(0, 10))
//     : ""

//   return (
//     <div className="relative flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
//       <input ref={inputRef} type="date" value={rawDate} onChange={handleChange}
//         className="absolute opacity-0 w-0 h-0 pointer-events-none" tabIndex={-1} />
//       {rawDate ? (
//         <span className="text-xs font-medium text-gray-700 cursor-pointer hover:text-[#3A7AFE] transition-colors"
//           onClick={triggerPicker} title="Click to change date">
//           {formatDate(closureDate)}
//         </span>
//       ) : (
//         <span className="text-xs text-gray-300">—</span>
//       )}
//       <button type="button" onClick={triggerPicker} disabled={saving} title="Set closure date"
//         className="h-5 w-5 rounded-md flex items-center justify-center text-gray-300 hover:text-[#3A7AFE] hover:bg-blue-50 transition-colors disabled:opacity-40">
//         {saving
//           ? <span className="h-3 w-3 border-2 border-blue-300 border-t-[#3A7AFE] rounded-full animate-spin block" />
//           : <Calendar className="h-3 w-3" />}
//       </button>
//     </div>
//   )
// }

// // ─── Main Component ───────────────────────────────────────────────────────────

// interface ConfirmState {
//   open: boolean; title: string; message: string; onConfirm: () => void
// }

// export function CustomersContent() {
//   const { customers, deleteCustomer, moveCustomerToLead, updateCustomer, users } = useCRM()
//   const { isAdmin } = useAuth()

//   const [searchTerm,         setSearchTerm]         = useState("")
//   const [statusFilter,       setStatusFilter]       = useState("all")
//   const [serviceFilter,      setServiceFilter]      = useState("all")
//   const [userFilter,         setUserFilter]         = useState("all")
//   const [selectedCustomer,   setSelectedCustomer]   = useState<Customer | null>(null)
//   const [isAddDialogOpen,    setIsAddDialogOpen]    = useState(false)
//   const [isEditDialogOpen,   setIsEditDialogOpen]   = useState(false)
//   const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
//   const [isDeleting,         setIsDeleting]         = useState<string | null>(null)
//   const [isBackToLead,       setIsBackToLead]       = useState<string | null>(null)
//   const [toast,              setToast]              = useState<ToastType | null>(null)
//   const [confirm,            setConfirm]            = useState<ConfirmState>({
//     open: false, title: "", message: "", onConfirm: () => {},
//   })

//   const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
//     setToast({ message, type })
//     setTimeout(() => setToast(null), 3500)
//   }, [])

//   // Unique assigned users for the filter dropdown
//   const assignedUsers = useMemo(() => {
//     const names = new Set<string>()
//     customers.forEach((c) => {
//       const u = (c as any).assignedUser as string | null
//       if (u && u.trim()) names.add(u.trim())
//     })
//     return Array.from(names).sort()
//   }, [customers])

//   const stats = useMemo(() => {
//     const active   = customers.filter((c) => c.status === "active").length
//     const prospect = customers.filter((c) => c.status === "prospect").length
//     const inactive = customers.filter((c) => c.status === "inactive").length
//     const totalDeal = customers.reduce((s, c) => s + (Number((c as any).dealValue) || 0), 0)
//     const totalPaid = customers.reduce((s, c) => s + (Number((c as any).paidAmount) || 0), 0)
//     const totalDue  = customers.reduce(
//       (s, c) => s + computeRemaining((c as any).dealValue, (c as any).paidAmount), 0
//     )
//     return { active, prospect, inactive, totalDeal, totalPaid, totalDue }
//   }, [customers])

//   const filtered = useMemo(() => {
//     const term = searchTerm.trim().toLowerCase()
//     return customers.filter((c) => {
//       const matchSearch = !term ||
//         [c.name, c.phone, c.company ?? "", c.city ?? "", c.service ?? ""]
//           .some((v) => (v ?? "").toLowerCase().includes(term))
//       const matchStatus  = statusFilter  === "all" || c.status  === statusFilter
//       const matchService = serviceFilter === "all" || c.service === serviceFilter
//       const matchUser    = userFilter    === "all" || (c as any).assignedUser === userFilter || (userFilter === "unassigned" && !(c as any).assignedUser)
//       return matchSearch && matchStatus && matchService && matchUser
//     })
//   }, [customers, searchTerm, statusFilter, serviceFilter, userFilter])

//   const counts = useMemo(() => ({
//     all: customers.length, active: stats.active, prospect: stats.prospect, inactive: stats.inactive,
//   }), [customers.length, stats])

//   const openConfirm = (title: string, message: string, onConfirm: () => void) =>
//     setConfirm({ open: true, title, message, onConfirm })

//   const handleDelete = useCallback((customer: Customer) => {
//     openConfirm(
//       "Delete client?",
//       `"${customer.name}" will be permanently removed. This cannot be undone.`,
//       async () => {
//         setIsDeleting(customer.id)
//         try {
//           const ok = await deleteCustomer(customer.id)
//           showToast(ok ? "Client deleted." : "Failed to delete client.", ok ? "success" : "error")
//         } catch { showToast("An error occurred.", "error") }
//         finally  { setIsDeleting(null) }
//       }
//     )
//   }, [deleteCustomer, showToast])

//   const handleBackToLead = useCallback((customer: Customer) => {
//     openConfirm(
//       "Move back to Leads?",
//       `"${customer.name}" will be moved from Clients back to Leads.`,
//       async () => {
//         setIsBackToLead(customer.id)
//         try {
//           const ok = await moveCustomerToLead(customer.id)
//           showToast(ok ? `${customer.name} moved back to Leads.` : "Failed to move client.", ok ? "success" : "error")
//         } catch { showToast("An error occurred.", "error") }
//         finally  { setIsBackToLead(null) }
//       }
//     )
//   }, [moveCustomerToLead, showToast])

//   const handleCall = useCallback((customer: Customer) => {
//     if (!customer.phone) { showToast("No phone number available.", "error"); return }
//     window.open(`tel:${customer.phone}`, "_self")
//   }, [showToast])

//   const handleWhatsApp = useCallback((customer: Customer) => {
//     const number = (customer as any).whatsappNumber || customer.phone
//     if (!number) { showToast("No WhatsApp number available.", "error"); return }
//     const clean   = number.replace(/\D/g, "")
//     const message = encodeURIComponent("Hi, following up regarding your project with Vasifytech.")
//     window.open(`https://wa.me/${clean}?text=${message}`, "_blank", "noopener,noreferrer")
//   }, [showToast])

//   const handleViewDetails = useCallback((c: Customer) => { setSelectedCustomer(c); setIsDetailDialogOpen(true) }, [])
//   const handleEdit        = useCallback((c: Customer) => { setSelectedCustomer(c); setIsEditDialogOpen(true)  }, [])
//   const handleDialogSaved = useCallback((isEdit: boolean) => showToast(isEdit ? "Client updated." : "Client added."), [showToast])

//   const handleUserSave = useCallback(async (id: string, value: string) => {
//     try {
//       const ok = await updateCustomer(id, { assignedUser: value } as any)
//       showToast(ok ? "User assigned." : "Failed to assign user.", ok ? "success" : "error")
//     } catch (e: any) {
//       showToast(e?.message || "Error assigning user.", "error")
//     }
//   }, [updateCustomer, showToast])

//   const handleDealValueSave = useCallback(async (
//     id: string,
//     values: { dealValue: number | null; paidAmount: number | null; expectedAmount: number | null }
//   ) => {
//     try {
//       const ok = await updateCustomer(id, values as any)
//       showToast(ok ? "Deal value updated." : "Failed to save.", ok ? "success" : "error")
//     } catch (e: any) {
//       if (e?.message?.includes("Unknown column")) {
//         showToast("Run migration.sql first — paid_amount/expected_amount column missing.", "error")
//       } else {
//         showToast(e?.message || "Error saving deal value.", "error")
//       }
//     }
//   }, [updateCustomer, showToast])

//   const handleClosureDateSave = useCallback(async (id: string, date: string | null) => {
//     try {
//       const ok = await updateCustomer(id, { closureDate: date } as any)
//       showToast(ok ? "Closure date saved." : "Failed to save date.", ok ? "success" : "error")
//     } catch (e: any) {
//       if (e?.message?.includes("Unknown column")) {
//         showToast("Run migration.sql first — DB column missing.", "error")
//       } else {
//         showToast(e?.message || "Error saving date.", "error")
//       }
//     }
//   }, [updateCustomer, showToast])

//   const handleExport = useCallback(() => {
//     if (!filtered.length) { showToast("No clients to export.", "error"); return }
//     exportToCSV(filtered)
//     showToast(`Exported ${filtered.length} client${filtered.length !== 1 ? "s" : ""}.`)
//   }, [filtered, showToast])

//   const clearAllFilters = () => {
//     setSearchTerm("")
//     setStatusFilter("all")
//     setServiceFilter("all")
//     setUserFilter("all")
//   }
//   const hasFilters = searchTerm || statusFilter !== "all" || serviceFilter !== "all" || userFilter !== "all"
//   const activeFilterCount = [statusFilter !== "all", serviceFilter !== "all", userFilter !== "all", !!searchTerm].filter(Boolean).length

//   const GRID_COLS = "lg:grid-cols-[2.2fr_1fr_1.2fr_1fr_80px_1.1fr_1.2fr_90px]"

//   return (
//     <div className="min-h-screen" style={{ background: "#F4F6FB" }}>

//       {/* ── Header ─────────────────────────────────────────────────────── */}
//       <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5"
//         style={{ boxShadow: "0 1px 6px 0 rgba(0,0,0,0.06)" }}>
//         <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
//           <div className="min-w-0">
//             <div className="flex items-center gap-2">
//               <h1 className="text-base sm:text-xl font-extrabold text-gray-900 tracking-tight">Client Directory</h1>
//               {activeFilterCount > 0 && (
//                 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white leading-none">
//                   <Filter className="h-2.5 w-2.5" />{activeFilterCount}
//                 </span>
//               )}
//             </div>
//             <p className="text-xs text-gray-400 mt-0.5 font-medium">
//               {activeFilterCount > 0
//                 ? <><span className="text-blue-600 font-bold">{filtered.length}</span> of {customers.length} clients</>
//                 : <>{customers.length} client{customers.length !== 1 ? "s" : ""} registered</>}
//             </p>
//           </div>
//           <div className="flex items-center gap-2 shrink-0">
//             <Button variant="outline" onClick={handleExport}
//               className="rounded-xl border-gray-200 text-gray-600 text-xs sm:text-sm font-medium h-8 sm:h-9 px-3 sm:px-3.5 gap-1.5 hidden sm:flex hover:bg-gray-50">
//               <Download className="h-3.5 w-3.5" /> Export
//             </Button>
//             <Button onClick={() => setIsAddDialogOpen(true)}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 shadow-sm">
//               <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//               <span className="hidden sm:inline">Add Client</span>
//               <span className="sm:hidden">Add</span>
//             </Button>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

//         {/* ── KPI Gradient Tiles ─────────────────────────────────────────── */}
//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
//           <GradientTile
//             label="Total Clients"
//             rawValue={customers.length}
//             gradient={TILE_GRADIENTS.total}
//             sub={filtered.length !== customers.length ? `${filtered.length} visible` : "all clients"}
//             icon={Users}
//           />
//           <GradientTile
//             label="Active"
//             rawValue={stats.active}
//             gradient={TILE_GRADIENTS.active}
//             sub={`${Math.round((stats.active / (customers.length || 1)) * 100)}% of total`}
//             icon={UserCheck}
//           />
//           <GradientTile
//             label="Prospects"
//             rawValue={stats.prospect}
//             gradient={TILE_GRADIENTS.prospect}
//             sub={`${stats.inactive} inactive`}
//             icon={UserX}
//           />
//           <GradientTile
//             label="Total Deal Value"
//             rawValue={stats.totalDeal}
//             displayValue={stats.totalDeal > 0 ? formatCurrency(stats.totalDeal) : "₹0"}
//             gradient={TILE_GRADIENTS.deal}
//             sub={stats.totalPaid > 0 ? `${formatCurrency(stats.totalPaid)} collected` : "no payments yet"}
//             icon={TrendingUp}
//           />
//           <GradientTile
//             label={stats.totalDue > 0 ? "Payment Due" : "Payments"}
//             rawValue={stats.totalDue}
//             displayValue={stats.totalDue > 0 ? formatCurrency(stats.totalDue) : "₹0"}
//             gradient={stats.totalDue > 0 ? TILE_GRADIENTS.payment : TILE_GRADIENTS.paid}
//             sub={stats.totalDue > 0 ? "still to collect" : "fully collected ✓"}
//             icon={Wallet}
//           />
//         </div>

//         {/* ── Filters ────────────────────────────────────────────────────── */}
//         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-5 py-3.5 sm:py-4 space-y-3">

//           {/* Row 1: search + status tabs */}
//           <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
//             <div className="relative w-full sm:w-72 shrink-0">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
//               <Input
//                 placeholder="Search name, phone, company…"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-9 h-9 rounded-xl border border-gray-200 focus:border-[#3A7AFE] bg-gray-50 text-sm"
//               />
//               {searchTerm && (
//                 <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               )}
//             </div>

//             {/* Status pill tabs */}
//             <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto">
//               {STATUS_FILTERS.map((f) => (
//                 <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
//                   className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
//                     statusFilter === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
//                   }`}>
//                   {f.label}
//                   <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
//                     statusFilter === f.value ? "bg-[#3A7AFE]/10 text-[#3A7AFE]" : "bg-gray-200 text-gray-500"
//                   }`}>
//                     {counts[f.value as keyof typeof counts]}
//                   </span>
//                 </button>
//               ))}
//             </div>

//             <div className="ml-auto text-xs text-gray-400 font-medium hidden lg:block shrink-0">
//               {filtered.length} of {customers.length} clients
//             </div>
//           </div>

//           {/* Row 2: service + user filters */}
//           <div className="flex items-center gap-2 flex-wrap">
//             <div className="flex items-center gap-1.5 text-gray-400 shrink-0">
//               <Filter className="h-3.5 w-3.5" />
//               <span className="text-xs font-semibold">Filters:</span>
//             </div>

//             {/* Service filter */}
//             <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
//               className="h-8 rounded-xl border border-gray-200 text-xs px-2.5 bg-white text-gray-700 focus:border-[#3A7AFE] focus:outline-none cursor-pointer">
//               <option value="all">All Services</option>
//               {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
//             </select>

//             {/* User filter */}
//             <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
//               className="h-8 rounded-xl border border-gray-200 text-xs px-2.5 bg-white text-gray-700 focus:border-[#3A7AFE] focus:outline-none cursor-pointer">
//               <option value="all">All Users</option>
//               <option value="unassigned">Unassigned</option>
//               {assignedUsers.map((u) => <option key={u} value={u}>{u}</option>)}
//             </select>

//             {/* Active filter chips */}
//             {serviceFilter !== "all" && (
//               <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">
//                 {SERVICE_LABELS[serviceFilter] ?? serviceFilter}
//                 <button type="button" onClick={() => setServiceFilter("all")}><X className="h-2.5 w-2.5" /></button>
//               </span>
//             )}
//             {userFilter !== "all" && (
//               <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
//                 👤 {userFilter === "unassigned" ? "Unassigned" : userFilter}
//                 <button type="button" onClick={() => setUserFilter("all")}><X className="h-2.5 w-2.5" /></button>
//               </span>
//             )}

//             {hasFilters && (
//               <button type="button" onClick={clearAllFilters}
//                 className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 ml-auto px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
//                 <X className="h-3 w-3" />Clear{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
//               </button>
//             )}
//           </div>
//         </div>

//         {/* ── Table ──────────────────────────────────────────────────────── */}
//         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

//           {/* Table header */}
//           <div className={`hidden lg:grid ${GRID_COLS} gap-4 px-6 py-3 border-b-2 border-gray-200 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest`}
//             style={{ background: "#F1F4F8" }}>
//             {["Client / Company","Phone","Service","User","Status","Closure Date","Deal Value","Actions"].map((h, i) => (
//               <div key={h} className={i === 7 ? "text-right" : ""}>
//                 {h}
//                 {/* {h === "User" && <span className="ml-1 text-gray-300 font-normal normal-case text-[9px]">(click to edit)</span>} */}
//                 {/* {h === "Deal Value" && <span className="ml-1 text-gray-300 font-normal normal-case text-[9px]">(✎ Total/Paid · Due auto)</span>} */}
//               </div>
//             ))}
//           </div>

//           {/* Empty state */}
//           {filtered.length === 0 && (
//             <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-gray-400">
//               <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 border border-gray-100">
//                 <Building2 className="h-8 w-8 opacity-30" />
//               </div>
//               <p className="text-sm font-semibold text-gray-500 mb-1">
//                 {hasFilters ? "No clients match your filters" : "No clients yet"}
//               </p>
//               {hasFilters
//                 ? <button type="button" onClick={clearAllFilters} className="text-xs text-[#3A7AFE] font-semibold hover:underline mt-1">Clear filters</button>
//                 : <p className="text-xs text-gray-400">Add your first client to get started.</p>
//               }
//             </div>
//           )}

//           {/* Rows */}
//           <div className="divide-y divide-gray-50" role="list">
//             {filtered.map((customer, idx) => {
//               const svc    = customer.service ?? ""
//               const status = STATUS_CONFIG[customer.status ?? "active"] ?? STATUS_CONFIG.active

//               return (
//                 <div
//                   key={customer.id}
//                   role="listitem"
//                   tabIndex={0}
//                   className={`group cursor-pointer transition-all duration-150 hover:bg-blue-50/40 focus:outline-none focus:bg-blue-50/40 relative ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}
//                   onClick={() => handleViewDetails(customer)}
//                   onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleViewDetails(customer) }}
//                 >
//                   {/* Left hover accent */}
//                   <span className="absolute left-0 top-0 h-full w-[3px] rounded-r bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

//                   {/* Desktop row */}
//                   <div className={`hidden lg:grid ${GRID_COLS} gap-4 items-center px-6 py-4`}>

//                     {/* Client / Company */}
//                     <div className="flex items-center gap-3 min-w-0">
//                       <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-sm"
//                         style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)" }}>
//                         {customer.name?.charAt(0)?.toUpperCase() ?? "C"}
//                       </div>
//                       <div className="min-w-0">
//                         <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{customer.name || "Unnamed"}</p>
//                         <p className="text-xs text-gray-400 truncate">{customer.company || displayEmail(customer.email) || "—"}</p>
//                       </div>
//                     </div>

//                     {/* Phone */}
//                     <div className="min-w-0">
//                       <span className="text-sm text-gray-700 font-medium truncate block">{customer.phone || "—"}</span>
//                     </div>

//                     {/* Service */}
//                     <div className="min-w-0">
//                       {svc ? (
//                         <span className="inline-block text-xs text-violet-700 font-semibold bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-lg truncate max-w-full">
//                           {SERVICE_LABELS[svc] ?? svc}
//                         </span>
//                       ) : <span className="text-xs text-gray-300">—</span>}
//                     </div>

//                     {/* User */}
//                     <div onClick={(e) => e.stopPropagation()}>
//                       <UserCell customer={customer} crmUsers={users} onSave={handleUserSave} />
//                     </div>

//                     {/* Status */}
//                     <div>
//                       <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-2 py-0.5 rounded-full whitespace-nowrap ${status.cls}`}>
//                         <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
//                         {status.label}
//                       </span>
//                     </div>

//                     {/* Closure Date */}
//                     <div>
//                       <ClosureDateCell customer={customer} onSave={handleClosureDateSave} />
//                     </div>

//                     {/* Deal Value */}
//                     <div>
//                       <DealValueCell customer={customer} onSave={handleDealValueSave} />
//                     </div>

//                     {/* Actions */}
//                     <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
//                       <Button variant="ghost" size="sm" disabled={!customer.phone} onClick={() => handleCall(customer)}
//                         className="h-8 w-8 p-0 rounded-xl hover:bg-blue-50 hover:text-[#3A7AFE] text-gray-300 transition-colors" title="Call">
//                         <Phone className="h-3.5 w-3.5" />
//                       </Button>
//                       <Button variant="ghost" size="sm" disabled={!customer.whatsappNumber && !customer.phone} onClick={() => handleWhatsApp(customer)}
//                         className="h-8 w-8 p-0 rounded-xl hover:bg-green-50 hover:text-green-600 text-gray-300 transition-colors" title="WhatsApp">
//                         <MessageCircle className="h-3.5 w-3.5" />
//                       </Button>
//                       <Button variant="ghost" size="sm" onClick={() => handleViewDetails(customer)}
//                         className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300 transition-colors" title="View">
//                         <Eye className="h-3.5 w-3.5" />
//                       </Button>
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" size="sm"
//                             className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300 transition-colors"
//                             disabled={isDeleting === customer.id || isBackToLead === customer.id}>
//                             <MoreHorizontal className="h-4 w-4" />
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end" className="w-44 rounded-xl border border-gray-100 shadow-xl p-1">
//                           <DropdownMenuItem onSelect={() => handleEdit(customer)} className="text-sm rounded-lg gap-2">
//                             <Edit className="h-3.5 w-3.5 text-gray-400" /> Edit Client
//                           </DropdownMenuItem>
//                           <DropdownMenuItem onSelect={() => handleBackToLead(customer)} disabled={isBackToLead === customer.id} className="text-sm rounded-lg gap-2">
//                             <Undo2 className="h-3.5 w-3.5 text-amber-500" />
//                             {isBackToLead === customer.id ? "Moving…" : "Back to Lead"}
//                           </DropdownMenuItem>
//                           {isAdmin && (
//                             <>
//                               <DropdownMenuSeparator className="my-1" />
//                               <DropdownMenuItem onSelect={() => handleDelete(customer)} disabled={isDeleting === customer.id}
//                                 className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg gap-2">
//                                 <Trash2 className="h-3.5 w-3.5" />
//                                 {isDeleting === customer.id ? "Deleting…" : "Delete"}
//                               </DropdownMenuItem>
//                             </>
//                           )}
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>
//                   </div>

//                   {/* Mobile row */}
//                   <div className="lg:hidden px-4 py-4 flex items-start gap-3">
//                     <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-sm"
//                       style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)" }}>
//                       {customer.name?.charAt(0)?.toUpperCase() ?? "C"}
//                     </div>
//                     <div className="flex-1 min-w-0 space-y-1.5">
//                       <div className="flex items-start justify-between gap-2">
//                         <div className="min-w-0">
//                           <p className="text-sm font-semibold text-gray-900 truncate">{customer.name || "Unnamed"}</p>
//                           {customer.company && <p className="text-xs text-gray-400 truncate">{customer.company}</p>}
//                         </div>
//                         <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full shrink-0 ${status.cls}`}>
//                           <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
//                           {status.label}
//                         </span>
//                       </div>
//                       <div className="flex items-center gap-3 flex-wrap">
//                         <span className="text-xs text-gray-500 flex items-center gap-1">
//                           <Phone className="h-3 w-3 text-gray-300" />{customer.phone || "—"}
//                         </span>
//                         {svc && (
//                           <span className="text-xs text-violet-600 font-semibold bg-violet-50 px-1.5 py-0.5 rounded-md">
//                             {SERVICE_LABELS[svc] ?? svc}
//                           </span>
//                         )}
//                       </div>
//                       <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
//                         {(customer as any).assignedUser && <span>👤 {(customer as any).assignedUser}</span>}
//                         {(customer as any).closureDate   && <span>📅 {formatDate((customer as any).closureDate)}</span>}
//                         {(customer as any).dealValue != null && (
//                           <span className="font-semibold text-gray-700">
//                             {formatCurrency((customer as any).dealValue)}{" "}
//                             <span className="text-amber-600 font-medium">
//                               Due {formatCurrency(computeRemaining((customer as any).dealValue, (customer as any).paidAmount))}
//                             </span>
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
//                       <Button variant="ghost" size="sm" onClick={() => handleCall(customer)} disabled={!customer.phone}
//                         className="h-8 w-8 p-0 rounded-xl hover:bg-blue-50 hover:text-[#3A7AFE] text-gray-300">
//                         <Phone className="h-3.5 w-3.5" />
//                       </Button>
//                       <Button variant="ghost" size="sm" onClick={() => handleWhatsApp(customer)} disabled={!(customer as any).whatsappNumber && !customer.phone}
//                         className="h-8 w-8 p-0 rounded-xl hover:bg-green-50 hover:text-green-600 text-gray-300">
//                         <MessageCircle className="h-3.5 w-3.5" />
//                       </Button>
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300">
//                             <MoreHorizontal className="h-4 w-4" />
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end" className="w-44 rounded-xl border border-gray-100 shadow-xl p-1">
//                           <DropdownMenuItem onSelect={() => handleViewDetails(customer)} className="text-sm rounded-lg gap-2">
//                             <Eye className="h-3.5 w-3.5 text-gray-400" /> View Profile
//                           </DropdownMenuItem>
//                           <DropdownMenuItem onSelect={() => handleEdit(customer)} className="text-sm rounded-lg gap-2">
//                             <Edit className="h-3.5 w-3.5 text-gray-400" /> Edit Client
//                           </DropdownMenuItem>
//                           <DropdownMenuItem onSelect={() => handleBackToLead(customer)} className="text-sm rounded-lg gap-2">
//                             <Undo2 className="h-3.5 w-3.5 text-amber-500" /> Back to Lead
//                           </DropdownMenuItem>
//                           {isAdmin && (
//                             <>
//                               <DropdownMenuSeparator className="my-1" />
//                               <DropdownMenuItem onSelect={() => handleDelete(customer)} className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg gap-2">
//                                 <Trash2 className="h-3.5 w-3.5" />
//                                 {isDeleting === customer.id ? "Deleting…" : "Delete"}
//                               </DropdownMenuItem>
//                             </>
//                           )}
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>
//                   </div>
//                 </div>
//               )
//             })}
//           </div>

//           {/* Footer */}
//           {filtered.length > 0 && (
//             <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
//               <p className="text-xs text-gray-400">
//                 Showing <span className="font-bold text-gray-600">{filtered.length}</span> of{" "}
//                 <span className="font-bold text-gray-600">{customers.length}</span> clients
//               </p>
//               <button type="button" onClick={handleExport}
//                 className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#3A7AFE] font-semibold transition-colors">
//                 <Download className="h-3.5 w-3.5" />
//                 Export {filtered.length !== customers.length ? "filtered" : "all"}
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── Dialogs ─────────────────────────────────────────────────────── */}
//       <CustomerDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} customer={null} mode="add" onSaved={() => handleDialogSaved(false)} />
//       <CustomerDialog
//         open={isEditDialogOpen}
//         onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setSelectedCustomer(null) }}
//         customer={selectedCustomer} mode="edit" onSaved={() => handleDialogSaved(true)}
//       />
//       <CustomerDetailDialog
//         open={isDetailDialogOpen}
//         onOpenChange={(open) => { setIsDetailDialogOpen(open); if (!open) setSelectedCustomer(null) }}
//         customer={selectedCustomer}
//         onCallCustomer={handleCall}
//         onWhatsAppCustomer={handleWhatsApp}
//         onEditCustomer={handleEdit}
//         onScheduleMeeting={(c) => showToast(`Meeting scheduling coming soon for ${c.name}.`)}
//       />

//       <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((p) => ({ ...p, open }))}>
//         <AlertDialogContent className="rounded-2xl border border-gray-100 shadow-2xl max-w-sm">
//           <AlertDialogHeader>
//             <AlertDialogTitle className="text-base font-bold text-gray-900">{confirm.title}</AlertDialogTitle>
//             <AlertDialogDescription className="text-sm text-gray-500">{confirm.message}</AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel className="rounded-xl border-gray-200 text-gray-600 text-sm font-medium">Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={confirm.onConfirm} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium">Confirm</AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
//     </div>
//   )
// }





//testing





// "use client"

// import { useMemo, useState, useCallback, useRef, useEffect } from "react"
// import { useCRM } from "@/contexts/crm-context"
// import { useAuth } from "@/contexts/auth-context"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import {
//   DropdownMenu, DropdownMenuContent, DropdownMenuItem,
//   DropdownMenuSeparator, DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel,
//   AlertDialogContent, AlertDialogDescription,
//   AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
// } from "@/components/ui/alert-dialog"
// import { CustomerDialog }       from "./customer-dialog"
// import { CustomerDetailDialog } from "./customer-detail-dialog"
// import {
//   Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
//   Undo2, Building2, CheckCircle2,
//   XCircle, Download, Filter, Pencil, Check, X, Calendar,
//   Users, TrendingUp, UserCheck, UserX, ArrowUpRight,
//   Wallet,
// } from "lucide-react"
// import type { Customer } from "@/types/crm"

// // ─── Constants ────────────────────────────────────────────────────────────────

// export const SERVICE_LABELS: Record<string, string> = {
//   "whatsapp-api":    "WhatsApp API",
//   "web-development": "Web Development",
//   "seo":             "SEO / Marketing",
//   "social-media":    "Social Media",
//   "crm-development": "CRM Development",
//   "app-development": "App Development",
//   "cloud-hosting":   "Cloud & Hosting",
//   "it-support":      "IT Support",
//   "other":           "Other",
// }

// export const BUSINESS_TYPE_LABELS: Record<string, string> = {
//   "startup":    "Startup",
//   "sme":        "SME",
//   "enterprise": "Enterprise",
//   "agency":     "Agency",
//   "ecommerce":  "E-commerce",
//   "ngo":        "NGO / Non-Profit",
//   "individual": "Individual / Freelancer",
//   "other":      "Other",
// }

// const STATUS_CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
//   active:   { label: "Active",   dot: "bg-emerald-400", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
//   inactive: { label: "Inactive", dot: "bg-gray-300",    cls: "bg-gray-50    text-gray-500    border-gray-200"   },
//   prospect: { label: "Prospect", dot: "bg-blue-400",    cls: "bg-blue-50    text-blue-700    border-blue-200"   },
// }

// const STATUS_FILTERS = [
//   { value: "all",      label: "All"      },
//   { value: "active",   label: "Active"   },
//   { value: "prospect", label: "Prospect" },
//   { value: "inactive", label: "Inactive" },
// ]

// const TILE_GRADIENTS = {
//   total:    ["#6D5DF6", "#8B7CF8"] as [string, string],
//   active:   ["#1E5FE0", "#2E7BF6"] as [string, string],
//   prospect: ["#D97706", "#F59E0B"] as [string, string],
//   deal:     ["#0E8FD9", "#23B6E0"] as [string, string],
//   payment:  ["#E11D48", "#F43F5E"] as [string, string],
//   paid:     ["#0FA968", "#22C97E"] as [string, string],
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// export const formatDate = (v: unknown): string => {
//   if (!v) return "—"
//   const d = v instanceof Date ? v : new Date(v as string)
//   return isNaN(d.getTime()) ? "—"
//     : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
// }

// export const displayEmail = (email: string | undefined): string | null => {
//   if (!email) return null
//   const syntheticDomains = ["@manual.", "@booking.", "@whatsapp."]
//   return syntheticDomains.some((d) => email.includes(d)) ? null : email
// }

// const formatCurrency = (v: unknown): string => {
//   if (v == null || v === "") return "—"
//   const n = Number(v)
//   if (isNaN(n)) return "—"
//   if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
//   if (n >= 1_000)     return `₹${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
//   return `₹${n.toLocaleString("en-IN")}`
// }

// const computeRemaining = (total: number | null | undefined, paid: number | null | undefined): number => {
//   const t = total ?? 0
//   const p = paid  ?? 0
//   return Math.max(t - p, 0)
// }

// // ─── Count-up hook ────────────────────────────────────────────────────────────

// function useCountUp(target: number, durationMs = 800) {
//   const [value, setValue] = useState(0)
//   const startRef = useRef<number | null>(null)
//   const fromRef  = useRef(0)
//   useEffect(() => {
//     fromRef.current = value; startRef.current = null
//     let raf: number
//     const tick = (ts: number) => {
//       if (startRef.current === null) startRef.current = ts
//       const t = Math.min((ts - startRef.current) / durationMs, 1)
//       const e = 1 - Math.pow(1 - t, 3)
//       setValue(fromRef.current + (target - fromRef.current) * e)
//       if (t < 1) raf = requestAnimationFrame(tick)
//     }
//     raf = requestAnimationFrame(tick)
//     return () => cancelAnimationFrame(raf)
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [target])
//   return value
// }

// // ─── CSV export ───────────────────────────────────────────────────────────────

// const exportToCSV = (customers: Customer[]) => {
//   const headers = [
//     "Name","Company","Phone","Email","Service","Business Type",
//     "Status","Assigned User",
//     "Deal Value Total (₹)","Paid Amount (₹)","Remaining / Due (₹)",
//     "Total Value (₹)",
//     "Closure Date","Onboarding Date","City","State",
//   ]
//   const rows = customers.map((c) => {
//     const total = (c as any).dealValue ?? null
//     const paid  = (c as any).paidAmount ?? null
//     return [
//       c.name ?? "", c.company ?? "", c.phone ?? "",
//       displayEmail(c.email) ?? "",
//       SERVICE_LABELS[c.service ?? ""] ?? c.service ?? "",
//       BUSINESS_TYPE_LABELS[(c as any).businessType ?? ""] ?? (c as any).businessType ?? "",
//       c.status ?? "", (c as any).assignedUser ?? "",
//       total ?? "",
//       paid ?? "",
//       total != null ? computeRemaining(total, paid) : "",
//       c.totalValue ?? 0,
//       (c as any).closureDate ? formatDate((c as any).closureDate) : "",
//       (c as any).onboardingDate ? formatDate((c as any).onboardingDate) : formatDate(c.createdAt),
//       c.city ?? "", c.state ?? "",
//     ]
//   })
//   const escape = (val: unknown) => {
//     const s = String(val ?? "")
//     return s.includes(",") || s.includes('"') || s.includes("\n")
//       ? `"${s.replace(/"/g, '""')}"` : s
//   }
//   const csv  = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n")
//   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
//   const url  = URL.createObjectURL(blob)
//   const a    = document.createElement("a")
//   a.href     = url
//   a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`
//   a.click()
//   URL.revokeObjectURL(url)
// }

// // ─── Toast ────────────────────────────────────────────────────────────────────

// type ToastType = { message: string; type: "success" | "error" }

// function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
//   return (
//     <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium animate-in slide-in-from-bottom-3 ${
//       toast.type === "success"
//         ? "bg-white border-emerald-100 text-emerald-700"
//         : "bg-white border-red-100 text-red-600"
//     }`}>
//       {toast.type === "success"
//         ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
//         : <XCircle      className="h-4 w-4 text-red-500 shrink-0" />}
//       {toast.message}
//       <button onClick={onDismiss} className="ml-1 text-gray-300 hover:text-gray-500 transition-colors">
//         <X className="h-3.5 w-3.5" />
//       </button>
//     </div>
//   )
// }

// // ─── Gradient KPI Tile (matches Leads page) ────────────────────────────────────

// function GradientTile({
//   label, rawValue, displayValue, gradient, sub, icon: Icon,
// }: {
//   label: string; rawValue: number; displayValue?: string
//   gradient: [string, string]; sub?: string; icon: React.ElementType
// }) {
//   const animated = useCountUp(rawValue)
//   const display  = displayValue ?? Math.round(animated).toLocaleString("en-IN")
//   return (
//     <div
//       className="relative overflow-hidden rounded-2xl p-4 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default select-none"
//       style={{ background: `linear-gradient(135deg,${gradient[0]},${gradient[1]})` }}
//     >
//       <div className="absolute -right-4 -top-5 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
//       <div className="absolute -right-1 -bottom-6 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
//       <div className="relative flex items-start justify-between gap-2">
//         <div className="min-w-0 flex-1">
//           <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 truncate">{label}</p>
//           <p className="text-2xl font-extrabold mt-1.5 tabular-nums leading-none tracking-tight">{display}</p>
//           {sub && (
//             <div className="flex items-center gap-0.5 mt-2">
//               <ArrowUpRight className="h-3 w-3 text-white/60 shrink-0" />
//               <span className="text-[11px] font-semibold text-white/75 truncate">{sub}</span>
//             </div>
//           )}
//         </div>
//         <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
//           <Icon className="h-[18px] w-[18px] text-white" />
//         </div>
//       </div>
//     </div>
//   )
// }

// // ─── UserCell ─────────────────────────────────────────────────────────────────

// interface UserCellProps {
//   customer: Customer
//   crmUsers: { id: string; name: string }[]
//   onSave:   (id: string, value: string) => Promise<void>
// }

// function UserCell({ customer, crmUsers, onSave }: UserCellProps) {
//   const currentUser = (customer as any).assignedUser as string | null
//   const [editing, setEditing]   = useState(false)
//   const [value,   setValue]     = useState(currentUser ?? "")
//   const [saving,  setSaving]    = useState(false)
//   const [showDrop, setShowDrop] = useState(false)
//   const inputRef                = useRef<HTMLInputElement>(null)
//   const wrapRef                 = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     if (!editing) setValue((customer as any).assignedUser ?? "")
//   }, [(customer as any).assignedUser, editing])

//   const startEdit = (e: React.MouseEvent) => {
//     e.stopPropagation()
//     setValue((customer as any).assignedUser ?? "")
//     setEditing(true)
//     setShowDrop(true)
//     setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 20)
//   }

//   const cancel = (e?: React.MouseEvent) => {
//     e?.stopPropagation()
//     setEditing(false)
//     setShowDrop(false)
//     setValue((customer as any).assignedUser ?? "")
//   }

//   const save = async (val?: string) => {
//     const finalVal = (val ?? value).trim()
//     setSaving(true)
//     await onSave(customer.id, finalVal)
//     setSaving(false)
//     setEditing(false)
//     setShowDrop(false)
//   }

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     e.stopPropagation()
//     if (e.key === "Enter")  { save() }
//     if (e.key === "Escape") { cancel() }
//   }

//   useEffect(() => {
//     if (!editing) return
//     const h = (e: MouseEvent) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { save() }
//     }
//     document.addEventListener("mousedown", h)
//     return () => document.removeEventListener("mousedown", h)
//   }, [editing, value])

//   const filtered = crmUsers.filter(
//     (u) => !value || u.name.toLowerCase().includes(value.toLowerCase())
//   ).slice(0, 6)

//   if (editing) {
//     return (
//       <div ref={wrapRef} className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
//         <input
//           ref={inputRef}
//           type="text"
//           value={value}
//           onChange={(e) => { setValue(e.target.value); setShowDrop(true) }}
//           onKeyDown={handleKeyDown}
//           disabled={saving}
//           placeholder="Name or pick below…"
//           className="w-28 h-7 text-xs border border-[#3A7AFE] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#3A7AFE]/20 disabled:opacity-50"
//         />
//         <button onClick={() => save()} disabled={saving}
//           className="h-6 w-6 rounded-lg bg-[#3A7AFE] hover:bg-[#2563EB] text-white flex items-center justify-center transition-colors disabled:opacity-50 shrink-0" title="Save">
//           {saving
//             ? <span className="h-2.5 w-2.5 border border-white border-t-transparent rounded-full animate-spin block" />
//             : <Check className="h-3 w-3" />}
//         </button>
//         <button onClick={cancel}
//           className="h-6 w-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0" title="Cancel">
//           <X className="h-3 w-3" />
//         </button>
//         {showDrop && filtered.length > 0 && (
//           <div className="absolute left-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px] max-h-40 overflow-y-auto">
//             {filtered.map((u) => (
//               <button key={u.id} type="button"
//                 onMouseDown={(e) => { e.preventDefault(); setValue(u.name); save(u.name) }}
//                 className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left text-xs">
//                 <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 shrink-0">
//                   {u.name.charAt(0).toUpperCase()}
//                 </span>
//                 <span className="text-gray-700 font-medium truncate">{u.name}</span>
//               </button>
//             ))}
//           </div>
//         )}
//       </div>
//     )
//   }

//   return (
//     <div className="group/user flex items-center gap-1.5 cursor-pointer min-w-0" onClick={startEdit} title="Click to assign user">
//       {currentUser ? (
//         <>
//           <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 shrink-0">
//             {currentUser.charAt(0).toUpperCase()}
//           </div>
//           <span className="text-xs text-gray-700 font-medium truncate">{currentUser}</span>
//         </>
//       ) : (
//         <span className="text-xs text-gray-300 italic">Assign…</span>
//       )}
//       <Pencil className="h-2.5 w-2.5 text-gray-300 opacity-0 group-hover/user:opacity-100 transition-opacity shrink-0 ml-0.5" />
//     </div>
//   )
// }

// // ─── Deal Value Cell ──────────────────────────────────────────────────────────
// // ✅ CHANGED — this cell now only shows Total + Paid. The "Due" figure that
// // used to live in the sub-line here has moved out into its own DueCell
// // (rendered as a separate column to the right). Editing still happens here
// // via the pencil → popover (Add Payment / Edit Total), unchanged.

// interface DealValueCellProps {
//   customer: Customer
//   onSave:   (id: string, values: { dealValue: number | null; paidAmount: number | null; expectedAmount: number | null }) => Promise<void>
// }

// function DealValueCell({ customer, onSave }: DealValueCellProps) {
//   const dealValue  = (customer as any).dealValue  as number | null | undefined
//   const paidAmount = (customer as any).paidAmount as number | null | undefined

//   const [open,    setOpen]    = useState(false)
//   const [mode,    setMode]    = useState<"add" | "edit">("add")
//   const [totalIn, setTotalIn] = useState("")
//   const [paidIn,  setPaidIn]  = useState("")
//   const [addIn,   setAddIn]   = useState("")
//   const [saving,  setSaving]  = useState(false)
//   const [err,     setErr]     = useState("")
//   const totalRef = useRef<HTMLInputElement>(null)
//   const addRef   = useRef<HTMLInputElement>(null)
//   const wrapRef  = useRef<HTMLDivElement>(null)

//   const openPopover = (e: React.MouseEvent) => {
//     e.stopPropagation()
//     setErr("")
//     setTotalIn(dealValue  != null ? String(dealValue)  : "")
//     setPaidIn(paidAmount != null ? String(paidAmount) : "")
//     setAddIn("")
//     const startMode = dealValue != null ? "add" : "edit"
//     setMode(startMode)
//     setOpen(true)
//     setTimeout(() => { (startMode === "add" ? addRef : totalRef).current?.focus() }, 30)
//   }

//   const cancel = (e?: React.MouseEvent) => { e?.stopPropagation(); setOpen(false) }

//   const liveTotalEdit = totalIn.trim() === "" ? 0 : Number(totalIn)
//   const livePaidEdit  = paidIn.trim()  === "" ? 0 : Number(paidIn)
//   const liveDueEdit   = computeRemaining(liveTotalEdit, livePaidEdit)

//   const liveAddAmount    = addIn.trim() === "" ? 0 : Number(addIn)
//   const livePaidAfterAdd = (paidAmount ?? 0) + liveAddAmount
//   const liveDueAfterAdd  = computeRemaining(dealValue, livePaidAfterAdd)

//   const saveAddPayment = async (e?: React.MouseEvent) => {
//     e?.stopPropagation()
//     setErr("")
//     if (dealValue == null) { setErr("Set a total amount first"); return }
//     const amt = addIn.trim() === "" ? 0 : Number(addIn)
//     if (isNaN(amt) || amt <= 0) { setErr("Enter a payment amount greater than 0"); return }
//     const newPaid = (paidAmount ?? 0) + amt
//     if (newPaid > dealValue) { setErr("This payment would exceed the total amount"); return }
//     const due = computeRemaining(dealValue, newPaid)
//     setSaving(true)
//     await onSave(customer.id, { dealValue, paidAmount: newPaid, expectedAmount: due })
//     setSaving(false)
//     setOpen(false)
//   }

//   const saveEditTotals = async (e?: React.MouseEvent) => {
//     e?.stopPropagation()
//     setErr("")
//     const t = totalIn.trim() === "" ? null : Number(totalIn)
//     const p = paidIn.trim()  === "" ? null : Number(paidIn)
//     if (t != null && (isNaN(t) || t < 0)) { setErr("Enter a valid total amount"); return }
//     if (p != null && (isNaN(p) || p < 0)) { setErr("Enter a valid paid amount"); return }
//     if (t != null && p != null && p > t)  { setErr("Paid amount can't exceed total"); return }
//     const due = t != null ? computeRemaining(t, p) : null
//     setSaving(true)
//     await onSave(customer.id, { dealValue: t, paidAmount: p, expectedAmount: due })
//     setSaving(false)
//     setOpen(false)
//   }

//   const handleKey = (e: React.KeyboardEvent, submit: () => void) => {
//     e.stopPropagation()
//     if (e.key === "Enter")  submit()
//     if (e.key === "Escape") cancel()
//   }

//   useEffect(() => {
//     if (!open) return
//     const h = (e: MouseEvent) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
//     }
//     document.addEventListener("mousedown", h)
//     return () => document.removeEventListener("mousedown", h)
//   }, [open])

//   return (
//     // 🔧 UI FIX — justify-end + text-right (on the inner block below) right-align this
//     // column so it matches the right-aligned "Due" column and header label next to it,
//     // instead of sitting flush-left while Due sits flush-right.
//     <div ref={wrapRef} className="relative flex items-start justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
//       <div className="flex flex-col leading-tight text-right">
//         <span className={`text-sm font-semibold tabular-nums ${dealValue != null ? "text-gray-800" : "text-gray-300"}`}>
//           {dealValue != null ? formatCurrency(dealValue) : "—"}
//         </span>
//         {/* ✅ CHANGED — only the Paid sub-line remains; Due moved to its own column */}
//         {dealValue != null && (
//           <span className="text-[10px] text-gray-400 tabular-nums">
//             Paid {formatCurrency(paidAmount ?? 0)}
//           </span>
//         )}
//       </div>
//       <button type="button" onClick={openPopover} title="Add payment / edit total"
//         className="h-5 w-5 rounded-md flex items-center justify-center text-gray-300 hover:text-[#3A7AFE] hover:bg-blue-50 transition-colors shrink-0 mt-0.5">
//         <Pencil className="h-3 w-3" />
//       </button>

//       {open && (
//         // 🔧 UI FIX — anchored from the right (was left-0) so it still drops directly
//         // under the now right-aligned trigger, and capped at 90vw so it can never run
//         // off-screen on narrow viewports.
//         <div className="absolute right-0 top-9 z-40 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2.5 min-w-[240px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
//           <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
//             <button type="button" onClick={() => dealValue != null && setMode("add")} disabled={dealValue == null}
//               className={`flex-1 h-6 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${mode === "add" ? "bg-white text-[#3A7AFE] shadow-sm" : "text-gray-500"}`}>
//               Add Payment
//             </button>
//             <button type="button" onClick={() => setMode("edit")}
//               className={`flex-1 h-6 rounded-md text-[11px] font-semibold transition-colors ${mode === "edit" ? "bg-white text-[#3A7AFE] shadow-sm" : "text-gray-500"}`}>
//               Edit Total
//             </button>
//           </div>

//           {mode === "add" ? (
//             <>
//               <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-0.5">
//                 <div className="flex items-center justify-between text-[11px]">
//                   <span className="text-gray-400">Total</span>
//                   <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(dealValue)}</span>
//                 </div>
//                 <div className="flex items-center justify-between text-[11px]">
//                   <span className="text-gray-400">Paid so far</span>
//                   <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(paidAmount ?? 0)}</span>
//                 </div>
//               </div>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-medium text-gray-400">Payment received now</label>
//                 <div className="relative">
//                   <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
//                   <input ref={addRef} type="number" min="0" value={addIn}
//                     onChange={(e) => { setAddIn(e.target.value); setErr("") }}
//                     onKeyDown={(e) => handleKey(e, saveAddPayment)}
//                     disabled={saving} placeholder="e.g. 15000"
//                     className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:opacity-50" />
//                 </div>
//               </div>
//               <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
//                 <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">New Remaining</span>
//                 <span className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency(liveDueAfterAdd)}</span>
//               </div>
//               <div className="flex items-center gap-1.5">
//                 <button onClick={saveAddPayment} disabled={saving}
//                   className="flex-1 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
//                   {saving ? <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="h-3.5 w-3.5" />}
//                   Add Payment
//                 </button>
//                 <button onClick={cancel} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0">
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               </div>
//               {err && <p className="text-[11px] text-red-500">{err}</p>}
//               <p className="text-[10px] text-gray-400">Adds to the existing paid amount — won't overwrite it.</p>
//             </>
//           ) : (
//             <>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-medium text-gray-400">Total Amount</label>
//                 <div className="relative">
//                   <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
//                   <input ref={totalRef} type="number" min="0" value={totalIn}
//                     onChange={(e) => { setTotalIn(e.target.value); setErr("") }}
//                     onKeyDown={(e) => handleKey(e, saveEditTotals)}
//                     disabled={saving} placeholder="0"
//                     className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#3A7AFE] focus:ring-2 focus:ring-[#3A7AFE]/10 disabled:opacity-50" />
//                 </div>
//               </div>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-medium text-gray-400">Total Paid (overwrites)</label>
//                 <div className="relative">
//                   <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
//                   <input type="number" min="0" value={paidIn}
//                     onChange={(e) => { setPaidIn(e.target.value); setErr("") }}
//                     onKeyDown={(e) => handleKey(e, saveEditTotals)}
//                     disabled={saving} placeholder="0"
//                     className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:opacity-50" />
//                 </div>
//               </div>
//               <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
//                 <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Remaining / Due</span>
//                 <span className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency(liveDueEdit)}</span>
//               </div>
//               <div className="flex items-center gap-1.5">
//                 <button onClick={saveEditTotals} disabled={saving}
//                   className="flex-1 h-8 rounded-xl bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
//                   {saving ? <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="h-3.5 w-3.5" />}
//                   Save
//                 </button>
//                 <button onClick={cancel} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0">
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               </div>
//               {err && <p className="text-[11px] text-red-500">{err}</p>}
//               <p className="text-[10px] text-gray-400">Use this to correct totals. Due recalculates automatically.</p>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── Due (Expected) Cell ──────────────────────────────────────────────────────
// // ✅ NEW — a simple read-only display of the remaining/due amount, rendered
// // as its own column to the right of Deal Value. Editing still happens via
// // DealValueCell's pencil → popover (the Due value is always derived, never
// // directly typed in).

// function DueCell({ customer }: { customer: Customer }) {
//   const dealValue  = (customer as any).dealValue  as number | null | undefined
//   const paidAmount = (customer as any).paidAmount as number | null | undefined

//   if (dealValue == null) {
//     return <span className="text-sm text-gray-300">—</span>
//   }

//   const due = computeRemaining(dealValue, paidAmount)

//   return (
//     <span className={`text-sm font-semibold tabular-nums ${due > 0 ? "text-amber-600" : "text-emerald-600"}`}>
//       {formatCurrency(due)}
//     </span>
//   )
// }

// // ─── Closure Date Cell ────────────────────────────────────────────────────────

// function ClosureDateCell({ customer, onSave }: { customer: Customer; onSave: (id: string, date: string | null) => Promise<void> }) {
//   const closureDate = (customer as any).closureDate as string | null | undefined
//   const [saving, setSaving] = useState(false)
//   const inputRef = useRef<HTMLInputElement>(null)

//   const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     e.stopPropagation()
//     setSaving(true)
//     await onSave(customer.id, e.target.value || null)
//     setSaving(false)
//   }

//   const triggerPicker = (e: React.MouseEvent) => {
//     e.stopPropagation()
//     inputRef.current?.showPicker?.()
//     inputRef.current?.click()
//   }

//   const rawDate = closureDate
//     ? (typeof closureDate === "string"
//         ? closureDate.slice(0, 10)
//         : new Date(closureDate as any).toISOString().slice(0, 10))
//     : ""

//   return (
//     <div className="relative flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
//       {/* 🔧 UI FIX — 1px footprint (was 0×0) so showPicker() reliably opens the native
//           calendar; browsers that require the input to actually be rendered would
//           otherwise silently fail to open the picker. Still fully invisible. */}
//       <input ref={inputRef} type="date" value={rawDate} onChange={handleChange}
//         className="absolute opacity-0 w-px h-px pointer-events-none" tabIndex={-1} />
//       {rawDate ? (
//         <span className="text-xs font-medium text-gray-700 cursor-pointer hover:text-[#3A7AFE] transition-colors"
//           onClick={triggerPicker} title="Click to change date">
//           {formatDate(closureDate)}
//         </span>
//       ) : (
//         <span className="text-xs text-gray-300">—</span>
//       )}
//       <button type="button" onClick={triggerPicker} disabled={saving} title="Set closure date"
//         className="h-5 w-5 rounded-md flex items-center justify-center text-gray-300 hover:text-[#3A7AFE] hover:bg-blue-50 transition-colors disabled:opacity-40">
//         {saving
//           ? <span className="h-3 w-3 border-2 border-blue-300 border-t-[#3A7AFE] rounded-full animate-spin block" />
//           : <Calendar className="h-3 w-3" />}
//       </button>
//     </div>
//   )
// }

// // ─── Main Component ───────────────────────────────────────────────────────────

// interface ConfirmState {
//   open: boolean; title: string; message: string; onConfirm: () => void
// }

// export function CustomersContent() {
//   const { customers, deleteCustomer, moveCustomerToLead, updateCustomer, users } = useCRM()
//   const { isAdmin } = useAuth()

//   const [searchTerm,         setSearchTerm]         = useState("")
//   const [statusFilter,       setStatusFilter]       = useState("all")
//   const [serviceFilter,      setServiceFilter]      = useState("all")
//   const [userFilter,         setUserFilter]         = useState("all")
//   const [selectedCustomer,   setSelectedCustomer]   = useState<Customer | null>(null)
//   const [isAddDialogOpen,    setIsAddDialogOpen]    = useState(false)
//   const [isEditDialogOpen,   setIsEditDialogOpen]   = useState(false)
//   const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
//   const [isDeleting,         setIsDeleting]         = useState<string | null>(null)
//   const [isBackToLead,       setIsBackToLead]       = useState<string | null>(null)
//   const [toast,              setToast]              = useState<ToastType | null>(null)
//   const [confirm,            setConfirm]            = useState<ConfirmState>({
//     open: false, title: "", message: "", onConfirm: () => {},
//   })

//   const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
//     setToast({ message, type })
//     setTimeout(() => setToast(null), 3500)
//   }, [])

//   // Unique assigned users for the filter dropdown
//   const assignedUsers = useMemo(() => {
//     const names = new Set<string>()
//     customers.forEach((c) => {
//       const u = (c as any).assignedUser as string | null
//       if (u && u.trim()) names.add(u.trim())
//     })
//     return Array.from(names).sort()
//   }, [customers])

//   const stats = useMemo(() => {
//     const active   = customers.filter((c) => c.status === "active").length
//     const prospect = customers.filter((c) => c.status === "prospect").length
//     const inactive = customers.filter((c) => c.status === "inactive").length
//     const totalDeal = customers.reduce((s, c) => s + (Number((c as any).dealValue) || 0), 0)
//     const totalPaid = customers.reduce((s, c) => s + (Number((c as any).paidAmount) || 0), 0)
//     const totalDue  = customers.reduce(
//       (s, c) => s + computeRemaining((c as any).dealValue, (c as any).paidAmount), 0
//     )
//     return { active, prospect, inactive, totalDeal, totalPaid, totalDue }
//   }, [customers])

//   const filtered = useMemo(() => {
//     const term = searchTerm.trim().toLowerCase()
//     return customers.filter((c) => {
//       const matchSearch = !term ||
//         [c.name, c.phone, c.company ?? "", c.city ?? "", c.service ?? ""]
//           .some((v) => (v ?? "").toLowerCase().includes(term))
//       const matchStatus  = statusFilter  === "all" || c.status  === statusFilter
//       const matchService = serviceFilter === "all" || c.service === serviceFilter
//       const matchUser    = userFilter    === "all" || (c as any).assignedUser === userFilter || (userFilter === "unassigned" && !(c as any).assignedUser)
//       return matchSearch && matchStatus && matchService && matchUser
//     })
//   }, [customers, searchTerm, statusFilter, serviceFilter, userFilter])

//   const counts = useMemo(() => ({
//     all: customers.length, active: stats.active, prospect: stats.prospect, inactive: stats.inactive,
//   }), [customers.length, stats])

//   const openConfirm = (title: string, message: string, onConfirm: () => void) =>
//     setConfirm({ open: true, title, message, onConfirm })

//   const handleDelete = useCallback((customer: Customer) => {
//     openConfirm(
//       "Delete client?",
//       `"${customer.name}" will be permanently removed. This cannot be undone.`,
//       async () => {
//         setIsDeleting(customer.id)
//         try {
//           const ok = await deleteCustomer(customer.id)
//           showToast(ok ? "Client deleted." : "Failed to delete client.", ok ? "success" : "error")
//         } catch { showToast("An error occurred.", "error") }
//         finally  { setIsDeleting(null) }
//       }
//     )
//   }, [deleteCustomer, showToast])

//   const handleBackToLead = useCallback((customer: Customer) => {
//     openConfirm(
//       "Move back to Leads?",
//       `"${customer.name}" will be moved from Clients back to Leads.`,
//       async () => {
//         setIsBackToLead(customer.id)
//         try {
//           const ok = await moveCustomerToLead(customer.id)
//           showToast(ok ? `${customer.name} moved back to Leads.` : "Failed to move client.", ok ? "success" : "error")
//         } catch { showToast("An error occurred.", "error") }
//         finally  { setIsBackToLead(null) }
//       }
//     )
//   }, [moveCustomerToLead, showToast])

//   // Kept for the Detail Dialog — Call/WhatsApp quick actions still live there.
//   const handleCall = useCallback((customer: Customer) => {
//     if (!customer.phone) { showToast("No phone number available.", "error"); return }
//     window.open(`tel:${customer.phone}`, "_self")
//   }, [showToast])

//   const handleWhatsApp = useCallback((customer: Customer) => {
//     const number = (customer as any).whatsappNumber || customer.phone
//     if (!number) { showToast("No WhatsApp number available.", "error"); return }
//     const clean   = number.replace(/\D/g, "")
//     const message = encodeURIComponent("Hi, following up regarding your project with Vasifytech.")
//     window.open(`https://wa.me/${clean}?text=${message}`, "_blank", "noopener,noreferrer")
//   }, [showToast])

//   const handleViewDetails = useCallback((c: Customer) => { setSelectedCustomer(c); setIsDetailDialogOpen(true) }, [])
//   const handleEdit        = useCallback((c: Customer) => { setSelectedCustomer(c); setIsEditDialogOpen(true)  }, [])
//   const handleDialogSaved = useCallback((isEdit: boolean) => showToast(isEdit ? "Client updated." : "Client added."), [showToast])

//   const handleUserSave = useCallback(async (id: string, value: string) => {
//     try {
//       const ok = await updateCustomer(id, { assignedUser: value } as any)
//       showToast(ok ? "User assigned." : "Failed to assign user.", ok ? "success" : "error")
//     } catch (e: any) {
//       showToast(e?.message || "Error assigning user.", "error")
//     }
//   }, [updateCustomer, showToast])

//   const handleDealValueSave = useCallback(async (
//     id: string,
//     values: { dealValue: number | null; paidAmount: number | null; expectedAmount: number | null }
//   ) => {
//     try {
//       const ok = await updateCustomer(id, values as any)
//       showToast(ok ? "Deal value updated." : "Failed to save.", ok ? "success" : "error")
//     } catch (e: any) {
//       if (e?.message?.includes("Unknown column")) {
//         showToast("Run migration.sql first — paid_amount/expected_amount column missing.", "error")
//       } else {
//         showToast(e?.message || "Error saving deal value.", "error")
//       }
//     }
//   }, [updateCustomer, showToast])

//   const handleClosureDateSave = useCallback(async (id: string, date: string | null) => {
//     try {
//       const ok = await updateCustomer(id, { closureDate: date } as any)
//       showToast(ok ? "Closure date saved." : "Failed to save date.", ok ? "success" : "error")
//     } catch (e: any) {
//       if (e?.message?.includes("Unknown column")) {
//         showToast("Run migration.sql first — DB column missing.", "error")
//       } else {
//         showToast(e?.message || "Error saving date.", "error")
//       }
//     }
//   }, [updateCustomer, showToast])

//   const handleExport = useCallback(() => {
//     if (!filtered.length) { showToast("No clients to export.", "error"); return }
//     exportToCSV(filtered)
//     showToast(`Exported ${filtered.length} client${filtered.length !== 1 ? "s" : ""}.`)
//   }, [filtered, showToast])

//   const clearAllFilters = () => {
//     setSearchTerm("")
//     setStatusFilter("all")
//     setServiceFilter("all")
//     setUserFilter("all")
//   }
//   const hasFilters = searchTerm || statusFilter !== "all" || serviceFilter !== "all" || userFilter !== "all"
//   const activeFilterCount = [statusFilter !== "all", serviceFilter !== "all", userFilter !== "all", !!searchTerm].filter(Boolean).length

//   // ✅ CHANGED — Phone column removed, Due column added.
//   // 🔧 UI FIX — Status column widened (80px → 96px) so the badge text + dot never
//   // wraps or clips at the lg breakpoint.
//   // Client/Company | Service | User | Status | Closure Date | Deal Value | Due | Actions
//   const GRID_COLS = "lg:grid-cols-[2.4fr_1.1fr_1fr_96px_1.1fr_1fr_1fr_90px]"

//   return (
//     <div className="min-h-screen" style={{ background: "#F4F6FB" }}>

//       {/* ── Header ─────────────────────────────────────────────────────── */}
//       <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5"
//         style={{ boxShadow: "0 1px 6px 0 rgba(0,0,0,0.06)" }}>
//         <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
//           <div className="min-w-0">
//             <div className="flex items-center gap-2">
//               <h1 className="text-base sm:text-xl font-extrabold text-gray-900 tracking-tight">Client Directory</h1>
//               {activeFilterCount > 0 && (
//                 <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white leading-none">
//                   <Filter className="h-2.5 w-2.5" />{activeFilterCount}
//                 </span>
//               )}
//             </div>
//             <p className="text-xs text-gray-400 mt-0.5 font-medium">
//               {activeFilterCount > 0
//                 ? <><span className="text-blue-600 font-bold">{filtered.length}</span> of {customers.length} clients</>
//                 : <>{customers.length} client{customers.length !== 1 ? "s" : ""} registered</>}
//             </p>
//           </div>
//           <div className="flex items-center gap-2 shrink-0">
//             <Button variant="outline" onClick={handleExport}
//               className="rounded-xl border-gray-200 text-gray-600 text-xs sm:text-sm font-medium h-8 sm:h-9 px-3 sm:px-3.5 gap-1.5 hidden sm:flex hover:bg-gray-50">
//               <Download className="h-3.5 w-3.5" /> Export
//             </Button>
//             <Button onClick={() => setIsAddDialogOpen(true)}
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 shadow-sm">
//               <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
//               <span className="hidden sm:inline">Add Client</span>
//               <span className="sm:hidden">Add</span>
//             </Button>
//           </div>
//         </div>
//       </div>

//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

//         {/* ── KPI Gradient Tiles ─────────────────────────────────────────── */}
//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
//           <GradientTile
//             label="Total Clients"
//             rawValue={customers.length}
//             gradient={TILE_GRADIENTS.total}
//             sub={filtered.length !== customers.length ? `${filtered.length} visible` : "all clients"}
//             icon={Users}
//           />
//           <GradientTile
//             label="Active"
//             rawValue={stats.active}
//             gradient={TILE_GRADIENTS.active}
//             sub={`${Math.round((stats.active / (customers.length || 1)) * 100)}% of total`}
//             icon={UserCheck}
//           />
//           <GradientTile
//             label="Prospects"
//             rawValue={stats.prospect}
//             gradient={TILE_GRADIENTS.prospect}
//             sub={`${stats.inactive} inactive`}
//             icon={UserX}
//           />
//           <GradientTile
//             label="Total Deal Value"
//             rawValue={stats.totalDeal}
//             displayValue={stats.totalDeal > 0 ? formatCurrency(stats.totalDeal) : "₹0"}
//             gradient={TILE_GRADIENTS.deal}
//             sub={stats.totalPaid > 0 ? `${formatCurrency(stats.totalPaid)} collected` : "no payments yet"}
//             icon={TrendingUp}
//           />
//           <GradientTile
//             label={stats.totalDue > 0 ? "Payment Due" : "Payments"}
//             rawValue={stats.totalDue}
//             displayValue={stats.totalDue > 0 ? formatCurrency(stats.totalDue) : "₹0"}
//             gradient={stats.totalDue > 0 ? TILE_GRADIENTS.payment : TILE_GRADIENTS.paid}
//             sub={stats.totalDue > 0 ? "still to collect" : "fully collected ✓"}
//             icon={Wallet}
//           />
//         </div>

//         {/* ── Filters ────────────────────────────────────────────────────── */}
//         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-5 py-3.5 sm:py-4 space-y-3">

//           {/* Row 1: search + status tabs */}
//           <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
//             <div className="relative w-full sm:w-72 shrink-0">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
//               <Input
//                 placeholder="Search name, phone, company…"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-9 pr-8 h-9 rounded-xl border border-gray-200 focus:border-[#3A7AFE] bg-gray-50 text-sm"
//               />
//               {searchTerm && (
//                 <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
//                   <X className="h-3.5 w-3.5" />
//                 </button>
//               )}
//             </div>

//             {/* Status pill tabs */}
//             <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto">
//               {STATUS_FILTERS.map((f) => (
//                 <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
//                   className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
//                     statusFilter === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
//                   }`}>
//                   {f.label}
//                   <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
//                     statusFilter === f.value ? "bg-[#3A7AFE]/10 text-[#3A7AFE]" : "bg-gray-200 text-gray-500"
//                   }`}>
//                     {counts[f.value as keyof typeof counts]}
//                   </span>
//                 </button>
//               ))}
//             </div>

//             <div className="ml-auto text-xs text-gray-400 font-medium hidden lg:block shrink-0">
//               {filtered.length} of {customers.length} clients
//             </div>
//           </div>

//           {/* Row 2: service + user filters */}
//           <div className="flex items-center gap-2 flex-wrap">
//             <div className="flex items-center gap-1.5 text-gray-400 shrink-0">
//               <Filter className="h-3.5 w-3.5" />
//               <span className="text-xs font-semibold">Filters:</span>
//             </div>

//             {/* Service filter */}
//             <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
//               className="h-8 rounded-xl border border-gray-200 text-xs px-2.5 bg-white text-gray-700 focus:border-[#3A7AFE] focus:outline-none cursor-pointer">
//               <option value="all">All Services</option>
//               {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
//             </select>

//             {/* User filter */}
//             <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
//               className="h-8 rounded-xl border border-gray-200 text-xs px-2.5 bg-white text-gray-700 focus:border-[#3A7AFE] focus:outline-none cursor-pointer">
//               <option value="all">All Users</option>
//               <option value="unassigned">Unassigned</option>
//               {assignedUsers.map((u) => <option key={u} value={u}>{u}</option>)}
//             </select>

//             {/* Active filter chips */}
//             {serviceFilter !== "all" && (
//               <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">
//                 {SERVICE_LABELS[serviceFilter] ?? serviceFilter}
//                 <button type="button" onClick={() => setServiceFilter("all")}><X className="h-2.5 w-2.5" /></button>
//               </span>
//             )}
//             {userFilter !== "all" && (
//               <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
//                 👤 {userFilter === "unassigned" ? "Unassigned" : userFilter}
//                 <button type="button" onClick={() => setUserFilter("all")}><X className="h-2.5 w-2.5" /></button>
//               </span>
//             )}

//             {hasFilters && (
//               <button type="button" onClick={clearAllFilters}
//                 className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 ml-auto px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
//                 <X className="h-3 w-3" />Clear{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
//               </button>
//             )}
//           </div>
//         </div>

//         {/* ── Table ──────────────────────────────────────────────────────── */}
//         {/* 🔧 UI FIX — removed overflow-hidden here: it was clipping the Add-Payment /
//             Edit-Total and Assign-User popovers whenever they extended past this card's
//             box (most noticeable on rows near the bottom of the visible list). Rounded
//             corners are preserved explicitly on the header/footer below instead, since
//             the rows in between are white/transparent and don't need clipping to look
//             correctly rounded. */}
//         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">

//           {/* Table header — ✅ CHANGED: Phone removed, Due added */}
//           <div className={`hidden lg:grid ${GRID_COLS} gap-4 px-6 py-3 border-b-2 border-gray-200 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest rounded-t-2xl`}
//             style={{ background: "#F1F4F8" }}>
//             {/* 🔧 UI FIX — truncate stops labels from wrapping/overflowing into the next
//                 column at squeezed widths; Deal Value & Due are right-aligned to match
//                 their right-aligned numeric cell content below. */}
//             {["Client / Company","Service","User","Status","Closure Date","Deal Value","Due","Actions"].map((h, i) => (
//               <div key={h} className={`truncate ${i >= 5 ? "text-right" : ""}`}>
//                 {h}
//               </div>
//             ))}
//           </div>

//           {/* Empty state */}
//           {filtered.length === 0 && (
//             <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-gray-400">
//               <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 border border-gray-100">
//                 <Building2 className="h-8 w-8 opacity-30" />
//               </div>
//               <p className="text-sm font-semibold text-gray-500 mb-1">
//                 {hasFilters ? "No clients match your filters" : "No clients yet"}
//               </p>
//               {hasFilters
//                 ? <button type="button" onClick={clearAllFilters} className="text-xs text-[#3A7AFE] font-semibold hover:underline mt-1">Clear filters</button>
//                 : <p className="text-xs text-gray-400">Add your first client to get started.</p>
//               }
//             </div>
//           )}

//           {/* Rows */}
//           <div className="divide-y divide-gray-50" role="list">
//             {filtered.map((customer, idx) => {
//               const svc    = customer.service ?? ""
//               const status = STATUS_CONFIG[customer.status ?? "active"] ?? STATUS_CONFIG.active

//               return (
//                 <div
//                   key={customer.id}
//                   role="listitem"
//                   tabIndex={0}
//                   className={`group cursor-pointer transition-all duration-150 hover:bg-blue-50/40 focus:outline-none focus:bg-blue-50/40 relative ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}
//                   onClick={() => handleViewDetails(customer)}
//                   onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleViewDetails(customer) }}
//                 >
//                   {/* Left hover accent */}
//                   <span className="absolute left-0 top-0 h-full w-[3px] rounded-r bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

//                   {/* Desktop row — ✅ CHANGED: Phone column removed, Due column added, Call/WhatsApp action buttons removed */}
//                   {/* 🔧 UI FIX — items-start (was items-center) so every column's first
//                       line lines up across the row, instead of the two-line Deal Value
//                       cell looking vertically off-center next to single-line cells. */}
//                   <div className={`hidden lg:grid ${GRID_COLS} gap-4 items-start px-6 py-4`}>

//                     {/* Client / Company */}
//                     <div className="flex items-center gap-3 min-w-0">
//                       <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-sm"
//                         style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)" }}>
//                         {customer.name?.charAt(0)?.toUpperCase() ?? "C"}
//                       </div>
//                       <div className="min-w-0">
//                         <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{customer.name || "Unnamed"}</p>
//                         <p className="text-xs text-gray-400 truncate">{customer.company || displayEmail(customer.email) || "—"}</p>
//                       </div>
//                     </div>

//                     {/* Service */}
//                     <div className="min-w-0">
//                       {svc ? (
//                         <span className="inline-block text-xs text-violet-700 font-semibold bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-lg truncate max-w-full">
//                           {SERVICE_LABELS[svc] ?? svc}
//                         </span>
//                       ) : <span className="text-xs text-gray-300">—</span>}
//                     </div>

//                     {/* User */}
//                     <div onClick={(e) => e.stopPropagation()}>
//                       <UserCell customer={customer} crmUsers={users} onSave={handleUserSave} />
//                     </div>

//                     {/* Status */}
//                     <div>
//                       <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-2 py-0.5 rounded-full whitespace-nowrap ${status.cls}`}>
//                         <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
//                         {status.label}
//                       </span>
//                     </div>

//                     {/* Closure Date */}
//                     <div>
//                       <ClosureDateCell customer={customer} onSave={handleClosureDateSave} />
//                     </div>

//                     {/* Deal Value */}
//                     <div>
//                       <DealValueCell customer={customer} onSave={handleDealValueSave} />
//                     </div>

//                     {/* ✅ NEW — Due · 🔧 UI FIX: right-aligned to match the Deal Value column */}
//                     <div className="text-right">
//                       <DueCell customer={customer} />
//                     </div>

//                     {/* Actions — ✅ CHANGED: Call/WhatsApp removed */}
//                     <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
//                       <Button variant="ghost" size="sm" onClick={() => handleViewDetails(customer)}
//                         className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300 transition-colors" title="View">
//                         <Eye className="h-3.5 w-3.5" />
//                       </Button>
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" size="sm"
//                             className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300 transition-colors"
//                             disabled={isDeleting === customer.id || isBackToLead === customer.id}>
//                             <MoreHorizontal className="h-4 w-4" />
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end" className="w-44 rounded-xl border border-gray-100 shadow-xl p-1">
//                           <DropdownMenuItem onSelect={() => handleEdit(customer)} className="text-sm rounded-lg gap-2">
//                             <Edit className="h-3.5 w-3.5 text-gray-400" /> Edit Client
//                           </DropdownMenuItem>
//                           <DropdownMenuItem onSelect={() => handleBackToLead(customer)} disabled={isBackToLead === customer.id} className="text-sm rounded-lg gap-2">
//                             <Undo2 className="h-3.5 w-3.5 text-amber-500" />
//                             {isBackToLead === customer.id ? "Moving…" : "Back to Lead"}
//                           </DropdownMenuItem>
//                           {isAdmin && (
//                             <>
//                               <DropdownMenuSeparator className="my-1" />
//                               <DropdownMenuItem onSelect={() => handleDelete(customer)} disabled={isDeleting === customer.id}
//                                 className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg gap-2">
//                                 <Trash2 className="h-3.5 w-3.5" />
//                                 {isDeleting === customer.id ? "Deleting…" : "Delete"}
//                               </DropdownMenuItem>
//                             </>
//                           )}
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>
//                   </div>

//                   {/* Mobile row — ✅ CHANGED: phone meta line + Call/WhatsApp buttons removed */}
//                   <div className="lg:hidden px-4 py-4 flex items-start gap-3">
//                     <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-sm"
//                       style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)" }}>
//                       {customer.name?.charAt(0)?.toUpperCase() ?? "C"}
//                     </div>
//                     <div className="flex-1 min-w-0 space-y-1.5">
//                       <div className="flex items-start justify-between gap-2">
//                         <div className="min-w-0">
//                           <p className="text-sm font-semibold text-gray-900 truncate">{customer.name || "Unnamed"}</p>
//                           {customer.company && <p className="text-xs text-gray-400 truncate">{customer.company}</p>}
//                         </div>
//                         <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full shrink-0 ${status.cls}`}>
//                           <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
//                           {status.label}
//                         </span>
//                       </div>
//                       <div className="flex items-center gap-3 flex-wrap">
//                         {svc && (
//                           <span className="text-xs text-violet-600 font-semibold bg-violet-50 px-1.5 py-0.5 rounded-md">
//                             {SERVICE_LABELS[svc] ?? svc}
//                           </span>
//                         )}
//                       </div>
//                       <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
//                         {(customer as any).assignedUser && <span>👤 {(customer as any).assignedUser}</span>}
//                         {(customer as any).closureDate   && <span>📅 {formatDate((customer as any).closureDate)}</span>}
//                         {(customer as any).dealValue != null && (
//                           <span className="font-semibold text-gray-700">
//                             {formatCurrency((customer as any).dealValue)}{" "}
//                             <span className="text-amber-600 font-medium">
//                               Due {formatCurrency(computeRemaining((customer as any).dealValue, (customer as any).paidAmount))}
//                             </span>
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300">
//                             <MoreHorizontal className="h-4 w-4" />
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end" className="w-44 rounded-xl border border-gray-100 shadow-xl p-1">
//                           <DropdownMenuItem onSelect={() => handleViewDetails(customer)} className="text-sm rounded-lg gap-2">
//                             <Eye className="h-3.5 w-3.5 text-gray-400" /> View Profile
//                           </DropdownMenuItem>
//                           <DropdownMenuItem onSelect={() => handleEdit(customer)} className="text-sm rounded-lg gap-2">
//                             <Edit className="h-3.5 w-3.5 text-gray-400" /> Edit Client
//                           </DropdownMenuItem>
//                           <DropdownMenuItem onSelect={() => handleBackToLead(customer)} className="text-sm rounded-lg gap-2">
//                             <Undo2 className="h-3.5 w-3.5 text-amber-500" /> Back to Lead
//                           </DropdownMenuItem>
//                           {isAdmin && (
//                             <>
//                               <DropdownMenuSeparator className="my-1" />
//                               <DropdownMenuItem onSelect={() => handleDelete(customer)} className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg gap-2">
//                                 <Trash2 className="h-3.5 w-3.5" />
//                                 {isDeleting === customer.id ? "Deleting…" : "Delete"}
//                               </DropdownMenuItem>
//                             </>
//                           )}
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>
//                   </div>
//                 </div>
//               )
//             })}
//           </div>

//           {/* Footer */}
//           {filtered.length > 0 && (
//             <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between rounded-b-2xl">
//               <p className="text-xs text-gray-400">
//                 Showing <span className="font-bold text-gray-600">{filtered.length}</span> of{" "}
//                 <span className="font-bold text-gray-600">{customers.length}</span> clients
//               </p>
//               <button type="button" onClick={handleExport}
//                 className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#3A7AFE] font-semibold transition-colors">
//                 <Download className="h-3.5 w-3.5" />
//                 Export {filtered.length !== customers.length ? "filtered" : "all"}
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ── Dialogs ─────────────────────────────────────────────────────── */}
//       <CustomerDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} customer={null} mode="add" onSaved={() => handleDialogSaved(false)} />
//       <CustomerDialog
//         open={isEditDialogOpen}
//         onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setSelectedCustomer(null) }}
//         customer={selectedCustomer} mode="edit" onSaved={() => handleDialogSaved(true)}
//       />
//       <CustomerDetailDialog
//         open={isDetailDialogOpen}
//         onOpenChange={(open) => { setIsDetailDialogOpen(open); if (!open) setSelectedCustomer(null) }}
//         customer={selectedCustomer}
//         onCallCustomer={handleCall}
//         onWhatsAppCustomer={handleWhatsApp}
//         onEditCustomer={handleEdit}
//         onScheduleMeeting={(c) => showToast(`Meeting scheduling coming soon for ${c.name}.`)}
//       />

//       <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((p) => ({ ...p, open }))}>
//         <AlertDialogContent className="rounded-2xl border border-gray-100 shadow-2xl max-w-sm">
//           <AlertDialogHeader>
//             <AlertDialogTitle className="text-base font-bold text-gray-900">{confirm.title}</AlertDialogTitle>
//             <AlertDialogDescription className="text-sm text-gray-500">{confirm.message}</AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel className="rounded-xl border-gray-200 text-gray-600 text-sm font-medium">Cancel</AlertDialogCancel>
//             <AlertDialogAction onClick={confirm.onConfirm} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium">Confirm</AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
//     </div>
//   )
// }




//testing (30-6-2026)payment history

"use client"

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { useCRM } from "@/contexts/crm-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CustomerDialog }       from "./customer-dialog"
import { CustomerDetailDialog } from "./customer-detail-dialog"
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Undo2, Building2, CheckCircle2,
  XCircle, Download, Filter, Pencil, Check, X, Calendar,
  Users, TrendingUp, UserCheck, UserX, ArrowUpRight,
  Wallet,
} from "lucide-react"
import type { Customer, CustomerPayment } from "@/types/crm"

// ─── Constants ────────────────────────────────────────────────────────────────

export const SERVICE_LABELS: Record<string, string> = {
  "whatsapp-api":    "WhatsApp API",
  "web-development": "Web Development",
  "seo":             "SEO / Marketing",
  "social-media":    "Social Media",
  "crm-development": "CRM Development",
  "app-development": "App Development",
  "cloud-hosting":   "Cloud & Hosting",
  "it-support":      "IT Support",
  "other":           "Other",
}

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  "startup":    "Startup",
  "sme":        "SME",
  "enterprise": "Enterprise",
  "agency":     "Agency",
  "ecommerce":  "E-commerce",
  "ngo":        "NGO / Non-Profit",
  "individual": "Individual / Freelancer",
  "other":      "Other",
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; cls: string }> = {
  active:   { label: "Active",   dot: "bg-emerald-400", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  inactive: { label: "Inactive", dot: "bg-gray-300",    cls: "bg-gray-50    text-gray-500    border-gray-200"   },
  prospect: { label: "Prospect", dot: "bg-blue-400",    cls: "bg-blue-50    text-blue-700    border-blue-200"   },
}

const STATUS_FILTERS = [
  { value: "all",      label: "All"      },
  { value: "active",   label: "Active"   },
  { value: "prospect", label: "Prospect" },
  { value: "inactive", label: "Inactive" },
]

const TILE_GRADIENTS = {
  total:    ["#6D5DF6", "#8B7CF8"] as [string, string],
  active:   ["#1E5FE0", "#2E7BF6"] as [string, string],
  prospect: ["#D97706", "#F59E0B"] as [string, string],
  deal:     ["#0E8FD9", "#23B6E0"] as [string, string],
  payment:  ["#E11D48", "#F43F5E"] as [string, string],
  paid:     ["#0FA968", "#22C97E"] as [string, string],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatDate = (v: unknown): string => {
  if (!v) return "—"
  const d = v instanceof Date ? v : new Date(v as string)
  return isNaN(d.getTime()) ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export const displayEmail = (email: string | undefined): string | null => {
  if (!email) return null
  const syntheticDomains = ["@manual.", "@booking.", "@whatsapp."]
  return syntheticDomains.some((d) => email.includes(d)) ? null : email
}

const formatCurrency = (v: unknown): string => {
  if (v == null || v === "") return "—"
  const n = Number(v)
  if (isNaN(n)) return "—"
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
  return `₹${n.toLocaleString("en-IN")}`
}

const computeRemaining = (total: number | null | undefined, paid: number | null | undefined): number => {
  const t = total ?? 0
  const p = paid  ?? 0
  return Math.max(t - p, 0)
}

// ── Month-key helpers — power the new Monthly Payment Tracker ────────────────
// "YYYY-MM" is used as a stable sort/group key (so "2026-06" sorts correctly
// against "2026-12" etc. as plain strings); formatMonthLabel turns that back
// into a human label like "Jun 2026" for display. Both group by Closure Date,
// the existing date field already tracked on the Deal Value column.
const getMonthKey = (v: unknown): string | null => {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v as string)
  if (isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const formatMonthLabel = (key: string): string => {
  const [y, m] = key.split("-").map(Number)
  if (!y || !m) return key
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const fromRef  = useRef(0)
  useEffect(() => {
    fromRef.current = value; startRef.current = null
    let raf: number
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const t = Math.min((ts - startRef.current) / durationMs, 1)
      const e = 1 - Math.pow(1 - t, 3)
      setValue(fromRef.current + (target - fromRef.current) * e)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return value
}

// ─── CSV export ───────────────────────────────────────────────────────────────

const exportToCSV = (customers: Customer[]) => {
  const headers = [
    "Name","Company","Phone","Email","Service","Business Type",
    "Status","Assigned User",
    "Deal Value Total (₹)","Paid Amount (₹)","Remaining / Due (₹)",
    "Total Value (₹)",
    "Closure Date","Onboarding Date","City","State",
  ]
  const rows = customers.map((c) => {
    const total = (c as any).dealValue ?? null
    const paid  = (c as any).paidAmount ?? null
    return [
      c.name ?? "", c.company ?? "", c.phone ?? "",
      displayEmail(c.email) ?? "",
      SERVICE_LABELS[c.service ?? ""] ?? c.service ?? "",
      BUSINESS_TYPE_LABELS[(c as any).businessType ?? ""] ?? (c as any).businessType ?? "",
      c.status ?? "", (c as any).assignedUser ?? "",
      total ?? "",
      paid ?? "",
      total != null ? computeRemaining(total, paid) : "",
      c.totalValue ?? 0,
      (c as any).closureDate ? formatDate((c as any).closureDate) : "",
      (c as any).onboardingDate ? formatDate((c as any).onboardingDate) : formatDate(c.createdAt),
      c.city ?? "", c.state ?? "",
    ]
  })
  const escape = (val: unknown) => {
    const s = String(val ?? "")
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv  = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = { message: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastType; onDismiss: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium animate-in slide-in-from-bottom-3 ${
      toast.type === "success"
        ? "bg-white border-emerald-100 text-emerald-700"
        : "bg-white border-red-100 text-red-600"
    }`}>
      {toast.type === "success"
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        : <XCircle      className="h-4 w-4 text-red-500 shrink-0" />}
      {toast.message}
      <button onClick={onDismiss} className="ml-1 text-gray-300 hover:text-gray-500 transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ─── Gradient KPI Tile (matches Leads page) ────────────────────────────────────

function GradientTile({
  label, rawValue, displayValue, gradient, sub, icon: Icon,
}: {
  label: string; rawValue: number; displayValue?: string
  gradient: [string, string]; sub?: string; icon: React.ElementType
}) {
  const animated = useCountUp(rawValue)
  const display  = displayValue ?? Math.round(animated).toLocaleString("en-IN")
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default select-none"
      style={{ background: `linear-gradient(135deg,${gradient[0]},${gradient[1]})` }}
    >
      <div className="absolute -right-4 -top-5 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-1 -bottom-6 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 truncate">{label}</p>
          <p className="text-2xl font-extrabold mt-1.5 tabular-nums leading-none tracking-tight">{display}</p>
          {sub && (
            <div className="flex items-center gap-0.5 mt-2">
              <ArrowUpRight className="h-3 w-3 text-white/60 shrink-0" />
              <span className="text-[11px] font-semibold text-white/75 truncate">{sub}</span>
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="h-[18px] w-[18px] text-white" />
        </div>
      </div>
    </div>
  )
}

// ─── Monthly Payment Tracker ────────────────────────────────────────────────────
// 🆕 REWRITTEN — now groups actual logged PAYMENTS (each with its own date) by
// the month they were received, instead of grouping customers by Closure Date.
// "Collected" is a real, historical figure (sum of payments dated in that
// month). "Outstanding" is a present-tense figure — the current Due balance,
// summed across only the clients who paid in that month — included for quick
// context, not as a historical "amount due in that month" (there's no per-
// month billing schedule to compute that from). Clicking a row sets/clears the
// month filter, which flows into `filtered` (table, KPI tiles, CSV export).
//
// NOTE: only payments recorded through "Add Payment" going forward show up
// here — there's no payment date for whatever was logged before this feature.

interface MonthlyStat {
  monthKey:      string
  label:         string
  paymentCount:  number
  customerCount: number
  collected:     number
  outstanding:   number
}

function MonthlyPaymentTracker({
  months, selectedMonth, onSelectMonth,
}: {
  months: MonthlyStat[]
  selectedMonth: string
  onSelectMonth: (key: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const visible   = showAll ? months : months.slice(0, 6)
  const moreCount = months.length - visible.length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <h3 className="text-sm font-semibold text-gray-700 truncate">Monthly Payment Tracker</h3>
          <span className="text-[10px] text-gray-400 font-medium hidden sm:inline shrink-0">· by Payment Date</span>
        </div>
        {selectedMonth !== "all" && (
          <button type="button" onClick={() => onSelectMonth("all")}
            className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 shrink-0">
            <X className="h-3 w-3" /> Clear month
          </button>
        )}
      </div>

      {months.length === 0 ? (
        <div className="px-5 py-6 text-center text-xs text-gray-400">
          No payments recorded yet — use a client's Deal Value column → "Add Payment" to log a dated payment, and it'll show up here.
        </div>
      ) : (
        <>
          {/* Desktop header */}
          <div className="hidden sm:grid grid-cols-[1.2fr_0.85fr_0.85fr_1.1fr_1.1fr] gap-3 px-5 py-2 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest bg-gray-50">
            <div>Month</div>
            <div className="text-right">Payments</div>
            <div className="text-right">Clients</div>
            <div className="text-right">Collected</div>
            <div className="text-right">Outstanding</div>
          </div>

          <div className="divide-y divide-gray-50">
            {visible.map((m) => {
              const isSelected = selectedMonth === m.monthKey

              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => onSelectMonth(isSelected ? "all" : m.monthKey)}
                  className={`w-full text-left transition-colors ${isSelected ? "bg-blue-50/60" : "hover:bg-gray-50"}`}
                >
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1.2fr_0.85fr_0.85fr_1.1fr_1.1fr] gap-3 px-5 py-3 items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-[#3A7AFE]" : "bg-gray-200"}`} />
                      <span className="text-sm font-semibold text-gray-800 truncate">{m.label}</span>
                    </div>
                    <div className="text-right text-sm text-gray-500 tabular-nums">{m.paymentCount}</div>
                    <div className="text-right text-sm text-gray-500 tabular-nums">{m.customerCount}</div>
                    <div className="text-right text-sm font-semibold text-emerald-600 tabular-nums">{formatCurrency(m.collected)}</div>
                    <div className={`text-right text-sm font-semibold tabular-nums ${m.outstanding > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      {formatCurrency(m.outstanding)}
                    </div>
                  </div>

                  {/* Mobile row */}
                  <div className="sm:hidden px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-[#3A7AFE]" : "bg-gray-200"}`} />
                        <span className="text-sm font-semibold text-gray-800 truncate">{m.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums shrink-0">{formatCurrency(m.collected)}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      <span>{m.paymentCount} payment{m.paymentCount !== 1 ? "s" : ""}</span>
                      <span>{m.customerCount} client{m.customerCount !== 1 ? "s" : ""}</span>
                      {m.outstanding > 0 && <span className="text-amber-600 font-medium">Outstanding {formatCurrency(m.outstanding)}</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {moreCount > 0 && (
            <button type="button" onClick={() => setShowAll(true)}
              className="w-full py-2.5 text-xs text-[#3A7AFE] font-semibold hover:bg-blue-50 transition-colors border-t border-gray-50">
              Show {moreCount} more month{moreCount !== 1 ? "s" : ""}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── UserCell ─────────────────────────────────────────────────────────────────

interface UserCellProps {
  customer: Customer
  crmUsers: { id: string; name: string }[]
  onSave:   (id: string, value: string) => Promise<void>
}

function UserCell({ customer, crmUsers, onSave }: UserCellProps) {
  const currentUser = (customer as any).assignedUser as string | null
  const [editing, setEditing]   = useState(false)
  const [value,   setValue]     = useState(currentUser ?? "")
  const [saving,  setSaving]    = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)
  const wrapRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing) setValue((customer as any).assignedUser ?? "")
  }, [(customer as any).assignedUser, editing])

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setValue((customer as any).assignedUser ?? "")
    setEditing(true)
    setShowDrop(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 20)
  }

  const cancel = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditing(false)
    setShowDrop(false)
    setValue((customer as any).assignedUser ?? "")
  }

  const save = async (val?: string) => {
    const finalVal = (val ?? value).trim()
    setSaving(true)
    await onSave(customer.id, finalVal)
    setSaving(false)
    setEditing(false)
    setShowDrop(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === "Enter")  { save() }
    if (e.key === "Escape") { cancel() }
  }

  useEffect(() => {
    if (!editing) return
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { save() }
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [editing, value])

  const filtered = crmUsers.filter(
    (u) => !value || u.name.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 6)

  if (editing) {
    return (
      <div ref={wrapRef} className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setShowDrop(true) }}
          onKeyDown={handleKeyDown}
          disabled={saving}
          placeholder="Name or pick below…"
          className="w-28 h-7 text-xs border border-[#3A7AFE] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#3A7AFE]/20 disabled:opacity-50"
        />
        <button onClick={() => save()} disabled={saving}
          className="h-6 w-6 rounded-lg bg-[#3A7AFE] hover:bg-[#2563EB] text-white flex items-center justify-center transition-colors disabled:opacity-50 shrink-0" title="Save">
          {saving
            ? <span className="h-2.5 w-2.5 border border-white border-t-transparent rounded-full animate-spin block" />
            : <Check className="h-3 w-3" />}
        </button>
        <button onClick={cancel}
          className="h-6 w-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0" title="Cancel">
          <X className="h-3 w-3" />
        </button>
        {showDrop && filtered.length > 0 && (
          <div className="absolute left-0 top-8 z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[160px] max-h-40 overflow-y-auto">
            {filtered.map((u) => (
              <button key={u.id} type="button"
                onMouseDown={(e) => { e.preventDefault(); setValue(u.name); save(u.name) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 text-left text-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-gray-700 font-medium truncate">{u.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group/user flex items-center gap-1.5 cursor-pointer min-w-0" onClick={startEdit} title="Click to assign user">
      {currentUser ? (
        <>
          <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 shrink-0">
            {currentUser.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-gray-700 font-medium truncate">{currentUser}</span>
        </>
      ) : (
        <span className="text-xs text-gray-300 italic">Assign…</span>
      )}
      <Pencil className="h-2.5 w-2.5 text-gray-300 opacity-0 group-hover/user:opacity-100 transition-opacity shrink-0 ml-0.5" />
    </div>
  )
}

// ─── Deal Value Cell ──────────────────────────────────────────────────────────
// ✅ CHANGED — this cell now only shows Total + Paid. The "Due" figure that
// used to live in the sub-line here has moved out into its own DueCell
// (rendered as a separate column to the right). Editing still happens here
// via the pencil → popover (Add Payment / Edit Total), unchanged.

interface DealValueCellProps {
  customer: Customer
  onSave:   (id: string, values: { dealValue: number | null; paidAmount: number | null; expectedAmount: number | null }) => Promise<void>
  // 🆕 NEW — used specifically by the "Add Payment" tab to log a dated payment
  // (separate from `onSave`, which the "Edit Total" tab still uses for plain
  // corrections that shouldn't create a payment-history entry).
  onAddPayment: (id: string, data: { amount: number; paymentDate: string }) => Promise<void>
}

function DealValueCell({ customer, onSave, onAddPayment }: DealValueCellProps) {
  const dealValue  = (customer as any).dealValue  as number | null | undefined
  const paidAmount = (customer as any).paidAmount as number | null | undefined

  const [open,    setOpen]    = useState(false)
  const [mode,    setMode]    = useState<"add" | "edit">("add")
  const [totalIn, setTotalIn] = useState("")
  const [paidIn,  setPaidIn]  = useState("")
  const [addIn,   setAddIn]   = useState("")
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))   // 🆕 NEW — defaults to today
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState("")
  const totalRef = useRef<HTMLInputElement>(null)
  const addRef   = useRef<HTMLInputElement>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const todayStr = new Date().toISOString().slice(0, 10)   // 🆕 NEW — caps the date picker so you can't log a future payment

  const openPopover = (e: React.MouseEvent) => {
    e.stopPropagation()
    setErr("")
    setTotalIn(dealValue  != null ? String(dealValue)  : "")
    setPaidIn(paidAmount != null ? String(paidAmount) : "")
    setAddIn("")
    setPayDate(todayStr)   // 🆕 NEW — reset to today every time the popover opens
    const startMode = dealValue != null ? "add" : "edit"
    setMode(startMode)
    setOpen(true)
    setTimeout(() => { (startMode === "add" ? addRef : totalRef).current?.focus() }, 30)
  }

  const cancel = (e?: React.MouseEvent) => { e?.stopPropagation(); setOpen(false) }

  const liveTotalEdit = totalIn.trim() === "" ? 0 : Number(totalIn)
  const livePaidEdit  = paidIn.trim()  === "" ? 0 : Number(paidIn)
  const liveDueEdit   = computeRemaining(liveTotalEdit, livePaidEdit)

  const liveAddAmount    = addIn.trim() === "" ? 0 : Number(addIn)
  const livePaidAfterAdd = (paidAmount ?? 0) + liveAddAmount
  const liveDueAfterAdd  = computeRemaining(dealValue, livePaidAfterAdd)

  const saveAddPayment = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setErr("")
    if (dealValue == null) { setErr("Set a total amount first"); return }
    const amt = addIn.trim() === "" ? 0 : Number(addIn)
    if (isNaN(amt) || amt <= 0) { setErr("Enter a payment amount greater than 0"); return }
    const newPaid = (paidAmount ?? 0) + amt
    if (newPaid > dealValue) { setErr("This payment would exceed the total amount"); return }
    if (!payDate) { setErr("Pick the date this payment was received"); return }
    if (payDate > todayStr) { setErr("Payment date can't be in the future"); return }
    setSaving(true)
    await onAddPayment(customer.id, { amount: amt, paymentDate: payDate })
    setSaving(false)
    setOpen(false)
  }

  const saveEditTotals = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setErr("")
    const t = totalIn.trim() === "" ? null : Number(totalIn)
    const p = paidIn.trim()  === "" ? null : Number(paidIn)
    if (t != null && (isNaN(t) || t < 0)) { setErr("Enter a valid total amount"); return }
    if (p != null && (isNaN(p) || p < 0)) { setErr("Enter a valid paid amount"); return }
    if (t != null && p != null && p > t)  { setErr("Paid amount can't exceed total"); return }
    const due = t != null ? computeRemaining(t, p) : null
    setSaving(true)
    await onSave(customer.id, { dealValue: t, paidAmount: p, expectedAmount: due })
    setSaving(false)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent, submit: () => void) => {
    e.stopPropagation()
    if (e.key === "Enter")  submit()
    if (e.key === "Escape") cancel()
  }

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  return (
    // 🔧 UI FIX — justify-end + text-right (on the inner block below) right-align this
    // column so it matches the right-aligned "Due" column and header label next to it,
    // instead of sitting flush-left while Due sits flush-right.
    <div ref={wrapRef} className="relative flex items-start justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col leading-tight text-right">
        <span className={`text-sm font-semibold tabular-nums ${dealValue != null ? "text-gray-800" : "text-gray-300"}`}>
          {dealValue != null ? formatCurrency(dealValue) : "—"}
        </span>
        {/* ✅ CHANGED — only the Paid sub-line remains; Due moved to its own column */}
        {dealValue != null && (
          <span className="text-[10px] text-gray-400 tabular-nums">
            Paid {formatCurrency(paidAmount ?? 0)}
          </span>
        )}
      </div>
      <button type="button" onClick={openPopover} title="Add payment / edit total"
        className="h-5 w-5 rounded-md flex items-center justify-center text-gray-300 hover:text-[#3A7AFE] hover:bg-blue-50 transition-colors shrink-0 mt-0.5">
        <Pencil className="h-3 w-3" />
      </button>

      {open && (
        // 🔧 UI FIX — anchored from the right (was left-0) so it still drops directly
        // under the now right-aligned trigger, and capped at 90vw so it can never run
        // off-screen on narrow viewports.
        <div className="absolute right-0 top-9 z-40 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 space-y-2.5 min-w-[260px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button type="button" onClick={() => dealValue != null && setMode("add")} disabled={dealValue == null}
              className={`flex-1 h-6 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${mode === "add" ? "bg-white text-[#3A7AFE] shadow-sm" : "text-gray-500"}`}>
              Add Payment
            </button>
            <button type="button" onClick={() => setMode("edit")}
              className={`flex-1 h-6 rounded-md text-[11px] font-semibold transition-colors ${mode === "edit" ? "bg-white text-[#3A7AFE] shadow-sm" : "text-gray-500"}`}>
              Edit Total
            </button>
          </div>

          {mode === "add" ? (
            <>
              <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Total</span>
                  <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(dealValue)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">Paid so far</span>
                  <span className="font-semibold text-gray-700 tabular-nums">{formatCurrency(paidAmount ?? 0)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-400">Payment received now</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
                    <input ref={addRef} type="number" min="0" value={addIn}
                      onChange={(e) => { setAddIn(e.target.value); setErr("") }}
                      onKeyDown={(e) => handleKey(e, saveAddPayment)}
                      disabled={saving} placeholder="e.g. 15000"
                      className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:opacity-50" />
                  </div>
                </div>
                {/* 🆕 NEW — Date received: this is what powers the Monthly Payment
                    Tracker. Defaults to today but can be backdated. */}
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-400">Date received</label>
                  <input type="date" value={payDate} max={todayStr}
                    onChange={(e) => { setPayDate(e.target.value); setErr("") }}
                    onKeyDown={(e) => handleKey(e, saveAddPayment)}
                    disabled={saving}
                    className="w-full h-8 px-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:opacity-50" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">New Remaining</span>
                <span className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency(liveDueAfterAdd)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={saveAddPayment} disabled={saving}
                  className="flex-1 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                  {saving ? <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="h-3.5 w-3.5" />}
                  Add Payment
                </button>
                <button onClick={cancel} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {err && <p className="text-[11px] text-red-500">{err}</p>}
              <p className="text-[10px] text-gray-400">Adds to the existing paid amount — won't overwrite it.</p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-gray-400">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
                  <input ref={totalRef} type="number" min="0" value={totalIn}
                    onChange={(e) => { setTotalIn(e.target.value); setErr("") }}
                    onKeyDown={(e) => handleKey(e, saveEditTotals)}
                    disabled={saving} placeholder="0"
                    className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#3A7AFE] focus:ring-2 focus:ring-[#3A7AFE]/10 disabled:opacity-50" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-gray-400">Total Paid (overwrites)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₹</span>
                  <input type="number" min="0" value={paidIn}
                    onChange={(e) => { setPaidIn(e.target.value); setErr("") }}
                    onKeyDown={(e) => handleKey(e, saveEditTotals)}
                    disabled={saving} placeholder="0"
                    className="w-full h-8 pl-6 pr-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 disabled:opacity-50" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Remaining / Due</span>
                <span className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency(liveDueEdit)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={saveEditTotals} disabled={saving}
                  className="flex-1 h-8 rounded-xl bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50">
                  {saving ? <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin block" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button onClick={cancel} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {err && <p className="text-[11px] text-red-500">{err}</p>}
              <p className="text-[10px] text-gray-400">Use this to correct totals. Due recalculates automatically.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Due (Expected) Cell ──────────────────────────────────────────────────────
// ✅ NEW — a simple read-only display of the remaining/due amount, rendered
// as its own column to the right of Deal Value. Editing still happens via
// DealValueCell's pencil → popover (the Due value is always derived, never
// directly typed in).

function DueCell({ customer }: { customer: Customer }) {
  const dealValue  = (customer as any).dealValue  as number | null | undefined
  const paidAmount = (customer as any).paidAmount as number | null | undefined

  if (dealValue == null) {
    return <span className="text-sm text-gray-300">—</span>
  }

  const due = computeRemaining(dealValue, paidAmount)

  return (
    <span className={`text-sm font-semibold tabular-nums ${due > 0 ? "text-amber-600" : "text-emerald-600"}`}>
      {formatCurrency(due)}
    </span>
  )
}

// ─── Closure Date Cell ────────────────────────────────────────────────────────

function ClosureDateCell({ customer, onSave }: { customer: Customer; onSave: (id: string, date: string | null) => Promise<void> }) {
  const closureDate = (customer as any).closureDate as string | null | undefined
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setSaving(true)
    await onSave(customer.id, e.target.value || null)
    setSaving(false)
  }

  const triggerPicker = (e: React.MouseEvent) => {
    e.stopPropagation()
    inputRef.current?.showPicker?.()
    inputRef.current?.click()
  }

  const rawDate = closureDate
    ? (typeof closureDate === "string"
        ? closureDate.slice(0, 10)
        : new Date(closureDate as any).toISOString().slice(0, 10))
    : ""

  return (
    <div className="relative flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {/* 🔧 UI FIX — 1px footprint (was 0×0) so showPicker() reliably opens the native
          calendar; browsers that require the input to actually be rendered would
          otherwise silently fail to open the picker. Still fully invisible. */}
      <input ref={inputRef} type="date" value={rawDate} onChange={handleChange}
        className="absolute opacity-0 w-px h-px pointer-events-none" tabIndex={-1} />
      {rawDate ? (
        <span className="text-xs font-medium text-gray-700 cursor-pointer hover:text-[#3A7AFE] transition-colors"
          onClick={triggerPicker} title="Click to change date">
          {formatDate(closureDate)}
        </span>
      ) : (
        <span className="text-xs text-gray-300">—</span>
      )}
      <button type="button" onClick={triggerPicker} disabled={saving} title="Set closure date"
        className="h-5 w-5 rounded-md flex items-center justify-center text-gray-300 hover:text-[#3A7AFE] hover:bg-blue-50 transition-colors disabled:opacity-40">
        {saving
          ? <span className="h-3 w-3 border-2 border-blue-300 border-t-[#3A7AFE] rounded-full animate-spin block" />
          : <Calendar className="h-3 w-3" />}
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ConfirmState {
  open: boolean; title: string; message: string; onConfirm: () => void
}

export function CustomersContent() {
  const { customers, deleteCustomer, moveCustomerToLead, updateCustomer, users, customerPayments, addCustomerPayment } = useCRM()
  const { isAdmin } = useAuth()

  const [searchTerm,         setSearchTerm]         = useState("")
  const [statusFilter,       setStatusFilter]       = useState("all")
  const [serviceFilter,      setServiceFilter]      = useState("all")
  const [userFilter,         setUserFilter]         = useState("all")
  const [monthFilter,        setMonthFilter]        = useState("all")   // 🆕 NEW — Closure Date month filter
  const [selectedCustomer,   setSelectedCustomer]   = useState<Customer | null>(null)
  const [isAddDialogOpen,    setIsAddDialogOpen]    = useState(false)
  const [isEditDialogOpen,   setIsEditDialogOpen]   = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isDeleting,         setIsDeleting]         = useState<string | null>(null)
  const [isBackToLead,       setIsBackToLead]       = useState<string | null>(null)
  const [toast,              setToast]              = useState<ToastType | null>(null)
  const [confirm,            setConfirm]            = useState<ConfirmState>({
    open: false, title: "", message: "", onConfirm: () => {},
  })

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Unique assigned users for the filter dropdown
  const assignedUsers = useMemo(() => {
    const names = new Set<string>()
    customers.forEach((c) => {
      const u = (c as any).assignedUser as string | null
      if (u && u.trim()) names.add(u.trim())
    })
    return Array.from(names).sort()
  }, [customers])

  // ── 🆕 NEW: shared search/status/service/user predicate ─────────────────────
  // This is the EXACT SAME matching logic that used to live inline inside the
  // `filtered` useMemo below — it's just pulled out into its own function so the
  // new Monthly Payment Tracker can reuse it (to group by month under the same
  // search/status/service/user filters) without copy-pasting the rules. The
  // matching behaviour for those four filters is unchanged.
  const matchesBaseFilters = useCallback((c: Customer) => {
    const term = searchTerm.trim().toLowerCase()
    const matchSearch = !term ||
      [c.name, c.phone, c.company ?? "", c.city ?? "", c.service ?? ""]
        .some((v) => (v ?? "").toLowerCase().includes(term))
    const matchStatus  = statusFilter  === "all" || c.status  === statusFilter
    const matchService = serviceFilter === "all" || c.service === serviceFilter
    const matchUser     = userFilter    === "all" || (c as any).assignedUser === userFilter || (userFilter === "unassigned" && !(c as any).assignedUser)
    return matchSearch && matchStatus && matchService && matchUser
  }, [searchTerm, statusFilter, serviceFilter, userFilter])

  // ── 🆕 REWRITTEN: Monthly Payment Tracker data ───────────────────────────────
  // Groups actual logged PAYMENTS (each with its own paymentDate) by the month
  // they were received — not by Closure Date anymore. Respects search/status/
  // service/user filters (via matchesBaseFilters) — only the month dimension
  // itself is left open, since the whole point of this list is to let you pick
  // a month. "Outstanding" is the CURRENT due balance of the clients who paid
  // in that month — a present-tense figure shown for context, not a historical
  // "amount due in that month" (there's no per-month billing schedule to
  // compute that from with the current data model).
  const monthlyBreakdown = useMemo(() => {
    const relevantIds = new Set(customers.filter(matchesBaseFilters).map((c) => c.id))
    const byMonth = new Map<string, { paymentCount: number; collected: number; customerIds: Set<string> }>()

    customerPayments
      .filter((p) => relevantIds.has(p.customerId))
      .forEach((p) => {
        const key = getMonthKey(p.paymentDate)
        if (!key) return
        const existing = byMonth.get(key)
        if (existing) {
          existing.paymentCount += 1
          existing.collected    += Number(p.amount) || 0
          existing.customerIds.add(p.customerId)
        } else {
          byMonth.set(key, { paymentCount: 1, collected: Number(p.amount) || 0, customerIds: new Set([p.customerId]) })
        }
      })

    return Array.from(byMonth.entries())
      .map(([monthKey, m]): MonthlyStat => {
        const outstanding = Array.from(m.customerIds).reduce((sum, id) => {
          const cust = customers.find((c) => c.id === id)
          return sum + computeRemaining((cust as any)?.dealValue, (cust as any)?.paidAmount)
        }, 0)
        return {
          monthKey,
          label: formatMonthLabel(monthKey),
          paymentCount: m.paymentCount,
          customerCount: m.customerIds.size,
          collected: m.collected,
          outstanding,
        }
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  }, [customers, customerPayments, matchesBaseFilters])

  // 🆕 REWRITTEN — month filter now matches clients who have at least one
  // logged payment dated in the selected month (was: closure date in that
  // month). Computed separately so `filtered` doesn't re-scan all payments on
  // every render.
  const customerIdsInSelectedMonth = useMemo(() => {
    if (monthFilter === "all") return null
    const ids = new Set<string>()
    customerPayments.forEach((p) => {
      if (getMonthKey(p.paymentDate) === monthFilter) ids.add(p.customerId)
    })
    return ids
  }, [customerPayments, monthFilter])

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchMonth = monthFilter === "all" || (customerIdsInSelectedMonth?.has(c.id) ?? false)
      return matchesBaseFilters(c) && matchMonth
    })
  }, [customers, matchesBaseFilters, monthFilter, customerIdsInSelectedMonth])

  // Status pill-tab counts — UNCHANGED behaviour: always reflect the full
  // customer list regardless of any active filter, so switching tabs always
  // shows the true totals you'd get (same as before this update).
  const statusCounts = useMemo(() => ({
    active:   customers.filter((c) => c.status === "active").length,
    prospect: customers.filter((c) => c.status === "prospect").length,
    inactive: customers.filter((c) => c.status === "inactive").length,
  }), [customers])

  const counts = useMemo(() => ({
    all: customers.length, active: statusCounts.active, prospect: statusCounts.prospect, inactive: statusCounts.inactive,
  }), [customers.length, statusCounts])

  // 🔧 BUG FIX — KPI tiles now derive from the CURRENTLY FILTERED view (search +
  // status + service + user + month), instead of the raw customers array, so
  // the numbers at the top actually change when you filter the table below.
  const stats = useMemo(() => {
    const active   = filtered.filter((c) => c.status === "active").length
    const prospect = filtered.filter((c) => c.status === "prospect").length
    const inactive = filtered.filter((c) => c.status === "inactive").length
    const totalDeal = filtered.reduce((s, c) => s + (Number((c as any).dealValue) || 0), 0)
    const totalPaid = filtered.reduce((s, c) => s + (Number((c as any).paidAmount) || 0), 0)
    const totalDue  = filtered.reduce(
      (s, c) => s + computeRemaining((c as any).dealValue, (c as any).paidAmount), 0
    )
    return { active, prospect, inactive, totalDeal, totalPaid, totalDue }
  }, [filtered])

  const openConfirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirm({ open: true, title, message, onConfirm })

  const handleDelete = useCallback((customer: Customer) => {
    openConfirm(
      "Delete client?",
      `"${customer.name}" will be permanently removed. This cannot be undone.`,
      async () => {
        setIsDeleting(customer.id)
        try {
          const ok = await deleteCustomer(customer.id)
          showToast(ok ? "Client deleted." : "Failed to delete client.", ok ? "success" : "error")
        } catch { showToast("An error occurred.", "error") }
        finally  { setIsDeleting(null) }
      }
    )
  }, [deleteCustomer, showToast])

  const handleBackToLead = useCallback((customer: Customer) => {
    openConfirm(
      "Move back to Leads?",
      `"${customer.name}" will be moved from Clients back to Leads.`,
      async () => {
        setIsBackToLead(customer.id)
        try {
          const ok = await moveCustomerToLead(customer.id)
          showToast(ok ? `${customer.name} moved back to Leads.` : "Failed to move client.", ok ? "success" : "error")
        } catch { showToast("An error occurred.", "error") }
        finally  { setIsBackToLead(null) }
      }
    )
  }, [moveCustomerToLead, showToast])

  // Kept for the Detail Dialog — Call/WhatsApp quick actions still live there.
  const handleCall = useCallback((customer: Customer) => {
    if (!customer.phone) { showToast("No phone number available.", "error"); return }
    window.open(`tel:${customer.phone}`, "_self")
  }, [showToast])

  const handleWhatsApp = useCallback((customer: Customer) => {
    const number = (customer as any).whatsappNumber || customer.phone
    if (!number) { showToast("No WhatsApp number available.", "error"); return }
    const clean   = number.replace(/\D/g, "")
    const message = encodeURIComponent("Hi, following up regarding your project with Vasifytech.")
    window.open(`https://wa.me/${clean}?text=${message}`, "_blank", "noopener,noreferrer")
  }, [showToast])

  const handleViewDetails = useCallback((c: Customer) => { setSelectedCustomer(c); setIsDetailDialogOpen(true) }, [])
  const handleEdit        = useCallback((c: Customer) => { setSelectedCustomer(c); setIsEditDialogOpen(true)  }, [])
  const handleDialogSaved = useCallback((isEdit: boolean) => showToast(isEdit ? "Client updated." : "Client added."), [showToast])

  const handleUserSave = useCallback(async (id: string, value: string) => {
    try {
      const ok = await updateCustomer(id, { assignedUser: value } as any)
      showToast(ok ? "User assigned." : "Failed to assign user.", ok ? "success" : "error")
    } catch (e: any) {
      showToast(e?.message || "Error assigning user.", "error")
    }
  }, [updateCustomer, showToast])

  const handleDealValueSave = useCallback(async (
    id: string,
    values: { dealValue: number | null; paidAmount: number | null; expectedAmount: number | null }
  ) => {
    try {
      const ok = await updateCustomer(id, values as any)
      showToast(ok ? "Deal value updated." : "Failed to save.", ok ? "success" : "error")
    } catch (e: any) {
      if (e?.message?.includes("Unknown column")) {
        showToast("Run migration.sql first — paid_amount/expected_amount column missing.", "error")
      } else {
        showToast(e?.message || "Error saving deal value.", "error")
      }
    }
  }, [updateCustomer, showToast])

  // 🆕 NEW — used by DealValueCell's "Add Payment" tab specifically. Unlike
  // handleDealValueSave (which "Edit Total" uses for plain corrections), this
  // logs a dated row in customer_payments so it shows up in the Monthly
  // Payment Tracker, in addition to bumping paidAmount/expectedAmount.
  const handleAddPayment = useCallback(async (
    id: string,
    data: { amount: number; paymentDate: string }
  ) => {
    try {
      const ok = await addCustomerPayment(id, data)
      showToast(ok ? "Payment recorded." : "Failed to record payment.", ok ? "success" : "error")
    } catch (e: any) {
      if (e?.message?.includes("doesn't exist") || e?.message?.includes("Unknown")) {
        showToast("Run the customer_payments migration first.", "error")
      } else {
        showToast(e?.message || "Error recording payment.", "error")
      }
    }
  }, [addCustomerPayment, showToast])

  const handleClosureDateSave = useCallback(async (id: string, date: string | null) => {
    try {
      const ok = await updateCustomer(id, { closureDate: date } as any)
      showToast(ok ? "Closure date saved." : "Failed to save date.", ok ? "success" : "error")
    } catch (e: any) {
      if (e?.message?.includes("Unknown column")) {
        showToast("Run migration.sql first — DB column missing.", "error")
      } else {
        showToast(e?.message || "Error saving date.", "error")
      }
    }
  }, [updateCustomer, showToast])

  const handleExport = useCallback(() => {
    if (!filtered.length) { showToast("No clients to export.", "error"); return }
    exportToCSV(filtered)
    showToast(`Exported ${filtered.length} client${filtered.length !== 1 ? "s" : ""}.`)
  }, [filtered, showToast])

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setServiceFilter("all")
    setUserFilter("all")
    setMonthFilter("all")   // 🆕 NEW
  }
  const hasFilters = searchTerm || statusFilter !== "all" || serviceFilter !== "all" || userFilter !== "all" || monthFilter !== "all"
  const activeFilterCount = [statusFilter !== "all", serviceFilter !== "all", userFilter !== "all", monthFilter !== "all", !!searchTerm].filter(Boolean).length

  // ✅ CHANGED — Phone column removed, Due column added.
  // 🔧 UI FIX — Status column widened (80px → 96px) so the badge text + dot never
  // wraps or clips at the lg breakpoint.
  // Client/Company | Service | User | Status | Closure Date | Deal Value | Due | Actions
  const GRID_COLS = "lg:grid-cols-[2.4fr_1.1fr_1fr_96px_1.1fr_1fr_1fr_90px]"

  return (
    <div className="min-h-screen" style={{ background: "#F4F6FB" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5"
        style={{ boxShadow: "0 1px 6px 0 rgba(0,0,0,0.06)" }}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold text-gray-900 tracking-tight">Client Directory</h1>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white leading-none">
                  <Filter className="h-2.5 w-2.5" />{activeFilterCount}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {activeFilterCount > 0
                ? <><span className="text-blue-600 font-bold">{filtered.length}</span> of {customers.length} clients</>
                : <>{customers.length} client{customers.length !== 1 ? "s" : ""} registered</>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={handleExport}
              className="rounded-xl border-gray-200 text-gray-600 text-xs sm:text-sm font-medium h-8 sm:h-9 px-3 sm:px-3.5 gap-1.5 hidden sm:flex hover:bg-gray-50">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 shadow-sm">
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Add Client</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ── KPI Gradient Tiles ─────────────────────────────────────────── */}
        {/* 🔧 BUG FIX — every tile below now reads from `filtered` / the new
            filtered-based `stats`, so these numbers move as soon as you search
            or pick a status / service / user / month filter, instead of always
            showing totals for the entire client list. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <GradientTile
            label="Total Clients"
            rawValue={filtered.length}
            gradient={TILE_GRADIENTS.total}
            sub={activeFilterCount > 0 ? `of ${customers.length} total` : "all clients"}
            icon={Users}
          />
          <GradientTile
            label="Active"
            rawValue={stats.active}
            gradient={TILE_GRADIENTS.active}
            sub={`${Math.round((stats.active / (filtered.length || 1)) * 100)}% of ${activeFilterCount > 0 ? "filtered" : "total"}`}
            icon={UserCheck}
          />
          <GradientTile
            label="Prospects"
            rawValue={stats.prospect}
            gradient={TILE_GRADIENTS.prospect}
            sub={`${stats.inactive} inactive`}
            icon={UserX}
          />
          <GradientTile
            label="Total Deal Value"
            rawValue={stats.totalDeal}
            displayValue={stats.totalDeal > 0 ? formatCurrency(stats.totalDeal) : "₹0"}
            gradient={TILE_GRADIENTS.deal}
            sub={stats.totalPaid > 0 ? `${formatCurrency(stats.totalPaid)} collected` : "no payments yet"}
            icon={TrendingUp}
          />
          <GradientTile
            label={stats.totalDue > 0 ? "Payment Due" : "Payments"}
            rawValue={stats.totalDue}
            displayValue={stats.totalDue > 0 ? formatCurrency(stats.totalDue) : "₹0"}
            gradient={stats.totalDue > 0 ? TILE_GRADIENTS.payment : TILE_GRADIENTS.paid}
            sub={stats.totalDue > 0 ? "still to collect" : "fully collected ✓"}
            icon={Wallet}
          />
        </div>

        {/* ── Monthly Payment Tracker — 🆕 NEW ─────────────────────────────── */}
        <MonthlyPaymentTracker
          months={monthlyBreakdown}
          selectedMonth={monthFilter}
          onSelectMonth={setMonthFilter}
        />

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-5 py-3.5 sm:py-4 space-y-3">

          {/* Row 1: search + status tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
              <Input
                placeholder="Search name, phone, company…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 h-9 rounded-xl border border-gray-200 focus:border-[#3A7AFE] bg-gray-50 text-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status pill tabs */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 shrink-0 overflow-x-auto w-full sm:w-auto">
              {STATUS_FILTERS.map((f) => (
                <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    statusFilter === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                  }`}>
                  {f.label}
                  <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full ${
                    statusFilter === f.value ? "bg-[#3A7AFE]/10 text-[#3A7AFE]" : "bg-gray-200 text-gray-500"
                  }`}>
                    {counts[f.value as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>

            <div className="ml-auto text-xs text-gray-400 font-medium hidden lg:block shrink-0">
              {filtered.length} of {customers.length} clients
            </div>
          </div>

          {/* Row 2: service + user + month filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-gray-400 shrink-0">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Filters:</span>
            </div>

            {/* Service filter */}
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
              className="h-8 rounded-xl border border-gray-200 text-xs px-2.5 bg-white text-gray-700 focus:border-[#3A7AFE] focus:outline-none cursor-pointer">
              <option value="all">All Services</option>
              {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>

            {/* User filter */}
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
              className="h-8 rounded-xl border border-gray-200 text-xs px-2.5 bg-white text-gray-700 focus:border-[#3A7AFE] focus:outline-none cursor-pointer">
              <option value="all">All Users</option>
              <option value="unassigned">Unassigned</option>
              {assignedUsers.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Month filter — 🆕 NEW: filters by Closure Date month, ties into the
                Monthly Payment Tracker above */}
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
              className="h-8 rounded-xl border border-gray-200 text-xs px-2.5 bg-white text-gray-700 focus:border-[#3A7AFE] focus:outline-none cursor-pointer">
              <option value="all">All Months</option>
              {monthlyBreakdown.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>{m.label} ({m.customerCount})</option>
              ))}
            </select>

            {/* Active filter chips */}
            {serviceFilter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {SERVICE_LABELS[serviceFilter] ?? serviceFilter}
                <button type="button" onClick={() => setServiceFilter("all")}><X className="h-2.5 w-2.5" /></button>
              </span>
            )}
            {userFilter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                👤 {userFilter === "unassigned" ? "Unassigned" : userFilter}
                <button type="button" onClick={() => setUserFilter("all")}><X className="h-2.5 w-2.5" /></button>
              </span>
            )}
            {monthFilter !== "all" && (
              <span className="inline-flex items-center gap-1 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                📅 {formatMonthLabel(monthFilter)}
                <button type="button" onClick={() => setMonthFilter("all")}><X className="h-2.5 w-2.5" /></button>
              </span>
            )}

            {hasFilters && (
              <button type="button" onClick={clearAllFilters}
                className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 ml-auto px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                <X className="h-3 w-3" />Clear{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
              </button>
            )}
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {/* 🔧 UI FIX — removed overflow-hidden here: it was clipping the Add-Payment /
            Edit-Total and Assign-User popovers whenever they extended past this card's
            box (most noticeable on rows near the bottom of the visible list). Rounded
            corners are preserved explicitly on the header/footer below instead, since
            the rows in between are white/transparent and don't need clipping to look
            correctly rounded. */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">

          {/* Table header — ✅ CHANGED: Phone removed, Due added */}
          <div className={`hidden lg:grid ${GRID_COLS} gap-4 px-6 py-3 border-b-2 border-gray-200 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest rounded-t-2xl`}
            style={{ background: "#F1F4F8" }}>
            {/* 🔧 UI FIX — truncate stops labels from wrapping/overflowing into the next
                column at squeezed widths; Deal Value & Due are right-aligned to match
                their right-aligned numeric cell content below. */}
            {["Client / Company","Service","User","Status","Closure Date","Deal Value","Due","Actions"].map((h, i) => (
              <div key={h} className={`truncate ${i >= 5 ? "text-right" : ""}`}>
                {h}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-gray-400">
              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 border border-gray-100">
                <Building2 className="h-8 w-8 opacity-30" />
              </div>
              <p className="text-sm font-semibold text-gray-500 mb-1">
                {hasFilters ? "No clients match your filters" : "No clients yet"}
              </p>
              {hasFilters
                ? <button type="button" onClick={clearAllFilters} className="text-xs text-[#3A7AFE] font-semibold hover:underline mt-1">Clear filters</button>
                : <p className="text-xs text-gray-400">Add your first client to get started.</p>
              }
            </div>
          )}

          {/* Rows */}
          <div className="divide-y divide-gray-50" role="list">
            {filtered.map((customer, idx) => {
              const svc    = customer.service ?? ""
              const status = STATUS_CONFIG[customer.status ?? "active"] ?? STATUS_CONFIG.active

              return (
                <div
                  key={customer.id}
                  role="listitem"
                  tabIndex={0}
                  className={`group cursor-pointer transition-all duration-150 hover:bg-blue-50/40 focus:outline-none focus:bg-blue-50/40 relative ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/20"}`}
                  onClick={() => handleViewDetails(customer)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleViewDetails(customer) }}
                >
                  {/* Left hover accent */}
                  <span className="absolute left-0 top-0 h-full w-[3px] rounded-r bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Desktop row — ✅ CHANGED: Phone column removed, Due column added, Call/WhatsApp action buttons removed */}
                  {/* 🔧 UI FIX — items-start (was items-center) so every column's first
                      line lines up across the row, instead of the two-line Deal Value
                      cell looking vertically off-center next to single-line cells. */}
                  <div className={`hidden lg:grid ${GRID_COLS} gap-4 items-start px-6 py-4`}>

                    {/* Client / Company */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-sm"
                        style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)" }}>
                        {customer.name?.charAt(0)?.toUpperCase() ?? "C"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{customer.name || "Unnamed"}</p>
                        <p className="text-xs text-gray-400 truncate">{customer.company || displayEmail(customer.email) || "—"}</p>
                      </div>
                    </div>

                    {/* Service */}
                    <div className="min-w-0">
                      {svc ? (
                        <span className="inline-block text-xs text-violet-700 font-semibold bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-lg truncate max-w-full">
                          {SERVICE_LABELS[svc] ?? svc}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </div>

                    {/* User */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <UserCell customer={customer} crmUsers={users} onSave={handleUserSave} />
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border px-2 py-0.5 rounded-full whitespace-nowrap ${status.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>

                    {/* Closure Date */}
                    <div>
                      <ClosureDateCell customer={customer} onSave={handleClosureDateSave} />
                    </div>

                    {/* Deal Value */}
                    <div>
                      <DealValueCell customer={customer} onSave={handleDealValueSave} onAddPayment={handleAddPayment} />
                    </div>

                    {/* ✅ NEW — Due · 🔧 UI FIX: right-aligned to match the Deal Value column */}
                    <div className="text-right">
                      <DueCell customer={customer} />
                    </div>

                    {/* Actions — ✅ CHANGED: Call/WhatsApp removed */}
                    <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(customer)}
                        className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300 transition-colors" title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"
                            className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300 transition-colors"
                            disabled={isDeleting === customer.id || isBackToLead === customer.id}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl border border-gray-100 shadow-xl p-1">
                          <DropdownMenuItem onSelect={() => handleEdit(customer)} className="text-sm rounded-lg gap-2">
                            <Edit className="h-3.5 w-3.5 text-gray-400" /> Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleBackToLead(customer)} disabled={isBackToLead === customer.id} className="text-sm rounded-lg gap-2">
                            <Undo2 className="h-3.5 w-3.5 text-amber-500" />
                            {isBackToLead === customer.id ? "Moving…" : "Back to Lead"}
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem onSelect={() => handleDelete(customer)} disabled={isDeleting === customer.id}
                                className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg gap-2">
                                <Trash2 className="h-3.5 w-3.5" />
                                {isDeleting === customer.id ? "Deleting…" : "Delete"}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Mobile row — ✅ CHANGED: phone meta line + Call/WhatsApp buttons removed */}
                  <div className="lg:hidden px-4 py-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm text-white shadow-sm"
                      style={{ background: "linear-gradient(135deg,#2563EB,#3B82F6)" }}>
                      {customer.name?.charAt(0)?.toUpperCase() ?? "C"}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{customer.name || "Unnamed"}</p>
                          {customer.company && <p className="text-xs text-gray-400 truncate">{customer.company}</p>}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold border px-2 py-0.5 rounded-full shrink-0 ${status.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {svc && (
                          <span className="text-xs text-violet-600 font-semibold bg-violet-50 px-1.5 py-0.5 rounded-md">
                            {SERVICE_LABELS[svc] ?? svc}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                        {(customer as any).assignedUser && <span>👤 {(customer as any).assignedUser}</span>}
                        {(customer as any).closureDate   && <span>📅 {formatDate((customer as any).closureDate)}</span>}
                        {(customer as any).dealValue != null && (
                          <span className="font-semibold text-gray-700">
                            {formatCurrency((customer as any).dealValue)}{" "}
                            <span className="text-amber-600 font-medium">
                              Due {formatCurrency(computeRemaining((customer as any).dealValue, (customer as any).paidAmount))}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-300">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl border border-gray-100 shadow-xl p-1">
                          <DropdownMenuItem onSelect={() => handleViewDetails(customer)} className="text-sm rounded-lg gap-2">
                            <Eye className="h-3.5 w-3.5 text-gray-400" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleEdit(customer)} className="text-sm rounded-lg gap-2">
                            <Edit className="h-3.5 w-3.5 text-gray-400" /> Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleBackToLead(customer)} className="text-sm rounded-lg gap-2">
                            <Undo2 className="h-3.5 w-3.5 text-amber-500" /> Back to Lead
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem onSelect={() => handleDelete(customer)} className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg gap-2">
                                <Trash2 className="h-3.5 w-3.5" />
                                {isDeleting === customer.id ? "Deleting…" : "Delete"}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between rounded-b-2xl">
              <p className="text-xs text-gray-400">
                Showing <span className="font-bold text-gray-600">{filtered.length}</span> of{" "}
                <span className="font-bold text-gray-600">{customers.length}</span> clients
              </p>
              <button type="button" onClick={handleExport}
                className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#3A7AFE] font-semibold transition-colors">
                <Download className="h-3.5 w-3.5" />
                Export {filtered.length !== customers.length ? "filtered" : "all"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <CustomerDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} customer={null} mode="add" onSaved={() => handleDialogSaved(false)} />
      <CustomerDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setSelectedCustomer(null) }}
        customer={selectedCustomer} mode="edit" onSaved={() => handleDialogSaved(true)}
      />
      <CustomerDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={(open) => { setIsDetailDialogOpen(open); if (!open) setSelectedCustomer(null) }}
        customer={selectedCustomer}
        onCallCustomer={handleCall}
        onWhatsAppCustomer={handleWhatsApp}
        onEditCustomer={handleEdit}
        onScheduleMeeting={(c) => showToast(`Meeting scheduling coming soon for ${c.name}.`)}
      />

      <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((p) => ({ ...p, open }))}>
        <AlertDialogContent className="rounded-2xl border border-gray-100 shadow-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-gray-900">{confirm.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">{confirm.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-gray-200 text-gray-600 text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm.onConfirm} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}