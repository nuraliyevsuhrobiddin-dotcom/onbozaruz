import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
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
        <p className="text-sm font-bold text-slate-400">Shartnoma faqat supplier akkauntlar uchun mavjud.</p>
        <button
          onClick={() => setB2BRoute({ view: 'business' })}
          className="px-6 py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-all"
        >
          Supplier sifatida qo'shilish
        </button>
      </div>
    );
  }
  if (!isChecked) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Yuklanmoqda...</span>
      </div>
    );
  }
  if (!b2bContract) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-sm font-bold text-slate-400">
          Shartnoma hali topilmadi. Birozdan so'ng qayta urinib ko'ring yoki qo'llab-quvvatlash xizmatiga murojaat qiling.
        </p>
        <button
          onClick={() => { setIsChecked(false); void fetchOwnB2BContract().finally(() => setIsChecked(true)); }}
          className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black text-sm transition-all"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  const clauses = getB2BContractClauses(b2bContract.commissionRate);

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'dashboard' })}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-black text-base text-slate-900">Elektron hamkorlik shartnomasi</h1>
            <p className="text-[10px] text-slate-500 font-medium">OnBozar B2B platformasi shartnomasi</p>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl p-4 text-xs font-bold flex items-center gap-2.5 border ${
        b2bContract.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
        b2bContract.status === 'rejected' ? 'bg-red-50 border-red-200 text-red-600' :
        'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        {b2bContract.status === 'accepted' && (
          <>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Shartnoma muvaffaqiyatli qabul qilingan</span>
          </>
        )}
        {b2bContract.status === 'rejected' && (
          <>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Shartnoma rad etilgan</span>
          </>
        )}
        {b2bContract.status === 'pending' && (
          <>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Shartnomani ko'rib chiqing va tasdiqlang</span>
          </>
        )}
      </div>

      {/* Clauses */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-sm">
        {clauses.map((clause, idx) => (
          <div key={clause.title} className="space-y-1.5 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
            <h3 className="font-black text-xs text-blue-600 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center">{idx + 1}</span>
              {clause.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed pl-5.5">{clause.body}</p>
          </div>
        ))}
      </div>

      {/* Actions for pending */}
      {b2bContract.status === 'pending' && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => void respondToB2BContract(false)}
            className="py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-black text-xs transition-colors border border-slate-200"
          >
            Rad etish
          </button>
          <button
            onClick={() => void respondToB2BContract(true)}
            className="py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-colors shadow-lg shadow-blue-500/25 border border-blue-400/30"
          >
            Roziman va qabul qilaman
          </button>
        </div>
      )}
    </div>
  );
};
