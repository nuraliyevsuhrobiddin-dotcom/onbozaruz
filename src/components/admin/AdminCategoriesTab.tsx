import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminRepository, CategoryItem } from '../../api/adminRepository';
import { CATEGORIES } from '../../data/mockAgroData';
import { useAgroStore } from '../../store/useAgroStore';


interface AdminCategoriesTabProps {
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

const DEFAULT_CATS: CategoryItem[] = CATEGORIES.map((c, i) => ({
  id: c.id,
  name: c.name,
  icon: c.icon || '',
  orderIndex: i,
  isActive: true,
}));

export const AdminCategoriesTab: React.FC<AdminCategoriesTabProps> = ({ onLogAction, showToast }) => {
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Partial<CategoryItem> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cats = await adminRepository.getCategories();
      setCategories(cats.length > 0 ? cats : DEFAULT_CATS);
    } catch (e: any) {
      setCategories(DEFAULT_CATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const syncStoreCategories = (items: CategoryItem[]) => {
    const activeCats = items
      .filter((c) => c.isActive)
      .map((c) => ({ id: c.id, name: c.name, icon: c.icon || 'tag', image: '', count: '0' }));
    useAgroStore.setState((prev) => ({
      categories: [
        { id: 'all', name: 'Barchasi', icon: 'grid', image: '', count: '0' },
        ...activeCats.filter((c) => c.id !== 'all'),
      ],
    }));
  };

  const handleSave = async () => {
    if (!editModal?.name?.trim()) { showToast('Kategoriya nomini kiriting'); return; }
    setIsSaving(true);
    try {
      const saved = await adminRepository.saveCategory(editModal);
      await onLogAction(editModal.id ? 'update_category' : 'create_category', saved.id, editModal, saved);
      setCategories((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        const next = idx >= 0 ? prev.map((c, i) => i === idx ? saved : c) : [...prev, saved];
        syncStoreCategories(next);
        return next;
      });
      showToast(editModal.id ? 'Kategoriya yangilandi!' : "Yangi kategoriya qo'shildi!");
      setEditModal(null);
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!window.confirm(`"${cat.name}" kategoriyasini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await adminRepository.deleteCategory(cat.id);
      await onLogAction('delete_category', cat.id, cat, null);
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== cat.id);
        syncStoreCategories(next);
        return next;
      });
      showToast("Kategoriya o'chirildi");
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    }
  };

  const toggleActive = async (cat: CategoryItem) => {
    try {
      const updated = { ...cat, isActive: !cat.isActive };
      await adminRepository.saveCategory(updated);
      setCategories((prev) => {
        const next = prev.map((c) => c.id === cat.id ? updated : c);
        syncStoreCategories(next);
        return next;
      });
      showToast(updated.isActive ? 'Faollashtirildi' : "O'chirildi");
    } catch (e: any) {
      showToast(e.message || 'Xatolik');
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Kategoriyalar</h2>
          <p className="text-xs text-slate-400 font-medium">{categories.length} ta kategoriya</p>
        </div>
        <button
          onClick={() => setEditModal({ name: '', icon: '', orderIndex: categories.length, isActive: true })}
          className="px-3.5 py-2 rounded-[16px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4" /> Qo'shish
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-[16px] border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-[22px] border border-slate-200/80 overflow-hidden shadow-sm">
        {loading ? (
          <div className="space-y-0 divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-[12px] bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 h-3 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-[12px] bg-slate-100 flex items-center justify-center text-lg shrink-0">
                  {cat.icon || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#111827]">{cat.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${cat.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {cat.isActive ? 'Faol' : "Faol emas"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">ID: {cat.id} · Tartib: {cat.orderIndex}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(cat)}
                    className={`px-2.5 py-1.5 rounded-[10px] text-[10px] font-black transition-colors ${cat.isActive ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'}`}
                  >
                    {cat.isActive ? "O'chir" : 'Faollashtir'}
                  </button>
                  <button
                    onClick={() => setEditModal(cat)}
                    className="p-1.5 rounded-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {editModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[26px] w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="font-black text-base text-[#111827]">
              {editModal.id ? 'Kategoriyani tahrirlash' : "Yangi kategoriya qo'shish"}
            </h3>
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">Kategoriya nomi *</span>
                <input
                  value={editModal.name || ''}
                  onChange={(e) => setEditModal((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Meva-Sabzavot"
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold outline-none focus:border-[#E53935]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">ID (noyob kalit) *</span>
                <input
                  value={editModal.id || ''}
                  onChange={(e) => setEditModal((p) => ({ ...p, id: e.target.value }))}
                  placeholder="fruits"
                  disabled={!!editModal.createdAt}
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold outline-none focus:border-[#E53935] disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">Icon (emoji)</span>
                <input
                  value={editModal.icon || ''}
                  onChange={(e) => setEditModal((p) => ({ ...p, icon: e.target.value }))}
                  placeholder="🍎"
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold outline-none focus:border-[#E53935]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500">Tartib raqami</span>
                <input
                  type="number"
                  value={editModal.orderIndex ?? 0}
                  onChange={(e) => setEditModal((p) => ({ ...p, orderIndex: Number(e.target.value) }))}
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-bold outline-none focus:border-[#E53935]"
                />
              </label>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-3 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Bekor
              </button>
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 py-3 rounded-[16px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
