import { api } from './apiClient';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'alert' | 'update';
    level: 'all' | 'organization' | 'user';
    organizationId?: string;
    createdAt: string;
    readAt?: string | null;
}

export interface SendNotificationPayload {
    title: string;
    message: string;
    type?: string;
    level: 'all' | 'organization' | 'user';
    organizationId?: string;
    targetUserId?: string;
    targetUserType?: string;
}

export const notificationService = {
    async getMyNotifications(): Promise<{ notifications: Notification[] }> {
        const res = await api.get('/notifications');
        return res.data;
    },

    async markAsRead(id: string) {
        return api.post(`/notifications/${id}/read`, {});
    },

    async markAllAsRead() {
        return api.post('/notifications/read-all', {});
    },

    // Mobileuurka admin only
    async send(payload: SendNotificationPayload) {
        return api.post('/notifications', payload);
    },

    async getSent(): Promise<{ notifications: Notification[] }> {
        const res = await api.get('/notifications/sent');
        return res.data;
    },

    async deleteNotification(id: string) {
        return api.delete(`/notifications/${id}`);
    },
};
