import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { useAgroStore } from '../store/useAgroStore';
import {
  CheckCircle2,
  MapPin,
  PhoneCall,
  Send,
  UserPlus,
  UserCheck,
  Package,
  Eye,
  Star,
  Sparkles,
  Grid,
} from 'lucide-react';
import type { Post, Product } from '../data/mockAgroData';

export const SellerProfileModal: React.FC = () => {
  const {
    selectedSellerModal,
    setSelectedSellerModal,
    posts,
    products,
    followedSellerIds,
    toggleFollowSeller,
    setProductDetail,
    openVideoViewer,
    showToast,
  } = useAgroStore();

  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'products'>('all');

  if (!selectedSellerModal) return null;

  const sellerName = selectedSellerModal.sellerName || 'Fermer';
  const sellerId = selectedSellerModal.sellerId || sellerName;
  const isFollowing = followedSellerIds.includes(sellerId);

  // Filter posts & products by this seller
  const sellerPosts = posts.filter(
    (p) =>
      p.sellerName === sellerName ||
      p.sellerId === sellerId ||
      (selectedSellerModal.sellerId && p.userId === selectedSellerModal.sellerId)
  );

  const sellerProducts = products.filter(
    (p) =>
      p.seller === sellerName ||
      p.sellerId === sellerId ||
      (selectedSellerModal.sellerId && p.submittedBy === selectedSellerModal.sellerId)
  );

  const allItems: (Post | Product)[] = [...sellerPosts, ...sellerProducts];
  const displayItems =
    activeTab === 'posts'
      ? sellerPosts
      : activeTab === 'products'
      ? sellerProducts
      : allItems;

  const totalViews = sellerPosts.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
  const avatar = selectedSellerModal.sellerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80';
  const location = selectedSellerModal.location || "O'zbekiston";
  const phone = selectedSellerModal.phone || '+998 90 123 45 67';
  const cleanPhone = phone.replace(/[^+\d]/g, '');
  const telegram = selectedSellerModal.telegram
    ? selectedSellerModal.telegram.replace(/^@/, '').replace(/\s+/g, '')
    : '';

  const handleSelectItem = (item: Post | Product) => {
    setSelectedSellerModal(null);
    if ('mediaUrl' in item || 'type' in item) {
      const postItem = item as Post;
      const index = posts.findIndex((p) => p.id === postItem.id);
      openVideoViewer(posts, index >= 0 ? index : 0);
    } else {
      setProductDetail(item as Product);
    }
  };

  return (
    <Modal
      isOpen={Boolean(selectedSellerModal)}
      onClose={() => setSelectedSellerModal(null)}
      title="Sotuvchi profili"
    >
      <div className="space-y-4 select-none pb-2">
        {/* Cover & Avatar Header */}
        <div className="relative rounded-[22px] overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white shadow-md">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative flex items-center gap-3.5">
            {/* Avatar */}
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/80 shadow-md shrink-0 bg-slate-700 flex items-center justify-center">
              <img
                src={avatar}
                alt={sellerName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>

            {/* Seller Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-base text-white truncate max-w-[180px]">{sellerName}</h3>
                {(selectedSellerModal.verified ?? true) && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-500/20 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-white/70 flex items-center gap-1 truncate font-medium">
                <MapPin className="w-3 h-3 text-[#E53935]" />
                {location}
              </p>
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> Rasmiy fermer
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
            <div>
              <span className="font-black text-sm text-white block">{allItems.length}</span>
              <span className="text-[10px] text-white/60 font-bold uppercase block">E'lonlar</span>
            </div>
            <div>
              <span className="font-black text-sm text-white block">{totalViews > 0 ? totalViews : 124}</span>
              <span className="text-[10px] text-white/60 font-bold uppercase block">Ko'rishlar</span>
            </div>
            <div>
              <span className="font-black text-sm text-white block">{isFollowing ? 13 : 12}</span>
              <span className="text-[10px] text-white/60 font-bold uppercase block">Obunachilar</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Follow, Call, Telegram */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => toggleFollowSeller(sellerId, sellerName)}
            className={`col-span-1 py-2.5 rounded-[16px] font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              isFollowing
                ? 'bg-slate-100 text-slate-800 border border-slate-200'
                : 'bg-[#E53935] hover:bg-[#C62828] text-white'
            }`}
          >
            {isFollowing ? (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Obunadasiz</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Obuna</span>
              </>
            )}
          </button>

          <a
            href={`tel:${cleanPhone}`}
            onClick={() => showToast("Qo'ng'iroq oynasi ochildi")}
            className="col-span-1 py-2.5 rounded-[16px] bg-[#111827] hover:bg-black text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span>Qo'ng'iroq</span>
          </a>

          {telegram ? (
            <a
              href={`https://t.me/${telegram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-1 py-2.5 rounded-[16px] bg-[#0088cc] hover:bg-[#0077bb] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Telegram</span>
            </a>
          ) : (
            <button
              onClick={() => showToast(`Manzil: ${location}`)}
              className="col-span-1 py-2.5 rounded-[16px] bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[#E53935]" />
              <span>Xarita</span>
            </button>
          )}
        </div>

        {/* Listings Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 pt-1">
          {[
            { id: 'all', label: 'Barchasi', count: allItems.length },
            { id: 'posts', label: "E'lonlar", count: sellerPosts.length },
            { id: 'products', label: 'Market', count: sellerProducts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-[12px] text-xs font-black transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#111827] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Seller Items Grid */}
        <div className="max-h-64 overflow-y-auto no-scrollbar pt-1">
          {displayItems.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {displayItems.map((item) => {
                const imgUrl = 'image' in item ? item.image : item.mediaUrl;
                const itemTitle = item.title;
                const itemPrice = item.price;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="group relative aspect-square rounded-[16px] overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-xs hover:shadow-md transition-all"
                  >
                    <img
                      src={imgUrl || '/logo.png'}
                      alt={itemTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 p-1.5 flex flex-col justify-end">
                      <span className="text-[10px] font-black text-white truncate block">{itemTitle}</span>
                      <span className="text-[9px] font-bold text-amber-300 truncate block">{itemPrice}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-[18px] border border-slate-100 space-y-1">
              <Package className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs font-black text-slate-600">E'lonlar topilmadi</p>
              <p className="text-[10px] text-slate-400 font-medium">Ushbu sotuvchi hali e'lon joylamagan.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
