import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  AtSign,
  Store,
  ShoppingBag,
} from 'lucide-react';
import { authClient, type AuthUser, type SignUpFields } from '../api/authClient';
import { REGIONS } from '../data/mockAgroData';

interface AuthViewProps {
  onSuccess: (user: AuthUser) => void;
  onBack?: () => void;
}

type AuthMode = 'login' | 'signup';

interface FieldError {
  name?: string;
  handle?: string;
  email?: string;
  phone?: string;
  location?: string;
  businessName?: string;
  password?: string;
  confirmPassword?: string;
}

const phoneRegex = /^\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998')) {
    const rest = digits.slice(3);
    const parts: string[] = [];
    if (rest.length > 0) parts.push(rest.slice(0, 2));
    if (rest.length > 2) parts.push(rest.slice(2, 5));
    if (rest.length > 5) parts.push(rest.slice(5, 7));
    if (rest.length > 7) parts.push(rest.slice(7, 9));
    return `+998 ${parts.join(' ')}`.trimEnd();
  }
  return raw;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<SignUpFields & { confirmPassword?: string }>({
    name: '',
    handle: '',
    email: '',
    phone: '+998 ',
    location: "Toshkent sh.",
    businessName: '',
    role: 'seller',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError('');
  };

  const handlePhoneChange = (raw: string) => {
    if (raw.length < 5) {
      updateField('phone', '+998 ');
      return;
    }
    updateField('phone', formatPhone(raw));
  };

  // Validate specific step for Signup
  const validateStep = (stepNum: 1 | 2 | 3): boolean => {
    const errors: FieldError = {};

    if (stepNum === 1) {
      if (!form.name.trim()) errors.name = 'Ism-familiyangizni kiriting';
      else if (form.name.trim().length < 2) errors.name = 'Ism kamida 2 ta harf bo\'lsin';

      const cleanHandle = form.handle.trim().replace(/^@/, '');
      if (!cleanHandle) errors.handle = 'Username (masalan: alisher_agro) kiriting';
      else if (cleanHandle.length < 3) errors.handle = 'Username kamida 3 ta belgi bo\'lsin';
    }

    if (stepNum === 2) {
      if (!phoneRegex.test(form.phone.replace(/\s/g, ''))) {
        errors.phone = 'O\'zbekiston raqamini kiriting: +998 XX XXX XX XX';
      }

      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'To\'g\'ri email manzilingizni kiriting';
      }

      if (!form.location) {
        errors.location = 'Hududni tanlang';
      }
    }

    if (stepNum === 3) {
      if (!form.password || form.password.length < 6) {
        errors.password = 'Parol kamida 6 ta belgi bo\'lishi kerak';
      }

      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = 'Parollar bir-biriga mos kelmadi';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Login form
  const validateLogin = (): boolean => {
    const errors: FieldError = {};
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Email manzilingizni kiriting';
    }
    if (!form.password) {
      errors.password = 'Parolni kiriting';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(signupStep)) {
      if (signupStep < 3) setSignupStep((s) => (s + 1) as 1 | 2 | 3);
    }
  };

  const handlePrevStep = () => {
    if (signupStep > 1) setSignupStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (mode === 'login') {
      if (!validateLogin()) return;
    } else {
      if (!validateStep(3)) return;
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'signup') {
        result = await authClient.signUp({
          email: form.email,
          password: form.password,
          name: form.name,
          handle: form.handle,
          phone: form.phone,
          location: form.location,
          businessName: form.businessName,
          role: form.role,
        });
      } else {
        result = await authClient.signIn(form.email, form.password);
      }

      if (result.ok && result.user) {
        // Clean legacy cached forms to avoid old demo data leak
        window.localStorage.removeItem('onbozor-profile-form');
        onSuccess(result.user);
      } else {
        setServerError(result.error || 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tarmoq xatosi. Internet aloqasini tekshiring.';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setSignupStep(1);
    setServerError('');
    setFieldErrors({});
    setShowPassword(false);
    setShowConfirm(false);
  };

  return (
    <div
      className="min-h-screen flex bg-[#F8FAFC]"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[390px] xl:w-[440px] shrink-0 bg-white border-r border-slate-200/80 p-8 xl:p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #E53935 0, #E53935 1px, transparent 0, transparent 50%)',
            backgroundSize: '18px 18px',
          }}
        />
        <div className="absolute top-[-80px] right-[-80px] w-[280px] h-[280px] rounded-full bg-red-100/50 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo.png" alt="OnBozor" className="w-11 h-11 rounded-[14px] object-cover ring-1 ring-slate-200" />
          <div>
            <div className="text-2xl font-black text-[#111827] tracking-tight">OnBozor</div>
            <div className="text-[10px] text-slate-400 font-semibold tracking-[0.16em] uppercase">Agro Marketplace</div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="mb-5 inline-flex rounded-lg bg-red-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#E53935]">Yangi hamkorlar uchun</div>
          <h1 className="text-[34px] xl:text-[40px] font-black text-[#111827] leading-[1.1] tracking-tight mb-4">
            Bozoringizga<br />bir necha qadamda<br />ulang
          </h1>
          <p className="max-w-[320px] text-slate-500 text-[14px] leading-relaxed">
            Fermerlar, sotuvchilar va ulgurji xaridorlarni bir joyga bog'laydigan ishonchli agro maydon.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { label: 'Profilingizni yarating', value: '01' },
              { label: 'Aloqani tasdiqlang', value: '02' },
              { label: 'Savdoni boshlang', value: '03' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[11px] font-black text-[#E53935] ring-1 ring-slate-200">{s.value}</div>
                <div className="text-[12px] font-bold text-slate-700">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-slate-400 text-[11px]">
          © 2026 OnBozor — Barcha huquqlar himoyalangan
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-7 sm:p-10 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[450px] relative z-10"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <img src="/logo.png" alt="OnBozor" className="w-10 h-10 rounded-[13px] object-cover ring-1 ring-slate-200" />
            <div>
              <div className="text-xl font-black text-[#111827] tracking-tight">OnBozor</div>
              <div className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Agro Marketplace</div>
            </div>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute top-0 right-0 text-xs font-bold text-slate-500 hover:text-[#E53935] transition-colors"
            >
              Ortga qaytish
            </button>
          )}

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-[26px] font-black text-[#111827] tracking-tight">
              {mode === 'login' ? 'Tizimga kirish' : "Ro'yxatdan o'tish"}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {mode === 'login'
                ? 'Email va parolingizni kiriting'
                : `Bosqichma-bosqich ma'lumotlarni to'ldiring (${signupStep}/3-bosqich)`}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-white border border-slate-200/80 rounded-xl p-1 mb-6 shadow-[0_4px_14px_rgba(15,23,42,0.03)] gap-1">
            {(['login', 'signup'] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                  mode === m
                    ? 'bg-[#E53935] text-white shadow-sm shadow-red-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {m === 'login' ? 'Kirish' : "Ro'yxatdan o'tish"}
              </button>
            ))}
          </div>

          {/* Signup Progress Bar (Step 1, 2, 3) */}
          {mode === 'signup' && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                <span className={signupStep >= 1 ? 'text-[#E53935]' : ''}>01 · Profil</span>
                <span className={signupStep >= 2 ? 'text-[#E53935]' : ''}>02 · Aloqa</span>
                <span className={signupStep >= 3 ? 'text-[#E53935]' : ''}>03 · Xavfsizlik</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E53935] transition-all duration-300 rounded-full"
                  style={{ width: `${(signupStep / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-[0_10px_28px_rgba(15,23,42,0.045)] p-5 sm:p-6">
            <form onSubmit={handleSubmit} noValidate>

              {/* ── LOGIN FORM ── */}
              {mode === 'login' && (
                <div>
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Email manzil
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="masalan: foydalanuvchi@gmail.com"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-4 py-3 text-[#111111] text-[14px] outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="mb-5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Parol
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="••••••••"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-11 py-3 text-[#111111] text-[14px] outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── SIGNUP STEP 1: SHAXSIY MA'LUMOTLAR ── */}
              {mode === 'signup' && signupStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Role picker */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Sizning faoliyatingiz
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateField('role', 'seller')}
                        className={`p-3 rounded-2xl border text-left flex flex-col items-start gap-1 transition-all ${
                          form.role === 'seller'
                            ? 'border-[#E53935] bg-red-50/50 text-[#E53935] font-bold shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <Store className="w-5 h-5" />
                        <span className="text-xs">Fermer / Sotuvchi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField('role', 'buyer')}
                        className={`p-3 rounded-2xl border text-left flex flex-col items-start gap-1 transition-all ${
                          form.role === 'buyer'
                            ? 'border-[#E53935] bg-red-50/50 text-[#E53935] font-bold shadow-sm'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <ShoppingBag className="w-5 h-5" />
                        <span className="text-xs">Xaridor / Ulgurji</span>
                      </button>
                    </div>
                  </div>

                  {/* Ism Familiya */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Ism Familiya
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Masalan: Jasur Nuraliyev"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-4 py-3 text-[#111111] text-[14px] placeholder-slate-300 outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Username (Handle) */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Foydalanuvchi nomi (Username)
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        value={form.handle}
                        onChange={(e) => updateField('handle', e.target.value.toLowerCase().replace(/\s/g, ''))}
                        placeholder="jasur_agro"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.handle ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-4 py-3 text-[#111111] text-[14px] placeholder-slate-300 outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                    </div>
                    {fieldErrors.handle ? (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.handle}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-400">Profil manzilingiz: onbozor.uz/@{form.handle || 'username'}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── SIGNUP STEP 2: ALOQA VA MANZIL ── */}
              {mode === 'signup' && signupStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Phone */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Telefon raqam
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-4 py-3 text-[#111111] text-[14px] placeholder-slate-300 outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Email manzil
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        placeholder="jasur@gmail.com"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-4 py-3 text-[#111111] text-[14px] placeholder-slate-300 outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Location picker */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Hudud (Viloyat)
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <select
                        value={form.location}
                        onChange={(e) => updateField('location', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[#111111] text-[14px] outline-none focus:border-[#E53935]"
                      >
                        {REGIONS.filter((r) => r !== 'Barchasi').map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── SIGNUP STEP 3: BIZNES VA PAROL ── */}
              {mode === 'signup' && signupStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Business Name (Optional) */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Biznes / Fermer xo'jaligi nomi <span className="text-slate-400 font-normal">(Ixtiyoriy)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type="text"
                        value={form.businessName}
                        onChange={(e) => updateField('businessName', e.target.value)}
                        placeholder="Masalan: Vodiy Mevachilik MChJ"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[#111111] text-[14px] placeholder-slate-300 outline-none focus:border-[#E53935]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Parol
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="Kamida 6 ta belgi"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-11 py-3 text-[#111111] text-[14px] outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Parolni tasdiqlang
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        placeholder="Parolni qayta kiriting"
                        className={`w-full bg-slate-50 border ${
                          fieldErrors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-slate-200'
                        } rounded-xl pl-10 pr-11 py-3 text-[#111111] text-[14px] outline-none focus:border-[#E53935] focus:ring-2 focus:ring-[#E53935]/10 transition-all`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.confirmPassword}
                      </p>
                    )}
                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <p className="mt-1.5 text-[11px] text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Parollar mos keldi
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Server error */}
              <AnimatePresence>
                {serverError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[13px] text-red-600">{serverError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step Actions for Signup */}
              {mode === 'signup' ? (
                <div className="flex items-center gap-2 mt-4">
                  {signupStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Orqaga</span>
                    </button>
                  )}

                  {signupStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white bg-[#E53935] hover:bg-[#C62828] transition-all flex items-center justify-center gap-2 shadow-md shadow-red-200"
                    >
                      <span>Keyingi bosqich</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 rounded-xl font-bold text-[14px] text-white bg-[#E53935] hover:bg-[#C62828] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-md shadow-red-200"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Yaratilmoqda...</span>
                        </>
                      ) : (
                        <>
                          <span>Ro'yxatdan o'tishni yakunlash</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                /* Submit for Login */
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-[15px] text-white bg-[#E53935] hover:bg-[#C62828] disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirish</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </form>
          </div>

          {/* Switch mode link */}
          <p className="text-center text-[13px] text-slate-400 mt-5">
            {mode === 'login' ? 'Hali hisobingiz yo\'qmi?' : 'Allaqachon hisobingiz bormi?'}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="ml-1.5 text-[#E53935] font-bold hover:text-[#C62828] transition-colors"
            >
              {mode === 'login' ? "Ro'yxatdan o'ting" : 'Kiring'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
