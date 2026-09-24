import React, { useEffect, useRef, useState } from 'react';
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
import { AuthUser, deleteListingMedia, uploadProfileMedia } from '../../api/authClient';

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

  // Object URLs only exist locally. Revoke them when a new preview replaces
  // one or this screen unmounts, otherwise repeated image selection leaks RAM.
  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => () => {
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (target: 'avatar' | 'cover', file?: File) => {
    setErrorMessage(null);
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    // File extension alone is not trustworthy: it must have an allowed image
    // MIME type too, because the file will later be decoded and transformed.
    if (!allowedTypes.includes(file.type) || (!fileExt || !allowedExts.includes(fileExt))) {
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
    if (isSaving) return;
    setErrorMessage(null);

    if (!form.name.trim() || form.name.trim().length < 2) {
      const err = "Iltimos, ism yoki sotuvchi nomini to'liq kiriting (kamida 2 ta belgi)";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    if (form.name.trim().length > 80) {
      const err = "Ism yoki sotuvchi nomi 80 belgidan oshmasligi kerak";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    const cleanHandle = form.handle.trim().toLowerCase().replace(/^@/, '');
    if (!/^[a-z0-9_]{2,30}$/.test(cleanHandle)) {
      const err = "Username 2–30 ta harf, raqam yoki _ dan iborat bo'lishi kerak";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    const cleanPhone = form.phone.trim();
    if (cleanPhone && !/^\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/.test(cleanPhone)) {
      const err = "Telefon raqamini +998 XX XXX XX XX formatida kiriting";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    const cleanWebsite = form.website.trim();
    if (cleanWebsite && !/^https?:\/\/[^\s]+$/i.test(cleanWebsite)) {
      const err = "Veb-sayt http:// yoki https:// bilan boshlanishi kerak";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    const cleanTelegram = form.telegram.trim().replace(/^@/, '');
    if (cleanTelegram && !/^[a-zA-Z0-9_]{5,32}$/.test(cleanTelegram)) {
      const err = "Telegram username 5–32 ta harf, raqam yoki _ dan iborat bo'lishi kerak";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    if (form.bio.trim().length > 500 || form.location.trim().length > 120 || form.businessName.trim().length > 120) {
      const err = "Bio 500, manzil va biznes nomi esa 120 belgidan oshmasligi kerak";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    setIsSaving(true);
    let uploadedAvatarUrl = '';
    let uploadedCoverUrl = '';
    try {
      let finalAvatarUrl = form.avatar;
      let finalCoverUrl = form.cover;

      if (avatarFile) {
        finalAvatarUrl = await uploadProfileMedia(avatarFile, currentUser.id, 'avatar');
        uploadedAvatarUrl = finalAvatarUrl;
      }
      if (coverFile) {
        finalCoverUrl = await uploadProfileMedia(coverFile, currentUser.id, 'cover');
        uploadedCoverUrl = finalCoverUrl;
      }

      await updateUserProfile({
        name: form.name.trim(),
        handle: cleanHandle,
        // Login email belongs to Supabase Auth; it must be changed through its
        // verified email-change flow rather than silently changing profiles.email.
        phone: cleanPhone,
        avatar: finalAvatarUrl,
        cover: finalCoverUrl,
        location: form.location.trim(),
        businessName: form.businessName.trim(),
        bio: form.bio.trim(),
        role: form.role as 'seller' | 'buyer' | 'business',
        website: cleanWebsite,
        telegram: cleanTelegram,
      });

      // New URLs are committed to the profile first. Only then remove the old
      // Storage objects, so a failed save never leaves a broken profile image.
      if (uploadedAvatarUrl && currentUser.avatar && currentUser.avatar !== uploadedAvatarUrl) {
        void deleteListingMedia(currentUser.avatar);
      }
      if (uploadedCoverUrl && currentUser.cover && currentUser.cover !== uploadedCoverUrl) {
        void deleteListingMedia(currentUser.cover);
      }

      showToast("Profil ma'lumotlari muvaffaqiyatli saqlandi! ✨");
      onBack();
    } catch (err: unknown) {
      // A failed profile update must not leave newly uploaded, unreferenced
      // avatar/cover files in Storage.
      if (uploadedAvatarUrl) void deleteListingMedia(uploadedAvatarUrl);
      if (uploadedCoverUrl) void deleteListingMedia(uploadedCoverUrl);
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
          aria-label="Orqaga"
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
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-[16px] text-xs font-bold text-[#D84315] leading-snug">
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-[24px] border border-slate-200/80 p-4 shadow-sm space-y-4">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onClick={(e) => { e.currentTarget.value = ''; }}
          onChange={(e) => handleImageSelect('avatar', e.target.files?.[0])}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onClick={(e) => { e.currentTarget.value = ''; }}
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
                <div className="w-full h-full bg-gradient-to-br from-[#D84315] to-[#B71C1C] text-white font-black text-2xl flex items-center justify-center">
                  {(form.name || currentUser.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#D84315] text-white flex items-center justify-center shadow-md hover:bg-[#BF360C] transition-colors cursor-pointer"
              title="Rasmni almashtirish"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="font-black text-sm text-[#111827]">{form.name || 'Sotuvchi'}</h3>
            <p className="text-xs text-slate-500 font-semibold">@{form.handle || 'user'}</p>
            <span className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black">
              Avtomatik kvadrat qirqiladi (WebP)
            </span>
          </div>
        </div>

        {/* Account Type Selector */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#D84315]" />
            Akkaunt turi
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'seller', label: 'Sotuvchi' },
              { id: 'business', label: 'Biznes / B2B' },
              { id: 'buyer', label: 'Xaridor' },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => updateField('role', type.id)}
                className={`py-2 px-2.5 rounded-[12px] text-xs font-bold transition-all text-center cursor-pointer border ${
                  form.role === type.id
                    ? 'bg-[#D84315] text-white border-[#D84315] shadow-sm'
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
            { key: 'name', label: 'Ism / Sotuvchi nomi', icon: Edit3, placeholder: 'Masalan: Anvar Savdo', required: true },
            { key: 'handle', label: 'Username (@handle)', icon: KeyRound, placeholder: 'anvar_agro', required: true },
            { key: 'phone', label: 'Telefon raqam', icon: Phone, placeholder: '+998 90 123 45 67' },
            { key: 'email', label: 'Email manzil', icon: Mail, placeholder: 'namuna@onbozar.uz' },
            { key: 'location', label: 'Hudud / Manzil', icon: MapPin, placeholder: 'Farg\'ona viloyati, Quva' },
            { key: 'businessName', label: 'Biznes nomi (ixtiyoriy)', icon: Building2, placeholder: 'Agro Brend MCHJ' },
            { key: 'website', label: 'Veb-sayt (ixtiyoriy)', icon: Globe, placeholder: 'https://mysite.uz' },
            { key: 'telegram', label: 'Telegram username (ixtiyoriy)', icon: Send, placeholder: 'anvar_agro' },
          ].map((field) => {
            const Icon = field.icon;
            return (
              <label key={field.key} className="space-y-1.5 block">
                <span className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    {field.label}
                  </span>
                  {field.required && (
                    <span className="text-[10px] text-amber-600 font-bold">*majburiy</span>
                  )}
                </span>
                <input
                  disabled={isSaving}
                  type={field.key === 'email' ? 'email' : field.key === 'website' ? 'url' : 'text'}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => updateField(field.key as keyof typeof form, e.target.value)}
                  placeholder={field.placeholder}
                  readOnly={field.key === 'email'}
                  aria-describedby={field.key === 'email' ? 'profile-email-note' : undefined}
                  className={`w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-[#111827] outline-none transition-all ${
                    field.key === 'email'
                      ? 'cursor-not-allowed text-slate-500'
                      : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white'
                  }`}
                />
                {field.key === 'email' && (
                  <span id="profile-email-note" className="block text-[10px] font-medium leading-4 text-slate-400">
                    Kirish emailini o'zgartirish tasdiqlashni talab qiladi; hozircha u akkaunt xavfsizligi uchun qulflangan.
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Bio */}
        <label className="space-y-1.5 block">
          <span className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
            <span>Bio / Sahifa tavsifi (ixtiyoriy)</span>
          </span>
          <textarea
            disabled={isSaving}
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            rows={3}
            placeholder="O'zingiz, yetishtiradigan mahsulotlaringiz yoki xizmatlaringiz haqida qisqacha yozing..."
            className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-[#111827] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white resize-none transition-all"
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
            className="flex-1 py-3.5 rounded-[18px] bg-[#D84315] text-white font-black text-xs hover:bg-[#BF360C] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
