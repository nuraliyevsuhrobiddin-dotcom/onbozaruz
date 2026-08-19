import React, { useEffect, useState } from 'react';
import {
  Users, Megaphone, ShoppingBag, ShoppingCart, TrendingUp,
  Clock, CheckCircle2, AlertCircle, BarChart3, ArrowUpRight,
} from 'lucide-react';
import { adminRepository, AdminStats } from '../../api/adminRepository';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const MOCK_CHART = [
  { day: 'Du', orders: 8, sales: 3200000 },
  { day: 'Se', orders: 12, sales: 5800000 },
  { day: 'Ch', orders: 7, sales: 2900000 },
  { day: 'Pa', orders: 15, sales: 7400000 },
  { day: 'Ju', orders: 20, sales: 9800000 },
  { day: 'Sh', orders: 18, sales: 8500000 },
  { day: 'Ya', orders: 5, sales: 1900000 },
];

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

const fmtSum = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)} mln so'm`
    : `${n.toLocaleString('uz')} so'm`;

interface AdminDashboardTabProps {
  adminEmail: string;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({ adminEmail }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    adminRepository
      .getStats()
      .then((s) => { if (mounted) { setStats(s); setError(null); } })
      .catch((e) => { if (mounted) setError(e.message || 'Xatolik'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const cards = stats
    ? [
        { label: 'Foydalanuvchilar', value: fmt(stats.totalUsers), icon: Users, color: 'bg-blue-50 text-blue-600', trend: '+12%' },
        { label: "Jami e'lonlar", value: fmt(stats.totalPosts), icon: Megaphone, color: 'bg-emerald-50 text-emerald-600', trend: `${stats.activePosts} faol` },
        { label: 'Moderatsiya', value: fmt(stats.pendingModeration), icon: Clock, color: 'bg-amber-50 text-amber-600', trend: 'kutilmoqda' },
        { label: 'Market mahsulotlar', value: fmt(stats.totalProducts), icon: ShoppingBag, color: 'bg-violet-50 text-violet-600', trend: 'tasdiqlangan' },
        { label: 'Jami buyurtmalar', value: fmt(stats.totalOrders), icon: ShoppingCart, color: 'bg-rose-50 text-rose-600', trend: `+${stats.todayOrders} bugun` },
        { label: 'Umumiy savdo', value: fmtSum(stats.totalSales), icon: TrendingUp, color: 'bg-green-50 text-green-600', trend: '+8.4%' },
      ]
    : [];

  return (
    <div className="space-y-5 select-none">
      <div>
        <h2 className="font-black text-xl text-[#111827]">Dashboard</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">Xush kelibsiz, <span className="text-[#E53935] font-bold">{adminEmail}</span></p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-[16px] border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-[22px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{c.label}</span>
                  <span className={`w-8 h-8 rounded-[12px] flex items-center justify-center ${c.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <p className="font-black text-lg text-[#111827] leading-tight">{c.value}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <ArrowUpRight className="w-3 h-3" />
                  {c.trend}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-sm text-[#111827] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#E53935]" />
            Haftalik buyurtmalar va savdo
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">So'nggi 7 kun</span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_CHART} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53935" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E53935" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700 }}
                formatter={(val) => [val, 'Buyurtma']}
              />
              <Area type="monotone" dataKey="orders" stroke="#E53935" strokeWidth={2.5} fill="url(#gOrders)" dot={{ r: 3, fill: '#E53935' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick status */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Faol e\'lonlar', val: stats.activePosts, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Moderatsiya', val: stats.pendingModeration, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Faol sotuvchilar', val: stats.activeSellers, icon: Users, color: 'text-blue-600 bg-blue-50' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-[20px] border border-slate-200/80 p-3 shadow-sm text-center space-y-1.5">
                <span className={`inline-flex w-9 h-9 mx-auto rounded-[14px] items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <p className="font-black text-base text-[#111827]">{s.val}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{s.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
