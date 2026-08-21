/**
 * OnBozor - Email HTML and Text Templates (Resend)
 * Domain: onbozar.uz | Sender: noreply@onbozar.uz
 */

interface BaseEmailProps {
  previewText?: string;
  bodyContent: string;
}

function baseEmailLayout({ previewText = '', bodyContent }: BaseEmailProps): string {
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>OnBozor</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #5b35f5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; color: #e0e7ff; font-size: 13px; font-weight: 500; }
    .content { padding: 36px 32px; background-color: #ffffff; }
    .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #5b35f5 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(91, 53, 245, 0.25); text-align: center; }
    .badge { display: inline-block; padding: 6px 14px; background-color: #ede9fe; color: #5b35f5; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .code-box { background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #1e293b; margin: 24px 0; }
    .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px !important; }
      .header { padding: 24px 16px !important; }
      .footer { padding: 20px 16px !important; }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;padding:32px 12px;">
    <tr>
      <td align="center">
        <div class="email-container">
          <div class="header">
            <h1>OnBozor</h1>
            <p>Qishloq xo‘jaligi va savdo platformasi</p>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p style="margin:0 0 8px 0;"><strong>OnBozor O‘zbekiston</strong> &bull; <a href="https://onbozar.uz" style="color:#5b35f5;text-decoration:none;">onbozar.uz</a></p>
            <p style="margin:0 0 8px 0;">Ushbu xat avtomatik tarzda <strong>noreply@onbozar.uz</strong> manzilidan yuborildi. Unga javob yozmang.</p>
            <p style="margin:0;color:#94a3b8;">&copy; ${new Date().getFullYear()} OnBozor. Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Email Verification / Tasdiqlash
 */
export interface VerificationEmailProps {
  name?: string;
  verificationUrl?: string;
  token?: string;
}

export function getVerificationEmailTemplate({ name, verificationUrl, token }: VerificationEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = name ? `Assalomu alaykum, ${name}!` : 'Assalomu alaykum!';
  const link = verificationUrl || 'https://onbozar.uz';

  const bodyContent = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge">Emailni tasdiqlash</span>
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center;">
      ${greeting}
    </h2>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
      OnBozor platformasida ro‘yxatdan o‘tganingiz uchun rahmat. Akkauntingizni faollashtirish va xavfsizligini ta’minlash uchun emailingizni tasdiqlang.
    </p>

    ${token ? `
      <div style="text-align: center;">
        <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">Sizning tasdiqlash kodingiz:</p>
        <div class="code-box">${token}</div>
      </div>
    ` : ''}

    ${verificationUrl ? `
      <div style="text-align: center; margin: 28px 0;">
        <a href="${link}" class="btn" target="_blank" rel="noopener noreferrer">
          Emailni tasdiqlash
        </a>
      </div>
      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center;">
        Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalab qo‘ying:<br>
        <a href="${link}" style="color: #5b35f5; word-break: break-all;">${link}</a>
      </p>
    ` : ''}

    <div class="info-card" style="margin-top: 32px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        🔒 <strong>Xavfsizlik eslatmasi:</strong> Agar siz OnBozor'da ro‘yxatdan o‘tmagan bo‘lsangiz, ushbu xatni e’tiborsiz qoldiring. Akkaunt faollashtirilmaydi.
      </p>
    </div>
  `;

  const html = baseEmailLayout({
    previewText: 'OnBozor hisobingizni faollashtirish uchun emailni tasdiqlang',
    bodyContent,
  });

  const text = `${greeting}\n\nOnBozor platformasida ro'yxatdan o'tganingiz uchun rahmat.\n\nHisobingizni tasdiqlash uchun havola:\n${link}\n\n${token ? `Tasdiqlash kodi: ${token}\n\n` : ''}Agar siz ushbu hisobni ochmagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring.\n\nOnBozor jamoasi\nonbozar.uz`;

  return {
    subject: 'OnBozor — Email manzilingizni tasdiqlang',
    html,
    text,
  };
}

/**
 * 2. Welcome Email / Xush kelibsiz
 */
export interface WelcomeEmailProps {
  name?: string;
  role?: 'seller' | 'buyer' | 'business' | string;
}

export function getWelcomeEmailTemplate({ name, role = 'seller' }: WelcomeEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = name ? `Assalomu alaykum, ${name}!` : 'Assalomu alaykum!';
  const roleText = role === 'business' ? 'Biznes hamkor' : role === 'seller' ? 'Sotuvchi' : 'Xaridor';

  const bodyContent = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge">Xush kelibsiz</span>
    </div>
    <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; text-align: center;">
      ${greeting} OnBozor oilasiga xush kelibsiz! 🛍️
    </h2>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
      Sizning <strong>${roleText}</strong> sifatidagi profilingiz muvaffaqiyatli faollashtirildi. Endi siz O‘zbekiston bo‘ylab eng yaxshi mahsulotlar savdosida bevosita ishtirok etishingiz mumkin.
    </p>

    <div class="info-card">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #1e293b;">🚀 Endi nima qilishingiz mumkin?</h3>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
        <li>E’lonlar joylashtiring va mahsulotlaringizni minglab xaridorlarga ko‘rsating</li>
        <li>Bozor narxlarini real vaqtda kuzating</li>
        <li>Xaridorlar va sotuvchilar bilan to‘g‘ridan-to‘g‘ri bog‘laning</li>
        <li>Buyurtmalaringizni shaxsiy kabinet orqali boshqaring</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 28px 0 16px 0;">
      <a href="https://onbozar.uz/#home" class="btn" target="_blank" rel="noopener noreferrer">
        OnBozorga o‘tish
      </a>
    </div>
  `;

  const html = baseEmailLayout({
    previewText: `OnBozorga xush kelibsiz! ${roleText} profilingiz muvaffaqiyatli yaratildi.`,
    bodyContent,
  });

  const text = `${greeting}\n\nOnBozor platformasiga xush kelibsiz! Sizning ${roleText} profilingiz faollashtirildi.\n\nPlatformaga kirish: https://onbozar.uz\n\nOnBozor jamoasi`;

  return {
    subject: 'OnBozor platformasiga xush kelibsiz! 🌱',
    html,
    text,
  };
}

/**
 * 3. Password Reset / Parolni tiklash
 */
export interface PasswordResetEmailProps {
  name?: string;
  resetUrl: string;
}

export function getPasswordResetEmailTemplate({ name, resetUrl }: PasswordResetEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = name ? `Assalomu alaykum, ${name}!` : 'Assalomu alaykum!';

  const bodyContent = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge" style="background-color: #fee2e2; color: #dc2626;">Xavfsizlik</span>
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center;">
      ${greeting}
    </h2>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
      Sizning OnBozor profilingiz uchun parolni qayta tiklash so‘rovi qabul qilindi. Yangi parol o‘rnatish uchun quyidagi tugmani bosing:
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${resetUrl}" class="btn" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);" target="_blank" rel="noopener noreferrer">
        Parolni tiklash
      </a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center;">
      Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:<br>
      <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
    </p>

    <div class="info-card" style="margin-top: 32px; border-left: 4px solid #dc2626;">
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        ⚠️ <strong>Muhim:</strong> Ushbu havola xavfsizlik maqsadida cheklangan vaqt davomida amal qiladi. Agar siz bunday so‘rov yubormagan bo‘lsangiz, hech qanday amal bajarmang — parolingiz o‘zgarmaydi.
      </p>
    </div>
  `;

  const html = baseEmailLayout({
    previewText: 'OnBozor hisobingiz parolini tiklash so‘rovi',
    bodyContent,
  });

  const text = `${greeting}\n\nOnBozor profilingiz uchun parolni qayta tiklash so'rovi qabul qilindi.\n\nParolni tiklash havolasi:\n${resetUrl}\n\nAgar bu so'rovni siz yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.\n\nOnBozor jamoasi`;

  return {
    subject: 'OnBozor — Parolni tiklash so‘rovi',
    html,
    text,
  };
}

/**
 * 4. Order / Notification Email
 */
export interface OrderNotificationEmailProps {
  name?: string;
  orderId: string;
  status: string;
  title: string;
  amount?: string;
}

export function getOrderNotificationEmailTemplate({
  name,
  orderId,
  status,
  title,
  amount,
}: OrderNotificationEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = name ? `Assalomu alaykum, ${name}!` : 'Assalomu alaykum!';

  const bodyContent = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge">Buyurtma holati</span>
    </div>
    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center;">
      ${greeting}
    </h2>
    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
      Sizning buyurtmangiz holati yangilandi:
    </p>

    <div class="info-card">
      <table width="100%" cellspacing="0" cellpadding="6" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="color:#64748b;width:120px;"><strong>Buyurtma ID:</strong></td>
          <td><code>${orderId}</code></td>
        </tr>
        <tr>
          <td style="color:#64748b;"><strong>Mahsulot:</strong></td>
          <td><strong>${title}</strong></td>
        </tr>
        <tr>
          <td style="color:#64748b;"><strong>Yangi holat:</strong></td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#e0f2fe;color:#0369a1;font-weight:700;font-size:12px;">${status}</span></td>
        </tr>
        ${amount ? `
        <tr>
          <td style="color:#64748b;"><strong>Summa:</strong></td>
          <td><strong style="color:#16a34a;">${amount}</strong></td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://onbozar.uz/#profile" class="btn" target="_blank" rel="noopener noreferrer">
        Buyurtmani ko‘rish
      </a>
    </div>
  `;

  const html = baseEmailLayout({
    previewText: `Buyurtma #${orderId} holati: ${status}`,
    bodyContent,
  });

  const text = `${greeting}\n\nBuyurtma #${orderId} holati yangilandi: ${status}\nMahsulot: ${title}\n\nBatafsil: https://onbozar.uz/#profile\n\nOnBozor jamoasi`;

  return {
    subject: `OnBozor — Buyurtma holati yangilandi (#${orderId})`,
    html,
    text,
  };
}
