

// "use client"

// import type React from "react"
// import { useState, useEffect, useRef, useCallback } from "react"
// import { useSearchParams } from "next/navigation"
// import { useCRM } from "@/contexts/crm-context"
// import { useAuth } from "@/contexts/auth-context"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Textarea } from "@/components/ui/textarea"
// import { Switch } from "@/components/ui/switch"
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
// } from "@/components/ui/dialog"
// import { ChevronDown, ChevronUp, X, Search, Check } from "lucide-react"
// import type { Customer, CustomerPayload } from "@/types/crm"

// // ─── Types ────────────────────────────────────────────────────────────────────

// export type TechService =
//   | "" | "whatsapp-api" | "web-development" | "seo" | "social-media"
//   | "crm-development" | "app-development" | "cloud-hosting" | "it-support" | "other"

// export type BusinessType =
//   | "" | "startup" | "sme" | "enterprise" | "agency"
//   | "ecommerce" | "ngo" | "individual" | "other"

// const RETAINER_SERVICES = new Set([
//   "whatsapp-api", "seo", "social-media", "cloud-hosting", "it-support",
// ])

// type FormState = {
//   name:         string
//   phone:        string
//   company:      string
//   businessType: BusinessType
//   service:      TechService
//   status:       Customer["status"]
//   email:          string
//   whatsappNumber: string
//   address: string
//   city:    string
//   state:   string
//   zipCode: string
//   // CHANGED: salesRep → assignedUser
//   assignedUser:   string
//   source:         string
//   notes:          string
//   totalValue:     string
//   onboardingDate: string
//   // NEW
//   closureDate:    string
//   dealValue:      string
//   tags:           string[]
//   tagInput:       string
//   defaultTaxRate:      string
//   defaultDueDays:      string
//   defaultInvoiceNotes: string
//   recurringEnabled:  boolean
//   recurringInterval: "weekly" | "monthly" | "quarterly" | "yearly"
//   recurringAmount:   string
//   recurringService:  string
//   renewalDate:       string
// }

// const DEFAULT_FORM: FormState = {
//   name: "", phone: "", company: "", businessType: "", service: "", status: "prospect",
//   email: "", whatsappNumber: "",
//   address: "", city: "", state: "", zipCode: "",
//   assignedUser: "", source: "", notes: "", totalValue: "0", onboardingDate: "",
//   closureDate: "", dealValue: "",
//   tags: [], tagInput: "",
//   defaultTaxRate: "18", defaultDueDays: "15", defaultInvoiceNotes: "",
//   recurringEnabled: false, recurringInterval: "monthly",
//   recurringAmount: "", recurringService: "", renewalDate: "",
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const str = (v: unknown, fallback = ""): string => v != null ? String(v) : fallback

// const parseTags = (raw: unknown): string[] => {
//   if (!raw) return []
//   if (Array.isArray(raw)) return raw.filter(Boolean)
//   try { return JSON.parse(raw as string) } catch { return [] }
// }

// const readCustomer = (c: Customer): Partial<FormState> => ({
//   name:           str(c.name),
//   email:          str(c.email),
//   phone:          str(c.phone),
//   whatsappNumber: str(c.whatsappNumber),
//   company:        str(c.company),
//   businessType:   (c.businessType ?? "") as BusinessType,
//   address:        str(c.address),
//   city:           str(c.city),
//   state:          str(c.state),
//   zipCode:        str(c.zipCode),
//   status:         c.status ?? "prospect",
//   source:         str(c.source),
//   notes:          str(c.notes),
//   totalValue:     str(c.totalValue ?? 0, "0"),
//   service:        (c.service ?? "") as TechService,
//   assignedUser:   str(c.assignedUser),
//   onboardingDate: str(c.onboardingDate),
//   renewalDate:    str(c.renewalDate),
//   closureDate:    str(c.closureDate),
//   dealValue:      str(c.dealValue),
//   tags:           parseTags(c.tags),
//   tagInput:       "",
//   defaultTaxRate:      str(c.defaultTaxRate ?? 18),
//   defaultDueDays:      str(c.defaultDueDays ?? 15),
//   defaultInvoiceNotes: str(c.defaultInvoiceNotes),
//   recurringEnabled:    !!c.recurringEnabled,
//   recurringInterval:   (c.recurringInterval ?? "monthly") as FormState["recurringInterval"],
//   recurringAmount:     str(c.recurringAmount),
//   recurringService:    str(c.recurringService),
// })

// // ─── User Combobox ────────────────────────────────────────────────────────────
// // Dropdown of CRM users fetched from /api/users, with free-text fallback.
// // Shows matched users as you type; if no match, keeps your typed text as-is.

// interface CRMUser { id: string; name: string; email?: string }

// interface UserComboboxProps {
//   value:    string
//   onChange: (v: string) => void
// }

// function UserCombobox({ value, onChange }: UserComboboxProps) {
//   const [open,        setOpen]        = useState(false)
//   const [query,       setQuery]       = useState(value)
//   const [users,       setUsers]       = useState<CRMUser[]>([])
//   const [loading,     setLoading]     = useState(false)
//   const [fetchedOnce, setFetchedOnce] = useState(false)
//   const wrapRef  = useRef<HTMLDivElement>(null)
//   const inputRef = useRef<HTMLInputElement>(null)

//   // Sync external value → local query when form resets
//   useEffect(() => { setQuery(value) }, [value])

//   // Fetch users once on first open
//   const fetchUsers = useCallback(async () => {
//     if (fetchedOnce) return
//     setLoading(true)
//     try {
//       const res  = await fetch("/api/users", { credentials: "include" })
//       const data = await res.json()
//       // Handle both { users: [...] } and plain array responses
//       setUsers(Array.isArray(data) ? data : (data.users ?? []))
//     } catch {
//       setUsers([])
//     } finally {
//       setLoading(false)
//       setFetchedOnce(true)
//     }
//   }, [fetchedOnce])

//   const handleOpen = () => {
//     setOpen(true)
//     fetchUsers()
//     setTimeout(() => inputRef.current?.focus(), 20)
//   }

