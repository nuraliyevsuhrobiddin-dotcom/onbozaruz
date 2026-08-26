import { B2BOrder, B2BOrderStatus, B2BProduct, BusinessType, SupplierType } from '../api/types';

/**
 * Pul summasini o'zbek so'mida formatlash (masalan: "150 000 so'm")
 */
export const formatMoney = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) return "0 so'm";
  return `${Math.round(value).toLocaleString('uz-UZ')} so'm`;
};

/**
 * Telefon raqamini +998 (XX) XXX-XX-XX formatiga keltirish
 */
export const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (!digits.startsWith('998')) {
    const d = digits.startsWith('0') ? `998${digits.slice(1)}` : `998${digits}`;
    return formatPhone(d);
  }
  const d = digits.slice(0, 12);
  let out = '+998';
  if (d.length > 3) out += ` (${d.slice(3, 5)}`;
  if (d.length >= 5) out += `) ${d.slice(5, 8)}`;
  if (d.length >= 8) out += `-${d.slice(8, 10)}`;
  if (d.length >= 10) out += `-${d.slice(10, 12)}`;
  return out;
};

/**
 * B2B Buyurtma holatlari nomlari (o'zbek tilida)
 */
export const B2B_ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda',
  supplier_confirmed: 'Tasdiqlandi',
  preparing: 'Tayyorlanmoqda',
  ready: 'Tayyor',
  delivering: "Yo'lda",
  delivered: 'Yetkazildi',
  cancelled: 'Bekor qilindi',
  rejected: 'Rad etildi',
};

/**
 * B2B Buyurtma holatlarining rang va badge stillari
 */
export const B2B_ORDER_STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200/60',
  supplier_confirmed: 'bg-blue-50 text-blue-700 border border-blue-200/60',
  preparing: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
  ready: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  delivering: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
  delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
  cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200/60',
};

/**
 * Buyurtma bosqichlari (Stepper / Timeline)
 */
export const B2B_ORDER_STEPS: { key: string; label: string }[] = [
  { key: 'pending', label: 'Qabul' },
  { key: 'supplier_confirmed', label: 'Tasdiq' },
  { key: 'preparing', label: 'Tayyor' },
  { key: 'delivering', label: "Yo'lda" },
  { key: 'delivered', label: 'Yetdi' },
];

/**
 * Ketma-ket o'tadigan navbatdagi buyurtma holati
 */
export const B2B_NEXT_ORDER_STATUS: Partial<Record<B2BOrderStatus, B2BOrderStatus>> = {
  pending: 'supplier_confirmed',
  supplier_confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivering',
  delivering: 'delivered',
};

/**
 * B2B Do'kon / Biznes turlari
 */
export const B2B_BUSINESS_TYPES: { id: BusinessType; label: string; icon: string }[] = [
  { id: 'supermarket', label: 'Supermarket', icon: '🏪' },
  { id: 'minimarket', label: 'Mini-market', icon: '🛒' },
  { id: 'grocery', label: "Oziq-ovqat do'koni", icon: '🥦' },
  { id: 'pharmacy', label: 'Dorixona', icon: '💊' },
  { id: 'cafe_restaurant', label: 'Kafe/Restoran', icon: '🍽️' },
  { id: 'clothing', label: 'Kiyim-kechak', icon: '👗' },
  { id: 'construction', label: 'Qurilish materiallari', icon: '🔨' },
  { id: 'household', label: 'Maishiy tovarlar', icon: '🏠' },
  { id: 'other', label: 'Boshqa', icon: '📦' },
];

/**
 * B2B Yetkazib beruvchi turlari
 */
export const B2B_SUPPLIER_TYPES: { id: SupplierType; label: string; icon: string; desc: string }[] = [
  { id: 'manufacturer', label: 'Ishlab chiqaruvchi', icon: '🏭', desc: "O'z mahsulotini ishlab chiqaradi" },
  { id: 'importer', label: 'Importyor', icon: '🚢', desc: 'Xorijdan mahsulot olib keladi' },
  { id: 'distributor', label: 'Distributor', icon: '🚚', desc: 'Ulgurji tarqatuvchi' },
  { id: 'supplier', label: 'Yetkazib beruvchi', icon: '📦', desc: 'Mahsulot yetkazib beruvchi' },
];

export const B2B_SUPPLIER_TYPE_LABEL: Record<string, string> = {
  manufacturer: 'Ishlab chiqaruvchi',
  importer: 'Importyor',
  distributor: 'Distributor',
  supplier: 'Yetkazib beruvchi',
};

/**
 * O'zbekiston viloyatlari bo'yicha tumanlar ro'yxati
 */
