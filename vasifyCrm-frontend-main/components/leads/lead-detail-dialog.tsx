"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useCRM } from "@/contexts/crm-context";
import { useAuth } from "@/contexts/auth-context"; // 🔒 FIX — see note at usage below
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Phone,
  Mail,
  MessageSquare,
  Clock,
  Bell,
  CheckCircle2,
  IndianRupee,
  Briefcase,
  CalendarIcon,
  X,
  Heart,
  Settings,
  FileText,
  History,
  TrendingUp,
  AlertCircle,
  Globe,
  Activity,
  User,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/crm";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { value: "lead",            label: "Lead",            color: "#64748b" },
  { value: "free-inspection", label: "Free Inspection", color: "#06b6d4" },
  { value: "demo",            label: "Demo",            color: "#3b82f6" },
  { value: "proposal",        label: "Proposal",        color: "#8b5cf6" },
  { value: "negotiation",     label: "Negotiation",     color: "#f59e0b" },
  { value: "won",             label: "Won",             color: "#10b981" },
  { value: "lost",            label: "Lost",            color: "#ef4444" },
] as const;

const VASIFY_SERVICES: Record<string, string> = {
  website:        "Website Development",
  whatsapp:       "WhatsApp Automation",
  lms:            "LMS (Learning Management System)",
  crm:            "CRM Development",
  "social-media": "Social Media",
  other:          "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  website:       "Website",
  whatsapp:      "WhatsApp",
  referral:      "Referral",
  manual:        "Manual",
  "social-media":"Social Media",
  other:         "Other",
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  upi:           "UPI",
  bank:          "Bank Transfer",
  bank_transfer: "Bank Transfer",
  cash:          "Cash",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (v: unknown) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (v: unknown) => {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtCurrency = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (isNaN(n) || n === 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
};

const isOverdue = (d?: string | null) => {
  if (!d) return false;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return new Date(d) < t;
};

const stageMeta = (v: string) =>
  PIPELINE_STAGES.find((s) => s.value === v) ?? PIPELINE_STAGES[0];

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadDetailDialogProps {
  open:             boolean;
  onOpenChange:     (open: boolean) => void;
  lead:             Lead | null;
  onCallLead?:      (lead: Lead) => void;
  onEmailLead?:     (lead: Lead) => void;
  onWhatsAppLead?:  (lead: Lead) => void;
  onCreateDeal?:    (lead: Lead) => void;
  onConvertLead?:   (lead: Lead) => void;
  onOpenSalesForm?: (lead: Lead) => void;
  onOpenFollowUp?:  (lead: Lead) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  icon, title, children, className,
}: {
  icon?: React.ReactNode; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl overflow-hidden border border-gray-100 shadow-sm", className)}>
      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#1e293b]">
        {icon && <span className="text-gray-400">{icon}</span>}
        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{title}</h3>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

function Field({
  label, value, icon, accent, className,
}: {
  label: string; value?: React.ReactNode; icon?: React.ReactNode; accent?: string; className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
        {icon && <span className={cn("opacity-70", accent)}>{icon}</span>}
        {label}
      </span>
      <span className={cn("text-sm font-semibold text-gray-800 leading-snug", accent)}>
        {value ?? <span className="text-gray-300">—</span>}
      </span>
    </div>
  );
}

function Tab({
  active, onClick, icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all",
        active ? "border-teal-500 text-teal-600" : "border-transparent text-gray-400 hover:text-gray-600"
      )}
    >
      <span className={active ? "text-teal-500" : "text-gray-400"}>{icon}</span>
      {label}
    </button>
  );
}

function StatusPill({ done, label, sublabel }: { done: boolean; label: string; sublabel: string }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors",
      done ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
    )}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
        done ? "bg-green-500" : "bg-gray-100 border-2 border-gray-300"
      )}>
        {done && <CheckCircle2 className="h-4 w-4 text-white" />}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className={cn("text-sm font-bold", done ? "text-green-600" : "text-gray-500")}>{sublabel}</p>
      </div>
    </div>
  );
}

