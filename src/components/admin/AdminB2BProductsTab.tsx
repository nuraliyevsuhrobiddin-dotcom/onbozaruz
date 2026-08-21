import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { B2BProduct } from '../../api/types';

interface AdminB2BProductsTabProps {
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-500', pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700', rejected: 'bg-rose-50 text-rose-700', inactive: 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL: Record<string, string> = { draft: 'Qoralama', pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan', inactive: 'Nofaol' };

export const AdminB2BProductsTab: React.FC<AdminB2BProductsTabProps> = ({ onLogAction, showToast }) => {
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setProducts(await b2bAdminRepository.listAllB2BProducts());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.supplierName || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleApprove = async (p: B2BProduct) => {
    try {
      await b2bAdminRepository.updateB2BProductModeration(p.id, 'approved');
      await onLogAction('approve_b2b_product', p.id, { status: p.status }, { status: 'approved' });
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, status: 'approved' } : x));
      showToast('Mahsulot tasdiqlandi');
    } catch (e: any) { showToast(e.message || 'Xatolik'); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { showToast('Sababni kiriting'); return; }
    try {
      await b2bAdminRepository.updateB2BProductModeration(id, 'rejected', rejectReason.trim());
      await onLogAction('reject_b2b_product', id, {}, { status: 'rejected', reason: rejectReason });
      setProducts((prev) => prev.map((x) => x.id === id ? { ...x, status: 'rejected', rejectionReason: rejectReason } : x));
      showToast('Mahsulot rad etildi');
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) { showToast(e.message || 'Xatolik'); }
  };

  return (
    <div className="space-y-4 select-none">
      <div>
        <h2 className="font-black text-xl text-[#111827]">B2B Mahsulotlar</h2>
        <p className="text-xs text-slate-400 font-medium">{products.length} ta mahsulot</p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nomi yoki supplier..." className="w-full bg-slate-100 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none" />
      </div>

      <div className="flex gap-1.5">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ${filterStatus === s ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s === 'all' ? 'Barchasi' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-[18px] bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-xs font-bold text-slate-400">Hozircha mahsulotlar yo'q</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-[18px] border border-slate-200/80 p-3 space-y-2">
              <div className="flex items-center gap-3">
                <img src={p.images[0]} alt={p.name} className="w-12 h-12 rounded-[10px] object-cover bg-slate-100 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#111827] truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{p.supplierName} · {p.wholesalePrice.toLocaleString('uz-UZ')} so'm</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-black shrink-0 ${STATUS_TONE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
              </div>
              {p.status === 'pending' && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleApprove(p)} className="p-2 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => setRejectingId(p.id)} className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700"><XCircle className="w-4 h-4" /></button>
                </div>
              )}
              {rejectingId === p.id && (
                <div className="flex items-center gap-2">
                  <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rad etish sababi" className="flex-1 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-medium" />
                  <button onClick={() => handleReject(p.id)} className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold">Tasdiqlash</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
