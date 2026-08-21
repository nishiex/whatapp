

'use client';

import { useState } from 'react';
import {
    Calendar, Briefcase, FileText, Clock, TrendingUp,
    Edit3, Check, X, Users, Zap, AlertTriangle, Shield,
} from 'lucide-react';
import { authHeader } from '@/lib/auth';

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-api.vasifytech.com/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
    'Requirement': 'bg-purple-100 text-purple-800 border-purple-200',
    'In Progress': 'bg-blue-100   text-blue-800   border-blue-200',
    'Delivered': 'bg-green-100  text-green-800  border-green-200',
    'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

const PRIORITY_STYLE: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    Low: { cls: 'bg-gray-100   text-gray-600   border-gray-200', icon: Shield, label: 'Low' },
    Medium: { cls: 'bg-blue-100   text-blue-700   border-blue-200', icon: TrendingUp, label: 'Medium' },
    High: { cls: 'bg-orange-100 text-orange-700 border-orange-200', icon: AlertTriangle, label: 'High' },
    Critical: { cls: 'bg-red-100    text-red-700    border-red-200', icon: Zap, label: 'Critical' },
};

const STATUS_OPTIONS = ['Requirement', 'In Progress', 'Delivered', 'On Hold'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null | undefined) => {
    if (!d) return 'Not set';
    return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProjectOverview({
    project,
    onUpdate,
}: {
    project: any;
    onUpdate: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [quickEdit, setQuickEdit] = useState({
        status: project.status || 'Requirement',
        priority: project.priority || 'Medium',
        progress_percentage: project.progress_percentage ?? project.completion_percentage ?? 0,
        sales_owner: project.sales_owner || '',
        project_manager: project.project_manager || '',
        developer_assigned: project.developer_assigned || '',
    });

    const pct = project.progress_percentage ?? project.completion_percentage ?? 0;
    const prioConfig = PRIORITY_STYLE[project.priority] || PRIORITY_STYLE.Medium;
    const PrioIcon = prioConfig.icon;

    const isOverdue =
        project.delivery_date &&
        project.status !== 'Delivered' &&
        new Date(project.delivery_date) < new Date();

    const daysUntil = project.delivery_date
        ? Math.ceil((new Date(project.delivery_date).getTime() - Date.now()) / 86400000)
        : null;

    const saveQuickEdit = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify(quickEdit),
            });
            if (res.ok) { onUpdate(); setEditing(false); }
            else console.error('Save failed', await res.text());
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    // When edit is cancelled, reset quickEdit to current project values
    const cancelEdit = () => {
        setQuickEdit({
            status: project.status || 'Requirement',
            priority: project.priority || 'Medium',
            progress_percentage: project.progress_percentage ?? project.completion_percentage ?? 0,
            sales_owner: project.sales_owner || '',
            project_manager: project.project_manager || '',
            developer_assigned: project.developer_assigned || '',
        });
        setEditing(false);
    };

    return (
        <div className="space-y-5">

            {/* ── Row 1: KPI cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    color="blue"
                    label="Start Date"
                    value={fmtDate(project.start_date)}
                    icon={<Calendar size={15} />}
                />
                <KpiCard
                    color={isOverdue ? 'red' : 'green'}
                    label={isOverdue ? 'Overdue Since' : 'Go-Live Date'}
                    value={fmtDate(project.delivery_date)}
                    icon={<Calendar size={15} />}
                    sub={
                        daysUntil !== null && project.status !== 'Delivered'
                            ? isOverdue
                                ? `${Math.abs(daysUntil)}d overdue`
                                : `${daysUntil}d remaining`
                            : undefined
                    }
                />
                <KpiCard
                    color="purple"
                    label="Status"
                    value={project.status || 'Requirement'}
                    icon={<Clock size={15} />}
                    badge={STATUS_STYLE[project.status]}
                />
                <KpiCard
                    color="orange"
                    label="Priority"
                    value={project.priority || 'Medium'}
                    icon={<PrioIcon size={15} />}
                    badge={prioConfig.cls}
                />
            </div>

            {/* ── Row 2: Progress ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Overall Progress</h3>
                    <span className="text-2xl font-bold text-gray-900">{pct}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-green-500'
                                : pct >= 60 ? 'bg-[#3A7AFE]'
                                    : pct >= 30 ? 'bg-orange-400'
                                        : 'bg-red-400'
                            }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                    <span>Not started</span><span>In progress</span><span>Complete</span>
                </div>
            </div>

            {/* ── Row 3: Team & Status Quick Edit ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        <Users size={15} className="text-gray-400" />
                        Team & Status
                    </h3>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 text-xs text-[#3A7AFE] hover:text-[#2563EB] font-medium px-2.5 py-1.5 rounded-xl hover:bg-blue-50 transition-colors"
                        >
                            <Edit3 size={13} /> Edit
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={cancelEdit}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <X size={13} /> Cancel
                            </button>
                            <button
                                onClick={saveQuickEdit}
                                disabled={saving}
                                className="flex items-center gap-1 text-xs bg-[#3A7AFE] text-white px-3 py-1.5 rounded-xl hover:bg-[#2563EB] disabled:opacity-50 transition-colors font-medium"
                            >
                                <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="divide-y divide-gray-50">

                    {/* Status + Priority */}
                    <div className="px-5 py-4 grid grid-cols-2 gap-6">
                        <EditableRow
                            label="Status"
                            editing={editing}
                            displayValue={
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLE[project.status] || ''}`}>
                                    {project.status}
                                </span>
                            }
                            editControl={
                                <select
                                    value={quickEdit.status}
                                    onChange={e => setQuickEdit(p => ({ ...p, status: e.target.value }))}
                                    className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none px-3 py-2 text-sm w-full bg-white h-9"
                                >
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            }
                        />
                        <EditableRow
                            label="Priority"
                            editing={editing}
                            displayValue={
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${prioConfig.cls}`}>
                                    <PrioIcon size={11} />
                                    {project.priority || 'Medium'}
                                </span>
                            }
                            editControl={
                                <select
                                    value={quickEdit.priority}
                                    onChange={e => setQuickEdit(p => ({ ...p, priority: e.target.value }))}
                                    className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:outline-none px-3 py-2 text-sm w-full bg-white h-9"
                                >
                                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            }
                        />
                    </div>

                    {/* Completion % slider — only in edit mode */}
                    {editing && (
                        <div className="px-5 py-4">
                            <p className="text-xs text-gray-500 mb-2 font-medium">
                                Completion — <span className="text-[#3A7AFE] font-bold">{quickEdit.progress_percentage}%</span>
                            </p>
                            <input
                                type="range" min="0" max="100" step="5"
                                value={quickEdit.progress_percentage}
                                onChange={e => setQuickEdit(p => ({ ...p, progress_percentage: Number(e.target.value) }))}
                                className="w-full accent-[#3A7AFE]"
                            />
                            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                                <span>0%</span><span>50%</span><span>100%</span>
                            </div>
                        </div>
                    )}

                    {/* Team members */}
                    <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <EditableRow
                            label="Sales Owner"
                            editing={editing}
                            displayValue={<AvatarChip name={project.sales_owner} />}
                            editControl={
                                <input
                                    type="text"
                                    value={quickEdit.sales_owner}
                                    onChange={e => setQuickEdit(p => ({ ...p, sales_owner: e.target.value }))}
                                    placeholder="Sales owner name"
                                    className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:ring-0 text-sm bg-white w-full px-3 py-2 outline-none"
                                />
                            }
                        />
                        <EditableRow
                            label="Project Manager"
                            editing={editing}
                            displayValue={<AvatarChip name={project.project_manager} />}
                            editControl={
                                <input
                                    type="text"
                                    value={quickEdit.project_manager}
                                    onChange={e => setQuickEdit(p => ({ ...p, project_manager: e.target.value }))}
                                    placeholder="PM name"
                                    className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:ring-0 text-sm bg-white w-full px-3 py-2 outline-none"
                                />
                            }
                        />
                        <EditableRow
                            label="Developer"
                            editing={editing}
                            displayValue={<AvatarChip name={project.developer_assigned} />}
                            editControl={
                                <input
                                    type="text"
                                    value={quickEdit.developer_assigned}
                                    onChange={e => setQuickEdit(p => ({ ...p, developer_assigned: e.target.value }))}
                                    placeholder="Developer name"
                                    className="rounded-xl border border-gray-200 focus:border-[#3A7AFE] focus:ring-0 text-sm bg-white w-full px-3 py-2 outline-none"
                                />
                            }
                        />
                    </div>
                </div>
            </div>

            {/* ── Row 4: Project Details + Description ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Project info */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Briefcase size={15} className="text-gray-400" />
                        Project Details
                    </h3>
                    <div className="divide-y divide-gray-50">
                        <InfoRow label="Client" value={project.client_name || '—'} />
                        <InfoRow label="Service" value={project.service || '—'} />
                        <InfoRow label="Linked Deal" value={project.deal_id ? `Deal #${project.deal_id.slice(0, 8)}` : '—'} />
                        <InfoRow label="Created by" value={project.created_by_name || '—'} />
                        <InfoRow label="Created" value={project.created_at ? new Date(project.created_at).toLocaleDateString('en-IN') : '—'} />
                        <InfoRow label="Last updated" value={project.updated_at ? new Date(project.updated_at).toLocaleDateString('en-IN') : '—'} />
                        <InfoRow label="Tasks" value={
                            project.task_count > 0
                                ? `${project.task_done_count ?? 0} / ${project.task_count} done`
                                : 'No tasks yet'
                        } />
                    </div>
                </div>

                {/* Description + Last Update */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <FileText size={15} className="text-gray-400" />
                            Description
                        </h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {project.description || 'No description provided.'}
                        </p>
                    </div>

                    {project.project_update && (
                        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                📌 Latest Update
                            </h3>
                            <p className="text-sm text-blue-700 whitespace-pre-wrap leading-relaxed">
                                {project.project_update}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
    color, label, value, icon, sub, badge,
}: {
    color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
    label: string;
    value: string;
    icon: React.ReactNode;
    sub?: string;
    badge?: string;
}) {
    const COLOR = {
        blue: 'bg-blue-50   border-blue-100   text-blue-600',
        green: 'bg-green-50  border-green-100  text-green-600',
        red: 'bg-red-50    border-red-100    text-red-600',
        purple: 'bg-purple-50 border-purple-100 text-purple-600',
        orange: 'bg-orange-50 border-orange-100 text-orange-600',
    };
    return (
        <div className={`rounded-2xl border p-4 ${COLOR[color]}`}>
            <div className="flex items-center gap-1.5 mb-2 opacity-70">
                {icon}
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            {badge ? (
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>
                    {value}
                </span>
            ) : (
                <p className="text-sm font-bold text-gray-900 leading-snug">{value}</p>
            )}
            {sub && <p className="text-xs mt-1 opacity-80 font-medium">{sub}</p>}
        </div>
    );
}

function EditableRow({
    label, editing, displayValue, editControl,
}: {
    label: string;
    editing: boolean;
    displayValue: React.ReactNode;
    editControl: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-xs text-gray-400 font-medium mb-1.5">{label}</p>
            {editing ? editControl : (displayValue || <span className="text-sm text-gray-400">—</span>)}
        </div>
    );
}

function AvatarChip({ name }: { name?: string | null }) {
    if (!name) return <span className="text-sm text-gray-400">Not assigned</span>;
    const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-[#3A7AFE] shrink-0">
                {initials}
            </div>
            <span className="text-sm text-gray-800 font-medium">{name}</span>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-2.5 gap-4">
            <span className="text-xs text-gray-500 shrink-0">{label}</span>
            <span className="text-xs font-medium text-gray-900 text-right">{value}</span>
        </div>
    );
}