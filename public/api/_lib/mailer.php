<?php
/**
 * Transactional e-mail: Resend API when a key is configured, otherwise the
 * hosting's PHP mail() (cPanel/Exim). Templates follow the old Resend ones.
 */
defined('MB_API') or exit;

class Mailer
{
    public static function send($to, $subject, $html, $text)
    {
        $from = (string)mb_config('mail_from');
        $key = trim((string)mb_config('resend_api_key'));
        if ($key !== '' && function_exists('curl_init')) {
            $ch = curl_init('https://api.resend.com/emails');
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode(['from' => $from, 'to' => [$to], 'subject' => $subject, 'html' => $html, 'text' => $text]),
            ]);
            $res = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($status >= 200 && $status < 300) return true;
            error_log('[MollBazar] Resend failed (' . $status . '): ' . substr((string)$res, 0, 300));
            return false;
        }
        $boundary = 'mb' . bin2hex(random_bytes(8));
        $headers = [
            'MIME-Version: 1.0',
            'From: ' . $from,
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];
        $body = self::mimeBody($html, $text, $boundary);
        $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
        // Envelope sender on our own domain, so SPF/DMARC line up with the From address.
        $params = preg_match('/<([^<>\s]+@[^<>\s]+)>|^([^<>\s]+@[^<>\s]+)$/', trim($from), $m)
            ? '-f' . ($m[1] !== '' ? $m[1] : $m[2]) : '';
        $ok = @mail($to, $encodedSubject, $body, implode("\r\n", $headers), $params);
        if (!$ok) error_log('[MollBazar] mail() failed for ' . $to);
        return $ok;
    }

    /**
     * Both parts quoted-printable, so no line exceeds 76 characters. The HTML
     * templates are one long line; sent raw, Exim bounces them with "message has
     * lines too long for transport" (SMTP allows at most 998 per line).
     */
    public static function mimeBody($html, $text, $boundary)
    {
        $part = function ($type, $content) use ($boundary) {
            $encoded = quoted_printable_encode(str_replace(["\r\n", "\r"], "\n", (string)$content));
            return "--$boundary\r\nContent-Type: $type; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
                . preg_replace("/(?<!\r)\n/", "\r\n", $encoded) . "\r\n";
        };
        return $part('text/plain', $text) . $part('text/html', $html) . "--$boundary--\r\n";
    }

    private static function e($s)
    {
        return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
    }

    private static function layout($preview, $content)
    {
        $year = date('Y');
        return '<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
            . '<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">'
            . '<div style="display:none;max-height:0;overflow:hidden;">' . self::e($preview) . '</div>'
            . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 12px;"><tr><td align="center">'
            . '<table role="presentation" width="100%" style="max-width:600px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">'
            . '<tr><td style="background:linear-gradient(135deg,#5b35f5 0%,#7c3aed 100%);background-color:#5b35f5;padding:32px 24px;text-align:center;">'
            . '<h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;">MollBazar</h1>'
            . '<p style="margin:6px 0 0;color:#e0e7ff;font-size:13px;">O‘zbekiston agro-savdo platformasi</p></td></tr>'
            . '<tr><td style="padding:36px 32px;">' . $content . '</td></tr>'
            . '<tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">'
            . '<p style="margin:0 0 8px;"><strong>MollBazar O‘zbekiston</strong> &bull; <a href="https://mollbazar.uz" style="color:#5b35f5;text-decoration:none;">mollbazar.uz</a></p>'
            . '<p style="margin:0;color:#94a3b8;">&copy; ' . $year . ' MollBazar. Barcha huquqlar himoyalangan.</p></td></tr>'
            . '</table></td></tr></table></body></html>';
    }

    private static function button($url, $label)
    {
        return '<div style="text-align:center;margin:28px 0 16px;"><a href="' . self::e($url) . '" style="display:inline-block;background:#5b35f5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">'
            . self::e($label) . '</a></div><p style="font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">Tugma ishlamasa, havolani brauzerga nusxalang:<br>'
            . '<a href="' . self::e($url) . '" style="color:#5b35f5;word-break:break-all;">' . self::e($url) . '</a></p>';
    }

    public static function confirmation($to, $name, $url)
    {
        $greet = $name ? 'Assalomu alaykum, ' . self::e($name) . '!' : 'Assalomu alaykum!';
        $content = '<h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">' . $greet . '</h2>'
            . '<p style="font-size:15px;color:#475569;line-height:1.6;text-align:center;">MollBazar’da ro‘yxatdan o‘tganingiz uchun rahmat. Email manzilingizni tasdiqlash uchun quyidagi tugmani bosing.</p>'
            . self::button($url, 'Emailni tasdiqlash')
            . '<p style="font-size:13px;color:#64748b;text-align:center;">Havola 24 soat amal qiladi. Agar siz ro‘yxatdan o‘tmagan bo‘lsangiz, bu xatni e’tiborsiz qoldiring.</p>';
        return self::send($to, 'MollBazar: email manzilingizni tasdiqlang', self::layout('Email manzilingizni tasdiqlang', $content),
            "$greet\n\nEmail manzilingizni tasdiqlash uchun havola:\n$url\n\nMollBazar jamoasi");
    }

    public static function recovery($to, $name, $url)
    {
        $greet = $name ? 'Assalomu alaykum, ' . self::e($name) . '!' : 'Assalomu alaykum!';
        $content = '<div style="text-align:center;margin-bottom:16px;"><span style="display:inline-block;padding:6px 14px;background:#fee2e2;color:#dc2626;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;">Xavfsizlik</span></div>'
            . '<h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px;text-align:center;">' . $greet . '</h2>'
            . '<p style="font-size:15px;color:#475569;line-height:1.6;text-align:center;">Parolingizni tiklash uchun so‘rov oldik. Quyidagi tugmani bosing va yangi parol o‘rnating. Havola 1 soat amal qiladi.</p>'
            . self::button($url, 'Yangi parol o‘rnatish')
            . '<p style="font-size:13px;color:#64748b;text-align:center;">Agar bu so‘rovni siz yubormagan bo‘lsangiz, xatni e’tiborsiz qoldiring — parolingiz o‘zgarmaydi.</p>';
        return self::send($to, 'MollBazar: parolni tiklash', self::layout('Parolni tiklash', $content),
            "$greet\n\nYangi parol o'rnatish uchun havola (1 soat amal qiladi):\n$url\n\nAgar so'rovni siz yubormagan bo'lsangiz, e'tiborsiz qoldiring.\n\nMollBazar jamoasi");
    }

    public static function welcome($to, $name, $role)
    {
        $greet = $name ? 'Assalomu alaykum, ' . self::e($name) . '!' : 'Assalomu alaykum!';
        $roleText = $role === 'business' ? 'Biznes hamkor' : ($role === 'seller' ? 'Sotuvchi' : 'Xaridor');
        $content = '<h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px;text-align:center;">' . $greet . ' MollBazar oilasiga xush kelibsiz! 🛍️</h2>'
            . '<p style="font-size:15px;color:#475569;line-height:1.6;">Sizning <strong>' . $roleText . '</strong> sifatidagi profilingiz muvaffaqiyatli faollashtirildi.</p>'
            . '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:20px 0;"><ul style="margin:0;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">'
            . '<li>E’lonlar joylashtiring va mahsulotlaringizni minglab xaridorlarga ko‘rsating</li><li>Xaridorlar va sotuvchilar bilan to‘g‘ridan-to‘g‘ri bog‘laning</li>'
            . '<li>Buyurtmalaringizni shaxsiy kabinet orqali boshqaring</li></ul></div>'
            . self::button('https://mollbazar.uz/#home', 'MollBazarga o‘tish');
        return self::send($to, 'MollBazar platformasiga xush kelibsiz! 🌱', self::layout('MollBazarga xush kelibsiz!', $content),
            "$greet\n\nMollBazar platformasiga xush kelibsiz! Sizning $roleText profilingiz faollashtirildi.\n\nhttps://mollbazar.uz\n\nMollBazar jamoasi");
    }
}
