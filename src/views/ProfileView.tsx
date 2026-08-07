import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  MapPin,
  Grid,
  Bookmark,
  Package,
  Store,
  ShieldCheck,
  Settings,
  Globe,
  LogOut,
  ArrowLeft,
  Star,
  BarChart3,
  Users,
  Video,
  Eye,
  Bell,
  Smartphone,
  Lock,
  CreditCard,
  Truck,
  Moon,
  Edit3,
  Camera,
  Mail,
  Phone,
  KeyRound,
  Save,
  Building2,
  EllipsisVertical,
  Send,
  PackagePlus,
  ClipboardCheck,
  Rocket,
  Trash2,
  User,
} from 'lucide-react';
import { useAgroStore } from '../store/useAgroStore';
import { CATEGORIES, REGIONS } from '../data/mockAgroData';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const ProfileView: React.FC = () => {
  const {
    posts,
    products,
    savedPostIds,
    followedSellerIds,
    orders,
    activeSubView,
    setActiveSubView,
    setCreateModalOpen,
    setProductDetail,
    showToast,
    approveProduct,
    rejectProduct,
    addProduct,
    isAdminUser,
    setEditModalItem,
    deletePost,
    deleteProduct,
    currentUser,
    logoutUser,
    updateUserProfile,
    setAuthPromptOpen,
  } = useAgroStore();

  const [activeGridTab, setActiveGridTab] = useState('posts');
  const [sellerTab, setSellerTab] = useState<'products' | 'videos' | 'reviews'>('products');
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const defaultAvatar = '';
  const defaultCover = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000&auto=format&fit=crop&q=80';

  const defaultProfileForm = {
    name: currentUser?.name || '',
    handle: currentUser?.handle || currentUser?.email?.split('@')[0] || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    location: currentUser?.location || '',
    businessName: currentUser?.businessName || '',
    bio: currentUser?.bio || '',
    avatar: currentUser?.avatar || defaultAvatar,
    cover: currentUser?.cover || defaultCover,
    followersBase: 0,
  };

  const [profileForm, setProfileForm] = useState(defaultProfileForm);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name || '',
        handle: currentUser.handle || currentUser.email?.split('@')[0] || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        avatar: currentUser.avatar || defaultAvatar,
        cover: currentUser.cover || defaultCover,
        location: currentUser.location || '',
        businessName: currentUser.businessName || '',
        bio: currentUser.bio || (currentUser.businessName ? `${currentUser.businessName} rasmiy agro sahifasi` : ''),
        followersBase: 0,
      });
    }
  }, [currentUser]);

  const isCurrentUserPost = (post: { sellerId: string; sellerName?: string }) => {
    return !!currentUser && post.sellerId === currentUser.id;
  };

  const [settingsForm, setSettingsForm] = useState({
    pushNotifications: true,
    orderUpdates: true,
    marketingMessages: false,
    darkMode: false,
    showPhone: true,
    twoFactor: false,
    autoSaveListings: true,
    language: "O'zbekcha",
    currency: "So'm (UZS)",
    deliveryRegion: '',
    paymentMethod: '',
  });

  const [adminMarketForm, setAdminMarketForm] = useState({
    title: '',
    seller: 'Shartnomali hamkor',
    category: CATEGORIES[1]?.id || 'fruits',
    price: '',
    numericPrice: '',
    minOrder: '1 dona',
    location: REGIONS[1] || 'Toshkent sh.',
    image: '',
    imagesText: '',
    discount: '',
  });

  const handleAdminMarketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMarketForm.title || !adminMarketForm.price || !adminMarketForm.numericPrice) {
      showToast("Mahsulot nomi va narxini kiriting");
      return;
    }

    const imageUrls = adminMarketForm.imagesText
      .split(/\r?\n|,/)
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      await addProduct({
      id: `contract-prod-${Date.now()}`,
      sellerId: currentUser?.id,
      title: adminMarketForm.title,
      seller: adminMarketForm.seller || 'Shartnomali hamkor',
      verified: true,
      approvalStatus: 'approved',
      source: 'admin',
      approvedAt: new Date().toISOString(),
      category: adminMarketForm.category,
      price: adminMarketForm.price,
      numericPrice: Number(adminMarketForm.numericPrice),
      image: imageUrls[0] || adminMarketForm.image || 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=600&auto=format&fit=crop&q=80',
      images: imageUrls.length > 0 ? imageUrls : undefined,
      rating: 5,
      reviewsCount: 0,
      minOrder: adminMarketForm.minOrder || '1 dona',
      discount: adminMarketForm.discount || 'Shartnoma',
      location: adminMarketForm.location,
      submittedBy: currentUser?.id,
      });
    } catch {
      showToast("Mahsulot saqlanmadi. Supabase ulanishi yoki admin akkauntini tekshiring.");
      return;
    }

    setAdminMarketForm({
      title: '',
      seller: 'Shartnomali hamkor',
      category: CATEGORIES[1]?.id || 'fruits',
      price: '',
      numericPrice: '',
      minOrder: '1 dona',
      location: REGIONS[1] || 'Toshkent sh.',
      image: '',
      imagesText: '',
      discount: '',
    });
  };

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 1)}K`;
    return String(value);
  };

  const ownPosts = posts.filter(isCurrentUserPost);
  const profilePosts = ownPosts;
  const followersCount = Number(profileForm.followersBase || 0) + Math.max(0, ownPosts.length - 1) * 3;
  const followingCount = followedSellerIds.length;
  const viewsCount = profilePosts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
  const sellerRating = profilePosts.length
    ? Math.min(5, 4.4 + Math.min(0.5, profilePosts.reduce((sum, post) => sum + post.likesCount, 0) / 10000))
    : 0;
  const reviewsCount = profilePosts.reduce((sum, post) => sum + post.commentsCount, 0);
  const totalSales = products.reduce((sum, product) => sum + product.numericPrice, 0);
  const sellerCount = new Set([...posts.map((post) => post.sellerId), ...products.map((product) => product.seller)]).size;
  const commission = Math.round(totalSales * 0.03);

  const orderStats = [
    { name: 'Qabul', value: orders.filter((o) => o.status.includes('Qabul')).length },
    { name: "To'lov", value: orders.filter((o) => o.status.includes("To'lov")).length },
    { name: "Yo'lda", value: orders.filter((o) => o.status.includes("Yo'lda")).length },
    { name: 'Yetdi', value: orders.filter((o) => o.status.includes('Yetdi')).length },
  ];

  const profileData = {
    name: profileForm.name || currentUser?.name || 'Fermer',
    handle: profileForm.handle || currentUser?.handle || 'fermer',
    avatar: profileForm.avatar || defaultAvatar,
    cover: profileForm.cover || defaultCover,
    verified: true,
    location: profileForm.location || currentUser?.location || "O'zbekiston",
    bio: profileForm.bio || currentUser?.bio || '',
    website: `onbozor.uz/@${profileForm.handle || 'fermer'}`,
    followers: formatCompact(followersCount),
    following: String(followingCount),
    postsCount: profilePosts.length,
    views: formatCompact(viewsCount),
    rating: Number(sellerRating.toFixed(1)),
    reviewsCount,
  };

  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id));
  const gridItems = activeGridTab === 'posts' ? profilePosts : savedPosts;
  const profileMenuItems = [
    { id: 'edit-profile', label: 'Profilni tahrirlash', icon: Edit3 },
    { id: 'orders', label: 'Buyurtmalarim', icon: Package, badge: orders.length, comingSoon: true },
    { id: 'seller-panel', label: 'Seller Panel', icon: Store, comingSoon: true },
    ...(isAdminUser ? [{ id: 'admin-panel', label: 'Boshqaruv paneli', icon: ShieldCheck, isSpecial: true }] : []),
    { id: 'settings', label: 'Sozlamalar', icon: Settings, comingSoon: true },
    { id: 'lang', label: "Til: O'zbekcha", icon: Globe, comingSoon: true },
    { id: 'logout', label: 'Chiqish', icon: LogOut, isSpecial: true },
  ];

  const handleProfileMenuClick = (id: string, label: string) => {
    setProfileMenuOpen(false);
    if (id === 'edit-profile') setActiveSubView('edit-profile');
    else if (id === 'orders') {
      setActiveSubView('orders');
      showToast('🚀 "Buyurtmalarim" bo\'limi tez kunda ishga tushiriladi!');
    }
    else if (id === 'seller-panel') {
      setActiveSubView('seller-panel');
      showToast('🚀 "Seller Panel" bo\'limi tez kunda ishga tushiriladi!');
    }
    else if (id === 'admin-panel') setActiveSubView('admin-panel');
    else if (id === 'settings') {
      setActiveSubView('settings');
      showToast('🚀 "Sozlamalar" bo\'limi tez kunda ishga tushiriladi!');
    }
    else if (id === 'lang') {
      setActiveSubView('settings');
      showToast('🚀 Til sozlamalari tez kunda ishga tushiriladi!');
    }
    else if (id === 'logout') {
      logoutUser().then(() => showToast('Tizimdan muvaffaqiyatli chiqdingiz'));
    }
    else showToast(`${label} ochildi`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('onbozor-profile-form', JSON.stringify(profileForm));
  }, [profileForm]);

  const handleProfileImageUpload = (target: 'avatar' | 'cover', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Faqat rasm faylini yuklash mumkin');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Rasm hajmi 5 MB dan oshmasligi kerak');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) {
        showToast("Rasmni yuklab bo'lmadi");
        return;
      }
      setProfileForm((prev) => ({ ...prev, [target]: value }));
      showToast(target === 'avatar' ? 'Profil rasmi yangilandi' : 'Cover rasmi yangilandi');
    };
    reader.onerror = () => showToast("Rasmni yuklab bo'lmadi");
    reader.readAsDataURL(file);
  };

  // Auth Guard
  if (!currentUser) {
    return (
      <div className="w-full max-w-md mx-auto py-12 px-4 text-center space-y-4 select-none">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-50 text-[#E53935] flex items-center justify-center shadow-inner">
          <User className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-extrabold text-[#111111]">Profilingizga kiring</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          E'lon berish, saqlangan e'lonlarni ko'rish va profil ma'lumotlarini boshqarish uchun shaxsiy kabinetingizga kiring.
        </p>
        <button
          onClick={() => setAuthPromptOpen(true)}
          className="w-full py-3.5 rounded-[16px] bg-[#E53935] text-white font-extrabold text-sm hover:bg-[#D32F2F] transition-colors shadow-md flex items-center justify-center gap-2"
        >
          Kirish / Ro'yxatdan o'tish
        </button>
      </div>
    );
  }

  // Sub-View: Orders
  if (activeSubView === 'orders') {
    return (
      <div className="w-full max-w-xl mx-auto py-3 px-3 space-y-4 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-[#111111]">Buyurtmalarim</h1>
            <p className="text-[11px] text-slate-400">Faol xaridlar, yetkazib berish va sotuvchi aloqalari</p>
          </div>
        </div>

        {/* Coming Soon Notice Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-[20px] p-3.5 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-[14px] bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Rocket className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xs text-amber-900">Tez kunda ishga tushiriladi</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                Tez kunda
              </span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
              Ushbu bo'lim loyihani serverga ulash va backend integratsiyasi doirasida tez kunda to'liq ishga tushadi!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Jami', value: orders.length, tone: 'text-slate-900' },
            { label: "Yo'lda", value: orders.filter((o) => o.status.includes("Yo'lda")).length, tone: 'text-blue-600' },
            { label: 'Qabul', value: orders.filter((o) => o.status.includes('Qabul')).length, tone: 'text-emerald-600' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-[16px] border border-slate-200/80 p-3 text-center shadow-sm">
              <span className={`block font-black text-lg ${item.tone}`}>{item.value}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-[20px] border border-slate-200/80 p-3 shadow-sm space-y-3">
              <div className="flex gap-3">
                <img src={order.image} alt={order.productName} className="w-20 h-20 rounded-[14px] object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-sm text-[#111111] line-clamp-2">{order.productName}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{order.sellerName} • {order.date}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black whitespace-nowrap">
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">{order.quantity}</span>
                    <span className="font-black text-[#E53935]">{order.totalPrice}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {['Qabul', "To'lov", "Yo'lda", 'Yetdi'].map((step, idx) => {
                  const active = idx + 1 <= order.statusStep;
                  return (
                    <div key={step} className="space-y-1">
                      <div className={`h-1.5 rounded-full ${active ? 'bg-[#E53935]' : 'bg-slate-200'}`} />
                      <span className={`text-[9px] font-bold ${active ? 'text-[#111111]' : 'text-slate-400'}`}>{step}</span>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${order.sellerPhone.replace(/\s+/g, '')}`}
                  className="py-2 rounded-[14px] bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Qo'ng'iroq
                </a>
                <button
                  onClick={() => showToast(`${order.id} holati yangilandi`)}
                  className="py-2 rounded-[14px] bg-[#111111] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Kuzatish
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sub-View: Seller Panel
  if (activeSubView === 'seller-panel') {
    return (
      <div className="w-full max-w-xl mx-auto py-3 px-3 space-y-4 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-[#111111]">Sotuvchi paneli</h1>
            <p className="text-[11px] text-slate-400">Sotuvchi e'lonlari, savdo va reyting statistikasi</p>
          </div>
        </div>

        {/* Coming Soon Notice Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-[20px] p-3.5 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-[14px] bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Rocket className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xs text-amber-900">Tez kunda ishga tushiriladi</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                Tez kunda
              </span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
              Ushbu bo'lim loyihani serverga ulash va backend integratsiyasi doirasida tez kunda to'liq ishga tushadi!
            </p>
          </div>
        </div>

        {/* Seller Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-white rounded-[18px] border border-slate-200/80 shadow-sm text-center">
            <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <div className="font-extrabold text-sm text-[#111111]">{profileData.views}</div>
            <div className="text-[10px] text-slate-400 font-medium">Ko'rishlar</div>
          </div>
          <div className="p-3 bg-white rounded-[18px] border border-slate-200/80 shadow-sm text-center">
            <Users className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <div className="font-extrabold text-sm text-[#111111]">{profileData.followers}</div>
            <div className="text-[10px] text-slate-400 font-medium">Obunachilar</div>
          </div>
          <div className="p-3 bg-white rounded-[18px] border border-slate-200/80 shadow-sm text-center">
            <Star className="w-4 h-4 text-amber-500 mx-auto mb-1 fill-amber-400" />
            <div className="font-extrabold text-sm text-[#111111]">{profileData.rating} / 5.0</div>
            <div className="text-[10px] text-slate-400 font-medium">Reyting ({profileData.reviewsCount})</div>
          </div>
        </div>

        {/* Rating Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-[18px] p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
              SERTIFIKATLANGAN SOTUVCHI
            </span>
            <h3 className="font-extrabold text-sm mt-1">OnBozor Sertifikatlangan Sotuvchisi</h3>
          </div>
          <Star className="w-8 h-8 fill-white text-white" />
        </div>

        {/* Seller Tabs */}
        <div className="bg-white rounded-[18px] border border-slate-200/80 overflow-hidden shadow-sm p-1 flex gap-1">
          {[
            { id: 'products', label: 'Mahsulotlar' },
            { id: 'videos', label: "Video E'lonlar" },
            { id: 'reviews', label: 'Sharhlar (128)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSellerTab(t.id as 'products' | 'videos' | 'reviews')}
              className={`flex-1 py-2 text-xs font-bold rounded-[14px] transition-colors ${
                sellerTab === t.id ? 'bg-[#111111] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {sellerTab === 'products' && (
          <div className="grid grid-cols-2 gap-2">
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => setProductDetail(p)}
                className="bg-white p-2.5 rounded-[16px] border border-slate-200/80 cursor-pointer space-y-1.5"
              >
                <img src={p.image} alt={p.title} className="w-full aspect-square object-cover rounded-[12px]" />
                <h4 className="font-bold text-xs text-[#111111] truncate">{p.title}</h4>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <div className="font-extrabold text-xs text-[#E53935]">{p.price}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Tahrirlash"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditModalItem(p);
                      }}
                      className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="O'chirish"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Rostdan ham ushbu mahsulotni o'chirmoqchimisiz?")) {
                          deleteProduct(p.id);
                        }
                      }}
                      className="p-1 rounded-md bg-red-50 hover:bg-red-100 text-[#E53935] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Videos Tab */}
        {sellerTab === 'videos' && (
          <div className="grid grid-cols-3 gap-2">
            {posts.filter((p) => p.type === 'video').map((p) => (
              <div
                key={p.id}
                onClick={() => setProductDetail(p)}
                className="relative aspect-[9/16] bg-slate-900 rounded-[14px] overflow-hidden cursor-pointer"
              >
                <img src={p.posterUrl} alt={p.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white">
                  <Video className="w-3 h-3" />
                </div>
                <div className="absolute bottom-2 left-2 text-white font-extrabold text-[10px]">
                  {p.likesCount} layk
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reviews Tab */}
        {sellerTab === 'reviews' && (
          <div className="space-y-2">
            {[
              { name: 'Otabek R.', text: "Meva sifati juda a'lo darajada. O'z vaqtida yetkazib berishdi!", rating: 5, date: 'Kecha' },
              { name: 'Dilshod T.', text: "Bug'doy urug'ligi sertifikatiga ega, unuvchanligi 98%. Rahmat!", rating: 5, date: '3 kun oldin' },
            ].map((r, i) => (
              <div key={`${r.name}-${i}`} className="bg-white p-3 rounded-[16px] border border-slate-200/80 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#111111]">{r.name}</span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-600">{r.text}</p>
                <span className="text-[10px] text-slate-400 block">{r.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sub-View: Management Panel
  if (activeSubView === 'admin-panel') {
    return (
      <div className="w-full max-w-xl mx-auto py-3 px-3 space-y-4 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-[#E53935]">Boshqaruv paneli</h1>
            <p className="text-[11px] text-slate-400">Tizim tahlili, grafiklar va so'rovlar</p>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 bg-white rounded-[16px] border border-slate-200/80 text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Jami Savdo</div>
            <div className="font-extrabold text-sm text-[#111111] mt-0.5">{formatCompact(totalSales)}</div>
          </div>
          <div className="p-3 bg-white rounded-[16px] border border-slate-200/80 text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Fermerlar</div>
            <div className="font-extrabold text-sm text-[#22C55E] mt-0.5">{sellerCount}</div>
          </div>
          <div className="p-3 bg-white rounded-[16px] border border-slate-200/80 text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase">E'lonlar</div>
            <div className="font-extrabold text-sm text-[#E53935] mt-0.5">{posts.length}</div>
          </div>
          <div className="p-3 bg-white rounded-[16px] border border-slate-200/80 text-center shadow-sm">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Komissiya</div>
            <div className="font-extrabold text-sm text-blue-600 mt-0.5">{formatCompact(commission)}</div>
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-[#111111] flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#E53935]" />
              Buyurtma holati statistikasi
            </h3>
            <span className="text-[10px] font-bold text-emerald-600">{orders.length} ta buyurtma</span>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={orderStats}
                margin={{ top: 8, right: 0, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(17, 24, 39, 0.05)' }} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" fill="#EF4444" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Telegram botdan kelgan e'lonlar Moderatsiyasi */}
        {(() => {
          const pendingList = products.filter((p) => p.approvalStatus === 'pending');
          return (
            <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#E53935]" />
                  <h2 className="font-black text-sm text-[#111827]">Telegram botdan kelgan e'lonlar</h2>
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-[#E53935]">
                  {pendingList.length} ta kutilmoqda
                </span>
              </div>

              {pendingList.length > 0 ? (
                <div className="space-y-2.5">
                  {pendingList.map((product) => (
                    <div key={product.id} className="rounded-[18px] border border-slate-200 bg-slate-50 p-3 flex gap-3 items-center">
                      <div className="w-20 h-20 shrink-0 rounded-[14px] overflow-hidden bg-slate-200 flex items-center justify-center">
                        <img src={product.images?.[0] || product.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[12px] font-black text-[#111827] leading-tight line-clamp-2">{product.title}</h3>
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">Kutilmoqda</span>
                        </div>
                        <p className="truncate text-[11px] font-bold text-slate-500">{product.seller} • {product.location}</p>
                        <p className="text-[12px] font-black text-[#E53935]">{product.price}</p>
                        {product.submittedBy && (
                          <p className="truncate text-[10px] text-slate-400">Bot foydalanuvchi: {product.submittedBy}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => approveProduct(product.id)}
                            className="rounded-[12px] bg-[#111827] py-2 text-[11px] font-black text-white hover:bg-black transition-colors"
                          >
                            Tasdiqlash
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectProduct(product.id)}
                            className="rounded-[12px] bg-white border border-slate-200 py-2 text-[11px] font-black text-[#E53935] hover:bg-slate-100 transition-colors"
                          >
                            Rad etish
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-slate-50 rounded-[16px] border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-500">Hozircha tasdiq kutayotgan Telegram bot e'lonlari yo'q</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Market e'lon berish formasi (Admin hamkor mahsulotini qo'shish) */}
        <form onSubmit={handleAdminMarketSubmit} className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
            <ClipboardCheck className="w-4.5 h-4.5 text-[#E53935]" />
            <div>
              <h2 className="font-black text-sm text-[#111827]">Marketga e'lon joylash (Admin)</h2>
              <p className="text-[10px] text-slate-400">Shartnomali hamkor mahsuloti (darhol tasdiqlanadi)</p>
            </div>
          </div>
          <input
            value={adminMarketForm.title}
            onChange={(e) => setAdminMarketForm({ ...adminMarketForm, title: e.target.value })}
            placeholder="Mahsulot nomi"
            className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30"
          />
          <input
            value={adminMarketForm.seller}
            onChange={(e) => setAdminMarketForm({ ...adminMarketForm, seller: e.target.value })}
            placeholder="Hamkor nomi (masalan: Alisher Agro)"
            className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={adminMarketForm.price}
              onChange={(e) => setAdminMarketForm({ ...adminMarketForm, price: e.target.value })}
              placeholder="8,500 so'm / kg"
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30"
            />
            <input
              value={adminMarketForm.numericPrice}
              onChange={(e) => setAdminMarketForm({ ...adminMarketForm, numericPrice: e.target.value.replace(/[^0-9]/g, '') })}
              placeholder="8500 (raqam)"
              inputMode="numeric"
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={adminMarketForm.category}
              onChange={(e) => setAdminMarketForm({ ...adminMarketForm, category: e.target.value })}
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none font-medium"
            >
              {CATEGORIES.filter((cat) => cat.id !== 'all').map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select
              value={adminMarketForm.location}
              onChange={(e) => setAdminMarketForm({ ...adminMarketForm, location: e.target.value })}
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none font-medium"
            >
              {REGIONS.filter((region) => region !== 'Barchasi').map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={adminMarketForm.minOrder}
              onChange={(e) => setAdminMarketForm({ ...adminMarketForm, minOrder: e.target.value })}
              placeholder="Min buyurtma (1 dona)"
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30"
            />
            <input
              value={adminMarketForm.discount}
              onChange={(e) => setAdminMarketForm({ ...adminMarketForm, discount: e.target.value })}
              placeholder="Belgi: Aksiya, Shartnoma..."
              className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#E53935]/30"
            />
          </div>
          <textarea
            value={adminMarketForm.imagesText}
            onChange={(e) => setAdminMarketForm({ ...adminMarketForm, imagesText: e.target.value })}
            rows={3}
            placeholder="Rasmlar URL (har bir qatorda bitta rasm havolasi)"
            className="w-full bg-slate-100 rounded-[14px] px-3.5 py-3 text-[13px] outline-none resize-none focus:ring-2 focus:ring-[#E53935]/30"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-[16px] bg-[#E53935] text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm hover:bg-[#D32F2F] transition-colors"
          >
            <PackagePlus className="w-4 h-4" /> Marketga e'lon joylash
          </button>
        </form>
      </div>
    );
  }

  // Sub-View: Edit Profile
  if (activeSubView === 'edit-profile') {
    const updateProfile = (field: keyof typeof profileForm, value: string) => {
      setProfileForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
      <div className="w-full max-w-xl mx-auto py-3 px-3 space-y-4 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-[#111111]">Profilni tahrirlash</h1>
            <p className="text-[11px] text-slate-400">Fermer sahifasi va aloqa ma'lumotlari</p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 shadow-sm space-y-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleProfileImageUpload('avatar', e.target.files?.[0])}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleProfileImageUpload('cover', e.target.files?.[0])}
          />

          <div className="relative h-28 overflow-hidden rounded-[18px] bg-slate-100">
            <img src={profileData.cover} alt="Cover" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-sm"
            >
              Cover almashtirish
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                {profileData.avatar ? (
                  <img src={profileData.avatar} alt={profileForm.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#E53935] to-[#B71C1C] text-white font-black text-2xl flex items-center justify-center">
                    {(profileForm.name || currentUser?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#E53935] text-white flex items-center justify-center shadow-sm"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="font-black text-sm text-[#111111]">{profileForm.name}</h3>
              <p className="text-xs text-slate-500">@{profileForm.handle}</p>
              <span className="inline-flex mt-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black">
                Tasdiqlangan fermer
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'name', label: 'Ism/Fermer nomi', icon: Edit3 },
              { key: 'handle', label: 'Username', icon: KeyRound },
              { key: 'phone', label: 'Telefon', icon: Phone },
              { key: 'email', label: 'Email', icon: Mail },
              { key: 'businessName', label: 'Biznes nomi', icon: Building2 },
              { key: 'location', label: 'Hudud', icon: MapPin },
            ].map((field) => {
              const Icon = field.icon;
              return (
                <label key={field.key} className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-[#E53935]" />
                    {field.label}
                  </span>
                  <input
                    value={profileForm[field.key as keyof typeof profileForm]}
                    onChange={(e) => updateProfile(field.key as keyof typeof profileForm, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-sm font-semibold text-[#111111] outline-none focus:border-[#E53935] focus:bg-white"
                  />
                </label>
              );
            })}
          </div>

          <label className="space-y-1.5 block">
            <span className="text-[11px] font-bold text-slate-500">Bio</span>
            <textarea
              value={profileForm.bio}
              onChange={(e) => updateProfile('bio', e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-sm font-semibold text-[#111111] outline-none focus:border-[#E53935] focus:bg-white resize-none"
            />
          </label>

          <button
            onClick={async () => {
              await updateUserProfile({
                name: profileForm.name,
                handle: profileForm.handle,
                email: profileForm.email,
                phone: profileForm.phone,
                avatar: profileForm.avatar,
                cover: profileForm.cover,
                location: profileForm.location,
                businessName: profileForm.businessName,
                bio: profileForm.bio,
              });
              setActiveSubView(null);
            }}
            className="w-full py-3 rounded-[16px] bg-[#E53935] text-white font-extrabold text-xs hover:bg-[#C62828] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Saqlash
          </button>
        </div>
      </div>
    );
  }

  // Sub-View: Settings
  if (activeSubView === 'settings') {
    const toggleSetting = (field: keyof typeof settingsForm) => {
      setSettingsForm((prev) => ({ ...prev, [field]: !prev[field] }));
    };
    const updateSetting = (field: keyof typeof settingsForm, value: string) => {
      setSettingsForm((prev) => ({ ...prev, [field]: value }));
    };
    const ToggleRow = ({ field, title, text, icon: Icon }: { field: keyof typeof settingsForm; title: string; text: string; icon: React.ElementType }) => (
      <button
        onClick={() => toggleSetting(field)}
        className="w-full flex items-center justify-between gap-3 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[14px] bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-[#111111] text-sm block">{title}</span>
            <span className="text-[11px] text-slate-400 leading-snug block">{text}</span>
          </div>
        </div>
        <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${settingsForm[field] ? 'bg-[#E53935]' : 'bg-slate-200'}`}>
          <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${settingsForm[field] ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
      </button>
    );

    return (
      <div className="w-full max-w-xl mx-auto py-3 px-3 space-y-4 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubView(null)}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-[#111111]">Sozlamalar</h1>
            <p className="text-[11px] text-slate-400">Profil, xavfsizlik, savdo va ilova sozlamalari</p>
          </div>
        </div>

        {/* Coming Soon Notice Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-[20px] p-3.5 flex items-start gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-[14px] bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Rocket className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xs text-amber-900">Tez kunda ishga tushiriladi</h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                Tez kunda
              </span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5 leading-snug">
              Ushbu bo'lim loyihani serverga ulash va backend integratsiyasi doirasida tez kunda to'liq ishga tusha oladi!
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 shadow-sm">
          <h3 className="font-black text-sm text-[#111111] mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#E53935]" />
            Bildirishnomalar
          </h3>
          <div className="divide-y divide-slate-100">
            <ToggleRow field="pushNotifications" title="Push-xabarlar" text="Yangi e'lonlar, chat va aksiyalar haqida xabar berish" icon={Smartphone} />
            <ToggleRow field="orderUpdates" title="Buyurtma statuslari" text="To'lov, yetkazib berish va qabul qilish yangiliklari" icon={Truck} />
            <ToggleRow field="marketingMessages" title="Marketing xabarlari" text="Chegirmalar va fermerlar uchun takliflar" icon={Store} />
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 shadow-sm">
          <h3 className="font-black text-sm text-[#111111] mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#E53935]" />
            Maxfiylik va xavfsizlik
          </h3>
          <div className="divide-y divide-slate-100">
            <ToggleRow field="showPhone" title="Telefonni ko'rsatish" text="E'lonlarda xaridorlarga telefon raqamingiz ko'rinadi" icon={Phone} />
            <ToggleRow field="twoFactor" title="Ikki bosqichli himoya" text="Kirishda SMS yoki tasdiqlash kodi so'raladi" icon={ShieldCheck} />
            <ToggleRow field="autoSaveListings" title="E'lon draftlarini saqlash" text="Yozilgan e'lonlar avtomatik draft bo'lib qoladi" icon={Bookmark} />
          </div>
        </div>

        <div className="bg-white rounded-[20px] border border-slate-200/80 p-4 shadow-sm space-y-3">
          <h3 className="font-black text-sm text-[#111111] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#E53935]" />
            Ilova va savdo sozlamalari
          </h3>

          {[
            { field: 'language', label: 'Til', icon: Globe, options: ["O'zbekcha", 'Русский', 'English'] },
            { field: 'currency', label: 'Valyuta', icon: CreditCard, options: ["So'm (UZS)", 'Dollar (USD)', 'Rubl (RUB)'] },
            { field: 'deliveryRegion', label: 'Yetkazib berish hududi', icon: Truck, options: ["Farg'ona vodiysi", "Butun O'zbekiston", 'Faqat mahalliy'] },
            { field: 'paymentMethod', label: "To'lov usuli", icon: CreditCard, options: ['Naqd va karta', 'Faqat naqd', 'Bank o\'tkazma'] },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <label key={item.field} className="block space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-[#E53935]" />
                  {item.label}
                </span>
                <select
                  value={settingsForm[item.field as keyof typeof settingsForm] as string}
                  onChange={(e) => updateSetting(item.field as keyof typeof settingsForm, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-sm font-bold text-[#111111] outline-none focus:border-[#E53935] focus:bg-white"
                >
                  {item.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setSettingsForm((prev) => {
                const nextDarkMode = !prev.darkMode;
                showToast(nextDarkMode ? 'Tungi rejim tanlandi' : 'Yorug rejim tanlandi');
                return { ...prev, darkMode: nextDarkMode };
              });
            }}
            className="py-3 rounded-[18px] bg-white border border-slate-200/80 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
          >
            <Moon className="w-4 h-4" />
            {settingsForm.darkMode ? 'Yorug rejim' : 'Tungi rejim'}
          </button>
          <button
            onClick={() => {
              window.localStorage.removeItem('onbozor-comments-cache');
              showToast("Vaqtinchalik ma'lumotlar tozalandi");
            }}
            className="py-3 rounded-[18px] bg-white border border-slate-200/80 text-slate-800 font-bold text-xs shadow-sm"
          >
            Vaqtinchalik ma'lumot
          </button>
        </div>

        <button
          onClick={() => {
            showToast('Sozlamalar saqlandi!');
            setActiveSubView(null);
          }}
          className="w-full py-3 rounded-[18px] bg-[#111111] text-white font-extrabold text-xs hover:bg-[#E53935] transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          Sozlamalarni saqlash
        </button>
      </div>
    );
  }

  // Standard Instagram Profile View
  return (
    <div className="w-full max-w-xl mx-auto py-2 px-3 space-y-4 select-none">
      {/* Profile Header Card */}
      <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm">
        {/* Cover Photo */}
        <div className="h-32 bg-slate-200 relative overflow-hidden rounded-t-[20px]">
          <img src={profileData.cover} alt="Cover" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setActiveSubView('edit-profile')}
            className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-sm opacity-0 transition-opacity hover:bg-black/70 sm:opacity-100"
          >
            Tahrirlash
          </button>
        </div>

        {/* Profile Details */}
        <div className="p-4 relative">
          {/* Floating Avatar */}
          <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden absolute -top-10 left-4 shadow-md bg-white">
            {profileData.avatar ? (
              <img src={profileData.avatar} alt={profileForm.name || 'User'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#E53935] to-[#B71C1C] text-white font-black text-2xl flex items-center justify-center">
                {(profileForm.name || currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="pt-10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="truncate font-extrabold text-base sm:text-lg text-[#111111]">
                    {currentUser?.name || profileData.name || 'Fermer'}
                  </h2>
                  {profileData.verified && (
                    <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="w-3 h-3 text-[#E53935]" />
                  <span>{profileData.location}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="px-3 sm:px-4 py-2 rounded-[16px] bg-[#E53935] hover:bg-[#D32F2F] text-white font-bold text-xs shadow-md transition-colors whitespace-nowrap"
                >
                  + E'lon berish
                </button>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    aria-label="Profil menyusi"
                    aria-expanded={isProfileMenuOpen}
                    className="w-9 h-9 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                  >
                    <EllipsisVertical className="w-5 h-5" />
                  </button>

                  {isProfileMenuOpen && (
                    <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-xl shadow-slate-900/10">
                      {profileMenuItems.map((menu) => {
                        const Icon = menu.icon;
                        return (
                          <button
                            key={menu.id}
                            type="button"
                            onClick={() => handleProfileMenuClick(menu.id, menu.label)}
                            className={`w-full flex items-center justify-between px-3.5 py-3 text-left hover:bg-slate-50 transition-colors ${
                              menu.isSpecial ? 'text-[#E53935]' : 'text-slate-800'
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`w-8 h-8 rounded-[12px] flex shrink-0 items-center justify-center ${
                                  menu.isSpecial ? 'bg-red-50 text-[#E53935]' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="truncate text-xs sm:text-sm font-bold">{menu.label}</span>
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {menu.comingSoon && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full border border-amber-200/80 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                                  Tez kunda
                                </span>
                              )}
                              {menu.badge !== undefined && menu.badge > 0 && (
                                <span className="px-2 py-0.5 bg-[#E53935] text-white text-[10px] font-extrabold rounded-full">
                                  {menu.badge}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {profileData.bio && (
              <p className="text-xs text-slate-700 leading-relaxed">{profileData.bio}</p>
            )}

            {/* Followers / Following Counters */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
              <button type="button" onClick={() => setActiveGridTab('posts')} className="text-center">
                <span className="font-extrabold text-sm text-[#111111] block">{profileData.postsCount}</span>
                <span className="text-[11px] text-slate-400">E'lonlar</span>
              </button>
              <button type="button" onClick={() => showToast(`${profileData.followers} obunachi`)} className="text-center">
                <span className="font-extrabold text-sm text-[#111111] block">{profileData.followers}</span>
                <span className="text-[11px] text-slate-400">Obunachilar</span>
              </button>
              <button type="button" onClick={() => showToast(`${profileData.views} marta ko'rilgan`)} className="text-center">
                <span className="font-extrabold text-sm text-[#111111] block">{profileData.views}</span>
                <span className="text-[11px] text-slate-400">Ko'rilgan</span>
              </button>
              <button type="button" onClick={() => showToast(`${profileData.following} ta obuna`)} className="text-center">
                <span className="font-extrabold text-sm text-[#111111] block">{profileData.following}</span>
                <span className="text-[11px] text-slate-400">Obunalar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Tabs */}
      <div className="bg-white rounded-[20px] border border-slate-200/80 overflow-hidden shadow-sm">
        <Tabs
          tabs={[
            { id: 'posts', label: "E'lonlarim", icon: <Grid className="w-4 h-4" /> },
            { id: 'saved', label: 'Saqlanganlar', icon: <Bookmark className="w-4 h-4" /> },
          ]}
          activeTab={activeGridTab}
          onChange={(id) => setActiveGridTab(id)}
        />

        <div className="grid grid-cols-3 gap-0.5 p-1">
          {gridItems.length > 0 ? (
            gridItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setProductDetail(item)}
                className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer group rounded-[10px]"
              >
                <img
                  src={item.posterUrl || item.mediaUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white text-[10px] font-extrabold">
                  {activeGridTab === 'posts' ? (
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title="Tahrirlash"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditModalItem(item);
                        }}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="O'chirish"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm("Rostdan ham ushbu e'lonni o'chirmoqchimisiz?")) {
                            deletePost(item.id);
                          }
                        }}
                        className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : <div />}
                  <span className="line-clamp-2 text-center pb-1">{item.title}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3">
              <EmptyState
                icon="📢"
                title={activeGridTab === 'posts' ? "Hozircha sizning e'lonlaringiz yo'q" : 'Saqlangan e\'lonlar yo\'q'}
                description={
                  activeGridTab === 'posts'
                    ? 'Birinchisi e\'lon berish orqali profilingizda ko\'rinadigan ma\'lumotlarni yaratishingiz mumkin.'
                    : 'Saqlangan e\'lonlarni bu yerda ko\'rish uchun ularga qayta murojaat qiling.'
                }
                action={
                  activeGridTab === 'posts'
                    ? {
                        label: "E'lon berish",
                        onClick: () => setCreateModalOpen(true),
                      }
                    : undefined
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
