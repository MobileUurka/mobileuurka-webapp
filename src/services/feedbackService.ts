import { api } from './apiClient';

export interface FeedbackPayload {
    page: string;
    pageUrl: string;
    patientId?: string;
    patientName?: string;
    message: string;
}

export interface FeedbackEntry {
    id: string;
    userId: string;
    userEmail: string;
    userName: string | null;
    userType: string;
    page: string;
    pageUrl: string | null;
    patientId: string | null;
    patientName: string | null;
    message: string;
    status: 'pending' | 'reviewed' | 'resolved';
    adminNotes: string | null;
    createdAt: string;
    updatedAt: string;
}

export const feedbackService = {
    async submit(payload: FeedbackPayload): Promise<{ success: boolean; message: string }> {
        return api.post('/feedback', payload);
    },

    async getMine(): Promise<{ success: boolean; data: { feedback: FeedbackEntry[]; total: number } }> {
        return api.get('/feedback/mine');
    },

    // Admin only
    async getAll(filters?: { status?: string; page?: string }): Promise<{ success: boolean; data: { feedback: FeedbackEntry[]; total: number } }> {
        const params = new URLSearchParams();
        if (filters?.status) params.set('status', filters.status);
        if (filters?.page) params.set('page', filters.page);
        const query = params.toString();
        return api.get(`/feedback${query ? `?${query}` : ''}`);
    },

    async updateStatus(id: string, status: string, adminNotes?: string): Promise<{ success: boolean }> {
        return api.patch(`/feedback/${id}`, { status, adminNotes });
    },

    async deleteEntry(id: string): Promise<{ success: boolean }> {
        return api.delete(`/feedback/${id}`);
    },
};
