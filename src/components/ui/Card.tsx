import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[20px] border border-slate-200/80 shadow-apple overflow-hidden ${
        onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-300' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
