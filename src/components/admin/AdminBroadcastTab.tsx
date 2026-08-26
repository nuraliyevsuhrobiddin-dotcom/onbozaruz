import React, { useState, useEffect } from 'react';
import {
  Megaphone, Send, Bell, Users, Store, Building2,
  CheckCircle2, Clock, Sparkles, AlertCircle, History,
} from 'lucide-react';
import { adminRepository } from '../../api/adminRepository';

interface AdminBroadcastTabProps {
  onLogAction: (action: string, targetId: string, oldVal: any, newVal: any) => void;
  showToast: (msg: string) => void;
}

interface BroadcastItem {
  id: string;
  title: string;
  message: string;
  targetRole: 'all' | 'business' | 'supplier';
  createdAt: string;
}

export const AdminBroadcastTab: React.FC<AdminBroadcastTabProps> = ({
  onLogAction,
  showToast,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'all' | 'business' | 'supplier'>('all');
  const [announcementType, setAnnouncementType] = useState<'news' | 'alert' | 'promo'>('news');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<BroadcastItem[]>([]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem('onbozor-admin-broadcasts');
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast("Iltimos, sarlavha va xabar matnini to'liq kiriting");
      return;
    }

    const targetLabel =
      targetRole === 'all'
        ? 'Barcha foydalanuvchilar'
        : targetRole === 'business'
        ? 'Barcha B2B Do\'konlar'
        : 'Barcha B2B Ta\'minotchilar';

    if (!window.confirm(`«${title}» xabarnomasini ${targetLabel}ga yuborishni tasdiqlaysizmi?`)) {
      return;
    }

    setIsSending(true);
    try {
      const deliveredCount = await adminRepository.sendBroadcastAnnouncement(
        title.trim(),
        message.trim(),
        targetRole
      );
      await onLogAction('send_broadcast_announcement', targetRole, null, { title, message, targetRole });

      showToast(`✅ Ommaviy xabarnoma muvaffaqiyatli yuborildi!`);
      setTitle('');
      setMessage('');
      loadHistory();
    } catch (err: any) {
      showToast(err.message || 'Xabarnomani yuborishda xatolik');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div>
        <h2 className="font-black text-xl text-[#111827]">Ommaviy Bildirishnomalar (Broadcast)</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Foydalanuvchilar, do'konlar yoki ta'minotchilarga muhim yangilik va e'lonlar yuborish
        </p>
      </div>

      {/* Grid: Form on Left, History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Send Broadcast Form */}
        <div className="lg:col-span-7 bg-white rounded-[24px] border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#D84315] flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Yangi xabarnoma yaratish</h3>
              <p className="text-[10px] text-slate-400 font-medium">Barcha maqsadli foydalanuvchilar telefoniga yetkaziladi</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-3.5">
            {/* Target Audience Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Qabul qiluvchilar auditoriyasi:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Barchaga', icon: Users, desc: 'Barcha a\'zolar' },
                  { id: 'business', label: 'Do\'konlarga', icon: Store, desc: 'B2B xaridorlar' },
                  { id: 'supplier', label: 'Ta\'minotchilarga', icon: Building2, desc: 'Ishlab chiqaruvchilar' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = targetRole === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTargetRole(item.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#D84315] bg-orange-50/60 shadow-xs'
                          : 'border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mx-auto ${isSelected ? 'text-[#D84315]' : 'text-slate-500'}`} />
                      <span className={`block font-black text-xs mt-1 ${isSelected ? 'text-[#D84315]' : 'text-slate-800'}`}>
                        {item.label}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-semibold">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Xabarnoma sarlavhasi:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Yangi hosil mavsumi boshlandi! 🌾"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#D84315] shadow-xs"
                maxLength={80}
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Xabarnoma matni:</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Xabarning to'liq tavsifini yozing..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-[#D84315] resize-none shadow-xs"
                maxLength={400}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Qisqa va tushunarli matn tavsiya etiladi</span>
                <span>{message.length}/400</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSending || !title.trim() || !message.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D84315] to-[#BF360C] hover:brightness-110 text-white font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Xabarnoma yuborilmoqda...' : 'Xabarnomani yuborish'}</span>
            </button>
          </form>
        </div>

        {/* Sent History & Preview */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Preview */}
          <div className="bg-slate-50 rounded-[24px] border border-slate-200/80 p-4 shadow-xs space-y-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              Ko'rinish namunasi (Preview):
            </span>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#D84315] flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs text-slate-900 truncate">
                  {title.trim() || "Xabarnoma sarlavhasi bu yerda bo'ladi"}
                </h4>
                <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5">
                  {message.trim() || "Xabarnoma matni bu yerda ko'rinadi..."}
                </p>
                <span className="text-[9px] text-slate-400 font-bold block mt-1">Hozirgina · OnBozar Admin</span>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <History className="w-4 h-4 text-slate-500" />
              <h3 className="font-black text-xs text-slate-900">Yuborilgan xabarnomalar tarixi</h3>
            </div>

            {history.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                Hozircha yuborilgan xabarnomalar yo'q
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {history.slice(0, 10).map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 truncate">{item.title}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-[#D84315] text-[9px] font-black shrink-0">
                        {item.targetRole === 'all' ? 'Barchaga' : item.targetRole === 'business' ? 'Do\'konlar' : 'Supplierlar'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2">{item.message}</p>
                    <span className="text-[9px] text-slate-400 block font-semibold">
                      {new Date(item.createdAt).toLocaleString('uz-UZ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
