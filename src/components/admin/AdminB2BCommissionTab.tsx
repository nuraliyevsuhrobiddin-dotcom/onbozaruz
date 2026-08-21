import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Save,
  Clock,
  Gift,
  Loader2,
  CreditCard,
  Building2,
  Phone,
  Info,
  Check,
  Copy,
} from 'lucide-react';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { b2bRepository } from '../../api/b2bRepository';
import { CommissionLedgerEntry, B2BCashbackTransaction, B2BStorePublicMarker, B2BPlatformRequisites } from '../../api/types';
import { useAgroStore } from '../../store/useAgroStore';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;
const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  settled: 'bg-emerald-50 text-emerald-700',
  voided: 'bg-slate-100 text-slate-500',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda',
  settled: 'Yakunlangan',
  voided: 'Bekor qilingan',
};

export const AdminB2BCommissionTab: React.FC = () => {
  const { showToast, setB2BCashbackRate, platformRequisites, setPlatformRequisites, fetchPlatformRequisites } = useAgroStore();
  const [activeTab, setActiveTab] = useState<'commission' | 'cashback' | 'requisites'>('commission');

  const [ledger, setLedger] = useState<CommissionLedgerEntry[]>([]);
  const [cashbackTxs, setCashbackTxs] = useState<B2BCashbackTransaction[]>([]);
  const [stores, setStores] = useState<B2BStorePublicMarker[]>([]);
  const [loading, setLoading] = useState(true);

  const [cashbackRate, setCashbackRate] = useState<number>(1.5);
  const [isSavingCashback, setIsSavingCashback] = useState(false);

  // Requisites form state
  const [reqForm, setReqForm] = useState<B2BPlatformRequisites>(platformRequisites);
  const [isSavingReq, setIsSavingReq] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Bonus grant modal / state
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [bonusAmount, setBonusAmount] = useState<string>('50000');
  const [bonusNote, setBonusNote] = useState<string>('Yangi do\'kon uchun OnBozor maxsus rag\'batlantirish bonusi');
  const [isGrantingBonus, setIsGrantingBonus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [led, txs, st, rate] = await Promise.all([
      b2bAdminRepository.listCommissionLedger(),
      b2bRepository.listCashbackTransactions(),
      b2bRepository.listStoresForMap(),
      b2bRepository.fetchB2BCashbackRate(),
      fetchPlatformRequisites(),
    ]);
    setLedger(led);
    setCashbackTxs(txs);
    setStores(st);
    setCashbackRate(rate);
    if (st[0]) setSelectedStoreId(st[0].id);
    setLoading(false);
  }, [fetchPlatformRequisites]);

  useEffect(() => {
    setReqForm(platformRequisites);
  }, [platformRequisites]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveCashbackRate = async () => {
    setIsSavingCashback(true);
    try {
      await setB2BCashbackRate(cashbackRate);
      showToast(`✅ B2B Keshbek foizi ${cashbackRate}% qilib belgilandi!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSavingCashback(false);
    }
  };

  const handleSaveRequisites = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingReq(true);
    try {
      await setPlatformRequisites(reqForm);
      showToast("✅ To'lov rekvizitlari muvaffaqiyatli saqlandi!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsSavingReq(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Nusxa olindi: ${text}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUpdateWithdrawal = async (txId: string, status: 'completed' | 'rejected') => {
    try {
      await b2bRepository.adminUpdateWithdrawalStatus(txId, status);
      showToast(status === 'completed' ? "✅ Keshbek to'lovi tasdiqlandi" : "Keshbek so'rovi bekor qilindi (mablag' qaytarildi)");
      const updated = await b2bRepository.listCashbackTransactions();
      setCashbackTxs(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  };

  const handleGrantBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = stores.find((s) => s.id === selectedStoreId);
    if (!st) {
      showToast("Do'konni tanlang");
      return;
    }
    const amt = Number(bonusAmount);
    if (!amt || amt <= 0) {
      showToast("Bonus summasini to'g'ri kiriting");
      return;
    }

    setIsGrantingBonus(true);
    try {
      await b2bRepository.adminGrantBonusCashback(st.id, st.storeName, amt, bonusNote);
      showToast(`🎉 "${st.storeName}" do'koniga +${formatMoney(amt)} bonus keshbek berildi!`);
      setIsBonusModalOpen(false);
      const updated = await b2bRepository.listCashbackTransactions();
      setCashbackTxs(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsGrantingBonus(false);
    }
  };

  const active = ledger.filter((l) => l.status !== 'voided');
  const totalGross = active.reduce((s, l) => s + l.grossAmount, 0);
  const totalCommission = active.reduce((s, l) => s + l.commissionAmount, 0);
  const totalCashbackGiven = cashbackTxs
    .filter((t) => t.type === 'earned' || t.type === 'admin_bonus')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalCashbackRedeemed = cashbackTxs
    .filter((t) => t.type === 'redeemed' || (t.type === 'withdrawn' && t.status === 'completed'))
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Komissiya va Keshbek Boshqaruvi</h2>
          <p className="text-xs text-slate-400 font-medium">Barcha savdolar, komissiya va keshbek shaffof nazorati</p>
        </div>

        <button
          onClick={() => setIsBonusModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Gift className="w-4 h-4" />
          <span>Do'konga Bonus Keshbek</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-[18px] border border-slate-200/80 p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Jami aylanma</span>
          <span className="font-black text-sm sm:text-base text-[#111827]">{formatMoney(totalGross)}</span>
        </div>
        <div className="bg-white rounded-[18px] border border-slate-200/80 p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Onbozar komissiyasi</span>
          <span className="font-black text-sm sm:text-base text-[#DB2777]">{formatMoney(totalCommission)}</span>
        </div>
        <div className="bg-white rounded-[18px] border border-slate-200/80 p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Berilgan Keshbek</span>
          <span className="font-black text-sm sm:text-base text-emerald-600">+{formatMoney(totalCashbackGiven)}</span>
        </div>
        <div className="bg-white rounded-[18px] border border-slate-200/80 p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Ishlatilgan Keshbek</span>
          <span className="font-black text-sm sm:text-base text-amber-600">-{formatMoney(totalCashbackRedeemed)}</span>
        </div>
      </div>

      {/* B2B Cashback Configuration Box */}
      <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#111827]">B2B Keshbek Standart Foizi</h3>
              <p className="text-[10px] text-slate-400 font-medium">Ulgurji savdoda do'konga to'lov tasdiqlangach avtomatik tushadi</p>
            </div>
          </div>
          <button
            onClick={handleSaveCashbackRate}
            disabled={isSavingCashback}
            className="px-3.5 py-2 rounded-xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Saqlash</span>
          </button>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={cashbackRate}
            onChange={(e) => setCashbackRate(Number(e.target.value))}
            className="flex-1 accent-[#DB2777] cursor-pointer"
          />
          <span className="px-3 py-1 bg-white rounded-lg border border-slate-200 font-black text-xs text-[#DB2777] min-w-16 text-center">
            {cashbackRate}%
          </span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200/80 gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('commission')}
          className={`pb-2.5 px-3 text-xs font-black transition-colors relative ${
            activeTab === 'commission' ? 'text-[#DB2777]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          📊 Komissiya Jurnali ({ledger.length})
          {activeTab === 'commission' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DB2777]" />}
        </button>
        <button
          onClick={() => setActiveTab('cashback')}
          className={`pb-2.5 px-3 text-xs font-black transition-colors relative ${
            activeTab === 'cashback' ? 'text-[#DB2777]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          💰 Do'konlar Keshbek Tarixi ({cashbackTxs.length})
          {activeTab === 'cashback' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DB2777]" />}
        </button>
        <button
          onClick={() => setActiveTab('requisites')}
          className={`pb-2.5 px-3 text-xs font-black transition-colors relative ${
            activeTab === 'requisites' ? 'text-[#DB2777]' : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          💳 Admin To'lov Rekvizitlari
          {activeTab === 'requisites' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#DB2777]" />}
        </button>
      </div>

      {/* Tab: Commission Ledger */}
      {activeTab === 'commission' && (
        <>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-[16px] bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400">Hozircha komissiya yozuvlari yo'q</div>
          ) : (
            <div className="space-y-2">
              {ledger.map((l) => (
                <div
                  key={l.id}
                  className="bg-white rounded-[16px] border border-slate-200/80 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#111827]">
                      {formatMoney(l.grossAmount)} · {l.commissionRate}%
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(l.createdAt).toLocaleDateString('uz-UZ')} · {l.paymentMethod === 'cash' ? 'Naqd' : 'Onlayn'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-[#DB2777]">{formatMoney(l.commissionAmount)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${STATUS_TONE[l.status]}`}>
                      {STATUS_LABEL[l.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Cashback Ledger */}
      {activeTab === 'cashback' && (
        <>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-[16px] bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : cashbackTxs.length === 0 ? (
            <div className="text-center py-10 text-xs font-bold text-slate-400">Hozircha keshbek o'tkazmalari yo'q</div>
          ) : (
            <div className="space-y-2">
              {cashbackTxs.map((tx) => {
                const isPositive = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="bg-white rounded-[16px] border border-slate-200/80 p-3.5 space-y-2 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#111827] truncate">{tx.storeName}</span>
                          {tx.type === 'admin_bonus' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-50 text-purple-700">🎁 Admin Bonus</span>
                          ) : tx.type === 'withdrawn' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-50 text-amber-700">💸 Chiqarish so'rovi</span>
                          ) : tx.type === 'redeemed' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-50 text-rose-700">Chegirma qilingan</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700">✓ Buyurtma keshbeki</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">{tx.description}</p>
                        {tx.supplierName && (
                          <p className="text-[10px] text-slate-400">
                            Yetkazib beruvchi: <strong className="text-slate-600">{tx.supplierName}</strong>
                            {tx.orderAmount ? ` · Savdo: ${formatMoney(tx.orderAmount)} (${tx.cashbackRate}%)` : ''}
                          </p>
                        )}
                        {tx.payoutDetails && (
                          <p className="text-[10px] text-amber-800 font-bold bg-amber-50/70 px-2 py-1 rounded-lg">
                            To'lov ma'lumoti (Karta/Hisob): {tx.payoutDetails}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${isPositive ? 'text-emerald-600' : 'text-[#DB2777]'}`}>
                          {isPositive ? `+${formatMoney(tx.amount)}` : formatMoney(tx.amount)}
                        </p>
                        <span className="text-[10px] text-slate-400 block">{new Date(tx.createdAt).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    </div>

                    {/* Pending Withdrawal Action for Admin */}
                    {tx.type === 'withdrawn' && tx.status === 'pending' && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Admin tasdig'i kutilmoqda
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleUpdateWithdrawal(tx.id, 'completed')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                          >
                            ✓ To'landi (Tasdiqlash)
                          </button>
                          <button
                            onClick={() => handleUpdateWithdrawal(tx.id, 'rejected')}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[10px] transition-colors"
                          >
                            ✕ Bekor qilish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Admin Payment Requisites */}
      {activeTab === 'requisites' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Visual Bank Card Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111827] via-[#1e1435] to-[#DB2777] p-6 text-white shadow-xl aspect-[1.58/1] flex flex-col justify-between select-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-7 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center">
                      <div className="w-6 h-4 border border-amber-600/40 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
                        <div className="bg-amber-600/30 rounded-xs" />
                        <div className="bg-amber-600/30 rounded-xs" />
                      </div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">OnBozar B2B</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-black text-white">
                    UzCard / Humo
                  </span>
                </div>

                <div className="space-y-1 my-auto">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Karta raqami</span>
                  <p className="font-mono text-xl sm:text-2xl font-black tracking-widest text-white">
                    {reqForm.adminCardNumber || '8600 •••• •••• ••••'}
                  </p>
                </div>

                <div className="flex items-end justify-between text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Karta egasi</span>
                    <span className="font-bold text-slate-100 uppercase text-xs truncate max-w-[180px] block">
                      {reqForm.adminCardHolder || 'ONBOZAR RASMIY HISOBI'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Bog'lanish</span>
                    <span className="font-bold text-slate-200 text-xs">{reqForm.adminPaymentPhone || '+998 -- --- -- --'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Bank Requisites Box */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2.5 shadow-xs text-xs">
                <div className="flex items-center gap-2 font-black text-[#111827]">
                  <Building2 className="w-4 h-4 text-[#DB2777]" />
                  <span>Bank hisob ma'lumotlari</span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Bank nomi:</span>
                    <span className="font-bold text-slate-800">{reqForm.adminBankName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Hisob raqam:</span>
                    <span className="font-mono font-bold text-slate-800">{reqForm.adminBankAccount || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">MFO:</span>
                    <span className="font-mono font-bold text-slate-800">{reqForm.adminBankMfo || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Requisites Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-[#111827]">Rekvizitlarni tahrirlash</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Ushbu rekvizitlar yetkazib beruvchilar va do'konlarga komissiya hamda to'lovlar uchun ko'rinadi.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveRequisites} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#DB2777]" />
                      Plastik karta raqami (UzCard / Humo)
                    </label>
                    <input
                      value={reqForm.adminCardNumber}
                      onChange={(e) => setReqForm({ ...reqForm, adminCardNumber: e.target.value })}
                      placeholder="8600 0000 0000 0000"
                      className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Karta egasi (Ism / Tashkilot)</label>
                    <input
                      value={reqForm.adminCardHolder}
                      onChange={(e) => setReqForm({ ...reqForm, adminCardHolder: e.target.value })}
                      placeholder="Masalan: ONBOZAR MCHJ"
                      className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#DB2777]/30 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#DB2777]" />
                      Bank 20 xonali hisob raqami
                    </label>
                    <input
                      value={reqForm.adminBankAccount}
                      onChange={(e) => setReqForm({ ...reqForm, adminBankAccount: e.target.value })}
                      placeholder="20208000900012345001"
                      className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">MFO</label>
                    <input
                      value={reqForm.adminBankMfo}
                      onChange={(e) => setReqForm({ ...reqForm, adminBankMfo: e.target.value })}
                      placeholder="00444"
                      className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Bank nomi</label>
                    <input
                      value={reqForm.adminBankName}
                      onChange={(e) => setReqForm({ ...reqForm, adminBankName: e.target.value })}
                      placeholder="ATB Kapitalbank Toshkent sh."
                      className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#DB2777]" />
                      To'lov / Bog'lanish telefoni
                    </label>
                    <input
                      value={reqForm.adminPaymentPhone}
                      onChange={(e) => setReqForm({ ...reqForm, adminPaymentPhone: e.target.value })}
                      placeholder="+998 90 123 45 67"
                      className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#DB2777]" />
                    To'lov yo'riqnomasi / Izoh
                  </label>
                  <textarea
                    rows={2}
                    value={reqForm.adminPaymentInstructions}
                    onChange={(e) => setReqForm({ ...reqForm, adminPaymentInstructions: e.target.value })}
                    placeholder="To'lov izohiga do'kon yoki buyurtma raqamini yozing..."
                    className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingReq}
                  className="w-full py-3 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-xs sm:text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingReq ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Rekvizitlarni saqlash</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bonus Grant Modal */}
      {isBonusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-[#111827]">Do'konga Bonus Keshbek</h3>
              </div>
              <button
                onClick={() => setIsBonusModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGrantBonus} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Qaysi do'konga?</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storeName} ({s.region}, {s.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Bonus summasi (so'm)</label>
                <input
                  type="number"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder="Masalan: 100000"
                  className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Izoh / Sabab</label>
                <input
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  placeholder="Masalan: Faol xaridlari uchun rag'batlantirish"
                  className="w-full bg-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-[#DB2777]/30"
                />
              </div>

              <button
                type="submit"
                disabled={isGrantingBonus}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-sm shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGrantingBonus ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4" /> Keshbekni hisobga o'tkazish</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
