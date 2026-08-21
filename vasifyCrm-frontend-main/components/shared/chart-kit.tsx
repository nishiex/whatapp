"use client"

// ─────────────────────────────────────────────────────────────────────────────
// SHARED REPORTING UI KIT
//
// Extracted from DashboardContent so the Dashboard and Reports pages render
// charts with one implementation instead of two that quietly drift apart.
// If you change a chart's look here, both pages pick it up automatically.
//
// Recommended follow-up: point DashboardContent's local chart components at
// these exports too, and delete its copies — kept untouched in this pass
// since it wasn't part of what was asked for, but the duplication is real
// maintenance debt.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react"

// ─── Design tokens ────────────────────────────────────────────────────────────

export const BRAND = "#4F46E5"   // indigo-600
export const BRAND2 = "#7C3AED"  // violet-600
export const SUCCESS = "#059669"
export const WARN = "#D97706"
export const DANGER = "#E11D48"
export const SKY = "#0EA5E9"

export const TILE_GRADIENTS: [string, string][] = [
  ["#6D5DF6", "#8B7CF8"], // purple
  ["#1E5FE0", "#2E7BF6"], // blue
  ["#0E8FD9", "#23B6E0"], // cyan
  ["#0FA968", "#22C97E"], // green/teal
]

export const SERIES_COLORS = [BRAND, SKY, SUCCESS, WARN, DANGER, BRAND2]

// ─── Formatters ───────────────────────────────────────────────────────────────

export const fmtMoney = (v: number): string => {
  if (!Number.isFinite(v)) return "₹0"
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${Math.round(v).toLocaleString("en-IN")}`
}

export const fmtPct = (n: number): string => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

export const timeAgo = (date: Date): string => {
  const m = Math.floor((Date.now() - date.getTime()) / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Animation helpers ────────────────────────────────────────────────────────

export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

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

export function Reveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
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

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2 || data.every((v) => v === 0)) {
    return <div className="h-8 w-16 sm:w-20 opacity-30 bg-white/30 rounded" aria-hidden />
  }
  const W = 80, H = 32
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`)
  const [lastX, lastY] = pts[pts.length - 1].split(",")
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible w-16 sm:w-20 h-8" role="img" aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  )
}

