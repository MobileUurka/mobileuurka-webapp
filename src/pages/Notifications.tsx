import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchNotifications, markRead, markAllRead, removeNotification } from '../store/notificationsSlice';
import { notificationService, type Notification, type SendNotificationPayload } from '../services/notificationService';
import { FiBell, FiTrash2, FiSend, FiChevronDown, FiX } from 'react-icons/fi';
import { MdOutlineMarkEmailRead, MdOutlineMarkEmailUnread } from 'react-icons/md';
import { IoMegaphoneOutline } from 'react-icons/io5';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import { BsPersonCheck } from 'react-icons/bs';

// ─── TYPE BADGE ─────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, string> = {
    info: 'bg-blue-50 text-blue-600',
    warning: 'bg-amber-50 text-amber-600',
    alert: 'bg-red-50 text-red-600',
    update: 'bg-green-50 text-green-600',
};

const LEVEL_ICON: Record<string, React.ReactNode> = {
    all: <IoMegaphoneOutline className="text-[#984815]" />,
    organization: <HiOutlineOfficeBuilding className="text-blue-500" />,
    user: <BsPersonCheck className="text-green-500" />,
};

function TypeBadge({ type }: { type: string }) {
    return (
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${TYPE_STYLES[type] ?? 'bg-gray-100 text-gray-500'}`}>
            {type}
        </span>
    );
}

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

// ─── COMPOSE PANEL ──────────────────────────────────────────────────────────

interface ComposePanelProps {
    onClose: () => void;
    onSent: () => void;
}

function ComposePanel({ onClose, onSent }: ComposePanelProps) {
    const [form, setForm] = useState<SendNotificationPayload>({
        title: '',
        message: '',
        type: 'info',
        level: 'all',
    });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const handleSend = async () => {
        if (!form.title.trim() || !form.message.trim()) {
            setError('Title and message are required.');
            return;
        }
        if (form.level === 'organization' && !form.organizationId?.trim()) {
            setError('Organization ID is required for org-level notifications.');
            return;
        }
        if (form.level === 'user' && (!form.targetUserId?.trim() || !form.targetUserType?.trim())) {
            setError('Target user ID and type are required for user-level notifications.');
            return;
        }
        setSending(true);
        setError('');
        try {
            await notificationService.send(form);
            onSent();
            onClose();
        } catch (e: any) {
            setError(e?.message ?? 'Failed to send notification.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white w-full sm:w-[520px] rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-[15px]">New Notification</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><FiX size={18} /></button>
                </div>

                {/* Level selector */}
                <div className="flex gap-2">
                    {(['all', 'organization', 'user'] as const).map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => setForm(f => ({ ...f, level: lvl }))}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${form.level === lvl ? 'border-[#984815] bg-[#984815]/5 text-[#984815]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                            <span className="flex items-center justify-center gap-1">
                                {LEVEL_ICON[lvl]}
                                {lvl === 'all' ? 'All Orgs' : lvl === 'organization' ? 'One Org' : 'One User'}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Type selector */}
                <div className="flex gap-2">
                    {(['info', 'warning', 'alert', 'update'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setForm(f => ({ ...f, type: t }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition capitalize ${form.type === t ? 'border-current ' + TYPE_STYLES[t] : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Conditional fields */}
                {form.level === 'organization' && (
                    <input
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#984815]"
                        placeholder="Organization ID"
                        value={form.organizationId ?? ''}
                        onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))}
                    />
                )}
                {form.level === 'user' && (
                    <div className="flex gap-2">
                        <input
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#984815]"
                            placeholder="Target User ID"
                            value={form.targetUserId ?? ''}
                            onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}
                        />
                        <div className="relative">
                            <select
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#984815] appearance-none pr-7"
                                value={form.targetUserType ?? ''}
                                onChange={e => setForm(f => ({ ...f, targetUserType: e.target.value }))}
                            >
                                <option value="">User type</option>
                                <option value="organization_admin">Admin</option>
                                <option value="organization_user">Staff</option>
                            </select>
                            <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                )}

                <input
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#984815]"
                    placeholder="Subject"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
                <textarea
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#984815] resize-none"
                    placeholder="Write your message..."
                    rows={4}
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                />

                {error && <p className="text-red-500 text-xs">{error}</p>}

                <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex items-center justify-center gap-2 bg-[#984815] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#7a3a10] transition disabled:opacity-60"
                >
                    <FiSend size={14} />
                    {sending ? 'Sending...' : 'Send Notification'}
                </button>
            </div>
        </div>
    );
}

// ─── NOTIFICATION DETAIL ─────────────────────────────────────────────────────

function NotificationDetail({ notification, onClose, onDelete }: {
    notification: Notification;
    onClose: () => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition text-sm flex items-center gap-1">
                    ← Back
                </button>
                <button
                    onClick={() => { onDelete(notification.id); onClose(); }}
                    className="text-gray-400 hover:text-red-500 transition"
                >
                    <FiTrash2 size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-[#984815]/10 flex items-center justify-center text-[#984815] shrink-0">
                        <FiBell size={16} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[15px]">{notification.title}</span>
                            <TypeBadge type={notification.type} />
                            <span className="text-gray-400 text-xs ml-auto">{timeAgo(notification.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                            {LEVEL_ICON[notification.level]}
                            <span className="capitalize">{notification.level === 'all' ? 'All organisations' : notification.level === 'organization' ? 'Your organisation' : 'You'}</span>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

type Filter = 'all' | 'unread' | 'all_orgs' | 'organization' | 'user';

export default function Notifications() {
    const dispatch = useAppDispatch();
    const notifications = useAppSelector(s => s.notifications.data);
    const status = useAppSelector(s => s.notifications.status);

    const [filter, setFilter] = useState<Filter>('all');
    const [selected, setSelected] = useState<Notification | null>(null);
    const [showCompose, setShowCompose] = useState(false);

    // TODO: derive from auth — set true if user is mobileuurka admin
    const isMobileuurkaAdmin = false;

    useEffect(() => {
        if (status === 'idle') dispatch(fetchNotifications());
    }, [status, dispatch]);

    const handleOpen = async (n: Notification) => {
        setSelected(n);
        if (!n.readAt) {
            dispatch(markRead(n.id));
            try { await notificationService.markAsRead(n.id); } catch { /* silent */ }
        }
    };

    const handleMarkAllRead = async () => {
        dispatch(markAllRead());
        try { await notificationService.markAllAsRead(); } catch { /* silent */ }
    };

    const handleDelete = async (id: string) => {
        dispatch(removeNotification(id));
        try { await notificationService.deleteNotification(id); } catch { /* silent */ }
    };

    const filtered = notifications.filter(n => {
        if (filter === 'unread') return !n.readAt;
        if (filter === 'all_orgs') return n.level === 'all';
        if (filter === 'organization') return n.level === 'organization';
        if (filter === 'user') return n.level === 'user';
        return true;
    });

    const unreadCount = notifications.filter(n => !n.readAt).length;

    const FILTERS: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: `Unread${unreadCount ? ` (${unreadCount})` : ''}` },
        { key: 'all_orgs', label: 'Broadcast' },
        { key: 'organization', label: 'Organisation' },
        { key: 'user', label: 'Direct' },
    ];

    return (
        <div className="w-full h-full flex flex-col pt-4 px-4 sm:pt-6 sm:px-6 bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="text-lg sm:text-[1.3em] font-medium flex items-center gap-3">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="bg-[#f05b56] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition"
                        >
                            <MdOutlineMarkEmailRead size={14} />
                            Mark all read
                        </button>
                    )}
                    {isMobileuurkaAdmin && (
                        <button
                            onClick={() => setShowCompose(true)}
                            className="flex items-center gap-1.5 text-xs bg-[#984815] text-white rounded-lg px-3 py-1.5 hover:bg-[#7a3a10] transition"
                        >
                            <FiSend size={12} />
                            Compose
                        </button>
                    )}
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-100 pb-0">
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

            {/* Body */}
            <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
                {/* List */}
                <div className={`flex flex-col overflow-y-auto custom-scrollbar transition-all ${selected ? 'hidden sm:flex sm:w-[340px] shrink-0' : 'w-full'}`}>
                    {status === 'loading' && (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-16">
                            Loading notifications...
                        </div>
                    )}
                    {status !== 'loading' && filtered.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-16 gap-3">
                            <MdOutlineMarkEmailUnread size={40} className="opacity-30" />
                            <span className="text-sm">No notifications here</span>
                        </div>
                    )}
                    {filtered.map(n => (
                        <div
                            key={n.id}
                            onClick={() => handleOpen(n)}
                            className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition group ${selected?.id === n.id ? 'bg-[#984815]/5' : ''}`}
                        >
                            {/* Unread dot */}
                            <div className="mt-1.5 shrink-0">
                                {!n.readAt
                                    ? <div className="w-2 h-2 rounded-full bg-[#984815]" />
                                    : <div className="w-2 h-2 rounded-full bg-transparent" />
                                }
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm truncate ${!n.readAt ? 'font-semibold text-gray-900' : 'font-normal text-gray-600'}`}>
                                        {n.title}
                                    </span>
                                    <TypeBadge type={n.type} />
                                </div>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{n.message}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] text-gray-300">{LEVEL_ICON[n.level]}</span>
                                    <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                                </div>
                            </div>

                            <button
                                onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
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
                        <NotificationDetail
                            notification={selected}
                            onClose={() => setSelected(null)}
                            onDelete={handleDelete}
                        />
                    </div>
                )}
            </div>

            {/* Compose modal */}
            {showCompose && (
                <ComposePanel
                    onClose={() => setShowCompose(false)}
                    onSent={() => dispatch(fetchNotifications())}
                />
            )}
        </div>
    );
}
