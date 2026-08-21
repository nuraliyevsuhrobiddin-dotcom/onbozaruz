/**
 * B2B admin repository — adminRepository.ts naqshini takrorlaydi (to'g'ridan
 * to'g'ri Supabase, mock rejimda localStorage'ga asoslangan yengil qatlam).
 */
import { supabaseClient } from './authClient';
import { SupplierProfile, B2BProduct, B2BOrder, CommissionLedgerEntry, SupplierVerificationStatus, B2BProductStatus } from './types';
import { B2B_CONTRACT_VERSION } from '../data/b2bContractTemplate';

const supabase = supabaseClient;

const MOCK_KEYS = {
  supplier: 'onbozor-b2b-supplier-profiles',
  products: 'onbozor-b2b-products',
  orders: 'onbozor-b2b-orders',
  ledger: 'onbozor-b2b-commission-ledger',
  contracts: 'onbozor-b2b-contracts',
};

function readMock<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function writeMock<T>(key: string, value: T): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}

function mapSupplier(r: any): SupplierProfile {
  return {
    id: r.id, userId: r.user_id, companyName: r.company_name, supplierType: r.supplier_type,
    ownerName: r.owner_name || '', phone: r.phone || '', email: r.email || '', region: r.region || '',
    district: r.district || '', address: r.address || '', description: r.description || '',
    categories: r.categories || [], taxId: r.tax_id || '', logoUrl: r.logo_url || '',
    verificationStatus: r.verification_status, rejectionReason: r.rejection_reason || '',
    commissionRate: Number(r.commission_rate ?? 5), createdAt: r.created_at,
  };
}
function mapProduct(r: any): B2BProduct {
  return {
    id: r.id, supplierId: r.supplier_id, name: r.name, brand: r.brand || '', category: r.category,
    description: r.description || '', sku: r.sku || '', images: r.images || [], videoUrl: r.video_url || '',
    wholesalePrice: Number(r.wholesale_price || 0), moq: Number(r.moq || 1), availableQty: Number(r.available_qty || 0),
    unit: r.unit || 'dona', packaging: r.packaging || '', deliveryAvailable: Boolean(r.delivery_available),
    deliveryRegions: r.delivery_regions || [], status: r.status, rejectionReason: r.rejection_reason || '',
    createdAt: r.created_at, supplierName: r.supplier_profiles?.company_name,
  };
}
function mapOrder(r: any): B2BOrder {
  return {
    id: r.id, orderNumber: r.order_number, businessId: r.business_id, supplierId: r.supplier_id,
    buyerUserId: r.buyer_user_id, subtotal: Number(r.subtotal || 0), deliveryFee: Number(r.delivery_fee || 0),
    total: Number(r.total || 0), paymentMethod: r.payment_method, paymentStatus: r.payment_status, status: r.status,
    rejectionReason: r.rejection_reason || '', commissionRate: Number(r.commission_rate || 0),
    commissionAmount: Number(r.commission_amount || 0), supplierAmount: Number(r.supplier_amount || 0),
    deliveryStoreName: r.delivery_store_name || '', deliveryPhone: r.delivery_phone || '',
    deliveryRegion: r.delivery_region || '', deliveryDistrict: r.delivery_district || '',
    deliveryAddress: r.delivery_address || '', deliveryNote: r.delivery_note || '', createdAt: r.created_at,
    supplierName: r.supplier_profiles?.company_name, businessName: r.business_profiles?.store_name,
  };
}
function mapLedger(r: any): CommissionLedgerEntry {
  return {
    id: r.id, orderId: r.order_id, supplierId: r.supplier_id, grossAmount: Number(r.gross_amount || 0),
    commissionRate: Number(r.commission_rate || 0), commissionAmount: Number(r.commission_amount || 0),
    supplierAmount: Number(r.supplier_amount || 0), paymentMethod: r.payment_method, status: r.status, createdAt: r.created_at,
  };
}

