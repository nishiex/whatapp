"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FolderKanban,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  ReceiptIndianRupee,
   UserCog
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

const MAIN_NAV = [
  { name: "Dashboard", href: "/",          icon: LayoutDashboard },
  { name: "Leads",     href: "/leads",     icon: UserPlus },
  { name: "Clients",   href: "/customers", icon: Users },
  // { name: "dev",     href: "/dev-task",     icon: UserCog },
  { name: "Retainers", href: "/retainers", icon: RefreshCw },
  { name: "Invoices",  href: "/invoices",  icon: ReceiptIndianRupee },
  { name: "Reports",   href: "/reports",   icon: BarChart3 },
  { name: "Projects",  href: "/projects",  icon: FolderKanban },
];
const ADMIN_NAV = [
  { name: "Users",    href: "/admin/users"    },
  // { name: "Settings", href: "/admin/settings" },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname  = usePathname()
  const { isAdmin } = useAuth()

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen bg-white border-r border-gray-100 transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[68px]" : "w-[220px]",
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex items-center border-b border-gray-100 shrink-0 overflow-hidden",
        collapsed ? "h-[72px] justify-center px-0" : "h-[72px] px-5",
      )}>
        <Link href="/" className="flex items-center h-full w-full">
          <div
            className={cn(
              "relative shrink-0 transition-all duration-300",
              collapsed ? "w-10 h-10 mx-auto" : "w-[150px] h-10",
            )}
          >
            <Image
              src="/vasifytech-logo.png"
              alt="VasifyTech"
              fill
              priority
              sizes="150px"
              className={cn(
                "object-contain",
                collapsed && "object-left scale-[3] origin-left",
              )}
            />
          </div>
        </Link>
      </div>

      {/* ── Main nav ─────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 py-4">
        {!collapsed && (
          <div className="px-5 mb-2.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Main
            </span>
          </div>
        )}

        <nav className="px-3 space-y-0.5">
          {MAIN_NAV.map((item) => {
            const active = isActive(item.href)
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group relative flex items-center rounded-xl transition-all duration-150 cursor-pointer select-none",
                    collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 h-10",
                    active
                      ? "bg-blue-50 text-[#2563EB] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#2563EB] rounded-r-full" />
                  )}
                  <item.icon
                    className={cn(
                      "shrink-0 transition-colors",
                      collapsed ? "h-[18px] w-[18px]" : "h-[17px] w-[17px]",
                      active
                        ? "text-[#2563EB]"
                        : "text-gray-400 group-hover:text-gray-600",
                    )}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {!collapsed && (
                    <span className={cn(
                      "text-sm font-medium leading-none",
                      active
                        ? "text-[#2563EB]"
                        : "text-gray-600 group-hover:text-gray-900",
                    )}>
                      {item.name}
                    </span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                      {item.name}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* ── Admin section ────────────────────────────────────────── */}
        {isAdmin && (
          <>
            {!collapsed && (
              <div className="px-5 mt-6 mb-2.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Admin
                </span>
              </div>
            )}
            {collapsed && <div className="my-3 mx-3 border-t border-gray-100" />}

            <nav className="px-3 space-y-0.5 mt-1">
              {ADMIN_NAV.map((item) => {
                const active = pathname === item.href
                const Icon   = item.name === "Settings" ? Settings : Users
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        "group relative flex items-center rounded-xl transition-all duration-150 cursor-pointer select-none",
                        collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3 h-10",
                        active
                          ? "bg-blue-50 text-[#2563EB] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#2563EB] rounded-r-full" />
                      )}
                      <Icon
                        className={cn(
                          "shrink-0",
                          collapsed ? "h-[18px] w-[18px]" : "h-[17px] w-[17px]",
                          active
                            ? "text-[#2563EB]"
                            : "text-gray-400 group-hover:text-gray-600",
                        )}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      {!collapsed && (
                        <span className={cn(
                          "text-sm font-medium leading-none",
                          active
                            ? "text-[#2563EB]"
                            : "text-gray-600 group-hover:text-gray-900",
                        )}>
                          {item.name}
                        </span>
                      )}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                          {item.name}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </nav>
          </>
        )}
      </ScrollArea>

      {/* ── Collapse toggle ───────────────────────────────────────────── */}
      <div className="shrink-0 p-3 border-t border-gray-100">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center justify-center rounded-xl h-9 transition-all duration-150 text-gray-400 hover:text-gray-700 hover:bg-gray-100",
            collapsed ? "w-10 mx-auto" : "w-full gap-2",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}