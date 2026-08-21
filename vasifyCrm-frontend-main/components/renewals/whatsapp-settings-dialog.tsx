"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle, AlertCircle, Plus, X, Send, Settings,
  Phone, Bell, Wifi, WifiOff, TestTube,
} from "lucide-react"

interface WhatsAppSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api"

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth_token") || localStorage.getItem("token")
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  return res.json()
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ gradient, icon, title, children }: {
  gradient: string; icon: React.ReactNode; title: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border-2 border-slate-100 overflow-hidden">
      <div className={`${gradient} px-4 py-3 flex items-center gap-2`}>
        <div className="p-1.5 bg-white/20 rounded-lg">{icon}</div>
        <div className="font-black text-white text-sm">{title}</div>
      </div>
      <div className="p-4 space-y-4 bg-white">{children}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WhatsAppSettingsDialog({ isOpen, onClose }: WhatsAppSettingsDialogProps) {
  const [alertNumbers,   setAlertNumbers]   = useState<string[]>([])
  const [alertsEnabled,  setAlertsEnabled]  = useState(true)
  const [newNumber,      setNewNumber]      = useState("")
  const [numberError,    setNumberError]    = useState("")
  const [isSaving,       setIsSaving]       = useState(false)
  const [isTesting,      setIsTesting]      = useState(false)
  const [isLoading,      setIsLoading]      = useState(false)
  const [saveStatus,     setSaveStatus]     = useState<"idle" | "success" | "error">("idle")
  const [testStatus,     setTestStatus]     = useState<"idle" | "sent" | "error">("idle")

  // ── Load config on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setIsLoading(true)
    apiFetch("/whatsapp/alert-config")
      .then((data) => {
        if (data.alertNumbers) setAlertNumbers(data.alertNumbers)
        if (typeof data.alertsEnabled === "boolean") setAlertsEnabled(data.alertsEnabled)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [isOpen])

  // ── Add number ────────────────────────────────────────────────────────────
  const addNumber = () => {
    const cleaned = newNumber.replace(/\D/g, "")
    if (cleaned.length < 10 || cleaned.length > 15) {
      setNumberError("Enter a valid 10–15 digit number (include country code, e.g. 919876543210)")
      return
    }
    if (alertNumbers.includes(cleaned)) {
      setNumberError("This number is already added")
      return
    }
    setAlertNumbers((prev) => [...prev, cleaned])
    setNewNumber("")
    setNumberError("")
  }

  const removeNumber = (num: string) =>
    setAlertNumbers((prev) => prev.filter((n) => n !== num))

  // ── Save config ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!alertNumbers.length && alertsEnabled) {
      setNumberError("Add at least one alert number before saving")
      return
    }
    setIsSaving(true)
    setSaveStatus("idle")
    try {
      const data = await apiFetch("/whatsapp/alert-config", {
        method:  "PUT",
        body:    JSON.stringify({ alertNumbers, alertsEnabled }),
      })
      if (data.message) {
        setSaveStatus("success")
        setTimeout(() => setSaveStatus("idle"), 3000)
      } else {
        setSaveStatus("error")
      }
    } catch {
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Test alert ────────────────────────────────────────────────────────────
  const handleTestAlert = async () => {
    if (!alertNumbers.length) {
      setNumberError("Add at least one number to test")
      return
    }
    setIsTesting(true)
    setTestStatus("idle")
    try {
      const data = await apiFetch("/whatsapp/test-alert", { method: "POST" })
      if (data.message) {
        setTestStatus("sent")
        setTimeout(() => setTestStatus("idle"), 5000)
      } else {
        setTestStatus("error")
      }
    } catch {
      setTestStatus("error")
    } finally {
      setIsTesting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-0 shadow-2xl">

        {/* Hero header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-white font-black text-lg">WhatsApp Settings</DialogTitle>
              <p className="text-green-100 text-xs mt-0.5">SOW §4.2 — Lead Alert Configuration</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5 bg-slate-50">

          {/* Connection status */}
          <Section
            gradient="bg-gradient-to-r from-slate-800 to-slate-700"
            icon={<Wifi className="h-4 w-4 text-white" />}
            title="API Connection"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {process.env.NEXT_PUBLIC_WA_TOKEN_SET === "true" ? (
                  <><CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold text-green-700">API Credentials Configured</span></>
                ) : (
                  <><AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-amber-700">Set WHATSAPP_API_TOKEN in .env</span></>
                )}
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs font-bold border">
                AOC Portal
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Incoming WhatsApp messages auto-create leads with source = "whatsapp" and trigger alerts.
            </p>
          </Section>

          {/* SOW §4.2 — Alert toggle */}
          <Section
            gradient="bg-gradient-to-r from-green-600 to-emerald-500"
            icon={<Bell className="h-4 w-4 text-white" />}
            title="Lead Alert Notifications (SOW §4.2)"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-700 text-sm">Enable Real-Time Alerts</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Send WhatsApp notification within ≤5 seconds of new lead creation
                </div>
              </div>
              <Switch
                checked={alertsEnabled}
                onCheckedChange={setAlertsEnabled}
              />
            </div>

            {alertsEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800 font-semibold">
                ✅ Alerts will fire for: WhatsApp leads · Website leads · Booking Engine leads
              </div>
            )}
          </Section>

          {/* SOW §4.2 — Configurable alert numbers */}
          <Section
            gradient="bg-gradient-to-r from-blue-600 to-cyan-500"
            icon={<Phone className="h-4 w-4 text-white" />}
            title="Alert Recipients (Configurable)"
          >
            {isLoading ? (
              <div className="text-center py-4 text-slate-400 text-sm">Loading...</div>
            ) : (
              <>
                {/* Existing numbers */}
                {alertNumbers.length > 0 && (
                  <div className="space-y-2">
                    {alertNumbers.map((num) => (
                      <div key={num}
                        className="flex items-center justify-between bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-bold text-slate-800 text-sm">+{num}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNumber(num)}
                          className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {alertNumbers.length === 0 && (
                  <div className="text-center py-3 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                    No alert numbers added yet
                  </div>
                )}

                {/* Add new number */}
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-wide">
                    Add Number (with country code)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">+</span>
                      <Input
                        placeholder="919876543210"
                        value={newNumber}
                        onChange={(e) => { setNewNumber(e.target.value); setNumberError("") }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNumber() } }}
                        className="pl-7 rounded-xl border-2 border-slate-200 focus:border-blue-400 font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addNumber}
                      className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {numberError && (
                    <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{numberError}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Include country code. India: 91XXXXXXXXXX · Up to 5 numbers supported.
                  </p>
                </div>
              </>
            )}
          </Section>

          {/* SOW §4.2 — Alert message preview */}
          <Section
            gradient="bg-gradient-to-r from-slate-700 to-slate-600"
            icon={<Send className="h-4 w-4 text-white" />}
            title="Alert Message Format"
          >
            <div className="bg-green-50 border-2 border-green-100 rounded-xl p-3 font-mono text-xs text-slate-700 space-y-0.5">
              <p>🔔 <strong>New WhatsApp Lead — Renalease</strong></p>
              <p className="mt-1">👤 <strong>Patient:</strong> Patient Name</p>
              <p>📞 <strong>Mobile:</strong> 919876543210</p>
              <p>📡 <strong>Source:</strong> WhatsApp</p>
              <p>🏥 <strong>Service:</strong> Home Haemodialysis</p>
              <p>📋 <strong>Status:</strong> Qualified Lead</p>
              <p>💬 <strong>Message:</strong> Patient's enquiry text...</p>
            </div>
            <p className="text-xs text-slate-400">
              Alert delivered within ≤5 seconds of lead creation via parallel dispatch.
            </p>
          </Section>

          {/* Save status */}
          {saveStatus === "success" && (
            <div className="flex items-center gap-2 bg-green-50 border-2 border-green-200 rounded-xl p-3 text-sm text-green-700 font-semibold">
              <CheckCircle className="h-4 w-4" />Settings saved successfully!
            </div>
          )}
          {saveStatus === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold">
              <AlertCircle className="h-4 w-4" />Failed to save. Check your connection.
            </div>
          )}
          {testStatus === "sent" && (
            <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-200 rounded-xl p-3 text-sm text-blue-700 font-semibold">
              <CheckCircle className="h-4 w-4" />Test alert sent! Check your WhatsApp.
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestAlert}
              disabled={isTesting || !alertNumbers.length}
              className="rounded-xl border-2 border-green-200 text-green-700 hover:bg-green-50 font-bold flex-1"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? "Sending…" : "Test Alert"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-2 border-slate-200 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black px-6 shadow-lg shadow-green-200"
            >
              {isSaving ? "Saving…" : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}