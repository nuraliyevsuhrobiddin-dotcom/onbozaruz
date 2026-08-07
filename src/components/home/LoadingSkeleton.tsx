import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white rounded-[22px] border border-slate-200/80 p-[18px] shadow-sm space-y-3"
        >
          {/* Header Skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          {/* Media Skeleton */}
          <Skeleton className="w-full aspect-[16/10] rounded-[20px]" />
          {/* Actions Skeleton */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between">
              <div className="flex gap-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-10 w-full rounded-[16px]" />
          </div>
        </div>
      ))}
    </div>
  );
};
