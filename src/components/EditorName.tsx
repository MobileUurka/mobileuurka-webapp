type UserStatus = 'active' | 'deactivated' | 'purged';

interface EditorNameProps {
    /** Snapshot name stored on the record at edit time */
    editorName?: string | null;
    /** Resolved name from live user lookup */
    resolvedName?: string | null;
    /** From GET /users/:id → userStatus */
    userStatus?: UserStatus;
    className?: string;
}

const TOOLTIP: Record<UserStatus, string> = {
    active: '',
    deactivated: 'This user is no longer active',
    purged: 'This account was removed — name shown is from when the record was saved',
};

export default function EditorName({
    editorName,
    resolvedName,
    userStatus = 'active',
    className = '',
}: EditorNameProps) {
    const display = editorName?.trim()
        || resolvedName?.trim()
        || 'Unknown';

    const tooltip = TOOLTIP[userStatus];
    const isInactive = userStatus !== 'active';

    if (!tooltip) {
        return <span className={className}>{display}</span>;
    }

    return (
        <span
            className={`${className} ${isInactive ? 'text-gray-500' : ''} border-b border-dotted border-gray-400 cursor-help`}
            title={tooltip}
        >
            {display}
        </span>
    );
}