//   // Close on outside click
//   useEffect(() => {
//     if (!open) return
//     const handler = (e: MouseEvent) => {
//       if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
//         setOpen(false)
//         // Commit whatever was typed
//         onChange(query.trim())
//       }
//     }
//     document.addEventListener("mousedown", handler)
//     return () => document.removeEventListener("mousedown", handler)
//   }, [open, query, onChange])

//   const filtered = users.filter((u) =>
//     !query || u.name.toLowerCase().includes(query.toLowerCase())
//   )

//   const selectUser = (u: CRMUser) => {
//     setQuery(u.name)
//     onChange(u.name)
//     setOpen(false)
//   }

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setQuery(e.target.value)
//     onChange(e.target.value)   // update form live; allows free-text
//     if (!open) setOpen(true)
//   }

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === "Escape") { setOpen(false); return }
//     if (e.key === "Enter" && filtered.length === 1) { selectUser(filtered[0]); return }
//   }

//   return (
//     <div ref={wrapRef} className="relative">
//       {/* Input */}
//       <div className="relative">
//         <input
//           ref={inputRef}
//           type="text"
//           value={query}
//           onChange={handleInputChange}
//           onFocus={handleOpen}
//           onKeyDown={handleKeyDown}
//           placeholder="Select or type a name…"
//           className="w-full h-9 rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none focus:ring-0 text-sm bg-white px-3 pr-8 text-gray-900 placeholder:text-gray-400"
//         />
//         <ChevronDown
//           className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"
//         />
//       </div>

//       {/* Dropdown */}
//       {open && (
//         <div className="absolute left-0 top-10 z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
//           {loading ? (
//             <div className="px-3 py-3 text-xs text-gray-400 text-center">Loading users…</div>
//           ) : filtered.length === 0 ? (
//             <div className="px-3 py-3 text-xs text-gray-400">
//               {query
//                 ? <span>No user found — <span className="font-medium text-gray-600">"{query}"</span> will be saved as-is</span>
//                 : "No users found"}
//             </div>
//           ) : (
//             <ul className="max-h-44 overflow-y-auto py-1">
//               {filtered.map((u) => (
//                 <li key={u.id}>
//                   <button
//                     type="button"
//                     onClick={() => selectUser(u)}
//                     className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 text-left transition-colors"
//                   >
//                     <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">
//                       {u.name.charAt(0).toUpperCase()}
//                     </span>
//                     <div className="min-w-0 flex-1">
//                       <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
//                       {u.email && <p className="text-[11px] text-gray-400 truncate">{u.email}</p>}
//                     </div>
//                     {value === u.name && <Check className="h-3.5 w-3.5 text-[#3A7AFE] shrink-0" />}
//                   </button>
//                 </li>
//               ))}
//             </ul>
//           )}
//           {/* Free-text hint at bottom */}
//           {!loading && query && !users.some((u) => u.name.toLowerCase() === query.toLowerCase()) && (
//             <div className="border-t border-gray-100 px-3 py-2">
//               <button
//                 type="button"
//                 onClick={() => { onChange(query.trim()); setOpen(false) }}
//                 className="text-xs text-[#3A7AFE] font-medium hover:underline"
//               >
//                 Use "{query}" as custom name
//               </button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// // ─── UI Primitives ────────────────────────────────────────────────────────────

// function Section({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <div className="space-y-4">
//       <div className="flex items-center gap-3">
//         <h3 className="text-sm font-semibold text-gray-600 whitespace-nowrap">{title}</h3>
//         <div className="flex-1 h-px bg-gray-100" />
//       </div>
//       {children}
//     </div>
//   )
// }

// function Field({
//   label, required, hint, error, children,
// }: {
//   label: string; required?: boolean; hint?: string; error?: string | null; children: React.ReactNode
// }) {
//   return (
//     <div className="space-y-1.5">
//       <Label className="text-xs font-medium text-gray-500">
//         {label}
//         {required && <span className="text-red-400 ml-0.5">*</span>}
//       </Label>
//       {children}
//       {error && <p className="text-[11px] text-red-500">{error}</p>}
//       {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
//     </div>
//   )
// }

// function CollapsibleSection({
//   title, children, defaultOpen = false,
// }: {
//   title: string; children: React.ReactNode; defaultOpen?: boolean
// }) {
//   const [open, setOpen] = useState(defaultOpen)
//   useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])

//   return (
//     <div className="border border-gray-100 rounded-xl overflow-hidden">
//       <button
//         type="button"
//         onClick={() => setOpen((v) => !v)}
//         className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/60 hover:bg-gray-100/60 transition-colors text-left"
//       >
//         <span className="text-sm font-semibold text-gray-600">{title}</span>
//         {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
//       </button>
//       {open && <div className="px-4 py-4 space-y-4 border-t border-gray-100">{children}</div>}
//     </div>
//   )
// }

// const inputCls  = "rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:ring-0 text-sm bg-white"
// const selectCls = "rounded-xl border border-gray-200 px-3 py-2 text-sm w-full focus:border-[#3A7AFE] focus:outline-none bg-white text-gray-900 h-9"

// // ─── Props ────────────────────────────────────────────────────────────────────

// interface Props {
//   open:         boolean
//   onOpenChange: (open: boolean) => void
//   customer:     Customer | null
//   mode:         "add" | "edit"
//   onSaved?:     () => void
//   leadId?:      string
// }

// // ─── Main Component ───────────────────────────────────────────────────────────

// export function CustomerDialog({ open, onOpenChange, customer, mode, onSaved, leadId: leadIdProp }: Props) {
//   const { addCustomer, updateCustomer } = useCRM()
//   const { user } = useAuth()
//   const searchParams = useSearchParams()
//   const leadId = leadIdProp ?? searchParams.get("leadId") ?? undefined

//   const [form,         setForm]         = useState<FormState>(DEFAULT_FORM)
//   const [error,        setError]        = useState<string | null>(null)
//   const [phoneError,   setPhoneError]   = useState<string | null>(null)
//   const [isSubmitting, setIsSubmitting] = useState(false)
//   const [isDirty,      setIsDirty]      = useState(false)

//   const set = (patch: Partial<FormState>) => {
//     setForm((prev) => ({ ...prev, ...patch }))
//     setIsDirty(true)
//   }

