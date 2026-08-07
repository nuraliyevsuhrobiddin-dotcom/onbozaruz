import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAgroStore } from '../store/useAgroStore';
import { PhoneCall, CheckCircle2, Send } from 'lucide-react';

export const ContactSellerModal: React.FC = () => {
  const { contactSellerData, setContactSellerData, showToast } = useAgroStore();

  if (!contactSellerData) return null;

  const cleanPhone = contactSellerData.phone.replace(/[^+\d]/g, '');
  const cleanTelegram = contactSellerData.telegram
    ? contactSellerData.telegram.replace(/^@/, '').replace(/\s+/g, '')
    : '';
  const telegramUrl = cleanTelegram ? `https://t.me/${cleanTelegram}` : '';

  return (
    <Modal
      isOpen={Boolean(contactSellerData)}
      onClose={() => setContactSellerData(null)}
      title="Fermer bilan bog'lanish"
    >
      <div className="space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 text-[#E53935] flex items-center justify-center mx-auto">
          <PhoneCall className="w-7 h-7" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-1 font-extrabold text-base text-[#111827]">
            <span>{contactSellerData.name}</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-50" />
          </div>
          {contactSellerData.title && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{contactSellerData.title}</p>
          )}
        </div>

        <div className="p-3 bg-slate-100 rounded-[20px] font-extrabold text-base text-[#111827] tracking-wider">
          {contactSellerData.phone}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="col-span-1"
            onClick={() => setContactSellerData(null)}
          >
            Yopish
          </Button>
          <a
            href={`tel:${cleanPhone}`}
            onClick={() => showToast("Qo'ng'iroq oynasi ochildi")}
            className="inline-flex items-center justify-center font-bold px-4 py-2.5 text-xs sm:text-sm rounded-[20px] bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-apple-red"
          >
            Qo'ng'iroq
          </a>
          {telegramUrl && (
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center font-bold px-4 py-2.5 text-xs sm:text-sm rounded-[20px] bg-[#0088cc] hover:bg-[#0077bb] text-white shadow-sm"
            >
              <Send className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
};
