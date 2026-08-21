"use client";

import type React from "react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useCRM } from "@/contexts/crm-context";
import { useAuth } from "@/contexts/auth-context"; // 🔒 FIX — see note below
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LeadDialog }        from "./lead-dialog";
import { BulkUploadLeadsDialog } from "./bulk-upload-leads-dialog"; // 🆕 NEW
import { LeadDetailDialog }  from "./lead-detail-dialog";
import { ConvertLeadDialog } from "./convert-lead-dialog";
import { FollowUpDialog }    from "./follow-up-dialog";
import {
  Plus, Search, Phone, MessageSquare, Upload,
  MoreHorizontal, Edit, Trash2, Eye, UserCheck,
  Kanban, LayoutList, Bell, IndianRupee, AlertCircle,
  GripVertical, X, Users, TrendingUp,
  CheckCircle2, Clock, CalendarIcon, ArrowUpRight,
  Target, Filter, User, Briefcase, // 🆕 CHANGED — Briefcase for the new "By Sales Person" toggle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import type { Lead } from "@/types/crm";

const STAGES = [
  { value: "lead",        label: "Lead",        emoji: "🌱", color: "#64748B", bg: "bg-slate-50",  border: "border-slate-200", dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-600" },
  { value: "demo",        label: "Demo",        emoji: "🎯", color: "#3B82F6", bg: "bg-blue-50",   border: "border-blue-200",  dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
  { value: "proposal",    label: "Proposal",    emoji: "📄", color: "#8B5CF6", bg: "bg-violet-50", border: "border-violet-200",dot: "bg-violet-500", badge: "bg-violet-100 text-violet-700" },
  { value: "negotiation", label: "Negotiation", emoji: "🤝", color: "#F59E0B", bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-700" },
  { value: "won",         label: "Won",         emoji: "🎉", color: "#10B981", bg: "bg-green-50",  border: "border-green-200", dot: "bg-green-500",  badge: "bg-green-100 text-green-700" },
  { value: "lost",        label: "Lost",        emoji: "❌", color: "#EF4444", bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-400",    badge: "bg-red-100 text-red-600" },
] as const;

type StageValue = typeof STAGES[number]["value"];

const SERVICES: Record<string, string> = {
  website: "Website", whatsapp: "WhatsApp", lms: "LMS",
  crm: "CRM", "social-media": "Social Media", other: "Other",
};

const PRIORITIES = [
  { value: "high",   label: "High",   color: "bg-red-100 text-red-700",       dot: "bg-red-400" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  { value: "low",    label: "Low",    color: "bg-gray-100 text-gray-600",      dot: "bg-gray-300" },
] as const;

const TILE_GRADIENTS = {
  total:       ["#6D5DF6", "#8B7CF8"] as [string,string],
  won:         ["#1E5FE0", "#2E7BF6"] as [string,string],
  pipeline:    ["#0E8FD9", "#23B6E0"] as [string,string],
  expected:    ["#D97706", "#F59E0B"] as [string,string],
  followup:    ["#E11D48", "#F43F5E"] as [string,string],
  followup_ok: ["#0FA968", "#22C97E"] as [string,string],
};

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v > 0 ? `₹${v.toLocaleString("en-IN")}` : "—";

const fmtDate = (v: unknown) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const isOverdue = (d?: string | null) => {
  if (!d) return false;
  const t = new Date(); t.setHours(0,0,0,0);
  return new Date(d) < t;
};

const stageMeta  = (v: string) => STAGES.find(s => s.value === v) ?? STAGES[0];
const priMeta    = (v: string) => PRIORITIES.find(p => p.value === v) ?? PRIORITIES[1];
const getService = (l: Lead)   => SERVICES[(l as any).service ?? ""] ?? (l as any).service ?? "";
const getAmount  = (l: Lead)   => { const v = (l as any).totalAmount ?? (l as any).total_amount ?? l.estimatedValue ?? 0; return typeof v === "number" ? v : Number(v ?? 0); };
const getExpectedAmount = (l: Lead) => { const v = (l as any).expectedAmount ?? (l as any).expected_amount ?? 0; return typeof v === "number" ? v : Number(v ?? 0); };
const getFollowUp  = (l: Lead) => (l as any).follow_up_date as string | null | undefined;
const getUpdatedAt = (l: Lead): number => { const v = (l as any).updatedAt ?? (l as any).updated_at ?? (l as any).createdAt ?? (l as any).created_at; if (!v) return 0; const d = new Date(v); return isNaN(d.getTime()) ? 0 : d.getTime(); };

// 🆕 NEW — the sales owner is whoever created the lead (created_by /
// created_user_name), matching the backend's ownership/scoping model. This
// is intentionally NOT assignedTo — a lead can be assigned to one rep while
// having been created by another (or by admin), and "owner" for scoping
// purposes always means created_by.
const getOwnerId   = (l: Lead) => (l as any).createdBy ?? (l as any).created_by ?? null;
const getOwnerName = (l: Lead) => (l as any).created_user_name ?? (l as any).sales_owner_name ?? null;

// ✅ NEW — a lead counts as "converted" if either flag is present.
// isConverted comes from normalizeLead() (raw.is_converted), convertedCustomerId
// is set the moment the backend's POST /leads/:id/convert succeeds.
const isLeadConverted = (l: Lead) => !!((l as any).isConverted || (l as any).convertedCustomerId);

// ── count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef  = useRef(0);
  useEffect(() => {
    fromRef.current = value; startRef.current = null;
    let raf: number;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / durationMs, 1);
      const e = 1 - Math.pow(1 - t, 3);
      setValue(fromRef.current + (target - fromRef.current) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

// ── GradientTile — mirrors dashboard exactly ──────────────────────────────────
function GradientTile({ label, rawValue, displayValue, gradient, sub, icon: Icon }: {
  label: string; rawValue: number; displayValue?: string;
  gradient: [string,string]; sub?: string; icon: React.ElementType;
}) {
  const animated = useCountUp(rawValue);
  const display  = displayValue ?? Math.round(animated).toLocaleString("en-IN");
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-default select-none"
      style={{ background: `linear-gradient(135deg,${gradient[0]},${gradient[1]})` }}>
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
  );
}

// ── EditableAmount ────────────────────────────────────────────────────────────
function EditableAmount({ lead, onSave }: { lead: Lead; onSave: (val: number) => void }) {
  const [editing, setEditing] = useState(false);
  const amount = getAmount(lead);
  const [val, setVal] = useState(String(amount || ""));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { const n = Number(val); if (!isNaN(n) && n >= 0) onSave(n); setEditing(false); };
  if (editing) return (
    <div className="flex items-center gap-1">
      <span className="text-emerald-500 text-xs">₹</span>
      <input ref={ref} type="number" value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape") setEditing(false); }}
        className="w-24 h-7 text-sm border border-blue-400 rounded-lg px-2 outline-none focus:ring-1 focus:ring-blue-400" />
    </div>
  );
  return (
    <button onClick={() => { setVal(String(amount||"")); setEditing(true); }}
      className="flex items-center gap-0.5 text-sm font-semibold text-gray-800 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors group">
      {amount > 0 ? <><IndianRupee className="h-3 w-3 text-emerald-500 group-hover:text-blue-500" />{amount.toLocaleString("en-IN")}</> : <span className="text-gray-300 group-hover:text-blue-400 text-xs font-medium">+ Amount</span>}
    </button>
  );
}

// ── EditableExpectedAmount ────────────────────────────────────────────────────
function EditableExpectedAmount({ lead, onSave }: { lead: Lead; onSave: (val: number) => void }) {
  const [editing, setEditing] = useState(false);
  const amount = getExpectedAmount(lead);
  const [val, setVal] = useState(String(amount || ""));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { const n = Number(val); if (!isNaN(n) && n >= 0) onSave(n); setEditing(false); };
  if (editing) return (
    <div className="flex items-center gap-1">
      <span className="text-amber-500 text-xs">₹</span>
      <input ref={ref} type="number" value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape") setEditing(false); }}
        className="w-24 h-7 text-sm border border-amber-400 rounded-lg px-2 outline-none focus:ring-1 focus:ring-amber-400" />
    </div>
  );
  return (
    <button onClick={() => { setVal(String(amount||"")); setEditing(true); }}
      className="flex items-center gap-0.5 text-sm font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-lg transition-colors group">
      {amount > 0 ? <><IndianRupee className="h-3 w-3 text-amber-400 group-hover:text-amber-600" />{amount.toLocaleString("en-IN")}</> : <span className="text-gray-300 group-hover:text-amber-400 text-xs font-medium">+ Expected</span>}
    </button>
  );
}

// ── EditableFollowUp ──────────────────────────────────────────────────────────
function EditableFollowUp({ lead, onSave }: { lead: Lead; onSave: (date: Date|undefined) => void }) {
  const [open, setOpen] = useState(false);
  const fud = getFollowUp(lead);
  const od  = isOverdue(fud);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors",
          fud ? od ? "text-red-600 hover:bg-red-50" : "text-amber-600 hover:bg-amber-50" : "text-gray-300 hover:text-blue-500 hover:bg-blue-50")}>
          {fud ? <>{od ? <AlertCircle className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}{fmtDate(fud)}{od && " ⚠️"}</> : <><CalendarIcon className="h-3 w-3"/>+ Set date</>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={fud ? new Date(fud) : undefined} onSelect={d => { onSave(d); setOpen(false); }} initialFocus />
        {fud && <div className="p-2 border-t"><button onClick={() => { onSave(undefined); setOpen(false); }} className="w-full text-xs text-red-500 hover:text-red-700 py-1 rounded">Clear date</button></div>}
      </PopoverContent>
    </Popover>
  );
}

// ── EditablePriority ──────────────────────────────────────────────────────────
function EditablePriority({ lead, onSave }: { lead: Lead; onSave: (p: string) => void }) {
  const pm = priMeta(lead.priority as string);
  return (
    <Select value={lead.priority as string} onValueChange={onSave}>
      <SelectTrigger className={cn("h-7 text-xs border-0 rounded-full px-2.5 font-semibold focus:ring-0 w-auto min-w-[80px] cursor-pointer", pm.color)} style={{ boxShadow:"none" }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full", p.dot)}/>{p.label}</span></SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ── EditableOwner ─────────────────────────────────────────────────────────────
// 🆕 NEW — admin-only "Sales Owner" reassignment dropdown. Calls
// updateLead(id, { salesOwnerId }), which the backend maps onto the same
// created_by column that drives sales-rep scoping — so picking a new owner
// here is a real ownership transfer, not just a display label change.
function EditableOwner({ ownerId, ownerName, options, onSave }: {
  ownerId: string | null; ownerName?: string | null;
  options: { id: string; name: string }[];
  onSave: (id: string) => void;
}) {
  return (
    <Select value={ownerId ?? ""} onValueChange={onSave}>
      <SelectTrigger
        className={cn(
          "h-7 text-[11px] border rounded-lg px-2 font-semibold focus:ring-0 w-auto min-w-[92px] cursor-pointer whitespace-nowrap",
          ownerName ? "bg-teal-50 text-teal-700 border-teal-100" : "bg-white text-gray-300 border-gray-200"
        )}
        style={{ boxShadow: "none" }}
      >
        <User className="h-2.5 w-2.5 mr-1 shrink-0" />
        <SelectValue placeholder="Unassigned">{ownerName ?? "Unassigned"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-gray-400">No sales reps found</div>
        ) : (
          options.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)
        )}
      </SelectContent>
    </Select>
  );
}

// ── DateRangePicker ───────────────────────────────────────────────────────────
function DateRangePicker({ from, to, onFromChange, onToChange, onClear }: {
  from: Date|undefined; to: Date|undefined;
  onFromChange: (d: Date|undefined) => void;
  onToChange:   (d: Date|undefined) => void;
  onClear: () => void;
}) {
  const hasDate = !!(from || to);
  return (
    <div className={cn("flex items-center gap-1.5 rounded-xl border px-2.5 h-8 bg-white text-xs transition-all shrink-0",
      hasDate ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300")}>
      <CalendarIcon className={cn("h-3.5 w-3.5 shrink-0", hasDate ? "text-blue-500" : "text-gray-400")} />
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn("font-semibold transition-colors whitespace-nowrap", from ? "text-blue-700" : "text-gray-400 hover:text-gray-600")}>{from ? format(from,"d MMM") : "From"}</button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={from} onSelect={onFromChange} disabled={d => to ? d > to : false} initialFocus />
          {from && <div className="p-2 border-t"><button onClick={() => onFromChange(undefined)} className="w-full text-xs text-red-500 hover:text-red-700 py-1 rounded">Clear</button></div>}
        </PopoverContent>
      </Popover>
      <span className="text-gray-300 font-normal">→</span>
      <Popover>
        <PopoverTrigger asChild>
          <button className={cn("font-semibold transition-colors whitespace-nowrap", to ? "text-blue-700" : "text-gray-400 hover:text-gray-600")}>{to ? format(to,"d MMM") : "To"}</button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={to} onSelect={onToChange} disabled={d => from ? d < from : false} initialFocus />
          {to && <div className="p-2 border-t"><button onClick={() => onToChange(undefined)} className="w-full text-xs text-red-500 hover:text-red-700 py-1 rounded">Clear</button></div>}
        </PopoverContent>
      </Popover>
      {hasDate && <button onClick={onClear} className="ml-0.5 text-blue-400 hover:text-blue-600"><X className="h-3 w-3"/></button>}
    </div>
  );
}

// ── LeadCard (Kanban) ─────────────────────────────────────────────────────────
// 🆕 CHANGED — accepts optional ownerName (admin-only) to show who owns the lead
function LeadCard({ lead, onView, onEdit, onDelete, onCall, onWhatsApp, onFollowUp, onConvert, dragging, onDragStart, onDragEnd, ownerName }: {
  lead: Lead; onView:()=>void; onEdit:()=>void; onDelete:()=>void;
  onCall:()=>void; onWhatsApp:()=>void; onFollowUp:()=>void; onConvert:()=>void;
  dragging: boolean; onDragStart:(e:React.DragEvent)=>void; onDragEnd:()=>void;
  ownerName?: string | null;
}) {
  const pm = priMeta(lead.priority as string);
  const amount = getAmount(lead);
  const expectedAmount = getExpectedAmount(lead);
  const fud = getFollowUp(lead);
  const overdue = isOverdue(fud);
  const svc = getService(lead);
  const isWon = lead.status === "won";
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onDoubleClick={onView}
      className={cn("bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group",
        dragging ? "opacity-40 scale-95 border-blue-400" : "border-gray-100 hover:border-blue-200")}>
      <div className={cn("h-[3px] w-full rounded-t-2xl", pm.value==="high" ? "bg-red-400" : pm.value==="medium" ? "bg-yellow-400" : "bg-gray-200")} />
      <div className="p-3.5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <GripVertical className="h-3.5 w-3.5 text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ background:"linear-gradient(135deg,#2563EB,#3B82F6)" }}>
              <span className="text-sm font-bold text-white">{lead.name?.charAt(0)?.toUpperCase() ?? "?"}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{lead.name}</p>
              {(lead as any).company && <p className="text-xs text-gray-400 truncate">{(lead as any).company}</p>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 rounded-lg shrink-0"><MoreHorizontal className="h-3.5 w-3.5"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-44 text-sm">
              <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4"/>View</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onFollowUp}><Bell className="mr-2 h-4 w-4"/>Follow-up</DropdownMenuItem>
              {isWon && !(lead as any).isConverted && <DropdownMenuItem onClick={onConvert}><UserCheck className="mr-2 h-4 w-4"/>Convert</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {svc && <span className="inline-block text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg">{svc}</span>}
          {/* 🆕 NEW — Sales Owner tag (admin only, passed in via ownerName) */}
          {ownerName && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-lg">
              <User className="h-2.5 w-2.5" />{ownerName}
            </span>
          )}
        </div>
        {amount > 0 && <div className="flex items-center gap-1 text-sm font-bold text-gray-800"><IndianRupee className="h-3.5 w-3.5 text-emerald-500"/>{amount.toLocaleString("en-IN")}</div>}
        {expectedAmount > 0 && expectedAmount !== amount && (
          <div className="flex items-center gap-1 text-xs font-medium text-amber-600"><IndianRupee className="h-3 w-3 text-amber-400"/>{expectedAmount.toLocaleString("en-IN")}<span className="text-gray-400 font-normal">expected</span></div>
        )}
        {fud && (
          <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl font-medium", overdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700")}>
            {overdue ? <AlertCircle className="h-3 w-3"/> : <Clock className="h-3 w-3"/>}Follow-up: {fmtDate(fud)}{overdue && " · Overdue!"}
          </div>
        )}
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className="flex items-center gap-1">
            <button onClick={onCall} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Phone className="h-3.5 w-3.5"/></button>
            <button onClick={onWhatsApp} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"><MessageSquare className="h-3.5 w-3.5"/></button>
            <button onClick={onFollowUp} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"><Bell className="h-3.5 w-3.5"/></button>
          </div>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", pm.color)}>{pm.label}</span>
        </div>
      </div>
    </div>
  );
}

// ── LeadRow (Table + By-Sales-Person views) ───────────────────────────────────
// 🆕 NEW — extracted from the inline table-row JSX so the exact same row
// (with all its editable fields) can be reused inside the new "By Sales
// Person" grouped view, instead of duplicating this whole block a second
// time. showOwnerColumn controls whether the Sales Owner cell renders —
// it's redundant inside a per-owner group, so that view passes false.
function LeadRow({
  lead, gridCols, showOwnerColumn, ownerName, isRecent,
  onView, onEdit, onDelete, onCall, onWhatsApp, onFollowUp, onConvert,
  onChangeStage, onSaveAmount, onSaveExpected, onSavePriority, onSaveFollowUp,
  zebra,
  ownerId, assignableOwners, onSaveOwner, // 🆕 NEW
}: {
  lead: Lead; gridCols: string; showOwnerColumn: boolean; ownerName?: string | null;
  isRecent: boolean; zebra: boolean;
  onView: () => void; onEdit: () => void; onDelete: () => void;
  onCall: () => void; onWhatsApp: () => void; onFollowUp: () => void; onConvert: () => void;
  onChangeStage: (v: string) => void;
  onSaveAmount: (v: number) => void; onSaveExpected: (v: number) => void;
  onSavePriority: (v: string) => void; onSaveFollowUp: (d: Date | undefined) => void;
  ownerId?: string | null; // 🆕 NEW
  assignableOwners?: { id: string; name: string }[]; // 🆕 NEW
  onSaveOwner?: (id: string) => void; // 🆕 NEW
}) {
  const sm  = stageMeta(lead.status as string);
  const svc = getService(lead);
  return (
    <div onDoubleClick={onView}
      className={cn("grid gap-0 px-4 py-2.5 items-center transition-all duration-150 group relative hover:bg-blue-50/50",
        isRecent ? "bg-indigo-50/40" : zebra ? "bg-white" : "bg-gray-50/30")}
      style={{ gridTemplateColumns: gridCols }}>

      {/* Left accent */}
      <span className={cn("absolute left-0 top-0 h-full w-[4px] rounded-r transition-opacity duration-150",
        isRecent ? "bg-indigo-400 opacity-70" : "bg-blue-500 opacity-0 group-hover:opacity-100")}/>

      {/* Client */}
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background:"linear-gradient(135deg,#2563EB,#3B82F6)" }}>
          <span className="text-xs font-bold text-white">{lead.name?.charAt(0)?.toUpperCase() ?? "?"}</span>
          {isRecent && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-400 border-2 border-white"/>}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate leading-tight">{lead.name}</p>
          {(lead as any).company && <p className="text-xs text-gray-400 truncate">{(lead as any).company}</p>}
          {(lead as any).phone && (
            <button onClick={e => { e.stopPropagation(); onCall(); }}
              className="text-[10px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 font-medium mt-0.5">
              <Phone className="h-2.5 w-2.5"/>{(lead as any).phone}
            </button>
          )}
        </div>
      </div>

      {/* Service */}
      <div className="pr-2">
        {svc
          ? <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg whitespace-nowrap">{svc}</span>
          : <span className="text-gray-300 text-xs">—</span>}
      </div>

      {/* Sales Owner (admin only, and only when not already grouped by owner) */}
      {showOwnerColumn && (
        <div onClick={e => e.stopPropagation()} className="pr-2">
          {onSaveOwner ? (
            <EditableOwner
              ownerId={ownerId ?? null}
              ownerName={ownerName}
              options={assignableOwners ?? []}
              onSave={onSaveOwner}
            />
          ) : ownerName ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-lg whitespace-nowrap"><User className="h-2.5 w-2.5"/>{ownerName}</span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </div>
      )}

      {/* Stage */}
      <div onClick={e => e.stopPropagation()} className="pr-2">
        <Select value={lead.status as string} onValueChange={onChangeStage}>
          <SelectTrigger className={cn("h-7 text-xs border rounded-full px-2.5 w-auto min-w-[100px] font-semibold focus:ring-0", sm.badge, "border-transparent")} style={{ boxShadow:"none" }}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 mr-1.5 inline-block", sm.dot)}/>
            <SelectValue/>
          </SelectTrigger>
          <SelectContent>
            {STAGES.map(s => <SelectItem key={s.value} value={s.value}><span className="flex items-center gap-2"><span className={cn("w-2 h-2 rounded-full", s.dot)}/>{s.label}</span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Total */}
      <div onClick={e => e.stopPropagation()} className="pr-2">
        <EditableAmount lead={lead} onSave={onSaveAmount}/>
      </div>

      {/* Expected */}
      <div onClick={e => e.stopPropagation()} className="pr-2">
        <EditableExpectedAmount lead={lead} onSave={onSaveExpected}/>
      </div>

      {/* Priority */}
      <div onClick={e => e.stopPropagation()} className="pr-2">
        <EditablePriority lead={lead} onSave={onSavePriority}/>
      </div>

      {/* Follow-up */}
      <div onClick={e => e.stopPropagation()} className="pr-2">
        <EditableFollowUp lead={lead} onSave={onSaveFollowUp}/>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={onCall} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Phone className="h-3.5 w-3.5"/></button>
        <button onClick={onWhatsApp}   className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"><MessageSquare className="h-3.5 w-3.5"/></button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><MoreHorizontal className="h-3.5 w-3.5"/></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl w-40 text-sm">
            <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4"/>View</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onFollowUp}><Bell className="mr-2 h-4 w-4"/>Follow-up</DropdownMenuItem>
            {lead.status === "won" && !(lead as any).isConverted && (
              <DropdownMenuItem onClick={onConvert}><UserCheck className="mr-2 h-4 w-4"/>Convert</DropdownMenuItem>
            )}
            <DropdownMenuSeparator/>
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── OwnerGroupHeader (By Sales Person view) ───────────────────────────────────
// 🆕 NEW — per-rep summary strip shown above each rep's lead list.
function OwnerGroupHeader({ name, count, pipeline, expected, overdue }: {
  name: string; count: number; pipeline: number; expected: number; overdue: number;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
      style={{ background: "linear-gradient(90deg, rgba(15,118,110,0.06), rgba(8,145,178,0.03))" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg,#0f766e,#0891b2)" }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
          <p className="text-[11px] text-gray-400 font-medium">{count} lead{count !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Pipeline</p>
          <p className="text-sm font-bold text-gray-800">{fmt(pipeline)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Expected</p>
          <p className="text-sm font-bold text-amber-600">{fmt(expected)}</p>
        </div>
        {overdue > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full whitespace-nowrap">
            <AlertCircle className="h-3 w-3"/>{overdue} overdue
          </span>
        )}
      </div>
    </div>
  );
}

export function LeadsContent() {
  // 🔒 FIX — was reading currentUser from useCRM(), which is never
  // populated anywhere in crm-context.tsx (setCurrentUser is exposed but
  // nothing calls it), so it silently stayed null forever and every
  // admin-only UI gated on it never showed for anyone, including real
  // admins. Switched to useAuth(), the same source your sidebar's
  // "ADMIN" section and UsersPage.tsx already rely on.
  const { leads, deleteLead, updateLead, users } = useCRM();
  const { isAdmin } = useAuth();

  const [view,            setView]            = useState<"kanban"|"table"|"owners">("table"); // 🆕 CHANGED — added "owners"
  const [search,          setSearch]          = useState("");
  const [stageFilter,     setStageFilter]     = useState("all");
  const [serviceFilter,   setServiceFilter]   = useState("all");
  const [priorityFilter,  setPriorityFilter]  = useState("all");
  const [ownerFilter,     setOwnerFilter]     = useState("all"); // 🆕 NEW — admin-only "sales person" filter
  const [dateFrom,        setDateFrom]        = useState<Date|undefined>(undefined);
  const [dateTo,          setDateTo]          = useState<Date|undefined>(undefined);
  const [recentlyTouched, setRecentlyTouched] = useState<Set<string>>(new Set());

  const [selected,     setSelected]     = useState<Lead|null>(null);
  const [addOpen,      setAddOpen]      = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false); // 🆕 NEW
  const [editOpen,     setEditOpen]     = useState(false);
  const [detailOpen,   setDetailOpen]   = useState(false);
  const [convertOpen,  setConvertOpen]  = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [draggingId,   setDraggingId]   = useState<string|null>(null);
  const [dropTarget,   setDropTarget]   = useState<string|null>(null);

  const touchLead = useCallback((id: string) => {
    setRecentlyTouched(prev => new Set([id, ...prev]));
  }, []);

  const inDateRange = useCallback((lead: Lead) => {
    if (!dateFrom && !dateTo) return true;
    const raw = (lead as any).createdAt ?? (lead as any).created_at;
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    if (dateFrom && d < startOfDay(dateFrom)) return false;
    if (dateTo   && d > endOfDay(dateTo))     return false;
    return true;
  }, [dateFrom, dateTo]);

  // 🆕 NEW — distinct sales owners derived from the currently-loaded leads
  // (admin already sees every non-demo lead, so this naturally covers every
  // rep who has at least one lead). Built from the full `leads` array, not
  // the filtered subset, so picking a rep doesn't shrink the dropdown itself.
  const salesOwners = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, string>();
    for (const l of leads) {
      const id   = getOwnerId(l);
      const name = getOwnerName(l);
      if (id && name && !map.has(String(id))) map.set(String(id), name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [leads, isAdmin]);

  // 🆕 NEW — everyone a lead can be reassigned TO. Deliberately broader
  // than `salesOwners` above (which only lists reps who already have a
  // lead) — this comes from the full active user list so admin can hand a
  // lead to a rep with zero leads so far. Demo ("user"-role) accounts are
  // excluded — assigning a real lead into a demo sandbox would hide it
  // from every real admin/sales login (see demoScope.js / leads.js guard).
  const assignableOwners = useMemo(() => {
    if (!isAdmin) return [];
    return users
      .filter(u => u.role !== "user")
      .map(u => ({ id: String(u.id), name: u.name }));
  }, [users, isAdmin]);

  const saveOwner = useCallback(async (id: string, ownerId: string) => {
    await updateLead(id, { salesOwnerId: ownerId } as any);
    touchLead(id);
  }, [updateLead, touchLead]);

  // ✅ NEW — pulled out of the old `filtered` useMemo so the Won KPI can
  // reuse the exact same search/stage/service/priority/date predicate
  // without also reusing the "hide converted leads" rule.
  const matchesFilters = useCallback((l: Lead) => {
    const q = search.trim().toLowerCase();
    if (q && !l.name?.toLowerCase().includes(q) && !(l as any).company?.toLowerCase().includes(q)) return false;
    if (stageFilter    !== "all" && l.status !== stageFilter)             return false;
    if (serviceFilter  !== "all" && (l as any).service !== serviceFilter) return false;
    if (priorityFilter !== "all" && l.priority !== priorityFilter)        return false;
    // 🆕 NEW — admin-only sales-owner filter
    if (isAdmin && ownerFilter !== "all" && String(getOwnerId(l)) !== ownerFilter) return false;
    if (!inDateRange(l))                                                  return false;
    return true;
  }, [search, stageFilter, serviceFilter, priorityFilter, ownerFilter, isAdmin, inDateRange]);

  // ✅ CHANGED — converted leads are excluded from every visible surface
  // (table rows + kanban columns, since `grouped` below is derived from this).
  const filtered = useMemo(() => {
    const base = leads.filter(l => !isLeadConverted(l) && matchesFilters(l));
    return [...base].sort((a,b) => {
      const aT = recentlyTouched.has(a.id) ? 1 : 0;
      const bT = recentlyTouched.has(b.id) ? 1 : 0;
      if (bT !== aT) return bT - aT;
      return getUpdatedAt(b) - getUpdatedAt(a);
    });
  }, [leads, matchesFilters, recentlyTouched]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STAGES.map(s => [s.value, [] as Lead[]]));
    filtered.forEach(l => { if (map[l.status as string]) map[l.status as string].push(l); });
    return map as Record<StageValue, Lead[]>;
  }, [filtered]);

  // 🆕 NEW — leads grouped by sales owner for the "By Sales Person" view.
  // Built from `filtered`, so it already respects search/stage/service/
  // priority/date AND the owner dropdown — picking one rep there collapses
  // this to a single group, which is a reasonable way to "drill into" one
  // person from the same control. Sorted alphabetically for a stable order
  // (leaderboard-style sorting by lead count felt like it belonged on the
  // Reports page, not here).
  const groupedByOwner = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, { id: string; name: string; leads: Lead[] }>();
    filtered.forEach(l => {
      const id   = String(getOwnerId(l) ?? "unassigned");
      const name = getOwnerName(l) ?? "Unassigned";
      if (!map.has(id)) map.set(id, { id, name, leads: [] });
      map.get(id)!.leads.push(l);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, isAdmin]);

  // ✅ CHANGED — `won` now comes from the full `leads` array (still respecting
  // search/stage/service/priority/date filters via matchesFilters), so
  // converting a lead and having it disappear from `filtered` no longer
  // decrements this count. Every other stat still reflects only what's
  // currently visible in the table/kanban.
  const stats = useMemo(() => ({
    total:    filtered.length,
    won:      leads.filter(l => l.status === "won" && matchesFilters(l)).length,
    pipeline: filtered.reduce((s,l) => s + getAmount(l), 0),
    expected: filtered.reduce((s,l) => s + getExpectedAmount(l), 0),
    overdueFollowUps: filtered.filter(l => isOverdue(getFollowUp(l)) && !["won","lost"].includes(l.status as string)).length,
  }), [filtered, leads, matchesFilters]);

  const open = (l: Lead) => { setSelected(l); setDetailOpen(true); };
  const edit = (l: Lead) => { setSelected(l); setEditOpen(true); };
  const del  = (id: string) => { if (window.confirm("Delete this lead?")) void deleteLead(id); };
  const call = (l: Lead) => { if ((l as any).phone) window.open(`tel:${(l as any).phone}`); };
  const wa   = (l: Lead) => { const n = l.whatsappNumber || (l as any).phone; if (n) window.open(`https://wa.me/${n}?text=${encodeURIComponent("Hi, following up on your Vasifytech enquiry.")}`, "_blank"); };
  const fu   = (l: Lead) => { setSelected(l); setFollowUpOpen(true); };
  const conv = (l: Lead) => { setSelected(l); setConvertOpen(true); };

  const saveAmount         = useCallback(async (id:string, amount:number)   => { await updateLead(id, { totalAmount: amount, estimatedValue: amount } as any); touchLead(id); }, [updateLead, touchLead]);
  const saveExpectedAmount = useCallback(async (id:string, amount:number)   => { await updateLead(id, { expectedAmount: amount } as any); touchLead(id); }, [updateLead, touchLead]);
  const saveFollowUp       = useCallback(async (id:string, date:Date|undefined) => { await updateLead(id, { followUpDate: date ? date.toISOString().split("T")[0] : null } as any); touchLead(id); }, [updateLead, touchLead]);
  const savePriority       = useCallback(async (id:string, priority:string) => { await updateLead(id, { priority: priority as Lead["priority"] }); touchLead(id); }, [updateLead, touchLead]);
  const changeStage        = useCallback(async (id:string, stage:string)    => { await updateLead(id, { status: stage as Lead["status"], pipelineStage: stage } as any); touchLead(id); }, [updateLead, touchLead]);

  const onDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("leadId");
    setDraggingId(null); setDropTarget(null);
    if (id) await changeStage(id, stage);
  };

  // 🆕 CHANGED — ownerFilter counted alongside the other active filters
  const activeFilters = [stageFilter!=="all", serviceFilter!=="all", priorityFilter!=="all", isAdmin && ownerFilter!=="all", !!(dateFrom||dateTo)].filter(Boolean).length;
  const clearFilters  = () => { setStageFilter("all"); setServiceFilter("all"); setPriorityFilter("all"); setOwnerFilter("all"); setSearch(""); setDateFrom(undefined); setDateTo(undefined); };

  // 🆕 NEW — table grid columns, with an extra column inserted for admin
  const gridCols = isAdmin
    ? "1.7fr 1fr 1fr 1.1fr 1fr 1fr 1fr 1fr 90px"
    : "2fr 1fr 1.1fr 1fr 1fr 1fr 1fr 90px";
  // 🆕 NEW — used inside each By Sales Person group, where the owner column
  // would just repeat the group header's name on every row
  const gridColsNoOwner = "2fr 1fr 1.1fr 1fr 1fr 1fr 1fr 90px";

  return (
    <div className="flex flex-col h-full" style={{ background: "#F4F6FB" }}>

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 pt-4 pb-0 sticky top-0 z-20"
        style={{ boxShadow: "0 1px 6px 0 rgba(0,0,0,0.06)" }}>

        {/* Row 1 */}
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-gray-900 leading-tight tracking-tight">Leads Pipeline</h1>
              {activeFilters > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white leading-none">
                  <Filter className="h-2.5 w-2.5"/>{activeFilters}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {activeFilters > 0
                ? <><span className="text-blue-600 font-bold">{filtered.length}</span> of {leads.length} leads</>
                : <>{leads.length} total leads</>}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
              <button onClick={() => setView("kanban")}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all",
                  view==="kanban" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                <Kanban className="h-3.5 w-3.5"/> Board
              </button>
              <button onClick={() => setView("table")}
                className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all",
                  view==="table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                <LayoutList className="h-3.5 w-3.5"/> List
              </button>
              {/* 🆕 NEW — admin-only third view, grouped by sales owner */}
              {isAdmin && (
                <button onClick={() => setView("owners")}
                  className={cn("flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all",
                    view==="owners" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                  <Briefcase className="h-3.5 w-3.5"/> By Sales Person
                </button>
              )}
            </div>
            <Button onClick={() => setBulkUploadOpen(true)} variant="outline"
              className="rounded-xl h-8 px-3 text-xs font-semibold flex items-center gap-1.5 border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm">
              <Upload className="h-3.5 w-3.5"/> Bulk Upload
            </Button>
            <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 px-3 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Plus className="h-3.5 w-3.5"/> Add Lead
            </Button>
          </div>
        </div>

        {/* Row 2 — filters */}
        <div className="flex items-center gap-2 pb-3 flex-wrap">
          <div className="relative min-w-[140px] max-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"/>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
              className="pl-8 h-8 rounded-xl border-gray-200 text-sm bg-white focus-visible:ring-1 focus-visible:ring-blue-400"/>
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-3 w-3"/></button>}
          </div>

          <DateRangePicker from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo}
            onClear={() => { setDateFrom(undefined); setDateTo(undefined); }}/>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className={cn("h-8 w-28 rounded-xl text-xs border bg-white shrink-0",
              stageFilter!=="all" ? "border-blue-400 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200")}>
              <SelectValue placeholder="All Stages"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.emoji} {s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className={cn("h-8 w-28 rounded-xl text-xs border bg-white shrink-0",
              serviceFilter!=="all" ? "border-blue-400 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200")}>
              <SelectValue placeholder="All Services"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {Object.entries(SERVICES).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className={cn("h-8 w-24 rounded-xl text-xs border bg-white shrink-0",
              priorityFilter!=="all" ? "border-blue-400 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200")}>
              <SelectValue placeholder="Priority"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* 🆕 NEW — admin-only Sales Owner filter */}
          {isAdmin && salesOwners.length > 0 && (
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className={cn("h-8 w-32 rounded-xl text-xs border bg-white shrink-0",
                ownerFilter!=="all" ? "border-teal-400 bg-teal-50 text-teal-700 font-semibold" : "border-gray-200")}>
                <User className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue placeholder="Sales Owner"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sales Reps</SelectItem>
                {salesOwners.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {activeFilters > 0 && (
            <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
              <X className="h-3 w-3"/>Clear{activeFilters > 1 ? ` (${activeFilters})` : ""}
            </button>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-5 space-y-4">

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <GradientTile label="Total Leads"    rawValue={stats.total}    gradient={TILE_GRADIENTS.total}    sub={activeFilters > 0 ? `of ${leads.length} total` : "all leads"} icon={Users}/>
          <GradientTile label="Won Deals"      rawValue={stats.won}      gradient={TILE_GRADIENTS.won}      sub="closed"               icon={CheckCircle2}/>
          <GradientTile label="Pipeline Value" rawValue={stats.pipeline} displayValue={fmt(stats.pipeline)} gradient={TILE_GRADIENTS.pipeline} sub="total amount"    icon={TrendingUp}/>
          <GradientTile label="Expected Value" rawValue={stats.expected} displayValue={fmt(stats.expected)} gradient={TILE_GRADIENTS.expected} sub="what you'll collect" icon={Target}/>
          <GradientTile
            label={stats.overdueFollowUps > 0 ? "Follow-ups Due" : "Follow-ups"}
            rawValue={stats.overdueFollowUps}
            gradient={stats.overdueFollowUps > 0 ? TILE_GRADIENTS.followup : TILE_GRADIENTS.followup_ok}
            sub={stats.overdueFollowUps > 0 ? "needs attention" : "all clear ✓"}
            icon={Bell}
          />
        </div>

        {/* ── Kanban ────────────────────────────────────────────────── */}
        {view === "kanban" && (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {STAGES.map(stage => {
                const colLeads = grouped[stage.value] ?? [];
                const colValue = colLeads.reduce((s,l) => s + getAmount(l), 0);
                const isTarget = dropTarget === stage.value && draggingId !== null;
                return (
                  <div key={stage.value}
                    onDragOver={e => { e.preventDefault(); setDropTarget(stage.value); }}
                    onDrop={e => onDrop(e, stage.value)}
                    onDragLeave={() => setDropTarget(null)}
                    className={cn("w-64 flex flex-col rounded-2xl bg-white overflow-hidden transition-all shrink-0 shadow-sm border border-gray-100",
                      isTarget && "ring-2 ring-blue-400 ring-offset-1 shadow-lg scale-[1.01]")}>
                    {/* Coloured top stripe per column */}
                    <div className="h-[3px] w-full" style={{ background: stage.color }}/>
                    <div className={cn("px-3.5 py-3 flex items-center justify-between", stage.bg)}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{stage.emoji}</span>
                        <span className="font-bold text-sm text-gray-800">{stage.label}</span>
                      </div>
                      <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", stage.badge)}>{colLeads.length}</span>
                    </div>
                    {colValue > 0 && (
                      <div className="px-3.5 py-1.5 text-[11px] font-semibold text-gray-500 border-b border-gray-100 flex items-center gap-1">
                        <IndianRupee className="h-3 w-3"/>{fmt(colValue)} total
                      </div>
                    )}
                    <div className={cn("p-2.5 flex-1 space-y-2 overflow-y-auto max-h-[62vh] transition-colors", isTarget && "bg-blue-50/30")}>
                      {colLeads.length === 0 ? (
                        <div className={cn("flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed text-gray-300 transition-colors",
                          isTarget ? "border-blue-300 bg-blue-50/20 text-blue-400" : "border-gray-100")}>
                          <Users className="h-6 w-6 mb-1 opacity-40"/>
                          <p className="text-xs font-medium">{isTarget ? "Drop here" : "No leads"}</p>
                        </div>
                      ) : colLeads.map(lead => (
                        <LeadCard key={lead.id} lead={lead}
                          onView={() => open(lead)}
                          onEdit={() => { touchLead(lead.id); edit(lead); }}
                          onDelete={() => del(lead.id)}
                          onCall={() => call(lead)}
                          onWhatsApp={() => wa(lead)}
                          onFollowUp={() => fu(lead)}
                          onConvert={() => conv(lead)}
                          dragging={draggingId === lead.id}
                          onDragStart={e => { setDraggingId(lead.id); e.dataTransfer.setData("leadId", lead.id); e.dataTransfer.effectAllowed = "move"; }}
                          onDragEnd={() => { setDraggingId(null); setDropTarget(null); }}
                          ownerName={isAdmin ? getOwnerName(lead) : null}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────── */}
        {view === "table" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header — distinct bg + thicker border */}
            <div className="grid gap-0 px-4 py-3 border-b-2 border-gray-200 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest"
              style={{ gridTemplateColumns: gridCols, background:"#F1F4F8" }}>
              <div className="pl-11">Client</div>
              <div>Service</div>
              {isAdmin && <div>Sales Owner</div>}
              <div>Stage</div>
              <div>Total Amt</div>
              <div>Expected</div>
              <div>Priority</div>
              <div>Follow-up</div>
              <div/>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <Users className="h-10 w-10 mb-3 opacity-30"/>
                <p className="text-sm font-semibold text-gray-400">
                  {search || activeFilters > 0 ? "No leads match your filters." : "No leads yet. Add your first one!"}
                </p>
                {(search || activeFilters > 0)
                  ? <button onClick={clearFilters} className="mt-3 text-xs text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-1"><X className="h-3.5 w-3.5"/>Clear filters</button>
                  : <Button onClick={() => setAddOpen(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-8 px-4 text-xs font-semibold flex items-center gap-1.5 shadow-sm"><Plus className="h-3.5 w-3.5"/> Add your first lead</Button>
                }
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((lead, idx) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    gridCols={gridCols}
                    showOwnerColumn={isAdmin}
                    ownerName={isAdmin ? getOwnerName(lead) : null}
                    ownerId={isAdmin ? getOwnerId(lead) : null}
                    assignableOwners={isAdmin ? assignableOwners : undefined}
                    onSaveOwner={isAdmin ? (val => saveOwner(lead.id, val)) : undefined}
                    isRecent={recentlyTouched.has(lead.id)}
                    zebra={idx % 2 === 0}
                    onView={() => open(lead)}
                    onEdit={() => { touchLead(lead.id); edit(lead); }}
                    onDelete={() => del(lead.id)}
                    onCall={() => call(lead)}
                    onWhatsApp={() => wa(lead)}
                    onFollowUp={() => { touchLead(lead.id); fu(lead); }}
                    onConvert={() => { touchLead(lead.id); conv(lead); }}
                    onChangeStage={v => changeStage(lead.id, v)}
                    onSaveAmount={val => saveAmount(lead.id, val)}
                    onSaveExpected={val => saveExpectedAmount(lead.id, val)}
                    onSavePriority={p => savePriority(lead.id, p)}
                    onSaveFollowUp={d => saveFollowUp(lead.id, d)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── By Sales Person (admin only) ─────────────────────────────── */}
        {/* 🆕 NEW — same underlying `filtered` leads as List view, just
            grouped into one card per sales rep instead of one flat table.
            Each group reuses LeadRow with showOwnerColumn=false, since the
            owner is already obvious from which group it's in. */}
        {view === "owners" && isAdmin && (
          <div className="space-y-4">
            {groupedByOwner.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-300">
                <Briefcase className="h-10 w-10 mb-3 opacity-30"/>
                <p className="text-sm font-semibold text-gray-400">
                  {search || activeFilters > 0 ? "No leads match your filters." : "No leads yet."}
                </p>
              </div>
            ) : (
              groupedByOwner.map(group => {
                const pipeline = group.leads.reduce((s, l) => s + getAmount(l), 0);
                const expected = group.leads.reduce((s, l) => s + getExpectedAmount(l), 0);
                const overdue  = group.leads.filter(l => isOverdue(getFollowUp(l)) && !["won","lost"].includes(l.status as string)).length;
                return (
                  <div key={group.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <OwnerGroupHeader name={group.name} count={group.leads.length} pipeline={pipeline} expected={expected} overdue={overdue} />
                    <div className="grid gap-0 px-4 py-2.5 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest"
                      style={{ gridTemplateColumns: gridColsNoOwner, background:"#FAFBFD" }}>
                      <div className="pl-11">Client</div>
                      <div>Service</div>
                      <div>Stage</div>
                      <div>Total Amt</div>
                      <div>Expected</div>
                      <div>Priority</div>
                      <div>Follow-up</div>
                      <div/>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {group.leads.map((lead, idx) => (
                        <LeadRow
                          key={lead.id}
                          lead={lead}
                          gridCols={gridColsNoOwner}
                          showOwnerColumn={false}
                          isRecent={recentlyTouched.has(lead.id)}
                          zebra={idx % 2 === 0}
                          onView={() => open(lead)}
                          onEdit={() => { touchLead(lead.id); edit(lead); }}
                          onDelete={() => del(lead.id)}
                          onCall={() => call(lead)}
                          onWhatsApp={() => wa(lead)}
                          onFollowUp={() => { touchLead(lead.id); fu(lead); }}
                          onConvert={() => { touchLead(lead.id); conv(lead); }}
                          onChangeStage={v => changeStage(lead.id, v)}
                          onSaveAmount={val => saveAmount(lead.id, val)}
                          onSaveExpected={val => saveExpectedAmount(lead.id, val)}
                          onSavePriority={p => savePriority(lead.id, p)}
                          onSaveFollowUp={d => saveFollowUp(lead.id, d)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <LeadDialog open={addOpen}  onOpenChange={setAddOpen}  lead={null}     mode="add"/>
      <BulkUploadLeadsDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}/>
      <LeadDialog open={editOpen} onOpenChange={o => { setEditOpen(o); if (!o && selected) touchLead(selected.id); }} lead={selected} mode="edit"/>
      <LeadDetailDialog open={detailOpen} onOpenChange={setDetailOpen} lead={selected}
        onCallLead={call}
        onEmailLead={l => { if (l.email) window.location.href = `mailto:${l.email}`; }}
        onWhatsAppLead={wa}
        onConvertLead={l => { setDetailOpen(false); touchLead(l.id); conv(l); }}
        onOpenFollowUp={l => { setDetailOpen(false); touchLead(l.id); fu(l); }}
      />
      <ConvertLeadDialog open={convertOpen} onOpenChange={o => { setConvertOpen(o); if (!o && selected) touchLead(selected.id); }} lead={selected} onSuccess={() => setSelected(null)}/>
      <FollowUpDialog    open={followUpOpen} onOpenChange={o => { setFollowUpOpen(o); if (!o && selected) touchLead(selected.id); }} lead={selected}/>
    </div>
  );
}