//   useEffect(() => {
//     if (!open) return
//     if (customer && mode === "edit") {
//       setForm({ ...DEFAULT_FORM, ...readCustomer(customer) })
//     } else {
//       setForm(DEFAULT_FORM)
//     }
//     setError(null)
//     setPhoneError(null)
//     setIsDirty(false)
//   }, [open, customer, mode])

//   useEffect(() => {
//     if (mode !== "add") return
//     if (RETAINER_SERVICES.has(form.service)) {
//       setForm((prev) => ({ ...prev, recurringEnabled: true, recurringInterval: "monthly" }))
//     }
//   }, [form.service, mode])

//   const addTag = () => {
//     const tag = form.tagInput.trim()
//     if (!tag || form.tags.includes(tag)) { set({ tagInput: "" }); return }
//     set({ tags: [...form.tags, tag], tagInput: "" })
//   }
//   const removeTag = (tag: string) => set({ tags: form.tags.filter((t) => t !== tag) })
//   const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() }
//     if (e.key === "Backspace" && !form.tagInput && form.tags.length) {
//       removeTag(form.tags[form.tags.length - 1])
//     }
//   }

//   const handleOpenChange = (nextOpen: boolean) => {
//     if (!nextOpen && isDirty) {
//       if (!window.confirm("You have unsaved changes. Discard them?")) return
//     }
//     onOpenChange(nextOpen)
//   }

//   const handlePhoneBlur = () => {
//     if (!form.phone) { setPhoneError(null); return }
//     const clean = form.phone.replace(/\s/g, "")
//     const validIndian = /^(\+91)?[6-9]\d{9}$/.test(clean)
//     const validIntl   = /^\+\d{7,15}$/.test(clean)
//     if (!validIndian && !validIntl) {
//       setPhoneError("Enter a valid mobile number (10-digit Indian or international with +code).")
//     } else {
//       setPhoneError(null)
//     }
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError(null)

//     if (!form.name.trim())  return setError("Client name is required.")
//     if (!form.phone.trim()) return setError("Phone number is required.")
//     if (phoneError)         return setError(phoneError)

//     const totalValue = Number(form.totalValue || 0)
//     if (isNaN(totalValue) || totalValue < 0)
//       return setError("Total value must be a valid positive number.")

//     const dealValue = form.dealValue !== "" ? Number(form.dealValue) : undefined
//     if (dealValue !== undefined && (isNaN(dealValue) || dealValue < 0))
//       return setError("Deal value must be a valid positive number.")

//     const payload: CustomerPayload = {
//       name:           form.name.trim(),
//       email:          form.email.trim()   || undefined,
//       phone:          form.phone.trim(),
//       whatsappNumber: form.whatsappNumber || undefined,
//       company:        form.company        || undefined,
//       businessType:   form.businessType  || undefined,
//       address:        form.address        || undefined,
//       city:           form.city           || undefined,
//       state:          form.state          || undefined,
//       zipCode:        form.zipCode        || undefined,
//       country:        "India",
//       status:         form.status,
//       source:         form.source         || undefined,
//       notes:          form.notes          || undefined,
//       totalValue,
//       tags:           form.tags,
//       assignedUser:   form.assignedUser   || undefined,
//       onboardingDate: form.onboardingDate || undefined,
//       renewalDate:    form.renewalDate    || undefined,
//       closureDate:    form.closureDate    || undefined,
//       dealValue,
//       assignedTo:     customer?.assignedTo ?? user?.id ?? "",
//       lastContactDate: customer?.lastContactDate,
//       service:        form.service        || undefined,
//       defaultTaxRate:      form.defaultTaxRate      ? Number(form.defaultTaxRate)      : undefined,
//       defaultDueDays:      form.defaultDueDays      ? Number(form.defaultDueDays)      : undefined,
//       defaultInvoiceNotes: form.defaultInvoiceNotes || undefined,
//       recurringEnabled:    form.recurringEnabled,
//       recurringInterval:   form.recurringInterval,
//       recurringAmount:     form.recurringAmount ? Number(form.recurringAmount) : undefined,
//       recurringService:    form.recurringService || undefined,
//       ...(leadId ? { leadId } : {}),
//       createdAt: customer?.createdAt ?? new Date(),
//       updatedAt: new Date(),
//     }

//     setIsSubmitting(true)
//     try {
//       const ok = mode === "add"
//         ? await addCustomer(payload)
//         : customer ? await updateCustomer(customer.id, payload) : false

//       if (ok) {
//         setIsDirty(false)
//         onOpenChange(false)
//         onSaved?.()
//       } else {
//         setError("Failed to save client. Please try again.")
//       }
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : "Failed to save client.")
//     } finally {
//       setIsSubmitting(false)
//     }
//   }

//   // ─── Render ───────────────────────────────────────────────────────────────
//   return (
//     <Dialog open={open} onOpenChange={handleOpenChange}>
//       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 shadow-xl p-0">

//         <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
//           <DialogTitle className="text-lg font-semibold text-gray-900">
//             {mode === "add" ? "Add New Client" : "Edit Client"}
//           </DialogTitle>
//           <DialogDescription className="text-sm text-gray-400 mt-0.5">
//             {mode === "add"
//               ? "Fill in the essential details. Advanced options can be configured after onboarding."
//               : "Update client information."}
//           </DialogDescription>
//         </DialogHeader>

//         <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

