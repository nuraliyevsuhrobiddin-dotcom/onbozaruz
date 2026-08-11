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
} from 'lucide-react';


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
    showToast('Sozlamalar saqlandi va yangilandi!');
    onBack();
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('onbozor-comments-cache');
      localStorage.removeItem('onbozor-posts-cache');
      localStorage.removeItem('onbozor-products-cache');
      localStorage.removeItem('onbozor-profile-form');
      showToast("Vaqtinchalik ma'lumotlar va kesh tozalandi");
    } catch {
      showToast("Xatolik yuz berdi");
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
      className="w-full flex items-center justify-between gap-3 py-3 text-left"
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
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-[#111827]">Sozlamalar</h1>
          <p className="text-[11px] text-slate-400 font-medium">Profil, xavfsizlik, savdo va ilova sozlamalari</p>
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
            text="Yangi e'lonlar, chat va aksiyalar haqida xabar berish"
            icon={Smartphone}
          />
          <ToggleRow
            field="orderUpdates"
            title="Buyurtma statuslari"
            text="To'lov, yetkazib berish va qabul qilish yangiliklari"
            icon={Truck}
          />
          <ToggleRow
            field="marketingMessages"
            title="Marketing xabarlari"
            text="Chegirmalar va hamkorlar uchun takliflar"
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
            title="Telefonni ko'rsatish"
            text="E'lonlarda xaridorlarga telefon raqamingiz ko'rinadi"
            icon={Phone}
          />
          <ToggleRow
            field="twoFactor"
            title="Ikki bosqichli himoya"
            text="Kirishda SMS yoki tasdiqlash kodi so'raladi"
            icon={ShieldCheck}
          />
          <ToggleRow
            field="autoSaveListings"
            title="E'lon draftlarini saqlash"
            text="Yozilgan e'lonlar avtomatik draft bo'lib qoladi"
            icon={Bookmark}
          />
        </div>
      </div>

      {/* Ilova va savdo sozlamalari */}
      <div className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm space-y-3">
        <h3 className="font-black text-sm text-[#111827] flex items-center gap-2">
          <Settings className="w-4 h-4 text-[#E53935]" />
          Ilova va savdo sozlamalari
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
            options: ["So'm (UZS)", 'Dollar (USD)', 'Rubl (RUB)', 'Tenge (KZT)', 'Som (KGS)'],
          },
          {
            field: 'deliveryRegion',
            label: 'Yetkazib berish hududi',
            icon: Truck,
            options: ["Butun O'zbekiston", "Farg'ona vodiysi", 'Toshkent sh. va viloyati', 'Markaziy Osiyo / Eksport'],
          },
          {
            field: 'paymentMethod',
            label: "To'lov usuli",
            icon: CreditCard,
            options: ['Naqd va karta', 'Faqat naqd', "Bank o'tkazma", 'Humo / Uzcard'],
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
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-sm font-bold text-[#111827] outline-none focus:border-[#E53935] focus:bg-white transition-colors"
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

      {/* Tungi rejim & Vaqtinchalik ma'lumot */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setSettingsForm((prev: any) => {
              const nextDarkMode = !prev.darkMode;
              const updated = { ...prev, darkMode: nextDarkMode };
              localStorage.setItem('onbozor-app-settings', JSON.stringify(updated));
              showToast(nextDarkMode ? 'Tungi rejim tanlandi' : 'Yorug rejim tanlandi');
              return updated;
            });
          }}
          className="py-3 rounded-[18px] bg-white border border-slate-200/80 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <Moon className="w-4 h-4 text-[#E53935]" />
          {settingsForm.darkMode ? 'Yorug rejim' : 'Tungi rejim'}
        </button>
        <button
          type="button"
          onClick={handleClearCache}
          className="py-3 rounded-[18px] bg-white border border-slate-200/80 text-slate-800 font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors"
        >
          Vaqtinchalik ma'lumot
        </button>
      </div>

      {/* Sozlamalarni saqlash */}
      <button
        type="button"
        onClick={handleSaveSettings}
        className="w-full py-3.5 rounded-[18px] bg-[#111827] hover:bg-black text-white font-black text-xs transition-colors shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Save className="w-4 h-4 text-emerald-400" />
        Sozlamalarni saqlash
      </button>

      {/* Akkauntdan chiqish */}
      {onLogout && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Akkauntdan chiqishni tasdiqlaysizmi?")) {
              onLogout();
            }
          }}
          className="w-full py-3.5 rounded-[18px] bg-red-50 hover:bg-red-100 text-[#E53935] font-black text-xs transition-colors border border-red-200 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Akkauntdan chiqish
        </button>
      )}
    </div>
  );
};

