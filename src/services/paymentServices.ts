/**
 * =========================
 * PUBLIC REQUEST HELPER
 * =========================
 */
async function publicRequest(endpoint: string, options: any = {}) {
  const BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5500/api/v1";

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function apiHeaders() {
  const headers: Record<string, string> = {};
  const key = import.meta.env.VITE_INTERNAL_API_KEY;
  if (key) headers["x-api-key"] = key;
  return headers;
}

/**
 * =========================
 * TYPES
 * =========================
 */
export interface PaymentRequest {
  planId: string;
  paymentMethod: "mpesa" | "card";
  phoneNumber?: string;
  guestEmail?: string;
  features?: string[];
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
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  data?: {
    provider: "mpesa" | "stripe";
    paymentId: string;
    status: "pending" | "processing" | "completed" | "failed";
    // M-Pesa
    merchantRequestId?: string;
    checkoutRequestId?: string;
    // Stripe
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
  /**
   * INITIATE PAYMENT
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await publicRequest("/payments/initiate", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({
          paymentMethod: request.paymentMethod,
          planId: request.planId,
          phoneNumber: request.phoneNumber,
          features: request.features,       // ← add this
          email: request.guestEmail ?? request.userData?.email,
          userData: request.userData,
        }),
      });

      const { provider, data } = response;

      return {
        success: true,
        message: "Payment initiated successfully",
        data: {
          provider,
          paymentId: data.merchantRequestId ?? data.id,
          merchantRequestId: data.merchantRequestId ?? data.id,
          checkoutRequestId: data.checkoutRequestId,
          stripeSessionId: data.id,
          stripeUrl: data.stripeUrl ?? data.url,   // ← prefer explicit alias, fall back to url
          status: "pending",
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * CHECK STATUS (single poll)
   */
  async checkPaymentStatus(merchantRequestId: string) {
    try {
      const response = await publicRequest(
        `/payments/verify/${merchantRequestId}`,
        { method: "GET", headers: apiHeaders() }
      );
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

  /**
   * POLL (M-Pesa — waits for callback to flip status to completed)
   */
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
          message: "Payment completed successfully",
          data: {
            paymentId: merchantRequestId,
            merchantRequestId,
            provider: "mpesa",
            status: "completed",
          },
        };
      }

      if (status.success && !status.shouldRetry) {
        return { success: false, message: status.message || "Payment failed" };
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    return { success: false, message: "Payment verification timed out" };
  },

  /**
   * PLANS (static — mirrors backend PAYMENT_PLANS)
   */
  async getPlans(): Promise<PaymentPlan[]> {
    return [
      {
        id: "basic",
        name: "Basic",
        price: 1,
        currency: "KES",
        interval: "month",
        features: [
          "Up to 50 patients",
          "Basic patient management",
          "Simple reporting",
          "Email support",
        ],
      },
      {
        id: "professional",
        name: "Professional",
        price: 5000,
        currency: "KES",
        interval: "month",
        popular: true,
        features: [
          "Up to 200 patients",
          "Advanced patient management",
          "Analytics",
          "Priority support",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: 10000,
        currency: "KES",
        interval: "month",
        features: [
          "Unlimited patients",
          "Full feature access",
          "Custom integrations",
          "24/7 support",
        ],
      },
    ];
  },
};