//           {/* ── Essential Information ─────────────────────────────────── */}
//           <Section title="Essential Information">
//             <div className="grid grid-cols-2 gap-4">
//               <Field label="Contact Name" required>
//                 <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Primary contact name" className={inputCls} autoFocus />
//               </Field>
//               <Field label="Company / Business Name">
//                 <Input value={form.company} onChange={(e) => set({ company: e.target.value })} placeholder="Company or business name" className={inputCls} />
//               </Field>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <Field label="Phone" required error={phoneError}>
//                 <Input
//                   type="tel" value={form.phone}
//                   onChange={(e) => { set({ phone: e.target.value }); setPhoneError(null) }}
//                   onBlur={handlePhoneBlur}
//                   placeholder="+91 or international number"
//                   className={`${inputCls} ${phoneError ? "border-red-300 focus:border-red-400" : ""}`}
//                 />
//               </Field>
//               <Field label="Business Type">
//                 <select className={selectCls} value={form.businessType} onChange={(e) => set({ businessType: e.target.value as BusinessType })}>
//                   <option value="">Select type</option>
//                   <option value="startup">Startup</option>
//                   <option value="sme">SME</option>
//                   <option value="enterprise">Enterprise</option>
//                   <option value="agency">Agency</option>
//                   <option value="ecommerce">E-commerce</option>
//                   <option value="ngo">NGO / Non-Profit</option>
//                   <option value="individual">Individual / Freelancer</option>
//                   <option value="other">Other</option>
//                 </select>
//               </Field>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <Field label="Service / Project Type">
//                 <select className={selectCls} value={form.service} onChange={(e) => set({ service: e.target.value as TechService })}>
//                   <option value="">Select service</option>
//                   <option value="whatsapp-api">WhatsApp API Retainer</option>
//                   <option value="web-development">Web Development</option>
//                   <option value="crm-development">CRM Development</option>
//                   <option value="app-development">App Development</option>
//                   <option value="seo">SEO / Digital Marketing</option>
//                   <option value="social-media">Social Media Management</option>
//                   <option value="cloud-hosting">Cloud & Hosting</option>
//                   <option value="it-support">IT Support</option>
//                   <option value="other">Other</option>
//                 </select>
//                 {RETAINER_SERVICES.has(form.service) && mode === "add" && (
//                   <p className="text-[11px] text-emerald-600 font-medium mt-1">✓ Monthly retainer billing will be auto-enabled</p>
//                 )}
//               </Field>
//               <Field label="Status">
//                 <select className={selectCls} value={form.status} onChange={(e) => set({ status: e.target.value as Customer["status"] })}>
//                   <option value="prospect">Prospect</option>
//                   <option value="active">Active</option>
//                   <option value="inactive">Inactive</option>
//                 </select>
//               </Field>
//             </div>

//             <Field label="Tags" hint="Press Enter or comma to add a tag">
//               <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center px-3 py-1.5 rounded-xl border border-gray-200 bg-white focus-within:border-[#3A7AFE] cursor-text">
//                 {form.tags.map((tag) => (
//                   <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2 py-0.5 rounded-full">
//                     {tag}
//                     <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900 ml-0.5" aria-label={`Remove tag ${tag}`}>
//                       <X className="h-2.5 w-2.5" />
//                     </button>
//                   </span>
//                 ))}
//                 <input
//                   type="text" value={form.tagInput}
//                   onChange={(e) => set({ tagInput: e.target.value })}
//                   onKeyDown={handleTagKeyDown} onBlur={addTag}
//                   placeholder={form.tags.length === 0 ? "e.g. vip, enterprise, priority…" : ""}
//                   className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
//                 />
//               </div>
//             </Field>
//           </Section>

//           {/* ── Deal Details ──────────────────────────────────────────── */}
//           <Section title="Deal Details">
//             <div className="grid grid-cols-2 gap-4">
//               <Field label="Deal Value (₹)" hint="Value of this specific deal">
//                 <div className="relative">
//                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
//                   <Input
//                     type="number" min="0"
//                     value={form.dealValue}
//                     onChange={(e) => set({ dealValue: e.target.value })}
//                     placeholder="0"
//                     className={`${inputCls} pl-7`}
//                   />
//                 </div>
//               </Field>
//               <Field label="Closure Date" hint="Expected or actual deal closure date">
//                 <Input type="date" value={form.closureDate} onChange={(e) => set({ closureDate: e.target.value })} className={inputCls} />
//               </Field>
//             </div>
//           </Section>

//           {/* ── Contact & Sales Details ───────────────────────────────── */}
//           <CollapsibleSection title="Contact & Sales Details">
//             <div className="grid grid-cols-2 gap-4">
//               <Field label="Email">
//                 <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="business@example.com" className={inputCls} />
//               </Field>
//               <Field label="WhatsApp Number">
//                 <Input type="tel" value={form.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} placeholder="If different from phone" className={inputCls} />
//               </Field>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               {/* ✅ NEW: Combobox — dropdown of CRM users + free-text fallback */}
//               <Field label="Assigned User" hint="Pick a team member or type any name">
//                 <UserCombobox
//                   value={form.assignedUser}
//                   onChange={(v) => set({ assignedUser: v })}
//                 />
//               </Field>
//               <Field label="Lead Source">
//                 <select className={selectCls} value={form.source} onChange={(e) => set({ source: e.target.value })}>
//                   <option value="">Select source</option>
//                   <option value="website">Website</option>
//                   <option value="referral">Referral</option>
//                   <option value="whatsapp">WhatsApp</option>
//                   <option value="social-media">Social Media</option>
//                   <option value="cold-outreach">Cold Outreach</option>
//                   <option value="event">Event / Exhibition</option>
//                   <option value="manual">Manual Entry</option>
//                   <option value="other">Other</option>
//                 </select>
//               </Field>
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <Field label="Total Deal Value (₹)" hint="Overall relationship value">
//                 <Input type="number" min="0" value={form.totalValue} onChange={(e) => set({ totalValue: e.target.value })} className={inputCls} />
//               </Field>
//               <Field label="Onboarding Date">
//                 <Input type="date" value={form.onboardingDate} onChange={(e) => set({ onboardingDate: e.target.value })} max={new Date().toISOString().split("T")[0]} className={inputCls} />
//               </Field>
//             </div>

//             <Field label="Address">
//               <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street address" className={inputCls} />
//             </Field>
//             <div className="grid grid-cols-3 gap-3">
//               <Input placeholder="City"     value={form.city}    onChange={(e) => set({ city: e.target.value })}    className={inputCls} />
//               <Input placeholder="State"    value={form.state}   onChange={(e) => set({ state: e.target.value })}   className={inputCls} />
//               <Input placeholder="PIN code" value={form.zipCode} onChange={(e) => set({ zipCode: e.target.value })} className={inputCls} />
//             </div>
//           </CollapsibleSection>

