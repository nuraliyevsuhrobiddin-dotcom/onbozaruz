import React, { useState } from 'react';
import { AlertCircle, Image, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Post } from '../../data/mockAgroData';
import { Product } from '../../data/mockAgroData';

interface MediaCheckResult {
  id: string;
  type: 'post' | 'product';
  title: string;
  url: string;
  status: 'ok' | 'broken' | 'checking';
}

interface AdminMediaTabProps {
  posts: Post[];
  products: Product[];
  showToast: (msg: string) => void;
}

export const AdminMediaTab: React.FC<AdminMediaTabProps> = ({ posts, products, showToast }) => {
  const [results, setResults] = useState<MediaCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const runCheck = async () => {
    setIsChecking(true);
    setChecked(false);

    const mediaItems: MediaCheckResult[] = [
      ...posts.slice(0, 30).map((p) => ({
        id: p.id,
        type: 'post' as const,
        title: p.title,
        url: p.posterUrl || p.mediaUrl,
        status: 'checking' as const,
      })),
      ...products.slice(0, 20).map((p) => ({
        id: p.id,
        type: 'product' as const,
        title: p.title,
        url: p.image,
        status: 'checking' as const,
      })),
    ];

    setResults(mediaItems);

    // Check each URL
    const updatedResults = await Promise.all(
      mediaItems.map(async (item) => {
        try {
          if (!item.url) return { ...item, status: 'broken' as const };
          if (item.url.startsWith('blob:') || item.url.startsWith('data:')) {
            return { ...item, status: 'ok' as const };
          }
          // Use an image element to check
          const ok = await new Promise<boolean>((resolve) => {
            const img = document.createElement('img');
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = item.url;
            setTimeout(() => resolve(false), 5000);
          });
          return { ...item, status: ok ? 'ok' as const : 'broken' as const };
        } catch {
          return { ...item, status: 'broken' as const };
        }
      })
    );

    setResults(updatedResults);
    setChecked(true);
    setIsChecking(false);

    const broken = updatedResults.filter((r) => r.status === 'broken').length;
    showToast(broken > 0 ? `${broken} ta singan media topildi` : 'Barcha media fayllar yaxshi!');
  };

  const okCount = results.filter((r) => r.status === 'ok').length;
  const brokenCount = results.filter((r) => r.status === 'broken').length;

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-xl text-[#111827]">Media audit</h2>
          <p className="text-xs text-slate-400 font-medium">
            {posts.length + products.length} ta media faylni tekshirish
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={isChecking}
          className="px-3.5 py-2 rounded-[16px] bg-[#E53935] text-white font-black text-xs hover:bg-[#C62828] transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Tekshirilyapti...' : 'Tekshirishni boshlash'}
        </button>
      </div>

      {checked && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Yaxshi', val: okCount, color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
            { label: 'Singan', val: brokenCount, color: 'text-red-600 bg-red-50', icon: XCircle },
            { label: 'Jami', val: results.length, color: 'text-slate-600 bg-slate-100', icon: Image },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-[20px] border border-slate-200/80 p-3 shadow-sm text-center">
                <span className={`inline-flex w-8 h-8 mx-auto rounded-[12px] items-center justify-center ${s.color} mb-1`}>
                  <Icon className="w-4 h-4" />
                </span>
                <p className="font-black text-base text-[#111827]">{s.val}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {!checked && !isChecking && (
        <div className="py-14 text-center bg-white rounded-[22px] border border-slate-200/80">
          <Image className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-500">Media audit ishga tushurilmagan</p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            «Tekshirishni boshlash» tugmasini bosib barcha rasm va video havolalarni tekshiring
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results
            .filter((r) => r.status === 'broken')
            .map((r) => (
              <div key={r.id} className="bg-red-50 border border-red-200 rounded-[16px] p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-red-700 truncate">{r.title}</p>
                  <p className="text-[10px] text-red-500 font-medium truncate">{r.url || '(URL mavjud emas)'}</p>
                </div>
                <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">{r.type}</span>
              </div>
            ))}
          {brokenCount === 0 && checked && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-[20px] p-4 text-center">
              <p className="text-sm font-bold text-emerald-700">✅ Barcha media fayllar yaxshi holda!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
