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
    handle: currentUser.handle || currentUser.email.split('@')[0] || '',
    phone: currentUser.phone || '',
    email: currentUser.email || '',
    location: currentUser.location || '',
    businessName: currentUser.businessName || '',
    bio: currentUser.bio || '',
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
      const err = "Faqat JPG, JPEG, PNG va WEBP formatidagi rasmlar qo'llab-quvvatlanadi";
      setErrorMessage(err);
      showToast(err);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const err = "Rasm hajmi 5 MB dan oshmasligi kerak (tanlangan hajmi: " + (file.size / (1024 * 1024)).toFixed(1) + " MB)";
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

    if (!form.name.trim()) {
      const err = "Iltimos, ism yoki fermer nomini kiriting";
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
        handle: form.handle.trim().toLowerCase().replace(/^@/, ''),
        email: form.email.trim(),
        phone: form.phone.trim(),
        avatar: finalAvatarUrl,
        cover: finalCoverUrl,
        location: form.location.trim(),
        businessName: form.businessName.trim(),
        bio: form.bio.trim(),
      });

      showToast("Profil ma'lumotlari muvaffaqiyatli saqlandi!");
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
          className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-lg text-[#111827]">Profilni tahrirlash</h1>
          <p className="text-[11px] text-slate-400 font-medium">Fermer sahifasi va aloqa ma'lumotlari</p>
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

        {/* Cover Preview */}
        <div className="relative h-32 overflow-hidden rounded-[20px] bg-slate-100 border border-slate-200">
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-slate-700 to-slate-900" />
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute right-3 top-3 rounded-full bg-black/60 hover:bg-black/80 px-3.5 py-1.5 text-[11px] font-black text-white backdrop-blur-md transition-colors"
          >
            Cover almashtirish
          </button>
        </div>

        {/* Avatar Preview */}
        <div className="flex items-center gap-4">
          <div className="relative">
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
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#E53935] text-white flex items-center justify-center shadow-sm hover:bg-[#C62828] transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h3 className="font-black text-sm text-[#111827]">{form.name || 'Fermer'}</h3>
            <p className="text-xs text-slate-500 font-semibold">@{form.handle || 'user'}</p>
            <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black">
              JPG, PNG, WEBP (max 5 MB)
            </span>
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'name', label: 'Ism/Fermer nomi', icon: Edit3 },
            { key: 'handle', label: 'Username', icon: KeyRound },
            { key: 'phone', label: 'Telefon', icon: Phone },
            { key: 'email', label: 'Email', icon: Mail },
            { key: 'businessName', label: 'Biznes nomi', icon: Building2 },
            { key: 'location', label: 'Hudud', icon: MapPin },
          ].map((field) => {
            const Icon = field.icon;
            return (
              <label key={field.key} className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-[#E53935]" />
                  {field.label}
                </span>
                <input
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => updateField(field.key as keyof typeof form, e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-sm font-semibold text-[#111827] outline-none focus:border-[#E53935] focus:bg-white transition-colors"
                />
              </label>
            );
          })}
        </div>

        <label className="space-y-1.5 block">
          <span className="text-[11px] font-bold text-slate-500">Bio</span>
          <textarea
            value={form.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-[14px] border border-slate-200 bg-slate-50 text-sm font-semibold text-[#111827] outline-none focus:border-[#E53935] focus:bg-white resize-none transition-colors"
          />
        </label>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 py-3.5 rounded-[18px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-3.5 rounded-[18px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
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
