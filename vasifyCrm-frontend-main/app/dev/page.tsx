'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    RefreshCw,
    Users,
    AlertTriangle,
} from 'lucide-react';
import { authHeader, jsonAuthHeader } from '@/lib/auth';

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://crm-api.vasifytech.com/api';

type TeamMember = {
    user_id: string | number;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
};

type TaskForm = {
    title: string;
    description: string;
    assigned_to: string;
    status: string;
    priority: string;
    start_date: string;
    due_date: string;
};

type Toast = {
    id: number;
    message: string;
    type: 'success' | 'error';
};

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Review', 'Complete'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const EMPTY_FORM: TaskForm = {
    title: '',
    description: '',
    assigned_to: '',
    status: 'Pending',
    priority: 'Medium',
    start_date: '',
    due_date: '',
};

function getErrorMessage(data: any, fallback: string) {
    if (typeof data === 'string' && data.trim()) return data;
    return data?.message || data?.error || data?.details || fallback;
}

// ── Toast container ──────────────────────────────────────────────────────────

function ToastContainer({ toasts }: { toasts: Toast[] }) {
    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
                        t.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateTaskPage() {
    const params = useParams();
    const router = useRouter();

    // Tolerant param resolution: works whether the dynamic folder segment
    // is named [id] (matching ProjectDetailPage) or [projectId]. Falls back
    // to the first param value found if neither key matches, so a rename
    // of the folder doesn't silently break this page.
    const rawId =
        params?.id ??
        params?.projectId ??
        (params ? Object.values(params)[0] : undefined);
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;

    useEffect(() => {
        if (!projectId) {
            // eslint-disable-next-line no-console
            console.warn(
                'CreateTaskPage: no project id found in route params.',
                'Received params object:',
                params,
                'Check that this page lives under the same dynamic segment',
                'folder (e.g. [id] or [projectId]) as your project detail page.'
            );
        }
    }, [projectId, params]);

    const [projectTitle, setProjectTitle] = useState<string | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [teamLoading, setTeamLoading] = useState(true);

    const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = useCallback(
        (message: string, type: 'success' | 'error' = 'success') => {
            const id = Date.now();
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(
                () => setToasts((prev) => prev.filter((t) => t.id !== id)),
                3500
            );
        },
        []
    );

    // ── Fetch project (for the header title) ────────────────────────────────

    const fetchProject = useCallback(async () => {
        if (!projectId) {
            setProjectLoading(false);
            return;
        }
        try {
            setProjectLoading(true);
            const res = await fetch(`${API_BASE}/projects/${projectId}`, {
                headers: authHeader(),
            });
            if (res.ok) {
                const data = await res.json();
                setProjectTitle(data?.title || null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setProjectLoading(false);
        }
    }, [projectId]);

    // ── Fetch project team ───────────────────────────────────────────────────

    const fetchTeam = useCallback(async () => {
        if (!projectId) {
            setTeamLoading(false);
            return;
        }
        try {
            setTeamLoading(true);
            const res = await fetch(`${API_BASE}/projects/${projectId}/team`, {
                headers: authHeader(),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(
                    getErrorMessage(data, 'Failed to load project developers.')
                );
            }
            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.team)
                    ? data.team
                    : Array.isArray(data?.members)
                        ? data.members
                        : [];
            setTeamMembers(list);

            if (list.length === 1) {
                setForm((prev) => ({
                    ...prev,
                    assigned_to: String(list[0].user_id),
                }));
            }
        } catch (error: any) {
            console.error('Error fetching project team:', error);
            setTeamMembers([]);
        } finally {
            setTeamLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchProject();
        fetchTeam();
    }, [fetchProject, fetchTeam]);

    // ── Form helpers ─────────────────────────────────────────────────────────

    const updateForm = (field: keyof TaskForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    // ── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!projectId) {
            showToast('Project ID is missing.', 'error');
            return;
        }

        if (!form.title.trim()) {
            showToast('Task title is required.', 'error');
            return;
        }

        if (form.start_date && form.due_date) {
            if (new Date(form.due_date) < new Date(form.start_date)) {
                showToast('Due date cannot be before start date.', 'error');
                return;
            }
        }

        if (!form.assigned_to && teamMembers.length > 0) {
            showToast('Please assign the task to a developer.', 'error');
            return;
        }

        try {
            setSaving(true);

            const body: Record<string, any> = {
                title: form.title.trim(),
                description: form.description.trim(),
                status: form.status,
                priority: form.priority,
            };

            if (form.assigned_to) body.assigned_to = form.assigned_to;
            if (form.start_date) body.start_date = form.start_date;
            if (form.due_date) body.due_date = form.due_date;

            const res = await fetch(
                `${API_BASE}/projects/${projectId}/tasks`,
                {
                    method: 'POST',
                    headers: jsonAuthHeader(),
                    body: JSON.stringify(body),
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    getErrorMessage(data, 'Failed to create task.')
                );
            }

            showToast('Task created successfully.');

            // Small delay so the toast is visible before navigating away.
            setTimeout(() => {
                router.push(`/projects/${projectId}`);
            }, 600);
        } catch (error: any) {
            console.error('Task create error:', error);
            showToast(
                error?.message || 'Something went wrong while creating the task.',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (saving) return;
        router.push(`/projects/${projectId}`);
    };

    // ── No project id — this page is not nested under a project route ───────

    if (!projectId) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-32 px-6 text-center">
                <AlertTriangle size={32} className="text-orange-500 mb-4" />
                <p className="text-lg font-semibold text-gray-800 mb-1">
                    No project selected
                </p>
                <p className="text-sm text-gray-500 max-w-sm mb-5">
                    This page couldn't find a project id in the URL. Open it
                    from a project's Tasks tab, or check that this file is
                    nested under the same dynamic route folder as your
                    project detail page.
                </p>
                <button
                    onClick={() => router.push('/projects')}
                    className="text-sm text-[#3A7AFE] hover:underline font-medium"
                >
                    ← Back to Projects
                </button>
            </div>
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">

            {/* Sticky header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="px-6 py-4 flex items-center gap-3">
                    <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div className="min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">
                            {projectLoading
                                ? 'Loading project…'
                                : projectTitle
                                    ? `Projects / ${projectTitle}`
                                    : 'Projects'}
                        </p>
                        <h1 className="text-xl font-bold text-gray-900 truncate">
                            New Task
                        </h1>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Task Title
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => updateForm('title', e.target.value)}
                                    placeholder="e.g. Build authentication API"
                                    required
                                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => updateForm('description', e.target.value)}
                                    placeholder="Describe what needs to be completed..."
                                    rows={4}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                />
                            </div>

                            {/* Developer */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Assign Developer
                                </label>

                                {teamLoading ? (
                                    <div className="h-11 flex items-center px-3 rounded-xl border border-gray-200 text-sm text-gray-400">
                                        Loading project developers...
                                    </div>
                                ) : teamMembers.length === 0 ? (
                                    <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                                        <Users
                                            size={17}
                                            className="text-yellow-600 mt-0.5 shrink-0"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-yellow-800">
                                                No developers are assigned to this project.
                                            </p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                                Add developers from the Team tab first —
                                                you can still create this task unassigned.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        value={form.assigned_to}
                                        onChange={(e) => updateForm('assigned_to', e.target.value)}
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    >
                                        <option value="">Select developer</option>
                                        {teamMembers.map((member) => (
                                            <option
                                                key={member.user_id}
                                                value={String(member.user_id)}
                                            >
                                                {member.name}
                                                {member.role ? ` — ${member.role}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Status + Priority */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Status
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => updateForm('status', e.target.value)}
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Priority
                                    </label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => updateForm('priority', e.target.value)}
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    >
                                        {PRIORITY_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={(e) => updateForm('start_date', e.target.value)}
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.due_date}
                                        onChange={(e) => updateForm('due_date', e.target.value)}
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            {form.due_date &&
                                new Date(form.due_date) < new Date(new Date().toDateString()) && (
                                    <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                                        <AlertTriangle size={13} />
                                        This due date is in the past — the task will show as
                                        overdue as soon as it's created.
                                    </div>
                                )}

                            {/* Actions */}
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#3A7AFE] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={15} />
                                            Create Task
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <ToastContainer toasts={toasts} />
        </div>
    );
}