/**
 * B2B (ulgurji savdo) repository.
 *
 * adminRepository.ts naqshini takrorlaydi: to'g'ridan-to'g'ri Supabase'ga
 * murojaat qiladi (src/api/http.ts orqali emas), chunki checkout bitta
 * SECURITY DEFINER RPC chaqiruvi orqali ishlaydi va buni umumiy REST
 * o'ramchisi qo'llab-quvvatlamaydi. Mock rejimda (Supabase sozlanmaganda)
 * localStorage'ga asoslangan yengil bekor qiluvchi qatlam ishlatiladi —
 * to'liq server emulyatsiyasi emas, faqat lokal test uchun yetarli.
 */
import { supabaseClient } from './authClient';
import {
  BusinessProfile,
  BusinessAddress,
  SupplierProfile,
  Contract,
  B2BProduct,
  B2BOrder,
  B2BOrderItem,
  SupplierFinanceSummary,
  CreateSupplierProfileInput,
  CreateBusinessProfileInput,
  CreateB2BProductInput,
  B2BOrderStatus,
  B2BPaymentMethod,
  B2BStorePublicMarker,
  B2BDirectOffer,
  B2BCashbackTransaction,
  B2BPlatformRequisites,
} from './types';

const supabase = supabaseClient;

// ---------- Mock-mode (localStorage) fallback ----------
const MOCK_KEYS = {
  business: 'onbozor-b2b-business-profiles',
  supplier: 'onbozor-b2b-supplier-profiles',
  contracts: 'onbozor-b2b-contracts',
  products: 'onbozor-b2b-products',
  orders: 'onbozor-b2b-orders',
  orderItems: 'onbozor-b2b-order-items',
  ledger: 'onbozor-b2b-commission-ledger',
  cashbackRate: 'onbozor-b2b-cashback-rate',
  directOffers: 'onbozor-b2b-direct-offers',
  cashbackTransactions: 'onbozor-b2b-cashback-transactions',
  platformRequisites: 'onbozor-b2b-platform-requisites',
};

