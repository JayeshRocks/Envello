import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type DeviceOrientation = 'portrait' | 'landscape';
export type DeviceType = 'mobile-tablet' | 'desktop';

export interface DeviceSignals {
  // Raw collected signals & fingerprints
  maxTouchPoints: number;
  hasTouchEvents: boolean;
  isCoarsePointer: boolean;
  canHover: boolean;
  isAppleTablet: boolean; // iPad / iPadOS (including desktop Safari mode)
  isAndroidTablet: boolean;
  isGenericTablet: boolean;
  isPhone: boolean;

  // Viewport & Orientation
  width: number;
  height: number;
  orientation: DeviceOrientation;
  isPortrait: boolean;
  isLandscape: boolean;

  // Synthesized UI classification
  isMobileOrTablet: boolean;
  isDesktop: boolean;
  isTablet: boolean;
  deviceType: DeviceType;
}

const DeviceContext = createContext<DeviceSignals | null>(null);

/**
 * Gather hardware, platform, pointer, and viewport signals.
 */
function collectSignals(): DeviceSignals {
  const isClient = typeof window !== 'undefined' && typeof navigator !== 'undefined';

  if (!isClient) {
    return {
      maxTouchPoints: 0,
      hasTouchEvents: false,
      isCoarsePointer: false,
      canHover: true,
      isAppleTablet: false,
      isAndroidTablet: false,
      isGenericTablet: false,
      isPhone: false,
      width: 1280,
      height: 800,
      orientation: 'landscape',
      isPortrait: false,
      isLandscape: true,
      isMobileOrTablet: false,
      isDesktop: true,
      isTablet: false,
      deviceType: 'desktop',
    };
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as unknown as { platform?: string }).platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const hasTouchEvents = 'ontouchstart' in window;

  // Media query pointer signals
  const isCoarsePointer = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
  const canHover = window.matchMedia ? window.matchMedia('(hover: hover)').matches : true;

  // Tablet fingerprints
  // Apple iPad (including iPadOS 13+ which presents as MacIntel with multi-touch)
  const isAppleTablet =
    /iPad/i.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1 && !/iPhone|iPod/i.test(ua));

  // Android tablet: UA has Android but does NOT have Mobile
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

  // Generic tablets (Silk, Kindle, PlayBook, Windows Tablet, etc.)
  const isGenericTablet = /Tablet|Silk|Kindle|PlayBook/i.test(ua);

  // Phone fingerprints
  const isPhone =
    /iPhone|iPod/i.test(ua) ||
    (/Android/i.test(ua) && /Mobile/i.test(ua)) ||
    /Mobile|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  // Viewport dimensions
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Orientation determination (checks screen.orientation, matchMedia, and aspect ratio)
  let orientation: DeviceOrientation = 'portrait';
  if (window.screen?.orientation?.type) {
    orientation = window.screen.orientation.type.includes('landscape') ? 'landscape' : 'portrait';
  } else if (window.matchMedia && window.matchMedia('(orientation: landscape)').matches) {
    orientation = 'landscape';
  } else {
    orientation = width > height ? 'landscape' : 'portrait';
  }

  const isPortrait = orientation === 'portrait';
  const isLandscape = orientation === 'landscape';

  // Tablet classification
  const isTablet =
    isAppleTablet ||
    isAndroidTablet ||
    isGenericTablet ||
    (maxTouchPoints > 0 && isCoarsePointer && (width >= 600 || height >= 600) && !isPhone);

  // Synthesized UI decision:
  // Mobile or tablet if:
  // 1. Detected as Apple tablet, Android tablet, or generic tablet
  // 2. Detected as phone
  // 3. Has coarse touch pointer as primary input
  // 4. Viewport width is below standard desktop threshold (< 1024px)
  // Even if a tablet has a huge screen in landscape (e.g. iPad Pro 12.9" at 1366px or Galaxy Tab Ultra at 1848px),
  // touch signals + tablet fingerprints classify it as mobile-tablet UI.
  const isMobileOrTablet =
    isTablet ||
    isPhone ||
    (isCoarsePointer && !canHover) ||
    (maxTouchPoints > 0 && isCoarsePointer) ||
    width < 1024;

  const isDesktop = !isMobileOrTablet;
  const deviceType: DeviceType = isMobileOrTablet ? 'mobile-tablet' : 'desktop';

  return {
    maxTouchPoints,
    hasTouchEvents,
    isCoarsePointer,
    canHover,
    isAppleTablet,
    isAndroidTablet,
    isGenericTablet,
    isPhone,
    width,
    height,
    orientation,
    isPortrait,
    isLandscape,
    isMobileOrTablet,
    isDesktop,
    isTablet,
    deviceType,
  };
}

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signals, setSignals] = useState<DeviceSignals>(() => collectSignals());

  useEffect(() => {
    const handleUpdate = () => {
      const next = collectSignals();
      setSignals((prev) => {
        // Prevent unnecessary re-renders if core classification & orientation haven't changed
        if (
          prev.isMobileOrTablet === next.isMobileOrTablet &&
          prev.orientation === next.orientation &&
          prev.isLandscape === next.isLandscape &&
          prev.width === next.width &&
          prev.height === next.height
        ) {
          return prev;
        }
        return next;
      });
    };

    // Reflect to DOM for CSS/styling targeting
    const root = document.documentElement;
    root.setAttribute('data-device', signals.isMobileOrTablet ? 'mobile-tablet' : 'desktop');
    root.setAttribute('data-orientation', signals.orientation);
    root.setAttribute('data-touch', signals.maxTouchPoints > 0 ? 'true' : 'false');
    root.setAttribute('data-tablet', signals.isTablet ? 'true' : 'false');

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('orientationchange', handleUpdate, { passive: true });

    let pointerMedia: MediaQueryList | null = null;
    let orientationMedia: MediaQueryList | null = null;

    if (window.matchMedia) {
      pointerMedia = window.matchMedia('(pointer: coarse)');
      orientationMedia = window.matchMedia('(orientation: landscape)');

      if (pointerMedia.addEventListener) {
        pointerMedia.addEventListener('change', handleUpdate);
      }
      if (orientationMedia.addEventListener) {
        orientationMedia.addEventListener('change', handleUpdate);
      }
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('orientationchange', handleUpdate);
      if (pointerMedia?.removeEventListener) {
        pointerMedia.removeEventListener('change', handleUpdate);
      }
      if (orientationMedia?.removeEventListener) {
        orientationMedia.removeEventListener('change', handleUpdate);
      }
    };
  }, [signals.isMobileOrTablet, signals.orientation, signals.maxTouchPoints, signals.isTablet]);

  const value = useMemo(() => signals, [signals]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
};

export const useDevice = (): DeviceSignals => {
  const context = useContext(DeviceContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g. isolated test)
    return collectSignals();
  }
  return context;
};

