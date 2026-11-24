/**
 * E'lon berish modalida ishlatiladigan statik variantlar.
 * UI-ga qattiq kodlangan qiymatlarni markazlashtiradi.
 */

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
// Keep this aligned with the server upload limit (max_upload_bytes in the PHP API
// config). Rejecting a valid seller video is not useful.
export const MEDIA_MAX_SIZE_MB = 100;
/** Videos up to this size are accepted when the phone can compress them below MEDIA_MAX_SIZE_MB. */
export const VIDEO_SOURCE_MAX_SIZE_MB = 1024;

/** Ruxsat etilgan media turlari */
export const ACCEPTED_MEDIA_TYPES = 'image/*,video/*';