const SEED_CASHBACK_TRANSACTIONS: B2BCashbackTransaction[] = [
  {
    id: 'cb-tx-1',
    businessId: 'store-seed-1',
    storeName: 'Baraka Supermarket',
    orderNumber: 'ONB-892140',
    supplierName: 'Agro Invest Distribyutor',
    orderAmount: 12500000,
    cashbackRate: 1.5,
    amount: 187500,
    type: 'earned',
    status: 'completed',
    description: 'ONB-892140 buyurtmasi uchun 1.5% keshbek',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'cb-tx-2',
    businessId: 'store-seed-1',
    storeName: 'Baraka Supermarket',
    orderNumber: 'ONB-781920',
    supplierName: 'Gold Fresh Ulgurji Savdo',
    orderAmount: 8200000,
    cashbackRate: 1.5,
    amount: 123000,
    type: 'earned',
    status: 'completed',
    description: 'ONB-781920 buyurtmasi uchun 1.5% keshbek',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'cb-tx-3',
    businessId: 'store-seed-2',
    storeName: 'Oazis Minimarket',
    orderNumber: 'ONB-661240',
    supplierName: 'Sharq Sut Zavodi',
    orderAmount: 4500000,
    cashbackRate: 1.5,
    amount: 67500,
    type: 'earned',
    status: 'completed',
    description: 'ONB-661240 buyurtmasi uchun 1.5% keshbek',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'cb-tx-4',
    businessId: 'store-seed-5',
    storeName: 'Afrosiyob Market',
    orderNumber: 'ONB-553190',
    supplierName: 'Samarqand Meva-Sabzavot MCHJ',
    orderAmount: 18000000,
    cashbackRate: 2.0,
    amount: 360000,
    type: 'earned',
    status: 'completed',
    description: 'ONB-553190 buyurtmasi uchun 2.0% keshbek',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

const SEED_STORES = [
  {
    id: 'store-seed-1',
    user_id: 'user-store-1',
    store_name: 'Baraka Supermarket',
    owner_name: 'Jasur Karimov',
    phone: '+998 90 111 22 33',
    business_type: 'supermarket',
    region: 'Toshkent',
    district: 'Chilonzor tumani',
    address: 'Qatortol ko\'chasi, 42-uy',
    latitude: 41.2785,
    longitude: 69.2140,
    cashback_balance: 340000,
    description: 'Katta oziq-ovqat va nooziq-ovqat mahsulotlari supermarketi. Kunlik xaridorlar oqimi 1500+.',
    status: 'active',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'store-seed-2',
    user_id: 'user-store-2',
    store_name: 'Oazis Minimarket',
    owner_name: 'Nodirbek Aliyev',
    phone: '+998 91 222 33 44',
    business_type: 'minimarket',
    region: 'Toshkent',
    district: 'Yunusobod tumani',
    address: 'Amir Temur shoh ko\'chasi, 108',
    latitude: 41.3530,
    longitude: 69.2880,
    cashback_balance: 180000,
    description: '24/7 ishlaydigan zamonaviy minimarket. Ichimliklar va qandolat mahsulotlari qabul qilamiz.',
    status: 'active',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'store-seed-3',
    user_id: 'user-store-3',
    store_name: 'Ziyo Oziq-ovqat do\'koni',
    owner_name: 'Farhod Umarov',
    phone: '+998 93 333 44 55',
    business_type: 'grocery',
    region: 'Toshkent',
    district: 'Mirzo Ulug\'bek tumani',
    address: 'Buyuk Ipak Yo\'li, 15',
    latitude: 41.3260,
    longitude: 69.3350,
    cashback_balance: 95000,
    description: 'Mahalliy oziq-ovqat savdo do\'koni. Sifatli sut va go\'sht mahsulotlari yetkazib beruvchilari kerak.',
    status: 'active',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'store-seed-4',
    user_id: 'user-store-4',
    store_name: 'Davo Plus Dorixona',
    owner_name: 'Dr. Shahlo Rahimova',
    phone: '+998 97 444 55 66',
    business_type: 'pharmacy',
    region: 'Toshkent',
    district: 'Shayxontohur tumani',
    address: 'Navoiy ko\'chasi, 24',
    latitude: 41.3210,
    longitude: 69.2450,
    cashback_balance: 520000,
    description: 'Tibbiy buyumlar va dori vositalari dorixonalar tarmog\'i.',
    status: 'active',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'store-seed-5',
    user_id: 'user-store-5',
    store_name: 'Afrosiyob Market',
    owner_name: 'Akmal Saidov',
    phone: '+998 99 555 66 77',
    business_type: 'supermarket',
    region: 'Samarqand',
    district: 'Samarqand shahri',
    address: 'Registon ko\'chasi, 88',
    latitude: 39.6542,
    longitude: 66.9597,
    cashback_balance: 410000,
    description: 'Samarqand markazidagi yirik savdo majmuasi. To\'g\'ridan-to\'g\'ri ulgurji distribyutorlar bilan ishlaymiz.',
    status: 'active',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'store-seed-6',
    user_id: 'user-store-6',
    store_name: 'Vodiy Baraka Do\'koni',
    owner_name: 'Ilhom Jo\'rayev',
    phone: '+998 94 666 77 88',
    business_type: 'grocery',
    region: 'Farg\'ona',
    district: 'Farg\'ona shahri',
    address: 'Al-Farg\'oniy ko\'chasi, 12',
    latitude: 40.3864,
    longitude: 71.7864,
    cashback_balance: 230000,
    description: 'Ulgurji va chakana oziq-ovqat savdo do\'koni.',
    status: 'active',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

function readMock<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw && key === MOCK_KEYS.business) {
      localStorage.setItem(key, JSON.stringify(SEED_STORES));
      return SEED_STORES as unknown as T;
    }
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeMock<T>(key: string, value: T): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function currentMockUserId(): string {
  try {
    const raw = localStorage.getItem('onbozor-auth-session');
    const user = raw ? JSON.parse(raw) : null;
    return user?.id || 'mock-user';
  } catch {
    return 'mock-user';
  }
}

// ---------- Mappers (snake_case DB row -> camelCase domain type) ----------
function mapBusinessProfile(r: any): BusinessProfile {
  return {
    id: r.id,
    userId: r.user_id ?? r.userId,
    storeName: r.store_name ?? r.storeName,
    ownerName: r.owner_name ?? r.ownerName ?? '',
    phone: r.phone ?? '',
    businessType: r.business_type ?? r.businessType ?? 'other',
    region: r.region ?? '',
    district: r.district ?? '',
    address: r.address ?? '',
    latitude: r.latitude !== undefined && r.latitude !== null ? Number(r.latitude) : (r.region === 'Samarqand' ? 39.6542 : r.region === 'Farg\'ona' ? 40.3864 : 41.2995 + (Math.random() - 0.5) * 0.08),
    longitude: r.longitude !== undefined && r.longitude !== null ? Number(r.longitude) : (r.region === 'Samarqand' ? 66.9597 : r.region === 'Farg\'ona' ? 71.7864 : 69.2401 + (Math.random() - 0.5) * 0.08),
    description: r.description ?? '',
    logoUrl: r.logo_url ?? r.logoUrl ?? '',
    cashbackBalance: Number(r.cashback_balance ?? r.cashbackBalance ?? 0),
    status: r.status ?? 'active',
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

function mapSupplierProfile(r: any): SupplierProfile {
  return {
    id: r.id,
    userId: r.user_id ?? r.userId,
    companyName: r.company_name ?? r.companyName,
    supplierType: r.supplier_type ?? r.supplierType ?? 'supplier',
    ownerName: r.owner_name ?? r.ownerName ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    region: r.region ?? '',
    district: r.district ?? '',
    address: r.address ?? '',
    description: r.description ?? '',
    categories: r.categories ?? [],
    taxId: r.tax_id ?? r.taxId ?? '',
    logoUrl: r.logo_url ?? r.logoUrl ?? '',
    verificationStatus: r.verification_status ?? r.verificationStatus ?? 'pending',
    rejectionReason: r.rejection_reason ?? r.rejectionReason ?? '',
    commissionRate: Number(r.commission_rate ?? r.commissionRate ?? 5),
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

function mapContract(r: any): Contract {
  return {
    id: r.id,
    supplierId: r.supplier_id ?? r.supplierId,
    contractVersion: r.contract_version ?? r.contractVersion ?? 'v1',
    commissionRate: Number(r.commission_rate ?? r.commissionRate ?? 0),
    status: r.status ?? 'pending',
    acceptedAt: r.accepted_at ?? r.acceptedAt ?? null,
    terminatedAt: r.terminated_at ?? r.terminatedAt ?? null,
    terminationReason: r.termination_reason ?? r.terminationReason ?? '',
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

function mapB2BProduct(r: any): B2BProduct {
  return {
    id: r.id,
    supplierId: r.supplier_id ?? r.supplierId,
    name: r.name,
    brand: r.brand ?? '',
    category: r.category,
    description: r.description ?? '',
    sku: r.sku ?? '',
    images: r.images ?? [],
    videoUrl: r.video_url ?? r.videoUrl ?? '',
    wholesalePrice: Number(r.wholesale_price ?? r.wholesalePrice ?? 0),
    moq: Number(r.moq ?? 1),
    availableQty: Number(r.available_qty ?? r.availableQty ?? 0),
    unit: r.unit ?? 'dona',
    packaging: r.packaging ?? '',
    deliveryAvailable: Boolean(r.delivery_available ?? r.deliveryAvailable),
    deliveryRegions: r.delivery_regions ?? r.deliveryRegions ?? [],
    status: r.status ?? 'draft',
    rejectionReason: r.rejection_reason ?? r.rejectionReason ?? '',
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
    supplierName: r.supplier_profiles?.company_name ?? r.supplierName,
    supplierVerified: r.supplier_profiles ? r.supplier_profiles.verification_status === 'approved' : r.supplierVerified,
  };
}

function mapB2BOrder(r: any): B2BOrder {
  return {
    id: r.id,
    orderNumber: r.order_number ?? r.orderNumber,
    businessId: r.business_id ?? r.businessId,
    supplierId: r.supplier_id ?? r.supplierId,
    buyerUserId: r.buyer_user_id ?? r.buyerUserId,
    subtotal: Number(r.subtotal ?? 0),
    deliveryFee: Number(r.delivery_fee ?? r.deliveryFee ?? 0),
    total: Number(r.total ?? 0),
    paymentMethod: r.payment_method ?? r.paymentMethod ?? 'cash',
    paymentStatus: r.payment_status ?? r.paymentStatus ?? 'pending',
    status: r.status ?? 'pending',
    rejectionReason: r.rejection_reason ?? r.rejectionReason ?? '',
    commissionRate: Number(r.commission_rate ?? r.commissionRate ?? 0),
    commissionAmount: Number(r.commission_amount ?? r.commissionAmount ?? 0),
    supplierAmount: Number(r.supplier_amount ?? r.supplierAmount ?? 0),
    deliveryStoreName: r.delivery_store_name ?? r.deliveryStoreName ?? '',
    deliveryPhone: r.delivery_phone ?? r.deliveryPhone ?? '',
    deliveryRegion: r.delivery_region ?? r.deliveryRegion ?? '',
    deliveryDistrict: r.delivery_district ?? r.deliveryDistrict ?? '',
    deliveryAddress: r.delivery_address ?? r.deliveryAddress ?? '',
    deliveryNote: r.delivery_note ?? r.deliveryNote ?? '',
    cashbackUsed: Number(r.cashback_used ?? r.cashbackUsed ?? 0),
    cashbackEarned: Number(r.cashback_earned ?? r.cashbackEarned ?? 0),
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
    supplierName: r.supplier_profiles?.company_name ?? r.supplierName,
    businessName: r.business_profiles?.store_name ?? r.businessName,
  };
}

function mapB2BOrderItem(r: any): B2BOrderItem {
  return {
    id: r.id,
    orderId: r.order_id ?? r.orderId,
    productId: r.product_id ?? r.productId ?? null,
    productName: r.product_name ?? r.productName,
    productImage: r.product_image ?? r.productImage ?? '',
    unit: r.unit ?? 'dona',
    unitPrice: Number(r.unit_price ?? r.unitPrice ?? 0),
    quantity: Number(r.quantity ?? 0),
    lineTotal: Number(r.line_total ?? r.lineTotal ?? 0),
  };
}

// ---------- Business profile ----------
export async function fetchOwnBusinessProfile(): Promise<BusinessProfile | null> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.business, []);
    const row = all.find((b) => b.user_id === currentMockUserId());
    return row ? mapBusinessProfile(row) : null;
  }
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return null;
  const { data, error } = await supabase.from('business_profiles').select('*').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) return null;
  return mapBusinessProfile(data);
}

export async function registerBusinessBuyer(input: CreateBusinessProfileInput): Promise<BusinessProfile> {
  if (!supabase) {
    const row = {
      id: genId('biz'), user_id: currentMockUserId(), store_name: input.storeName, owner_name: input.ownerName,
      phone: input.phone, business_type: input.businessType, region: input.region || '', district: input.district || '',
      address: input.address || '', latitude: input.latitude ?? null, longitude: input.longitude ?? null,
      description: input.description || '', logo_url: input.logoUrl || '', status: 'active', created_at: new Date().toISOString(),
    };
    const all = readMock<any[]>(MOCK_KEYS.business, []);
    writeMock(MOCK_KEYS.business, [...all.filter((b) => b.user_id !== row.user_id), row]);
    return mapBusinessProfile(row);
  }
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error('Sessiya topilmadi');
  const { data, error } = await supabase.from('business_profiles').insert({
    user_id: session.user.id,
    store_name: input.storeName,
    owner_name: input.ownerName,
    phone: input.phone,
    business_type: input.businessType,
    region: input.region || '',
    district: input.district || '',
    description: input.description || '',
    logo_url: input.logoUrl || '',
  }).select().single();
  if (error || !data) throw new Error(error?.message || "Biznes profil yaratilmadi");
  const profile = mapBusinessProfile(data);

  // business_profiles jadvalida address/lat/lng ustunlari yo'q — manzil
  // alohida business_addresses jadvaliga (asosiy manzil sifatida) yoziladi.
  if (input.address?.trim()) {
    try {
      const savedAddress = await addBusinessAddress(profile.id, {
        storeName: input.storeName,
        phone: input.phone,
        region: input.region || '',
        district: input.district || '',
        address: input.address,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        isDefault: true,
      });
      profile.address = savedAddress.address;
      profile.latitude = savedAddress.latitude ?? profile.latitude;
      profile.longitude = savedAddress.longitude ?? profile.longitude;
    } catch {
      // Biznes profil allaqachon yaratildi — manzil saqlanmasa ham davom etamiz,
      // foydalanuvchi keyinroq manzilni qo'shishi mumkin.
    }
  }
  return profile;
}

export async function addBusinessAddress(businessId: string, input: Omit<BusinessAddress, 'id' | 'businessId'>): Promise<BusinessAddress> {
  if (!supabase) {
    return { id: genId('addr'), businessId, ...input };
  }
  const { data, error } = await supabase.from('business_addresses').insert({
    business_id: businessId,
    label: input.label || 'Asosiy manzil',
    store_name: input.storeName || '',
    phone: input.phone || '',
    region: input.region || '',
    district: input.district || '',
    address: input.address,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    delivery_note: input.deliveryNote || '',
  }).select().single();
  if (error || !data) throw new Error(error?.message || 'Manzil saqlanmadi');
  return {
    id: data.id, businessId: data.business_id, label: data.label, storeName: data.store_name, phone: data.phone,
    region: data.region, district: data.district, address: data.address, deliveryNote: data.delivery_note,
    latitude: data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : null,
    longitude: data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : null,
  };
}

// ---------- Supplier profile ----------
export async function fetchOwnSupplierProfile(): Promise<SupplierProfile | null> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.supplier, []);
    const row = all.find((s) => s.user_id === currentMockUserId());
    return row ? mapSupplierProfile(row) : null;
  }
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return null;
  const { data, error } = await supabase.from('supplier_profiles').select('*').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) return null;
  return mapSupplierProfile(data);
}

export async function registerSupplier(input: CreateSupplierProfileInput): Promise<SupplierProfile> {
  if (!supabase) {
    const row = {
      id: genId('sup'), user_id: currentMockUserId(), company_name: input.companyName, supplier_type: input.supplierType,
      owner_name: input.ownerName, phone: input.phone, email: input.email || '', region: input.region || '',
      district: input.district || '', address: input.address || '', description: input.description || '',
      categories: input.categories || [], tax_id: input.taxId || '', logo_url: input.logoUrl || '',
      verification_status: 'pending', rejection_reason: '', commission_rate: 5, created_at: new Date().toISOString(),
    };
    const all = readMock<any[]>(MOCK_KEYS.supplier, []);
    writeMock(MOCK_KEYS.supplier, [...all.filter((s) => s.user_id !== row.user_id), row]);
    return mapSupplierProfile(row);
  }
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) throw new Error('Sessiya topilmadi');
  const { data, error } = await supabase.from('supplier_profiles').insert({
    user_id: session.user.id,
    company_name: input.companyName,
    supplier_type: input.supplierType,
    owner_name: input.ownerName,
    phone: input.phone,
    email: input.email || '',
    region: input.region || '',
    district: input.district || '',
    address: input.address || '',
    description: input.description || '',
    categories: input.categories || [],
    tax_id: input.taxId || '',
    logo_url: input.logoUrl || '',
  }).select().single();
  if (error || !data) throw new Error(error?.message || 'Supplier profil yaratilmadi');
  return mapSupplierProfile(data);
}