// ---------- Suppliers ----------
export async function listAllSuppliers(): Promise<SupplierProfile[]> {
  if (!supabase) return readMock<any[]>(MOCK_KEYS.supplier, []).map(mapSupplier);
  const { data, error } = await supabase.from('supplier_profiles').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapSupplier);
}

export async function updateSupplierVerification(id: string, status: SupplierVerificationStatus, rejectionReason = ''): Promise<void> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.supplier, []);
    const supplier = all.find((s) => s.id === id);
    writeMock(MOCK_KEYS.supplier, all.map((s) => s.id === id ? { ...s, verification_status: status, rejection_reason: rejectionReason } : s));

    // Mirrors the real handle_supplier_verification_change SQL trigger:
    // approving a supplier auto-issues their cooperation contract so the
    // dashboard's contract gate has something to load in mock mode too.
    if (status === 'approved' && supplier) {
      const contracts = readMock<any[]>(MOCK_KEYS.contracts, []);
      if (!contracts.some((c) => c.supplier_id === id)) {
        writeMock(MOCK_KEYS.contracts, [...contracts, {
          id: `contract-${Date.now()}`,
          supplier_id: id,
          contract_version: B2B_CONTRACT_VERSION,
          commission_rate: supplier.commission_rate ?? 5,
          status: 'pending',
          accepted_at: null,
          terminated_at: null,
          termination_reason: '',
          created_at: new Date().toISOString(),
        }]);
      }
    }
    return;
  }
  const { error } = await supabase.from('supplier_profiles').update({ verification_status: status, rejection_reason: rejectionReason }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateSupplierCommissionRate(id: string, rate: number): Promise<void> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.supplier, []);
    writeMock(MOCK_KEYS.supplier, all.map((s) => s.id === id ? { ...s, commission_rate: rate } : s));
    return;
  }
  const { error } = await supabase.from('supplier_profiles').update({ commission_rate: rate }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- B2B products ----------
export async function listAllB2BProducts(): Promise<B2BProduct[]> {
  if (!supabase) {
    const suppliers = readMock<any[]>(MOCK_KEYS.supplier, []);
    return readMock<any[]>(MOCK_KEYS.products, []).map((p) => mapProduct({ ...p, supplier_profiles: { company_name: suppliers.find((s) => s.id === p.supplier_id)?.company_name } }));
  }
  const { data, error } = await supabase.from('b2b_products').select('*, supplier_profiles(company_name)').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapProduct);
}

export async function updateB2BProductModeration(id: string, status: B2BProductStatus, rejectionReason = ''): Promise<void> {
  if (!supabase) {
    const all = readMock<any[]>(MOCK_KEYS.products, []);
    writeMock(MOCK_KEYS.products, all.map((p) => p.id === id ? { ...p, status, rejection_reason: rejectionReason } : p));
    return;
  }
  const { error } = await supabase.from('b2b_products').update({ status, rejection_reason: rejectionReason }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- B2B orders ----------
export async function listAllB2BOrders(): Promise<B2BOrder[]> {
  if (!supabase) {
    const suppliers = readMock<any[]>(MOCK_KEYS.supplier, []);
    return readMock<any[]>(MOCK_KEYS.orders, []).map((o) => mapOrder({ ...o, supplier_profiles: { company_name: suppliers.find((s) => s.id === o.supplier_id)?.company_name } }));
  }
  const { data, error } = await supabase
    .from('b2b_orders')
    .select('*, supplier_profiles(company_name), business_profiles(store_name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map(mapOrder);
}

// ---------- Commission ledger ----------
export async function listCommissionLedger(): Promise<CommissionLedgerEntry[]> {
  if (!supabase) return readMock<any[]>(MOCK_KEYS.ledger, []).map(mapLedger);
  const { data, error } = await supabase.from('commission_ledger').select('*').order('created_at', { ascending: false }).limit(100);
  if (error || !data) return [];
  return data.map(mapLedger);
}

export const b2bAdminRepository = {
  listAllSuppliers,
  updateSupplierVerification,
  updateSupplierCommissionRate,
  listAllB2BProducts,
  updateB2BProductModeration,
  listAllB2BOrders,
  listCommissionLedger,
};
