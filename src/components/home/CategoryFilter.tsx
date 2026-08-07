import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../../data/mockAgroData';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  // ensure categories are unique by id to avoid duplicate chips in UI
  const uniqueCategories = Array.from(new Map(CATEGORIES.map((c) => [c.id, c])).values());

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-2" style={{ whiteSpace: 'nowrap' }}>
      {uniqueCategories.map((cat) => {
        const isSelected = selectedCategory === cat.id;

        return (
          <motion.button
            key={cat.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectCategory(cat.id)}
            className={`inline-flex items-center gap-[6px] h-[36px] px-[14px] text-[13px] font-medium rounded-full flex-shrink-0 transition-all duration-200 ease-in-out ${
              isSelected
                ? 'text-white shadow-md'
                : 'bg-white text-slate-700 border border-[#E5E7EB] hover:shadow-sm'
            }`}
            style={
              isSelected
                ? { backgroundImage: 'linear-gradient(90deg,#EF4444,#DC2626)' }
                : undefined
            }
          >
            {/* Label with ellipsis */}
            <span className="max-w-[160px] truncate block">
              {cat.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
