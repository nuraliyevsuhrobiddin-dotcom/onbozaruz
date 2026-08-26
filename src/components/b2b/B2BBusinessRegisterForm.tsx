import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Store,
  Factory,
  MapPin,
  Phone,
  User,
  Mail,
  Sparkles,
  CheckCircle2,
  Navigation,
  Building2,
  FileText,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { REGIONS } from '../../data/mockAgroData';
import { categoriesForScope } from '../../utils/categoryScope';
import { BusinessType, SupplierType } from '../../api/types';
import {
  B2B_BUSINESS_TYPES as BUSINESS_TYPES,
  B2B_SUPPLIER_TYPES as SUPPLIER_TYPES,
  UZ_DISTRICTS as DISTRICTS,
  formatPhone,
} from '../../utils/b2bUtils';

/* ─── Field wrapper ─────────────────────────────────────── */
const Field: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
  badge?: string;
}> = ({ label, icon, children, hint, badge }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
        <span className="text-blue-500">{icon}</span>
        {label}
      </label>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-black">
          {badge}
        </span>
      )}
    </div>
    {children}
    {hint && <p className="text-[10px] text-slate-400 font-medium pl-0.5">{hint}</p>}
  </div>
);

const inputCls =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400';
const selectCls =
  'w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none cursor-pointer';

