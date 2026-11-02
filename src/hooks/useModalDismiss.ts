import { useEffect, useRef, useState, useCallback, MouseEvent, TouchEvent } from 'react';

/**
 * Hook providing uniform Apple-grade modal dismiss behaviors & fluid transitions:
 * 1. Escape key press handler with fluid exit
 * 2. Backdrop click handler (safeguards against mouse-drag text selection originating inside the modal)
 * 3. Body & documentElement scroll locking and background coordination while any modal is rendered
 * 4. Backdrop touchmove preventer to block mobile background dragging
 * 5. Coordinated 220ms Apple-grade fluid dismissal animation before unmounting
 */

let activeModalsCount = 0;
let savedScrollY = 0;

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Request close: triggers Apple fluid dismissal (220ms), then unmounts & calls onClose
  const requestClose = useCallback(() => {
    if (isClosing) return;

    clearCloseTimer();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    setIsClosing(true);

    const duration = prefersReducedMotion ? 10 : 220;
    closeTimerRef.current = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      onClose();
    }, duration);
  }, [isClosing, clearCloseTimer, onClose]);

  // Synchronize when parent changes isOpen prop
  useEffect(() => {
    if (isOpen) {
      clearCloseTimer();
      setIsRendered(true);
      setIsClosing(false);
    } else {
      // If isOpen changes to false from outside while still rendered, trigger clean dismissal
      if (isRendered && !isClosing) {
        requestClose();
      }
    }
  }, [isOpen, isRendered, isClosing, clearCloseTimer, requestClose]);

  // Body scroll lock and Escape key handling
  useEffect(() => {
    if (!isRendered) return;

    if (activeModalsCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.body.classList.add('modal-open');
    }
    activeModalsCount++;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose();
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
        window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [isRendered, requestClose]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
      requestClose();
    }
    mouseDownTargetRef.current = null;
  };

  const handleBackdropTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  };

  return {
    isRendered,
    isClosing,
    requestClose,
    handleBackdropClick,
    handleBackdropTouchMove,
    overlayClass: `modal-overlay ${isClosing ? 'closing animate-backdrop-out' : 'animate-backdrop-in'}`,
    panelClass: `modal-panel ${isClosing ? 'closing animate-apple-dismiss' : 'animate-apple-present'}`,
  };
}
