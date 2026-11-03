import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Download,
  RotateCw,
  Layers,
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { TUTORIAL_STEPS } from './tutorialData';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDontShowAgain?: (dontShow: boolean) => void;
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onDontShowAgain,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgainCheck, setDontShowAgainCheck] = useState(false);

  // -------------------------------------------------------------
  // Interactive Sandbox State (Step 1: Pillars)
  // -------------------------------------------------------------
  const [s1Checking, setS1Checking] = useState<number>(65000);
  const [s1Fd, setS1Fd] = useState<number>(100000);
  const [s1CardDebt, setS1CardDebt] = useState<number>(18000);
  const [s1LoanDebt, setS1LoanDebt] = useState<number>(10000);

  // -------------------------------------------------------------
  // Interactive Sandbox State (Step 2: Envelopes & Anti-Negative)
  // -------------------------------------------------------------
  const [s2SpendablePaise, setS2SpendablePaise] = useState<bigint>(1500000n); // ₹15,000
  const [s2GroceriesPaise, setS2GroceriesPaise] = useState<bigint>(400000n); // ₹4,000
  const [s2ExpenseInput, setS2ExpenseInput] = useState<string>('5000');
  const [s2Alert, setS2Alert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // -------------------------------------------------------------
  // Interactive Sandbox State (Step 3: Double-Entry Ledger)
  // -------------------------------------------------------------
  const [s3AccountBalancePaise, setS3AccountBalancePaise] = useState<bigint>(5000000n); // ₹50,000
  const [s3RentAvailablePaise, setS3RentAvailablePaise] = useState<bigint>(2000000n); // ₹20,000
  const [s3TxLog, setS3TxLog] = useState<Array<{ id: string; desc: string; amount: string; type: 'expense' | 'income' }>>([
    { id: '1', desc: 'Salary Credit (Assigned ₹15k to Rent)', amount: '+₹75,000.00', type: 'income' },
    { id: '2', desc: 'Electricity Bill (Direct Bill "None")', amount: '-₹2,400.00', type: 'expense' },
  ]);

  // -------------------------------------------------------------
  // Interactive Sandbox State (Step 4: Cards & Debts)
  // -------------------------------------------------------------
  const [s4BankPaise, setS4BankPaise] = useState<bigint>(4500000n); // ₹45,000
  const [s4CardOutstandingPaise, setS4CardOutstandingPaise] = useState<bigint>(2400000n); // ₹24,000
  const s4CardLimitPaise = 6000000n; // ₹60,000

  // -------------------------------------------------------------
  // Interactive Sandbox State (Step 5: Recurring Engine)
  // -------------------------------------------------------------
  const [s5Mode, setS5Mode] = useState<'interval' | 'monthly'>('interval');
  const [s5IntervalDays, setS5IntervalDays] = useState<number>(15);
  const [s5ItemAmount, setS5ItemAmount] = useState<number>(250);
  const [s5BatchLogged, setS5BatchLogged] = useState(false);

  // -------------------------------------------------------------
  // Interactive Sandbox State (Step 6: Reversion Preview)
  // -------------------------------------------------------------
  const [s6Reverted, setS6Reverted] = useState(false);
  const [s6TestMode, setS6TestMode] = useState<'valid' | 'blocked'>('valid');

  // -------------------------------------------------------------
  // Interactive Sandbox State (Step 7: Privacy & Deletion)
  // -------------------------------------------------------------
  const [s7DeletionSimulated, setS7DeletionSimulated] = useState(false);

  const handleDismiss = () => {
    if (onDontShowAgain) onDontShowAgain(dontShowAgainCheck);
    onClose();
  };

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, handleDismiss);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      if (onDontShowAgain) onDontShowAgain(dontShowAgainCheck);
      onClose();
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
    if (onDontShowAgain) onDontShowAgain(dontShowAgainCheck);
    onClose();
  };

  // -------------------------------------------------------------
  // Step 2 Action Handlers
  // -------------------------------------------------------------
  const handleAllocateToGroceries = (amountPaise: bigint) => {
    if (s2SpendablePaise >= amountPaise) {
      setS2SpendablePaise((prev) => prev - amountPaise);
      setS2GroceriesPaise((prev) => prev + amountPaise);
      setS2Alert({
        type: 'success',
        message: `Allocated ${formatINR(amountPaise)} from Spendable into Groceries!`,
      });
    } else {
      setS2Alert({
        type: 'error',
        message: 'Insufficient Spendable cash to allocate this amount.',
      });
    }
  };

  const handleTrySpendGroceries = () => {
    const enteredPaise = BigInt(Math.max(0, Math.round(Number(s2ExpenseInput || '0') * 100)));
    if (enteredPaise > s2GroceriesPaise) {
      setS2Alert({
        type: 'error',
        message: `Anti-Negative Guard Blocked: Expense of ${formatINR(enteredPaise)} exceeds available Groceries budget (${formatINR(s2GroceriesPaise)}). Envelopes can NEVER be overspent! Choose "None" for direct bills or allocate funds first.`,
      });
    } else {
      setS2GroceriesPaise((prev) => prev - enteredPaise);
      setS2SpendablePaise((prev) => prev); // liquid cash deducted in real ledger
      setS2Alert({
        type: 'success',
        message: `Transaction Approved: ${formatINR(enteredPaise)} spent. Remaining Groceries allocation: ${formatINR(s2GroceriesPaise - enteredPaise)}.`,
      });
    }
  };

  // -------------------------------------------------------------
  // Step 4 Card Payment Handlers
  // -------------------------------------------------------------
  const handlePayCardSimulated = (fraction: number) => {
    const paymentPaise = (s4CardOutstandingPaise * BigInt(Math.round(fraction * 100))) / 100n;
    if (paymentPaise > 0n && s4BankPaise >= paymentPaise) {
      setS4BankPaise((prev) => prev - paymentPaise);
      setS4CardOutstandingPaise((prev) => prev - paymentPaise);
    }
  };

  // -------------------------------------------------------------
  // Step 7 Export Handler
  // -------------------------------------------------------------
  const handleDownloadSampleExport = (format: 'json' | 'csv') => {
    const sampleData = {
      appName: 'Envello',
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      balancePillars: {
        spendableCashPaise: '6500000',
        envelopeAllocationsPaise: '2400000',
        fdsAndRdsPaise: '10000000',
        creditCardLiabilitiesPaise: '1800000',
        actualDebtsPaise: '1000000',
      },
      envelopes: [
        { name: 'Spendable', type: 'regular', availablePaise: '4100000' },
        { name: 'Emergency', type: 'emergency', availablePaise: '5000000' },
        { name: 'Savings', type: 'savings', availablePaise: '3000000' },
        { name: 'Groceries', type: 'custom', availablePaise: '2400000' },
      ],
      note: 'Offline encrypted zero-knowledge export archive generated by Envello.',
    };

    let blob: Blob;
    let filename: string;

    if (format === 'json') {
      blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: 'application/json' });
      filename = `envello-sample-backup-${new Date().toISOString().slice(0, 10)}.json`;
    } else {
      const csvContent =
        'Category,Type,AvailableINR\n' +
        'Spendable,Regular,41000.00\n' +
        'Emergency,Protected Reserve,50000.00\n' +
        'Savings,Liquid Reserve,30000.00\n' +
        'Groceries,Custom Category,24000.00\n';
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      filename = `envello-sample-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-modal-title"
          className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[88vh] flex flex-col bg-[#0b0c10] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fade-in text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* =========================================================================
              MODAL HEADER
              ========================================================================= */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-white/10 bg-neutral-900/50 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 flex-shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm sm:text-base tracking-tight text-white">
                      Interactive Feature Tour
                    </span>
                    <span className="text-[10px] sm:text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 hidden xs:block">
                    Explore deterministic accounting principles with live interactive sandboxes
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleSkip}
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"
                title="Close Tutorial"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Navigation Pill Strip (Wrapping Layout, Zero Horizontal Scroll) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-white/5">
              {TUTORIAL_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition active:scale-95 flex items-center space-x-1.5 cursor-pointer ${
                    currentStepIndex === idx
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                      : idx < currentStepIndex
                        ? 'bg-neutral-900/80 text-emerald-400/90 border border-emerald-500/20 hover:bg-neutral-800'
                        : 'bg-neutral-900/60 text-neutral-400 border border-white/5 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  <span className="font-mono text-[10px]">{idx + 1}.</span>
                  <span className="truncate max-w-[120px] xs:max-w-none">{step.title}</span>
                  {idx < currentStepIndex && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* =========================================================================
              MODAL BODY (Scrollable content with side-by-side or stacked sandbox)
              ========================================================================= */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Step Title & Summary Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-neutral-900/80 via-neutral-900/40 to-neutral-900/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  {currentStep.category} &bull; {currentStep.badge}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                  {currentStep.badge}
                </span>
              </div>
              <h2 id="tutorial-modal-title" className="text-lg sm:text-2xl font-bold tracking-tight text-white">
                {currentStep.title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {currentStep.summary}
              </p>
            </div>

            {/* Two-Column Grid: Left: Rules & Real-World Example | Right: Interactive Sandbox */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column (5 cols): Deep Dive & Real Example */}
              <div className="lg:col-span-5 space-y-4">
                {/* Why It Matters Card */}
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Why This Matters</span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {currentStep.whyItMatters}
                  </p>
                </div>

                {/* Real-World Scenario */}
                <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/20 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-300">
                    <Layers className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span>Real-World Scenario</span>
                  </div>
                  <p className="text-xs text-neutral-300/90 leading-relaxed font-sans">
                    {currentStep.realWorldExample}
                  </p>
                </div>

                {/* Non-Negotiable Invariants */}
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 space-y-2.5">
                  <span className="text-xs font-semibold text-neutral-200 block uppercase tracking-wider">
                    Core Accounting Invariants
                  </span>
                  <ul className="space-y-2 text-xs text-neutral-300">
                    {currentStep.keyRules.map((rule, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="leading-snug">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column (7 cols): Live Interactive "Try It Out" Playground */}
              <div className="lg:col-span-7">
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950/90 border border-white/10 shadow-inner space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs sm:text-sm font-bold text-white tracking-tight uppercase">
                        Interactive Sandbox &bull; Try It Out
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Live Simulation
                    </span>
                  </div>

                  {/* -------------------------------------------------------------
                      SANDBOX 1: PILLARS BALANCE CLARITY
                      ------------------------------------------------------------- */}
                  {currentStepIndex === 0 && (
                    <div className="space-y-4 animate-fade-in text-xs">
                      <p className="text-neutral-400">
                        Adjust sample numbers to see how Envello separates liquid cash from locked assets and liabilities:
                      </p>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-neutral-900/80 border border-sky-500/20">
                          <span className="text-neutral-400 block mb-1">1. Liquid Bank Cash:</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-neutral-400">₹</span>
                            <input
                              type="number"
                              value={s1Checking}
                              onChange={(e) => setS1Checking(Number(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-sky-400 font-mono font-bold text-sm"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-900/80 border border-amber-500/20">
                          <span className="text-neutral-400 block mb-1">3. Locked FDs & RDs:</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-neutral-400">₹</span>
                            <input
                              type="number"
                              value={s1Fd}
                              onChange={(e) => setS1Fd(Number(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-amber-400 font-mono font-bold text-sm"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-900/80 border border-purple-500/20">
                          <span className="text-neutral-400 block mb-1">4. Credit Card Debt:</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-neutral-400">₹</span>
                            <input
                              type="number"
                              value={s1CardDebt}
                              onChange={(e) => setS1CardDebt(Number(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-purple-400 font-mono font-bold text-sm"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-900/80 border border-orange-500/20">
                          <span className="text-neutral-400 block mb-1">5. Actual Debts:</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-neutral-400">₹</span>
                            <input
                              type="number"
                              value={s1LoanDebt}
                              onChange={(e) => setS1LoanDebt(Number(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-orange-400 font-mono font-bold text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resulting Taxonomy Comparison */}
                      <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                          <span className="text-neutral-400">Liquid Spendable Cash (Safe to spend):</span>
                          <span className="font-mono font-bold text-sky-400 text-sm">
                            {formatINR(BigInt(s1Checking) * 100n)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                          <span className="text-neutral-400">Term Assets (Locked, NOT spendable):</span>
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {formatINR(BigInt(s1Fd) * 100n)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                          <span className="text-neutral-400">Total Liabilities Owed:</span>
                          <span className="font-mono font-bold text-rose-400 text-sm">
                            {formatINR(BigInt(s1CardDebt + s1LoanDebt) * 100n)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-neutral-200 font-semibold">True Net Worth:</span>
                          <span className="font-mono font-bold text-emerald-400 text-base">
                            {formatINR(BigInt(s1Checking + s1Fd - (s1CardDebt + s1LoanDebt)) * 100n)}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-sky-400/90 italic">
                        Notice: While your net worth is {formatINR(BigInt(s1Checking + s1Fd - (s1CardDebt + s1LoanDebt)) * 100n)}, your actual liquid safe spendable cash is strictly {formatINR(BigInt(s1Checking) * 100n)}. You are never deceived by locked savings!
                      </p>
                    </div>
                  )}

                  {/* -------------------------------------------------------------
                      SANDBOX 2: ENVELOPE ALLOCATIONS & ANTI-NEGATIVE GUARD
                      ------------------------------------------------------------- */}
                  {currentStepIndex === 1 && (
                    <div className="space-y-4 animate-fade-in text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-neutral-900 border border-sky-500/20">
                          <span className="text-neutral-400 block text-[11px]">Spendable Pool:</span>
                          <div className="text-base font-mono font-bold text-sky-400">
                            {formatINR(s2SpendablePaise)}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-neutral-900 border border-indigo-500/20">
                          <span className="text-neutral-400 block text-[11px]">Groceries Envelope:</span>
                          <div className="text-base font-mono font-bold text-indigo-400">
                            {formatINR(s2GroceriesPaise)} available
                          </div>
                        </div>
                      </div>

                      {/* Quick Allocation Buttons */}
                      <div className="space-y-1.5">
                        <span className="text-neutral-400 block text-[11px]">Step A: Test Allocating Funds</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleAllocateToGroceries(100000n)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-sky-300 font-medium border border-sky-500/20 active:scale-95 transition cursor-pointer"
                          >
                            + Allocate ₹1,000 to Groceries
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAllocateToGroceries(250000n)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-sky-300 font-medium border border-sky-500/20 active:scale-95 transition cursor-pointer"
                          >
                            + Allocate ₹2,500 to Groceries
                          </button>
                        </div>
                      </div>

                      {/* Test Overspending vs Valid Spending */}
                      <div className="space-y-2 p-3 rounded-xl bg-neutral-900/60 border border-white/5">
                        <span className="text-neutral-300 font-semibold block text-[11px]">
                          Step B: Test the Anti-Negative Guard
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-neutral-400">Expense: ₹</span>
                          <input
                            type="number"
                            value={s2ExpenseInput}
                            onChange={(e) => setS2ExpenseInput(e.target.value)}
                            className="w-28 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleTrySpendGroceries}
                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs active:scale-95 transition shadow-sm cursor-pointer"
                          >
                            Try Spending
                          </button>
                        </div>

                        {s2Alert && (
                          <div
                            className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                              s2Alert.type === 'error'
                                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            {s2Alert.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------------
                      SANDBOX 3: DOUBLE-ENTRY LEDGER & DIRECT BILLS
                      ------------------------------------------------------------- */}
                  {currentStepIndex === 2 && (
                    <div className="space-y-4 animate-fade-in text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-white/10">
                        <div>
                          <span className="text-neutral-400 block text-[11px]">Simulated Checking Balance:</span>
                          <span className="font-mono font-bold text-emerald-400 text-sm">
                            {formatINR(s3AccountBalancePaise)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-neutral-400 block text-[11px]">Rent Envelope Available:</span>
                          <span className="font-mono font-bold text-indigo-400 text-sm">
                            {formatINR(s3RentAvailablePaise)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-neutral-400 block text-[11px]">Try Logging Transactions:</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setS3AccountBalancePaise((prev) => prev - 1500000n);
                              setS3RentAvailablePaise((prev) => prev - 1500000n);
                              setS3TxLog((prev) => [
                                { id: Date.now().toString(), desc: 'Rent Payment (from Rent Envelope)', amount: '-₹15,000.00', type: 'expense' },
                                ...prev,
                              ]);
                            }}
                            disabled={s3RentAvailablePaise < 1500000n}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-xs text-rose-300 font-medium border border-rose-500/20 active:scale-95 transition cursor-pointer"
                          >
                            Log ₹15,000 Rent (Envelope Deducted)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setS3AccountBalancePaise((prev) => prev - 80000n);
                              setS3TxLog((prev) => [
                                { id: Date.now().toString(), desc: 'Internet Bill (Direct Bill "None")', amount: '-₹800.00', type: 'expense' },
                                ...prev,
                              ]);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-amber-300 font-medium border border-amber-500/20 active:scale-95 transition cursor-pointer"
                          >
                            Log ₹800 Bill ("None" - Zero Envelope Drain)
                          </button>
                        </div>
                      </div>

                      {/* Transaction Feed */}
                      <div className="space-y-1.5">
                        <span className="text-neutral-400 text-[11px] block">Live Ledger Journal:</span>
                        <div className="space-y-1 max-h-36 overflow-y-auto">
                          {s3TxLog.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/60 border border-white/5"
                            >
                              <span className="text-neutral-200">{tx.desc}</span>
                              <span
                                className={`font-mono font-bold ${
                                  tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {tx.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------------
                      SANDBOX 4: CARDS & DEBTS LIABILITY SETTLEMENT
                      ------------------------------------------------------------- */}
                  {currentStepIndex === 3 && (
                    <div className="space-y-4 animate-fade-in text-xs">
                      {/* Utilization Indicator */}
                      <div className="p-3.5 rounded-xl bg-neutral-900 border border-purple-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">Axis Bank Credit Card</span>
                          <span className="font-mono text-purple-300 font-bold">
                            {formatINR(s4CardOutstandingPaise)} / {formatINR(s4CardLimitPaise)}
                          </span>
                        </div>
                        {/* Utilization Bar */}
                        {(() => {
                          const utilPercent =
                            s4CardLimitPaise > 0n
                              ? Number((s4CardOutstandingPaise * 1000n) / s4CardLimitPaise) / 10
                              : 0;
                          const isWarning = utilPercent >= 30 && utilPercent < 50;
                          const isDanger = utilPercent >= 50;

                          return (
                            <div className="space-y-1">
                              <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, utilPercent)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-neutral-400">Card Utilization:</span>
                                <span
                                  className={`font-mono font-bold ${
                                    isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {utilPercent.toFixed(1)}% ({utilPercent < 30 ? '<30% Safe' : 'Over 30% Warning'})
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Repayment Simulator */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Bank Balance: {formatINR(s4BankPaise)}</span>
                          <span className="text-[11px] text-sky-400">Test Settling Liability:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handlePayCardSimulated(0.5)}
                            disabled={s4CardOutstandingPaise === 0n}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-xs text-purple-300 font-medium border border-purple-500/20 active:scale-95 transition cursor-pointer"
                          >
                            Pay 50% ({formatINR(s4CardOutstandingPaise / 2n)})
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePayCardSimulated(1.0)}
                            disabled={s4CardOutstandingPaise === 0n}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-xs text-white font-bold active:scale-95 transition cursor-pointer"
                          >
                            Pay Full Balance
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setS4CardOutstandingPaise(2400000n);
                              setS4BankPaise(4500000n);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs transition active:scale-95 cursor-pointer"
                            title="Reset Card Sandbox"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug">
                        * Notice: Settling your credit card bill deducts bank cash and clears the liability. It generates ₹0 new expenses because you already accounted for the purchase when you bought the item!
                      </p>
                    </div>
                  )}

                  {/* -------------------------------------------------------------
                      SANDBOX 5: STANDING COSTS & RECURRING ENGINE
                      ------------------------------------------------------------- */}
                  {currentStepIndex === 4 && (
                    <div className="space-y-4 animate-fade-in text-xs">
                      {/* Mode Toggle */}
                      <div className="flex items-center space-x-2 p-1 rounded-xl bg-neutral-900 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setS5Mode('interval')}
                          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                            s5Mode === 'interval'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Interval in Days (Rolling)
                        </button>
                        <button
                          type="button"
                          onClick={() => setS5Mode('monthly')}
                          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                            s5Mode === 'monthly'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Day of Month (Calendar)
                        </button>
                      </div>

                      {/* Config Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-neutral-900 border border-white/5 space-y-1">
                          <span className="text-neutral-400 block text-[11px]">Cost Amount:</span>
                          <div className="flex items-center space-x-1">
                            <span className="text-neutral-400">₹</span>
                            <input
                              type="number"
                              value={s5ItemAmount}
                              onChange={(e) => setS5ItemAmount(Number(e.target.value) || 0)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-neutral-900 border border-white/5 space-y-1">
                          <span className="text-neutral-400 block text-[11px]">
                            {s5Mode === 'interval' ? 'Interval (Days):' : 'Day of Month (1-31):'}
                          </span>
                          <input
                            type="number"
                            value={s5IntervalDays}
                            onChange={(e) => setS5IntervalDays(Number(e.target.value) || 1)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Dynamic Normalized Output */}
                      {(() => {
                        const monthlyCommitment =
                          s5Mode === 'interval'
                            ? Math.round((s5ItemAmount * 30) / Math.max(1, s5IntervalDays))
                            : s5ItemAmount;

                        return (
                          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-300">Normalized 30-Day Monthly Commitment:</span>
                              <span className="font-mono font-bold text-emerald-400 text-sm">
                                {formatINR(BigInt(monthlyCommitment) * 100n)} / mo
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-emerald-500/10">
                              <span>Real-Time Status:</span>
                              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                <span>Due Today &bull; 1 Item Due</span>
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 1-Click Batch Logging */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setS5BatchLogged(true)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-neutral-950 font-bold text-xs transition active:scale-95 flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{s5BatchLogged ? 'All Due Items Logged!' : '1-Click Batch Log Due Expenses'}</span>
                        </button>
                        {s5BatchLogged && (
                          <span className="text-emerald-400 text-[11px] font-medium animate-fade-in">
                            ✓ Appended to double-entry ledger!
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------------
                      SANDBOX 6: REVERSION & 3-DAY ROLLOVER GRACE
                      ------------------------------------------------------------- */}
                  {currentStepIndex === 5 && (
                    <div className="space-y-4 animate-fade-in text-xs">
                      <div className="flex items-center space-x-2 p-1 rounded-xl bg-neutral-900 border border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setS6TestMode('valid');
                            setS6Reverted(false);
                          }}
                          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                            s6TestMode === 'valid'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Case A: Valid Reversal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setS6TestMode('blocked');
                            setS6Reverted(false);
                          }}
                          className={`flex-1 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                            s6TestMode === 'blocked'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Case B: Blocked by Anti-Negative Guard
                        </button>
                      </div>

                      {s6TestMode === 'valid' ? (
                        <div className="p-3.5 rounded-xl bg-neutral-900 border border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div>
                              <span className="font-semibold text-white block">Accidental Duplicate Expense</span>
                              <span className="text-[11px] text-neutral-400">Grocery Market &bull; Dated 2 days ago</span>
                            </div>
                            <span className="font-mono font-bold text-rose-400">₹1,500.00</span>
                          </div>

                          <div className="text-[11px] text-neutral-300 space-y-1">
                            <span className="text-neutral-400 block font-semibold">Ledger Impact Preview:</span>
                            <div className="flex items-center justify-between text-emerald-400">
                              <span>+ HDFC Checking Account</span>
                              <span>+₹1,500.00 (refunded)</span>
                            </div>
                            <div className="flex items-center justify-between text-indigo-400">
                              <span>+ Groceries Envelope Available</span>
                              <span>+₹1,500.00 (restored)</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setS6Reverted(true)}
                            disabled={s6Reverted}
                            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 font-bold text-xs transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{s6Reverted ? 'Reversion Executed Cleanly' : 'Simulate Confirm Revert'}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                            <div>
                              <span className="font-semibold text-rose-200 block">Freelance Income Assigned to Dining</span>
                              <span className="text-[11px] text-neutral-400">Assigned: ₹3,000 &bull; Unspent remaining: ₹200</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-400">+₹3,000.00</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                            ⚠️ <strong>Reversion Safely Blocked:</strong> ₹2,800 of the assigned funds were already spent! Reverting this income would force the Dining envelope into negative (-₹2,800). Envello rejects this transaction to protect ledger truth.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* -------------------------------------------------------------
                      SANDBOX 7: PRIVACY, BACKUPS & ACCOUNT DELETION
                      ------------------------------------------------------------- */}
                  {currentStepIndex === 6 && (
                    <div className="space-y-4 animate-fade-in text-xs">
                      {/* Data Export Test */}
                      <div className="p-3.5 rounded-xl bg-neutral-900 border border-sky-500/20 space-y-2">
                        <span className="font-semibold text-white block">Offline Data Portability:</span>
                        <p className="text-neutral-400 text-[11px]">
                          Test exporting your complete sovereign data archive in standard machine-readable formats:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadSampleExport('json')}
                            className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-medium border border-sky-500/30 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download JSON Archive</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadSampleExport('csv')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium border border-emerald-500/30 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download CSV Spreadsheets</span>
                          </button>
                        </div>
                      </div>

                      {/* 30-Day Deletion Grace Simulator */}
                      <div className="p-3.5 rounded-xl bg-neutral-900 border border-amber-500/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">30-Day Account Deletion Protection</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            GDPR / CCPA Safe
                          </span>
                        </div>

                        {s7DeletionSimulated ? (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-amber-200 font-semibold">Account Pending Deletion</span>
                              <span className="text-[10px] font-mono text-amber-300 font-bold">29 days remaining</span>
                            </div>
                            <p className="text-[11px] text-amber-300/80 leading-relaxed">
                              Your records remain frozen. If you change your mind during this window, you can restore everything with a single click:
                            </p>
                            <button
                              type="button"
                              onClick={() => setS7DeletionSimulated(false)}
                              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs active:scale-95 transition cursor-pointer shadow-sm"
                            >
                              Keep My Account (1-Click Restore)
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setS7DeletionSimulated(true)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-300 font-medium border border-rose-500/20 active:scale-95 transition cursor-pointer"
                          >
                            Simulate Requesting Account Deletion
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              MODAL FOOTER (Zero Horizontal Scroll, Wrapping Controls, 44px min touch)
              ========================================================================= */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 border-t border-white/10 bg-neutral-900/60 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Don't show again toggle */}
            <label className="flex items-center space-x-2 text-xs text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgainCheck}
                onChange={(e) => setDontShowAgainCheck(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-800 border-white/10 text-sky-500 focus:ring-sky-500"
              />
              <span>Don&apos;t show automatically on launch</span>
            </label>

            {/* Navigation Actions (Previous, Skip, Next) */}
            <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3.5 py-2 min-h-[44px] rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition active:scale-95 cursor-pointer"
              >
                Skip Tutorial
              </button>

              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-white/10 transition active:scale-95 flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 text-xs sm:text-sm font-bold shadow-md shadow-sky-500/25 active:scale-95 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>{isLastStep ? 'Complete & Start Budgeting' : 'Next Step'}</span>
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
                {isLastStep && <CheckCircle2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
