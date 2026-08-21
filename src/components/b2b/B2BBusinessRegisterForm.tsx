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

/* ─── Constants ─────────────────────────────────────────── */
const BUSINESS_TYPES: { id: BusinessType; label: string; icon: string }[] = [
  { id: 'supermarket', label: 'Supermarket', icon: '🏪' },
  { id: 'minimarket', label: 'Mini-market', icon: '🛒' },
  { id: 'grocery', label: "Oziq-ovqat do'koni", icon: '🥦' },
  { id: 'pharmacy', label: 'Dorixona', icon: '💊' },
  { id: 'cafe_restaurant', label: 'Kafe/Restoran', icon: '🍽️' },
  { id: 'clothing', label: 'Kiyim-kechak', icon: '👗' },
  { id: 'construction', label: 'Qurilish materiallari', icon: '🔨' },
  { id: 'household', label: 'Maishiy tovarlar', icon: '🏠' },
  { id: 'other', label: 'Boshqa', icon: '📦' },
];

const SUPPLIER_TYPES: { id: SupplierType; label: string; icon: string; desc: string }[] = [
  { id: 'manufacturer', label: 'Ishlab chiqaruvchi', icon: '🏭', desc: 'O\'z mahsulotini ishlab chiqaradi' },
  { id: 'importer', label: 'Importyor', icon: '🚢', desc: 'Xorijdan mahsulot olib keladi' },
  { id: 'distributor', label: 'Distributor', icon: '🚚', desc: 'Ulgurji tarqatuvchi' },
  { id: 'supplier', label: 'Yetkazib beruvchi', icon: '📦', desc: 'Mahsulot yetkazib beruvchi' },
];

const DISTRICTS: Record<string, string[]> = {
  'Toshkent sh.': ['Chilonzor', 'Yunusabad', 'Mirzo Ulug\'bek', 'Shayxontohur', 'Uchtepa', 'Olmazor', 'Bektemir', 'Yakkasaroy', 'Sergeli', 'Yashnobod', 'Mirobod', 'Hamza'],
  'Toshkent v.': ['Chirchiq', 'Angren', 'Ohangaron', 'Bekabad', 'Zangiota', 'Qibray', 'Yuqorichirchiq', 'O\'rta chirchiq'],
  'Farg\'ona': ['Farg\'ona sh.', 'Marg\'ilon', 'Qo\'qon', 'Quva', 'Rishton', 'Beshariq', 'Bag\'dod', 'Dang\'ara'],
  'Andijon': ['Andijon sh.', 'Asaka', 'Xo\'jaobod', 'Qo\'rg\'ontepa', 'Shahrixon', 'Paxtaobod', 'Jalolquduq', 'Oltinko\'l'],
  'Namangan': ['Namangan sh.', 'Chust', 'Pop', 'To\'raqo\'rg\'on', 'Kosonsoy', 'Mingbuloq', 'Uychi'],
  'Samarqand': ['Samarqand sh.', 'Kattaqo\'rg\'on', 'Urgut', 'Ishtixon', 'Narpay', 'Oqdaryo', 'Tayloq'],
  'Buxoro': ['Buxoro sh.', 'G\'ijduvon', 'Kogon', 'Romitan', 'Shofirkon', 'Peshku', 'Olot'],
  'Xorazm': ['Urganch sh.', 'Xiva', 'Gurlan', 'Hazorasp', 'Qo\'shko\'pir', 'Shovot', 'Tuproqqal\'a'],
  'Surxondaryo': ['Termiz sh.', 'Denov', 'Boysun', 'Shahrisabz', 'Sharg\'un', 'Qumqo\'rg\'on'],
  'Qashqadaryo': ['Qarshi sh.', 'Shahrisabz', 'G\'uzor', 'Kitob', 'Muborak', 'Koson', 'Chiroqchi'],
  'Jizzax': ['Jizzax sh.', 'G\'allaorol', 'Zomin', 'Yangiobod', 'Sharof Rashidov', 'Do\'stlik'],
  'Sirdaryo': ['Guliston sh.', 'Shirin', 'Boyovut', 'Sardoba', 'Hovos', 'Mirzaobod'],
  'Navoiy': ['Navoiy sh.', 'Zarafshon', 'Karmana', 'Tomdi', 'Nurota', 'Uchquduq'],
  'Qoraqalpog\'iston R.': ['Nukus sh.', 'Beruniy', 'Xo\'jayli', 'Qo\'ng\'irot', 'Chimboy', 'Turtkul'],
};

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
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>
      {badge && (
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black">
          {badge}
        </span>
      )}
    </div>
    {children}
    {hint && <p className="text-[10px] text-slate-400 font-medium pl-0.5">{hint}</p>}
  </div>
);

const inputCls =
  'w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#DB2777] focus:bg-white focus:ring-2 focus:ring-[#DB2777]/10 transition-all placeholder:text-slate-400';
