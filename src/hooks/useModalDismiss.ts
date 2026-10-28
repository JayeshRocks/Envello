import { useEffect, MouseEvent } from 'react';

/**
 * Hook providing uniform modal dismiss behaviors:
 * 1. Escape key press handler
 * 2. Backdrop click handler (only triggers if clicking the backdrop, not children)
 * 3. Body scroll locking and background coordination while any modal is open
 */

let activeModalsCount = 0;

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    activeModalsCount++;
    document.body.classList.add('modal-open');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      activeModalsCount--;
      if (activeModalsCount <= 0) {
        activeModalsCount = 0;
        document.body.classList.remove('modal-open');
      }
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return { handleBackdropClick };
}