export async function listVerifiedSuppliers(search = ''): Promise<SupplierProfile[]> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.supplier, []).filter((s) => s.verification_status === 'approved');
    return all.map(mapSupplierProfile);
  }
  let query = supabase.from('supplier_profiles').select('*').eq('verification_status', 'approved');
  if (search) query = query.ilike('company_name', `%${search}%`);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapSupplierProfile);
}

export async function getSupplier(id: string): Promise<SupplierProfile | null> {
  if (!supabase) {
    const row = readMock<any[]>(MOCK_KEYS.supplier, []).find((s) => s.id === id);
    return row ? mapSupplierProfile(row) : null;
  }
  const { data, error } = await supabase.from('supplier_profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapSupplierProfile(data);
}

// ---------- Contract ----------
export async function fetchOwnContract(supplierId: string): Promise<Contract | null> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.contracts, []).filter((c) => c.supplier_id === supplierId);
    const row = all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return row ? mapContract(row) : null;
  }
  const { data, error } = await supabase.from('contracts').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapContract(data);
}

export async function respondToContract(contractId: string, accept: boolean): Promise<void> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.contracts, []);
    const next = all.map((c) => c.id === contractId ? { ...c, status: accept ? 'accepted' : 'rejected', accepted_at: accept ? new Date().toISOString() : null } : c);
    writeMock(MOCK_KEYS.contracts, next);
    return;
  }
  const { error } = await supabase.from('contracts').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', contractId);
  if (error) throw new Error(error.message);
}

// ---------- B2B products ----------
export interface B2BProductFilters {
  search?: string;
  category?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  minMoq?: number;
  verifiedOnly?: boolean;
  deliveryOnly?: boolean;
}

