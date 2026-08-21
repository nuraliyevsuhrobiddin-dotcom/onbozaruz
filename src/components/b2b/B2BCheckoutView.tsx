import React, { useState } from 'react';
import { ArrowLeft, Loader2, Banknote, CreditCard } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { REGIONS } from '../../data/mockAgroData';
import { B2BPaymentMethod } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

export const B2BCheckoutView: React.FC = () => {
  const { b2bCart, businessProfile, checkoutB2BCart, setB2BRoute, showToast, currentUser } = useAgroStore();
  const [form, setForm] = useState({
    storeName: businessProfile?.storeName || '',
    phone: businessProfile?.phone || currentUser?.phone || '',
    region: businessProfile?.region || '',
    district: businessProfile?.district || '',
    address: '',
    note: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<B2BPaymentMethod>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = Object.values(b2bCart).reduce((s, l) => s + l.product.wholesalePrice * l.quantity, 0);

  if (!businessProfile) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">Checkout qilishdan oldin biznes profilingizni to'ldiring.</p>
        <button onClick={() => setB2BRoute({ view: 'business' })} className="px-6 py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm">
          Biznes profilni to'ldirish
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.storeName.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Do'kon nomi, telefon va manzilni to'ldiring");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await checkoutB2BCart(
        { storeName: form.storeName, phone: form.phone, region: form.region, district: form.district, address: form.address, note: form.note },
        paymentMethod
      );
      if (result.failed.length === 0) {
        showToast("✅ Buyurtma(lar) muvaffaqiyatli yaratildi");
        setB2BRoute({ view: 'orders' });
      } else if (result.succeededSupplierIds.length > 0) {
        showToast(`${result.succeededSupplierIds.length} ta yetkazib beruvchidan buyurtma qabul qilindi, ${result.failed.length} tasi saqlanmadi`);
        setB2BRoute({ view: 'orders' });
      } else {
        setError(result.failed[0]?.error || 'Buyurtma yaratilmadi');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'cart' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-lg text-[#111827]">Rasmiylashtirish</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-3 shadow-sm">
          <h2 className="font-black text-sm text-[#111827]">Yetkazib berish manzili</h2>
          <input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="Do'kon nomi" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon raqami" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium">
              <option value="">Viloyat</option>
              {REGIONS.filter((r) => r !== 'Barchasi').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Tuman" className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          </div>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="To'liq manzil" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Izoh (ixtiyoriy)" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-2.5 shadow-sm">
          <h2 className="font-black text-sm text-[#111827]">To'lov usuli</h2>
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`w-full flex items-center gap-2.5 p-3 rounded-xl border-2 transition-colors ${paymentMethod === 'cash' ? 'border-[#DB2777] bg-pink-50' : 'border-slate-200'}`}
          >
            <Banknote className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-[#111827]">Naqd pul</span>
          </button>
          <button type="button" disabled className="w-full flex items-center gap-2.5 p-3 rounded-xl border-2 border-slate-100 opacity-50 cursor-not-allowed">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-400">Onlayn to'lov — tez orada</span>
          </button>
        </div>

        {error && <div className="p-3 bg-pink-50 border border-pink-200 rounded-2xl text-xs font-bold text-[#DB2777]">{error}</div>}

        <div className="flex items-center justify-between text-sm px-1">
          <span className="font-bold text-slate-600">Jami</span>
          <span className="font-black text-lg text-[#111827]">{formatMoney(total)}</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-sm shadow-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buyurtmani tasdiqlash"}
        </button>
      </form>
    </div>
  );
};
