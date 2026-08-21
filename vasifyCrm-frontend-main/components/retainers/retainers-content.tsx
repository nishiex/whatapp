

"use client";

import type React from "react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useCRM } from "@/contexts/crm-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Eye,
  Phone, MessageSquare, RefreshCw, AlertCircle,
  Activity, ChevronDown, CalendarIcon, IndianRupee,
  CheckCircle2, Clock, X, SlidersHorizontal,
  Bell, Users, TrendingUp, Briefcase, Circle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Globe, History, XCircle, Wallet, BarChart3,
  ArrowDownCircle, ArrowUpCircle, Banknote, Receipt,
  CreditCard,
} from "lucide-react";
import { format, addMonths, differenceInDays, isBefore, isAfter, startOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { retainersApi, getAuthToken } from "@/lib/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Retainer {
  id:             string;
  clientName:     string;
  service:        string;
  monthlyAmount:  number;
  startDate:      string;
  renewalDate:    string;
  status:         "active" | "inactive" | "expired";
  phone?:         string;
  whatsappNumber?:string;
  notes?:         string;
  createdAt?:     string;
  updatedAt?:     string;
  client_name?:   string;
  monthly_amount?:number;
  start_date?:    string;
  renewal_date?:  string;
}

// Monthly payment summary row (from GET /api/retainers/payments/summary)
interface MonthlyPaymentRow {
  retainer_id:      string;
  client_name:      string;
  service:          string;
  expected_amount:  number;
  phone?:           string;
  whatsapp_number?: string;
  retainer_status:  string;
  payment_id?:      string | null;
  payment_month?:   string | null;
  received_amount?: number | null;
  payment_status?:  "paid" | "pending" | "partial" | null;
  payment_date?:    string | null;
  payment_mode?:    "upi" | "bank_transfer" | "cash" | null;
  remarks?:         string | null;
}

interface MonthlySummaryTotals {
  totalExpected: number;
  totalReceived: number;
  paidCount:     number;
  pendingCount:  number;
  total:         number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const RETAINER_SERVICES = [
  { value: "whatsapp",          label: "WhatsApp Automation" },
  { value: "website",           label: "Website Maintenance" },
  { value: "digital_marketing", label: "Digital Marketing" },
  { value: "crm",               label: "CRM Support" },
  { value: "lms",               label: "LMS Support" },
  { value: "mobile_app",        label: "Mobile App Maintenance" },
  { value: "admin_panel",       label: "Admin Panel Support" },
  { value: "devops",            label: "DevOps / Hosting" },
  { value: "other",             label: "Other" },
] as const;

const STATUS_META = {
  active:   { label: "Active",   color: "bg-green-50 text-green-700 border-green-200",  dotColor: "bg-green-500",  icon: <CheckCircle2 className="h-3 w-3" /> },
  inactive: { label: "Inactive", color: "bg-gray-50 text-gray-600 border-gray-200",    dotColor: "bg-gray-400",   icon: <Circle       className="h-3 w-3" /> },
  expired:  { label: "Expired",  color: "bg-red-50 text-red-600 border-red-200",        dotColor: "bg-red-500",    icon: <XCircle      className="h-3 w-3" /> },
} as const;

const PAYMENT_STATUS_META = {
  paid:    { label: "Paid",    color: "bg-emerald-50 text-emerald-700 border-emerald-200", dotColor: "bg-emerald-500" },
  partial: { label: "Partial", color: "bg-amber-50 text-amber-700 border-amber-200",       dotColor: "bg-amber-500"   },
  pending: { label: "Pending", color: "bg-slate-50 text-slate-500 border-slate-200",       dotColor: "bg-slate-400"   },
} as const;

const RENEWAL_WARN_DAYS  = 30;
const RENEWAL_ALERT_DAYS = 7;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatDate = (v: unknown) => {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const formatCurrency = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
};

const r = <T,>(a: T | undefined, b: T | undefined, fallback: T): T =>
  a !== undefined && a !== null ? a : b !== undefined && b !== null ? b : fallback;

const getClientName    = (ret: Retainer) => r(ret.clientName,    ret.client_name,    "");
const getMonthlyAmount = (ret: Retainer) => r(ret.monthlyAmount, ret.monthly_amount, 0);
const getStartDate     = (ret: Retainer) => r(ret.startDate,     ret.start_date,     "");
const getRenewalDate   = (ret: Retainer) => r(ret.renewalDate,   ret.renewal_date,   "");

const getDaysToRenewal = (renewalDate: string): number => {
  if (!renewalDate) return Infinity;
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const renewal = new Date(renewalDate);
  return differenceInDays(renewal, today);
};

const getRenewalMeta = (days: number) => {
  if (days < 0)                    return { label: "Expired",        cls: "text-red-600 bg-red-50 border-red-200",      dotCls: "bg-red-500",    urgent: true  };
  if (days <= RENEWAL_ALERT_DAYS)  return { label: `${days}d left`,  cls: "text-red-600 bg-red-50 border-red-200",      dotCls: "bg-red-500",    urgent: true  };
  if (days <= RENEWAL_WARN_DAYS)   return { label: `${days}d left`,  cls: "text-amber-600 bg-amber-50 border-amber-200",dotCls: "bg-amber-500",  urgent: false };
  return                                  { label: `${days}d left`,  cls: "text-gray-500 bg-gray-50 border-gray-200",   dotCls: "bg-gray-400",   urgent: false };
};

const svcLabel = (v: string) =>
  RETAINER_SERVICES.find((s) => s.value === v)?.label ?? v;

// Generate last 12 months for the month selector
const getLast12Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    months.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    });
  }
  return months;
};

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ─── INLINE STATUS DROPDOWN ───────────────────────────────────────────────────

