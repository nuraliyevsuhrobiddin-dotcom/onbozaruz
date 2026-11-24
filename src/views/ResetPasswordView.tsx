import React, { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock } from 'lucide-react';
import { apiClient, authClient, translateAuthError, type AuthUser } from '../api/authClient';

interface ResetPasswordViewProps {
  /** Called once the new password is saved and the user is signed in. */
  onDone: (user: AuthUser) => void | Promise<void>;
  /** Back to the sign-in screen to ask for a new link. */
  onRequestNewLink: () => void;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5b35f5]/20';
const inputClass = `w-full min-h-12 rounded-2xl border border-[#ded4c8] bg-[#fffdfa] py-3.5 pl-11 pr-12 text-sm text-[#26231f] placeholder:text-[#a39a90] transition hover:border-[#c9bbae] focus:border-[#5b35f5] focus:bg-white ${focusRing}`;

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  disabled: boolean;
}

const PasswordField: React.FC<PasswordFieldProps> = ({ id, label, value, onChange, visible, onToggleVisible, disabled }) => (
  <label className="block" htmlFor={id}>
    <span className="mb-1.5 block text-xs font-bold text-[#4c433b]">{label}</span>
    <div className="relative">
      <Lock className="absolute left-4 top-4 h-4 w-4 text-[#93887d]" />
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Kamida 6 ta belgi"
        className={inputClass}
      />
      <button type="button" onClick={onToggleVisible} aria-label={visible ? 'Parolni yashirish' : "Parolni ko'rsatish"} className={`absolute right-2 top-1/2 flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#93887d] hover:bg-[#f4eee6] ${focusRing}`}>
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </label>
);

/**
 * Opened from the password-reset e-mail (/auth/reset?token_hash=...).
 * The one-time token is only spent when the user submits the new password,
 * so mail scanners that pre-open links cannot use it up.
 */
export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onDone, onRequestNewLink }) => {
  const tokenHash = new URLSearchParams(window.location.search).get('token_hash') || '';
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkExpired, setLinkExpired] = useState(!tokenHash);
  const verified = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (password.length < 6) { setError("Parol kamida 6 ta belgidan iborat bo'lsin."); return; }
    if (password !== password2) { setError('Parollar bir xil emas.'); return; }
    setLoading(true);
    try {
      if (!verified.current) {
        const { error: verifyError } = await apiClient.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (verifyError) {
          setLinkExpired(true);
          setError(translateAuthError(verifyError.message));
          return;
        }
        verified.current = true; // the token is spent; retries only repeat the password update
      }
      const { error: updateError } = await apiClient.auth.updateUser({ password });
      if (updateError) { setError(translateAuthError(updateError.message)); return; }
      const user = await authClient.restoreSession();
      if (!user) { setError("Parol saqlandi. Endi yangi parol bilan kiring."); return; }
      await onDone(user);
    } catch (err) {
      setError(translateAuthError(err instanceof Error ? err.message : 'Tarmoq xatosi'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-[#f5efe6] px-4 py-10 text-[#26231f]">
      <div className="mx-auto mb-7 flex w-full max-w-[450px] items-center gap-3 px-1">
        <img src="/logo.png?v=2" alt="MollBazar" className="h-11 w-11 rounded-2xl object-cover shadow-[0_6px_16px_rgba(49,38,26,.12)] ring-1 ring-black/[.06]" />
        <div>
          <div className="text-xl font-black tracking-[-.04em]">MollBazar</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#887c70]">B2B ulgurji bozor</div>
        </div>
      </div>
      <section className="mx-auto w-full max-w-[450px] rounded-[28px] border border-[#e4d9cd] bg-[#fffdfa] p-6 shadow-[0_26px_70px_rgba(63,43,25,.12)] sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#5b35f5]"><KeyRound className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-black tracking-[-.03em]">Yangi parol</h1>
            <p className="text-sm text-[#766b61]">MollBazar akkauntingiz uchun yangi parol o'rnating.</p>
          </div>
        </div>

        {linkExpired && !tokenHash ? (
          <div className="space-y-4">
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#f1c9c3] bg-[#fff3f1] p-3 text-sm font-semibold text-[#a33229]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />Havola noto'g'ri yoki to'liq ochilmadi.
            </div>
            <button onClick={onRequestNewLink} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] px-4 text-sm font-black text-white ${focusRing}`}>
              Yangi havola so'rash <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <PasswordField id="reset-password" label="Yangi parol" value={password} onChange={setPassword}
              visible={show} onToggleVisible={() => setShow((v) => !v)} disabled={loading} />
            <PasswordField id="reset-password2" label="Yangi parolni takrorlang" value={password2} onChange={setPassword2}
              visible={show} onToggleVisible={() => setShow((v) => !v)} disabled={loading} />
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-2xl border border-[#f1c9c3] bg-[#fff3f1] p-3 text-xs font-semibold leading-5 text-[#a33229]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
              </div>
            )}
            {linkExpired ? (
              <button type="button" onClick={onRequestNewLink} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] px-4 text-sm font-black text-white ${focusRing}`}>
                Yangi havola so'rash <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button disabled={loading} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b35f5] to-[#7c3aed] px-4 text-sm font-black text-white disabled:opacity-60 ${focusRing}`}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Parolni saqlash <ArrowRight className="h-4 w-4" /></>}
              </button>
            )}
          </form>
        )}
      </section>
    </main>
  );
};
