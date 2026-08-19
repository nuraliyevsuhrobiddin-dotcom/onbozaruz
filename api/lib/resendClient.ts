import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'OnBozor <noreply@onbozar.uz>';

export const APP_URL =
  process.env.VITE_APP_URL ||
  process.env.APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://onbozar.uz');

export function getResendClient(): Resend {
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY environment variable topilmadi. Vercel dashboard yoki .env.local faylida RESEND_API_KEY ni sozlang.'
    );
  }
  return new Resend(apiKey);
}

export function isResendConfigured(): boolean {
  return Boolean(apiKey && apiKey.trim().length > 0);
}
