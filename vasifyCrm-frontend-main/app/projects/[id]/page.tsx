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
    FolderKanban,
} from 'lucide-react';
import { authHeader, jsonAuthHeader } from '@/lib/auth';

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://crm-api.vasifytech.com/api';

type Project = {
    id?: string | number;
    project_id?: string | number;
    name?: string;
    title?: string;
};

type TeamMember = {
    user_id: string | number;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
};

type TaskForm = {
    project_id: string;
    title: string;
    description: string;
    assigned_to: string;
    status: string;
    priority: string;
    start_date: string;
    due_date: string;
    task_type: 'Regular' | 'Daily';
    recurrence: string;
};

type Toast = {
    id: number;
    message: string;
    type: 'success' | 'error';
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
    project_id: '',
    title: '',
    description: '',
    assigned_to: '',
    status: 'Pending',
    priority: 'Medium',
    start_date: '',
    due_date: '',
    task_type: 'Regular',
    recurrence: '',
};

function getErrorMessage(
    data: any,
    fallback: string
) {
    if (
        typeof data === 'string' &&
        data.trim()
    ) {
        return data;
    }

    return (
        data?.message ||
        data?.error ||
        data?.details ||
        fallback
    );
}

function getProjectId(project: Project) {
    return String(
        project.project_id ??
        project.id ??
        ''
    );
}

