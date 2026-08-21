"use client"


import { useMemo, useState } from "react"
import { useCRM } from "@/contexts/crm-context"
import { useAuth } from "@/contexts/auth-context" // 🆕 NEW — admin gate for the new Sales Team panel below
import { Button } from "@/components/ui/button"
import {
  Users, UserPlus, IndianRupee, Clock, RefreshCw, AlertCircle, CheckCircle2,
  Target, Activity, Download, ShieldAlert, Sparkles, Phone, HelpCircle, Trophy,
} from "lucide-react"
import {
  BRAND, SKY, SUCCESS, WARN, DANGER, TILE_GRADIENTS,
  fmtMoney, fmtPct,
  GradientTile, AnimatedLineChart, MiniBarChart, DonutChart, BarRow,
  Panel, Pill, SectionLabel, Reveal, EmptyState,
} from "../shared/chart-kit"

// ─── Domain maps ──────────────────────────────────────────────────────────────

const SVC: Record<string, string> = {
  website: "Website", whatsapp: "WhatsApp", lms: "LMS", crm: "CRM",
  "social-media": "Social Media", other: "Other",
}

const SVC_FULL: Record<string, string> = {
  website: "Website Development", whatsapp: "WhatsApp Automation", lms: "LMS Platform",
  crm: "CRM Solution", "social-media": "Social Media Management", other: "Other",
}

const SRC_C: Record<string, string> = {
  whatsapp: "#22C55E", "booking-engine": BRAND, website: SKY,
  manual: "#94A3B8", referral: WARN, other: "#C084FC",
}

const SRC_L: Record<string, string> = {
  whatsapp: "WhatsApp", "booking-engine": "Booking", website: "Website",
  manual: "Manual", referral: "Referral", other: "Other",
}

const PERIOD_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
]

const SVC_KEYS = ["website", "whatsapp", "lms", "crm", "social-media", "other"]

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CLASSIFICATION — single source of truth for "what stage is this
// lead at", instead of every chart hardcoding its own guess at the enum.
//
// Supports both status vocabularies already present in this codebase, plus
// a fuzzy fallback for near-variants, plus an explicit "unmapped" bucket so
// unrecognized values are visible in the UI instead of silently zeroing out.
// ─────────────────────────────────────────────────────────────────────────────

type StageKey = "new" | "qualified" | "proposal" | "negotiation" | "converted" | "closed"

const STAGE_META: Record<StageKey, { label: string; color: string }> = {
  new: { label: "New Leads", color: BRAND },
  qualified: { label: "Qualified", color: "#8B5CF6" },
  proposal: { label: "Proposal", color: WARN },
  negotiation: { label: "Negotiation", color: SKY },
  converted: { label: "Converted", color: SUCCESS },
  closed: { label: "Closed / Lost", color: "#94A3B8" },
}

const EXACT_STAGE: Record<string, StageKey> = {
  "qualified-lead": "new", lead: "new", new: "new", inquiry: "new",
  "free-inspection": "qualified", demo: "qualified", qualified: "qualified",
  quotation: "proposal", proposal: "proposal", "quotation-sent": "proposal", "quote-sent": "proposal",
  negotiation: "negotiation",
  installation: "converted", won: "converted", converted: "converted", "closed-won": "converted",
  closed: "closed", lost: "closed", "closed-lost": "closed", cancelled: "closed", rejected: "closed",
}

const FALLBACK_RULES: { key: StageKey; tests: string[] }[] = [
  { key: "converted", tests: ["won", "convert", "install"] },
  { key: "closed", tests: ["lost", "reject", "cancel", "closed"] },
  { key: "negotiation", tests: ["negotiat"] },
  { key: "proposal", tests: ["proposal", "quotat", "quote"] },
  { key: "qualified", tests: ["qualif", "inspect", "demo"] },
  { key: "new", tests: ["new", "lead", "inquir"] },
]

function classifyStatus(status: unknown): { key: StageKey | "unmapped"; label: string; color: string; raw: string } {
  const raw = String(status ?? "").trim()
  const s = raw.toLowerCase()
  if (EXACT_STAGE[s]) {
    const key = EXACT_STAGE[s]
    return { key, raw, ...STAGE_META[key] }
  }
  for (const rule of FALLBACK_RULES) {
    if (rule.tests.some((t) => s.includes(t))) {
      return { key: rule.key, raw, ...STAGE_META[rule.key] }
    }
  }
  return { key: "unmapped", raw: raw || "(blank)", label: "Unmapped", color: "#CBD5E1" }
}

const FUNNEL_ORDER: StageKey[] = ["new", "qualified", "proposal", "negotiation", "converted", "closed"]

// 🆕 NEW — same owner-resolution used on the Leads page and Dashboard.
// Owner = created_by (who created/owns the lead), NOT assigned_to — matches
// the scoping model used everywhere else in the app (demoScope.js, leads.js).
const getOwnerId   = (l: any) => l?.createdBy ?? l?.created_by ?? null
const getOwnerName = (l: any) => l?.created_user_name ?? l?.sales_owner_name ?? "Unknown"

