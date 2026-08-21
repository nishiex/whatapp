"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import usersApi, { CreateUserPayload, UpdateUserPayload } from "@/lib/users-api"
import UserFormModal from "./UserFormModal"
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  MoreVertical,
  Crown,
  User as UserIcon,
  Briefcase,
  Pencil,
  Trash2, 
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface CRMUser {
  id: string
  name: string
  email: string
  role: "admin" | "sales" | "user"
  is_active: boolean
  created_at: string
}

const UsersPage: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState<CRMUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<CRMUser | null>(null) // 🆕 NEW
  const [deletingId, setDeletingId] = useState<string | null>(null) // 🆕 NEW — disables the row's delete button mid-request
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!user || !isAdmin) return
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const list = await usersApi.list()
        setUsers(list)
      } catch (err: any) {
        setError(err?.response?.data?.error || "Failed to fetch users")
      } finally {
        setLoading(false)
      }
    }
    void fetchUsers()
  }, [user, isAdmin])

  const handleCreateUser = async (payload: CreateUserPayload) => {
    const created = await usersApi.create(payload)
    setUsers((prev) => [created, ...prev])
  }

  // 🆕 NEW — shared onSave handler for the modal when it's in edit mode
  const handleUpdateUser = async (payload: UpdateUserPayload) => {
    if (!editingUser) return
    // don't send an empty password — that means "keep the current one"
    const { password, ...rest } = payload
    const updatePayload: UpdateUserPayload = password ? payload : rest
    const updated = await usersApi.update(editingUser.id, updatePayload)
    setUsers((prev) =>
      prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u))
    )
  }

  // 🆕 NEW
  const handleDeleteUser = async (targetUser: CRMUser) => {
    if (targetUser.id === user?.id) {
      alert("You cannot delete your own account.")
      return
    }
    const confirmed = window.confirm(
      `Delete ${targetUser.name}? This can't be undone. If they have leads, invoices, or other records linked to them, deleting will be blocked — deactivate them instead in that case.`
    )
    if (!confirmed) return

    try {
      setDeletingId(targetUser.id)
      await usersApi.delete(targetUser.id)
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id))
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete user")
    } finally {
      setDeletingId(null)
    }
  }

  const toggleStatus = async (id: string, currentIsActive: boolean) => {
    try {
      await usersApi.updateStatus(id, !currentIsActive)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, is_active: !currentIsActive } : u,
        ),
      )
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update status")
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.role === "admin").length,
    sales: users.filter((u) => u.role === "sales").length,
    inactive: users.filter((u) => !u.is_active).length,
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-8">
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl max-w-md w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Authentication Required</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Please login to access user management.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-8">
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl max-w-md w-full">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-2xl">
              <XCircle className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Access Denied</h3>
            <p className="text-slate-600 dark:text-slate-400">
              You do not have permission to view this page.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-black p-8 md:p-12 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
              <Shield className="w-3.5 h-3.5 text-indigo-300" />
              <span className="text-xs font-medium text-white">Admin Panel</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-3">
                  User Management
                </h1>
                <p className="text-slate-300 text-base md:text-lg max-w-2xl">
                  Manage team members, roles, and access permissions
                </p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="group relative overflow-hidden px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 w-fit"
              >
                <UserPlus className="w-5 h-5" />
                Create User
                <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-0 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 backdrop-blur-xl shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            <CardHeader className="relative pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Total Users
                  </CardTitle>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                    {stats.total}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            <CardHeader className="relative pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Active Users
                  </CardTitle>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                    {stats.active}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            <CardHeader className="relative pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Administrators
                  </CardTitle>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                    {stats.admins}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            <CardHeader className="relative pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Sales Team
                  </CardTitle>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                    {stats.sales}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Briefcase className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-0 group-hover:opacity-5 transition-opacity duration-500" />
            <CardHeader className="relative pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Inactive Users
                  </CardTitle>
                  <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                    {stats.inactive}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <XCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg overflow-hidden">
          <CardHeader className="border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-transparent to-indigo-500/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">All Users</CardTitle>
                <CardDescription>
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl animate-pulse">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">Loading users...</p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-lg">
                  <Users className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No users found</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {searchQuery ? "Try adjusting your search" : "Create your first user to get started"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="group p-6 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-6">
                      {/* Avatar */}
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                          u.role === "admin"
                            ? "bg-gradient-to-br from-purple-500 to-pink-500"
                            : u.role === "sales"
                            ? "bg-gradient-to-br from-teal-500 to-cyan-500"
                            : "bg-gradient-to-br from-blue-500 to-cyan-500"
                        }`}>
                          <span className="text-lg font-bold text-white">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {u.is_active && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </h3>
                          {u.role === "admin" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                              <Crown className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                          {u.role === "sales" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg">
                              <Briefcase className="w-3 h-3" />
                              Sales
                            </span>
                          )}
                          {u.role === "user" && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <UserIcon className="w-3 h-3" />
                              User
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            {u.email}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(u.created_at).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="hidden md:block">
                        {u.is_active ? (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 border border-slate-200 dark:border-slate-700">
                            <XCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              Inactive
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 🆕 NEW — Edit / Delete actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser(u)}
                          title="Edit user"
                          className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 flex items-center justify-center transition-all duration-300 hover:scale-105"
                        >
                          <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={deletingId === u.id || u.id === user?.id}
                          title={u.id === user?.id ? "You can't delete your own account" : "Delete user"}
                          className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center transition-all duration-300 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </button>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => toggleStatus(u.id, u.is_active)}
                        className={`px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all duration-300 hover:scale-105 ${
                          u.is_active
                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-red-500/50"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-emerald-500/50"
                        }`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showCreate && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSave={handleCreateUser}
        />
      )}

      {/* 🆕 NEW — edit modal, reuses the same UserFormModal in edit mode */}
      {editingUser && (
        <UserFormModal
          mode="edit"
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdateUser}
        />
      )}
    </div>
  )
}

export default UsersPage