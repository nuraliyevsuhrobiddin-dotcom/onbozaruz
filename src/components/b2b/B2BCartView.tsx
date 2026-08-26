import React, { useMemo } from 'react';
import { ArrowLeft, Minus, Plus, Trash2, CheckCircle2, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { formatMoney, getB2BCartSummary } from '../../utils/b2bUtils';

export const B2BCartView: React.FC = () => {
  const {
    b2bCart,
    updateB2BCartQuantity,
    clearB2BCart,
    setB2BRoute,
    businessProfile,
    isAuthenticated,
    setAuthPromptOpen,
  } = useAgroStore();

  const { groups, totalQty, totalPrice } = useMemo(() => getB2BCartSummary(b2bCart), [b2bCart]);

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    setB2BRoute({ view: 'checkout' });
  };

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-3 select-none pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setB2BRoute({ view: 'products' })}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <h1 className="font-black text-lg text-slate-900">Savatcha</h1>
            {totalQty > 0 && (
              <p className="text-[11px] text-slate-500 font-semibold">
                <span className="text-blue-600 font-bold">{totalQty}</span> ta mahsulot
              </p>
            )}
          </div>
        </div>

        {groups.length > 0 && (
          <button
            onClick={() => clearB2BCart()}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-xl hover:bg-red-50 border border-red-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tozalash</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {groups.length === 0 ? (
        <div className="min-h-[55vh] flex items-center justify-center">
          <div className="w-full max-w-sm text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
              <ShoppingCart className="w-8 h-8 stroke-[1.75]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">Savatchangiz bo'sh</h3>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
                Ulgurji mahsulotlar katalogiga o'tib, o'zingizga kerakli mahsulotlarni tanlang.
              </p>
            </div>
            <button
              onClick={() => setB2BRoute({ view: 'products' })}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition-colors border border-blue-400/30"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Mahsulotlar katalogiga o'tish</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.supplierId} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              {/* Supplier row */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-black">
                  {group.supplierName?.charAt(0) ?? '?'}
                </div>
                <span className="font-black text-xs text-slate-800">{group.supplierName}</span>
                {group.supplierVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
              </div>

              {/* Lines */}
              <div className="space-y-2.5">
                {group.lines.map((line) => (
                  <div key={line.product.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      {line.product.images[0]
                        ? <img src={line.product.images[0]} alt={line.product.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-slate-400 text-[9px] font-bold">Rasm</div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{line.product.name}</p>
                      <p className="text-[10px] text-blue-600 font-bold mt-0.5">
                        {formatMoney(line.product.wholesalePrice)} / {line.product.unit}
                      </p>
                    </div>
                    {/* Qty control */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
                      <button
                        onClick={() => updateB2BCartQuantity(line.product.id, line.quantity === line.product.moq ? 0 : line.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors"
                      >
                        {line.quantity === line.product.moq
                          ? <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          : <Minus className="w-3.5 h-3.5" />
                        }
                      </button>
                      <span className="text-xs font-black text-slate-900 w-7 text-center">{line.quantity}</span>
                      <button
                        onClick={() => updateB2BCartQuantity(line.product.id, line.quantity + 1)}
                        disabled={line.quantity >= line.product.availableQty}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Supplier subtotal */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">Jami ({group.supplierName})</span>
                <span className="text-sm font-black text-blue-600">{formatMoney(group.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fixed bottom checkout bar */}
      {groups.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 lg:pl-24">
          <div className="max-w-170 mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Umumiy jami</span>
              <span className="font-black text-xl text-slate-900">{formatMoney(totalPrice)}</span>
            </div>
            <button
              onClick={handleProceedToCheckout}
              className="w-full py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-colors cursor-pointer border border-blue-400/30"
            >
              {!isAuthenticated
                ? "Buyurtma berish uchun tizimga kiring"
                : businessProfile
                  ? "Rasmiylashtirishga o'tish"
                  : "Rasmiylashtirish (xaridor profili yaratiladi)"
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
