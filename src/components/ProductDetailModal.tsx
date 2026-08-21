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
  Truck,
  Star,
  Package,
} from 'lucide-react';
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
    currentUser,
    setAuthPromptOpen,
    setSelectedSellerModal,
    productReviews,
    fetchProductReviews,
    submitProductReview,
  } = useAgroStore();

  const [activeImage, setActiveImage] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    setActiveImage(0);
  }, [productDetail?.id]);

  const isProductItemForFetch = productDetail ? !('mediaUrl' in productDetail || 'type' in productDetail) : false;
  useEffect(() => {
    if (productDetail && isProductItemForFetch) {
      void fetchProductReviews(productDetail.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetail?.id, isProductItemForFetch]);

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
  const phone = ('phone' in productDetail ? productDetail.phone : '') || '';
  const discount = 'discount' in productDetail ? productDetail.discount : undefined;
  const rating = 'rating' in productDetail ? productDetail.rating : 5;
  const reviewsCount = 'reviewsCount' in productDetail ? productDetail.reviewsCount : 0;
  const stock = 'stock' in productDetail ? productDetail.stock : undefined;

  const canManage = Boolean(isAdminUser);
  const telegram = ('telegram' in productDetail ? productDetail.telegram : undefined)?.replace(/^@/, '').replace(/\s+/g, '');
  const isVideoPost = 'mediaUrl' in productDetail && productDetail.type === 'video';
  const description = 'description' in productDetail ? productDetail.description : '';
  const features = 'features' in productDetail ? productDetail.features : '';

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
              className="px-3 py-2 rounded-[12px] bg-orange-100 text-[#D84315] font-black text-xs flex items-center justify-center gap-1.5 hover:bg-orange-200 transition-colors"
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
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#D84315] px-3 py-1 text-xs font-black text-white shadow-md">
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
                  activeImage === index ? 'border-[#D84315] scale-105 shadow-sm' : 'border-transparent opacity-70'
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
              <span className="font-black text-xl text-[#D84315]">{price}</span>
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
                sellerName: seller || 'Sotuvchi',
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
            <MapPin className="w-3.5 h-3.5 text-[#D84315]" />
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
              {description || "Sifatli mahsulot. Birinchi qo'l yetkazib beriladi va kafolatlangan!"}
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
            {isProductItem && stock != null && (
              <div className="flex items-center gap-1.5 text-xs font-medium pt-1">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                {stock > 0 ? (
                  <span className={stock <= 5 ? 'text-amber-700 font-bold' : 'text-slate-600'}>
                    Zaxirada: <b>{stock} dona</b>
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">Zaxira tugagan</span>
                )}
              </div>
            )}
          </div>

          {/* Reviews */}
          {isProductItem && (
            <div className="bg-slate-50 rounded-[18px] p-3.5 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Sharhlar {reviewsCount > 0 ? `(${reviewsCount})` : ''}
                </span>
                <span className="flex items-center gap-1 text-xs font-black text-[#f59e0b]">
                  <Star className="w-3.5 h-3.5 fill-[#fbbf24]" />
                  {rating}
                </span>
              </div>

              {(productReviews[productDetail.id] || []).length > 0 ? (
                <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                  {(productReviews[productDetail.id] || []).map((review) => (
                    <div key={review.id} className="bg-white rounded-[14px] p-2.5 border border-slate-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#111827] truncate">{review.userName}</span>
                        <span className="flex items-center gap-0.5 text-[10px] font-black text-[#f59e0b] shrink-0">
                          <Star className="w-3 h-3 fill-[#fbbf24]" />
                          {review.rating}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium">Hali sharhlar yo'q — birinchi bo'lib yozing.</p>
              )}

              {currentUser ? (
                <div className="space-y-2 pt-1 border-t border-slate-200">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className="p-0.5"
                        aria-label={`${n} yulduz`}
                      >
                        <Star className={`w-5 h-5 ${n <= reviewRating ? 'fill-[#fbbf24] text-[#f59e0b]' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Fikringizni yozing (ixtiyoriy)"
                      className="flex-1 bg-white rounded-[12px] px-3 py-2 text-xs font-medium outline-none border border-slate-200 focus:ring-2 focus:ring-[#5b35f5]/20"
                    />
                    <button
                      type="button"
                      disabled={isSubmittingReview}
                      onClick={async () => {
                        setIsSubmittingReview(true);
                        try {
                          await submitProductReview(productDetail.id, reviewRating, reviewComment);
                          setReviewComment('');
                          setReviewRating(5);
                        } finally {
                          setIsSubmittingReview(false);
                        }
                      }}
                      className="px-4 py-2 rounded-[12px] bg-[#5b35f5] text-white text-xs font-black disabled:opacity-50 shrink-0"
                    >
                      Yuborish
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthPromptOpen(true)}
                  className="text-[11px] font-bold text-[#5b35f5]"
                >
                  Sharh qoldirish uchun tizimga kiring
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Phone & Telegram — sotuvchi bilan bog'lanish */}
        <div className="pt-2 border-t border-slate-100">
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
              className="flex-1 py-3 rounded-[16px] bg-[#D84315] text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-[#BF360C] transition-colors"
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
        </div>
      </div>
    </Modal>
  );
};
