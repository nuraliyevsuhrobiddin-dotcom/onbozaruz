import React, { useState } from 'react';
import { ArrowLeft, Loader2, Store, Factory } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { REGIONS } from '../../data/mockAgroData';
import { categoriesForScope } from '../../utils/categoryScope';
import { BusinessType, SupplierType } from '../../api/types';

const BUSINESS_TYPES: { id: BusinessType; label: string }[] = [
  { id: 'grocery', label: "Oziq-ovqat do'koni" },
  { id: 'minimarket', label: 'Mini-market' },
  { id: 'supermarket', label: 'Supermarket' },
  { id: 'clothing', label: 'Kiyim-kechak' },
  { id: 'pharmacy', label: 'Dorixona' },
  { id: 'cafe_restaurant', label: 'Kafe/Restoran' },
  { id: 'construction', label: 'Qurilish' },
  { id: 'household', label: 'Maishiy' },
  { id: 'other', label: 'Boshqa' },
];

const SUPPLIER_TYPES: { id: SupplierType; label: string }[] = [
  { id: 'manufacturer', label: 'Ishlab chiqaruvchi' },
  { id: 'importer', label: 'Importyor' },
  { id: 'distributor', label: 'Distributor' },
  { id: 'supplier', label: 'Yetkazib beruvchi' },
];

