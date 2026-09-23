import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, MapPin, Plus, Search } from 'lucide-react';
import type { AgroPurchaseRequest, CreateAgroRequestInput } from '../../api/agroTradeTypes';
import { agroTradeRepository } from '../../api/agroTradeRepository';
import { useAgroStore } from '../../store/useAgroStore';
import { useViewerLocation } from '../../store/useViewerLocation';
import { categoriesForScope } from '../../utils/categoryScope';
import { distanceKm, formatDistance, hasCoordinates, sortNearby, type GeoPoint } from '../../utils/geo';
import { formatMoney } from '../../utils/b2bUtils';
import { Modal } from '../ui/Modal';
import { LocationPicker } from '../ui/LocationPicker';
import { AgroOfferModal } from './AgroOfferModal';

const inputClass = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-emerald-600';
const agroToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
const deliveryLabels = { pickup: 'Xaridor olib ketadi', delivery: 'Yetkazib berish kerak', either: 'Yetkazishni kelishamiz' };
const freshForm = () => ({ title: '', category: '', variety: '', quantity: '', unit: 'kg', targetPrice: '', neededBy: agroToday(), location: '', deliveryMethod: 'either' as CreateAgroRequestInput['deliveryMethod'], description: '' });

export const AgroRequestsView: React.FC<{ initialCreate?: boolean }> = ({ initialCreate }) => {
  const { setB2BRoute, currentUser, isAuthenticated, setAuthPromptOpen, categories: allCategories } = useAgroStore();
  const { point, setLocation, clearLocation } = useViewerLocation();
  const [requests, setRequests] = useState<AgroPurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [mine, setMine] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [creating, setCreating] = useState(!!initialCreate);
  const [form, setForm] = useState(freshForm);
  const [requestPoint, setRequestPoint] = useState<GeoPoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AgroPurchaseRequest | undefined>();
  const [closeTarget, setCloseTarget] = useState<AgroPurchaseRequest | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');
  const categories = categoriesForScope(allCategories, 'market').filter(item => item.id !== 'all');
  const today = agroToday();

  useEffect(() => { if (initialCreate) setCreating(true); }, [initialCreate]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    agroTradeRepository.listRequests().then(items => { if (active) setRequests(items); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Xarid talablarini yuklab bo‘lmadi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry, currentUser?.id]);

  const filtered = useMemo(() => sortNearby(requests.filter(request => {
    if (mine) { if (request.userId !== currentUser?.id) return false; }
    else if (request.status !== 'open' || request.neededBy < today || request.quantity - request.reservedQuantity <= 0) return false;
    if (category && request.category !== category) return false;
    const query = search.trim().toLocaleLowerCase();
    return !query || `${request.title} ${request.variety} ${request.location} ${request.buyerName}`.toLocaleLowerCase().includes(query);
  }), point), [requests, mine, currentUser?.id, category, search, point, today]);

  const closeCreate = () => {
    if (saving) return;
    setCreating(false);
    if (initialCreate) setB2BRoute({ view: 'requests' });
  };
  const openCreate = () => {
    if (!isAuthenticated) { setAuthPromptOpen(true); return; }
    setFormError('');
    setCreating(true);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!isAuthenticated || !currentUser) { setAuthPromptOpen(true); return; }
    const quantity = Number(form.quantity);
    const targetPrice = form.targetPrice.trim() ? Number(form.targetPrice) : null;
    if (!form.title.trim() || !form.category || !form.location.trim() || !hasCoordinates(requestPoint)) { setFormError('Mahsulot, kategoriya va manzilni kiriting. Xaritadan joyni belgilang.'); return; }
    if (!Number.isFinite(quantity) || quantity <= 0 || (targetPrice !== null && (!Number.isFinite(targetPrice) || targetPrice <= 0)) || form.neededBy < today) { setFormError('Miqdor, narx va kerak bo‘lish sanasini tekshiring.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const request = await agroTradeRepository.createRequest({ title: form.title.trim(), category: form.category, variety: form.variety.trim(), quantity, unit: form.unit, targetPrice, neededBy: form.neededBy, location: form.location.trim(), ...requestPoint, deliveryMethod: form.deliveryMethod, description: form.description.trim() });
      setRequests(items => [request, ...items]);
      setForm(freshForm());
      setRequestPoint(null);
      setCreating(false);
      setMine(true);
      setSearch('');
      setCategory('');
      if (initialCreate) setB2BRoute({ view: 'requests' });
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Talabni joylab bo‘lmadi. Qayta urinib ko‘ring.'); }
    finally { setSaving(false); }
  };
  const closeRequest = async () => {
    if (!closeTarget || closing) return;
    setClosing(true);
    setCloseError('');
    try {
      await agroTradeRepository.closeRequest(closeTarget.id);
      setRequests(items => items.map(item => item.id === closeTarget.id ? { ...item, status: 'closed' } : item));
      setCloseTarget(null);
    } catch (cause) { setCloseError(cause instanceof Error ? cause.message : 'Talabni yopib bo‘lmadi.'); }
    finally { setClosing(false); }
  };

  return <div className="mx-auto max-w-3xl space-y-5 px-4 py-4 pb-28">
    <header className="flex items-center gap-3"><button onClick={() => setB2BRoute({ view: 'home' })} aria-label="Agro savdoga qaytish" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white"><ArrowLeft size={19} /></button><div><h1 className="text-xl font-extrabold text-emerald-950">Xarid talablari</h1><p className="text-xs text-slate-600">Xaridor nimani va qancha izlayapti?</p></div></header>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="max-w-sm text-sm leading-6 text-slate-600">Hosilingizga mos talabni toping yoki kerakli mahsulotni yozib qoldiring.</p><button onClick={openCreate} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#e5470a] px-4 text-sm font-bold text-white hover:bg-orange-700"><Plus size={18} /> Talab joylash</button></div>
    <section className="space-y-3" aria-label="Talablarni saralash">
      <div className="flex border-b border-slate-200" role="tablist" aria-label="Talab turi">
        <button role="tab" aria-selected={!mine} onClick={() => setMine(false)} className={`min-h-11 border-b-2 px-4 text-sm font-bold ${!mine ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-600'}`}>Ochiq talablar</button>
        {isAuthenticated && <button role="tab" aria-selected={mine} onClick={() => setMine(true)} className={`min-h-11 border-b-2 px-4 text-sm font-bold ${mine ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-600'}`}>Mening talablarim</button>}
      </div>
      <label className="relative block"><span className="sr-only">Talab qidirish</span><Search size={18} className="absolute left-3 top-4 text-slate-500" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Mahsulot, nav yoki hudud" className={`${inputClass} pl-10`} /></label>
      <label className="block text-sm font-semibold">Kategoriya<select value={category} onChange={event => setCategory(event.target.value)} className={inputClass}><option value="">Barcha kategoriyalar</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="flex flex-wrap justify-between gap-2"><button onClick={() => setShowLocation(!showLocation)} aria-expanded={showLocation} className="flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-800"><MapPin size={17} />{point ? 'Qidiruv joyini o‘zgartirish' : 'Yaqin talablar uchun joy tanlang'}</button>{point && <button onClick={clearLocation} className="min-h-11 text-sm text-slate-600 underline">Joyni tozalash</button>}</div>
      {showLocation && <LocationPicker value={point} onChange={location => setLocation(location)} label="Qidiruv joyi" description="Xaritada tanlagan nuqta faqat shu qurilmada yaqin talablarni saralash uchun saqlanadi. Shaxsiy manzilingiz e’lon qilinmaydi." />}
      {point && <p className="text-xs text-slate-600">Mos talablar yaqinligiga qarab saralandi. Masofa to‘g‘ri chiziq bo‘yicha.</p>}
    </section>

    <section aria-busy={loading} className="space-y-3">
      {loading ? <p role="status" className="py-10 text-center text-sm text-slate-600">Talablar yuklanmoqda…</p> : error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="min-h-11 font-bold underline">Qayta urinish</button></div> : filtered.length === 0 ? <div className="border-y border-slate-200 py-10 text-center"><ClipboardList size={30} className="mx-auto text-emerald-700" /><h2 className="mt-3 font-bold">{mine ? 'Hozircha xarid talabi joylamagansiz' : 'Mos xarid talabi topilmadi'}</h2><p className="mt-2 text-sm text-slate-600">{search || category ? 'Qidiruv yoki kategoriyani o‘zgartirib ko‘ring.' : 'Kerakli mahsulotga birinchi talabni joylang.'}</p></div> : filtered.map(request => {
        const own = request.userId === currentUser?.id;
        const remaining = Math.max(0, request.quantity - request.reservedQuantity);
        const closed = request.status === 'closed' || request.neededBy < today || remaining <= 0;
        return <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{categories.find(item => item.id === request.category)?.name || request.category}</p><h2 className="mt-1 break-words text-lg font-extrabold text-slate-900">{request.title}</h2></div><span className={`rounded-md px-2 py-1 text-xs font-bold ${closed ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-800'}`}>{request.status === 'closed' ? 'Yopilgan' : request.neededBy < today ? 'Muddati tugagan' : remaining <= 0 ? 'To‘liq kelishilgan' : 'Xaridor izlayapti'}</span></div>
          <p className="mt-2 text-base font-bold text-emerald-950">{remaining.toLocaleString('uz-UZ')} {request.unit} kerak {request.reservedQuantity > 0 && <span className="text-xs font-normal text-slate-600">(jami {request.quantity.toLocaleString('uz-UZ')} {request.unit})</span>}</p>
          {request.targetPrice !== null && <p className="mt-1 text-sm text-slate-700">Mo‘ljal narx: {formatMoney(request.targetPrice)} / {request.unit}</p>}
          <dl className="mt-3 space-y-1 text-sm text-slate-600"><div><dt className="inline">Kerak sana: </dt><dd className="inline font-semibold text-slate-800">{request.neededBy}</dd></div>{request.variety && <div><dt className="inline">Nav: </dt><dd className="inline">{request.variety}</dd></div>}<div><dt className="sr-only">Joylashuv</dt><dd className="break-words">{request.location}{point && hasCoordinates(request) && <span className="font-semibold text-emerald-800"> · {formatDistance(distanceKm(point, request))}</span>}</dd></div><div><dt className="sr-only">Yetkazish</dt><dd>{deliveryLabels[request.deliveryMethod]}</dd></div></dl>
          {request.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{request.description}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-sm font-semibold text-slate-700">{request.buyerName}{own && ' · Sizning talablingiz'}</p>{own ? request.status === 'open' && <button onClick={() => { setCloseError(''); setCloseTarget(request); }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700">Talabni yopish</button> : !closed && <button onClick={() => setSelectedRequest(request)} className="min-h-11 rounded-lg bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900">Taklif berish</button>}</div>
        </article>;
      })}
    </section>

    <Modal isOpen={creating} onClose={closeCreate} title="Sotib olaman — yangi talab">
      {!isAuthenticated ? <div className="space-y-3"><p className="text-sm text-slate-600">Talab joylash uchun akkauntingizga kiring.</p><button onClick={() => { closeCreate(); setAuthPromptOpen(true); }} className="min-h-11 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white">Kirish</button></div> : <form onSubmit={save} className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">Sotuvchilar sizga miqdor va narx bo‘yicha taklif yuboradi. To‘lov talab qilinmaydi.</p>
        <fieldset disabled={saving} className="space-y-3">
          <label className="block text-sm font-semibold">Nima sotib olasiz?<input name="title" required maxLength={160} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Masalan: 5 tonna kartoshka kerak" className={inputClass} /></label>
          <label className="block text-sm font-semibold">Kategoriya<select name="category" required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className={inputClass}><option value="">Tanlang</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block text-sm font-semibold">Nav (ixtiyoriy)<input name="variety" maxLength={120} value={form.variety} onChange={event => setForm({ ...form, variety: event.target.value })} className={inputClass} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Kerak miqdor<input name="quantity" required type="number" inputMode="decimal" min="0.001" step="any" value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} className={inputClass} /></label><label className="text-sm font-semibold">Birlik<select name="unit" value={form.unit} onChange={event => setForm({ ...form, unit: event.target.value })} className={inputClass}>{['kg', 'tonna', 'dona', 'litr', 'bosh', 'qop'].map(unit => <option key={unit}>{unit}</option>)}</select></label></div>
          <label className="block text-sm font-semibold">Mo‘ljal narx (so‘m / {form.unit}, ixtiyoriy)<input name="targetPrice" type="number" inputMode="decimal" min="0.01" step="any" value={form.targetPrice} onChange={event => setForm({ ...form, targetPrice: event.target.value })} placeholder="Kelishiladi" className={inputClass} /></label>
          <label className="block text-sm font-semibold">Qaysi sanagacha kerak?<input name="neededBy" required type="date" min={today} value={form.neededBy} onChange={event => setForm({ ...form, neededBy: event.target.value })} className={inputClass} /></label>
          <label className="block text-sm font-semibold">Mahsulot kerak bo‘lgan joy<input name="location" required maxLength={250} value={form.location} onChange={event => setForm({ ...form, location: event.target.value })} placeholder="Viloyat, tuman yoki qabul qilish joyi" className={inputClass} /></label>
          <LocationPicker value={requestPoint} onChange={setRequestPoint} label="Qabul qilish joyini xaritada belgilang" />
          <p className="text-xs leading-5 text-slate-600">Tanlagan nuqta talabda ko‘rinadi. Uy manzili o‘rniga mahsulotni qabul qilish joyini belgilashingiz mumkin.</p>
          <label className="block text-sm font-semibold">Yetkazish<select name="deliveryMethod" value={form.deliveryMethod} onChange={event => setForm({ ...form, deliveryMethod: event.target.value as CreateAgroRequestInput['deliveryMethod'] })} className={inputClass}><option value="either">Kelishamiz</option><option value="pickup">O‘zim olib ketaman</option><option value="delivery">Yetkazib berish kerak</option></select></label>
          <label className="block text-sm font-semibold">Sifat va boshqa talablar<textarea name="description" rows={3} maxLength={2000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className={inputClass} /></label>
        </fieldset>
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        <button disabled={saving} className="min-h-12 w-full rounded-xl bg-[#e5470a] px-4 font-bold text-white disabled:opacity-50">{saving ? 'Joylanmoqda…' : 'Xarid talabini joylash'}</button>
      </form>}
    </Modal>
    <Modal isOpen={!!closeTarget} onClose={() => { if (!closing) setCloseTarget(null); }} title="Talabni yopish">
      <p className="text-sm leading-6 text-slate-700">“{closeTarget?.title}” uchun yangi takliflar to‘xtatiladi. Mavjud kelishuvlar saqlanadi.</p>
      {closeError && <p role="alert" className="mt-3 text-sm text-red-700">{closeError}</p>}
      <div className="mt-4 flex gap-2"><button disabled={closing} onClick={() => setCloseTarget(null)} className="min-h-11 flex-1 rounded-lg border border-slate-300 text-sm font-bold">Ortga</button><button disabled={closing} onClick={closeRequest} className="min-h-11 flex-1 rounded-lg bg-emerald-800 text-sm font-bold text-white disabled:opacity-50">{closing ? 'Yopilmoqda…' : 'Talabni yopish'}</button></div>
    </Modal>
    <AgroOfferModal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(undefined)} request={selectedRequest} />
  </div>;
};
