
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Calendar, Briefcase, User, Search, SlidersHorizontal,
    CheckCircle2, Clock, Loader2, Circle, X, ChevronDown,
    Zap, AlertTriangle, TrendingUp, Shield, Users,
    Pencil, Trash2, MoreVertical, ChevronRight,
    LayoutGrid, Table2, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';

// ── Status config — matches DB ENUM exactly ───────────────────────────────────
const STATUS_CONFIG = {
    'Not Started': { bar: 'bg-gray-50    text-gray-700',   dot: 'bg-gray-400',   border: 'hover:border-gray-300',   icon: Circle,       iconColor: 'text-gray-400',    pill: 'bg-gray-100   text-gray-700   border-gray-200'   },
    'In Progress': { bar: 'bg-blue-50    text-blue-700',   dot: 'bg-blue-500',   border: 'hover:border-blue-300',   icon: Loader2,      iconColor: 'text-blue-400',    pill: 'bg-blue-100   text-blue-800   border-blue-200'   },
    'Completed':   { bar: 'bg-green-50   text-green-700',  dot: 'bg-green-500',  border: 'hover:border-green-300',  icon: CheckCircle2, iconColor: 'text-green-500',   pill: 'bg-green-100  text-green-800  border-green-200'  },
    'On Hold':     { bar: 'bg-yellow-50  text-yellow-700', dot: 'bg-yellow-500', border: 'hover:border-yellow-300', icon: Clock,        iconColor: 'text-yellow-500',  pill: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
};

const PRIORITY_CONFIG = {
    Low:      { cls: 'bg-gray-100   text-gray-600',   icon: Shield,        dot: 'bg-gray-400',   pill: 'bg-gray-100   text-gray-700   border-gray-200'   },
    Medium:   { cls: 'bg-blue-100   text-blue-700',   icon: TrendingUp,    dot: 'bg-blue-500',   pill: 'bg-blue-100   text-blue-700   border-blue-200'   },
    High:     { cls: 'bg-orange-100 text-orange-700', icon: AlertTriangle, dot: 'bg-orange-500', pill: 'bg-orange-100 text-orange-700 border-orange-200' },
    Critical: { cls: 'bg-red-100    text-red-700',    icon: Zap,           dot: 'bg-red-500',    pill: 'bg-red-100    text-red-700    border-red-200'    },
};

const ALL_STATUSES   = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
const ALL_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const SERVICE_OPTIONS = ['Website', 'WhatsApp API', 'LMS', 'CRM', 'Social Media', 'Other'];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Project {
    id: string;
    title: string;
    client_id?: string | null;
    client_name?: string | null;
    service?: string | null;
    category?: string | null;
    status: string;
    priority: string;
    start_date?: string | null;
    delivery_date?: string | null;
    end_date?: string | null;
    sales_owner?: string | null;
    project_manager?: string | null;
    developer_assigned?: string | null;
    progress_percentage?: number;
    completion_percentage?: number;
    task_count?: number;
    task_done_count?: number;
    project_update?: string | null;
    notes?: string | null;
    description?: string | null;
    created_at?: string;
}

interface ProjectListProps {
    projects: Project[];
    onUpdate?: () => void;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
    onStatusChange?: (id: string, status: string) => void;
    onProgressChange?: (id: string, progress: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const isOverdue = (p: Project) => {
    const d = p.delivery_date || p.end_date;
    return !!d && p.status !== 'Completed' && new Date(d) < new Date();
};

const getDelivery = (p: Project) => p.delivery_date || p.end_date || null;

// ── Avatar chip ───────────────────────────────────────────────────────────────
function MiniAvatar({ name, color = 'blue' }: { name?: string | null; color?: 'blue' | 'green' | 'purple' }) {
    if (!name) return null;
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const COLORS = { blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700', purple: 'bg-purple-100 text-purple-700' };
    return (
        <div title={name} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${COLORS[color]}`}>
            {initials}
        </div>
    );
}

function TaskProgress({ total = 0, done = 0 }: { total?: number; done?: number }) {
    if (total === 0) return <span className="text-xs text-gray-400">—</span>;
    const pct = Math.round((done / total) * 100);
    return (
        <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap">{done}/{total}</span>
        </div>
    );
}

// ── Context menu ──────────────────────────────────────────────────────────────
function CardMenu({ project, onEdit, onDelete, onStatusChange }: {
    project: Project;
    onEdit?: (p: Project) => void;
    onDelete?: (p: Project) => void;
    onStatusChange?: (id: string, status: string) => void;
}) {
    const [open, setOpen] = useState(false);
    if (!onEdit && !onDelete && !onStatusChange) return null;
    return (
        <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreVertical size={14} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-48 py-1 text-sm">
                        {onEdit && (
                            <button onClick={() => { setOpen(false); onEdit(project); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700">
                                <Pencil size={13} className="text-gray-400" /> Edit Project
                            </button>
                        )}
                        {onStatusChange && (
                            <>
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">Change Status</div>
                                {ALL_STATUSES.filter(s => s !== project.status).map(s => (
                                    <button key={s} onClick={() => { setOpen(false); onStatusChange(project.id, s); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.dot || 'bg-gray-400'}`} />
                                        {s}
                                    </button>
                                ))}
                            </>
                        )}
                        {onDelete && (
                            <>
                                <div className="border-t border-gray-100 mt-1" />
                                <button onClick={() => { setOpen(false); onDelete(project); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 mt-1">
                                    <Trash2 size={13} /> Delete Project
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Progress cell ─────────────────────────────────────────────────────────────
function ProgressCell({ pct, projectId, onProgressChange }: { pct: number; projectId: string; onProgressChange?: (id: string, p: number) => void }) {
    return (
        <div className="flex items-center gap-2 min-w-[100px]" onClick={e => e.stopPropagation()}>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-orange-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-8 text-right">{pct}%</span>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// TABLE VIEW
// ══════════════════════════════════════════════════════════════════════════════
type SortDir = 'asc' | 'desc' | null;
interface ColSort { col: string; dir: SortDir }

function SortIcon({ col, sort }: { col: string; sort: ColSort }) {
    if (sort.col !== col) return <ArrowUpDown size={12} className="text-gray-300 ml-1 inline" />;
    return sort.dir === 'asc'
        ? <ArrowUp size={12} className="text-blue-500 ml-1 inline" />
        : <ArrowDown size={12} className="text-blue-500 ml-1 inline" />;
}

function TableView({ projects, onEdit, onDelete, onStatusChange, onProgressChange }: {
    projects: Project[];
    onEdit?: (p: Project) => void;
    onDelete?: (p: Project) => void;
    onStatusChange?: (id: string, status: string) => void;
    onProgressChange?: (id: string, progress: number) => void;
}) {
    const router = useRouter();
    const [sort, setSort] = useState<ColSort>({ col: '', dir: null });

    const toggleSort = (col: string) =>
        setSort(prev =>
            prev.col !== col ? { col, dir: 'asc' }
            : prev.dir === 'asc' ? { col, dir: 'desc' }
            : { col: '', dir: null }
        );

    const sorted = useMemo(() => {
        if (!sort.col || !sort.dir) return projects;
        return [...projects].sort((a, b) => {
            let av: any = (a as any)[sort.col] ?? '';
            let bv: any = (b as any)[sort.col] ?? '';
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            if (av < bv) return sort.dir === 'asc' ? -1 : 1;
            if (av > bv) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [projects, sort]);

    const Th = ({ label, col, className = '' }: { label: string; col?: string; className?: string }) => (
        <th
            className={`px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 border-b border-gray-200 ${col ? 'cursor-pointer select-none hover:text-gray-700' : ''} ${className}`}
            onClick={col ? () => toggleSort(col) : undefined}
        >
            {label}{col && <SortIcon col={col} sort={sort} />}
        </th>
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead>
                        <tr>
                            <Th label="#"                   className="w-10 text-center" />
                            <Th label="Project Name"        col="title"               className="min-w-[180px]" />
                            <Th label="Client"              col="client_name"         className="min-w-[130px]" />
                            <Th label="Category"            col="category"            className="min-w-[110px]" />
                            <Th label="Sales Owner"         col="sales_owner"         className="min-w-[120px]" />
                            <Th label="Project Manager"     col="project_manager"     className="min-w-[130px]" />
                            <Th label="Developer Assigned"  col="developer_assigned"  className="min-w-[140px]" />
                            <Th label="Start Date"          col="start_date"          className="min-w-[110px]" />
                            <Th label="Expected Delivery"   col="end_date"            className="min-w-[130px]" />
                            <Th label="Status"              col="status"              className="min-w-[130px]" />
                            <Th label="Priority"            col="priority"            className="min-w-[100px]" />
                            <Th label="Progress"            col="progress_percentage" className="min-w-[130px]" />
                            <Th label="Description"                                   className="min-w-[180px]" />
                            <Th label="Update"                                        className="min-w-[160px]" />
                            <Th label=""                                              className="w-16 sticky right-0 bg-gray-50" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sorted.map((p, idx) => {
                            const statusCfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['Not Started'];
                            const prioCfg   = PRIORITY_CONFIG[p.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.Medium;
                            const PrioIcon  = prioCfg.icon;
                            const overdue   = isOverdue(p);
                            const pct       = p.progress_percentage ?? p.completion_percentage ?? 0;
                            const delivery  = getDelivery(p);

                            return (
                                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>

                                    <td className="px-3 py-3 text-center text-xs text-gray-400 font-medium">{idx + 1}</td>

                                    <td className="px-3 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${statusCfg.dot}`} />
                                            <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{p.title}</span>
                                        </div>
                                        {(p.task_count ?? 0) > 0 && (
                                            <div className="mt-1 pl-4">
                                                <TaskProgress total={p.task_count} done={p.task_done_count ?? 0} />
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-3 py-3 text-xs text-gray-700">{p.client_name || '—'}</td>

                                    {/* Category (replaces service since DB has no service col) */}
                                    <td className="px-3 py-3">
                                        {p.category ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">{p.category}</span>
                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>

                                    <td className="px-3 py-3">
                                        {p.sales_owner ? (
                                            <div className="flex items-center gap-1.5">
                                                <MiniAvatar name={p.sales_owner} color="green" />
                                                <span className="text-xs text-gray-700 truncate max-w-[90px]">{p.sales_owner}</span>
                                            </div>
                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>

                                    <td className="px-3 py-3">
                                        {p.project_manager ? (
                                            <div className="flex items-center gap-1.5">
                                                <MiniAvatar name={p.project_manager} color="blue" />
                                                <span className="text-xs text-gray-700 truncate max-w-[90px]">{p.project_manager}</span>
                                            </div>
                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>

                                    <td className="px-3 py-3">
                                        {p.developer_assigned ? (
                                            <div className="flex items-center gap-1.5">
                                                <MiniAvatar name={p.developer_assigned} color="purple" />
                                                <span className="text-xs text-gray-700 truncate max-w-[100px]">{p.developer_assigned}</span>
                                            </div>
                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>

                                    <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(p.start_date)}</td>

                                    <td className={`px-3 py-3 text-xs whitespace-nowrap font-medium ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                                        <div className="flex items-center gap-1">
                                            {fmtDate(delivery)}
                                            {overdue && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full font-semibold">Overdue</span>}
                                        </div>
                                    </td>

                                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                        {onStatusChange ? (
                                            <select
                                                value={p.status}
                                                onChange={e => onStatusChange(p.id, e.target.value)}
                                                className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${statusCfg.pill}`}
                                            >
                                                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusCfg.pill}`}>{p.status}</span>
                                        )}
                                    </td>

                                    <td className="px-3 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${prioCfg.pill}`}>
                                            <PrioIcon size={10} />{p.priority}
                                        </span>
                                    </td>

                                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                        <ProgressCell pct={pct} projectId={p.id} onProgressChange={onProgressChange} />
                                    </td>

                                    <td className="px-3 py-3 max-w-[180px]">
                                        <span className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{p.description || '—'}</span>
                                    </td>

                                    <td className="px-3 py-3 max-w-[160px]">
                                        {p.project_update ? (
                                            <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg line-clamp-2 block border border-blue-100">{p.project_update}</span>
                                        ) : <span className="text-gray-400 text-xs">—</span>}
                                    </td>

                                    <td className="px-3 py-3 sticky right-0 bg-white group-hover:bg-blue-50/30 transition-colors" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            {onEdit && (
                                                <button onClick={() => onEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                                                    <Pencil size={13} />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button onClick={() => onDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-gray-400">Click a row to open project details</span>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD VIEW
// ══════════════════════════════════════════════════════════════════════════════
function ProjectCard({ project, onEdit, onDelete, onStatusChange, onProgressChange }: {
    project: Project;
    onEdit?: (p: Project) => void;
    onDelete?: (p: Project) => void;
    onStatusChange?: (id: string, status: string) => void;
    onProgressChange?: (id: string, progress: number) => void;
}) {
    const router     = useRouter();
    const cfg        = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['Not Started'];
    const prioCfg    = PRIORITY_CONFIG[project.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.Medium;
    const PrioIcon   = prioCfg.icon;
    const StatusIcon = cfg.icon;
    const overdue    = isOverdue(project);
    const pct        = project.progress_percentage ?? project.completion_percentage ?? 0;
    const delivery   = getDelivery(project);

    return (
        <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 ${cfg.border} flex flex-col`}>
            <div className="p-5 flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <StatusIcon size={13} className={`${cfg.iconColor} ${project.status === 'In Progress' ? 'animate-spin' : ''}`} />
                        <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">{project.status}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {overdue && <span className="text-[11px] bg-red-100 text-red-600 font-medium px-1.5 py-0.5 rounded-full">Overdue</span>}
                        {project.priority && (
                            <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${prioCfg.cls}`}>
                                <PrioIcon size={10} />{project.priority}
                            </span>
                        )}
                        <CardMenu project={project} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
                    </div>
                </div>

                <button onClick={() => router.push(`/projects/${project.id}`)} className="text-left w-full group">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {project.title}
                        <ChevronRight size={12} className="inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                </button>

                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User size={11} className="text-gray-400 shrink-0" />
                        <span className="truncate">{project.client_name || 'No client'}</span>
                    </div>
                    {project.category && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Briefcase size={11} className="text-gray-400 shrink-0" />
                            <span className="truncate">{project.category}</span>
                        </div>
                    )}
                </div>

                {(project.sales_owner || project.project_manager || project.developer_assigned) && (
                    <div className="flex items-center gap-1.5">
                        <Users size={11} className="text-gray-300 shrink-0" />
                        <div className="flex items-center -space-x-1.5">
                            <MiniAvatar name={project.sales_owner}        color="green"  />
                            <MiniAvatar name={project.project_manager}    color="blue"   />
                            <MiniAvatar name={project.developer_assigned} color="purple" />
                        </div>
                    </div>
                )}

                {(pct > 0 || onProgressChange) && (
                    <div onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>Progress</span>
                            <span className="font-semibold text-gray-700">{pct}%</span>
                        </div>
                        {onProgressChange ? (
                            <input type="range" min="0" max="100" step="5" value={pct}
                                onChange={e => onProgressChange(project.id, Number(e.target.value))}
                                className="w-full accent-blue-600 h-1.5" />
                        ) : (
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                        )}
                    </div>
                )}

                {(project.task_count ?? 0) > 0 && (
                    <TaskProgress total={project.task_count ?? 0} done={project.task_done_count ?? 0} />
                )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                <div>
                    <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wide">Start</p>
                    <p className="text-xs font-medium text-gray-700">{fmtDate(project.start_date)}</p>
                </div>
                <div>
                    <p className={`text-[10px] mb-0.5 uppercase tracking-wide ${overdue ? 'text-red-400' : 'text-gray-400'}`}>Delivery</p>
                    <p className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-700'}`}>{fmtDate(delivery)}</p>
                </div>
            </div>

            <div className={`px-5 py-1.5 rounded-b-xl text-[11px] font-semibold text-center tracking-widest uppercase ${cfg.bar}`}>
                {project.status}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTER BAR
// ══════════════════════════════════════════════════════════════════════════════
interface Filters { status: string; priority: string; client: string; }

function FilterBar({ filters, onChange, clientOptions, onClear }: {
    filters: Filters; onChange: (f: Filters) => void; clientOptions: string[]; onClear: () => void;
}) {
    const [open, setOpen] = useState(false);
    const hasActive = filters.status !== 'All' || filters.priority !== 'All' || filters.client !== 'All';

    return (
        <div className="relative">
            <button onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm transition-colors ${hasActive ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                <SlidersHorizontal size={15} />
                Filters
                {hasActive && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-11 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72 space-y-4">
                        <FilterGroup label="Status">
                            <div className="flex flex-wrap gap-1.5">
                                {['All', ...ALL_STATUSES].map(s => (
                                    <Chip key={s} active={filters.status === s} onClick={() => onChange({ ...filters, status: s })}>{s}</Chip>
                                ))}
                            </div>
                        </FilterGroup>
                        <FilterGroup label="Priority">
                            <div className="flex flex-wrap gap-1.5">
                                {['All', ...ALL_PRIORITIES].map(p => (
                                    <Chip key={p} active={filters.priority === p} onClick={() => onChange({ ...filters, priority: p })}>{p}</Chip>
                                ))}
                            </div>
                        </FilterGroup>
                        {clientOptions.length > 0 && (
                            <FilterGroup label="Client">
                                <select value={filters.client} onChange={e => onChange({ ...filters, client: e.target.value })}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm w-full focus:border-blue-500 focus:outline-none bg-white text-gray-900 h-9">
                                    <option value="All">All clients</option>
                                    {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </FilterGroup>
                        )}
                        {hasActive && (
                            <button onClick={() => { onClear(); setOpen(false); }}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50">
                                <X size={12} /> Clear all filters
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            {children}
        </div>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {children}
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
type ViewMode = 'card' | 'table';

export default function ProjectList({ projects, onUpdate, onEdit, onDelete, onStatusChange, onProgressChange }: ProjectListProps) {
    const [search,   setSearch]   = useState('');
    const [filters,  setFilters]  = useState<Filters>({ status: 'All', priority: 'All', client: 'All' });
    const [sort,     setSort]     = useState('newest');
    const [viewMode, setViewMode] = useState<ViewMode>('table');

    const clientOptions = useMemo(() =>
        [...new Set(projects.map(p => p.client_name).filter(Boolean))] as string[],
        [projects]
    );

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        let list = projects.filter(p => {
            const matchSearch =
                !q ||
                p.title?.toLowerCase().includes(q)              ||
                p.client_name?.toLowerCase().includes(q)        ||
                p.category?.toLowerCase().includes(q)           ||
                p.project_manager?.toLowerCase().includes(q)    ||
                p.developer_assigned?.toLowerCase().includes(q) ||
                p.sales_owner?.toLowerCase().includes(q);

            return (
                matchSearch &&
                (filters.status   === 'All' || p.status      === filters.status)   &&
                (filters.priority === 'All' || p.priority    === filters.priority) &&
                (filters.client   === 'All' || p.client_name === filters.client)
            );
        });

        const PRIO_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return [...list].sort((a, b) => {
            if (sort === 'priority') return (PRIO_ORDER[b.priority] || 0) - (PRIO_ORDER[a.priority] || 0);
            if (sort === 'progress') return ((b.progress_percentage ?? 0) - (a.progress_percentage ?? 0));
            if (sort === 'oldest')   return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
    }, [projects, search, filters, sort]);

    const clearFilters = () => { setSearch(''); setFilters({ status: 'All', priority: 'All', client: 'All' }); };
    const hasAnyFilter = search !== '' || Object.values(filters).some(v => v !== 'All');

    if (projects.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center">
                <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium text-lg">No projects yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first project to get started.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search project, client, team member..."
                        className="rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-0 text-sm bg-white w-full pl-9 pr-9 py-2.5 outline-none" />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <FilterBar filters={filters} onChange={setFilters} clientOptions={clientOptions} onClear={clearFilters} />

                {viewMode === 'card' && (
                    <select value={sort} onChange={e => setSort(e.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 bg-white focus:border-blue-500 focus:outline-none h-9">
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="priority">By priority</option>
                        <option value="progress">By progress</option>
                    </select>
                )}

                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white h-9 shrink-0">
                    <button onClick={() => setViewMode('table')} title="Table view"
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Table2 size={15} />
                        <span className="text-xs font-medium hidden sm:inline">Table</span>
                    </button>
                    <button onClick={() => setViewMode('card')} title="Card view"
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <LayoutGrid size={15} />
                        <span className="text-xs font-medium hidden sm:inline">Cards</span>
                    </button>
                </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    Showing <span className="font-semibold text-gray-800">{filtered.length}</span> of <span className="font-semibold text-gray-800">{projects.length}</span> projects
                </p>
                {hasAnyFilter && filtered.length !== projects.length && (
                    <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <X size={11} /> Clear filters
                    </button>
                )}
            </div>

            {/* Empty filtered state */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center">
                    <Search size={36} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No projects match your search</p>
                    <p className="text-gray-400 text-sm mt-1">Try different keywords or clear the filters.</p>
                    <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700">Clear filters</button>
                </div>
            ) : viewMode === 'table' ? (
                <TableView projects={filtered} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onProgressChange={onProgressChange} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(p => (
                        <ProjectCard key={p.id} project={p} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onProgressChange={onProgressChange} />
                    ))}
                </div>
            )}
        </div>
    );
}