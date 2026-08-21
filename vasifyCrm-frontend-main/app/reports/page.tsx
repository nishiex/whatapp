
// "use client"

// import { useAuth } from "@/contexts/auth-context"
// import { LoginForm } from "@/components/auth/login-form"
// import { Header } from "@/components/layout/header"
// import { ReportsContent } from "@/components/reports/reports-content"

// export default function ReportsPage() {
//   const { user, isLoading } = useAuth()

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
//       </div>
//     )
//   }

//   if (!user) {
//     return <LoginForm />
//   }

//   return (
//     <div className="flex-1 flex flex-col overflow-hidden">
//       <Header />
//       <main className="flex-1 overflow-auto">
//         <ReportsContent />
//       </main>
//     </div>
//   )
// }


//testing
"use client"

import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { ReportsContent } from "@/components/reports/reports-content"

export default function ReportsPage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <ReportsContent />
}