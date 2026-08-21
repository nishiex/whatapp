



"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCRM } from "@/contexts/crm-context";
import { RenewalDialog } from "./renewal-dialog";
import { WhatsAppSettingsDialog } from "./whatsapp-settings-dialog";
import { MessageTemplateDialog } from "./message-template-dialog";
import {
  MessageSquare, Calendar, Clock, AlertTriangle, CheckCircle,
  Settings, Send, Search, Plus, CalendarClock, RefreshCcw,
  Activity, RefreshCw, IndianRupee, Users, X,
} from "lucide-react";

type CustomerRenewalRow = {
  customerId: string;
  customerName: string;
  service: string;
  expiryDate: string | null;
  amount: number;
  status: string;
  renewalId: string | null;
  baseDate: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const addMonths = (dateStr: string, months: number): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
};

const calculateRenewalStatus = (expiryDate: string | null): string => {
  if (!expiryDate) return "active";
  const expiry = new Date(expiryDate);
  const today = new Date();
  const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
};

const getDaysUntilExpiry = (expiryDate: string | null): number => {
  if (!expiryDate) return NaN;
  const d = new Date(expiryDate);
  if (isNaN(d.getTime())) return NaN;
  return Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
};

const SERVICE_LABELS: Record<string, string> = {
  haemodialysis: "Home Haemodialysis",
  hdf:           "HDF At-home",
  peritoneal:    "Peritoneal Dialysis",
  nursing:       "ANM/GNM Nurse",
  other:         "Other",
};

const svcLabel = (s: string) => SERVICE_LABELS[s] ?? s;

// ─── Stat Card — matches patients/leads page (no gradient) ───────────────────

