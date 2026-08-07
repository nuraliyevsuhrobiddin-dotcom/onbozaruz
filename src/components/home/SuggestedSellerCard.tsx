import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';

const ALL_SELLERS = [
  {
    id: 'seller-1',
    name: 'Alisher Agro-Fermer',
    location: "Quvasoy, Farg'ona",
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'seller-2',
    name: "Sardor G'allakor",
    location: 'Jomboy, Samarqand',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'seller-3',
    name: 'AgroTexnika MChJ',
    location: 'Chirchiq, Toshkent',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'seller-4',
    name: 'Buxoro Uzumchilik',
    location: "G'ijduvon, Buxoro",
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
  },
  {
    id: 'seller-5',
    name: 'Vobkent Chorvachilik',
    location: 'Vobkent, Buxoro',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
  },
];

export const SuggestedSellerCard: React.FC = () => {
  const { followedSellerIds, toggleFollowSeller } = useAgroStore();

  // Faqat obuna bo'linmaganlarni ko'rsat
  const notFollowed = ALL_SELLERS.filter(
    (seller) => !followedSellerIds.includes(seller.id)
  );

  // Hamma tavsiya qilinganlarga obuna bo'linsa kartani yashir
  if (notFollowed.length === 0) return null;

  return (
    <motion.div
      layout
      className="bg-white rounded-[22px] border border-slate-200/80 p-4 shadow-sm space-y-3.5 select-none"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm text-[#111827] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-[#E53935]" />
          Tavsiya etilgan fermerlar
        </h3>
        <span className="text-[11px] font-bold text-slate-400">
          {notFollowed.length} ta
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {notFollowed.map((seller) => (
            <motion.div
              key={seller.id}
              layout
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-between gap-2 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={seller.avatar}
                  alt={seller.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-100 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-[#111827] truncate">{seller.name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50 shrink-0" />
                  </div>
                  <span className="block text-[11px] text-slate-400 truncate">{seller.location}</span>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleFollowSeller(seller.id, seller.name)}
                className="px-3 py-1 rounded-full font-extrabold text-[11px] bg-[#E53935]/10 text-[#E53935] hover:bg-[#E53935] hover:text-white transition-all shrink-0"
              >
                + Obuna bo&apos;lish
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


