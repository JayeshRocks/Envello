import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';

export type MorphPhase =
  | 'idle'
  | 'shrink-at-fab'
  | 'travel-to-center'
  | 'expand-to-form'
  | 'open'
  | 'collapse-to-circle'
  | 'travel-to-fab'
  | 'settle-at-fab'
  | 'desktop-open'
  | 'desktop-closing';

interface UseFabMorphAnimationOptions {
  isOpen: boolean;
  isMobileOrTablet: boolean;
  fabId?: string;
  onCompleteClose: () => void;
}

export interface FabCoords {
  deltaX: number;
  deltaY: number;
  scaleX: number;
  scaleY: number;
  fabWidth: number;
  fabHeight: number;
}

export function calculateFabMorphCoords(
  fabRect: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number },
  panel: { width: number; height: number }
): FabCoords {
  const fabCenterX = fabRect.left + fabRect.width / 2;
  const fabCenterY = fabRect.top + fabRect.height / 2;
  const screenCenterX = viewport.width / 2;
  const screenCenterY = viewport.height / 2;

  const deltaX = fabCenterX - screenCenterX;
  const deltaY = fabCenterY - screenCenterY;

  const scaleX = fabRect.width / panel.width;
  const scaleY = fabRect.height / panel.height;

  return {
    deltaX,
    deltaY,
    scaleX: Math.max(0.04, Math.min(0.5, scaleX)),
    scaleY: Math.max(0.04, Math.min(0.5, scaleY)),
    fabWidth: fabRect.width || 56,
    fabHeight: fabRect.height || 56,
  };
}

