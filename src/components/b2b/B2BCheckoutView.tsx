import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Banknote, CreditCard, ShieldCheck, MapPin, ChevronDown, Sparkles, LocateFixed } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { REGIONS } from '../../data/mockAgroData';
import { B2BPaymentMethod } from '../../api/types';
import { formatMoney, formatPhone, UZ_DISTRICTS } from '../../utils/b2bUtils';

export const B2BCheckoutView: React.FC = () => {
  const {
    b2bCart,
    businessProfile,
    registerBusinessBuyer,
    checkoutB2BCart,
    setB2BRoute,
    showToast,
    currentUser,
    isAuthenticated,
    setAuthPromptOpen,
  } = useAgroStore();

  const [form, setForm] = useState({
    storeName: businessProfile?.storeName || '',
    phone: businessProfile?.phone || currentUser?.phone || '',
    region: businessProfile?.region || '',
    district: businessProfile?.district || '',
    address: '',
    note: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<B2BPaymentMethod>('cash');
  const [useCashback, setUseCashback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const { b2bCashbackRate, b2bCashbackBalance, fetchB2BCashbackBalance } = useAgroStore();

  useEffect(() => {
    if (businessProfile) {
      void fetchB2BCashbackBalance();
    }
  }, [businessProfile, fetchB2BCashbackBalance]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast('❌ Brauzeringiz joylashuvni qo\'llab-quvvatlamaydi');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uz`,
            { headers: { 'Accept-Language': 'uz,ru;q=0.8,en;q=0.6' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          // Build a readable street address
          const street = [
            addr.road || addr.pedestrian || addr.footway || '',
            addr.house_number || '',
          ].filter(Boolean).join(', ');
          const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
          const city = addr.city || addr.town || addr.village || addr.county || '';
          const fullAddress = [street, suburb, city].filter(Boolean).join(', ');

          // Try to match Nominatim state to our REGIONS list
          const nominatimState = (addr.state || addr.province || '').toLowerCase();
          const matchedRegion = REGIONS.find(
            (r) => r !== 'Barchasi' && nominatimState.includes(r.toLowerCase().replace(' viloyati', '').replace(' shahri', ''))
          ) || '';
          const districtRaw = addr.county || addr.district || addr.city_district || '';

          setForm((prev) => ({
            ...prev,
            address: fullAddress || prev.address,
            ...(matchedRegion ? { region: matchedRegion, district: districtRaw } : {}),
          }));
          showToast('📍 Joylashuv aniqlandi va manzil to\'ldirildi');
        } catch {
          showToast('⚠️ Manzilni aniqlashda xatolik. Qo\'lda kiriting.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) showToast('🔒 Joylashuv ruxsati rad etildi. Sozlamalarda ruxsat bering.');
        else showToast('❌ Joylashuvni aniqlab bo\'lmadi. Qo\'lda kiriting.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const total = Object.values(b2bCart).reduce((s, l) => s + l.product.wholesalePrice * l.quantity, 0);
  const applicableCashback = useCashback ? Math.min(b2bCashbackBalance, total) : 0;
  const finalPayable = Math.max(0, total - applicableCashback);
  const expectedCashback = Math.round(total * (b2bCashbackRate / 100));

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4 bg-white rounded-3xl border border-slate-200 shadow-xl my-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-black text-slate-900">Tizimga kirish talab etiladi</h2>
          <p className="text-xs text-slate-500 font-medium">Ulgurji buyurtmani rasmiylashtirish uchun tizimga kiring.</p>
        </div>
        <button
          onClick={() => setAuthPromptOpen(true)}
          className="px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-colors border border-blue-400/30"
        >
          Tizimga kirish
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.storeName.trim() || !form.phone.trim() || !form.region || !form.district.trim() || !form.address.trim()) {
      setError("Yetkazib berish uchun barcha majburiy ma'lumotlarni to'ldiring");
      return;
    }
    setIsSubmitting(true);
    try {
      if (!businessProfile) {
        await registerBusinessBuyer({
          storeName: form.storeName.trim(),
          ownerName: currentUser?.name || form.storeName.trim(),
          phone: form.phone.trim(),
          businessType: 'grocery',
          region: form.region || 'Toshkent',
          district: form.district || 'Boshqa',
          description: "Avtomatik yaratilgan biznes profil",
        });
      }

      const result = await checkoutB2BCart(
        {
          storeName: form.storeName.trim(),
          phone: form.phone.trim(),
          region: form.region,
          district: form.district.trim(),
          address: form.address.trim(),
          note: form.note.trim(),
        },
        paymentMethod,
        applicableCashback
      );
      if (result.failed.length === 0) {
        showToast("✅ Buyurtma(lar) muvaffaqiyatli yaratildi");
        setB2BRoute({ view: 'orders' });
      } else if (result.succeededSupplierIds.length > 0) {
        showToast(`${result.succeededSupplierIds.length} ta yetkazib beruvchidan buyurtma qabul qilindi`);
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

  const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all";
  const selectCls = "bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none w-full";

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'cart' })}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-slate-900">Rasmiylashtirish</h1>
          <p className="text-[10px] text-slate-500 font-medium">Yetkazib berish ma'lumotlari</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Delivery address card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Yetkazib berish manzili
          </h2>
          <input
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            placeholder="Do'kon nomi"
            className={inputCls}
            required
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
            placeholder="+998 (90) 123-45-67"
            className={inputCls}
            inputMode="tel"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value, district: '' })}
                className={selectCls}
                required
                aria-label="Viloyat"
              >
                <option value="">Viloyat tanlang</option>
                {REGIONS.filter((r) => r !== 'Barchasi').map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {form.region && UZ_DISTRICTS[form.region] ? (
              <div className="relative">
                <select
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className={selectCls}
                  required
                  aria-label="Tuman"
                >
                  <option value="">Tuman tanlang</option>
                  {UZ_DISTRICTS[form.region].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                placeholder="Tuman"
                className={inputCls}
                required
              />
            )}
          </div>
          {/* Address with geo-locate button */}
          <div className="relative">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="To'liq ko'cha va mo'ljal"
              className={`${inputCls} pr-12`}
              required
            />
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              title="Joylashuvimni aniqlash"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 disabled:bg-slate-50 text-blue-600 disabled:text-slate-400 border border-blue-200 disabled:border-slate-200 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isLocating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <LocateFixed className="w-4 h-4" />}
            </button>
          </div>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Izoh (ixtiyoriy)"
            className={inputCls}
          />
        </div>

        {/* Cashback card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" /> B2B Keshbek Hamyoni
            </h2>
            {b2bCashbackBalance > 0 && (
              <button
                type="button"
                onClick={() => setUseCashback((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border transition-all ${
                  useCashback
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-emerald-300'
                }`}
              >
                {useCashback ? '✓ Ishlatilmoqda' : 'Ishlatish'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Mavjud balans: <strong className="text-emerald-600 font-black">{formatMoney(b2bCashbackBalance)}</strong>
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-xs text-emerald-700/80 font-bold">Ushbu buyurtmadan keshbek:</span>
            <span className="text-xs text-emerald-700 font-black">+{formatMoney(expectedCashback)} ({b2bCashbackRate}%)</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
          <h2 className="font-black text-sm text-slate-900">To'lov usuli</h2>
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
              paymentMethod === 'cash'
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
              <Banknote className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-emerald-600' : 'text-slate-500'}`} />
            </div>
            <span className={`text-sm font-bold ${paymentMethod === 'cash' ? 'text-slate-900' : 'text-slate-500'}`}>Naqd pul</span>
            {paymentMethod === 'cash' && (
              <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">✓</span>
              </div>
            )}
          </button>
          <button
            type="button"
            disabled
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-slate-500" />
            </div>
            <span className="text-sm font-bold text-slate-500">Onlayn to'lov — tez orada</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-600">
            {error}
          </div>
        )}

        {/* Total summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Mahsulotlar summasi</span>
            <span className="font-bold text-slate-700">{formatMoney(total)}</span>
          </div>
          {applicableCashback > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-600">Keshbek chegirmasi</span>
              <span className="font-black text-emerald-600">-{formatMoney(applicableCashback)}</span>
            </div>
          )}
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-500">To'lanadigan jami</span>
            <span className="font-black text-xl text-slate-900">{formatMoney(finalPayable)}</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 border border-blue-400/30"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buyurtmani tasdiqlash"}
        </button>
      </form>
    </div>
  );
};
