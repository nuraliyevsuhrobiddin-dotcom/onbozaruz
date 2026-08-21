import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Ban, Edit3, X } from 'lucide-react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { SupplierProfile } from '../../api/types';

interface AdminB2BSuppliersTabProps {
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
  suspended: 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL: Record<string, string> = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan', suspended: "To'xtatilgan" };

export const AdminB2BSuppliersTab: React.FC<AdminB2BSuppliersTabProps> = ({ onLogAction, showToast }) => {
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setSuppliers(await b2bAdminRepository.listAllSuppliers());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = suppliers.filter((s) => filterStatus === 'all' || s.verificationStatus === filterStatus);

  const handleApprove = async (s: SupplierProfile) => {
    if (!window.confirm(`"${s.companyName}"ni tasdiqlaysizmi?`)) return;
    try {
      await b2bAdminRepository.updateSupplierVerification(s.id, 'approved');
      await onLogAction('approve_supplier', s.id, { status: s.verificationStatus }, { status: 'approved' });
      setSuppliers((prev) => prev.map((x) => x.id === s.id ? { ...x, verificationStatus: 'approved', rejectionReason: '' } : x));
      showToast('Supplier tasdiqlandi');
    } catch (e: any) { showToast(e.message || 'Xatolik'); }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) { showToast('Sababni kiriting'); return; }
    try {
      await b2bAdminRepository.updateSupplierVerification(id, 'rejected', rejectReason.trim());
      await onLogAction('reject_supplier', id, {}, { status: 'rejected', reason: rejectReason });
      setSuppliers((prev) => prev.map((x) => x.id === id ? { ...x, verificationStatus: 'rejected', rejectionReason: rejectReason } : x));
      showToast('Supplier rad etildi');
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) { showToast(e.message || 'Xatolik'); }
  };

  const handleSuspend = async (s: SupplierProfile) => {
    if (!window.confirm(`"${s.companyName}"ni vaqtincha to'xtatasizmi?`)) return;
    try {
      await b2bAdminRepository.updateSupplierVerification(s.id, 'suspended', "Admin tomonidan to'xtatildi");
      await onLogAction('suspend_supplier', s.id, { status: s.verificationStatus }, { status: 'suspended' });
      setSuppliers((prev) => prev.map((x) => x.id === s.id ? { ...x, verificationStatus: 'suspended' } : x));
      showToast("Supplier to'xtatildi");
    } catch (e: any) { showToast(e.message || 'Xatolik'); }
  };

  const handleSaveRate = async (id: string) => {
    const rate = Number(rateInput);
    if (!rate || rate < 0 || rate > 100) { showToast("Noto'g'ri stavka"); return; }
    try {
      await b2bAdminRepository.updateSupplierCommissionRate(id, rate);
      await onLogAction('update_commission_rate', id, {}, { rate });
      setSuppliers((prev) => prev.map((x) => x.id === id ? { ...x, commissionRate: rate } : x));
      setEditingRateId(null);
      showToast('Komissiya stavkasi yangilandi');
    } catch (e: any) { showToast(e.message || 'Xatolik'); }
  };

  return (
    <div className="space-y-4 select-none">
      <div>
        <h2 className="font-black text-xl text-[#111827]">B2B Supplierlar</h2>
        <p className="text-xs text-slate-400 font-medium">{suppliers.length} ta ariza</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(['all', 'pending', 'approved', 'rejected', 'suspended'] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 ${filterStatus === s ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s === 'all' ? 'Barchasi' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-[18px] bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-xs font-bold text-slate-400">Hozircha arizalar yo'q</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-[20px] border border-slate-200/80 p-3.5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-[#111827]">{s.companyName}</span>
                  <p className="text-[11px] text-slate-400 font-medium">{s.supplierType} · {s.phone} · {s.region}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${STATUS_TONE[s.verificationStatus]}`}>{STATUS_LABEL[s.verificationStatus]}</span>
              </div>
              {s.rejectionReason && s.verificationStatus === 'rejected' && <p className="text-[11px] text-rose-500 font-medium">Sabab: {s.rejectionReason}</p>}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                Komissiya:
                {editingRateId === s.id ? (
                  <>
                    <input value={rateInput} onChange={(e) => setRateInput(e.target.value)} className="w-14 bg-slate-100 rounded-lg px-2 py-1 text-xs font-bold" />
                    <button onClick={() => handleSaveRate(s.id)} className="text-emerald-600 font-black">✓</button>
                    <button onClick={() => setEditingRateId(null)} className="text-slate-400 font-black">✕</button>
                  </>
                ) : (
                  <>
                    <span className="text-[#111827] font-black">{s.commissionRate}%</span>
                    <button onClick={() => { setEditingRateId(s.id); setRateInput(String(s.commissionRate)); }}><Edit3 className="w-3 h-3 text-slate-400" /></button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {s.verificationStatus === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(s)} className="p-2 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => setRejectingId(s.id)} className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-700"><XCircle className="w-4 h-4" /></button>
                  </>
                )}
                {s.verificationStatus === 'approved' && (
                  <button onClick={() => handleSuspend(s)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"><Ban className="w-4 h-4" /></button>
                )}
              </div>
              {rejectingId === s.id && (
                <div className="flex items-center gap-2 pt-1">
                  <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rad etish sababi" className="flex-1 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-medium" />
                  <button onClick={() => handleReject(s.id)} className="p-1.5 rounded-lg bg-rose-600 text-white"><CheckCircle className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setRejectingId(null)} className="p-1.5 rounded-lg bg-slate-200 text-slate-600"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
