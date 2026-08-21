'use client';
import { authHeader, jsonAuthHeader, getToken } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, TrendingUp } from 'lucide-react';

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-api.vasifytech.com/api';


const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Log Form ──────────────────────────────────────────────────────────────────

function LogForm({ onSubmit, onCancel }) {
    const [form, setForm] = useState({
        hours_logged: '', log_date: new Date().toISOString().split('T')[0],
        is_billable: true, description: '',
    });
    const [saving, setSaving] = useState(false);
    const handle = e => {
        const { name, value, type, checked } = e.target;
        setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    };
    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSubmit({ ...form, is_billable: form.is_billable === true || form.is_billable === 'true' });
        setSaving(false);
    };

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-gray-800 mb-4">Log Time</h4>
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hours <span className="text-red-500">*</span></label>
                        <input type="number" name="hours_logged" value={form.hours_logged} onChange={handle}
                            required step="0.25" min="0.25" max="24" placeholder="e.g. 4.5"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
                        <input type="date" name="log_date" value={form.log_date} onChange={handle} required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                        <select name="is_billable" value={String(form.is_billable)} onChange={handle}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="true">Billable</option>
                            <option value="false">Non-Billable</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea name="description" value={form.description} onChange={handle} rows={2}
                        placeholder="What did you work on?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                </div>
                <div className="flex gap-2">
                    <button type="submit" disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                        {saving ? 'Saving...' : 'Log Time'}
                    </button>
                    <button type="button" onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 text-gray-700">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TimeTracking({ projectId }) {
    const [logs, setLogs] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchLogs(); }, [projectId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/time-logs`, { headers: authHeader() });
            if (res.ok) { const d = await res.json(); setLogs(Array.isArray(d) ? d : d.logs || []); }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (formData) => {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/time-logs`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(formData),
            });
            if (res.ok) { setShowForm(false); fetchLogs(); }
            else console.error('Failed:', await res.text());
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (logId) => {
        if (!confirm('Delete this time log?')) return;
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/time-logs/${logId}`, { method: 'DELETE', headers: authHeader() });
            if (res.ok) setLogs(prev => prev.filter(l => l.id !== logId));
        } catch (e) { console.error(e); }
    };

    // Summary calculations
    const total = logs.reduce((s, l) => s + parseFloat(l.hours_logged || 0), 0);
    const billable = logs.reduce((s, l) => s + (l.is_billable ? parseFloat(l.hours_logged || 0) : 0), 0);
    const nonBill = total - billable;
    const billablePct = total > 0 ? Math.round((billable / total) * 100) : 0;

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Time Tracking</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{logs.length} log{logs.length !== 1 ? 's' : ''} recorded</p>
                </div>
                <button onClick={() => setShowForm(o => !o)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shrink-0">
                    <Plus size={15} /> Log Time
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={15} className="text-blue-600" />
                        <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{total.toFixed(1)}h</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={15} className="text-green-600" />
                        <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Billable</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{billable.toFixed(1)}h</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={15} className="text-gray-500" />
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Non-Bill.</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{nonBill.toFixed(1)}h</p>
                </div>
            </div>

            {/* Billable ratio bar */}
            {total > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>Billable ratio</span>
                        <span className="font-semibold text-gray-800">{billablePct}% billable</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-400 rounded-l-full transition-all duration-500" style={{ width: `${billablePct}%` }} />
                        <div className="h-full bg-gray-300 flex-1 rounded-r-full" />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full inline-block" />Billable</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 rounded-full inline-block" />Non-Billable</span>
                    </div>
                </div>
            )}

            {/* Log form */}
            {showForm && <LogForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />}

            {/* Logs table */}
            {loading ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading time logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-14 text-center">
                    <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No time logs yet</p>
                    <p className="text-gray-400 text-sm mt-1">Click "Log Time" to add your first entry.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Logged by</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Hours</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(log.log_date)}</td>
                                        <td className="px-4 py-3 text-xs text-gray-800 font-medium">{log.user_name || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-bold text-gray-900">{parseFloat(log.hours_logged).toFixed(1)}h</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${log.is_billable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {log.is_billable ? 'Billable' : 'Non-Bill.'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.description || '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleDelete(log.id)} title="Delete"
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {/* Totals row */}
                            <tfoot>
                                <tr className="bg-gray-50 border-t-2 border-gray-200">
                                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{total.toFixed(1)}h</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{billablePct}% billable</td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}