//           {/* ── Notes ────────────────────────────────────────────────── */}
//           <CollapsibleSection title="Notes">
//             <Textarea
//               rows={3} value={form.notes}
//               onChange={(e) => set({ notes: e.target.value })}
//               placeholder="Project notes, requirements, or any additional context…"
//               className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] resize-none text-sm"
//             />
//           </CollapsibleSection>

//           {/* ── Invoice Defaults ──────────────────────────────────────── */}
//           <CollapsibleSection title="Invoice Defaults">
//             <div className="grid grid-cols-3 gap-4">
//               <Field label="GST Rate (%)">
//                 <select className={selectCls} value={form.defaultTaxRate} onChange={(e) => set({ defaultTaxRate: e.target.value })}>
//                   <option value="0">0% — Exempt</option>
//                   <option value="5">5%</option>
//                   <option value="12">12%</option>
//                   <option value="18">18% — Standard</option>
//                   <option value="28">28%</option>
//                 </select>
//               </Field>
//               <Field label="Payment Due (Days)">
//                 <Input type="number" min="0" value={form.defaultDueDays} onChange={(e) => set({ defaultDueDays: e.target.value })} className={inputCls} />
//               </Field>
//               <Field label="Invoice Notes">
//                 <Input value={form.defaultInvoiceNotes} onChange={(e) => set({ defaultInvoiceNotes: e.target.value })} placeholder="e.g. Pay via bank transfer" className={inputCls} />
//               </Field>
//             </div>
//           </CollapsibleSection>

//           {/* ── Monthly Retainer / Recurring Billing ─────────────────── */}
//           <CollapsibleSection title="Monthly Retainer / Recurring Billing" defaultOpen={form.recurringEnabled}>
//             <div className="flex items-center justify-between py-1">
//               <div>
//                 <p className="text-sm font-medium text-gray-700">Enable Recurring Billing</p>
//                 <p className="text-xs text-gray-400 mt-0.5">Auto-generates invoices on a set schedule</p>
//               </div>
//               <Switch checked={form.recurringEnabled} onCheckedChange={(v) => set({ recurringEnabled: v })} />
//             </div>

//             {form.recurringEnabled && (
//               <div className="grid grid-cols-2 gap-4 pt-1">
//                 <Field label="Billing Frequency">
//                   <select className={selectCls} value={form.recurringInterval} onChange={(e) => set({ recurringInterval: e.target.value as FormState["recurringInterval"] })}>
//                     <option value="weekly">Weekly</option>
//                     <option value="monthly">Monthly</option>
//                     <option value="quarterly">Quarterly</option>
//                     <option value="yearly">Yearly</option>
//                   </select>
//                 </Field>
//                 <Field label="Retainer Amount (₹)">
//                   <Input type="number" min="0" value={form.recurringAmount} onChange={(e) => set({ recurringAmount: e.target.value })} placeholder="Monthly retainer fee" className={inputCls} />
//                 </Field>
//                 <Field label="Service / Plan Name">
//                   <Input value={form.recurringService} onChange={(e) => set({ recurringService: e.target.value })} placeholder="e.g. WhatsApp API Monthly Plan" className={inputCls} />
//                 </Field>
//                 <Field label="Next Renewal Date">
//                   <Input type="date" value={form.renewalDate} onChange={(e) => set({ renewalDate: e.target.value })} min={new Date().toISOString().split("T")[0]} className={inputCls} />
//                 </Field>
//               </div>
//             )}
//           </CollapsibleSection>

//           {/* ── Error banner ─────────────────────────────────────────── */}
//           {error && (
//             <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
//               <span className="shrink-0">⚠</span>
//               <span>{error}</span>
//             </div>
//           )}

//           {/* ── Footer ───────────────────────────────────────────────── */}
//           <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-50">
//             <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting} className="rounded-xl border-gray-200 text-gray-600 text-sm font-medium px-5">
//               Cancel
//             </Button>
//             <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-sm font-medium px-5 shadow-sm">
//               {isSubmitting
//                 ? (mode === "add" ? "Adding…" : "Updating…")
//                 : (mode === "add" ? "Add Client" : "Update Client")}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   )
// }




//testing





"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useCRM } from "@/contexts/crm-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { ChevronDown, ChevronUp, X, Search, Check } from "lucide-react"
import type { Customer, CustomerPayload } from "@/types/crm"

// ─── Types ────────────────────────────────────────────────────────────────────

export type TechService =
  | "" | "whatsapp-api" | "web-development" | "seo" | "social-media"
  | "crm-development" | "app-development" | "cloud-hosting" | "it-support" | "other"

export type BusinessType =
  | "" | "startup" | "sme" | "enterprise" | "agency"
  | "ecommerce" | "ngo" | "individual" | "other"

const RETAINER_SERVICES = new Set([
  "whatsapp-api", "seo", "social-media", "cloud-hosting", "it-support",
])

type FormState = {
  name:         string
  phone:        string
  company:      string
  businessType: BusinessType
  service:      TechService
  status:       Customer["status"]
  email:          string
  whatsappNumber: string
  address: string
  city:    string
  state:   string
  zipCode: string
  // CHANGED: salesRep → assignedUser
  assignedUser:   string
  source:         string
  notes:          string
  totalValue:     string
  onboardingDate: string
  // NEW
  closureDate:    string
  dealValue:      string
  tags:           string[]
  tagInput:       string
  defaultTaxRate:      string
  defaultDueDays:      string
  defaultInvoiceNotes: string
  recurringEnabled:  boolean
  recurringInterval: "weekly" | "monthly" | "quarterly" | "yearly"
  recurringAmount:   string
  recurringService:  string
  renewalDate:       string
}

