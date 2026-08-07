import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-slate-200 animate-pulse rounded-[20px] ${className}`} />
  );
};
