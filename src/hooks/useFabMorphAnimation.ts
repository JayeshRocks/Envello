import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';

export type MorphPhase =
  | 'idle'
  | 'neon-activating'
  | 'neon-traversing'
  | 'form-expanding'
  | 'open'
  | 'form-collapsing'
  | 'neon-returning'
  | 'neon-settling'
  | 'desktop-open'
  | 'desktop-closing';

interface UseFabMorphAnimationOptions {
  isOpen: boolean;
  isMobileOrTablet: boolean;
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
  isMobileOrTablet,
  fabId = 'mobile-record-fab',
  onCompleteClose,
}: UseFabMorphAnimationOptions) {
  const [phase, setPhase] = useState<MorphPhase>('idle');
  const [isRendered, setIsRendered] = useState(false);
  const coordsRef = useRef<FabDeltaVector>({ deltaX: 0, deltaY: 0 });

  const timeoutsRef = useRef<number[]>([]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  // Measure target FAB coordinates against the viewport center
  const measureCoords = useCallback(() => {
    const fabEl = document.getElementById(fabId);
    if (!fabEl) return null;

    const fabRect = fabEl.getBoundingClientRect();
    const coords = calculateFabDeltaVector(fabRect, {
      width: window.innerWidth,
      height: window.innerHeight,
    });

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

    // Refresh coordinates for the return flight
    measureCoords();

    // Step 1: Form collapses into glowing neon circle at screen center
    setPhase('form-collapsing');

    // Step 2: Glowing neon circle traverses screen back down to FAB position
    const t1 = window.setTimeout(() => {
      setPhase('neon-returning');
    }, 280);
    timeoutsRef.current.push(t1);

    // Step 3: Neon circle settles with soft spring bounce into corner position
    const t2 = window.setTimeout(() => {
      setPhase('neon-settling');
    }, 700);
    timeoutsRef.current.push(t2);

    // Step 4: Restore real resting FAB and unmount modal
    const t3 = window.setTimeout(() => {
      const fabEl = document.getElementById(fabId);
      if (fabEl) {
        fabEl.style.opacity = '1';
        fabEl.style.pointerEvents = 'auto';
      }
      setIsRendered(false);
      setPhase('idle');
      onCompleteClose();
    }, 820);
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

      // Hide real FAB while glowing neon orb takes flight
      fabEl.style.opacity = '0';
      fabEl.style.pointerEvents = 'none';

      measureCoords();
      setIsRendered(true);

      // Step 1: Button activates into glowing neon circle at FAB corner
      setPhase('neon-activating');

      // Step 2: Glowing neon circle glides smoothly across screen to center
      const t1 = window.setTimeout(() => {
        setPhase('neon-traversing');
      }, 90);
      timeoutsRef.current.push(t1);

      // Step 3: Arrives at center and expands into form
      const t2 = window.setTimeout(() => {
        setPhase('form-expanding');
      }, 510);
      timeoutsRef.current.push(t2);

      // Step 4: Form settles as fully interactive
      const t3 = window.setTimeout(() => {
        setPhase('open');
      }, 870);
      timeoutsRef.current.push(t3);
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

  // Glowing neon circle styles (the orb traversing the screen)
  const getNeonStyle = (): CSSProperties => {
    const { deltaX, deltaY } = coordsRef.current;

    switch (phase) {
      case 'neon-activating':
        return {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.85)`,
          opacity: 1,
          transition: 'transform 90ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 80ms ease',
        };
      case 'neon-traversing':
        return {
          transform: 'translate3d(0, 0, 0) scale(1.05)',
          opacity: 1,
          transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease',
        };
      case 'form-expanding':
        return {
          transform: 'translate3d(0, 0, 0) scale(1.3)',
          opacity: 0,
          transition: 'transform 300ms ease-out, opacity 220ms ease-out',
        };
      case 'form-collapsing':
        return {
          transform: 'translate3d(0, 0, 0) scale(1.05)',
          opacity: 1,
          transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease',
        };
      case 'neon-returning':
        return {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.95)`,
          opacity: 1,
          transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease',
        };
      case 'neon-settling':
        return {
          transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1)`,
          opacity: 1,
          transition: 'transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 100ms ease',
        };
      default:
        return {
          opacity: 0,
          pointerEvents: 'none',
        };
    }
  };

  // Form panel styles (expanding from center & collapsing to center)
  const getFormStyle = (): CSSProperties => {
    switch (phase) {
      case 'neon-activating':
      case 'neon-traversing':
        return {
          transform: 'scale(0.15)',
          opacity: 0,
          pointerEvents: 'none',
        };
      case 'form-expanding':
        return {
          transform: 'scale(1)',
          opacity: 1,
          transition: 'transform 360ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
        };
      case 'open':
        return {
          transform: 'scale(1)',
          opacity: 1,
          pointerEvents: 'auto',
        };
      case 'form-collapsing':
        return {
          transform: 'scale(0.15)',
          opacity: 0,
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease',
          pointerEvents: 'none',
        };
      case 'neon-returning':
      case 'neon-settling':
        return {
          transform: 'scale(0.15)',
          opacity: 0,
          pointerEvents: 'none',
        };
      case 'desktop-open':
        return {
          animation: 'modalIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        };
      case 'desktop-closing':
        return {
          opacity: 0,
          transform: 'scale(0.96) translateY(8px)',
          transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        };
      default:
        return {};
    }
  };

  const isBackdropActive =
    phase === 'neon-traversing' ||
    phase === 'form-expanding' ||
    phase === 'open' ||
    phase === 'form-collapsing' ||
    phase === 'desktop-open';

  const getBackdropStyle = (): CSSProperties => ({
    opacity: isBackdropActive ? 1 : 0,
    transition: isBackdropActive ? 'opacity 380ms ease-out' : 'opacity 380ms ease-in',
  });

  const isNeonVisible =
    phase === 'neon-activating' ||
    phase === 'neon-traversing' ||
    phase === 'form-expanding' ||
    phase === 'form-collapsing' ||
    phase === 'neon-returning' ||
    phase === 'neon-settling';

  return {
    isRendered,
    phase,
    isNeonVisible,
    neonStyle: getNeonStyle(),
    formStyle: getFormStyle(),
    backdropStyle: getBackdropStyle(),
    requestClose,
  };
}
