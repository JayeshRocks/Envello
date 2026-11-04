import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  MousePointerClick,
  Compass,
} from 'lucide-react';
import { ModalPortal } from '@/components/common/ModalPortal';

export interface SpotlightStep {
  id: string;
  targetId: string;
  fallbackTargetId?: string;
  title: string;
  badge: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

interface SpotlightTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onOpenAccounts?: () => void;
  onOpenRecordTransaction?: () => void;
  onSelectLiabilitiesTab?: (tab: 'cards' | 'fds' | 'debts' | 'recurring') => void;
}

export const SpotlightTour: React.FC<SpotlightTourProps> = ({
  isOpen,
  onComplete,
  onOpenAccounts,
  onOpenRecordTransaction,
  onSelectLiabilitiesTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const steps: SpotlightStep[] = [
    {
      id: 'pillars',
      targetId: 'pillars-grid',
      fallbackTargetId: 'financial-pillars',
      title: 'Six Financial Pillars',
      badge: 'Balance Taxonomy',
      description:
        'Envello never shows an ambiguous "Total Balance". Liquid funds in bank accounts and cash are always separated from locked FDs & RDs, card debt, and loans.',
      actionText: 'Scroll to Envelopes',
      onAction: () => {
        document.getElementById('core-system-envelopes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
    {
      id: 'accounts',
      targetId: 'header-accounts-dropdown',
      fallbackTargetId: 'financial-pillars',
      title: 'Accounts & Bank Reconciliation',
      badge: 'Liquid Assets',
      description:
        'Click "Accounts" in the header to manage bank checking, savings, and cash in hand, or to reconcile against bank statements.',
      actionText: 'Open Accounts Drawer',
      onAction: () => {
        if (onOpenAccounts) onOpenAccounts();
      },
    },
    {
      id: 'envelopes',
      targetId: 'core-system-envelopes',
      fallbackTargetId: 'envelope-budgeting',
      title: 'Envelopes & Anti-Negative Guard',
      badge: 'Budgeting',
      description:
        'Assign every rupee a job. Envelopes can NEVER be overspent into negative. You can edit, customize, delete, or mark any envelope as a Protected Reserve.',
      actionText: 'Inspect Envelopes',
      onAction: () => {
        document.getElementById('core-system-envelopes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
    {
      id: 'record',
      targetId: 'record-transaction-desktop-btn',
      fallbackTargetId: 'mobile-record-fab',
      title: 'Record Transaction (Key: T)',
      badge: 'Double-Entry',
      description:
        'Log expenses, income, or transfers here. Expenses enforce available envelope funds. Direct overhead bills select envelope "None".',
      actionText: 'Try Transaction Form',
      onAction: () => {
        if (onOpenRecordTransaction) onOpenRecordTransaction();
      },
    },
    {
      id: 'liabilities',
      targetId: 'liabilities-tab-strip',
      fallbackTargetId: 'liabilities-and-assets',
      title: 'Cards, EMIs & Debts Hub',
      badge: 'Liabilities',
      description:
        'Credit cards and EMIs are direct debt obligations, NOT envelopes. Pay card bills in 1 click to settle debt without double-counting expenses.',
      actionText: 'View Credit Cards Tab',
      onAction: () => {
        if (onSelectLiabilitiesTab) onSelectLiabilitiesTab('cards');
        document.getElementById('liabilities-and-assets')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
    {
      id: 'recurring',
      targetId: 'recurring-section',
      fallbackTargetId: 'liabilities-and-assets',
      title: 'Standing Costs & Cadences',
      badge: 'Automation',
      description:
        'Schedule items by interval in days (e.g. water cans every 15 days) or monthly calendar day (e.g. rent on 5th). 1-click batch log due bills!',
      actionText: 'Switch to Recurring Tab',
      onAction: () => {
        if (onSelectLiabilitiesTab) onSelectLiabilitiesTab('recurring');
        setTimeout(() => {
          document.getElementById('recurring-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      },
    },
    {
      id: 'ledger',
      targetId: 'transaction-ledger',
      title: 'Transaction Ledger & Safe Revert',
      badge: 'Ledger Audit',
      description:
        'Your authoritative double-entry journal. Revert mistakes anytime for the current month or within 3 days post-month-end with a full ledger preview.',
      actionText: 'Scroll to Ledger',
      onAction: () => {
        document.getElementById('transaction-ledger')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
  ];

  const currentStep = steps[currentStepIndex];

  // Auto-switch tabs in Liabilities & Assets container when reaching related steps
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep.id === 'liabilities') {
      onSelectLiabilitiesTab?.('cards');
    } else if (currentStep.id === 'recurring') {
      onSelectLiabilitiesTab?.('recurring');
    }
  }, [isOpen, currentStep.id, onSelectLiabilitiesTab]);

  // Measure target element position with delta guard (prevents redundant 60fps React re-renders)
  const updateTargetPosition = useCallback(() => {
    let el = document.getElementById(currentStep.targetId);
    if (!el && currentStep.fallbackTargetId) {
      el = document.getElementById(currentStep.fallbackTargetId);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect((prev) => {
        if (
          prev &&
          Math.abs(prev.top - rect.top) < 0.5 &&
          Math.abs(prev.left - rect.left) < 0.5 &&
          Math.abs(prev.width - rect.width) < 0.5 &&
          Math.abs(prev.height - rect.height) < 0.5
        ) {
          return prev;
        }
        return rect;
      });
    } else {
      setTargetRect((prev) => (prev === null ? prev : null));
    }
  }, [currentStep.targetId, currentStep.fallbackTargetId]);

  // Smooth-scroll element into view with header offset when step changes
  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(() => {
      let el = document.getElementById(currentStep.targetId);
      if (!el && currentStep.fallbackTargetId) {
        el = document.getElementById(currentStep.fallbackTargetId);
      }

      if (el) {
        const rect = el.getBoundingClientRect();
        const currentScrollY = window.scrollY || document.documentElement.scrollTop;
        const elementAbsoluteTop = rect.top + currentScrollY;

        // 64px fixed header + 24px safety buffer = 88px offset
        const targetScrollTop = Math.max(0, elementAbsoluteTop - 88);
        window.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [isOpen, currentStepIndex, currentStep.targetId, currentStep.fallbackTargetId]);

  // Continuous 60fps RAF tracking loop to guarantee 100% position accuracy during scroll & resize
  useEffect(() => {
    if (!isOpen) return;

    let rafId: number;
    const loop = () => {
      updateTargetPosition();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    window.addEventListener('resize', updateTargetPosition, { passive: true });
    window.addEventListener('scroll', updateTargetPosition, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [isOpen, updateTargetPosition]);

  if (!isOpen) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Dimensions & padding
  const padding = 8;
  const cardWidth = Math.min(380, window.innerWidth - 32);
  const estimatedCardHeight = 220;
  const actualCardHeight = cardRef.current?.offsetHeight || estimatedCardHeight;

  // Calculate popover positioning relative to target
  let popoverTop = 100;
  let popoverLeft = 16;
  let arrowPlacement: 'top' | 'bottom' = 'top';

  if (targetRect) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    popoverLeft = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, targetCenterX - cardWidth / 2));

    const spaceBelow = window.innerHeight - (targetRect.bottom + padding);
    const spaceAbove = targetRect.top - padding - 64; // account for 64px header

    if (spaceBelow >= actualCardHeight + 20) {
      // Comfortably fits below target
      popoverTop = Math.min(window.innerHeight - actualCardHeight - 16, targetRect.bottom + padding + 12);
      arrowPlacement = 'top';
    } else if (spaceAbove >= actualCardHeight + 20) {
      // Fits above target
      popoverTop = Math.max(76, targetRect.top - padding - actualCardHeight - 12);
      arrowPlacement = 'bottom';
    } else {
      // Target is very tall (e.g. 6-pillar grid): dock card at bottom of viewport
      popoverTop = Math.max(76, window.innerHeight - actualCardHeight - 20);
      arrowPlacement = 'top';
    }
  } else {
    // Fallback centered
    popoverTop = Math.max(80, window.innerHeight / 2 - actualCardHeight / 2);
    popoverLeft = Math.max(16, window.innerWidth / 2 - cardWidth / 2);
  }

  // Arrow horizontal offset
  const arrowLeft = targetRect
    ? Math.max(20, Math.min(cardWidth - 30, (targetRect.left + targetRect.width / 2) - popoverLeft - 7))
    : cardWidth / 2 - 7;

  return (
    <ModalPortal>
      {/* =========================================================================
          SVG CUTOUT MASK (True Industry-Standard Hole-Punch Spotlight)
          - The highlighted target has ZERO overlay and ZERO blur: 100% sharp & readable
          - Everything outside the target is dimmed with crisp semi-transparent black
          ========================================================================= */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-50 transition-opacity duration-200"
        style={{ width: '100vw', height: '100vh' }}
        aria-hidden="true"
      >
        <defs>
          <mask id="spotlight-cutout-mask">
            {/* White: covers whole screen (visible overlay) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black: cuts out a clear transparent hole for the target element */}
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - padding)}
                y={Math.max(0, targetRect.top - padding)}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Dimming backdrop (transparent through the cutout mask, isolates focus) */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-cutout-mask)"
          className="pointer-events-auto"
        />
      </svg>

      {/* Target Highlight Border Ring (surgical fit, zero lag, zero drifting, no exploding animations) */}
      {targetRect && (
        <div
          className="fixed z-50 pointer-events-none rounded-2xl border-2 border-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.45)] transition-none"
          style={{
            top: Math.max(0, targetRect.top - padding),
            left: Math.max(0, targetRect.left - padding),
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
        />
      )}

      {/* Floating Pointer Popover Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-title"
        className="fixed z-50 bg-[#0c0d12]/98 border border-sky-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 backdrop-blur-xl animate-fade-in pointer-events-auto"
        style={{
          top: `${popoverTop}px`,
          left: `${popoverLeft}px`,
          width: `${cardWidth}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pointer Arrow pointing to target */}
        {targetRect && (
          <div
            className={`absolute w-3 h-3 bg-[#0c0d12] border-sky-500/40 rotate-45 ${
              arrowPlacement === 'top'
                ? '-top-1.5 border-t border-l'
                : '-bottom-1.5 border-b border-r'
            }`}
            style={{
              left: `${arrowLeft}px`,
            }}
          />
        )}

        {/* Card Header: Step Pill & Close */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {currentStep.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="w-7 h-7 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Skip and never show again"
            aria-label="Skip Tutorial"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Body: Title & Punchy Description */}
        <div className="py-2.5 space-y-1.5">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
              <Compass className="w-3 h-3" />
            </div>
            <h3 id="spotlight-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
              {currentStep.title}
            </h3>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed font-sans">
            {currentStep.description}
          </p>
        </div>

        {/* Action Button: "Try It" live trigger */}
        {currentStep.actionText && currentStep.onAction && (
          <div className="pb-2.5">
            <button
              type="button"
              onClick={() => {
                if (currentStep.onAction) currentStep.onAction();
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer group shadow-sm"
            >
              <MousePointerClick className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span>{currentStep.actionText}</span>
            </button>
          </div>
        )}

        {/* Card Footer: Skip, Progress Dots, Back, Next */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={handleSkip}
            className="text-neutral-400 hover:text-white transition active:scale-95 cursor-pointer font-medium text-[11px]"
          >
            Skip Tour
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center space-x-1">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                  currentStepIndex === idx
                    ? 'w-3.5 bg-sky-400'
                    : idx < currentStepIndex
                      ? 'bg-emerald-400'
                      : 'bg-neutral-600'
                }`}
                title={`Step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-1.5">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 font-bold text-xs flex items-center space-x-1 active:scale-95 transition cursor-pointer shadow-sm shadow-sky-500/20"
            >
              <span>{isLastStep ? 'Finish' : 'Next'}</span>
              {!isLastStep ? <ChevronRight className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
