import type { IncomingMessage, ServerResponse } from 'http';
import { getResendClient, DEFAULT_FROM_EMAIL } from '../lib/resendClient';
import { getWelcomeEmailTemplate } from '../lib/emailTemplates';
import { requireAuthenticatedUser, sendApiJson } from '../lib/supabaseAuth';

const rateLimit = new Map<string, number>();
const WELCOME_COOLDOWN_MS = 10 * 60 * 1000;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendApiJson(res, 405, { ok: false, error: 'Faqat POST so\'rovi qabul qilinadi.' });
    return;
  }

  const user = await requireAuthenticatedUser(req, res);
  if (!user) return;

  const lastSent = rateLimit.get(user.id) || 0;
  if (Date.now() - lastSent < WELCOME_COOLDOWN_MS) {
    sendApiJson(res, 429, { ok: false, error: 'Xush kelibsiz xati yaqinda yuborilgan.' });
    return;
  }

  try {
    const email = user.email?.trim().toLowerCase();
    if (!email) {
      sendApiJson(res, 400, { ok: false, error: 'Akkauntingizda email manzili topilmadi.' });
      return;
    }

    // Never trust a request body for recipient or template data. This limits
    // welcome mail to the verified owner of the bearer token.
    const name = typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name.slice(0, 120)
      : undefined;
    const rawRole = user.user_metadata?.role;
    const role = rawRole === 'business' || rawRole === 'seller' || rawRole === 'buyer'
      ? rawRole
      : 'seller';
    const { subject, html, text } = getWelcomeEmailTemplate({ name, role });

    const result = await getResendClient().emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: email,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error('[Resend Welcome Error]', result.error);
      sendApiJson(res, 500, { ok: false, error: 'Email yuborishda xatolik yuz berdi.' });
      return;
    }

    rateLimit.set(user.id, Date.now());
    sendApiJson(res, 200, {
      ok: true,
      id: result.data?.id,
      message: 'Xush kelibsiz xati muvaffaqiyatli yuborildi.',
    });
  } catch {
    sendApiJson(res, 500, { ok: false, error: 'Email yuborishda xatolik yuz berdi.' });
  }
}
