'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    MessageCircle, Send, Trash2, Pin, PinOff,
    ChevronDown, Filter, Loader2
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://crm-api.vasifytech.com/api';
// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const NOTE_TYPES = [
    {
        value: 'General',
        label: 'General Note',
        color: 'bg-gray-100 text-gray-700',
        dot: 'bg-gray-400',
        desc: 'Internal note visible to the team',
    },
    {
        value: 'Meeting',
        label: 'Meeting Notes',
        color: 'bg-blue-100 text-blue-700',
        dot: 'bg-blue-500',
        desc: 'Notes from a client or team meeting',
    },
    {
        value: 'Comment',
        label: 'Comment',
        color: 'bg-green-100 text-green-700',
        dot: 'bg-green-500',
        desc: 'Quick comment or update for the team',
    },
    {
        value: 'Client Update',
        label: 'Client Update',
        color: 'bg-purple-100 text-purple-700',
        dot: 'bg-purple-500',
        desc: 'Update shared with or received from the client',
    },
    {
        value: 'Blocker',
        label: 'Blocker',
        color: 'bg-red-100 text-red-700',
        dot: 'bg-red-500',
        desc: 'Issue or blocker that needs attention',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const authHeader = () => ({
    Authorization:
        typeof window !== 'undefined' ? `Bearer ${localStorage.getItem('token')}` : '',
});

const getNoteTypeMeta = (type) =>
    NOTE_TYPES.find((n) => n.value === type) || NOTE_TYPES[0];

const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${date} at ${time}`;
};

const getInitials = (name) => {
    if (!name) return '?';
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Avatar bg colours cycling by index
const AVATAR_COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
];
const avatarColor = (name = '') => {
    const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx];
};

// ── Note Type Selector ────────────────────────────────────────────────────────

function NoteTypeSelector({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const current = getNoteTypeMeta(value);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
            >
                <span className={`w-2 h-2 rounded-full ${current.dot}`} />
                <span className="font-medium text-gray-700">{current.label}</span>
                <ChevronDown size={14} className="text-gray-400" />
            </button>

            {open && (
                <div className="absolute left-0 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[220px]">
                    {NOTE_TYPES.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => { onChange(type.value); setOpen(false); }}
                            className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${value === type.value ? 'bg-blue-50' : ''
                                }`}
                        >
                            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${type.dot}`} />
                            <div>
                                <p className={`text-sm font-medium ${value === type.value ? 'text-blue-600' : 'text-gray-800'}`}>
                                    {type.label}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">{type.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Single Note Card ──────────────────────────────────────────────────────────

function NoteCard({ note, currentUserId, onDelete, onPin }) {
    const meta = getNoteTypeMeta(note.note_type);
    const initials = getInitials(note.created_by_name);
    const bgColor = avatarColor(note.created_by_name);
    const canDelete = currentUserId && String(note.created_by) === String(currentUserId);

    return (
        <div className={`bg-white rounded-xl border transition-all hover:shadow-sm ${note.pinned ? 'border-yellow-300 ring-1 ring-yellow-200' : 'border-gray-200'
            }`}>
            <div className="p-5">

                {/* ── Top row ── */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 ${bgColor} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {initials}
                        </div>
                        {/* Author + time */}
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {note.created_by_name || 'Team Member'}
                            </p>
                            <p className="text-xs text-gray-400">
                                {formatDateTime(note.created_at)}
                            </p>
                        </div>
                    </div>

                    {/* Right side: badges + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {note.pinned && (
                            <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
                                <Pin size={11} /> Pinned
                            </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                            {meta.label}
                        </span>

                        {/* Pin toggle */}
                        <button
                            onClick={() => onPin(note.id, !note.pinned)}
                            className={`p-1.5 rounded-lg transition-colors ${note.pinned
                                    ? 'text-yellow-500 hover:bg-yellow-50'
                                    : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50'
                                }`}
                            title={note.pinned ? 'Unpin note' : 'Pin note'}
                        >
                            {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                        </button>

                        {/* Delete — only for own notes */}
                        {canDelete && (
                            <button
                                onClick={() => onDelete(note.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete note"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Note content ── */}
                <div className={`rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed ${note.note_type === 'Blocker'
                        ? 'bg-red-50 border border-red-100'
                        : note.note_type === 'Client Update'
                            ? 'bg-purple-50 border border-purple-100'
                            : note.note_type === 'Meeting'
                                ? 'bg-blue-50 border border-blue-100'
                                : 'bg-gray-50'
                    }`}>
                    {note.content}
                </div>

            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function NotesDiscussion({ projectId }) {
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState('General');
    const [filterType, setFilterType] = useState('All');
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        if (!projectId) return;
        fetchNotes();
        fetchCurrentUser();
    }, [projectId]);

    // ── API calls ──

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeader() });
            if (res.ok) {
                const data = await res.json();
                setCurrentUserId(data.id || data.user?.id || null);
            }
        } catch { /* silent — delete button just won't show */ }
    };

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/notes`, {
                headers: authHeader(),
            });
            if (res.ok) {
                const data = await res.json();
                setNotes(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching notes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        setPosting(true);

        const payload = {
            note_type: noteType || 'General',
            content: newNote.trim(),
            mentioned_users: [],
        };

        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setNewNote('');
                setNoteType('General');
                fetchNotes();
            } else {
                const err = await res.json().catch(() => null);
                console.error('Failed to add note:', err || res.statusText);
                alert('Failed to post note. Please try again.');
            }
        } catch (err) {
            console.error('Error adding note:', err);
            alert('Error posting note. Please check your connection.');
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (noteId) => {
        if (!confirm('Delete this note? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/notes/${noteId}`, {
                method: 'DELETE',
                headers: authHeader(),
            });
            if (res.ok) {
                setNotes((prev) => prev.filter((n) => n.id !== noteId));
            }
        } catch (err) {
            console.error('Error deleting note:', err);
        }
    };

    const handlePin = async (noteId, pinned) => {
        // Optimistic update
        setNotes((prev) =>
            prev.map((n) => (n.id === noteId ? { ...n, pinned } : n))
        );
        try {
            await fetch(`${API_BASE}/projects/${projectId}/notes/${noteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeader() },
                body: JSON.stringify({ pinned }),
            });
        } catch (err) {
            console.error('Error pinning note:', err);
            fetchNotes(); // revert on error
        }
    };

    // ── Derived: sorted + filtered ──

    const displayed = useMemo(() => {
        let list = [...notes];

        // Filter by type
        if (filterType !== 'All') {
            list = list.filter((n) => n.note_type === filterType);
        }

        // Pinned notes always float to top
        list.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.created_at) - new Date(a.created_at); // newest first
        });

        return list;
    }, [notes, filterType]);

    const typeCounts = useMemo(() => {
        const counts = { All: notes.length };
        NOTE_TYPES.forEach((t) => {
            counts[t.value] = notes.filter((n) => n.note_type === t.value).length;
        });
        return counts;
    }, [notes]);

    // ── Render ──

    return (
        <div className="space-y-6">

            {/* ── Section header ── */}
            <div className="flex items-center gap-2">
                <MessageCircle size={22} className="text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Notes & Discussion</h3>
                <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    {notes.length}
                </span>
            </div>

            {/* ── Compose box ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <form onSubmit={handleSubmit} className="space-y-3">

                    {/* Type selector */}
                    <div className="flex items-center gap-2">
                        <NoteTypeSelector value={noteType} onChange={setNoteType} />
                        <span className="text-xs text-gray-400">
                            {getNoteTypeMeta(noteType).desc}
                        </span>
                    </div>

                    {/* Text area */}
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder={
                            noteType === 'Blocker'
                                ? 'Describe the blocker or issue...'
                                : noteType === 'Client Update'
                                    ? 'What did the client say or need to know?'
                                    : noteType === 'Meeting'
                                        ? 'Summarise what was discussed...'
                                        : 'Write a note or update for the team...'
                        }
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />

                    {/* Submit */}
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-400">
                            Visible to all team members on this project
                        </p>
                        <button
                            type="submit"
                            disabled={posting || !newNote.trim()}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            {posting
                                ? <><Loader2 size={15} className="animate-spin" /> Posting...</>
                                : <><Send size={15} /> Post Note</>
                            }
                        </button>
                    </div>

                </form>
            </div>

            {/* ── Filter bar ── */}
            {notes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter size={14} className="text-gray-400 shrink-0" />
                    {['All', ...NOTE_TYPES.map((t) => t.value)].map((type) => {
                        const count = typeCounts[type] ?? 0;
                        if (type !== 'All' && count === 0) return null;
                        const meta = type === 'All' ? null : getNoteTypeMeta(type);
                        return (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterType === type
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {meta && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${filterType === type ? 'bg-white' : meta.dot
                                        }`} />
                                )}
                                {type === 'All' ? 'All Notes' : meta.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterType === type
                                        ? 'bg-white bg-opacity-25 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Notes list ── */}
            {loading ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Loader2 size={32} className="mx-auto text-blue-400 animate-spin mb-3" />
                    <p className="text-gray-500 text-sm">Loading notes...</p>
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-300">
                    <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">
                        {filterType === 'All' ? 'No notes yet' : `No ${filterType} notes`}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                        {filterType === 'All'
                            ? 'Post the first note above to start the discussion.'
                            : 'Try a different filter above.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayed.map((note) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            currentUserId={currentUserId}
                            onDelete={handleDelete}
                            onPin={handlePin}
                        />
                    ))}
                </div>
            )}

        </div>
    );
}