
"use client"

import { useAuth } from "@/contexts/auth-context"
import UsersPage from "@/components/admin/UsersPage"

export default function AdminUsersPage() {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        You do not have permission to view this page.
      </div>
    )
  }

  return <UsersPage />
}



