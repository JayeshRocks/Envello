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
  const [isPositioned, setIsPositioned] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const steps: SpotlightStep[] = [
    {
      id: 'pillars',
      targetId: 'financial-pillars',
      title: 'Six Financial Pillars',
      badge: 'Balance Taxonomy',
      description:
        'Envello never shows an ambiguous "Total Balance". Spendable cash is always separated from locked FDs, credit card liabilities, and debts.',
      actionText: 'Scroll to Envelopes',
      onAction: () => {
        document.getElementById('envelope-budgeting')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
    },
    {
      id: 'accounts',
      targetId: 'accounts-reconcile-actions',
      title: 'Accounts & Bank Reconciliation',
      badge: 'Liquid Assets',
      description:
        'Click "Accounts" to manage your liquid bank checking, savings, and cash in hand. Use "Reconcile" at month-end to audit against bank statements.',
      actionText: 'Open Accounts Drawer',
      onAction: () => {
        if (onOpenAccounts) onOpenAccounts();
      },
    },
    {
      id: 'envelopes',
      targetId: 'envelope-budgeting',
      title: 'Core Envelopes & Anti-Negative Guard',
      badge: 'Budgeting',
      description:
        'Spendable is your primary clearinghouse; Emergency and Savings are guarded reserves. Envelopes can NEVER be overspent into negative.',
      actionText: 'Inspect Envelopes',
      onAction: () => {
        document.getElementById('envelope-budgeting')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      targetId: 'liabilities-and-assets',
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

  // Measure and scroll target into view
  const updateTargetPosition = useCallback(() => {
    let el = document.getElementById(currentStep.targetId);
    if (!el && currentStep.fallbackTargetId) {
      el = document.getElementById(currentStep.fallbackTargetId);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setIsPositioned(true);
    } else {
      setTargetRect(null);
      setIsPositioned(false);
    }
  }, [currentStep.targetId, currentStep.fallbackTargetId]);

  // When step changes, smooth scroll to element and measure position
  useEffect(() => {
    if (!isOpen) return;

    let el = document.getElementById(currentStep.targetId);
    if (!el && currentStep.fallbackTargetId) {
      el = document.getElementById(currentStep.fallbackTargetId);
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 250);

    const handleScrollOrResize = () => {
      updateTargetPosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, currentStepIndex, currentStep.targetId, currentStep.fallbackTargetId, updateTargetPosition]);

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

  // Determine floating popover positioning relative to target
  let popoverTop = 100;
  let popoverLeft = 16;
  const cardWidth = Math.min(380, window.innerWidth - 32);
  let arrowPlacement: 'top' | 'bottom' = 'top';

  if (targetRect) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    popoverLeft = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, targetCenterX - cardWidth / 2));

    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceAbove = targetRect.top;

    if (spaceBelow > 240 || spaceBelow > spaceAbove) {
      // Place below target
      popoverTop = Math.min(window.innerHeight - 260, targetRect.bottom + 16);
      arrowPlacement = 'top';
    } else {
      // Place above target
      popoverTop = Math.max(16, targetRect.top - 240);
      arrowPlacement = 'bottom';
    }
  } else {
    // Fallback centered
    popoverTop = window.innerHeight / 2 - 120;
    popoverLeft = Math.max(16, window.innerWidth / 2 - cardWidth / 2);
  }

  return (
    <ModalPortal>
      {/* Semi-transparent dark overlay */}
      <div
        className="fixed inset-0 z-50 pointer-events-auto bg-black/60 backdrop-blur-[2px] transition-all duration-300"
        onClick={handleSkip}
      />

      {/* Spotlight cutout glow ring over target element */}
      {targetRect && isPositioned && (
        <div
          className="fixed z-50 pointer-events-none rounded-2xl ring-4 ring-sky-400/80 shadow-[0_0_60px_rgba(56,189,248,0.5)] transition-all duration-300"
          style={{
            top: Math.max(0, targetRect.top - 6),
            left: Math.max(0, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        >
          {/* Animated beacon ring */}
          <div className="absolute -inset-2 rounded-2xl border-2 border-sky-400/40 animate-ping opacity-60" />
        </div>
      )}

      {/* Floating Pointer Popover Card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="spotlight-title"
        className="fixed z-50 bg-[#0c0d12]/95 border border-sky-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 backdrop-blur-xl animate-fade-in transition-all duration-200 pointer-events-auto"
        style={{
          top: `${popoverTop}px`,
          left: `${popoverLeft}px`,
          width: `${cardWidth}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pointer Arrow */}
        {targetRect && (
          <div
            className={`absolute w-3.5 h-3.5 bg-[#0c0d12] border-sky-500/40 rotate-45 ${
              arrowPlacement === 'top'
                ? '-top-2 border-t border-l'
                : '-bottom-2 border-b border-r'
            }`}
            style={{
              left: `${Math.max(20, Math.min(cardWidth - 30, (targetRect.left + targetRect.width / 2) - popoverLeft - 7))}px`,
            }}
          />
        )}

        {/* Card Header: Step Pill & Close */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
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
            className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Skip and never show again"
            aria-label="Skip Tutorial"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card Body: Title & Punchy Description */}
        <div className="py-3 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <Compass className="w-3.5 h-3.5" />
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
          <div className="pb-3">
            <button
              type="button"
              onClick={() => {
                if (currentStep.onAction) currentStep.onAction();
              }}
              className="w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-200 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-95 cursor-pointer group shadow-sm"
            >
              <MousePointerClick className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span>{currentStep.actionText}</span>
            </button>
          </div>
        )}

        {/* Card Footer: Skip, Progress Dots, Back, Next */}
        <div className="flex items-center justify-between pt-2.5 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={handleSkip}
            className="text-neutral-400 hover:text-white transition active:scale-95 cursor-pointer font-medium"
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
                    ? 'w-4 bg-sky-400'
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
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition active:scale-95 cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 font-bold text-xs flex items-center space-x-1 active:scale-95 transition cursor-pointer shadow-sm shadow-sky-500/20"
            >
              <span>{isLastStep ? 'Finish' : 'Next'}</span>
              {!isLastStep ? <ChevronRight className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
