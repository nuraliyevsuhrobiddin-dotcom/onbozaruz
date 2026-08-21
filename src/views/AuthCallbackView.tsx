import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authClient, completeAuthCallback, type AuthUser } from '../api/authClient';
import { emailService } from '../api/emailService';

interface AuthCallbackViewProps {
  onSuccess: (user: AuthUser) => void;
}

export function AuthCallbackView({ onSuccess }: AuthCallbackViewProps) {
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        await completeAuthCallback();
        const user = await authClient.restoreSession();
        if (!user) throw new Error('Tasdiqlangan foydalanuvchi sessiyasi olinmadi.');
        if (active) {
          if (user.email && user.email.includes('@')) {
            void emailService.sendWelcomeEmail(user.email, user.name, user.role);
          }
          onSuccess(user);
        }
      } catch (callbackError: unknown) {
        if (active) {
          setError(callbackError instanceof Error ? callbackError.message : 'Email tasdiqlanmadi.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [onSuccess]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-200">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">Email tasdiqlanmadi</h1>
            <p className="mt-3 text-sm text-red-600">{error}</p>
            <a href="/#home" className="mt-6 inline-block text-sm font-bold text-[#D84315]">
              Bosh sahifaga qaytish
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D84315]" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Email tasdiqlanmoqda...</h1>
            <p className="mt-2 text-sm text-slate-500">Bir necha soniya kuting.</p>
          </>
        )}
      </section>
    </main>
  );
}
