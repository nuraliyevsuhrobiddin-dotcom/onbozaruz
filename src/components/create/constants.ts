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

/** Media fayl uchun ruxsat etilgan maksimal hajm (MB) */
export const MEDIA_MAX_SIZE_MB = 25;

/** Ruxsat etilgan media turlari */
export const ACCEPTED_MEDIA_TYPES = 'image/*,video/*';
