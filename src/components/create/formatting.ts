/**
 * E'lon berish formasi uchun formatlash yordamchilari.
 */

/** Raqamlarni ajratib chiqaradi: "8500" -> "8,500" */
export const formatNumeric = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
};

/** Matndan sonni ajratib oladi: "8,500 so'm" -> 8500 */
export const parseNumeric = (value: string): number => {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

/** To'liq O'zbekiston mobil raqami kiritilganini tekshiradi (9 ta raqam). */
export const isPhoneComplete = (value: string): boolean =>
  value.replace(/\D/g, '').length >= 9;

/**
 * Telefon raqamini O'zbekiston formatiga keltiradi:
 * "+998 90 123 45 67" va h.k.
 */
export const formatPhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');

  // "998..." yoki "8..." prefikslarini olib tashlaymiz
  if (digits.startsWith('998')) digits = digits.slice(3);
  else if (digits.startsWith('8')) digits = digits.slice(1);

  digits = digits.slice(0, 9);

  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ];

  const joined = parts.filter(Boolean).join(' ');
  return joined ? `+998 ${joined}` : '+998 ';
};
