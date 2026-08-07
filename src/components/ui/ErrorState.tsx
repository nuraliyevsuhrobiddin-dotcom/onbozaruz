import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.",
  onRetry,
}) => {
  return (
    <div className="py-12 px-4 flex flex-col items-center text-center space-y-3 bg-red-50/50 rounded-[20px] border border-red-100 my-4">
      <AlertCircle className="w-10 h-10 text-[#E53935]" />
      <p className="text-xs font-bold text-slate-800">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Qaytadan urinish
        </Button>
      )}
    </div>
  );
};