export function useFabMorphAnimation({
  isOpen,
  isMobileOrTablet,
  fabId = 'mobile-record-fab',
  onCompleteClose,
}: UseFabMorphAnimationOptions) {
  const [phase, setPhase] = useState<MorphPhase>('idle');
  const [isRendered, setIsRendered] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const coordsRef = useRef<FabCoords>({
    deltaX: 0,
    deltaY: 0,
    scaleX: 0.15,
    scaleY: 0.1,
    fabWidth: 56,
    fabHeight: 56,
  });

  const timeoutsRef = useRef<number[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Measure target FAB coordinates against the viewport center
  const measureCoords = useCallback(() => {
    const fabEl = document.getElementById(fabId);
    if (!fabEl) return null;

    const fabRect = fabEl.getBoundingClientRect();
    // Use measured or estimated modal panel dimensions
    const panelWidth = panelRef.current?.offsetWidth || Math.min(window.innerWidth - 24, 512);
    const panelHeight = panelRef.current?.offsetHeight || Math.min(window.innerHeight * 0.85, 560);

    const coords = calculateFabMorphCoords(
      fabRect,
      { width: window.innerWidth, height: window.innerHeight },
      { width: panelWidth, height: panelHeight }
    );

    coordsRef.current = coords;
    return coords;
  }, [fabId]);

  // Request close with choreographed reverse animation
  const requestClose = useCallback(() => {
    clearAllTimeouts();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Desktop or reduced motion path: clean fade-out
    if (!isMobileOrTablet || prefersReducedMotion) {
      setPhase('desktop-closing');
      const timer = window.setTimeout(() => {
        setIsRendered(false);
        setPhase('idle');
        onCompleteClose();
      }, 180);
      timeoutsRef.current.push(timer);
      return;
    }

    // Measure fresh coords in case of resize or orientation changes
    measureCoords();

    // Mobile/Tablet 3-step reverse morphing sequence:
    // 1. Collapse from form into 56px circle at viewport center
    setPhase('collapse-to-circle');

    // 2. Travel from center back down to the FAB position
    const t1 = window.setTimeout(() => {
      setPhase('travel-to-fab');
    }, 220);
    timeoutsRef.current.push(t1);

    // 3. Settle at FAB with tactile spring bounce
    const t2 = window.setTimeout(() => {
      setPhase('settle-at-fab');
    }, 460);
    timeoutsRef.current.push(t2);

    // 4. Complete: unmount modal and restore real FAB
    const t3 = window.setTimeout(() => {
      const fabEl = document.getElementById(fabId);
      if (fabEl) {
        fabEl.style.opacity = '1';
        fabEl.style.pointerEvents = 'auto';
      }
      setIsRendered(false);
      setPhase('idle');
      onCompleteClose();
    }, 580);
    timeoutsRef.current.push(t3);
  }, [clearAllTimeouts, isMobileOrTablet, measureCoords, fabId, onCompleteClose]);

  // Opening animation sequence
  useEffect(() => {
    if (isOpen) {
      clearAllTimeouts();

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Desktop path or reduced motion: standard centered entry
      if (!isMobileOrTablet || prefersReducedMotion) {
        setIsRendered(true);
        setPhase('desktop-open');
        return;
      }

      const fabEl = document.getElementById(fabId);

      // If mobile FAB element not found, fallback to desktop open
      if (!fabEl) {
        setIsRendered(true);
        setPhase('desktop-open');
        return;
      }

      // Hide real FAB while morphing element takes flight
      fabEl.style.opacity = '0';
      fabEl.style.pointerEvents = 'none';

      setIsRendered(true);

      // In next animation frame, measure exact panel size and trigger sequence
      animFrameRef.current = requestAnimationFrame(() => {
        measureCoords();

        // Phase 1: Shrink down a bit at the resting FAB position
        setPhase('shrink-at-fab');

        // Phase 2: Move from bottom-right to viewport center
        const t1 = window.setTimeout(() => {
          setPhase('travel-to-center');
        }, 100);
        timeoutsRef.current.push(t1);

        // Phase 3: Expand outward into the full form at center
        const t2 = window.setTimeout(() => {
          setPhase('expand-to-form');
        }, 350);
        timeoutsRef.current.push(t2);

        // Phase 4: Settle as fully interactive modal
        const t3 = window.setTimeout(() => {
          setPhase('open');
        }, 630);
        timeoutsRef.current.push(t3);
      });
    } else {
      // If parent sets isOpen=false while modal is open, trigger clean close
      if (phase === 'open' || phase === 'desktop-open') {
        requestClose();
      }
    }

    return () => {
      clearAllTimeouts();
    };
  }, [isOpen]);

  // Cleanup on unmount: ensure FAB is never left invisible
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      const fabEl = document.getElementById(fabId);
      if (fabEl) {
        fabEl.style.opacity = '1';
        fabEl.style.pointerEvents = 'auto';
      }
    };
  }, [fabId, clearAllTimeouts]);

  const { deltaX, deltaY, scaleX, scaleY } = coordsRef.current;

  // Build GPU-accelerated panel styles for current morph phase
  const getPanelStyle = (): CSSProperties => {
    if (phase === 'desktop-open') {
      return {
        animation: 'modalIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      };
    }

    if (phase === 'desktop-closing') {
      return {
        opacity: 0,
        transform: 'scale(0.96) translateY(8px)',
        transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    if (phase === 'shrink-at-fab') {
      return {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX * 0.82}, ${scaleY * 0.82})`,
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        borderColor: 'transparent',
        transition: 'transform 100ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform, border-radius',
      };
    }

    if (phase === 'travel-to-center') {
      return {
        transform: `translate3d(0, 0, 0) scale(${scaleX * 0.88}, ${scaleY * 0.88})`,
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        borderColor: 'transparent',
        transition: 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform, border-radius',
      };
    }

    if (phase === 'expand-to-form') {
      return {
        transform: 'translate3d(0, 0, 0) scale(1, 1)',
        borderRadius: '1.5rem',
        backgroundColor: '#0f1011',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        transition:
          'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 280ms cubic-bezier(0.16, 1, 0.3, 1), background-color 280ms ease, box-shadow 280ms ease, border-color 280ms ease',
        willChange: 'transform, border-radius',
      };
    }

    if (phase === 'open') {
      return {
        transform: 'translate3d(0, 0, 0) scale(1, 1)',
        borderRadius: '1.5rem',
        backgroundColor: '#0f1011',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
      };
    }

    if (phase === 'collapse-to-circle') {
      return {
        transform: `translate3d(0, 0, 0) scale(${scaleX * 0.88}, ${scaleY * 0.88})`,
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        borderColor: 'transparent',
        transition:
          'transform 220ms cubic-bezier(0.32, 0.72, 0, 1), border-radius 220ms cubic-bezier(0.32, 0.72, 0, 1), background-color 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
        willChange: 'transform, border-radius',
      };
    }

    if (phase === 'travel-to-fab') {
      return {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX * 0.82}, ${scaleY * 0.82})`,
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        borderColor: 'transparent',
        transition: 'transform 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        willChange: 'transform, border-radius',
      };
    }

    if (phase === 'settle-at-fab') {
      return {
        transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`,
        borderRadius: '9999px',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        borderColor: 'transparent',
        transition: 'transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        willChange: 'transform, border-radius',
      };
    }

    return {};
  };

  const isBackdropVisible =
    phase === 'travel-to-center' ||
    phase === 'expand-to-form' ||
    phase === 'open' ||
    phase === 'collapse-to-circle' ||
    phase === 'desktop-open';

  const isFabPillVisible =
    phase === 'shrink-at-fab' ||
    phase === 'travel-to-center' ||
    phase === 'collapse-to-circle' ||
    phase === 'travel-to-fab' ||
    phase === 'settle-at-fab';

  const isFormContentVisible =
    phase === 'expand-to-form' || phase === 'open' || phase === 'desktop-open';

  const isIconRotated =
    phase === 'travel-to-center' || phase === 'collapse-to-circle';

  return {
    isRendered,
    phase,
    panelRef,
    panelStyle: getPanelStyle(),
    isBackdropVisible,
    isFabPillVisible,
    isFormContentVisible,
    isIconRotated,
    scaleX,
    scaleY,
    requestClose,
  };
}