// ─── CSV export ───────────────────────────────────────────────────────────────

function downloadMultiSectionCsv(filename: string, sections: { title: string; rows: Record<string, unknown>[] }[]) {
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const lines: string[] = []
  sections.forEach((section, idx) => {
    if (idx > 0) lines.push("")
    lines.push(escape(section.title))
    if (section.rows.length === 0) {
      lines.push(escape("No data for this section"))
      return
    }
    const headers = Object.keys(section.rows[0])
    lines.push(headers.map(escape).join(","))
    section.rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(",")))
  })
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportsContent() {
  const {
    customers = [], leads = [], invoices = [], isLoading,
    refreshCustomers, refreshLeads, refreshInvoices,
  } = useCRM() as any

  // 🆕 NEW — gates the Sales Team Performance panel below. This mirrors the
  // same fix applied to leads-content.tsx and dashboard-content.tsx:
  // useCRM().currentUser is never populated anywhere in this codebase, so
  // any admin check built on it silently evaluates to false for everyone.
  // useAuth() is the real, working source of truth.
  const { isAdmin } = useAuth()

  const [periodIdx, setPeriodIdx] = useState(1)
  const [refreshing, setRefreshing] = useState(false)
  const period = PERIOD_OPTIONS[periodIdx]

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await Promise.all([refreshCustomers?.(), refreshLeads?.(), refreshInvoices?.()])
    } finally {
      setRefreshing(false)
    }
  }

  const { periodStart, prevStart, prevEnd } = useMemo(() => {
    const now = new Date()
    const pS = new Date(now); pS.setDate(now.getDate() - period.days)
    const prE = new Date(pS)
    const prS = new Date(pS); prS.setDate(prS.getDate() - period.days)
    return { periodStart: pS, prevStart: prS, prevEnd: prE }
  }, [period.days])

  const getDate = (l: any) => new Date(l?.createdAt ?? l?.created_at ?? 0)
  const inPeriod = (v: unknown) => { const d = new Date(v as string); return !isNaN(d.getTime()) && d >= periodStart && d <= new Date() }
  const inPrev = (v: unknown) => { const d = new Date(v as string); return !isNaN(d.getTime()) && d >= prevStart && d < prevEnd }
  const pct = (c: number, p: number) => (p === 0 ? (c > 0 ? 100 : 0) : +(((c - p) / p) * 100).toFixed(1))

  const periodLeads = useMemo(() => leads.filter((l: any) => inPeriod(l.createdAt ?? l.created_at)), [leads, periodStart])
  const prevPeriodLeads = useMemo(() => leads.filter((l: any) => inPrev(l.createdAt ?? l.created_at)), [leads, prevStart, prevEnd])
  const periodInvoices = useMemo(
    () => invoices.filter((i: any) => inPeriod(i.issueDate ?? i.createdAt ?? i.created_at) && i.status !== "cancelled"),
    [invoices, periodStart]
  )
  const prevPeriodInvoices = useMemo(
    () => invoices.filter((i: any) => inPrev(i.issueDate ?? i.createdAt ?? i.created_at) && i.status !== "cancelled"),
    [invoices, prevStart, prevEnd]
  )

  const isConverted = (l: any) => classifyStatus(l.status).key === "converted" || l.isConverted
  const isOpen = (l: any) => {
    const key = classifyStatus(l.status).key
    return key !== "converted" && key !== "closed"
  }

  const kpis = useMemo(() => {
    const newLeads = periodLeads.length
    const newLeadsPrev = prevPeriodLeads.length

    const converted = periodLeads.filter(isConverted).length
    const convertedPrev = prevPeriodLeads.filter(isConverted).length
    const convRate = newLeads > 0 ? (converted / newLeads) * 100 : 0
    const convRatePrev = newLeadsPrev > 0 ? (convertedPrev / newLeadsPrev) * 100 : 0

    const revenue = periodInvoices.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const revenuePrev = prevPeriodInvoices.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)

    const openLeads = (leads as any[]).filter(isOpen)
    const pipelineValue = openLeads.reduce(
      (s, l) => s + (typeof l.estimatedValue === "number" ? l.estimatedValue : Number(l.estimatedValue ?? 0)), 0
    )
    const avgDealValue = openLeads.length > 0 ? Math.round(pipelineValue / openLeads.length) : 0

    const activeClients = (customers as any[]).filter((c) => c.status !== "inactive").length
    const newClientsThisPeriod = (customers as any[]).filter((c) => inPeriod(c.createdAt ?? c.created_at)).length
    const newClientsPrevPeriod = (customers as any[]).filter((c) => inPrev(c.createdAt ?? c.created_at)).length

    return {
      newLeads, newLeadsTrend: pct(newLeads, newLeadsPrev),
      convRate, convRateTrend: +(convRate - convRatePrev).toFixed(1),
      revenue, revenueTrend: pct(revenue, revenuePrev),
      pipelineValue, avgDealValue, openLeadsCount: openLeads.length,
      activeClients, newClientsTrend: pct(newClientsThisPeriod, newClientsPrevPeriod),
    }
  }, [periodLeads, prevPeriodLeads, periodInvoices, prevPeriodInvoices, leads, customers, periodStart, prevStart, prevEnd])

  // 🆕 NEW — Sales Team Performance. Admin-only (a sales rep's own `leads`
  // is already scoped server-side to just their own, so this would just
  // show a "team of one" for them — gating it avoids that noise).
  //
  // Two halves, deliberately matching this file's existing period-vs-all-time
  // split: "New (period)" / "Converted" come from periodLeads (respects the
  // 7/30/90-day toggle above), while "Open Pipeline" / "Follow-ups Overdue"
  // come from the full `leads` array — same all-time scope kpis.pipelineValue
  // already uses, so a rep's pipeline number here matches what they'd see on
  // their own Leads page regardless of which period tab is selected.
  const salesPersonStats = useMemo(() => {
    if (!isAdmin) return []

    type RepStats = {
      id: string; name: string
      newLeads: number; converted: number
      openLeads: number; pipelineValue: number; followUpsOverdue: number
    }
    const map = new Map<string, RepStats>()
    const ensure = (id: string, name: string) => {
      if (!map.has(id)) {
        map.set(id, { id, name, newLeads: 0, converted: 0, openLeads: 0, pipelineValue: 0, followUpsOverdue: 0 })
      }
      return map.get(id)!
    }

    periodLeads.forEach((l: any) => {
      const id = getOwnerId(l)
      if (!id) return
      const rec = ensure(id, getOwnerName(l))
      rec.newLeads += 1
      if (isConverted(l)) rec.converted += 1
    })

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    ;(leads as any[]).forEach((l) => {
      const id = getOwnerId(l)
      if (!id) return
      const rec = ensure(id, getOwnerName(l))
      if (isOpen(l)) {
        rec.openLeads += 1
        rec.pipelineValue += typeof l.estimatedValue === "number" ? l.estimatedValue : Number(l.estimatedValue ?? 0)
        const fu = l.follow_up_date
        if (fu) {
          const d = new Date(fu); d.setHours(0, 0, 0, 0)
          if (d <= todayStart) rec.followUpsOverdue += 1
        }
      }
    })

    return Array.from(map.values())
      .map((r) => ({ ...r, convRate: r.newLeads > 0 ? (r.converted / r.newLeads) * 100 : 0 }))
      .sort((a, b) => b.pipelineValue - a.pipelineValue)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLeads, leads, isAdmin])

  const attention = useMemo(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const followUpsOverdue = (leads as any[]).filter((l) => {
      const fu = l.follow_up_date; if (!fu) return false
      const d = new Date(fu); d.setHours(0, 0, 0, 0)
      return d <= todayStart && isOpen(l)
    }).length

    const overdueInvoices = (invoices as any[]).filter((i) => i.status === "overdue")
    const overdueAmount = overdueInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0)

    const totalCustomerValue = (customers as any[]).reduce((s, c) => s + (Number(c.totalValue ?? c.total_value) || 0), 0)
    const top3Value = [...(customers as any[])]
      .sort((a, b) => (Number(b.totalValue ?? b.total_value) || 0) - (Number(a.totalValue ?? a.total_value) || 0))
      .slice(0, 3)
      .reduce((s, c) => s + (Number(c.totalValue ?? c.total_value) || 0), 0)
    const top3Share = totalCustomerValue > 0 ? +((top3Value / totalCustomerValue) * 100).toFixed(1) : 0

    return { followUpsOverdue, overdueInvoices: overdueInvoices.length, overdueAmount, top3Share }
  }, [leads, invoices, customers])

  const channelPerformance = useMemo(() => {
    const map: Record<string, { total: number; converted: number }> = {}
    periodLeads.forEach((l: any) => {
      const src = l.source ?? "other"
      if (!map[src]) map[src] = { total: 0, converted: 0 }
      map[src].total++
      if (isConverted(l)) map[src].converted++
    })
    return Object.entries(map)
      .map(([source, v]) => ({
        source, label: SRC_L[source] ?? source, color: SRC_C[source] ?? "#94A3B8",
        total: v.total, converted: v.converted,
        rate: v.total > 0 ? +((v.converted / v.total) * 100).toFixed(1) : 0,
        lowSample: v.total < 3,
      }))
      .sort((a, b) => b.rate - a.rate)
  }, [periodLeads])

  const bestChannel = channelPerformance.find((c) => !c.lowSample)

  const summaryLines = useMemo(() => {
    const lines: { icon: React.ElementType; color: string; text: string }[] = []

    lines.push({
      icon: kpis.revenueTrend >= 0 ? Sparkles : AlertCircle,
      color: kpis.revenueTrend >= 0 ? SUCCESS : WARN,
      text: kpis.revenue > 0
        ? `Revenue collected this period: ${fmtMoney(kpis.revenue)}, ${kpis.revenueTrend >= 0 ? "up" : "down"} ${fmtPct(Math.abs(kpis.revenueTrend))} vs the previous ${period.days}-day window.`
        : "No revenue collected in this window yet — check on open invoices below.",
    })

    lines.push({
      icon: Target,
      color: BRAND,
      text: bestChannel
        ? `${bestChannel.label} is the best-converting channel right now at ${bestChannel.rate}% (${bestChannel.converted}/${bestChannel.total} leads) — worth shifting acquisition spend toward it.`
        : "Not enough leads per channel yet this period to call a clear winner — keep volume up before reallocating spend.",
    })

    lines.push({
      icon: attention.followUpsOverdue > 0 ? Phone : CheckCircle2,
      color: attention.followUpsOverdue > 0 ? DANGER : SUCCESS,
      text: attention.followUpsOverdue > 0
        ? `${attention.followUpsOverdue} open lead${attention.followUpsOverdue === 1 ? "" : "s"} ${attention.followUpsOverdue === 1 ? "is" : "are"} past its follow-up date — every day of delay measurably lowers conversion odds.`
        : "No overdue follow-ups — pipeline hygiene is on track.",
    })

    lines.push({
      icon: attention.top3Share > 40 ? ShieldAlert : CheckCircle2,
      color: attention.top3Share > 40 ? DANGER : SUCCESS,
      text: attention.top3Share > 40
        ? `Your top 3 clients account for ${attention.top3Share}% of total billed revenue — a concentration risk if any one of them leaves.`
        : `Revenue is reasonably spread out — your top 3 clients account for ${attention.top3Share}% of billed revenue.`,
    })

    return lines
  }, [kpis, attention, bestChannel, period.days])

  const svcLeadData = useMemo(() => SVC_KEYS.map((k) => periodLeads.filter((l: any) => l.service === k).length), [periodLeads])
  const svcConvData = useMemo(
    () => SVC_KEYS.map((k) => periodLeads.filter((l: any) => l.service === k && isConverted(l)).length),
    [periodLeads]
  )
  const svcLabels = SVC_KEYS.map((k) => SVC[k])

  const sourceSegs = useMemo(() => {
    const map: Record<string, number> = {}
    periodLeads.forEach((l: any) => { const k = l.source ?? "other"; map[k] = (map[k] ?? 0) + 1 })
    return Object.entries(map)
      .map(([k, v]) => ({ label: SRC_L[k] ?? k, value: v, color: SRC_C[k] ?? "#94A3B8" }))
      .sort((a, b) => b.value - a.value)
  }, [periodLeads])

  const { monthData, monthLabels } = useMemo(() => {
    const now = new Date()
    const labels = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return d.toLocaleDateString("en-IN", { month: "short" })
    })
    const data = Array.from({ length: 6 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const e = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59)
      return (leads as any[]).filter((l) => { const d = getDate(l); return d >= m && d <= e }).length
    })
    return { monthData: data, monthLabels: labels }
  }, [leads])

  const { funnelData, unmappedStatuses } = useMemo(() => {
    const counts: Record<string, number> = {}
    const unmapped: Record<string, number> = {}
    ;(leads as any[]).forEach((l) => {
      const c = classifyStatus(l.status)
      if (c.key === "unmapped") {
        unmapped[c.raw] = (unmapped[c.raw] ?? 0) + 1
      } else {
        counts[c.key] = (counts[c.key] ?? 0) + 1
      }
    })
    const stages = FUNNEL_ORDER.map((key) => ({ key, ...STAGE_META[key], count: counts[key] ?? 0 }))
    return { funnelData: stages, unmappedStatuses: Object.entries(unmapped).sort((a, b) => b[1] - a[1]) }
  }, [leads])
  const maxFunnel = Math.max(...funnelData.map((s) => s.count), 1)
  const newCount = funnelData.find((s) => s.key === "new")?.count ?? 0
  const convertedCount = funnelData.find((s) => s.key === "converted")?.count ?? 0

  const priorityBreakdown = useMemo(() => {
    const open = (leads as any[]).filter(isOpen)
    const high = open.filter((l) => l.priority === "high").length
    const medium = open.filter((l) => l.priority === "medium").length
    const low = open.filter((l) => l.priority === "low").length
    return [
      { label: "High priority", value: high, color: DANGER },
      { label: "Medium priority", value: medium, color: WARN },
      { label: "Low priority", value: low, color: "#94A3B8" },
    ].filter((i) => i.value > 0)
  }, [leads])

  const svcBreakdown = useMemo(() => {
    const map: Record<string, { count: number }> = {}
    ;(customers as any[]).forEach((c) => {
      const k = c.service ?? "other"
      if (!map[k]) map[k] = { count: 0 }
      map[k].count++
    })
    return Object.entries(map)
      .map(([k, v]) => ({ label: SVC_FULL[k] ?? k, count: v.count, pct: Math.round((v.count / (customers.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count)
  }, [customers])

  const topLeads = useMemo(
    () => [...(leads as any[])]
      .filter(isOpen)
      .sort((a, b) => (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0))
      .slice(0, 8),
    [leads]
  )

  const topClients = useMemo(
    () => [...(customers as any[])]
      .sort((a, b) => (Number(b.totalValue ?? b.total_value) || 0) - (Number(a.totalValue ?? a.total_value) || 0))
      .slice(0, 5)
      .map((c) => ({ name: c.name, value: Number(c.totalValue ?? c.total_value) || 0 })),
    [customers]
  )
  const topClientsTotal = topClients.reduce((s, c) => s + c.value, 0) || 1

  const exportReport = () => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const generatedAt = new Date().toLocaleString("en-IN")

    const svcRows = SVC_KEYS.map((k, i) => ({
      service: SVC[k], leadsThisPeriod: svcLeadData[i], conversionsThisPeriod: svcConvData[i],
    }))

    const leadDetailRows = periodLeads.map((l: any) => ({
      id: l.id ?? "", name: l.name ?? "", source: l.source ?? "", service: l.service ?? "",
      status: l.status ?? "", priority: l.priority ?? "", estimatedValue: Number(l.estimatedValue) || 0,
      followUpDate: l.follow_up_date ?? "", createdAt: (l.createdAt ?? l.created_at ?? "").toString().slice(0, 10),
    }))

    const sections = [
      {
        title: `Report summary — last ${period.days} days, generated ${generatedAt}`,
        rows: [{ periodDays: period.days, generatedAt, totalLeadsInPeriod: periodLeads.length, totalClients: customers.length }],
      },
      {
        title: "Headline KPIs (this period)",
        rows: [
          { metric: "New leads", value: kpis.newLeads, trendVsPrevPeriod: `${kpis.newLeadsTrend}%` },
          { metric: "Conversion rate", value: `${kpis.convRate.toFixed(1)}%`, trendVsPrevPeriod: `${kpis.convRateTrend}pp` },
          { metric: "Revenue collected", value: kpis.revenue, trendVsPrevPeriod: `${kpis.revenueTrend}%` },
          { metric: "Active clients", value: kpis.activeClients, trendVsPrevPeriod: `${kpis.newClientsTrend}%` },
        ],
      },
      {
        title: "Current pipeline (all time, not period-scoped)",
        rows: [
          { metric: "Open pipeline value", value: kpis.pipelineValue },
          { metric: "Open leads", value: kpis.openLeadsCount },
          { metric: "Avg. deal value", value: kpis.avgDealValue },
          { metric: "Revenue concentration (top 3 clients)", value: `${attention.top3Share}%` },
        ],
      },
      {
        title: "Needs attention",
        rows: [
          { metric: "Overdue follow-ups", value: attention.followUpsOverdue },
          { metric: "Overdue invoices", value: attention.overdueInvoices },
          { metric: "Overdue invoice amount", value: attention.overdueAmount },
        ],
      },
      { title: "Leads vs conversions by service (this period)", rows: svcRows },
      { title: "Lead source performance (this period)", rows: sourceSegs.map((s) => ({ source: s.label, leadsThisPeriod: s.value })) },
      { title: "Lead volume trend (last 6 months)", rows: monthLabels.map((label, i) => ({ month: label, newLeads: monthData[i] })) },
      { title: "Conversion funnel (current snapshot, all leads)", rows: funnelData.map((f) => ({ stage: f.label, count: f.count })) },
      { title: "Open-lead priority (current snapshot)", rows: priorityBreakdown.map((p) => ({ priority: p.label, openLeads: p.value })) },
      {
        title: "Top open leads by value (current snapshot)",
        rows: topLeads.map((l: any) => ({
          name: l.name, service: SVC[l.service] ?? l.service ?? "", status: l.status,
          priority: l.priority ?? "", estimatedValue: Number(l.estimatedValue) || 0,
        })),
      },
      {
        title: "Channel performance (this period)",
        rows: channelPerformance.map((c) => ({
          source: c.label, leadsThisPeriod: c.total, convertedThisPeriod: c.converted,
          conversionRate: `${c.rate}%`, lowSample: c.lowSample ? "yes" : "no",
        })),
      },
      { title: "Top clients by revenue (all time)", rows: topClients.map((c) => ({ client: c.name, totalValue: c.value })) },
      { title: "Clients by service (all time)", rows: svcBreakdown.map((s) => ({ service: s.label, clients: s.count, sharePercent: `${s.pct}%` })) },
      { title: `Lead detail — this period (${leadDetailRows.length} leads)`, rows: leadDetailRows },
    ]

    // 🆕 NEW — sales team performance in the CSV export too, admin-only
    // (matches the on-screen gating below).
    if (isAdmin && salesPersonStats.length > 0) {
      sections.push({
        title: "Sales team performance",
        rows: salesPersonStats.map((r) => ({
          salesPerson: r.name, newLeadsThisPeriod: r.newLeads, convertedThisPeriod: r.converted,
          conversionRate: `${r.convRate.toFixed(1)}%`, openPipelineValue: r.pipelineValue,
          openLeads: r.openLeads, followUpsOverdue: r.followUpsOverdue,
        })),
      })
    }

    if (unmappedStatuses.length > 0) {
      sections.push({
        title: "Unrecognized status values (not yet mapped into the funnel)",
        rows: unmappedStatuses.map(([raw, n]) => ({ rawStatus: raw, count: n })),
      })
    }

    downloadMultiSectionCsv(`reports-export-${period.days}d-${dateStr}.csv`, sections)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] p-4 sm:p-6">
        <div className="max-w-screen-xl mx-auto space-y-5 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-gray-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB]">

      {/* ── Header — same soft elevation + tone as the Dashboard header ──── */}
      <div
        className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5"
        style={{ boxShadow: "0 1px 6px 0 rgba(0,0,0,0.06)" }}
      >
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900">Reports &amp; Analytics</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Actionable insights, not just numbers</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Reporting period">
              {PERIOD_OPTIONS.map((opt, i) => (
                <button
                  key={i} type="button" role="tab" aria-selected={periodIdx === i}
                  onClick={() => setPeriodIdx(i)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    periodIdx === i ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline" size="sm" onClick={exportReport}
              className="rounded-xl border-gray-200 text-gray-500 text-xs gap-1.5 h-8"
            >
              <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Export report</span>
            </Button>
            <Button
              variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}
              className="rounded-xl border-gray-200 text-gray-500 text-xs gap-1.5 h-8 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-6 sm:space-y-7">

        {/* ── Executive summary (kept disabled, same as before) ───────────── */}
        {/* <Reveal delay={0}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-gray-800">What's worth knowing — last {period.days} days</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {summaryLines.map((line, i) => {
                const Icon = line.icon
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${line.color}1A` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: line.color }} />
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{line.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal> */}

        {/* ── KPI gradient tiles ──────────────────────────────────────────── */}
        <Reveal delay={60}>
          <SectionLabel color={BRAND}>This period</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <GradientTile label="New leads" value={kpis.newLeads} trend={kpis.newLeadsTrend} gradient={TILE_GRADIENTS[0]} icon={UserPlus} />
            <GradientTile label="Conversion rate" value={kpis.convRate} isPercent gradient={TILE_GRADIENTS[1]} trend={kpis.convRateTrend} icon={Target} />
            <GradientTile label="Revenue collected" value={kpis.revenue} isMoney trend={kpis.revenueTrend} gradient={TILE_GRADIENTS[2]} icon={IndianRupee} />
            <GradientTile label="Active clients" value={kpis.activeClients} trend={kpis.newClientsTrend} gradient={TILE_GRADIENTS[3]} icon={Users} />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <SectionLabel color="#94A3B8">Current pipeline — all time</SectionLabel>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <GradientTile label="Open pipeline value" value={kpis.pipelineValue} isMoney gradient={TILE_GRADIENTS[0]} icon={Sparkles} />
            <GradientTile label="Open leads" value={kpis.openLeadsCount} gradient={TILE_GRADIENTS[1]} icon={Activity} />
            <GradientTile label="Avg. deal value" value={kpis.avgDealValue} isMoney gradient={TILE_GRADIENTS[2]} icon={IndianRupee} />
            <GradientTile label="Revenue concentration" value={attention.top3Share} isPercent gradient={TILE_GRADIENTS[3]} icon={ShieldAlert} />
          </div>
        </Reveal>

        {/* ── Needs attention ─────────────────────────────────────────────── */}
        <Reveal delay={140}>
          <SectionLabel color={DANGER}>Needs your attention</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Panel title="Overdue follow-ups" icon={Phone} accentColor={DANGER}
              badge={attention.followUpsOverdue > 0 ? <Pill color="red">{attention.followUpsOverdue}</Pill> : <Pill color="green">Clear</Pill>}>
              <p className="text-xs text-gray-500">
                {attention.followUpsOverdue > 0
                  ? `${attention.followUpsOverdue} open leads missed their scheduled callback date.`
                  : "No leads are past their follow-up date right now."}
              </p>
            </Panel>
            <Panel title="Overdue invoices" icon={IndianRupee} accentColor={WARN}
              badge={attention.overdueInvoices > 0 ? <Pill color="amber">{attention.overdueInvoices}</Pill> : <Pill color="green">Clear</Pill>}>
              <p className="text-xs text-gray-500">
                {attention.overdueInvoices > 0
                  ? `${fmtMoney(attention.overdueAmount)} pending across ${attention.overdueInvoices} overdue invoice${attention.overdueInvoices === 1 ? "" : "s"}.`
                  : "All invoices are within their due date."}
              </p>
            </Panel>
            <Panel title="Revenue concentration" icon={ShieldAlert} accentColor={attention.top3Share > 40 ? DANGER : SUCCESS}
              badge={<Pill color={attention.top3Share > 40 ? "red" : "green"}>{attention.top3Share}%</Pill>}>
              <p className="text-xs text-gray-500">
                {attention.top3Share}% of total billed revenue comes from your top 3 clients
                {attention.top3Share > 40 ? " — a real risk if one leaves." : "."}
              </p>
            </Panel>
          </div>
        </Reveal>

        {/* ══ NEW: Sales Team Performance — admin only ══════════════════ */}
        {isAdmin && salesPersonStats.length > 0 && (
          <Reveal delay={160}>
            <SectionLabel color={BRAND}>Sales team performance</SectionLabel>
            <Panel
              title="Leads by sales person"
              sub={`New leads & conversions this period · open pipeline is all-time`}
              icon={Users} accentColor={BRAND}
              badge={
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <Trophy className="h-3 w-3 shrink-0" /> {salesPersonStats[0].name} leading
                </span>
              }
            >
              {/* Bar comparison — open pipeline per rep */}
              <div className="space-y-3 mb-5">
                {salesPersonStats.map((r) => (
                  <BarRow
                    key={r.id}
                    label={r.name}
                    value={r.openLeads}
                    max={Math.max(...salesPersonStats.map((x) => x.openLeads), 1)}
                    color={BRAND}
                    sub={`${r.newLeads} new this period`}
                  />
                ))}
              </div>

              {/* Per-rep detail table */}
              <div className="overflow-x-auto -mx-1 border-t border-gray-50 pt-3">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-gray-400 font-semibold py-2 pr-3">Sales Person</th>
                      <th className="text-right text-gray-400 font-semibold py-2 pr-3">New (period)</th>
                      <th className="text-right text-gray-400 font-semibold py-2 pr-3">Converted</th>
                      <th className="text-right text-gray-400 font-semibold py-2 pr-3">Conv. Rate</th>
                      <th className="text-right text-gray-400 font-semibold py-2 pr-3">Open Pipeline</th>
                      <th className="text-right text-gray-400 font-semibold py-2">Follow-ups Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesPersonStats.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 pr-3 font-medium text-gray-800 whitespace-nowrap">{r.name}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700">{r.newLeads}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600 font-bold">{r.converted}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700">{r.convRate.toFixed(0)}%</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700 whitespace-nowrap">{fmtMoney(r.pipelineValue)}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {r.followUpsOverdue > 0
                            ? <span className="text-rose-600 font-bold">{r.followUpsOverdue}</span>
                            : <span className="text-gray-300">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </Reveal>
        )}

        {/* ── Leads by service + source ───────────────────────────────────── */}
        <Reveal delay={180}>
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-5">
            <Panel title="Leads vs conversions by service" sub="This period, by service line" icon={Activity} accentColor={BRAND}>
              {svcLeadData.every((v) => v === 0)
                ? <EmptyState icon={Activity} label="No leads in this period yet" />
                : <MiniBarChart data={[svcLeadData, svcConvData]} labels={svcLabels} grouped
                    groupColors={[BRAND, SUCCESS]} groupNames={["Leads", "Conversions"]} />}
            </Panel>
            <Panel title="Lead source performance" sub="Share of leads this period" icon={Target} accentColor={SKY}>
              {sourceSegs.length === 0
                ? <EmptyState icon={Target} label="No leads in this period yet" />
                : <DonutChart data={sourceSegs} centerLabel="leads" centerValue={String(sourceSegs.reduce((s, x) => s + x.value, 0))} />}
            </Panel>
          </div>
        </Reveal>

        {/* ── Monthly trend + funnel + priority ───────────────────────────── */}
        <Reveal delay={220}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            <Panel title="Lead volume trend" sub="Last 6 months — independent of the period filter above" icon={UserPlus} accentColor={SKY}
              badge={<Pill color="blue">{monthData.reduce((a, b) => a + b, 0)} total</Pill>}>
              <MiniBarChart data={monthData} labels={monthLabels} color={SKY} />
            </Panel>

            <Panel title="Conversion funnel" sub="Current pipeline snapshot — all leads, all time" icon={Target} accentColor={BRAND}>
              <div className="space-y-2.5">
                {funnelData.map((stage, idx) => {
                  const prev = idx > 0 ? funnelData[idx - 1].count : stage.count
                  const drop = prev > 0 && idx > 0 ? Math.round(((prev - stage.count) / prev) * 100) : null
                  return (
                    <BarRow key={stage.key} label={stage.label} value={stage.count} max={maxFunnel} color={stage.color}
                      sub={drop !== null && drop > 0 ? `-${drop}%` : undefined} />
                  )
                })}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">Overall conversion</span>
                <span className="text-sm font-bold text-gray-800">
                  {newCount > 0 ? `${((convertedCount / newCount) * 100).toFixed(1)}%` : "—"}
                </span>
              </div>
              {unmappedStatuses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-start gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {unmappedStatuses.reduce((s, [, n]) => s + n, 0)} lead{unmappedStatuses.reduce((s, [, n]) => s + n, 0) === 1 ? "" : "s"} have a
                    status this report doesn't recognize yet: {unmappedStatuses.map(([raw, n]) => `"${raw}" (${n})`).join(", ")}.
                    Share these values and they can be mapped into the funnel above.
                  </p>
                </div>
              )}
            </Panel>

            <Panel title="Open-lead priority" sub="Current snapshot — open leads only" icon={AlertCircle} accentColor={WARN}>
              {priorityBreakdown.length === 0
                ? <EmptyState icon={CheckCircle2} label="No open leads right now" />
                : (
                  <div className="space-y-2.5">
                    {priorityBreakdown.map((p, i) => (
                      <BarRow key={i} label={p.label} value={p.value} max={Math.max(...priorityBreakdown.map((x) => x.value), 1)} color={p.color} />
                    ))}
                  </div>
                )}
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">Overdue follow-ups</span>
                <span className={`text-sm font-bold ${attention.followUpsOverdue > 0 ? "text-rose-600" : "text-gray-800"}`}>
                  {attention.followUpsOverdue}
                </span>
              </div>
            </Panel>
          </div>
        </Reveal>

        {/* ── Top leads + channel ROI + revenue concentration ─────────────── */}
        <Reveal delay={260}>
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 sm:gap-5">
            <Panel title="Top open leads by value" sub="Current snapshot, ranked by estimated revenue" icon={Users} accentColor={BRAND}
              badge={<Pill color="blue">{fmtMoney(kpis.pipelineValue)} pipeline</Pill>}>
              {topLeads.length === 0 ? (
                <EmptyState icon={Users} label="No open leads right now" />
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs min-w-[480px]">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="text-left text-gray-400 font-semibold py-2 pr-3">Lead</th>
                        <th className="text-left text-gray-400 font-semibold py-2 pr-3">Service</th>
                        <th className="text-right text-gray-400 font-semibold py-2 pr-3">Est. value</th>
                        <th className="text-left text-gray-400 font-semibold py-2">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLeads.map((lead: any) => {
                        const val = Number(lead.estimatedValue) || 0
                        return (
                          <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-semibold text-indigo-600 shrink-0">
                                  {(lead.name?.[0] ?? "?").toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-800 truncate max-w-[140px]">{lead.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-3 text-gray-500">{SVC[lead.service] ?? lead.service ?? "—"}</td>
                            <td className="py-2.5 pr-3 text-right font-semibold text-gray-800">{val > 0 ? fmtMoney(val) : "—"}</td>
                            <td className="py-2.5">
                              <Pill color={lead.priority === "high" ? "red" : lead.priority === "medium" ? "amber" : "gray"}>
                                {lead.priority ?? "—"}
                              </Pill>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <div className="flex flex-col gap-4 sm:gap-5">
              <Panel title="Channel performance" sub="Conversion %, this period" icon={Target} accentColor={SUCCESS}>
                {channelPerformance.length === 0 ? (
                  <EmptyState icon={Target} label="No leads in this period yet" />
                ) : (
                  <div className="space-y-2.5">
                    {channelPerformance.map((c, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="truncate">{c.label}</span>
                          {c.lowSample && <span className="text-[10px] text-gray-300 shrink-0">low sample</span>}
                        </span>
                        <span className="text-xs font-bold text-gray-800 tabular-nums shrink-0">
                          {c.rate}% <span className="text-gray-400 font-normal">({c.converted}/{c.total})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Top clients by revenue" sub="All time, billing-based" icon={IndianRupee} accentColor={WARN}>
                {topClients.length === 0 ? (
                  <EmptyState icon={Users} label="No client revenue recorded yet" />
                ) : (
                  <div className="space-y-2.5">
                    {topClients.map((c, i) => (
                      <BarRow key={i} label={c.name} value={c.value} max={topClientsTotal} color={WARN}
                        sub={fmtMoney(c.value)} />
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </Reveal>

        {/* ── Clients by service ──────────────────────────────────────────── */}
        <Reveal delay={300}>
          <Panel title="Clients by service" sub="All time — distribution across active service lines" icon={Users} accentColor={BRAND}
            badge={<Pill color="blue">{customers.length} clients</Pill>}>
            {svcBreakdown.length === 0 ? (
              <EmptyState icon={Users} label="No clients yet" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {svcBreakdown.map((s, i) => (
                  <BarRow key={i} label={s.label} value={s.count} max={Math.max(...svcBreakdown.map((x) => x.count), 1)}
                    color={SUCCESS} sub={`${s.pct}%`} />
                ))}
              </div>
            )}
          </Panel>
        </Reveal>

      </div>
    </div>
  )
}