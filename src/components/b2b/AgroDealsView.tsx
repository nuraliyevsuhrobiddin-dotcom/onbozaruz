import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Handshake, RefreshCw } from 'lucide-react';
import type { AgroOffer, AgroOfferAction, AgroOfferStatus, AgroOfferTerms } from '../../api/agroTradeTypes';
import { agroTradeRepository } from '../../api/agroTradeRepository';
import { useAgroStore } from '../../store/useAgroStore';
import { formatMoney } from '../../utils/b2bUtils';
import { Modal } from '../ui/Modal';
import { AgroTermsFields } from './AgroOfferModal';

const statusLabels: Record<AgroOfferStatus, string> = { proposed: 'Javob kutilmoqda', accepted: 'Kelishildi', ready: 'Topshirishga tayyor', delivering: 'Yetkazilmoqda', completed: 'Yakunlandi', declined: 'Rad etildi', cancelled: 'Bekor qilindi' };
const actionLabels: Record<AgroOfferAction, string> = { accept: 'Shartlarni qabul qilish', decline: 'Rad etish', counter: 'Boshqa shart taklif qilish', ready: 'Mahsulot tayyor', deliver: 'Yetkazishni boshlash', complete: 'Qabul qildim', cancel: 'Kelishuvni bekor qilish' };
const actionDescriptions: Record<Exclude<AgroOfferAction, 'counter'>, string> = {
  accept: 'Ko‘rsatilgan miqdor, narx, sana va yetkazish usuliga roziligingizni tasdiqlaysiz. To‘lov amalga oshirilmaydi.',
  decline: 'Ushbu taklif rad etiladi. Bu harakat boshqa kelishuvlarga ta’sir qilmaydi.',
  ready: 'Mahsulot kelishilgan miqdor va sifatda topshirishga tayyorligini tasdiqlang.',
  deliver: 'Mahsulotni xaridorga yetkazish boshlanganini tasdiqlang.',
  complete: 'Mahsulotni kelishilgan shartlarda haqiqatan qabul qilgan bo‘lsangiz tasdiqlang. Bu to‘lov holatini o‘zgartirmaydi.',
  cancel: 'Kelishuv bekor qilinadi va band qilingan miqdor bo‘shatiladi. Avval ikkinchi tomon bilan bog‘langaningizga ishonch hosil qiling.',
};
const terminal = new Set<AgroOfferStatus>(['completed', 'declined', 'cancelled']);

