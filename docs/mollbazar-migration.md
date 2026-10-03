# MollBazar domeniga o'tish

Koddagi asosiy domen: `https://mollbazar.uz`. Tashqi xizmatlar hali avtomatik o'zgartirilmagan.

1. Domen registratorida `mollbazar.uz` va `www.mollbazar.uz` uchun Vercel ko'rsatgan DNS yozuvlarini o'rnating. Vercel loyihasiga ikkala domenni qo'shing, asosiy domenni `mollbazar.uz` qiling. Eski `onbozar.uz` va uning `www` domenini yangi domenga doimiy redirect qiling; URL yo'li va query parametrlarini saqlang. Login va email havolalarini yangi domenda tekshirgandan keyin redirectni yoqing.
2. Vercel Environment Variables:

   ```dotenv
   VITE_APP_URL=https://mollbazar.uz
   APP_URL=https://mollbazar.uz
   RESEND_FROM_EMAIL=MollBazar <noreply@mollbazar.uz>
   WEB_PUSH_VAPID_SUBJECT=mailto:support@mollbazar.uz
   ```

   Mavjud Supabase, Resend API va VAPID kalitlarini saqlang. Muhitlarni yangilagandan keyin redeploy qiling.
3. Supabase Authentication URL Configuration: Site URL — `https://mollbazar.uz`; Redirect URLs — `https://mollbazar.uz/auth/callback`. `www` orqali login ruxsat etilsa, `https://www.mollbazar.uz/auth/callback` ni ham qo'shing. Dashboarddagi email shablonlarining nomi, logo URL va eski domen havolalarini yangilang. Supabase loyiha ID, API URL va bazani ko'chirish shart emas.
4. Google Auth Platform: ilova nomini `MollBazar`, logotipini yangi MB rasmga almashtiring; homepage — `https://mollbazar.uz`, privacy policy — `https://mollbazar.uz/privacy-policy`, authorized domain — `mollbazar.uz`. OAuth clientdagi mavjud sayt originlari ishlatilsa ularni yangilang. Supabase orqali Google login ishlagani uchun Google redirect URI mavjud `https://<supabase-project-ref>.supabase.co/auth/v1/callback` bo'lib qoladi.
5. Resend: yangi domenni qo'shib, u ko'rsatgan SPF/DKIM DNS yozuvlari bilan verify qiling. `noreply@mollbazar.uz` yuboruvchi manzilini ishlating. Email xizmatida `support@mollbazar.uz` va `admin@mollbazar.uz` pochta qutilari yoki forwarding yarating; Resend yuboruvchi domenini tasdiqlashning o'zi kiruvchi pochta yaratmaydi.
6. Supabase SQL Editor orqali `supabase/migrations/202610020001_mollbazar_brand.sql` ni bajaring (push uchun oldingi `202609280001_web_push.sql` o'rnatilgan bo'lishi kerak). Vaultda `mollbazar_push_delivery_url` — `https://mollbazar.uz/api/push/deliver`, `mollbazar_push_delivery_secret` — Verceldagi `WEB_PUSH_DELIVERY_SECRET` bilan ayni qiymat. Migratsiya eski Vault nomlarini ham vaqtincha qo'llab-quvvatlaydi.
7. Mavjud bazadagi foydalanuvchi kiritgan rekvizitlar, shartnomalar va matnlarni tekshiring. Migratsiya faqat standart eski hisob nomini yangilaydi; haqiqiy bank hisob egasi nomini hujjatga mos saqlang.
8. Telegram bot ishlatilsa, uning nomi, rasmi, tavsifi, sayt/menu tugmalari va webhook URL ichidagi eski domenni yangilang. Ijtimoiy tarmoq profillari, QR kodlar, reklama havolalari va Search Console yangi domenini ham tekshiring.

Yangi domenda brauzer sessiyasi, lokal qoralamalar va bildirishnoma ruxsati avtomatik ko'chmaydi. Foydalanuvchilar qayta kiradi, bildirishnomaga ruxsat beradi va PWA'ni yangi domendan qayta o'rnatadi. Bir xil domenda yangilanish bo'lsa, kod eski lokal kalitlarni yangi nomga o'tkazadi.

Logo o'rnatildi: `public/logo.png` va `public/logo.jpg` — yuborilgan MB rasmi; `favicon.png` — 32×32, `apple-touch-icon.png` — 180×180, `icon-192.png` va `icon-512.png` — PWA ikonalar. `favicon.svg` ham shu logoni ko'rsatadi. Service worker kesh versiyasi yangilandi.

Rasmiy yo'riqnomalar: [Vercel domen](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Supabase redirect](https://supabase.com/docs/guides/auth/redirect-urls), [Resend domen](https://resend.com/docs/dashboard/domains/introduction), [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).
