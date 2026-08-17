/**
 * Payment API — uses JWT auth for logged-in users or signup token during onboarding.
 * Never ships internal API keys to the browser.
 */
import { authService } from './authServices';
import { api } from './apiClient';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';

function paymentHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const signupToken = authService.getSignupToken();
  if (signupToken) {
    headers['x-signup-token'] = signupToken;
  }
  return headers;
}

async function paymentRequest(endpoint: string, options: RequestInit = {}) {
  const token = authService.getAccessToken();
  const headers = {
    ...paymentHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: token ? 'include' : options.credentials,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

/**
 * =========================
 * TYPES
 * =========================
 */
export interface PaymentRequest {
  planId: string;
  paymentMethod: 'mpesa' | 'card';
  phoneNumber?: string;
  guestEmail?: string;
  features?: string[];
  organizationId?: string;
  returnTo?: 'onboarding' | 'settings';
  userData?: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    organizationId?: string;
  };
}

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    provider: 'mpesa' | 'stripe';
    paymentId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    merchantRequestId?: string;
    checkoutRequestId?: string;
    stripeSessionId?: string;
    stripeUrl?: string;
  };
}

/**
 * =========================
 * PAYMENT SERVICE
 * =========================
 */
export const paymentService = {
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const payload = {
        paymentMethod: request.paymentMethod,
        planId: request.planId,
        phoneNumber: request.phoneNumber,
        features: request.features,
        email: request.guestEmail ?? request.userData?.email,
        userData: request.userData,
        organizationId: request.organizationId ?? request.userData?.organizationId,
        returnTo: request.returnTo,
      };

      const response = authService.getAccessToken()
        ? await api.post('/payments/initiate', payload)
        : await paymentRequest('/payments/initiate', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      const { provider, data } = response;

      return {
        success: true,
        message: 'Payment initiated successfully',
        data: {
          provider,
          paymentId: data.merchantRequestId ?? data.id,
          merchantRequestId: data.merchantRequestId ?? data.id,
          checkoutRequestId: data.checkoutRequestId,
          stripeSessionId: data.id,
          stripeUrl: data.stripeUrl ?? data.url,
          status: 'pending',
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async checkPaymentStatus(merchantRequestId: string) {
    try {
      const response = authService.getAccessToken()
        ? await api.get(`/payments/verify/${merchantRequestId}`)
        : await paymentRequest(`/payments/verify/${merchantRequestId}`, { method: 'GET' });

      return {
        success: response.success,
        canProceed: response.canProceed,
        shouldRetry: response.shouldRetry !== false,
        payment: response.payment,
        message: response.message,
      };
    } catch (error: unknown) {
      return {
        success: false,
        canProceed: false,
        shouldRetry: true,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async pollPaymentStatus(
    merchantRequestId: string,
    maxAttempts = 30,
    intervalMs = 3000
  ): Promise<PaymentResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkPaymentStatus(merchantRequestId);

      if (status.canProceed) {
        return {
          success: true,
          message: 'Payment completed successfully',
          data: {
            paymentId: merchantRequestId,
            merchantRequestId,
            provider: 'mpesa',
            status: 'completed',
          },
        };
      }

      if (status.success && !status.shouldRetry) {
        return { success: false, message: status.message || 'Payment failed' };
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    return { success: false, message: 'Payment verification timed out' };
  },

  async getPlans(): Promise<PaymentPlan[]> {
    return [
      {
        id: 'basic',
        name: 'Basic',
        price: 1,
        currency: 'KES',
        interval: 'month',
        features: [
          'Up to 50 patients',
          'Basic patient management',
          'Simple reporting',
          'Email support',
        ],
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 5000,
        currency: 'KES',
        interval: 'month',
        popular: true,
        features: [
          'Up to 200 patients',
          'Advanced patient management',
          'Analytics',
          'Priority support',
        ],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 10000,
        currency: 'KES',
        interval: 'month',
        features: [
          'Unlimited patients',
          'Full feature access',
          'Custom integrations',
          '24/7 support',
        ],
      },
    ];
  },
};