export function AnimatedLineChart({
  series, labels, height = 200,
}: {
  series: { name: string; data: number[]; color: string; fill?: boolean }[]
  labels: string[]
  height?: number
}) {
  const H = height, W = 640
  const padB = 26, padL = 10, padT = 16, padR = 10
  const iH = H - padT - padB
  const iW = W - padL - padR
  const allVals = series.flatMap((s) => s.data)
  const max = Math.max(...allVals, 1)
  const n = labels.length
  const stepX = n > 1 ? iW / (n - 1) : 0

  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 80); return () => clearTimeout(t) }, [])

  const buildPath = (data: number[]) => {
    const pts = data.map((v, i) => ({ x: padL + i * stepX, y: padT + iH - (v / max) * iH }))
    return { pts, d: pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") }
  }

  if (allVals.every((v) => v === 0)) {
    return <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>No data for this period</div>
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label="Line chart">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`fillGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {[0.25, 0.5, 0.75].map((f, i) => (
          <line key={i} x1={padL} y1={padT + iH * f} x2={W - padR} y2={padT + iH * f} stroke="#EEF0FB" strokeWidth="1" />
        ))}

        {series.map((s, si) => {
          const { pts, d } = buildPath(s.data)
          const areaPath = `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${padT + iH} L ${pts[0].x.toFixed(1)} ${padT + iH} Z`
          const len = pts.length * (iW / Math.max(n - 1, 1)) * 2 + 200
          return (
            <g key={si}>
              {s.fill && (
                <path d={areaPath} fill={`url(#fillGrad-${si})`} opacity={drawn ? 1 : 0}
                  style={{ transition: "opacity 600ms ease 300ms" }} />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={len} strokeDashoffset={drawn ? 0 : len}
                style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(.4,0,.2,1)" }} />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5}
                  fill="white" stroke={s.color} strokeWidth="2" opacity={drawn ? 1 : 0}
                  style={{ transition: `opacity 400ms ease ${300 + i * 60}ms` }} />
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

export function MiniBarChart({
  data, labels, color = BRAND, grouped, groupColors, groupNames,
}: {
  data: number[] | number[][]
  labels: string[]
  color?: string
  grouped?: boolean
  groupColors?: string[]
  groupNames?: string[]
}) {
  const H = 150, W = 480
  const padB = 24, padL = 28, padT = 8, padR = 8
  const iH = H - padT - padB
  const iW = W - padL - padR

  const datasets = grouped ? (data as number[][]) : [data as number[]]
  const allVals = datasets.flat()
  const max = Math.max(...allVals, 1)
  const n = labels.length
  const ds = datasets.length
  const slotW = iW / n
  const gap = slotW * 0.22
  const bW = (slotW - gap) / ds
  const bGap = bW * 0.08
  const clrs = groupColors ?? [color]

  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 80); return () => clearTimeout(t) }, [])

  if (allVals.every((v) => v === 0)) {
    return <div className="flex items-center justify-center text-xs text-gray-400" style={{ height: H }}>No data for this period</div>
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none" role="img" aria-label="Bar chart">
        {[0, Math.ceil(max / 2), max].map((t, i) => {
          const y = padT + iH - (t / max) * iH
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray={i > 0 ? "3,3" : ""} />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#94A3B8">{t}</text>
            </g>
          )
        })}
        {labels.map((l, i) => (
          <text key={i} x={padL + i * slotW + slotW / 2} y={H - 6} textAnchor="middle" fontSize="8" fill="#94A3B8">{l}</text>
        ))}
        {datasets.map((dsData, di) =>
          dsData.map((v, i) => {
            const bH = v === 0 ? 0 : Math.max((v / max) * iH, 3)
            const x = padL + i * slotW + gap / 2 + di * (bW + bGap)
            const y = padT + iH - bH
            const bw = bW - bGap
            return (
              <rect key={`${di}-${i}`} x={x} y={drawn ? y : padT + iH} width={bw} height={drawn ? bH : 0} rx="3"
                fill={clrs[di % clrs.length]} opacity={ds === 1 ? 0.9 : 0.85}
                style={{ transition: `y 650ms cubic-bezier(.4,0,.2,1) ${i * 40}ms, height 650ms cubic-bezier(.4,0,.2,1) ${i * 40}ms` }}
              />
            )
          })
        )}
      </svg>
      {grouped && groupNames && (
        <div className="flex items-center gap-3 mt-1">
          {groupNames.map((g, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: clrs[i % clrs.length] }} />
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function DonutChart({
  data, centerLabel, centerValue, size = 112,
}: {
  data: { label: string; value: number; color: string }[]
  centerLabel?: string
  centerValue?: string
  size?: number
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const R = 42, CX = 50, CY = 50, STROKE = 15
  const circumference = 2 * Math.PI * R
  let offsetAcc = 0

  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 100); return () => clearTimeout(t) }, [])

  const hasData = data.some((d) => d.value > 0)

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="-rotate-90" style={{ width: size, height: size }} role="img" aria-label="Distribution donut chart">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
          {hasData && data.map((d, i) => {
            const frac = d.value / total
            const len = frac * circumference
            const dash = `${len} ${circumference - len}`
            const offset = -offsetAcc
            offsetAcc += len
            return (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={d.color} strokeWidth={STROKE}
                strokeDasharray={drawn ? dash : `0 ${circumference}`} strokeDashoffset={offset} strokeLinecap="butt"
                style={{ transition: `stroke-dasharray 900ms cubic-bezier(.4,0,.2,1) ${i * 90}ms` }} />
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
      <div className="flex-1 min-w-0 space-y-2">
        {!hasData && <p className="text-xs text-gray-400">No data yet</p>}
        {data.filter((d) => d.value > 0).map((d, i) => (
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

export function BarRow({
  label, value, max, color, sub,
}: { label: string; value: number; max: number; color: string; sub?: string }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), 100); return () => clearTimeout(t) }, [])
  const pct = drawn && max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-xs text-gray-600 truncate">{label}</span>
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

// ─── KPI tile ─────────────────────────────────────────────────────────────────

export function GradientTile({
  label, value, isMoney, isPercent, gradient, trend, sparkData,
}: {
  label: string; value: number; isMoney?: boolean; isPercent?: boolean
  gradient: [string, string]; trend?: number; sparkData?: number[]
}) {
  const animated = useCountUp(value)
  const display = isMoney
    ? fmtMoney(animated)
    : isPercent
      ? `${animated.toFixed(1)}%`
      : Math.round(animated).toLocaleString("en-IN")
  return (
    <div
      className="rounded-2xl p-4 text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      <div className="absolute -right-4 -top-6 w-20 h-20 rounded-full bg-white/10" aria-hidden />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/80 truncate">{label}</p>
        <p className="text-2xl font-extrabold mt-1.5 tabular-nums leading-none">{display}</p>
        <div className="flex items-center justify-between mt-2.5 min-h-[20px]">
          {trend !== undefined ? (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-white/90">
              {trend >= 0 ? "↑" : "↓"} {fmtPct(Math.abs(trend))} vs prev
            </span>
          ) : <span />}
          {sparkData && <Sparkline data={sparkData} color="#FFFFFF" />}
        </div>
      </div>
    </div>
  )
}

// ─── Layout atoms ─────────────────────────────────────────────────────────────

export function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      {color && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />}
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{children}</h2>
    </div>
  )
}

export function Panel({
  title, sub, children, badge, icon: Icon, accentColor, className = "",
}: {
  title: string; sub?: string; children: React.ReactNode
  badge?: React.ReactNode; icon?: React.ElementType; accentColor?: string; className?: string
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 border-t-[3px] hover:shadow-md transition-shadow ${className}`}
      style={{ borderTopColor: accentColor ?? "#E2E8F0" }}
    >
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && accentColor && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${accentColor}1A` }}>
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

export function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const cls: Record<string, string> = {
    gray: "bg-gray-100 text-gray-500",
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    blue: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls[color] ?? cls.gray}`}>{children}</span>
}

export function EmptyState({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-300">
      <Icon className="h-7 w-7 mb-2" aria-hidden />
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}