import React from 'react';
import { motion } from 'framer-motion';
import { useAgroStore } from '../../store/useAgroStore';

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const { categories } = useAgroStore();
  // ensure categories are unique by id to avoid duplicate chips in UI
  const uniqueCategories = Array.from(new Map(categories.map((c) => [c.id, c])).values());

  return (
    <div className="flex flex-wrap items-center gap-2 py-1 px-2">
      {uniqueCategories.map((cat) => {
        const isSelected = selectedCategory === cat.id;

        return (
          <motion.button
            key={cat.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectCategory(cat.id)}
            className={`inline-flex items-center justify-center gap-[6px] min-h-[36px] px-[14px] text-[13px] font-medium rounded-full shrink-0 transition-all duration-200 ease-in-out ${
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
