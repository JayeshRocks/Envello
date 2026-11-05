import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';

export type MorphPhase = 'idle' | 'opening' | 'open' | 'closing';

interface UseFabMorphAnimationOptions {
  isOpen: boolean;
  isMobileOrTablet?: boolean;
  fabId?: string;
  onCompleteClose: () => void;
}

export interface FabDeltaVector {
  deltaX: number;
  deltaY: number;
}

export function calculateFabDeltaVector(
  fabRect: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number }
): FabDeltaVector {
  const fabCenterX = fabRect.left + fabRect.width / 2;
  const fabCenterY = fabRect.top + fabRect.height / 2;
  const screenCenterX = viewport.width / 2;
  const screenCenterY = viewport.height / 2;

  return {
    deltaX: fabCenterX - screenCenterX,
    deltaY: fabCenterY - screenCenterY,
  };
}

export function useFabMorphAnimation({
  isOpen,
  fabId = 'mobile-record-fab',
  onCompleteClose,
}: UseFabMorphAnimationOptions) {
  const [phase, setPhase] = useState<MorphPhase>('idle');
  const [isRendered, setIsRendered] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Request close: Apple-style fluid dismissal where the form fades out and the + button fades back in
  const requestClose = useCallback(() => {
    if (phase === 'closing' || phase === 'idle') return;

    clearTimer();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Trigger closing phase
    setPhase('closing');

    // Smoothly fade in the + FAB button in its corner with fluid spring curve
    const fabEl = document.getElementById(fabId);
    if (fabEl) {
      fabEl.style.transition = prefersReducedMotion
        ? 'none'
        : 'opacity 220ms cubic-bezier(0.16, 1, 0.3, 1), transform 220ms cubic-bezier(0.16, 1, 0.3, 1)';
      fabEl.style.opacity = '1';
      fabEl.style.transform = 'scale(1)';
      fabEl.style.pointerEvents = 'auto';
    }

    const duration = prefersReducedMotion ? 10 : 220;

    timerRef.current = window.setTimeout(() => {
      setIsRendered(false);
      setPhase('idle');
      onCompleteClose();
    }, duration);
  }, [phase, clearTimer, fabId, onCompleteClose]);

  // Open sequence: Apple-style fluid spring presentation
  useEffect(() => {
    if (isOpen) {
      clearTimer();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Smoothly hide resting FAB while modal opens
      const fabEl = document.getElementById(fabId);
      if (fabEl) {
        fabEl.style.transition = prefersReducedMotion
          ? 'none'
          : 'opacity 180ms ease-out, transform 180ms ease-out';
        fabEl.style.opacity = '0';
        fabEl.style.transform = 'scale(0.85)';
        fabEl.style.pointerEvents = 'none';
      }

      setIsRendered(true);
      setPhase('opening');

      const duration = prefersReducedMotion ? 10 : 320;
      timerRef.current = window.setTimeout(() => {
        setPhase('open');
      }, duration);
    } else {
      if (phase === 'open' || phase === 'opening') {
        requestClose();
      }
    }

    return () => {
      clearTimer();
    };
  }, [isOpen]);

  // Cleanup on unmount: guarantee FAB is never left invisible
  useEffect(() => {
    return () => {
      clearTimer();
      const fabEl = document.getElementById(fabId);
      if (fabEl) {
        fabEl.style.opacity = '1';
        fabEl.style.transform = 'scale(1)';
        fabEl.style.pointerEvents = 'auto';
      }
    };
  }, [fabId, clearTimer]);

  // Form panel styles: Apple fluid spring presentation & dismissal
  const getFormStyle = (): CSSProperties => {
    switch (phase) {
      case 'opening':
        return {
          animation: 'appleModalPresent 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
        };
      case 'open':
        return {
          transform: 'none',
          opacity: 1,
          pointerEvents: 'auto',
        };
      case 'closing':
        return {
          animation: 'appleModalDismiss 220ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
          pointerEvents: 'none',
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
        };
      default:
        return {};
    }
  };

  // Backdrop styles: Smoothly fading blur & dim overlay
  const getBackdropStyle = (): CSSProperties => {
    const isVisible = phase === 'opening' || phase === 'open';
    return {
      opacity: isVisible ? 1 : 0,
      transition: isVisible
        ? 'opacity 280ms cubic-bezier(0.16, 1, 0.3, 1)'
        : 'opacity 220ms cubic-bezier(0.32, 0.72, 0, 1)',
      pointerEvents: isVisible ? 'auto' : 'none',
    };
  };

  return {
    isRendered,
    phase,
    formStyle: getFormStyle(),
    backdropStyle: getBackdropStyle(),
    requestClose,
  };
}
