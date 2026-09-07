import React from 'react';
import { CheckCircle2, Truck, Package, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { B2BProduct } from '../../api/types';
import { useAgroStore } from '../../store/useAgroStore';
import { formatMoney } from '../../utils/b2bUtils';

interface B2BProductCardProps {
  product: B2BProduct;
}

export const B2BProductCard: React.FC<B2BProductCardProps> = ({ product }) => {
  const { setB2BRoute, b2bCart, addToB2BCart, updateB2BCartQuantity, currentUser, setAuthPromptOpen } = useAgroStore();

  const inCart = b2bCart[product.id]?.quantity || 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      setAuthPromptOpen(true);
      return;
    }
    if (inCart === 0) {
      addToB2BCart(product);
    } else {
      updateB2BCartQuantity(product.id, inCart + 1);
    }
  };

  const handleQuickMinus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart <= product.moq) {
      updateB2BCartQuantity(product.id, 0);
    } else {
      updateB2BCartQuantity(product.id, inCart - 1);
    }
  };

  return (
    <div
      onClick={() => setB2BRoute({ view: 'product', id: product.id })}
      className="group text-left bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.12)] cursor-pointer relative flex flex-col justify-between"
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-100 overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
            <Package className="w-6 h-6" />
            <span className="text-[9px] font-bold text-slate-400">Rasm yo'q</span>
          </div>
        )}
        {product.availableQty === 0 && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-[10px] font-black bg-red-500/80 px-2 py-0.5 rounded-full">Tugagan</span>
          </div>
        )}
        {product.deliveryAvailable && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-0.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
              <Truck className="w-2.5 h-2.5" />
              Yetkazish
            </span>
          </div>
        )}

        {inCart > 0 && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-0.5 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
              <Check className="w-2.5 h-2.5" />
              {inCart} {product.unit}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h3 className="font-bold text-[11px] text-slate-800 line-clamp-2 leading-snug min-h-[2.4em]">
            {product.name}
          </h3>

          <div className="flex items-baseline gap-1">
            <span className="font-black text-sm text-blue-600">{formatMoney(product.wholesalePrice)}</span>
            <span className="text-[9px] text-slate-400 font-medium">/ {product.unit}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[9px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
              Min: {product.moq} {product.unit}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium truncate">
            {product.supplierVerified && <CheckCircle2 className="w-2.5 h-2.5 text-blue-500 shrink-0" />}
            <span className="truncate">{product.supplierName}</span>
          </div>

          {/* Quick Add to Cart Button */}
          {product.availableQty > 0 && (
            inCart > 0 ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-1"
              >
                <button
                  type="button"
                  onClick={handleQuickMinus}
                  className="w-6 h-6 rounded-lg bg-white border border-blue-200 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-black text-blue-900 px-1">{inCart} {product.unit}</span>
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  disabled={inCart >= product.availableQty}
                  className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="w-full py-1.5 px-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 text-[10px] font-black transition-all flex items-center justify-center gap-1"
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Savatga</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
