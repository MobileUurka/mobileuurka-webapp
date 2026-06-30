/**
 * Feedback page — two modes:
 *
 * ADMIN MODE (VITE_ALLOWED_EMAILS or @mobileuurka.com):
 *   - Sees ALL feedback, can update status, add internal notes, reply, assign staff, delete.
 *
 * USER MODE (everyone else):
 *   - Sees only their own submissions.
 *   - Read-only: shows status badge + admin reply if one exists.
 *   - No internal notes, no delete, no task assignment.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { feedbackService, type FeedbackEntry, type FeedbackReply } from '../services/feedbackService';
import { diagnosisVerificationService, type VerificationEntry } from '../services/diagnosisVerificationService';
import { getAllMetrics, clearMetrics, type PerfMetric } from '../hooks/usePerformanceTimer';
import {
    FiTrash2, FiRefreshCw, FiClock, FiBarChart2,
    FiCheckCircle, FiAlertCircle, FiLoader, FiX, FiUserCheck, FiMessageSquare, FiCheck
} from 'react-icons/fi';
import { MdOutlineFeedback } from 'react-icons/md';
import MentionTextarea, { type AssignedMember } from '../components/MentionTextarea';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { markFeedbackRead } from '../store/feedbackSlice';

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
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    reviewed: 'bg-blue-50 text-blue-600 border-blue-200',
    resolved: 'bg-green-50 text-green-600 border-green-200',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
    pending: <FiLoader size={11} />,
    reviewed: <FiAlertCircle size={11} />,
    resolved: <FiCheckCircle size={11} />,
};

const USER_TYPE_LABEL: Record<string, string> = {
    mobileuurka: 'MobileUurka',
    organization_admin: 'Org Admin',
    organization_user: 'Staff',
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

function UnreadReplyBadge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-[#f05b56] text-white px-1.5 py-0.5 rounded-full">
            <FiMessageSquare size={9} />
            {count > 99 ? '99+' : count}
        </span>
    );
}

function isCommentFeedback(entry: FeedbackEntry) {
    const page = entry.page?.toLowerCase?.() ?? '';
    return page === 'symptom report' || page.includes('symptom report') || page.includes('sbr');
}

function useMarkFeedbackReadOnOpen() {
    const dispatch = useAppDispatch();
    return useCallback((feedbackId: string) => {
        dispatch(markFeedbackRead(feedbackId));
        feedbackService.markRead(feedbackId).catch(() => { });
    }, [dispatch]);
}

// ─── Performance panel ────────────────────────────────────────────────────────

function PerformancePanel({ onClose }: { onClose: () => void }) {
    const [metrics, setMetrics] = useState<PerfMetric[]>(() => getAllMetrics().reverse());

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

// ─── Reply thread (shared between admin and user views) ──────────────────────

function ReplyThread({
    entry,
    currentUserId,
    onRepliesUpdate,
}: {
    entry: FeedbackEntry;
    currentUserId: string;
    onRepliesUpdate: (replies: FeedbackReply[]) => void;
}) {
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const replies: FeedbackReply[] = Array.isArray(entry.replies) ? entry.replies : [];

    // Scroll to bottom when replies change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies.length]);

    const handleSend = async () => {
        if (!draft.trim()) return;
        setSending(true);
        setError('');
        try {
            const res = await feedbackService.addReply(entry.id, draft.trim());
            if (res.success) {
                onRepliesUpdate(res.data.feedback.replies ?? []);
                setDraft('');
            }
        } catch {
            setError('Failed to send reply. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <FiMessageSquare size={11} />
                Conversation
            </p>

            {/* Thread */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {replies.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">No replies yet — start the conversation below.</p>
                )}
                {replies.map(r => {
                    const isMe = r.senderId === currentUserId;
                    return (
                        <div key={r.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${isMe ? 'bg-[#984815] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {r.senderName.charAt(0).toUpperCase()}
                            </div>
                            <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${isMe ? 'bg-[#984815] text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                                    {r.message}
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    {isMe ? 'You' : r.senderName} · {timeAgo(r.createdAt)}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 items-end border border-gray-200 rounded-xl p-2 focus-within:border-[#984815] transition">
                <textarea
                    className="flex-1 text-sm outline-none resize-none bg-transparent placeholder:text-gray-400 min-h-[36px] max-h-24"
                    rows={1}
                    placeholder="Write a reply… (Ctrl+Enter to send)"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                />
                <button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="shrink-0 bg-[#984815] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-[#7a3a10] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sending ? '…' : 'Send'}
                </button>
            </div>
        </div>
    );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

type DetailTab = 'conversation' | 'notes' | 'assigned';

function FeedbackDetail({
    entry,
    onClose,
    onStatusChange,
    onDelete,
}: {
    entry: FeedbackEntry;
    onClose: () => void;
    onStatusChange: (id: string, status: string, updatedEntry: Partial<FeedbackEntry>) => void;
    onDelete: (id: string) => void;
}) {
    const { user } = useAuth();
    const currentUserId = user?.id ?? '';

    const [activeTab, setActiveTab] = useState<DetailTab>('conversation');
    const [notes, setNotes] = useState(entry.adminNotes ?? '');
    const [assignedTo, setAssignedTo] = useState<AssignedMember[]>(
        Array.isArray(entry.assignedTo) ? entry.assignedTo : []
    );
    const [saving, setSaving] = useState(false);

    // Reset local state when a different entry is opened
    useEffect(() => {
        setNotes(entry.adminNotes ?? '');
        setAssignedTo(Array.isArray(entry.assignedTo) ? entry.assignedTo : []);
        setActiveTab('conversation');
    }, [entry.id]);

    const nextStatus = entry.status === 'pending' ? 'reviewed' : entry.status === 'reviewed' ? 'resolved' : null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await feedbackService.updateStatus(entry.id, entry.status, notes || undefined, assignedTo);
            onStatusChange(entry.id, entry.status, { adminNotes: notes, assignedTo });
        } finally {
            setSaving(false);
        }
    };

    const handleAdvance = async () => {
        if (!nextStatus) return;
        setSaving(true);
        try {
            await feedbackService.updateStatus(entry.id, nextStatus, notes || undefined, assignedTo);
            onStatusChange(entry.id, nextStatus, { adminNotes: notes, assignedTo });
        } finally {
            setSaving(false);
        }
    };

    const TABS: { key: DetailTab; label: string; badge?: number }[] = [
        {
            key: 'conversation',
            label: 'Conversation',
            badge: (Array.isArray(entry.replies) ? entry.replies.length : 0) || undefined,
        },
        { key: 'notes', label: 'Internal notes' },
        {
            key: 'assigned',
            label: 'Assigned',
            badge: assignedTo.length || undefined,
        },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Header — meta + status actions */}
            <div className="px-5 pt-4 pb-0 border-b border-gray-100 shrink-0">
                <div className="flex items-start justify-between gap-2 mb-3">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-xs flex items-center gap-1 shrink-0 mt-0.5">
                        ← Back
                    </button>
                    <button
                        onClick={() => { onDelete(entry.id); onClose(); }}
                        className="text-gray-300 hover:text-red-400 transition shrink-0"
                    >
                        <FiTrash2 size={14} />
                    </button>
                </div>

                {/* Submitter row */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#984815]/10 flex items-center justify-center text-[#984815] shrink-0 text-xs font-bold">
                        {(entry.userName ?? entry.userEmail).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{entry.userName ?? entry.userEmail}</span>
                            <span className="text-[10px] text-gray-400">{USER_TYPE_LABEL[entry.userType] ?? entry.userType}</span>
                            <StatusBadge status={entry.status} />
                            <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(entry.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{entry.userEmail}</p>
                    </div>
                </div>

                {/* Original message */}
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Feedback</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3">{entry.message}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span className="text-[10px] text-gray-400 font-medium">{entry.page}</span>
                        {entry.pageUrl && (
                            <><span className="text-[10px] text-gray-300">·</span>
                                <span className="text-[10px] text-gray-400 truncate max-w-[180px]">{entry.pageUrl}</span></>
                        )}
                        {entry.patientName && (
                            <><span className="text-[10px] text-gray-300">·</span>
                                <span className="text-[10px] text-gray-400">Patient: {entry.patientName}</span></>
                        )}
                    </div>
                </div>

                {/* Status actions */}
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-1.5 text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    {nextStatus && (
                        <button
                            onClick={handleAdvance}
                            disabled={saving}
                            className="flex-1 bg-[#984815] text-white rounded-lg py-1.5 text-xs font-medium hover:bg-[#7a3a10] transition disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : `→ ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`}
                        </button>
                    )}
                </div>

                {/* Tab strip */}
                <div className="flex gap-0">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition -mb-px ${activeTab === t.key
                                ? 'border-[#984815] text-[#984815]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {t.label}
                            {t.badge !== undefined && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-[#984815] text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {t.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                {activeTab === 'conversation' && (
                    <ReplyThread
                        entry={entry}
                        currentUserId={currentUserId}
                        onRepliesUpdate={(replies) => onStatusChange(entry.id, entry.status, { replies })}
                    />
                )}

                {activeTab === 'notes' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400">Internal only — not visible to the submitter</p>
                            <span className="text-[10px] text-gray-400">type @ to assign staff</span>
                        </div>
                        <MentionTextarea
                            value={notes}
                            onChange={setNotes}
                            assignedTo={assignedTo}
                            onAssignedChange={setAssignedTo}
                            placeholder="Add internal notes… type @ to assign a task"
                            rows={6}
                        />
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full border border-gray-200 text-gray-600 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save notes'}
                        </button>
                    </div>
                )}

                {activeTab === 'assigned' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400">
                            Use @mentions in Internal notes to assign staff. They'll appear here.
                        </p>
                        {assignedTo.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                                <FiUserCheck size={28} className="opacity-30" />
                                <p className="text-sm">No one assigned yet</p>
                                <p className="text-xs text-center max-w-[200px]">Switch to Internal notes and @mention a staff member</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assignedTo.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 bg-[#984815]/5 border border-[#984815]/15 rounded-lg px-4 py-3">
                                        <div className="w-8 h-8 rounded-full bg-[#984815] text-white text-xs flex items-center justify-center font-bold shrink-0">
                                            {m.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800">{m.name}</p>
                                            <p className="text-[11px] text-gray-400 truncate">{m.email}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const updated = assignedTo.filter(a => a.id !== m.id);
                                                setAssignedTo(updated);
                                            }}
                                            className="text-gray-300 hover:text-red-400 transition shrink-0"
                                        >
                                            <FiX size={13} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full border border-gray-200 text-gray-600 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 transition disabled:opacity-50"
                                >
                                    {saving ? 'Saving…' : 'Save assignments'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'reviewed' | 'resolved';

/** Returns true if the user is an admin (explicitly listed in VITE_ALLOWED_EMAILS or @mobileuurka.com). */
function isAdminUser(email: string): boolean {
    const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS ?? '')
        .split(',')
        .map((e: string) => e.trim().toLowerCase())
        .filter(Boolean);
    const e = email.toLowerCase();
    // Only grant admin access to explicitly listed emails.
    // @mobileuurka.com domain alone is not sufficient — the account must also
    // exist as a mobileuurka_users record on the backend to call the admin API.
    // Add specific mobileuurka.com addresses to VITE_ALLOWED_EMAILS to grant access.
    return allowedEmails.includes(e);
}

// ─── Verification detail view ───────────────────────────────────────────────────

function VerificationDetail({
    entry,
    onClose,
}: {
    entry: VerificationEntry;
    onClose: () => void;
}) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-sm flex items-center gap-1">
                    ← Back
                </button>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${entry.isAccurate ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    <FiCheck size={11} />
                    {entry.isAccurate ? 'Accurate' : 'Not Accurate'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Meta */}
                <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                    <span>{entry.sourceType === 'predisposition' ? 'Predisposition' : 'Symptom Report'}</span>
                    <span>·</span>
                    <span>Patient: {entry.patientName || entry.patientId}</span>
                    <span className="ml-auto">{timeAgo(entry.createdAt)}</span>
                </div>

                {/* Diagnosis */}
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">AI Diagnosis</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-[#f5f5f5] rounded-lg px-4 py-3">{entry.diagnosisText}</p>
                </div>

                {/* Risk Level */}
                {entry.riskLevel && (
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Risk Level</p>
                        <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg inline-block">
                            {entry.riskLevel}
                        </span>
                    </div>
                )}

                {/* Notes */}
                {entry.obgynNotes && (
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">OB/GYN Notes</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                            {entry.obgynNotes}
                        </p>
                    </div>
                )}

                {/* Verifier info */}
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-[#984815]/10 flex items-center justify-center text-[#984815] shrink-0 text-xs font-bold">
                        {(entry.verifiedByName ?? entry.verifiedBy).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">Verified by</p>
                        <p className="text-sm font-medium text-gray-800">{entry.verifiedByName || entry.verifiedBy}</p>
                        {entry.verifiedByRole && (
                            <p className="text-[11px] text-gray-500">{entry.verifiedByRole}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── User (non-admin) view ───────────────────────────────────────────────────

function UserFeedbackDetail({
    entry,
    onClose,
    onStatusChange,
    onRepliesUpdate,
}: {
    entry: FeedbackEntry;
    onClose: () => void;
    onStatusChange?: (id: string, newStatus: string) => void;
    onRepliesUpdate?: (id: string, replies: FeedbackReply[]) => void;
}) {
    const { user } = useAuth();
    const currentUserId = user?.id ?? '';
    const isAssignedToMe = Array.isArray(entry.assignedTo) &&
        entry.assignedTo.some(a => a.id === currentUserId) &&
        entry.userId !== currentUserId;

    const [saving, setSaving] = useState(false);

    const nextStatus = entry.status === 'pending'
        ? 'reviewed'
        : entry.status === 'reviewed'
            ? 'resolved'
            : null;

    const handleAdvance = async () => {
        if (!nextStatus) return;
        setSaving(true);
        try {
            await feedbackService.updateStatus(entry.id, nextStatus);
            onStatusChange?.(entry.id, nextStatus);
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
                <StatusBadge status={entry.status} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* "Assigned to you" banner */}
                {isAssignedToMe && (
                    <div className="flex items-center gap-2 bg-[#984815]/8 border border-[#984815]/20 rounded-lg px-4 py-2.5">
                        <FiUserCheck size={13} className="text-[#984815] shrink-0" />
                        <p className="text-xs text-[#984815] font-medium">
                            This feedback was assigned to you by {entry.userName ?? entry.userEmail}
                        </p>
                    </div>
                )}

                {/* Meta */}
                <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                    <span>{entry.page}</span>
                    {entry.pageUrl && <><span>·</span><span className="truncate max-w-[200px]">{entry.pageUrl}</span></>}
                    {isAssignedToMe && (
                        <><span>·</span><span className="font-medium text-gray-500">from {entry.userName ?? entry.userEmail}</span></>
                    )}
                    <span className="ml-auto">{timeAgo(entry.createdAt)}</span>
                </div>

                {/* Original message */}
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                        {isAssignedToMe ? 'Feedback message' : 'Your message'}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-[#f5f5f5] rounded-lg px-4 py-3">{entry.message}</p>
                </div>

                {/* Internal notes visible to assigned staff */}
                {isAssignedToMe && entry.adminNotes && (
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Internal notes</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                            {entry.adminNotes}
                        </p>
                    </div>
                )}

                {/* Conversation thread — submitter and assigned can both reply */}
                <ReplyThread
                    entry={entry}
                    currentUserId={currentUserId}
                    onRepliesUpdate={(replies) => onRepliesUpdate?.(entry.id, replies)}
                />

                {/* Status action — only for assigned users on non-resolved items */}
                {isAssignedToMe && nextStatus && (
                    <button
                        onClick={handleAdvance}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 bg-[#984815] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#7a3a10] transition disabled:opacity-60"
                    >
                        {saving ? 'Saving…' : `Mark as ${nextStatus}`}
                    </button>
                )}
            </div>
        </div>
    );
}

function UserFeedbackView() {
    const [entries, setEntries] = useState<FeedbackEntry[]>([]);
    const [verifications, setVerifications] = useState<VerificationEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<FeedbackEntry | VerificationEntry | null>(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'assigned' | 'ai-feedback'>('all');

    const { user } = useAuth();
    const currentUserId = user?.id ?? '';
    const unreadByFeedbackId = useAppSelector(s => s.feedback.byFeedbackId);
    const markReadOnOpen = useMarkFeedbackReadOnOpen();

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [feedbackRes, verificationRes] = await Promise.all([
                feedbackService.getMine(),
                diagnosisVerificationService.getAll().catch(() => ({ success: false, data: { verifications: [], total: 0 } }))
            ]);
            if (feedbackRes.success) setEntries(feedbackRes.data.feedback);
            if (verificationRes.success) setVerifications(verificationRes.data.verifications);
        } catch {
            setError('Failed to load your feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const onFeedbackDataUpdated = () => load();
        window.addEventListener('feedback-data-updated', onFeedbackDataUpdated);
        return () => window.removeEventListener('feedback-data-updated', onFeedbackDataUpdated);
    }, [load]);

    const handleStatusChange = (id: string, status: string, updatedEntry?: Partial<FeedbackEntry>) => {
        setEntries(prev => prev.map(e =>
            e.id === id ? { ...e, status: status as FeedbackEntry['status'], ...updatedEntry } : e
        ));
        setSelected(prev =>
            prev && prev.id === id && !('isAccurate' in prev)
                ? { ...prev, status: status as FeedbackEntry['status'], ...updatedEntry }
                : prev
        );
    };

    const handleRepliesUpdate = (id: string, replies: FeedbackReply[]) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, replies } : e));
        setSelected(prev => prev?.id === id ? { ...prev, replies } : prev);
    };

    const assignedToMe = entries.filter(e =>
        Array.isArray(e.assignedTo) && e.assignedTo.some(a => a.id === currentUserId)
    );
    const commentEntries = entries.filter(isCommentFeedback);
    const nonCommentEntries = entries.filter(e => !isCommentFeedback(e));
    const myVerifications = verifications.filter(v => v.verifiedBy === currentUserId);

    const visibleEntries =
        activeTab === 'all' ? nonCommentEntries
            : activeTab === 'comments' ? commentEntries
                : activeTab === 'assigned' ? assignedToMe
                    : myVerifications;

    return (
        <div className="w-full h-full flex flex-col pt-4 px-4 sm:pt-6 sm:px-6 bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-1 shrink-0">
                <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
                    <MdOutlineFeedback className="text-[#984815]" />
                    My Feedback
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition disabled:opacity-50"
                >
                    <FiRefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-2 border-b border-gray-100 shrink-0">
                {([
                    { key: 'all', label: `All feedback (${nonCommentEntries.length})` },
                    { key: 'comments', label: `Comments (${commentEntries.length})` },
                    { key: 'assigned', label: `Assigned to me (${assignedToMe.length})` },
                    { key: 'ai-feedback', label: `AI Feedback (${myVerifications.length})` },
                ] as const).map(t => (
                    <button
                        key={t.key}
                        onClick={() => { setActiveTab(t.key); setSelected(null); }}
                        className={`px-3 py-2 text-xs font-medium rounded-t-lg transition border-b-2 -mb-px ${activeTab === t.key
                            ? 'border-[#984815] text-[#984815]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.label}
                        {t.key === 'assigned' && assignedToMe.length > 0 && (
                            <span className="ml-1.5 bg-[#984815] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                {assignedToMe.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 shrink-0">
                    {error}
                </div>
            )}

            <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
                {/* List */}
                <div className={`flex flex-col overflow-y-auto transition-all ${selected ? 'hidden sm:flex sm:w-[380px] shrink-0' : 'w-full'}`}>
                    {loading && (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-16">
                            Loading...
                        </div>
                    )}
                    {!loading && visibleEntries.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-16 gap-3">
                            <MdOutlineFeedback size={40} className="opacity-30" />
                            <p className="text-sm">
                                {activeTab === 'assigned'
                                    ? 'No feedback has been assigned to you yet.'
                                    : activeTab === 'comments'
                                        ? 'No comment feedback found.'
                                        : activeTab === 'ai-feedback'
                                            ? 'No AI diagnosis verifications yet.'
                                            : "No feedback available yet."}
                            </p>
                        </div>
                    )}
                    {!loading && visibleEntries.map(entry => {
                        const isVerification = 'isAccurate' in entry;
                        return (
                            <div
                                key={entry.id}
                                onClick={() => {
                                    setSelected(entry);
                                    if (!isVerification) markReadOnOpen(entry.id);
                                }}
                                className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition ${selected?.id === entry.id ? 'bg-[#984815]/5' : ''}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {isVerification ? (
                                            <>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${entry.isAccurate ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                                    <FiCheck size={9} />
                                                    {entry.isAccurate ? 'Accurate' : 'Not Accurate'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{entry.sourceType === 'predisposition' ? 'Predisposition' : 'Symptom Report'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <StatusBadge status={entry.status} />
                                                {activeTab === 'assigned' && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#984815] font-medium">
                                                        <FiUserCheck size={9} /> from {entry.userName ?? entry.userEmail}
                                                    </span>
                                                )}
                                                <UnreadReplyBadge count={unreadByFeedbackId[entry.id] ?? 0} />
                                            </>
                                        )}
                                        <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(entry.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 truncate mt-1">
                                        {isVerification ? entry.diagnosisText : entry.message}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {isVerification ? (
                                            <>
                                                <span className="text-[10px] text-gray-400">Patient: {entry.patientName || entry.patientId}</span>
                                                {entry.riskLevel && (
                                                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {entry.riskLevel}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[10px] text-gray-400">{entry.page}</span>
                                                {isCommentFeedback(entry) && (
                                                    <span className="text-[10px] font-semibold text-[#984815] bg-[#f8ebe1] px-2 py-0.5 rounded-full">
                                                        Comment
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detail pane */}
                {selected && (
                    <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-0">
                        {'isAccurate' in selected ? (
                            <VerificationDetail
                                entry={selected}
                                onClose={() => setSelected(null)}
                            />
                        ) : (
                            <UserFeedbackDetail
                                entry={selected}
                                onClose={() => setSelected(null)}
                                onStatusChange={handleStatusChange}
                                onRepliesUpdate={handleRepliesUpdate}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Admin view ──────────────────────────────────────────────────────────────

function AdminFeedbackView() {
    const { user } = useAuth();
    const currentUserId = user?.id ?? '';
    const unreadByFeedbackId = useAppSelector(s => s.feedback.byFeedbackId);
    const markReadOnOpen = useMarkFeedbackReadOnOpen();

    const [entries, setEntries] = useState<FeedbackEntry[]>([]);
    const [verifications, setVerifications] = useState<VerificationEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'assigned' | 'ai-feedback'>('all');
    const [selected, setSelected] = useState<FeedbackEntry | VerificationEntry | null>(null);
    const [showPerf, setShowPerf] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [feedbackRes, verificationRes] = await Promise.all([
                feedbackService.getAll(),
                diagnosisVerificationService.getAll().catch(() => ({ success: false, data: { verifications: [], total: 0 } }))
            ]);
            if (feedbackRes.success) setEntries(feedbackRes.data.feedback);
            if (verificationRes.success) setVerifications(verificationRes.data.verifications);
        } catch {
            setError('Failed to load feedback. Make sure you are signed in as a MobileUurka admin.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const onFeedbackDataUpdated = () => load();
        window.addEventListener('feedback-data-updated', onFeedbackDataUpdated);
        return () => window.removeEventListener('feedback-data-updated', onFeedbackDataUpdated);
    }, [load]);

    const handleStatusChange = (id: string, status: string, updatedEntry?: Partial<FeedbackEntry>) => {
        setEntries(prev => prev.map(e =>
            e.id === id ? { ...e, status: status as FeedbackEntry['status'], ...updatedEntry } : e
        ));
        setSelected(prev => {
            if (!prev || prev.id !== id) return prev;
            if ('isAccurate' in prev) return prev; // it's a VerificationEntry, leave untouched
            return {
                ...prev,
                status: status as FeedbackEntry['status'],
                ...updatedEntry,
            } as FeedbackEntry;
        });
    };

    console.log(entries)
    const handleDelete = async (id: string) => {
        try {
            await feedbackService.deleteEntry(id);
            setEntries(prev => prev.filter(e => e.id !== id));
            if (selected?.id === id) setSelected(null);
        } catch { /* silent */ }
    };

    // Split: all entries vs ones assigned to me
    const assignedToMe = entries.filter(e =>
        Array.isArray(e.assignedTo) && e.assignedTo.some(a => a.id === currentUserId)
    );
    const commentEntries = entries.filter(isCommentFeedback);
    const nonCommentEntries = entries.filter(e => !isCommentFeedback(e));
    const sourceEntries: FeedbackEntry[] =
        activeTab === 'all' ? nonCommentEntries
            : activeTab === 'comments' ? commentEntries
                : activeTab === 'assigned' ? assignedToMe
                    : []; // ai-feedback tab doesn't use sourceEntries for filtering

    const filtered: (FeedbackEntry | VerificationEntry)[] =
        activeTab === 'ai-feedback'
            ? verifications
            : sourceEntries.filter(e => filter === 'all' || e.status === filter);

    const counts = {
        all: nonCommentEntries.length,
        pending: entries.filter(e => e.status === 'pending').length,
        reviewed: entries.filter(e => e.status === 'reviewed').length,
        resolved: entries.filter(e => e.status === 'resolved').length,
    };

    const FILTERS: { key: StatusFilter; label: string }[] = [
        { key: 'all', label: `All (${sourceEntries.length})` },
        { key: 'pending', label: `Pending (${sourceEntries.filter(e => e.status === 'pending').length})` },
        { key: 'reviewed', label: `Reviewed (${sourceEntries.filter(e => e.status === 'reviewed').length})` },
        { key: 'resolved', label: `Resolved (${sourceEntries.filter(e => e.status === 'resolved').length})` },
    ];


    return (
        <div className="w-full h-full flex flex-col pt-4 px-4 sm:pt-6 sm:px-6 bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 shrink-0">
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

            {/* Top-level tabs: All Feedback / Comments / Assigned to Me */}
            <div className="flex gap-1 mb-2 border-b border-gray-100 shrink-0">
                {([
                    { key: 'all', label: `All feedback (${nonCommentEntries.length})` },
                    { key: 'comments', label: `Comments (${commentEntries.length})` },
                    { key: 'assigned', label: `Assigned to me (${assignedToMe.length})` },
                    { key: 'ai-feedback', label: `AI Feedback (${verifications.length})` },
                ] as const).map(t => (
                    <button
                        key={t.key}
                        onClick={() => { setActiveTab(t.key); setSelected(null); }}
                        className={`px-3 py-2 text-xs font-medium rounded-t-lg transition border-b-2 -mb-px ${activeTab === t.key
                            ? 'border-[#984815] text-[#984815]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {t.label}

                    </button>
                ))}
            </div>
            {/* Status filter sub-tabs - only show for non-AI feedback tabs */}
            {activeTab !== 'ai-feedback' && (
                <div className="flex gap-1 mb-4 border-b border-gray-50 pb-0 shrink-0 mt-1">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => { setFilter(f.key); setSelected(null); }}
                            className={`px-3 py-1.5 text-[11px] font-medium rounded-t transition border-b-2 -mb-px ${filter === f.key ? 'border-gray-400 text-gray-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 shrink-0">
                    {error}
                </div>
            )}

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
                            <span className="text-sm">
                                {activeTab === 'assigned'
                                    ? 'No feedback assigned to you yet.'
                                    : activeTab === 'ai-feedback'
                                        ? 'No AI diagnosis verifications yet.'
                                        : 'No feedback in this category'}
                            </span>
                        </div>
                    )}
                    {!loading && filtered.map(entry => {
                        const isVerification = 'isAccurate' in entry;
                        return (
                            <div
                                key={entry.id}
                                onClick={() => {
                                    setSelected(entry);
                                    if (!isVerification) markReadOnOpen(entry.id);
                                }}
                                className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition group ${selected?.id === entry.id ? 'bg-[#984815]/5' : ''}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${isVerification ? 'bg-blue-100 text-blue-600' : 'bg-[#984815]/10 text-[#984815]'}`}>
                                    {isVerification
                                        ? (entry.verifiedByName ?? entry.verifiedBy).charAt(0).toUpperCase()
                                        : (entry.userName ?? entry.userEmail).charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {isVerification ? (
                                            <>
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${entry.isAccurate ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                                    <FiCheck size={9} />
                                                    {entry.isAccurate ? 'Accurate' : 'Not Accurate'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{entry.sourceType === 'predisposition' ? 'Predisposition' : 'Symptom Report'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-sm font-medium text-gray-800 truncate">
                                                    {entry.userName ?? entry.userEmail}
                                                </span>
                                                <StatusBadge status={entry.status} />
                                            </>
                                        )}
                                        <span className="text-[10px] text-gray-300">·</span>
                                        <span className="text-[10px] text-gray-400">{timeAgo(entry.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                        {isVerification ? entry.diagnosisText : entry.message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {isVerification ? (
                                            <>
                                                <span className="text-[10px] text-gray-400">Patient: {entry.patientName || entry.patientId}</span>
                                                {entry.riskLevel && (
                                                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                        {entry.riskLevel}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-[10px] text-gray-400">{entry.page}</span>
                                                {isCommentFeedback(entry) && (
                                                    <span className="text-[10px] font-semibold text-[#984815] bg-[#f8ebe1] px-2 py-0.5 rounded-full">
                                                        Comment
                                                    </span>
                                                )}
                                                {Array.isArray(entry.assignedTo) && entry.assignedTo.length > 0 && (
                                                    <>
                                                        <span className="text-[10px] text-gray-300">·</span>
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-[#984815]">
                                                            <FiUserCheck size={9} />
                                                            {entry.assignedTo.map(a => a.name.split(' ')[0]).join(', ')}
                                                        </span>
                                                    </>
                                                )}
                                                {Array.isArray(entry.replies) && entry.replies.length > 0 && (
                                                    <>
                                                        <span className="text-[10px] text-gray-300">·</span>
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                                                            <FiMessageSquare size={9} />
                                                            {entry.replies.length}
                                                        </span>
                                                    </>
                                                )}
                                                {(unreadByFeedbackId[entry.id] ?? 0) > 0 && (
                                                    <>
                                                        <span className="text-[10px] text-gray-300">·</span>
                                                        <UnreadReplyBadge count={unreadByFeedbackId[entry.id]} />
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                {!isVerification && (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition shrink-0 mt-1"
                                    >
                                        <FiTrash2 size={13} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Detail pane */}
                {selected && (
                    <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden flex flex-col min-h-0">
                        {'isAccurate' in selected ? (
                            <VerificationDetail
                                entry={selected}
                                onClose={() => setSelected(null)}
                            />
                        ) : (
                            <FeedbackDetail
                                entry={selected}
                                onClose={() => setSelected(null)}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDelete}
                            />
                        )}
                    </div>
                )}
            </div>

            {showPerf && <PerformancePanel onClose={() => setShowPerf(false)} />}
        </div>
    );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function Feedback() {
    const { user, isReady } = useAuth();

    // Wait for auth context to be ready before deciding which view to show
    if (!isReady) return null;

    const admin = user?.email ? isAdminUser(user.email) : false;
    return admin ? <AdminFeedbackView /> : <UserFeedbackView />;
}
