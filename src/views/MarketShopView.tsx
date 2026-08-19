import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Factory,
  Leaf,
  MapPin,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  Stethoscope,
  Tractor,
  Trash2,
  Truck,
  X,
  Lock,
  BadgeCheck,
  PackagePlus,
} from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import type { Product } from '../api/types';
import { REGIONS } from '../data/mockAgroData';
import { decrementProductStockOnServer } from '../api/authClient';
import { BusinessProductSubmitModal } from '../components/BusinessProductSubmitModal';

// ─── Config ───────────────────────────────────────────────────────────────────
const sortOptions = [
  { id: 'popular', label: 'Ommabop' },
  { id: 'cheap', label: 'Arzonlari' },
  { id: 'expensive', label: 'Qimmatlari' },
  { id: 'rating', label: 'Reyting' },
];

const partnerSegments = [
  { id: 'all', label: 'Barchasi', icon: Store, categories: [] },
  { id: 'farmers', label: 'Fermerlar', icon: Leaf, categories: ['fruits', 'grains', 'apiary', 'greenhouse'] },
  { id: 'veterinary', label: 'Veterinariya', icon: Stethoscope, categories: ['livestock'] },
  { id: 'manufacturers', label: 'Ishlab chiqaruvchi', icon: Factory, categories: ['seeds', 'logistics'] },
  { id: 'equipment', label: 'Texnika', icon: Tractor, categories: ['machinery'] },
];

const getPartnerMeta = (category: string) => {
  if (category === 'machinery') return { label: 'Texnika', icon: Tractor, tone: 'bg-blue-50 text-blue-700' };
  if (category === 'livestock') return { label: 'Veterinar', icon: Stethoscope, tone: 'bg-violet-50 text-violet-700' };
  if (category === 'seeds' || category === 'logistics') return { label: 'Ishlab chiqaruvchi', icon: Factory, tone: 'bg-amber-50 text-amber-700' };
  return { label: 'Fermer', icon: Leaf, tone: 'bg-emerald-50 text-emerald-700' };
};

const formatMoney = (value: number) => `${value.toLocaleString('uz-UZ')} so'm`;
const getProductImage = (product: Product) => product.images?.[0] || product.image;

