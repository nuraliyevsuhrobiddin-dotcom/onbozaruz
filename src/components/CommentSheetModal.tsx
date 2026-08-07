import React, { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from './ui/BottomSheet';
import { useAgroStore } from '../store/useAgroStore';
import { Send, Heart, MessageCircle } from 'lucide-react';

type CommentItem = {
  id: number;
  user: string;
  text: string;
  time: string;
  liked?: boolean;
};

export const CommentSheetModal: React.FC = () => {
  const { commentPost, setCommentPost, showToast, addCommentToPost, currentUser } = useAgroStore();
  const [newComment, setNewComment] = useState('');
  const storageKey = useMemo(() => commentPost ? `onbozor-comments-${commentPost.id}` : '', [commentPost]);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      setCommentsList(saved ? JSON.parse(saved) : []);
    } catch {
      setCommentsList([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(commentsList));
  }, [commentsList, storageKey]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    const userName = currentUser?.name || currentUser?.handle || 'Foydalanuvchi';
    setCommentsList((items) => [
      ...items,
      { id: Date.now(), user: userName, text, time: 'Hozirgina' },
    ]);
    if (commentPost) {
      addCommentToPost(commentPost.id);
    }
    setNewComment('');
    showToast('Izoh qo\'shildi');
  };

  const toggleCommentLike = (id: number) => {
    setCommentsList((items) => items.map((item) => item.id === id ? { ...item, liked: !item.liked } : item));
  };

  return (
    <BottomSheet
      isOpen={Boolean(commentPost)}
      onClose={() => setCommentPost(null)}
      title="Izohlar"
    >
      <div className="space-y-4">
        {commentPost && (
          <div className="rounded-[18px] bg-slate-50 border border-slate-100 p-3">
            <p className="text-[11px] font-bold text-slate-400 mb-1">{commentPost.sellerName}</p>
            <p className="text-xs font-semibold text-[#111827] line-clamp-2">{commentPost.title}</p>
          </div>
        )}

        <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
          {commentsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <MessageCircle className="w-8 h-8 text-slate-200" />
              <p className="text-xs font-semibold text-slate-400">Hozircha izoh yo'q</p>
              <p className="text-[11px] text-slate-300">Birinchi izoh qoldirib ko'ring!</p>
            </div>
          ) : (
            commentsList.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-[#111827] mr-1.5">{c.user}</span>
                  <span className="text-slate-700 break-words">{c.text}</span>
                  <div className="text-[10px] text-slate-400">{c.time}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCommentLike(c.id)}
                  className={`transition-colors ${c.liked ? 'text-[#E53935]' : 'text-slate-300 hover:text-[#E53935]'}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${c.liked ? 'fill-current' : ''}`} />
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Izoh qoldiring..."
            className="flex-1 bg-slate-100 border-0 rounded-[20px] px-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="p-2.5 rounded-full bg-[#E53935] text-white hover:bg-[#D32F2F] transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </BottomSheet>
  );
};
