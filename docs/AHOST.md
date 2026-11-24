# MollBazar: Ahost serverga joylash

Sayt butunlay Ahost'da ishlaydi. Ichida uch qism bor: sayt sahifalari, PHP API (`/api`) va MySQL bazasi. Sayt noldan boshlanadi, eski ma'lumotlar ko'chirilmaydi.

Serverga talablar: **PHP 7.4 yoki yangisi** (8.1+ tavsiya etiladi). Kerakli kengaytmalar: `pdo_mysql`, `openssl`, `curl`, `fileinfo`, `mbstring`. Ahost'da bular odatda yoqilgan bo'ladi.

---

## 0. Xavfsizlik (birinchi navbatda)

1. cPanel → **File Manager** → `mollbazar.uz/api/` papkasini oching. Undagi oldingi AI qoldirgan fayllarni o'chiring:
   `auth.php, categories.php, comments.php, db.php, liked_posts.php, orders.php, posts.php, products.php, restore_real_data.php, saved_posts.php, upload.php`.
2. cPanel → **MySQL Databases** → baza foydalanuvchisining **parolini almashtiring**. Eski parol kod ichida ochiq yozilgan edi.

## 1. Ma'lumotlar bazasi

cPanel → **phpMyAdmin** → bazangizni tanlang (masalan, `cpaneluser_mollbazar`):

1. **Import** → `ahost/00_reset_database.sql`. Bu eski, noto'g'ri jadvallarni o'chiradi.
2. **Import** → `ahost/mollbazar_schema.sql`. Bu sayt uchun 36 ta jadval yaratadi.

## 2. Maxfiy sozlama fayli

`public/api/_lib/config.example.php` faylini nusxalang va **web papkadan tashqariga** qo'ying:

```
/home/<cpanel-user>/mollbazar_config.php
```

Ichida quyidagilarni to'ldiring:

| Kalit | Qiymat |
|---|---|
| `db_name`, `db_user`, `db_pass` | cPanel → MySQL Databases'dagi ma'lumotlar |
| `jwt_secret` | 64 ta tasodifiy belgi. Masalan: `php -r "echo bin2hex(random_bytes(32));"` |
| `site_url` | `https://mollbazar.uz` |

## 3. Saytni joylash

Uch usuldan birini tanlang:

- **GitHub Actions (FTP):** `main` branchga push qiling. `.github/workflows/deploy.yml` saytni yig'adi va yuklaydi. Repoda `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` secretlari bo'lishi kerak.
- **cPanel → Git Version Control:** `.cpanel.yml` serverning o'zida `npm run build` qiladi. Buning uchun serverda Node.js bo'lishi kerak.
- **Qo'lda:** `npm run build` ni ishga tushiring, keyin `dist/` ichidagi **hamma narsani**, yashirin `.htaccess` fayllari bilan birga, `mollbazar.uz/` ga yuklang.

Yuklangan rasm-videolar (`api/storage/v1/`) va `mollbazar_config.php` qayta joylashda o'chib ketmaydi.

**Tekshirish:** brauzerda `https://mollbazar.uz/api/health` ni oching. U `{"status":"ok","database":"ok",...}` deb javob berishi kerak.

## 4. Birinchi admin

1. Saytda o'zingiz uchun oddiy akkaunt oching.
2. phpMyAdmin → bazangiz → **SQL** bo'limiga quyidagini yozing va bajaring:

   ```sql
   UPDATE profiles SET is_admin = 1 WHERE email = 'sizning@email.uz';
   ```

3. Saytdan chiqib, qayta kiring. Pastki menyuda admin paneli paydo bo'ladi.

Admin huquqi faqat bazadagi `profiles.is_admin` ustunidan olinadi.

## 5. To'lov rekvizitlari

Admin panel → **Komissiya** bo'limida kartangiz va bank ma'lumotlaringizni kiriting. Ular kiritilmaguncha ta'minotchilarga "rekvizitlar hali kiritilmagan" degan ogohlantirish ko'rsatiladi.

## 6. Ixtiyoriy sozlamalar (`mollbazar_config.php`)

- **Email** (ro'yxatdan o'tishni tasdiqlash, parolni tiklash):
  - Kalit bo'lmasa, xatlar PHP `mail()` orqali ketadi.
  - Yaxshiroq yetkazish uchun [Resend](https://resend.com) kalitini `resend_api_key` ga yozing.
  - Email tasdiqlashni majburiy qilish uchun `autoconfirm_email` ni `false` qiling.
- **Google orqali kirish:**
  1. Google Cloud Console → Credentials → OAuth client (Web) oching.
  2. **Authorized redirect URIs** ga `https://mollbazar.uz/api/auth/v1/callback` ni qo'shing.
  3. Client ID va Secret'ni configga yozing.
- **Telefonga push-bildirishnoma:**
  1. `npx web-push generate-vapid-keys` buyrug'i bilan kalit juftligini yarating.
  2. Ikkala kalitni ham configga yozing.
  3. Ochiq (public) kalitni GitHub secret `VITE_WEB_PUSH_VAPID_PUBLIC_KEY` ga ham qo'ying.

## 7. Lokal ishlab chiqish

```
cp public/api/_lib/config.example.php public/api/_lib/config.php   # lokal MySQL ma'lumotlari
php -S 127.0.0.1:8080 -t public ahost/dev-router.php
npm run dev        # /api so'rovlari 127.0.0.1:8080 ga yo'naltiriladi
```

Bazaga yangi jadval yoki ustun qo'shish tartibi:

1. Jadvalni `public/api/_lib/schema.php` fayliga yozing.
2. Unga kirish qoidasini `public/api/_lib/policies.php` fayliga yozing.
3. SQL faylni qayta yarating: `php ahost/build_schema.php > ahost/mollbazar_schema.sql`.
