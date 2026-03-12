import { api } from './apiClient';

export interface Hospital {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    city: string;
    state: string;
    type: string;
    totalPatients: number;
}

export interface HospitalsResponse {
    success: boolean;
    data: {
        hospitals: Hospital[];
        pagination?: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

export const hospitalService = {
    async getHospitals(organizationId: string, params?: { page?: number; limit?: number }): Promise<Hospital[]> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());

            const url = `/organizations/${organizationId}/hospitals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await api.get(url);
            
            
            // Handle different possible response structures
            if (response.hospitals) {
                return response.hospitals;
            } else if (response.data?.hospitals) {
                return response.data.hospitals;
            } else if (Array.isArray(response)) {
                return response;
            } else if (response.data && Array.isArray(response.data)) {
                return response.data;
            }
            
            console.warn('Unexpected response structure:', response);
            return [];
        } catch (error) {
            console.error('Error fetching hospitals:', error);
            throw error;
        }
    },

    async getAvailableHospitals(): Promise<Hospital[]> {
        try {
            const response = await api.get('/organizations/hospitals/available');
            
            console.log('Available Hospitals API Response:', response); // Debug log
            
            // Handle different possible response structures
            if (response.hospitals) {
                return response.hospitals;
            } else if (response.data?.hospitals) {
                return response.data.hospitals;
            } else if (Array.isArray(response)) {
                return response;
            } else if (response.data && Array.isArray(response.data)) {
                return response.data;
            }
            
            console.warn('Unexpected response structure:', response);
            return [];
        } catch (error) {
            console.error('Error fetching available hospitals:', error);
            throw error;
        }
    },

    async createHospital(hospitalData: {
        name: string;
        type?: string;
        address?: string;
        phone?: string;
        email?: string;
        city?: string;
        state?: string;
        country?: string;
        licenseNumber?: string;
    }): Promise<Hospital> {
        try {
            const response = await api.post('/organizations/hospitals/create', hospitalData);
            
            if (response.data?.hospital) {
                return response.data.hospital;
            } else if (response.hospital) {
                return response.hospital;
            }
            
            throw new Error('Unexpected response structure');
        } catch (error) {
            console.error('Error creating hospital:', error);
            throw error;
        }
    },

    async linkHospitalToOrganization(hospitalId: string): Promise<Hospital> {
        try {
            const response = await api.post('/organizations/hospitals/link', { hospitalId });
            
            if (response.data?.hospital) {
                return response.data.hospital;
            } else if (response.hospital) {
                return response.hospital;
            }
            
            throw new Error('Unexpected response structure');
        } catch (error) {
            console.error('Error linking hospital:', error);
            throw error;
        }
    },

    async getAllHospitals(search?: string): Promise<Hospital[]> {
        try {
            const queryParams = new URLSearchParams();
            if (search) queryParams.append('search', search);

            const url = `/organizations/hospitals/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await api.get(url);
            
            console.log('All Hospitals API Response:', response); // Debug log
            
            // Handle different possible response structures
            if (response.hospitals) {
                return response.hospitals;
            } else if (response.data?.hospitals) {
                return response.data.hospitals;
            } else if (Array.isArray(response)) {
                return response;
            } else if (response.data && Array.isArray(response.data)) {
                return response.data;
            }
            
            console.warn('Unexpected response structure:', response);
            return [];
        } catch (error) {
            console.error('Error fetching all hospitals:', error);
            throw error;
        }
    }
};