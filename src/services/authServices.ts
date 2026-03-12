import { encryption } from '../utils/encryption';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';

export interface LoginCredentials {
  email: string;
  password: string;
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

  logout() {
    this.clearTokens();
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('organization');
    localStorage.removeItem('organizations');
    
    // Clear encryption key
    encryption.clearKey();
  },

  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

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