// Create a simple fetch function for public endpoints that don't need authentication
async function publicRequest(endpoint: string, options: any = {}) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';
  const fullUrl = `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    // Always try to parse the response body
    const responseData = await response.json().catch(() => ({ error: 'Request failed' }));

    if (!response.ok) {
      // For payment verification, we want to return the backend response even for 400 errors
      // because it contains important payment status information
      if (endpoint.includes('/payments/verify-for-signup') && response.status === 400) {
        return responseData; // Return the backend response directly
      }
      
      throw new Error(responseData.error || `Request failed with status ${response.status}`);
    }

    return responseData;
  } catch (error: unknown) {
    throw error;
  }
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

export interface PaymentRequest {
  planId: string;
  paymentMethod: 'mpesa' | 'card';
  phoneNumber?: string;
  guestEmail?: string; // Add guest email for linking payment
  amount: number;
  eventName?: string;
  description?: string;
  userData?: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    organizationId?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    transactionId: string;
    status: 'pending' | 'completed' | 'failed';
    checkoutRequestId?: string; // For M-Pesa
    merchantRequestId?: string; // For M-Pesa
    guestId?: string; // Guest ID if created
  };
}

export interface MpesaAuthResponse {
  success: boolean;
  access_token: string;
}

export const paymentService = {
  // Get M-Pesa authentication token
  async getMpesaAuth(): Promise<MpesaAuthResponse> {
    try {
      const headers: any = {};
      const apiKey = import.meta.env.VITE_INTERNAL_API_KEY;

      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await publicRequest('/payments/auth', {
        method: 'GET',
        headers
      });

      console.log('✅ M-Pesa auth successful');

      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a connection error (backend not running)
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        throw new Error('Backend server is not running. Please start the backend server and try again.');
      }

      throw new Error('Failed to get M-Pesa authentication token');
    }
  },

  // Process M-Pesa payment
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // First get M-Pesa auth token
      const authResponse = await this.getMpesaAuth();

      if (!authResponse.success) {
        throw new Error('Failed to authenticate with M-Pesa');
      }

      // Then initiate payment with the token
      const paymentData = {
        phoneNumber: request.phoneNumber,
        amount: request.amount,
        accessToken: authResponse.access_token,
        eventName: request.eventName || `${request.planId}_subscription`,
        description: request.description || `Payment for ${request.planId} plan`,
        guestEmail: request.guestEmail, // Include guest email for linking
        userData: request.userData // Pass user data for guest creation
      };

      const headers: any = {};
      const apiKey = import.meta.env.VITE_INTERNAL_API_KEY;
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await publicRequest('/payments/initiate', {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentData)
      });

      console.log('✅ Payment initiated successfully');

      return {
        success: true,
        message: 'Payment initiated successfully',
        data: {
          transactionId: response.MerchantRequestID,
          status: 'pending',
          checkoutRequestId: response.CheckoutRequestID,
          merchantRequestId: response.MerchantRequestID,
          guestId: response.guestId // Include guest ID from response
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a connection error (backend not running)
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        return {
          success: false,
          message: 'Backend server is not running. Please start the backend server on port 5500 and try again.'
        };
      }

      return {
        success: false,
        message: errorMessage || 'Payment processing failed'
      };
    }
  },

  // Get available payment plans
  async getPlans(): Promise<PaymentPlan[]> {
    return [
      {
        id: 'basic',
        name: 'Basic',
        price: 2000,
        currency: 'KES',
        interval: 'month',
        features: [
          'Up to 50 patients',
          'Basic patient management',
          'Simple reporting',
          'Email support'
        ]
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 5000,
        currency: 'KES',
        interval: 'month',
        features: [
          'Up to 200 patients',
          'Advanced patient management',
          'Detailed analytics',
          'Priority support',
          'Custom forms'
        ],
        popular: true
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
          'Advanced integrations',
          '24/7 phone support',
          'Custom branding'
        ]
      }
    ];
  },

  // Check payment status with retry logic
  async checkPaymentStatus(merchantRequestId: string): Promise<{
    success: boolean;
    canProceed: boolean;
    shouldRetry: boolean;
    payment?: any;
    message?: string;
    code?: string;
  }> {
    try {
      const headers: any = {};
      const apiKey = import.meta.env.VITE_INTERNAL_API_KEY;

      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await publicRequest(`/payments/check-status/${merchantRequestId}`, {
        method: 'GET',
        headers
      });

      return {
        success: response.success,
        canProceed: response.success && response.code === 'PAYMENT_COMPLETED',
        shouldRetry: !response.success,
        payment: response.payment,
        message: response.message || response.error,
        code: response.code
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        canProceed: false,
        shouldRetry: true,
        message: errorMessage
      };
    }
  },

  // Verify payment for signup flow
  async verifyPaymentForSignup(merchantRequestId: string, guestEmail?: string): Promise<{
    success: boolean;
    canProceed: boolean;
    shouldRetry: boolean;
    payment?: any;
    message?: string;
    code?: string;
  }> {
    try {
      const headers: any = {};
      const apiKey = import.meta.env.VITE_INTERNAL_API_KEY;

      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await publicRequest('/payments/verify-for-signup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          merchantRequestId,
          guestEmail
        })
      });

      return {
        success: response.success,
        canProceed: response.canProceed,
        shouldRetry: response.shouldRetry,
        payment: response.payment,
        message: response.message || response.error,
        code: response.code
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        canProceed: false,
        shouldRetry: true,
        message: errorMessage
      };
    }
  },

  // Cancel payment (for pending payments)
  async cancelPayment(): Promise<{ success: boolean; message: string }> {
    // For M-Pesa, we can't really cancel an STK push once initiated
    // This is more for UI state management
    return {
      success: true,
      message: 'Payment cancelled successfully'
    };
  },

  // Poll payment status until completion or timeout
  async pollPaymentStatus(
    merchantRequestId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<PaymentResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const statusResponse = await this.checkPaymentStatus(merchantRequestId);

        if (statusResponse.success && statusResponse.canProceed) {
          return {
            success: true,
            message: 'Payment completed successfully',
            data: {
              transactionId: merchantRequestId,
              status: 'completed'
            }
          };
        }

        if (statusResponse.success && !statusResponse.shouldRetry) {
          return {
            success: false,
            message: statusResponse.message || 'Payment failed'
          };
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
      } catch (error: unknown) {
        attempts++;

        if (attempts >= maxAttempts) {
          return {
            success: false,
            message: 'Payment status polling timed out'
          };
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    return {
      success: false,
      message: 'Payment status polling timed out'
    };
  }
};