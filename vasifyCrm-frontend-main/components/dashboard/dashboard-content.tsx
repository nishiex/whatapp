

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import {
  Users, TrendingUp, RefreshCw, FileText, Phone, Bell, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Activity, Sparkles, Wallet, Target,
  CalendarIcon, X, ChevronDown, UserCheck, UserX,
} from "lucide-react"
import { differenceInDays, format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"


// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

// const BRAND   = "#4F46E5"
// const BRAND2  = "#7C3AED"
// const SUCCESS = "#059669"
// const WARN    = "#D97706"
// const DANGER  = "#E11D48"
// const SKY     = "#0EA5E9"

// const TILE_GRADIENTS = [
//   ["#6D5DF6", "#8B7CF8"],   // 0 purple
//   ["#1E5FE0", "#2E7BF6"],   // 1 blue
//   ["#0E8FD9", "#23B6E0"],   // 2 cyan
//   ["#0FA968", "#22C97E"],   // 3 green
//   ["#E11D48", "#F43F5E"],   // 4 red    — danger / due
//   ["#D97706", "#F59E0B"],   // 5 amber  — warn / partial
// ]

// const SVC_COLORS = ["#4F46E5", "#0EA5E9", "#059669", "#D97706", "#E11D48", "#7C3AED"]



// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const BRAND   = "#4338CA"   // deep indigo — primary
const BRAND2  = "#7C3AED"   // violet — secondary accent
const SUCCESS = "#0D9488"   // teal — calmer than emerald, reads more premium
const WARN    = "#B45309"   // deep amber
const DANGER  = "#BE123C"   // deep rose
const SKY     = "#0369A1"   // deep sky blue

const TILE_GRADIENTS = [
  ["#4F46E5", "#7C3AED"],   // 0 indigo → violet
  ["#1D4ED8", "#3B82F6"],   // 1 blue
  ["#0E7490", "#0EA5E9"],   // 2 teal → cyan
  ["#047857", "#10B981"],   // 3 green
  ["#9F1239", "#E11D48"],   // 4 rose — danger / due
  ["#B45309", "#F59E0B"],   // 5 amber — warn / partial
]

const SVC_COLORS = ["#4338CA", "#0369A1", "#0D9488", "#B45309", "#BE123C", "#7C3AED"]
// ─── Date-range preset ───────────────────────────────────────────────────────

type Preset = "7d" | "30d" | "90d" | "this_month" | "last_month" | "custom"

interface DateRange { from: Date; to: Date }

function getPresetRange(preset: Preset, custom?: DateRange): DateRange {
  const now = new Date()
  switch (preset) {
    case "7d":         return { from: subDays(now, 7),  to: now }
    case "30d":        return { from: subDays(now, 30), to: now }
    case "90d":        return { from: subDays(now, 90), to: now }
    case "this_month": return { from: startOfMonth(now), to: endOfMonth(now) }
    case "last_month": {
      const lm = subMonths(now, 1)
      return { from: startOfMonth(lm), to: endOfMonth(lm) }
    }
    case "custom":     return custom ?? { from: subDays(now, 30), to: now }
    default:           return { from: subDays(now, 30), to: now }
  }
}

const PRESET_LABELS: Record<Preset, string> = {
  "7d":         "Last 7 days",
  "30d":        "Last 30 days",
  "90d":        "Last 90 days",
  "this_month": "This month",
  "last_month": "Last month",
  "custom":     "Custom range",
}

// ─── Retainer helpers ─────────────────────────────────────────────────────────

const getClientName    = (r: any) => r?.clientName    ?? r?.client_name    ?? ""
const getMonthlyAmount = (r: any) => Number(r?.monthlyAmount ?? r?.monthly_amount ?? 0)
const getRenewalDate   = (r: any) => r?.renewalDate   ?? r?.renewal_date   ?? ""

const getDaysToRenewal = (renewalDate: string): number => {
  if (!renewalDate) return Infinity
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const renewal = new Date(renewalDate)
  return differenceInDays(renewal, today)
}

const RETAINER_SVC: Record<string, string> = {
  whatsapp: "WhatsApp", website: "Website", digital_marketing: "Digital Mktg",
  crm: "CRM", lms: "LMS", mobile_app: "Mobile App", admin_panel: "Admin Panel",
  devops: "DevOps", "social-media": "Social Media", other: "Other",
}

const SVC: Record<string, string> = {
  website: "Website", whatsapp: "WhatsApp", lms: "LMS", crm: "CRM",
  "social-media": "Social Media", digital_marketing: "Digital Mktg",
  mobile_app: "Mobile App", devops: "DevOps", admin_panel: "Admin Panel", other: "Other",
}

// ✅ NEW — mirrors leads-content.tsx's own isLeadConverted exactly. The
// Leads page hides converted leads from its table AND from its
// Total/Pipeline/Expected sums (its "Won Deals" stat is the one exception —
// that one still counts converted leads). Without this same check here, the
// dashboard's Pipeline/Expected tiles kept summing leads that had already
// become clients, double-counting against the new client's deal value.
const isLeadConverted = (l: any): boolean => !!(l?.isConverted || l?.convertedCustomerId)

const FUNNEL = [
  { key: "lead",        label: "New Leads",   color: BRAND },
  { key: "demo",        label: "Demo",        color: "#7C3AED" },
  { key: "proposal",    label: "Proposal",    color: WARN },
  { key: "negotiation", label: "Negotiation", color: SKY },
  { key: "won",         label: "Won",         color: SUCCESS },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtMoney = (v: number): string => {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)}L`
  if (v >= 1_000)       return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${v.toLocaleString("en-IN")}`
}

const fmtPct = (n: number): string => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

