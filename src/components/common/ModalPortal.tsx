import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Renders modal content directly into document.body via React Portal.
 * This ensures modals completely escape any parent containers with:
 * - overflow: hidden
 * - transform / animations
 * - backdrop-filter (e.g. glass-card)
 * - perspective / contain
 * Guaranteeing true full-viewport centering and backdrop coverage on all mobile,
 * tablet, and desktop viewports.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(children, document.body);
};
