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

// Telefon/SMS orqali kirish Supabase'da SMS-provayder (Twilio va h.k.)
// sozlanmaguncha vaqtincha yashirilgan. Provayder ulangach, shu bitta
// qiymatni true qilish yetarli — qolgan hamma joy avtomatik qayta yoqiladi.
const PHONE_SIGNUP_ENABLED = false;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
  return `+998${localDigits}`;
};

// Official Google "G" logo, inline so no external asset/network request is needed.
const GoogleSVG = () => (
  <svg viewBox="0 0 48 48" className="h-4.5 w-4.5" xmlns="http://www.w3.org/2000/svg">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5b35f5]/20';
const inputClass = `w-full min-h-12 rounded-2xl border border-[#ded4c8] bg-[#fffdfa] py-3.5 pl-11 pr-4 text-sm text-[#26231f] placeholder:text-[#a39a90] shadow-[0_1px_2px_rgba(49,38,26,.03)] transition duration-200 hover:border-[#c9bbae] focus:border-[#5b35f5] focus:bg-white ${focusRing}`;
const iconClass = 'text-[#93887d]';

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [contactMode, setContactMode] = useState<ContactMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const resetMessages = () => { setError(''); setSuccess(''); };

  // Google OAuth navigates the whole page away to Google's consent screen,
  // then back to /auth/callback — there's nothing further to do here on
  // success, only the (rare) case where the redirect itself fails to start.
  const handleGoogleSignIn = async () => {
    resetMessages();
    setGoogleLoading(true);
    const result = await authClient.signInWithProvider('google');
    if (!result.ok) {
      setError(result.error || "Google orqali kirishda xatolik yuz berdi.");
      setGoogleLoading(false);
    }
  };
  const switchMode = (next: AuthMode) => { setMode(next); resetMessages(); };

  const validate = () => {
    if (mode === 'signup' && name.trim().length < 2) return 'Ism yoki fermer nomini kiriting.';
    if (contactMode === 'email' && !emailRegex.test(identifier.trim())) return "To'g'ri email manzilini kiriting.";
    if (contactMode === 'phone' && !phoneRegex.test(identifier.replace(/\s/g, ''))) return '+998 XX XXX XX XX formatida telefon kiriting.';
    if (password.length < 6) return "Parol kamida 6 ta belgidan iborat bo'lsin.";
    return '';
  };

  // name → handle: harflar, raqamlar, _; bo'shliqlar → _; boshqa belgilar o'chiriladi
  const deriveHandle = (rawName: string): string => {
    return rawName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30)
      || `user_${Date.now().toString().slice(-5)}`;
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

      // handle: name'dan avtomatik yasaladi (masalan, "Anvar Agro" → "anvar_agro")
      const autoHandle = deriveHandle(name);

      const result = mode === 'signup'
        ? await authClient.signUp({
            email: contactMode === 'email' ? normalizedIdentifier : '',
            password,
            name: name.trim(),
            handle: autoHandle,
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

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className={`mb-5 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-[#e4d9cd] bg-white px-4 py-3.5 text-sm font-black text-[#26231f] shadow-[0_1px_2px_rgba(49,38,26,.05)] transition hover:border-[#c9bbae] hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
            >
              {googleLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <GoogleSVG />}
              {mode === 'login' ? 'Google orqali kirish' : "Google orqali ro'yxatdan o'tish"}
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#e8dfd5]" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#a39a90]">yoki</span>
              <div className="h-px flex-1 bg-[#e8dfd5]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'signup' && <label className="block" htmlFor="auth-name"><span className="mb-1.5 block text-xs font-bold text-[#4c433b]">Ism yoki fermer nomi</span><div className="relative"><User className={`absolute left-4 top-4 h-4 w-4 ${iconClass}`} /><input id="auth-name" value={name} onChange={e => setName(e.target.value)} placeholder="Masalan, Anvar Agro" className={inputClass} /></div></label>}
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-[#4c433b]">{contactMode === 'email' ? 'Email manzili' : 'Telefon raqami'}</span>
                  {PHONE_SIGNUP_ENABLED && <div className="flex shrink-0 rounded-lg bg-[#f4eee6] p-0.5 text-[10px] font-black"><button type="button" onClick={() => { setContactMode('email'); setIdentifier(''); }} className={`min-h-8 rounded-md px-2.5 transition ${contactMode === 'email' ? 'bg-[#fffdfa] text-[#5b35f5] shadow-sm' : 'text-[#84796e] hover:text-[#4c433b]'} ${focusRing}`}>Email</button><button type="button" onClick={() => { setContactMode('phone'); setIdentifier(''); }} className={`min-h-8 rounded-md px-2.5 transition ${contactMode === 'phone' ? 'bg-[#fffdfa] text-[#5b35f5] shadow-sm' : 'text-[#84796e] hover:text-[#4c433b]'} ${focusRing}`}>Telefon</button></div>}
                </div>
                <div className="relative"><span className={`absolute left-4 top-4 ${iconClass}`}>{contactMode === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}</span><input id={`auth-${contactMode}`} aria-label={contactMode === 'email' ? 'Email manzili' : 'Telefon raqami'} type={contactMode === 'email' ? 'email' : 'tel'} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={contactMode === 'email' ? 'sizning@emailingiz.uz' : '+998 90 123 45 67'} className={inputClass} /></div>
              </div>
              <label className="block" htmlFor="auth-password"><span className="mb-1.5 block text-xs font-bold text-[#4c433b]">Parol</span><div className="relative"><Lock className={`absolute left-4 top-4 h-4 w-4 ${iconClass}`} /><input id="auth-password" aria-label="Parol" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Kamida 6 ta belgi" className={`${inputClass} pr-12`} /><button type="button" onClick={() => setShowPassword(v => !v)} className={`absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#93887d] transition hover:bg-[#f4eee6] hover:text-[#4c433b] ${focusRing}`} aria-label="Parolni ko'rsatish">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
              {error && <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#f1c9c3] bg-[#fff3f1] p-3 text-xs font-semibold leading-5 text-[#a33229]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
              {success && <div role="status" className="rounded-2xl border border-[#cfe5d2] bg-[#f0f8f1] p-3 text-xs font-semibold leading-5 text-[#28643a]">{success}</div>}
              <button disabled={loading} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] px-4 py-3.5 text-sm font-black text-white shadow-[0_8px_18px_rgba(91,53,245,.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{mode === 'login' ? 'Kirish' : 'Akkaunt yaratish'}<ArrowRight className="h-4 w-4" /></>}</button>
            </form>
          </>}
        </motion.section>
        <p className="mt-5 text-center text-[11px] font-semibold text-[#8e8276]">OnBozor — fermerlar va xaridorlar uchun ishonchli bozor</p>
      </div>
    </main>
  );
};
