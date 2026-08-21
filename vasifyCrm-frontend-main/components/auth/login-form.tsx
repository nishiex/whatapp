
"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, MessageSquare, TrendingUp, Users, Zap, Shield, Lock } from "lucide-react"

const FEATURES = [
  { icon: MessageSquare, text: "WhatsApp automation & bulk messaging" },
  { icon: TrendingUp,    text: "Smart lead pipeline & conversion tracking" },
  { icon: Users,         text: "Unified client & deal management" },
  { icon: Zap,           text: "Real-time campaigns & analytics" },
]

export function LoginForm() {
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const { login, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const trimmed = email.trim()
    if (!trimmed || !password) {
      setError("Please enter both email and password")
      return
    }
    const success = await login(trimmed, password)
    if (!success) setError("Invalid email or password. Please try again.")
  }

  return (
    // Completely isolated full-screen layout — AppShell must NOT wrap this.
    // Sidebar visibility is controlled in AppShell by checking `user` from useAuth.
    <div className="min-h-screen w-full flex" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* ── Left brand panel ────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #064E3B 0%, #065F46 35%, #059669 75%, #10B981 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)" }} />
        <div className="absolute -bottom-40 -right-20 w-[560px] h-[560px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)" }} />

        {/* Logo — icon only, no broken image */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.3)" }}
          >
            <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-xl tracking-tight leading-none">VasifyTech</div>
            <div className="text-emerald-200 text-[11px] font-medium mt-0.5 tracking-widest uppercase">CRM Platform</div>
          </div>
        </div>

        {/* Headline + features */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-[40px] font-bold text-white leading-[1.15] tracking-tight">
              Transform your<br />
              <span className="text-emerald-300">WhatsApp business</span><br />
              into a growth engine
            </h1>
            <p className="mt-5 text-emerald-100 text-[15px] leading-relaxed max-w-[360px]">
              The all-in-one CRM built for modern businesses running on WhatsApp automation, smart pipelines, and real-time insights.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
                >
                  <Icon className="h-4 w-4 text-white" strokeWidth={1.8} />
                </div>
                <span className="text-emerald-50 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-emerald-400 text-xs">
            VasifyTech PVT LTD · Since 2024 · Mumbai · Internal use only
          </p>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-6 py-12">

        {/* Mobile logo (lg hidden on desktop) */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #064E3B, #10B981)" }}
          >
            <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-lg leading-none">VasifyTech</div>
            <div className="text-gray-400 text-xs mt-0.5">CRM Platform</div>
          </div>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Internal-only badge */}
          <div className="mb-6">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: "#ECFDF5", color: "#065F46", border: "1px solid #A7F3D0" }}
            >
              <Lock className="h-3 w-3" />
              Internal CRM · Authorised Access Only
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-gray-900 tracking-tight leading-tight">
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Sign in with your VasifyTech team credentials
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@vasifytech.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 bg-white text-sm shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 bg-white text-sm shadow-sm"
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 rounded-xl py-3">
                <AlertDescription className="text-red-600 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-sm font-semibold text-white shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              style={{ background: "linear-gradient(135deg, #064E3B 0%, #059669 60%, #10B981 100%)" }}
            >
              {isLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
                : "Sign in to CRM"
              }
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center space-y-1">
            <p className="text-xs text-gray-400">
              This is a private internal tool. Unauthorised access is prohibited.
            </p>
            <p className="text-xs font-semibold" style={{ color: "#065F46" }}>
              VasifyTech PVT LTD · WhatsApp Business Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}