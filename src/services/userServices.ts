import { api } from './apiClient';
import { authService } from './authServices';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  // add other fields based on your sanitizeUser output
}

export const userService = {
  /**
   * Fetches users for an organization.
   * If the logged-in user is Mobileuurka, it requires an orgId.
   */
  getUsers: async (orgIdForAdmin?: string): Promise<User[]> => {
    const currentUser = authService.getUser();
    let endpoint = '/users';

    // Logic: If I am a super admin, I must attach the orgId to the URL
    if (currentUser?.userType === 'mobileuurka') {
      if (!orgIdForAdmin) {
        throw new Error("Organization ID is required for Mobileuurka admins");
      }
      endpoint = `/users?orgId=${orgIdForAdmin}`;
    }

    const response = await api.get(endpoint);
    return response.data.users;
  },

  /**
   * Create a new user (Staff) - Legacy method
   */
  createUser: async (userData: any, orgIdForAdmin?: string) => {
    let endpoint = '/users';

    // If super admin is creating a user for a specific hospital
    if (authService.getUser()?.userType === 'mobileuurka' && orgIdForAdmin) {
      endpoint = `/users?orgId=${orgIdForAdmin}`;
    }

    return await api.post(endpoint, userData);
  },

  /**
   * Add user to organization - New method based on your API
   */
  addUserToOrganization: async (organizationId: string, userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    hospital?: string;
  }) => {
    return await api.post(`/organizations/${organizationId}/users`, userData);
  },

  /**
   * Get a single user by ID
   */
  getUserById: async (userId: string) => {
    return await api.get(`/users/${userId}`);
  },

  /**
   * Update user details
   */
  updateUser: async (userId: string, updateData: any) => {
    return await api.put(`/users/${userId}`, updateData);
  },

  /**
   * Soft delete a user
   */
  deleteUser: async (userId: string) => {
    return await api.delete(`/users/${userId}`);
  }
};