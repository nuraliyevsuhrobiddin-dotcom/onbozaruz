import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  CheckCircle2,
  PhoneCall,
  MapPin,
  Tag,
  Eye,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Flag,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Post } from '../data/mockAgroData';
import { useAgroStore } from '../store/useAgroStore';
import { VideoPlayer } from './ui/VideoPlayer';

interface FeedCardProps {
  post: Post;
  allPosts: Post[];
  index?: number;
}

export const FeedCard: React.FC<FeedCardProps> = ({ post, allPosts, index = 0 }) => {
  const {
    toggleLikePost,
    toggleSavePost,
    setCommentPost,
    setSharePost,
    setProductDetail,
    likedPostIds,
    savedPostIds,
    openVideoViewer,
    setEditModalItem,
    deletePost,
    showToast,
    incrementPostViews,
    isAdminUser,
    setSelectedSellerModal,
  } = useAgroStore();

  const isLiked = likedPostIds.includes(post.id);
  const isSaved = savedPostIds.includes(post.id);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const viewedRef = useRef(false);

  // Track real views with Intersection Observer
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          // Count view after 1.5 seconds of being visible (not just scroll-past)
          const timer = setTimeout(() => {
            incrementPostViews(post.id);
          }, 1500);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.5 } // 50% of card must be visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.id, incrementPostViews]);

  const canManage = Boolean(isAdminUser);

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHeartAnim(true);
    if (!isLiked) {
      toggleLikePost(post.id);
    }
    confetti({
      particleCount: 20,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#E53935', '#FF6B6B', '#FFFFFF'],
      disableForReducedMotion: true,
    });
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  const handleMediaClick = () => {
    if (post.type !== 'video') return;
    const videos = allPosts.filter((item) => item.type === 'video');
    const postIdx = videos.findIndex((item) => item.id === post.id);
    openVideoViewer(videos, postIdx !== -1 ? postIdx : 0);
  };

  return (
    <motion.article
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className="w-full max-w-[650px] bg-white rounded-none sm:rounded-[20px] border-y border-slate-200/80 sm:border overflow-hidden mb-3 sm:mb-6 select-none shadow-sm sm:shadow-md hover:shadow-lg transition-shadow duration-200"
    >
      {/* ── Post Header ── */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 relative">
        <button
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity active:scale-[0.98]"
          onClick={() =>
            setSelectedSellerModal({
              sellerId: post.sellerId || post.userId,
              sellerName: post.sellerName,
              sellerAvatar: post.sellerAvatar,
              location: post.location,
              phone: post.phone,
              telegram: post.telegram,
              verified: post.verified,
            })
          }
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-100 shrink-0">
            <img
              src={post.sellerAvatar}
              alt={post.sellerName}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="font-bold text-[14px] text-[#111111]">{post.sellerName}</span>
              {post.verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
              <MapPin className="w-3 h-3 text-[#E53935]" />
              <span>{post.location}</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 relative">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
            <Tag className="w-3 h-3 text-[#E53935]" />
            {post.categoryName}
          </span>
          
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-9 z-30 w-44 bg-white rounded-[16px] border border-slate-200 shadow-xl overflow-hidden py-1">
                {canManage ? (
                  <>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setEditModalItem(post);
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4 text-[#E53935]" />
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (window.confirm("Rostdan ham ushbu e'lonni o'chirmoqchimisiz?")) {
                          deletePost(post.id);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-bold text-[#E53935] hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <Trash2 className="w-4 h-4 text-[#E53935]" />
                      O'chirish
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigator.clipboard?.writeText(window.location.href);
                        showToast("E'lon havolasi nusxalandi!");
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                      Havolani nusxalash
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        showToast("Shikoyat qabul qilindi");
                      }}
                      className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                    >
                      <Flag className="w-4 h-4 text-slate-400" />
                      Shikoyat qilish
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Media Section (9:16 Video / 4:5 Image) ── */}
      <div
        className={`relative w-full bg-slate-900 overflow-hidden cursor-pointer ${
          post.type === 'video' ? 'bg-white' : 'aspect-[4/5] max-h-[500px]'
        }`}
        onClick={handleMediaClick}
        onDoubleClick={handleDoubleTap}
      >
        {post.type === 'video' ? (
          <VideoPlayer src={post.mediaUrl} poster={post.posterUrl} fit="auto" />
        ) : (
          <img
            src={mediaError ? '/logo.png' : post.posterUrl || post.mediaUrl || '/logo.png'}
            alt={post.title}
            loading="lazy"
            onError={() => setMediaError(true)}
            className="w-full h-full object-cover"
          />
        )}

        {/* Price Badge */}
        <div className="absolute top-3 left-3 bg-[#111111]/90 text-white px-3 py-1.5 rounded-full text-[12px] font-extrabold tracking-tight shadow-md">
          <span className="text-[#22C55E]">{post.price}</span>
        </div>

        {/* Double-tap heart */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Heart className="w-24 h-24 text-white fill-[#E53935] drop-shadow-2xl animate-heart-pulse" />
          </div>
        )}
      </div>

      {/* ── Actions Bar ── */}
      <div className="px-4 pt-3 pb-4 space-y-2.5">
        {/* Like / Comment / Share / Save */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 1.3 }}
              onClick={() => toggleLikePost(post.id)}
            >
              <Heart
                className={`w-6 h-6 transition-all duration-200 ${
                  isLiked
                    ? 'fill-[#E53935] text-[#E53935] scale-110'
                    : 'text-[#111111] stroke-[1.75]'
                }`}
              />
            </motion.button>
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={() => setCommentPost(post)}
              className="text-[#111111] hover:text-slate-500 transition-colors"
            >
              <MessageCircle className="w-6 h-6 stroke-[1.75]" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 1.2 }}
              onClick={() => setSharePost(post)}
              className="text-[#111111] hover:text-slate-500 transition-colors"
            >
              <Send className="w-6 h-6 stroke-[1.75]" />
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 1.2 }}
            onClick={() => toggleSavePost(post.id)}
          >
            <Bookmark
              className={`w-6 h-6 transition-all duration-200 ${
                isSaved
                  ? 'fill-[#E53935] text-[#E53935]'
                  : 'text-[#111111] stroke-[1.75]'
              }`}
            />
          </motion.button>
        </div>

        {/* Likes count + Views count */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-[13px] text-[#111111]">
            {post.likesCount.toLocaleString()} ta layk
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            <Eye className="w-3.5 h-3.5" />
            <span>{(post.viewsCount || 0).toLocaleString()} ta ko'rish</span>
          </div>
        </div>

        {/* Caption */}
        <div className="text-[13px] text-slate-800 leading-snug">
          <span className="font-bold text-[#111111] mr-1.5">{post.sellerName}</span>
          <span
            onClick={() => setProductDetail(post)}
            className="cursor-pointer hover:underline"
          >
            {post.title}
          </span>
        </div>

        {/* Condition & Min Order info */}
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
          {post.condition && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              ✨ {post.condition}
            </span>
          )}
          {post.minOrder && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              📦 Min: {post.minOrder}
            </span>
          )}
        </div>

        {/* Comments link */}
        <button
          onClick={() => setCommentPost(post)}
          className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors font-medium block"
        >
          Barcha {post.commentsCount} izohni ko'rish
        </button>

        {/* Date */}
        <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
          {post.date}
        </div>

        {/* Contact CTA */}
        <div className="flex gap-2 pt-1">
          <motion.a
            href={`tel:${post.phone.replace(/\s+/g, '').replace(/[()]/g, '')}`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-2.5 rounded-[16px] bg-[#E53935] hover:bg-[#D32F2F] text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Bog'lanish</span>
          </motion.a>
          {post.telegram && (
            <motion.a
              href={`https://t.me/${post.telegram.replace(/^@/, '').replace(/\s+/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              whileTap={{ scale: 0.95 }}
              title="Telegram orqali bog'lanish"
              className="w-10 h-10 rounded-[16px] bg-[#0088cc] hover:bg-[#0077bb] text-white flex items-center justify-center transition-colors shrink-0 shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </motion.a>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setProductDetail(post)}
            className="w-10 h-10 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-[#111111] flex items-center justify-center transition-colors shrink-0"
          >
            <Eye className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};