function MetricRow({
  icon, label, value, accent,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0 text-cyan-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className={cn("text-sm font-bold text-gray-800", accent)}>{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeadDetailDialog({
  open, onOpenChange, lead,
  onCallLead, onEmailLead, onWhatsAppLead,
  onCreateDeal, onConvertLead, onOpenSalesForm, onOpenFollowUp,
}: LeadDetailDialogProps) {
  const { updateLead, users } = useCRM();
  // 🔒 FIX — same bug as leads-content.tsx: useCRM().currentUser is never
  // populated (nothing calls setCurrentUser in crm-context.tsx), so the
  // Sales Owner field below was gated on something permanently null and
  // never showed for anyone, including real admins. useAuth() is the
  // working source of truth used elsewhere in the app.
  const { isAdmin } = useAuth();

  const [activeTab,    setActiveTab]    = useState<"info" | "qualification" | "salesform" | "followups">("info");
  const [stage,        setStage]        = useState("lead");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpNote, setFollowUpNote] = useState("");
  const [savingFU,     setSavingFU]     = useState(false);

  useEffect(() => {
    if (lead) {
      setStage((lead.status as string) ?? "lead");
      setFollowUpDate(
        (lead as any).follow_up_date ? new Date((lead as any).follow_up_date) : undefined
      );
      setFollowUpNote((lead as any).follow_up_notes ?? "");
      setActiveTab("info");
    }
  }, [lead]);

  if (!lead) return null;

  const sm           = stageMeta(stage);
  const serviceLabel = VASIFY_SERVICES[(lead as any).service ?? ""] ?? (lead as any).service ?? "—";
  const sourceLabel  = SOURCE_LABELS[(lead as any).source ?? ""] ?? (lead as any).source ?? "—";
  const fud          = (lead as any).follow_up_date as string | null | undefined;
  const overdueFollowUp = isOverdue(fud);

  const totalAmount    = Number(lead.estimatedValue ?? (lead as any).totalAmount ?? (lead as any).total_amount ?? 0);
  const amountReceived = Number((lead as any).amountReceived ?? (lead as any).amount_received ?? 0);
  // ── NEW: read expectedAmount from both camelCase and snake_case ──
  const expectedAmount = Number((lead as any).expectedAmount ?? (lead as any).expected_amount ?? 0);
  const balance        = totalAmount - amountReceived;

  const paymentStatus =
    amountReceived === 0    ? "Pending"
    : amountReceived >= totalAmount ? "Paid"
    : "Partial";

  const paymentHistory: any[]  = (lead as any).paymentHistory  ?? (lead as any).payment_history  ?? [];
  const followUpHistory: any[] = (lead as any).followUpHistory ?? (lead as any).follow_up_history ?? [];

  const qualificationDone = !!(lead as any).qualificationComplete;
  const salesFormDone     = !!(lead as any).salesFormComplete;
  const canConvert        = stage === "won" && !lead.isConverted;

  const getUserName = (id?: string | number) => {
    if (!id) return "Unassigned";
    return users.find((u) => String(u.id) === String(id))?.name ?? "Unknown";
  };

  const handleStageChange = async (v: string) => {
    setStage(v);
    await updateLead(lead.id, { status: v as Lead["status"] });
  };

  const handleSaveFollowUp = async () => {
    if (!followUpDate) return;
    setSavingFU(true);
    try {
      await updateLead(lead.id, {
        followUpDate:  followUpDate.toISOString().slice(0, 10),
        followUpNotes: followUpNote || undefined,
      } as any);
    } finally {
      setSavingFU(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-screen h-screen max-w-none max-h-none
          sm:w-[calc(100vw-2rem)] sm:h-[92vh] sm:max-w-4xl sm:rounded-2xl
          overflow-hidden flex flex-col
          border-0 shadow-2xl rounded-none
          p-0 gap-0
          [&>button]:hidden
        "
      >

        {/* ── Teal Gradient Header ─────────────────────────────────────── */}
        <div
          className="relative shrink-0 px-6 pt-6 pb-5"
          style={{ background: "linear-gradient(135deg, #0f766e 0%, #0891b2 55%, #06b6d4 100%)" }}
        >
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
              <span className="text-2xl font-black text-white">
                {lead.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>

            <div className="flex-1 min-w-0 pr-12">
              <DialogTitle className="text-xl font-black text-white tracking-tight leading-tight">
                {lead.name}
              </DialogTitle>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 px-3 py-1 rounded-full border border-white/30 whitespace-nowrap">
                  <Globe className="h-3 w-3" />{sourceLabel}
                </span>
                {serviceLabel !== "—" && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/20 px-3 py-1 rounded-full border border-white/30 whitespace-nowrap">
                    <Settings className="h-3 w-3" />{serviceLabel}
                  </span>
                )}
                {overdueFollowUp && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-500 px-3 py-1 rounded-full whitespace-nowrap">
                    <AlertCircle className="h-3 w-3" />Follow-up overdue
                  </span>
                )}
              </div>

              <DialogDescription className="text-xs text-white/60 mt-1.5">
                Lead profile · Full enquiry details
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <div className={cn(
                "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap",
                qualificationDone ? "bg-white/20 border-white/40 text-white" : "bg-white/10 border-white/20 text-white/70"
              )}>
                <div className={cn("w-4 h-4 rounded-full flex items-center justify-center", qualificationDone ? "bg-green-400" : "bg-white/20 border border-white/40")}>
                  {qualificationDone && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                </div>
                Qualification: {qualificationDone ? "Complete" : "Pending"}
              </div>

              <div className={cn(
                "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap",
                salesFormDone ? "bg-white/20 border-white/40 text-white" : "bg-white/10 border-white/20 text-white/70"
              )}>
                <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center", salesFormDone ? "bg-green-400 border-transparent" : "bg-transparent border-white/50")}>
                  {salesFormDone && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                </div>
                Sales Form: {salesFormDone ? "Filled" : "Not Filled"}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { onOpenSalesForm?.(lead); onOpenChange(false); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-full shadow-sm transition-all whitespace-nowrap"
              >
                <ClipboardList className="h-3.5 w-3.5" />Open Sales Form
              </button>
              <button
                onClick={() => { onOpenFollowUp?.(lead); onOpenChange(false); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-full shadow-sm transition-all whitespace-nowrap"
              >
                <Bell className="h-3.5 w-3.5" />Add Follow-up
              </button>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ──────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-100 bg-white px-4 overflow-x-auto shrink-0">
          <Tab active={activeTab === "info"}          onClick={() => setActiveTab("info")}          icon={<User className="h-3.5 w-3.5" />}         label="Basic Info" />
          <Tab active={activeTab === "qualification"} onClick={() => setActiveTab("qualification")} icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Qualification" />
          <Tab active={activeTab === "salesform"}     onClick={() => setActiveTab("salesform")}     icon={<FileText className="h-3.5 w-3.5" />}     label="Sales Form" />
          <Tab active={activeTab === "followups"}     onClick={() => setActiveTab("followups")}     icon={<History className="h-3.5 w-3.5" />}      label="Follow-ups" />
        </div>

        {/* ── Scrollable Body ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <div className="p-4 grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4">

            {/* ── LEFT — Main content ─────────────────────────────────── */}
            <div className="space-y-4">

              {/* ══ BASIC INFO ══════════════════════════════════════════ */}
              {activeTab === "info" && (
                <Section icon={<Heart className="h-3.5 w-3.5" />} title="Basic Information">
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Full Name" value={lead.name} />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Pipeline Status</p>
                        <Select value={stage} onValueChange={handleStageChange}>
                          <SelectTrigger className="h-9 text-sm font-semibold border border-gray-200 rounded-xl focus:ring-0 focus:border-teal-400 bg-white">
                            <span className="w-2 h-2 rounded-full shrink-0 mr-2 inline-block" style={{ background: sm.color }} />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className="flex items-center gap-2 text-sm">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                  {s.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Phone"  value={(lead as any).phone}  icon={<Phone className="h-3 w-3" />} />
                      <Field label="Email"  value={lead.email && !lead.email.includes("@whatsapp.") ? lead.email : undefined} icon={<Mail className="h-3 w-3" />} />
                    </div>

                    <Field label="WhatsApp" value={lead.whatsappNumber ?? (lead as any).phone} icon={<MessageSquare className="h-3 w-3" />} accent="text-teal-600" />

                    <div className="h-px bg-gray-100" />

                    <div className="grid grid-cols-3 gap-5">
                      <Field label="Age"        value={(lead as any).age} />
                      <Field label="Gender"     value={(lead as any).gender} />
                      <Field label="Referred By" value={(lead as any).referred_by} />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Service" value={serviceLabel} icon={<Settings className="h-3 w-3" />} accent="text-teal-600" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Priority</p>
                        <span className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border",
                          lead.priority === "high"   ? "bg-red-50 text-red-600 border-red-200"   :
                          lead.priority === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                       "bg-gray-100 text-gray-500 border-gray-200"
                        )}>
                          {lead.priority === "high" ? "High Priority" : lead.priority === "medium" ? "Medium Priority" : "Low Priority"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Notes</p>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 min-h-[60px]">
                        {lead.notes || <span className="text-gray-400 italic">No notes added</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Company" value={(lead as any).company} />
                      {isAdmin && (
                        // 🆕 CHANGED — was reading lead.assignedTo, which can
                        // point to a different person than who actually
                        // created/owns the lead (assignment and creation
                        // are separate concepts — see leads.js ownership
                        // model, which keys off created_by). This now shows
                        // the same value as the "Sales Owner" column in the
                        // Leads table, sourced from created_user_name.
                        <Field
                          label="Sales Owner"
                          icon={<User className="h-3 w-3" />}
                          value={
                            (lead as any).created_user_name
                            ?? (lead as any).sales_owner_name
                            ?? getUserName((lead as any).createdBy ?? (lead as any).created_by)
                          }
                        />
                      )}
                    </div>
                  </div>
                </Section>
              )}

              {/* ══ QUALIFICATION ══════════════════════════════════════ */}
              {activeTab === "qualification" && (
                <Section icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Qualification Details">
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Qualification Status" value={
                        <span className={cn("font-bold", qualificationDone ? "text-green-600" : "text-gray-400")}>
                          {qualificationDone ? "Complete" : "Pending"}
                        </span>
                      } />
                      <Field label="Qualified By" value={(lead as any).qualifiedBy} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Qualification Notes</p>
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 min-h-[80px]">
                        {(lead as any).qualificationNotes || <span className="text-gray-400 italic">No qualification notes</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Budget"         value={fmtCurrency((lead as any).budget)} />
                      <Field label="Decision Maker" value={(lead as any).decisionMaker} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Timeline"  value={(lead as any).timeline} />
                      <Field label="Pain Point" value={(lead as any).painPoint} />
                    </div>
                  </div>
                </Section>
              )}

              {/* ══ SALES FORM ═════════════════════════════════════════ */}
              {activeTab === "salesform" && (
                <Section icon={<FileText className="h-3.5 w-3.5" />} title="Sales Form">
                  <div className="p-5 space-y-5">

                    {/* ── NEW: 4-column amount summary including Expected Amount ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Total Deal",      val: fmtCurrency(totalAmount),    cls: "text-gray-900" },
                        { label: "Expected",        val: fmtCurrency(expectedAmount), cls: "text-amber-600" },
                        { label: "Received",        val: fmtCurrency(amountReceived), cls: "text-green-600" },
                        { label: "Balance Due",     val: fmtCurrency(balance),        cls: balance > 0 ? "text-red-500" : "text-green-600" },
                      ].map((item) => (
                        <div key={item.label} className="bg-gray-50 rounded-xl border border-gray-100 p-3.5 text-center">
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">{item.label}</p>
                          <p className={cn("text-base font-black", item.cls)}>{item.val}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <Field label="Form Status" value={
                        <span className={cn("font-bold", salesFormDone ? "text-green-600" : "text-red-500")}>
                          {salesFormDone ? "Filled" : "Not Filled"}
                        </span>
                      } />
                      <Field label="Closure Date" value={fmtDate(lead.expectedCloseDate) ?? "Not set"} />
                    </div>

                    {/* Payment history */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Payment History</p>
                      {paymentHistory.length > 0 ? (
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                {["Date", "Amount", "Mode", "Note"].map((h) => (
                                  <th key={h} className={cn(
                                    "py-2.5 px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider",
                                    h === "Amount" ? "text-right" : h === "Mode" ? "text-center" : "text-left"
                                  )}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {paymentHistory.map((p: any, i: number) => (
                                <tr key={p.id ?? i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2.5 text-xs text-gray-600">{fmtDate(p.date ?? p.payment_date) ?? "—"}</td>
                                  <td className="px-3 py-2.5 text-xs font-bold text-green-600 text-right">{fmtCurrency(p.amount)}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase border border-teal-100">
                                      {PAYMENT_MODE_LABELS[String(p.mode ?? p.payment_mode).toLowerCase()] ?? p.mode ?? "—"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-xs text-gray-400">{p.remarks || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-8 text-center rounded-xl border border-dashed border-gray-200">
                          <IndianRupee className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">No payments recorded yet</p>
                        </div>
                      )}
                      <button
                        onClick={() => onCreateDeal?.(lead)}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all"
                      >
                        <IndianRupee className="h-3.5 w-3.5" />Record Payment
                      </button>
                    </div>
                  </div>
                </Section>
              )}

              {/* ══ FOLLOW-UPS ═════════════════════════════════════════ */}
              {activeTab === "followups" && (
                <Section icon={<History className="h-3.5 w-3.5" />} title="Follow-ups">
                  <div className="p-5 space-y-4">
                    <div className={cn(
                      "p-4 rounded-xl border",
                      overdueFollowUp ? "bg-red-50 border-red-200" : "bg-teal-50/50 border-teal-100"
                    )}>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                        {overdueFollowUp ? "⚠️ Overdue — Reschedule" : "Schedule Follow-up"}
                      </p>
                      <div className="space-y-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button type="button" className={cn(
                              "h-9 flex items-center gap-2 px-3 text-sm rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors font-medium",
                              !followUpDate && "text-gray-400"
                            )}>
                              <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                              {followUpDate ? format(followUpDate, "d MMM yyyy") : "Pick a date"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <Input
                          placeholder="What to discuss, client blockers…"
                          value={followUpNote}
                          onChange={(e) => setFollowUpNote(e.target.value)}
                          className="h-9 text-sm rounded-xl border-gray-200 bg-white focus-visible:ring-0 focus-visible:border-teal-400"
                        />
                        <button
                          onClick={handleSaveFollowUp}
                          disabled={!followUpDate || savingFU}
                          className="h-9 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
                        >
                          {savingFU ? "Saving…" : "Save Follow-up"}
                        </button>
                      </div>
                    </div>

                    {followUpHistory.length > 0 ? (
                      <div className="space-y-2.5">
                        {followUpHistory.map((fu: any, i: number) => (
                          <div key={fu.id ?? i} className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", fu.completed ? "bg-green-100" : "bg-amber-50")}>
                              {fu.completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-amber-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-gray-800">{fmtDate(fu.follow_up_date ?? fu.followUpDate) ?? "—"}</p>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                  fu.completed ? "bg-green-50 text-green-600 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200"
                                )}>
                                  {fu.completed ? "Done" : "Pending"}
                                </span>
                              </div>
                              {fu.notes && <p className="text-xs text-gray-500 mt-0.5">{fu.notes}</p>}
                              <p className="text-[10px] text-gray-300 mt-1">{fmtDateTime(fu.created_at ?? fu.createdAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center rounded-xl border border-dashed border-gray-200">
                        <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No follow-up history yet</p>
                      </div>
                    )}
                  </div>
                </Section>
              )}
            </div>

            {/* ── RIGHT — Sidebar ──────────────────────────────────────── */}
            <div className="space-y-4">

              {/* Status Indicators */}
              <Section icon={<Activity className="h-3.5 w-3.5" />} title="Status Indicators">
                <div className="p-4 space-y-2.5">
                  <StatusPill done={qualificationDone} label="Qualification Status" sublabel={qualificationDone ? "Complete" : "Pending"} />
                  <StatusPill done={salesFormDone}     label="Form Completion"      sublabel={salesFormDone ? "Filled" : "Not Filled"} />
                </div>
              </Section>

              {/* Key Metrics */}
              <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: "linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)" }}>
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Key Metrics</h3>
                </div>

                <div className="bg-white px-4 py-4">
                  {/* Total deal value */}
                  <div className="flex items-center gap-3 py-3 px-3 bg-green-50 rounded-xl border border-green-100 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Deal Value</p>
                      <p className="text-xl font-black text-gray-900">{fmtCurrency(totalAmount)}</p>
                    </div>
                  </div>

                  {/* ── NEW: Expected amount pill ── */}
                  {expectedAmount > 0 && (
                    <div className="flex items-center gap-3 py-3 px-3 bg-amber-50 rounded-xl border border-amber-100 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Expected Amount</p>
                        <p className="text-xl font-black text-amber-700">{fmtCurrency(expectedAmount)}</p>
                      </div>
                    </div>
                  )}

                  <MetricRow icon={<CalendarIcon className="h-3.5 w-3.5" />} label="Lead Created"  value={fmtDate(lead.createdAt) ?? "—"} />
                  <MetricRow
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="Appointment"
                    value={(lead as any).appointmentDate ? fmtDate((lead as any).appointmentDate)! : "Not scheduled"}
                    accent={(lead as any).appointmentDate ? undefined : "text-gray-400"}
                  />
                  {fud && (
                    <MetricRow
                      icon={<Bell className="h-3.5 w-3.5" />}
                      label="Follow-up Date"
                      value={fmtDate(fud) ?? "—"}
                      accent={overdueFollowUp ? "text-red-500" : "text-amber-500"}
                    />
                  )}
                  <MetricRow
                    icon={<IndianRupee className="h-3.5 w-3.5" />}
                    label="Payment Status"
                    value={
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full border",
                        paymentStatus === "Paid"    ? "bg-green-50 text-green-600 border-green-200"  :
                        paymentStatus === "Partial" ? "bg-amber-50 text-amber-600 border-amber-200"  :
                                                     "bg-red-50 text-red-500 border-red-200"
                      )}>
                        {paymentStatus}
                      </span>
                    }
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <Section icon={<Activity className="h-3.5 w-3.5" />} title="Quick Actions">
                <div className="p-4 space-y-2">
                  {[
                    { label: "Call Client", icon: <Phone className="h-4 w-4 text-blue-400" />,         hov: "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700",     fn: () => onCallLead?.(lead) },
                    { label: "WhatsApp",    icon: <MessageSquare className="h-4 w-4 text-green-400" />, hov: "hover:bg-green-50 hover:border-green-200 hover:text-green-700",   fn: () => onWhatsAppLead?.(lead) },
                    { label: "Send Email",  icon: <Mail className="h-4 w-4 text-purple-400" />,         hov: "hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700", fn: () => onEmailLead?.(lead) },
                  ].map((a) => (
                    <button
                      key={a.label}
                      onClick={a.fn}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-all text-left",
                        a.hov
                      )}
                    >
                      <span className="shrink-0">{a.icon}</span>{a.label}
                    </button>
                  ))}

                  <div className="h-px bg-gray-100" />

                  <button
                    disabled={!canConvert}
                    onClick={() => canConvert && onConvertLead?.(lead)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all text-left",
                      canConvert
                        ? "bg-teal-600 border-teal-600 text-white hover:bg-teal-700"
                        : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <Briefcase className="h-4 w-4 shrink-0" />Convert to Project
                  </button>

                  {stage !== "won" && !lead.isConverted && (
                    <p className="text-[11px] text-gray-400 text-center pt-1">
                      Move to <strong>Won</strong> stage to convert
                    </p>
                  )}
                  {lead.isConverted && (
                    <p className="text-[11px] text-green-500 text-center flex items-center justify-center gap-1 pt-1">
                      <CheckCircle2 className="h-3 w-3" />Already converted
                    </p>
                  )}
                </div>
              </Section>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}