const DEFAULT_FORM: FormState = {
  name: "", phone: "", company: "", businessType: "", service: "", status: "prospect",
  email: "", whatsappNumber: "",
  address: "", city: "", state: "", zipCode: "",
  assignedUser: "", source: "", notes: "", totalValue: "0", onboardingDate: "",
  closureDate: "", dealValue: "",
  tags: [], tagInput: "",
  defaultTaxRate: "18", defaultDueDays: "15", defaultInvoiceNotes: "",
  recurringEnabled: false, recurringInterval: "monthly",
  recurringAmount: "", recurringService: "", renewalDate: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const str = (v: unknown, fallback = ""): string => v != null ? String(v) : fallback

const parseTags = (raw: unknown): string[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try { return JSON.parse(raw as string) } catch { return [] }
}

const readCustomer = (c: Customer): Partial<FormState> => ({
  name:           str(c.name),
  email:          str(c.email),
  phone:          str(c.phone),
  whatsappNumber: str(c.whatsappNumber),
  company:        str(c.company),
  businessType:   (c.businessType ?? "") as BusinessType,
  address:        str(c.address),
  city:           str(c.city),
  state:          str(c.state),
  zipCode:        str(c.zipCode),
  status:         c.status ?? "prospect",
  source:         str(c.source),
  notes:          str(c.notes),
  totalValue:     str(c.totalValue ?? 0, "0"),
  service:        (c.service ?? "") as TechService,
  assignedUser:   str(c.assignedUser),
  onboardingDate: str(c.onboardingDate),
  renewalDate:    str(c.renewalDate),
  closureDate:    str(c.closureDate),
  dealValue:      str(c.dealValue),
  tags:           parseTags(c.tags),
  tagInput:       "",
  defaultTaxRate:      str(c.defaultTaxRate ?? 18),
  defaultDueDays:      str(c.defaultDueDays ?? 15),
  defaultInvoiceNotes: str(c.defaultInvoiceNotes),
  recurringEnabled:    !!c.recurringEnabled,
  recurringInterval:   (c.recurringInterval ?? "monthly") as FormState["recurringInterval"],
  recurringAmount:     str(c.recurringAmount),
  recurringService:    str(c.recurringService),
})

// ─── User Combobox ────────────────────────────────────────────────────────────
// Dropdown of CRM users fetched from /api/users, with free-text fallback.
// Shows matched users as you type; if no match, keeps your typed text as-is.

interface CRMUser { id: string; name: string; email?: string }

interface UserComboboxProps {
  value:    string
  onChange: (v: string) => void
}

function UserCombobox({ value, onChange }: UserComboboxProps) {
  const [open,        setOpen]        = useState(false)
  const [query,       setQuery]       = useState(value)
  const [users,       setUsers]       = useState<CRMUser[]>([])
  const [loading,     setLoading]     = useState(false)
  const [fetchedOnce, setFetchedOnce] = useState(false)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value → local query when form resets
  useEffect(() => { setQuery(value) }, [value])

  // Fetch users once on first open
  const fetchUsers = useCallback(async () => {
    if (fetchedOnce) return
    setLoading(true)
    try {
      const res  = await fetch("/api/users", { credentials: "include" })
      const data = await res.json()
      // Handle both { users: [...] } and plain array responses
      setUsers(Array.isArray(data) ? data : (data.users ?? []))
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
      setFetchedOnce(true)
    }
  }, [fetchedOnce])

  const handleOpen = () => {
    setOpen(true)
    fetchUsers()
    setTimeout(() => inputRef.current?.focus(), 20)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        // Commit whatever was typed
        onChange(query.trim())
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, query, onChange])

  const filtered = users.filter((u) =>
    !query || u.name.toLowerCase().includes(query.toLowerCase())
  )

  const selectUser = (u: CRMUser) => {
    setQuery(u.name)
    onChange(u.name)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    onChange(e.target.value)   // update form live; allows free-text
    if (!open) setOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return }
    if (e.key === "Enter" && filtered.length === 1) { selectUser(filtered[0]); return }
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleOpen}
          onKeyDown={handleKeyDown}
          placeholder="Select or type a name…"
          className="w-full h-9 rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none focus:ring-0 text-sm bg-white px-3 pr-8 text-gray-900 placeholder:text-gray-400"
        />
        <ChevronDown
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-10 z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400">
              {query
                ? <span>No user found — <span className="font-medium text-gray-600">"{query}"</span> will be saved as-is</span>
                : "No users found"}
            </div>
          ) : (
            <ul className="max-h-44 overflow-y-auto py-1">
              {filtered.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => selectUser(u)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                      {u.email && <p className="text-[11px] text-gray-400 truncate">{u.email}</p>}
                    </div>
                    {value === u.name && <Check className="h-3.5 w-3.5 text-[#3A7AFE] shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {/* Free-text hint at bottom */}
          {!loading && query && !users.some((u) => u.name.toLowerCase() === query.toLowerCase()) && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => { onChange(query.trim()); setOpen(false) }}
                className="text-xs text-[#3A7AFE] font-medium hover:underline"
              >
                Use "{query}" as custom name
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-gray-600 whitespace-nowrap">{title}</h3>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      {children}
    </div>
  )
}

function Field({
  label, required, hint, error, children,
}: {
  label: string; required?: boolean; hint?: string; error?: string | null; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-500">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

function CollapsibleSection({
  title, children, defaultOpen = false,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => { setOpen(defaultOpen) }, [defaultOpen])

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/60 hover:bg-gray-100/60 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-600">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-4 space-y-4 border-t border-gray-100">{children}</div>}
    </div>
  )
}

const inputCls  = "rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:ring-0 text-sm bg-white"
const selectCls = "rounded-xl border border-gray-200 px-3 py-2 text-sm w-full focus:border-[#3A7AFE] focus:outline-none bg-white text-gray-900 h-9"

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open:         boolean
  onOpenChange: (open: boolean) => void
  customer:     Customer | null
  mode:         "add" | "edit"
  onSaved?:     () => void
  leadId?:      string
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomerDialog({ open, onOpenChange, customer, mode, onSaved, leadId: leadIdProp }: Props) {
  const { addCustomer, updateCustomer } = useCRM()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const leadId = leadIdProp ?? searchParams.get("leadId") ?? undefined

  const [form,         setForm]         = useState<FormState>(DEFAULT_FORM)
  const [error,        setError]        = useState<string | null>(null)
  const [phoneError,   setPhoneError]   = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty,      setIsDirty]      = useState(false)

  const set = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setIsDirty(true)
  }

  useEffect(() => {
    if (!open) return
    if (customer && mode === "edit") {
      setForm({ ...DEFAULT_FORM, ...readCustomer(customer) })
    } else {
      setForm(DEFAULT_FORM)
    }
    setError(null)
    setPhoneError(null)
    setIsDirty(false)
  }, [open, customer, mode])

  useEffect(() => {
    if (mode !== "add") return
    if (RETAINER_SERVICES.has(form.service)) {
      setForm((prev) => ({ ...prev, recurringEnabled: true, recurringInterval: "monthly" }))
    }
  }, [form.service, mode])

  const addTag = () => {
    const tag = form.tagInput.trim()
    if (!tag || form.tags.includes(tag)) { set({ tagInput: "" }); return }
    set({ tags: [...form.tags, tag], tagInput: "" })
  }
  const removeTag = (tag: string) => set({ tags: form.tags.filter((t) => t !== tag) })
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() }
    if (e.key === "Backspace" && !form.tagInput && form.tags.length) {
      removeTag(form.tags[form.tags.length - 1])
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      if (!window.confirm("You have unsaved changes. Discard them?")) return
    }
    onOpenChange(nextOpen)
  }

