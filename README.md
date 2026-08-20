# OnBozor — Agro Marketplace Platform

> O'zbekistondagi birinchi Instagram/TikTok UX formatidagi Agro Marketplace platformasi. Fermerlar va xaridorlarni yagona raqamli bozorda bog'laydi.

Sayt: **[onbozar.uz](https://onbozar.uz)**

---

## Imkoniyatlar

### Lenta va ijtimoiy funksiyalar
- Instagram uslubidagi lenta: rasm va video (Reels) formatidagi e'lonlar
- To'liq ekranli Reels ko'ruvchi — scroll-snap navigatsiya, avtomatik ijro, ovozni boshqarish
- Layklar, saqlash, izohlar, ulashish, fermerlarga obuna bo'lish
- Story-uslubidagi fermerlar paneli
- Qidiruv va kategoriya bo'yicha ko'rish

### Market (B2B do'kon)
- Admin va biznes-akkauntlar tomonidan qo'shiladigan mahsulotlar
- Zaxira (stock) nazorati — tugagan mahsulot avtomatik bloklanadi
- Xaridorlar sharhlari va reytingi
- Bir nechta mahsulotli xaridlar bitta buyurtma sifatida birlashtiriladi
- Biznes-akkauntlar o'z mahsulotlarini moderatsiyaga taqdim eta oladi

### Profil
- To'liq tahrirlanadigan profil (avatar, muqova, bio, aloqa ma'lumotlari)
- Shaxsiy e'lonlar, mahsulotlar, saqlangan e'lonlar va buyurtmalar tarixi
- Real vaqtli bildirishnomalar (Supabase Realtime)

### Admin panel
- Dashboard, foydalanuvchilar, e'lonlar, mahsulotlar, buyurtmalar, kategoriyalar
- Media boshqaruvi, shikoyatlar, audit jurnali
- Telegram bot orqali kelib tushgan e'lonlarni moderatsiya qilish

### Autentifikatsiya va xavfsizlik
- Supabase Auth (email/telefon), Google OAuth uchun tayyor infratuzilma
- Row Level Security (RLS) — har bir jadval uchun egalik asosida cheklovlar
- Email xabarnomalari (Resend): xush kelibsiz, email tasdiqlash, parolni tiklash

---

## Texnologiyalar

| Qatlam | Texnologiya |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 |
| Stillashtirish | TailwindCSS 4 |
| Holat boshqaruvi | Zustand (persist middleware) |
| Animatsiya | Framer Motion |
| Grafik/statistika | Recharts |
| Formalar | React Hook Form + Zod |
| Backend | Supabase (Postgres, Auth, Realtime, Storage) |
| Email | Resend (Vercel Serverless Functions orqali) |
| Deploy | Vercel |

---

## Loyiha tuzilmasi

```
├── api/                    # Vercel Serverless Functions (server-side)
│   ├── auth/                # Email xabarnomalari: welcome, verify, password-reset
│   ├── lib/                  # Resend klienti va email shablonlari
│   ├── health.ts             # Health-check endpoint
│   └── send-email.ts         # Umumiy email yuborish endpointi
│
├── src/
│   ├── api/                # Frontend API qatlami
│   │   ├── repositories/     # Har bir resurs uchun CRUD (posts, products, orders, ...)
│   │   ├── authClient.ts     # Supabase Auth / mock auth unifikatsiyasi
│   │   ├── http.ts           # Mock API va Supabase o'rtasidagi yagona svitch nuqtasi
│   │   ├── mockDb.ts          # Xotiradagi mock ma'lumotlar bazasi (dev uchun)
│   │   └── types.ts           # Umumiy TypeScript tiplari
│   │
│   ├── components/         # Qayta ishlatiladigan komponentlar
│   │   ├── admin/             # Admin panel bo'limlari
│   │   ├── home/               # Lenta komponentlari (StoryBar, CategoryCard, ...)
│   │   ├── profile/            # Profil sahifasi bo'limlari
│   │   ├── ui/                  # Umumiy UI elementlari (Modal, Toast, Button, ...)
│   │   └── create/             # E'lon yaratish formasi logikasi
│   │
│   ├── views/               # Sahifalar (Home, Search, Market, Profile, Admin, Auth)
│   ├── store/               # Zustand global holat (useAgroStore.ts)
│   ├── data/                # Statik ma'lumotlar (kategoriyalar, viloyatlar)
│   ├── utils/                # Yordamchi funksiyalar (cache, avatar, ovoz)
│   └── App.tsx               # Asosiy yo'naltiruvchi va layout
│
├── public/                  # Statik fayllar (logo, manifest, service worker)
├── supabase_schema.sql      # To'liq DB sxema, RLS siyosatlari va funksiyalar
└── vercel.json               # Deploy sozlamalari
```

