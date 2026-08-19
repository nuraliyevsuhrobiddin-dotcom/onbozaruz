import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Smartphone,
  Truck,
  Lock,
  Phone,
  ShieldCheck,
  Bookmark,
  Settings,
  Globe,
  CreditCard,
  Moon,
  Save,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';

interface ProfileSettingsSubViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
  onLogout?: () => void;
}

export const ProfileSettingsSubView: React.FC<ProfileSettingsSubViewProps> = ({
  onBack,
  showToast,
  onLogout,
}) => {
  const { deleteAccount } = useAgroStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Load saved settings from localStorage or fallback to defaults
  const [settingsForm, setSettingsForm] = useState(() => {
    try {
      const saved = localStorage.getItem('onbozor-app-settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return {
      pushNotifications: true,
      orderUpdates: true,
      marketingMessages: false,
      darkMode: false,
      showPhone: true,
      twoFactor: false,
      autoSaveListings: true,
      language: "O'zbekcha",
      currency: "So'm (UZS)",
      deliveryRegion: "Butun O'zbekiston",
      paymentMethod: 'Naqd va karta',
    };
  });

  const toggleSetting = (field: keyof typeof settingsForm) => {
    setSettingsForm((prev: any) => {
      const updated = { ...prev, [field]: !prev[field] };
      localStorage.setItem('onbozor-app-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateSetting = (field: keyof typeof settingsForm, value: string) => {
    setSettingsForm((prev: any) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem('onbozor-app-settings', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveSettings = () => {
    localStorage.setItem('onbozor-app-settings', JSON.stringify(settingsForm));
    showToast('Sozlamalar saqlandi!');
    onBack();
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('agro_posts_cache_v1');
      localStorage.removeItem('agro_products_cache_v1');
      localStorage.removeItem('onbozor-app-settings');
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
      onBack();
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
          settingsForm[field] ? 'bg-[#E53935]' : 'bg-slate-200'
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
        <h3 className="font-black text-sm text-[#111827] mb-2 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#E53935]" />
          Bildirishnomalar
        </h3>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            field="pushNotifications"
            title="Push-xabarlar"
            text="Yangi e'lonlar, xaridlar va sharhlar haqida xabar berish"
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
      </div>

      {/* Maxfiylik va xavfsizlik */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm">
        <h3 className="font-black text-sm text-[#111827] mb-2 flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#E53935]" />
          Maxfiylik va xavfsizlik
        </h3>
        <div className="divide-y divide-slate-100">
          <ToggleRow
            field="showPhone"
            title="Telefonni ochiq ko'rsatish"
            text="E'lonlarda barcha xaridorlarga telefon raqamingiz ko'rinadi"
            icon={Phone}
          />
          <ToggleRow
            field="twoFactor"
            title="Ikki bosqichli himoya"
            text="Tizimga kirishda SMS tasdiqlash so'raladi"
            icon={ShieldCheck}
          />
          <ToggleRow
            field="autoSaveListings"
            title="Qoralamalarni saqlash"
            text="Chala qolgan e'lonlar xotirada qoladi"
            icon={Bookmark}
          />
        </div>
      </div>

      {/* Ilova va savdo sozlamalari */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm space-y-3">
        <h3 className="font-black text-sm text-[#111827] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#E53935]" />
          Ilova parametrlari
        </h3>

        {[
          {
            field: 'language',
            label: 'Til (Language)',
            icon: Globe,
            options: ["O'zbekcha", 'Русский', 'English', 'Қазақша', 'Кыргызча'],
          },
          {
            field: 'currency',
            label: 'Valyuta',
            icon: CreditCard,
            options: ["So'm (UZS)", 'Dollar (USD)', 'Rubl (RUB)'],
          },
          {
            field: 'deliveryRegion',
            label: 'Asosiy savdo hududi',
            icon: Truck,
            options: ["Butun O'zbekiston", "Farg'ona vodiysi", 'Toshkent sh. va viloyati', 'Samarqand/Buxoro', 'Janubiy viloyatlar'],
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <label key={item.field} className="block space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-[#E53935]" />
                {item.label}
              </span>
              <select
                value={settingsForm[item.field as keyof typeof settingsForm] as string}
                onChange={(e) => updateSetting(item.field as keyof typeof settingsForm, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-[#111827] outline-none focus:border-[#E53935] focus:bg-white transition-colors cursor-pointer"
              >
                {item.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {/* Keshni tozalash va tungi rejim */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setSettingsForm((prev: any) => {
              const nextDarkMode = !prev.darkMode;
              const updated = { ...prev, darkMode: nextDarkMode };
              localStorage.setItem('onbozor-app-settings', JSON.stringify(updated));
              showToast(nextDarkMode ? 'Tungi rejim yoqildi' : 'Yorug rejim yoqildi');
              return updated;
            });
          }}
          className="py-3 rounded-[18px] bg-white border border-slate-200/80 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Moon className="w-4 h-4 text-[#E53935]" />
          {settingsForm.darkMode ? 'Yorug rejim' : 'Tungi rejim'}
        </button>
        <button
          type="button"
          onClick={handleClearCache}
          className="py-3 rounded-[18px] bg-white border border-slate-200/80 text-slate-800 font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Keshni tozalash
        </button>
      </div>

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
          onClick={() => {
            if (window.confirm("Akkauntdan chiqishni tasdiqlaysizmi?")) {
              onLogout();
            }
          }}
          className="w-full py-3.5 rounded-[18px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          Akkauntdan chiqish
        </button>
      )}

      {/* Delete Account Danger Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full py-3 rounded-[16px] bg-red-50 hover:bg-red-100 text-[#E53935] font-extrabold text-xs transition-colors border border-red-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Akkauntni butunlay o'chirish
        </button>
      </div>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-[26px] p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#E53935] flex items-center justify-center mx-auto">
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
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="o'chirish"
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-red-200 bg-red-50/50 text-sm font-bold text-[#E53935] outline-none text-center"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-3 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText.trim().toLowerCase() !== "o'chirish"}
                className="flex-1 py-3 rounded-[16px] bg-[#E53935] hover:bg-[#C62828] text-white font-black text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
        </div>
      )}
    </div>
  );
};
