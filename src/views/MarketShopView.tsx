import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Edit3,
  Factory,
  Leaf,
  MapPin,
  Minus,
  PackagePlus,
  Plus,
  Send,
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
} from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import type { Product } from '../api/types';
import { CATEGORIES, REGIONS } from '../data/mockAgroData';
import { uploadListingMedia } from '../api/authClient';


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

export const MarketShopView: React.FC = () => {
  const {
    products,
    addProduct,
    addOrder,
    showToast,
    cart,
    addToCart,
    updateCartQuantity,
    clearCart,
    approveProduct,
    rejectProduct,
    setProductDetail,
    setEditModalItem,
    isAdminUser,
    currentUser,
  } = useAgroStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [checkoutForm, setCheckoutForm] = useState({ name: '', phone: '', address: '' });
  const [form, setForm] = useState({
    title: '',
    seller: 'Shartnomali hamkor',
    category: CATEGORIES[1]?.id || 'fruits',
    price: '',
    numericPrice: '',
    minOrder: '1 dona',
    location: REGIONS[1],
    image: '',
    description: '',
    features: '',
    imagesText: '',
    discount: '',
  });

  const categories = Array.from(new Map(CATEGORIES.map((c) => [c.id, c])).values());
  const isCurrentUserAdmin = isAdminUser;
  const pendingProducts = products.filter((product) => product.approvalStatus === 'pending');
  const approvedProducts = products.filter((product) => product.approvalStatus !== 'pending' && product.approvalStatus !== 'rejected');
  const activeSegment = partnerSegments.find((segment) => segment.id === selectedSegment) || partnerSegments[0];
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.numericPrice * item.quantity, 0);
  const deliveryFee = cartCount > 0 && subtotal < 1000000 ? 25000 : 0;
  const total = subtotal + deliveryFee;

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    const list = approvedProducts.filter((product) => {
      const matchesSegment = activeSegment.id === 'all' || activeSegment.categories.includes(product.category);
      const matchesRegion = selectedRegion === 'all' || product.location.includes(selectedRegion);
      const matchesSearch =
        !normalizedSearch ||
        product.title.toLowerCase().includes(normalizedSearch) ||
        product.seller.toLowerCase().includes(normalizedSearch) ||
        product.location.toLowerCase().includes(normalizedSearch);
      return matchesSegment && matchesRegion && matchesSearch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'cheap') return a.numericPrice - b.numericPrice;
      if (sortBy === 'expensive') return b.numericPrice - a.numericPrice;
      if (sortBy === 'rating') return b.rating - a.rating;
      return b.reviewsCount - a.reviewsCount;
    });
  }, [approvedProducts, searchTerm, selectedRegion, activeSegment, sortBy]);

  const updateQuantity = (productId: string, nextQuantity: number) => {
    updateCartQuantity(productId, nextQuantity);
  };

  const handleOrder = async () => {
    if (!cartCount) return;
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) {
      showToast('Buyurtma uchun ism, telefon va manzilni kiriting');
      return;
    }

    try {
      await Promise.all(cartItems.map((item, index) => addOrder({
        id: `ord-${Date.now()}-${index}`,
        userId: currentUser?.id,
        productName: item.product.title,
        sellerName: item.product.seller,
        sellerPhone: '+998 90 123 45 67',
        image: getProductImage(item.product),
        totalPrice: formatMoney(item.product.numericPrice * item.quantity),
        quantity: `${item.quantity} dona`,
        status: "Qabul qilindi (Rasmiylashtirildi)",
        statusStep: 1,
        date: 'Hozirgina',
      })));
    } catch {
      showToast("Buyurtma saqlanmadi. Internet aloqasini tekshirib qayta urinib ko'ring.");
      return;
    }

    showToast(`Buyurtma qabul qilindi: ${formatMoney(total)}`);
    clearCart();
    setCheckoutForm({ name: '', phone: '', address: '' });
    setIsCartOpen(false);
  };

  const handleAdminSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title || !form.price || !form.numericPrice) {
      showToast("Mahsulot nomi, narxi va raqamli narxini kiriting");
      return;
    }

    const imageUrls = form.imagesText
      .split(/\r?\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      const uploadedImageUrls = currentUser
        ? await Promise.all(selectedImageFiles.map((file, index) => uploadListingMedia(
            URL.createObjectURL(file),
            `${currentUser.id}/market-${Date.now()}-${index}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`,
            file.type || 'image/jpeg'
          )))
        : [];
      const allImageUrls = [...uploadedImageUrls, ...imageUrls];

      await addProduct({
      id: `contract-prod-${Date.now()}`,
      sellerId: currentUser?.id,
      title: form.title,
      seller: form.seller || 'Shartnomali hamkor',
      verified: true,
      approvalStatus: 'approved',
      source: 'admin',
      approvedAt: new Date().toISOString(),
      category: form.category,
      price: form.price,
      numericPrice: Number(form.numericPrice),
      image: allImageUrls[0] || form.image || 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&auto=format&fit=crop&q=80',
      images: allImageUrls.length > 0 ? allImageUrls : undefined,
      description: form.description || undefined,
      features: form.features || undefined,
      rating: 5,
      reviewsCount: 0,
      minOrder: form.minOrder || '1 dona',
      discount: form.discount || 'Shartnoma',
      location: form.location,
      submittedBy: currentUser?.id,
      });
    } catch {
      showToast("Mahsulot saqlanmadi. Supabase ulanishi yoki admin akkauntini tekshiring.");
      return;
    }

    setForm((prev) => ({ ...prev, title: '', price: '', numericPrice: '', image: '', description: '', features: '', imagesText: '', discount: '' }));
    setSelectedImageFiles([]);
    setIsAdminMode(false);
  };

  if (isAdminMode) {
    return (
      <div className="w-full max-w-xl mx-auto px-3 py-3 select-none space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsAdminMode(false)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-[#111827]">Market Shartnoma Paneli</h1>
            <p className="text-[11px] text-slate-400">Admin qo'shadi, Telegram bot e'lonlari tasdiqdan keyin chiqadi</p>
          </div>
        </div>

        {pendingProducts.length > 0 && (
          <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#E53935]" />
                <h2 className="font-black text-sm text-[#111827]">Telegram botdan kelgan e'lonlar</h2>
              </div>
              <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-[#E53935]">{pendingProducts.length} ta</span>
            </div>

            <div className="space-y-2">
              {pendingProducts.map((product) => (
                <div key={product.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-2.5 flex gap-3 items-center">
                  <div className="w-20 h-20 shrink-0 rounded-[14px] overflow-hidden bg-slate-200 flex items-center justify-center">
                    <img src={getProductImage(product)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[12px] font-black text-[#111827] leading-tight line-clamp-2">{product.title}</h3>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">Kutilmoqda</span>
                    </div>
                    <p className="truncate text-[11px] font-bold text-slate-500">{product.seller} • {product.location}</p>
                    <p className="text-[12px] font-black text-[#E53935]">{product.price}</p>
                    {product.submittedBy && <p className="truncate text-[10px] text-slate-400">Bot foydalanuvchi: {product.submittedBy}</p>}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button type="button" onClick={() => approveProduct(product.id)} className="rounded-xl bg-[#111827] py-2 text-[11px] font-black text-white hover:bg-black transition-colors">Tasdiqlash</button>
                      <button type="button" onClick={() => rejectProduct(product.id)} className="rounded-xl bg-white border border-slate-200 py-2 text-[11px] font-black text-[#E53935] hover:bg-slate-100 transition-colors">Rad etish</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleAdminSubmit} className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-1">
            <ClipboardCheck className="w-4 h-4 text-[#E53935]" />
            <h2 className="font-black text-sm text-[#111827]">Hamkor mahsulotini qo'shish</h2>
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mahsulot nomi" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
          <input value={form.seller} onChange={(e) => setForm({ ...form, seller: e.target.value })} placeholder="Hamkor nomi" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="8,500 so'm / kg" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
            <input value={form.numericPrice} onChange={(e) => setForm({ ...form, numericPrice: e.target.value.replace(/[^0-9]/g, '') })} placeholder="8500" inputMode="numeric" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none">
              {categories.filter((cat) => cat.id !== 'all').map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none">
              {REGIONS.filter((region) => region !== 'Barchasi').map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="Min buyurtma" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
            <input value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="Belgi: Aksiya, Shartnoma..." className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
          </div>
          <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Asosiy rasm URL" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Mahsulot tavsifi" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none resize-none focus:ring-2 focus:ring-[#E53935]/30" />
          <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={3} placeholder="Xususiyatlar va afzalliklar" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none resize-none focus:ring-2 focus:ring-[#E53935]/30" />
          <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 cursor-pointer hover:border-[#E53935] transition-colors">
            <span className="block text-[12px] font-black text-slate-700">Bir nechta rasm yuklash</span>
            <span className="block mt-1 text-[10px] text-slate-400">JPG, PNG yoki WebP — bir nechta tanlash mumkin</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => setSelectedImageFiles(Array.from(event.target.files || []))} />
            {selectedImageFiles.length > 0 && <span className="block mt-2 text-[11px] font-black text-emerald-700">{selectedImageFiles.length} ta rasm tanlandi</span>}
          </label>
          <textarea value={form.imagesText} onChange={(e) => setForm({ ...form, imagesText: e.target.value })} rows={2} placeholder="Yoki rasmlar URL manzilini kiriting (har qatorda bitta)" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none resize-none focus:ring-2 focus:ring-[#E53935]/30" />
          <button className="w-full py-3 rounded-2xl bg-[#E53935] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm">
            <PackagePlus className="w-4 h-4" /> Marketga joylash
          </button>
        </form>
      </div>
    );
  }

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
              <p className="text-[11px] text-slate-400">{cartCount} ta mahsulot, OnBozor yetkazib beradi</p>
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
                  <img src={getProductImage(product)} alt={product.title} className="w-20 h-20 rounded-[14px] object-cover bg-slate-100" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[12px] font-black text-[#111827] line-clamp-2">{product.title}</h3>
                      <button onClick={() => updateQuantity(product.id, 0)} className="p-1 text-slate-400 hover:text-[#E53935]"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">Hamkor: {product.seller}</p>
                    <p className="text-[13px] font-black text-[#E53935]">{formatMoney(product.numericPrice * quantity)}</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">OnBozor yetkazadi</span>
                      <div className="flex items-center rounded-full bg-slate-100 p-1">
                        <button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-8 text-center text-xs font-black">{quantity}</span>
                        <button onClick={() => updateQuantity(product.id, quantity + 1)} className="w-7 h-7 rounded-full bg-white flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 shadow-sm space-y-3">
              <h2 className="text-sm font-black text-[#111827]">Yetkazib berish ma'lumotlari</h2>
              <input value={checkoutForm.name} onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })} placeholder="Ism familiya" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
              <input value={checkoutForm.phone} onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value })} placeholder="Telefon raqam" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
              <input value={checkoutForm.address} onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })} placeholder="Yetkazib berish manzili" className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30" />
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
              <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Mahsulotlar</span><b>{formatMoney(subtotal)}</b></div>
              <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Yetkazib berish</span><b>{deliveryFee ? formatMoney(deliveryFee) : 'Bepul'}</b></div>
              <button onClick={handleOrder} className="w-full py-3 rounded-2xl bg-[#E53935] text-white text-sm font-black flex items-center justify-center gap-2 shadow-sm">
                <CreditCard className="w-4 h-4" /> Buyurtma berish - {formatMoney(total)}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-195 mx-auto px-3 py-3 pb-28 select-none space-y-3.5">
      <section className="rounded-[22px] bg-white border border-slate-200/80 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-[10px] font-black uppercase">
              <Truck className="w-3.5 h-3.5" /> OnBozor yetkazib beradi
            </span>
            <h1 className="text-xl font-black leading-tight text-[#111827]">OnBozor Market</h1>
            <p className="text-[12px] text-slate-500 max-w-md">Shartnomali hamkor mahsulotlarini savatga qo'shing va bitta buyurtma qilib rasmiy yetkazib oling.</p>
          </div>
          <div className="flex gap-2">
            {isCurrentUserAdmin && (
              <button onClick={() => setIsAdminMode(true)} className="relative w-10 h-10 rounded-[14px] bg-slate-100 text-slate-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
                {pendingProducts.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#E53935] text-white text-[10px] font-black flex items-center justify-center">{pendingProducts.length}</span>}
              </button>
            )}
            <button onClick={() => setIsCartOpen(true)} className="relative w-10 h-10 rounded-[14px] bg-[#111827] text-white flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#E53935] text-white text-[10px] font-black flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>
        </div>
      </section>

      <div className="relative self-start w-full z-50 -mx-3 px-3 bg-[#F8FAFC]/95 backdrop-blur-md py-2 space-y-2 border-b border-slate-200/60 lg:transform-[translateZ(0)]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Mahsulot qidirish..." className="w-full bg-white border border-slate-200 rounded-[18px] pl-10 pr-10 py-3 text-[13px] font-medium outline-none focus:ring-2 focus:ring-[#E53935]/25" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}
          </div>
          <div className="relative">
            <SlidersHorizontal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none bg-white border border-slate-200 rounded-[18px] pl-9 pr-8 py-3 text-[12px] font-black outline-none">
              {sortOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {partnerSegments.map((segment) => {
            const Icon = segment.icon;
            return (
              <button key={segment.id} onClick={() => setSelectedSegment(segment.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-[12px] font-black border transition-all flex items-center gap-1.5 ${selectedSegment === segment.id ? 'bg-[#111827] text-white border-[#111827]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                <Icon className="w-3.5 h-3.5" /> {segment.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 outline-none">
            <option value="all">Barcha hududlar</option>
            {REGIONS.filter((region) => region !== 'Barchasi').map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 gap-2">
        <p className="text-[12px] text-slate-500 font-bold"><span className="text-[#111827] font-black">{filteredProducts.length}</span> ta mahsulot</p>
        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full"><Truck className="w-3.5 h-3.5" /> rasmiy yetkazish</span>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredProducts.map((product) => {
            const meta = getPartnerMeta(product.category);
            const PartnerIcon = meta.icon;
            const inCart = cart[product.id]?.quantity || 0;
            const canEdit = isAdminUser || currentUser?.id === product.sellerId || currentUser?.id === product.submittedBy;
            return (
              <motion.div
                key={product.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setProductDetail(product)}
                className="group bg-white rounded-[18px] border border-slate-200/80 overflow-hidden text-left shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="block w-full text-left">
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    <img src={getProductImage(product)} alt={product.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-black ${meta.tone}`}><PartnerIcon className="inline w-3 h-3 mr-1" />{meta.label}</span>
                    {product.discount && <span className="absolute left-2 bottom-2 rounded-full bg-[#E53935] px-2 py-1 text-[10px] font-black text-white">{product.discount}</span>}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditModalItem(product);
                        }}
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow-md text-slate-700 hover:bg-white transition-colors"
                        aria-label="Tahrirlash"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="p-2.5 pb-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><Truck className="w-3 h-3" /> Yetkaziladi</span>
                      {product.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50 shrink-0" />}
                    </div>
                    <h3 className="h-9 text-[12px] font-bold leading-snug text-[#111827] line-clamp-2">{product.title}</h3>
                    <p className="text-[13px] font-black text-[#E53935]">{product.price}</p>
                    <div className="flex items-center gap-1 text-[10px] text-amber-500 font-black"><Star className="w-3 h-3 fill-amber-400" /> {product.rating} <span className="text-slate-400 font-bold truncate">{product.seller}</span></div>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500">
                      <span className="truncate">Min: {product.minOrder}</span>
                      <span className="inline-flex items-center gap-1 truncate"><MapPin className="w-3 h-3 text-[#E53935]" /> {product.location}</span>
                    </div>
                  </div>
                </div>
                <div className="px-2.5 pb-2.5">
                  {inCart > 0 ? (
                    <div className="flex items-center rounded-[14px] bg-slate-100 p-1">
                      <button onClick={(event) => { event.stopPropagation(); updateQuantity(product.id, inCart - 1); }} className="w-8 h-8 rounded-[12px] bg-white flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="flex-1 text-center text-xs font-black">{inCart} ta</span>
                      <button onClick={(event) => { event.stopPropagation(); updateQuantity(product.id, inCart + 1); }} className="w-8 h-8 rounded-[12px] bg-white flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={(event) => { event.stopPropagation(); addToCart(product); }} className="w-full py-2.5 rounded-[14px] bg-[#E53935] text-white text-xs font-black flex items-center justify-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" /> Savatga
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[22px] border border-slate-200/80 p-8 text-center shadow-sm flex flex-col items-center gap-2">
          <img
            src="/logo.png"
            alt="OnBozor"
            className="w-14 h-14 rounded-[18px] object-cover shadow-sm ring-1 ring-slate-200/80 mb-1"
          />
          <p className="font-black text-sm text-[#111827]">Mahsulot topilmadi</p>
          <p className="text-xs text-slate-400">Qidiruv yoki filtrni o'zgartirib ko'ring.</p>
        </div>
      )}

      {cartCount > 0 && (
        <div className="mobile-fixed-action-bar fixed left-0 right-0 z-40 bg-white border-t border-slate-200 p-3">
          <div className="max-w-195 mx-auto flex items-center gap-3">
            <button onClick={() => setIsCartOpen(true)} className="relative w-12 h-12 rounded-2xl bg-[#111827] text-white flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#E53935] text-white text-[10px] font-black flex items-center justify-center">{cartCount}</span>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-400">Savatdagi mahsulotlar</p>
              <p className="text-sm font-black text-[#111827]">{formatMoney(total)}</p>
            </div>
            <button onClick={() => setIsCartOpen(true)} className="px-5 py-3 rounded-2xl bg-[#E53935] text-white text-xs font-black shadow-sm">Buyurtma</button>
          </div>
        </div>
      )}
    </div>
  );
};




