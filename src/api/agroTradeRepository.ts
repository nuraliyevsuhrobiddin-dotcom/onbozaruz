import { supabaseClient } from './authClient';
import type { AgroOffer, AgroOfferAction, AgroOfferTerms, AgroPurchaseRequest, CreateAgroOfferInput, CreateAgroRequestInput } from './agroTradeTypes';
import { hasCoordinates } from '../utils/geo';

const KEY = 'onbozor-agro-trades-v1';
const PRODUCTS = 'onbozor-b2b-products';
type Row = Record<string, unknown>;
type State = { requests: AgroPurchaseRequest[]; offers: AgroOffer[] };
function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : fallback;
}
function actor() {
  const session = read<{ id?: string; name?: string } | null>('onbozor-auth-session', null);
  if (!session?.id) throw new Error('Avval akkauntingizga kiring.');
  return { id: session.id, name: session.name || 'Foydalanuvchi' };
}
function state(): State { return read(KEY, { requests: [], offers: [] }); }
function save(value: State) { localStorage.setItem(KEY, JSON.stringify(value)); }
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
  const { data, error } = await supabaseClient!.rpc(name, args);
  if (error) throw new Error(error.message);
  return data == null ? data as T : camel<T>(data);
}
// Local demo only. Web Locks serialize changes across tabs; production uses SQL row locks.
async function mutate<T>(run: () => T): Promise<T> {
  return navigator.locks ? navigator.locks.request('onbozor-agro-trade', run) : run();
}
function supplierFor(userId: string) {
  const supplier = read<Row[]>('onbozor-b2b-supplier-profiles', []).find(row => row.user_id === userId);
  const contracts = read<Row[]>('onbozor-b2b-contracts', []);
  if (!supplier || supplier.verification_status !== 'approved' || !contracts.some(row => row.supplier_id === supplier.id && row.status === 'accepted')) throw new Error('Sotuvchi tasdiqlangan va hamkorlik shartnomasini qabul qilgan bo‘lishi kerak.');
  return supplier;
}
function checkTarget(db: State, offer: AgroOffer, terms: AgroOfferTerms) {
  validateTerms(terms);
  supplierFor(offer.sellerUserId);
  if (offer.requestId) {
    const request = db.requests.find(row => row.id === offer.requestId);
    if (!request || request.status !== 'open' || request.neededBy < today()) throw new Error('Xarid so‘rovi yopilgan yoki muddati tugagan.');
    if (terms.quantity > request.quantity - request.reservedQuantity) throw new Error('So‘rovdagi qolgan miqdor yetarli emas.');
    if (terms.deliveryDate > request.neededBy || (request.deliveryMethod !== 'either' && request.deliveryMethod !== terms.deliveryMethod)) throw new Error('Sana yoki yetkazish usuli so‘rovga mos emas.');
  } else {
    const product = read<Row[]>(PRODUCTS, []).find(row => row.id === offer.productId);
    if (!product || product.status !== 'approved') throw new Error('Mahsulot sotuvda emas.');
    if (product.unit !== offer.unit) throw new Error('Mahsulot birligi o‘zgargan. Yangi taklif yuboring.');
    if (!Number.isInteger(terms.quantity) || terms.quantity < Number(product.moq) || terms.quantity > Number(product.available_qty)) throw new Error('Miqdor butun son, eng kam buyurtma va mavjud zaxiraga mos bo‘lishi kerak.');
    if (product.availability === 'upcoming' && (!product.available_from || terms.deliveryDate < String(product.available_from))) throw new Error('Hosil tayyor bo‘ladigan sanani hisobga oling.');
    if (terms.deliveryMethod === 'delivery' && !product.delivery_available) throw new Error('Sotuvchi yetkazib berishni ko‘rsatmagan.');
  }
}
function reserve(db: State, offer: AgroOffer, direction: 1 | -1) {
  if (offer.requestId) {
    const request = db.requests.find(row => row.id === offer.requestId)!;
    request.reservedQuantity += direction * offer.quantity;
  } else {
    const products = read<Row[]>(PRODUCTS, []);
    const product = products.find(row => row.id === offer.productId);
    if (!product) throw new Error('Mahsulot topilmadi.');
    product.available_qty = Number(product.available_qty) - direction * offer.quantity;
    localStorage.setItem(PRODUCTS, JSON.stringify(products));
  }
}

