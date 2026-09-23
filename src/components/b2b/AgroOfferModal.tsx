import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { B2BProduct } from '../../api/types';
import type { AgroOfferTerms, AgroPurchaseRequest } from '../../api/agroTradeTypes';
import { agroTradeRepository } from '../../api/agroTradeRepository';
import { useAgroStore } from '../../store/useAgroStore';
import { formatMoney } from '../../utils/b2bUtils';
import { Modal } from '../ui/Modal';

function agroToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
}

const fieldClass = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-emerald-600 disabled:bg-slate-100';

export const AgroTermsFields: React.FC<{
  terms: AgroOfferTerms;
  onChange: (terms: AgroOfferTerms) => void;
  unit: string;
  minimum?: number;
  maximum?: number;
  earliestDate?: string;
  latestDate?: string;
  deliveryConstraint?: 'pickup' | 'delivery';
  wholeQuantity?: boolean;
  disabled?: boolean;
}> = ({ terms, onChange, unit, minimum = 0.001, maximum, earliestDate, latestDate, deliveryConstraint, wholeQuantity, disabled }) => (
  <fieldset disabled={disabled} className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm font-semibold">Miqdor ({unit})
        <input name="quantity" type="number" inputMode={wholeQuantity ? 'numeric' : 'decimal'} required min={wholeQuantity ? Math.max(1, minimum) : minimum} max={maximum} step={wholeQuantity ? 1 : 'any'} value={terms.quantity || ''} onChange={event => onChange({ ...terms, quantity: Number(event.target.value) })} className={fieldClass} />
      </label>
      <label className="text-sm font-semibold">Narx (so‘m / {unit})
        <input name="unitPrice" type="number" inputMode="decimal" required min="0.01" step="any" value={terms.unitPrice || ''} onChange={event => onChange({ ...terms, unitPrice: Number(event.target.value) })} className={fieldClass} />
      </label>
    </div>
    <label className="block text-sm font-semibold">Topshirish sanasi
      <input name="deliveryDate" type="date" required min={earliestDate || agroToday()} max={latestDate} value={terms.deliveryDate} onChange={event => onChange({ ...terms, deliveryDate: event.target.value })} className={fieldClass} />
    </label>
    <label className="block text-sm font-semibold">Yetkazish usuli
      <select name="deliveryMethod" value={terms.deliveryMethod} onChange={event => onChange({ ...terms, deliveryMethod: event.target.value as AgroOfferTerms['deliveryMethod'] })} className={fieldClass}>
        {deliveryConstraint !== 'delivery' && <option value="pickup">Xaridor olib ketadi</option>}
        {deliveryConstraint !== 'pickup' && <option value="delivery">Sotuvchi yetkazib beradi</option>}
      </select>
    </label>
    <label className="block text-sm font-semibold">Izoh va qo‘shimcha shartlar
      <textarea name="message" maxLength={2000} rows={3} value={terms.message} onChange={event => onChange({ ...terms, message: event.target.value })} placeholder="Sifat, qadoqlash, topshirish joyi va tashish xarajatini kelishing." className={fieldClass} />
    </label>
    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Mahsulot summasi: <strong>{formatMoney(terms.quantity * terms.unitPrice)}</strong><br /><span className="text-xs">Tashish va boshqa xarajatlar alohida kelishiladi. Bu to‘lov emas.</span></p>
  </fieldset>
);

export interface AgroOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: B2BProduct;
  request?: AgroPurchaseRequest;
  onSuccess?: () => void;
}

