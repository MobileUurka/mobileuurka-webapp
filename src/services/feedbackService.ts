import { api } from './apiClient';

export interface AssignedStaffMember {
    id: string;
    name: string;
    email: string;
}

export interface FeedbackReply {
    id: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderType: string;
    message: string;
    createdAt: string;
}

export interface FeedbackPayload {
    page: string;
    pageUrl: string;
    patientId?: string;
    patientName?: string;
    message: string;
    assignedTo?: AssignedStaffMember[];
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
    adminReply: string | null;
    assignedTo: AssignedStaffMember[];
    replies: FeedbackReply[];
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

    async updateStatus(
        id: string,
        status: string,
        adminNotes?: string,
        assignedTo?: AssignedStaffMember[],
        adminReply?: string,
    ): Promise<{ success: boolean }> {
        return api.patch(`/feedback/${id}`, { status, adminNotes, assignedTo, adminReply });
    },

    async addReply(
        id: string,
        message: string,
    ): Promise<{ success: boolean; data: { reply: FeedbackReply; feedback: FeedbackEntry } }> {
        return api.post(`/feedback/${id}/replies`, { message });
    },

    async deleteEntry(id: string): Promise<{ success: boolean }> {
        return api.delete(`/feedback/${id}`);
    },

    async getUnreadSummary(): Promise<{
        success: boolean;
        data: { totalUnread: number; byFeedbackId: Record<string, number> };
    }> {
        return api.get('/feedback/unread-summary');
    },

    async markRead(id: string): Promise<{ success: boolean }> {
        return api.patch(`/feedback/${id}/read`, {});
    },
};
