import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Post } from '../../data/mockAgroData';
import { adminRepository } from '../../api/adminRepository';

const REJECTION_REASONS = [
  "Rasm sifati talabga javob bermaydi",
  "Noto'g'ri kategoriya tanlangan",
  "Shubhali yoki aldamchi e'lon",
  "Narx yoki miqdor noto'g'ri ko'rsatilgan",
  "Taqiqlangan mahsulot yoki xizmat",
  "Takroriy e'lon (dublikat)",
  "To'liq ma'lumot berilmagan",
];

type PostStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'blocked';

interface AdminPostsTabProps {
  posts: Post[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

export const AdminPostsTab: React.FC<AdminPostsTabProps> = ({
  posts, onApprove, onReject, onDelete, onLogAction, showToast,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PostStatus>('all');
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isRejectSubmitting, setIsRejectSubmitting] = useState(false);

  const filtered = posts.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sellerName.toLowerCase().includes(search.toLowerCase());
    const postStatus = (p as any).status || 'approved';
    const matchStatus = filterStatus === 'all' || postStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  const pending = posts.filter((p) => (p as any).status === 'pending').length;

  const handleApprove = async (post: Post) => {
    setActingId(post.id);
    try {
      await adminRepository.updatePostModeration(post.id, 'approved');
      await onLogAction('approve_post', post.id, { status: 'pending' }, { status: 'approved' });
      onApprove(post.id);
      showToast("E'lon tasdiqlandi!");
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    const finalReason = rejectReason === 'Boshqa sabab...' ? customReason.trim() : rejectReason;
    if (!finalReason) { showToast('Rad etish sababini kiriting'); return; }

    setIsRejectSubmitting(true);
    try {
      await adminRepository.updatePostModeration(rejectModal.id, 'rejected', finalReason);
      await onLogAction('reject_post', rejectModal.id, { status: 'pending' }, { status: 'rejected', reason: finalReason });
      onReject(rejectModal.id);
      showToast("E'lon rad etildi: " + finalReason);
      setRejectModal(null);
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setIsRejectSubmitting(false);
    }
  };

  const handleDelete = async (post: Post) => {
    if (!window.confirm(`"${post.title}" — o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.`)) return;
    setActingId(post.id);
    try {
      await adminRepository.deletePostByAdmin(post.id);
      await onLogAction('delete_post', post.id, { title: post.title }, null);
      onDelete(post.id);
      showToast("E'lon o'chirildi");
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-black text-xl text-[#111827]">E'lonlar moderatsiyasi</h2>
          <p className="text-xs text-slate-400 font-medium">{posts.length} ta e'lon · {pending} ta kutmoqda</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="E'lon yoki sotuvchi..."
            className="w-full pl-9 pr-3 py-2 rounded-[14px] border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-[#E53935] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'pending', 'approved', 'rejected', 'blocked'] as PostStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1.5 rounded-[12px] text-[10px] font-black transition-colors ${
                filterStatus === s ? 'bg-[#111827] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'Barchasi' : s === 'pending' ? 'Kutmoqda' : s === 'approved' ? 'Tasdiqlangan' : s === 'rejected' ? 'Rad etilgan' : 'Bloklangan'}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-[22px] border border-slate-200/80">
            <p className="text-xs font-bold text-slate-400">E'lonlar topilmadi</p>
          </div>
        ) : (
          filtered.map((post) => {
            const postStatus = (post as any).status || 'approved';
            const statusColors: Record<string, string> = {
              pending: 'bg-amber-50 text-amber-700',
              approved: 'bg-emerald-50 text-emerald-700',
              rejected: 'bg-red-50 text-red-700',
              blocked: 'bg-slate-100 text-slate-600',
            };
            return (
              <div key={post.id} className="bg-white rounded-[20px] border border-slate-200/80 p-3 shadow-sm flex items-center gap-3">
                <img
                  src={post.posterUrl || post.mediaUrl}
                  alt={post.title}
                  className="w-14 h-14 rounded-[14px] object-cover shrink-0 bg-slate-100"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/56x56?text=IMG'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-[#111827] truncate max-w-[160px]">{post.title}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${statusColors[postStatus] || 'bg-slate-100 text-slate-600'}`}>
                      {postStatus}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">{post.sellerName} · {post.location}</p>
                  <p className="text-[10px] font-bold text-[#E53935]">{post.price}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {postStatus === 'pending' && (
                    <>
                      <button
                        disabled={actingId === post.id}
                        onClick={() => handleApprove(post)}
                        className="p-1.5 rounded-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-50"
                        title="Tasdiqlash"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        disabled={actingId === post.id}
                        onClick={() => setRejectModal({ id: post.id, title: post.title })}
                        className="p-1.5 rounded-[10px] bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors disabled:opacity-50"
                        title="Rad etish"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    disabled={actingId === post.id}
                    onClick={() => handleDelete(post)}
                    className="p-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[26px] w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="font-black text-base text-[#111827]">Rad etish sababi</h3>
            <p className="text-xs text-slate-500 font-medium">«{rejectModal.title}» e'lonini rad etish uchun sabab tanlang:</p>
            <div className="space-y-1.5">
              {[...REJECTION_REASONS, 'Boshqa sabab...'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRejectReason(r)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-[14px] text-xs font-bold transition-colors ${
                    rejectReason === r ? 'bg-[#E53935] text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {rejectReason === 'Boshqa sabab...' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Sababni kiriting..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 text-xs font-semibold resize-none outline-none focus:border-[#E53935]"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-3 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Bekor
              </button>
              <button
                disabled={isRejectSubmitting}
                onClick={handleRejectSubmit}
                className="flex-1 py-3 rounded-[16px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors disabled:opacity-50"
              >
                {isRejectSubmitting ? 'Saqlanmoqda...' : 'Rad etish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