export async function listB2BProducts(filters: B2BProductFilters = {}): Promise<B2BProduct[]> {
  if (!supabase) {
    let rows = readMock<any[]>(MOCK_KEYS.products, []).filter((p) => p.status === 'approved');
    const suppliers = readMock<any[]>(MOCK_KEYS.supplier, []);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
    }
    if (filters.category) rows = rows.filter((p) => p.category === filters.category);
    if (filters.minMoq != null) rows = rows.filter((p) => p.moq >= filters.minMoq!);
    return rows.map((r) => {
      const sup = suppliers.find((s) => s.id === r.supplier_id);
      return mapB2BProduct({ ...r, supplierName: sup?.company_name, supplierVerified: sup?.verification_status === 'approved' });
    });
  }
  let query = supabase.from('b2b_products').select('*, supplier_profiles(company_name, verification_status, region)').eq('status', 'approved');
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.minPrice != null) query = query.gte('wholesale_price', filters.minPrice);
  if (filters.maxPrice != null) query = query.lte('wholesale_price', filters.maxPrice);
  if (filters.minMoq != null) query = query.lte('moq', filters.minMoq);
  if (filters.deliveryOnly) query = query.eq('delivery_available', true);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(60);
  if (error || !data) return [];
  let mapped = data.map(mapB2BProduct);
  if (filters.verifiedOnly) mapped = mapped.filter((p) => p.supplierVerified);
  if (filters.region) mapped = mapped.filter((p) => p.deliveryRegions.includes(filters.region!) || p.deliveryRegions.length === 0);
  return mapped;
}

export async function getB2BProduct(id: string): Promise<B2BProduct | null> {
  if (!supabase) {
    const row = readMock<any[]>(MOCK_KEYS.products, []).find((p) => p.id === id);
    if (!row) return null;
    const sup = readMock<any[]>(MOCK_KEYS.supplier, []).find((s) => s.id === row.supplier_id);
    return mapB2BProduct({ ...row, supplierName: sup?.company_name, supplierVerified: sup?.verification_status === 'approved' });
  }
  const { data, error } = await supabase.from('b2b_products').select('*, supplier_profiles(company_name, verification_status)').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapB2BProduct(data);
}

export async function listOwnB2BProducts(supplierId: string): Promise<B2BProduct[]> {
  if (!supabase) {
    return readMock<any[]>(MOCK_KEYS.products, []).filter((p) => p.supplier_id === supplierId).map(mapB2BProduct);
  }
  const { data, error } = await supabase.from('b2b_products').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapB2BProduct);
}

export async function submitB2BProduct(input: CreateB2BProductInput): Promise<B2BProduct> {
  if (!supabase) {
    const row = {
      id: genId('b2bp'), supplier_id: input.supplierId, name: input.name, brand: input.brand || '', category: input.category,
      description: input.description || '', sku: input.sku || '', images: input.images, video_url: input.videoUrl || '',
      wholesale_price: input.wholesalePrice, moq: input.moq, available_qty: input.availableQty, unit: input.unit,
      packaging: input.packaging || '', delivery_available: input.deliveryAvailable, delivery_regions: input.deliveryRegions,
      status: 'pending', rejection_reason: '', created_at: new Date().toISOString(),
    };
    const all = readMock<any[]>(MOCK_KEYS.products, []);
    writeMock(MOCK_KEYS.products, [row, ...all]);
    return mapB2BProduct(row);
  }
  const { data, error } = await supabase.from('b2b_products').insert({
    supplier_id: input.supplierId,
    name: input.name,
    brand: input.brand || '',
    category: input.category,
    description: input.description || '',
    sku: input.sku || '',
    images: input.images,
    video_url: input.videoUrl || '',
    wholesale_price: input.wholesalePrice,
    moq: input.moq,
    available_qty: input.availableQty,
    unit: input.unit,
    packaging: input.packaging || '',
    delivery_available: input.deliveryAvailable,
    delivery_regions: input.deliveryRegions,
  }).select().single();
  if (error || !data) throw new Error(error?.message || "Mahsulot qo'shilmadi");
  return mapB2BProduct(data);
}