function InlineStatusDropdown({
  retainer,
  onChange,
}: {
  retainer: Retainer;
  onChange: (id: string, status: Retainer["status"]) => Promise<void>;
}) {
  const [val,  setVal]  = useState(retainer.status);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setVal(retainer.status); }, [retainer.status]);

  const meta   = STATUS_META[val] ?? STATUS_META.active;
  const handle = async (next: string) => {
    if (next === val) return;
    const prev = val; setVal(next as Retainer["status"]); setBusy(true);
    try { await onChange(retainer.id, next as Retainer["status"]); }
    catch { setVal(prev); }
    finally { setBusy(false); }
  };

  return (
    <Select value={val} onValueChange={handle} disabled={busy}>
      <SelectTrigger
        className={`h-7 text-xs font-medium border rounded-full px-2.5 gap-1.5 w-auto min-w-[100px] max-w-[130px] ${meta.color} focus:ring-1 focus:ring-offset-0 ${busy ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
        style={{ boxShadow: "none" }}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotColor}`} />
        <SelectValue />
        {busy
          ? <span className="ml-auto h-3 w-3 animate-spin rounded-full border border-current border-t-transparent shrink-0" />
          : <ChevronDown className="ml-auto h-3 w-3 opacity-50 shrink-0" />}
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[130px]">
        {(Object.entries(STATUS_META) as [Retainer["status"], typeof STATUS_META[keyof typeof STATUS_META]][]).map(([key, m]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${m.dotColor}`} />
              {m.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, iconBg, icon, alert, sub,
}: {
  label: string; value: string | number; iconBg: string;
  icon: React.ReactNode; alert?: boolean; sub?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border ${alert ? "border-red-200" : "border-gray-100"} shadow-sm px-5 py-4 flex items-center gap-4`}>
      <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className={`font-bold text-2xl leading-none ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</div>
        <div className="text-xs text-gray-400 font-medium mt-1">{label}</div>
        {sub && <div className="text-[10px] text-gray-300 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── MONTHLY PAYMENT KPI CARDS ────────────────────────────────────────────────

function MonthlyPaymentKPIs({
  summary,
  selectedMonth,
}: {
  summary: MonthlySummaryTotals | null;
  selectedMonth: string;
}) {
  if (!summary) return null;

  const collectionRate = summary.totalExpected > 0
    ? Math.round((summary.totalReceived / summary.totalExpected) * 100)
    : 0;

  const pending = summary.totalExpected - summary.totalReceived;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Expected */}
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm px-5 py-4 flex items-center gap-4">
        <div className="p-2.5 rounded-xl shrink-0 bg-blue-50">
          <Receipt className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-2xl leading-none text-gray-900">
            {summary.totalExpected >= 100000
              ? `₹${(summary.totalExpected / 100000).toFixed(1)}L`
              : formatCurrency(summary.totalExpected)}
          </div>
          <div className="text-xs text-gray-400 font-medium mt-1">Expected This Month</div>
          <div className="text-[10px] text-gray-300 mt-0.5">{summary.total} active retainers</div>
        </div>
      </div>

      {/* Received */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-5 py-4 flex items-center gap-4">
        <div className="p-2.5 rounded-xl shrink-0 bg-emerald-50">
          <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-2xl leading-none text-emerald-700">
            {summary.totalReceived >= 100000
              ? `₹${(summary.totalReceived / 100000).toFixed(1)}L`
              : formatCurrency(summary.totalReceived)}
          </div>
          <div className="text-xs text-gray-400 font-medium mt-1">Received This Month</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">{summary.paidCount} paid</div>
        </div>
      </div>

      {/* Pending */}
      <div className={`bg-white rounded-2xl border ${pending > 0 ? "border-amber-200" : "border-gray-100"} shadow-sm px-5 py-4 flex items-center gap-4`}>
        <div className={`p-2.5 rounded-xl shrink-0 ${pending > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
          <Clock className={`h-5 w-5 ${pending > 0 ? "text-amber-500" : "text-gray-400"}`} />
        </div>
        <div className="min-w-0">
          <div className={`font-bold text-2xl leading-none ${pending > 0 ? "text-amber-700" : "text-gray-900"}`}>
            {pending >= 100000
              ? `₹${(pending / 100000).toFixed(1)}L`
              : formatCurrency(pending)}
          </div>
          <div className="text-xs text-gray-400 font-medium mt-1">Pending Collection</div>
          <div className="text-[10px] text-gray-300 mt-0.5">{summary.pendingCount} not paid yet</div>
        </div>
      </div>

      {/* Collection Rate */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl shrink-0 bg-indigo-50">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <div className={`font-bold text-2xl leading-none ${collectionRate >= 80 ? "text-indigo-700" : collectionRate >= 50 ? "text-amber-700" : "text-red-600"}`}>
              {collectionRate}%
            </div>
            <div className="text-xs text-gray-400 font-medium mt-1">Collection Rate</div>
          </div>
        </div>
        <div className="px-1">
          <Progress
            value={collectionRate}
            className="h-1.5 bg-gray-100"
          />
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT STATUS BADGE ─────────────────────────────────────────────────────

function PaymentBadge({ status }: { status?: "paid" | "pending" | "partial" | null }) {
  const s = status ?? "pending";
  const meta = PAYMENT_STATUS_META[s];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotColor}`} />
      {meta.label}
    </span>
  );
}

// ─── MARK PAYMENT DIALOG ──────────────────────────────────────────────────────

function MarkPaymentDialog({
  open,
  onOpenChange,
  retainer,
  existingPayment,
  selectedMonth,
  onSave,
}: {
  open:            boolean;
  onOpenChange:    (o: boolean) => void;
  retainer:        Retainer | null;
  existingPayment: MonthlyPaymentRow | null;
  selectedMonth:   string;  // "yyyy-MM"
  onSave:          (data: {
    retainerId:     string;
    paymentMonth:   string;
    receivedAmount: number;
    paymentStatus:  string;
    paymentDate:    string;
    paymentMode:    string;
    remarks:        string;
    expectedAmount: number;
  }) => Promise<void>;
}) {
  const [receivedAmount, setReceivedAmount] = useState("");
  const [paymentMode,    setPaymentMode]    = useState("upi");
  const [remarks,        setRemarks]        = useState("");
  const [paymentDate,    setPaymentDate]    = useState<Date | undefined>(new Date());
  const [submitting,     setSubmitting]     = useState(false);

  useEffect(() => {
    if (!open) return;
    const ep = existingPayment;
    setReceivedAmount(ep?.received_amount != null ? String(ep.received_amount) : String(getMonthlyAmount(retainer!)));
    setPaymentMode(ep?.payment_mode ?? "upi");
    setRemarks(ep?.remarks ?? "");
    setPaymentDate(ep?.payment_date ? new Date(ep.payment_date) : new Date());
  }, [open, retainer, existingPayment]);

  if (!retainer) return null;

  const expected = getMonthlyAmount(retainer);
  const received = Number(receivedAmount) || 0;
  const payStatus: "paid" | "partial" | "pending" =
    received <= 0 ? "pending" : received >= expected ? "paid" : "partial";

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onSave({
        retainerId:     retainer.id,
        paymentMonth:   `${selectedMonth}-01`,
        receivedAmount: received,
        paymentStatus:  payStatus,
        paymentDate:    paymentDate ? format(paymentDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        paymentMode,
        remarks,
        expectedAmount: expected,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const monthLabel = (() => {
    try { return format(new Date(`${selectedMonth}-01`), "MMMM yyyy"); } catch { return selectedMonth; }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-black text-base">Record Payment</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                {getClientName(retainer)} · {monthLabel}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Summary row */}
          <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wide">Client</span>
              <span className="font-semibold text-slate-700">{getClientName(retainer)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wide">Month</span>
              <span className="font-semibold text-slate-700">{monthLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wide">Expected</span>
              <span className="font-bold text-slate-900">{formatCurrency(expected)}</span>
            </div>
          </div>

          {/* Received Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Amount Received (₹)
            </Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                min="0"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder={String(expected)}
                className="pl-9 rounded-xl border-2 border-slate-200 focus:border-emerald-400 font-medium"
              />
            </div>
            {/* Status preview */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">Status preview:</span>
              <PaymentBadge status={payStatus} />
              {received > 0 && received < expected && (
                <span className="text-xs text-amber-600 font-medium">
                  ({formatCurrency(expected - received)} remaining)
                </span>
              )}
            </div>
          </div>

          {/* Payment Mode */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Mode</Label>
            <div className="flex gap-2">
              {[
                { value: "upi",           label: "UPI" },
                { value: "bank_transfer", label: "Bank" },
                { value: "cash",          label: "Cash" },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMode(m.value)}
                  className={cn(
                    "flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all",
                    paymentMode === m.value
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-400 hover:border-slate-300"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full justify-start text-left font-medium rounded-xl border-2 border-slate-200 hover:border-emerald-400 h-10"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-emerald-500" />
                  {paymentDate ? format(paymentDate, "dd MMM yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Remarks (optional)</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Partial payment received, balance by 5th..."
              className="rounded-xl border-2 border-slate-200 focus:border-emerald-400"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl border-2 border-slate-200 font-bold"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold shadow-lg shadow-emerald-200"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? "Saving..." : existingPayment ? "Update Payment" : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MONTHLY TRACKING TABLE ───────────────────────────────────────────────────

function MonthlyTrackingPanel({
  rows,
  summary,
  selectedMonth,
  onMarkPayment,
}: {
  rows:          MonthlyPaymentRow[];
  summary:       MonthlySummaryTotals | null;
  selectedMonth: string;
  onMarkPayment: (row: MonthlyPaymentRow) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.client_name.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        list = list.filter((r) => !r.payment_status || r.payment_status === "pending");
      } else {
        list = list.filter((r) => r.payment_status === statusFilter);
      }
    }
    return list;
  }, [rows, search, statusFilter]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3 flex-wrap">
        <div className="p-2 bg-emerald-50 rounded-xl">
          <Banknote className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 text-sm">Monthly Payment Tracker</div>
          <div className="text-gray-400 text-xs">Per-client payment status for selected month</div>
        </div>

        {/* Quick filters */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
            <Input
              placeholder="Search client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl border border-gray-200 h-8 text-xs w-40"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { value: "all",     label: "All",     count: rows.length },
              { value: "paid",    label: "Paid",    count: rows.filter((r) => r.payment_status === "paid").length },
              { value: "partial", label: "Partial", count: rows.filter((r) => r.payment_status === "partial").length },
              { value: "pending", label: "Pending", count: rows.filter((r) => !r.payment_status || r.payment_status === "pending").length },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === f.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.label}
                <span className={`ml-1 text-[10px] font-semibold ${statusFilter === f.value ? "text-blue-600" : "text-gray-400"}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[750px]">
          <TableHeader>
            <TableRow className="bg-gray-50/60 border-b border-gray-50">
              <TableHead className="text-xs font-semibold text-gray-400">Client</TableHead>
              <TableHead className="text-xs font-semibold text-gray-400">Service</TableHead>
              <TableHead className="text-xs font-semibold text-gray-400">Expected</TableHead>
              <TableHead className="text-xs font-semibold text-gray-400">Received</TableHead>
              <TableHead className="text-xs font-semibold text-gray-400">Mode</TableHead>
              <TableHead className="text-xs font-semibold text-gray-400">Payment Date</TableHead>
              <TableHead className="text-xs font-semibold text-gray-400">Status</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold text-gray-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <Banknote className="h-8 w-8 opacity-20" />
                    <span className="text-sm font-medium text-gray-400">
                      {search || statusFilter !== "all" ? "No clients match your filter." : "No active retainers for this month."}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => {
                const isPaid    = row.payment_status === "paid";
                const isPartial = row.payment_status === "partial";
                const received  = row.received_amount ?? 0;
                const expected  = row.expected_amount ?? 0;
                const pct       = expected > 0 ? Math.min(100, Math.round((received / expected) * 100)) : 0;

                return (
                  <TableRow
                    key={row.retainer_id}
                    className={cn(
                      "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                      !row.payment_status || row.payment_status === "pending"
                        ? "bg-amber-50/10"
                        : isPaid ? "bg-emerald-50/10" : ""
                    )}
                  >
                    {/* Client */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-blue-600">
                            {row.client_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate max-w-[120px]">
                            {row.client_name}
                          </div>
                          {row.phone && (
                            <div className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                              <Phone className="h-2.5 w-2.5" />{row.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Service */}
                    <TableCell className="py-3">
                      <span className="text-xs text-blue-700 font-medium bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                        {svcLabel(row.service)}
                      </span>
                    </TableCell>

                    {/* Expected */}
                    <TableCell className="py-3">
                      <div className="text-sm font-bold text-slate-700">
                        {formatCurrency(row.expected_amount)}
                      </div>
                    </TableCell>

                    {/* Received + progress bar */}
                    <TableCell className="py-3">
                      <div className="space-y-1.5">
                        <div className={`text-sm font-bold ${isPaid ? "text-emerald-700" : isPartial ? "text-amber-700" : "text-gray-400"}`}>
                          {received > 0 ? formatCurrency(received) : "—"}
                        </div>
                        {received > 0 && (
                          <div className="w-20">
                            <Progress
                              value={pct}
                              className={cn(
                                "h-1 bg-gray-100",
                                isPaid ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Mode */}
                    <TableCell className="py-3">
                      {row.payment_mode ? (
                        <span className="text-xs text-slate-600 font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg uppercase">
                          {row.payment_mode === "bank_transfer" ? "Bank" : row.payment_mode}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </TableCell>

                    {/* Payment Date */}
                    <TableCell className="py-3">
                      <span className="text-xs text-gray-600 font-medium">
                        {row.payment_date ? formatDate(row.payment_date) : "—"}
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3">
                      <PaymentBadge status={row.payment_status} />
                    </TableCell>

                    {/* Action */}
                    <TableCell className="py-3">
                      <Button
                        size="sm"
                        variant={isPaid ? "outline" : "default"}
                        className={cn(
                          "h-7 text-xs rounded-lg font-medium px-3",
                          isPaid
                            ? "border-gray-200 text-gray-500"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        )}
                        onClick={() => onMarkPayment(row)}
                      >
                        {isPaid ? "Edit" : isPartial ? "Update" : "Mark Paid"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer totals */}
      {filtered.length > 0 && summary && (
        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-gray-400">
            Showing <span className="font-semibold text-gray-600">{filtered.length}</span> clients
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-400">
              Expected: <span className="font-bold text-gray-700">{formatCurrency(filtered.reduce((s, r) => s + (r.expected_amount ?? 0), 0))}</span>
            </span>
            <span className="text-gray-400">
              Received: <span className="font-bold text-emerald-700">{formatCurrency(filtered.reduce((s, r) => s + (r.received_amount ?? 0), 0))}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, limit, onPageChange, onLimitChange,
}: {
  page: number; totalPages: number; total: number; limit: number;
  onPageChange: (p: number) => void; onLimitChange: (l: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>
          Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of{" "}
          <span className="font-semibold text-gray-700">{total}</span> retainers
        </span>
        <Select value={String(limit)} onValueChange={(v) => { onLimitChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-20 text-xs rounded-lg border border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 25, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => onPageChange(1)} disabled={page === 1}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => onPageChange(page - 1)} disabled={page === 1}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p: number;
          if (totalPages <= 5)             p = i + 1;
          else if (page <= 3)              p = i + 1;
          else if (page >= totalPages - 2) p = totalPages - 4 + i;
          else                             p = page - 2 + i;
          return (
            <Button key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className={cn("h-7 w-7 p-0 rounded-lg text-xs font-semibold", p === page && "bg-blue-600 border-blue-600 hover:bg-blue-700")}
              onClick={() => onPageChange(p)}
            >{p}</Button>
          );
        })}
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}><ChevronRight className="h-3.5 w-3.5" /></Button>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => onPageChange(totalPages)} disabled={page === totalPages}><ChevronsRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

// ─── ADVANCED FILTERS DRAWER ──────────────────────────────────────────────────

function FiltersDrawer({
  serviceFilter, setServiceFilter,
  renewalFilter, setRenewalFilter,
  phoneSearch,   setPhoneSearch,
  dateSort,      setDateSort,
  activeCount,   onClear,
}: {
  serviceFilter: string; setServiceFilter: (v: string) => void;
  renewalFilter: string; setRenewalFilter: (v: string) => void;
  phoneSearch:   string; setPhoneSearch:   (v: string) => void;
  dateSort:      string; setDateSort:      (v: string) => void;
  activeCount:   number; onClear:          () => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline" size="sm"
          className={cn(
            "h-9 rounded-xl border font-medium gap-2 text-sm",
            activeCount > 0
              ? "border-blue-500 bg-blue-50 text-blue-600"
              : "border-gray-200 text-gray-600"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 font-semibold text-gray-900">
            <SlidersHorizontal className="h-5 w-5 text-blue-600" />
            Filters
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5">

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="Search by phone..." value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl border border-gray-200 focus:border-blue-500" />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</label>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className={cn("h-9 rounded-xl border text-sm", serviceFilter !== "all" ? "border-blue-500 bg-blue-50" : "border-gray-200")}>
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {RETAINER_SERVICES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Renewal Due</label>
            <Select value={renewalFilter} onValueChange={setRenewalFilter}>
              <SelectTrigger className={cn("h-9 rounded-xl border text-sm", renewalFilter !== "all" ? "border-blue-500 bg-blue-50" : "border-gray-200")}>
                <SelectValue placeholder="Any Renewal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Renewal</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="this-week">Due This Week</SelectItem>
                <SelectItem value="this-month">Due This Month</SelectItem>
                <SelectItem value="upcoming">Upcoming (30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort by Renewal</label>
            <Select value={dateSort} onValueChange={setDateSort}>
              <SelectTrigger className={cn("h-9 rounded-xl border text-sm", dateSort !== "soonest" ? "border-blue-500 bg-blue-50" : "border-gray-200")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soonest">Soonest Renewal First</SelectItem>
                <SelectItem value="latest">Latest Renewal First</SelectItem>
                <SelectItem value="amount-high">Amount: High to Low</SelectItem>
                <SelectItem value="amount-low">Amount: Low to High</SelectItem>
                <SelectItem value="newest">Date Added: Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeCount > 0 && (
            <Button variant="outline"
              className="w-full rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium"
              onClick={onClear}>
              <X className="mr-2 h-4 w-4" />Clear All Filters ({activeCount})
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── RETAINER DETAIL SHEET ────────────────────────────────────────────────────

function RetainerDetailSheet({
  retainer, open, onClose, onEdit, onRenew, onWhatsApp, onCall,
}: {
  retainer:  Retainer | null;
  open:      boolean;
  onClose:   () => void;
  onEdit:    (r: Retainer) => void;
  onRenew:   (r: Retainer) => void;
  onWhatsApp:(r: Retainer) => void;
  onCall:    (r: Retainer) => void;
}) {
  if (!retainer) return null;

  const days      = getDaysToRenewal(getRenewalDate(retainer));
  const renewMeta = getRenewalMeta(days);
  const statusMeta= STATUS_META[retainer.status] ?? STATUS_META.active;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[460px] overflow-y-auto p-0">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm">
              <span className="text-xl font-black text-white">
                {getClientName(retainer).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white font-black text-lg truncate">{getClientName(retainer)}</div>
              <div className="text-blue-100 text-xs mt-0.5">{svcLabel(retainer.service)}</div>
            </div>
            <Button
              variant="ghost" size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Badge className={`${statusMeta.color} text-xs font-bold border`}>{statusMeta.label}</Badge>
            <Badge className={`${renewMeta.cls} text-xs font-bold border`}>
              {days < 0 ? "Expired" : `Renews in ${days} days`}
            </Badge>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Monthly Retainer</div>
              <div className="text-2xl font-black text-slate-900 leading-none mt-0.5">
                {formatCurrency(getMonthlyAmount(retainer))}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">per month</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2.5 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-white" />
              <span className="text-white font-black text-xs uppercase tracking-wide">Retainer Details</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "Client",       value: getClientName(retainer) },
                { label: "Service",      value: svcLabel(retainer.service) },
                { label: "Start Date",   value: formatDate(getStartDate(retainer)) },
                { label: "Renewal Date", value: formatDate(getRenewalDate(retainer)) },
                { label: "Phone",        value: retainer.phone || "—" },
                { label: "WhatsApp",     value: retainer.whatsappNumber || "—" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                </div>
              ))}
              {retainer.notes && (
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Notes</div>
                  <div className="text-sm text-slate-700 bg-slate-50 border-2 border-slate-100 p-3 rounded-xl">{retainer.notes}</div>
                </div>
              )}
            </div>
          </div>

          {renewMeta.urgent && (
            <div className="flex items-center gap-3 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <div>
                <div className="text-sm font-bold text-red-700">
                  {days < 0 ? "Renewal Overdue" : "Renewal Due Soon"}
                </div>
                <div className="text-xs text-red-600 mt-0.5">
                  {days < 0
                    ? `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago.`
                    : `Renews in ${days} day${days !== 1 ? "s" : ""}.`}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button className="w-full justify-start text-sm h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => onRenew(retainer)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Renew Retainer
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9 rounded-xl border-2 border-slate-200 font-semibold" onClick={() => onEdit(retainer)}>
              <Edit className="mr-2 h-3.5 w-3.5 text-blue-500" /> Edit Details
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start text-xs h-9 rounded-xl border-2 border-slate-200 font-semibold" onClick={() => onCall(retainer)}>
                <Phone className="mr-2 h-3.5 w-3.5 text-blue-500" /> Call
              </Button>
              <Button variant="outline" size="sm" className="justify-start text-xs h-9 rounded-xl border-2 border-green-200 bg-green-50 text-green-700 font-semibold" onClick={() => onWhatsApp(retainer)}>
                <MessageSquare className="mr-2 h-3.5 w-3.5" /> WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── ADD / EDIT DIALOG ────────────────────────────────────────────────────────

interface RetainerFormState {
  clientName:    string;
  service:       string;
  monthlyAmount: string;
  startDate:     Date | undefined;
  renewalDate:   Date | undefined;
  status:        "active" | "inactive" | "expired";
  phone:         string;
  whatsappNumber:string;
  notes:         string;
}

const DEFAULT_FORM: RetainerFormState = {
  clientName:     "",
  service:        "",
  monthlyAmount:  "",
  startDate:      undefined,
  renewalDate:    undefined,
  status:         "active",
  phone:          "",
  whatsappNumber: "",
  notes:          "",
};

function RetainerDialog({
  open, onOpenChange, retainer, mode, onSave,
}: {
  open:         boolean;
  onOpenChange: (o: boolean) => void;
  retainer:     Retainer | null;
  mode:         "add" | "edit";
  onSave:       (data: Partial<Retainer>) => Promise<void>;
}) {
  const [form,       setForm]       = useState<RetainerFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (retainer && mode === "edit") {
      const startRaw   = getStartDate(retainer);
      const renewalRaw = getRenewalDate(retainer);
      setForm({
        clientName:    getClientName(retainer),
        service:       retainer.service ?? "",
        monthlyAmount: String(getMonthlyAmount(retainer) || ""),
        startDate:     startRaw   ? new Date(startRaw)   : undefined,
        renewalDate:   renewalRaw ? new Date(renewalRaw) : undefined,
        status:        retainer.status ?? "active",
        phone:         retainer.phone         ?? "",
        whatsappNumber:retainer.whatsappNumber ?? "",
        notes:         retainer.notes         ?? "",
      });
    } else {
      const today = new Date();
      setForm({ ...DEFAULT_FORM, startDate: today, renewalDate: addMonths(today, 1) });
    }
    setError(null);
  }, [open, retainer, mode]);

  const set = (field: keyof RetainerFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleStartDateChange = (date: Date | undefined) => {
    setForm((p) => ({
      ...p,
      startDate:   date,
      renewalDate: date && mode === "add" ? addMonths(date, 1) : p.renewalDate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clientName = form.clientName.trim();
    if (!clientName)      { setError("Client name is required."); return; }
    if (!form.service)    { setError("Please select a service."); return; }
    if (!form.monthlyAmount || Number(form.monthlyAmount) <= 0) { setError("Monthly amount must be greater than 0."); return; }
    if (!form.startDate)   { setError("Start date is required."); return; }
    if (!form.renewalDate) { setError("Renewal date is required."); return; }

    const payload: Partial<Retainer> = {
      clientName,
      service:       form.service,
      monthlyAmount: Number(form.monthlyAmount),
      startDate:     form.startDate.toISOString().slice(0, 10),
      renewalDate:   form.renewalDate.toISOString().slice(0, 10),
      status:        form.status,
      phone:         form.phone      || undefined,
      whatsappNumber:form.whatsappNumber || undefined,
      notes:         form.notes      || undefined,
    };

    setSubmitting(true);
    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-500 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <RefreshCw className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-black text-lg">
                {mode === "add" ? "Add New Retainer" : "Edit Retainer"}
              </DialogTitle>
              <DialogDescription className="text-blue-100 text-xs mt-0.5">
                {mode === "add" ? "Add a monthly recurring client subscription." : "Update retainer details."}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-blue-500 rounded-full" />
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Client Details</h3>
              <div className="flex-1 h-0.5 bg-slate-100 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Client Name <span className="text-red-500">*</span></Label>
                <Input value={form.clientName} onChange={set("clientName")} placeholder="e.g. Nordica, Eion Rides" className="rounded-xl border-2 border-slate-200 focus:border-blue-400 font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Phone</Label>
                <Input value={form.phone} onChange={set("phone")} placeholder="+91 XXXXX XXXXX" className="rounded-xl border-2 border-slate-200 focus:border-blue-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">WhatsApp</Label>
                <Input value={form.whatsappNumber} onChange={set("whatsappNumber")} placeholder="Same as phone" className="rounded-xl border-2 border-slate-200 focus:border-blue-400" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-indigo-500 rounded-full" />
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Service & Amount</h3>
              <div className="flex-1 h-0.5 bg-slate-100 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Service <span className="text-red-500">*</span></Label>
                <Select value={form.service} onValueChange={(v) => setForm((p) => ({ ...p, service: v }))}>
                  <SelectTrigger className="rounded-xl border-2 border-slate-200 focus:border-indigo-400 h-10">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-500" />
                      <SelectValue placeholder="Select service" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {RETAINER_SERVICES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Monthly Amount (₹) <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="number" min="0" value={form.monthlyAmount} onChange={set("monthlyAmount")} placeholder="e.g. 3500" className="pl-9 rounded-xl border-2 border-slate-200 focus:border-green-400 font-medium" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-green-500 rounded-full" />
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Dates & Status</h3>
              <div className="flex-1 h-0.5 bg-slate-100 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Start Date <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className={cn("w-full justify-start text-left font-medium rounded-xl border-2 border-slate-200 hover:border-blue-400 h-10", !form.startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                      {form.startDate ? format(form.startDate, "dd MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.startDate} onSelect={handleStartDateChange} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Renewal Date <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className={cn("w-full justify-start text-left font-medium rounded-xl border-2 border-slate-200 hover:border-blue-400 h-10", !form.renewalDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                      {form.renewalDate ? format(form.renewalDate, "dd MMM yyyy") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.renewalDate} onSelect={(d) => setForm((p) => ({ ...p, renewalDate: d }))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Status</Label>
              <div className="flex gap-2">
                {(["active", "inactive", "expired"] as const).map((s) => {
                  const m = STATUS_META[s];
                  return (
                    <button key={s} type="button" onClick={() => setForm((p) => ({ ...p, status: s }))}
                      className={cn("flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all", form.status === s ? `${m.color} border-current` : "border-slate-200 text-slate-400 hover:border-slate-300")}>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</Label>
            <Textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Service details, special terms, renewal notes..." className="rounded-xl border-2 border-slate-200 focus:border-blue-400 resize-none" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border-2 border-red-200 p-3 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span role="alert">{error}</span>
            </div>
          )}

          <DialogFooter className="gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-xl border-2 border-slate-200 font-bold px-6">Cancel</Button>
            <Button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold px-6 shadow-lg shadow-blue-200">
              {submitting ? "Saving..." : mode === "add" ? "Add Retainer" : "Update Retainer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── RENEW DIALOG ─────────────────────────────────────────────────────────────

function RenewDialog({
  open, onOpenChange, retainer, onConfirm,
}: {
  open:         boolean;
  onOpenChange: (o: boolean) => void;
  retainer:     Retainer | null;
  onConfirm:    (id: string, newRenewalDate: string) => Promise<void>;
}) {
  const [newDate,    setNewDate]    = useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !retainer) return;
    const current = getRenewalDate(retainer);
    const base = current ? new Date(current) : new Date();
    const defaultNext = isBefore(base, new Date()) ? addMonths(new Date(), 1) : addMonths(base, 1);
    setNewDate(defaultNext);
  }, [open, retainer]);

  if (!retainer) return null;

  const handleConfirm = async () => {
    if (!newDate) return;
    setSubmitting(true);
    try {
      await onConfirm(retainer.id, newDate.toISOString().slice(0, 10));
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border-0 shadow-2xl p-0">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <RefreshCw className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-black text-base">Renew Retainer</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                {getClientName(retainer)} · {svcLabel(retainer.service)}
              </DialogDescription>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wide">Current Renewal</span>
              <span className="font-semibold text-slate-700">{formatDate(getRenewalDate(retainer))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wide">Monthly Amount</span>
              <span className="font-bold text-emerald-700">{formatCurrency(getMonthlyAmount(retainer))}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">New Renewal Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" type="button" className={cn("w-full justify-start text-left font-medium rounded-xl border-2 border-slate-200 hover:border-emerald-400 h-10", !newDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4 text-emerald-500" />
                  {newDate ? format(newDate, "dd MMM yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={newDate} onSelect={setNewDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl border-2 border-slate-200 font-bold" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold shadow-lg shadow-emerald-200" onClick={handleConfirm} disabled={!newDate || submitting}>
            {submitting ? "Renewing..." : "Confirm Renewal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── UPCOMING RENEWALS SIDEBAR ────────────────────────────────────────────────

function UpcomingRenewals({
  retainers,
  paymentByRetainerId,
}: {
  retainers:           Retainer[];
  paymentByRetainerId: Map<string, MonthlyPaymentRow>;
}) {
  // Show ALL active retainers due within 30 days, sorted by urgency
  const upcoming = useMemo(() => {
    return retainers
      .filter((r) => r.status === "active")
      .map((r) => ({ ...r, _days: getDaysToRenewal(getRenewalDate(r)) }))
      .filter((r) => r._days <= RENEWAL_WARN_DAYS)
      .sort((a, b) => a._days - b._days)
      .slice(0, 10);
  }, [retainers]);

  const totalMrr = retainers
    .filter((r) => r.status === "active")
    .reduce((s, r) => s + getMonthlyAmount(r), 0);

  // Count paid vs pending for the mini summary
  const paidThisMonth  = upcoming.filter((r) => paymentByRetainerId.get(r.id)?.payment_status === "paid").length;
  const pendingCount   = upcoming.length - paidThisMonth;

  return (
    <div className="w-64 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[640px]">

      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="p-1.5 bg-amber-50 rounded-lg shrink-0">
          <Bell className="h-3.5 w-3.5 text-amber-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900">Upcoming Renewals</div>
          <div className="text-[10px] text-gray-400">Next 30 days</div>
        </div>
      </div>

      {/* MRR + mini payment summary */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">
          Monthly Recurring Revenue
        </div>
        <div className="text-xl font-black text-emerald-700">{formatCurrency(totalMrr)}</div>
        {upcoming.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              {paidThisMonth} paid
            </span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {pendingCount} pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* Renewal cards list */}
      <div className="p-3 flex flex-col gap-2 flex-1 overflow-y-auto">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CheckCircle2 className="h-9 w-9 text-gray-200" />
            <p className="text-xs font-medium text-gray-400 text-center">
              No renewals due in the next 30 days
            </p>
          </div>
        ) : (
          upcoming.map((r) => {
            const renewMeta    = getRenewalMeta(r._days);
            const payRow       = paymentByRetainerId.get(r.id);
            const payStatus    = payRow?.payment_status ?? null;
            const isPaid       = payStatus === "paid";
            const isPartial    = payStatus === "partial";

            return (
              <div
                key={r.id}
                className={cn(
                  "p-2.5 rounded-xl border transition-colors",
                  isPaid
                    ? "border-emerald-100 bg-emerald-50/40"
                    : renewMeta.urgent
                    ? "border-red-100 bg-red-50/40"
                    : "border-amber-100 bg-amber-50/30"
                )}
              >
                {/* Row 1: name + status badge */}
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <div className="font-semibold text-xs text-slate-800 truncate leading-tight flex-1">
                    {getClientName(r)}
                  </div>
                  {/* Payment badge — takes priority over renewal urgency */}
                  {isPaid ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                    </span>
                  ) : isPartial ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                      Partial
                    </span>
                  ) : (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${renewMeta.cls} shrink-0`}>
                      {r._days < 0 ? "Overdue" : `${r._days}d`}
                    </span>
                  )}
                </div>

                {/* Row 2: service */}
                <div className="text-[10px] text-slate-500 truncate">{svcLabel(r.service)}</div>

                {/* Row 3: renewal date + amount */}
                <div className="flex items-center justify-between mt-1.5">
                  <div className="text-[10px] text-slate-400 truncate">
                    {formatDate(getRenewalDate(r))}
                  </div>
                  <div className={cn(
                    "text-xs font-bold shrink-0",
                    isPaid ? "text-emerald-600" : "text-slate-700"
                  )}>
                    {formatCurrency(getMonthlyAmount(r))}
                  </div>
                </div>

                {/* Row 4: partial amount note */}
                {isPartial && payRow?.received_amount != null && (
                  <div className="mt-1 text-[10px] text-amber-600 font-medium">
                    {formatCurrency(payRow.received_amount)} received
                    {" · "}{formatCurrency((payRow.expected_amount ?? getMonthlyAmount(r)) - payRow.received_amount)} pending
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function RetainersContent() {
  const {
    retainers = [] as Retainer[],
    addRetainer,
    updateRetainer,
    deleteRetainer,
    refreshRetainers,
  } = useCRM() as any;

  const safeRetainers: Retainer[] = Array.isArray(retainers) ? retainers : [];

  // ── Active view tab ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"retainers" | "payments">("retainers");

  // ── Month selector for payment tracking ──────────────────────────────────
  const [selectedMonth,       setSelectedMonth]       = useState<string>(format(new Date(), "yyyy-MM"));
  const [monthlyRows,         setMonthlyRows]         = useState<MonthlyPaymentRow[]>([]);
  const [monthlySummary,      setMonthlySummary]      = useState<MonthlySummaryTotals | null>(null);
  const [loadingMonthly,      setLoadingMonthly]      = useState(false);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [searchTerm,     setSearchTerm]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState<string>("all");
  const [serviceFilter,  setServiceFilter]  = useState<string>("all");
  const [renewalFilter,  setRenewalFilter]  = useState<string>("all");
  const [phoneSearch,    setPhoneSearch]    = useState<string>("");
  const [dateSort,       setDateSort]       = useState<string>("soonest");

  const debouncedSearch = useDebounce(searchTerm.trim().toLowerCase(), 350);
  const debouncedPhone  = useDebounce(phoneSearch.trim(), 350);

  // ── Pagination ───────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit,   setPageLimit]   = useState(10);

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [selectedRetainer,  setSelectedRetainer]  = useState<Retainer | null>(null);
  const [isAddOpen,         setIsAddOpen]         = useState(false);
  const [isEditOpen,        setIsEditOpen]        = useState(false);
  const [isRenewOpen,       setIsRenewOpen]       = useState(false);
  const [isDetailOpen,      setIsDetailOpen]      = useState(false);

  // ── Payment dialog ───────────────────────────────────────────────────────
  const [isPaymentOpen,     setIsPaymentOpen]     = useState(false);
  const [paymentRetainer,   setPaymentRetainer]   = useState<Retainer | null>(null);
  const [existingPayment,   setExistingPayment]   = useState<MonthlyPaymentRow | null>(null);

  const refreshRef = useRef(refreshRetainers);
  useEffect(() => { refreshRef.current = refreshRetainers; }, [refreshRetainers]);

  // ── Fetch monthly payment summary ────────────────────────────────────────
  // Uses the same apiRequest wrapper as the rest of the app (auth_token key,
  // base URL from NEXT_PUBLIC_API_URL) instead of raw fetch.
  const fetchMonthlySummary = useCallback(async (month: string) => {
    setLoadingMonthly(true);
    try {
      const token = getAuthToken();
      const base  = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api";
      const res   = await fetch(
        `${base}/retainers/payments/summary?month=${month}`,
        { headers: { Authorization: `Bearer ${token ?? ""}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setMonthlyRows(data.retainers || []);
        setMonthlySummary(data.summary  || null);
      }
    } catch (err) {
      console.error("Failed to fetch monthly summary:", err);
    } finally {
      setLoadingMonthly(false);
    }
  }, []);

  // Fetch when month changes or when payment tab is opened
  useEffect(() => {
    if (activeTab === "payments") {
      void fetchMonthlySummary(selectedMonth);
    }
  }, [selectedMonth, activeTab, fetchMonthlySummary]);

  // Also fetch on retainers tab (for the payment column in the main table)
  useEffect(() => {
    void fetchMonthlySummary(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // ── Build a payment lookup map by retainer_id ────────────────────────────
  const paymentByRetainerId = useMemo(() => {
    const map = new Map<string, MonthlyPaymentRow>();
    monthlyRows.forEach((row) => map.set(row.retainer_id, row));
    return map;
  }, [monthlyRows]);

  // ── Filtering & sorting ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...safeRetainers];
    if (debouncedSearch) {
      list = list.filter((r) => getClientName(r).toLowerCase().includes(debouncedSearch));
    }
    if (debouncedPhone) {
      list = list.filter((r) =>
        (r.phone ?? "").includes(debouncedPhone) || (r.whatsappNumber ?? "").includes(debouncedPhone)
      );
    }
    if (statusFilter !== "all")  list = list.filter((r) => r.status === statusFilter);
    if (serviceFilter !== "all") list = list.filter((r) => r.service === serviceFilter);
    if (renewalFilter !== "all") {
      list = list.filter((r) => {
        const days = getDaysToRenewal(getRenewalDate(r));
        if (renewalFilter === "expired")    return days < 0;
        if (renewalFilter === "this-week")  return days >= 0 && days <= 7;
        if (renewalFilter === "this-month") return days >= 0 && days <= 30;
        if (renewalFilter === "upcoming")   return days >= 0 && days <= 30;
        return true;
      });
    }
    list.sort((a, b) => {
      if (dateSort === "soonest")      return getDaysToRenewal(getRenewalDate(a)) - getDaysToRenewal(getRenewalDate(b));
      if (dateSort === "latest")       return getDaysToRenewal(getRenewalDate(b)) - getDaysToRenewal(getRenewalDate(a));
      if (dateSort === "amount-high")  return getMonthlyAmount(b) - getMonthlyAmount(a);
      if (dateSort === "amount-low")   return getMonthlyAmount(a) - getMonthlyAmount(b);
      if (dateSort === "newest")       return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      return 0;
    });
    return list;
  }, [safeRetainers, debouncedSearch, debouncedPhone, statusFilter, serviceFilter, renewalFilter, dateSort]);

  const paginated  = useMemo(() => {
    const start = (currentPage - 1) * pageLimit;
    return filtered.slice(start, start + pageLimit);
  }, [filtered, currentPage, pageLimit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageLimit));

  useEffect(() => { setCurrentPage(1); },
    [debouncedSearch, debouncedPhone, statusFilter, serviceFilter, renewalFilter, dateSort]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active       = safeRetainers.filter((r) => r.status === "active");
    const mrr          = active.reduce((s, r) => s + getMonthlyAmount(r), 0);
    const expiringSoon = active.filter((r) => { const d = getDaysToRenewal(getRenewalDate(r)); return d >= 0 && d <= RENEWAL_WARN_DAYS; }).length;
    const expired      = safeRetainers.filter((r) => { const d = getDaysToRenewal(getRenewalDate(r)); return d < 0 && r.status !== "inactive"; }).length;
    return { total: safeRetainers.length, active: active.length, mrr, expiringSoon, expired };
  }, [safeRetainers]);

  const advancedFilterCount = useMemo(() => {
    let n = 0;
    if (phoneSearch.trim()) n++;
    if (serviceFilter !== "all") n++;
    if (renewalFilter !== "all") n++;
    if (dateSort !== "soonest") n++;
    return n;
  }, [phoneSearch, serviceFilter, renewalFilter, dateSort]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm(""); setStatusFilter("all"); setServiceFilter("all");
    setRenewalFilter("all"); setPhoneSearch(""); setDateSort("soonest"); setCurrentPage(1);
  }, []);

  // ── CRUD handlers ────────────────────────────────────────────────────────
  const handleAdd    = useCallback(async (data: Partial<Retainer>) => { await addRetainer(data); void refreshRef.current?.(); }, [addRetainer]);
  const handleEdit   = useCallback(async (data: Partial<Retainer>) => { if (!selectedRetainer) return; await updateRetainer(selectedRetainer.id, data); void refreshRef.current?.(); }, [updateRetainer, selectedRetainer]);
  const handleDelete = useCallback((id: string) => { if (!window.confirm("Delete this retainer? This cannot be undone.")) return; void deleteRetainer(id).then(() => refreshRef.current?.()); }, [deleteRetainer]);
  const handleStatusChange = useCallback(async (id: string, status: Retainer["status"]) => { await updateRetainer(id, { status }); void refreshRef.current?.(); }, [updateRetainer]);
  // Uses POST /retainers/:id/renew (dedicated endpoint) — not PUT — so the
  // backend can write a renewal log entry and force status = 'active'.
  const handleRenew = useCallback(async (id: string, newRenewalDate: string) => {
    await retainersApi.renew(id, newRenewalDate);
    void refreshRef.current?.();
  }, []);

  // ── Payment handlers ─────────────────────────────────────────────────────
  const handleOpenPayment = useCallback((row: MonthlyPaymentRow) => {
    const retainer = safeRetainers.find((r) => r.id === row.retainer_id);
    if (!retainer) return;
    setPaymentRetainer(retainer);
    setExistingPayment(row.payment_status ? row : null);
    setIsPaymentOpen(true);
  }, [safeRetainers]);

  const handleOpenPaymentFromTable = useCallback((retainer: Retainer) => {
    const existingRow = paymentByRetainerId.get(retainer.id) ?? null;
    setPaymentRetainer(retainer);
    setExistingPayment(existingRow?.payment_status ? existingRow : null);
    setIsPaymentOpen(true);
  }, [paymentByRetainerId]);

  const handleSavePayment = useCallback(async (data: {
    retainerId: string; paymentMonth: string; receivedAmount: number;
    paymentStatus: string; paymentDate: string; paymentMode: string;
    remarks: string; expectedAmount: number;
  }) => {
    const existing = monthlyRows.find(
      (r) => r.retainer_id === data.retainerId && r.payment_status,
    );

    if (existing?.payment_id) {
      // Update — PUT /retainers/:retainerId/payments/:paymentId
      await retainersApi.updatePayment(existing.payment_id, {
        retainerId:     data.retainerId,   // needed to build the nested URL
        receivedAmount: data.receivedAmount,
        paymentStatus:  data.paymentStatus,
        paymentDate:    data.paymentDate,
        paymentMode:    data.paymentMode,
        remarks:        data.remarks,
        expectedAmount: data.expectedAmount,
      });
    } else {
      // Create — POST /retainers/:retainerId/payments
      // retainersApi.createPayment posts to /retainer-payments, but the
      // backend payment route is nested under the retainer — so we call
      // getPayments' sibling endpoint via retainersApi.createPayment which
      // already sends to /retainer-payments.  Pass retainerId so the backend
      // can associate the record.
      await retainersApi.createPayment({
        retainerId:     data.retainerId,
        paymentMonth:   data.paymentMonth,
        receivedAmount: data.receivedAmount,
        paymentStatus:  data.paymentStatus,
        paymentDate:    data.paymentDate,
        paymentMode:    data.paymentMode,
        remarks:        data.remarks,
        expectedAmount: data.expectedAmount,
      });
    }

    // Re-fetch the monthly summary so KPI cards + table both update
    await fetchMonthlySummary(selectedMonth);
  }, [monthlyRows, selectedMonth, fetchMonthlySummary]);

  // ── Communication helpers ────────────────────────────────────────────────
  const callClient = (r: Retainer) => { const n = r.phone || r.whatsappNumber; if (n) window.open(`tel:${n}`, "_self"); };
  const waClient   = (r: Retainer) => {
    const n = r.whatsappNumber || r.phone;
    if (!n) return;
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(`Hi ${getClientName(r)}, following up on your Vasifytech retainer for ${svcLabel(r.service)}.`)}`, "_blank", "noopener,noreferrer");
  };

  const MONTHS = useMemo(() => getLast12Months(), []);

  const monthLabel = useMemo(() => {
    try { return format(new Date(`${selectedMonth}-01`), "MMMM yyyy"); } catch { return selectedMonth; }
  }, [selectedMonth]);

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Retainer Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {stats.active} active retainer{stats.active !== 1 ? "s" : ""} · MRR {formatCurrency(stats.mrr)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month selector — always visible */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm font-medium text-gray-700 focus:ring-0 w-36 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Add Retainer
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">

        {/* ── Retainer Stat Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Active Retainers" value={stats.active} iconBg="bg-green-50" icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
          <StatCard
            label="Monthly Recurring Revenue"
            value={stats.mrr >= 100000 ? `₹${(stats.mrr / 100000).toFixed(1)}L` : formatCurrency(stats.mrr)}
            iconBg="bg-blue-50"
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          />
          <StatCard
            label="Renewing Soon (30d)"
            value={stats.expiringSoon}
            iconBg={stats.expiringSoon > 0 ? "bg-amber-50" : "bg-gray-50"}
            icon={<Clock className={`h-5 w-5 ${stats.expiringSoon > 0 ? "text-amber-500" : "text-gray-400"}`} />}
            alert={stats.expiringSoon > 0}
          />
          <StatCard
            label="Expired / Overdue"
            value={stats.expired}
            iconBg={stats.expired > 0 ? "bg-red-50" : "bg-gray-50"}
            icon={<AlertCircle className={`h-5 w-5 ${stats.expired > 0 ? "text-red-500" : "text-gray-400"}`} />}
            alert={stats.expired > 0}
          />
        </div>

        {/* ── Monthly Payment KPI Cards ────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-gray-700">Payment Summary</span>
            <span className="text-xs text-gray-400 font-normal">— {monthLabel}</span>
            {loadingMonthly ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                <span className="h-2.5 w-2.5 animate-spin rounded-full border border-gray-300 border-t-emerald-500 shrink-0" />
                Updating…
              </span>
            ) : monthlySummary && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {monthlySummary.paidCount} of {monthlySummary.total} paid
              </span>
            )}
          </div>
          <MonthlyPaymentKPIs summary={monthlySummary} selectedMonth={selectedMonth} />
        </div>

        {/* ── Tab switcher ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { key: "retainers", label: "Retainers",       icon: <RefreshCw className="h-3.5 w-3.5" /> },
            { key: "payments",  label: "Payment Tracker", icon: <Banknote  className="h-3.5 w-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── RETAINERS TAB ────────────────────────────────────────────── */}
        {activeTab === "retainers" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">Monthly Retainer Clients</div>
                <div className="text-gray-400 text-xs">WhatsApp · Website · CRM · LMS · Digital Marketing</div>
              </div>
              <div className="ml-auto shrink-0 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
                {safeRetainers.length} total
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {/* Filters row */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Search by client name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-9 rounded-xl border border-gray-200 focus:border-blue-500 h-9 text-sm" />
                  {searchTerm && (
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearchTerm("")}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0 overflow-x-auto">
                  {[
                    { value: "all",      label: "All",      count: safeRetainers.length },
                    { value: "active",   label: "Active",   count: safeRetainers.filter((r) => r.status === "active").length },
                    { value: "inactive", label: "Inactive", count: safeRetainers.filter((r) => r.status === "inactive").length },
                    { value: "expired",  label: "Expired",  count: safeRetainers.filter((r) => r.status === "expired").length },
                  ].map((f) => (
                    <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${statusFilter === f.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                      {f.label}
                      <span className={`ml-1.5 text-[10px] font-semibold ${statusFilter === f.value ? "text-blue-600" : "text-gray-400"}`}>{f.count}</span>
                    </button>
                  ))}
                </div>
                <FiltersDrawer
                  serviceFilter={serviceFilter} setServiceFilter={setServiceFilter}
                  renewalFilter={renewalFilter} setRenewalFilter={setRenewalFilter}
                  phoneSearch={phoneSearch}     setPhoneSearch={setPhoneSearch}
                  dateSort={dateSort}           setDateSort={setDateSort}
                  activeCount={advancedFilterCount} onClear={clearAllFilters}
                />
              </div>

              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400">{filtered.length} of {safeRetainers.length} retainers</span>
                  {(searchTerm || statusFilter !== "all" || advancedFilterCount > 0) && (
                    <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-full transition-colors">
                      <X className="h-3 w-3" />Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Table + Sidebar */}
              <div className="flex gap-4 items-start">
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <Table className="min-w-[1000px]">
                        <TableHeader>
                          <TableRow className="bg-gray-50/60 border-b border-gray-50">
                            <TableHead className="text-xs font-semibold text-gray-400">Client</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400">Service</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400">Monthly Amt</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400">Start Date</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400">Renewal Date</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400">Days Left</TableHead>
                            {/* ─ NEW: Payment column ─ */}
                            <TableHead className="text-xs font-semibold text-gray-400">
                              <div className="flex items-center gap-1">
                                <span>{monthLabel}</span>
                                <span className="text-[10px] text-gray-300 font-normal">payment</span>
                              </div>
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400">Status</TableHead>
                            <TableHead className="w-[48px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginated.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-16 text-gray-400">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center">
                                    <RefreshCw className="h-7 w-7 opacity-40" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-500">
                                    {searchTerm || advancedFilterCount > 0 ? "No retainers match your filters." : "No retainers yet. Add your first recurring client!"}
                                  </span>
                                  {(searchTerm || advancedFilterCount > 0) && (
                                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="rounded-xl text-xs font-medium border-gray-200">
                                      <X className="mr-1.5 h-3 w-3" />Clear all filters
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : paginated.map((retainer) => {
                            const days      = getDaysToRenewal(getRenewalDate(retainer));
                            const renewMeta = getRenewalMeta(days);
                            const alertRow  = days < 0 || days <= RENEWAL_ALERT_DAYS;
                            const payRow    = paymentByRetainerId.get(retainer.id);
                            const payStatus = payRow?.payment_status ?? null;

                            return (
                              <TableRow
                                key={retainer.id}
                                className={cn(
                                  "hover:bg-gray-50/60 cursor-pointer border-b border-gray-50 transition-colors",
                                  alertRow && retainer.status === "active" && "bg-red-50/10"
                                )}
                                onDoubleClick={() => { setSelectedRetainer(retainer); setIsDetailOpen(true); }}
                              >
                                {/* Client */}
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                      <span className="text-xs font-semibold text-blue-600">
                                        {getClientName(retainer).charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-sm text-gray-900 truncate max-w-[130px]">{getClientName(retainer)}</div>
                                      {retainer.phone && (
                                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                          <Phone className="h-3 w-3 shrink-0" />{retainer.phone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Service */}
                                <TableCell className="py-3">
                                  <span className="text-xs text-blue-700 font-medium bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                    {svcLabel(retainer.service)}
                                  </span>
                                </TableCell>

                                {/* Monthly Amount */}
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-1 text-sm font-bold text-emerald-700">
                                    <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                                    {getMonthlyAmount(retainer) > 0 ? Number(getMonthlyAmount(retainer)).toLocaleString("en-IN") : "—"}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5">/ month</div>
                                </TableCell>

                                {/* Start Date */}
                                <TableCell className="py-3">
                                  <div className="text-xs text-gray-600 font-medium whitespace-nowrap">{formatDate(getStartDate(retainer))}</div>
                                </TableCell>

                                {/* Renewal Date */}
                                <TableCell className="py-3">
                                  <div className="text-xs text-gray-600 font-medium whitespace-nowrap">{formatDate(getRenewalDate(retainer))}</div>
                                </TableCell>

                                {/* Days Left */}
                                <TableCell className="py-3">
                                  {retainer.status === "inactive" ? (
                                    <span className="text-xs text-gray-400">Inactive</span>
                                  ) : (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${renewMeta.cls}`}>
                                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}
                                    </span>
                                  )}
                                </TableCell>

                                {/* Payment column — shows current month payment status.
                                    Clicking "Record" / "Update" opens the payment dialog. */}
                                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                                  {retainer.status !== "active" ? (
                                    <span className="text-xs text-gray-300">—</span>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <PaymentBadge status={payStatus} />
                                      </div>
                                      {/* Received amount on paid/partial */}
                                      {(payStatus === "paid" || payStatus === "partial") && payRow?.received_amount != null && (
                                        <div className={cn(
                                          "text-[10px] font-semibold",
                                          payStatus === "paid" ? "text-emerald-600" : "text-amber-600"
                                        )}>
                                          {formatCurrency(payRow.received_amount)}
                                        </div>
                                      )}
                                      {/* Action link for unpaid / partial */}
                                      {payStatus !== "paid" && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenPaymentFromTable(retainer)}
                                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline text-left w-fit"
                                        >
                                          {payStatus === "partial" ? "↑ Update" : "+ Record"}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </TableCell>

                                {/* Retainer Status */}
                                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                                  <InlineStatusDropdown retainer={retainer} onChange={handleStatusChange} />
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button type="button" variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-400">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border border-gray-100 shadow-lg w-48">
                                      <DropdownMenuLabel className="text-xs text-gray-400">Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => { setSelectedRetainer(retainer); setIsDetailOpen(true); }} className="text-sm rounded-lg">
                                        <Eye className="mr-2 h-4 w-4" />View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setSelectedRetainer(retainer); setIsEditOpen(true); }} className="text-sm rounded-lg">
                                        <Edit className="mr-2 h-4 w-4" />Edit Retainer
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { setSelectedRetainer(retainer); setIsRenewOpen(true); }} className="text-sm rounded-lg">
                                        <RefreshCw className="mr-2 h-4 w-4" />Renew
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {/* ─ NEW: Record Payment menu item ─ */}
                                      <DropdownMenuItem onClick={() => handleOpenPaymentFromTable(retainer)} className="text-sm rounded-lg text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50">
                                        <CreditCard className="mr-2 h-4 w-4" />Record Payment
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => callClient(retainer)} className="text-sm rounded-lg">
                                        <Phone className="mr-2 h-4 w-4" />Call
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => waClient(retainer)} className="text-sm rounded-lg">
                                        <MessageSquare className="mr-2 h-4 w-4" />WhatsApp
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDelete(retainer.id)} className="text-sm text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg">
                                        <Trash2 className="mr-2 h-4 w-4" />Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <Pagination
                    page={currentPage} totalPages={totalPages}
                    total={filtered.length} limit={pageLimit}
                    onPageChange={setCurrentPage} onLimitChange={setPageLimit}
                  />
                </div>

                {/* Upcoming Renewals sidebar — receives live payment map so cards
                    update instantly after marking paid, without a full page refresh */}
                <div className="shrink-0 sticky top-4">
                  <UpcomingRenewals
                    retainers={safeRetainers}
                    paymentByRetainerId={paymentByRetainerId}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PAYMENT TRACKER TAB ──────────────────────────────────────── */}
        {activeTab === "payments" && (
          <MonthlyTrackingPanel
            rows={monthlyRows}
            summary={monthlySummary}
            selectedMonth={selectedMonth}
            onMarkPayment={handleOpenPayment}
          />
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <RetainerDialog open={isAddOpen} onOpenChange={setIsAddOpen} retainer={null} mode="add" onSave={handleAdd} />
      <RetainerDialog open={isEditOpen} onOpenChange={setIsEditOpen} retainer={selectedRetainer} mode="edit" onSave={handleEdit} />
      <RenewDialog open={isRenewOpen} onOpenChange={setIsRenewOpen} retainer={selectedRetainer} onConfirm={handleRenew} />
      <RetainerDetailSheet
        retainer={selectedRetainer} open={isDetailOpen} onClose={() => setIsDetailOpen(false)}
        onEdit={(r) => { setIsDetailOpen(false); setSelectedRetainer(r); setIsEditOpen(true); }}
        onRenew={(r) => { setIsDetailOpen(false); setSelectedRetainer(r); setIsRenewOpen(true); }}
        onWhatsApp={waClient} onCall={callClient}
      />

      {/* ─ NEW: Mark Payment Dialog ─ */}
      <MarkPaymentDialog
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        retainer={paymentRetainer}
        existingPayment={existingPayment}
        selectedMonth={selectedMonth}
        onSave={handleSavePayment}
      />
    </div>
  );
}