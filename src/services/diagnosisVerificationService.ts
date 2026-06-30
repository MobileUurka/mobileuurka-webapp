import { api } from './apiClient';

export interface VerificationPayload {
    patientId: string;
    patientName?: string;
    diagnosisText: string;
    riskLevel?: string;
    isAccurate: boolean;
    obgynNotes?: string;
    sourceType: 'predisposition' | 'symptom_report';
    sourceId?: string;
}

export interface VerificationEntry {
    id: string;
    patientId: string;
    patientName: string | null;
    diagnosisText: string;
    riskLevel: string | null;
    isAccurate: boolean;
    obgynNotes: string | null;
    verifiedBy: string;
    verifiedByName: string | null;
    verifiedByRole: string | null;
    sourceType: 'predisposition' | 'symptom_report';
    sourceId: string | null;
    createdAt: string;
    updatedAt: string;
}

export const diagnosisVerificationService = {
    async submit(payload: VerificationPayload): Promise<{ success: boolean; message: string; data: { verification: VerificationEntry } }> {
        return api.post('/diagnosis-verification', payload);
    },

    async getPatientVerifications(patientId: string): Promise<{ success: boolean; data: { verifications: VerificationEntry[]; total: number } }> {
        return api.get(`/diagnosis-verification/patient/${patientId}`);
    },

    async getSourceVerifications(sourceType: 'predisposition' | 'symptom_report', sourceId: string): Promise<{ success: boolean; data: { verifications: VerificationEntry[]; total: number } }> {
        return api.get(`/diagnosis-verification/source/${sourceType}/${sourceId}`);
    },

    async getAll(filters?: { sourceType?: string; patientId?: string }): Promise<{ success: boolean; data: { verifications: VerificationEntry[]; total: number } }> {
        const params = new URLSearchParams();
        if (filters?.sourceType) params.set('sourceType', filters.sourceType);
        if (filters?.patientId) params.set('patientId', filters.patientId);
        const query = params.toString();
        return api.get(`/diagnosis-verification${query ? `?${query}` : ''}`);
    },

    async updateVerification(
        id: string,
        isAccurate?: boolean,
        obgynNotes?: string,
    ): Promise<{ success: boolean; message: string; data: { verification: VerificationEntry } }> {
        return api.patch(`/diagnosis-verification/${id}`, { isAccurate, obgynNotes });
    },

    async deleteVerification(id: string): Promise<{ success: boolean; message: string }> {
        return api.delete(`/diagnosis-verification/${id}`);
    },
};