export const UZ_DISTRICTS: Record<string, string[]> = {
  'Toshkent sh.': ['Chilonzor', 'Yunusobod', 'Mirzo Ulug\'bek', 'Shayxontohur', 'Uchtepa', 'Olmazor', 'Bektemir', 'Yakkasaroy', 'Sergeli', 'Yashnobod', 'Mirobod', 'Yangihayot'],
  'Toshkent v.': ['Chirchiq', 'Angren', 'Olmaliq', 'Ohangaron', 'Bekobod', 'Zangiota', 'Qibray', 'Yuqorichirchiq', 'O\'rtachirchiq', 'Parkent', 'Bo\'stonliq', 'Yangiyo\'l'],
  'Farg\'ona': ['Farg\'ona sh.', 'Marg\'ilon', 'Qo\'qon', 'Quva', 'Rishton', 'Beshariq', 'Bag\'dod', 'Dang\'ara', 'Oltiariq', 'Uchko\'prik', 'Toshloq', 'Yozyovon'],
  'Andijon': ['Andijon sh.', 'Asaka', 'Xo\'jaobod', 'Qo\'rg\'ontepa', 'Shahrixon', 'Paxtaobod', 'Jalolquduq', 'Oltinko\'l', 'Marhamat', 'Buloqboshi', 'Izboskan'],
  'Namangan': ['Namangan sh.', 'Chust', 'Pop', 'To\'raqo\'rg\'on', 'Kosonsoy', 'Mingbuloq', 'Uychi', 'Uchqo\'rg\'on', 'Chortoq', 'Yangiqo\'rg\'on'],
  'Samarqand': ['Samarqand sh.', 'Kattaqo\'rg\'on', 'Urgut', 'Ishtixon', 'Narpay', 'Oqdaryo', 'Tayloq', 'Pastdarg\'om', 'Payariq', 'Bulung\'ur', 'Jomboy'],
  'Buxoro': ['Buxoro sh.', 'G\'ijduvon', 'Kogon', 'Romitan', 'Shofirkon', 'Peshku', 'Olot', 'Qorako\'l', 'Vobkent', 'Jondor'],
  'Xorazm': ['Urganch sh.', 'Xiva', 'Gurlan', 'Hazorasp', 'Qo\'shko\'pir', 'Shovot', 'Tuproqqal\'a', 'Bog\'ot', 'Xonqa', 'Yangiariq'],
  'Surxondaryo': ['Termiz sh.', 'Denov', 'Boysun', 'Sherobod', 'Sho\'rchi', 'Qumqo\'rg\'on', 'Jarqo\'rg\'on', 'Muzrabot', 'Sariosiyo', 'Uzun'],
  'Qashqadaryo': ['Qarshi sh.', 'Shahrisabz', 'G\'uzor', 'Kitob', 'Muborak', 'Koson', 'Chiroqchi', 'Nishon', 'Kasbi', 'Yakkabog\'', 'Dehqonobod'],
  'Jizzax': ['Jizzax sh.', 'G\'allaorol', 'Zomin', 'Yangiobod', 'Sharof Rashidov', 'Do\'stlik', 'Zafarobod', 'Paxtakor', 'Baxmal', 'Forish'],
  'Sirdaryo': ['Guliston sh.', 'Shirin', 'Boyovut', 'Sardoba', 'Hovos', 'Mirzaobod', 'Sayxunobod', 'Oqoltin', 'Yangiyer'],
  'Navoiy': ['Navoiy sh.', 'Zarafshon', 'Karmana', 'Tomdi', 'Nurota', 'Uchquduq', 'Konimex', 'Qiziltepa', 'Xatirchi'],
  'Qoraqalpog\'iston R.': ['Nukus sh.', 'Beruniy', 'Xo\'jayli', 'Qo\'ng\'irot', 'Chimboy', 'To\'rtko\'l', 'Amudaryo', 'Mo\'ynoq', 'Qorao\'zak', 'Shumanay', 'Taxtako\'pir', 'Ellikqala'],
};

export type B2BCartItem = { product: B2BProduct; quantity: number };

export interface B2BCartGroup {
  supplierId: string;
  supplierName: string;
  supplierVerified?: boolean;
  lines: B2BCartItem[];
  subtotal: number;
}

/**
 * Savatchadagi tovarlarni tahlil qilish va guruhlash yordamchisi
 */
export function getB2BCartSummary(cart: Record<string, B2BCartItem>) {
  const lines = Object.values(cart);
  const totalQty = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = lines.reduce((sum, item) => sum + (item.product.wholesalePrice * item.quantity), 0);

  const groupsMap = new Map<string, B2BCartGroup>();
  for (const line of lines) {
    const key = line.product.supplierId;
    const existing = groupsMap.get(key) || {
      supplierId: key,
      supplierName: line.product.supplierName || 'Yetkazib beruvchi',
      supplierVerified: line.product.supplierVerified,
      lines: [],
      subtotal: 0,
    };
    existing.lines.push(line);
    existing.subtotal += line.product.wholesalePrice * line.quantity;
    groupsMap.set(key, existing);
  }

  return {
    lines,
    totalQty,
    totalPrice,
    groups: Array.from(groupsMap.values()),
    groupsMap,
  };
}
