import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';

export type MorphPhase =
  | 'idle'
  | 'morphing-open'
  | 'open'
  | 'morphing-close'
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

    // Refresh coordinates for the return flight
    measureCoords();

    // Start continuous, hardware-accelerated reverse morph animation (780ms)
    setPhase('morphing-close');

    const timer = window.setTimeout(() => {
      const fabEl = document.getElementById(fabId);
      if (fabEl) {
        fabEl.style.opacity = '1';
        fabEl.style.pointerEvents = 'auto';
      }
      setIsRendered(false);
      setPhase('idle');
      onCompleteClose();
    }, 780);
    timeoutsRef.current.push(timer);
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

      animFrameRef.current = requestAnimationFrame(() => {
        measureCoords();

        // Start continuous, hardware-accelerated open morph animation (860ms)
        setPhase('morphing-open');

        const timer = window.setTimeout(() => {
          setPhase('open');
        }, 860);
        timeoutsRef.current.push(timer);
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
    const baseStyle: Record<string, string | number> = {
      '--fab-delta-x': `${deltaX}px`,
      '--fab-delta-y': `${deltaY}px`,
      '--fab-scale-x': scaleX,
      '--fab-scale-y': scaleY,
      '--fab-counter-scale-x': scaleX ? 1 / scaleX : 1,
      '--fab-counter-scale-y': scaleY ? 1 / scaleY : 1,
    };

    if (phase === 'desktop-open') {
      return {
        ...baseStyle,
        animation: 'modalIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      };
    }

    if (phase === 'desktop-closing') {
      return {
        ...baseStyle,
        opacity: 0,
        transform: 'scale(0.96) translateY(8px)',
        transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    if (phase === 'open') {
      return {
        ...baseStyle,
        transform: 'translate3d(0, 0, 0) scale(1, 1)',
        borderRadius: '1.5rem',
      };
    }

    return baseStyle;
  };

  return {
    isRendered,
    phase,
    panelRef,
    panelStyle: getPanelStyle(),
    scaleX,
    scaleY,
    requestClose,
  };
}
