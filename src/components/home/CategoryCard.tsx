import React from 'react';
import { Tag } from 'lucide-react';
import { useAgroStore } from '../../store/useAgroStore';
import { categoriesForScope } from '../../utils/categoryScope';

export const CategoryCard: React.FC = () => {
  const { setSelectedCategoryModalId, categories: allCategories } = useAgroStore();
  const categories = categoriesForScope(allCategories, 'post');
  const categoryList = Array.from(new Map(categories.slice(1).map((c) => [c.id, c])).values());

  return (
    <div className="bg-white rounded-[22px] border border-slate-200/80 p-3 shadow-sm space-y-2.5 select-none">
      <h3 className="font-extrabold text-sm text-[#111827] flex items-center gap-1.5 px-1">
        <Tag className="w-4 h-4 text-emerald-600" />
        Ommabop kategoriyalar
      </h3>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categoryList.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryModalId(cat.id)}
            className="group min-w-[132px] max-w-[150px] rounded-[14px] border border-slate-200/80 bg-slate-50 px-3 py-2.5 text-left transition-all hover:border-[#E53935]/40 hover:bg-white focus:outline-none"
          >
            <span className="block truncate text-[13px] font-extrabold text-slate-800 group-hover:text-[#E53935] transition-colors">
              {cat.name}
            </span>
            <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-slate-500 border border-slate-200/80">
              {cat.count} e'lon
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};