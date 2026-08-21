'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Search,
    Filter,
    Pencil,
    Trash2,
    CheckCircle2,
    Clock3,
    AlertTriangle,
    Users,
    X,
    Save,
    RefreshCw,
    ChevronDown,
} from 'lucide-react';
import { authHeader, jsonAuthHeader } from '@/lib/auth';

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://crm-api.vasifytech.com/api';

type Task = {
    id: string | number;
    title: string;
    description?: string;
    assigned_to?: string | number | null;
    assigned_to_name?: string | null;
    created_by_name?: string | null;
    status?: string;
    priority?: string;
    start_date?: string | null;
    due_date?: string | null;
    created_at?: string;
    updated_at?: string;
};

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

type Props = {
    project: any;
};

const STATUS_OPTIONS = [
    'Pending',
    'In Progress',
    'Review',
    'Complete',
];

const PRIORITY_OPTIONS = [
    'Low',
    'Medium',
    'High',
    'Critical',
];

const EMPTY_FORM: TaskForm = {
    title: '',
    description: '',
    assigned_to: '',
    status: 'Pending',
    priority: 'Medium',
    start_date: '',
    due_date: '',
};

const STATUS_CONFIG: Record<
    string,
    { className: string; dot: string }
> = {
    Pending: {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        dot: 'bg-gray-400',
    },
    'In Progress': {
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
    },
    Review: {
        className: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500',
    },
    Complete: {
        className: 'bg-green-50 text-green-700 border-green-200',
        dot: 'bg-green-500',
    },
};

const PRIORITY_CONFIG: Record<
    string,
    { className: string }
