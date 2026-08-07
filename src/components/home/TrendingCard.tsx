import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';

export const TrendingCard: React.FC = () => {
  const { posts, setProductDetail } = useAgroStore();
  const trendingListings = posts.slice(0, 3);

  return (
    <div className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-3 select-none">
      <h3 className="font-extrabold text-sm text-[#111827] flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-amber-500" />
        Ommabop e'lonlar
      </h3>
      <div className="space-y-2.5">
        {trendingListings.map((item) => (
          <div
            key={item.id}
            onClick={() => setProductDetail(item)}
            className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-[16px] cursor-pointer transition-colors"
          >
            <img
              src={item.posterUrl || item.mediaUrl}
              alt={item.title}
              className="w-12 h-12 rounded-[14px] object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs text-[#111827] truncate">{item.title}</h4>
              <div className="flex items-center justify-between text-[11px] mt-0.5">
                <span className="font-black text-[#E53935]">{item.price}</span>
                <span className="text-slate-400 font-semibold">{item.likesCount} layk</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
