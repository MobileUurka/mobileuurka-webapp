import { encryption } from '../utils/encryption';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface OTPVerificationData {
  email: string;
  otp: string;
}

export interface ResendOTPData {
  email: string;
}

export interface OrganizationResendVerificationData {
  email: string;
  organizationSlug: string;
}

export interface OrganizationVerifyEmailData {
  email: string;
  otp: string;
  organizationSlug: string;
}

export interface SignupInitiateData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber?: string;
  organizationName: string;
}

export interface SignupVerifyData {
  email: string;
  otp: string;
}

export interface PendingUserData {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  licenseNumber?: string;
  licenseVerified: boolean;
  emailVerified: boolean;
  signupStep: string;
  licenseDetails?: any;
}

export interface CompleteOrganizationData {
  email: string;
  paymentData?: any;
  hospitalData?: {
    hospitals: any[];
  };
}

export interface PaymentIntentData {
  planId: string;
  paymentMethod: string;
  phoneNumber?: string;
}

export interface HospitalSetupData {
  action: 'join' | 'create';
  hospitalId?: string;
  hospitalData?: {
    name: string;
    address: string;
    phone: string;
    type: string;
  };
}

export interface ChangePasswordData {
  email: string;
  oldPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: any;
    userType: 'mobileuurka' | 'organization';
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    encryptionKey: string; // NEW
    organization?: any;
    organizations?: any[];
  };
  code?: string;
  email?: string;
}


