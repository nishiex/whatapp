

"use client";

import { useState, useEffect, useRef } from "react";
import { useCRM } from "@/contexts/crm-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bell, CalendarIcon, Clock, CheckCircle2, AlertCircle,
  Plus, Edit2, Circle, History, BellRing, BellOff,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/crm";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpEntry {
  id?:            string;
  follow_up_date: string;
  time?:          string;
  notes:          string;
  completed:      boolean;
  created_at?:    string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (v: unknown) => {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const formatDateTime = (v: unknown) => {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const isOverdue = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
};

const isToday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  return dateStr.slice(0, 10) === new Date().toISOString().slice(0, 10);
};

// ─── SOW: Reminder System ─────────────────────────────────────────────────────
// Registers a browser Notification + setTimeout to fire ±1 minute before scheduled time
// Falls back silently if Notification API is unavailable (e.g. non-HTTPS, denied)

interface ReminderHandle {
  timeoutId: ReturnType<typeof setTimeout>;
  clear: () => void;
}

const reminderHandles = new Map<string, ReminderHandle>();

function scheduleReminder(entry: FollowUpEntry, leadName: string): void {
  if (!entry.id || entry.completed) return;
  // Clear any existing reminder for this entry
  const existing = reminderHandles.get(entry.id);
  if (existing) existing.clear();

  const reminderMinutesBefore = 10; // notify 10 minutes before
  const dateTimeStr = entry.follow_up_date + (entry.time ? `T${entry.time}:00` : "T09:00:00");
  const scheduledAt = new Date(dateTimeStr).getTime();
  const notifyAt    = scheduledAt - reminderMinutesBefore * 60 * 1000;
  const msUntil     = notifyAt - Date.now();

  if (msUntil <= 0) return; // already passed

  const timeoutId = setTimeout(async () => {
    // Request permission if needed (SOW: trigger alert before scheduled time)
    if (typeof window !== "undefined" && "Notification" in window) {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission === "granted") {
        new Notification(`Follow-up reminder: ${leadName}`, {
          body:    `Scheduled ${entry.time ? `at ${entry.time}` : "today"}${entry.notes ? ` — ${entry.notes.slice(0, 60)}` : ""}`,
          icon:    "/favicon.ico",
          tag:     `follow-up-${entry.id}`,
          requireInteraction: true,
        });
      }
    }
    reminderHandles.delete(entry.id!);
  }, msUntil);

  reminderHandles.set(entry.id, {
    timeoutId,
    clear: () => { clearTimeout(timeoutId); reminderHandles.delete(entry.id!); },
  });
}

