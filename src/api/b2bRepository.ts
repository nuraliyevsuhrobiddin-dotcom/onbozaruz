/**
 * B2B (ulgurji savdo) repository.
 *
 * Talks to the API client directly (not src/api/http.ts) because checkout and
 * cashback run through server-side RPCs that the generic REST wrapper does not cover.
 */
import { apiClient } from './authClient';
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

// ---------- Mappers (snake_case DB row -> camelCase domain type) ----------
export function mapBusinessProfile(r: any): BusinessProfile {
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
    latitude: r.latitude !== undefined && r.latitude !== null && !isNaN(Number(r.latitude))
      ? Number(r.latitude)
      : (r.region === 'Samarqand' ? 39.6542 : r.region === 'Farg\'ona' ? 40.3864 : 41.2995 + (((r.id ? r.id.charCodeAt(0) : 10) % 7) - 3) * 0.01),
    longitude: r.longitude !== undefined && r.longitude !== null && !isNaN(Number(r.longitude))
      ? Number(r.longitude)
      : (r.region === 'Samarqand' ? 66.9597 : r.region === 'Farg\'ona' ? 71.7864 : 69.2401 + (((r.id ? r.id.charCodeAt(r.id.length - 1) : 20) % 7) - 3) * 0.01),
    description: r.description ?? '',
    logoUrl: r.logo_url ?? r.logoUrl ?? '',
    cashbackBalance: Number(r.cashback_balance ?? r.cashbackBalance ?? 0),
    status: r.status ?? 'active',
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

export function mapSupplierProfile(r: any): SupplierProfile {
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

export function mapContract(r: any): Contract {
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

export function mapB2BProduct(r: any): B2BProduct {
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

export function mapB2BOrder(r: any): B2BOrder {
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

export function mapB2BOrderItem(r: any): B2BOrderItem {
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
  const { data: session } = await apiClient.auth.getUser();
  if (!session.user) return null;
  const { data, error } = await apiClient.from('business_profiles').select('*').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) return null;
  return mapBusinessProfile(data);
}

const REGION_CENTERS: Record<string, [number, number]> = {
  'toshkent sh': [41.2995, 69.2401],
  'toshkent v': [41.2825, 69.2044],
  'toshkent': [41.2995, 69.2401],
  "farg'ona": [40.3842, 71.7843],
  'fargona': [40.3842, 71.7843],
  'andijon': [40.7821, 72.3442],
  'namangan': [40.9983, 71.6726],
  'samarqand': [39.6542, 66.9597],
  'buxoro': [39.7747, 64.4286],
  'xorazm': [41.5564, 60.6317],
  'surxondaryo': [37.2286, 67.2753],
  'qashqadaryo': [38.8606, 65.7891],
  'jizzax': [40.1158, 67.8422],
  'sirdaryo': [40.8373, 68.6618],
  'navoiy': [40.1039, 65.3688],
  "qoraqalpog'iston": [42.4619, 59.6166],
};

function getStoreCoordinates(region?: string, lat?: number | null, lng?: number | null): { latitude: number; longitude: number } {
  if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
    return { latitude: lat, longitude: lng };
  }
  const cleanReg = (region || '').toLowerCase().replace(/\s+(sh\.|v\.|r\.|viloyati|shahri|respublikasi)/g, '').trim();
  for (const [key, center] of Object.entries(REGION_CENTERS)) {
    if (cleanReg.includes(key) || key.includes(cleanReg)) {
      const jitterLat = (Math.random() - 0.5) * 0.02;
      const jitterLng = (Math.random() - 0.5) * 0.02;
      return { latitude: center[0] + jitterLat, longitude: center[1] + jitterLng };
    }
  }
  return { latitude: 41.2995 + (Math.random() - 0.5) * 0.02, longitude: 69.2401 + (Math.random() - 0.5) * 0.02 };
}

export async function registerBusinessBuyer(input: CreateBusinessProfileInput): Promise<BusinessProfile> {
  const requiredFields: Array<[string | undefined, string]> = [
    [input.storeName, "Do'kon nomi"],
    [input.phone, 'Telefon raqami'],
    [input.region, 'Viloyat'],
    [input.district, 'Tuman/shahar'],
    [input.address, "To'liq manzil"],
  ];
  const missingField = requiredFields.find(([value]) => !value?.trim());
  if (missingField) {
    throw new Error(`${missingField[1]} majburiy`);
  }

  const coords = getStoreCoordinates(input.region, input.latitude, input.longitude);

  const { data: session } = await apiClient.auth.getUser();
  if (!session.user) throw new Error('Sessiya topilmadi');

  const { data, error } = await apiClient.from('business_profiles').insert({
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

  try {
    const savedAddress = await addBusinessAddress(profile.id, {
      storeName: input.storeName,
      phone: input.phone,
      region: input.region || '',
      district: input.district || '',
      address: input.address?.trim() || `${input.region || ''} ${input.district || ''}`.trim() || "Do'kon manzili",
      latitude: coords.latitude,
      longitude: coords.longitude,
      isDefault: true,
    });
    profile.address = savedAddress.address;
    profile.latitude = savedAddress.latitude ?? profile.latitude;
    profile.longitude = savedAddress.longitude ?? profile.longitude;
  } catch (addrErr) {
    console.warn('Address creation error:', addrErr);
  }

  return profile;
}

export async function addBusinessAddress(businessId: string, input: Omit<BusinessAddress, 'id' | 'businessId'>): Promise<BusinessAddress> {
  const { data, error } = await apiClient.from('business_addresses').insert({
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
    is_default: input.isDefault ?? true,
  }).select().single();

  if (error || !data) throw new Error(error?.message || 'Manzil saqlanmadi');
  return {
    id: data.id,
    businessId: data.business_id,
    label: data.label,
    storeName: data.store_name,
    phone: data.phone,
    region: data.region,
    district: data.district,
    address: data.address,
    deliveryNote: data.delivery_note,
    latitude: data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : null,
    longitude: data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : null,
  };
}

// ---------- Supplier profile ----------
export async function fetchOwnSupplierProfile(): Promise<SupplierProfile | null> {
  const { data: session } = await apiClient.auth.getUser();
  if (!session.user) return null;
  const { data, error } = await apiClient.from('supplier_profiles').select('*').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) return null;
  return mapSupplierProfile(data);
}

export async function registerSupplier(input: CreateSupplierProfileInput): Promise<SupplierProfile> {
  const { data: session } = await apiClient.auth.getUser();
  if (!session.user) throw new Error('Sessiya topilmadi');
  const { data, error } = await apiClient.from('supplier_profiles').insert({
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
  let query = apiClient.from('supplier_profiles').select('*').eq('verification_status', 'approved');
  if (search) query = query.ilike('company_name', `%${search}%`);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapSupplierProfile);
}

export async function getSupplier(id: string): Promise<SupplierProfile | null> {
  const { data, error } = await apiClient.from('supplier_profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapSupplierProfile(data);
}

// ---------- Contract ----------
export async function fetchOwnContract(supplierId: string): Promise<Contract | null> {
  const { data, error } = await apiClient.from('contracts').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapContract(data);
}

export async function respondToContract(contractId: string, accept: boolean): Promise<void> {
  const { error } = await apiClient.from('contracts').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', contractId);
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
  let query = apiClient.from('b2b_products').select('*, supplier_profiles(company_name, verification_status, region)').eq('status', 'approved');
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
  const { data, error } = await apiClient.from('b2b_products').select('*, supplier_profiles(company_name, verification_status)').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapB2BProduct(data);
}

export async function listOwnB2BProducts(supplierId: string): Promise<B2BProduct[]> {
  const { data, error } = await apiClient.from('b2b_products').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapB2BProduct);
}

export async function submitB2BProduct(input: CreateB2BProductInput): Promise<B2BProduct> {
  const { data, error } = await apiClient.from('b2b_products').insert({
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
  const { error } = await apiClient.from('b2b_products').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteB2BProduct(id: string): Promise<void> {
  const { error } = await apiClient.from('b2b_products').delete().eq('id', id);
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
  const { data, error } = await apiClient.rpc('create_b2b_order', {
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
  const requiredDeliveryFields: Array<[string, string]> = [
    [delivery.storeName, "Do'kon nomi"],
    [delivery.phone, 'Telefon raqami'],
    [delivery.region, 'Viloyat'],
    [delivery.district, 'Tuman'],
    [delivery.address, 'To\'liq manzil'],
  ];
  const missingField = requiredDeliveryFields.find(([value]) => !value?.trim());
  if (missingField) {
    throw new Error(`${missingField[1]} majburiy`);
  }

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
  const { data: session } = await apiClient.auth.getUser();
  if (!session.user) return [];
  const { data, error } = await apiClient
    .from('b2b_orders')
    .select('*, supplier_profiles(company_name)')
    .eq('buyer_user_id', session.user.id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapB2BOrder);
}

export async function listB2BOrdersForSupplier(supplierId: string): Promise<B2BOrder[]> {
  const { data, error } = await apiClient
    .from('b2b_orders')
    .select('*, business_profiles(store_name)')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapB2BOrder);
}

export async function getB2BOrder(orderId: string): Promise<B2BOrder | null> {
  const { data, error } = await apiClient
    .from('b2b_orders')
    .select('*, supplier_profiles(company_name), business_profiles(store_name)')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !data) return null;
  const items = await getB2BOrderItems(orderId);
  return { ...mapB2BOrder(data), items };
}

export async function getB2BOrderItems(orderId: string): Promise<B2BOrderItem[]> {
  const { data, error } = await apiClient.from('b2b_order_items').select('*').eq('order_id', orderId);
  if (error || !data) return [];
  return data.map(mapB2BOrderItem);
}

export async function supplierUpdateOrderStatus(orderId: string, status: B2BOrderStatus, rejectionReason?: string): Promise<void> {
  const payload: Record<string, unknown> = { status };
  if (rejectionReason !== undefined) payload.rejection_reason = rejectionReason;
  const { error } = await apiClient.from('b2b_orders').update(payload).eq('id', orderId);
  if (error) throw new Error(error.message);
}

export async function supplierConfirmCashPayment(orderId: string): Promise<void> {
  // payment_status cannot be updated directly; this RPC confirms the cash payment
  // and credits the buyer's cashback in one transaction (public/api/_lib/rpc.php).
  const { error } = await apiClient.rpc('supplier_confirm_cash_payment', { p_order_id: orderId });
  if (error) throw new Error(error.message);
}

// ---------- Cashback & Wallet ----------
export async function fetchB2BCashbackRate(): Promise<number> {
  const { data } = await apiClient.from('b2b_config').select('cashback_rate').eq('id', true).maybeSingle();
  return Number(data?.cashback_rate ?? 1.5);
}

export async function setB2BCashbackRate(rate: number): Promise<void> {
  const { error } = await apiClient.rpc('set_b2b_cashback_rate', { p_rate: rate });
  if (error) throw new Error(error.message);
}

/** Shown until the admin enters real payment details: never a placeholder card number. */
export const DEFAULT_PLATFORM_REQUISITES: B2BPlatformRequisites = {
  adminCardNumber: '',
  adminCardHolder: '',
  adminBankAccount: '',
  adminBankMfo: '',
  adminBankName: '',
  adminPaymentPhone: '',
  adminPaymentInstructions: '',
};

export async function fetchPlatformRequisites(): Promise<B2BPlatformRequisites> {
  const { data } = await apiClient.from('b2b_config').select('*').eq('id', true).maybeSingle();
  if (!data) return DEFAULT_PLATFORM_REQUISITES;
  return {
    adminCardNumber: data.admin_card_number || '',
    adminCardHolder: data.admin_card_holder || '',
    adminBankAccount: data.admin_bank_account || '',
    adminBankMfo: data.admin_bank_mfo || '',
    adminBankName: data.admin_bank_name || '',
    adminPaymentPhone: data.admin_payment_phone || '',
    adminPaymentInstructions: data.admin_payment_instructions || '',
  };
}

export async function setPlatformRequisites(req: Partial<B2BPlatformRequisites>): Promise<void> {
  const payload: any = { updated_at: new Date().toISOString() };
  if (req.adminCardNumber !== undefined) payload.admin_card_number = req.adminCardNumber;
  if (req.adminCardHolder !== undefined) payload.admin_card_holder = req.adminCardHolder;
  if (req.adminBankAccount !== undefined) payload.admin_bank_account = req.adminBankAccount;
  if (req.adminBankMfo !== undefined) payload.admin_bank_mfo = req.adminBankMfo;
  if (req.adminBankName !== undefined) payload.admin_bank_name = req.adminBankName;
  if (req.adminPaymentPhone !== undefined) payload.admin_payment_phone = req.adminPaymentPhone;
  if (req.adminPaymentInstructions !== undefined) payload.admin_payment_instructions = req.adminPaymentInstructions;

  const { error } = await apiClient.from('b2b_config').update(payload).eq('id', true);
  if (error) throw new Error(error.message);
}

export async function fetchBuyerCashbackBalance(businessId: string): Promise<number> {
  const { data } = await apiClient.from('business_profiles').select('cashback_balance').eq('id', businessId).maybeSingle();
  return Number(data?.cashback_balance ?? 0);
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
  let query = apiClient
    .from('b2b_cashback_transactions')
    .select('*, business_profiles(store_name), b2b_orders(order_number, total, supplier_profiles(company_name))')
    .order('created_at', { ascending: false });
  if (businessId) query = query.eq('business_id', businessId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapCashbackTransaction);
}

export async function requestCashbackWithdrawal(
  businessId: string,
  storeName: string,
  amount: number,
  payoutDetails: string
): Promise<void> {
  if (amount <= 0) throw new Error("Chiqarish summasi 0 dan katta bo'lishi kerak");
  const { error } = await apiClient.rpc('request_cashback_withdrawal', {
    p_business_id: businessId,
    p_amount: amount,
    p_payout_details: payoutDetails,
  });
  if (error) throw new Error(error.message);
}

export async function adminUpdateWithdrawalStatus(txId: string, status: 'completed' | 'rejected'): Promise<void> {
  const { error } = await apiClient.rpc('admin_update_cashback_withdrawal', { p_tx_id: txId, p_status: status });
  if (error) throw new Error(error.message);
}

export async function adminGrantBonusCashback(
  businessId: string,
  storeName: string,
  amount: number,
  description: string
): Promise<void> {
  const { error } = await apiClient.rpc('admin_grant_business_cashback', {
    p_business_id: businessId,
    p_amount: amount,
    p_description: description || '',
  });
  if (error) throw new Error(error.message);
}

// ---------- Map Stores (Privacy-protected) ----------
export async function listStoresForMap(): Promise<B2BStorePublicMarker[]> {
  // The RPC returns only public store fields (no owner phone or user id).
  const { data, error } = await apiClient.rpc('get_public_stores_for_map');
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []).map((s: any) => {
    const coords = getStoreCoordinates(s.region, s.latitude, s.longitude);
    return {
      id: s.id,
      storeName: s.store_name,
      businessType: s.business_type || 'grocery',
      region: s.region || 'Toshkent',
      district: s.district || '',
      address: s.address || '',
      latitude: coords.latitude,
      longitude: coords.longitude,
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

async function addPublicStoreNames(offers: B2BDirectOffer[]): Promise<B2BDirectOffer[]> {
  if (offers.length === 0) return offers;

  // business_profiles is private because it includes owner contact details and
  // cashback balance. The map RPC returns the safe public store label needed
  // by the offers UI without re-exposing those fields.
  const stores = await listStoresForMap();
  const storeNames = new Map(stores.map((store) => [store.id, store.storeName]));

  return offers.map((offer) => ({
    ...offer,
    storeName: storeNames.get(offer.businessId) || offer.storeName,
  }));
}

export async function sendDirectOffer(
  input: Omit<B2BDirectOffer, 'id' | 'status' | 'createdAt'>
): Promise<B2BDirectOffer> {
  const { data, error } = await apiClient
    .from('b2b_direct_offers')
    .insert({
      supplier_id: input.supplierId,
      business_id: input.businessId,
      message: input.message,
      discount_percent: input.discountPercent ?? null,
      products: input.products ?? [],
    })
    .select('*, supplier_profiles(company_name)')
    .single();
  if (error || !data) throw new Error(error?.message || 'Taklif yuborilmadi');
  return (await addPublicStoreNames([mapDirectOffer(data)]))[0];
}

export async function listDirectOffersForStore(businessId: string): Promise<B2BDirectOffer[]> {
  const { data, error } = await apiClient
    .from('b2b_direct_offers')
    .select('*, supplier_profiles(company_name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return addPublicStoreNames(data.map(mapDirectOffer));
}

export async function listDirectOffersForSupplier(supplierId: string): Promise<B2BDirectOffer[]> {
  const { data, error } = await apiClient
    .from('b2b_direct_offers')
    .select('*, supplier_profiles(company_name)')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return addPublicStoreNames(data.map(mapDirectOffer));
}

export async function respondToDirectOffer(offerId: string, status: 'accepted' | 'declined'): Promise<void> {
  const { error } = await apiClient.from('b2b_direct_offers').update({ status }).eq('id', offerId);
  if (error) throw new Error(error.message);
}

// ---------- Finance ----------
export async function fetchSupplierFinanceSummary(supplierId: string, sinceIso?: string): Promise<SupplierFinanceSummary> {
  const empty: SupplierFinanceSummary = { grossSales: 0, totalCommission: 0, netAmount: 0, completedOrders: 0, pendingOrders: 0, cashOrders: 0, onlineOrders: 0 };
  let ledgerQuery = apiClient.from('commission_ledger').select('*').eq('supplier_id', supplierId);
  if (sinceIso) ledgerQuery = ledgerQuery.gte('created_at', sinceIso);
  const [ledgerRes, ordersRes] = await Promise.all([
    ledgerQuery,
    apiClient.from('b2b_orders').select('status, payment_method').eq('supplier_id', supplierId),
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
  fetchB2BCashbackRate,
  setB2BCashbackRate,
  fetchBuyerCashbackBalance,
  sendDirectOffer,
  listDirectOffersForStore,
  listDirectOffersForSupplier,
  respondToDirectOffer,
  listCashbackTransactions,
  requestCashbackWithdrawal,
  adminUpdateWithdrawalStatus,
  adminGrantBonusCashback,
  fetchPlatformRequisites,
  setPlatformRequisites,
};
