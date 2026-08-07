import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-bold text-slate-700 tracking-tight block">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-slate-100 border-0 rounded-[20px] text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 py-2.5 px-4 outline-none focus:ring-2 focus:ring-slate-300 transition-all ${
              leftIcon ? 'pl-10' : ''
            } ${error ? 'ring-2 ring-red-500 bg-red-50' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-[11px] font-bold text-[#E53935]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
