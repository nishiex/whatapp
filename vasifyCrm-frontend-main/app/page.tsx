// "use client"

// import { useAuth } from "@/contexts/auth-context"
// import { LoginForm } from "@/components/auth/login-form"
// import { DashboardContent } from "@/components/dashboard/dashboard-content"

// export default function HomePage() {
//   const { user, isLoading } = useAuth()

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
//       </div>
//     )
//   }

//   if (!user) {
//     return <LoginForm />
//   }

//   // AppShell (in layout.tsx) already wraps this with <Sidebar /> + <main>.
//   // Just render the page content directly — no extra flex wrapper needed.
//   return <DashboardContent />
// }

//test


"use client"

import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default function HomePage() {
  return <DashboardContent />
}