export const agroTradeRepository = {
  async listRequests(): Promise<AgroPurchaseRequest[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('agro_purchase_requests').select('*').order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(row => camel<AgroPurchaseRequest>(row));
    }
    const user = read<{ id?: string } | null>('onbozor-auth-session', null);
    return state().requests.filter(row => (row.status === 'open' && row.neededBy >= today()) || row.userId === user?.id);
  },
  async createRequest(input: CreateAgroRequestInput): Promise<AgroPurchaseRequest> {
    validateAgroRequest(input);
    if (supabaseClient) return rpc('create_agro_request', { p_input: input });
    return mutate(() => {
      const user = actor();
      const db = state();
      const request: AgroPurchaseRequest = { ...input, id: crypto.randomUUID(), userId: user.id, buyerName: user.name, reservedQuantity: 0, status: 'open', createdAt: new Date().toISOString() };
      db.requests.unshift(request); save(db); return request;
    });
  },
  async closeRequest(id: string): Promise<void> {
    if (supabaseClient) { await rpc('close_agro_request', { p_id: id }); return; }
    return mutate(() => {
      const db = state(); const request = db.requests.find(row => row.id === id);
      if (!request || request.userId !== actor().id) throw new Error('Ruxsat yo‘q.');
      request.status = 'closed'; save(db);
    });
  },
  async listMyOffers(): Promise<AgroOffer[]> {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('agro_trade_offers').select('*').order('updated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data || []).map(row => camel<AgroOffer>(row));
    }
    const user = actor();
    return state().offers.filter(row => row.buyerUserId === user.id || row.sellerUserId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async sendOffer(input: CreateAgroOfferInput): Promise<AgroOffer> {
    validateTerms(input);
    if (supabaseClient) return rpc('send_agro_offer', { p_input: input });
    return mutate(() => {
      const user = actor(); const db = state();
      if (!!input.requestId === !!input.productId) throw new Error('Bitta e’lonni tanlang.');
      const request = db.requests.find(row => row.id === input.requestId);
      const product = read<Row[]>(PRODUCTS, []).find(row => row.id === input.productId);
      const supplier = input.productId ? read<Row[]>('onbozor-b2b-supplier-profiles', []).find(row => row.id === product?.supplier_id) : supplierFor(user.id);
      if ((!request && !product) || !supplier) throw new Error('E’lon topilmadi.');
      const offer: AgroOffer = {
        quantity: input.quantity, unitPrice: input.unitPrice, deliveryDate: input.deliveryDate, deliveryMethod: input.deliveryMethod, message: input.message,
        id: crypto.randomUUID(), requestId: input.requestId || null, productId: input.productId || null,
        productName: request?.title || String(product!.name), unit: request?.unit || String(product!.unit),
        buyerUserId: request?.userId || user.id, sellerUserId: String(supplier.user_id),
        buyerName: request?.buyerName || user.name, sellerName: String(supplier.company_name),
        proposedBy: user.id, status: 'proposed', version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      if (offer.buyerUserId === offer.sellerUserId) throw new Error('O‘z e’loningizga taklif yubora olmaysiz.');
      checkTarget(db, offer, input); db.offers.unshift(offer); save(db); return offer;
    });
  },
  async respondOffer(id: string, action: AgroOfferAction, version: number, terms?: AgroOfferTerms): Promise<AgroOffer> {
    if (action === 'counter') { if (!terms) throw new Error('Yangi shartlarni kiriting.'); validateTerms(terms); }
    if (supabaseClient) return rpc('respond_agro_offer', { p_id: id, p_action: action, p_version: version, p_terms: terms || null });
    return mutate(() => {
      const user = actor(); const db = state(); const offer = db.offers.find(row => row.id === id);
      if (!offer || ![offer.buyerUserId, offer.sellerUserId].includes(user.id)) throw new Error('Ruxsat yo‘q.');
      if (offer.version !== version) throw new Error('Taklif o‘zgargan. Sahifani yangilang.');
      const reserved = ['accepted', 'ready', 'delivering'].includes(offer.status);
      if (action === 'cancel' && ['proposed', 'accepted', 'ready'].includes(offer.status)) {
        if (reserved) reserve(db, offer, -1); offer.status = 'cancelled';
      } else if (offer.status === 'proposed' && offer.proposedBy !== user.id && ['accept', 'decline', 'counter'].includes(action)) {
        if (action === 'decline') offer.status = 'declined';
        else {
          checkTarget(db, offer, terms && action === 'counter' ? terms : offer);
          if (action === 'accept') { reserve(db, offer, 1); offer.status = 'accepted'; }
          else { Object.assign(offer, { quantity: terms!.quantity, unitPrice: terms!.unitPrice, deliveryDate: terms!.deliveryDate, deliveryMethod: terms!.deliveryMethod, message: terms!.message, proposedBy: user.id }); }
        }
      } else if (action === 'ready' && offer.status === 'accepted' && user.id === offer.sellerUserId) offer.status = 'ready';
      else if (action === 'deliver' && offer.status === 'ready' && offer.deliveryMethod === 'delivery' && user.id === offer.sellerUserId) offer.status = 'delivering';
      else if (action === 'complete' && user.id === offer.buyerUserId && (offer.status === 'delivering' || (offer.status === 'ready' && offer.deliveryMethod === 'pickup'))) offer.status = 'completed';
      else throw new Error('Bu holatda ushbu amalni bajarib bo‘lmaydi.');
      offer.version += 1; offer.updatedAt = new Date().toISOString(); save(db); return offer;
    });
  },
};
