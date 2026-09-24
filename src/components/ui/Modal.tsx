import React, { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';
import { useOverlayNavigation } from '../../hooks/useOverlayNavigation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode | ((dismiss: () => void) => React.ReactNode);
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const dismiss = useOverlayNavigation(isOpen, onClose);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    dialogRef.current?.focus();
    return () => {
      unlockBodyScroll();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Solid overlay without backdrop blur as requested */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 bg-black/60"
          />

          {/* Modal box with 20px radius */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            ref={dialogRef}
            onKeyDown={(event) => {
              if (event.key !== 'Tab' || (event.target as HTMLElement).closest('[role="dialog"]') !== dialogRef.current) return;
              const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
                .filter(element => element.getClientRects().length > 0);
              const first = controls[0];
              const last = controls.at(-1);
              if (!first) { event.preventDefault(); event.currentTarget.focus(); }
              else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
                event.preventDefault(); last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
              }
            }}
            className="relative w-full max-w-md bg-white rounded-[20px] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
          >
            {title && (
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
                <h3 id={titleId} className="font-bold text-sm text-[#111827]">{title}</h3>
                <button
                  onClick={dismiss}
                  aria-label="Yopish"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-4 overflow-y-auto no-scrollbar">{typeof children === 'function' ? children(dismiss) : children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
