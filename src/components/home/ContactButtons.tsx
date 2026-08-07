import React from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, MessageCircle } from 'lucide-react';

interface ContactButtonsProps {
  phone: string;
  telegram?: string;
  onContactClick: () => void;
}

const TelegramSVG = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

export const ContactButtons: React.FC<ContactButtonsProps> = ({
  phone,
  telegram,
  onContactClick,
}) => {
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[()]/g, '');
  const cleanTelegram = telegram
    ? telegram.replace(/^@/, '').replace(/\s+/g, '')
    : '';
  const telLink = `tel:${cleanPhone}`;
  const telegramLink = cleanTelegram ? `https://t.me/${cleanTelegram}` : undefined;

  return (
    <div className="flex items-center gap-2 pt-2">
      {cleanPhone && <motion.a
        href={telLink}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="flex-1 py-3 rounded-[16px] bg-gradient-to-r from-[#E53935] via-red-600 to-[#D32F2F] text-white font-extrabold text-[13px] flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
        style={{ boxShadow: '0 4px 16px rgba(229, 57, 53, 0.3)' }}
      >
        <PhoneCall className="w-4 h-4" />
        <span>Bog'lanish</span>
      </motion.a>}

      {telegramLink && (
        <motion.a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          title="Telegram orqali bog'lanish"
          className="w-11 h-11 rounded-[16px] bg-[#0088cc] hover:bg-[#0077bb] text-white flex items-center justify-center transition-colors shrink-0 shadow-sm"
        >
          <TelegramSVG />
        </motion.a>
      )}

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={onContactClick}
        title="Xabar yuborish"
        className="w-11 h-11 rounded-[16px] bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
      >
        <MessageCircle className="w-4 h-4" />
      </motion.button>
    </div>
  );
};