function getProjectName(project: Project) {
    return (
        project.title ||
        project.name ||
        `Project ${getProjectId(project)}`
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

    const [projects, setProjects] =
        useState<Project[]>([]);

    const [projectsLoading, setProjectsLoading] =
        useState(true);

    const [teamMembers, setTeamMembers] =
        useState<TeamMember[]>([]);

    const [teamLoading, setTeamLoading] =
        useState(false);

    const [form, setForm] =
        useState<TaskForm>(EMPTY_FORM);

    const [saving, setSaving] =
        useState(false);

    const [toasts, setToasts] =
        useState<Toast[]>([]);

    // ─────────────────────────────────────────────
    // Toast
    // ─────────────────────────────────────────────

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
                    prev.filter(
                        (toast) =>
                            toast.id !== id
                    )
                );
            }, 3500);
        },
        []
    );

    // ─────────────────────────────────────────────
    // Fetch Projects
    // ─────────────────────────────────────────────

    const fetchProjects = useCallback(
        async () => {
            try {
                setProjectsLoading(true);

                const response = await fetch(
                    `${API_BASE}/projects`,
                    {
                        headers: authHeader(),
                    }
                );

                const data =
                    await response
                        .json()
                        .catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            'Failed to load projects.'
                        )
                    );
                }

                const list =
                    Array.isArray(data)
                        ? data
                        : Array.isArray(
                              data?.projects
                          )
                        ? data.projects
                        : Array.isArray(
                              data?.data
                          )
                        ? data.data
                        : [];

                setProjects(list);
            } catch (error) {
                console.error(
                    'Error fetching projects:',
                    error
                );

                showToast(
                    'Failed to load projects.',
                    'error'
                );

                setProjects([]);
            } finally {
                setProjectsLoading(false);
            }
        },
        [showToast]
    );

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // ─────────────────────────────────────────────
    // Fetch Developers
    // ─────────────────────────────────────────────

    const fetchTeam = useCallback(
        async (projectId: string) => {
            if (!projectId) {
                setTeamMembers([]);
                return;
            }

            try {
                setTeamLoading(true);

                const response = await fetch(
                    `${API_BASE}/projects/${projectId}/team`,
                    {
                        headers: authHeader(),
                    }
                );

                const data =
                    await response
                        .json()
                        .catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        getErrorMessage(
                            data,
                            'Failed to load project developers.'
                        )
                    );
                }

                const list =
                    Array.isArray(data)
                        ? data
                        : Array.isArray(
                              data?.team
                          )
                        ? data.team
                        : Array.isArray(
                              data?.members
                          )
                        ? data.members
                        : [];

                setTeamMembers(list);

                // Automatically assign if only one developer exists
                if (list.length === 1) {
                    setForm((prev) => ({
                        ...prev,
                        assigned_to: String(
                            list[0].user_id
                        ),
                    }));
                }
            } catch (error) {
                console.error(
                    'Error fetching team:',
                    error
                );

                setTeamMembers([]);

                showToast(
                    'Could not load project developers.',
                    'error'
                );
            } finally {
                setTeamLoading(false);
            }
        },
        [showToast]
    );

    // ─────────────────────────────────────────────
    // Form Update
    // ─────────────────────────────────────────────

    const updateForm = (
        field: keyof TaskForm,
        value: string
    ) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // ─────────────────────────────────────────────
    // Project Change
    // ─────────────────────────────────────────────

    const handleProjectChange = (
        projectId: string
    ) => {
        setForm((prev) => ({
            ...prev,
            project_id: projectId,
            assigned_to: '',
        }));

        setTeamMembers([]);

        if (projectId) {
            fetchTeam(projectId);
        }
    };

    // ─────────────────────────────────────────────
    // Task Type
    // ─────────────────────────────────────────────

    const selectTaskType = (
        type: 'Regular' | 'Daily'
    ) => {
        setForm((prev) => ({
            ...prev,
            task_type: type,
            recurrence:
                type === 'Daily'
                    ? 'daily'
                    : '',
        }));
    };

    // ─────────────────────────────────────────────
    // Submit
    // ─────────────────────────────────────────────

    const handleSubmit = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        if (!form.project_id) {
            showToast(
                'Please select a project.',
                'error'
            );
            return;
        }

        if (!form.title.trim()) {
            showToast(
                'Task title is required.',
                'error'
            );
            return;
        }

        if (
            form.start_date &&
            form.due_date &&
            new Date(form.due_date) <
                new Date(form.start_date)
        ) {
            showToast(
                'Due date cannot be before start date.',
                'error'
            );
            return;
        }

        if (
            !form.assigned_to &&
            teamMembers.length > 0
        ) {
            showToast(
                'Please assign the task to a developer.',
                'error'
            );
            return;
        }

        try {
            setSaving(true);

            const body: Record<string, any> = {
                title: form.title.trim(),

                description:
                    form.description.trim(),

                status: form.status,

                priority: form.priority,

                task_type: form.task_type,

                is_recurring:
                    form.task_type === 'Daily',

                recurrence:
                    form.task_type === 'Daily'
                        ? 'daily'
                        : null,
            };

            if (form.assigned_to) {
                body.assigned_to =
                    form.assigned_to;
            }

            if (form.start_date) {
                body.start_date =
                    form.start_date;
            }

            if (form.due_date) {
                body.due_date =
                    form.due_date;
            }

            console.log(
                'Creating task:',
                {
                    projectId:
                        form.project_id,
                    body,
                }
            );

            const response = await fetch(
                `${API_BASE}/projects/${form.project_id}/tasks`,
                {
                    method: 'POST',
                    headers: jsonAuthHeader(),
                    body: JSON.stringify(body),
                }
            );

            const data =
                await response
                    .json()
                    .catch(() => null);

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        'Failed to create task.'
                    )
                );
            }

            showToast(
                form.task_type === 'Daily'
                    ? 'Daily task created successfully.'
                    : 'Task created successfully.'
            );

            setTimeout(() => {
                router.push('/dev-task');
            }, 700);
        } catch (error: any) {
            console.error(
                'Task create error:',
                error
            );

            showToast(
                error?.message ||
                    'Something went wrong while creating the task.',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    // ─────────────────────────────────────────────
    // Cancel
    // ─────────────────────────────────────────────

    const handleCancel = () => {
        if (saving) return;

        router.push('/dev-task');
    };

    // ─────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-gray-50">

            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="px-4 sm:px-6 py-4 flex items-center gap-3">

                    <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">
                            Developer Tasks
                        </p>

                        <h1 className="text-xl font-bold text-gray-900">
                            New Task
                        </h1>
                    </div>

                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">

                <div className="max-w-2xl mx-auto">

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">

                        <form
                            onSubmit={handleSubmit}
                            className="p-5 sm:p-6 space-y-5"
                        >

                            {/* Project */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Project
                                    <span className="text-red-500 ml-1">
                                        *
                                    </span>
                                </label>

                                <div className="relative">

                                    <FolderKanban
                                        size={17}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                    />

                                    <select
                                        value={
                                            form.project_id
                                        }
                                        onChange={(event) =>
                                            handleProjectChange(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        disabled={
                                            projectsLoading
                                        }
                                        className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
                                    >
                                        <option value="">
                                            {projectsLoading
                                                ? 'Loading projects...'
                                                : 'Select project'}
                                        </option>

                                        {projects.map(
                                            (project) => {
                                                const id =
                                                    getProjectId(
                                                        project
                                                    );

                                                if (!id)
                                                    return null;

                                                return (
                                                    <option
                                                        key={
                                                            id
                                                        }
                                                        value={
                                                            id
                                                        }
                                                    >
                                                        {getProjectName(
                                                            project
                                                        )}
                                                    </option>
                                                );
                                            }
                                        )}
                                    </select>

                                </div>

                                {!projectsLoading &&
                                    projects.length ===
                                        0 && (
                                        <p className="text-xs text-red-500 mt-1.5">
                                            No projects found.
                                        </p>
                                    )}
                            </div>

                            {/* Task Title */}
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
                                    onChange={(event) =>
                                        updateForm(
                                            'title',
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="e.g. Check pending client tasks"
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
                                    value={
                                        form.description
                                    }
                                    onChange={(event) =>
                                        updateForm(
                                            'description',
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Describe what needs to be completed..."
                                    rows={4}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                />
                            </div>

                            {/* Task Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Task Type
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                    {/* Regular */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            selectTaskType(
                                                'Regular'
                                            )
                                        }
                                        className={`text-left rounded-xl border p-4 transition-all ${
                                            form.task_type ===
                                            'Regular'
                                                ? 'border-[#3A7AFE] bg-blue-50 ring-1 ring-[#3A7AFE]'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">

                                            <div
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                    form.task_type ===
                                                    'Regular'
                                                        ? 'bg-blue-100'
                                                        : 'bg-gray-100'
                                                }`}
                                            >
                                                <CalendarDays
                                                    size={
                                                        17
                                                    }
                                                    className={
                                                        form.task_type ===
                                                        'Regular'
                                                            ? 'text-[#3A7AFE]'
                                                            : 'text-gray-500'
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Regular Task
                                                </p>

                                                <p className="text-xs text-gray-500 mt-1">
                                                    A normal one-time task.
                                                </p>
                                            </div>

                                        </div>
                                    </button>

                                    {/* Daily */}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            selectTaskType(
                                                'Daily'
                                            )
                                        }
                                        className={`text-left rounded-xl border p-4 transition-all ${
                                            form.task_type ===
                                            'Daily'
                                                ? 'border-[#3A7AFE] bg-blue-50 ring-1 ring-[#3A7AFE]'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">

                                            <div
                                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                    form.task_type ===
                                                    'Daily'
                                                        ? 'bg-blue-100'
                                                        : 'bg-gray-100'
                                                }`}
                                            >
                                                <Repeat
                                                    size={
                                                        17
                                                    }
                                                    className={
                                                        form.task_type ===
                                                        'Daily'
                                                            ? 'text-[#3A7AFE]'
                                                            : 'text-gray-500'
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Daily Task
                                                </p>

                                                <p className="text-xs text-gray-500 mt-1">
                                                    Needs to be addressed every day.
                                                </p>
                                            </div>

                                        </div>
                                    </button>

                                </div>
                            </div>

                            {/* Daily Info */}
                            {form.task_type ===
                                'Daily' && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">

                                    <div className="flex items-start gap-3">

                                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                            <Repeat
                                                size={
                                                    17
                                                }
                                                className="text-[#3A7AFE]"
                                            />
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                Daily Task
                                            </p>

                                            <p className="text-xs text-gray-600 mt-1">
                                                This task will
                                                be treated as
                                                a recurring
                                                task and
                                                needs to be
                                                addressed
                                                every day.
                                            </p>

                                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#3A7AFE]">
                                                <Repeat
                                                    size={
                                                        12
                                                    }
                                                />
                                                Repeats every day
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* Developer */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Assign Developer
                                </label>

                                {!form.project_id ? (
                                    <div className="h-11 flex items-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">
                                        Select a project first
                                    </div>
                                ) : teamLoading ? (
                                    <div className="h-11 flex items-center gap-2 px-3 rounded-xl border border-gray-200 text-sm text-gray-400">

                                        <RefreshCw
                                            size={14}
                                            className="animate-spin"
                                        />

                                        Loading developers...
                                    </div>
                                ) : teamMembers.length ===
                                  0 ? (
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
                                                You can still create
                                                this task without
                                                assigning a developer.
                                            </p>
                                        </div>

                                    </div>
                                ) : (
                                    <select
                                        value={
                                            form.assigned_to
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'assigned_to',
                                                event
                                                    .target
                                                    .value
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
                                                    {
                                                        member.name
                                                    }

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
                                        value={
                                            form.status
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'status',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    >
                                        {STATUS_OPTIONS.map(
                                            (
                                                option
                                            ) => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
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
                                        value={
                                            form.priority
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'priority',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    >
                                        {PRIORITY_OPTIONS.map(
                                            (
                                                option
                                            ) => (
                                                <option
                                                    key={
                                                        option
                                                    }
                                                    value={
                                                        option
                                                    }
                                                >
                                                    {
                                                        option
                                                    }
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
                                        value={
                                            form.start_date
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'start_date',
                                                event
                                                    .target
                                                    .value
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
                                        value={
                                            form.due_date
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'due_date',
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                    />
                                </div>

                            </div>

                            {/* Warning */}
                            {form.due_date &&
                                new Date(
                                    form.due_date
                                ) <
                                    new Date(
                                        new Date().toDateString()
                                    ) && (
                                    <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">

                                        <AlertTriangle
                                            size={
                                                13
                                            }
                                        />

                                        This due date is in
                                        the past.
                                    </div>
                                )}

                            {/* Actions */}
                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">

                                <button
                                    type="button"
                                    onClick={
                                        handleCancel
                                    }
                                    disabled={saving}
                                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        !form.project_id ||
                                        projectsLoading
                                    }
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#3A7AFE] hover:bg-[#2563EB] text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw
                                                size={
                                                    15
                                                }
                                                className="animate-spin"
                                            />

                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save
                                                size={
                                                    15
                                                }
                                            />

                                            {form.task_type ===
                                            'Daily'
                                                ? 'Create Daily Task'
                                                : 'Create Task'}
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            </div>

            <ToastContainer
                toasts={toasts}
            />
        </div>
    );
}