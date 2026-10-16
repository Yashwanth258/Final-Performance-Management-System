import React, { useEffect, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  allowMaximize?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  allowMaximize = true,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Reset maximized state when opening a new modal
    if (isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = isMaximized
    ? 'w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] flex flex-col'
    : {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        full: 'max-w-6xl',
      }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div
        className={`relative w-full ${maxWidthClasses} overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl z-10 transition-all duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sky-100 bg-sky-50/50 px-6 py-4 shrink-0">
          <div className="pr-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{title}</span>
              {isMaximized && (
                <span className="text-[11px] font-semibold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200 uppercase tracking-wider">
                  Full View
                </span>
              )}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {allowMaximize && (
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-100 hover:text-sky-800 transition-colors cursor-pointer"
                title={isMaximized ? "Restore default window size" : "Maximize to large screen"}
                aria-label={isMaximized ? "Restore window" : "Maximize window"}
              >
                {isMaximized ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className={`p-6 overflow-y-auto ${isMaximized ? 'flex-1 max-h-none' : 'max-h-[82vh]'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
