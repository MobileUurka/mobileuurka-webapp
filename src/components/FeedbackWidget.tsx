import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { IoIosSend } from 'react-icons/io';
import { IoClose } from 'react-icons/io5';
import { MdFeedback } from 'react-icons/md';
import { FiUserCheck } from 'react-icons/fi';
import { feedbackService } from '../services/feedbackService';
import MentionTextarea, { type AssignedMember } from './MentionTextarea';
import { useAuth } from '../contexts/AuthContext';

// ─── Page label map ───────────────────────────────────────────────────────────
// Maps the first path segment to a human-readable page name shown in the widget
const PAGE_LABELS: Record<string, string> = {
    '':           'Patients',
    'patients':   'Patients',
    'patient':    'Patient Profile',
    'dashboard':  'Dashboard',
    'staff':      'Staff',
    'screening':  'Screening',
    'hospital':   'Hospital',
    'alerts':     'Alerts',
    'notifications': 'Notifications',
    'settings':   'Settings',
};

function getPageLabel(pathname: string): string {
    const segment = pathname.split('/')[1]?.toLowerCase() ?? '';
    const fallback = segment.charAt(0).toUpperCase() + segment.slice(1) || 'App';
    return PAGE_LABELS[segment] ?? fallback;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FeedbackWidgetProps {
    /** Optional: pass current patient info when on a patient page */
    patientId?: string;
    patientName?: string;
}

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ patientId, patientName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [assignedTo, setAssignedTo] = useState<AssignedMember[]>([]);
    const [submitState, setSubmitState] = useState<SubmitState>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const location = useLocation();
    const panelRef = useRef<HTMLDivElement>(null);

    const page = getPageLabel(location.pathname);
    const pageUrl = location.pathname;

    // Reset state when panel closes
    useEffect(() => {
        if (!isOpen) {
            setMessage('');
            setAssignedTo([]);
            setSubmitState('idle');
            setErrorMsg('');
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);


    const handleSubmit = async () => {
        if (!message.trim() || submitState === 'sending') return;

        setSubmitState('sending');
        setErrorMsg('');

        try {
            await feedbackService.submit({
                page,
                pageUrl,
                patientId,
                patientName,
                message: message.trim(),
                assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
            });
            setSubmitState('success');
            setMessage('');
            setAssignedTo([]);
            // Auto-close after 2.5 s
            setTimeout(() => setIsOpen(false), 2500);
        } catch (err: any) {
            setSubmitState('error');
            setErrorMsg(err?.message || 'Something went wrong. Please try again.');
        }
    };

    // ─── User info for the header ─────────────────────────────────────────────
    const { user } = useAuth();
    const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'You';

    return (
        <>
            {/* ── Floating trigger button ── */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                aria-label="Open feedback"
                title="Send feedback"
                className={`
                    fixed bottom-20 right-8 z-50
                    w-12 h-12 rounded-full shadow-lg
                    flex items-center justify-center
                    transition-all duration-200
                    ${isOpen
                        ? 'bg-gray-700 rotate-90 scale-95'
                        : 'bg-[#008540] hover:brightness-95 active:scale-95'
                    }
                `}
            >
                {isOpen
                    ? <IoClose size={22} className="text-white" />
                    : <MdFeedback size={22} className="text-white" />
                }
            </button>

            {/* ── Feedback panel ── */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="
                        fixed bottom-22 right-6 z-50
                        w-[340px] max-w-[calc(100vw-2rem)]
                        bg-[#F6F6F6] rounded-2xl shadow-2xl
                        flex flex-col overflow-hidden
                        animate-in fade-in slide-in-from-bottom-4 duration-200
                    "
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Share feedback</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                As <span className="font-medium text-gray-600">{userName}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close feedback"
                        >
                            <IoClose size={18} className="text-gray-500" />
                        </button>
                    </div>

                    {/* Context tags */}
                    <div className="flex flex-wrap gap-2 px-5 pt-4 pb-2">
                        {/* Page tag — always shown */}
                        <span className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#008540] inline-block" />
                            {page}
                        </span>

                        {/* Patient tag — only when on a patient page */}
                        {patientId && patientName && (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 rounded-full px-3 py-1 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                                {patientName}
                            </span>
                        )}
                    </div>

                    {/* Body */}
                    <div className="px-5 pb-4 flex-1">
                        {submitState === 'success' ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-3 animate-in fade-in duration-300">
                                <div className="w-12 h-12 rounded-full bg-[#e6f4ec] flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#008540]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">Feedback received!</p>
                                <p className="text-xs text-gray-400 text-center">Thanks for helping us improve. This window will close shortly.</p>
                            </div>
                        ) : (
                            <>
                                <MentionTextarea
                                    value={message}
                                    onChange={setMessage}
                                    assignedTo={assignedTo}
                                    onAssignedChange={setAssignedTo}
                                    placeholder={`What did you notice on the ${page} page? Type @ to assign someone.`}
                                    rows={4}
                                />

                                {/* Assigned chips */}
                                {assignedTo.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {assignedTo.map(m => (
                                            <span
                                                key={m.id}
                                                className="inline-flex items-center gap-1 text-[11px] bg-[#984815]/10 text-[#984815] rounded-full px-2.5 py-0.5 font-medium"
                                            >
                                                <FiUserCheck size={10} />
                                                {m.name.split(' ')[0]}
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignedTo(prev => prev.filter(x => x.id !== m.id))}
                                                    className="ml-0.5 hover:text-red-500 transition"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {submitState === 'error' && (
                                    <p className="text-xs text-red-500 mt-2">{errorMsg}</p>
                                )}

                                <div className="flex items-center justify-between mt-3">
                                    <p className="text-[11px] text-gray-400">Enter to send · Shift+Enter for new line</p>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!message.trim() || submitState === 'sending'}
                                        className="
                                            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                                            bg-[#008540] text-white
                                            hover:brightness-95 active:scale-95
                                            disabled:opacity-40 disabled:scale-100
                                            transition-all
                                        "
                                    >
                                        {submitState === 'sending' ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                Sending
                                            </>
                                        ) : (
                                            <>
                                                <IoIosSend size={16} />
                                                Send
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default FeedbackWidget;
