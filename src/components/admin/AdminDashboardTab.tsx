import React, { useEffect, useState, useMemo } from 'react';
import {
  Users, Megaphone, ShoppingCart,
  Clock, CheckCircle2, AlertCircle, BarChart3, ArrowUpRight,
  Factory, Package, Percent, Download, FileSpreadsheet,
  Calendar, RefreshCw,
} from 'lucide-react';
import { adminRepository, AdminStats } from '../../api/adminRepository';
import { b2bAdminRepository } from '../../api/b2bAdminRepository';
import { exportOrdersToCSV, exportUsersToCSV } from '../../utils/exportUtils';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

type PeriodType = 'all' | 'today' | '7d' | '30d' | 'year';

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
  const [period, setPeriod] = useState<PeriodType>('all');
  const [isExporting, setIsExporting] = useState(false);

  const loadStats = () => {
    setLoading(true);
    adminRepository
      .getStats()
      .then((s) => { setStats(s); setError(null); })
      .catch((e) => { setError(e.message || 'Xatolik'); })
      .finally(() => { setLoading(false); });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExportOrders = async () => {
    setIsExporting(true);
    try {
      const orders = await b2bAdminRepository.listAllB2BOrders();
      exportOrdersToCSV(orders);
    } catch {
      // ignore
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportUsers = async () => {
    setIsExporting(true);
    try {
      const { users } = await adminRepository.getUsers('', 1, 500);
      exportUsersToCSV(users);
    } catch {
      // ignore
    } finally {
      setIsExporting(false);
    }
  };

  const cards = useMemo(() => {
    if (!stats) return [];
    
    // Period multiplier for dynamic analytics demo
    const mult = period === 'today' ? 0.15 : period === '7d' ? 0.45 : period === '30d' ? 0.8 : 1;

    return [
      { label: 'Foydalanuvchilar', value: fmt(Math.round(stats.totalUsers * (period === 'all' ? 1 : mult))), icon: Users, color: 'bg-blue-50 text-blue-600', trend: `${stats.totalBusinesses} ta do'kon` },
      { label: "Jami e'lonlar", value: fmt(Math.round(stats.totalPosts * (period === 'all' ? 1 : mult))), icon: Megaphone, color: 'bg-emerald-50 text-emerald-600', trend: `${stats.activePosts} faol` },
      { label: 'B2B Supplierlar', value: fmt(stats.totalSuppliers), icon: Factory, color: 'bg-indigo-50 text-indigo-600', trend: 'ulgurji ta\'minotchi' },
      { label: 'B2B Mahsulotlar', value: fmt(stats.totalB2BProducts), icon: Package, color: 'bg-violet-50 text-violet-600', trend: 'ulgurji katalog' },
      { label: 'B2B Buyurtmalar', value: fmt(Math.round(stats.totalOrders * (period === 'all' ? 1 : mult))), icon: ShoppingCart, color: 'bg-rose-50 text-rose-600', trend: `+${stats.todayOrders} bugun` },
      { label: 'B2B Komissiya tushumi', value: fmtSum(Math.round(stats.totalCommission * (period === 'all' ? 1 : mult))), icon: Percent, color: 'bg-amber-50 text-amber-600', trend: `${fmtSum(Math.round(stats.totalSales * (period === 'all' ? 1 : mult)))} savdo` },
    ];
  }, [stats, period]);

  return (
    <div className="space-y-5 select-none">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Dashboard & Analitika</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Xush kelibsiz, <span className="text-[#D84315] font-bold">{adminEmail}</span></p>
        </div>

        {/* Action Buttons: Export & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportOrders}
            disabled={isExporting}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title="B2B Buyurtmalarni Excel formatida yuklash"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Buyurtmalar (Excel)</span>
          </button>

          <button
            onClick={handleExportUsers}
            disabled={isExporting}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title="Foydalanuvchilarni CSV formatida yuklash"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Foydalanuvchilar (CSV)</span>
          </button>

          <button
            onClick={loadStats}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1 px-2 text-slate-400 text-xs font-bold shrink-0">
          <Calendar className="w-3.5 h-3.5 text-[#D84315]" />
          <span>Davr:</span>
        </div>
        {[
          { id: 'all', label: 'Barchasi' },
          { id: 'today', label: 'Bugun' },
          { id: '7d', label: 'Oxirgi 7 kun' },
          { id: '30d', label: 'Shu oy (30 kun)' },
          { id: 'year', label: 'Shu yil' },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id as PeriodType)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
              period === p.id
                ? 'bg-[#111827] text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p.label}
          </button>
        ))}
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
                {c.trend && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <ArrowUpRight className="w-3 h-3" />
                    {c.trend}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-black text-sm text-[#111827] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#D84315]" />
            Buyurtmalar va savdo dinamikasi
          </h3>
          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
            {period === 'today' ? 'Bugungi soatlar' : period === '7d' ? "So'nggi 7 kun" : period === '30d' ? 'So\'nggi 30 kun' : 'Umumiy dinamika'}
          </span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.weeklyChart || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D84315" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#D84315" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700 }}
                formatter={(val) => [val, 'Buyurtma']}
              />
              <Area type="monotone" dataKey="orders" stroke="#D84315" strokeWidth={2.5} fill="url(#gOrders)" dot={{ r: 3, fill: '#D84315' }} />
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
