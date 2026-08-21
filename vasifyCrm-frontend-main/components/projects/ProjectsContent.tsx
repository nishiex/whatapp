
"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus, RefreshCw, Download, FolderKanban,
  AlertTriangle, TrendingUp, Clock, CheckCircle2, Zap,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { authHeader, jsonAuthHeader, getToken } from "@/lib/auth"
import ProjectList from "@/components/projects/ProjectList"
import ProjectForm from "@/components/projects/ProjectForm"

// ─────────────────────────────────────────────────────────────────────────────

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  title: string
  client_id: string | null
  client_name: string | null
  deal_id: string | null
  service: string | null
  description: string | null
  status: "Requirement" | "In Progress" | "Delivered" | "On Hold"
  priority: "Low" | "Medium" | "High" | "Critical"
  start_date: string | null
  delivery_date: string | null
  sales_owner: string | null
  project_manager: string | null
  developer_assigned: string | null
  progress_percentage: number
  completion_percentage: number
  project_update: string | null
  notes: string | null
  task_count: number
  task_done_count: number
  created_by_name: string | null
  created_at: string
  updated_at: string
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ElementType
  bg: string
  iconColor: string
  highlight?: boolean
}

function StatCard({ label, value, icon: Icon, bg, iconColor, highlight }: StatCardProps) {
  return (
    <div
      className={`${bg} border rounded-xl p-4 flex items-center justify-between ${highlight ? "ring-2 ring-red-300 ring-offset-1" : ""
        }`}
    >
      <div>
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="bg-white p-2.5 rounded-lg shadow-sm">
        <Icon size={20} className={iconColor} />
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; message: string; type: "success" | "error" }

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${t.type === "error" ? "bg-red-500" : "bg-emerald-500"
            }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmState {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state.open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-base font-bold text-gray-900">{state.title}</h3>
        <p className="text-sm text-gray-500 mt-1.5">{state.message}</p>
        <div className="flex gap-3 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { state.onConfirm(); onClose() }}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Content Component
// ─────────────────────────────────────────────────────────────────────────────

export function ProjectsContent() {
  const { user, isAdmin } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form dialog
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([])
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  // Confirm
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: "", message: "", onConfirm: () => { },
  })
  const openConfirm = (title: string, message: string, fn: () => void) =>
    setConfirm({ open: true, title, message, onConfirm: fn })
  const closeConfirm = () => setConfirm((c) => ({ ...c, open: false }))

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        headers: { Authorization: `Bearer ${typeof window !== "undefined" ? getToken() : ""}` },
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setProjects(Array.isArray(data) ? data : data.projects || [])
    } catch (err: any) {
      setError(err.message || "Failed to load projects")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback((project: Project) => {
    openConfirm(
      "Delete Project",
      `Are you sure you want to delete "${project.title}"? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`${API_BASE}/projects/${project.id}`, {
            method: "DELETE",
            headers: authHeader(),
          })
          if (!res.ok) throw new Error()
          setProjects((prev) => prev.filter((p) => p.id !== project.id))
          showToast("Project deleted")
        } catch {
          showToast("Failed to delete project", "error")
        }
      }
    )
  }, [showToast])

  // ── Quick PATCH: status ───────────────────────────────────────────────────

  const handleStatusChange = useCallback(async (projectId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: "PATCH",
        headers: jsonAuthHeader(),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updated } : p)))
      showToast(`Status → ${status}`)
    } catch {
      showToast("Failed to update status", "error")
    }
  }, [showToast])

  // ── Quick PATCH: progress ─────────────────────────────────────────────────

  const handleProgressChange = useCallback(async (projectId: string, progress: number) => {
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}`, {
        method: "PATCH",
        headers: jsonAuthHeader(),
        body: JSON.stringify({ progress_percentage: progress }),
      })
      if (!res.ok) throw new Error()
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, progress_percentage: progress, completion_percentage: progress }
            : p
        )
      )
    } catch {
      showToast("Failed to update progress", "error")
    }
  }, [showToast])

  // ── Form callbacks ────────────────────────────────────────────────────────

  const openCreate = () => { setEditingProject(null); setShowForm(true) }
  const openEdit = (p: Project) => { setEditingProject(p); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingProject(null) }

  const handleFormSuccess = useCallback(() => {
    closeForm()
    showToast(editingProject ? "Project updated" : "Project created")
    fetchProjects(true)
  }, [editingProject, fetchProjects, showToast])

  // ── CSV Export ────────────────────────────────────────────────────────────

  const handleExport = () => {
    if (!projects.length) return
    const headers = [
      "Title", "Client", "Service", "Status", "Priority",
      "Start Date", "Delivery Date", "Progress %",
      "Sales Owner", "Project Manager", "Developer",
      "Tasks Done", "Tasks Total", "Project Update", "Notes",
    ]
    const rows = projects.map((p) => [
      p.title,
      p.client_name || "",
      p.service || "",
      p.status,
      p.priority,
      p.start_date?.slice(0, 10) || "",
      p.delivery_date?.slice(0, 10) || "",
      p.progress_percentage ?? "",
      p.sales_owner || "",
      p.project_manager || "",
      p.developer_assigned || "",
      p.task_done_count ?? 0,
      p.task_count ?? 0,
      (p.project_update || "").replace(/,/g, ";"),
      (p.notes || "").replace(/,/g, ";"),
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `projects-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast("CSV exported")
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const today = new Date()
  const stats = {
    total: projects.length,
    inProgress: projects.filter((p) => p.status === "In Progress").length,
    delivered: projects.filter((p) => p.status === "Delivered").length,
    onHold: projects.filter((p) => p.status === "On Hold").length,
    // Critical = explicitly Critical priority OR overdue
    critical: projects.filter(
      (p) =>
        p.priority === "Critical" ||
        (p.delivery_date && p.status !== "Delivered" && new Date(p.delivery_date) < today)
    ).length,
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            {stats.critical > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <AlertTriangle size={11} />
                {stats.critical} need attention
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all client projects</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => fetchProjects(true)}
            disabled={refreshing}
            title="Refresh"
            className="p-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExport}
            disabled={!projects.length}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <Download size={14} />
            Export
          </button>

          {/* New Project */}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors"
          >
            <Plus size={17} />
            New Project
          </button>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} icon={TrendingUp} bg="bg-blue-50   border-blue-100" iconColor="text-blue-600" />
        <StatCard label="In Progress" value={stats.inProgress} icon={FolderKanban} bg="bg-yellow-50  border-yellow-100" iconColor="text-yellow-600" />
        <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle2} bg="bg-green-50  border-green-100" iconColor="text-green-600" />
        <StatCard label="On Hold" value={stats.onHold} icon={Clock} bg="bg-gray-50   border-gray-200" iconColor="text-gray-500" />
        <StatCard
          label="Critical / Overdue"
          value={stats.critical}
          icon={Zap}
          bg="bg-red-50 border-red-100"
          iconColor="text-red-500"
          highlight={stats.critical > 0}
        />
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => fetchProjects()}
            className="ml-auto text-sm text-red-600 hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-500 text-sm">Loading projects...</p>
        </div>
      ) : (
        /* ── Project List ──────────────────────────────────────────────── */
        <ProjectList
          projects={projects}
          onUpdate={() => fetchProjects(true)}
          onEdit={openEdit}
          onDelete={isAdmin ? handleDelete : undefined}
          onStatusChange={handleStatusChange}
          onProgressChange={handleProgressChange}
        />
      )}

      {/* ── Create / Edit Form ───────────────────────────────────────────── */}
      {showForm && (
        <ProjectForm
          project={editingProject}
          onClose={closeForm}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* ── Confirm Dialog ───────────────────────────────────────────────── */}
      <ConfirmDialog state={confirm} onClose={closeConfirm} />

      {/* ── Toasts ───────────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </div>
  )
}