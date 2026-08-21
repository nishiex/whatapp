"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useCRM } from "@/contexts/crm-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/crm";

// SOW §5.2: Services
const VASIFY_SERVICES = [
  { value: "website",      label: "Website Development" },
  { value: "whatsapp",     label: "WhatsApp Automation" },
  { value: "lms",          label: "LMS (Learning Management System)" },
  { value: "crm",          label: "CRM Development" },
  { value: "social-media", label: "Social Media" },
  { value: "other",        label: "Other" },
] as const;
type VasifyService = (typeof VASIFY_SERVICES)[number]["value"];

// SOW §5.3: Lead sources
const LEAD_SOURCES = [
  { value: "referral",     label: "Referral" },
  { value: "website",      label: "Website" },
  { value: "whatsapp",     label: "WhatsApp" },
  { value: "social-media", label: "Social Media" },
  { value: "manual",       label: "Manual / Direct" },
  { value: "other",        label: "Other" },
] as const;
type LeadSource = (typeof LEAD_SOURCES)[number]["value"];

const PRIORITIES = [
  { value: "high",   label: "High",   activeClass: "bg-red-50 border-red-300 text-red-700" },
  { value: "medium", label: "Medium", activeClass: "bg-amber-50 border-amber-300 text-amber-700" },
  { value: "low",    label: "Low",    activeClass: "bg-gray-100 border-gray-300 text-gray-700" },
] as const;

interface LeadDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  lead: Lead | null; mode: "add" | "edit";
}

type LeadFormState = {
  name: string; phone: string; whatsappNumber: string; email: string;
  company: string; referredBy: string; notes: string;
  estimatedValue: string; expectedAmount: string;  // ── NEW: replaced expectedAmount ──
  priority: string;
};

const DEFAULT_FORM: LeadFormState = {
  name: "", phone: "", whatsappNumber: "", email: "",
  company: "", referredBy: "", notes: "",
  estimatedValue: "", expectedAmount: "", priority: "medium",
};

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      {children}
    </div>
  );
}

