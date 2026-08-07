import React from 'react';
import { Modal } from './ui/Modal';
import { useAgroStore } from '../store/useAgroStore';
import { CheckCircle2, PhoneCall, MapPin, Edit3, Trash2 } from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const { productDetail, setProductDetail, setEditModalItem, deletePost, deleteProduct, currentUser } = useAgroStore();

  if (!productDetail) return null;

  const title = 'title' in productDetail ? productDetail.title : '';
  const price = 'price' in productDetail ? productDetail.price : '';
  const image = 'image' in productDetail ? productDetail.image : productDetail.mediaUrl;
  const seller = 'seller' in productDetail ? productDetail.seller : productDetail.sellerName;
  const location = productDetail.location;
  const minOrder = productDetail.minOrder;
  const phone = 'phone' in productDetail ? productDetail.phone : '+998 90 123 45 67';

  const ownerId = 'sellerId' in productDetail ? productDetail.sellerId : productDetail.submittedBy;
  const isMyPost = Boolean(currentUser?.id && ownerId === currentUser.id);
  const telegram = ('telegram' in productDetail ? productDetail.telegram : undefined)?.replace(/^@/, '').replace(/\s+/g, '');

  return (
    <Modal
      isOpen={Boolean(productDetail)}
      onClose={() => setProductDetail(null)}
      title="Mahsulot tafsilotlari"
    >
      <div className="space-y-4">
        {isMyPost && (
          <div className="flex items-center gap-2 p-2 bg-amber-50/60 rounded-[16px] border border-amber-200/80">
            <span className="text-[11px] font-bold text-amber-800 px-2 shrink-0">Boshqarish:</span>
            <button
              onClick={() => setEditModalItem(productDetail)}
              className="flex-1 py-2 rounded-[12px] bg-[#111827] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-black transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Tahrirlash</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm("Rostdan ham ushbu e'lonni o'chirmoqchimisiz?")) {
                  if ('sellerName' in productDetail || 'mediaUrl' in productDetail) {
                    deletePost(productDetail.id);
                  } else {
                    deleteProduct(productDetail.id);
                  }
                }
              }}
              className="px-3 py-2 rounded-[12px] bg-red-100 text-[#E53935] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>O'chirish</span>
            </button>
          </div>
        )}

        <div className="aspect-square rounded-[20px] overflow-hidden bg-slate-100 border border-slate-200">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-base text-[#E53935]">{price}</span>
            <span className="text-xs text-slate-400 font-semibold">Min: {minOrder}</span>
          </div>

          <h3 className="font-extrabold text-sm sm:text-base text-[#111827] leading-snug">{title}</h3>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-bold text-[#111827]">{seller}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
            <span>•</span>
            <MapPin className="w-3.5 h-3.5 text-[#E53935]" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${seller} ${location}, Uzbekistan`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E53935] font-bold hover:underline"
            >
              {location} (Xaritada ko'rish)
            </a>
          </div>

          <div className="bg-slate-50 rounded-[16px] p-3 border border-slate-100 mt-2 space-y-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
              Mahsulot Haqida
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Sifatli fermer mahsuloti. Birinchi qo'l yetkazib beriladi va kafolatlangan! Minimum buyurtma: <span className="font-bold text-[#111827]">{minOrder}</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="flex-1 py-2.5 rounded-[16px] bg-[#E53935] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-red-600 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Qo'ng'iroq</span>
          </a>
          {telegram && <a
            href={`https://t.me/${telegram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 rounded-[16px] bg-[#0088cc] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#0077bb] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span>Telegram</span>
          </a>}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${seller} ${location}, Uzbekistan`)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Joylashuv xaritasi"
            className="w-10 h-10 rounded-[16px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shrink-0 border border-emerald-100"
          >
            <MapPin className="w-4 h-4" />
          </a>
        </div>
      </div>
    </Modal>
  );
};