export const AgroOfferModal: React.FC<AgroOfferModalProps> = ({ isOpen, onClose, product, request, onSuccess }) => {
  const { currentUser, isAuthenticated, supplierProfile, b2bContract, setAuthPromptOpen, setB2BRoute } = useAgroStore();
  const [terms, setTerms] = useState<AgroOfferTerms>({ quantity: 1, unitPrice: 0, deliveryDate: agroToday(), deliveryMethod: 'pickup', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const maximum = product ? product.availableQty : Math.max(0, (request?.quantity || 0) - (request?.reservedQuantity || 0));
  const minimum = product ? Math.max(0.001, product.moq) : 0.001;
  const earliestDate = product?.availability === 'upcoming' && product.availableFrom && product.availableFrom > agroToday() ? product.availableFrom : agroToday();
  const deliveryConstraint = request?.deliveryMethod !== 'either' ? request?.deliveryMethod : undefined;
  const ownItem = !!currentUser && (request?.userId === currentUser.id || (!!product && product.supplierId === supplierProfile?.id));
  const unavailable = !!request && (request.status !== 'open' || request.neededBy < agroToday());

  useEffect(() => {
    if (!isOpen) return;
    setTerms({ quantity: product ? Math.min(product.moq, product.availableQty) : Math.min(1, maximum), unitPrice: product?.wholesalePrice || request?.targetPrice || 0, deliveryDate: earliestDate, deliveryMethod: deliveryConstraint || 'pickup', message: '' });
    setError('');
    setSent(false);
    // Reset only when opening a different target, not while editing its terms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id, request?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isAuthenticated || !currentUser) { setAuthPromptOpen(true); return; }
    if ((!product && !request) || (product && request) || ownItem || unavailable) { setError('Bu e’longa taklif yuborib bo‘lmaydi.'); return; }
    if (!Number.isFinite(terms.quantity) || terms.quantity < minimum || terms.quantity > maximum || (product && !Number.isInteger(terms.quantity)) || !Number.isFinite(terms.unitPrice) || terms.unitPrice <= 0) { setError('Miqdor va narxni tekshiring. Mavjud miqdordan oshmasligi kerak.'); return; }
    if (terms.deliveryDate < earliestDate || (request && terms.deliveryDate > request.neededBy)) { setError('Topshirish sanasi e’lon muddatiga mos emas.'); return; }
    setBusy(true);
    setError('');
    try {
      await agroTradeRepository.sendOffer({ ...terms, message: terms.message.trim(), ...(product ? { productId: product.id } : { requestId: request!.id }) });
      setSent(true);
      onSuccess?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Taklif yuborilmadi. Qayta urinib ko‘ring.'); }
    finally { setBusy(false); }
  };

  return <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} title={request ? 'Mahsulot yetkazishni taklif qilish' : 'Narx va miqdorni kelishish'}>
    {sent ? <div className="space-y-4 text-center"><CheckCircle2 className="mx-auto text-emerald-700" size={36} /><h2 className="font-bold text-emerald-950">Taklif yuborildi</h2><p className="text-sm text-slate-600">Ikkinchi tomon qabul qilgach kelishuv tasdiqlanadi. Hozir hech qanday to‘lov amalga oshmadi.</p><button onClick={() => { onClose(); setB2BRoute({ view: 'deals' }); }} className="min-h-11 w-full rounded-xl bg-emerald-800 px-4 text-sm font-bold text-white">Kelishuvlarga o‘tish</button></div>
      : !isAuthenticated ? <div className="space-y-3"><p className="text-sm text-slate-600">Taklif yuborish uchun akkauntingizga kiring.</p><button onClick={() => { onClose(); setAuthPromptOpen(true); }} className="min-h-11 w-full rounded-xl bg-emerald-800 text-sm font-bold text-white">Kirish</button></div>
        : ownItem ? <p className="text-sm text-slate-600">O‘z e’loningizga taklif yubora olmaysiz.</p>
          : unavailable || maximum < minimum ? <p className="text-sm text-slate-600">Bu e’lon hozir yangi taklif qabul qilmaydi yoki yetarli miqdor qolmagan.</p>
            : <form onSubmit={submit} className="space-y-4">
              <div><h2 className="font-bold text-emerald-950">{product?.name || request?.title}</h2><p className="mt-1 text-xs text-slate-600">{product ? 'Mavjud' : 'Qolgan talab'}: {maximum.toLocaleString('uz-UZ')} {product?.unit || request?.unit}{product && ` · Kamida ${minimum} ${product.unit}`}</p></div>
              <AgroTermsFields terms={terms} onChange={setTerms} unit={product?.unit || request?.unit || ''} minimum={minimum} maximum={maximum} earliestDate={earliestDate} latestDate={request?.neededBy} deliveryConstraint={product && !product.deliveryAvailable ? 'pickup' : deliveryConstraint} wholeQuantity={!!product} disabled={busy} />
              {request && <p className="text-xs leading-5 text-slate-600">Talabga taklif berish uchun sotuvchi profilingiz tasdiqlangan va savdo shartnomasi qabul qilingan bo‘lishi kerak.</p>}
              {request && (!supplierProfile || supplierProfile.verificationStatus !== 'approved' || b2bContract?.status !== 'accepted') && <button type="button" onClick={() => { onClose(); setB2BRoute(!supplierProfile ? { view: 'business' } : supplierProfile.verificationStatus !== 'approved' ? { view: 'dashboard' } : { view: 'contracts' }); }} className="min-h-11 text-left text-sm font-bold text-emerald-800 underline">{!supplierProfile ? 'Sotuvchi profilini ochish' : supplierProfile.verificationStatus !== 'approved' ? 'Profil tasdiqlanishini tekshirish' : 'Savdo shartnomasini ko‘rish'}</button>}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="min-h-12 w-full rounded-xl bg-[#e5470a] px-4 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">{busy ? 'Yuborilmoqda…' : 'Taklif yuborish'}</button>
            </form>}
  </Modal>;
};
