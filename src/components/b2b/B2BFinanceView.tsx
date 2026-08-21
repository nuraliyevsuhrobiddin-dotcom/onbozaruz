import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, CreditCard, Building2, Phone, Copy, Check, Info, X, ShieldCheck } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

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
        <p className="text-sm font-bold text-slate-600">Moliya bo'limi faqat supplierlar uchun.</p>
      </div>
    );
  }

  const s = supplierFinanceSummary;

  return (
    <div className="w-full max-w-lg mx-auto py-3 px-3 space-y-4 select-none pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setB2BRoute({ view: 'dashboard' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-black text-lg text-[#111827]">Moliya va Komissiya</h1>
        </div>

        {s && s.totalCommission > 0 && (
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>To'lash</span>
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        {([['today', 'Bugun'], ['7d', '7 kun'], ['30d', '30 kun'], ['all', 'Barchasi']] as [RangeKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${range === key ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600'}`}
          >{label}</button>
        ))}
      </div>

      {isLoading || !s ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Jami savdo</span>
              <span className="block font-black text-base text-[#111827]">{formatMoney(s.grossSales)}</span>
            </div>

            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1 relative">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Onbozar komissiyasi</span>
              <span className="block font-black text-base text-rose-600">{formatMoney(s.totalCommission)}</span>
              {s.totalCommission > 0 && (
                <button
                  onClick={() => setIsPayModalOpen(true)}
                  className="mt-1.5 text-[10px] font-black text-[#DB2777] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CreditCard className="w-3 h-3" /> Rekvizitlar orqali to'lash ➔
                </button>
              )}
            </div>

            <div className="bg-white rounded-[18px] border border-slate-200/80 p-3.5 space-y-1 col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sof summa (Sizning ulushingiz)</span>
              <span className="block font-black text-lg text-emerald-600">{formatMoney(s.netAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.completedOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Yakunlangan</span>
            </div>
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.pendingOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Jarayonda</span>
            </div>
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.cashOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Naqd to'lovlar</span>
            </div>
            <div className="bg-slate-50 rounded-[16px] p-3 text-center">
              <span className="block font-black text-sm text-[#111827]">{s.onlineOrders}</span>
              <span className="text-[10px] text-slate-400 font-bold">Onlayn to'lovlar</span>
            </div>
          </div>
        </>
      )}

      {/* Pay Commission Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-[#DB2777] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-[#111827]">Komissiyani to'lash</h3>
                  <p className="text-[10px] text-slate-400 font-bold">Platforma hisobiga to'g'ridan-to'g'ri o'tkazma</p>
                </div>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Commission Due Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-[#1e1435] rounded-2xl p-4 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To'lanadigan komissiya</span>
                  <span className="text-xl font-black text-rose-400">{formatMoney(s?.totalCommission || 0)}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-emerald-300 text-[10px] font-black border border-white/10">
                  {supplierProfile.commissionRate || 5}% stavka
                </span>
              </div>

              {/* Visual Card Requisite */}
              <div className="bg-gradient-to-br from-[#111827] to-[#DB2777] rounded-2xl p-4 text-white space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Admin Plastik Kartasi</span>
                  <span className="text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-full">UzCard / Humo</span>
                </div>

                <div className="flex items-center justify-between bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                  <span className="font-mono text-base sm:text-lg font-black tracking-wider text-white">
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

                <div className="flex items-center justify-between text-[11px] text-slate-200">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-semibold">Karta egasi:</span>
                    <span className="font-bold uppercase">{platformRequisites.adminCardHolder}</span>
                  </div>
                  {platformRequisites.adminPaymentPhone && (
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-semibold">Bog'lanish:</span>
                      <span className="font-bold">{platformRequisites.adminPaymentPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Requisites Accordion/Box */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-[#111827]">
                    <Building2 className="w-3.5 h-3.5 text-[#DB2777]" />
                    <span>Bank hisob raqami (MCHJ / YaTT uchun)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(platformRequisites.adminBankAccount, 'bank')}
                    className="text-[10px] font-bold text-[#DB2777] hover:underline flex items-center gap-1"
                  >
                    {copiedField === 'bank' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Nusxalash</span>
                  </button>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Bank:</span>
                    <span className="font-bold text-slate-800">{platformRequisites.adminBankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Hisob raqam:</span>
                    <span className="font-mono font-bold text-slate-800">{platformRequisites.adminBankAccount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">MFO:</span>
                    <span className="font-mono font-bold text-slate-800">{platformRequisites.adminBankMfo}</span>
                  </div>
                </div>
              </div>

              {/* Instructions Box */}
              {platformRequisites.adminPaymentInstructions && (
                <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">{platformRequisites.adminPaymentInstructions}</p>
                </div>
              )}

              {/* Payment Proof / Confirmation Form */}
              <form onSubmit={handleSendPaymentProof} className="space-y-2.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block">
                  To'lov cheki yoki tranzaksiya raqami (Tasdiqlash uchun):
                </label>
                <input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Masalan: Click/Payme chek raqami #12345678"
                  className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                />
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="w-full py-3 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> To'lov qilinganini tasdiqlash</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
