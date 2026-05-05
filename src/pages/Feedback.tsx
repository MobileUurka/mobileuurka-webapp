/**
 * Feedback page — admin view of all submitted feedback from the public schema.
 *
 * Access restriction mirrors the Sidebar:
 *   - Email in VITE_ALLOWED_EMAILS env var, OR
 *   - Email ends with @mobileuurka.com
 *
 * Unauthorised users are redirected to "/" immediately.
 *
 * Features:
 *   - All feedback with status filter tabs (all / pending / reviewed / resolved)
 *   - Inline status update (pending → reviewed → resolved)
 *   - Delete entry
 *   - Performance metrics panel — shows timings recorded by usePerformanceTimer
 *     across the session (create patient, submit lab, etc.)
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authServices';
import { feedbackService, type FeedbackEntry } from '../services/feedbackService';
import { getAllMetrics, clearMetrics, type PerfMetric } from '../hooks/usePerformanceTimer';
import {
    FiTrash2, FiRefreshCw, FiClock, FiBarChart2,
    FiCheckCircle, FiAlertCircle, FiLoader, FiX
} from 'react-icons/fi';
import { MdOutlineFeedback } from 'react-icons/md';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function formatMs(ms: number) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

const STATUS_STYLES: Record<string, string> = {
    pending:  'bg-amber-50 text-amber-600 border-amber-200',
    reviewed: 'bg-blue-50 text-blue-600 border-blue-200',
    resolved: 'bg-green-50 text-green-600 border-green-200',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    pending:  <FiLoader size={11} />,
    reviewed: <FiAlertCircle size={11} />,
    resolved: <FiCheckCircle size={11} />,
};

const USER_TYPE_LABEL: Record<string, string> = {
    mobileuurka:        'MobileUurka',
    organization_admin: 'Org Admin',
    organization_user:  'Staff',
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {STATUS_ICON[status]}
            {status}
        </span>
    );
}

// ─── Performance panel ────────────────────────────────────────────────────────

function PerformancePanel({ onClose }: { onClose: () => void }) {
    const [metrics, setMetrics] = useState<PerfMetric[]>([]);

    useEffect(() => {
        setMetrics(getAllMetrics().reverse()); // newest first
    }, []);

    // Group by action for averages
    const grouped: Record<string, number[]> = {};
    metrics.forEach(m => {
        if (!grouped[m.action]) grouped[m.action] = [];
        grouped[m.action].push(m.durationMs);
    });

    const averages = Object.entries(grouped).map(([action, times]) => ({
        action,
        avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        count: times.length,
        min: Math.min(...times),
        max: Math.max(...times),
    })).sort((a, b) => b.avg - a.avg);

    const handleClear = () => {
        clearMetrics();
        setMetrics([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white w-full sm:w-[620px] max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2 font-semibold text-[15px]">
                        <FiBarChart2 className="text-[#984815]" />
                        Performance Metrics
                    </div>
                    <div className="flex items-center gap-2">
                        {metrics.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-1.5 transition"
                            >
                                Clear
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                            <FiX size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {metrics.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                            <FiClock size={36} className="opacity-30" />
                            <p className="text-sm">No metrics recorded yet this session.</p>
                            <p className="text-xs text-center max-w-xs">
                                Timings are captured automatically when you create a patient,
                                submit lab work, fill out pregnancy info, and other key actions.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Summary averages */}
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Averages by action</p>
                                <div className="space-y-2">
                                    {averages.map(a => (
                                        <div key={a.action} className="flex items-center gap-3 bg-[#f5f5f5] rounded-lg px-4 py-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{a.action}</p>
                                                <p className="text-xs text-gray-400">{a.count} recording{a.count !== 1 ? 's' : ''} · min {formatMs(a.min)} · max {formatMs(a.max)}</p>
                                            </div>
                                            <span className={`text-sm font-semibold shrink-0 ${a.avg > 5000 ? 'text-red-500' : a.avg > 2000 ? 'text-amber-500' : 'text-green-600'}`}>
                                                {formatMs(a.avg)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Raw log */}
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Raw log (newest first)</p>
                                <div className="space-y-1">
                                    {metrics.map((m, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs py-2 border-b border-gray-50">
                                            <span className="text-gray-400 shrink-0 w-[130px]">{new Date(m.recordedAt).toLocaleTimeString()}</span>
                                            <span className="flex-1 text-gray-700 truncate">{m.action}</span>
                                            <span className="text-gray-400 shrink-0 truncate max-w-[100px]">{m.page}</span>
                                            <span className={`font-medium shrink-0 w-14 text-right ${m.durationMs > 5000 ? 'text-red-500' : m.durationMs > 2000 ? 'text-amber-500' : 'text-green-600'}`}>
                                                {formatMs(m.durationMs)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function FeedbackDetail({
    entry,
    onClose,
    onStatusChange,
    onDelete,
}: {
    entry: FeedbackEntry;
    onClose: () => void;
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
}) {
    const [notes, setNotes] = useState(entry.adminNotes ?? '');
    const [saving, setSaving] = useState(false);

    const nextStatus = entry.status === 'pending' ? 'reviewed' : entry.status === 'reviewed' ? 'resolved' : null;

    const handleAdvance = async () => {
        if (!nextStatus) return;
        setSaving(true);
        try {
            await feedbackService.updateStatus(entry.id, nextStatus, notes || undefined);
            onStatusChange(entry.id, nextStatus);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-sm flex items-center gap-1">
                    ← Back
                </button>
                <button
                    onClick={() => { onDelete(entry.id); onClose(); }}
                    className="text-gray-400 hover:text-red-500 transition"
                >
                    <FiTrash2 size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Meta */}
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#984815]/10 flex items-center justify-center text-[#984815] shrink-0 text-sm font-semibold">
                        {(entry.userName ?? entry.userEmail).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{entry.userName ?? entry.userEmail}</span>
                            <span className="text-xs text-gray-400">{USER_TYPE_LABEL[entry.userType] ?? entry.userType}</span>
                            <StatusBadge status={entry.status} />
                            <span className="text-xs text-gray-400 ml-auto">{timeAgo(entry.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.userEmail}</p>
                    </div>
                </div>

                {/* Context */}
                <div className="bg-[#f5f5f5] rounded-lg px-4 py-3 text-xs space-y-1">
                    <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Page</span><span className="text-gray-700">{entry.page}</span></div>
                    {entry.pageUrl && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">URL</span><span className="text-gray-500 truncate">{entry.pageUrl}</span></div>}
                    {entry.patientName && <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Patient</span><span className="text-gray-700">{entry.patientName}</span></div>}
                </div>

                {/* Message */}
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Message</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.message}</p>
                </div>

                {/* Admin notes */}
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Admin notes</p>
                    <textarea
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#984815] resize-none"
                        rows={3}
                        placeholder="Add internal notes..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                {/* Actions */}
                {nextStatus && (
                    <button
                        onClick={handleAdvance}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-[#984815] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#7a3a10] transition disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : `Mark as ${nextStatus}`}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'reviewed' | 'resolved';

export default function Feedback() {
    const navigate = useNavigate();
    const [allowed, setAllowed] = useState<boolean | null>(null); // null = checking
    const [entries, setEntries] = useState<FeedbackEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [selected, setSelected] = useState<FeedbackEntry | null>(null);
    const [showPerf, setShowPerf] = useState(false);
    const [error, setError] = useState('');

    // ── Access check (same logic as Sidebar) ──────────────────────────────────
    useEffect(() => {
        const user = authService.getUser();
        if (!user?.email) { navigate('/'); return; }

        const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS ?? '')
            .split(',')
            .map((e: string) => e.trim().toLowerCase())
            .filter(Boolean);

        const email = user.email.toLowerCase();
        const ok = allowedEmails.includes(email) || email.endsWith('@mobileuurka.com');

        if (!ok) { navigate('/'); return; }
        setAllowed(true);
    }, [navigate]);

    // ── Fetch all feedback ────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await feedbackService.getAll();
            if (res.success) setEntries(res.data.feedback);
        } catch {
            setError('Failed to load feedback. Make sure you are signed in as a MobileUurka admin.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (allowed) load();
    }, [allowed, load]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleStatusChange = (id: string, status: string) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status: status as FeedbackEntry['status'] } : e));
        setSelected(prev => prev?.id === id ? { ...prev, status: status as FeedbackEntry['status'] } : prev);
    };

    const handleDelete = async (id: string) => {
        try {
            await feedbackService.deleteEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
        } catch { /* silent — entry stays in list */ }
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const filtered = entries.filter(e => filter === 'all' || e.status === filter);

    const counts = {
        all: entries.length,
        pending: entries.filter(e => e.status === 'pending').length,
        reviewed: entries.filter(e => e.status === 'reviewed').length,
        resolved: entries.filter(e => e.status === 'resolved').length,
    };

    const FILTERS: { key: StatusFilter; label: string }[] = [
        { key: 'all',      label: `All (${counts.all})` },
        { key: 'pending',  label: `Pending (${counts.pending})` },
        { key: 'reviewed', label: `Reviewed (${counts.reviewed})` },
        { key: 'resolved', label: `Resolved (${counts.resolved})` },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    if (allowed === null) return null; // still checking access

    return (
        <div className="w-full h-full flex flex-col pt-4 px-4 sm:pt-6 sm:px-6 bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
                    <MdOutlineFeedback className="text-[#984815]" />
                    Feedback
                    {counts.pending > 0 && (
                        <span className="bg-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                            {counts.pending} pending
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowPerf(true)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition"
                    >
                        <FiBarChart2 size={13} />
                        Performance
                    </button>
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                    >
                        <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-100 pb-0 shrink-0">
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => { setFilter(f.key); setSelected(null); }}
                        className={`px-3 py-2 text-xs font-medium rounded-t-lg transition border-b-2 -mb-px ${filter === f.key ? 'border-[#984815] text-[#984815]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 shrink-0">
                    {error}
                </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
                {/* List */}
                <div className={`flex flex-col overflow-y-auto transition-all ${selected ? 'hidden sm:flex sm:w-[500px] shrink-0' : 'w-full'}`}>
                    {loading && (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-16">
                            Loading feedback...
                        </div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-16 gap-3">
                            <MdOutlineFeedback size={40} className="opacity-30" />
                            <span className="text-sm">No feedback in this category</span>
                        </div>
                    )}
                    {!loading && filtered.map(entry => (
                        <div
                            key={entry.id}
                            onClick={() => setSelected(entry)}
                            className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition group ${selected?.id === entry.id ? 'bg-[#984815]/5' : ''}`}
                        >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-[#984815]/10 flex items-center justify-center text-[#984815] text-xs font-semibold shrink-0 mt-0.5">
                                {(entry.userName ?? entry.userEmail).charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-gray-800 truncate">
                                        {entry.userName ?? entry.userEmail}
                                    </span>
                                    <StatusBadge status={entry.status} />
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-0.5">{entry.message}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400">{entry.page}</span>
                                    <span className="text-[10px] text-gray-300">·</span>
                                    <span className="text-[10px] text-gray-400">{timeAgo(entry.createdAt)}</span>
                                </div>
                            </div>

                            <button
                                onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition shrink-0 mt-1"
                            >
                                <FiTrash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Detail pane */}
                {selected && (
                    <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-0">
                        <FeedbackDetail
                            entry={selected}
                            onClose={() => setSelected(null)}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                        />
                    </div>
                )}
            </div>

            {/* Performance modal */}
            {showPerf && <PerformancePanel onClose={() => setShowPerf(false)} />}
        </div>
    );
}
