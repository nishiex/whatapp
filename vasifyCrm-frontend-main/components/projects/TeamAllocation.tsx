
'use client';
import { authHeader, jsonAuthHeader, getToken } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { UserPlus, X, Mail, Phone, Users } from 'lucide-react';

// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-api.vasifytech.com/api';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-api.vasifytech.com/api';

const ROLE_OPTIONS = [
    'Project Manager','Frontend Developer','Backend Developer',
    'Full Stack Developer','UI/UX Designer','QA Engineer','DevOps Engineer','Sales','Other',
];

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-700','bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700','bg-orange-100 text-orange-700','bg-pink-100 text-pink-700',
];


function Avatar({ name }) {
    const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const colorIdx = initials.charCodeAt(0) % AVATAR_COLORS.length;
    return (
        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
            {initials}
        </div>
    );
}

function MemberCard({ member, onRemove }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 relative hover:shadow-sm transition-shadow">
            <button onClick={() => onRemove(member.user_id)}
                className="absolute top-4 right-4 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                <X size={15} />
            </button>
            <div className="flex items-center gap-3 mb-4">
                <Avatar name={member.name} />
                <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">{member.name || 'Unknown'}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{member.role || 'No role'}</p>
                </div>
            </div>
            <div className="space-y-1.5 mb-4">
                {member.email && <div className="flex items-center gap-2 text-xs text-gray-500"><Mail size={12} className="text-gray-400 shrink-0" /><span className="truncate">{member.email}</span></div>}
                {member.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone size={12} className="text-gray-400 shrink-0" /><span>{member.phone}</span></div>}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Hours / week</span>
                    <span className="text-xs font-semibold text-gray-800">{member.hours_per_week || 40}h</span>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Workload</span>
                        <span className="text-xs font-semibold text-gray-800">{member.workload_capacity || 100}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(member.workload_capacity||100) >= 90 ? 'bg-red-400' : (member.workload_capacity||100) >= 70 ? 'bg-orange-400' : 'bg-green-400'}`}
                            style={{ width: `${Math.min(member.workload_capacity||100, 100)}%` }} />
                    </div>
                </div>
            </div>
            {member.skills_assigned && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                        {member.skills_assigned.split(',').map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100">{s.trim()}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function AddMemberModal({ availableUsers, onAdd, onClose }) {
    const [form, setForm] = useState({ user_id: '', role: '', skills_assigned: '', workload_capacity: 100, hours_per_week: 40 });
    const [saving, setSaving] = useState(false);
    const handle = e => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: name === 'workload_capacity' || name === 'hours_per_week' ? Number(value) : value }));
    };
    const submit = async (e) => { e.preventDefault(); setSaving(true); await onAdd(form); setSaving(false); };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">Add Team Member</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
                </div>
                <form onSubmit={submit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">User <span className="text-red-500">*</span></label>
                        <select name="user_id" value={form.user_id} onChange={handle} required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select user</option>
                            {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                        <select name="role" value={form.role} onChange={handle} required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="">Select role</option>
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Skills <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                        <input type="text" name="skills_assigned" value={form.skills_assigned} onChange={handle}
                            placeholder="React, Node.js, Figma..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Hours / week</label>
                            <input type="number" name="hours_per_week" value={form.hours_per_week} onChange={handle} min="1" max="168"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Workload — <span className="text-blue-600 font-semibold">{form.workload_capacity}%</span></label>
                            <input type="range" name="workload_capacity" min="10" max="100" step="10"
                                value={form.workload_capacity} onChange={handle} className="w-full accent-blue-600 mt-2" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {saving ? 'Adding...' : 'Add Member'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TeamAllocation({ project, onUpdate }) {
    const [team,           setTeam]           = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [showAddForm,    setShowAddForm]    = useState(false);

    useEffect(() => { setTeam(project.team || []); fetchAvailableUsers(); }, [project]);

    const fetchAvailableUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`, { headers: authHeader() });
            if (res.ok) { const d = await res.json(); setAvailableUsers(Array.isArray(d) ? d : d.users || []); }
        } catch (e) { console.error(e); }
    };

    const handleAddMember = async (formData) => {
        try {
            const res = await fetch(`${API_BASE}/projects/${project.id}/team`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() }, body: JSON.stringify(formData),
            });
            if (res.ok) { setShowAddForm(false); onUpdate(); }
            else console.error('Failed:', await res.text());
        } catch (e) { console.error(e); }
    };

    const handleRemoveMember = async (userId) => {
        if (!confirm('Remove this team member from the project?')) return;
        try {
            const res = await fetch(`${API_BASE}/projects/${project.id}/team/${userId}`, { method: 'DELETE', headers: authHeader() });
            if (res.ok) onUpdate();
        } catch (e) { console.error(e); }
    };

    const avgWorkload = team.length ? Math.round(team.reduce((s, m) => s + (m.workload_capacity||100), 0) / team.length) : 0;
    const totalHours  = team.reduce((s, m) => s + (m.hours_per_week||40), 0);

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Team Allocation</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{team.length} member{team.length !== 1 ? 's' : ''} assigned</p>
                </div>
                <button onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shrink-0">
                    <UserPlus size={15} /> Add Member
                </button>
            </div>

            {team.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl px-4 py-3 text-center"><p className="text-2xl font-bold text-blue-700">{team.length}</p><p className="text-xs text-gray-500 mt-0.5">Members</p></div>
                    <div className="bg-green-50 rounded-xl px-4 py-3 text-center"><p className="text-2xl font-bold text-green-700">{totalHours}h</p><p className="text-xs text-gray-500 mt-0.5">Total hrs / week</p></div>
                    <div className={`${avgWorkload >= 90 ? 'bg-red-50' : 'bg-orange-50'} rounded-xl px-4 py-3 text-center`}>
                        <p className={`text-2xl font-bold ${avgWorkload >= 90 ? 'text-red-700' : 'text-orange-700'}`}>{avgWorkload}%</p>
                        <p className="text-xs text-gray-500 mt-0.5">Avg workload</p>
                    </div>
                </div>
            )}

            {team.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
                    <Users size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium text-base">No team members yet</p>
                    <p className="text-gray-400 text-sm mt-1 mb-5">Add team members to track who is working on this project.</p>
                    <button onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                        <UserPlus size={15} /> Add First Member
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {team.map(member => <MemberCard key={member.user_id} member={member} onRemove={handleRemoveMember} />)}
                </div>
            )}

            {showAddForm && <AddMemberModal availableUsers={availableUsers} onAdd={handleAddMember} onClose={() => setShowAddForm(false)} />}
        </div>
    );
}