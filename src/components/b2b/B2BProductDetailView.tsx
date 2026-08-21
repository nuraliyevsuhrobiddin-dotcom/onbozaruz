import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Minus, Plus, Truck, Loader2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { b2bRepository } from '../../api/b2bRepository';
import { B2BProduct } from '../../api/types';

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;

interface Props {
  productId: string;
}

export const B2BProductDetailView: React.FC<Props> = ({ productId }) => {
  const { setB2BRoute, b2bCart, addToB2BCart, updateB2BCartQuantity, currentUser, setAuthPromptOpen } = useAgroStore();
  const [product, setProduct] = useState<B2BProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    b2bRepository.getB2BProduct(productId).then((p) => {
      if (!cancelled) { setProduct(p); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [productId]);

  if (isLoading) {
    return <div className="w-full max-w-170 mx-auto py-16 flex justify-center"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>;
  }
  if (!product) {
    return (
      <div className="w-full max-w-170 mx-auto py-16 text-center space-y-3">
        <p className="text-sm font-bold text-slate-500">Mahsulot topilmadi</p>
        <button onClick={() => setB2BRoute({ view: 'products' })} className="text-xs font-bold text-[#DB2777]">Orqaga</button>
      </div>
    );
  }

  const inCart = b2bCart[product.id]?.quantity || 0;
  const handleAddToCart = () => {
    if (!currentUser) { setAuthPromptOpen(true); return; }
    addToB2BCart(product);
  };

  return (
    <div className="w-full max-w-170 mx-auto py-3 px-3 space-y-4 select-none pb-28">
      <button onClick={() => setB2BRoute({ view: 'products' })} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="aspect-square rounded-[22px] bg-slate-100 overflow-hidden">
        {product.images[activeImage] ? (
          <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
        ) : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">Rasm yo'q</div>}
      </div>
      {product.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {product.images.map((img, i) => (
            <button key={i} onClick={() => setActiveImage(i)} className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 ${i === activeImage ? 'border-[#DB2777]' : 'border-transparent'}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {product.videoUrl && (
        <video src={product.videoUrl} controls className="w-full rounded-[18px] bg-black" />
      )}

      <div className="space-y-1.5">
        {product.brand && <span className="text-[11px] font-bold text-slate-400 uppercase">{product.brand}</span>}
        <h1 className="font-black text-lg text-[#111827] leading-snug">{product.name}</h1>
        <button
          onClick={() => setB2BRoute({ view: 'supplier', id: product.supplierId })}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600"
        >
          {product.supplierVerified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
          {product.supplierName}
        </button>
      </div>

      <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-2.5 shadow-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="font-black text-2xl text-[#DB2777]">{formatMoney(product.wholesalePrice)}</span>
          <span className="text-xs text-slate-400 font-bold">/ {product.unit}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <span className="block text-slate-400 font-bold text-[10px] uppercase">Minimal buyurtma</span>
            <span className="font-black text-[#111827]">{product.moq} {product.unit}</span>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <span className="block text-slate-400 font-bold text-[10px] uppercase">Mavjud</span>
            <span className="font-black text-[#111827]">{product.availableQty} {product.unit}</span>
          </div>
        </div>
        {product.packaging && <p className="text-xs text-slate-500"><strong className="text-slate-700">Qadoqlash:</strong> {product.packaging}</p>}
        {product.deliveryAvailable && (
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <Truck className="w-4 h-4" /> Yetkazib berish mavjud{product.deliveryRegions.length > 0 ? `: ${product.deliveryRegions.join(', ')}` : ''}
          </p>
        )}
      </div>

      {product.description && (
        <div className="space-y-1.5">
          <h2 className="font-black text-sm text-[#111827]">Tavsif</h2>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
        </div>
      )}

      {/* Fixed bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 p-3 lg:pl-24">
        <div className="max-w-170 mx-auto flex items-center gap-3">
          {product.availableQty === 0 ? (
            <button disabled className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-400 font-black text-sm">Zaxira tugagan</button>
          ) : inCart > 0 ? (
            <div className="flex-1 flex items-center justify-between bg-slate-100 rounded-2xl p-1.5">
              <button
                onClick={() => updateB2BCartQuantity(product.id, inCart - 1)}
                className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-sm"
              ><Minus className="w-4 h-4" /></button>
              <span className="font-black text-sm text-[#111827]">{inCart} {product.unit}</span>
              <button
                onClick={() => updateB2BCartQuantity(product.id, inCart + 1)}
                disabled={inCart >= product.availableQty}
                className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-slate-700 shadow-sm disabled:opacity-40"
              ><Plus className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={handleAddToCart} className="flex-1 py-3.5 rounded-2xl bg-[#DB2777] hover:bg-[#BE185D] text-white font-black text-sm shadow-lg transition-colors">
              Savatga qo'shish ({product.moq} {product.unit} dan)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