export async function updateB2BProduct(id: string, patch: Partial<CreateB2BProductInput>): Promise<void> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.products, []);
    writeMock(MOCK_KEYS.products, all.map((p) => p.id === id ? { ...p, ...patch } : p));
    return;
  }
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.brand !== undefined) payload.brand = patch.brand;
  if (patch.category !== undefined) payload.category = patch.category;
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.wholesalePrice !== undefined) payload.wholesale_price = patch.wholesalePrice;
  if (patch.moq !== undefined) payload.moq = patch.moq;
  if (patch.availableQty !== undefined) payload.available_qty = patch.availableQty;
  if (patch.unit !== undefined) payload.unit = patch.unit;
  if (patch.packaging !== undefined) payload.packaging = patch.packaging;
  if (patch.deliveryAvailable !== undefined) payload.delivery_available = patch.deliveryAvailable;
  if (patch.deliveryRegions !== undefined) payload.delivery_regions = patch.deliveryRegions;
  if (patch.images !== undefined) payload.images = patch.images;
  const { error } = await supabase.from('b2b_products').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteB2BProduct(id: string): Promise<void> {
  if (!supabase) {
    writeMock(MOCK_KEYS.products, readMock<any[]>(MOCK_KEYS.products, []).filter((p) => p.id !== id));
    return;
  }
  const { error } = await supabase.from('b2b_products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- Checkout ----------
export interface B2BCartLine {
  product: B2BProduct;
  quantity: number;
}

export interface B2BDeliveryInfo {
  storeName: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  note?: string;
}

/** Bitta supplier uchun bitta atomik buyurtma yaratadi (create_b2b_order RPC). */
async function createOrderForSupplier(
  businessId: string,
  supplierId: string,
  lines: B2BCartLine[],
  paymentMethod: B2BPaymentMethod,
  delivery: B2BDeliveryInfo,
  cashbackUsed: number = 0
): Promise<string> {
  if (!supabase) {
    // Mock rejimda RPC yo'q — atomiklik kafolatlanmaydi, faqat lokal test uchun.
    let subtotal = 0;
    const orderId = genId('b2bo');
    const items: any[] = [];
    for (const line of lines) {
      if (line.quantity < line.product.moq) throw new Error(`Miqdor MOQ dan kam: ${line.product.name} (min ${line.product.moq})`);
      if (line.product.availableQty < line.quantity) throw new Error(`Yetarli zaxira yo'q: ${line.product.name}`);
      const lineTotal = line.product.wholesalePrice * line.quantity;
      subtotal += lineTotal;
      items.push({
        id: genId('b2boi'), order_id: orderId, product_id: line.product.id, product_name: line.product.name,
        product_image: line.product.images[0] || '', unit: line.product.unit, unit_price: line.product.wholesalePrice,
        quantity: line.quantity, line_total: lineTotal,
      });
    }
    const supplier = readMock<any[]>(MOCK_KEYS.supplier, []).find((s) => s.id === supplierId);
    if (supplier?.verification_status !== 'approved') throw new Error("Yetkazib beruvchi hali tasdiqlanmagan");
    const cashbackApplied = Math.min(Math.max(0, cashbackUsed), subtotal);
    const commissionRate = Number(supplier?.commission_rate ?? 5);
    const commissionAmount = Math.round(subtotal * commissionRate) / 100;
    const order = {
      id: orderId, order_number: `ONB-${String(Date.now()).slice(-6)}`, business_id: businessId, supplier_id: supplierId,
      buyer_user_id: currentMockUserId(), subtotal, delivery_fee: 0, total: subtotal - cashbackApplied, payment_method: paymentMethod,
      payment_status: 'cash_pending', status: 'pending', rejection_reason: '', commission_rate: commissionRate,
      commission_amount: commissionAmount, supplier_amount: subtotal - commissionAmount, cashback_used: cashbackApplied,
      delivery_store_name: delivery.storeName, delivery_phone: delivery.phone, delivery_region: delivery.region,
      delivery_district: delivery.district, delivery_address: delivery.address, delivery_note: delivery.note || '',
      created_at: new Date().toISOString(),
    };
    if (cashbackApplied > 0) {
      deductBuyerCashback(businessId, cashbackApplied);
      void recordCashbackTransaction({
        businessId, storeName: delivery.storeName, orderId, orderNumber: order.order_number,
        cashbackRate: 0, amount: -cashbackApplied, type: 'redeemed', status: 'completed',
        description: 'Buyurtmada ishlatildi',
      });
    }
    writeMock(MOCK_KEYS.orders, [order, ...readMock<any[]>(MOCK_KEYS.orders, [])]);
    writeMock(MOCK_KEYS.orderItems, [...items, ...readMock<any[]>(MOCK_KEYS.orderItems, [])]);
    writeMock(MOCK_KEYS.ledger, [{
      id: genId('ledger'), order_id: orderId, supplier_id: supplierId, gross_amount: subtotal, commission_rate: commissionRate,
      commission_amount: commissionAmount, supplier_amount: subtotal - commissionAmount, payment_method: paymentMethod,
      status: 'pending', created_at: new Date().toISOString(),
    }, ...readMock<any[]>(MOCK_KEYS.ledger, [])]);
    const products = readMock<any[]>(MOCK_KEYS.products, []);
    writeMock(MOCK_KEYS.products, products.map((p) => {
      const line = lines.find((l) => l.product.id === p.id);
      return line ? { ...p, available_qty: p.available_qty - line.quantity } : p;
    }));
    return orderId;
  }

  const { data, error } = await supabase.rpc('create_b2b_order', {
    p_business_id: businessId,
    p_supplier_id: supplierId,
    p_items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
    p_payment_method: paymentMethod,
    p_delivery_store_name: delivery.storeName,
    p_delivery_phone: delivery.phone,
    p_delivery_region: delivery.region,
    p_delivery_district: delivery.district,
    p_delivery_address: delivery.address,
    p_delivery_note: delivery.note || '',
    p_cashback_used: cashbackUsed,
  });
  if (error || !data) throw new Error(error?.message || 'Buyurtma yaratilmadi');
  return data as string;
}

export interface CheckoutResult {
  succeededSupplierIds: string[];
  failed: { supplierId: string; supplierName: string; error: string }[];
}

/**
 * Savatni supplier bo'yicha guruhlab, har biriga alohida buyurtma yaratadi.
 * cashbackUsed bitta umumiy summa (butun savat uchun) — har bir supplierga
 * o'z qismini (subtotal ulushiga mutanosib) taqsimlaydi, shunda har bir
 * supplierning keshbek yechimi o'sha buyurtma bilan BITTA tranzaksiyada
 * atomik bo'ladi: buyurtma muvaffaqiyatsiz bo'lsa, o'sha qismning keshbeki
 * ham yechilmaydi (boshqa supplierlarga ta'sir qilmaydi).
 */
export async function checkoutB2BCart(
  businessId: string,
  cartLines: B2BCartLine[],
  paymentMethod: B2BPaymentMethod,
  delivery: B2BDeliveryInfo,
  cashbackUsed: number = 0
): Promise<CheckoutResult> {
  const groups = new Map<string, B2BCartLine[]>();
  for (const line of cartLines) {
    const key = line.product.supplierId;
    const arr = groups.get(key) || [];
    arr.push(line);
    groups.set(key, arr);
  }

  const groupEntries = Array.from(groups.entries());
  const cartTotal = cartLines.reduce((sum, l) => sum + l.product.wholesalePrice * l.quantity, 0);
  const cashbackBySupplier = new Map<string, number>();
  if (cashbackUsed > 0 && cartTotal > 0) {
    let distributed = 0;
    groupEntries.forEach(([supplierId, lines], idx) => {
      const groupSubtotal = lines.reduce((sum, l) => sum + l.product.wholesalePrice * l.quantity, 0);
      let share = idx === groupEntries.length - 1
        ? cashbackUsed - distributed // oxirgi guruh — yaxlitlash qoldig'ini oladi
        : Math.floor((cashbackUsed * groupSubtotal) / cartTotal);
      share = Math.max(0, Math.min(share, groupSubtotal));
      distributed += share;
      cashbackBySupplier.set(supplierId, share);
    });
  }

  const succeededSupplierIds: string[] = [];
  const failed: CheckoutResult['failed'] = [];

  const results = await Promise.allSettled(
    groupEntries.map(async ([supplierId, lines]) => {
      await createOrderForSupplier(businessId, supplierId, lines, paymentMethod, delivery, cashbackBySupplier.get(supplierId) || 0);
      return supplierId;
    })
  );

  results.forEach((result, idx) => {
    const supplierId = Array.from(groups.keys())[idx];
    const lines = groups.get(supplierId)!;
    if (result.status === 'fulfilled') {
      succeededSupplierIds.push(supplierId);
    } else {
      failed.push({
        supplierId,
        supplierName: lines[0]?.product.supplierName || '',
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  return { succeededSupplierIds, failed };
}

// ---------- Orders ----------
export async function listB2BOrdersForBuyer(): Promise<B2BOrder[]> {
  if (!supabase) {
    const orders = readMock<any[]>(MOCK_KEYS.orders, []).filter((o) => o.buyer_user_id === currentMockUserId());
    const items = readMock<any[]>(MOCK_KEYS.orderItems, []);
    const suppliers = readMock<any[]>(MOCK_KEYS.supplier, []);
    return orders.map((o) => ({
      ...mapB2BOrder({ ...o, supplierName: suppliers.find((s) => s.id === o.supplier_id)?.company_name }),
      items: items.filter((i) => i.order_id === o.id).map(mapB2BOrderItem),
    }));
  }
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) return [];
  const { data, error } = await supabase
    .from('b2b_orders')
    .select('*, supplier_profiles(company_name)')
    .eq('buyer_user_id', session.user.id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapB2BOrder);
}

export async function listB2BOrdersForSupplier(supplierId: string): Promise<B2BOrder[]> {
  if (!supabase) {
    const orders = readMock<any[]>(MOCK_KEYS.orders, []).filter((o) => o.supplier_id === supplierId);
    const items = readMock<any[]>(MOCK_KEYS.orderItems, []);
    const businesses = readMock<any[]>(MOCK_KEYS.business, []);
    return orders.map((o) => ({
      ...mapB2BOrder({ ...o, businessName: businesses.find((b) => b.id === o.business_id)?.store_name }),
      items: items.filter((i) => i.order_id === o.id).map(mapB2BOrderItem),
    }));
  }
  const { data, error } = await supabase
    .from('b2b_orders')
    .select('*, business_profiles(store_name)')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapB2BOrder);
}

export async function getB2BOrder(orderId: string): Promise<B2BOrder | null> {
  if (!supabase) {
    const row = readMock<any[]>(MOCK_KEYS.orders, []).find((o) => o.id === orderId);
    if (!row) return null;
    const items = readMock<any[]>(MOCK_KEYS.orderItems, []).filter((i) => i.order_id === orderId);
    const supplierName = readMock<any[]>(MOCK_KEYS.supplier, []).find((s) => s.id === row.supplier_id)?.company_name;
    const businessName = readMock<any[]>(MOCK_KEYS.business, []).find((b) => b.id === row.business_id)?.store_name;
    return { ...mapB2BOrder({ ...row, supplierName, businessName }), items: items.map(mapB2BOrderItem) };
  }
  const { data, error } = await supabase
    .from('b2b_orders')
    .select('*, supplier_profiles(company_name), business_profiles(store_name)')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !data) return null;
  const items = await getB2BOrderItems(orderId);
  return { ...mapB2BOrder(data), items };
}

export async function getB2BOrderItems(orderId: string): Promise<B2BOrderItem[]> {
  if (!supabase) {
    return readMock<any[]>(MOCK_KEYS.orderItems, []).filter((i) => i.order_id === orderId).map(mapB2BOrderItem);
  }
  const { data, error } = await supabase.from('b2b_order_items').select('*').eq('order_id', orderId);
  if (error || !data) return [];
  return data.map(mapB2BOrderItem);
}

export async function supplierUpdateOrderStatus(orderId: string, status: B2BOrderStatus, rejectionReason?: string): Promise<void> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.orders, []);
    writeMock(MOCK_KEYS.orders, all.map((o) => o.id === orderId ? { ...o, status, rejection_reason: rejectionReason || '' } : o));

    // Mirrors the real handle_b2b_order_status_change SQL trigger: settle
    // commission on delivery, void it (and restock) on cancel/reject.
    if (status === 'delivered') {
      const ledger = readMock<any[]>(MOCK_KEYS.ledger, []);
      writeMock(MOCK_KEYS.ledger, ledger.map((l) => l.order_id === orderId ? { ...l, status: 'settled' } : l));
    } else if (status === 'cancelled' || status === 'rejected') {
      const ledger = readMock<any[]>(MOCK_KEYS.ledger, []);
      writeMock(MOCK_KEYS.ledger, ledger.map((l) => l.order_id === orderId ? { ...l, status: 'voided' } : l));
      const items = readMock<any[]>(MOCK_KEYS.orderItems, []).filter((i) => i.order_id === orderId);
      const products = readMock<any[]>(MOCK_KEYS.products, []);
      writeMock(MOCK_KEYS.products, products.map((p) => {
        const item = items.find((i) => i.product_id === p.id);
        return item ? { ...p, available_qty: p.available_qty + item.quantity } : p;
      }));
    }
    return;
  }
  const payload: Record<string, unknown> = { status };
  if (rejectionReason !== undefined) payload.rejection_reason = rejectionReason;
  const { error } = await supabase.from('b2b_orders').update(payload).eq('id', orderId);
  if (error) throw new Error(error.message);
}

export async function supplierConfirmCashPayment(orderId: string): Promise<void> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.orders, []);
    const order = all.find((o) => o.id === orderId);
    const rate = getB2BCashbackRate();
    const cashbackEarned = order ? Math.round(Number(order.total || 0) * (rate / 100)) : 0;
    writeMock(MOCK_KEYS.orders, all.map((o) => o.id === orderId ? { ...o, payment_status: 'cash_confirmed', cashback_earned: cashbackEarned } : o));

    // Award cashback to the buyer upon payment confirmation
    if (order && order.business_id) {
      creditBuyerCashback(order.business_id, cashbackEarned);

      // Record transaction
      void recordCashbackTransaction({
        businessId: order.business_id,
        storeName: order.delivery_store_name || 'Do\'kon',
        orderId: order.id,
        orderNumber: order.order_number,
        supplierName: order.supplier_name || 'Yetkazib beruvchi',
        orderAmount: Number(order.total || 0),
        cashbackRate: rate,
        amount: cashbackEarned,
        type: 'earned',
        status: 'completed',
        description: `${order.order_number} buyurtmasi uchun ${rate}% keshbek`,
      });
    }
    return;
  }
  // payment_status ustuniga to'g'ridan-to'g'ri UPDATE endi rad etiladi (DB
  // GRANT darajasida) — bu RPC keshbekni ham SHU tranzaksiyada, atomik
  // ravishda hisoblab yozadi (supabase_schema.sql: supplier_confirm_cash_payment).
  const { error } = await supabase.rpc('supplier_confirm_cash_payment', { p_order_id: orderId });
  if (error) throw new Error(error.message);
}

