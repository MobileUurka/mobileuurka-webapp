import { api } from './apiClient';
import { authService } from './authServices';

export interface ProfileAccessLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_subtype?: string;
  fields_accessed?: string[];
  purpose?: string;
  is_sensitive_access: boolean;
  status: string;
  reason_if_denied?: string;  // ✅ NEW
  created_at: string;
  ip_address: string;
  user_agent: string;
}

export interface AuditLogEntry {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  resource_type: string;
  patient_email: string | null;
  patient_name: string | null;  // ✅ NEW
  endpoint: string;
  ip_address: string | null;
  status: string;
  response_time_ms: number | null;
}

export interface ProfileAccessAuditResponse {
  success: boolean;
  data: {
    patientId: string;
    profileAccessLog: ProfileAccessLog[];
    total: number;
    limit: number;
    offset: number;
    message: string;
  };
}


export interface OrganizationAuditResponse {
  success: boolean;
  data: {
    organizationId: string;
    logs: AuditLogEntry[];
    total: number;
    limit: number;
    offset: number;
    filters: { action?: string; userId?: string; startDate?: string; endDate?: string };
  };
}

export const auditService = {
  /**
   * Get profile access audit for a specific patient
   * Shows field-level access for HIPAA/Kenya DPA compliance
   */
  async getPatientProfileAccess(
    patientId: string,
    options?: { limit?: number; offset?: number; startDate?: string; endDate?: string }
  ): Promise<ProfileAccessAuditResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const queryString = params.toString();
    const url = `/audit/patients/${patientId}/profile-access${queryString ? `?${queryString}` : ''}`;

    return api.get(url);
  },

  /**
   * Get all audit logs for the organization (admin-wide activity view)
   */
  async getOrganizationAuditTrail(
    options?: { limit?: number; offset?: number; startDate?: string; endDate?: string; userId?: string; action?: string }
  ): Promise<OrganizationAuditResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.userId) params.append('userId', options.userId);
    if (options?.action) params.append('action', options.action);

    const queryString = params.toString();
    const url = `/audit/organization${queryString ? `?${queryString}` : ''}`;
    return api.get(url);
  },

  /**
   * Export organization audit logs as CSV.
   * Backend streams raw CSV (not JSON), so this bypasses the shared
   * apiClient (which always calls response.json()) and downloads the
   * file directly instead.
   */
  async exportOrganizationAuditLogs(organizationId: string): Promise<void> {
    const token = authService.getAccessToken();
    const sessionId = authService.getSessionId();
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';

    const response = await fetch(`${BASE_URL}/audit/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(sessionId && { 'x-session-id': sessionId }),
      },
      body: JSON.stringify({ organizationId }),
    });

    if (!response.ok) {
      let message = 'Failed to export audit logs';
      try {
        const errBody = await response.json();
        message = errBody?.message || message;
      } catch {
        // success path returns CSV, not JSON — nothing to parse on error fallback
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Format a profile access log for display
   */
  formatAccessLog(log: ProfileAccessLog) {
    const date = new Date(log.created_at);
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      ...log,
      dateStr,
      timeStr,
      displayTime: `${dateStr} at ${timeStr}`,
      actionLabel: log.action === 'VIEW' ? '👁️ Viewed' : log.action === 'EDIT' ? '✏️ Edited' : log.action === 'DOWNLOAD' ? '⬇️ Downloaded' : '📤 Exported',
      sensitivityLabel: log.is_sensitive_access ? '🔒 Sensitive' : 'Normal',
    };
  },
};