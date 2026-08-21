
"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { LoginForm } from "@/components/auth/login-form"

const NO_SIDEBAR_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  const isPublicRoute = NO_SIDEBAR_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  // Public routes — no shell, no sidebar
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Auth loading — show spinner, prevents layout flash
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3A7AFE]" />
      </div>
    )
  }

  // Not logged in — AppShell shows login, pages never need to check this
  if (!user) {
    return <LoginForm />
  }

  // ✅ Authenticated — Sidebar rendered ONCE here, never in any page file
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}