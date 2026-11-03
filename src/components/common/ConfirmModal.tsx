import React, { useRef, useEffect } from 'react';
import { AlertTriangle, Trash2, Info, X, ShieldCheck } from 'lucide-react';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useModalDismiss } from '@/hooks/useModalDismiss';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  details?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: 'trash' | 'alert' | 'info';
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  details,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  isSubmitting = false,
  onConfirm,
  onCancel,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onCancel);

  // Focus cancel button on mount for safe keyboard navigation (prevents accidental Enter deletion)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resolvedIconType = icon ?? (variant === 'info' ? 'info' : variant === 'danger' ? 'trash' : 'alert');

  const variantConfig = {
    danger: {
      border: 'border-rose-500/30',
      glow: 'shadow-[0_0_40px_-10px_rgba(244,63,94,0.25)]',
      iconBox: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      confirmBtn: 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-950/40',
      badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    },
    warning: {
      border: 'border-amber-500/30',
      glow: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.25)]',
      iconBox: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      confirmBtn: 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-950/40',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    },
    info: {
      border: 'border-sky-500/30',
      glow: 'shadow-[0_0_40px_-10px_rgba(14,165,233,0.25)]',
      iconBox: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
      confirmBtn: 'bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 shadow-sky-950/40',
      badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    },
  }[variant];

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md modal-overlay animate-fade-in"
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby="confirm-dialog-desc"
          className={`bg-neutral-900 border ${variantConfig.border} ${variantConfig.glow} w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto transform animate-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div
                className={`w-11 h-11 rounded-2xl border ${variantConfig.iconBox} flex items-center justify-center flex-shrink-0 shadow-inner`}
              >
                {resolvedIconType === 'trash' ? (
                  <Trash2 className="w-5 h-5" />
                ) : resolvedIconType === 'alert' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 id="confirm-dialog-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {title}
                </h3>
                <span
                  className={`inline-block text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border mt-0.5 ${variantConfig.badge}`}
                >
                  {variant === 'danger' ? 'Irreversible Action' : variant === 'warning' ? 'Confirmation' : 'Notice'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition disabled:opacity-50"
              aria-label="Cancel and close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          <div id="confirm-dialog-desc" className="text-base sm:text-sm text-neutral-300 leading-relaxed space-y-2">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>

          {/* Optional Details Callout */}
          {details && (
            <div className="p-3 rounded-xl bg-neutral-950/70 border border-white/5 text-xs text-neutral-400 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{details}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 sm:gap-3">
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full xs:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-neutral-300 hover:text-white text-base sm:text-sm font-medium transition min-h-[44px] active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className={`w-full xs:w-auto px-5 py-2.5 rounded-xl ${variantConfig.confirmBtn} text-white text-base sm:text-sm font-semibold shadow-lg transition min-h-[44px] active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
