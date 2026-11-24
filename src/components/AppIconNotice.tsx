import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/**
 * One-time hint for apps installed before the logo change (2026-11-24).
 * A home-screen icon is copied at install time: iPhone and most non-Chrome
 * browsers never refresh it, Android Chrome does so on its own after a while.
 * index.html marks storage that existed before this change as 'old'.
 */
const KEY = 'mollbazar-icon-version';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const remember = () => {
  try {
    localStorage.setItem(KEY, '2');
  } catch {
    // Storage may be unavailable; the hint then simply shows again next time.
  }
};

export function AppIconNotice() {
  const [show, setShow] = useState(() => {
    try {
      return isStandalone() && localStorage.getItem(KEY) === 'old';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // An app installed from now on already carries the new icon.
    window.addEventListener('appinstalled', remember);
    return () => window.removeEventListener('appinstalled', remember);
  }, []);

  if (!show) return null;

  const close = () => {
    remember();
    setShow(false);
  };

  return (
    <div role="status" className="mobile-install-prompt fixed left-3 right-3 z-[60] sm:left-auto sm:right-4 sm:w-[360px]">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
        <img src="/logo.png?v=2" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-slate-900">MollBazar logotipi yangilandi</p>
          {isIos() ? (
            <p className="mt-1 text-[11px] leading-snug text-slate-600">
              Ekrandagi belgi eski bo‘lsa: belgini bosib turing → «Ilovani o‘chirish». Keyin Safari’da mollbazar.uz →
              «Ulashish» (Share) → «Ekranga qo‘shish» (Add to Home Screen). Hisobingiz saqlanadi, faqat qayta kirasiz.
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-slate-600">
              Ekrandagi belgi 1–2 kunda o‘zi yangilanadi (so‘rasa, «Yangilash»ni bosing). Yangilanmasa: belgini o‘chirib,
              mollbazar.uz saytidan ilovani qayta o‘rnating. Hisobingiz saqlanadi.
            </p>
          )}
          <button
            type="button"
            onClick={close}
            className="mt-2 rounded-xl bg-[#D84315] px-3 py-1.5 text-[11px] font-black text-white"
          >
            Tushunarli
          </button>
        </div>
        <button type="button" onClick={close} aria-label="Yopish" className="shrink-0 text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
