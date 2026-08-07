import React, { useMemo, useState } from 'react';
import { Modal } from './ui/Modal';
import { useAgroStore } from '../store/useAgroStore';
import { Copy, Check, Send } from 'lucide-react';

export const ShareModal: React.FC = () => {
  const { sharePost, setSharePost, showToast } = useAgroStore();
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => {
    if (!sharePost) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://onbozor.uz';
    return `${origin}/?post=${encodeURIComponent(sharePost.id)}`;
  }, [sharePost]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    showToast('Havola nusxalandi!');
    setTimeout(() => setCopied(false), 2000);
  };

  const telegramUrl = sharePost
    ? `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(sharePost.title)}`
    : '#';

  return (
    <Modal
      isOpen={Boolean(sharePost)}
      onClose={() => setSharePost(null)}
      title="E'lonni ulashish"
    >
      <div className="space-y-4 text-center">
        <p className="text-xs text-slate-500 font-medium line-clamp-2">
          {sharePost?.title || "E'lon havolasini yuboring"}
        </p>

        <div className="rounded-[16px] bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500 break-all text-left">
          {shareUrl}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={handleCopy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-[20px] bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#111827] shadow-sm">
              {copied ? <Check className="w-5 h-5 text-[#22C55E]" /> : <Copy className="w-5 h-5" />}
            </div>
            <span className="text-[11px] font-bold text-slate-700">Nusxalash</span>
          </button>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSharePost(null)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-[20px] bg-sky-50 hover:bg-sky-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-sky-800">Telegram</span>
          </a>
        </div>
      </div>
    </Modal>
  );
};