// ---------- Cashback & Wallet ----------
/** Faqat mock rejim uchun sinxron o'qish — Supabase rejimida fetchB2BCashbackRate() ishlatiladi. */
export function getB2BCashbackRate(): number {
  return readMock<number>(MOCK_KEYS.cashbackRate, 1.5);
}

export async function fetchB2BCashbackRate(): Promise<number> {
  if (!supabase) return getB2BCashbackRate();
  const { data } = await supabase.from('b2b_config').select('cashback_rate').eq('id', true).maybeSingle();
  return Number(data?.cashback_rate ?? 1.5);
}

export async function setB2BCashbackRate(rate: number): Promise<void> {
  if (!supabase) {
    writeMock(MOCK_KEYS.cashbackRate, rate);
    return;
  }
  const { error } = await supabase.rpc('set_b2b_cashback_rate', { p_rate: rate });
  if (error) throw new Error(error.message);
}

export const DEFAULT_PLATFORM_REQUISITES: B2BPlatformRequisites = {
  adminCardNumber: '8600 4902 1122 3344',
  adminCardHolder: 'ONBOZAR B2B RASMIY HISOBI',
  adminBankAccount: '20208000900012345001',
  adminBankMfo: '00444',
  adminBankName: 'ATB Kapitalbank Toshkent sh.',
  adminPaymentPhone: '+998 90 123 45 67',
  adminPaymentInstructions: "To'lov izohida korxona / do'kon nomini ko'rsating.",
};

export async function fetchPlatformRequisites(): Promise<B2BPlatformRequisites> {
  if (!supabase) return readMock<B2BPlatformRequisites>(MOCK_KEYS.platformRequisites, DEFAULT_PLATFORM_REQUISITES);
  const { data } = await supabase.from('b2b_config').select('*').eq('id', true).maybeSingle();
  if (!data) return DEFAULT_PLATFORM_REQUISITES;
  return {
    adminCardNumber: data.admin_card_number || DEFAULT_PLATFORM_REQUISITES.adminCardNumber,
    adminCardHolder: data.admin_card_holder || DEFAULT_PLATFORM_REQUISITES.adminCardHolder,
    adminBankAccount: data.admin_bank_account || DEFAULT_PLATFORM_REQUISITES.adminBankAccount,
    adminBankMfo: data.admin_bank_mfo || DEFAULT_PLATFORM_REQUISITES.adminBankMfo,
    adminBankName: data.admin_bank_name || DEFAULT_PLATFORM_REQUISITES.adminBankName,
    adminPaymentPhone: data.admin_payment_phone || DEFAULT_PLATFORM_REQUISITES.adminPaymentPhone,
    adminPaymentInstructions: data.admin_payment_instructions || DEFAULT_PLATFORM_REQUISITES.adminPaymentInstructions,
  };
}

export async function setPlatformRequisites(req: Partial<B2BPlatformRequisites>): Promise<void> {
  if (!supabase) {
    const curr = readMock<B2BPlatformRequisites>(MOCK_KEYS.platformRequisites, DEFAULT_PLATFORM_REQUISITES);
    writeMock(MOCK_KEYS.platformRequisites, { ...curr, ...req });
    return;
  }
  const payload: any = { updated_at: new Date().toISOString() };
  if (req.adminCardNumber !== undefined) payload.admin_card_number = req.adminCardNumber;
  if (req.adminCardHolder !== undefined) payload.admin_card_holder = req.adminCardHolder;
  if (req.adminBankAccount !== undefined) payload.admin_bank_account = req.adminBankAccount;
  if (req.adminBankMfo !== undefined) payload.admin_bank_mfo = req.adminBankMfo;
  if (req.adminBankName !== undefined) payload.admin_bank_name = req.adminBankName;
  if (req.adminPaymentPhone !== undefined) payload.admin_payment_phone = req.adminPaymentPhone;
  if (req.adminPaymentInstructions !== undefined) payload.admin_payment_instructions = req.adminPaymentInstructions;

  const { error } = await supabase.from('b2b_config').update(payload).eq('id', true);
  if (error) throw new Error(error.message);
}

