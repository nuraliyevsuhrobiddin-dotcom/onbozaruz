import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Edit3,
  KeyRound,
  Phone,
  Mail,
  Building2,
  MapPin,
  Save,
  Loader2,
  Globe,
  Send,
  UserCheck,
} from 'lucide-react';
import { AuthUser, uploadProfileMedia } from '../../api/authClient';

interface EditProfileSubViewProps {
  currentUser: AuthUser;
  onBack: () => void;
  updateUserProfile: (updatedFields: Partial<AuthUser>) => Promise<void>;
  showToast: (msg: string) => void;
}

export const EditProfileSubView: React.FC<EditProfileSubViewProps> = ({
  currentUser,
  onBack,
  updateUserProfile,
  showToast,
}) => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: currentUser.name || '',
    handle: currentUser.handle || (currentUser.email ? currentUser.email.split('@')[0] : '') || '',
    phone: currentUser.phone || '',
    email: currentUser.email || '',
    location: currentUser.location || '',
    businessName: currentUser.businessName || '',
    bio: currentUser.bio || '',
    role: currentUser.role || 'seller',
    website: currentUser.website || '',
    telegram: currentUser.telegram || '',
    avatar: currentUser.avatar || '',
    cover: currentUser.cover || '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(currentUser.avatar || '');
  const [coverPreview, setCoverPreview] = useState<string>(currentUser.cover || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (target: 'avatar' | 'cover', file?: File) => {
    setErrorMessage(null);
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedTypes.includes(file.type) && (!fileExt || !allowedExts.includes(fileExt))) {
      const err = "Faqat JPG, PNG va WEBP formatidagi rasmlar qabul qilinadi";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const err = `Rasm hajmi 5 MB dan oshmasligi kerak (tanlangan hajm: ${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
      setErrorMessage(err);
      showToast(err);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (target === 'avatar') {
      setAvatarFile(file);
      setAvatarPreview(previewUrl);
    } else {
      setCoverFile(file);
      setCoverPreview(previewUrl);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!form.name.trim() || form.name.trim().length < 2) {
      const err = "Iltimos, ism yoki fermer nomini to'liq kiriting (kamida 2 ta belgi)";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    const cleanHandle = form.handle.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
    if (!cleanHandle || cleanHandle.length < 2) {
      const err = "Username kamida 2 ta harf yoki raqamdan iborat bo'lishi kerak";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    setIsSaving(true);
    try {
      let finalAvatarUrl = form.avatar;
      let finalCoverUrl = form.cover;

      if (avatarFile) {
        finalAvatarUrl = await uploadProfileMedia(avatarFile, currentUser.id, 'avatar');
      }
      if (coverFile) {
        finalCoverUrl = await uploadProfileMedia(coverFile, currentUser.id, 'cover');
      }

      await updateUserProfile({
        name: form.name.trim(),
        handle: cleanHandle,
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatar: finalAvatarUrl,
        cover: finalCoverUrl,
        location: form.location.trim(),
        businessName: form.businessName.trim(),
        bio: form.bio.trim(),
        role: form.role as 'seller' | 'buyer' | 'business',
        website: form.website.trim(),
        telegram: form.telegram.trim().replace(/^@/, ''),
      });

      showToast("Profil ma'lumotlari muvaffaqiyatli saqlandi! ✨");
      onBack();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Profil ma'lumotlarini saqlab bo'lmadi";
      setErrorMessage(msg);
      showToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-3 px-3.5 space-y-4 select-none pb-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-[#111827]">Profilni tahrirlash</h1>
          <p className="text-[11px] text-slate-400 font-medium">Shaxsiy va savdo ma'lumotlarini yangilash</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-[16px] text-xs font-bold text-[#E53935] leading-snug">
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm space-y-4">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleImageSelect('avatar', e.target.files?.[0])}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleImageSelect('cover', e.target.files?.[0])}
        />

        {/* Cover Preview & Change */}
        <div className="relative h-28 sm:h-32 overflow-hidden rounded-[20px] bg-slate-900 border border-slate-200">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-slate-800 to-slate-950" />
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute right-3 top-3 rounded-full bg-black/60 hover:bg-black/80 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-md transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Muqovani almashtirish</span>
          </button>
        </div>

        {/* Avatar Preview & Change */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt={form.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E53935] to-[#B71C1C] text-white font-black text-2xl flex items-center justify-center">
                  {(form.name || currentUser.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#E53935] text-white flex items-center justify-center shadow-md hover:bg-[#C62828] transition-colors cursor-pointer"
              title="Rasmni almashtirish"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="font-black text-sm text-[#111827]">{form.name || 'Fermer'}</h3>
            <p className="text-xs text-slate-500 font-semibold">@{form.handle || 'user'}</p>
            <span className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black">
              Avtomatik kvadrat qirqiladi (WebP)
            </span>
          </div>
        </div>

        {/* Account Type Selector */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#E53935]" />
            Akkaunt turi
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'seller', label: 'Fermer / Sotuvchi' },
              { id: 'business', label: 'Biznes / B2B' },
              { id: 'buyer', label: 'Xaridor' },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => updateField('role', type.id)}
                className={`py-2 px-2.5 rounded-[12px] text-xs font-bold transition-all text-center cursor-pointer border ${
                  form.role === type.id
                    ? 'bg-[#E53935] text-white border-[#E53935] shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'name', label: 'Ism / Fermer nomi', icon: Edit3, placeholder: 'Masalan: Anvar Agro' },
            { key: 'handle', label: 'Username (@handle)', icon: KeyRound, placeholder: 'anvar_agro' },
            { key: 'phone', label: 'Telefon raqam', icon: Phone, placeholder: '+998 90 123 45 67' },
            { key: 'email', label: 'Email manzil', icon: Mail, placeholder: 'namuna@onbozar.uz' },
            { key: 'location', label: 'Hudud / Manzil', icon: MapPin, placeholder: 'Farg\'ona viloyati, Quva' },
            { key: 'businessName', label: 'Biznes yoki brend nomi', icon: Building2, placeholder: 'Agro Brend MCHJ' },
            { key: 'website', label: 'Veb-sayt', icon: Globe, placeholder: 'https://mysite.uz' },
            { key: 'telegram', label: 'Telegram username', icon: Send, placeholder: 'anvar_agro' },
          ].map((field) => {
            const Icon = field.icon;
            return (
              <label key={field.key} className="space-y-1.5 block">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-[#E53935]" />
                  {field.label}
                </span>
                <input
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => updateField(field.key as keyof typeof form, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-[#111827] outline-none focus:border-[#E53935] focus:bg-white transition-colors"
                />
              </label>
            );
          })}
        </div>

        {/* Bio */}
        <label className="space-y-1.5 block">
          <span className="text-[11px] font-bold text-slate-500">Bio / Sahifa tavsifi</span>
          <textarea
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            rows={3}
            placeholder="O'zingiz, yetishtiradigan mahsulotlaringiz yoki xizmatlaringiz haqida qisqacha yozing..."
            className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-[#111827] outline-none focus:border-[#E53935] focus:bg-white resize-none transition-colors"
          />
        </label>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 py-3.5 rounded-[18px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-3.5 rounded-[18px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Saqlash</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