export function LeadDialog({ open, onOpenChange, lead, mode }: LeadDialogProps) {
  const { addLead, updateLead } = useCRM();

  const [form,         setForm]         = useState<LeadFormState>(DEFAULT_FORM);
  const [service,      setService]      = useState<VasifyService | "">("");
  const [source,       setSource]       = useState<LeadSource | "">("");
  const [closureDate,  setClosureDate]  = useState<Date | undefined>(undefined);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (lead && mode === "edit") {
      setForm({
        name:           lead.name                 ?? "",
        phone:          (lead as any).phone       ?? "",
        whatsappNumber: lead.whatsappNumber       ?? "",
        email:          lead.email                ?? "",
        company:        lead.company              ?? "",
        referredBy:     (lead as any).referred_by ?? "",
        notes:          lead.notes                ?? "",
        estimatedValue: String(lead.estimatedValue ?? (lead as any).total_amount ?? ""),
        // ── NEW: read expectedAmount from both camelCase and snake_case ──
        expectedAmount: String(
          (lead as any).expectedAmount ?? (lead as any).expected_amount ?? ""
        ),
        priority: (lead.priority as string) ?? "medium",
      });
      setService(((lead as any).service as VasifyService) ?? "");
      setSource(((lead as any).source  as LeadSource)     ?? "");
      setClosureDate(
        lead.expectedCloseDate
          ? lead.expectedCloseDate instanceof Date ? lead.expectedCloseDate
            : new Date(lead.expectedCloseDate as string)
          : undefined
      );
      setFollowUpDate(
        (lead as any).follow_up_date ? new Date((lead as any).follow_up_date) : undefined
      );
    } else {
      setForm(DEFAULT_FORM); setService(""); setSource("manual");
      setClosureDate(undefined); setFollowUpDate(undefined);
    }
    setError(null);
  }, [open, lead, mode]);

  const set = (field: keyof LeadFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = form.name.trim(), phone = form.phone.trim();
    if (!name)  { setError("Client name is required."); return; }
    if (!phone) { setError("Phone number is required."); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address."); return;
    }
    if (mode === "add" && !service) { setError("Please select a service."); return; }

    const estimatedValue = form.estimatedValue ? Number(form.estimatedValue) : 0;
    const expectedAmount = form.expectedAmount  ? Number(form.expectedAmount)  : 0;  // ── NEW ──

    if (isNaN(estimatedValue) || estimatedValue < 0) {
      setError("Total amount must be a valid number."); return;
    }
    if (isNaN(expectedAmount) || expectedAmount < 0) {
      setError("Expected amount must be a valid number."); return;
    }
    if (expectedAmount > estimatedValue && estimatedValue > 0) {
      setError("Expected amount cannot be greater than the total amount."); return;
    }

    const payload: any = {
      name, phone,
      email: form.email.trim() || undefined,
      whatsappNumber: form.whatsappNumber || undefined,
      company: form.company || undefined,
      referredBy: form.referredBy || undefined,
      notes: form.notes || undefined,
      estimatedValue,
      expectedAmount,    // ── NEW ──
      priority: form.priority,
      service: service || undefined,
      source: source || "manual",
      expectedCloseDate: closureDate,
      followUpDate,
    };
    if (mode === "add") payload.status = "lead";

    setIsSubmitting(true);
    try {
      const ok = mode === "add"
        ? !!(await addLead(payload))
        : lead ? await updateLead(lead.id, payload) : false;
      if (ok) onOpenChange(false);
      else setError("Failed to save. Please try again.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 shadow-xl p-0 gap-0">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              {mode === "add" ? "Add New Lead" : "Edit Lead"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              {mode === "add" ? "Fill in the client details to create a new lead." : "Update lead information."}
            </DialogDescription>
          </div>
          <button
            type="button" onClick={() => onOpenChange(false)}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

          {/* Contact Details */}
          <Section label="Contact Details">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Client Name" required>
                <Input value={form.name} onChange={set("name")} placeholder="e.g. Rahul Sharma"
                  className="h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-blue-500" />
              </Field>
              <Field label="Phone Number" required>
                <Input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210"
                  className="h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-blue-500" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="WhatsApp">
                <Input value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="If different from phone"
                  className="h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-blue-500" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={set("email")} placeholder="client@example.com"
                  className="h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-blue-500" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company / Business">
                <Input value={form.company} onChange={set("company")} placeholder="Company name"
                  className="h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-blue-500" />
              </Field>
              <Field label="Referred By">
                <Input value={form.referredBy} onChange={set("referredBy")} placeholder="Who referred this lead?"
                  className="h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-blue-500" />
              </Field>
            </div>
          </Section>

          {/* Service & Source */}
          <Section label="Service & Source">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Service" required={mode === "add"}>
                <Select value={service} onValueChange={(v) => setService(v as VasifyService)}>
                  <SelectTrigger className="h-9 rounded-xl border-gray-200 text-sm focus:ring-0 focus:border-blue-500">
                    <SelectValue placeholder="Select a service…" />
                  </SelectTrigger>
                  <SelectContent>
                    {VASIFY_SERVICES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Lead Source">
                <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                  <SelectTrigger className="h-9 rounded-xl border-gray-200 text-sm focus:ring-0">
                    <SelectValue placeholder="How did they hear about us?" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Priority">
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button key={p.value} type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                    className={cn(
                      "flex-1 py-2 rounded-xl border text-xs font-semibold transition-all",
                      form.priority === p.value
                        ? p.activeClass
                        : "bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500"
                    )}
                  >{p.label}</button>
                ))}
              </div>
            </Field>
          </Section>

          {/* Deal Amount — updated section with two fields */}
          <Section label="Deal Amount">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Total Amount (₹)" hint="Gross deal value">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">₹</span>
                  <Input
                    type="number"
                    value={form.estimatedValue}
                    onChange={set("estimatedValue")}
                    min="0" step="1" placeholder="0"
                    className="pl-7 h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-blue-500"
                  />
                </div>
              </Field>
              {/* ── NEW: Expected Amount field ── */}
              <Field label="Expected Amount (₹)" hint="What you expect to receive">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-sm select-none">₹</span>
                  <Input
                    type="number"
                    value={form.expectedAmount}
                    onChange={set("expectedAmount")}
                    min="0" step="1" placeholder="0"
                    className="pl-7 h-9 rounded-xl border-gray-200 text-sm focus-visible:ring-0 focus-visible:border-amber-400"
                  />
                </div>
              </Field>
            </div>
            {/* Live hint: show balance if both are filled */}
            {form.estimatedValue && form.expectedAmount &&
             Number(form.estimatedValue) > 0 && Number(form.expectedAmount) > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                <span className="font-medium text-gray-500">Balance:</span>
                <span className={cn(
                  "font-bold",
                  Number(form.estimatedValue) - Number(form.expectedAmount) < 0
                    ? "text-red-500"
                    : "text-emerald-600"
                )}>
                  ₹{(Number(form.estimatedValue) - Number(form.expectedAmount)).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </Section>

          {/* Dates */}
          <Section label="Dates">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected Closure">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button"
                      className={cn("w-full h-9 justify-start text-sm font-normal rounded-xl border-gray-200 hover:bg-gray-50", !closureDate && "text-gray-400")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                      {closureDate ? format(closureDate, "d MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={closureDate} onSelect={setClosureDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field label="Follow-up Date">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button"
                      className={cn("w-full h-9 justify-start text-sm font-normal rounded-xl border-gray-200 hover:bg-gray-50", !followUpDate && "text-gray-400")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                      {followUpDate ? format(followUpDate, "d MMM yyyy") : "When to follow up?"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </Field>
            </div>
          </Section>

          {/* Notes */}
          <Section label="Notes">
            <Textarea value={form.notes} onChange={set("notes")} rows={3}
              placeholder="Requirements, budget discussed, next steps…"
              className="rounded-xl border-gray-200 text-sm resize-none focus-visible:ring-0 focus-visible:border-blue-500" />
          </Section>

          {error && (
            <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-3.5 py-3 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}
              className="flex-1 h-9 rounded-xl border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}
              className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
              {isSubmitting ? "Saving…" : mode === "add" ? "Add Lead" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}