export async function fetchBuyerCashbackBalance(businessId: string): Promise<number> {
  if (!supabase) {
    const stores = readMock<any[]>(MOCK_KEYS.business, []);
    const found = stores.find((s) => s.id === businessId);
    return Number(found?.cashback_balance ?? 0);
  }
  const { data } = await supabase.from('business_profiles').select('cashback_balance').eq('id', businessId).maybeSingle();
  return Number(data?.cashback_balance ?? 0);
}

/** Faqat mock rejim uchun — Supabase rejimida balans faqat SECURITY DEFINER RPC'lar orqali o'zgaradi. */
export function creditBuyerCashback(businessId: string, amount: number): void {
  if (amount <= 0) return;
  const stores = readMock<any[]>(MOCK_KEYS.business, []);
  writeMock(
    MOCK_KEYS.business,
    stores.map((s) => s.id === businessId ? { ...s, cashback_balance: Number(s.cashback_balance || 0) + amount } : s)
  );
}

/** Faqat mock rejim uchun — Supabase rejimida balans faqat SECURITY DEFINER RPC'lar orqali o'zgaradi. */
export function deductBuyerCashback(businessId: string, amount: number): void {
  if (amount <= 0) return;
  const stores = readMock<any[]>(MOCK_KEYS.business, []);
  writeMock(
    MOCK_KEYS.business,
    stores.map((s) => s.id === businessId ? { ...s, cashback_balance: Math.max(0, Number(s.cashback_balance || 0) - amount) } : s)
  );
}

function mapCashbackTransaction(r: any): B2BCashbackTransaction {
  return {
    id: r.id,
    businessId: r.business_id,
    storeName: r.business_profiles?.store_name || '',
    orderId: r.order_id ?? undefined,
    orderNumber: r.b2b_orders?.order_number ?? undefined,
    supplierName: r.b2b_orders?.supplier_profiles?.company_name ?? undefined,
    orderAmount: r.b2b_orders?.total !== undefined && r.b2b_orders?.total !== null ? Number(r.b2b_orders.total) : undefined,
    cashbackRate: Number(r.cashback_rate ?? 0),
    amount: Number(r.amount ?? 0),
    type: r.type,
    status: r.status,
    payoutDetails: r.payout_details || undefined,
    description: r.description || '',
    createdAt: r.created_at,
  };
}

export async function listCashbackTransactions(businessId?: string): Promise<B2BCashbackTransaction[]> {
  if (!supabase) {
    const all = readMock<B2BCashbackTransaction[]>(MOCK_KEYS.cashbackTransactions, SEED_CASHBACK_TRANSACTIONS);
    return businessId ? all.filter((tx) => tx.businessId === businessId) : all;
  }
  let query = supabase
    .from('b2b_cashback_transactions')
    .select('*, business_profiles(store_name), b2b_orders(order_number, total, supplier_profiles(company_name))')
    .order('created_at', { ascending: false });
  if (businessId) query = query.eq('business_id', businessId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapCashbackTransaction);
}

/** Faqat mock rejim uchun — Supabase rejimida yozuvlar RPC'lar ichida yaratiladi. */
export async function recordCashbackTransaction(
  tx: Omit<B2BCashbackTransaction, 'id' | 'createdAt'>
): Promise<B2BCashbackTransaction> {
  const item: B2BCashbackTransaction = {
    id: genId('cb-tx'),
    ...tx,
    createdAt: new Date().toISOString(),
  };
  const all = readMock<B2BCashbackTransaction[]>(MOCK_KEYS.cashbackTransactions, SEED_CASHBACK_TRANSACTIONS);
  writeMock(MOCK_KEYS.cashbackTransactions, [item, ...all]);
  return item;
}

export async function requestCashbackWithdrawal(
  businessId: string,
  storeName: string,
  amount: number,
  payoutDetails: string
): Promise<void> {
  if (amount <= 0) throw new Error("Chiqarish summasi 0 dan katta bo'lishi kerak");
  if (!supabase) {
    const bal = await fetchBuyerCashbackBalance(businessId);
    if (bal < amount) throw new Error("Hamyonda yetarli keshbek mablag'i yo'q");
    deductBuyerCashback(businessId, amount);
    await recordCashbackTransaction({
      businessId,
      storeName,
      amount: -amount,
      cashbackRate: 0,
      type: 'withdrawn',
      status: 'pending',
      payoutDetails,
      description: `Keshbekni yechib olish so'rovi (${payoutDetails})`,
    });
    return;
  }
  const { error } = await supabase.rpc('request_cashback_withdrawal', {
    p_business_id: businessId,
    p_amount: amount,
    p_payout_details: payoutDetails,
  });
  if (error) throw new Error(error.message);
}

export async function adminUpdateWithdrawalStatus(txId: string, status: 'completed' | 'rejected'): Promise<void> {
  if (!supabase) {
    const all = readMock<B2BCashbackTransaction[]>(MOCK_KEYS.cashbackTransactions, SEED_CASHBACK_TRANSACTIONS);
    const target = all.find((t) => t.id === txId);
    if (target && status === 'rejected') {
      // refund back to store
      creditBuyerCashback(target.businessId, Math.abs(target.amount));
    }
    writeMock(
      MOCK_KEYS.cashbackTransactions,
      all.map((t) => t.id === txId ? { ...t, status } : t)
    );
    return;
  }
  const { error } = await supabase.rpc('admin_update_cashback_withdrawal', { p_tx_id: txId, p_status: status });
  if (error) throw new Error(error.message);
}

export async function adminGrantBonusCashback(
  businessId: string,
  storeName: string,
  amount: number,
  description: string
): Promise<void> {
  if (!supabase) {
    creditBuyerCashback(businessId, amount);
    await recordCashbackTransaction({
      businessId,
      storeName,
      amount,
      cashbackRate: 0,
      type: 'admin_bonus',
      status: 'completed',
      description: description || "Admin tomonidan taqdim etilgan maxsus bonus",
    });
    return;
  }
  const { error } = await supabase.rpc('admin_grant_business_cashback', {
    p_business_id: businessId,
    p_amount: amount,
    p_description: description || '',
  });
  if (error) throw new Error(error.message);
}

