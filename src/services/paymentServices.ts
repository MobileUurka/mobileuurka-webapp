const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';

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
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    transactionId: string;
    status: 'pending' | 'completed' | 'failed';
    checkoutRequestId?: string; // For M-Pesa
  };
}

export const paymentService = {
  // Process payment (mock implementation for testing)
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For testing purposes, always return success
    const transactionId = `TXN_${Date.now()}`;
    
    return {
      success: true,
      message: 'Payment processed successfully',
      data: {
        transactionId,
        status: 'completed',
        checkoutRequestId: request.paymentMethod === 'mpesa' ? `CHK_${Date.now()}` : undefined
      }
    };
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

  // Check payment status (mock implementation)
  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'Payment status retrieved',
      data: {
        transactionId,
        status: 'completed'
      }
    };
  },

  // Cancel payment (mock implementation)
  async cancelPayment(transactionId: string): Promise<{ success: boolean; message: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'Payment cancelled successfully'
    };
  }
};