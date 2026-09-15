/**
 * OnBozar - Frontend Email Service Client
 * Welcome xati autentifikatsiyalangan server endpointidan yuboriladi.
 * Confirmation va password-reset xatlarini token egasi bo'lgan Supabase Auth
 * yuboradi; frontend hech qachon Resend orqali erkin HTML/recipient bermaydi.
 */
import { getAuthCallbackUrl, getSupabaseAccessToken, supabaseClient } from './authClient';

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

async function postApi<T>(endpoint: string, body: unknown, requireAuth = false): Promise<T> {
  try {
    const accessToken = requireAuth ? await getSupabaseAccessToken() : null;
    if (requireAuth && !accessToken) {
      return { ok: false, error: 'Bu amal uchun qaytadan tizimga kiring.' } as T;
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
    _name?: string,
    _verificationUrl?: string,
    _token?: string
  ): Promise<SendEmailResponse> {
    if (!supabaseClient) return { ok: false, error: 'Supabase sozlanmagan.' };
    const { error } = await supabaseClient.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    return error ? { ok: false, error: error.message } : { ok: true, message: 'Tasdiqlash havolasi yuborildi.' };
  },

  /**
   * Yangi ro'yxatdan o'tgan foydalanuvchiga xush kelibsiz xati
   */
  async sendWelcomeEmail(
    _email: string,
    _name?: string,
    _role?: 'seller' | 'buyer' | 'business' | string
  ): Promise<SendEmailResponse> {
    return postApi<SendEmailResponse>('/api/auth/send-welcome', {}, true);
  },

  /**
   * Parolni tiklash xati
   */
  async sendPasswordResetEmail(
    email: string,
    _name?: string,
    _resetUrl?: string
  ): Promise<SendEmailResponse> {
    if (!supabaseClient) return { ok: false, error: 'Supabase sozlanmagan.' };
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getAuthCallbackUrl(),
    });
    return error ? { ok: false, error: error.message } : { ok: true, message: 'Parolni tiklash havolasi yuborildi.' };
  },

  /**
   * Buyurtma holati o'zgarganda bildirishnoma yuborish
   */
  async sendOrderNotification(
    _email: string,
    _payload: OrderNotificationPayload,
    _name?: string
  ): Promise<SendEmailResponse> {
    return {
      ok: false,
      error: 'Buyurtma xabarlari Supabase bildirishnomalari orqali yuboriladi.',
    };
  },

  /**
   * Resend xizmati holatini tekshirish (Health check)
   */
  async checkHealth(): Promise<{ status: string }> {
    try {
      const res = await fetch('/api/health');
      return await res.json();
    } catch {
      return { status: 'error' };
    }
  },
};