const selectCls =
  'w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:border-[#DB2777] focus:bg-white focus:ring-2 focus:ring-[#DB2777]/10 transition-all appearance-none cursor-pointer';

/* ─── Main component ────────────────────────────────────── */
export const B2BBusinessRegisterForm: React.FC = () => {
  const {
    currentUser, businessProfile, supplierProfile,
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

        // Update coords immediately
        if (forMode === 'buyer') {
          setBuyerForm((prev) => ({ ...prev, latitude, longitude }));
        }

        // Reverse geocode with Nominatim (free, no API key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uz`,
            { headers: { 'User-Agent': 'OnBozoruz/1.0' } }
          );
          const data = await res.json();
          const addr = data?.address || {};

          // Try to match to known region
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

  /* ── Phone formatter ─────────────────────────────────── */
  const formatPhone = (raw: string): string => {
    // Format: +998 (XX) XXX-XX-XX
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (!digits.startsWith('998')) {
      const d = digits.startsWith('0') ? `998${digits.slice(1)}` : `998${digits}`;
      return formatPhone(d);
    }
    const d = digits.slice(0, 12);
    let out = '+998';
    if (d.length > 3) out += ` (${d.slice(3, 5)}`;
    if (d.length >= 5) out += `) ${d.slice(5, 8)}`;
    if (d.length >= 8) out += `-${d.slice(8, 10)}`;
    if (d.length >= 10) out += `-${d.slice(10, 12)}`;
    return out;
  };

  /* ── Submit handlers ─────────────────────────────────── */
  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!buyerForm.storeName.trim()) { setError("Do'kon nomini kiriting"); return; }
    if (!buyerForm.phone.trim()) { setError('Telefon raqamini kiriting'); return; }
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

  /* ── Already registered guards ───────────────────────── */
  if (businessProfile) {
    return (
      <div className="w-full max-w-lg mx-auto py-20 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <p className="font-black text-base text-[#111827]">Siz allaqachon biznes xaridor sifatida ro'yxatdan o'tgansiz.</p>
          <p className="text-sm text-slate-500 mt-1">Ulgurji sotib olishni boshlashingiz mumkin.</p>
        </div>
        <button
          onClick={() => setB2BRoute({ view: 'home' })}
          className="px-6 py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm"
        >
          B2B bosh sahifaga →
        </button>
      </div>
    );
  }
  if (supplierProfile) {
    const isPending = supplierProfile.verificationStatus === 'pending';
    const isRejected = supplierProfile.verificationStatus === 'rejected' || supplierProfile.verificationStatus === 'suspended';
    return (
      <div className="w-full max-w-lg mx-auto py-20 px-4 text-center space-y-5">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isRejected ? 'bg-rose-50' : isPending ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          {isPending
            ? <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            : <CheckCircle2 className={`w-8 h-8 ${isRejected ? 'text-rose-500' : 'text-emerald-600'}`} />}
        </div>
        <div>
          <p className="font-black text-base text-[#111827]">
            {isRejected
              ? (supplierProfile.verificationStatus === 'suspended' ? 'Akkaunt to\'xtatilgan.' : 'Arizangiz rad etildi.')
              : isPending ? 'Arizangiz tasdiqlanish kutilmoqda.' : 'Siz allaqachon supplier sifatida ro\'yxatdan o\'tgansiz.'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {isRejected
              ? (supplierProfile.rejectionReason || 'Batafsil ma\'lumot uchun panelga o\'ting.')
              : isPending ? "Admin tekshirgandan so'ng sizga xabar beriladi." : 'Buyurtmalaringizni panelda boshqarishingiz mumkin.'}
          </p>
        </div>
        <button
          onClick={() => setB2BRoute({ view: 'dashboard' })}
          className="px-6 py-3 rounded-2xl bg-[#111827] text-white font-black text-sm"
        >
          Paneliga o'tish →
        </button>
      </div>
    );
  }

  const buyerFilled = [buyerForm.storeName, buyerForm.ownerName, buyerForm.phone].filter(Boolean).length;
  const supplierFilled = [supplierForm.companyName, supplierForm.ownerName, supplierForm.phone].filter(Boolean).length;
  const progress = mode === 'buyer' ? (buyerFilled / 3) * 100 : (supplierFilled / 3) * 100;

  return (
    <div className="w-full max-w-lg mx-auto pb-12 select-none">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'home' })}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-base text-[#111827] leading-tight">Biznes sifatida qo'shilish</h1>
          <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#DB2777] to-rose-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(10, progress)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* ── Mode Selector ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'buyer', Icon: Store, title: 'Biznes xaridor', desc: "Do'kon — ulgurji sotib olish", badge: '🛒' },
            { key: 'supplier', Icon: Factory, title: 'Supplier', desc: 'Ishlab chiqaruvchi / Distributor', badge: '🏭' },
          ].map(({ key, Icon, title, desc, badge }) => (
            <button
              key={key}
              onClick={() => setMode(key as 'buyer' | 'supplier')}
              className={`p-4 rounded-[20px] border-2 text-left space-y-2 transition-all ${
                mode === key
                  ? 'border-[#DB2777] bg-gradient-to-br from-pink-50 to-rose-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{badge}</span>
                <Icon className={`w-4 h-4 ${mode === key ? 'text-[#DB2777]' : 'text-slate-400'}`} />
              </div>
              <div>
                <span className={`block font-black text-sm ${mode === key ? 'text-[#DB2777]' : 'text-[#111827]'}`}>{title}</span>
                <span className="block text-[10px] text-slate-500 mt-0.5">{desc}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Auto-fill notice ───────────────────────────── */}
        {currentUser && (
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-2xl px-3.5 py-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[11px] text-emerald-800 font-bold">
              Profil ma'lumotlaringiz (ism, telefon, email) avtomatik to'ldirildi. Tekshirib o'zgartiring.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            BUYER FORM
        ══════════════════════════════════════════════════ */}
        {mode === 'buyer' && (
          <form onSubmit={handleBuyerSubmit} className="space-y-4">
            {/* Section: Asosiy ma'lumotlar */}
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> Asosiy ma'lumotlar
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">✓</span>
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
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        buyerForm.businessType === t.id
                          ? 'bg-[#DB2777] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Section: Manzil */}
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Manzil va joylashuv
              </h3>

              {/* GPS Locate Button */}
              <div className={`rounded-xl border-2 p-3.5 space-y-2.5 transition-colors ${
                buyerForm.latitude ? 'border-emerald-200 bg-emerald-50/60' : 'border-dashed border-slate-300 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-700">GPS orqali joylashuvni aniqlash</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Xaritada ko'rinishi + viloyat/tuman/manzil avtomatik to'ldiriladi
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLocate('buyer')}
                    disabled={isLocating}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#DB2777] hover:bg-[#BE185D] text-white text-[11px] font-black transition-colors disabled:opacity-60"
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
                  <div className="flex items-center gap-2 bg-emerald-100 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <p className="text-[10px] text-emerald-700 font-bold">
                      ✓ {buyerForm.latitude.toFixed(5)}°, {buyerForm.longitude.toFixed(5)}° — joylashuv saqlandi
                    </p>
                  </div>
                )}
              </div>

              {/* Region + District */}
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Viloyat" icon={<Building2 className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    <select
                      value={buyerForm.region}
                      onChange={(e) => setBuyerForm({ ...buyerForm, region: e.target.value, district: '' })}
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

                <Field label="Tuman/Shahar" icon={<MapPin className="w-3.5 h-3.5" />}>
                  <div className="relative">
                    {buyerForm.region && DISTRICTS[buyerForm.region] ? (
                      <>
                        <select
                          value={buyerForm.district}
                          onChange={(e) => setBuyerForm({ ...buyerForm, district: e.target.value })}
                          className={selectCls}
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
                      />
                    )}
                  </div>
                </Field>
              </div>

              <Field label="Ko'cha va mo'ljal" icon={<MapPin className="w-3.5 h-3.5" />} hint="GPS orqali aniqlansa avtomatik to'ldiriladi">
                <input
                  value={buyerForm.address}
                  onChange={(e) => setBuyerForm({ ...buyerForm, address: e.target.value })}
                  placeholder="Masalan: Navoiy ko'chasi 45-uy"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Section: Qo'shimcha */}
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Qo'shimcha ma'lumot
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
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200/60 rounded-2xl">
                <span className="text-rose-500 text-sm shrink-0">⚠️</span>
                <p className="text-xs font-bold text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#DB2777] to-rose-500 hover:from-[#BE185D] hover:to-rose-600 text-white font-black text-sm shadow-lg shadow-pink-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5" /> Kompaniya ma'lumotlari
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
                      className={`p-2.5 rounded-xl text-left transition-all border ${
                        supplierForm.supplierType === t.id
                          ? 'border-[#DB2777] bg-pink-50'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base block">{t.icon}</span>
                      <span className={`block text-[11px] font-black mt-1 ${supplierForm.supplierType === t.id ? 'text-[#DB2777]' : 'text-slate-700'}`}>
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
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3.5 shadow-xs">
              <h3 className="font-black text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Kompaniya manzili
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
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Mahsulot kategoriyalari
                </h3>
                {supplierForm.categories.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#DB2777] text-white text-[10px] font-black">
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
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      supplierForm.categories.includes(c.id)
                        ? 'bg-[#111827] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Section: Tavsif */}
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-xs">
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
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200/60 rounded-2xl">
                <span className="text-rose-500 text-sm shrink-0">⚠️</span>
                <p className="text-xs font-bold text-rose-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#111827] to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
