'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    RefreshCw,
    Users,
    AlertTriangle,
    CalendarDays,
    Repeat,
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
    due_date: string;
    task_type: 'Regular' | 'Daily';
};

type Toast = {
    id: number;
    message: string;
    type: 'success' | 'error';
};

const STATUS_OPTIONS = [
    'Pending',
    'In Progress',
    'Completed',
    'Cancelled',
];

const PRIORITY_OPTIONS = [
    'Low',
    'Medium',
    'High',
];

const EMPTY_FORM: TaskForm = {
    title: '',
    description: '',
    assigned_to: '',
    status: 'Pending',
    priority: 'Medium',
    due_date: '',
    task_type: 'Regular',
};

function getErrorMessage(data: any, fallback: string) {
    if (typeof data === 'string' && data.trim()) {
        return data;
    }

    return (
        data?.message ||
        data?.error ||
        data?.details ||
        fallback
    );
}

function ToastContainer({
    toasts,
}: {
    toasts: Toast[];
}) {
    return (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${
                        toast.type === 'error'
                            ? 'bg-red-500'
                            : 'bg-emerald-500'
                    }`}
                >
                    {toast.message}
                </div>
            ))}
        </div>
    );
}

export default function CreateTaskPage() {
    const router = useRouter();

    const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const [toasts, setToasts] = useState<Toast[]>([]);
    const [nextToastId, setNextToastId] = useState(1);

    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [teamLoading, setTeamLoading] = useState(false);

    const addToast = useCallback((message: string, type: 'success' | 'error') => {
        const id = nextToastId;
        setNextToastId((v) => v + 1);
        setToasts((t) => [...t, { id, message, type }]);

        setTimeout(() => {
            setToasts((t) => t.filter((x) => x.id !== id));
        }, 5000);
    }, [nextToastId]);

    const fetchUsers = useCallback(async () => {
        setTeamLoading(true);
        try {
            const res = await fetch(`${API_BASE}/users`, {
                headers: authHeader(),
            });

            if (!res.ok) {
                // Try alternate shapes gracefully but do not invent endpoints
                console.warn('Fetch users failed', res.status);
                setTeamMembers([]);
                return;
            }

            const data = await res.json();
            let users: any[] = [];

            if (Array.isArray(data)) {
                users = data;
            } else if (Array.isArray(data?.data)) {
                users = data.data;
            } else if (Array.isArray(data?.users)) {
                users = data.users;
            }

            const mapped = users.map((u: any) => ({
                user_id: u.id ?? u.user_id ?? u._id ?? u.uid,
                name: u.name ?? ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Unknown'),
                email: u.email,
                phone: u.phone,
                role: u.role,
            }));

            setTeamMembers(mapped);
        } catch (err) {
            console.error('fetchUsers error', err);
            addToast('Failed to load users', 'error');
            setTeamMembers([]);
        } finally {
            setTeamLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    function handleChange<K extends keyof TaskForm>(key: K, value: TaskForm[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    function handleCancel() {
        router.push('/dev-task');
    }

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        if (saving) return;
        setSaving(true);

        const body = {
            title: form.title.trim(),
            description: form.description.trim() || null,
            type: 'other',
            task_type: form.task_type === 'Daily' ? 'daily' : 'regular',
            priority: form.priority.toLowerCase(),
            status:
                form.status === 'In Progress'
                    ? 'in-progress'
                    : form.status === 'Completed'
                    ? 'completed'
                    : form.status === 'Cancelled'
                    ? 'cancelled'
                    : 'pending',
            assigned_to: form.assigned_to || null,
            related_type: null,
            related_id: null,
            due_date: form.due_date || null,
        } as const;

        try {
            const res = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: jsonAuthHeader(),
                body: JSON.stringify(body),
            });

            if (res.ok) {
                addToast('Task created successfully', 'success');
                setForm(EMPTY_FORM);
                // keep behavior consistent: navigate to /dev-task
                router.push('/dev-task');
            } else {
                let errData = null;
                try {
                    errData = await res.json();
                } catch (_) {
                    // ignore
                }
                addToast(getErrorMessage(errData, 'Failed to create task'), 'error');
            }
        } catch (err: any) {
            console.error('create task error', err);
            addToast(String(err?.message ?? err), 'error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-6">
                <button
                    type="button"
                    onClick={() => router.push('/dev-task')}
                    className="p-2 rounded-md hover:bg-gray-100"
                    aria-label="Back"
                >
                    <ArrowLeft size={18} />
                </button>

                <div>
                    <h1 className="text-xl font-semibold">Create Task</h1>
                    <p className="text-sm text-gray-500">
                        Create a new task. This page uses the existing
                        tasks backend and table.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                required
                                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                placeholder="Enter task title"
                            />

                            <label className="text-sm font-medium text-gray-700 mt-4 block">Description</label>
                            <textarea
                                value={form.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm h-28"
                                placeholder="Describe the task (optional)"
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Assignee</label>
                                <div className="mt-2">
                                    <select
                                        value={form.assigned_to}
                                        onChange={(e) => handleChange('assigned_to', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                    >
                                        <option value="">Unassigned</option>
                                        {teamMembers.map((m) => (
                                            <option key={String(m.user_id)} value={String(m.user_id)}>
                                                {m.name} {m.email ? `· ${m.email}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">Priority</label>
                                <select
                                    value={form.priority}
                                    onChange={(e) => handleChange('priority', e.target.value)}
                                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                >
                                    {PRIORITY_OPTIONS.map((p) => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">Due Date</label>
                                <div className="mt-2">
                                    <input
                                        type="date"
                                        value={form.due_date}
                                        onChange={(e) => handleChange('due_date', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="text-sm font-medium text-gray-700">Task Type</label>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleChange('task_type', 'Regular')}
                                className={`text-left p-3 rounded-xl border ${
                                    form.task_type === 'Regular' ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-md border border-gray-100">
                                        <Users size={16} className="text-gray-600" />
                                    </div>

                                    <div>
                                        <div className="font-semibold">Regular Task</div>
                                        <div className="text-xs text-gray-500">Standard task that appears in the regular task list.</div>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleChange('task_type', 'Daily')}
                                className={`text-left p-3 rounded-xl border ${
                                    form.task_type === 'Daily' ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-md border border-gray-100">
                                        <Repeat size={16} className="text-gray-600" />
                                    </div>

                                    <div>
                                        <div className="font-semibold">Daily Task</div>
                                        <div className="text-xs text-gray-500">A task marked as daily that will appear in Daily Tasks.</div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {form.task_type === 'Daily' && (
                            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mt-3">
                                <Repeat size={16} className="text-gray-500 mt-0.5 shrink-0" />

                                <div>
                                    <p className="text-xs font-semibold text-gray-700">Daily Task</p>

                                    <p className="text-xs text-gray-500 mt-0.5">
                                        This task will be marked as a daily task and will appear in the Daily Tasks section.
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>

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
                                    {form.task_type === 'Daily' ? 'Create Daily Task' : 'Create Task'}
                                </>
                            )}
                        </button>

                    </div>
                </div>
            </form>

            <ToastContainer toasts={toasts} />
        </div>
    );
}

