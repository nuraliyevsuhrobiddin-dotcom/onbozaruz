import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search, ShieldCheck, Ban, UserCheck, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight, Download, UserCog, Store, Building2,
  Check, X,
} from 'lucide-react';
import { adminRepository, AdminUserItem } from '../../api/adminRepository';
import { exportUsersToCSV } from '../../utils/exportUtils';

interface AdminUsersTabProps {
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

type RoleFilterType = 'all' | 'business' | 'supplier' | 'seller' | 'admin' | 'banned';

const ROLE_LABELS: Record<string, string> = {
  user: 'Foydalanuvchi',
  seller: 'Sotuvchi',
  business: 'B2B Do\'kon',
  business_buyer: 'B2B Xaridor Do\'kon',
  supplier: 'B2B Ta\'minotchi',
  admin: 'Administrator',
};

const ROLE_COLORS: Record<string, string> = {
  user: 'bg-slate-100 text-slate-700',
  seller: 'bg-orange-50 text-[#D84315]',
  business: 'bg-blue-50 text-blue-700',
  business_buyer: 'bg-blue-50 text-blue-700',
  supplier: 'bg-emerald-50 text-emerald-700',
  admin: 'bg-purple-50 text-purple-700',
};

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ onLogAction, showToast }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // Role Edit Modal State
  const [roleEditUser, setRoleEditUser] = useState<AdminUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('seller');
  const [makeAdmin, setMakeAdmin] = useState<boolean>(false);
  const [isSavingRole, setIsSavingRole] = useState<boolean>(false);

  const PAGE_SIZE = 25;

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
    const t = setTimeout(() => { load(search, page); }, 300);
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

  const openRoleEditModal = (user: AdminUserItem) => {
    setRoleEditUser(user);
    setSelectedRole(user.role || 'seller');
    setMakeAdmin(Boolean(user.isAdmin));
  };

  const handleSaveRole = async () => {
    if (!roleEditUser) return;
    setIsSavingRole(true);
    try {
      await adminRepository.updateUserRole(roleEditUser.id, selectedRole, makeAdmin);
      await onLogAction('update_user_role', roleEditUser.id, { role: roleEditUser.role, isAdmin: roleEditUser.isAdmin }, { role: selectedRole, isAdmin: makeAdmin });
      setUsers((prev) =>
        prev.map((u) => (u.id === roleEditUser.id ? { ...u, role: selectedRole as any, isAdmin: makeAdmin } : u))
      );
      showToast(`Foydalanuvchi roli yangilandi: ${ROLE_LABELS[selectedRole] || selectedRole}`);
      setRoleEditUser(null);
    } catch (err: any) {
      showToast(err.message || 'Roli yangilashda xatolik');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleExportCSV = () => {
    exportUsersToCSV(users);
    showToast("Foydalanuvchilar ro'yxati yuklab olindi (CSV)");
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter === 'all') return true;
      if (roleFilter === 'banned') return u.status === 'banned';
      if (roleFilter === 'admin') return u.isAdmin;
      if (roleFilter === 'business') return u.role === 'business' || u.role === 'business_buyer';
      if (roleFilter === 'supplier') return u.role === 'supplier';
      if (roleFilter === 'seller') return u.role === 'seller';
      return true;
    });
  }, [users, roleFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Foydalanuvchilar & Do'konlar</h2>
          <p className="text-xs text-slate-400 font-medium">
            {total} ta ro'yxatdan o'tgan akkountlar va ularning rollari
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Eksport</span>
          </button>
          <button
            onClick={() => load(search, page)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Role Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Ism, do'kon nomi, email yoki telefon..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-[#D84315] shadow-xs"
          />
        </div>

        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'business', label: 'B2B Do\'konlar' },
            { id: 'supplier', label: 'Ta\'minotchilar' },
            { id: 'seller', label: 'Sotuvchilar' },
            { id: 'admin', label: 'Adminlar' },
            { id: 'banned', label: 'Bloklanganlar' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setRoleFilter(pill.id as RoleFilterType)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                roleFilter === pill.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-[16px] border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Users Table / Cards */}
      <div className="bg-white rounded-[22px] border border-slate-200/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-36" />
                  <div className="h-2.5 bg-slate-100 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-400 font-bold">
            Foydalanuvchilar topilmadi
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((user) => {
              const isBusiness = user.role === 'business' || user.role === 'business_buyer';
              const isSupplier = user.role === 'supplier';

              return (
                <div key={user.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors">
                  {/* Avatar & Basic Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                      user.isAdmin
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white'
                        : isSupplier
                        ? 'bg-emerald-600 text-white'
                        : isBusiness
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isSupplier ? (
                        <Building2 className="w-5 h-5" />
                      ) : isBusiness ? (
                        <Store className="w-5 h-5" />
                      ) : (
                        (user.name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 truncate">{user.name}</span>
                        {user.isAdmin && (
                          <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[9px] font-black flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        )}
                        <span className={`px-2 py-0.2 rounded-md text-[9px] font-black ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                          user.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {user.status === 'active' ? 'Faol' : 'Bloklangan'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                        <span>{user.email || 'Email yo\'q'}</span>
                        {user.phone && (
                          <>
                            <span>·</span>
                            <span className="text-slate-600 font-semibold">{user.phone}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(user.createdAt).toLocaleDateString('uz-UZ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit Role & Ban */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openRoleEditModal(user)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Rolni o'zgartirish"
                    >
                      <UserCog className="w-4 h-4" />
                    </button>

                    {!user.isAdmin && (
                      <button
                        disabled={actingId === user.id}
                        onClick={() => handleStatusToggle(user)}
                        className={`p-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
                          user.status === 'active'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                        }`}
                        title={user.status === 'active' ? 'Bloklash' : 'Blokdan chiqarish'}
                      >
                        {user.status === 'active' ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-bold">{total} ta natijadan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-[#D84315] text-white text-xs font-black">{page}/{totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {roleEditUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-md p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900">Foydalanuvchi rolini boshqarish</h3>
              <button onClick={() => setRoleEditUser(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="font-extrabold text-sm text-slate-900">{roleEditUser.name}</p>
              <p className="text-xs text-slate-500 font-medium">{roleEditUser.email} · {roleEditUser.phone || 'Telefon yo\'q'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block">Tizimdagi roli:</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'user', title: 'Oddiy foydalanuvchi', desc: 'E\'lonlarni ko\'radi va sotuvchilar bilan bog\'lanadi' },
                  { id: 'seller', title: 'Sotuvchi (Seller)', desc: 'E\'lon va mahsulotlar joylashtira oladi' },
                  { id: 'business', title: 'B2B Do\'kon (Ulgurji xaridor)', desc: 'Ishlab chiqaruvchilardan arzon narxda ulgurji xarid qiladi' },
                  { id: 'supplier', title: 'B2B Ta\'minotchi (Ishlab chiqaruvchi)', desc: 'Ulgurji partiyalarni sotadi va shartnomalar tuzadi' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedRole === r.id
                        ? 'border-[#D84315] bg-orange-50/50 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{r.title}</span>
                      <span className="text-[10px] text-slate-400 font-medium block">{r.desc}</span>
                    </div>
                    {selectedRole === r.id && <Check className="w-4 h-4 text-[#D84315] shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Permission Toggle */}
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-900 block">Administrator huquqi</span>
                <span className="text-[10px] text-slate-400 font-medium block">Admin panelga kirish va boshqarish huquqini berish</span>
              </div>
              <input
                type="checkbox"
                checked={makeAdmin}
                onChange={(e) => setMakeAdmin(e.target.checked)}
                className="w-4 h-4 accent-[#D84315] cursor-pointer"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleEditUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={isSavingRole}
                onClick={handleSaveRole}
                className="flex-1 py-2.5 rounded-xl bg-[#D84315] hover:bg-[#BF360C] text-white font-black text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingRole ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
