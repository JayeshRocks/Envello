import { useEffect, MouseEvent, TouchEvent } from 'react';

/**
 * Hook providing uniform modal dismiss behaviors:
 * 1. Escape key press handler
 * 2. Backdrop click handler (only triggers if clicking the backdrop, not children)
 * 3. Body & documentElement scroll locking and background coordination while any modal is open
 * 4. Backdrop touchmove preventer to block mobile background dragging
 */

let activeModalsCount = 0;
let savedScrollY = 0;

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalsCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.body.classList.add('modal-open');
    }
    activeModalsCount++;

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
        // Seamlessly restore scroll position without jumping to top
        window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
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


