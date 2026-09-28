# Bildirishnomalarni ishga tushirish

Ilova ichidagi xabarlar Supabase Realtime orqali keladi. Internet qaytganda,
oyna qayta ochilganda va har 30 soniyada yangi xabarlar qayta tekshiriladi.
Telefon tizimidagi sinov bildirishnomasi ruxsat va service worker ishlashini
tekshiradi. Ilova yopiq paytda xabar kelishi uchun quyidagi server sozlamalari
ham kerak; faqat brauzer ruxsatining o‘zi yetmaydi.

## Server va baza

1. VAPID juftligini bir marta `npx web-push generate-vapid-keys --json` bilan
   yarating. Mavjud production kalitlari bo‘lsa o‘shalarni saqlang.
2. Vercel muhitiga `VITE_WEB_PUSH_VAPID_PUBLIC_KEY` va
   `WEB_PUSH_VAPID_PUBLIC_KEY` uchun ayni public key ni, serverga esa
   `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT`,
   `SUPABASE_SERVICE_ROLE_KEY`, `WEB_PUSH_DELIVERY_SECRET` ni kiriting.
   Delivery secret tasodifiy, kamida 32 baytli bo‘lsin. Maxfiy kalitlarni
   `VITE_` bilan boshlamang va repoga yozmang.
3. Supabase SQL Editor orqali
   `supabase/migrations/202609280001_web_push.sql` ni bajaring.
   Bu mavjud loyihaga endpoint jadvali va INSERT triggerini qo‘shadi.
4. Supabase Vault ichida quyidagi ikkita secret yarating:
   - `onbozar_push_delivery_url`: `https://onbozar.uz/api/push/deliver`
   - `onbozar_push_delivery_secret`: serverdagi `WEB_PUSH_DELIVERY_SECRET`
     bilan ayni qiymat.
5. Yangi frontend/server buildini deploy qiling. Telefonda saytni oching,
   akkauntga kiring va Bildirishnomalar → ruxsat berish tugmasini bosing.

`supabase_schema.sql` yangi bazada endpoint jadvalini yaratadi, ammo push
triggeri uchun yuqoridagi alohida migratsiya ham bajarilishi kerak.

Vault sozlanmagan bo‘lsa trigger asosiy buyurtma/xabar yozuvini to‘xtatmaydi.
Yetkazish endpointi boshqa foydalanuvchilarga xabar yuborish uchun ochiq emas:
so‘rov server/Vault dagi umumiy maxfiy qiymat bilan tasdiqlanadi.

## Tekshirish

- Ruxsat berilganda `/api/push/subscribe` JSON `{ "ok": true }` bilan 201
  qaytarsin; bazada joriy foydalanuvchi endpointi paydo bo‘lsin.
- Ilova ochiq bo‘lganda sinov bildirishnomasini bosing. Bosh sahifa
  `/#home` da ochilsin; `/sw.js#home` ochilmasin.
- Sinov akkauntida oddiy buyurtma yoki like hodisasi bilan haqiqiy
  bildirishnoma yarating; ilova yopiq holatda ham tekshiring.
- Bildirishnomani bosib buyurtma sahifasiga o‘tishni tekshiring.
- Tarmoqni uzib, qayta ulang: yangi xabarlar ro‘yxati yangilansin,
  avvalgi o‘qilgan xabarlar qayta chalinmasin.
- Xatoda Supabase `net._http_response` va Vercel function loglarini tekshiring.
  Yetkazish javobida `delivered`, `expired`, `failed` hisoblari bor.
  Vaqtinchalik yuborish xatolari uchun bu versiyada avtomatik server retry
  navbati yo‘q; xabar ilova ichida saqlanadi.

Brauzer/OS ruxsati, telefonning ovozsiz rejimi va batareya cheklovlari haqiqiy
ovoz hamda fon yetkazilishiga ta’sir qiladi. iPhone’da Web Push uchun saytni
bosh ekranga o‘rnatilgan ilova sifatida ochish kerak.

## Regressiya tekshiruvlari

```sh
node --experimental-vm-modules --test --test-isolation=none tests/service-worker.test.mjs tests/notifications.test.mjs
npm run build
npm run lint
```

Manbalar: [Supabase pg_net](https://supabase.com/docs/guides/database/extensions/pg_net),
[Supabase Vault](https://supabase.com/docs/guides/database/vault),
[Clients.openWindow](https://developer.mozilla.org/en-US/docs/Web/API/Clients/openWindow).