function StatCard({ label, value, iconBg, icon, alert }: {
  label: string; value: string | number; iconBg: string; icon: React.ReactNode; alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border ${alert ? "border-red-200" : "border-gray-100"} shadow-sm px-5 py-4 flex items-center gap-4`}>
      <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className={`font-bold text-2xl leading-none ${alert ? "text-red-600" : "text-gray-900"}`}>{value}</div>
        <div className="text-xs text-gray-400 font-medium mt-1">{label}</div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    active:   { icon: <CheckCircle   className="w-3 h-3 mr-1" />, cls: "bg-green-50  text-green-700  border-green-200",  label: "Active" },
    expiring: { icon: <Clock         className="w-3 h-3 mr-1" />, cls: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Expiring Soon" },
    expired:  { icon: <AlertTriangle className="w-3 h-3 mr-1" />, cls: "bg-red-50    text-red-700    border-red-200",    label: "Expired" },
    renewed:  { icon: <CheckCircle   className="w-3 h-3 mr-1" />, cls: "bg-blue-50   text-blue-700   border-blue-200",   label: "Renewed" },
  };
  const cfg = configs[status] ?? { icon: null, cls: "bg-gray-50 text-gray-600 border-gray-200", label: status };
  return (
    <Badge className={`${cfg.cls} border text-xs flex items-center font-medium`}>
      {cfg.icon}{cfg.label}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RenewalsContent() {
  const { customers, renewals, addRenewal, updateRenewal } = useCRM();

  const [searchTerm,           setSearchTerm]           = useState("");
  const [filterStatus,         setFilterStatus]         = useState("all");
  const [isRenewalDialogOpen,  setIsRenewalDialogOpen]  = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedRow,          setSelectedRow]          = useState<CustomerRenewalRow | null>(null);

  // ── Join customers + renewals ─────────────────────────────────────────────
  const customerRenewals: CustomerRenewalRow[] = useMemo(
    () =>
      customers.map((c) => {
        const r = renewals.find((x) => x.customerId === c.id);

        const service =
          r?.service ??
          (c as any).recurringService ??
          (c as any).service ?? "";

        const rawExpiry =
          (r as any)?.expiryDate ??
          (r as any)?.expiry_date ??
          (c as any).nextRenewalDate ?? null;

        const amount =
          typeof r?.amount === "number"
            ? r.amount
            : typeof (c as any).recurringAmount === "number"
            ? (c as any).recurringAmount
            : 0;

        const statusFromExpiry = calculateRenewalStatus(rawExpiry);
        const status = r?.status === "renewed" ? "renewed" : statusFromExpiry;

        const baseDate =
          (r as any)?.baseDate ??
          (c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : (c as any).createdAt) ?? null;

        return {
          customerId:   c.id,
          customerName: c.name,
          service,
          expiryDate: rawExpiry ? new Date(rawExpiry as any).toISOString() : null,
          amount,
          status,
          renewalId: r?.id ?? null,
          baseDate,
        };
      }),
    [customers, renewals],
  );

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return customerRenewals.filter((row) => {
      const matchSearch =
        !term ||
        row.customerName.toLowerCase().includes(term) ||
        row.service.toLowerCase().includes(term);
      const matchStatus =
        filterStatus === "all" ||
        row.status.toLowerCase() === filterStatus.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [customerRenewals, searchTerm, filterStatus]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const upcoming = customerRenewals.filter((row) => {
      if (!row.expiryDate) return false;
      const d = new Date(row.expiryDate);
      if (isNaN(d.getTime())) return false;
      const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 30 && days > 0;
    }).length;

    const expired = customerRenewals.filter((row) => {
      if (!row.expiryDate) return false;
      const d = new Date(row.expiryDate);
      if (isNaN(d.getTime())) return false;
      return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 0;
    }).length;

    const renewedMonth = renewals.filter((r) => {
      if (r.status !== "renewed") return false;
      const raw = (r as any).updatedAt ?? (r as any).updated_at ?? (r as any).expiryDate ?? (r as any).expiry_date;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;

    const totalRevenue = customerRenewals.reduce((s, r) => s + (r.amount || 0), 0);

    return { upcoming, expired, renewedMonth, total: customerRenewals.length, totalRevenue };
  }, [customerRenewals, renewals]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkRenewed = async (row: CustomerRenewalRow) => {
    if (!row.renewalId) return alert("Create a renewal record before marking as renewed.");
    await updateRenewal(row.renewalId, { status: "renewed" });
  };

  const handleMarkActive = async (row: CustomerRenewalRow) => {
    if (!row.renewalId) return alert("Create a renewal record before changing status.");
    await updateRenewal(row.renewalId, { status: "active" });
  };

  const handleRenewalSave = async (renewalData: any) => {
    try {
      const finalData = { ...renewalData, customerId: selectedRow?.customerId ?? renewalData.customerId };
      if (!finalData.expiryDate || finalData.expiryDate === "Expiry Not Set") {
        const baseDate = finalData.baseDate || selectedRow?.baseDate || new Date().toISOString().slice(0, 10);
        finalData.expiryDate = addMonths(baseDate, finalData.intervalMonths || 1);
      }
      if (selectedRow?.renewalId) {
        await updateRenewal(selectedRow.renewalId, finalData);
      } else {
        await addRenewal(finalData);
      }
    } finally {
      setIsRenewalDialogOpen(false);
      setSelectedRow(null);
    }
  };

  const FILTER_TABS = [
    { value: "all",      label: "All",      count: customerRenewals.length },
    { value: "active",   label: "Active",   count: customerRenewals.filter(r => r.status === "active").length },
    { value: "expiring", label: "Expiring", count: customerRenewals.filter(r => r.status === "expiring").length },
    { value: "expired",  label: "Expired",  count: customerRenewals.filter(r => r.status === "expired").length },
    { value: "renewed",  label: "Renewed",  count: customerRenewals.filter(r => r.status === "renewed").length },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Page Header — matches patients/leads page ────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Renewal Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Automated tracking and WhatsApp reminders</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setIsSettingsDialogOpen(true)}
              className="border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl text-sm"
            >
              <Settings className="w-4 h-4 mr-2" />WhatsApp Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsTemplateDialogOpen(true)}
              className="border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl text-sm"
            >
              <MessageSquare className="w-4 h-4 mr-2" />Templates
            </Button>
            <Button
              onClick={() => { setSelectedRow(null); setIsRenewalDialogOpen(true); }}
              className="bg-[#3A7AFE] hover:bg-[#2563EB] text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />Add Renewal
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Patients" value={stats.total}
            iconBg="bg-gray-100"
            icon={<Users className="h-5 w-5 text-gray-500" />}
          />
          <StatCard
            label="Expiring (30d)" value={stats.upcoming}
            iconBg="bg-yellow-50"
            icon={<Clock className="h-5 w-5 text-yellow-600" />}
            alert={stats.upcoming > 0}
          />
          <StatCard
            label="Expired" value={stats.expired}
            iconBg={stats.expired > 0 ? "bg-red-50" : "bg-gray-50"}
            icon={<AlertTriangle className={`h-5 w-5 ${stats.expired > 0 ? "text-red-500" : "text-gray-400"}`} />}
            alert={stats.expired > 0}
          />
          <StatCard
            label="Renewed This Month" value={stats.renewedMonth}
            iconBg="bg-green-50"
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          />
          <StatCard
            label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
            iconBg="bg-blue-50"
            icon={<IndianRupee className="h-5 w-5 text-[#3A7AFE]" />}
          />
        </div>

        {/* ── Renewals Table Card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Card header — clean, no gradient */}
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Activity className="h-5 w-5 text-[#3A7AFE]" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 text-sm">Patient Service Renewals</div>
              <div className="text-gray-400 text-xs">Track, manage and send renewal reminders</div>
            </div>
            <div className="ml-auto shrink-0 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1 rounded-full">
              {customerRenewals.length} patients
            </div>
          </div>

          <div className="p-5">

            {/* ── Filters — matches patients/leads page style ────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">

              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search patient or service…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-xl border border-gray-200 focus:border-[#3A7AFE] bg-white text-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status filter tabs — matches patients page pill style */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterStatus(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      filterStatus === tab.value
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                    <span className={`ml-1.5 text-[10px] font-semibold ${filterStatus === tab.value ? "text-[#3A7AFE]" : "text-gray-400"}`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="ml-auto text-xs text-gray-400 font-medium shrink-0">
                {filteredRows.length} of {customerRenewals.length} patients
              </div>
            </div>

            {/* ── Renewal Rows ───────────────────────────────────────────── */}
            <div className="divide-y divide-gray-50">
              {filteredRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 border border-gray-100">
                    <Calendar className="h-7 w-7 opacity-40" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    {searchTerm || filterStatus !== "all" ? "No renewals match your filters" : "No renewals yet"}
                  </p>
                  {(searchTerm || filterStatus !== "all") && (
                    <button
                      type="button"
                      onClick={() => { setSearchTerm(""); setFilterStatus("all"); }}
                      className="mt-2 text-xs text-[#3A7AFE] font-medium hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredRows.map((row) => {
                  const days = getDaysUntilExpiry(row.expiryDate);
                  const isExpired  = !isNaN(days) && days <= 0;
                  const isExpiring = !isNaN(days) && days > 0 && days <= 30;

                  return (
                    <div
                      key={row.customerId}
                      className={`flex items-center justify-between py-3.5 px-1 transition-colors hover:bg-gray-50/60 ${
                        isExpired  ? "bg-red-50/30"    :
                        isExpiring ? "bg-yellow-50/20" :
                        ""
                      }`}
                    >
                      {/* ── Left: Patient Info ──────────────────────────── */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">

                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isExpired  ? "bg-red-50    border-red-100    text-red-600"   :
                          isExpiring ? "bg-yellow-50 border-yellow-100 text-yellow-700" :
                          row.status === "renewed" ? "bg-blue-50 border-blue-100 text-[#3A7AFE]" :
                          "bg-blue-50  border-blue-100  text-[#3A7AFE]"
                        }`}>
                          <span className="text-sm font-semibold">
                            {row.customerName?.charAt(0)?.toUpperCase() ?? "P"}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Name + badge */}
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <h3 className="font-medium text-gray-900 text-sm">{row.customerName}</h3>
                            <StatusBadge status={row.status} />
                          </div>

                          {/* Service */}
                          {row.service && (
                            <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg inline-block mb-1.5">
                              {svcLabel(row.service)}
                            </span>
                          )}

                          {/* Meta row */}
                          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                            {row.baseDate && (
                              <span className="flex items-center gap-1">
                                <CalendarClock className="w-3 h-3" />
                                Started: {new Date(row.baseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Expires:{" "}
                              {row.expiryDate
                                ? new Date(row.expiryDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                : "Not set"}
                            </span>
                            <span className="font-medium text-gray-600">
                              ₹{(row.amount || 0).toLocaleString("en-IN")}
                            </span>
                            {isExpiring && (
                              <span className="text-yellow-700 font-medium bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-200">
                                ⏰ {days} days left
                              </span>
                            )}
                            {isExpired && row.expiryDate && (
                              <span className="text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                                ⚠ Expired {Math.abs(days)} days ago
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Right: Actions ──────────────────────────────── */}
                      <div className="flex items-center gap-1.5 ml-4 shrink-0 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => alert(`WhatsApp reminder: ${row.renewalId ?? "Create renewal first"}`)}
                          className="h-8 w-8 p-0 rounded-xl hover:bg-green-50 hover:text-green-600 text-gray-400"
                          disabled={!row.renewalId}
                          title="Send reminder"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>

                        {row.status !== "renewed" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkRenewed(row)}
                            className="h-8 w-8 p-0 rounded-xl hover:bg-blue-50 hover:text-[#3A7AFE] text-gray-400"
                            disabled={!row.renewalId}
                            title="Mark as renewed"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkActive(row)}
                            className="h-8 w-8 p-0 rounded-xl hover:bg-gray-100 text-gray-400"
                            disabled={!row.renewalId}
                            title="Mark as active"
                          >
                            <RefreshCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => { setSelectedRow(row); setIsRenewalDialogOpen(true); }}
                          className={`rounded-xl text-xs font-medium px-3 h-8 ${
                            row.renewalId
                              ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 shadow-none"
                              : "bg-[#3A7AFE] hover:bg-[#2563EB] text-white shadow-sm"
                          }`}
                        >
                          {row.renewalId ? "Edit" : "Create"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <RenewalDialog
        isOpen={isRenewalDialogOpen}
        onClose={() => { setIsRenewalDialogOpen(false); setSelectedRow(null); }}
        renewal={
          selectedRow?.renewalId
            ? renewals.find((r) => r.id === selectedRow.renewalId) || null
            : null
        }
        customerId={selectedRow?.customerId}
        onSave={handleRenewalSave}
      />
      <WhatsAppSettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
      />
      <MessageTemplateDialog
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
      />
    </div>
  );
}