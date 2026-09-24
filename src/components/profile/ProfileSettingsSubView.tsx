import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Smartphone,
  Truck,
  ShieldCheck,
  Bookmark,
  Save,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
  Volume2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { navigateAppRoute } from '../../hooks/useAppNavigation';
import { useAgroStore } from '../../store/useAgroStore';
import {
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  showDeviceNotification,
  type NotificationPermissionStatus,
} from '../../utils/deviceNotifications';
import { playNotificationSound, unlockAudioContext } from '../../utils/notificationSound';

interface ProfileSettingsSubViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const ProfileSettingsSubView: React.FC<ProfileSettingsSubViewProps> = ({
  onBack,
  showToast,
  onLogout,
}) => {
  const { deleteAccount } = useAgroStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [permStatus, setPermStatus] = useState<NotificationPermissionStatus>(() => getDeviceNotificationPermission());

  // Load saved settings from localStorage or fallback to defaults
  const [settingsForm, setSettingsForm] = useState(() => {
    const defaults = { pushNotifications: true, orderUpdates: true, marketingMessages: false, autoSaveListings: true };
    try {
      const saved = localStorage.getItem('onbozor-app-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
          if (typeof parsed?.[key] === 'boolean') defaults[key] = parsed[key];
        }
      }
    } catch {
      // Fallback
    }
    return defaults;
  });

  const toggleSetting = async (field: keyof typeof settingsForm) => {
    if (field === 'pushNotifications' && !settingsForm.pushNotifications) {
      unlockAudioContext();
      const result = await requestDeviceNotificationPermission();
      setPermStatus(result);
      if (result !== 'granted') {
        showToast(result === 'denied'
          ? 'Brauzer sozlamalaridan bildirishnomaga ruxsat bering'
          : "Bu brauzer tizim bildirishnomalarini qo'llab-quvvatlamaydi");
        return;
      }
    }

    const updated = { ...settingsForm, [field]: !settingsForm[field] };
    try {
      localStorage.setItem('onbozor-app-settings', JSON.stringify(updated));
      if (field === 'autoSaveListings' && !updated.autoSaveListings) localStorage.removeItem('onbozor-create-post-draft');
      setSettingsForm(updated);
    } catch { showToast('Sozlamalarni saqlab bo‘lmadi'); }
  };

  const handleRequestPermission = async () => {
    unlockAudioContext();
    const result = await requestDeviceNotificationPermission();
    setPermStatus(result);
    if (result === 'granted') {
      showToast('Telefon bildirishnomalari va ovozi yoqildi');
    } else if (result === 'denied') {
      showToast('Brauzer sozlamalaridan ruxsat bering');
    }
  };

  const handleTestSoundAndNotification = async () => {
    unlockAudioContext();
    playNotificationSound();
    const delivered = await showDeviceNotification({
      title: 'OnBozar bildirishnomasi',
      body: 'Telefon ovozi, vibratsiya va tizim bildirishnomasi muvaffaqiyatli ishlayapti!',
      tag: 'onbozar-notification-test',
      url: '#home',
    });
    showToast(delivered
      ? 'Sinov ovozi va bildirishnomasi yuborildi'
      : 'Ovoz sinovi yuborildi. Tizim bildirishnomasi uchun brauzer ruxsatini tekshiring.');
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('onbozor-app-settings', JSON.stringify(settingsForm));
      showToast('Sozlamalar saqlandi!');
      onBack();
    } catch { showToast('Sozlamalarni saqlab bo‘lmadi'); }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('agro_posts_cache_v1');
      localStorage.removeItem('agro_products_cache_v1');
      showToast("Ilova keshi va vaqtinchalik ma'lumotlar tozalandi");
    } catch {
      showToast("Xatolik yuz berdi");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== "o'chirish") {
      showToast("Tasdiqlash uchun 'o'chirish' so'zini kiriting");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Akkauntni o'chirishda xatolik yuz berdi";
      showToast(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const ToggleRow = ({
    field,
    title,
    text,
    icon: Icon,
  }: {
    field: keyof typeof settingsForm;
    title: string;
    text: string;
    icon: React.ElementType;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={settingsForm[field]}
      onClick={() => toggleSetting(field)}
      className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-[14px] bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-[#111827] text-sm block">{title}</span>
          <span className="text-[11px] text-slate-400 leading-snug block font-medium">{text}</span>
        </div>
      </div>
      <span
        className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
          settingsForm[field] ? 'bg-[#D84315]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            settingsForm[field] ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );

  return (
    <div className="w-full max-w-xl mx-auto py-3 px-3.5 space-y-4 select-none pb-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Orqaga"
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-[#111827]">Sozlamalar</h1>
          <p className="text-[11px] text-slate-400 font-medium">Profil, bildirishnomalar va xavfsizlik</p>
        </div>
      </div>

      {/* Bildirishnomalar */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-sm text-[#111827] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#D84315]" />
            Bildirishnomalar
          </h3>
          {permStatus === 'granted' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ovoz va push faol
            </span>
          )}
        </div>

        {permStatus === 'default' && (
          <div className="mb-3 rounded-2xl bg-orange-50/90 border border-orange-200/90 p-3 flex items-center justify-between gap-2 shadow-xs">
            <div className="min-w-0">
              <p className="text-xs font-black text-[#111827] leading-tight">
                Telefon ruxsati berilmagan
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Ovoz va bildirishnomalar kelishi uchun ruxsat bering
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 rounded-xl bg-[#D84315] hover:bg-[#BF360C] text-white text-xs font-black shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              Ruxsat berish
            </button>
          </div>
        )}

        {permStatus === 'denied' && (
          <div className="mb-3 rounded-2xl bg-rose-50 border border-rose-200 p-2.5 text-[11px] text-rose-700 font-medium">
            ⚠️ Telefonda bildirishnoma bloklangan. Brauzer sozlamalaridan OnBozar uchun ruxsat bering.
          </div>
        )}

        <div className="divide-y divide-slate-100">
          <ToggleRow
            field="pushNotifications"
            title="Push-xabarlar va telefon ovozi"
            text="Yangi e'lonlar, xaridlar va sharhlar haqida telefoningizga xabar berish"
            icon={Smartphone}
          />
          <ToggleRow
            field="orderUpdates"
            title="Buyurtma yangiliklari"
            text="Yetkazib berish va status yangilanishlari"
            icon={Truck}
          />
          <ToggleRow
            field="marketingMessages"
            title="Aksiya va takliflar"
            text="Chegirmalar va agro-yangiliklar"
            icon={Bell}
          />
        </div>

        <button
          type="button"
          onClick={handleTestSoundAndNotification}
          className="w-full mt-3.5 py-2.5 px-4 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#D84315] font-bold text-xs flex items-center justify-center gap-2 border border-orange-200/70 transition-colors cursor-pointer active:scale-[0.99]"
        >
          <Volume2 className="w-4 h-4" />
          <span>Telefon ovozi va bildirishnomasini sinab ko'rish</span>
        </button>
      </div>

      {/* Maxfiylik va xavfsizlik */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm">
        <h3 className="font-black text-sm text-[#111827] mb-2 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-[#D84315]" />
          E'lon qoralamalari
        </h3>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            field="autoSaveListings"
            title="Qoralamalarni saqlash"
            text="Chala qolgan e'lonlar xotirada qoladi"
            icon={Bookmark}
          />
        </div>
      </div>

      <button type="button" onClick={handleClearCache}
        className="w-full py-3 rounded-[18px] bg-white border border-slate-200 text-slate-800 font-bold text-xs">
        Keshni tozalash
      </button>

      {/* Save Settings */}
      <button
        type="button"
        onClick={handleSaveSettings}
        className="w-full py-3.5 rounded-[18px] bg-[#111827] hover:bg-black text-white font-black text-xs transition-colors shadow-md flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
      >
        <Save className="w-4 h-4 text-emerald-400" />
        Sozlamalarni saqlash
      </button>

      {/* Logout button */}
      {onLogout && (
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={async () => {
            if (isLoggingOut || !window.confirm("Akkauntdan chiqishni tasdiqlaysizmi?")) return;
            setIsLoggingOut(true);
            try { await onLogout(); }
            catch (error) { showToast(error instanceof Error ? error.message : "Akkauntdan chiqib bo'lmadi. Qayta urinib ko'ring."); }
            finally { setIsLoggingOut(false); }
          }}
          className="w-full py-3.5 rounded-[18px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          Akkauntdan chiqish
        </button>
      )}

      {/* Legal & Privacy Policy */}
      <div className="pt-1 text-center">
        <a
          href="#privacy-policy"
          onClick={(event) => { event.preventDefault(); navigateAppRoute('/#privacy-policy'); }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#D84315] font-bold underline transition-colors"
        >
          <ShieldCheck className="w-4 h-4 text-[#D84315]" />
          Maxfiylik siyosati (Privacy Policy)
        </a>
      </div>

      {/* Delete Account Danger Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => { setDeleteConfirmText(''); setIsDeleteModalOpen(true); }}
          className="w-full py-3 rounded-[16px] bg-orange-50 hover:bg-orange-100 text-[#D84315] font-extrabold text-xs transition-colors border border-orange-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Akkauntni butunlay o'chirish
        </button>
      </div>

      {/* Delete Account Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Akkauntni o'chirish">
        {(dismiss) => (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#D84315] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-[#111827]">Akkauntni o'chirish</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Diqqat! Akkauntingiz, barcha e'lonlaringiz, profilingiz va ma'lumotlaringiz qayta tiklanmaydigan qilib o'chiriladi.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500">
                Tasdiqlash uchun <strong>o'chirish</strong> deb yozing:
              </span>
              <input
                aria-label="O'chirishni tasdiqlash"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="o'chirish"
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-orange-200 bg-orange-50/50 text-sm font-bold text-[#D84315] outline-none text-center"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={dismiss}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText.trim().toLowerCase() !== "o'chirish"}
                className="flex-1 py-3 rounded-[16px] bg-[#D84315] hover:bg-[#BF360C] text-white font-black text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>O'chirilmoqda...</span>
                  </>
                ) : (
                  <span>O'chirish</span>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
