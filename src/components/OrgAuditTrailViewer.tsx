// components/OrgAuditTrailViewer.tsx
import { useEffect, useState } from 'react';
import { FiFilter, FiDownload, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { auditService, type AuditLogEntry } from '../services/auditService';
import { useToast } from '../contexts/ToastContext';
import DataTable, { type ColumnConfig } from './DataTable';

interface OrgAuditTrailViewerProps {
    organizationId: string;
}

const ACTIONS = ['VIEW', 'EDIT', 'DOWNLOAD', 'EXPORT', 'CREATE', 'DELETE'];

const columns: ColumnConfig<AuditLogEntry>[] = [
    {
        key: 'when',
        label: 'When',
        width: "120px",
        render: (log) => (
            <div className="flex flex-col">
                <span className="text-gray-900">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        ),
    },
    {
        key: 'user_email', label: 'User', width: "220px",
        render: (log) => log.user_email ?? '-'
    },
    {
        key: 'action',
        label: 'Action',
        render: (log) => (
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${log.action === 'VIEW' ? 'bg-blue-100 text-blue-700' :
                log.action === 'EDIT' ? 'bg-orange-100 text-orange-700' :
                    log.action === 'DOWNLOAD' || log.action === 'EXPORT' ? 'bg-green-100 text-green-700' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                            'bg-purple-100 text-purple-700'
                }`}>
                {log.action}
            </span>
        ),
    },
    { key: 'resource_type', label: 'Resource', render: (log) => log.resource_type ?? '-' },
    { key: 'patient_name', label: 'Patient', width: '160px', render: (log) => log.patient_name ?? '-' }, {
        key: 'ip_address',
        label: 'IP Address',
        render: (log) => (
            <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded font-mono">
                {log.ip_address ?? '-'}
            </code>
        ),
    },
    {
        key: 'status',
        label: 'Status',
        render: (log) => (
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                {log.status}
            </span>
        ),
    },
];

export default function OrgAuditTrailViewer({ organizationId }: OrgAuditTrailViewerProps) {
    const { showError } = useToast();
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [action, setAction] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            // Fetched once, client-side paginated via DataTable — fine at current volumes.
            // If an org's activity grows large, swap back to server-side offset paging.
            const response = await auditService.getOrganizationAuditTrail({
                limit: 500,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                action: action || undefined,
            });
            if (response.success) {
                setLogs(response.data.logs);
            } else {
                showError('Failed to load organization audit trail');
            }
        } catch (err: any) {
            showError(err?.message || err?.data?.message || 'Failed to load organization audit trail');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationId, startDate, endDate, action]);

    const handleExport = async () => {
        setExporting(true);
        try {
            await auditService.exportOrganizationAuditLogs(organizationId);
        } catch (err: any) {
            showError(err?.message || 'Failed to export audit logs');
        } finally {
            setExporting(false);
        }
    };

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setAction('');
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">Organization Activity</h3>
                    <p className="text-xs text-gray-500 mt-1">All logged actions across your organization</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={load}
                        disabled={loading}
                        className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        title="Refresh"
                    >
                        <FiRefreshCw className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} size={18} />
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                        title="Filter audit logs"
                    >
                        <FiFilter className="text-gray-600" size={18} />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        title="Export as CSV"
                    >
                        <FiDownload className="text-gray-600" size={18} />
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block">
                            <span className="text-xs text-gray-600">Start date</span>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                            <span className="text-xs text-gray-600">End date</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                        </label>
                        <label className="block">
                            <span className="text-xs text-gray-600">Action</span>
                            <select value={action} onChange={e => setAction(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                                <option value="">All actions</option>
                                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </label>
                    </div>
                    <button onClick={resetFilters} className="text-xs text-blue-600 hover:text-blue-700">Reset filters</button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">
                    <p className="text-sm text-gray-400">Loading audit trail…</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50/50">
                    <FiAlertCircle className="mx-auto text-gray-300 mb-3" size={32} />
                    <p className="text-sm text-gray-500">No activity found for this period</p>
                </div>
            ) : (
                <DataTable columns={columns} data={logs} emptyMessage="No activity found for this period" initialItemsPerPage={10} />
            )}
        </div>
    );
}