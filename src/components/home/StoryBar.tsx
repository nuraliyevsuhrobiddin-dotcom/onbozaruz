import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, X, UserCheck } from 'lucide-react';

export interface FarmerStory {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  online: boolean;
  hasNewStory?: boolean;
}

interface StoryBarProps {
  farmers: FarmerStory[];
  followedSellerIds: string[];
  selectedSeller: string | null;
  onSelectSeller: (sellerId: string | null) => void;
  onOpenFarmerReels?: (sellerId: string) => void;
}

export const StoryBar: React.FC<StoryBarProps> = ({
  farmers,
  followedSellerIds,
  selectedSeller,
  onSelectSeller,
  onOpenFarmerReels,
}) => {
  // Obuna bo'linganlar tepaga, qolganlar pastga
  const sorted = [...farmers].sort((a, b) => {
    const aFollowed = followedSellerIds.includes(a.id) ? 0 : 1;
    const bFollowed = followedSellerIds.includes(b.id) ? 0 : 1;
    return aFollowed - bFollowed;
  });

  const followedCount = followedSellerIds.filter((id) =>
    farmers.some((f) => f.id === id)
  ).length;

  return (
    <div className="bg-white rounded-[22px] border border-slate-200/80 p-3.5 shadow-sm space-y-2.5 select-none">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-black text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#E53935]" />
          Obunalar
          {followedCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 rounded-full px-1.5 py-0.5 text-[10px] font-black">
              <UserCheck className="w-3 h-3" />
              {followedCount}
            </span>
          )}
        </span>
        {selectedSeller && (
          <button
            onClick={() => onSelectSeller(null)}
            className="text-[11px] font-bold text-[#E53935] flex items-center gap-1 hover:underline transition-all"
          >
            <X className="w-3 h-3" />
            Filterni tozalash
          </button>
        )}
      </div>

      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
        <AnimatePresence initial={false} mode="popLayout">
          {sorted.map((farmer) => {
            const isSelected = selectedSeller === farmer.id;
            const isFollowed = followedSellerIds.includes(farmer.id);
            return (
              <motion.button
                key={farmer.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isFollowed ? 1 : 0.55, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  onSelectSeller(isSelected ? null : farmer.id);
                  if (onOpenFarmerReels) onOpenFarmerReels(farmer.id);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
              >
                <div className="relative">
                  {/* Ring: obuna = qizil/gradient, obuna emas = kulrang */}
                  <div
                    className={`w-[58px] h-[58px] rounded-full p-[2.5px] transition-all duration-300 ${
                      isSelected
                        ? 'bg-[#E53935] shadow-md scale-105'
                        : isFollowed
                        ? 'bg-gradient-to-tr from-amber-500 via-[#E53935] to-rose-600 group-hover:shadow-sm'
                        : 'bg-slate-300 group-hover:bg-slate-400'
                    }`}
                  >
                    <div className="w-full h-full rounded-full p-[1.5px] bg-white">
                      <img
                        src={farmer.avatar}
                        alt={farmer.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Obuna belgisi */}
                  {isFollowed && !isSelected && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                      <UserCheck className="w-2 h-2 text-white" />
                    </span>
                  )}

                  {/* Online dot (faqat obuna bo'linganlarda) */}
                  {farmer.online && isFollowed && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#22C55E] border-2 border-white rounded-full shadow-sm" />
                  )}
                </div>

                <div className="flex items-center gap-0.5 max-w-[68px]">
                  <span
                    className={`text-[10px] font-bold truncate leading-tight ${
                      isFollowed ? 'text-[#111827]' : 'text-slate-400'
                    }`}
                  >
                    {farmer.name.split(' ')[0]}
                  </span>
                  {farmer.verified && isFollowed && (
                    <CheckCircle2 className="w-3 h-3 text-blue-500 fill-blue-50 shrink-0" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};


