import React, { useRef, useEffect, useCallback } from 'react';

export interface SpotlightCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  spotlightColor?: string;
  className?: string;
  as?: 'div' | 'button' | 'section';
  onClick?: React.MouseEventHandler<HTMLElement>;
  disabled?: boolean;
}

// Module-level pointer tracking for synchronized scroll updates across all cards
let globalPointer: { clientX: number; clientY: number; isTouch: boolean } | null = null;
let globalScrollRegistered = false;
const registeredCards = new Set<() => void>();

function ensureGlobalScrollListener() {
  if (globalScrollRegistered || typeof window === 'undefined') return;
  globalScrollRegistered = true;

  const onGlobalPointerMove = (e: PointerEvent) => {
    // Persistent position tracking for mouse/pen cursors
    if (e.pointerType !== 'touch') {
      globalPointer = { clientX: e.clientX, clientY: e.clientY, isTouch: false };
    }
  };

  const onGlobalScroll = () => {
    registeredCards.forEach((update) => update());
  };

  window.addEventListener('pointermove', onGlobalPointerMove, { passive: true });
  window.addEventListener('scroll', onGlobalScroll, { passive: true, capture: true });
  window.addEventListener('resize', onGlobalScroll, { passive: true });
}

/**
 * Cult UI Spotlight Card
 * Renders smooth radial illumination that tracks pointer and touch positions at 120fps via CSS variables.
 * Automatically synchronizes with window scroll to eliminate stuck glow artifacts on desktop,
 * and provides full tactile touch interaction for mobile and tablet devices.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  spotlightColor = 'rgba(56, 189, 248, 0.15)',
  className = '',
  as = 'div',
  onClick,
  disabled = false,
  ...props
}) => {
  const cardRef = useRef<HTMLElement | null>(null);
  const isLitRef = useRef(false);
  const touchActiveRef = useRef(false);

  // Directly sets CSS custom properties on DOM node for 120fps hardware acceleration with zero React re-renders
  const setSpotlight = useCallback((x: number, y: number, opacity: number) => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--spotlight-x', `${Math.round(x)}px`);
    cardRef.current.style.setProperty('--spotlight-y', `${Math.round(y)}px`);
    cardRef.current.style.setProperty('--spotlight-opacity', `${opacity}`);
    isLitRef.current = opacity > 0;
  }, []);

  const hideSpotlight = useCallback(() => {
    if (!cardRef.current || !isLitRef.current) return;
    cardRef.current.style.setProperty('--spotlight-opacity', '0');
    isLitRef.current = false;
  }, []);

  // Update on scroll: verifies whether stationary mouse pointer is still inside the card or scrolled away
  const handleScrollUpdate = useCallback(() => {
    if (!cardRef.current) return;

    // Mobile touch scroll immediately dismisses glow to prevent frozen highlights while scrolling
    if (touchActiveRef.current) {
      touchActiveRef.current = false;
      hideSpotlight();
      return;
    }

    if (!globalPointer || globalPointer.isTouch) {
      if (isLitRef.current) hideSpotlight();
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const { clientX, clientY } = globalPointer;

    const isInside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (isInside) {
      // Mouse is still physically over this card; update coordinates relative to the new scroll position
      setSpotlight(clientX - rect.left, clientY - rect.top, 1);
    } else if (isLitRef.current) {
      // Card has scrolled away from under the cursor! Fade out immediately
      hideSpotlight();
    }
  }, [setSpotlight, hideSpotlight]);

  // Register card instance for coordinated scroll tracking
  useEffect(() => {
    ensureGlobalScrollListener();
    const updateFn = handleScrollUpdate;
    registeredCards.add(updateFn);
    return () => {
      registeredCards.delete(updateFn);
    };
  }, [handleScrollUpdate]);

  // Pointer event handlers (Desktop mouse & Pen cursors)
  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'touch') return;
      globalPointer = { clientX: e.clientX, clientY: e.clientY, isTouch: false };
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      setSpotlight(e.clientX - rect.left, e.clientY - rect.top, 1);
    },
    [setSpotlight]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!cardRef.current) return;
      const isTouch = e.pointerType === 'touch';
      if (isTouch && !touchActiveRef.current) return;

      globalPointer = { clientX: e.clientX, clientY: e.clientY, isTouch };
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isTouch) {
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
          hideSpotlight();
          return;
        }
      }

      setSpotlight(x, y, 1);
    },
    [setSpotlight, hideSpotlight]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'touch') return;
      hideSpotlight();
    },
    [hideSpotlight]
  );

  // Dedicated Touch handlers (Phones, Tablets & Touch laptops)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!cardRef.current || e.touches.length === 0) return;
      touchActiveRef.current = true;
      const touch = e.touches[0];
      globalPointer = { clientX: touch.clientX, clientY: touch.clientY, isTouch: true };
      const rect = cardRef.current.getBoundingClientRect();
      setSpotlight(touch.clientX - rect.left, touch.clientY - rect.top, 1);
    },
    [setSpotlight]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!cardRef.current || e.touches.length === 0 || !touchActiveRef.current) return;
      const touch = e.touches[0];
      globalPointer = { clientX: touch.clientX, clientY: touch.clientY, isTouch: true };
      const rect = cardRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Finger drifted outside card boundary
      if (x < -12 || x > rect.width + 12 || y < -12 || y > rect.height + 12) {
        hideSpotlight();
        touchActiveRef.current = false;
        return;
      }

      setSpotlight(x, y, 1);
    },
    [setSpotlight, hideSpotlight]
  );

  const handleTouchEnd = useCallback(() => {
    touchActiveRef.current = false;
    hideSpotlight();
  }, [hideSpotlight]);

  const handleTouchCancel = useCallback(() => {
    touchActiveRef.current = false;
    hideSpotlight();
  }, [hideSpotlight]);

  // Keyboard accessibility
  const handleFocus = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setSpotlight(rect.width / 2, rect.height / 2, 0.5);
  }, [setSpotlight]);

  const handleBlur = useCallback(() => {
    hideSpotlight();
  }, [hideSpotlight]);

  const baseClasses = `relative rounded-2xl border border-white/10 bg-[#0f1011] p-5 sm:p-6 transition-all duration-300 hover:border-white/20 shadow-xl overflow-hidden group ${className}`;

  const radialStyle: React.CSSProperties = {
    opacity: 'var(--spotlight-opacity, 0)',
    background: `radial-gradient(350px circle at var(--spotlight-x, 0px) var(--spotlight-y, 0px), ${spotlightColor}, transparent 65%)`,
  };

  const Component = as as any;

  return (
    <Component
      ref={cardRef}
      disabled={as === 'button' ? disabled : undefined}
      type={as === 'button' ? 'button' : undefined}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={
        as === 'button'
          ? `${baseClasses} text-left cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500/40`
          : baseClasses
      }
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 ease-out z-0"
        style={radialStyle}
      />
      <div className="relative z-10 w-full">{children}</div>
    </Component>
  );
};
