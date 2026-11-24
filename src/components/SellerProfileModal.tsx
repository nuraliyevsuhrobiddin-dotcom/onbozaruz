import React, { useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { SoldBadge } from './ui/SoldBadge';
import { useAgroStore } from '../store/useAgroStore';
import { userInteractionsRepository } from '../api/repositories/userInteractionsRepository';
import { CheckCircle2, MapPin, PhoneCall, Send, UserPlus, UserCheck, UserRound, Pencil, Package, MessageCircle } from 'lucide-react';
import type { Post, Product } from '../data/catalog';

export const SellerProfileModal: React.FC = () => {
  const { selectedSellerModal, setSelectedSellerModal, posts, products, followedSellerIds, toggleFollowSeller, setProductDetail, openVideoViewer, showToast, currentUser, setAuthPromptOpen, setActiveTab: openNavTab, setActiveSubView, closeVideoViewer } = useAgroStore();
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'products'>('all');
  // Server count plus whether the viewer was counted in it, so a follow/unfollow shows at once.
  const [followerBase, setFollowerBase] = useState<{ sellerId: string; count: number; following: boolean } | null>(null);
  const modalSellerId = selectedSellerModal?.sellerId || '';
  useEffect(() => {
    if (!modalSellerId) return;
    let cancelled = false;
    const settle = (count: number | null) => {
      if (cancelled) return;
      const following = useAgroStore.getState().followedSellerIds.includes(modalSellerId);
      setFollowerBase({ sellerId: modalSellerId, count: count ?? (following ? 1 : 0), following });
    };
    userInteractionsRepository.countSellerFollowers(modalSellerId).then(settle, () => settle(null));
    return () => { cancelled = true; };
  }, [modalSellerId]);
  if (!selectedSellerModal) return null;
  const sellerName = selectedSellerModal.sellerName || 'Sotuvchi';
  const sellerId = selectedSellerModal.sellerId || sellerName;
  const sellerPosts = posts.filter(p => p.sellerId === sellerId || p.sellerName === sellerName || p.userId === sellerId);
  const sellerProducts = products.filter(p => p.sellerId === sellerId || p.seller === sellerName || p.submittedBy === sellerId);
  const items: (Post | Product)[] = [...sellerPosts, ...sellerProducts];
  const displayItems = activeTab === 'posts' ? sellerPosts : activeTab === 'products' ? sellerProducts : items;
  const following = followedSellerIds.includes(sellerId);
  const isOwnProfile = Boolean(currentUser && currentUser.id === sellerId);
  const followerCount = !modalSellerId ? 0
    : followerBase && followerBase.sellerId === sellerId
      ? Math.max(0, followerBase.count + (following ? 1 : 0) - (followerBase.following ? 1 : 0))
      : null;
  const openOwnProfile = (editProfile: boolean) => {
    setSelectedSellerModal(null);
    closeVideoViewer();
    openNavTab('profile');
    if (editProfile) setActiveSubView('edit-profile');
  };
  const phone = selectedSellerModal.phone || '';
  const telegram = selectedSellerModal.telegram?.replace(/^@/, '').replace(/\s+/g, '') || '';
  const avatar = selectedSellerModal.sellerAvatar || '';
  const initials = sellerName.trim().charAt(0).toUpperCase() || 'S';
  const totalViews = sellerPosts.reduce((sum, post) => sum + (post.viewsCount || 0), 0);
  const selectItem = (item: Post | Product) => {
    setSelectedSellerModal(null);
    if ('type' in item && item.type === 'video') {
      const sellerVideoPosts = posts.filter(
        (post) => (post.sellerId === sellerId || post.sellerName === sellerName) && post.type === 'video'
      );
      const videoIndex = sellerVideoPosts.findIndex((post) => post.id === item.id);
      if (sellerVideoPosts.length > 0) {
        openVideoViewer(sellerVideoPosts, Math.max(0, videoIndex));
      } else {
        setProductDetail(item);
      }
    } else {
      setProductDetail(item);
    }
  };
  return <Modal isOpen onClose={() => setSelectedSellerModal(null)} title="Sotuvchi profili">
    <div className="space-y-4 pb-2">
      <section className="rounded-[24px] border border-[#eadfd4] bg-[#fffaf5] p-5">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#e54b3f] shadow-md flex items-center justify-center">
            {avatar ? <img src={avatar} alt={sellerName} className="h-full w-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : <span className="text-3xl font-black text-white">{initials}</span>}
          </div>
          <div className="min-w-0"><div className="flex items-center gap-1.5"><h3 className="truncate text-lg font-black text-[#201a17]">{sellerName}</h3>{selectedSellerModal.verified && <CheckCircle2 className="h-4 w-4 shrink-0 fill-blue-100 text-blue-500" />}{isOwnProfile && <span className="shrink-0 rounded-full bg-[#e54b3f]/10 px-2 py-0.5 text-[10px] font-black text-[#e54b3f]">Siz</span>}</div><p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500"><MapPin className="h-3.5 w-3.5 text-[#e54b3f]" />{selectedSellerModal.location || "O'zbekiston"}</p></div>
        </div>
        {selectedSellerModal.bio && <p className="mt-4 text-sm leading-relaxed text-slate-600">{selectedSellerModal.bio}</p>}
        <div className="mt-5 grid grid-cols-3 border-t border-[#eadfd4] pt-4 text-center"><div><b className="block text-base">{items.length}</b><span className="text-[10px] font-bold uppercase text-slate-500">E'lonlar</span></div><div><b className="block text-base">{totalViews}</b><span className="text-[10px] font-bold uppercase text-slate-500">Ko'rishlar</span></div><div><b className="block text-base">{followerCount ?? '…'}</b><span className="text-[10px] font-bold uppercase text-slate-500">Obunachilar</span></div></div>
      </section>
      {isOwnProfile ? <div className="grid grid-cols-2 gap-2"><button onClick={() => openOwnProfile(false)} className="rounded-2xl bg-[#e54b3f] py-3 text-xs font-black text-white"><UserRound className="mr-1 inline h-4 w-4" />Mening profilim</button><button onClick={() => openOwnProfile(true)} className="rounded-2xl bg-slate-100 py-3 text-xs font-black text-slate-700"><Pencil className="mr-1 inline h-4 w-4" />Profilni tahrirlash</button></div> : <div className="grid grid-cols-3 gap-2"><button onClick={() => toggleFollowSeller(sellerId, sellerName)} className={`rounded-2xl py-3 text-xs font-black ${following ? 'bg-slate-100 text-slate-700' : 'bg-[#e54b3f] text-white'}`}>{following ? <><UserCheck className="mr-1 inline h-4 w-4" />Obunadasiz</> : <><UserPlus className="mr-1 inline h-4 w-4" />Obuna</>}</button>{phone ? <a href={currentUser ? `tel:${phone.replace(/[^+\d]/g, '')}` : undefined} onClick={(e) => { if (!currentUser) { e.preventDefault(); showToast("Bog'lanish uchun avval tizimga kiring"); setSelectedSellerModal(null); setAuthPromptOpen(true); } }} className="rounded-2xl bg-slate-900 py-3 text-center text-xs font-black text-white cursor-pointer"><PhoneCall className="mr-1 inline h-4 w-4 text-emerald-400" />Aloqa</a> : <button onClick={() => showToast('Telefon raqami ko‘rsatilmagan')} className="rounded-2xl bg-slate-100 py-3 text-xs font-black text-slate-500"><MessageCircle className="mr-1 inline h-4 w-4" />Aloqa</button>}{telegram ? <a href={currentUser ? `https://t.me/${telegram}` : undefined} target={currentUser ? "_blank" : undefined} rel="noreferrer" onClick={(e) => { if (!currentUser) { e.preventDefault(); showToast("Bog'lanish uchun avval tizimga kiring"); setSelectedSellerModal(null); setAuthPromptOpen(true); } }} className="rounded-2xl bg-[#0088cc] py-3 text-center text-xs font-black text-white cursor-pointer"><Send className="mr-1 inline h-4 w-4" />Telegram</a> : <button onClick={() => showToast('Telegram manzili ko‘rsatilmagan')} className="rounded-2xl bg-slate-100 py-3 text-xs font-black text-slate-500">Telegram</button>}</div>}
      <div className="flex border-b border-slate-200">{[['all','Barchasi',items.length],['posts',"E'lonlar",sellerPosts.length],['products','Market',sellerProducts.length]].map(([id,label,count]) => <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={`flex-1 border-b-2 py-3 text-xs font-black ${activeTab === id ? 'border-[#e54b3f] text-[#e54b3f]' : 'border-transparent text-slate-400'}`}>{label} <span className="text-[10px]">{count}</span></button>)}</div>
      <div className="max-h-[min(48vh,420px)] overflow-y-auto"><div className="grid grid-cols-3 gap-1">{displayItems.length ? displayItems.map(item => { const image = 'image' in item ? item.image : item.posterUrl || item.mediaUrl; const pending = 'status' in item && (item as Post & { status?: string }).status === 'pending'; return <button key={item.id} onClick={() => selectItem(item)} className="relative aspect-square overflow-hidden bg-slate-100 text-left"><img src={image || '/logo.png?v=2'} alt={item.title} className="h-full w-full object-cover" onError={e => { e.currentTarget.src = '/logo.png?v=2'; }} />{pending && <span className="absolute left-1 top-1 rounded-full bg-amber-300 px-1.5 py-0.5 text-[8px] font-black text-amber-950">Kutilmoqda</span>}{'isSold' in item && item.isSold && <SoldBadge size="sm" className="absolute right-1 top-1" />}<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-1.5 pt-5 text-[10px] font-bold text-white">{item.title}</span></button>; }) : <div className="col-span-3 py-10 text-center text-xs font-bold text-slate-400"><Package className="mx-auto mb-2 h-7 w-7" />E'lonlar topilmadi</div>}</div></div>
    </div>
  </Modal>;
};