export const authService = {

  // Sign in
  async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();


    if (!response.ok) {
      throw data;
    }

    if (data.data) {
      // IMPORTANT: Set encryption key FIRST before storing anything
      encryption.setKey(data.data.encryptionKey);

      // Now store encrypted data
      this.setTokens(data.data.accessToken, data.data.refreshToken);
      this.setUser(data.data.user);
      this.setUserType(data.data.userType);
      if (data.data.sessionId) {
        this.setSessionId(data.data.sessionId);
      }
      if (data.data.organization) {
        this.setOrganization(data.data.organization);
      }
      if (data.data.organizations) {
        this.setOrganizations(data.data.organizations);
      }
    }

    return data;
  },

  // Complete signup with OTP
  async completeSignupWithOTP(data: OTPVerificationData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Resend signup OTP
  async resendSignupOTP(data: ResendOTPData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Resend organization verification email
  async resendOrganizationVerification(data: OrganizationResendVerificationData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/organizations/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Verify organization email with OTP
  async verifyOrganizationEmail(data: OrganizationVerifyEmailData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/organizations/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Initiate signup process
  async initiateSignup(data: SignupInitiateData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Get pending user data for payment/hospital setup
  async getPendingUserData(email: string): Promise<{ success: boolean; data?: PendingUserData; message: string }> {
    const response = await fetch(`${API_URL}/auth/signup/pending-user?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Complete organization creation after payment and hospital setup
  async completeOrganizationCreation(data: CompleteOrganizationData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/organization/create-after-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    if (result.data) {
      // Set encryption key and store auth data
      encryption.setKey(result.data.encryptionKey || 'default-key'); // You might need to get this from another endpoint
      this.setTokens(result.data.accessToken, result.data.refreshToken);
      this.setUser(result.data.user);
      this.setUserType(result.data.userType);
      if (result.data.sessionId) {
        this.setSessionId(result.data.sessionId);
      }
      if (result.data.organization) {
        this.setOrganization(result.data.organization);
      }
    }

    return result;
  },

  // Complete signup process
  async completeSignup(data: HospitalSetupData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Change password
  async changePassword(data: ChangePasswordData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw result;
    }

    return result;
  },

  // Token management with encryption
  setTokens(accessToken: string, refreshToken: string) {
    if (!encryption.hasKey()) {
      console.error('Cannot encrypt: encryption key not set');
      return;
    }

    sessionStorage.setItem('at', encryption.encrypt(accessToken));
    localStorage.setItem('rt', encryption.encrypt(refreshToken));
  },

  getAccessToken(): string | null {
    const encrypted = sessionStorage.getItem('at');
    if (!encrypted) return null;

    if (!encryption.hasKey()) {
      console.error('Cannot decrypt: encryption key not set');
      return null;
    }

    const decrypted = encryption.decrypt(encrypted);
    return decrypted || null;
  },

  getRefreshToken(): string | null {
    const encrypted = localStorage.getItem('rt');
    if (!encrypted) return null;

    if (!encryption.hasKey()) {
      console.error('Cannot decrypt: encryption key not set');
      return null;
    }

    const decrypted = encryption.decrypt(encrypted);
    return decrypted || null;
  },

  clearTokens() {
    sessionStorage.removeItem('at');
    localStorage.removeItem('rt');
  },

  // User management
  setUser(user: any) {
    if (!encryption.hasKey()) {
      localStorage.setItem('user', JSON.stringify(user));
      return;
    }

    const encrypted = encryption.encrypt(JSON.stringify(user));
    localStorage.setItem('user', encrypted);
  },

  getUser(): any | null {
    const stored = localStorage.getItem('user');
    if (!stored) return null;

    if (!encryption.hasKey()) {
      // Try to parse as plain JSON (fallback)
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }

    try {
      const decrypted = encryption.decrypt(stored);
      return decrypted ? JSON.parse(decrypted) : null;
    } catch {
      return null;
    }
  },

  setUserType(userType: string) {
    localStorage.setItem('userType', userType);
  },

  getUserType(): string | null {
    return localStorage.getItem('userType');
  },

  setSessionId(sessionId: string) {
    localStorage.setItem('sessionId', sessionId);
  },

  getSessionId(): string | null {
    return localStorage.getItem('sessionId');
  },

  setOrganization(organization: any) {
    if (!encryption.hasKey()) {
      localStorage.setItem('organization', JSON.stringify(organization));
      return;
    }

    const encrypted = encryption.encrypt(JSON.stringify(organization));
    localStorage.setItem('organization', encrypted);
  },

  getOrganization(): any | null {
    const stored = localStorage.getItem('organization');
    if (!stored) return null;

    if (!encryption.hasKey()) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }

    try {
      const decrypted = encryption.decrypt(stored);
      return decrypted ? JSON.parse(decrypted) : null;
    } catch {
      return null;
    }
  },

  setOrganizations(organizations: any[]) {
    if (!encryption.hasKey()) {
      localStorage.setItem('organizations', JSON.stringify(organizations));
      return;
    }

    const encrypted = encryption.encrypt(JSON.stringify(organizations));
    localStorage.setItem('organizations', encrypted);
  },

  getOrganizations(): any[] | null {
    const stored = localStorage.getItem('organizations');
    if (!stored) return null;

    if (!encryption.hasKey()) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }

    try {
      const decrypted = encryption.decrypt(stored);
      return decrypted ? JSON.parse(decrypted) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
  async logout(): Promise<{ success: boolean; message: string }> {
    // 1. Get the decrypted tokens and the plain sessionId
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const sessionId = this.getSessionId();

    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use the decrypted accessToken for the Bearer header
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ refreshToken, sessionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    // 2. Clear everything on success
    this.clearTokens();
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('organization');
    localStorage.removeItem('organizations');

    // 3. Wipe the encryption key from memory
    encryption.clearKey();
    return data;
  },



  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    try {
      console.log('Attempting to refresh token...');
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      console.log('Refresh response:', { status: response.status, success: data.success });

      if (response.ok && data.data?.accessToken) {
        if (!encryption.hasKey()) {
          console.error('Cannot encrypt new token: encryption key not set');
          return null;
        }

        // Store both new access token and refresh token
        sessionStorage.setItem('at', encryption.encrypt(data.data.accessToken));
        if (data.data.refreshToken) {
          localStorage.setItem('rt', encryption.encrypt(data.data.refreshToken));
        }

        // Update session ID if provided
        if (data.data.sessionId) {
          this.setSessionId(data.data.sessionId);
        }

        console.log('Token refresh successful');
        return data.data.accessToken;
      }

      // If refresh failed, clear tokens and redirect to login
      if (response.status === 401) {
        console.warn('Refresh token expired, logging out user');
        this.logout();
        window.dispatchEvent(new Event('auth-logout'));
      }

      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  },

  // Enhanced token validation with automatic refresh
  async validateAndRefreshToken(): Promise<boolean> {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      // No access token, try to refresh
      const newToken = await this.refreshToken();
      return !!newToken;
    }

    // Check if token is close to expiring (within 5 minutes)
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      // If token expires within 5 minutes, refresh it proactively
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('Token expiring soon, refreshing proactively');
        const newToken = await this.refreshToken();
        return !!newToken;
      }

      return true;
    } catch (error) {
      // If we can't parse the token, try to refresh
      console.warn('Could not parse access token, attempting refresh');
      const newToken = await this.refreshToken();
      return !!newToken;
    }
  },

  async initializeEncryption(): Promise<boolean> {
    try {
      const hasSession = !!localStorage.getItem('rt') || !!sessionStorage.getItem('at');

      // No data? Return false so App redirects to Auth
      if (!hasSession) return false;

      // Fetch the key to decrypt the existing data
      const response = await fetch(`${API_URL}/auth/encryption-key`);
      const result = await response.json();

      if (result.success && result.data.key) {
        encryption.setKey(result.data.key);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Initialization Error:', error);
      return false;
    }
  }
};