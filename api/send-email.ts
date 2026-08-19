import type { IncomingMessage, ServerResponse } from 'http';
import { getResendClient, DEFAULT_FROM_EMAIL } from './lib/resendClient';
import {
  getVerificationEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordResetEmailTemplate,
  getOrderNotificationEmailTemplate,
} from './lib/emailTemplates';

// Simple in-memory rate limiting map for basic spam protection
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  entry.count += 1;
  return false;
}

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

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse) {
  // CORS Headers
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

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Juda ko‘p so‘rov yuborildi. Iltimos, 1 daqiqadan so‘ng qayta urinib ko‘ring.' }));
    return;
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : await parseJsonBody(req);
    const { to, type, payload, customSubject, customHtml, customText } = body;

    if (!to || typeof to !== 'string' || !isValidEmail(to.trim())) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Yaroqli email manzili kiritilmadi.' }));
      return;
    }

    const cleanEmail = to.trim().toLowerCase();
    let subject = customSubject || 'OnBozor Bildirishnomasi';
    let html = customHtml || '';
    let text = customText || '';

    // Handle template types
    if (type === 'verification') {
      const template = getVerificationEmailTemplate(payload || {});
      subject = template.subject;
      html = template.html;
      text = template.text;
    } else if (type === 'welcome') {
      const template = getWelcomeEmailTemplate(payload || {});
      subject = template.subject;
      html = template.html;
      text = template.text;
    } else if (type === 'password_reset') {
      const template = getPasswordResetEmailTemplate(payload || {});
      subject = template.subject;
      html = template.html;
      text = template.text;
    } else if (type === 'order_notification') {
      const template = getOrderNotificationEmailTemplate(payload || {});
      subject = template.subject;
      html = template.html;
      text = template.text;
    }

    if (!html && !text) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Email matni yoki andoza turi ko‘rsatilmadi.' }));
      return;
    }

    const resend = getResendClient();
    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: cleanEmail,
      subject,
      html,
      text,
    });

    if (result.error) {
      console.error('[Resend Error]', result.error);
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
      message: 'Email muvaffaqiyatli yuborildi.',
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Serverda kutilmagan xatolik yuz berdi';
    console.error('[API send-email Error]', message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}