---

## Ishga tushirish

### 1. O'rnatish

```bash
npm install
```

### 2. Muhit sozlamalari

`.env.local` fayl yarating (`.env.example` asosida):

```bash
cp .env.example .env.local
```

Development uchun eng tez yo'l — mock API rejimini yoqish (Supabase shart emas):

```env
VITE_USE_MOCK_API=true
```

Real Supabase backend bilan ishlash uchun:

```env
VITE_USE_MOCK_API=false
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Ma'lumotlar bazasini sozlash (faqat real Supabase uchun)

Supabase loyihasi yarating, so'ng Dashboard → SQL Editor sahifasida [`supabase_schema.sql`](./supabase_schema.sql) faylini to'liq ishga tushiring. Bu skript barcha jadvallarni, RLS siyosatlarini, trigger va funksiyalarni yaratadi.

### 4. Lokal serverni ishga tushirish

```bash
npm run dev
```

---

## Muhit o'zgaruvchilari

To'liq ro'yxat [`.env.example`](./.env.example) faylida. Asosiylari:

| O'zgaruvchi | Qatlam | Tavsif |
|---|---|---|
| `VITE_USE_MOCK_API` | Client | `true` — backendsiz mock rejim, `false` — real Supabase |
| `VITE_SUPABASE_URL` | Client | Supabase loyiha URL manzili |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase public (anon) kaliti |
| `VITE_APP_URL` | Client | Saytning ochiq URL manzili |
| `RESEND_API_KEY` | Server | Email yuborish uchun Resend API kaliti |
| `RESEND_FROM_EMAIL` | Server | Yuboruvchi email manzili |
| `TELEGRAM_BOT_TOKEN` | Server | Telegram bot integratsiyasi (ixtiyoriy) |

> ⚠️ Faqat `VITE_` prefiksli o'zgaruvchilar brauzer bundle'iga qo'shiladi. `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN` kabi maxfiy kalitlarni hech qachon `VITE_` bilan boshlamang — ular faqat server (Vercel Environment Variables) tomonda saqlanishi kerak.

---

## Buyruqlar

| Buyruq | Ta'rifi |
|---|---|
| `npm run dev` | Lokal dev server ishga tushadi |
| `npm run build` | Production bundle yaratiladi (`dist/`) |
| `npm run preview` | Build natijasini lokal ko'rish |
| `npm run lint` | Kod sifatini tekshirish (oxlint) |

---

## Deploy (Vercel)

Loyiha Vercel'ga moslashtirilgan (`api/` papkasi — Serverless Functions, `vercel.json` — routing sozlamalari).

```bash
npx vercel --prod
```

Vercel loyiha sozlamalarida quyidagi Environment Variables'ni kiriting (repoga yozmang):

```env
VITE_USE_MOCK_API=false
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=OnBozor <noreply@onbozar.uz>
```

> Boshqa statik-hosting platformalarida (Netlify va h.k.) frontend ishlaydi, lekin `api/` papkasidagi email endpointlari Vercel Serverless Functions formatida yozilgan va ularni ishlatish uchun moslashtirish talab qilinadi.

---

## Mualliflar

**OnBozor Development Team** — 2026
