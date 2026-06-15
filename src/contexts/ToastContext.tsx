/**
 * Lightweight toast system — used for in-app transient notifications
 * (e.g. "Someone replied to your feedback").
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ title: 'New reply', message: 'Dr. Amina replied on Patients feedback', type: 'info' });
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { FiX, FiMessageSquare, FiInfo, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export type ToastType = 'info' | 'success' | 'warning' | 'reply';

export interface Toast {
    id: string;
    title: string;
    message?: string;
    type: ToastType;
    onClick?: () => void;
}

interface ToastContextValue {
    showToast: (toast: Omit<Toast, 'id'>) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
    showToast: () => {},
    showSuccess: () => {},
    showError: () => {},
});

export function useToast() {
    return useContext(ToastContext);
}

const TOAST_DURATION = 5000; // ms

const TYPE_STYLES: Record<ToastType, string> = {
    info:    'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-amber-200 bg-amber-50',
    reply:   'border-[#984815]/25 bg-[#984815]/5',
};

const TYPE_ICON: Record<ToastType, React.ReactNode> = {
    info:    <FiInfo size={15} className="text-blue-500 shrink-0 mt-0.5" />,
    success: <FiCheckCircle size={15} className="text-green-500 shrink-0 mt-0.5" />,
    warning: <FiAlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />,
    reply:   <FiMessageSquare size={15} className="text-[#984815] shrink-0 mt-0.5" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) { clearTimeout(timer); timers.current.delete(id); }
    }, []);

    const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // keep max 5
        const timer = setTimeout(() => dismiss(id), TOAST_DURATION);
        timers.current.set(id, timer);
    }, [dismiss]);

    const showSuccess = useCallback((message: string, title = 'Success') => {
        showToast({ type: 'success', title, message });
    }, [showToast]);

    const showError = useCallback((message: string, title = 'Error') => {
        showToast({ type: 'warning', title, message });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
            {children}

            {/* Toast stack — bottom-right */}
            <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        onClick={() => { t.onClick?.(); dismiss(t.id); }}
                        className={`
                            pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
                            max-w-[320px] w-full animate-slide-up
                            ${TYPE_STYLES[t.type]}
                            ${t.onClick ? 'cursor-pointer hover:brightness-95' : ''}
                            transition
                        `}
                    >
                        {TYPE_ICON[t.type]}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                            {t.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.message}</p>}
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); dismiss(t.id); }}
                            className="text-gray-400 hover:text-gray-600 transition shrink-0"
                        >
                            <FiX size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
