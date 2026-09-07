import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Store, Search, Edit3, Trash2, MapPin, Phone, User,
  AlertTriangle, X, Loader2, Navigation, RefreshCw
} from 'lucide-react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { BusinessProfile, BusinessType } from '../../api/types';
import { B2B_BUSINESS_TYPES, formatPhone } from '../../utils/b2bUtils';
import { REGIONS } from '../../data/mockAgroData';

interface Props {
  onLogAction?: (action: string, targetId: string, oldVal: any, newVal: any) => Promise<void>;
  showToast: (msg: string) => void;
}

export const AdminB2BStoresTab: React.FC<Props> = ({ onLogAction, showToast }) => {
  const [stores, setStores] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Edit / Details Modal
  const [editingStore, setEditingStore] = useState<BusinessProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BusinessProfile | null>(null);

  const loadStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await b2bAdminRepository.listAllBusinessStores();
      setStores(data);
    } catch {
      showToast('❌ Do‘konlar ro‘yxatini yuklashda xatolik');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchSearch =
        !search ||
        s.storeName.toLowerCase().includes(search.toLowerCase()) ||
        s.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        s.phone.includes(search) ||
        s.address.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || s.businessType === typeFilter;
      const matchRegion = regionFilter === 'all' || s.region === regionFilter;
      return matchSearch && matchType && matchRegion;
    });
  }, [stores, search, typeFilter, regionFilter]);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    setIsSaving(true);
    try {
      await b2bAdminRepository.updateBusinessStoreByAdmin(editingStore.id, {
        storeName: editingStore.storeName,
        ownerName: editingStore.ownerName,
        phone: editingStore.phone,
        businessType: editingStore.businessType,
        region: editingStore.region,
        district: editingStore.district,
        address: editingStore.address,
        latitude: editingStore.latitude,
        longitude: editingStore.longitude,
        description: editingStore.description,
        status: editingStore.status,
      });

      await onLogAction?.('admin_update_store', editingStore.id, null, editingStore);
      showToast('✅ Do‘kon ma‘lumotlari muvaffaqiyatli saqlandi');
      setStores((prev) => prev.map((s) => (s.id === editingStore.id ? editingStore : s)));
      setEditingStore(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Saqlashda xatolik');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await b2bAdminRepository.deleteBusinessStoreByAdmin(deleteTarget.id);
      await onLogAction?.('admin_delete_store', deleteTarget.id, deleteTarget, null);
      showToast('🗑️ Do‘kon o‘chirildi');
      setStores((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'O‘chirishda xatolik');
    }
  };

  const getTypeLabel = (type: string) => {
    const found = B2B_BUSINESS_TYPES.find((t) => t.id === type);
    return found ? `${found.icon} ${found.label}` : type;
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h2 className="font-black text-base text-slate-900 flex items-center gap-2">
            <Store className="w-5 h-5 text-[#D84315]" />
            B2B Do‘konlar va Xarita Obyektlari ({stores.length})
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Xaritadagi barcha do‘kon, supermarket, kafe va xaridorlarni boshqarish, tahrirlash va o‘chirish
          </p>
        </div>

        <button
          onClick={loadStores}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Do‘kon, egasi, manzil yoki telefon..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#D84315]/20 focus:border-[#D84315]"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#D84315]/20 focus:border-[#D84315]"
        >
          <option value="all">Barcha Turlar (Supermarket, Kafe, Dorixona...)</option>
          {B2B_BUSINESS_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#D84315]/20 focus:border-[#D84315]"
        >
          <option value="all">Barcha Viloyatlar</option>
          {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Stores List / Table */}
      {isLoading ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-[#D84315] animate-spin" />
          <span className="text-xs text-slate-500 font-semibold">Do‘konlar yuklanmoqda...</span>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Hech qanday do‘kon topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md mb-1">
                      {getTypeLabel(store.businessType)}
                    </span>
                    <h3 className="font-black text-sm text-slate-900 leading-snug">{store.storeName}</h3>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    store.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {store.status === 'active' ? 'Faol' : 'Nofaol'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.ownerName || 'Noma‘lum'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{store.phone ? formatPhone(store.phone) : 'Telefon yo‘q'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#D84315] shrink-0" />
                    <span className="truncate">{store.region}, {store.district} — {store.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Navigation className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{store.latitude?.toFixed(4)}, {store.longitude?.toFixed(4)}</span>
                  </div>
                </div>

                {store.description && (
                  <p className="text-[11px] text-slate-500 italic line-clamp-2 bg-slate-50 p-2 rounded-xl">
                    "{store.description}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setEditingStore({ ...store })}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tahrirlash</span>
                </button>
                <button
                  onClick={() => setDeleteTarget(store)}
                  className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>O‘chirish</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingStore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-base text-slate-900">Do‘kon / Kafe Tahrirlash</h3>
                <p className="text-xs text-slate-500 font-medium">Xaritadagi joylashuv va ma'lumotlar</p>
              </div>
              <button
                onClick={() => setEditingStore(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStore} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Do‘kon / Obyekt Nomi
                </label>
                <input
                  required
                  value={editingStore.storeName}
                  onChange={(e) => setEditingStore({ ...editingStore, storeName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20 focus:border-[#D84315]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Biznes Turi
                  </label>
                  <select
                    value={editingStore.businessType}
                    onChange={(e) => setEditingStore({ ...editingStore, businessType: e.target.value as BusinessType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20"
                  >
                    {B2B_BUSINESS_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Holati (Status)
                  </label>
                  <select
                    value={editingStore.status}
                    onChange={(e) => setEditingStore({ ...editingStore, status: e.target.value as 'active' | 'suspended' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20"
                  >
                    <option value="active">Faol (Xaritada ko‘rinadi)</option>
                    <option value="suspended">To‘xtatilgan / Yashiringan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Egasi (Ism-familiya)
                  </label>
                  <input
                    value={editingStore.ownerName}
                    onChange={(e) => setEditingStore({ ...editingStore, ownerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20 focus:border-[#D84315]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Telefon Raqami
                  </label>
                  <input
                    value={editingStore.phone}
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20 focus:border-[#D84315]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Viloyat
                  </label>
                  <select
                    value={editingStore.region}
                    onChange={(e) => setEditingStore({ ...editingStore, region: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20"
                  >
                    {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Tuman / Shahar
                  </label>
                  <input
                    value={editingStore.district}
                    onChange={(e) => setEditingStore({ ...editingStore, district: e.target.value })}
                    placeholder="Chilonzor, Yunusobod..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Aniq Manzil
                </label>
                <input
                  value={editingStore.address}
                  onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                  placeholder="Ko‘cha, uy raqami, mo‘ljal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                <div>
                  <label className="text-[9px] font-black text-amber-800 uppercase tracking-wider block mb-1">
                    Kenglik (Latitude)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingStore.latitude || ''}
                    onChange={(e) => setEditingStore({ ...editingStore, latitude: parseFloat(e.target.value) || 0 })}
                    placeholder="41.2995"
                    className="w-full bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-amber-800 uppercase tracking-wider block mb-1">
                    Uzunlik (Longitude)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editingStore.longitude || ''}
                    onChange={(e) => setEditingStore({ ...editingStore, longitude: parseFloat(e.target.value) || 0 })}
                    placeholder="69.2401"
                    className="w-full bg-white border border-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Qo‘shimcha Ma'lumot / Tavsif
                </label>
                <textarea
                  rows={2}
                  value={editingStore.description}
                  onChange={(e) => setEditingStore({ ...editingStore, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-[#D84315]/20 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-slate-900">Do‘konni o‘chirasizmi?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                <strong className="text-slate-900">{deleteTarget.storeName}</strong> do‘koni xaritadan va platformadan butunlay o‘chiriladi.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Yo‘q, qolsin
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-colors"
              >
                Ha, o‘chirilsin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
