import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { authClient, type AuthUser, type SignUpFields } from '../api/authClient';

interface AuthViewProps {
  onSuccess: (user: AuthUser) => void;
  onBack?: () => void;
}

type AuthMode = 'login' | 'signup' | 'confirmation_pending';
type ContactMode = 'email' | 'phone';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
  return `+998${localDigits}`;
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5b35f5]/20';

const GoogleMark = () => (
  <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
    <path d="M21.35 12.23c0-.72-.06-1.42-.18-2.08H12v3.94h5.23a4.47 4.47 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.92-4.2 2.92-7.25Z" fill="#4285F4" />
    <path d="M12 21.58c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.55 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.58Z" fill="#34A853" />
    <path d="M6.53 13.67A5.86 5.86 0 0 1 6.22 12c0-.58.11-1.14.31-1.67V7.8H3.28A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.2l3.25-2.53Z" fill="#FBBC05" />
    <path d="M12 6.3c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.39 14.63 2.42 12 2.42a9.75 9.75 0 0 0-8.72 5.38l3.25 2.53C7.3 8.02 9.45 6.3 12 6.3Z" fill="#EA4335" />
  </svg>
);

const OneIdMark = () => (
  <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="oneid-brand-gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6D5AE8" />
        <stop offset="1" stopColor="#3567C8" />
      </linearGradient>
    </defs>
    <rect width="24" height="24" rx="7" fill="url(#oneid-brand-gradient)" />
    <circle cx="8.2" cy="9" r="2.1" fill="white" />
    <path d="M4.9 16.65c.38-2.2 1.53-3.38 3.3-3.38s2.92 1.18 3.3 3.38" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M13.45 7.25h5.2M13.45 11.95h5.2M13.45 16.65h3.55" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const inputClass = `w-full min-h-12 rounded-2xl border border-[#ded4c8] bg-[#fffdfa] py-3.5 pl-11 pr-4 text-sm text-[#26231f] placeholder:text-[#a39a90] shadow-[0_1px_2px_rgba(49,38,26,.03)] transition duration-200 hover:border-[#c9bbae] focus:border-[#5b35f5] focus:bg-white ${focusRing}`;
const iconClass = 'text-[#93887d]';

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [contactMode, setContactMode] = useState<ContactMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => { setError(''); setSuccess(''); };
  const switchMode = (next: AuthMode) => { setMode(next); resetMessages(); };

  const validate = () => {
    if (mode === 'signup' && name.trim().length < 2) return 'Ism yoki fermer nomini kiriting.';
    if (contactMode === 'email' && !emailRegex.test(identifier.trim())) return "To'g'ri email manzilini kiriting.";
    if (contactMode === 'phone' && !phoneRegex.test(identifier.replace(/\s/g, ''))) return '+998 XX XXX XX XX formatida telefon kiriting.';
    if (password.length < 6) return "Parol kamida 6 ta belgidan iborat bo'lsin.";
    if (mode === 'signup' && password !== confirmPassword) return 'Parollar mos kelmadi.';
    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetMessages();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const normalizedIdentifier = contactMode === 'phone'
        ? normalizePhone(identifier)
        : identifier.trim().toLowerCase();
      const result = mode === 'signup'
        ? await authClient.signUp({
            email: normalizedIdentifier,
            password,
            name: name.trim(),
            handle: '',
            phone: contactMode === 'phone' ? normalizedIdentifier : '',
            role: 'seller',
          } satisfies SignUpFields)
        : await authClient.signIn(normalizedIdentifier, password);

      if (result.ok && result.user) onSuccess(result.user);
      else if (result.requiresConfirmation) {
        setMode('confirmation_pending');
        setSuccess(result.successMessage || 'Tasdiqlash havolasi yuborildi.');
      } else setError(result.error || 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Tarmoq xatosi yuz berdi.');
    } finally { setLoading(false); }
  };

  const handleProvider = async (provider: 'google' | 'oneid') => {
    resetMessages();
    setLoading(true);
    try {
      const result = await authClient.signInWithProvider(provider);
      if (result.user) onSuccess(result.user);
      else if (result.successMessage) setSuccess(result.successMessage);
      else setError(result.error || 'Bu kirish usuli hozircha mavjud emas.');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (!identifier || contactMode !== 'email') return;
    setResending(true); resetMessages();
    const result = await authClient.resendConfirmationEmail(identifier);
    if (result.ok) setSuccess(result.successMessage || 'Xat qayta yuborildi.');
    else setError(result.error || 'Xatni yuborib bo\'lmadi.');
    setResending(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5efe6] px-4 py-6 text-[#26231f] sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#5b35f5]/[.10] blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-[#d6b27c]/[.16] blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[450px] flex-col justify-center">
        <div className="mb-7 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="OnBozor" className="h-11 w-11 rounded-2xl object-cover shadow-[0_6px_16px_rgba(49,38,26,.12)] ring-1 ring-black/[.06]" />
            <div>
              <div className="text-xl font-black tracking-[-.04em] text-[#26231f]">OnBozor</div>
              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#887c70]">Agro marketplace</div>
            </div>
          </div>
          {onBack && <button onClick={onBack} className={`flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#766b61] transition hover:bg-white hover:text-[#26231f] ${focusRing}`} aria-label="Ortga"><ArrowLeft className="h-5 w-5" /></button>}
        </div>

        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-[#e4d9cd] bg-[#fffdfa] p-5 shadow-[0_26px_70px_rgba(63,43,25,.12)] sm:p-8">
          {mode === 'confirmation_pending' ? (
            <div className="py-5 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#ede9fe] text-[#5b35f5]">{contactMode === 'email' ? <Mail className="h-8 w-8" /> : <Phone className="h-8 w-8" />}</div>
              <h1 className="text-2xl font-black tracking-[-.03em]">{contactMode === 'email' ? 'Emailni tasdiqlang' : 'SMS kodni tasdiqlang'}</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#766b61]">{contactMode === 'email' ? `${identifier} manziliga yuborilgan havolani bosing.` : `${normalizePhone(identifier)} raqamiga yuborilgan SMS kodni kiriting.`}</p>
              {success && <div className="mt-5 flex items-start gap-2 rounded-2xl border border-[#cfe5d2] bg-[#f0f8f1] p-3 text-left text-xs font-semibold leading-5 text-[#28643a]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}
              <button onClick={() => switchMode('login')} className={`mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] px-4 py-3.5 text-sm font-black text-white shadow-[0_8px_18px_rgba(91,53,245,.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>Tasdiqladim, kirish <ArrowRight className="h-4 w-4" /></button>
              {contactMode === 'email' && <button onClick={resend} disabled={resending} className={`mt-3 min-h-11 px-3 text-xs font-bold text-[#766b61] transition hover:text-[#5b35f5] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}>{resending ? 'Yuborilmoqda...' : 'Xat kelmadimi? Qayta yuborish'}</button>}
            </div>
          ) : <>
            <div className="mb-6">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[.18em] text-[#5b35f5]">Xush kelibsiz</p>
              <h1 className="text-[29px] font-black tracking-[-.045em] text-[#26231f]">{mode === 'login' ? 'OnBozorga kiring' : 'Akkaunt yarating'}</h1>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#766b61]">{mode === 'login' ? "Savdoni davom ettirish uchun ma'lumotlaringizni kiriting." : "Faqat kerakli ma'lumotlar. Keyin profilingizni to'ldirasiz."}</p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl border border-[#e8dfd5] bg-[#f4eee6] p-1">
              <button type="button" onClick={() => switchMode('login')} className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${mode === 'login' ? 'bg-[#fffdfa] text-[#5b35f5] shadow-[0_2px_7px_rgba(63,43,25,.10)]' : 'text-[#84796e] hover:text-[#4c433b]'} ${focusRing}`}>Kirish</button>
              <button type="button" onClick={() => switchMode('signup')} className={`min-h-11 rounded-xl px-3 text-sm font-black transition ${mode === 'signup' ? 'bg-[#fffdfa] text-[#5b35f5] shadow-[0_2px_7px_rgba(63,43,25,.10)]' : 'text-[#84796e] hover:text-[#4c433b]'} ${focusRing}`}>Ro'yxatdan o'tish</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'signup' && <label className="block" htmlFor="auth-name"><span className="mb-1.5 block text-xs font-bold text-[#4c433b]">Ism yoki fermer nomi</span><div className="relative"><User className={`absolute left-4 top-4 h-4 w-4 ${iconClass}`} /><input id="auth-name" value={name} onChange={e => setName(e.target.value)} placeholder="Masalan, Anvar Agro" className={inputClass} /></div></label>}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-xs font-bold text-[#4c433b]">{contactMode === 'email' ? 'Email manzili' : 'Telefon raqami'}</span><div className="flex shrink-0 rounded-lg bg-[#f4eee6] p-0.5 text-[10px] font-black"><button type="button" onClick={() => { setContactMode('email'); setIdentifier(''); }} className={`min-h-8 rounded-md px-2.5 transition ${contactMode === 'email' ? 'bg-[#fffdfa] text-[#5b35f5] shadow-sm' : 'text-[#84796e] hover:text-[#4c433b]'} ${focusRing}`}>Email</button><button type="button" onClick={() => { setContactMode('phone'); setIdentifier(''); }} className={`min-h-8 rounded-md px-2.5 transition ${contactMode === 'phone' ? 'bg-[#fffdfa] text-[#5b35f5] shadow-sm' : 'text-[#84796e] hover:text-[#4c433b]'} ${focusRing}`}>Telefon</button></div></div>
                <div className="relative"><span className={`absolute left-4 top-4 ${iconClass}`}>{contactMode === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}</span><input id={`auth-${contactMode}`} aria-label={contactMode === 'email' ? 'Email manzili' : 'Telefon raqami'} type={contactMode === 'email' ? 'email' : 'tel'} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={contactMode === 'email' ? 'sizning@emailingiz.uz' : '+998 90 123 45 67'} className={inputClass} /></div>
              </div>
              <label className="block" htmlFor="auth-password"><span className="mb-1.5 block text-xs font-bold text-[#4c433b]">Parol</span><div className="relative"><Lock className={`absolute left-4 top-4 h-4 w-4 ${iconClass}`} /><input id="auth-password" aria-label="Parol" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Kamida 6 ta belgi" className={`${inputClass} pr-12`} /><button type="button" onClick={() => setShowPassword(v => !v)} className={`absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#93887d] transition hover:bg-[#f4eee6] hover:text-[#4c433b] ${focusRing}`} aria-label="Parolni ko'rsatish">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
              {mode === 'signup' && <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#4c433b]">Parolni takrorlang</span><input aria-label="Parolni takrorlang" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Parolni yana kiriting" className={`${inputClass} px-4`} /></label>}
              {error && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#f1c9c3] bg-[#fff3f1] p-3 text-xs font-semibold leading-5 text-[#a33229]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
              {success && <div role="status" className="rounded-2xl border border-[#cfe5d2] bg-[#f0f8f1] p-3 text-xs font-semibold leading-5 text-[#28643a]">{success}</div>}
              <button disabled={loading} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] px-4 py-3.5 text-sm font-black text-white shadow-[0_8px_18px_rgba(91,53,245,.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{mode === 'login' ? 'Kirish' : 'Akkaunt yaratish'}<ArrowRight className="h-4 w-4" /></>}</button>
            </form>

            <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#9a8e82]"><span className="h-px flex-1 bg-[#e8dfd5]" />Yoki<span className="h-px flex-1 bg-[#e8dfd5]" /></div>
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => handleProvider('google')} disabled={loading} className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#ded4c8] bg-[#fffdfa] px-3 text-xs font-black text-[#4c433b] transition hover:border-[#5b35f5] hover:bg-[#f3f0ff] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}><GoogleMark />Google</button><button type="button" onClick={() => handleProvider('oneid')} disabled={loading} className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#ded4c8] bg-[#fffdfa] px-3 text-xs font-black text-[#4c433b] transition hover:border-[#5b35f5] hover:bg-[#f3f0ff] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}><OneIdMark />OneID</button></div>
          </>}
        </motion.section>
        <p className="mt-5 text-center text-[11px] font-semibold text-[#8e8276]">OnBozor — fermerlar va xaridorlar uchun ishonchli bozor</p>
      </div>
    </main>
  );
};
