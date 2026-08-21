// "use client"

// import { useAuth } from "@/contexts/auth-context"
// import { LoginForm } from "@/components/auth/login-form"
// import { Sidebar } from "@/components/layout/sidebar"
// import { Header } from "@/components/layout/header"
// import { CustomersContent } from "@/components/customers/customers-content"

// export default function CustomersPage() {
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
//     <div className="flex h-screen bg-background">
//       <Sidebar />
//       <div className="flex-1 flex flex-col overflow-hidden">
//         <Header />
//         <main className="flex-1 overflow-auto">
//           <CustomersContent />
//         </main>
//       </div>
//     </div>
//   )
// }


//testing

// app/customers/page.tsx

"use client"

import { useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { CustomersContent } from "@/components/customers/customers-content"

export default function CustomersPage() {
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

  return <CustomersContent />
}