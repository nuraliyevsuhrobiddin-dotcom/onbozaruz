/**
 * B2B admin data access: supplier verification, product moderation, orders,
 * commission ledger and store management.
 */
import { apiClient } from './authClient';
import { SupplierProfile, B2BProduct, B2BOrder, CommissionLedgerEntry, SupplierVerificationStatus, B2BProductStatus } from './types';
import { mapSupplierProfile, mapB2BProduct, mapB2BOrder, mapB2BOrderItem, mapBusinessProfile } from './b2bRepository';

function mapLedger(r: any): CommissionLedgerEntry {
  return {
    id: r.id, orderId: r.order_id, supplierId: r.supplier_id, grossAmount: Number(r.gross_amount || 0),
    commissionRate: Number(r.commission_rate || 0), commissionAmount: Number(r.commission_amount || 0),
    supplierAmount: Number(r.supplier_amount || 0), paymentMethod: r.payment_method, status: r.status, createdAt: r.created_at,
  };
}

// ---------- Suppliers ----------
export async function listAllSuppliers(): Promise<SupplierProfile[]> {
  const { data, error } = await apiClient.from('supplier_profiles').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapSupplierProfile);
}

export async function updateSupplierVerification(id: string, status: SupplierVerificationStatus, rejectionReason = ''): Promise<void> {
  const { error } = await apiClient.from('supplier_profiles').update({ verification_status: status, rejection_reason: rejectionReason }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateSupplierCommissionRate(id: string, rate: number): Promise<void> {
  const { error } = await apiClient.from('supplier_profiles').update({ commission_rate: rate }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- B2B products ----------
export async function listAllB2BProducts(): Promise<B2BProduct[]> {
  const { data, error } = await apiClient.from('b2b_products').select('*, supplier_profiles(company_name)').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapB2BProduct);
}

export async function updateB2BProductModeration(id: string, status: B2BProductStatus, rejectionReason = ''): Promise<void> {
  const { error } = await apiClient.from('b2b_products').update({ status, rejection_reason: rejectionReason }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteB2BProductByAdmin(id: string): Promise<void> {
  const { error } = await apiClient.from('b2b_products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- B2B orders ----------
export async function listAllB2BOrders(): Promise<B2BOrder[]> {
  const { data, error } = await apiClient
    .from('b2b_orders')
    .select('*, b2b_order_items(*), supplier_profiles(company_name), business_profiles(store_name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((row) => {
    const mapped = mapB2BOrder(row);
    mapped.items = Array.isArray(row.b2b_order_items) ? row.b2b_order_items.map(mapB2BOrderItem) : [];
    return mapped;
  });
}

// ---------- Commission ledger ----------
export async function listCommissionLedger(): Promise<CommissionLedgerEntry[]> {
  const { data, error } = await apiClient.from('commission_ledger').select('*').order('created_at', { ascending: false }).limit(100);
  if (error || !data) return [];
  return data.map(mapLedger);
}

// ---------- Stores / Businesses on Map ----------
export async function listAllBusinessStores(): Promise<import('./types').BusinessProfile[]> {
  const { data, error } = await apiClient.from('business_profiles').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapBusinessProfile);
}

export async function updateBusinessStoreByAdmin(
  id: string,
  patch: Partial<import('./types').BusinessProfile>
): Promise<void> {
  // Protected business status/cashback fields and default-address coordinates
  // live in separate tables. The checked RPC updates them atomically and
  // keeps those columns unavailable to ordinary authenticated clients.
  const { error } = await apiClient.rpc('admin_update_business_store', {
    p_business_id: id,
    p_store_name: patch.storeName ?? null,
    p_owner_name: patch.ownerName ?? null,
    p_phone: patch.phone ?? null,
    p_business_type: patch.businessType ?? null,
    p_region: patch.region ?? null,
    p_district: patch.district ?? null,
    p_description: patch.description ?? null,
    p_status: patch.status ?? null,
    p_cashback_balance: patch.cashbackBalance ?? null,
    p_address: patch.address ?? null,
    p_latitude: patch.latitude ?? null,
    p_longitude: patch.longitude ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteBusinessStoreByAdmin(id: string): Promise<void> {
  const { error } = await apiClient.from('business_profiles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export const b2bAdminRepository = {
  listAllSuppliers,
  updateSupplierVerification,
  updateSupplierCommissionRate,
  listAllB2BProducts,
  updateB2BProductModeration,
  deleteB2BProductByAdmin,
  listAllB2BOrders,
  listCommissionLedger,
  listAllBusinessStores,
  updateBusinessStoreByAdmin,
  deleteBusinessStoreByAdmin,
};
