/**
 * Agro trade: buyers' purchase requests and sellers' offers.
 * Every change goes through a server RPC that locks the rows it touches.
 */
import { apiClient } from './authClient';
import type { AgroOffer, AgroOfferAction, AgroOfferTerms, AgroPurchaseRequest, CreateAgroOfferInput, CreateAgroRequestInput } from './agroTradeTypes';
import { hasCoordinates } from '../utils/geo';

type Row = Record<string, unknown>;

function today() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' }); }
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function positive(value: number) { return Number.isFinite(value) && value > 0 && value <= 1e12; }

export function validateAgroRequest(input: CreateAgroRequestInput) {
  if (!input.title.trim() || input.title.length > 160 || !input.category.trim() || !input.unit.trim() || !input.location.trim()) throw new Error('Nomi, toifa, birlik va manzilni kiriting.');
  if (!positive(input.quantity) || (input.targetPrice !== null && !positive(input.targetPrice))) throw new Error('Miqdor va narx musbat son bo‘lishi kerak.');
  if (!validDate(input.neededBy) || input.neededBy < today()) throw new Error('Kelajakdagi yoki bugungi sanani tanlang.');
  if (!hasCoordinates(input)) throw new Error('Xaritadan savdo joyini belgilang.');
  if (!['pickup', 'delivery', 'either'].includes(input.deliveryMethod)) throw new Error('Yetkazish usulini tanlang.');
  if (input.description.length > 4000 || input.variety.length > 160 || input.location.length > 500) throw new Error('Matn juda uzun.');
}

function validateTerms(terms: AgroOfferTerms) {
  if (!positive(terms.quantity) || !positive(terms.unitPrice) || !Number.isFinite(terms.quantity * terms.unitPrice)) throw new Error('Miqdor va narx musbat son bo‘lishi kerak.');
  if (!validDate(terms.deliveryDate) || terms.deliveryDate < today()) throw new Error('Topshirish sanasini tekshiring.');
  if (!['pickup', 'delivery'].includes(terms.deliveryMethod) || terms.message.length > 2000) throw new Error('Taklif shartlarini tekshiring.');
}

function camel<T>(row: unknown): T {
  return Object.fromEntries(Object.entries(row as Row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), value])) as T;
}

async function rpc<T>(name: string, args: Row): Promise<T> {
  const { data, error } = await apiClient.rpc(name, args);
  if (error) throw new Error(error.message);
  return data == null ? data as T : camel<T>(data);
}

export const agroTradeRepository = {
  async listRequests(): Promise<AgroPurchaseRequest[]> {
    const { data, error } = await apiClient.from('agro_purchase_requests').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(row => camel<AgroPurchaseRequest>(row));
  },
  async createRequest(input: CreateAgroRequestInput): Promise<AgroPurchaseRequest> {
    validateAgroRequest(input);
    return rpc('create_agro_request', { p_input: input });
  },
  async closeRequest(id: string): Promise<void> {
    await rpc('close_agro_request', { p_id: id });
  },
  async listMyOffers(): Promise<AgroOffer[]> {
    const { data, error } = await apiClient.from('agro_trade_offers').select('*').order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(row => camel<AgroOffer>(row));
  },
  async sendOffer(input: CreateAgroOfferInput): Promise<AgroOffer> {
    validateTerms(input);
    return rpc('send_agro_offer', { p_input: input });
  },
  async respondOffer(id: string, action: AgroOfferAction, version: number, terms?: AgroOfferTerms): Promise<AgroOffer> {
    if (action === 'counter') { if (!terms) throw new Error('Yangi shartlarni kiriting.'); validateTerms(terms); }
    return rpc('respond_agro_offer', { p_id: id, p_action: action, p_version: version, p_terms: terms || null });
  },
};