/* ─── Main component ────────────────────────────────────── */
export const B2BBusinessRegisterForm: React.FC = () => {
  const {
    currentUser, businessProfile, supplierProfile, isAuthenticated, setAuthPromptOpen,
    setB2BRoute, registerBusinessBuyer, registerSupplier, showToast,
  } = useAgroStore();
  const { categories: allCategories } = useAgroStore();
  const categories = categoriesForScope(allCategories, 'market').filter((c) => c.id !== 'all');

  const [mode, setMode] = useState<'buyer' | 'supplier'>('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  /* ── Buyer form ──────────────────────────────────────── */
  const [buyerForm, setBuyerForm] = useState({
    storeName: currentUser?.businessName?.trim() || '',
    ownerName: currentUser?.name || '',
    phone: currentUser?.phone || '',
    businessType: 'grocery' as BusinessType,
    region: '',
    district: '',
    address: currentUser?.location || '',
    latitude: currentUser?.lat ?? null as number | null,
    longitude: currentUser?.lng ?? null as number | null,
    description: '',
  });

  /* ── Supplier form ───────────────────────────────────── */
  const [supplierForm, setSupplierForm] = useState({
    companyName: currentUser?.businessName?.trim() || '',
    supplierType: 'distributor' as SupplierType,
    ownerName: currentUser?.name || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    region: '',
    district: '',
    address: currentUser?.location || '',
    description: '',
    categories: [] as string[],
    taxId: '',
  });

  /* ── Auto-fill from profile on mount ────────────────── */
  useEffect(() => {
    if (!currentUser) return;
    setBuyerForm((prev) => ({
      ...prev,
      ownerName: prev.ownerName || currentUser.name || '',
      phone: prev.phone || currentUser.phone || '',
      storeName: prev.storeName || currentUser.businessName?.trim() || '',
      address: prev.address || currentUser.location || '',
      latitude: prev.latitude ?? currentUser.lat ?? null,
      longitude: prev.longitude ?? currentUser.lng ?? null,
    }));
    setSupplierForm((prev) => ({
      ...prev,
      ownerName: prev.ownerName || currentUser.name || '',
      phone: prev.phone || currentUser.phone || '',
      email: prev.email || currentUser.email || '',
      companyName: prev.companyName || currentUser.businessName?.trim() || '',
      address: prev.address || currentUser.location || '',
    }));
  }, [currentUser]);

  /* ── GPS + Reverse geocode ───────────────────────────── */
  const handleLocate = useCallback(async (forMode: 'buyer' | 'supplier') => {
    if (!navigator.geolocation) {
      showToast('GPS xizmati mavjud emas');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        if (forMode === 'buyer') {
          setBuyerForm((prev) => ({ ...prev, latitude, longitude }));
        }

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uz`,
            { headers: { 'User-Agent': 'OnBozar/1.0' } }
          );
          const data = await res.json();
          const addr = data?.address || {};

          const cityRaw: string = (addr.city || addr.county || addr.state || '').toLowerCase();
          const matchedRegion = REGIONS.filter((r) => r !== 'Barchasi').find((r) => {
            const rLower = r.toLowerCase().replace(' sh.', '').replace(' v.', '').replace(' r.', '');
            return cityRaw.includes(rLower) || rLower.includes(cityRaw.split(' ')[0]);
          }) || '';

          const districtRaw: string = addr.suburb || addr.town || addr.village || addr.district || '';
          const streetRaw: string = [addr.road, addr.house_number].filter(Boolean).join(', ');

          if (forMode === 'buyer') {
            setBuyerForm((prev) => ({
              ...prev,
              latitude,
              longitude,
              region: matchedRegion || prev.region,
              district: districtRaw || prev.district,
              address: streetRaw || prev.address,
            }));
          } else {
            setSupplierForm((prev) => ({
              ...prev,
              region: matchedRegion || prev.region,
              district: districtRaw || prev.district,
              address: streetRaw || prev.address,
            }));
          }
          showToast("✅ Joylashuv aniqlandi va manzil to'ldirildi!");
        } catch {
          showToast('✅ GPS koordinatalari saqlandi (manzil aniqlanmadi)');
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        showToast('Joylashuvga ruxsat berilmadi. Qurilma sozlamalarini tekshiring.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [showToast]);

  /* ── Submit handlers ─────────────────────────────────── */
  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!buyerForm.storeName.trim()) { setError("Do'kon nomini kiriting"); return; }
    if (!buyerForm.phone.trim()) { setError('Telefon raqamini kiriting'); return; }
    if (!buyerForm.region || !buyerForm.district.trim() || !buyerForm.address.trim()) {
      setError("Viloyat, tuman/shahar va to'liq manzil majburiy");
      return;
    }
    setIsSubmitting(true);
    try {
      await registerBusinessBuyer(buyerForm);
      setB2BRoute({ view: 'home' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!supplierForm.companyName.trim()) { setError('Kompaniya nomini kiriting'); return; }
    if (!supplierForm.phone.trim()) { setError('Telefon raqamini kiriting'); return; }
    setIsSubmitting(true);
    try {
      await registerSupplier(supplierForm);
      showToast('Ariza yuborildi — admin tasdiqlaguncha kuting');
      setB2BRoute({ view: 'dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSupplierCategory = (id: string) => {
    setSupplierForm((f) => ({
      ...f,
      categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id],
    }));
  };

  /* ── Guest guard ──────────────────────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg py-16 px-4 text-center space-y-5 bg-white rounded-3xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <p className="font-black text-base text-slate-900">Biznes sifatida ro'yxatdan o'tish uchun tizimga kiring.</p>
            <p className="text-xs text-slate-500">Xaridor yoki yetkazib beruvchi sifatida qo'shilishdan oldin hisobingizga kiring.</p>
          </div>
          <button
            onClick={() => setAuthPromptOpen(true)}
            className="px-6 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all border border-blue-400/30"
          >
            Tizimga kirish
          </button>
        </div>
      </div>
    );
  }

  /* ── Already registered guards ───────────────────────── */
  if (businessProfile) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg py-16 px-4 text-center space-y-5 bg-white rounded-3xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <p className="font-black text-base text-slate-900">Siz allaqachon biznes xaridor sifatida ro'yxatdan o'tgansiz.</p>
            <p className="text-xs text-slate-500">Ulgurji sotib olishni boshlashingiz mumkin.</p>
          </div>
          <button
            onClick={() => setB2BRoute({ view: 'home' })}
            className="px-6 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all border border-blue-400/30"
          >
            B2B bosh sahifaga →
          </button>
        </div>
      </div>
    );
  }
  if (supplierProfile) {
    const isPending = supplierProfile.verificationStatus === 'pending';
    const isRejected = supplierProfile.verificationStatus === 'rejected' || supplierProfile.verificationStatus === 'suspended';
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg py-16 px-4 text-center space-y-5 bg-white rounded-3xl border border-slate-200">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
            isRejected ? 'bg-red-50 border-red-200 text-red-600' :
            isPending ? 'bg-amber-50 border-amber-200 text-amber-600' :
            'bg-emerald-50 border-emerald-200 text-emerald-600'
          }`}>
            {isPending
              ? <Loader2 className="w-8 h-8 animate-spin" />
              : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <div className="space-y-1.5">
            <p className="font-black text-base text-slate-900">
              {isRejected
                ? (supplierProfile.verificationStatus === 'suspended' ? 'Akkaunt to\'xtatilgan.' : 'Arizangiz rad etildi.')
                : isPending ? 'Arizangiz tasdiqlanish kutilmoqda.' : 'Siz allaqachon supplier sifatida ro\'yxatdan o\'tgansiz.'}
            </p>
            <p className="text-xs text-slate-500">
              {isRejected
                ? (supplierProfile.rejectionReason || 'Batafsil ma\'lumot uchun panelga o\'ting.')
                : isPending ? "Admin tekshirgandan so'ng sizga xabar beriladi." : 'Buyurtmalaringizni panelda boshqarishingiz mumkin.'}
            </p>
          </div>
          <button
            onClick={() => setB2BRoute({ view: 'dashboard' })}
            className="px-6 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all border border-blue-400/30"
          >
            Paneliga o'tish →
          </button>
        </div>
      </div>
    );
  }

  const buyerFilled = [buyerForm.storeName, buyerForm.ownerName, buyerForm.phone].filter(Boolean).length;
  const supplierFilled = [supplierForm.companyName, supplierForm.ownerName, supplierForm.phone].filter(Boolean).length;
  const progress = mode === 'buyer' ? (buyerFilled / 3) * 100 : (supplierFilled / 3) * 100;

  return (
    <div className="w-full max-w-lg mx-auto pb-12 select-none">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'home' })}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-base text-slate-900 leading-tight">Biznes sifatida qo'shilish</h1>
          <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(10, progress)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ── Mode Selector ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'buyer', Icon: Store, title: 'Biznes xaridor', desc: "Do'kon — ulgurji xarid", badge: '🛒' },
            { key: 'supplier', Icon: Factory, title: 'Supplier', desc: 'Ishlab chiqaruvchi / Diler', badge: '🏭' },
          ].map(({ key, Icon, title, desc, badge }) => (
            <button
              key={key}
              onClick={() => setMode(key as 'buyer' | 'supplier')}
              className={`p-4 rounded-2xl border text-left space-y-2 transition-all ${
                mode === key
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{badge}</span>
                <Icon className={`w-4 h-4 ${mode === key ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <div>
                <span className={`block font-black text-sm ${mode === key ? 'text-blue-600' : 'text-slate-800'}`}>{title}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Auto-fill notice ───────────────────────────── */}
        {currentUser && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[11px] text-emerald-700 font-bold">
              Profil ma'lumotlaringiz (ism, telefon, email) avtomatik to'ldirildi.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            BUYER FORM
        ══════════════════════════════════════════════════ */}
        {mode === 'buyer' && (
          <form onSubmit={handleBuyerSubmit} className="space-y-4">
            {/* Section: Asosiy ma'lumotlar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
              <h3 className="font-black text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-500" /> Asosiy ma'lumotlar
              </h3>

              <Field label="Do'kon nomi" icon={<Store className="w-3.5 h-3.5" />} badge="Majburiy">
                <input
                  value={buyerForm.storeName}
                  onChange={(e) => setBuyerForm({ ...buyerForm, storeName: e.target.value })}
                  placeholder="Masalan: Baraka Supermarket"
                  className={inputCls}
                  required
                />
              </Field>

              <Field label="Egasi ismi" icon={<User className="w-3.5 h-3.5" />} badge={currentUser?.name ? 'Profildan olindi' : undefined}>
                <input
                  value={buyerForm.ownerName}
                  onChange={(e) => setBuyerForm({ ...buyerForm, ownerName: e.target.value })}
                  placeholder="To'liq ismingiz"
                  className={inputCls}
                />
              </Field>

              <Field label="Telefon raqam" icon={<Phone className="w-3.5 h-3.5" />} badge={currentUser?.phone ? 'Profildan olindi' : undefined} hint="+998 (90) 123-45-67 formatida">
                <div className="relative">
                  <input
                    value={buyerForm.phone}
                    onChange={(e) => setBuyerForm({ ...buyerForm, phone: formatPhone(e.target.value) })}
                    placeholder="+998 (90) 123-45-67"
                    className={inputCls}
                    inputMode="tel"
                  />
                  {buyerForm.phone && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-sm">✓</span>
                  )}
                </div>
              </Field>

              {/* Business type pills */}
              <Field label="Do'kon turi" icon={<Tag className="w-3.5 h-3.5" />}>
                <div className="flex flex-wrap gap-1.5">
                  {BUSINESS_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBuyerForm({ ...buyerForm, businessType: t.id })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                        buyerForm.businessType === t.id
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Section: Manzil */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
              <h3 className="font-black text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" /> Manzil va joylashuv
              </h3>

              {/* GPS Locate Button */}
              <div className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
                buyerForm.latitude ? 'border-emerald-200 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800">GPS orqali joylashuvni aniqlash</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Xaritada ko'rinishi + manzil avtomatik to'ldiriladi
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLocate('buyer')}
                    disabled={isLocating}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-black transition-colors disabled:opacity-60 shadow-md shadow-blue-500/20 border border-blue-400/30"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    {isLocating ? 'Aniqlanmoqda...' : 'GPS Aniqlash'}
                  </button>
                </div>
                {buyerForm.latitude && buyerForm.longitude && (
                  <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <p className="text-[10px] text-emerald-700 font-bold">
                      ✓ {buyerForm.latitude.toFixed(5)}°, {buyerForm.longitude.toFixed(5)}° — joylashuv saqlandi
                    </p>
                  </div>
                )}
              </div>

              {/* Region + District */}
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Viloyat" icon={<Building2 className="w-3.5 h-3.5" />} badge="Majburiy">
                  <div className="relative">
                    <select
                      value={buyerForm.region}
                      onChange={(e) => setBuyerForm({ ...buyerForm, region: e.target.value, district: '' })}
                      className={selectCls}
                      required
                    >
                      <option value="">Tanlang...</option>
                      {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Tuman/Shahar" icon={<MapPin className="w-3.5 h-3.5" />} badge="Majburiy">
                  <div className="relative">
                    {buyerForm.region && DISTRICTS[buyerForm.region] ? (
                      <>
                        <select
                          value={buyerForm.district}
                          onChange={(e) => setBuyerForm({ ...buyerForm, district: e.target.value })}
                          className={selectCls}
                          required
                        >
                          <option value="">Tanlang...</option>
                          {DISTRICTS[buyerForm.region].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </>
                    ) : (
                      <input
                        value={buyerForm.district}
                        onChange={(e) => setBuyerForm({ ...buyerForm, district: e.target.value })}
                        placeholder="Tuman yoki shahar"
                        className={inputCls}
                        required
                      />
                    )}
                  </div>
                </Field>
              </div>

              <Field label="Ko'cha va mo'ljal" icon={<MapPin className="w-3.5 h-3.5" />} badge="Majburiy" hint="GPS orqali aniqlansa avtomatik to'ldiriladi">
                <input
                  value={buyerForm.address}
                  onChange={(e) => setBuyerForm({ ...buyerForm, address: e.target.value })}
                  placeholder="Masalan: Navoiy ko'chasi 45-uy"
                  className={inputCls}
                  required
                />
              </Field>
            </div>

            {/* Section: Qo'shimcha */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
              <h3 className="font-black text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" /> Qo'shimcha ma'lumot
              </h3>
              <Field label="Tavsif (ixtiyoriy)" icon={<FileText className="w-3.5 h-3.5" />}>
                <textarea
                  value={buyerForm.description}
                  onChange={(e) => setBuyerForm({ ...buyerForm, description: e.target.value })}
                  placeholder="Do'koningiz haqida qisqacha..."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl">
                <span className="text-red-500 text-sm shrink-0">⚠️</span>
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 border border-blue-400/30"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saqlanmoqda...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Biznes profilni yaratish <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}

        {/* ══════════════════════════════════════════════════
            SUPPLIER FORM
        ══════════════════════════════════════════════════ */}
        {mode === 'supplier' && (
          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            {/* Section: Kompaniya */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
              <h3 className="font-black text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-blue-500" /> Kompaniya ma'lumotlari
              </h3>

              <Field label="Kompaniya nomi" icon={<Building2 className="w-3.5 h-3.5" />} badge="Majburiy">
                <input
                  value={supplierForm.companyName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })}
                  placeholder="Masalan: Agro Invest Distribyutor MChJ"
                  className={inputCls}
                  required
                />
              </Field>

              {/* Supplier type cards */}
              <Field label="Kompaniya turi" icon={<Tag className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPLIER_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSupplierForm({ ...supplierForm, supplierType: t.id })}
                      className={`p-3 rounded-xl text-left transition-all border ${
                        supplierForm.supplierType === t.id
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <span className="text-base block">{t.icon}</span>
                      <span className={`block text-[11px] font-black mt-1 ${supplierForm.supplierType === t.id ? 'text-blue-600' : 'text-slate-800'}`}>
                        {t.label}
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Direktor / Egasi" icon={<User className="w-3.5 h-3.5" />} badge={currentUser?.name ? 'Profildan olindi' : undefined}>
                <input
                  value={supplierForm.ownerName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, ownerName: e.target.value })}
                  placeholder="To'liq ismingiz"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Telefon" icon={<Phone className="w-3.5 h-3.5" />} badge={currentUser?.phone ? 'Profildan' : undefined}>
                  <input
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: formatPhone(e.target.value) })}
                    placeholder="+998 (90) 123-45-67"
                    className={inputCls}
                    inputMode="tel"
                  />
                </Field>
                <Field label="Email" icon={<Mail className="w-3.5 h-3.5" />} badge={currentUser?.email ? 'Profildan' : undefined}>
                  <input
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    placeholder="info@company.uz"
                    className={inputCls}
                    type="email"
                  />
                </Field>
              </div>

              <Field label="STIR (soliq raqami)" icon={<FileText className="w-3.5 h-3.5" />} hint="Ixtiyoriy — lekin tavsiya etiladi">
                <input
                  value={supplierForm.taxId}
                  onChange={(e) => setSupplierForm({ ...supplierForm, taxId: e.target.value })}
                  placeholder="Masalan: 302345678"
                  className={inputCls}
                  inputMode="numeric"
                />
              </Field>
            </div>

            {/* Section: Manzil */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-sm">
              <h3 className="font-black text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" /> Kompaniya manzili
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Viloyat" icon={<Building2 className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <select
                      value={supplierForm.region}
                      onChange={(e) => setSupplierForm({ ...supplierForm, region: e.target.value, district: '' })}
                      className={selectCls}
                    >
                      <option value="">Tanlang...</option>
                      {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Tuman" icon={<MapPin className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    {supplierForm.region && DISTRICTS[supplierForm.region] ? (
                      <>
                        <select
                          value={supplierForm.district}
                          onChange={(e) => setSupplierForm({ ...supplierForm, district: e.target.value })}
                          className={selectCls}
                        >
                          <option value="">Tanlang...</option>
                          {DISTRICTS[supplierForm.region].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </>
                    ) : (
                      <input
                        value={supplierForm.district}
                        onChange={(e) => setSupplierForm({ ...supplierForm, district: e.target.value })}
                        placeholder="Tuman"
                        className={inputCls}
                      />
                    )}
                  </div>
                </Field>
              </div>

              <Field label="Manzil" icon={<MapPin className="w-3.5 h-3.5" />}>
                <input
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="Ko'cha, bino nomer"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Section: Kategoriyalar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-500" /> Mahsulot kategoriyalari
                </h3>
                {supplierForm.categories.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black">
                    {supplierForm.categories.length} tanlandi
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSupplierCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                      supplierForm.categories.includes(c.id)
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Section: Tavsif */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <Field label="Kompaniya haqida" icon={<FileText className="w-3.5 h-3.5" />} hint="Sotadigan mahsulotlar, hududlar, yetkazib berish shartlari">
                <textarea
                  value={supplierForm.description}
                  onChange={(e) => setSupplierForm({ ...supplierForm, description: e.target.value })}
                  placeholder="Kompaniyangiz haqida qisqacha..."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </Field>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl">
                <span className="text-red-500 text-sm shrink-0">⚠️</span>
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 border border-blue-400/30"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Yuborilmoqda...</>
              ) : (
                <><Factory className="w-4 h-4" /> Arizani yuborish <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
