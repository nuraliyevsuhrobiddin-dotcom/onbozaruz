import React from 'react';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  verified?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'md',
}) => {
  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`relative ${sizes[size]} rounded-full overflow-hidden shrink-0 border border-slate-200`}>
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
};