> = {
    Low: {
        className: 'bg-gray-100 text-gray-600',
    },
    Medium: {
        className: 'bg-blue-50 text-blue-700',
    },
    High: {
        className: 'bg-orange-50 text-orange-700',
    },
    Critical: {
        className: 'bg-red-50 text-red-700',
    },
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

function formatDate(date?: string | null) {
    if (!date) return '—';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return date;
    }

    return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function toInputDate(date?: string | null) {
    if (!date) return '';

    // Handles both ISO dates and YYYY-MM-DD.
    return date.length >= 10 ? date.slice(0, 10) : date;
}

function isOverdue(task: Task) {
    if (!task.due_date || task.status === 'Complete') {
        return false;
    }

    const due = new Date(task.due_date);
    const today = new Date();

    due.setHours(23, 59, 59, 999);
    today.setHours(0, 0, 0, 0);

    return due < today;
}

function getStatusConfig(status?: string) {
    return (
        STATUS_CONFIG[status || 'Pending'] ||
        STATUS_CONFIG.Pending
    );
}

function getPriorityConfig(priority?: string) {
    return (
        PRIORITY_CONFIG[priority || 'Medium'] ||
        PRIORITY_CONFIG.Medium
    );
}

export default function TaskTracking({ project }: Props) {
    const projectId = project?.id;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    const [loading, setLoading] = useState(true);
    const [teamLoading, setTeamLoading] = useState(true);

    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | number | null>(
        null
    );

    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const [form, setForm] = useState<TaskForm>(EMPTY_FORM);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [developerFilter, setDeveloperFilter] = useState('All');

    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback(
        (
            message: string,
            type: 'success' | 'error' = 'success'
        ) => {
            const id = Date.now();

            setToasts((prev) => [
                ...prev,
                {
                    id,
                    message,
                    type,
                },
            ]);

            setTimeout(() => {
                setToasts((prev) =>
                    prev.filter((toast) => toast.id !== id)
                );
            }, 3500);
        },
        []
    );

    // -------------------------------------------------------------------------
    // Fetch tasks
    // -------------------------------------------------------------------------

    const fetchTasks = useCallback(async () => {
        if (!projectId) return;

        try {
            setLoading(true);

            const res = await fetch(
                `${API_BASE}/projects/${projectId}/tasks`,
                {
                    headers: authHeader(),
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        'Failed to load project tasks.'
                    )
                );
            }

            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.tasks)
                    ? data.tasks
                    : [];

            setTasks(list);
        } catch (error: any) {
            console.error('Error fetching tasks:', error);
            setTasks([]);
            showToast(
                error?.message || 'Failed to load tasks.',
                'error'
            );
        } finally {
            setLoading(false);
        }
    }, [projectId, showToast]);

    // -------------------------------------------------------------------------
    // Fetch project team
    // -------------------------------------------------------------------------

    const fetchTeam = useCallback(async () => {
        if (!projectId) return;

        try {
            setTeamLoading(true);

            const res = await fetch(
                `${API_BASE}/projects/${projectId}/team`,
                {
                    headers: authHeader(),
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        'Failed to load project developers.'
                    )
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
        } catch (error: any) {
            console.error('Error fetching project team:', error);
            setTeamMembers([]);
        } finally {
            setTeamLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchTasks();
        fetchTeam();
    }, [fetchTasks, fetchTeam]);

    // -------------------------------------------------------------------------
    // Statistics
    // -------------------------------------------------------------------------

    const stats = useMemo(() => {
        return {
            total: tasks.length,

            pending: tasks.filter(
                (task) => task.status === 'Pending'
            ).length,

            inProgress: tasks.filter(
                (task) => task.status === 'In Progress'
            ).length,

            review: tasks.filter(
                (task) => task.status === 'Review'
            ).length,

            complete: tasks.filter(
                (task) => task.status === 'Complete'
            ).length,

            overdue: tasks.filter(isOverdue).length,
        };
    }, [tasks]);

    // -------------------------------------------------------------------------
    // Filtered tasks
    // -------------------------------------------------------------------------

    const filteredTasks = useMemo(() => {
        const query = search.trim().toLowerCase();

        return tasks.filter((task) => {
            const matchesSearch =
                !query ||
                task.title?.toLowerCase().includes(query) ||
                task.description?.toLowerCase().includes(query) ||
                task.assigned_to_name
                    ?.toLowerCase()
                    .includes(query);

            const matchesStatus =
                statusFilter === 'All' ||
                task.status === statusFilter;

            const matchesPriority =
                priorityFilter === 'All' ||
                task.priority === priorityFilter;

            const matchesDeveloper =
                developerFilter === 'All' ||
                String(task.assigned_to || '') ===
                    String(developerFilter);

            return (
                matchesSearch &&
                matchesStatus &&
                matchesPriority &&
                matchesDeveloper
            );
        });
    }, [
        tasks,
        search,
        statusFilter,
        priorityFilter,
        developerFilter,
    ]);

    // -------------------------------------------------------------------------
    // Form helpers
    // -------------------------------------------------------------------------

    const openCreateModal = () => {
        setEditingTask(null);

        setForm({
            ...EMPTY_FORM,

            // If the project has exactly one team member,
            // select them automatically.
            assigned_to:
                teamMembers.length === 1
                    ? String(teamMembers[0].user_id)
                    : '',
        });

        setShowModal(true);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);

        setForm({
            title: task.title || '',
            description: task.description || '',
            assigned_to:
                task.assigned_to !== null &&
                task.assigned_to !== undefined
                    ? String(task.assigned_to)
                    : '',
            status: task.status || 'Pending',
            priority: task.priority || 'Medium',
            start_date: toInputDate(task.start_date),
            due_date: toInputDate(task.due_date),
        });

        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditingTask(null);
        setForm(EMPTY_FORM);
    };

    const updateForm = (
        field: keyof TaskForm,
        value: string
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // -------------------------------------------------------------------------
    // Create / Update task
    // -------------------------------------------------------------------------

    const handleSubmit = async (
        event: React.FormEvent
    ) => {
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
            if (
                new Date(form.due_date) <
                new Date(form.start_date)
            ) {
                showToast(
                    'Due date cannot be before start date.',
                    'error'
                );
                return;
            }
        }

        if (!editingTask && !form.assigned_to) {
            if (teamMembers.length > 0) {
                showToast(
                    'Please assign the task to a developer.',
                    'error'
                );
                return;
            }
        }

        try {
            setSaving(true);

            const body: Record<string, any> = {
                title: form.title.trim(),
                description: form.description.trim(),
                status: form.status,
                priority: form.priority,
            };

            if (form.assigned_to) {
                body.assigned_to = form.assigned_to;
            }

            if (form.start_date) {
                body.start_date = form.start_date;
            }

            if (form.due_date) {
                body.due_date = form.due_date;
            }

            const url = editingTask
                ? `${API_BASE}/projects/${projectId}/tasks/${editingTask.id}`
                : `${API_BASE}/projects/${projectId}/tasks`;

            const res = await fetch(url, {
                method: editingTask ? 'PUT' : 'POST',
                headers: jsonAuthHeader(),
                body: JSON.stringify(body),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        editingTask
                            ? 'Failed to update task.'
                            : 'Failed to create task.'
                    )
                );
            }

            showToast(
                editingTask
                    ? 'Task updated successfully.'
                    : 'Task created successfully.'
            );

            closeModal();
            await fetchTasks();
        } catch (error: any) {
            console.error('Task save error:', error);

            showToast(
                error?.message ||
                    'Something went wrong while saving the task.',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    // -------------------------------------------------------------------------
    // Quick update (status / priority / developer via PATCH)
    // -------------------------------------------------------------------------

    const updateTask = async (
        task: Task,
        changes: Record<string, any>
    ) => {
        try {
            const res = await fetch(
                `${API_BASE}/projects/${projectId}/tasks/${task.id}`,
                {
                    method: 'PATCH',
                    headers: jsonAuthHeader(),
                    body: JSON.stringify(changes),
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        'Failed to update task.'
                    )
                );
            }

            // Merge the change locally for a snappy UI. When the developer
            // assignment changes, also resolve assigned_to_name from the
            // already-loaded team list so the "Assigned:" label doesn't
            // show a stale name until the next full refetch.
            setTasks((prev) =>
                prev.map((item) => {
                    if (item.id !== task.id) return item;

                    const next = { ...item, ...changes };

                    if ('assigned_to' in changes) {
                        const match = teamMembers.find(
                            (m) =>
                                String(m.user_id) ===
                                String(changes.assigned_to)
                        );
                        next.assigned_to_name = match?.name ?? null;
                    }

                    return next;
                })
            );

            showToast('Task updated.');
        } catch (error: any) {
            console.error('Task update error:', error);

            showToast(
                error?.message || 'Failed to update task.',
                'error'
            );
        }
    };

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    const handleDelete = async (task: Task) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${task.title}"?`
        );

        if (!confirmed) return;

        try {
            setDeletingId(task.id);

            const res = await fetch(
                `${API_BASE}/projects/${projectId}/tasks/${task.id}`,
                {
                    method: 'DELETE',
                    headers: authHeader(),
                }
            );

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        'Failed to delete task.'
                    )
                );
            }

            setTasks((prev) =>
                prev.filter((item) => item.id !== task.id)
            );

            showToast('Task deleted successfully.');
        } catch (error: any) {
            console.error('Task delete error:', error);

            showToast(
                error?.message || 'Failed to delete task.',
                'error'
            );
        } finally {
            setDeletingId(null);
        }
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                            Project Tasks
                        </h2>

                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                            {stats.total}
                        </span>
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                        Manage tasks and assign work to project developers.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            fetchTasks();
                            fetchTeam();
                        }}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw
                            size={15}
                            className={
                                loading
                                    ? 'animate-spin'
                                    : ''
                            }
                        />
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3A7AFE] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                    >
                        <Plus size={17} />
                        Add Task
                    </button>
                </div>
            </div>

            {/* No project team warning */}
            {!teamLoading && teamMembers.length === 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-200 bg-yellow-50">
                    <Users
                        size={19}
                        className="text-yellow-600 mt-0.5 shrink-0"
                    />

                    <div>
                        <p className="text-sm font-semibold text-yellow-800">
                            No developers assigned to this project
                        </p>

                        <p className="text-xs text-yellow-700 mt-1">
                            Add developers from the Team tab first.
                            You can still create unassigned tasks.
                        </p>
                    </div>
                </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                    label="Total"
                    value={stats.total}
                    icon={CheckCircle2}
                    className="text-blue-600 bg-blue-50"
                />

                <StatCard
                    label="Pending"
                    value={stats.pending}
                    icon={Clock3}
                    className="text-gray-600 bg-gray-50"
                />

                <StatCard
                    label="In Progress"
                    value={stats.inProgress}
                    icon={RefreshCw}
                    className="text-blue-600 bg-blue-50"
                />

                <StatCard
                    label="Review"
                    value={stats.review}
                    icon={Clock3}
                    className="text-purple-600 bg-purple-50"
                />

                <StatCard
                    label="Complete"
                    value={stats.complete}
                    icon={CheckCircle2}
                    className="text-green-600 bg-green-50"
                />

                <StatCard
                    label="Overdue"
                    value={stats.overdue}
                    icon={AlertTriangle}
                    className="text-red-600 bg-red-50"
                />
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={15} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800">
                        Filters
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                    {/* Search */}
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            placeholder="Search tasks..."
                            className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                        />
                    </div>

                    {/* Status */}
                    <SelectFilter
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={['All', ...STATUS_OPTIONS]}
                        placeholder="All statuses"
                    />

                    {/* Priority */}
                    <SelectFilter
                        value={priorityFilter}
                        onChange={setPriorityFilter}
                        options={['All', ...PRIORITY_OPTIONS]}
                        placeholder="All priorities"
                    />

                    {/* Developer */}
                    <select
                        value={developerFilter}
                        onChange={(e) =>
                            setDeveloperFilter(e.target.value)
                        }
                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    >
                        <option value="All">
                            All developers
                        </option>

                        {teamMembers.map((member) => (
                            <option
                                key={member.user_id}
                                value={String(member.user_id)}
                            >
                                {member.name}
                            </option>
                        ))}
                    </select>
                </div>

                {(search ||
                    statusFilter !== 'All' ||
                    priorityFilter !== 'All' ||
                    developerFilter !== 'All') && (
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                            Showing {filteredTasks.length} of{' '}
                            {tasks.length} tasks
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('All');
                                setPriorityFilter('All');
                                setDeveloperFilter('All');
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Task list */}
            {loading ? (
                <div className="bg-white border border-gray-200 rounded-xl py-16 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600 mb-3" />
                    <p className="text-sm text-gray-500">
                        Loading tasks...
                    </p>
                </div>
            ) : filteredTasks.length === 0 ? (
                <EmptyState
                    hasFilters={
                        Boolean(search) ||
                        statusFilter !== 'All' ||
                        priorityFilter !== 'All' ||
                        developerFilter !== 'All'
                    }
                    onAddTask={openCreateModal}
                />
            ) : (
                <div className="space-y-3">
                    {filteredTasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            teamMembers={teamMembers}
                            deleting={
                                deletingId === task.id
                            }
                            onEdit={openEditModal}
                            onDelete={handleDelete}
                            onUpdate={updateTask}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <TaskModal
                    editingTask={editingTask}
                    form={form}
                    teamMembers={teamMembers}
                    teamLoading={teamLoading}
                    saving={saving}
                    onChange={updateForm}
                    onSubmit={handleSubmit}
                    onClose={closeModal}
                />
            )}

            {/* Toasts */}
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
        </div>
    );
}

// =============================================================================
// Task Card
// =============================================================================

function TaskCard({
    task,
    teamMembers,
    deleting,
    onEdit,
    onDelete,
    onUpdate,
}: {
    task: Task;
    teamMembers: TeamMember[];
    deleting: boolean;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    onUpdate: (
        task: Task,
        changes: Record<string, any>
    ) => void;
}) {
    const status = getStatusConfig(task.status);
    const priority = getPriorityConfig(task.priority);
    const overdue = isOverdue(task);

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 hover:border-gray-300 transition-colors">

            {/* Top */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

                <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base break-words">
                            {task.title}
                        </h3>

                        {overdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <AlertTriangle size={11} />
                                Overdue
                            </span>
                        )}
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-500 mt-1.5 whitespace-pre-wrap break-words">
                            {task.description}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => onEdit(task)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <Pencil size={13} />
                        Edit
                    </button>

                    <button
                        type="button"
                        onClick={() => onDelete(task)}
                        disabled={deleting}
                        className="inline-flex items-center justify-center p-2 border border-red-100 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Delete task"
                    >
                        {deleting ? (
                            <RefreshCw
                                size={14}
                                className="animate-spin"
                            />
                        ) : (
                            <Trash2 size={14} />
                        )}
                    </button>
                </div>
            </div>

            {/* Details */}
            <div className="mt-4 pt-4 border-t border-gray-100">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                    {/* Developer */}
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                            Developer
                        </p>

                        <select
                            value={
                                task.assigned_to
                                    ? String(task.assigned_to)
                                    : ''
                            }
                            onChange={(e) =>
                                onUpdate(task, {
                                    assigned_to:
                                        e.target.value || null,
                                })
                            }
                            className="w-full h-9 px-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">
                                Unassigned
                            </option>

                            {teamMembers.map((member) => (
                                <option
                                    key={member.user_id}
                                    value={String(
                                        member.user_id
                                    )}
                                >
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                            Status
                        </p>

                        <select
                            value={
                                task.status || 'Pending'
                            }
                            onChange={(e) =>
                                onUpdate(task, {
                                    status: e.target.value,
                                })
                            }
                            className={`w-full h-9 px-2.5 rounded-lg border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 ${status.className}`}
                        >
                            {STATUS_OPTIONS.map(
                                (option) => (
                                    <option
                                        key={option}
                                        value={option}
                                    >
                                        {option}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                            Priority
                        </p>

                        <select
                            value={
                                task.priority || 'Medium'
                            }
                            onChange={(e) =>
                                onUpdate(task, {
                                    priority:
                                        e.target.value,
                                })
                            }
                            className={`w-full h-9 px-2.5 rounded-lg border border-transparent text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 ${priority.className}`}
                        >
                            {PRIORITY_OPTIONS.map(
                                (option) => (
                                    <option
                                        key={option}
                                        value={option}
                                    >
                                        {option}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    {/* Due date */}
                    <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">
                            Due Date
                        </p>

                        <div
                            className={`h-9 flex items-center px-2.5 rounded-lg border text-sm ${
                                overdue
                                    ? 'border-red-200 bg-red-50 text-red-700'
                                    : 'border-gray-200 bg-gray-50 text-gray-700'
                            }`}
                        >
                            {formatDate(task.due_date)}
                        </div>
                    </div>
                </div>

                {/* Dates */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs text-gray-500">
                    <span>
                        <strong className="text-gray-600">
                            Start:
                        </strong>{' '}
                        {formatDate(task.start_date)}
                    </span>

                    <span>
                        <strong className="text-gray-600">
                            Due:
                        </strong>{' '}
                        {formatDate(task.due_date)}
                    </span>

                    {task.assigned_to_name && (
                        <span>
                            <strong className="text-gray-600">
                                Assigned:
                            </strong>{' '}
                            {task.assigned_to_name}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Task Modal
// =============================================================================

function TaskModal({
    editingTask,
    form,
    teamMembers,
    teamLoading,
    saving,
    onChange,
    onSubmit,
    onClose,
}: {
    editingTask: Task | null;
    form: TaskForm;
    teamMembers: TeamMember[];
    teamLoading: boolean;
    saving: boolean;
    onChange: (
        field: keyof TaskForm,
        value: string
    ) => void;
    onSubmit: (event: React.FormEvent) => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">

            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={() => {
                    if (!saving) onClose();
                }}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl">

                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 sm:px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {editingTask
                                ? 'Edit Task'
                                : 'Create Task'}
                        </h2>

                        <p className="text-xs text-gray-500 mt-0.5">
                            {editingTask
                                ? 'Update task details and assignment.'
                                : 'Create a task and assign it to a project developer.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={onSubmit}
                    className="p-5 sm:p-6 space-y-5"
                >
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Task Title
                            <span className="text-red-500 ml-1">
                                *
                            </span>
                        </label>

                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) =>
                                onChange(
                                    'title',
                                    e.target.value
                                )
                            }
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
                            onChange={(e) =>
                                onChange(
                                    'description',
                                    e.target.value
                                )
                            }
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
                            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                                <p className="text-sm font-medium text-yellow-800">
                                    No developers are assigned to
                                    this project.
                                </p>

                                <p className="text-xs text-yellow-700 mt-1">
                                    Add developers from the Team
                                    tab first.
                                </p>
                            </div>
                        ) : (
                            <select
                                value={form.assigned_to}
                                onChange={(e) =>
                                    onChange(
                                        'assigned_to',
                                        e.target.value
                                    )
                                }
                                className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            >
                                <option value="">
                                    Select developer
                                </option>

                                {teamMembers.map(
                                    (member) => (
                                        <option
                                            key={
                                                member.user_id
                                            }
                                            value={String(
                                                member.user_id
                                            )}
                                        >
                                            {member.name}
                                            {member.role
                                                ? ` — ${member.role}`
                                                : ''}
                                        </option>
                                    )
                                )}
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
                                onChange={(e) =>
                                    onChange(
                                        'status',
                                        e.target.value
                                    )
                                }
                                className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            >
                                {STATUS_OPTIONS.map(
                                    (option) => (
                                        <option
                                            key={option}
                                            value={option}
                                        >
                                            {option}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Priority
                            </label>

                            <select
                                value={form.priority}
                                onChange={(e) =>
                                    onChange(
                                        'priority',
                                        e.target.value
                                    )
                                }
                                className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            >
                                {PRIORITY_OPTIONS.map(
                                    (option) => (
                                        <option
                                            key={option}
                                            value={option}
                                        >
                                            {option}
                                        </option>
                                    )
                                )}
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
                                onChange={(e) =>
                                    onChange(
                                        'start_date',
                                        e.target.value
                                    )
                                }
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
                                onChange={(e) =>
                                    onChange(
                                        'due_date',
                                        e.target.value
                                    )
                                }
                                className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">

                        <button
                            type="button"
                            onClick={onClose}
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
                                    <RefreshCw
                                        size={15}
                                        className="animate-spin"
                                    />
                                    Saving...
                                </>
                            ) : editingTask ? (
                                <>
                                    <Save size={15} />
                                    Update Task
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    Create Task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =============================================================================
// Statistics Card
// =============================================================================

function StatCard({
    label,
    value,
    icon: Icon,
    className,
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    className: string;
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">
                        {label}
                    </p>

                    <p className="text-xl font-bold text-gray-900 mt-1">
                        {value}
                    </p>
                </div>

                <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${className}`}
                >
                    <Icon size={16} />
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Select Filter
// =============================================================================

function SelectFilter({
    value,
    onChange,
    options,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none w-full h-10 px-3 pr-9 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option === 'All'
                            ? placeholder
                            : option}
                    </option>
                ))}
            </select>

            <ChevronDown
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
        </div>
    );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({
    hasFilters,
    onAddTask,
}: {
    hasFilters: boolean;
    onAddTask: () => void;
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl py-16 px-5 text-center">

            <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                {hasFilters ? (
                    <Search size={21} />
                ) : (
                    <CheckCircle2 size={21} />
                )}
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mt-4">
                {hasFilters
                    ? 'No matching tasks'
                    : 'No tasks yet'}
            </h3>

            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                {hasFilters
                    ? 'Try changing your search or filters.'
                    : 'Create the first task for this project and assign it to a developer.'}
            </p>

            {!hasFilters && (
                <button
                    type="button"
                    onClick={onAddTask}
                    className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-[#3A7AFE] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold"
                >
                    <Plus size={16} />
                    Add Task
                </button>
            )}
        </div>
    );
}