// ---------- Map Stores (Privacy-protected) ----------
export async function listStoresForMap(): Promise<B2BStorePublicMarker[]> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.business, SEED_STORES);
    return all
      .filter((s) => s.status !== 'suspended')
      .map((s) => ({
        id: s.id,
        storeName: s.store_name ?? s.storeName,
        businessType: s.business_type ?? s.businessType ?? 'grocery',
        region: s.region || 'Toshkent',
        district: s.district || 'Shahar markazi',
        address: s.address || '',
        latitude: Number(s.latitude) || 41.2995,
        longitude: Number(s.longitude) || 69.2401,
        logoUrl: s.logo_url ?? s.logoUrl,
        description: s.description || '',
        createdAt: s.created_at ?? s.createdAt ?? new Date().toISOString(),
      }));
  }

  // business_profiles jadvalida latitude/longitude ustunlari yo'q — bu
  // ma'lumot business_addresses jadvalidagi asosiy (is_default) manzilda
  // saqlanadi, shuning uchun xaritaga faqat GPS koordinatasi bor va biznes
  // profili faol bo'lgan do'konlar birlashtirilib chiqariladi.
  const { data, error } = await supabase
    .from('business_addresses')
    .select('business_id, address, latitude, longitude, business_profiles!inner(id, store_name, business_type, region, district, logo_url, description, status, created_at)')
    .eq('is_default', true)
    .eq('business_profiles.status', 'active')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error || !data) return [];
  return data.map((row: any) => {
    const s = row.business_profiles;
    return {
      id: s.id,
      storeName: s.store_name,
      businessType: s.business_type,
      region: s.region || 'Toshkent',
      district: s.district || '',
      address: row.address || '',
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      logoUrl: s.logo_url,
      description: s.description,
      createdAt: s.created_at,
    };
  });
}

// ---------- Direct B2B In-App Offers ----------
function mapDirectOffer(r: any): B2BDirectOffer {
  return {
    id: r.id,
    supplierId: r.supplier_id ?? r.supplierId,
    supplierName: r.supplier_profiles?.company_name ?? r.supplierName ?? '',
    businessId: r.business_id ?? r.businessId,
    storeName: r.business_profiles?.store_name ?? r.storeName ?? '',
    message: r.message ?? '',
    discountPercent: r.discount_percent ?? undefined,
    products: r.products ?? [],
    status: r.status,
    createdAt: r.created_at ?? r.createdAt,
  };
}

export async function sendDirectOffer(
  input: Omit<B2BDirectOffer, 'id' | 'status' | 'createdAt'>
): Promise<B2BDirectOffer> {
  if (!supabase) {
    const offer: B2BDirectOffer = { id: genId('offer'), ...input, status: 'pending', createdAt: new Date().toISOString() };
    const all = readMock<B2BDirectOffer[]>(MOCK_KEYS.directOffers, []);
    writeMock(MOCK_KEYS.directOffers, [offer, ...all]);
    return offer;
  }
  const { data, error } = await supabase
    .from('b2b_direct_offers')
    .insert({
      supplier_id: input.supplierId,
      business_id: input.businessId,
      message: input.message,
      discount_percent: input.discountPercent ?? null,
      products: input.products ?? [],
    })
    .select('*, supplier_profiles(company_name), business_profiles(store_name)')
    .single();
  if (error || !data) throw new Error(error?.message || 'Taklif yuborilmadi');
  return mapDirectOffer(data);
}

export async function listDirectOffersForStore(businessId: string): Promise<B2BDirectOffer[]> {
  if (!supabase) {
    const all = readMock<B2BDirectOffer[]>(MOCK_KEYS.directOffers, []);
    return all.filter((o) => o.businessId === businessId);
  }
  const { data, error } = await supabase
    .from('b2b_direct_offers')
    .select('*, supplier_profiles(company_name), business_profiles(store_name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDirectOffer);
}

export async function listDirectOffersForSupplier(supplierId: string): Promise<B2BDirectOffer[]> {
  if (!supabase) {
    const all = readMock<B2BDirectOffer[]>(MOCK_KEYS.directOffers, []);
    return all.filter((o) => o.supplierId === supplierId);
  }
  const { data, error } = await supabase
    .from('b2b_direct_offers')
    .select('*, supplier_profiles(company_name), business_profiles(store_name)')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDirectOffer);
}

export async function respondToDirectOffer(offerId: string, status: 'accepted' | 'declined'): Promise<void> {
  if (!supabase) {
    const all = readMock<B2BDirectOffer[]>(MOCK_KEYS.directOffers, []);
    writeMock(MOCK_KEYS.directOffers, all.map((o) => o.id === offerId ? { ...o, status } : o));
    return;
  }
  const { error } = await supabase.from('b2b_direct_offers').update({ status }).eq('id', offerId);
  if (error) throw new Error(error.message);
}

// ---------- Finance ----------
export async function fetchSupplierFinanceSummary(supplierId: string, sinceIso?: string): Promise<SupplierFinanceSummary> {
  const empty: SupplierFinanceSummary = { grossSales: 0, totalCommission: 0, netAmount: 0, completedOrders: 0, pendingOrders: 0, cashOrders: 0, onlineOrders: 0 };
  if (!supabase) {
    let ledger = readMock<any[]>(MOCK_KEYS.ledger, []).filter((l) => l.supplier_id === supplierId);
    if (sinceIso) ledger = ledger.filter((l) => l.created_at >= sinceIso);
    const orders = readMock<any[]>(MOCK_KEYS.orders, []).filter((o) => o.supplier_id === supplierId);
    return summarize(ledger, orders);
  }
  let ledgerQuery = supabase.from('commission_ledger').select('*').eq('supplier_id', supplierId);
  if (sinceIso) ledgerQuery = ledgerQuery.gte('created_at', sinceIso);
  const [ledgerRes, ordersRes] = await Promise.all([
    ledgerQuery,
    supabase.from('b2b_orders').select('status, payment_method').eq('supplier_id', supplierId),
  ]);
  if (ledgerRes.error || !ledgerRes.data) return empty;
  return summarize(ledgerRes.data, ordersRes.data || []);
}

function summarize(ledger: any[], orders: any[]): SupplierFinanceSummary {
  const active = ledger.filter((l) => l.status !== 'voided');
  const grossSales = active.reduce((s, l) => s + Number(l.gross_amount || 0), 0);
  const totalCommission = active.reduce((s, l) => s + Number(l.commission_amount || 0), 0);
  return {
    grossSales,
    totalCommission,
    netAmount: grossSales - totalCommission,
    completedOrders: orders.filter((o) => o.status === 'delivered').length,
    pendingOrders: orders.filter((o) => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length,
    cashOrders: orders.filter((o) => o.payment_method === 'cash').length,
    onlineOrders: orders.filter((o) => o.payment_method === 'online').length,
  };
}

export const b2bRepository = {
  fetchOwnBusinessProfile,
  registerBusinessBuyer,
  addBusinessAddress,
  fetchOwnSupplierProfile,
  registerSupplier,
  listVerifiedSuppliers,
  getSupplier,
  fetchOwnContract,
  respondToContract,
  listB2BProducts,
  getB2BProduct,
  listOwnB2BProducts,
  submitB2BProduct,
  updateB2BProduct,
  deleteB2BProduct,
  checkoutB2BCart,
  listB2BOrdersForBuyer,
  listB2BOrdersForSupplier,
  getB2BOrder,
  getB2BOrderItems,
  supplierUpdateOrderStatus,
  supplierConfirmCashPayment,
  fetchSupplierFinanceSummary,
  listStoresForMap,
  getB2BCashbackRate,
  fetchB2BCashbackRate,
  setB2BCashbackRate,
  fetchBuyerCashbackBalance,
  creditBuyerCashback,
  deductBuyerCashback,
  sendDirectOffer,
  listDirectOffersForStore,
  listDirectOffersForSupplier,
  respondToDirectOffer,
  listCashbackTransactions,
  recordCashbackTransaction,
  requestCashbackWithdrawal,
  adminUpdateWithdrawalStatus,
  adminGrantBonusCashback,
  fetchPlatformRequisites,
  setPlatformRequisites,
};

