import { useEffect, useRef, MouseEvent, TouchEvent } from 'react';

/**
 * Hook providing uniform modal dismiss behaviors:
 * 1. Escape key press handler
 * 2. Backdrop click handler (safeguards against mouse-drag text selection originating inside the modal)
 * 3. Body & documentElement scroll locking and background coordination while any modal is open
 * 4. Backdrop touchmove preventer to block mobile background dragging
 */

let activeModalsCount = 0;
let savedScrollY = 0;

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  // Track where the mouse was pressed down. If user dragged text from inside the modal
  // and released on the backdrop, this prevents accidental modal closure.
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

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

    const handleGlobalMouseDown = (e: globalThis.MouseEvent) => {
      mouseDownTargetRef.current = e.target;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleGlobalMouseDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
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
    // Only dismiss if BOTH mousedown AND mouseup/click occurred directly on the backdrop itself.
    // If the user selected text or dragged from inside the modal, mouseDownTargetRef will be a modal child.
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  };

  const handleBackdropTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  };

  return { handleBackdropClick, handleBackdropTouchMove };
}