/** "Biznes sifatida qo'shilish" — Business Buyer yoki Supplier tanlaydi. */
export const B2BBusinessRegisterForm: React.FC = () => {
  const {
    currentUser, businessProfile, supplierProfile, setB2BRoute,
    registerBusinessBuyer, registerSupplier, showToast,
  } = useAgroStore();
  const { categories: allCategories } = useAgroStore();
  const categories = categoriesForScope(allCategories, 'market').filter((c) => c.id !== 'all');

  const [mode, setMode] = useState<'buyer' | 'supplier'>('buyer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [buyerForm, setBuyerForm] = useState({
    storeName: '', ownerName: currentUser?.name || '', phone: currentUser?.phone || '',
    businessType: 'grocery' as BusinessType, region: '', district: '', description: '',
  });
  const [supplierForm, setSupplierForm] = useState({
    companyName: '', supplierType: 'distributor' as SupplierType, ownerName: currentUser?.name || '',
    phone: currentUser?.phone || '', email: currentUser?.email || '', region: '', district: '',
    address: '', description: '', categories: [] as string[], taxId: '',
  });

  if (businessProfile) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">Siz allaqachon biznes xaridor sifatida ro'yxatdan o'tgansiz.</p>
        <button onClick={() => setB2BRoute({ view: 'home' })} className="px-6 py-3 rounded-2xl bg-[#111827] text-white font-black text-sm">B2B bosh sahifaga</button>
      </div>
    );
  }
  if (supplierProfile) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">Sizning supplier arizangiz allaqachon yuborilgan.</p>
        <button onClick={() => setB2BRoute({ view: 'dashboard' })} className="px-6 py-3 rounded-2xl bg-[#111827] text-white font-black text-sm">Paneliga o'tish</button>
      </div>
    );
  }

  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!buyerForm.storeName.trim() || !buyerForm.phone.trim()) { setError("Do'kon nomi va telefonni to'ldiring"); return; }
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
    if (!supplierForm.companyName.trim() || !supplierForm.phone.trim()) { setError('Kompaniya nomi va telefonni to\'ldiring'); return; }
    setIsSubmitting(true);
    try {
      await registerSupplier(supplierForm);
      showToast("Ariza yuborildi — admin tasdiqlaguncha kuting");
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

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'home' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-black text-lg text-[#111827]">Biznes sifatida qo'shilish</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode('buyer')}
          className={`p-4 rounded-2xl border-2 text-left space-y-1.5 transition-colors ${mode === 'buyer' ? 'border-[#DB2777] bg-pink-50' : 'border-slate-200 bg-white'}`}
        >
          <Store className="w-5 h-5 text-[#111827]" />
          <span className="block font-black text-xs text-[#111827]">Biznes xaridor</span>
          <span className="block text-[10px] text-slate-500">Do'kon — ulgurji sotib olish</span>
        </button>
        <button
          onClick={() => setMode('supplier')}
          className={`p-4 rounded-2xl border-2 text-left space-y-1.5 transition-colors ${mode === 'supplier' ? 'border-[#DB2777] bg-pink-50' : 'border-slate-200 bg-white'}`}
        >
          <Factory className="w-5 h-5 text-[#111827]" />
          <span className="block font-black text-xs text-[#111827]">Supplier</span>
          <span className="block text-[10px] text-slate-500">Ishlab chiqaruvchi/Distributor — sotish</span>
        </button>
      </div>

      {mode === 'buyer' ? (
        <form onSubmit={handleBuyerSubmit} className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3 shadow-sm">
          <input value={buyerForm.storeName} onChange={(e) => setBuyerForm({ ...buyerForm, storeName: e.target.value })} placeholder="Do'kon nomi *" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <input value={buyerForm.ownerName} onChange={(e) => setBuyerForm({ ...buyerForm, ownerName: e.target.value })} placeholder="Egasi ismi" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <input value={buyerForm.phone} onChange={(e) => setBuyerForm({ ...buyerForm, phone: e.target.value })} placeholder="Telefon *" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <select value={buyerForm.businessType} onChange={(e) => setBuyerForm({ ...buyerForm, businessType: e.target.value as BusinessType })} className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium">
            {BUSINESS_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={buyerForm.region} onChange={(e) => setBuyerForm({ ...buyerForm, region: e.target.value })} className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium">
              <option value="">Viloyat</option>
              {REGIONS.filter((r) => r !== 'Barchasi').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={buyerForm.district} onChange={(e) => setBuyerForm({ ...buyerForm, district: e.target.value })} placeholder="Tuman" className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          </div>
          <textarea value={buyerForm.description} onChange={(e) => setBuyerForm({ ...buyerForm, description: e.target.value })} placeholder="Tavsif (ixtiyoriy)" rows={2} className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none resize-none" />
          {error && <div className="p-2.5 bg-pink-50 rounded-xl text-xs font-bold text-[#DB2777]">{error}</div>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Biznes profilni yaratish"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSupplierSubmit} className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-3 shadow-sm">
          <input value={supplierForm.companyName} onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })} placeholder="Kompaniya nomi *" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <select value={supplierForm.supplierType} onChange={(e) => setSupplierForm({ ...supplierForm, supplierType: e.target.value as SupplierType })} className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium">
            {SUPPLIER_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input value={supplierForm.ownerName} onChange={(e) => setSupplierForm({ ...supplierForm, ownerName: e.target.value })} placeholder="Direktor/egasi ismi" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} placeholder="Telefon *" className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
            <input value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} placeholder="Email" className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={supplierForm.region} onChange={(e) => setSupplierForm({ ...supplierForm, region: e.target.value })} className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium">
              <option value="">Viloyat</option>
              {REGIONS.filter((r) => r !== 'Barchasi').map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={supplierForm.district} onChange={(e) => setSupplierForm({ ...supplierForm, district: e.target.value })} placeholder="Tuman" className="bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          </div>
          <input value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} placeholder="Manzil" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <input value={supplierForm.taxId} onChange={(e) => setSupplierForm({ ...supplierForm, taxId: e.target.value })} placeholder="STIR (ixtiyoriy)" className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none" />
          <textarea value={supplierForm.description} onChange={(e) => setSupplierForm({ ...supplierForm, description: e.target.value })} placeholder="Tavsif" rows={2} className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none resize-none" />
          <div>
            <label className="text-[11px] font-extrabold text-slate-500 uppercase block mb-1.5">Mahsulot kategoriyalari</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleSupplierCategory(c.id)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${supplierForm.categories.includes(c.id) ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600'}`}
                >{c.name}</button>
              ))}
            </div>
          </div>
          {error && <div className="p-2.5 bg-pink-50 rounded-xl text-xs font-bold text-[#DB2777]">{error}</div>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Arizani yuborish"}
          </button>
        </form>
      )}
    </div>
  );
};
