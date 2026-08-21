"use client"

import React, { useState } from "react"
import {
  X,
  User,
  Mail,
  Lock,
  Shield,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
} from "lucide-react"

type UserRole = "admin" | "sales" | "user"

export interface EditableUser {
  id: string
  name: string
  email: string
  role: UserRole
  is_active: boolean
}

interface UserFormModalProps {
  mode?: "create" | "edit"
  user?: EditableUser | null 
  onClose: () => void
  onSave: (payload: {
    name: string
    email: string
    password: string 
    role: string
  }) => Promise<void> | void
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  mode = "create",
  user = null,
  onClose,
  onSave,
}) => {
  const isEdit = mode === "edit"

  const [name, setName] = useState(user?.name ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>(user?.role ?? "user")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name || !email) {
      setError("Name and email are required.")
      return
    }
    // 🆕 CHANGED — password only required when creating a new user
    if (!isEdit && !password) {
      setError("Password is required.")
      return
    }
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    try {
      setLoading(true)
      await onSave({ name, email, password, role })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.error || `Failed to ${isEdit ? "update" : "create"} user.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Premium Backdrop with Blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container with Glassmorphism */}
      <div className="relative w-full max-w-lg animate-in zoom-in-95 duration-300">
        <div className="relative overflow-hidden rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
          {/* Gradient Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl" />

          {/* Header */}
          <div className="relative border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-transparent via-indigo-500/5 to-purple-500/5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-xl">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {isEdit ? "Edit User" : "Create New User"}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {isEdit
                      ? "Update this team member's details"
                      : "Add a new team member to your workspace"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="group h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="relative mx-6 mt-6 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200 dark:border-red-800 animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                    Error
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative p-6 space-y-5">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <User className="h-4 w-4 text-slate-500" />
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-slate-900 dark:text-white placeholder:text-slate-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Mail className="h-4 w-4 text-slate-500" />
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-slate-900 dark:text-white placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input — 🆕 CHANGED: optional + relabeled in edit mode.
                There is no way to retrieve a user's existing password (it's
                stored hashed, not plaintext) — this field only ever *sets* a
                new one. */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Lock className="h-4 w-4 text-slate-500" />
                {isEdit ? "New Password" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 text-slate-900 dark:text-white placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? "Leave blank to keep current password" : "Minimum 6 characters"}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                {isEdit
                  ? "Only fill this in if you want to reset their password"
                  : "Must be at least 6 characters long"}
              </p>
            </div>

            {/* Role Selection — unchanged 3-column grid (User / Sales / Admin) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Shield className="h-4 w-4 text-slate-500" />
                User Role
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("user")}
                  disabled={loading}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    role === "user"
                      ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        role === "user"
                          ? "bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <User
                        className={`h-5 w-5 ${
                          role === "user"
                            ? "text-white"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          role === "user"
                            ? "text-indigo-900 dark:text-indigo-200"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        User
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Demo / client
                      </p>
                    </div>
                  </div>
                  {role === "user" && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRole("sales")}
                  disabled={loading}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    role === "sales"
                      ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        role === "sales"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <Briefcase
                        className={`h-5 w-5 ${
                          role === "sales"
                            ? "text-white"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          role === "sales"
                            ? "text-emerald-900 dark:text-emerald-200"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Sales
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Own leads only
                      </p>
                    </div>
                  </div>
                  {role === "sales" && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  disabled={loading}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                    role === "admin"
                      ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        role === "admin"
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    >
                      <Shield
                        className={`h-5 w-5 ${
                          role === "admin"
                            ? "text-white"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          role === "admin"
                            ? "text-purple-900 dark:text-purple-200"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        Admin
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Full control
                      </p>
                    </div>
                  </div>
                  {role === "admin" && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex-1 overflow-hidden px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-xl hover:shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEdit ? "Saving..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      {isEdit ? "Save Changes" : "Create User"}
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserFormModal