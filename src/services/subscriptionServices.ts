/**
 * =========================
 * HELPERS
 * =========================
 */
async function publicRequest(endpoint: string, options: any = {}) {
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5500/api/v1";

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

async function authenticatedRequest(endpoint: string, options: any = {}) {
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5500/api/v1";
  const { authService } = await import('./authServices');

  // Proactively refresh if the token is close to expiry (mirrors apiClient behaviour)
  await authService.validateAndRefreshToken();

  const token = authService.getAccessToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

/**
 * =========================
 * TYPES
 * =========================
 */
export interface Subscription {
  id: string;
  organizationId: string | null;
  planName: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'expired';
  amount: string;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastRemindedAt: string | null;
  createdAt: string;
  updatedAt: string;
  email:string
}

export interface SubscriptionResponse {
  success: boolean;
  message: string;
  data?: Subscription;
}

/**
 * =========================
 * SUBSCRIPTION SERVICE
 * =========================
 */
export const subscriptionService = {
  /**
   * FETCH SUBSCRIPTION STATUS
   */
  async getSubscription(id?: string): Promise<SubscriptionResponse> {
    try {
      const endpoint = id ? `/subscription/${id}` : "/subscription";
      const response = await authenticatedRequest(endpoint, { method: "GET" });
      return {
        success: true,
        message: response.message || "Subscription data pulled successfully",
        data: response.data,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * INSTANTIATE AN ORPHAN/PRE-PAY SUBSCRIPTION
   */
  async createSubscription(payload: {
    planName: string;
    amount: number;
    currency?: string;
    email:string;
    organizationId?: string;
    durationDays?: number;
  }): Promise<SubscriptionResponse> {
    try {
      const { authService } = await import('./authServices');
      const signupToken = authService.getSignupToken();
      const response = await publicRequest("/subscription", {
        method: "POST",
        headers: signupToken ? { 'x-signup-token': signupToken } : {},
        body: JSON.stringify(payload),
      });
      return {
        success: true,
        message: "Subscription created",
        data: response.data,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * MODIFY SUBSCRIPTION (e.g., Attach Organization ID after M-Pesa Callback)
   */
  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<SubscriptionResponse> {
    try {
      const response = await authenticatedRequest(`/subscription/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return {
        success: true,
        message: "Subscription status synced",
        data: response.data,
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * DELETE SUBSCRIPTION
   */
  async deleteSubscription(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await authenticatedRequest(`/subscription/${id}`, { method: "DELETE" });
      return {
        success: true,
        message: response.message || "Subscription row destroyed",
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
};