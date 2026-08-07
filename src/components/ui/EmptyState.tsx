import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🌾',
  title,
  description,
  action,
}) => {
  return (
    <div className="py-16 px-4 flex flex-col items-center justify-center text-center space-y-3">
      <span className="text-5xl">{icon}</span>
      <h3 className="font-extrabold text-base text-[#111827]">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 px-5 py-2.5 rounded-[20px] bg-[#111827] text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-apple"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
