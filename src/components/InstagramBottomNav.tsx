import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, Plus, Tag, User } from 'lucide-react';
import { useAgroStore, NavTab } from '../store/useAgroStore';

export const InstagramBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, setCreateModalOpen } = useAgroStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 h-16 select-none"
      style={{ boxShadow: '0 -4px 20px rgba(17,17,17,0.06)' }}
    >
      <div className="h-full max-w-xl mx-auto flex items-center justify-around px-2">
        {(['home', 'search', 'market', 'profile'] as NavTab[]).reduce<React.ReactNode[]>((acc, id, idx) => {
          const icons = [Home, Search, Tag, User];
          const Icon = icons[idx];
          const isActive = activeTab === id;

          // Insert ➕ Create button in the middle (after Search, before Market)
          if (idx === 2) {
            acc.push(
              <motion.button
                key="create-btn"
                whileTap={{ scale: 0.88 }}
                onClick={() => setCreateModalOpen(true)}
                aria-label="E'lon berish"
                className="flex items-center justify-center"
              >
                <div
                  className="w-11 h-11 rounded-[16px] bg-[#111111] text-white flex items-center justify-center hover:bg-[#E53935] transition-colors duration-200 shadow-md"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
              </motion.button>
            );
          }

          acc.push(
            <motion.button
              key={id}
              whileTap={{ scale: 0.85 }}
              onClick={() => setActiveTab(id)}
              aria-label={
                id === 'home'
                  ? 'Asosiy'
                  : id === 'search'
                  ? 'Qidiruv'
                  : id === 'market'
                  ? 'Market'
                  : 'Profil'
              }
              className="relative flex flex-col items-center justify-center w-12 h-12 rounded-xl"
            >
              <Icon
                className={`w-[26px] h-[26px] transition-all duration-200 ${
                  isActive
                    ? 'text-[#111111] stroke-[2.25]'
                    : 'text-slate-400 stroke-[1.75] hover:text-slate-600'
                }`}
              />
              {isActive && (
                <motion.div
                  layoutId="activeNavDot"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-[#E53935]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          );

          return acc;
        }, [])}
      </div>
    </nav>
  );
};
