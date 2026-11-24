/**
 * Finds which of our regions (the REGIONS list) a place name belongs to, whatever
 * language or apostrophe style the map service used ("Qashqadaryo viloyati",
 * "Farg‘ona", "Кашкадарьинская область", "Tashkent Region").
 * Tashkent region is listed before Tashkent city so "Toshkent viloyati" never reads as the city.
 */
const REGION_NAMES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['Toshkent v.', ['toshkent viloyati', 'tashkent region', 'ташкентская']],
  ['Toshkent sh.', ['toshkent shahri', 'tashkent city', 'город ташкент']],
  ["Qoraqalpog'iston R.", ["qoraqalpog'iston", 'karakalpak', 'каракалпак']],
  ["Farg'ona", ["farg'ona", 'fergana', 'ферган']],
  ['Andijon', ['andijon', 'andijan', 'андижан']],
  ['Namangan', ['namangan', 'наманган']],
  ['Samarqand', ['samarqand', 'samarkand', 'самарканд']],
  ['Buxoro', ['buxoro', 'bukhara', 'бухар']],
  ['Xorazm', ['xorazm', 'khorezm', 'хорезм']],
  ['Surxondaryo', ['surxondaryo', 'surkhandarya', 'сурхандар']],
  ['Qashqadaryo', ['qashqadaryo', 'kashkadarya', 'кашкадар']],
  ['Jizzax', ['jizzax', 'jizzakh', 'джизак']],
  ['Sirdaryo', ['sirdaryo', 'syrdarya', 'сырдар']],
  ['Navoiy', ['navoiy', 'navoi', 'навои']],
];

/** ISO 3166-2 region codes, which the map service sends along with the names. */
const REGION_BY_ISO: Readonly<Record<string, string>> = {
  'UZ-TK': 'Toshkent sh.', 'UZ-TO': 'Toshkent v.', 'UZ-AN': 'Andijon', 'UZ-BU': 'Buxoro',
  'UZ-FA': "Farg'ona", 'UZ-JI': 'Jizzax', 'UZ-NG': 'Namangan', 'UZ-NW': 'Navoiy',
  'UZ-QA': 'Qashqadaryo', 'UZ-QR': "Qoraqalpog'iston R.", 'UZ-SA': 'Samarqand',
  'UZ-SI': 'Sirdaryo', 'UZ-SU': 'Surxondaryo', 'UZ-XO': 'Xorazm',
};

/** Our region for an ISO code such as "UZ-QA"; null for anything else. */
export const regionFromIsoCode = (code: string | null | undefined): string | null =>
  REGION_BY_ISO[(code || '').toUpperCase()] ?? null;

const normalize = (text: string): string => text.toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").trim();

/** The first of the given names that identifies a region, as its REGIONS label; null when none does. */
export function regionFromPlace(...names: Array<string | null | undefined>): string | null {
  for (const raw of names) {
    const name = normalize(raw || '');
    if (!name) continue;
    // The capital's own region is often just called "Toshkent".
    if (name === 'toshkent' || name === 'tashkent' || name === 'ташкент') return 'Toshkent sh.';
    for (const [region, keys] of REGION_NAMES) {
      if (keys.some((key) => name.includes(key))) return region;
    }
  }
  return null;
}
