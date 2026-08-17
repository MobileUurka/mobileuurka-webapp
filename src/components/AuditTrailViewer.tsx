// components/AuditTrailViewer.tsx — patient-specific viewer
import { useEffect, useState } from 'react';
import { FiFilter, FiDownload, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { auditService, type ProfileAccessLog } from '../services/auditService';
import { useToast } from '../contexts/ToastContext';
import DataTable, { type ColumnConfig } from './DataTable';

interface AuditTrailViewerProps {
  patientId: string;
  patientName: string;
}

const columns: ColumnConfig<ProfileAccessLog>[] = [
  {
    key: 'when',
    label: 'Date',
    width: "140px",
    render: (log) => (
      <div className="flex flex-col">
        <span className="text-gray-900">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    ),
  },
  {
    key: 'user_email',
    label: 'Who',
    width: '280px',
    render: (log) => (
      <div className="flex flex-col">
        <span className="text-gray-900 font-medium">{log.user_email}</span>
        {log.purpose && <span className="text-xs text-gray-500">{log.purpose}</span>}
      </div>
    ),
  },
  {
    key: 'action',
    label: 'Action',
    width: '140px',
    render: (log) => (
      <div className="flex flex-col gap-0.5">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium w-fit ${log.action === 'VIEW' ? 'bg-blue-100 text-blue-700' :
          log.action === 'EDIT' ? 'bg-orange-100 text-orange-700' :
            log.action === 'DOWNLOAD' ? 'bg-green-100 text-green-700' :
              log.action === 'ACCESS_ATTEMPT' ? 'bg-red-100 text-red-700' :
                'bg-purple-100 text-purple-700'
          }`}>
          {log.action}
        </span>
        {log.reason_if_denied && (
          <span className="text-[10px] text-red-500">{log.reason_if_denied}</span>
        )}
      </div>
    ),
  },
  {
    key: 'ip_address',
    label: 'IP Address',
    render: (log) => (
      <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded font-mono">{log.ip_address}</code>
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
  // Fields / Sensitivity columns dropped — backend doesn't populate
  // fields_accessed or is_sensitive_access yet, so they only showed "-" / "Normal".
  // Add them back once logAuditEvent calls actually pass real values.
];

export default function AuditTrailViewer({ patientId, patientName }: AuditTrailViewerProps) {
  const { showError } = useToast();
  const [logs, setLogs] = useState<ProfileAccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const response = await auditService.getPatientProfileAccess(patientId, {
        limit: 200,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (response.success) {
        setLogs(response.data.profileAccessLog);
      } else {
        showError('Failed to load audit trail');
      }
    } catch (error: any) {
      showError(error?.message || error?.data?.message || 'Failed to load audit trail. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditTrail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, startDate, endDate]);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      showError('No audit logs to export');
      return;
    }
    const headers = ['Timestamp', 'User Email', 'Action', 'Purpose', 'IP Address', 'Status'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user_email,
      log.action,
      log.purpose || '-',
      log.ip_address,
      log.status,
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${patientId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Profile Access Audit</h3>
          <p className="text-xs text-gray-500 mt-1">Who accessed {patientName}'s profile</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAuditTrail}
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
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            title="Export as CSV"
          >
            <FiDownload className="text-gray-600" size={18} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-600">Start date</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-600">End date</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
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
          <p className="text-sm text-gray-500">No access logs found for this period</p>
        </div>
      ) : (
        <DataTable columns={columns} data={logs} emptyMessage="No access logs found for this period" initialItemsPerPage={10} />
      )}

      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p>
          ✓ <strong>HIPAA & Kenya DPA Compliant:</strong> This audit trail tracks all profile access for compliance purposes. Access logs are immutable and retained for compliance audits.
        </p>
      </div>
    </div>
  );
}