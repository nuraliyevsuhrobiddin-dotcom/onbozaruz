/**
 * OnBozor - Frontend Email Service Client
 * Xavfsiz server-side Resend API'ga murojaat qiladi.
 * Hech qanday Resend secret key frontendda saqlanmaydi.
 */

export interface SendEmailResponse {
  ok: boolean;
  id?: string;
  message?: string;
  error?: string;
}

export interface OrderNotificationPayload {
  orderId: string;
  status: string;
  title: string;
  amount?: string;
}

async function postApi<T>(endpoint: string, body: unknown): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return data as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server bilan aloqa uzildi';
    return {
      ok: false,
      error: message,
    } as T;
  }
}

export const emailService = {
  /**
   * Foydalanuvchiga email tasdiqlash xati yuborish
   */
  async sendVerificationEmail(
    email: string,
    name?: string,
    verificationUrl?: string,
    token?: string
  ): Promise<SendEmailResponse> {
    return postApi<SendEmailResponse>('/api/auth/send-verification', {
      email,
      name,
      verificationUrl,
      token,
    });
  },

  /**
   * Yangi ro'yxatdan o'tgan foydalanuvchiga xush kelibsiz xati
   */
  async sendWelcomeEmail(
    email: string,
    name?: string,
    role?: 'seller' | 'buyer' | 'business' | string
  ): Promise<SendEmailResponse> {
    return postApi<SendEmailResponse>('/api/auth/send-welcome', {
      email,
      name,
      role,
    });
  },

  /**
   * Parolni tiklash xati
   */
  async sendPasswordResetEmail(
    email: string,
    name?: string,
    resetUrl?: string
  ): Promise<SendEmailResponse> {
    return postApi<SendEmailResponse>('/api/auth/send-password-reset', {
      email,
      name,
      resetUrl,
    });
  },

  /**
   * Buyurtma holati o'zgarganda bildirishnoma yuborish
   */
  async sendOrderNotification(
    email: string,
    payload: OrderNotificationPayload,
    name?: string
  ): Promise<SendEmailResponse> {
    return postApi<SendEmailResponse>('/api/send-email', {
      to: email,
      type: 'order_notification',
      payload: {
        ...payload,
        name,
      },
    });
  },

  /**
   * Resend xizmati holatini tekshirish (Health check)
   */
  async checkHealth(): Promise<{ status: string; resendConfigured: boolean; sender: string }> {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch {
      return { status: 'error', resendConfigured: false, sender: 'noreply@onbozar.uz' };
    }
  },
};