function clearReminder(id: string): void {
  reminderHandles.get(id)?.clear();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FollowUpDialogProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  lead:         Lead | null;
  onSuccess?:   () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FollowUpDialog({ open, onOpenChange, lead, onSuccess }: FollowUpDialogProps) {
  const { updateLead } = useCRM();

  const [date,     setDate]    = useState<Date | undefined>(undefined);
  const [time,     setTime]    = useState("");
  const [notes,    setNotes]   = useState("");
  const [saving,   setSaving]  = useState(false);
  const [error,    setError]   = useState<string | null>(null);
  const [success,  setSuccess] = useState(false);
  const [history,  setHistory] = useState<FollowUpEntry[]>([]);
  const [editId,   setEditId]  = useState<string | null>(null); // use id not index

  // SOW: Reminder system — notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!open || !lead) return;
    const hist = (lead as any).followUpHistory ?? (lead as any).follow_up_history ?? [];
    setHistory(hist);
    const fud = (lead as any).follow_up_date;
    setDate(fud ? new Date(fud) : undefined);
    setTime("");
    setNotes("");
    setError(null);
    setSuccess(false);
    setEditId(null);
  }, [open, lead]);

  if (!lead) return null;

  const pendingCount   = history.filter((f) => !f.completed).length;
  const completedCount = history.filter((f) => f.completed).length;

  // ── SOW: Request notification permission ─────────────────────────────────
  const requestNotifPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  // ── SOW: Add follow-up (≤ 2 clicks — date picker + submit) ──────────────
  const handleAdd = async () => {
    if (!date) { setError("Please select a follow-up date."); return; }
    setSaving(true);
    setError(null);
    try {
      const iso = date.toISOString().slice(0, 10);

      // SOW: Use the dedicated /follow-up endpoint so it writes to lead_follow_ups table
      // AND updates leads.follow_up_date in one shot
      const ok = await updateLead(lead.id, {
        followUpDate:  iso,
        followUpTime:  time || undefined,
        followUpNotes: notes || undefined,
      } as any);

      if (ok) {
        const newEntry: FollowUpEntry = {
          id:             `local-${Date.now()}`,
          follow_up_date: iso,
          time,
          notes,
          completed:      false,
          created_at:     new Date().toISOString(),
        };
        setHistory((prev) => [newEntry, ...prev]);
        // SOW: Schedule reminder if time is set
        if (time && notifPermission === "granted") {
          scheduleReminder({ ...newEntry }, lead.name ?? "Patient");
        }
        setDate(undefined);
        setTime("");
        setNotes("");
        setSuccess(true);
        onSuccess?.();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("Failed to save follow-up. Try again.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  // ── SOW: Mark follow-up as completed ─────────────────────────────────────
  // Fix: use entry.id as key not array index (avoid stale closure bug)
  const handleMarkComplete = async (entryId: string) => {
    const entry = history.find((f) => (f.id ?? "") === entryId);
    if (!entry) return;
    const wasCompleted = entry.completed;
    // Optimistic update
    setHistory((prev) =>
      prev.map((f) => (f.id ?? "") === entryId ? { ...f, completed: !f.completed } : f)
    );
    if (!wasCompleted) {
      clearReminder(entryId);
      // If this was the active follow_up_date on the lead, clear it
      const leadFud = (lead as any).follow_up_date;
      if (leadFud && leadFud.slice(0, 10) === entry.follow_up_date.slice(0, 10)) {
        await updateLead(lead.id, { followUpDate: null } as any);
      }
    } else {
      // Re-schedule reminder if unmarked as complete and has a time
      if (entry.time && notifPermission === "granted") {
        scheduleReminder({ ...entry, completed: false }, lead.name ?? "Patient");
      }
    }
  };

  // ── SOW: Edit / Reschedule follow-up ─────────────────────────────────────
  const handleEdit = (entryId: string) => {
    const entry = history.find((f) => (f.id ?? "") === entryId);
    if (!entry) return;
    setDate(new Date(entry.follow_up_date));
    setTime(entry.time ?? "");
    setNotes(entry.notes ?? "");
    setEditId(entryId);
  };

  const handleSaveEdit = async () => {
    if (!date || editId === null) return;
    setSaving(true);
    setError(null);
    try {
      const iso = date.toISOString().slice(0, 10);
      setHistory((prev) =>
        prev.map((f) => (f.id ?? "") === editId ? { ...f, follow_up_date: iso, time, notes } : f)
      );
      await updateLead(lead.id, { followUpDate: iso, followUpTime: time || undefined, followUpNotes: notes || undefined } as any);
      // Re-schedule reminder if time provided
      const updated = history.find((f) => (f.id ?? "") === editId);
      if (updated && time && notifPermission === "granted") {
        scheduleReminder({ ...updated, follow_up_date: iso, time, notes }, lead.name ?? "Patient");
      }
      setDate(undefined); setTime(""); setNotes(""); setEditId(null);
      onSuccess?.();
    } catch {
      setError("Failed to save edit.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDate(undefined); setTime(""); setNotes(""); setEditId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white font-black text-lg">Follow-up Management</DialogTitle>
              <DialogDescription className="text-amber-100 text-xs mt-0.5 truncate">
                {lead.name} · {(lead as any).phone}
              </DialogDescription>
            </div>
          </div>

          {/* SOW: Dashboard Metrics — Pending + Completed */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Clock className="h-3.5 w-3.5 text-white" />
              <span className="text-white text-xs font-black">{pendingCount} Pending</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              <span className="text-white text-xs font-black">{completedCount} Completed</span>
            </div>

            {/* SOW: Reminder system — notification permission control */}
            {notifPermission !== "unsupported" && (
              <div className="ml-auto">
                {notifPermission === "granted" ? (
                  <div className="flex items-center gap-1.5 bg-green-500/30 px-3 py-1.5 rounded-xl">
                    <BellRing className="h-3.5 w-3.5 text-white" />
                    <span className="text-white text-[10px] font-bold">Reminders On</span>
                  </div>
                ) : notifPermission === "denied" ? (
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl" title="Notifications blocked in browser settings">
                    <BellOff className="h-3.5 w-3.5 text-white/60" />
                    <span className="text-white/60 text-[10px] font-bold">Reminders Blocked</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={requestNotifPermission}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Bell className="h-3.5 w-3.5 text-white" />
                    <span className="text-white text-[10px] font-bold">Enable Reminders</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6 bg-slate-50">

          {/* ── SOW: Add / Edit Follow-up (≤ 2 clicks) ──────────────── */}
          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-white" />
              <span className="font-black text-white text-sm uppercase tracking-wide">
                {editId !== null ? "Edit Follow-up" : "Add New Follow-up"}
              </span>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* SOW: Date field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Follow-up Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" type="button"
                        className={cn("w-full justify-start text-left font-medium rounded-xl border-2 border-slate-200 hover:border-amber-400 h-10", !date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-amber-500" />
                        {date ? format(date, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* SOW: Time field — used by reminder system */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Time
                    {notifPermission === "granted" && (
                      <span className="ml-1.5 text-[10px] text-amber-600 font-semibold normal-case">(sets reminder)</span>
                    )}
                  </Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="rounded-xl border-2 border-slate-200 focus:border-amber-400 h-10"
                  />
                </div>
              </div>

              {/* SOW: Notes field */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="What needs to be discussed? Any patient concerns to address..."
                  className="rounded-xl border-2 border-slate-200 focus:border-amber-400 resize-none"
                />
              </div>

              {/* SOW: Reminder hint */}
              {time && notifPermission === "granted" && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                  <BellRing className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-700 font-medium">
                    Browser reminder will fire 10 minutes before {time}
                  </span>
                </div>
              )}
              {time && notifPermission !== "granted" && notifPermission !== "unsupported" && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                  <BellOff className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 font-medium">Enable reminders above to get a browser alert</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />Follow-up scheduled successfully!
                </div>
              )}

              <div className="flex items-center gap-3">
                {editId !== null && (
                  <Button variant="outline" onClick={handleCancelEdit} disabled={saving}
                    className="rounded-xl border-2 border-slate-200 font-bold px-4">
                    Cancel
                  </Button>
                )}
                {/* SOW: Follow-up creation ≤ 2 clicks */}
                <Button
                  onClick={editId !== null ? handleSaveEdit : handleAdd}
                  disabled={!date || saving}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold px-6 shadow-md shadow-amber-200"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...
                    </span>
                  ) : editId !== null ? (
                    <span className="flex items-center gap-2"><Edit2 className="h-4 w-4" />Update Follow-up</span>
                  ) : (
                    <span className="flex items-center gap-2"><Plus className="h-4 w-4" />Schedule Follow-up</span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* SOW: Follow-up History — sorted by nearest date/time ─────────── */}
          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-3 flex items-center gap-2">
              <History className="h-4 w-4 text-white" />
              <span className="font-black text-white text-sm uppercase tracking-wide">Follow-up History</span>
              <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{history.length} total</span>
            </div>
            <div className="p-5">
              {history.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell className="h-6 w-6 text-slate-300" />
                  </div>
                  <div className="text-sm font-bold text-slate-500">No follow-ups yet</div>
                  <div className="text-xs text-slate-400 mt-1">Add a follow-up above to get started</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* SOW: Sorted by nearest date/time */}
                  {[...history]
                    .sort((a, b) => {
                      const da = new Date(a.follow_up_date + (a.time ? `T${a.time}` : "T00:00")).getTime();
                      const db = new Date(b.follow_up_date + (b.time ? `T${b.time}` : "T00:00")).getTime();
                      return da - db;
                    })
                    .map((fu) => {
                      const fuId    = fu.id ?? fu.follow_up_date;
                      const overdue = !fu.completed && isOverdue(fu.follow_up_date);
                      const today   = !fu.completed && isToday(fu.follow_up_date);
                      return (
                        <div
                          key={fuId}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-xl border-2 transition-all",
                            fu.completed
                              ? "bg-slate-50 border-slate-100 opacity-70"
                              : overdue ? "bg-red-50 border-red-200"
                              : today   ? "bg-amber-50 border-amber-200"
                              : "bg-white border-slate-200"
                          )}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                            fu.completed ? "bg-green-100" : overdue ? "bg-red-100" : today ? "bg-amber-100" : "bg-slate-100"
                          )}>
                            {fu.completed
                              ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                              : overdue ? <AlertCircle  className="h-4 w-4 text-red-600" />
                              : today   ? <Bell         className="h-4 w-4 text-amber-600" />
                              : <Clock className="h-4 w-4 text-slate-500" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-800">{formatDate(fu.follow_up_date)}</span>
                              {fu.time && <span className="text-xs text-slate-500 font-medium">at {fu.time}</span>}
                              {fu.completed && <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] font-bold">Completed</Badge>}
                              {!fu.completed && overdue && <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold">Overdue</Badge>}
                              {!fu.completed && today && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">Today</Badge>}
                            </div>
                            {fu.notes && <div className="text-xs text-slate-600 mt-1 leading-relaxed">{fu.notes}</div>}
                            {fu.created_at && <div className="text-[10px] text-slate-400 mt-1">Added: {formatDateTime(fu.created_at)}</div>}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* SOW: Mark as completed */}
                            <Button
                              type="button" variant="ghost" size="sm"
                              className={cn("h-7 w-7 p-0 rounded-lg", fu.completed ? "text-slate-400 hover:bg-slate-100" : "text-green-600 hover:bg-green-50")}
                              title={fu.completed ? "Mark as pending" : "Mark as completed"}
                              onClick={() => handleMarkComplete(fuId)}
                            >
                              {fu.completed ? <Circle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            </Button>
                            {/* SOW: Edit / Reschedule */}
                            {!fu.completed && (
                              <Button
                                type="button" variant="ghost" size="sm"
                                className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:bg-blue-50"
                                title="Edit / Reschedule"
                                onClick={() => handleEdit(fuId)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end rounded-b-2xl">
          <Button variant="outline" onClick={() => onOpenChange(false)}
            className="rounded-xl border-2 border-slate-200 font-bold px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}