// ─── Main Component ────────────────────────────────────────────────────────────
export const MarketShopView: React.FC = () => {
  const {
    products,
    addOrder,
    showToast,
    cart,
    addToCart,
    updateCartQuantity,
    clearCart,
    setProductDetail,
    setEditModalItem,
    isAdminUser,
    currentUser,
    setAuthPromptOpen,
    setActiveTab,
  } = useAgroStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });
  const [formErrors, setFormErrors] = useState({ name: false, phone: false, address: false });
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Auto-prefill checkout form from currentUser profile if logged in
  useEffect(() => {
    if (currentUser) {
      setCheckoutForm((prev) => ({
        name: prev.name || currentUser.name || '',
        phone: prev.phone || currentUser.phone || '',
        address: prev.address || currentUser.location || '',
      }));
    }
  }, [currentUser]);

  // Auto-detect location via GPS + Nominatim reverse geocoding
  const detectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Qurilmangiz joylashuvni qo\'llab-quvvatlamaydi');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=uz`,
            { headers: { 'User-Agent': 'OnBozarApp/1.0' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          // Build readable address from parts
          const parts = [
            addr.road || addr.pedestrian || addr.footway || '',
            addr.house_number || '',
            addr.suburb || addr.neighbourhood || '',
            addr.city || addr.town || addr.village || addr.county || '',
            addr.state || '',
          ].filter(Boolean);
          const formatted = parts.join(', ') || data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setCheckoutForm((prev) => ({ ...prev, address: formatted }));
          showToast('📍 Manzil avtomatik aniqlandi!');
        } catch {
          // Fallback: use raw coords if Nominatim fails
          setCheckoutForm((prev) => ({
            ...prev,
            address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          }));
          showToast('📍 Koordinatalar aniqlandi');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          showToast('Joylashuvga ruxsat berilmadi. Sozlamalardan ruxsat bering.');
        } else {
          showToast('Joylashuv aniqlanmadi. Qayta urinib ko\'ring.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Market faqat admin tomonidan qo'shilgan va tasdiqlangan mahsulotlarni ko'rsatadi
  const approvedProducts = products.filter(
    (p) => p.approvalStatus === 'approved' && p.source === 'admin'
  );
  // Agar source field mavjud bo'lmasa (eski ma'lumotlar) — approved bo'lganlarini ko'rsatish
  const allApproved = products.filter(
    (p) => p.approvalStatus === 'approved' || p.approvalStatus !== 'rejected'
  );
  const displayProducts = approvedProducts.length > 0 ? approvedProducts : allApproved.filter(p => p.approvalStatus !== 'pending' && p.approvalStatus !== 'rejected');

  const activeSegment = partnerSegments.find((s) => s.id === selectedSegment) || partnerSegments[0];
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.numericPrice * item.quantity, 0);
  const deliveryFee = cartCount > 0 && subtotal < 1000000 ? 25000 : 0;
  const total = subtotal + deliveryFee;

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const list = displayProducts.filter((p) => {
      const matchSeg = activeSegment.id === 'all' || activeSegment.categories.includes(p.category);
      const matchReg = selectedRegion === 'all' || p.location.includes(selectedRegion);
      const matchQ = !q || p.title.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
      return matchSeg && matchReg && matchQ;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'cheap') return a.numericPrice - b.numericPrice;
      if (sortBy === 'expensive') return b.numericPrice - a.numericPrice;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.reviewsCount - a.reviewsCount;
    });
  }, [displayProducts, searchTerm, selectedRegion, activeSegment, sortBy]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const updateQuantity = (productId: string, q: number) => updateCartQuantity(productId, q);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast("Xarid qilish uchun tizimga kiring");
      setAuthPromptOpen(true);
      return;
    }
    addToCart(product);
  };

  // ─── Telegram xabar yuborish ──────────────────────────────────────────────
  /*
  const sendTelegramMessage = async (chatId: string, text: string) => {
    return;
    // Telegram bot credentials must never be sent to the browser.
    const botToken = '';
    if (!botToken || !chatId) return;
    const cleanChatId = chatId.replace(/^@/, '').replace(/\s+/g, '');
    if (!cleanChatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text,
          parse_mode: 'HTML',
        }),
      });
    } catch {
      // Telegram xatosi buyurtmani to'xtatmasin
    }
  };
  */

  const handleOrder = async () => {
    if (!cartCount || isSubmittingOrder) return;

    const nameEmpty = !checkoutForm.name.trim();
    const phoneEmpty = !checkoutForm.phone.trim();
    const addressEmpty = !checkoutForm.address.trim();

    setFormErrors({ name: nameEmpty, phone: phoneEmpty, address: addressEmpty });

    if (nameEmpty || phoneEmpty || addressEmpty) {
      showToast('⚠️ Buyurtma uchun Ism, Telefon va Manzilni to\'liq kiriting!');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      // Bitta xariddagi barcha buyurtmalarni "bitta xarid" sifatida
      // birlashtirib ko'rsatish uchun umumiy guruh ID.
      const groupId = crypto.randomUUID();
      let stockFailCount = 0;

      // Har bir mahsulot uchun alohida buyurtma yoziladi. allSettled ishlatamiz:
      // bitta mahsulot saqlanmasa ham, muvaffaqiyatli bo'lganlari qayta
      // yuborilib takrorlanmasin (savatdan faqat haqiqatan saqlanganlari o'chadi).
      const results = await Promise.allSettled(
        cartItems.map(async (item, idx) => {
          const product = item.product;
          const lineTotal = formatMoney(product.numericPrice * item.quantity);

          // Zaxirani avval atom tarzda kamaytiramiz — agar boshqa xaridor
          // ulgurib olgan bo'lsa, buyurtma yozilmaydi.
          const hasStock = await decrementProductStockOnServer(product.id, item.quantity);
          if (!hasStock) {
            stockFailCount += 1;
            throw new Error('Yetarli zaxira yo\'q');
          }

          await addOrder({
            id: `ord-${Date.now()}-${idx}`,
            userId: currentUser?.id,
            productName: product.title,
            sellerName: product.seller,
            sellerPhone: product.phone || '',
            image: getProductImage(product),
            totalPrice: lineTotal,
            quantity: `${item.quantity} dona`,
            status: 'Qabul qilindi',
            statusStep: 1,
            date: 'Hozirgina',
            groupId,
          });

          return product.id;
        })
      );

      const succeededIds = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value);
      const failedCount = results.length - succeededIds.length;

      succeededIds.forEach((productId) => updateCartQuantity(productId, 0));

      if (failedCount === 0) {
        showToast(`✅ Buyurtma muvaffaqiyatli qabul qilindi: ${formatMoney(total)}`);
        setCheckoutForm({ name: '', phone: '', address: '' });
        setIsCartOpen(false);
      } else if (succeededIds.length > 0) {
        showToast(
          `⚠️ ${succeededIds.length} ta mahsulot buyurtma qilindi, ${failedCount} tasi saqlanmadi — qolganlarini qayta yuboring`
        );
      } else if (stockFailCount === results.length) {
        showToast("Afsuski, tanlangan mahsulot(lar) zaxirasi tugadi.");
      } else {
        showToast("Buyurtmani saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
      }
    } catch (err: unknown) {
      console.error('[handleOrder] error:', err);
      showToast("Buyurtmani saqlashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };


  // ─── Cart View ─────────────────────────────────────────────────────────────
  if (isCartOpen) {
    return (
      <div className="w-full max-w-xl mx-auto px-3 py-3 pb-28 select-none space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-lg text-[#111827]">Savat</h1>
              <p className="text-[11px] text-slate-400">{cartCount} ta mahsulot · OnBozor yetkazib beradi</p>
            </div>
          </div>
          {cartCount > 0 && (
            <button onClick={clearCart} className="text-[11px] font-black text-[#E53935]">Tozalash</button>
          )}
        </div>

        {cartItems.length > 0 ? (
          <>
            <div className="space-y-2">
              {cartItems.map(({ product, quantity }) => (
                <div key={product.id} className="bg-white rounded-[18px] border border-slate-200/80 p-2.5 shadow-sm flex gap-3">
                  <img src={getProductImage(product)} alt={product.title} className="w-20 h-20 rounded-[14px] object-cover bg-slate-100 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[12px] font-black text-[#111827] line-clamp-2">{product.title}</h3>
                      <button onClick={() => updateQuantity(product.id, 0)} className="p-1 text-slate-400 hover:text-[#E53935] shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">Hamkor: {product.seller}</p>
                    <p className="text-[13px] font-black text-[#5b35f5]">{formatMoney(product.numericPrice * quantity)}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">OnBozor yetkazadi</span>
                      <div className="flex items-center rounded-full bg-slate-100 p-1">
                        <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs font-black">{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-black text-[#111827]">Yetkazib berish ma'lumotlari</h2>
              <div>
                <input
                  value={checkoutForm.name}
                  onChange={(e) => {
                    setCheckoutForm({ ...checkoutForm, name: e.target.value });
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: false }));
                  }}
                  placeholder="Ism familiya *"
                  className={`w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none transition-all ${
                    formErrors.name
                      ? 'border-2 border-red-500 bg-red-50/50 focus:ring-2 focus:ring-red-300'
                      : 'focus:ring-2 focus:ring-[#5b35f5]/30'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 px-1">Ism familiyangizni kiriting</p>
                )}
              </div>

              <div>
                <input
                  value={checkoutForm.phone}
                  onChange={(e) => {
                    setCheckoutForm({ ...checkoutForm, phone: e.target.value });
                    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: false }));
                  }}
                  placeholder="Telefon raqam *"
                  type="tel"
                  className={`w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none transition-all ${
                    formErrors.phone
                      ? 'border-2 border-red-500 bg-red-50/50 focus:ring-2 focus:ring-red-300'
                      : 'focus:ring-2 focus:ring-[#5b35f5]/30'
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 px-1">Telefon raqamingizni kiriting</p>
                )}
              </div>

              {/* Address field with auto-detect button */}
              <div>
                <div className="relative">
                  <input
                    value={checkoutForm.address}
                    onChange={(e) => {
                      setCheckoutForm({ ...checkoutForm, address: e.target.value });
                      if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: false }));
                    }}
                    placeholder="Yetkazib berish manzili *"
                    className={`w-full bg-slate-100 rounded-[14px] px-3.5 py-3 pr-[3.5rem] text-[13px] outline-none transition-all ${
                      formErrors.address
                        ? 'border-2 border-red-500 bg-red-50/50 focus:ring-2 focus:ring-red-300'
                        : 'focus:ring-2 focus:ring-[#5b35f5]/30'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={isLocating}
                    title="Joylashuvni avtomatik aniqlash"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-[11px] flex items-center justify-center transition-all
                      bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-sm disabled:opacity-60"
                  >
                    {isLocating ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
                      </svg>
                    )}
                  </button>
                </div>
                {formErrors.address && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 px-1">Yetkazib berish manzilini kiriting</p>
                )}
              </div>

              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <span>📍</span>
                GPS tugmasini bosib joylashuvingizni avtomatik aniqlating
              </p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[22px] border border-slate-200/80 p-8 text-center shadow-sm">
            <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="mt-3 font-black text-sm text-[#111827]">Savat bo'sh</p>
            <p className="text-xs text-slate-400 mt-1">Mahsulot tanlab savatga qo'shing.</p>
          </div>
        )}

        {cartCount > 0 && (
          <div className="mobile-fixed-action-bar fixed left-0 right-0 z-40 bg-white border-t border-slate-200 p-3">
            <div className="max-w-xl mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Mahsulotlar</span>
                <b>{formatMoney(subtotal)}</b>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Yetkazib berish</span>
                <b>{deliveryFee ? formatMoney(deliveryFee) : 'Bepul'}</b>
              </div>
              <button
                onClick={handleOrder}
                disabled={isSubmittingOrder}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] hover:brightness-95 active:scale-[0.98] text-white text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-60"
              >
                {isSubmittingOrder ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Buyurtma rasmiylashtirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Buyurtma berish — {formatMoney(total)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main Market View ──────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-195 mx-auto px-3 py-3 pb-28 select-none space-y-3.5">

      {/* ─── Hero Section ─── */}
      <section className="rounded-[24px] bg-gradient-to-br from-[#1a132b] via-[#2d1d3d] to-[#0f172a] p-5 shadow-[0_16px_36px_rgba(37,22,63,0.28)] overflow-hidden relative border border-[#f3d6ff]/10">
        {/* Background decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-[#8b5cf6]/18 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-[#f59e0b]/12 pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 text-[10px] font-black uppercase">
                <Truck className="w-3.5 h-3.5" />
                Rasmiy yetkazib berish
              </span>
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">
              OnBozar<br />
              <span className="text-[#f7b955]">Market</span>
            </h1>
            <p className="text-[11px] text-white/75 max-w-[220px] leading-relaxed">
              Sertifikatlangan hamkorlardan to'g'ridan-to'g'ri xarid qiling
            </p>
            {/* Official store badge */}
            <div className="flex items-center gap-1.5 mt-1">
              <BadgeCheck className="w-4 h-4 text-[#8ef0c7]" />
              <span className="text-[10px] font-black text-[#d7f9eb]">Rasmiy OnBozar do'koni</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end shrink-0">
            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-11 h-11 rounded-[16px] bg-white/10 backdrop-blur text-white flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#5b35f5] text-white text-[10px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Admin button — only visible for admins */}
            {isAdminUser && (
              <button
                onClick={() => setActiveTab('admin')}
                className="w-11 h-11 rounded-[16px] bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] text-white flex items-center justify-center border border-[#5b35f5] hover:brightness-95 transition-colors"
                title="Admin panel — mahsulot qo'shish"
              >
                <ShieldCheck className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Business akkaunt — o'zi mahsulot taklif qila oladi */}
        {!isAdminUser && currentUser?.role === 'business' && (
          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-black py-2 transition-colors"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            Mahsulot taklif qilish
          </button>
        )}

        {/* Oddiy akkauntlar uchun qulf ma'lumoti */}
        {!isAdminUser && currentUser?.role !== 'business' && (
          <div className="mt-3 flex items-center gap-1.5 text-white/40">
            <Lock className="w-3 h-3" />
            <span className="text-[10px] font-bold">
              Mahsulot qo'shish faqat admin yoki Biznes akkaunt orqali amalga oshiriladi
            </span>
          </div>
        )}
      </section>

      {isSubmitModalOpen && (
        <BusinessProductSubmitModal onClose={() => setIsSubmitModalOpen(false)} />
      )}

      {/* ─── Search & Filters ─── */}
      <div className="relative z-10 space-y-2 bg-[#fffaf7]/95 backdrop-blur-md py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mahsulot qidirish..."
              className="w-full bg-[#fffdfb] border-2 border-[#e9dffb] rounded-[18px] pl-10 pr-10 py-3 text-[13px] font-medium text-[#1f2937] outline-none shadow-[0_2px_10px_rgba(109,40,217,0.04)] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#8b5cf6]/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <SlidersHorizontal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563] pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-[#fffdfb] border-2 border-[#e9dffb] rounded-[18px] pl-9 pr-8 py-3 text-[12px] font-black text-[#1f2937] outline-none shadow-[0_2px_10px_rgba(109,40,217,0.04)]"
            >
              {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Segment tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {partnerSegments.map((seg) => {
            const Icon = seg.icon;
            return (
              <button
                key={seg.id}
                onClick={() => setSelectedSegment(seg.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black border-2 transition-all flex items-center gap-1.5 ${
                  selectedSegment === seg.id
                    ? 'bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] text-white border-[#6d28d9] shadow-[0_8px_20px_rgba(109,40,217,.26)]'
                    : 'bg-white text-[#374151] border-[#e5e7eb] hover:bg-[#f6f3ff] hover:border-[#d8c9ff]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {seg.label}
              </button>
            );
          })}
        </div>

        {/* Region filter */}
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="shrink-0 rounded-full border-2 border-[#e9dffb] bg-[#fffdfb] px-3 py-1.5 text-[11px] font-black text-[#374151] outline-none shadow-[0_2px_10px_rgba(109,40,217,0.04)]"
        >
          <option value="all">Barcha hududlar</option>
          {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* ─── Result count ─── */}
      <div className="flex items-center justify-between px-1 gap-2">
        <p className="text-[12px] text-slate-500 font-bold">
          <span className="text-[#111827] font-black">{filteredProducts.length}</span> ta mahsulot
        </p>
        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
          <Truck className="w-3.5 h-3.5" />
          Rasmiy yetkazish
        </span>
      </div>

      {/* ─── Products Grid ─── */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredProducts.map((product) => {
            const meta = getPartnerMeta(product.category);
            const PartnerIcon = meta.icon;
            const inCart = cart[product.id]?.quantity || 0;

            return (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setProductDetail(product)}
                className="group bg-[#fffdfb] rounded-[18px] border-2 border-[#f0e7ff] overflow-hidden text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:shadow-[0_16px_30px_rgba(124,58,237,0.12)] transition-all cursor-pointer"
              >
                {/* Image */}
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  <img
                    src={getProductImage(product)}
                    alt={product.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-black ${meta.tone}`}>
                    <PartnerIcon className="inline w-3 h-3 mr-1" />{meta.label}
                  </span>
                  {product.discount && (
                    <span className="absolute left-2 bottom-2 rounded-full bg-[#5b35f5] px-2 py-1 text-[10px] font-black text-white">
                      {product.discount}
                    </span>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-800">Tugagan</span>
                    </div>
                  )}
                  {/* Admin edit button */}
                  {isAdminUser && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditModalItem(product); }}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-md text-slate-700 hover:bg-white transition-colors"
                      aria-label="Tahrirlash"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#5b35f5]" />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5 pb-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <Truck className="w-3 h-3" /> Yetkaziladi
                    </span>
                    {product.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50 shrink-0" />}
                  </div>
                  <h3 className="h-9 text-[12px] font-bold leading-snug text-[#111827] line-clamp-2">{product.title}</h3>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-black text-[#dc2626]">{product.price}</p>
                    {product.stock != null && product.stock > 0 && product.stock <= 5 && (
                      <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                        Faqat {product.stock} dona
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#f59e0b] font-black">
                    <Star className="w-3 h-3 fill-[#fbbf24]" />
                    {product.rating}
                    <span className="text-[#6b7280] font-bold truncate">{product.seller}</span>
                    {product.reviewsCount > 0 && (
                      <span className="text-[#9ca3af] font-bold">({product.reviewsCount})</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500">
                    <span className="truncate">Min: {product.minOrder}</span>
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#5b35f5]" />
                      {product.location}
                    </span>
                  </div>
                </div>

                {/* Cart button */}
                <div className="px-2.5 pb-2.5">
                  {product.stock === 0 ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-[14px] bg-slate-100 text-slate-400 text-xs font-black flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      Tugagan
                    </button>
                  ) : inCart > 0 ? (
                    <div className="flex items-center rounded-[14px] bg-slate-100 p-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, inCart - 1); }}
                        className="w-8 h-8 rounded-[12px] bg-white flex items-center justify-center"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="flex-1 text-center text-xs font-black">{inCart} ta</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, inCart + 1); }}
                        disabled={product.stock != null && inCart >= product.stock}
                        className="w-8 h-8 rounded-[12px] bg-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      className="w-full py-2.5 rounded-[14px] bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] text-white text-xs font-black flex items-center justify-center gap-1.5 hover:brightness-110 transition-colors shadow-[0_8px_16px_rgba(109,40,217,0.22)]"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Savatga
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[22px] border border-slate-200/80 p-10 text-center shadow-sm flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
            <Store className="w-8 h-8 text-slate-300" />
          </div>
          <div>
            <p className="font-black text-sm text-[#111827]">Mahsulot topilmadi</p>
            <p className="text-xs text-slate-400 mt-1">Qidiruv yoki filtrni o'zgartirib ko'ring.</p>
          </div>
          {isAdminUser && (
            <button
              onClick={() => setActiveTab('admin')}
              className="mt-1 px-5 py-2.5 rounded-[16px] bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] text-white font-black text-xs hover:brightness-95 transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin paneldan mahsulot qo'shish
            </button>
          )}
        </div>
      )}

      {/* ─── Fixed Cart Bar ─── */}
      {cartCount > 0 && (
        <div className="mobile-fixed-action-bar fixed left-0 right-0 z-40 bg-white border-t border-slate-200 p-3">
          <div className="max-w-195 mx-auto flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-12 h-12 rounded-2xl bg-[#111827] text-white flex items-center justify-center shrink-0"
            >
              <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#5b35f5] text-white text-[10px] font-black flex items-center justify-center">
                {cartCount}
              </span>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-400">Savatdagi mahsulotlar</p>
              <p className="text-sm font-black text-[#111827]">{formatMoney(total)}</p>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] text-white text-xs font-black shadow-sm hover:brightness-95 transition-colors"
            >
              Buyurtma
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
