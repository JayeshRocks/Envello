import { useEffect, MouseEvent, TouchEvent } from 'react';

/**
 * Hook providing uniform modal dismiss behaviors:
 * 1. Escape key press handler
 * 2. Backdrop click handler (only triggers if clicking the backdrop, not children)
 * 3. Body & documentElement scroll locking and background coordination while any modal is open
 * 4. Backdrop touchmove preventer to block mobile background dragging
 */

let activeModalsCount = 0;

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    activeModalsCount++;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

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
        document.documentElement.classList.remove('modal-open');
      }
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleBackdropTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  };

  return { handleBackdropClick, handleBackdropTouchMove };
}


