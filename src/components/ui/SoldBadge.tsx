import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SoldBadgeProps {
  /** sm: tiny grid label; chip: same height as the price and category chips; md: standalone label. */
  size?: 'sm' | 'chip' | 'md';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-[9px] ring-2',
  chip: 'h-7 px-2.5 text-[11px] ring-1',
  md: 'px-3 py-1.5 text-[11px] ring-2',
} as const;

/** "SOTILDI" label shown on a listing whose owner marked it as sold. */
export const SoldBadge: React.FC<SoldBadgeProps> = ({ size = 'md', className = '' }) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[#D84315] text-white font-black uppercase tracking-wider shadow-lg ring-white/80 ${SIZE_CLASSES[size]} ${className}`}
  >
    <CheckCircle2 className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
    Sotildi
  </span>
);
