import React, { useEffect, useState } from 'react';
import { adminRepository, AdminAuditLog } from '../../api/adminRepository';
import { RefreshCw, FileText } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  approve_post: "E'lon tasdiqlandi",
  reject_post: "E'lon rad etildi",
  delete_post: "E'lon o'chirildi",
  ban_user: 'Foydalanuvchi bloklandi',
  unban_user: 'Foydalanuvchi blokdan chiqarildi',
  update_user_role: 'Foydalanuvchi roli yangilandi',
  create_category: 'Kategoriya yaratildi',
  update_category: 'Kategoriya yangilandi',
  delete_category: "Kategoriya o'chirildi",
  update_report: 'Shikoyat holati yangilandi',
  update_order_status: 'Buyurtma holati yangilandi',
};

const ACTION_COLOR: Record<string, string> = {
  approve_post: 'bg-emerald-50 text-emerald-700',
  reject_post: 'bg-amber-50 text-amber-700',
  delete_post: 'bg-red-50 text-red-700',
  ban_user: 'bg-red-50 text-red-700',
  unban_user: 'bg-emerald-50 text-emerald-700',
  update_user_role: 'bg-blue-50 text-blue-700',
  create_category: 'bg-violet-50 text-violet-700',
  update_category: 'bg-violet-50 text-violet-700',
  delete_category: 'bg-red-50 text-red-700',
  update_report: 'bg-slate-100 text-slate-600',
  update_order_status: 'bg-blue-50 text-blue-700',
};

interface AdminAuditLogsTabProps {}

export const AdminAuditLogsTab: React.FC<AdminAuditLogsTabProps> = () => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminRepository.getAuditLogs();
      setLogs(data);
    } catch {
      // Keep empty on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Audit Log</h2>
          <p className="text-xs text-slate-400 font-medium">Admin bajargan amallarning tarixi</p>
        </div>
        <button onClick={load} className="p-2 rounded-[14px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-[20px] animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-[22px] border border-slate-200/80">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-500">Audit log bo'sh</p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Admin bajargan muhim amallar bu yerda avtomatik qayd etiladi
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[22px] border border-slate-200/80 overflow-hidden shadow-sm divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${ACTION_COLOR[log.action] || 'bg-slate-100 text-slate-600'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{log.targetType}: {log.targetId.slice(0, 10)}…</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{log.adminEmail}</p>
                  {log.oldValue && log.newValue && (
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {JSON.stringify(log.oldValue)} → {JSON.stringify(log.newValue)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                  {new Date(log.createdAt).toLocaleString('uz-UZ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