export const AgroDealsView: React.FC = () => {
  const { currentUser, isAuthenticated, setAuthPromptOpen, setB2BRoute } = useAgroStore();
  const userId = currentUser?.id;
  const [offers, setOffers] = useState<AgroOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState<'all' | 'buying' | 'selling'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ offer: AgroOffer; action: Exclude<AgroOfferAction, 'counter'> } | null>(null);
  const [counter, setCounter] = useState<AgroOffer | null>(null);
  const [counterTerms, setCounterTerms] = useState<AgroOfferTerms | null>(null);

  useEffect(() => {
    let active = true;
    setOffers([]);
    setLoadError('');
    if (!isAuthenticated || !userId) { setLoading(false); return; }
    setLoading(true);
    agroTradeRepository.listMyOffers().then(items => { if (active) setOffers(items); })
      .catch(cause => { if (active) setLoadError(cause instanceof Error ? cause.message : 'Kelishuvlarni yuklab bo‘lmadi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry, userId, isAuthenticated]);

  const visibleOffers = useMemo(() => offers.filter(offer => {
    // Client guard complements participant-only server access.
    if (offer.buyerUserId !== currentUser?.id && offer.sellerUserId !== currentUser?.id) return false;
    return filter === 'all' || (filter === 'buying' ? offer.buyerUserId === currentUser?.id : offer.sellerUserId === currentUser?.id);
  }), [offers, filter, currentUser?.id]);

  const respond = async (offer: AgroOffer, action: AgroOfferAction, terms?: AgroOfferTerms) => {
    if (busyId) return;
    setBusyId(offer.id);
    setActionError('');
    try {
      const updated = await agroTradeRepository.respondOffer(offer.id, action, offer.version, terms);
      setOffers(items => items.map(item => item.id === updated.id ? updated : item));
      setConfirmation(null);
      setCounter(null);
      setCounterTerms(null);
    } catch (cause) {
      setActionError(`${cause instanceof Error ? cause.message : 'Amal bajarilmadi.'} Eng so‘nggi holat qayta yuklanmoqda.`);
      setConfirmation(null);
      setCounter(null);
      setCounterTerms(null);
      setRetry(value => value + 1);
    } finally { setBusyId(null); }
  };
  const startCounter = (offer: AgroOffer) => {
    setCounter(offer);
    setCounterTerms({ quantity: offer.quantity, unitPrice: offer.unitPrice, deliveryDate: offer.deliveryDate, deliveryMethod: offer.deliveryMethod, message: offer.message });
    setActionError('');
  };

  return <div className="mx-auto max-w-3xl space-y-5 px-4 py-4 pb-28">
    <header className="flex items-center gap-3"><button onClick={() => setB2BRoute({ view: 'home' })} aria-label="Agro savdoga qaytish" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white"><ArrowLeft size={19} /></button><div className="flex-1"><h1 className="text-xl font-extrabold text-emerald-950">Kelishuvlar</h1><p className="text-xs text-slate-600">Miqdor, narx va topshirish shartlari</p></div>{isAuthenticated && <button onClick={() => setRetry(value => value + 1)} disabled={loading || !!busyId} aria-label="Kelishuvlarni yangilash" className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-50"><RefreshCw size={18} /></button>}</header>
    <p className="border-l-2 border-emerald-600 pl-3 text-sm leading-6 text-slate-600">Faqat siz qatnashgan kelishuvlar ko‘rinadi. Bu yerda narx va topshirish kelishiladi — pul o‘tkazilmaydi. <button onClick={() => setB2BRoute({ view: 'orders' })} className="font-semibold text-emerald-800 underline">Oldingi buyurtmalar</button> alohida saqlanadi.</p>
    {!isAuthenticated ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-center"><Handshake size={32} className="mx-auto text-emerald-700" /><h2 className="mt-3 font-bold">Kelishuvlarni ko‘rish uchun kiring</h2><button onClick={() => setAuthPromptOpen(true)} className="mt-4 min-h-11 rounded-xl bg-emerald-800 px-6 text-sm font-bold text-white">Akkauntga kirish</button></div>
      : <>
        <div className="grid grid-cols-3 border-b border-slate-200" role="tablist" aria-label="Kelishuv turi">{([{ value: 'all', label: 'Barchasi' }, { value: 'buying', label: 'Xaridlarim' }, { value: 'selling', label: 'Sotuvlarim' }] as const).map(tab => <button key={tab.value} role="tab" aria-selected={filter === tab.value} onClick={() => setFilter(tab.value)} className={`min-h-11 border-b-2 px-2 text-sm font-bold ${filter === tab.value ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-600'}`}>{tab.label}</button>)}</div>
        {actionError && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{actionError}</p>}
        <section aria-busy={loading} className="space-y-3">
          {loading ? <p role="status" className="py-10 text-center text-sm text-slate-600">Kelishuvlar yuklanmoqda…</p> : loadError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{loadError}</p><button onClick={() => setRetry(value => value + 1)} className="min-h-11 font-bold underline">Qayta urinish</button></div> : visibleOffers.length === 0 ? <div className="py-10 text-center"><Handshake size={32} className="mx-auto text-emerald-700" /><h2 className="mt-3 font-bold">Hozircha kelishuv yo‘q</h2><p className="mt-2 text-sm leading-6 text-slate-600">Mahsulot yoki xarid talabidan taklif yuboring. Javoblar shu yerda ko‘rinadi.</p><button onClick={() => setB2BRoute({ view: 'requests' })} className="mt-3 min-h-11 font-bold text-emerald-800 underline">Xarid talablarini ko‘rish</button></div> : visibleOffers.map(offer => {
            const buyer = offer.buyerUserId === currentUser?.id;
            const seller = offer.sellerUserId === currentUser?.id;
            const canRespond = offer.status === 'proposed' && offer.proposedBy !== currentUser?.id;
            const actions: Exclude<AgroOfferAction, 'counter'>[] = [];
            if (canRespond) actions.push('accept', 'decline');
            if (seller && offer.status === 'accepted') actions.push('ready');
            if (seller && offer.status === 'ready' && offer.deliveryMethod === 'delivery') actions.push('deliver');
            if (buyer && (offer.status === 'delivering' || (offer.status === 'ready' && offer.deliveryMethod === 'pickup'))) actions.push('complete');
            if (['proposed', 'accepted', 'ready'].includes(offer.status)) actions.push('cancel');
            return <article key={offer.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{buyer ? 'Xarid qilasiz' : 'Sotasiz'}</p><span className={`rounded-md px-2 py-1 text-xs font-bold ${terminal.has(offer.status) ? 'bg-slate-100 text-slate-600' : offer.status === 'proposed' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{statusLabels[offer.status]}</span></div>
              <h2 className="mt-2 break-words text-lg font-extrabold text-emerald-950">{offer.productName}</h2><p className="mt-1 text-sm text-slate-600">{buyer ? `Sotuvchi: ${offer.sellerName}` : `Xaridor: ${offer.buyerName}`}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-sm"><div><dt className="text-xs text-slate-600">Miqdor</dt><dd className="mt-1 font-bold">{offer.quantity.toLocaleString('uz-UZ')} {offer.unit}</dd></div><div><dt className="text-xs text-slate-600">Birlik narxi</dt><dd className="mt-1 font-bold">{formatMoney(offer.unitPrice)} / {offer.unit}</dd></div><div><dt className="text-xs text-slate-600">Topshirish sanasi</dt><dd className="mt-1 font-semibold">{offer.deliveryDate}</dd></div><div><dt className="text-xs text-slate-600">Yetkazish</dt><dd className="mt-1 font-semibold">{offer.deliveryMethod === 'pickup' ? 'Xaridor olib ketadi' : 'Sotuvchi yetkazadi'}</dd></div></dl>
              <p className="mt-3 text-sm">Mahsulot summasi: <strong>{formatMoney(offer.quantity * offer.unitPrice)}</strong></p><p className="mt-1 text-xs text-slate-500">To‘langan summa emas. Tashish xarajati alohida kelishiladi.</p>
              {offer.message && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{offer.message}</p>}
              {offer.status === 'proposed' && <p className="mt-3 text-xs font-semibold text-amber-800">{canRespond ? 'Ikkinchi tomonning so‘nggi taklifiga javob bering.' : 'So‘nggi taklifni siz yubordingiz. Ikkinchi tomon javobini kuting.'}</p>}
              {actions.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{actions.map(action => <button key={action} disabled={!!busyId} onClick={() => { setActionError(''); setConfirmation({ offer, action }); }} className={`min-h-11 rounded-lg px-3 text-sm font-bold disabled:opacity-50 ${action === 'cancel' || action === 'decline' ? 'border border-slate-300 text-slate-700' : 'bg-emerald-800 text-white hover:bg-emerald-900'}`}>{actionLabels[action]}</button>)}{canRespond && <button disabled={!!busyId} onClick={() => startCounter(offer)} className="min-h-11 rounded-lg border border-emerald-700 px-3 text-sm font-bold text-emerald-800 disabled:opacity-50">Boshqa shart taklif qilish</button>}</div>}
              {offer.productId && <button onClick={() => setB2BRoute({ view: 'product', id: offer.productId! })} className="mt-2 min-h-11 text-sm font-semibold text-emerald-800 underline">Mahsulotga o‘tish</button>}
            </article>;
          })}
        </section>
      </>}
    <Modal isOpen={!!confirmation} onClose={() => { if (!busyId) setConfirmation(null); }} title={confirmation ? actionLabels[confirmation.action] : 'Tasdiqlash'}>
      {confirmation && <><h2 className="font-bold text-slate-900">{confirmation.offer.productName}</h2><p className="mt-2 text-sm font-semibold text-emerald-800">{confirmation.offer.quantity} {confirmation.offer.unit} × {formatMoney(confirmation.offer.unitPrice)}</p><p className="mt-3 text-sm leading-6 text-slate-600">{actionDescriptions[confirmation.action]}</p><div className="mt-5 flex gap-2"><button disabled={!!busyId} onClick={() => setConfirmation(null)} className="min-h-11 flex-1 rounded-lg border border-slate-300 text-sm font-bold">Ortga</button><button disabled={!!busyId} onClick={() => respond(confirmation.offer, confirmation.action)} className="min-h-11 flex-1 rounded-lg bg-emerald-800 px-3 text-sm font-bold text-white disabled:opacity-50">{busyId ? 'Saqlanmoqda…' : 'Tasdiqlash'}</button></div></>}
    </Modal>
    <Modal isOpen={!!counter} onClose={() => { if (!busyId) setCounter(null); }} title="Boshqa shart taklif qilish">
      {counter && counterTerms && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void respond(counter, 'counter', counterTerms); }}><h2 className="font-bold text-emerald-950">{counter.productName}</h2><p className="text-sm leading-6 text-slate-600">Yangi shartlar ikkinchi tomon tasdiqlagandan keyingina kuchga kiradi. Mavjud miqdor va sanalar qayta tekshiriladi.</p><AgroTermsFields terms={counterTerms} onChange={setCounterTerms} unit={counter.unit} wholeQuantity={!!counter.productId} disabled={!!busyId} /><button disabled={!!busyId} className="min-h-12 w-full rounded-xl bg-[#e5470a] px-4 text-sm font-bold text-white disabled:opacity-50">{busyId ? 'Yuborilmoqda…' : 'Yangi shartlarni yuborish'}</button></form>}
    </Modal>
  </div>;
};
