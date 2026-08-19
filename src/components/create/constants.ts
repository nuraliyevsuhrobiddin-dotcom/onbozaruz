/**
 * E'lon berish modalida ishlatiladigan statik variantlar.
 * UI-ga qattiq kodlangan qiymatlarni markazlashtiradi.
 */

/** Narx o'lchov birliklari uchun tez tugmalar */
export const PRICE_QUICK = ['so\'m/kg', 'so\'m / qop', 'so\'m / dona', 'so\'m / tonna'] as const;

/** Minimal buyurtma uchun tez tanlashlar */
export const MIN_ORDER_QUICK = ['10 kg', '100 kg', '300 kg', '500 kg', '1 tonna', '10 qop'] as const;

/** Mahsulot holati uchun tez tanlashlar */
export const CONDITION_QUICK = [
  "A'lo sifat",
  'Yangi uzilgan',
  'Sertifikatlangan',
  'Saralangan',
  'Ekologik toza',
  'Kam ishlangan',
] as const;

/** E'lon muddati tanlovlari (kunlarda; days: null = cheksiz). */
export const DURATION_OPTIONS: { label: string; days: number | null }[] = [
  { label: '1 kun', days: 1 },
  { label: '3 kun', days: 3 },
  { label: '7 kun', days: 7 },
  { label: '30 kun', days: 30 },
  { label: '1 yil', days: 365 },
  { label: 'Cheksiz', days: null },
];

/** Media fayl uchun ruxsat etilgan maksimal hajm (MB). */
// Supabase Storage loyihasidagi File size limit ham kamida 100 MB bo'lishi kerak.
// Keep this aligned with the Supabase Storage bucket limit. Playback performance
// is improved at delivery time; rejecting a valid seller video is not useful.
export const MEDIA_MAX_SIZE_MB = 100;

/** Ruxsat etilgan media turlari */
export const ACCEPTED_MEDIA_TYPES = 'image/*,video/*';
