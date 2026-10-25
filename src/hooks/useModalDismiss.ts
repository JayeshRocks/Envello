import { useEffect, MouseEvent } from 'react';

/**
 * Hook providing uniform modal dismiss behaviors:
 * 1. Escape key press handler
 * 2. Backdrop click handler (only triggers if clicking the backdrop, not children)
 */
export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return { handleBackdropClick };
}
