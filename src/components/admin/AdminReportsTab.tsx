import React, { useEffect, useState } from 'react';
import { adminRepository, AdminReport } from '../../api/adminRepository';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface AdminReportsTabProps {
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({ onLogAction, showToast }) => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminRepository.getReports();
      setReports(data);
    } catch {
      // Keep empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpdateStatus = async (report: AdminReport, status: 'resolved' | 'rejected') => {
    setActingId(report.id);
    try {
      await adminRepository.updateReportStatus(report.id, status);
      await onLogAction('update_report', report.id, { status: report.status }, { status });
      setReports((prev) => prev.map((r) => r.id === report.id ? { ...r, status } : r));
      showToast(status === 'resolved' ? 'Shikoyat hal qilindi' : 'Shikoyat rad etildi');
    } catch (e: any) {
      showToast(e.message || 'Xatolik yuz berdi');
    } finally {
      setActingId(null);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'pending') return 'bg-amber-50 text-amber-700';
    if (status === 'resolved') return 'bg-emerald-50 text-emerald-700';
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Shikoyatlar</h2>
          <p className="text-xs text-slate-400 font-medium">
            {reports.filter((r) => r.status === 'pending').length} ta ko'rib chiqilmagan
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-[20px] animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-[22px] border border-slate-200/80">
          <p className="text-3xl mb-2">🛡️</p>
          <p className="text-sm font-bold text-slate-500">Hozircha shikoyatlar yo'q</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Foydalanuvchi shikoyatlari bu yerda ko'rinadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-[20px] border border-slate-200/80 p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${statusColor(r.status)}`}>
                      {r.status === 'pending' ? 'Kutmoqda' : r.status === 'resolved' ? 'Hal qilindi' : 'Rad etildi'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold">
                      {r.targetType}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-[#111827] mt-1">{r.reason}</p>
                  {r.details && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{r.details}</p>}
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {new Date(r.createdAt).toLocaleString('uz-UZ')} · Target: {r.targetId.slice(0, 12)}...
                  </p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={actingId === r.id}
                      onClick={() => handleUpdateStatus(r, 'resolved')}
                      className="p-1.5 rounded-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:opacity-50 transition-colors"
                      title="Hal qilindi"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      disabled={actingId === r.id}
                      onClick={() => handleUpdateStatus(r, 'rejected')}
                      className="p-1.5 rounded-[10px] bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50 transition-colors"
                      title="Rad etish"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
