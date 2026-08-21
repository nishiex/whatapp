"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useCRM } from "@/contexts/crm-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  IndianRupee,
  Wallet,
  Calendar,
  User,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  Save,
  Send,
  AlertCircle,
  Plus,
  Trash2,
  ArrowDownCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/crm";

// ── SOW §5.2 aligned constants ──────────────────────────────────────────────

const TECH_SERVICES = [
  { value: "website",           label: "Website" },
  { value: "whatsapp",          label: "WhatsApp API" },
  { value: "lms",               label: "LMS" },
  { value: "crm",               label: "CRM" },
  { value: "digital_marketing", label: "Digital Marketing" },
  { value: "mobile_app",        label: "Mobile App" },
  { value: "devops",            label: "DevOps" },
  { value: "ml_project",        label: "ML / Search Project" },
  { value: "admin_panel",       label: "Admin Panel" },
  { value: "excel_extractor",   label: "Excel Extractor" },
  { value: "word_editor",       label: "Word Editor" },
  { value: "website_mobile",    label: "Website + Mobile App" },
  { value: "other",             label: "Other" },
];

// SOW §5.2: "Status — Live, Growth, Demo, Active, etc."
const DEAL_STATUS_OPTIONS = [
  { value: "active",   label: "Active" },
  { value: "live",     label: "Live" },
  { value: "growth",   label: "Growth" },
  { value: "demo",     label: "Demo" },
  { value: "on_hold",  label: "On Hold" },
  { value: "inactive", label: "Inactive" },
];

