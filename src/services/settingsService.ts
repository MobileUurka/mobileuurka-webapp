import { api } from './apiClient';

export interface AccountSettings {
    user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string | null;
        role?: string;
        actualUserType?: string;
    };
    isOrgOwner: boolean;
    organization?: {
        id: string;
        name: string;
        slug: string;
        type?: string;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
        licenseNumber?: string | null;
        deletion?: {
            state: 'active' | 'pending';
            isPaused?: boolean;
            scheduledPurgeAt?: string;
        };
    } | null;
    deletion?: {
        state: 'active' | 'pending' | 'purged';
        deletionRequestedAt?: string;
        scheduledPurgeAt?: string;
    } | null;
    accountDeletionPolicy?: {
        otherOwnerCount: number;
        canDeleteWithoutOrgDeletion: boolean;
        requiresTransfer: boolean;
    } | null;
}

export interface OrgSubscription {
    id: string;
    organizationId: string;
    planName: string;
    status: string;
    amount: string;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
}

export interface OrgWithHospitals {
    id: string;
    name: string;
    slug: string;
    type?: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    licenseNumber?: string | null;
    deletion?: {
        state: 'active' | 'pending';
        isPaused?: boolean;
        scheduledPurgeAt?: string;
    };
    hospitals?: Array<{
        id: string;
        name: string;
        city?: string | null;
        isActive?: boolean;
    }>;
}

export const settingsService = {
    async getAccount(): Promise<{ success: boolean; data: AccountSettings }> {
        return api.get('/settings/account');
    },

    async updateAccount(payload: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    }): Promise<{ success: boolean; message: string }> {
        return api.put('/settings/account', payload);
    },

    async requestDeletion(password: string): Promise<{
        success: boolean;
        message: string;
        data?: { scheduledPurgeAt: string; graceDays: number };
    }> {
        return api.post('/settings/account/request-deletion', {
            password,
            confirmText: 'DELETE',
        });
    },

    async cancelDeletion(token: string): Promise<{ success: boolean; message: string }> {
        return api.post('/settings/account/cancel-deletion', { token });
    },

    async getMyOrganization(): Promise<{
        success: boolean;
        data: {
            organization: OrgWithHospitals;
            deletion?: OrgWithHospitals['deletion'];
            subscription?: OrgSubscription | null;
        };
    }> {
        return api.get('/organizations/me');
    },

    async confirmSubscriptionChange(payload: {
        planId: string;
        merchantRequestId?: string;
        stripeSessionId?: string;
    }): Promise<{ success: boolean; message: string; data?: { subscription: OrgSubscription } }> {
        return api.post('/organizations/me/subscription/confirm-change', payload);
    },

    async updateMyOrganization(payload: {
        name: string;
        type?: string;
        address?: string;
        phone?: string;
        email?: string;
        licenseNumber?: string;
    }): Promise<{ success: boolean; message: string; data: { organization: OrgWithHospitals } }> {
        return api.put('/organizations/me', payload);
    },

    async removeHospital(hospitalId: string): Promise<{ success: boolean; message: string }> {
        return api.delete(`/organizations/me/hospitals/${hospitalId}`);
    },

    async requestOrgDeletion(
        password: string,
        confirmText: string,
    ): Promise<{
        success: boolean;
        message: string;
        data?: { scheduledPurgeAt: string; graceDays: number; isPaused: boolean };
    }> {
        return api.post('/organizations/me/request-deletion', { password, confirmText });
    },

    async cancelOrgDeletion(token: string): Promise<{ success: boolean; message: string }> {
        return api.post('/organizations/me/cancel-deletion', { token });
    },
};
