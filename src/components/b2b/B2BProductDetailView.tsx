import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Minus, Plus, Truck, Loader2, ShoppingCart, ArrowRight, Package, Star } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BProduct } from '../../api/types';
import { formatMoney } from '../../utils/b2bUtils';

interface Props {
  productId: string;
}

export const B2BProductDetailView: React.FC<Props> = ({ productId }) => {
  const { setB2BRoute, b2bCart, addToB2BCart, updateB2BCartQuantity, currentUser, setAuthPromptOpen } = useAgroStore();
  const [product, setProduct] = useState<B2BProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const cartTotalQty = Object.values(b2bCart).reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    b2bRepository.getB2BProduct(productId).then((p) => {
      if (!cancelled) { setProduct(p); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [productId]);

  if (isLoading) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Yuklanmoqda...</span>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-500">Mahsulot topilmadi</p>
        <button onClick={() => setB2BRoute({ view: 'products' })} className="text-xs font-bold text-blue-400 hover:text-blue-300">Orqaga</button>
      </div>
    );
  }

  const inCart = b2bCart[product.id]?.quantity || 0;
  const handleAddToCart = () => {
    if (!currentUser) { setAuthPromptOpen(true); return; }
    addToB2BCart(product);
  };

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-44 lg:pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setB2BRoute({ view: 'products' })}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>

        <button
          onClick={() => setB2BRoute({ view: 'cart' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold relative shadow-lg shadow-blue-500/25 border border-blue-400/30 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Savat</span>
          {cartTotalQty > 0 && (
            <span className="w-4.5 h-4.5 rounded-full bg-amber-400 text-slate-900 text-[9px] font-black flex items-center justify-center">
              {cartTotalQty}
            </span>
          )}
        </button>
      </div>

      {/* Main Image */}
      <div className="aspect-square rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 relative">
        {product.images[activeImage]
          ? <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
              <Package className="w-10 h-10" />
              <span className="text-xs font-bold">Rasm yo'q</span>
            </div>
          )
        }
        {product.availableQty === 0 && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-sm font-black bg-red-500/80 px-4 py-2 rounded-full">Zaxira tugagan</span>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {product.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {product.images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(i)}
              className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeImage
                  ? 'border-blue-500 shadow-lg shadow-blue-500/25'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {product.videoUrl && (
        <video src={product.videoUrl} controls className="w-full rounded-2xl bg-black border border-slate-200" />
      )}

      {/* Title + Supplier */}
      <div className="space-y-2">
        {product.brand && (
          <span className="inline-block text-[10px] font-black text-blue-700 uppercase tracking-widest bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
            {product.brand}
          </span>
        )}
        <h1 className="font-black text-xl text-slate-900 leading-snug">{product.name}</h1>
        <button
          onClick={() => setB2BRoute({ view: 'supplier', id: product.supplierId })}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          {product.supplierVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
          {product.supplierName}
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
        </button>
      </div>

      {/* Price + Stats card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="font-black text-3xl text-blue-600">{formatMoney(product.wholesalePrice)}</span>
          <span className="text-sm text-slate-500 font-bold">/ {product.unit}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Minimal buyurtma</span>
            <span className="font-black text-sm text-amber-600">{product.moq} {product.unit}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Mavjud zaxira</span>
            <span className={`font-black text-sm ${product.availableQty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {product.availableQty} {product.unit}
            </span>
          </div>
        </div>

        {product.packaging && (
          <p className="text-xs text-slate-500">
            <span className="font-black text-slate-700">Qadoqlash: </span>{product.packaging}
          </p>
        )}

        {product.deliveryAvailable && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
            <p className="text-xs font-bold text-emerald-700">
              Yetkazib berish mavjud
              {product.deliveryRegions.length > 0 ? `: ${product.deliveryRegions.join(', ')}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      {product.description && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <h2 className="font-black text-sm text-slate-900">Tavsif</h2>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
        </div>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed mobile-fixed-action-bar lg:bottom-0 left-0 right-0 z-35 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 lg:pl-24 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-170 mx-auto flex items-center gap-3 min-h-[56px] transition-all duration-200">
          {product.availableQty === 0 ? (
            <button disabled className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm border border-slate-200">
              Zaxira tugagan
            </button>
          ) : inCart > 0 ? (
            <div className="flex-1 flex items-center gap-2 transition-all duration-200">
              <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-2xl p-1.5 min-w-[140px] shrink-0">
                <button
                  onClick={() => updateB2BCartQuantity(product.id, inCart - 1)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-black text-xs text-slate-900 px-2 whitespace-nowrap">{inCart} {product.unit}</span>
                <button
                  onClick={() => updateB2BCartQuantity(product.id, inCart + 1)}
                  disabled={inCart >= product.availableQty}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setB2BRoute({ view: 'cart' })}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-colors border border-blue-400/30"
              >
                <span>Savatga o'tish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="flex-1 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/25 transition-colors border border-blue-400/30"
            >
              Savatga qo'shish ({product.moq} {product.unit} dan)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
