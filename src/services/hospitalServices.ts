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
    },

    // Search hospitals (mock implementation for testing)
    async searchHospitals(searchTerm: string): Promise<Hospital[]> {
        // For testing purposes, return mock data
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

        const mockHospitals: Hospital[] = [
            {
                id: '1',
                name: 'Nairobi Hospital',
                address: '123 Uhuru Highway, Nairobi',
                phone: '+254712345678',
                city: 'Nairobi',
                state: 'Nairobi',
                type: 'private',
                totalPatients: 150
            },
            {
                id: '2',
                name: 'Kenyatta National Hospital',
                address: '456 Hospital Road, Nairobi',
                phone: '+254712345679',
                city: 'Nairobi',
                state: 'Nairobi',
                type: 'public',
                totalPatients: 500
            },
            {
                id: '3',
                name: 'Aga Khan University Hospital',
                address: '789 Third Parklands Avenue, Nairobi',
                phone: '+254712345680',
                city: 'Nairobi',
                state: 'Nairobi',
                type: 'private',
                totalPatients: 200
            }
        ];

        // Filter based on search term
        return mockHospitals.filter(hospital =>
            hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            hospital.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            hospital.city.toLowerCase().includes(searchTerm.toLowerCase())
        );
    },

    // Link hospitals to organization after hospital setup
    async linkHospitalsToOrganization(requestData: {
        action: 'join' | 'create';
        hospitalId?: string;
        hospitalData?: {
            name: string;
            type: string;
            address: string;
            phone: string;
            email: string;
        };
    }): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            const response = await api.post('/auth/organization/link-hospitals', requestData);
            return response;
        } catch (error) {
            console.error('Error linking hospitals to organization:', error);
            throw error;
        }
    }
};