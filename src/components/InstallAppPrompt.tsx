import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone || sessionStorage.getItem('onbozor-install-dismissed') === 'true') return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!installEvent || dismissed) return null;

  const installApp = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismissPrompt = () => {
    sessionStorage.setItem('onbozor-install-dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="mobile-install-prompt fixed left-3 right-3 z-[60] sm:left-auto sm:right-4 sm:w-[340px]">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
        <img src="/logo.png" alt="OnBozor" className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black text-slate-900">OnBozor ilovasini o‘rnating</p>
          <p className="mt-0.5 text-[11px] text-slate-500">Tezroq kirish va qulay foydalanish</p>
        </div>
        <button
          type="button"
          onClick={() => void installApp()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#D84315] px-3 py-2 text-[11px] font-black text-white"
        >
          <Download className="h-3.5 w-3.5" />
          O‘rnatish
        </button>
        <button type="button" onClick={dismissPrompt} aria-label="Yopish" className="shrink-0 text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
