import React from 'react';
import { CheckCircle2, Truck } from 'lucide-react';
import { B2BProduct } from '../../api/types';
import { useAgroStore } from '../../store/useAgroStore';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

interface B2BProductCardProps {
  product: B2BProduct;
}

export const B2BProductCard: React.FC<B2BProductCardProps> = ({ product }) => {
  const { setB2BRoute } = useAgroStore();

  return (
    <button
      onClick={() => setB2BRoute({ view: 'product', id: product.id })}
      className="text-left bg-white rounded-[20px] border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="relative aspect-square bg-slate-100">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">Rasm yo'q</div>
        )}
        {product.availableQty === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-black">Tugagan</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-bold text-xs text-[#111827] line-clamp-2 leading-snug min-h-[2.2em]">{product.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="font-black text-sm text-[#DB2777]">{formatMoney(product.wholesalePrice)}</span>
          <span className="text-[10px] text-slate-400 font-medium">/ {product.unit}</span>
        </div>
        <p className="text-[10px] text-slate-500 font-semibold">Minimal: {product.moq} {product.unit}</p>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate">
          {product.supplierVerified && <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />}
          <span className="truncate">{product.supplierName}</span>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          {product.deliveryAvailable ? (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
              <Truck className="w-3 h-3" /> Yetkazib beriladi
            </span>
          ) : <span />}
        </div>
      </div>
    </button>
  );
};