const timeAgo = (date: Date): string => {
  const m = Math.floor((Date.now() - date.getTime()) / 60000)
  if (m < 1)  return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// Mirrors customers-content.tsx's own `formatCurrency` exactly, so
// client-side money figures on the dashboard match the Clients page
// pixel-for-pixel (L threshold at ₹10L, K threshold at ₹1K).
const formatClientMoney = (v: number): string => {
  if (v >= 10_00_000) return `₹${(v / 10_00_000).toFixed(1)}L`
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`
  return `₹${v.toLocaleString("en-IN")}`
}

// Mirrors leads-content.tsx's own `fmt` exactly, so lead-side money
// figures on the dashboard match the Leads page pixel-for-pixel (L threshold
// at ₹1L, plain comma-formatted rupees below that — no K shorthand).
const formatLeadMoney = (v: number): string =>
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v > 0 ? `₹${v.toLocaleString("en-IN")}` : "—"

// ─── Animation helpers ────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const fromRef   = useRef(0)

  useEffect(() => {
    fromRef.current = value
    startRef.current = null
    let raf: number
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(elapsed / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(fromRef.current + (target - fromRef.current) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return (
    <div className={`transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} ${className}`}>
      {children}
    </div>
  )
}

// ─── Chart primitives ─────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2 || data.every(v => v === 0)) {
    return <div className="h-8 w-16 sm:w-20 opacity-30 bg-white/30 rounded" />
  }
  const W = 80, H = 32
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible w-16 sm:w-20 h-8">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]}
        r="3" fill={color} />
    </svg>
  )
}

function AnimatedLineChart({
  series, labels,
}: {
  series: { name: string; data: number[]; color: string; fill?: boolean }[]
  labels: string[]
}) {
  const H = 200, W = 640
  const padB = 26, padL = 10, padT = 16, padR = 10
  const iH = H - padT - padB
  const iW = W - padL - padR
  const allVals = series.flatMap(s => s.data)
  const max = Math.max(...allVals, 1)
  const n = labels.length
  const stepX = n > 1 ? iW / (n - 1) : 0

  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 80); return () => clearTimeout(t) }, [])

  const buildPath = (data: number[]) => {
    const pts = data.map((v, i) => ({ x: padL + i * stepX, y: padT + iH - (v / max) * iH }))
    return { pts, d: pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") }
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`fillGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1={padL} y1={padT + iH * f} x2={W - padR} y2={padT + iH * f}
            stroke="#EEF0FB" strokeWidth="1" />
        ))}
        {series.map((s, si) => {
          const { pts, d } = buildPath(s.data)
          const areaPath = `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + iH} L ${pts[0].x.toFixed(1)} ${padT + iH} Z`
          const len = pts.length * (iW / Math.max(n - 1, 1)) * 2 + 200
          return (
            <g key={si}>
              {s.fill && <path d={areaPath} fill={`url(#fillGrad-${si})`} opacity={drawn ? 1 : 0} style={{ transition: "opacity 600ms ease 300ms" }} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={len} strokeDashoffset={drawn ? 0 : len}
                style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(.4,0,.2,1)" }}
              />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5}
                  fill="white" stroke={s.color} strokeWidth="2"
                  opacity={drawn ? 1 : 0}
                  style={{ transition: `opacity 400ms ease ${300 + i * 60}ms` }}
                />
              ))}
            </g>
          )
        })}
        {labels.map((l, i) => (
          <text key={i} x={padL + i * stepX} y={H - 6} textAnchor="middle" fontSize="9" fill="#94A3B8">{l}</text>
        ))}
      </svg>
      {series.length > 1 && (
        <div className="flex items-center gap-4 mt-1 flex-wrap">
          {series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniBarChart({ data, labels, color = BRAND }: { data: number[]; labels: string[]; color?: string }) {
  const H = 120, W = 360
  const padB = 20, padL = 28, padT = 8, padR = 8
  const iH = H - padT - padB
  const iW = W - padL - padR
  const max = Math.max(...data, 1)
  const bW  = iW / data.length
  const gap = bW * 0.35
  const gradId = `barGrad-${color.replace("#", "")}`
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 80); return () => clearTimeout(t) }, [])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[0, Math.ceil(max / 2), max].map((t, i) => {
        const y = padT + iH - (t / max) * iH
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" />
            <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#94A3B8">{t}</text>
          </g>
        )
      })}
      {data.map((v, i) => {
        const bH = v === 0 ? 0 : Math.max((v / max) * iH, 3)
        const x  = padL + i * bW + gap / 2
        const y  = padT + iH - bH
        const bw = bW - gap
        const isLast = i === data.length - 1
        return (
          <g key={i}>
            {v > 0 && (
              <rect x={x} y={drawn ? y : padT + iH} width={bw} height={drawn ? bH : 0} rx="4"
                fill={isLast ? color : `url(#${gradId})`}
                style={{ transition: `y 700ms cubic-bezier(.4,0,.2,1) ${i * 60}ms, height 700ms cubic-bezier(.4,0,.2,1) ${i * 60}ms` }}
              />
            )}
            <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="#94A3B8">{labels[i]}</text>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChart({ data, centerLabel, centerValue }: {
  data: { label: string; value: number; color: string }[]
  centerLabel?: string; centerValue?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const R = 42, CX = 50, CY = 50, STROKE = 15
  const circumference = 2 * Math.PI * R
  let offsetAcc = 0

  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 100); return () => clearTimeout(t) }, [])

  return (
    <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
      <div className="relative w-28 h-28 shrink-0 mx-auto sm:mx-0">
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
          {data.map((d, i) => {
            const frac = d.value / total
            const len  = frac * circumference
            const dash = `${len} ${circumference - len}`
            const offset = -offsetAcc
            offsetAcc += len
            return (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                stroke={d.color} strokeWidth={STROKE}
                strokeDasharray={drawn ? dash : `0 ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{ transition: `stroke-dasharray 900ms cubic-bezier(.4,0,.2,1) ${i * 90}ms` }}
              />
            )
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && <span className="text-sm font-extrabold text-gray-900 tabular-nums">{centerValue}</span>}
            {centerLabel && <span className="text-[9px] text-gray-400">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 w-full sm:w-auto space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-gray-600 truncate">{d.label}</span>
            </span>
            <span className="font-bold text-gray-800 tabular-nums shrink-0">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

// function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
//   return (
//     <div className="flex items-baseline gap-2 mb-3">
//       {color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />}
//       <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{children}</h2>
//     </div>
//   )
// }
function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {color && (
        <span className="w-5 h-[3px] rounded-full shrink-0" style={{ backgroundColor: color }} />
      )}
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{children}</h2>
    </div>
  )
}

// function GradientTile({
//   label, value, isMoney, gradient, trend, sparkData, sub, icon: Icon, displayValue,
// }: {
//   label: string; value: number; isMoney?: boolean
//   gradient: [string, string]; trend?: number; sparkData?: number[]
//   sub?: string; icon?: React.ElementType; displayValue?: string
// }) {
//   const animated = useCountUp(value)
//   const display = displayValue ?? (isMoney ? fmtMoney(animated) : Math.round(animated).toLocaleString("en-IN"))
//   return (
//     <div
//       className="rounded-2xl p-3.5 sm:p-4 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden cursor-default select-none min-w-0"
//       style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
//     >
//       <div className="absolute -right-4 -top-6 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
//       <div className="absolute -right-1 -bottom-5 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
//       <div className="relative flex items-start justify-between gap-2">
//         <div className="min-w-0 flex-1">
//           <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 truncate">{label}</p>
//           <p className="text-xl sm:text-2xl font-extrabold mt-1.5 tabular-nums leading-none truncate">{display}</p>
//           {sub && (
//             <div className="flex items-center gap-0.5 mt-2 min-w-0">
//               <ArrowUpRight className="h-3 w-3 text-white/60 shrink-0" />
//               <span className="text-[11px] font-semibold text-white/75 truncate">{sub}</span>
//             </div>
//           )}
//           {trend !== undefined && !sub && (
//             <div className="flex items-center gap-0.5 mt-2">
//               {trend >= 0
//                 ? <ArrowUpRight className="h-3 w-3 text-white/80 shrink-0" />
//                 : <ArrowDownRight className="h-3 w-3 text-white/80 shrink-0" />}
//               <span className="text-[11px] font-semibold text-white/90">{fmtPct(Math.abs(trend))}</span>
//             </div>
//           )}
//         </div>
//         <div className="flex flex-col items-end gap-2 shrink-0">
//           {Icon && (
//             <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
//               <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-white" />
//             </div>
//           )}
//           {sparkData && <Sparkline data={sparkData} color="#FFFFFF" />}
//         </div>
//       </div>
//     </div>
//   )
// }

function GradientTile({
  label, value, isMoney, gradient, trend, sparkData, sub, icon: Icon, displayValue,
}: {
  label: string; value: number; isMoney?: boolean
  gradient: [string, string]; trend?: number; sparkData?: number[]
  sub?: string; icon?: React.ElementType; displayValue?: string
}) {
  const animated = useCountUp(value)
  const display = displayValue ?? (isMoney ? fmtMoney(animated) : Math.round(animated).toLocaleString("en-IN"))
  return (
    <div
      className="rounded-2xl p-3.5 sm:p-4 text-white transition-all duration-300 relative overflow-hidden cursor-default select-none min-w-0 hover:-translate-y-0.5"
      style={{
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        boxShadow: `0 1px 2px 0 rgba(15,23,42,0.06), 0 8px 20px -8px ${gradient[0]}66`,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 8px 0 rgba(15,23,42,0.08), 0 16px 32px -10px ${gradient[0]}80` }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 1px 2px 0 rgba(15,23,42,0.06), 0 8px 20px -8px ${gradient[0]}66` }}
    >
      <div className="absolute -right-4 -top-6 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-1 -bottom-5 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold mt-1.5 tabular-nums leading-none truncate">{display}</p>
          {sub && (
            <div className="flex items-center gap-0.5 mt-2 min-w-0">
              <ArrowUpRight className="h-3 w-3 text-white/60 shrink-0" />
              <span className="text-[11px] font-semibold text-white/75 truncate">{sub}</span>
            </div>
          )}
          {trend !== undefined && !sub && (
            <div className="flex items-center gap-0.5 mt-2">
              {trend >= 0
                ? <ArrowUpRight className="h-3 w-3 text-white/80 shrink-0" />
                : <ArrowDownRight className="h-3 w-3 text-white/80 shrink-0" />}
              <span className="text-[11px] font-semibold text-white/90">{fmtPct(Math.abs(trend))}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {Icon && (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/15 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-white" />
            </div>
          )}
          {sparkData && <Sparkline data={sparkData} color="#FFFFFF" />}
        </div>
      </div>
    </div>
  )
}

// function ActionCard({
//   count, label, desc, cta, ctaColor, onClick, urgent, icon: Icon, tint,
// }: {
//   count: number; label: string; desc: string
//   cta: string; ctaColor: string; onClick?: () => void; urgent?: boolean
//   icon: React.ElementType; tint: "red" | "amber"
// }) {
//   const hasAction = count > 0 && !!onClick
//   const active = count > 0
//   const tintCls = tint === "red"
//     ? { bg: "bg-red-50", text: "text-red-600", border: "border-red-100" }
//     : { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" }
//   return (
//     <div className={`bg-white rounded-2xl border ${active && urgent ? "border-red-200" : active ? "border-amber-200" : "border-gray-100"} p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow min-w-0`}>
//       <div className="flex items-start justify-between gap-2">
//         <div className="min-w-0">
//           <p className={`text-2xl sm:text-3xl font-bold leading-none tabular-nums ${count === 0 ? "text-gray-200" : urgent ? "text-red-600" : "text-amber-600"}`}>
//             {count}
//           </p>
//           <p className="text-sm font-semibold text-gray-700 mt-1.5 truncate">{label}</p>
//           <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
//         </div>
//         <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${active ? tintCls.bg : "bg-gray-50"} ${active ? tintCls.border : "border-gray-100"}`}>
//           <Icon className={`h-4 w-4 ${active ? tintCls.text : "text-gray-300"}`} />
//         </div>
//       </div>
//       <button type="button" onClick={onClick} disabled={!hasAction}
//         className={`w-full text-xs font-semibold rounded-xl py-2.5 transition-colors ${hasAction ? `${ctaColor} text-white` : "bg-gray-100 text-gray-300 cursor-default"}`}>
//         {cta} →
//       </button>
//     </div>
//   )
// }
function ActionCard({
  count, label, desc, cta, ctaColor, onClick, urgent, icon: Icon, tint,
}: {
  count: number; label: string; desc: string
  cta: string; ctaColor: string; onClick?: () => void; urgent?: boolean
  icon: React.ElementType; tint: "red" | "amber"
}) {
  const hasAction = count > 0 && !!onClick
  const active = count > 0
  const tintCls = tint === "red"
    ? { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-100" }
    : { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" }
  return (
    <div
      className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 min-w-0 hover:-translate-y-0.5 ${
        active && urgent ? "border-rose-200" : active ? "border-amber-200" : "border-gray-100"
      }`}
      style={{ boxShadow: "0 1px 2px 0 rgba(15,23,42,0.04), 0 2px 8px -2px rgba(15,23,42,0.06)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-2xl sm:text-3xl font-bold leading-none tabular-nums ${count === 0 ? "text-gray-200" : urgent ? "text-rose-600" : "text-amber-600"}`}>
            {count}
          </p>
          <p className="text-sm font-semibold text-gray-700 mt-1.5 truncate">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${active ? tintCls.bg : "bg-gray-50"} ${active ? tintCls.border : "border-gray-100"}`}>
          <Icon className={`h-4 w-4 ${active ? tintCls.text : "text-gray-300"}`} />
        </div>
      </div>
      <button type="button" onClick={onClick} disabled={!hasAction}
        className={`w-full text-xs font-semibold rounded-xl py-2.5 transition-colors ${hasAction ? `${ctaColor} text-white` : "bg-gray-100 text-gray-300 cursor-default"}`}>
        {cta} →
      </button>
    </div>
  )
}
function BarRow({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 100); return () => clearTimeout(t) }, [])
  const pct = drawn && max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-xs text-gray-600 truncate min-w-0">{label}</span>
        <span className="flex items-center gap-2 shrink-0 ml-2">
          {sub && <span className="text-[10px] text-gray-400">{sub}</span>}
          <span className="text-xs font-bold text-gray-800 tabular-nums">{value}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// function Panel({ title, sub, children, badge, icon: Icon, accentColor }: {
//   title: string; sub?: string; children: React.ReactNode
//   badge?: React.ReactNode; icon?: React.ElementType; accentColor?: string
// }) {
//   return (
//     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 border-t-[3px] hover:shadow-md transition-shadow min-w-0"
//       style={{ borderTopColor: accentColor ?? "#E2E8F0" }}>
//       <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
//         <div className="flex items-start gap-2.5 min-w-0">
//           {Icon && accentColor && (
//             <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${accentColor}1A` }}>
//               <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
//             </div>
//           )}
//           <div className="min-w-0">
//             <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
//             {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
//           </div>
//         </div>
//         {badge}
//       </div>
//       {children}
//     </div>
//   )
// }
function Panel({ title, sub, children, badge, icon: Icon, accentColor }: {
  title: string; sub?: string; children: React.ReactNode
  badge?: React.ReactNode; icon?: React.ElementType; accentColor?: string
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 border-t-[3px] transition-all duration-300 min-w-0 hover:-translate-y-0.5"
      style={{
        borderTopColor: accentColor ?? "#E2E8F0",
        boxShadow: "0 1px 2px 0 rgba(15,23,42,0.04), 0 2px 8px -2px rgba(15,23,42,0.06)",
      }}
    >
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && accentColor && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${accentColor}14`, border: `1px solid ${accentColor}22` }}>
              <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
          </div>
        </div>
        {badge}
      </div>
      {children}
    </div>
  )
}
// function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
//   const cls: Record<string, string> = {
//     gray:  "bg-gray-100 text-gray-500",
//     green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
//     amber: "bg-amber-50 text-amber-700 border border-amber-200",
//     red:   "bg-red-50 text-red-700 border border-red-200",
//     blue:  "bg-indigo-50 text-indigo-700 border border-indigo-200",
//   }
//   return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${cls[color] ?? cls.gray}`}>{children}</span>
// }


function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const cls: Record<string, string> = {
    gray:  "bg-gray-50 text-gray-500 border border-gray-200",
    green: "bg-teal-50 text-teal-700 border border-teal-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red:   "bg-rose-50 text-rose-700 border border-rose-200",
    blue:  "bg-indigo-50 text-indigo-700 border border-indigo-200",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${cls[color] ?? cls.gray}`}>{children}</span>
}
// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangeFilter({
  preset, customRange, onPresetChange, onCustomChange,
}: {
  preset: Preset
  customRange: DateRange
  onPresetChange: (p: Preset) => void
  onCustomChange: (r: DateRange) => void
}) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [tempFrom, setTempFrom] = useState("")
  const [tempTo,   setTempTo]   = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const range = getPresetRange(preset, customRange)
  const label = preset === "custom"
    ? `${format(customRange.from, "d MMM")} → ${format(customRange.to, "d MMM")}`
    : PRESET_LABELS[preset]

  const applyCustom = () => {
    if (!tempFrom || !tempTo) return
    const from = new Date(tempFrom)
    const to   = new Date(tempTo)
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return
    onCustomChange({ from: startOfDay(from), to: endOfDay(to) })
    onPresetChange("custom")
    setShowCustom(false)
    setOpen(false)
  }

  const PRESETS: Preset[] = ["7d", "30d", "90d", "this_month", "last_month"]

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap ${
          preset !== "30d"
            ? "border-blue-400 bg-blue-50 text-blue-700"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
        }`}
      >
        <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline truncate max-w-[120px]">{label}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 min-w-[200px] max-w-[90vw]">
          {/* Preset list */}
          {PRESETS.map(p => (
            <button key={p} type="button"
              onClick={() => { onPresetChange(p); setShowCustom(false); setOpen(false) }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                preset === p && preset !== "custom"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}>
              {PRESET_LABELS[p]}
            </button>
          ))}

          <div className="border-t border-gray-100 my-1.5" />

          {/* Custom range toggle */}
          <button type="button"
            onClick={() => { setShowCustom(v => !v); setTempFrom(format(customRange.from, "yyyy-MM-dd")); setTempTo(format(customRange.to, "yyyy-MM-dd")) }}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              preset === "custom" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
            }`}>
            Custom range…
          </button>

          {showCustom && (
            <div className="mt-2 px-2 space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase">From</label>
                <input type="date" value={tempFrom} onChange={e => setTempFrom(e.target.value)}
                  className="w-full h-8 rounded-xl border border-gray-200 text-xs px-2.5 focus:outline-none focus:border-blue-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase">To</label>
                <input type="date" value={tempTo} onChange={e => setTempTo(e.target.value)}
                  className="w-full h-8 rounded-xl border border-gray-200 text-xs px-2.5 focus:outline-none focus:border-blue-400" />
              </div>
              <button type="button" onClick={applyCustom}
                className="w-full h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors">
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardContent({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const {
    customers, leads, invoices = [], isLoading,
    retainers = [],
    refreshCustomers, refreshLeads, refreshInvoices, refreshRetainers,
  } = useCRM() as any

  const safeRetainers: any[] = Array.isArray(retainers) ? retainers : []

  // ── Date range filter state ──────────────────────────────────────────
  const [preset,      setPreset]      = useState<Preset>("30d")
  const [customRange, setCustomRange] = useState<DateRange>({ from: subDays(new Date(), 30), to: new Date() })

  const activeRange = useMemo(() => getPresetRange(preset, customRange), [preset, customRange])

  useEffect(() => {
    void Promise.all([refreshCustomers(), refreshLeads(), refreshInvoices(), refreshRetainers?.()])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const now = new Date()

  // Previous period: same-length window before activeRange
  const rangeLenMs  = activeRange.to.getTime() - activeRange.from.getTime()
  const prevEnd     = new Date(activeRange.from.getTime() - 1)
  const prevStart   = new Date(prevEnd.getTime() - rangeLenMs)

  const inCur  = (v: unknown) => {
    const d = new Date(v as string)
    return !isNaN(d.getTime()) && d >= activeRange.from && d <= activeRange.to
  }
  const inPrev = (v: unknown) => {
    const d = new Date(v as string)
    return !isNaN(d.getTime()) && d >= prevStart && d <= prevEnd
  }
  const pctChg = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : +((c - p) / p * 100).toFixed(1)

  // ── Metrics (recomputed whenever range or data changes) ───────────────
  const metrics = useMemo(() => {
    const paidInv  = (invoices as any[]).filter((i: any) => i.status === "paid")
    const revCur   = paidInv.filter((i: any) => inCur(i.paidDate ?? i.paid_date ?? i.issueDate)).reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)
    const revPrev  = paidInv.filter((i: any) => inPrev(i.paidDate ?? i.paid_date ?? i.issueDate)).reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)

    const activeC  = customers.filter((c: any) => c.status === "active").length
    const newCCur  = customers.filter((c: any) => inCur(c.createdAt ?? c.created_at)).length
    const newCPrev = customers.filter((c: any) => inPrev(c.createdAt ?? c.created_at)).length

    const openLeads = leads.filter((l: any) => !["won", "lost"].includes(l.status))
    const lCur  = openLeads.filter((l: any) => inCur(l.createdAt ?? l.created_at)).length
    const lPrev = leads.filter((l: any) => !["won", "lost"].includes(l.status) && inPrev(l.createdAt ?? l.created_at)).length

    const converted = leads.filter((l: any) => l.status === "won" || l.isConverted).length
    const convRate  = leads.length > 0 ? (converted / leads.length) * 100 : 0

    const activeRet = safeRetainers.filter((r) => r.status === "active")
    const mrr = activeRet.reduce((s, r) => s + getMonthlyAmount(r), 0)

    const overdueInv = (invoices as any[]).filter((i: any) => i.status === "overdue")
    const overdueAmt = overdueInv.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0)

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const fuOverdue = leads.filter((l: any) => {
      const fu = l.follow_up_date; if (!fu) return false
      const d  = new Date(fu); d.setHours(0, 0, 0, 0)
      return d < todayStart && !["won", "lost"].includes(l.status)
    })
    const fuToday = leads.filter((l: any) => {
      const fu = l.follow_up_date; if (!fu) return false
      return fu.toString().slice(0, 10) === now.toISOString().slice(0, 10) && !["won", "lost"].includes(l.status)
    })

    const retRenewalsUrgent = activeRet.filter((r) => { const d = getDaysToRenewal(getRenewalDate(r)); return d >= 0 && d <= 7 })
    const retRenewals30     = activeRet.filter((r) => { const d = getDaysToRenewal(getRenewalDate(r)); return d >= 0 && d <= 30 })

    const avgInvoiceValue = paidInv.length > 0
      ? paidInv.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0) / paidInv.length
      : 0

    // ── Payment Due — total unpaid amount across all customers ──────────
    const totalDue  = customers.reduce((s: number, c: any) => {
      const total = Number(c.dealValue ?? 0)
      const paid  = Number(c.paidAmount ?? 0)
      return s + Math.max(total - paid, 0)
    }, 0)
    const totalPaid = customers.reduce((s: number, c: any) => s + (Number(c.paidAmount) || 0), 0)
    const clientsWithDue = customers.filter((c: any) => {
      const total = Number(c.dealValue ?? 0)
      const paid  = Number(c.paidAmount ?? 0)
      return total > 0 && paid < total
    }).length

    // ── NEW: Total deal value across all clients (for the new Client KPI) ──
    const totalDealValue = customers.reduce((s: number, c: any) => s + (Number(c.dealValue) || 0), 0)

    // ── NEW: Sales pipeline value — open leads only, excludes won/lost ─────
    const ExpectedpipelineValue         = openLeads.reduce((s: number, l: any) => s + (Number(l.totalAmount ?? l.total_amount ?? l.estimatedValue ?? 0)), 0)
    const expectedPipelineValuee = openLeads.reduce((s: number, l: any) => s + (Number(l.expectedAmount ?? l.expected_amount ?? 0)), 0)

    // ✅ FIXED — Pipeline value & Expected value now exclude converted leads,
    // matching the Leads page exactly (its Pipeline/Expected tiles are summed
    // from `filtered`, which hides converted leads — only its "Won Deals"
    // tile still counts them). Without this exclusion, a lead that converts
    // to a client kept inflating these two numbers on the dashboard even
    // though it had already disappeared from the Leads page's own totals.
    const nonConvertedLeads = leads.filter((l: any) => !isLeadConverted(l))
    const pipelineValue         = nonConvertedLeads.reduce((s: number, l: any) => s + (Number(l.totalAmount ?? l.total_amount ?? l.estimatedValue ?? 0)), 0)
    const expectedPipelineValue = nonConvertedLeads.reduce((s: number, l: any) => s + (Number(l.expectedAmount ?? l.expected_amount ?? 0)), 0)

    return {
      revCur, revPrev, revTrend: pctChg(revCur, revPrev),
      activeC, newCCur, newCPrev, cTrend: pctChg(newCCur, newCPrev),
      openLeads: openLeads.length, lCur, lPrev, lTrend: pctChg(lCur, lPrev),
      convRate: convRate.toFixed(1), convRateNum: convRate,
      mrr,
      overdueInv: overdueInv.length, overdueAmt,
      fuOverdue, fuToday,
      retRenewalsUrgent, retRenewals30,
      avgInvoiceValue, paidInvCount: paidInv.length,
      totalDue, totalPaid, clientsWithDue,
      totalDealValue, pipelineValue, expectedPipelineValue,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, leads, invoices, safeRetainers, activeRange])

  // Lead KPI tiles. Mirrors the Leads page's own GradientTile row
  // exactly (Total Leads / Won Deals / Pipeline / Expected / Follow-ups).
  const leadKpiStats = useMemo(() => {
    // ✅ FIXED — "Total Leads" now excludes converted leads, matching the
    // Leads page's `filtered.length` (which hides converted leads from its
    // table and from this exact stat). "Won Deals" intentionally still
    // counts the full list — that's how the Leads page's own `won` stat
    // works (converted leads keep counting as Won).
    const nonConverted = leads.filter((l: any) => !isLeadConverted(l))
    const total = nonConverted.length
    const won   = leads.filter((l: any) => l.status === "won").length
    return {
      total,
      won,
      pipeline:     metrics.pipelineValue,
      expected:     metrics.expectedPipelineValue,
      followUpsDue: metrics.fuOverdue.length,
    }
  }, [leads, metrics])

  // Client KPI tiles. Mirrors the Clients page's own GradientTile
  // row exactly (Total Clients / Active / Prospects / Total Deal Value /
  // Payment Due).
  const clientKpiStats = useMemo(() => {
    const total    = customers.length
    const active   = customers.filter((c: any) => c.status === "active").length
    const prospect = customers.filter((c: any) => c.status === "prospect").length
    const inactive = customers.filter((c: any) => c.status === "inactive").length
    return {
      total, active, prospect, inactive,
      totalDeal: metrics.totalDealValue,
      totalPaid: metrics.totalPaid,
      totalDue:  metrics.totalDue,
    }
  }, [customers, metrics])

  // ── Chart data — bucketed to selected range ───────────────────────────

  // Build N evenly-spaced buckets across activeRange (max 6 for readability)
  const chartBuckets = useMemo(() => {
    const rangeMs  = activeRange.to.getTime() - activeRange.from.getTime()
    const dayCount = Math.round(rangeMs / 86_400_000)
    const bucketCount = dayCount <= 7 ? dayCount : 6
    const bucketMs = rangeMs / bucketCount
    return Array.from({ length: bucketCount }, (_, i) => {
      const s = new Date(activeRange.from.getTime() + i * bucketMs)
      const e = new Date(activeRange.from.getTime() + (i + 1) * bucketMs - 1)
      const label = dayCount <= 7
        ? format(s, "EEE")
        : format(s, "d MMM")
      return { s, e, label }
    })
  }, [activeRange])

  const sparkRev = useMemo(() =>
    chartBuckets.map(({ s, e }) =>
      (invoices as any[])
        .filter((inv: any) => inv.status === "paid")
        .filter((inv: any) => {
          const d = new Date(inv.paidDate ?? inv.paid_date ?? inv.issueDate ?? 0)
          return d >= s && d <= e
        })
        .reduce((sum: number, inv: any) => sum + (Number(inv.total) || 0), 0)
    )
  , [invoices, chartBuckets])

  const dealsClosedByMonth = useMemo(() =>
    chartBuckets.map(({ s, e }) =>
      (invoices as any[])
        .filter((inv: any) => inv.status === "paid")
        .filter((inv: any) => {
          const d = new Date(inv.paidDate ?? inv.paid_date ?? inv.issueDate ?? 0)
          return d >= s && d <= e
        }).length
    )
  , [invoices, chartBuckets])

  const sparkLeads = useMemo(() =>
    chartBuckets.map(({ s, e }) =>
      leads.filter((l: any) => {
        const d = new Date(l.created_at ?? l.createdAt ?? 0)
        return d >= s && d <= e
      }).length
    )
  , [leads, chartBuckets])

  const monthLeads = sparkLeads   // reuse for bar chart

  const monthLabels = chartBuckets.map(b => b.label)

  const funnelCounts = useMemo(() =>
    FUNNEL.map(s => ({ ...s, count: leads.filter((l: any) => l.status === s.key).length }))
  , [leads])

  const svcMap = useMemo(() => {
    const m: Record<string, number> = {}
    customers.forEach((c: any) => { const k = c.service ?? "other"; m[k] = (m[k] ?? 0) + 1 })
    return Object.entries(m)
      .map(([k, v], i) => ({ label: SVC[k] ?? k, value: v, color: SVC_COLORS[i % SVC_COLORS.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [customers])

  const upcomingRenewals = useMemo(() =>
    safeRetainers
      .filter((r) => r.status === "active")
      .map((r) => ({ ...r, _days: getDaysToRenewal(getRenewalDate(r)) }))
      .filter((r) => r._days <= 30)
      .sort((a, b) => a._days - b._days)
      .slice(0, 5)
  , [safeRetainers])

  const recentActivity = useMemo(() => {
    type Item = { id: string; type: "lead" | "client"; name: string; sub: string; time: Date }
    const items: Item[] = [
      ...leads.slice(0, 20).map((l: any) => ({
        id: l.id, type: "lead" as const, name: l.name, sub: `New lead · ${l.source ?? "—"}`,
        time: new Date(l.created_at ?? l.createdAt ?? 0),
      })),
      ...customers.slice(0, 20).map((c: any) => ({
        id: c.id, type: "client" as const, name: c.name, sub: "Converted to client",
        time: new Date(c.created_at ?? c.createdAt ?? 0),
      })),
    ]
    return items.filter(i => !isNaN(i.time.getTime())).sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8)
  }, [leads, customers])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] p-4 sm:p-6 animate-pulse">
        <div className="max-w-screen-xl mx-auto space-y-5">
          <div className="h-8 w-40 bg-gray-200 rounded-xl" />
          <div className="h-28 bg-gray-200 rounded-3xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
          </div>
          <div className="h-44 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F6FB]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4"
        style={{ boxShadow: "0 1px 6px 0 rgba(0,0,0,0.06)" }}>
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-3 flex-wrap gap-y-2">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-gray-900">Overview</h1>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <DateRangeFilter
              preset={preset}
              customRange={customRange}
              onPresetChange={setPreset}
              onCustomChange={setCustomRange}
            />

            <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
            </span>
            <Button variant="outline" size="sm"
              className="rounded-xl border-gray-200 text-gray-500 text-xs gap-1.5 h-8"
              onClick={() => void Promise.all([refreshCustomers(), refreshLeads(), refreshInvoices(), refreshRetainers?.()])}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Active range indicator */}
        {preset !== "30d" && (
          <div className="max-w-screen-xl mx-auto mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex-wrap">
              <CalendarIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{format(activeRange.from, "d MMM yyyy")} → {format(activeRange.to, "d MMM yyyy")}</span>
              <button onClick={() => setPreset("30d")} className="ml-0.5 text-blue-400 hover:text-blue-600 shrink-0">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-7 sm:space-y-8">

        {/* ══ KPI Layers — Lead pipeline → Client portfolio → Invoices & retainers ══ */}
        <Reveal delay={0}>

          {/* ── Layer 1: Lead pipeline KPIs — mirrors the Leads page exactly ── */}
          <SectionLabel color={BRAND}>Lead pipeline</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <GradientTile
              label="Total Leads" value={leadKpiStats.total}
              gradient={TILE_GRADIENTS[0] as [string, string]}
              sub="all leads" icon={Users}
            />
            <GradientTile
              label="Won Deals" value={leadKpiStats.won}
              gradient={TILE_GRADIENTS[1] as [string, string]}
              sub="closed" icon={CheckCircle2}
            />
            <GradientTile
              label="Pipeline Value" value={leadKpiStats.pipeline}
              displayValue={formatLeadMoney(leadKpiStats.pipeline)}
              gradient={TILE_GRADIENTS[2] as [string, string]}
              sub="total amount" icon={TrendingUp}
            />
            <GradientTile
              label="Expected Value" value={leadKpiStats.expected}
              displayValue={formatLeadMoney(leadKpiStats.expected)}
              gradient={TILE_GRADIENTS[5] as [string, string]}
              sub="what you'll collect" icon={Target}
            />
            <GradientTile
              label={leadKpiStats.followUpsDue > 0 ? "Follow-ups Due" : "Follow-ups"}
              value={leadKpiStats.followUpsDue}
              gradient={leadKpiStats.followUpsDue > 0 ? TILE_GRADIENTS[4] as [string, string] : TILE_GRADIENTS[3] as [string, string]}
              sub={leadKpiStats.followUpsDue > 0 ? "needs attention" : "all clear ✓"}
              icon={Bell}
            />
          </div>

          {/* ── Layer 2: Client portfolio KPIs — mirrors the Clients page exactly ── */}
          <div className="mt-6 sm:mt-7">
            <SectionLabel color={SUCCESS}>Client portfolio</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <GradientTile
                label="Total Clients" value={clientKpiStats.total}
                gradient={TILE_GRADIENTS[0] as [string, string]}
                sub="all clients" icon={Users}
              />
              <GradientTile
                label="Active" value={clientKpiStats.active}
                gradient={TILE_GRADIENTS[1] as [string, string]}
                sub={`${Math.round((clientKpiStats.active / (clientKpiStats.total || 1)) * 100)}% of total`}
                icon={UserCheck}
              />
              <GradientTile
                label="Prospects" value={clientKpiStats.prospect}
                gradient={TILE_GRADIENTS[5] as [string, string]}
                sub={`${clientKpiStats.inactive} inactive`}
                icon={UserX}
              />
              <GradientTile
                label="Total Deal Value" value={clientKpiStats.totalDeal}
                displayValue={clientKpiStats.totalDeal > 0 ? formatClientMoney(clientKpiStats.totalDeal) : "₹0"}
                gradient={TILE_GRADIENTS[2] as [string, string]}
                sub={clientKpiStats.totalPaid > 0 ? `${formatClientMoney(clientKpiStats.totalPaid)} collected` : "no payments yet"}
                icon={TrendingUp}
              />
              <GradientTile
                label={clientKpiStats.totalDue > 0 ? "Payment Due" : "Payments"}
                value={clientKpiStats.totalDue}
                displayValue={clientKpiStats.totalDue > 0 ? formatClientMoney(clientKpiStats.totalDue) : "₹0"}
                gradient={clientKpiStats.totalDue > 0 ? TILE_GRADIENTS[4] as [string, string] : TILE_GRADIENTS[3] as [string, string]}
                sub={clientKpiStats.totalDue > 0 ? "still to collect" : "fully collected ✓"}
                icon={Wallet}
              />
            </div>
          </div>

          {/* ── Layer 3: Invoices & retainers KPIs ── */}
          <div className="mt-6 sm:mt-7">
            <SectionLabel color={WARN}>Invoices &amp; retainers</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <GradientTile
                label="Revenue this period" value={metrics.revCur} isMoney
                gradient={TILE_GRADIENTS[0] as [string, string]}
                trend={metrics.revTrend} sparkData={sparkRev}
                icon={TrendingUp}
              />
              <GradientTile
                label="Monthly Recurring (MRR)" value={metrics.mrr} isMoney
                gradient={TILE_GRADIENTS[2] as [string, string]}
                sub={`ARR ${fmtMoney(metrics.mrr * 12)}`}
                icon={Activity}
              />
              <GradientTile
                label="Avg. Invoice Value" value={metrics.avgInvoiceValue} isMoney
                gradient={TILE_GRADIENTS[3] as [string, string]}
                sub={`${metrics.paidInvCount} paid invoice${metrics.paidInvCount !== 1 ? "s" : ""}`}
                icon={FileText}
              />
              <GradientTile
                label="Overdue Invoices" value={metrics.overdueInv}
                gradient={metrics.overdueInv > 0 ? TILE_GRADIENTS[4] as [string, string] : TILE_GRADIENTS[3] as [string, string]}
                sub={metrics.overdueAmt > 0 ? `${fmtMoney(metrics.overdueAmt)} pending` : "All clear"}
                icon={FileText}
              />
              <GradientTile
                label="Retainer Renewals" value={metrics.retRenewalsUrgent.length}
                gradient={metrics.retRenewalsUrgent.length > 0 ? TILE_GRADIENTS[5] as [string, string] : TILE_GRADIENTS[3] as [string, string]}
                sub={
                  metrics.retRenewalsUrgent.length > 0
                    ? "within 7 days"
                    : metrics.retRenewals30.length > 0
                      ? `${metrics.retRenewals30.length} within 30 days`
                      : "All clear ✓"
                }
                icon={Bell}
              />
            </div>
          </div>

        </Reveal>


        {/* ══ Hero: animated revenue/deals line chart + pipeline donut ══ */}
        <Reveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-5">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 min-w-0">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Revenue &amp; deals closed</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {PRESET_LABELS[preset] ?? "Selected period"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <Sparkles className="h-3 w-3 shrink-0" /> {fmtMoney(metrics.revCur)}
                </span>
              </div>
              <AnimatedLineChart
                labels={monthLabels}
                series={[
                  { name: "Revenue collected", data: sparkRev, color: BRAND, fill: true },
                  { name: "Deals closed (count ×1000)", data: dealsClosedByMonth.map(v => v * 1000), color: SKY },
                ]}
              />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 min-w-0">
              <h3 className="text-sm font-semibold text-gray-800">Sales pipeline</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 mb-3">Leads by current stage</p>
              <DonutChart
                data={funnelCounts.map(s => ({ label: s.label, value: s.count, color: s.color }))}
                centerLabel="total leads"
                centerValue={String(funnelCounts.reduce((a, s) => a + s.count, 0))}
              />
              {/* Payment summary below donut */}
              {metrics.totalDue > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <div className="bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100 min-w-0">
                    <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest">Collected</p>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5 tabular-nums truncate">{fmtMoney(metrics.totalPaid)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl px-3 py-2.5 border border-red-100 min-w-0">
                    <p className="text-[9px] font-bold text-red-500/70 uppercase tracking-widest">Still Due</p>
                    <p className="text-sm font-bold text-red-600 mt-0.5 tabular-nums truncate">{fmtMoney(metrics.totalDue)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Reveal>

        {/* ══ Needs attention ════════════════════════════════════════════ */}
        <Reveal delay={150}>
          <SectionLabel color={DANGER}>Needs your attention</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <ActionCard
              count={metrics.fuOverdue.length}
              label="Overdue follow-ups"
              desc={metrics.fuToday.length > 0 ? `+ ${metrics.fuToday.length} due today` : "Leads that missed scheduled callback"}
              // cta="View leads" ctaColor="bg-red-500 hover:bg-red-600" urgent icon={Phone} tint="red"
              cta="View leads" ctaColor="bg-rose-600 hover:bg-rose-700" urgent icon={Phone} tint="red"
              onClick={metrics.fuOverdue.length > 0 ? () => onNavigate?.("leads") : undefined}
            />
            <ActionCard
              count={metrics.overdueInv}
              label="Overdue invoices"
              desc={metrics.overdueAmt > 0 ? `${fmtMoney(metrics.overdueAmt)} pending collection` : "All invoices collected"}
              // cta="View invoices" ctaColor="bg-red-500 hover:bg-red-600" urgent icon={FileText} tint="red"
              cta="View invoices" ctaColor="bg-rose-600 hover:bg-rose-700" urgent icon={FileText} tint="red"
              onClick={metrics.overdueInv > 0 ? () => onNavigate?.("invoices") : undefined}
            />
            <ActionCard
              count={metrics.retRenewalsUrgent.length}
              label="Retainer renewals due"
              desc={metrics.retRenewals30.length > metrics.retRenewalsUrgent.length ? `${metrics.retRenewals30.length} total within 30 days` : "Within next 7 days"}
              cta="Manage retainers" ctaColor="bg-amber-500 hover:bg-amber-600" icon={Bell} tint="amber"
              onClick={metrics.retRenewalsUrgent.length > 0 ? () => onNavigate?.("retainers") : undefined}
            />
          </div>
        </Reveal>

        {/* ══ Pipeline & activity ════════════════════════════════════════ */}
        <Reveal delay={200}>
          <SectionLabel color={SKY}>Lead volume &amp; activity</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

            <Panel title="Lead volume" sub={`New leads · ${PRESET_LABELS[preset]}`} icon={TrendingUp} accentColor={SKY}
              badge={<Pill color="blue">{monthLeads.reduce((a, b) => a + b, 0)} total</Pill>}>
              <MiniBarChart data={monthLeads} labels={monthLabels} color={SKY} />
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-sky-50/60 rounded-xl p-3 border border-sky-100 min-w-0">
                  <p className="text-[10px] text-sky-600/70 font-semibold uppercase tracking-wide">Latest bucket</p>
                  <p className="text-xl font-bold text-sky-900 mt-0.5 tabular-nums">{monthLeads[monthLeads.length - 1] ?? 0}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg / period</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5 tabular-nums">
                    {monthLeads.length > 0 ? (monthLeads.reduce((a, b) => a + b, 0) / monthLeads.length).toFixed(0) : "0"}
                  </p>
                </div>
              </div>
            </Panel>

            <Panel title="Pipeline funnel" sub="Stage-by-stage volume" icon={Target} accentColor={BRAND}>
              <div className="space-y-3">
                {funnelCounts.map((stage, idx) => {
                  const prev = idx > 0 ? funnelCounts[idx - 1].count : stage.count
                  const drop = prev > 0 && idx > 0 ? Math.round(((prev - stage.count) / prev) * 100) : null
                  return (
                    <BarRow key={stage.key} label={stage.label} value={stage.count}
                      max={Math.max(...funnelCounts.map(s => s.count), 1)} color={stage.color}
                      sub={drop !== null && drop > 0 ? `-${drop}%` : undefined}
                    />
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400">Lead → Won rate</span>
                <span className="text-sm font-bold text-gray-800 tabular-nums">
                  {funnelCounts[0]?.count > 0 ? `${((funnelCounts[4]?.count ?? 0) / funnelCounts[0].count * 100).toFixed(1)}%` : "—"}
                </span>
              </div>
            </Panel>

            <Panel title="Recent activity" sub="Latest leads & conversions" icon={Activity} accentColor={SUCCESS}>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                  <Activity className="h-7 w-7 mb-2" />
                  <p className="text-xs text-gray-400">No activity yet</p>
                </div>
              ) : (
                <div className="relative space-y-4">
                  <div className="absolute left-3.5 top-1 bottom-1 w-px bg-gray-100" aria-hidden />
                  {recentActivity.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="relative flex items-start gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ring-4 ring-white ${
                        item.type === "lead" ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}>
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(item.time)}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </Reveal>

        {/* ══ Recurring business ═════════════════════════════════════════ */}
        <Reveal delay={250}>
          <SectionLabel color={BRAND2}>Recurring business</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

            <Panel
              title="Upcoming retainer renewals" sub="Active clients renewing within 30 days" icon={Bell} accentColor={WARN}
              badge={upcomingRenewals.length > 0 ? <Pill color="amber">{upcomingRenewals.length} due</Pill> : <Pill color="green">All clear</Pill>}
            >
              {upcomingRenewals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                  <CheckCircle2 className="h-7 w-7 mb-2" />
                  <p className="text-xs text-gray-400">No renewals due in 30 days</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingRenewals.map((r) => {
                    const urgent = r._days <= 7
                    return (
                      <div key={r.id} className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border min-w-0 ${urgent ? "border-red-100 bg-red-50/40" : "border-amber-100 bg-amber-50/30"}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${urgent ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                          {getClientName(r).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{getClientName(r)}</p>
                          <p className="text-[10px] text-gray-400 truncate">{RETAINER_SVC[r.service] ?? r.service}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${urgent ? "text-red-600 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                            {r._days <= 0 ? "Overdue" : r._days === 0 ? "Today" : `${r._days}d`}
                          </span>
                          <p className="text-[10px] font-bold text-emerald-700 mt-0.5 tabular-nums whitespace-nowrap">{fmtMoney(getMonthlyAmount(r))}/mo</p>
                        </div>
                      </div>
                    )
                  })}
                  <button onClick={() => onNavigate?.("retainers")}
                    className="w-full text-center text-xs text-indigo-500 hover:text-indigo-700 font-semibold py-1.5 hover:bg-indigo-50 rounded-xl transition-colors">
                    View all retainers →
                  </button>
                </div>
              )}
            </Panel>

            <Panel
              title="Clients by service" sub="Share of your active service lines" icon={Users} accentColor={BRAND2}
              badge={<Pill color="blue">{customers.length} clients</Pill>}
            >
              {svcMap.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No clients yet</p>
              ) : (
                <DonutChart data={svcMap} centerLabel="clients" centerValue={String(customers.length)} />
              )}
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-violet-50/60 rounded-xl py-2 border border-violet-100 min-w-0">
                  <p className="text-[10px] font-bold text-violet-600/70 uppercase tracking-wide truncate">MRR</p>
                  <p className="text-sm font-bold text-violet-700 mt-0.5 tabular-nums truncate">{fmtMoney(metrics.mrr)}</p>
                </div>
                <div className="bg-indigo-50/60 rounded-xl py-2 border border-indigo-100 min-w-0">
                  <p className="text-[10px] font-bold text-indigo-600/70 uppercase tracking-wide truncate">ARR</p>
                  <p className="text-sm font-bold text-indigo-700 mt-0.5 tabular-nums truncate">{fmtMoney(metrics.mrr * 12)}</p>
                </div>
                <div className="bg-emerald-50/60 rounded-xl py-2 border border-emerald-100 min-w-0">
                  <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wide truncate">Win rate</p>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5 tabular-nums truncate">{metrics.convRate}%</p>
                </div>
              </div>
            </Panel>
          </div>
        </Reveal>

      </div>
    </div>
  )
}