// SOW §5.2: "Payment Mode — UPI / Bank Transfer / Cash"
const PAYMENT_MODE_OPTIONS = [
  { value: "upi",           label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash",          label: "Cash" },
  { value: "cheque",        label: "Cheque" },
  { value: "other",         label: "Other" },
];

// SOW §5.2: Pipeline Stage
const PIPELINE_STAGES = [
  { value: "lead",        label: "Lead" },
  { value: "demo",        label: "Demo" },
  { value: "proposal",    label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won",         label: "Won" },
  { value: "lost",        label: "Lost" },
];

// ── Payment entry type ───────────────────────────────────────────────────────
interface PaymentEntry {
  id: string;
  amount: string;
  mode: string;
  date: string;
  note: string;
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  dialogTitle?: string;
  allowDraft?: boolean;
  onSuccess?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);

const svcLabel = (v?: string | null) =>
  TECH_SERVICES.find((s) => s.value === v)?.label ?? v ?? "—";

const formatINR = (n: number) =>
  n > 0 ? `₹${n.toLocaleString("en-IN")}` : "—";

const today = () => new Date().toISOString().slice(0, 10);

// ── Component ────────────────────────────────────────────────────────────────
export function DealFormDialog({
  open,
  onOpenChange,
  lead,
  dialogTitle = "Deal Form",
  allowDraft = true,
  onSuccess,
}: DealFormDialogProps) {
  const { updateLead } = useCRM();

  // ── Form state — mirrors SOW §5.2 data fields ───────────────────────────
  const [clientName,     setClientName]     = useState("");
  const [service,        setService]        = useState("");
  const [pipelineStage,  setPipelineStage]  = useState("");
  const [dealStatus,     setDealStatus]     = useState("");
  const [totalAmount,    setTotalAmount]    = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [closureDate,    setClosureDate]    = useState("");
  const [paymentMode,    setPaymentMode]    = useState("");
  const [salesOwner,     setSalesOwner]     = useState("");
  const [remarks,        setRemarks]        = useState("");

  // Payment history — per SOW §2.3: "Maintain full payment history per deal"
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [newPayment, setNewPayment] = useState<PaymentEntry>({
    id: genId(), amount: "", mode: "", date: today(), note: "",
  });

  const [isSaving,    setIsSaving]    = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // ── Populate form when lead changes ─────────────────────────────────────
  useEffect(() => {
    if (!lead || !open) return;

    setClientName(lead.name ?? "");
    setService((lead as any).service ?? "");
    setPipelineStage((lead as any).pipelineStage ?? lead.status ?? "");
    setDealStatus((lead as any).dealStatus ?? (lead as any).deal_status ?? "");
    setTotalAmount(
      String((lead as any).totalAmount ?? (lead as any).total_amount ?? lead.estimatedValue ?? "")
    );
    setExpectedAmount(
      String(lead.estimatedValue ?? "")
    );
    setClosureDate(
      (lead.expectedCloseDate
        ? new Date(lead.expectedCloseDate as string).toISOString().slice(0, 10)
        : "") ?? ""
    );
    setPaymentMode((lead as any).paymentMode ?? (lead as any).payment_mode ?? "");
    setSalesOwner(
      (lead as any).salesOwner ??
      (lead as any).assigned_user_name ??
      lead.assignedTo ??
      ""
    );
    setRemarks((lead as any).remarks ?? lead.notes ?? "");

    // Restore saved payment history or seed with existing amount_received
    const saved = (lead as any).dealFormPayments;
    if (Array.isArray(saved) && saved.length > 0) {
      setPayments(saved);
    } else {
      const received = Number((lead as any).amountReceived ?? (lead as any).amount_received ?? 0);
      if (received > 0) {
        setPayments([{
          id: genId(),
          amount: String(received),
          mode: (lead as any).paymentMode ?? (lead as any).payment_mode ?? "",
          date: today(),
          note: "Initial payment",
        }]);
      } else {
        setPayments([]);
      }
    }

    setNewPayment({ id: genId(), amount: "", mode: "", date: today(), note: "" });
    setErrors({});
    setIsDraftSaved(false);
  }, [lead, open]);

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalReceived = payments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  const totalAmt  = Number(totalAmount) || 0;
  const pending   = Math.max(0, totalAmt - totalReceived);
  const paidPct   = totalAmt > 0 ? Math.min(100, Math.round((totalReceived / totalAmt) * 100)) : 0;

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!clientName.trim()) e.clientName = "Client name is required";
    if (!service)            e.service    = "Service is required";
    if (!totalAmount || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0)
      e.totalAmount = "Enter a valid total amount";
    if (!pipelineStage)      e.pipelineStage = "Pipeline stage is required";
    return e;
  }, [clientName, service, totalAmount, pipelineStage]);

  // ── Add payment entry ─────────────────────────────────────────────────────
  const addPayment = () => {
    if (!newPayment.amount || isNaN(Number(newPayment.amount)) || Number(newPayment.amount) <= 0) return;
    setPayments((prev) => [...prev, { ...newPayment }]);
    setNewPayment({ id: genId(), amount: "", mode: "", date: today(), note: "" });
  };

  const removePayment = (id: string) =>
    setPayments((prev) => prev.filter((p) => p.id !== id));

  // ── Build payload ─────────────────────────────────────────────────────────
  const buildPayload = useCallback(() => ({
    name:           clientName,
    service,
    status:         pipelineStage as Lead["status"],
    pipelineStage,
    dealStatus,
    deal_status:    dealStatus,
    totalAmount:    Number(totalAmount) || 0,
    total_amount:   Number(totalAmount) || 0,
    estimatedValue: Number(expectedAmount) || Number(totalAmount) || 0,
    expectedCloseDate: closureDate || null,
    paymentMode,
    payment_mode:   paymentMode,
    salesOwner,
    remarks,
    amountReceived: totalReceived,
    amount_received: totalReceived,
    dealFormPayments: payments,
    dealFormDraft:  false,
  }), [
    clientName, service, pipelineStage, dealStatus, totalAmount,
    expectedAmount, closureDate, paymentMode, salesOwner,
    remarks, totalReceived, payments,
  ]);

  // ── Save as draft ──────────────────────────────────────────────────────────
  const saveDraft = async () => {
    if (!lead) return;
    setIsSaving(true);
    try {
      await updateLead(lead.id, {
        ...buildPayload(),
        dealFormDraft: true,
      } as any);
      setIsDraftSaved(true);
      setTimeout(() => setIsDraftSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    setIsSaving(true);
    try {
      await updateLead(lead.id, buildPayload() as any);
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setIsSaving(false);
    }
  };

  if (!lead) return null;

  const hasErrors = Object.keys(errors).length > 0;

  // ── Section header helper ────────────────────────────────────────────────
  const SectionHead = ({ icon: Icon, label, color = "text-blue-600", bg = "bg-blue-50" }: {
    icon: React.ElementType; label: string; color?: string; bg?: string;
  }) => (
    <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <span className={`text-xs font-black uppercase tracking-wider ${color}`}>{label}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-500 px-6 py-5 rounded-t-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-black text-lg leading-tight">{dialogTitle}</div>
                <div className="text-blue-100 text-xs font-normal mt-0.5">
                  {lead.name} ·{" "}
                  <span className="text-white font-semibold">{svcLabel((lead as any).service)}</span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-50 space-y-4 p-5">

          {/* ── Deal Summary card ──────────────────────────────────────── */}
          {totalAmt > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Deal",   value: formatINR(totalAmt),      icon: IndianRupee,     cls: "text-gray-700",  bg: "bg-white" },
                { label: "Received",     value: formatINR(totalReceived),  icon: ArrowDownCircle, cls: "text-green-600", bg: "bg-green-50" },
                { label: "Pending",      value: formatINR(pending),        icon: Clock,           cls: pending > 0 ? "text-amber-600" : "text-gray-400", bg: pending > 0 ? "bg-amber-50" : "bg-white" },
              ].map(({ label, value, icon: Icon, cls, bg }) => (
                <div key={label} className={`${bg} rounded-xl border border-slate-100 px-4 py-3 shadow-sm`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${cls}`} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                  </div>
                  <div className={`text-lg font-black ${cls}`}>{value}</div>
                </div>
              ))}
              {totalAmt > 0 && totalReceived > 0 && (
                <div className="col-span-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    <span>Payment progress</span>
                    <span className={paidPct >= 100 ? "text-green-600" : "text-slate-500"}>{paidPct}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${paidPct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                      style={{ width: `${paidPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Deal Details ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={Briefcase} label="Deal Details" color="text-blue-700" bg="bg-blue-50" />
            <div className="p-4 space-y-4">

              {/* Client name */}
              <div className="space-y-1.5">
                <Label htmlFor="clientName" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Client Name *
                </Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => { setClientName(e.target.value); setErrors((p) => ({ ...p, clientName: "" })); }}
                  placeholder="Client / company name"
                  className={cn(
                    "rounded-xl border-2 focus:border-blue-400",
                    errors.clientName ? "border-red-300" : "border-slate-200"
                  )}
                />
                {errors.clientName && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />{errors.clientName}
                  </p>
                )}
              </div>

              {/* Service + Pipeline stage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Service *</Label>
                  <Select
                    value={service}
                    onValueChange={(v) => { setService(v); setErrors((p) => ({ ...p, service: "" })); }}
                  >
                    <SelectTrigger className={cn(
                      "rounded-xl border-2 focus:border-blue-400",
                      errors.service ? "border-red-300" : "border-slate-200"
                    )}>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {TECH_SERVICES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.service && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.service}
                    </p>
                  )}
                </div>

                {/* SOW §3 Pipeline Stage */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pipeline Stage *</Label>
                  <Select
                    value={pipelineStage}
                    onValueChange={(v) => { setPipelineStage(v); setErrors((p) => ({ ...p, pipelineStage: "" })); }}
                  >
                    <SelectTrigger className={cn(
                      "rounded-xl border-2 focus:border-blue-400",
                      errors.pipelineStage ? "border-red-300" : "border-slate-200"
                    )}>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.pipelineStage && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.pipelineStage}
                    </p>
                  )}
                </div>
              </div>

              {/* SOW §5.2: Status + Closure Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</Label>
                  <Select value={dealStatus} onValueChange={setDealStatus}>
                    <SelectTrigger className="rounded-xl border-2 border-slate-200 focus:border-blue-400">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEAL_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="closureDate" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Closure Date
                  </Label>
                  <Input
                    id="closureDate"
                    type="date"
                    value={closureDate}
                    onChange={(e) => setClosureDate(e.target.value)}
                    className="rounded-xl border-2 border-slate-200 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Sales owner */}
              <div className="space-y-1.5">
                <Label htmlFor="salesOwner" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Sales Owner
                </Label>
                <Input
                  id="salesOwner"
                  value={salesOwner}
                  onChange={(e) => setSalesOwner(e.target.value)}
                  placeholder="Assigned sales representative"
                  className="rounded-xl border-2 border-slate-200 focus:border-blue-400"
                />
              </div>
            </div>
          </div>

          {/* ── Financial Details ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={IndianRupee} label="Financial Details" color="text-violet-700" bg="bg-violet-50" />
            <div className="p-4 space-y-4">

              {/* SOW §5.2: Total Amount + Expected Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="totalAmount" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Total Amount (₹) *
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="totalAmount"
                      type="number"
                      min="0"
                      step="1"
                      value={totalAmount}
                      onChange={(e) => { setTotalAmount(e.target.value); setErrors((p) => ({ ...p, totalAmount: "" })); }}
                      placeholder="0"
                      className={cn(
                        "pl-9 rounded-xl border-2 focus:border-violet-400 font-bold",
                        errors.totalAmount ? "border-red-300" : "border-slate-200"
                      )}
                    />
                  </div>
                  {errors.totalAmount && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{errors.totalAmount}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expectedAmount" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Expected Amount (₹)
                  </Label>
                  <div className="relative">
                    <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="expectedAmount"
                      type="number"
                      min="0"
                      step="1"
                      value={expectedAmount}
                      onChange={(e) => setExpectedAmount(e.target.value)}
                      placeholder="Forecasted receivable"
                      className="pl-9 rounded-xl border-2 border-slate-200 focus:border-violet-400"
                    />
                  </div>
                </div>
              </div>

              {/* SOW §5.2: Payment Mode */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Payment Mode
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="rounded-xl border-2 border-slate-200 focus:border-violet-400">
                    <Wallet className="h-3.5 w-3.5 text-slate-400 mr-2" />
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODE_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Payment History ────────────────────────────────────────── */}
          {/* SOW §2.3: "Maintain full payment history per deal" */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={ArrowDownCircle} label="Payment History" color="text-green-700" bg="bg-green-50" />
            <div className="p-4 space-y-3">

              {payments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p, i) => (
                    <div key={p.id}
                      className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-green-700">
                            ₹{Number(p.amount).toLocaleString("en-IN")}
                          </span>
                          {p.mode && (
                            <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-medium px-1.5 py-0 rounded-full">
                              {PAYMENT_MODE_OPTIONS.find((m) => m.value === p.mode)?.label ?? p.mode}
                            </Badge>
                          )}
                          <span className="text-[10px] text-slate-400">{p.date}</span>
                        </div>
                        {p.note && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">{p.note}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePayment(p.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                        title="Remove payment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Received</span>
                    <span className="font-black text-green-700">
                      ₹{totalReceived.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* Add new payment */}
              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-3 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  Add Payment Entry
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <Input
                      type="number"
                      min="0"
                      placeholder="Amount"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))}
                      className="pl-7 h-8 text-xs rounded-lg border border-slate-200 focus:border-green-400"
                    />
                  </div>
                  <Select
                    value={newPayment.mode}
                    onValueChange={(v) => setNewPayment((p) => ({ ...p, mode: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-lg border border-slate-200 focus:border-green-400">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODE_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={newPayment.date}
                    onChange={(e) => setNewPayment((p) => ({ ...p, date: e.target.value }))}
                    className="h-8 text-xs rounded-lg border border-slate-200 focus:border-green-400"
                  />
                  <Input
                    placeholder="Note (optional)"
                    value={newPayment.note}
                    onChange={(e) => setNewPayment((p) => ({ ...p, note: e.target.value }))}
                    className="h-8 text-xs rounded-lg border border-slate-200 focus:border-green-400"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addPayment}
                  disabled={!newPayment.amount || Number(newPayment.amount) <= 0}
                  className="w-full h-8 rounded-lg border-2 border-green-200 text-green-700 hover:bg-green-50 font-bold text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Payment
                </Button>
              </div>
            </div>
          </div>

          {/* ── Remarks ────────────────────────────────────────────────── */}
          {/* SOW §5.2: "Remarks — Notes, payment remarks, or any additional context" */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={ClipboardList} label="Remarks" color="text-slate-600" bg="bg-slate-50" />
            <div className="p-4">
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Payment notes, scope details, special instructions, or any additional context..."
                className="rounded-xl border-2 border-slate-200 focus:border-blue-400 resize-none text-sm"
              />
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <DialogFooter className="gap-2 pt-1 flex-wrap">
            {allowDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={isSaving || !lead}
                className="rounded-xl border-2 border-slate-200 font-bold px-5 gap-2 text-slate-600"
              >
                {isDraftSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Draft Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="rounded-xl border-2 border-slate-200 font-bold px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-500 hover:from-blue-500 hover:to-violet-400 text-white font-black px-6 shadow-lg shadow-blue-200 gap-2"
            >
              <Send className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}