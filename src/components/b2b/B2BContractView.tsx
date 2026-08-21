import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { getB2BContractClauses } from '../../data/b2bContractTemplate';

export const B2BContractView: React.FC = () => {
  const { setB2BRoute, supplierProfile, b2bContract, fetchOwnB2BContract, respondToB2BContract } = useAgroStore();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    if (supplierProfile) void fetchOwnB2BContract().finally(() => setIsChecked(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierProfile?.id]);

  if (!supplierProfile) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">Shartnoma faqat supplier akkauntlar uchun mavjud.</p>
        <button onClick={() => setB2BRoute({ view: 'business' })} className="px-6 py-3 rounded-2xl bg-[#DB2777] text-white font-black text-sm">Supplier sifatida qo'shilish</button>
      </div>
    );
  }
  if (!isChecked) {
    return <div className="w-full max-w-170 mx-auto py-16 flex justify-center"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>;
  }
  if (!b2bContract) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-600">Shartnoma hali topilmadi. Birozdan so'ng qayta urinib ko'ring yoki qo'llab-quvvatlash xizmatiga murojaat qiling.</p>
        <button onClick={() => { setIsChecked(false); void fetchOwnB2BContract().finally(() => setIsChecked(true)); }} className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition-colors">Qayta urinish</button>
      </div>
    );
  }

  const clauses = getB2BContractClauses(b2bContract.commissionRate);

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => setB2BRoute({ view: 'dashboard' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#DB2777]" />
          <h1 className="font-black text-lg text-[#111827]">Elektron hamkorlik shartnomasi</h1>
        </div>
      </div>

      <div className={`rounded-2xl p-3.5 text-xs font-bold ${
        b2bContract.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
        b2bContract.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
      }`}>
        {b2bContract.status === 'accepted' && "✅ Shartnoma qabul qilingan"}
        {b2bContract.status === 'rejected' && "❌ Shartnoma rad etilgan"}
        {b2bContract.status === 'pending' && "⏳ Shartnomani ko'rib chiqing va qabul qiling"}
      </div>

      <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 space-y-4 shadow-sm">
        {clauses.map((clause) => (
          <div key={clause.title} className="space-y-1">
            <h3 className="font-black text-xs text-[#111827]">{clause.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{clause.body}</p>
          </div>
        ))}
      </div>

      {b2bContract.status === 'pending' && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => void respondToB2BContract(false)}
            className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition-colors"
          >Rad etish</button>
          <button
            onClick={() => void respondToB2BContract(true)}
            className="py-3 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-sm transition-colors"
          >Roziman</button>
        </div>
      )}
    </div>
  );
};
