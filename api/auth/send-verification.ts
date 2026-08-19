import type { IncomingMessage, ServerResponse } from 'http';
import { getResendClient, DEFAULT_FROM_EMAIL, APP_URL } from '../lib/resendClient';
import { getVerificationEmailTemplate } from '../lib/emailTemplates';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Faqat POST so‘rovlari qabul qilinadi.' }));
    return;
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await parseJsonBody(req);
    const { email, name, verificationUrl, token } = body;

    if (!email || typeof email !== 'string' || !isValidEmail(email.trim())) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Yaroqli email manzili kiritilmadi.' }));
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const finalUrl = (verificationUrl as string) || `${APP_URL}/auth/callback`;

    const { subject, html, text } = getVerificationEmailTemplate({
      name: name ? String(name) : undefined,
      verificationUrl: finalUrl,
      token: token ? String(token) : undefined,
    });

    const resend = getResendClient();
    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: cleanEmail,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error('[Resend Verification Error]', result.error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: result.error.message || 'Email yuborishda xatolik yuz berdi.' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      id: result.data?.id,
      message: 'Tasdiqlash xati muvaffaqiyatli yuborildi.',
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda kutilmagan xatolik';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}
