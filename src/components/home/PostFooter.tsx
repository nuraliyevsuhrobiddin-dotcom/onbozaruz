import React from 'react';

interface PostFooterProps {
  sellerName: string;
  title: string;
  categoryName: string;
  condition?: string;
  minOrder?: string;
  commentsCount: number;
  date: string;
  onCommentClick: () => void;
}

export const PostFooter: React.FC<PostFooterProps> = ({
  sellerName,
  title,
  categoryName,
  condition,
  minOrder,
  commentsCount,
  date,
  onCommentClick,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="space-y-2 text-xs">
      <div className="text-[13px] text-slate-800 leading-relaxed">
        <span className="font-extrabold text-[#111827] mr-1.5">{sellerName}</span>
        <div>
          <p className={`text-slate-900 font-medium ${expanded ? '' : 'line-clamp-2'}`}>
            {title}
          </p>
          {!expanded && (
            <button onClick={() => setExpanded(true)} className="text-[12px] text-slate-400 hover:underline">
              Ko'proq
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
        <span className="text-[#E53935] hover:underline cursor-pointer">
          #{categoryName.replace(/\s+/g, '')}
        </span>
        <span className="text-blue-600 hover:underline cursor-pointer">
          #AgroMarketplace
        </span>
        <span className="text-emerald-600 hover:underline cursor-pointer">
          #OnBozorFermer
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
        {condition && (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200/60">
            Sifat: {condition}
          </span>
        )}
        {minOrder && (
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold border border-slate-200/60">
            Min: {minOrder}
          </span>
        )}
      </div>

      <button
        onClick={onCommentClick}
        className="text-[12px] text-slate-400 hover:text-slate-600 font-semibold block transition-colors pt-0.5"
      >
        Barcha {commentsCount} izohni ko'rish
      </button>

      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        {date}
      </div>
    </div>
  );
};
