import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { useAgroStore } from '../store/useAgroStore';
import {
  CheckCircle2,
  PhoneCall,
  MapPin,
  Edit3,
  Trash2,
  Play,
  ShoppingCart,
  Plus,
  Minus,
  Truck,
  Star,
  Package,
} from 'lucide-react';
import type { Product } from '../api/types';
import { VideoPlayer } from './ui/VideoPlayer';

export const ProductDetailModal: React.FC = () => {
  const {
    productDetail,
    setProductDetail,
    setEditModalItem,
    deletePost,
    deleteProduct,
    openVideoViewer,
    isAdminUser,
    cart,
    addToCart,
    updateCartQuantity,
    showToast,
    currentUser,
    setAuthPromptOpen,
    setSelectedSellerModal,
  } = useAgroStore();

  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [productDetail?.id]);

  if (!productDetail) return null;

  const isProductItem = !('mediaUrl' in productDetail || 'type' in productDetail);
  const title = 'title' in productDetail ? productDetail.title : '';
  const price = 'price' in productDetail ? productDetail.price : '';
  const numericPrice = 'numericPrice' in productDetail ? Number(productDetail.numericPrice) : 0;
  const image = 'image' in productDetail ? productDetail.image : productDetail.mediaUrl;
  const galleryImages = 'images' in productDetail
    ? [productDetail.image, ...(productDetail.images || [])].filter((url, index, urls) => url && urls.indexOf(url) === index)
    : [image];
  const seller = 'seller' in productDetail ? productDetail.seller : productDetail.sellerName;
  const location = productDetail.location;
  const minOrder = productDetail.minOrder || '1 dona';
  const phone = 'phone' in productDetail ? productDetail.phone : '+998 90 123 45 67';
  const discount = 'discount' in productDetail ? productDetail.discount : undefined;
  const rating = 'rating' in productDetail ? productDetail.rating : 5;

  const canManage = Boolean(isAdminUser);
  const telegram = ('telegram' in productDetail ? productDetail.telegram : undefined)?.replace(/^@/, '').replace(/\s+/g, '');
  const isVideoPost = 'mediaUrl' in productDetail && productDetail.type === 'video';
  const description = 'description' in productDetail ? productDetail.description : '';
  const features = 'features' in productDetail ? productDetail.features : '';

  // Cart quantity check
  const inCart = isProductItem && cart[productDetail.id] ? cart[productDetail.id].quantity : 0;

  const handleAddToCart = () => {
    if (!currentUser && isProductItem) {
      showToast("Savatga qo'shish uchun tizimga kiring");
      setAuthPromptOpen(true);
      return;
    }
    addToCart(productDetail as Product);
  };

  const handleUpdateQuantity = (newQty: number) => {
    updateCartQuantity(productDetail.id, newQty);
  };

  return (
    <Modal
      isOpen={Boolean(productDetail)}
      onClose={() => setProductDetail(null)}
      title="Mahsulot tafsilotlari"
    >
      <div className="space-y-4 select-none">
        {/* Admin Management Bar */}
        {canManage && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-[16px] border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 px-2 shrink-0">Admin:</span>
            <button
              onClick={() => setEditModalItem(productDetail)}
              className="flex-1 py-2 rounded-[12px] bg-[#111827] text-white font-black text-xs flex items-center justify-center gap-1.5 hover:bg-black transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Tahrirlash</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm("Rostdan ham ushbu e'lonni o'chirmoqchimisiz?")) {
                  if (!isProductItem) {
                    deletePost(productDetail.id);
                  } else {
                    deleteProduct(productDetail.id);
                  }
                  setProductDetail(null);
                }
              }}
              className="px-3 py-2 rounded-[12px] bg-red-100 text-[#E53935] font-black text-xs flex items-center justify-center gap-1.5 hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>O'chirish</span>
            </button>
          </div>
        )}

        {/* Main Media (Image or Video) */}
        <div className="relative aspect-square rounded-[22px] overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center">
          {isVideoPost ? (
            <VideoPlayer
              src={(productDetail as any).mediaUrl}
              poster={(productDetail as any).posterUrl}
              fit="contain"
              onOpenReels={() => {
                const videoPost = productDetail as any;
                setProductDetail(null);
                openVideoViewer([videoPost], 0);
              }}
            />
          ) : (
            <img
              src={galleryImages[activeImage] || '/logo.png'}
              alt={title}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = '/logo.png';
              }}
              className="w-full h-full object-cover"
            />
          )}
          {discount && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#E53935] px-3 py-1 text-xs font-black text-white shadow-md">
              {discount}
            </span>
          )}
          {isProductItem && (
            <span className="absolute right-3 top-3 z-10 rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-black text-white shadow-md flex items-center gap-1">
              <Truck className="w-3 h-3" /> OnBozar Yetkazadi
            </span>
          )}
        </div>

        {/* Gallery Thumbnails */}
        {galleryImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {galleryImages.map((galleryImage, index) => (
              <button
                key={`${galleryImage}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`w-14 h-14 shrink-0 rounded-[14px] overflow-hidden border-2 transition-all ${
                  activeImage === index ? 'border-[#E53935] scale-105 shadow-sm' : 'border-transparent opacity-70'
                }`}
              >
                <img
                  src={galleryImage}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = '/logo.png';
                  }}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Info Block */}
        <div className="space-y-2.5">
          {/* Price & Rating */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-black text-xl text-[#E53935]">{price}</span>
              {numericPrice > 0 && (
                <p className="text-[10px] text-slate-400 font-semibold">({numericPrice.toLocaleString('uz-UZ')} so'm)</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-full text-xs font-black text-amber-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-black text-base text-[#111827] leading-snug">{title}</h3>

          {/* Seller & Delivery Badge — clickable to open seller profile */}
          <button
            className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap hover:opacity-75 transition-opacity text-left"
            onClick={() =>
              setSelectedSellerModal({
                sellerId: 'sellerId' in productDetail ? productDetail.sellerId : undefined,
                sellerName: seller || 'Fermer',
                location: location,
                phone: phone,
                telegram: 'telegram' in productDetail ? productDetail.telegram : undefined,
                verified: 'verified' in productDetail ? productDetail.verified : true,
              })
            }
          >
            <span className="font-bold text-[#111827]">{seller}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
            <span>•</span>
            <MapPin className="w-3.5 h-3.5 text-[#E53935]" />
            <span className="font-bold text-slate-600">{location}</span>
          </button>

          {/* Official Uzum/Ozon Guarantee Banner */}
          {isProductItem && (
            <div className="rounded-[18px] bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[14px] bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-xs text-emerald-900">OnBozar Rasmiy do'koni</h4>
                <p className="text-[11px] text-emerald-700 font-medium leading-snug">
                  100% kafolatlangan va 1 kunda eshigingizgacha yetkazib beriladi
                </p>
              </div>
            </div>
          )}

          {/* Product Description */}
          <div className="bg-slate-50 rounded-[18px] p-3.5 border border-slate-100 space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Mahsulot haqida ma'lumot
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {description || "Sifatli fermer mahsuloti. Birinchi qo'l yetkazib beriladi va kafolatlangan!"}
            </p>
            {features && (
              <div className="rounded-[14px] bg-white p-3 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Xususiyatlar</span>
                <p className="mt-1 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">{features}</p>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium pt-1">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>Minimum buyurtma: <b className="text-[#111827]">{minOrder}</b></span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Uzum/Ozon Cart vs Phone Call */}
        <div className="pt-2 border-t border-slate-100">
          {isProductItem ? (
            /* 🛒 UZUM / OZON STYLE CART ACTIONS FOR MARKET PRODUCTS */
            <div className="space-y-2">
              {inCart > 0 ? (
                <div className="flex items-center gap-2">
                  {/* Quantity Counter */}
                  <div className="flex items-center rounded-[18px] bg-slate-100 p-1 border border-slate-200">
                    <button
                      onClick={() => handleUpdateQuantity(inCart - 1)}
                      className="w-10 h-10 rounded-[14px] bg-white text-slate-800 flex items-center justify-center shadow-xs font-black active:scale-95 transition-transform"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-sm font-black text-[#111827]">{inCart} ta</span>
                    <button
                      onClick={() => handleUpdateQuantity(inCart + 1)}
                      className="w-10 h-10 rounded-[14px] bg-white text-slate-800 flex items-center justify-center shadow-xs font-black active:scale-95 transition-transform"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Open Cart Button */}
                  <button
                    onClick={() => {
                      setProductDetail(null);
                      // Trigger cart view in Market tab
                    }}
                    className="flex-1 py-3.5 rounded-[18px] bg-[#111827] text-white font-black text-xs flex items-center justify-center gap-2 shadow-md hover:bg-black transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4 text-[#E53935]" />
                    <span>Savatda ({inCart} ta) — Rasmiylashtirish</span>
                  </button>
                </div>
              ) : (
                /* Add to Cart Button */
                <button
                  onClick={handleAddToCart}
                  className="w-full py-4 rounded-[20px] bg-[#E53935] hover:bg-[#C62828] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Savatga qo'shish</span>
                </button>
              )}
            </div>
          ) : (
            /* 📞 PHONE & TELEGRAM FOR SOCIAL FEED POSTS */
            <div className="flex items-center gap-2">
              {isVideoPost && (
                <button
                  type="button"
                  onClick={() => {
                    const videoPost = productDetail as typeof productDetail & { mediaUrl: string };
                    setProductDetail(null);
                    openVideoViewer([videoPost], 0);
                  }}
                  className="w-11 h-11 rounded-[16px] bg-[#111827] text-white flex items-center justify-center shadow-sm hover:bg-black transition-colors shrink-0"
                  title="Video ko'rish"
                  aria-label="Video ko'rish"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              )}
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="flex-1 py-3 rounded-[16px] bg-[#E53935] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-[#C62828] transition-colors"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Qo'ng'iroq qilish</span>
              </a>
              {telegram && (
                <a
                  href={`https://t.me/${telegram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-[16px] bg-[#0088cc] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-[#0077bb] transition-colors"
                >
                  <span>Telegram</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