const handlePhoneBlur = () => {
  if (!form.phone) {
    setPhoneError(null);
    return;
  }

  const clean = form.phone.replace(/\s/g, "");

  const validIndian = /^(?:\+91)?[6-9]\d{9}$/.test(clean);
  const validIntl = /^\+\d{7,15}$/.test(clean);

  if (!validIndian && !validIntl) {
    setPhoneError(
      "Enter a valid mobile number (10-digit Indian or international with +code)."
    );
  } else {
    setPhoneError(null);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.name.trim())  return setError("Client name is required.")
    if (!form.phone.trim()) return setError("Phone number is required.")
    if (phoneError)         return setError(phoneError)

    const totalValue = Number(form.totalValue || 0)
    if (isNaN(totalValue) || totalValue < 0)
      return setError("Total value must be a valid positive number.")

    const dealValue = form.dealValue !== "" ? Number(form.dealValue) : undefined
    if (dealValue !== undefined && (isNaN(dealValue) || dealValue < 0))
      return setError("Deal value must be a valid positive number.")

    const payload: CustomerPayload = {
      name:           form.name.trim(),
      email:          form.email.trim()   || undefined,
      phone:          form.phone.trim(),
      whatsappNumber: form.whatsappNumber || undefined,
      company:        form.company        || undefined,
      businessType:   form.businessType  || undefined,
      address:        form.address        || undefined,
      city:           form.city           || undefined,
      state:          form.state          || undefined,
      zipCode:        form.zipCode        || undefined,
      country:        "India",
      status:         form.status,
      source:         form.source         || undefined,
      notes:          form.notes          || undefined,
      totalValue,
      tags:           form.tags,
      assignedUser:   form.assignedUser   || undefined,
      onboardingDate: form.onboardingDate || undefined,
      renewalDate:    form.renewalDate    || undefined,
      closureDate:    form.closureDate    || undefined,
      dealValue,
      assignedTo:     customer?.assignedTo ?? user?.id ?? "",
      lastContactDate: customer?.lastContactDate,
      service:        form.service        || undefined,
      defaultTaxRate:      form.defaultTaxRate      ? Number(form.defaultTaxRate)      : undefined,
      defaultDueDays:      form.defaultDueDays      ? Number(form.defaultDueDays)      : undefined,
      defaultInvoiceNotes: form.defaultInvoiceNotes || undefined,
      recurringEnabled:    form.recurringEnabled,
      recurringInterval:   form.recurringInterval,
      recurringAmount:     form.recurringAmount ? Number(form.recurringAmount) : undefined,
      recurringService:    form.recurringService || undefined,
      ...(leadId ? { leadId } : {}),
      createdAt: customer?.createdAt ?? new Date(),
      updatedAt: new Date(),
    }

    setIsSubmitting(true)
    try {
      const ok = mode === "add"
        ? await addCustomer(payload)
        : customer ? await updateCustomer(customer.id, payload) : false

      if (ok) {
        setIsDirty(false)
        onOpenChange(false)
        onSaved?.()
      } else {
        setError("Failed to save client. Please try again.")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save client.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 shadow-xl p-0">

        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {mode === "add" ? "Add New Client" : "Edit Client"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-0.5">
            {mode === "add"
              ? "Fill in the essential details. Advanced options can be configured after onboarding."
              : "Update client information."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

          {/* ── Essential Information ─────────────────────────────────── */}
          <Section title="Essential Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Name" required>
                <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Primary contact name" className={inputCls} autoFocus />
              </Field>
              <Field label="Company / Business Name">
                <Input value={form.company} onChange={(e) => set({ company: e.target.value })} placeholder="Company or business name" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" required error={phoneError}>
                <Input
                  type="tel" value={form.phone}
                  onChange={(e) => { set({ phone: e.target.value }); setPhoneError(null) }}
                  onBlur={handlePhoneBlur}
                  placeholder="+91 or international number"
                  className={`${inputCls} ${phoneError ? "border-red-300 focus:border-red-400" : ""}`}
                />
              </Field>
              <Field label="Business Type">
                <select className={selectCls} value={form.businessType} onChange={(e) => set({ businessType: e.target.value as BusinessType })}>
                  <option value="">Select type</option>
                  <option value="startup">Startup</option>
                  <option value="sme">SME</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="agency">Agency</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="ngo">NGO / Non-Profit</option>
                  <option value="individual">Individual / Freelancer</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Service / Project Type">
                <select className={selectCls} value={form.service} onChange={(e) => set({ service: e.target.value as TechService })}>
                  <option value="">Select service</option>
                  <option value="whatsapp-api">WhatsApp API Retainer</option>
                  <option value="web-development">Web Development</option>
                  <option value="crm-development">CRM Development</option>
                  <option value="app-development">App Development</option>
                  <option value="seo">SEO / Digital Marketing</option>
                  <option value="social-media">Social Media Management</option>
                  <option value="cloud-hosting">Cloud & Hosting</option>
                  <option value="it-support">IT Support</option>
                  <option value="other">Other</option>
                </select>
                {RETAINER_SERVICES.has(form.service) && mode === "add" && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">✓ Monthly retainer billing will be auto-enabled</p>
                )}
              </Field>
              <Field label="Status">
                <select className={selectCls} value={form.status} onChange={(e) => set({ status: e.target.value as Customer["status"] })}>
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            <Field label="Tags" hint="Press Enter or comma to add a tag">
              <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center px-3 py-1.5 rounded-xl border border-gray-200 bg-white focus-within:border-[#3A7AFE] cursor-text">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2 py-0.5 rounded-full">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900 ml-0.5" aria-label={`Remove tag ${tag}`}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <input
                  type="text" value={form.tagInput}
                  onChange={(e) => set({ tagInput: e.target.value })}
                  onKeyDown={handleTagKeyDown} onBlur={addTag}
                  placeholder={form.tags.length === 0 ? "e.g. vip, enterprise, priority…" : ""}
                  className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
                />
              </div>
            </Field>
          </Section>

          {/* ── Deal Details ──────────────────────────────────────────── */}
          <Section title="Deal Details">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Deal Value (₹)" hint="Value of this specific deal">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                  <Input
                    type="number" min="0"
                    value={form.dealValue}
                    onChange={(e) => set({ dealValue: e.target.value })}
                    placeholder="0"
                    className={`${inputCls} pl-7`}
                  />
                </div>
              </Field>
              <Field label="Closure Date" hint="Expected or actual deal closure date">
                <Input type="date" value={form.closureDate} onChange={(e) => set({ closureDate: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* ── Contact & Sales Details ───────────────────────────────── */}
          <CollapsibleSection title="Contact & Sales Details">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="business@example.com" className={inputCls} />
              </Field>
              <Field label="WhatsApp Number">
                <Input type="tel" value={form.whatsappNumber} onChange={(e) => set({ whatsappNumber: e.target.value })} placeholder="If different from phone" className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* ✅ NEW: Combobox — dropdown of CRM users + free-text fallback */}
              <Field label="Assigned User" hint="Pick a team member or type any name">
                <UserCombobox
                  value={form.assignedUser}
                  onChange={(v) => set({ assignedUser: v })}
                />
              </Field>
              <Field label="Lead Source">
                <select className={selectCls} value={form.source} onChange={(e) => set({ source: e.target.value })}>
                  <option value="">Select source</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="social-media">Social Media</option>
                  <option value="cold-outreach">Cold Outreach</option>
                  <option value="event">Event / Exhibition</option>
                  <option value="manual">Manual Entry</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Total Deal Value (₹)" hint="Overall relationship value">
                <Input type="number" min="0" value={form.totalValue} onChange={(e) => set({ totalValue: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Onboarding Date">
                <Input type="date" value={form.onboardingDate} onChange={(e) => set({ onboardingDate: e.target.value })} max={new Date().toISOString().split("T")[0]} className={inputCls} />
              </Field>
            </div>

            <Field label="Address">
              <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Street address" className={inputCls} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="City"     value={form.city}    onChange={(e) => set({ city: e.target.value })}    className={inputCls} />
              <Input placeholder="State"    value={form.state}   onChange={(e) => set({ state: e.target.value })}   className={inputCls} />
              <Input placeholder="PIN code" value={form.zipCode} onChange={(e) => set({ zipCode: e.target.value })} className={inputCls} />
            </div>
          </CollapsibleSection>

          {/* ── Notes ────────────────────────────────────────────────── */}
          <CollapsibleSection title="Notes">
            <Textarea
              rows={3} value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Project notes, requirements, or any additional context…"
              className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] resize-none text-sm"
            />
          </CollapsibleSection>

          {/* ── Invoice Defaults ──────────────────────────────────────── */}
          <CollapsibleSection title="Invoice Defaults">
            <div className="grid grid-cols-3 gap-4">
              <Field label="GST Rate (%)">
                <select className={selectCls} value={form.defaultTaxRate} onChange={(e) => set({ defaultTaxRate: e.target.value })}>
                  <option value="0">0% — Exempt</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18% — Standard</option>
                  <option value="28">28%</option>
                </select>
              </Field>
              <Field label="Payment Due (Days)">
                <Input type="number" min="0" value={form.defaultDueDays} onChange={(e) => set({ defaultDueDays: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Invoice Notes">
                <Input value={form.defaultInvoiceNotes} onChange={(e) => set({ defaultInvoiceNotes: e.target.value })} placeholder="e.g. Pay via bank transfer" className={inputCls} />
              </Field>
            </div>
          </CollapsibleSection>

          {/* ── Monthly Retainer / Recurring Billing ─────────────────── */}
          <CollapsibleSection title="Monthly Retainer / Recurring Billing" defaultOpen={form.recurringEnabled}>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-700">Enable Recurring Billing</p>
                <p className="text-xs text-gray-400 mt-0.5">Auto-generates invoices on a set schedule</p>
              </div>
              <Switch checked={form.recurringEnabled} onCheckedChange={(v) => set({ recurringEnabled: v })} />
            </div>

            {form.recurringEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <Field label="Billing Frequency">
                  <select className={selectCls} value={form.recurringInterval} onChange={(e) => set({ recurringInterval: e.target.value as FormState["recurringInterval"] })}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </Field>
                <Field label="Retainer Amount (₹)">
                  <Input type="number" min="0" value={form.recurringAmount} onChange={(e) => set({ recurringAmount: e.target.value })} placeholder="Monthly retainer fee" className={inputCls} />
                </Field>
                <Field label="Service / Plan Name">
                  <Input value={form.recurringService} onChange={(e) => set({ recurringService: e.target.value })} placeholder="e.g. WhatsApp API Monthly Plan" className={inputCls} />
                </Field>
                <Field label="Next Renewal Date">
                  <Input type="date" value={form.renewalDate} onChange={(e) => set({ renewalDate: e.target.value })} min={new Date().toISOString().split("T")[0]} className={inputCls} />
                </Field>
              </div>
            )}
          </CollapsibleSection>

          {/* ── Error banner ─────────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              <span className="shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-50">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting} className="rounded-xl border-gray-200 text-gray-600 text-sm font-medium px-5">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#3A7AFE] hover:bg-[#2563EB] text-white text-sm font-medium px-5 shadow-sm">
              {isSubmitting
                ? (mode === "add" ? "Adding…" : "Updating…")
                : (mode === "add" ? "Add Client" : "Update Client")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}