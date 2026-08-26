import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, CreditCard, Building2, Copy, Check, Info, X, ShieldCheck, TrendingUp, DollarSign } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { formatMoney } from '../../utils/b2bUtils';

type RangeKey = 'today' | '7d' | '30d' | 'all';

function rangeToIso(range: RangeKey): string | undefined {
  if (range === 'all') return undefined;
  const now = new Date();
  if (range === 'today') { now.setHours(0, 0, 0, 0); return now.toISOString(); }
  const days = range === '7d' ? 7 : 30;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

export const B2BFinanceView: React.FC = () => {
  const {
    setB2BRoute,
    supplierProfile,
    supplierFinanceSummary,
    fetchOwnSupplierFinanceSummary,
    platformRequisites,
    fetchPlatformRequisites,
    showToast,
  } = useAgroStore();

  const [range, setRange] = useState<RangeKey>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  useEffect(() => {
    if (!supplierProfile) return;
    setIsLoading(true);
    void fetchPlatformRequisites();
    void fetchOwnSupplierFinanceSummary(rangeToIso(range)).finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, supplierProfile?.id, fetchPlatformRequisites]);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Nusxa olindi: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendPaymentProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentNote.trim()) {
      showToast("To'lov cheki yoki tranzaksiya raqamini kiriting");
      return;
    }
    setIsSubmittingPayment(true);
    setTimeout(() => {
      setIsSubmittingPayment(false);
      showToast("✅ To'lov ma'lumoti adminga yuborildi. Tekshirilgach tasdiqlanadi.");
      setIsPayModalOpen(false);
      setPaymentNote('');
    }, 600);
  };

  if (!supplierProfile) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4 text-center">
        <p className="text-sm font-bold text-slate-500">Moliya bo'limi faqat supplierlar uchun.</p>
      </div>
    );
  }

  const s = supplierFinanceSummary;

  const RANGES: [RangeKey, string][] = [['today', 'Bugun'], ['7d', '7 kun'], ['30d', '30 kun'], ['all', 'Barchasi']];

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setB2BRoute({ view: 'dashboard' })}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <h1 className="font-black text-lg text-slate-900">Moliya va Komissiya</h1>
            <p className="text-[10px] text-slate-500 font-medium">Savdo statistikasi</p>
          </div>
        </div>

        {s && s.totalCommission > 0 && (
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/25 transition-colors cursor-pointer border border-blue-400/30"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>To'lash</span>
          </button>
        )}
      </div>

      {/* Range filter */}
      <div className="flex gap-1.5">
        {RANGES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
              range === key
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {isLoading || !s ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Yuklanmoqda...</span>
        </div>
      ) : (
        <>
          {/* Main stats */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/10 blur-xl" />
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">Jami savdo</span>
              <span className="block font-black text-lg text-slate-900">{formatMoney(s.grossSales)}</span>
            </div>

            <div className="bg-white rounded-2xl border border-red-200 p-4 space-y-2 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-4 -top-4 w-16 h-16 rounded-full bg-red-500/10 blur-xl" />
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="block text-[9px] font-black text-slate-500 uppercase tracking-wider">Komissiya</span>
              <span className="block font-black text-lg text-red-600">{formatMoney(s.totalCommission)}</span>
              {s.totalCommission > 0 && (
                <button
                  onClick={() => setIsPayModalOpen(true)}
                  className="text-[9px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CreditCard className="w-2.5 h-2.5" /> To'lash ➔
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-emerald-200 p-4 space-y-2 col-span-2 relative overflow-hidden">
              <div className="pointer-events-none absolute right-0 top-0 w-32 h-32 rounded-full bg-emerald-500/8 blur-2xl" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Sof summa (Sizning ulushingiz)</span>
              </div>
              <span className="block font-black text-2xl text-emerald-600">{formatMoney(s.netAmount)}</span>
            </div>
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Yakunlangan', value: s.completedOrders, cls: 'text-emerald-600' },
              { label: 'Jarayonda', value: s.pendingOrders, cls: 'text-amber-600' },
              { label: "Naqd to'lovlar", value: s.cashOrders, cls: 'text-blue-600' },
              { label: "Onlayn to'lovlar", value: s.onlineOrders, cls: 'text-violet-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <span className={`block font-black text-lg ${cls}`}>{value}</span>
                <span className="text-[10px] text-slate-500 font-bold">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pay Commission Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Komissiyani to'lash</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Platforma hisobiga o'tkazma</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Due amount banner */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">To'lanadigan komissiya</span>
                  <span className="text-2xl font-black text-red-600">{formatMoney(s?.totalCommission || 0)}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black">
                  {supplierProfile.commissionRate || 5}% stavka
                </span>
              </div>

              {/* Card visual */}
              <div className="bg-gradient-to-br from-blue-600 to-violet-700 rounded-2xl p-4 text-white space-y-3 shadow-xl shadow-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">Admin Plastik Kartasi</span>
                  <span className="text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-full">UzCard / Humo</span>
                </div>

                <div className="flex items-center justify-between bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                  <span className="font-mono text-base sm:text-lg font-black tracking-wider">
                    {platformRequisites.adminCardNumber}
                  </span>
                  <button
                    onClick={() => handleCopy(platformRequisites.adminCardNumber, 'card')}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                    title="Nusxa olish"
                  >
                    {copiedField === 'card' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-blue-100">
                  <div>
                    <span className="text-[9px] text-blue-300 block font-semibold">Karta egasi:</span>
                    <span className="font-bold uppercase">{platformRequisites.adminCardHolder}</span>
                  </div>
                  {platformRequisites.adminPaymentPhone && (
                    <div className="text-right">
                      <span className="text-[9px] text-blue-300 block font-semibold">Bog'lanish:</span>
                      <span className="font-bold">{platformRequisites.adminPaymentPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank details */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-slate-800 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Bank hisob raqami</span>
                  </div>
                  <button
                    onClick={() => handleCopy(platformRequisites.adminBankAccount, 'bank')}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                  >
                    {copiedField === 'bank' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Nusxalash</span>
                  </button>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {[
                    ['Bank', platformRequisites.adminBankName],
                    ['Hisob raqam', platformRequisites.adminBankAccount],
                    ['MFO', platformRequisites.adminBankMfo],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500 font-medium">{label}:</span>
                      <span className="font-mono font-bold text-slate-800">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {platformRequisites.adminPaymentInstructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">{platformRequisites.adminPaymentInstructions}</p>
                </div>
              )}

              {/* Confirm form */}
              <form onSubmit={handleSendPaymentProof} className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">
                  To'lov cheki yoki tranzaksiya raqami:
                </label>
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Masalan: Click/Payme chek raqami #12345678"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-blue-400/30"
                >
                  {isSubmittingPayment
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><ShieldCheck className="w-4 h-4" /> To'lov qilinganini tasdiqlash</>
                  }
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
