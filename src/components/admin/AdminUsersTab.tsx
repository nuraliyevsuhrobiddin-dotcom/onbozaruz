import React, { useEffect, useState, useCallback } from 'react';
import { Search, ShieldCheck, Ban, UserCheck, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminRepository, AdminUserItem } from '../../api/adminRepository';

interface AdminUsersTabProps {
  _adminEmail: string;
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ _adminEmail, onLogAction, showToast }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminRepository.getUsers(q, p, PAGE_SIZE);
      setUsers(res.users);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { load(search, page); }, 350);
    return () => clearTimeout(t);
  }, [search, page, load]);

  const handleStatusToggle = async (user: AdminUserItem) => {
    if (!window.confirm(`${user.name} — ${user.status === 'active' ? "bloklashni" : "blokdan chiqarishni"} tasdiqlaysizmi?`)) return;
    setActingId(user.id);
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    try {
      await adminRepository.updateUserStatus(user.id, newStatus);
      await onLogAction('ban_user', user.id, { status: user.status }, { status: newStatus });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u));
      showToast(newStatus === 'banned' ? `${user.name} bloklandi` : `${user.name} blokdan chiqarildi`);
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Foydalanuvchilar</h2>
          <p className="text-xs text-slate-400 font-medium">{total} ta ro'yxatdan o'tgan</p>
        </div>
        <button onClick={() => load(search, page)} className="p-2 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Ism, email yoki telefon..."
          className="w-full pl-10 pr-4 py-2.5 rounded-[16px] border border-slate-200 bg-slate-50 text-sm font-semibold outline-none focus:border-[#E53935] focus:bg-white transition-colors"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-[16px] border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[22px] border border-slate-200/80 overflow-hidden shadow-sm">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
                  <div className="h-2.5 bg-slate-100 rounded animate-pulse w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 font-bold">
            Foydalanuvchilar topilmadi
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                  user.isAdmin ? 'bg-[#E53935] text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs text-[#111827] truncate">{user.name}</span>
                    {user.isAdmin && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#E53935] text-white text-[9px] font-black flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {user.status === 'active' ? 'Faol' : 'Bloklangan'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{user.email}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {new Date(user.createdAt).toLocaleDateString('uz-UZ')} · {user.role}
                  </p>
                </div>
                {/* Action */}
                {!user.isAdmin && (
                  <button
                    disabled={actingId === user.id}
                    onClick={() => handleStatusToggle(user)}
                    className={`p-2 rounded-[12px] transition-colors disabled:opacity-50 ${
                      user.status === 'active'
                        ? 'bg-red-50 hover:bg-red-100 text-red-600'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                    }`}
                    title={user.status === 'active' ? 'Bloklash' : 'Blokdan chiqarish'}
                  >
                    {user.status === 'active' ? <Ban className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold">{total} ta natijadan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-[12px] bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-[12px] bg-[#E53935] text-white text-xs font-black">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-[12px] bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
