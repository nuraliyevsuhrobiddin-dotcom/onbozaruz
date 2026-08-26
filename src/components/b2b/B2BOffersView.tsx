import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, XCircle, Clock, Loader2, ShieldCheck, ArrowRight, Inbox, Send } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BDirectOffer } from '../../api/types';
import { formatMoney } from '../../utils/b2bUtils';

const STATUS_META: Record<B2BDirectOffer['status'], { label: string; cls: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Kutilmoqda',
    cls: 'bg-amber-50 text-amber-700 border border-amber-200',
    icon: <Clock className="w-3 h-3" />,
  },
  accepted: {
    label: 'Qabul qilindi',
    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  declined: {
    label: 'Rad etildi',
    cls: 'bg-red-50 text-red-600 border border-red-200',
    icon: <XCircle className="w-3 h-3" />,
  },
};

type Tab = 'received' | 'sent';

export const B2BOffersView: React.FC = () => {
  const { setB2BRoute, businessProfile, supplierProfile, showToast } = useAgroStore();

  const [tab, setTab] = useState<Tab>(businessProfile ? 'received' : 'sent');
  const [received, setReceived] = useState<B2BDirectOffer[]>([]);
  const [sent, setSent] = useState<B2BDirectOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const [receivedList, sentList] = await Promise.all([
      businessProfile ? b2bRepository.listDirectOffersForStore(businessProfile.id) : Promise.resolve([]),
      supplierProfile ? b2bRepository.listDirectOffersForSupplier(supplierProfile.id) : Promise.resolve([]),
    ]);
    setReceived(receivedList);
    setSent(sentList);
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessProfile?.id, supplierProfile?.id]);

  const handleRespond = async (offerId: string, status: 'accepted' | 'declined') => {
    setRespondingId(offerId);
    try {
      await b2bRepository.respondToDirectOffer(offerId, status);
      setReceived((prev) => prev.map((o) => (o.id === offerId ? { ...o, status } : o)));
      showToast(status === 'accepted' ? '✅ Taklif qabul qilindi' : 'Taklif rad etildi');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xatolik yuz berdi');
    } finally {
      setRespondingId(null);
    }
  };

  const list = tab === 'received' ? received : sent;

  return (
    <div className="w-full max-w-lg mx-auto pb-12 select-none">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setB2BRoute({ view: 'home' })}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-black text-base text-slate-900 leading-tight flex-1">Maxsus takliflar</h1>
      </div>

      {/* Tab switcher */}
      {businessProfile && supplierProfile && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 rounded-2xl bg-white border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setTab('received')}
              className={`flex items-center justify-center gap-1.5 min-h-9 rounded-xl text-xs font-black transition-all ${
                tab === 'received'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" /> Kelgan ({received.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('sent')}
              className={`flex items-center justify-center gap-1.5 min-h-9 rounded-xl text-xs font-black transition-all ${
                tab === 'sent'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" /> Yuborilgan ({sent.length})
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white animate-pulse border border-slate-200" />
          ))
        ) : list.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-500">
              {tab === 'received' ? 'Hozircha sizga taklif kelmagan' : 'Hozircha taklif yubormagansiz'}
            </p>
            {tab === 'sent' && (
              <button
                onClick={() => setB2BRoute({ view: 'map' })}
                className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700 transition-colors"
              >
                Do'konlar xaritasidan taklif yuboring <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          list.map((offer) => {
            const meta = STATUS_META[offer.status];
            return (
              <div key={offer.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">
                      {tab === 'received' ? offer.supplierName : offer.storeName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {new Date(offer.createdAt).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${meta.cls}`}>
                    {meta.icon} {meta.label}
                  </span>
                </div>

                {/* Message */}
                {offer.message && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-xl leading-relaxed">
                    {offer.message}
                  </p>
                )}

                {/* Discount badge */}
                {!!offer.discountPercent && (
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                    <ShieldCheck className="w-3.5 h-3.5" /> {offer.discountPercent}% maxsus chegirma
                  </div>
                )}

                {/* Products */}
                {offer.products && offer.products.length > 0 && (
                  <div className="space-y-1.5 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                    {offer.products.map((p) => (
                      <div key={p.productId} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-700 font-semibold truncate">{p.productName}</span>
                        <span className="shrink-0 flex items-baseline gap-1.5">
                          <span className="text-slate-400 line-through text-[10px]">{formatMoney(p.wholesalePrice)}</span>
                          <span className="text-blue-600 font-black">{formatMoney(p.offerPrice)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons for pending received */}
                {tab === 'received' && offer.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleRespond(offer.id, 'declined')}
                      disabled={respondingId === offer.id}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 font-black text-xs transition-colors disabled:opacity-50"
                    >
                      Rad etish
                    </button>
                    <button
                      onClick={() => handleRespond(offer.id, 'accepted')}
                      disabled={respondingId === offer.id}
                      className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 border border-blue-400/30"
                    >
                      {respondingId === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Qabul qilish'}
                    </button>
                  </div>
                )}

                {/* Go to supplier */}
                {tab === 'received' && offer.status === 'accepted' && (
                  <button
                    onClick={() => setB2BRoute({ view: 'supplier', id: offer.supplierId })}
                    className="w-full py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-black text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    Supplierdan buyurtma berish <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
