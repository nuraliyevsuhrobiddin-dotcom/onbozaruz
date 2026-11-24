/** Price units a seller can pick when posting a listing; the first one is the default. */
export const PRICE_UNITS = ["so'm", "so'm/kg", "so'm/dona", "so'm/qop", "so'm/tonna"] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

const tidy = (text: string): string => text.trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ');

/** True when the price contains an actual amount, not just a unit such as "so'm/kg". */
export const hasPriceAmount = (price: string | null | undefined): boolean => /\d/.test(price || '');

/** The unit at the end of a stored price ("15,000 so'm / kg" -> "so'm/kg"), or null. */
export function priceUnitOf(price: string | null | undefined): PriceUnit | null {
  const unit = tidy((price || '').replace(/^[\d,.\s]*/, ''));
  return (PRICE_UNITS as readonly string[]).includes(unit) ? (unit as PriceUnit) : null;
}

/**
 * A stored listing price as shown to people, with one spacing style for units.
 * Listings saved without an amount read "Narx kelishiladi" instead of a bare unit.
 */
export function formatPrice(price: string | null | undefined): string {
  const text = tidy(price || '');
  return hasPriceAmount(text) ? text : 'Narx kelishiladi';
}
