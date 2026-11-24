# MollBazar — Marketplace Platform

> Sotuvchilar va xaridorlarni yagona raqamli bozorda bog'laydigan platforma: Instagram/TikTok uslubidagi e'lonlar lentasi, B2B ulgurji savdo va agro savdo.

Sayt: **[mollbazar.uz](https://mollbazar.uz)**

---

## Imkoniyatlar

- **Lenta:** rasm va video (Reels) e'lonlar, layk, izoh, saqlash, ulashish, joylashuv bo'yicha saralash.
- **E'lon moderatsiyasi:** yangi e'lon admin tasdiqlagandan keyin chiqadi.
- **B2B ulgurji savdo:** ta'minotchilar (shartnoma bilan), do'konlar, katalog, savatcha, buyurtma bosqichlari, komissiya, keshbek, do'konlar xaritasi, to'g'ridan-to'g'ri takliflar.
- **Agro savdo:** xarid talablari, narx takliflari va kelishuvlar.
- **Profil va bildirishnomalar:** sayt ichida (har 20 soniyada yangilanadi) va Web Push.
- **Admin panel:** statistika, foydalanuvchilar, e'lonlar, B2B, kategoriyalar, ommaviy xabarlar, shikoyatlar, audit jurnali.

---

## Tuzilma

Hammasi bitta Ahost (cPanel) hostingida ishlaydi: frontend + PHP API + MySQL.

```
├── src/                 # Frontend (React 19 + TypeScript + Vite)
│   ├── api/             # Server bilan aloqa (authClient, repositories, http)
│   ├── components/      # UI komponentlar (admin, b2b, profile, create, ui)
│   ├── views/           # Sahifalar
│   ├── store/           # Zustand holati
│   ├── data/            # Viloyatlar, kategoriyalar, shartnoma matni
│   └── utils/
├── public/
│   ├── api/             # PHP backend (build paytida dist/api ga ko'chadi)
│   │   ├── index.php    # Kirish nuqtasi
│   │   └── _lib/        # schema.php (jadvallar), policies.php (ruxsatlar),
│   │                    # rest.php, auth.php, storage.php, rpc.php, push.php ...
│   └── ...              # Logo, manifest, service worker
├── ahost/               # Baza sxemasi (SQL) va lokal ishlab chiqish yordamchilari
├── docs/AHOST.md        # Serverga joylash yo'riqnomasi
└── tests/               # Unit testlar (npm test)
```

PHP API Supabase protokolida gaplashadi (`/api/rest/v1`, `/api/auth/v1`, `/api/storage/v1`), shuning uchun frontend `@supabase/supabase-js` kutubxonasini oddiy HTTP klient sifatida ishlatadi.

- Jadval tuzilmasi `public/api/_lib/schema.php` faylida turadi.
- Kim nimani o'qiy va o'zgartira olishi `public/api/_lib/policies.php` faylida belgilangan.
- `ahost/mollbazar_schema.sql` fayli `php ahost/build_schema.php` buyrug'i bilan yaratiladi.

---

## Ishga tushirish (lokal)

```bash
npm install
cp public/api/_lib/config.example.php public/api/_lib/config.php   # lokal MySQL ma'lumotlarini yozing
php -S 127.0.0.1:8080 -t public ahost/dev-router.php            # PHP API
npm run dev                                                      # /api so'rovlari 8080 ga yo'naltiriladi
```

Lokal MySQL'ga avval `ahost/mollbazar_schema.sql` ni import qiling. Lokal backend o'rniga jonli saytga ulanish uchun `.env` faylida `VITE_DEV_API_PROXY=https://mollbazar.uz` deb yozing.

| Buyruq | Ta'rifi |
|---|---|
| `npm run dev` | Lokal dev server |
| `npm run build` | Tur tekshiruvi + production build (`dist/`, ichida `dist/api`) |
| `npm test` | Unit testlar |
| `npm run lint` | Kod sifatini tekshirish (oxlint) |

Frontend sozlamalari ixtiyoriy va ochiq, ular [`.env.example`](./.env.example) faylida. Maxfiy kalitlar faqat serverdagi `mollbazar_config.php` faylida turadi: baza paroli, JWT, email, Google va VAPID kalitlari.

---

## Serverga joylash

Batafsil yo'riqnoma: [docs/AHOST.md](./docs/AHOST.md).
