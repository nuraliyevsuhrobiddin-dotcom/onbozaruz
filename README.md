# OnBozor — Agro Marketplace Platform

> O'zbekistondagi birinchi Instagram/TikTok UX formatidagi Agro Marketplace platformasi.

## Texnologiyalar

- **React 19** + **TypeScript** + **Vite 8**
- **TailwindCSS 4** — zamonaviy stillashtirish
- **Zustand** — holatni boshqarish
- **Framer Motion** — animatsiyalar
- **Recharts** — grafik va statistika
- **Supabase** — backend (ma'lumotlar bazasi, autentifikatsiya)

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

`.env.local` fayliga to'ldiring:

```env
# Development uchun mock API (backend ulagunga qadar)
VITE_USE_MOCK_API=true

# Supabase (real backend uchun)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Lokal serverni ishga tushirish

```bash
npm run dev
```

---

## Deploy (Netlify / Vercel)

### Netlify

1. GitHub reposiga ulaning
2. Build sozlamalari:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Environment variables qo'shing:
   - `VITE_USE_MOCK_API=false`
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`

### Vercel

```bash
npx vercel --prod
```

Deploy muhitida quyidagi o'zgaruvchilarni kiriting (ularni repoga yozmang):

```env
VITE_USE_MOCK_API=false
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

`VITE_` bilan boshlangan qiymatlar brauzer bundle'iga qo'shiladi. Telegram bot tokeni yoki Supabase `service_role` kalitini bu o'zgaruvchilarga kiritmang; ularni faqat server tomonda saqlang.

---

## Buyruqlar

| Buyruq | Ta'rifi |
|--------|---------|
| `npm run dev` | Lokal server ishga tushadi |
| `npm run build` | Production bundle yaratiladi (`dist/`) |
| `npm run preview` | Build natijasini ko'rish |
| `npm run lint` | Kod sifatini tekshirish |

---

## Loyiha tuzilmasi

```
src/
├── api/           # API qatlami (mock server + real HTTP klient)
├── components/    # Qayta ishlatiladigan komponentlar
├── data/          # Statik ma'lumotlar (kategoriyalar, viloyatlar)
├── store/         # Zustand state management
├── views/         # Sahifalar (Home, Profile, Admin, ...)
├── utils/         # Yordamchi funksiyalar
└── App.tsx        # Asosiy yo'naltiruvchi
```

---

## Mualliflar

**OnBozor Development Team** — 2026
