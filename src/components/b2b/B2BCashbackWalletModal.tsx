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
import { formatMoney } from '../../utils/b2bUtils';

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
    return () => { isMounted = false; };
  }, [businessProfile, fetchB2BCashbackBalance]);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessProfile) return;
    const amountNum = Number(withdrawAmount.replace(/\D/g, ''));
    if (!amountNum || amountNum <= 0) { showToast("Chiqarish summasini to'g'ri kiriting"); return; }
    if (amountNum > b2bCashbackBalance) { showToast("Hamyonda yetarli keshbek mavjud emas"); return; }
    if (!cardNumber.trim() || cardNumber.trim().length < 8) { showToast("Karta yoki bank hisob raqamini to'liq kiriting"); return; }

    setIsSubmittingWithdraw(true);
    try {
      await b2bRepository.requestCashbackWithdrawal(businessProfile.id, businessProfile.storeName, amountNum, cardNumber.trim());
      showToast("✅ Keshbekni yechish so'rovi adminga yuborildi!");
      setWithdrawAmount('');
      setCardNumber('');
      setTab('history');
      void fetchB2BCashbackBalance();
      const updated = await b2bRepository.listCashbackTransactions(businessProfile.id);
      setTransactions(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "So'rov yuborishda xatolik");
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const inputCls = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-black text-sm text-slate-900">B2B Keshbek Hamyoni</h2>
              <p className="text-[10px] text-slate-500 font-bold">{businessProfile?.storeName || "Do'kon hamyoni"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance hero */}
        <div className="mx-4 my-2 p-5 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl text-white shadow-lg shadow-emerald-700/20 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 bottom-0 w-24 h-24 rounded-full bg-teal-400/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-emerald-100 uppercase tracking-wider">Mavjud Balans</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-[10px] font-black">
                {b2bCashbackRate}% Keshbek
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
              {formatMoney(b2bCashbackBalance)}
            </h1>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/15 border border-white/20 rounded-xl p-2.5 backdrop-blur-xs">
                <span className="block text-[9px] text-emerald-100 font-medium mb-0.5">Keyingi xaridda</span>
                <span className="text-xs font-black text-white">100% gacha chegirma</span>
              </div>
              <div className="bg-white/15 border border-white/20 rounded-xl p-2.5 backdrop-blur-xs">
                <span className="block text-[9px] text-emerald-100 font-medium mb-0.5">Karta / Hisobga</span>
                <span className="text-xs font-black text-white">Pul qilib yechish</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-slate-100 p-2 gap-1 bg-white">
          {[
            { key: 'history', label: `Tarix (${transactions.length})` },
            { key: 'withdraw', label: 'Chiqarish' },
            { key: 'rules', label: 'Qoidalar' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === key
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">

          {/* History tab */}
          {tab === 'history' && (
            <div className="space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-slate-400" />
                  <p className="text-xs font-medium text-slate-500">Hozircha keshbek o'tkazmalari yo'q.</p>
                  <p className="text-[11px] text-slate-400">
                    Ulgurji buyurtma berib, keshbek yig'ing!
                  </p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {tx.description || (isPositive ? 'Keshbek hisoblandi' : 'Keshbek ishlatildi')}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {tx.supplierName && <span>{tx.supplierName}</span>}
                            <span>{new Date(tx.createdAt).toLocaleDateString('uz-UZ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-xs font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                        </p>
                        {tx.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md mt-0.5">
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

          {/* Withdraw tab */}
          {tab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" /> Keshbekni hisobga yechib olish
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  So'rov yuborganingizdan so'ng, admin to'lovni bank kartangizga yoki hisob raqamingizga o'tkazib beradi.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Chiqarish summasi (so'm)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder={`Maksimal: ${b2bCashbackBalance}`}
                    max={b2bCashbackBalance}
                    min={1000}
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(b2bCashbackBalance))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-[10px] font-black text-emerald-700 transition-colors"
                  >
                    Barchasi
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Plastik karta yoki Bank hisob raqami</label>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="8600 **** **** **** (Uzcard / Humo / IBAN)"
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdraw || b2bCashbackBalance <= 0}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 border border-emerald-400/30"
              >
                {isSubmittingWithdraw
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Send className="w-4 h-4" /> Chiqarish so'rovini yuborish</>
                }
              </button>
            </form>
          )}

          {/* Rules tab */}
          {tab === 'rules' && (
            <div className="space-y-3">
              {[
                {
                  title: '1. Keshbek qachon hisoblanadi?',
                  text: `OnBozar orqali ulgurji xarid qilganingizda, yetkazib beruvchi to'lovni tasdiqlagach avtomatik tarzda buyurtma summasining ${b2bCashbackRate}% miqdorida keshbek hamyoningizga o'tkaziladi.`,
                },
                {
                  title: '2. Keshbekni qanday ishlatish mumkin?',
                  text: "Keyingi ulgurji buyurtmalaringizda rasmiylashtirish sahifasida \"Keshbekdan to'lash\" tugmasini yoqib, 100% gacha chegirma sifatida foydalanishingiz mumkin.",
                },
                {
                  title: '3. Naqd yoki kartaga chiqarish',
                  text: "Istalgan vaqtda keshbek mablag'ingizni bank kartangizga yoki hisob raqamingizga yechib olish so'rovini yuborishingiz mumkin. Admin so'rovni ko'rib chiqib pulni o'tkazib beradi.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
