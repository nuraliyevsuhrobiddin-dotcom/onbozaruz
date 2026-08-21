import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Banknote,
  Send,
  Loader2,
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BCashbackTransaction } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

interface Props {
  onClose: () => void;
}

export const B2BCashbackWalletModal: React.FC<Props> = ({ onClose }) => {
  const {
    businessProfile,
    b2bCashbackBalance,
    b2bCashbackRate,
    fetchB2BCashbackBalance,
    showToast,
  } = useAgroStore();

  const [tab, setTab] = useState<'history' | 'withdraw' | 'rules'>('history');
  const [transactions, setTransactions] = useState<B2BCashbackTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    if (businessProfile) {
      void fetchB2BCashbackBalance();
      b2bRepository.listCashbackTransactions(businessProfile.id).then((data) => {
        if (isMounted) {
          setTransactions(data);
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [businessProfile, fetchB2BCashbackBalance]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessProfile) return;
    const amountNum = Number(withdrawAmount.replace(/\D/g, ''));
    if (!amountNum || amountNum <= 0) {
      showToast("Chiqarish summasini to'g'ri kiriting");
      return;
    }
    if (amountNum > b2bCashbackBalance) {
      showToast("Hamyonda yetarli keshbek mavjud emas");
      return;
    }
    if (!cardNumber.trim() || cardNumber.trim().length < 8) {
      showToast("Karta yoki bank hisob raqamini to'liq kiriting");
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      await b2bRepository.requestCashbackWithdrawal(
        businessProfile.id,
        businessProfile.storeName,
        amountNum,
        cardNumber.trim()
      );
      showToast("✅ Keshbekni yechish so'rovi adminga yuborildi!");
      setWithdrawAmount('');
      setCardNumber('');
      setTab('history');
      // reload
      void fetchB2BCashbackBalance();
      const updated = await b2bRepository.listCashbackTransactions(businessProfile.id);
      setTransactions(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "So'rov yuborishda xatolik");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-base text-[#111827]">B2B Keshbek Hamyoni</h2>
              <p className="text-[10px] text-slate-400 font-bold">{businessProfile?.storeName || "Do'kon hamyoni"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Gradient Card */}
        <div className="p-4 bg-gradient-to-br from-slate-900 via-[#1f1638] to-[#111827] text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Mavjud Balans</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black">
              {b2bCashbackRate}% Keshbek
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">{formatMoney(b2bCashbackBalance)}</h1>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="block text-[10px] text-slate-400 font-medium">Keyingi xaridda</span>
              <span className="text-xs font-bold text-emerald-300">100% chegirma qilish</span>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="block text-[10px] text-slate-400 font-medium">Karta / Hisobga</span>
              <span className="text-xs font-bold text-amber-300">Pul qilib yechish</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 p-2 gap-1 bg-slate-50">
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'history' ? 'bg-white text-[#111827] shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tarix ({transactions.length})
          </button>
          <button
            onClick={() => setTab('withdraw')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'withdraw' ? 'bg-white text-[#111827] shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Chiqarib olish
          </button>
          <button
            onClick={() => setTab('rules')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'rules' ? 'bg-white text-[#111827] shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Qoidalar
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {tab === 'history' && (
            <div className="space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 text-xs font-medium text-slate-400 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Hozircha keshbek o'tkazmalari yo'q.</p>
                  <p className="text-[11px] text-slate-400">
                    Ulgurji mahsulotlarga buyurtma berib, to'lov tasdiqlangach keshbek yig'ing!
                  </p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111827] truncate">
                            {tx.description || (isPositive ? 'Keshbek hisoblandi' : 'Keshbek ishlatildi')}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {tx.supplierName && <span>{tx.supplierName}</span>}
                            <span>{new Date(tx.createdAt).toLocaleDateString('uz-UZ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-xs font-black ${isPositive ? 'text-emerald-600' : 'text-[#DB2777]'}`}>
                          {isPositive ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                        </p>
                        {tx.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            <Clock className="w-2.5 h-2.5" /> Kutilmoqda
                          </span>
                        )}
                        {tx.status === 'completed' && isPositive && (
                          <span className="text-[9px] font-bold text-slate-400">✓ Tushdi</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-extrabold flex items-center gap-1">
                  <Banknote className="w-4 h-4 text-amber-600" /> Keshbekni hisobga yechib olish
                </p>
                <p className="text-[11px] text-amber-800/80 leading-relaxed">
                  So'rov yuborganingizdan so'ng, admin to'lovni bank kartangizga yoki hisob raqamingizga o'tkazib beradi.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Chiqarish summasi (so'm)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`Maksimal: ${b2bCashbackBalance}`}
                    max={b2bCashbackBalance}
                    min={1000}
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(b2bCashbackBalance))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-[10px] font-black text-slate-700 transition-colors"
                  >
                    Barchasi
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Plastik karta yoki Bank hisob raqami</label>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="8600 **** **** **** (Uzcard / Humo / IBAN)"
                  className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdraw || b2bCashbackBalance <= 0}
                className="w-full py-3.5 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmittingWithdraw ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Chiqarish so'rovini yuborish</>}
              </button>
            </form>
          )}

          {tab === 'rules' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h4 className="font-black text-sm text-[#111827] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. Keshbek qachon hisoblanadi?
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  OnBozor orqali ulgurji xarid qilganingizda, yetkazib beruvchi to'lovni tasdiqlagach avtomatik tarzda buyurtma summasining <strong>{b2bCashbackRate}%</strong> miqdorida keshbek hamyoningizga o'tkaziladi.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h4 className="font-black text-sm text-[#111827] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 2. Keshbekni qanday ishlatish mumkin?
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Keyingi ulgurji buyurtmalaringizda rasmiylashtirish sahifasida "Keshbekdan to'lash" tugmasini yoqib, 100% gacha chegirma sifatida foydalanishingiz mumkin.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h4 className="font-black text-sm text-[#111827] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 3. Naqd yoki kartaga chiqarish
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Istalgan vaqtda keshbek mablag'ingizni bank kartangizga yoki hisob raqamingizga yechib olish so'rovini yuborishingiz mumkin. Admin so'rovni ko'rib chiqib pulni o'tkazib beradi.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
