


'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { authHeader, jsonAuthHeader } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-api.vasifytech.com/api';

// These must match DB ENUM values exactly
const CATEGORY_OPTIONS = ['CRM', 'Web App', 'Mobile App', 'AI', 'Other'];
const STATUS_OPTIONS   = ['Not Started', 'In Progress', 'On Hold', 'Completed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const EMPTY_FORM = {
    title:               '',
    client_id:           '',
    deal_id:             '',
    category:            '',
    description:         '',
    status:              'Not Started',
    priority:            'Medium',
    start_date:          '',
    delivery_date:       '',
    progress_percentage: 0,
    sales_owner:         '',
    project_manager:     '',
    developer_assigned:  '',
    update_note:         '',
    scope_of_work:       '',
    department:          '',
    estimated_budget:    '',
    actual_cost:         '',
    health_rating:       '',
};

export default function ProjectForm({ project, onClose, onSuccess }: {
    project?: any;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [customers, setCustomers] = useState<any[]>([]);
    const [deals,     setDeals]     = useState<any[]>([]);
    const [team,      setTeam]      = useState<any[]>([]);
    const [loading,   setLoading]   = useState(false);
    const [section,   setSection]   = useState('basic');

    useEffect(() => {
        fetchCustomers();
        fetchWonDeals();
        fetchTeamMembers();
        if (project) {
            setFormData({
                title:               project.title               || '',
                client_id:           project.client_id           || '',
                deal_id:             project.deal_id             || '',
                category:            project.category            || '',
                description:         project.description         || '',
                status:              project.status              || 'Not Started',
                priority:            project.priority            || 'Medium',
                start_date:          project.start_date          ? project.start_date.split('T')[0]    : '',
                delivery_date:       (project.delivery_date || project.end_date) ? (project.delivery_date || project.end_date).split('T')[0] : '',
                progress_percentage: project.progress_percentage ?? project.completion_percentage ?? 0,
                sales_owner:         project.sales_owner         || '',
                project_manager:     project.project_manager     || '',
                developer_assigned:  project.developer_assigned  || '',
                update_note:         '',
                scope_of_work:       project.scope_of_work       || '',
                department:          project.department          || '',
                estimated_budget:    project.estimated_budget    || '',
                actual_cost:         project.actual_cost         || '',
                health_rating:       project.health_rating       || '',
            });
        }
    }, [project]);

    const fetchCustomers = async () => {
        try {
            const res  = await fetch(`${API_BASE}/customers`, { headers: authHeader() });
            const data = res.ok ? await res.json() : {};
            setCustomers(Array.isArray(data) ? data : data.customers || data.data || []);
        } catch { setCustomers([]); }
    };

    const fetchWonDeals = async () => {
        try {
            const res  = await fetch(`${API_BASE}/deals?stage=Won`, { headers: authHeader() });
            if (!res.ok) {
                const res2  = await fetch(`${API_BASE}/deals`, { headers: authHeader() });
                const data2 = res2.ok ? await res2.json() : {};
                const all   = Array.isArray(data2) ? data2 : data2.deals || data2.data || [];
                setDeals(all.filter((d: any) => d.stage === 'Won' || d.status === 'Won'));
                return;
            }
            const data = await res.json();
            setDeals(Array.isArray(data) ? data : data.deals || data.data || []);
        } catch { setDeals([]); }
    };

    const fetchTeamMembers = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`, { headers: authHeader() });
            if (res.ok) {
                const data = await res.json();
                setTeam(Array.isArray(data) ? data : data.users || []);
            }
        } catch { /* free text fallback */ }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url    = project ? `${API_BASE}/projects/${project.id}` : `${API_BASE}/projects`;
            const method = project ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                client_id:        formData.client_id        || null,
                deal_id:          formData.deal_id          || null,
                category:         formData.category         || null,
                health_rating:    formData.health_rating    || null,
                estimated_budget: formData.estimated_budget || null,
                actual_cost:      formData.actual_cost      || null,
            };

            const res = await fetch(url, {
                method,
                headers: jsonAuthHeader(),
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                onSuccess();
            } else {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Failed to save project:', JSON.stringify(err));
                alert(`Failed to save: ${err.error || err.detail || 'Please try again.'}`);
            }
        } catch (err) {
            console.error('Error saving project:', err);
            alert('Error saving project. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const teamOptions = team.map((u: any) => ({
        id:   u.id || u._id || String(Math.random()),
        name: u.name || u.full_name || '',
    })).filter(u => u.name);

    const TABS = [
        { id: 'basic',   label: 'Basic Info'    },
        { id: 'team',    label: 'Team'           },
        { id: 'details', label: 'Details'        },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            {project ? 'Edit Project' : 'New Project'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {project ? 'Update project details' : 'Fill in the details to create a new project'}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 flex gap-0 border-b shrink-0">
                    {TABS.map(tab => (
                        <button key={tab.id} type="button" onClick={() => setSection(tab.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                section === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Form — NOTE: form tag wraps everything so submit only fires from the Save button */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                        {/* ── BASIC INFO ───────────────────────────────────── */}
                        {section === 'basic' && (
                            <>
                                <Field label="Project Title" required>
                                    <input type="text" name="title" value={formData.title} onChange={handleChange} required
                                        placeholder="e.g. Nordica Website Redesign" className="input" />
                                </Field>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Client">
                                        <select name="client_id" value={formData.client_id} onChange={handleChange} className="input">
                                            <option value="">Select client</option>
                                            {customers.map((c: any) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}{c.company ? ` – ${c.company}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Category">
                                        <select name="category" value={formData.category} onChange={handleChange} className="input">
                                            <option value="">Select category</option>
                                            {CATEGORY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Status" required>
                                        <select name="status" value={formData.status} onChange={handleChange} required className="input">
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </Field>

                                    <Field label="Linked Deal" hint="Won deals only">
                                        <select name="deal_id" value={formData.deal_id} onChange={handleChange} className="input">
                                            <option value="">No linked deal</option>
                                            {deals.map((d: any) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.client_name ? `${d.client_name} — ${d.service || 'Deal'}` : `Deal #${d.id}`}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Start Date">
                                        <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="input" />
                                    </Field>

                                    <Field label="Expected Delivery Date">
                                        <input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleChange} className="input" />
                                    </Field>
                                </div>

                                <Field label="Scope of Work">
                                    <textarea name="scope_of_work" value={formData.scope_of_work} onChange={handleChange}
                                        rows={3} placeholder="What's in scope for this project..." className="input" />
                                </Field>
                            </>
                        )}

                        {/* ── TEAM ─────────────────────────────────────────── */}
                        {section === 'team' && (
                            <>
                                <Field label="Priority" required>
                                    <div className="grid grid-cols-4 gap-2">
                                        {PRIORITY_OPTIONS.map(p => (
                                            <button key={p} type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                                                    formData.priority === p
                                                        ? p === 'Critical' ? 'bg-red-600    text-white border-red-600'
                                                        : p === 'High'     ? 'bg-orange-500 text-white border-orange-500'
                                                        : p === 'Medium'   ? 'bg-blue-600   text-white border-blue-600'
                                                                           : 'bg-gray-500   text-white border-gray-500'
                                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                }`}>
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </Field>

                                <Field label="Health Rating">
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['Green', 'Yellow', 'Red'] as const).map(h => (
                                            <button key={h} type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, health_rating: prev.health_rating === h ? '' : h }))}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                                                    formData.health_rating === h
                                                        ? h === 'Green'  ? 'bg-green-500  text-white border-green-500'
                                                        : h === 'Yellow' ? 'bg-yellow-400 text-white border-yellow-400'
                                                                         : 'bg-red-500    text-white border-red-500'
                                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                }`}>
                                                {h}
                                            </button>
                                        ))}
                                    </div>
                                </Field>

                                <Field label={`Completion — ${formData.progress_percentage}%`}>
                                    <div className="space-y-2">
                                        <input type="range" name="progress_percentage" min="0" max="100" step="5"
                                            value={formData.progress_percentage} onChange={handleChange}
                                            className="w-full accent-blue-600" />
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full transition-all"
                                                style={{ width: `${formData.progress_percentage}%` }} />
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>0%</span><span>50%</span><span>100%</span>
                                        </div>
                                    </div>
                                </Field>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Sales Owner">
                                        <input type="text" name="sales_owner" value={formData.sales_owner} onChange={handleChange}
                                            list="team-list" placeholder="e.g. Aryan Shah" className="input" />
                                    </Field>
                                    <Field label="Project Manager">
                                        <input type="text" name="project_manager" value={formData.project_manager} onChange={handleChange}
                                            list="team-list" placeholder="e.g. Priya Mehta" className="input" />
                                    </Field>
                                    <Field label="Developer Assigned" className="sm:col-span-2">
                                        <input type="text" name="developer_assigned" value={formData.developer_assigned} onChange={handleChange}
                                            list="team-list" placeholder="e.g. Rahul Kumar" className="input" />
                                    </Field>
                                </div>

                                <Field label="Department">
                                    <input type="text" name="department" value={formData.department} onChange={handleChange}
                                        placeholder="e.g. Engineering, Design" className="input" />
                                </Field>

                                {teamOptions.length > 0 && (
                                    <datalist id="team-list">
                                        {teamOptions.map(u => <option key={u.id} value={u.name} />)}
                                    </datalist>
                                )}
                            </>
                        )}

                        {/* ── DETAILS ──────────────────────────────────────── */}
                        {section === 'details' && (
                            <>
                                <Field label="Project Description">
                                    <textarea name="description" value={formData.description} onChange={handleChange}
                                        rows={4} placeholder="Scope, deliverables, client requirements..." className="input" />
                                </Field>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Estimated Budget (₹)">
                                        <input type="number" name="estimated_budget" value={formData.estimated_budget} onChange={handleChange}
                                            placeholder="0.00" min="0" step="0.01" className="input" />
                                    </Field>
                                    <Field label="Actual Cost (₹)">
                                        <input type="number" name="actual_cost" value={formData.actual_cost} onChange={handleChange}
                                            placeholder="0.00" min="0" step="0.01" className="input" />
                                    </Field>
                                </div>

                                {project && (
                                    <Field label="Add Update Note" hint="Appended to the project timeline">
                                        <textarea name="update_note" value={formData.update_note} onChange={handleChange}
                                            rows={3} placeholder="What changed? e.g. Design approved, moving to development..."
                                            className="input" />
                                    </Field>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
                        {/* Step dots */}
                        <div className="flex gap-1">
                            {TABS.map(tab => (
                                <div key={tab.id}
                                    className={`h-1.5 rounded-full transition-all ${section === tab.id ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300'}`} />
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose}
                                className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                                Cancel
                            </button>

                            {/* Navigate between tabs — type="button" prevents form submit */}
                            {section === 'basic' && (
                                <button type="button" onClick={() => setSection('team')}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Next →
                                </button>
                            )}
                            {section === 'team' && (
                                <button type="button" onClick={() => setSection('details')}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                    Next →
                                </button>
                            )}
                            {section === 'details' && (
                                <button type="submit" disabled={loading}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                    {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    outline: none;
                    transition: border-color 0.15s, box-shadow 0.15s;
                    background: white;
                    color: #111827;
                }
                .input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
                }
                textarea.input { resize: vertical; }
            `}</style>
        </div>
    );
}

function Field({ label, hint, required, children, className }: {
    label: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {hint && <span className="ml-2 text-xs font-normal text-gray-400">({hint})</span>}
            </label>
            {children}
        </div>
    );
}