import { useEffect, useRef, MouseEvent } from 'react';

/**
 * Hook providing uniform modal dismiss behaviors and total background scroll isolation:
 * 1. Escape key press handler
 * 2. Backdrop click handler (safeguards against mouse-drag text selection originating inside the modal)
 * 3. Body & documentElement scroll locking and background coordination while any modal is open
 * 4. Active scroll-chaining prevention (wheel) so scrolling on desktop never moves background
 * 5. Dynamic visual viewport tracking so mobile forms shrink to space above virtual keyboard
 */

let activeModalsCount = 0;
let savedScrollY = 0;

function canElementScroll(target: EventTarget | null, deltaY: number, deltaX: number = 0): boolean {
  if (!(target instanceof HTMLElement)) return false;

  let current: HTMLElement | null = target;

  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;

    const canScrollY = (overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight;
    if (canScrollY && deltaY !== 0) {
      if (deltaY > 0) {
        if (current.scrollTop + current.clientHeight < current.scrollHeight - 1) return true;
      } else {
        if (current.scrollTop > 1) return true;
      }
    }

    const canScrollX = (overflowX === 'auto' || overflowX === 'scroll') && current.scrollWidth > current.clientWidth;
    if (canScrollX && deltaX !== 0) {
      if (deltaX > 0) {
        if (current.scrollLeft + current.clientWidth < current.scrollWidth - 1) return true;
      } else {
        if (current.scrollLeft > 1) return true;
      }
    }

    current = current.parentElement;
  }

  return false;
}

function handleGlobalWheel(e: WheelEvent) {
  const target = e.target as HTMLElement | null;
  if (target?.closest?.('.modal-panel') || target?.closest?.('[role="dialog"]') || target?.closest?.('.overflow-y-auto')) {
    return;
  }
  // If the target element cannot scroll further in this direction, prevent scroll chaining to the background page
  if (!canElementScroll(e.target, e.deltaY, e.deltaX)) {
    e.preventDefault();
  }
}

function updateVisualViewportCSS() {
  if (typeof window === 'undefined') return;
  const vv = window.visualViewport;
  const height = vv ? Math.round(vv.height) : window.innerHeight;
  document.documentElement.style.setProperty('--vv-height', `${height}px`);
}

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  // Track where the mouse was pressed down. If user dragged text from inside the modal
  // and released on the backdrop, this prevents accidental modal closure.
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    updateVisualViewportCSS();

    if (activeModalsCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      window.addEventListener('wheel', handleGlobalWheel, { passive: false });
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

    const handleViewportResize = () => {
      updateVisualViewportCSS();
    };

    const handleFocusChange = () => {
      setTimeout(updateVisualViewportCSS, 60);
      setTimeout(updateVisualViewportCSS, 250);
    };

    window.visualViewport?.addEventListener('resize', handleViewportResize);
    window.addEventListener('resize', handleViewportResize);
    window.addEventListener('orientationchange', handleViewportResize);
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleGlobalMouseDown, true);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('resize', handleViewportResize);
      window.removeEventListener('orientationchange', handleViewportResize);
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
      activeModalsCount--;
      if (activeModalsCount <= 0) {
        activeModalsCount = 0;
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.documentElement.style.removeProperty('--vv-height');
        window.removeEventListener('wheel', handleGlobalWheel);
        // Seamlessly restore scroll position without jumping to top
        window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    // Only dismiss if the click was directly on the backdrop container.
    // Also ensures that if a mouse drag originated inside the modal (mouseDownTargetRef is a child),
    // releasing on the backdrop does not accidentally dismiss the modal.
    if (e.target === e.currentTarget && (!mouseDownTargetRef.current || mouseDownTargetRef.current === e.currentTarget)) {
      onClose();
    }
    mouseDownTargetRef.current = null;
  };

  const handleBackdropTouchMove = () => {
    // Never block touch gestures on mobile so users can drag and scroll forms freely
  };

  return { handleBackdropClick, handleBackdropTouchMove };
}
