
import { api } from './apiClient';

export const patientService = {
    // ===== CORE PATIENT OPERATIONS =====

    async createPatient(patientData: any) {
        return api.post('/patients', patientData);
    },

    async getPatients(params: { page?: number; limit?: number; search?: string } = {}) {
        const query = new URLSearchParams(params as any).toString();
        return api.get(`/patients?${query}`);
    },

    async getArchivedPatients(params: { page?: number; limit?: number; search?: string } = {}) {
        const query = new URLSearchParams({ ...params as any, showInactive: 'true' }).toString();
        return api.get(`/patients?${query}`);
    },

    async getPatient(patientId: string, includeAll: boolean = false) {
        return api.get(`/patients/${patientId}?includeAll=${includeAll}`);
    },

    async getPatientCompleteProfile(patientId: string) {
        return api.get(`/patients/${patientId}/complete-profile`);
    },

    async getPatientsRiskOverview(params: { page?: number; limit?: number; search?: string } = {}) {
        const limit = params.limit || 50;
        const page = params.page || 1;
        const offset = (page - 1) * limit;
    
        const query = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            ...(params.search && { search: params.search })
        }).toString();
    
        return api.get(`/patients/risk-overview?${query}`);
    },

    async updatePatient(patientId: string, updateData: any) {
        return api.put(`/patients/${patientId}`, updateData);
    },

    async deletePatient(patientId: string) {
        return api.delete(`/patients/${patientId}`);
    },

    async dischargePatient(patientId: string, payload: { reason: string; notes?: string }) {
        return api.post(`/patients/${patientId}/discharge`, payload);
    },

    async reactivatePatient(patientId: string) {
        return api.post(`/patients/${patientId}/reactivate`, {});
    },

    // ===== DYNAMIC TABLE / RECORD OPERATIONS =====

    async createRecord(tableName: string, recordData: any) {
        return api.post(`/patients/data/${tableName}`, recordData);
    },

    async getRecords(tableName: string, params: any = {}) {
        const query = new URLSearchParams(params).toString();
        return api.get(`/patients/data/${tableName}?${query}`);
    },

    async updateRecord(tableName: string, recordId: string, updateData: any) {
        return api.put(`/patients/data/${tableName}/${recordId}`, updateData);
    },

    async deleteRecord(tableName: string, recordId: string) {
        return api.delete(`/patients/data/${tableName}/${recordId}`);
    },

    // ===== ADMIN / UTILITY OPERATIONS =====

    async getAvailableTables() {
        return api.get('/patients/utils/tables');
    },

    async getAllPatientsAcrossOrgs() {
        return api.get('/patients/admin/all');
    },

    // ===== REPORT COMMENTS =====

    async createComment(patientId: string, payload: { documentId: string; selection: string; text: string; y?: number; yPercentage?: number }) {
        return api.post(`/patients/${patientId}/comments`, payload);
    },

    async getComments(patientId: string, documentId: string) {
        return api.get(`/patients/${patientId}/comments?documentId=${encodeURIComponent(documentId)}`);
    },

    async deleteComment(patientId: string, commentId: string) {
        return api.delete(`/patients/${patientId}/comments/${commentId}`);
    },
};