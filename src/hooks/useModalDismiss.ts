import { useEffect, useRef, MouseEvent, TouchEvent } from 'react';

/**
 * Hook providing uniform modal dismiss behaviors and total background scroll isolation:
 * 1. Escape key press handler
 * 2. Backdrop click handler (safeguards against mouse-drag text selection originating inside the modal)
 * 3. Body & documentElement scroll locking and background coordination while any modal is open
 * 4. Active scroll-chaining prevention (wheel & touchmove) so scrolling on non-overflowing forms never moves background
 */

let activeModalsCount = 0;
let savedScrollY = 0;
let touchStartY = 0;
let touchStartX = 0;

/**
 * Determines whether a target element or any of its ancestors inside the modal
 * can still scroll in the intended direction.
 */
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
  if (target?.closest?.('.modal-panel') || target?.closest?.('[role="dialog"]')) {
    return;
  }
  // If the target element cannot scroll further in this direction, prevent scroll chaining to the background page
  if (!canElementScroll(e.target, e.deltaY, e.deltaX)) {
    e.preventDefault();
  }
}

function handleGlobalTouchStart(e: globalThis.TouchEvent) {
  if (e.touches && e.touches.length > 0) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }
}

function handleGlobalTouchMove(e: globalThis.TouchEvent) {
  const target = e.target as HTMLElement | null;

  // Never block touch scrolling if touch originates inside a modal dialog or interactive form element
  if (
    target?.closest?.('.modal-panel') ||
    target?.closest?.('[role="dialog"]') ||
    target?.closest?.('.overflow-y-auto')
  ) {
    return;
  }

  // Never block touch scrolling if the user is typing with virtual keyboard open
  if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    return;
  }

  if (e.touches && e.touches.length > 0) {
    const deltaY = touchStartY - e.touches[0].clientY;
    const deltaX = touchStartX - e.touches[0].clientX;

    if (!canElementScroll(e.target, deltaY, deltaX)) {
      e.preventDefault();
    }

    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }
}

export function useModalDismiss(isOpen: boolean, onClose: () => void) {
  // Track where the mouse was pressed down. If user dragged text from inside the modal
  // and released on the backdrop, this prevents accidental modal closure.
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (activeModalsCount === 0) {
      savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      window.addEventListener('wheel', handleGlobalWheel, { passive: false });
      window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
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

    // Smoothly ensure focused inputs remain visible when mobile virtual keyboard opens/resizes
    const handleViewportChange = () => {
      const active = document.activeElement as HTMLElement | null;
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) {
        setTimeout(() => {
          active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 80);
      }
    };

    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleGlobalMouseDown, true);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleGlobalMouseDown, true);
      activeModalsCount--;
      if (activeModalsCount <= 0) {
        activeModalsCount = 0;
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        window.removeEventListener('wheel', handleGlobalWheel);
        window.removeEventListener('touchstart', handleGlobalTouchStart);
        window.removeEventListener('touchmove', handleGlobalTouchMove);
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

  const handleBackdropTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    // If the modal overlay has scrollable overflow, allow vertical scrolling so user can drag modal up/down
    if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight) {
      return;
    }
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  };

  return { handleBackdropClick, handleBackdropTouchMove };
}
