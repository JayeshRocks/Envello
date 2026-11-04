import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Mail,
  CreditCard,
  CalendarClock,

  Landmark,
  Plus,
  AlertTriangle,
  RotateCcw,
  HandCoins,
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import { getCreditCardUtilizationStatus } from '@/lib/accounting/calculations';
import { useAuth } from '@/hooks/useAuth';
import { useDevice } from '@/hooks/useDevice';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useFixedDeposits } from '@/hooks/useFixedDeposits';
import { useSelfEmis } from '@/hooks/useSelfEmis';
import { useActualDebts } from '@/hooks/useActualDebts';
import { useDebtsLoans } from '@/hooks/useDebtsLoans';
import { useMonthlyTargets } from '@/hooks/useMonthlyTargets';
import { Header } from '@/components/common/Header';
import { SpotlightCard } from '@/components/common/SpotlightCard';
import { AuthModal } from '@/components/auth/AuthModal';
import { CoverPage } from '@/components/landing/CoverPage';
import { EnvelopeGrid } from '@/components/envelopes/EnvelopeGrid';
import { RecordTransactionModal } from '@/components/transactions/RecordTransactionModal';
import { AccountListModal } from '@/components/accounts/AccountListModal';
import { ReconcileModal } from '@/components/accounts/ReconcileModal';
import { RecurringAlertBanner } from '@/components/recurring/RecurringAlertBanner';
import { RecurringRulesModal } from '@/components/recurring/RecurringRulesModal';
import { useRecurringRules } from '@/hooks/useRecurringRules';
import { calculateNormalizedMonthlyCostPaise } from '@/lib/accounting/recurringSchedule';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { LiabilitiesAndAssetsContainer, type SubTabType } from '@/components/cards-and-debts/LiabilitiesAndAssetsContainer';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Skeleton } from '@/components/common/Skeleton';
import { ExportDataModal } from '@/components/export/ExportDataModal';
import { SetPasswordModal } from '@/components/auth/SetPasswordModal';
import { SetNameModal } from '@/components/auth/SetNameModal';
import { ChangeEmailModal } from '@/components/auth/ChangeEmailModal';
import { AccountDeletionModal } from '@/components/auth/AccountDeletionModal';
import { LegalModal, LegalTab } from '@/components/legal/LegalModal';
import { SpotlightTour } from '@/components/tutorial/SpotlightTour';
import { EnvelopePaymentReceiptModal } from '@/components/transactions/EnvelopePaymentReceiptModal';
import type { GreedyDeductionPlan } from '@/lib/accounting/greedyDeduction';
import {
  isEmailConfirmationUrl,
  broadcastAuthEvent,
  subscribeAuthEvents,
  clearAuthUrlHash,
} from '@/lib/authSync';
import { EmailConfirmationScreen } from '@/components/auth/EmailConfirmationScreen';

export const App: React.FC = () => {
  const {
    user,
    isLoading: isAuthLoading,
    isPasswordRecovery,
    needsPasswordSetup,
    needsNameSetup,
    deletionStatus,
    scheduledDeletionAt,
    cancelAccountDeletion,
    hasCompletedTutorial,
    completeTutorial,
  } = useAuth();
  const { showToast } = useToast();
  const { isMobileOrTablet, isLandscape } = useDevice();
  const [isEmailConfirmedLanding, setIsEmailConfirmedLanding] = useState(() => isEmailConfirmationUrl());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRecordTxModalOpen, setIsRecordTxModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState<string | undefined>(undefined);
  const [isSetNameModalOpen, setIsSetNameModalOpen] = useState(false);
  const [isFirstTimeNameModal, setIsFirstTimeNameModal] = useState(false);
  const [isChangeEmailModalOpen, setIsChangeEmailModalOpen] = useState(false);
  const [isSetPasswordModalOpen, setIsSetPasswordModalOpen] = useState(false);
  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('privacy');
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isCancelingDeletion, setIsCancelingDeletion] = useState(false);
  const [liabilitiesActiveTab, setLiabilitiesActiveTab] = useState<SubTabType>('cards');
  const [receiptModalData, setReceiptModalData] = useState<{
    transactionId: string;
    payee: string;
    totalAmountPaise: bigint;
    envelopeName: string;
    deductionPlan?: GreedyDeductionPlan;
  } | null>(null);

  // Guided on-screen tour: ONLY for first-time users inside their workspace
  // Once completed or skipped, it is saved to localStorage, Supabase auth metadata, and PostgreSQL profiles
  // so it is permanently synchronized and NEVER shown again across all devices (mobile, tablet, desktop).
  useEffect(() => {
    if (!user || isEmailConfirmedLanding) return;

    let isCompletedLocally = false;
    try {
      isCompletedLocally = localStorage.getItem('envello_tour_completed') === 'true';
    } catch {
      // Ignore private mode restrictions
    }

    const isCompletedInMetadata = user.user_metadata?.tutorial_completed === true;

    if (hasCompletedTutorial || isCompletedLocally || isCompletedInMetadata) {
      if (!isCompletedLocally) {
        try {
          localStorage.setItem('envello_tour_completed', 'true');
        } catch {
          // Ignore
        }
      }
      // If completed locally on this browser but missing from database/metadata, sync to backend
      if (isCompletedLocally && !isCompletedInMetadata && !hasCompletedTutorial) {
        completeTutorial().catch(() => {});
      }
      return;
    }

    const timer = setTimeout(() => {
      setIsTourOpen(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [user, isEmailConfirmedLanding, hasCompletedTutorial, completeTutorial]);

  const handleTourComplete = async () => {
    setIsTourOpen(false);
    await completeTutorial();
  };

  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleQuickCancelDeletion = async () => {
    setIsCancelingDeletion(true);
    const { error } = await cancelAccountDeletion();
    setIsCancelingDeletion(false);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Account restored! Scheduled deletion has been cancelled.', 'success');
    }
  };

  // Handle external URL path and hash navigation for compliance (/privacy, /terms, #privacy, #terms)
  useEffect(() => {
    const handleRouteCheck = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path === '/privacy' || path.startsWith('/privacy') || hash === '#privacy') {
        setLegalModalTab('privacy');
        setIsLegalModalOpen(true);
      } else if (path === '/terms' || path.startsWith('/terms') || hash === '#terms') {
        setLegalModalTab('terms');
        setIsLegalModalOpen(true);
      } else if (path === '/legal' || path.startsWith('/legal') || hash === '#legal') {
        setIsLegalModalOpen(true);
      }
    };

    handleRouteCheck();
    window.addEventListener('hashchange', handleRouteCheck);
    window.addEventListener('popstate', handleRouteCheck);
    return () => {
      window.removeEventListener('hashchange', handleRouteCheck);
      window.removeEventListener('popstate', handleRouteCheck);
    };
  }, []);

  const hasBroadcastedConfirmationRef = React.useRef(false);
  const hasShownConfirmationToastRef = React.useRef(false);

  // Broadcast email verification when landing on the confirmation callback URL (ONCE only)
  useEffect(() => {
    if (isEmailConfirmedLanding && !hasBroadcastedConfirmationRef.current) {
      hasBroadcastedConfirmationRef.current = true;
      broadcastAuthEvent('EMAIL_CONFIRMED', user?.email || undefined);
    }
  }, [isEmailConfirmedLanding, user]);

  // Listen for cross-tab auth confirmation events (ONCE only)
  useEffect(() => {
    const unsubscribe = subscribeAuthEvents((event) => {
      if (event.type === 'EMAIL_CONFIRMED' && !hasShownConfirmationToastRef.current) {
        hasShownConfirmationToastRef.current = true;
        setIsAuthModalOpen(false);
        showToast('Email verified successfully! Welcome to Envello.', 'success');
      }
    });

    return unsubscribe;
  }, [showToast]);

  // Auto-open auth modal if user arrives from a password recovery email
  useEffect(() => {
    if (isPasswordRecovery) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery]);

  // Onboarding Sequence Step 1: "What should we call you?" prompt
  useEffect(() => {
    if (user && needsNameSetup) {
      const dismissed = localStorage.getItem(`envello_dismissed_name_prompt_${user.id}`);
      if (!dismissed) {
        setIsSetNameModalOpen(true);
        setIsFirstTimeNameModal(true);
      }
    }
  }, [user, needsNameSetup]);

  // Onboarding Sequence Step 2: "Create Account Password" prompt for magic link users
  // (Only open after name prompt is completed or dismissed)
  useEffect(() => {
    if (user && needsPasswordSetup && !isSetNameModalOpen) {
      const dismissed = localStorage.getItem(`envello_dismissed_password_prompt_${user.id}`);
      if (!dismissed) {
        setIsSetPasswordModalOpen(true);
      }
    }
  }, [user, needsPasswordSetup, isSetNameModalOpen]);

  // Live hooks
  const {
    accounts,
    isLoading: isAccountsLoading,
    totalLiquidFundsPaise,
    totalUnallocatedPaise,
    addAccount,
    editAccount,
    removeAccount,
    refreshAccounts,
  } = useAccounts();

  const {
    envelopes,
    isLoading: isEnvelopesLoading,
    totalAllocatedPaise,
    refresh: refreshEnvelopes,
  } = useEnvelopes();

  const {
    transactions,
    isLoading: isTxLoading,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    addExpense,
    addIncome,
    addTransfer,
    removeTransaction,
    refreshTransactions,
  } = useTransactions();

  const {
    cards,
    totalOutstandingPaise: totalCardOutstandingPaise,
    totalCreditLimitPaise,
    overallUtilizationPercent,
    isLoading: isCardsLoading,
    addCard,
    payCard,
    updateCard,
    removeCard,
    refreshCards,
  } = useCreditCards();

  const {
    fixedDeposits,
    totalPrincipalPaise,
    totalMaturityPaise,
    isLoading: isFdsLoading,
    addFD,
    liquidateFD,
    refreshFDs,
  } = useFixedDeposits();

  const {
    selfEmis,
    totalRemainingPaise: totalSelfEmiRemainingPaise,
    isLoading: isEmisLoading,
    addEmi,
    payEmi,
    editEmi,
    removeEmi,
    refreshSelfEmis,
  } = useSelfEmis();

  const {
    actualDebts,
    totalRemainingDebtPaise,
    isLoading: isDebtsLoading,
    addDebt,
    payDebt,
    editDebt,
    removeDebt,
    refreshDebts,
  } = useActualDebts();

  const {
    debtsLoans,
    totalBorrowedPaise: totalDebtLoanBorrowedPaise,
    totalRemainingBalancePaise: totalDebtLoanRemainingPaise,
    totalRepaidPaise: totalDebtLoanRepaidPaise,
    isLoading: isDebtsLoansLoading,
    addDebtLoan,
    payDebtLoan,
    updateDebtLoan,
    deleteDebtLoan,
    refreshDebtsLoans,
  } = useDebtsLoans();

  const {
    targets,
    totalTargetAmountPaise,
    totalContributedPaise,
    isLoading: isTargetsLoading,
    addTarget,
    contributeToTarget,
    removeTarget,
    refreshTargets,
  } = useMonthlyTargets();

  const {
    rules: recurringRules,
    dueRules: dueRecurringRules,
    totalDuePaise: totalRecurringDuePaise,
    isLoading: isRecurringLoading,
    currentYearMonth,
    addRule: addRecurringRule,
    toggleRuleActive: toggleRecurringRuleActive,
    removeRule: removeRecurringRule,
    logSingleRule: logSingleRecurringRule,
    logAllDueRules: logAllDueRecurringRules,
    refreshRules: refreshRecurringRules,
  } = useRecurringRules();

  // Authoritative pillars driven dynamically from live Supabase data
  const effectiveLiquidFundsPaise = totalLiquidFundsPaise;
  const effectiveEnvelopeAllocationsPaise = totalAllocatedPaise;
  const effectiveSavingsAndFDsPaise = totalPrincipalPaise;
  const effectiveCreditCardLiabilitiesPaise = totalCardOutstandingPaise;
  const effectiveActualDebtsPaise = totalRemainingDebtPaise + totalDebtLoanRemainingPaise;

  const totalMonthlyRecurringPaise = React.useMemo(() => {
    return calculateNormalizedMonthlyCostPaise(recurringRules);
  }, [recurringRules]);
  const effectiveStandingMonthlyCostsPaise = totalMonthlyRecurringPaise;

  // Credit card utilization calculation
  const effectiveCardUtilization = overallUtilizationPercent;
  const effectiveCardStatus = getCreditCardUtilizationStatus(effectiveCardUtilization);

  const handleTransactionRecorded = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? true;
    // Fast path: high-frequency financial entities refreshed first in parallel
    await Promise.all([
      refreshAccounts(isSilent),
      refreshEnvelopes(isSilent),
      refreshTransactions(isSilent),
      refreshCards(),
    ]);

    // Secondary items refreshed in background without blocking UI interactivity
    Promise.all([
      refreshFDs(),
      refreshSelfEmis(),
      refreshDebts(),
      refreshDebtsLoans(),
      refreshTargets(),
      refreshRecurringRules(),
    ]).catch(() => {});
  };

  // Keyboard shortcut listener (Escape to close, 'T' to record transaction)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAuthModalOpen(false);
        setIsRecordTxModalOpen(false);
        setIsAccountsModalOpen(false);
        setIsExportModalOpen(false);
        setIsReconcileModalOpen(false);
        setIsRecurringModalOpen(false);
      }
      if (
        (e.key === 't' || e.key === 'T') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        if (user) {
          e.preventDefault();
          setIsRecordTxModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user]);

  // 1. Loading session state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 animate-pulse">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div className="text-sm font-medium text-neutral-400 flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>Initializing secure session...</span>
        </div>
      </div>
    );
  }

  // 2. Dedicated Email Confirmation Landing View
  if (isEmailConfirmedLanding) {
    return (
      <EmailConfirmationScreen
        userEmail={user?.email}
        onContinue={() => {
          clearAuthUrlHash();
          setIsEmailConfirmedLanding(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col w-full max-w-full overflow-x-hidden relative">
      {/* Top Application Header */}
      <Header
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onRecordTransactionClick={() => setIsRecordTxModalOpen(true)}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenSetNameModal={() => {
          setIsFirstTimeNameModal(false);
          setIsSetNameModalOpen(true);
        }}
        onOpenChangeEmailModal={() => setIsChangeEmailModalOpen(true)}
        onOpenSetPasswordModal={() => setIsSetPasswordModalOpen(true)}
        onOpenDeletionModal={() => setIsDeletionModalOpen(true)}
        onOpenPrivacy={() => {
          setLegalModalTab('privacy');
          setIsLegalModalOpen(true);
        }}
        onOpenTerms={() => {
          setLegalModalTab('terms');
          setIsLegalModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden ${isMobileOrTablet ? 'pb-28 sm:pb-28' : 'pb-8'
          }`}
      >
        {!user ? (
          <CoverPage
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenPrivacy={() => {
              setLegalModalTab('privacy');
              setIsLegalModalOpen(true);
            }}
            onOpenTerms={() => {
              setLegalModalTab('terms');
              setIsLegalModalOpen(true);
            }}
          />
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Account Pending Deletion Grace Period Banner */}
            {deletionStatus === 'pending_deletion' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-amber-950/20 animate-fade-in">
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5 md:mt-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-semibold text-amber-200">
                        Account Scheduled for Deletion
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                        {scheduledDeletionAt
                          ? `${Math.max(0, Math.ceil((new Date(scheduledDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left`
                          : '30-day grace period'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-300/80 mt-1 max-w-2xl leading-relaxed">
                      Your account is in a 30-day grace period. On{' '}
                      <span className="font-semibold text-amber-200">
                        {scheduledDeletionAt
                          ? new Date(scheduledDeletionAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                          : 'the scheduled date'}
                      </span>
                      , all financial ledgers, envelopes, debts, and your profile will be permanently and irreversibly purged.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-amber-500/20">
                  <button
                    onClick={handleQuickCancelDeletion}
                    disabled={isCancelingDeletion}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isCancelingDeletion ? 'Restoring...' : 'Keep My Account'}</span>
                  </button>
                  <button
                    onClick={() => setIsDeletionModalOpen(true)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-amber-200/90 border border-amber-500/20 text-xs font-medium transition active:scale-95"
                  >
                    Manage
                  </button>
                </div>
              </div>
            )}

            {/* Section: The Six Financial Pillars */}
            <section id="financial-pillars" className="space-y-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white">Financial Pillars</h2>
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Deterministic Math
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Explicit balance taxonomy. Liquid cash is never conflated with credit limits or locked savings.
                </p>
              </div>

              {/* The 6 Pillars Grid (Cult UI Cursor-Tracking Spotlight Cards) */}
              <div id="pillars-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 scroll-mt-24">
                {/* 1. Liquid Funds */}
                <SpotlightCard
                  as="button"
                  onClick={() => setIsAccountsModalOpen(true)}
                  spotlightColor="rgba(56, 189, 248, 0.18)"
                  className="space-y-3 relative overflow-hidden group cursor-pointer"
                  title="Manage Liquid Accounts & Cash"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider group-hover:text-sky-300 transition-colors">
                      1. Liquid Funds
                    </span>
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:bg-sky-500/20 group-hover:scale-105 transition-all">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    {isAccountsLoading ? (
                      <div className="space-y-1.5 py-1">
                        <Skeleton className="h-7 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-28 rounded-md" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-sky-400 tabular-nums truncate animate-fade-in">
                          {formatINR(effectiveLiquidFundsPaise)}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                          <span className="text-[11px] font-mono text-emerald-400/90 font-medium">
                            Free: {formatINR(totalUnallocatedPaise)}
                          </span>
                          <span className="text-[10px] text-sky-400/80 group-hover:text-sky-300 font-medium transition-colors">Manage &rarr;</span>
                        </div>
                      </>
                    )}
                  </div>
                </SpotlightCard>

                {/* 2. Envelope Allocations */}
                <SpotlightCard
                  as="button"
                  onClick={() => scrollToSection('envelope-budgeting')}
                  spotlightColor="rgba(129, 140, 248, 0.18)"
                  className="space-y-3 relative overflow-hidden group cursor-pointer"
                  title="Scroll to Envelope Budgeting"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider group-hover:text-indigo-300 transition-colors">
                      2. Envelope Allocations
                    </span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all">
                      <Mail className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    {isEnvelopesLoading ? (
                      <div className="space-y-1.5 py-1">
                        <Skeleton className="h-7 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-44 rounded-md" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-indigo-300 tabular-nums truncate animate-fade-in">
                          {formatINR(effectiveEnvelopeAllocationsPaise)}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                          <span>Allocated for Current Month Spending</span>
                          <span className="text-[10px] text-indigo-400/80 group-hover:text-indigo-300 font-medium transition-colors">Manage &rarr;</span>
                        </div>
                      </>
                    )}
                  </div>
                </SpotlightCard>

                {/* 3. Savings & Fixed Deposits */}
                <SpotlightCard
                  as="button"
                  onClick={() => {
                    setLiabilitiesActiveTab('fds');
                    scrollToSection('liabilities-and-assets');
                  }}
                  spotlightColor="rgba(251, 191, 36, 0.18)"
                  className="space-y-3 relative overflow-hidden group cursor-pointer"
                  title="Scroll to FDs & RDs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                      3. FDs & RDs
                    </span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 group-hover:scale-105 transition-all">
                      <Landmark className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    {isFdsLoading ? (
                      <div className="space-y-1.5 py-1">
                        <Skeleton className="h-7 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-32 rounded-md" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-amber-300 tabular-nums truncate animate-fade-in">
                          {formatINR(effectiveSavingsAndFDsPaise)}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                          <span>Term Deposits & Growth</span>
                          <span className="text-[10px] text-amber-400/80 group-hover:text-amber-300 font-medium transition-colors">Manage &rarr;</span>
                        </div>
                      </>
                    )}
                  </div>
                </SpotlightCard>

                {/* 4. Credit Card Liabilities */}
                <SpotlightCard
                  as="button"
                  onClick={() => {
                    setLiabilitiesActiveTab('cards');
                    scrollToSection('liabilities-and-assets');
                  }}
                  spotlightColor="rgba(192, 132, 252, 0.18)"
                  className="space-y-3 relative overflow-hidden group cursor-pointer"
                  title="Scroll to Credit Cards"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider group-hover:text-purple-300 transition-colors">
                      4. Card Liabilities
                    </span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 group-hover:scale-105 transition-all">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    {isCardsLoading ? (
                      <div className="space-y-1.5 py-1">
                        <Skeleton className="h-7 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-40 rounded-md" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-purple-400 tabular-nums truncate animate-fade-in">
                          {formatINR(effectiveCreditCardLiabilitiesPaise)}
                        </div>
                        <div className="flex items-center space-x-2 text-xs mt-1">
                          <span className="text-neutral-400">Utilization:</span>
                          <span
                            className={`font-semibold font-mono ${effectiveCardStatus === 'safe'
                                ? 'text-emerald-400'
                                : effectiveCardStatus === 'warning'
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                          >
                            {(effectiveCreditCardLiabilitiesPaise > 0n && effectiveCardUtilization < 0.1
                              ? 0.1
                              : effectiveCardUtilization
                            ).toFixed(1)}
                            % ({effectiveCardStatus === 'safe' ? '<30% Safe' : effectiveCardStatus === 'warning' ? '30-50% Warning' : 'Danger >50%'})
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                          <span>Card balances & cycles</span>
                          <span className="text-[10px] text-purple-400/80 group-hover:text-purple-300 font-medium transition-colors">Manage &rarr;</span>
                        </div>
                      </>
                    )}
                  </div>
                </SpotlightCard>

                {/* 5. Debts & Loans */}
                <SpotlightCard
                  as="button"
                  onClick={() => {
                    setLiabilitiesActiveTab('debts');
                    scrollToSection('liabilities-and-assets');
                  }}
                  spotlightColor="rgba(251, 146, 60, 0.18)"
                  className="space-y-3 relative overflow-hidden group cursor-pointer"
                  title="Scroll to Debts & Loans"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider group-hover:text-orange-300 transition-colors">
                      5. Debts & Loans
                    </span>
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:bg-orange-500/20 group-hover:scale-105 transition-all">
                      <HandCoins className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    {isDebtsLoading ? (
                      <div className="space-y-1.5 py-1">
                        <Skeleton className="h-7 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-32 rounded-md" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-orange-400 tabular-nums truncate animate-fade-in">
                          {formatINR(totalDebtLoanRemainingPaise)}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                          <span>Personal & External Loans Owed</span>
                          <span className="text-[10px] text-orange-400/80 group-hover:text-orange-300 font-medium transition-colors">Manage &rarr;</span>
                        </div>
                      </>
                    )}
                  </div>
                </SpotlightCard>

                {/* 6. Standing Monthly Costs (Recurring Subscriptions & Bills) */}
                <SpotlightCard
                  as="button"
                  onClick={() => {
                    setLiabilitiesActiveTab('recurring');
                    scrollToSection('liabilities-and-assets');
                  }}
                  spotlightColor="rgba(16, 185, 129, 0.18)"
                  className="space-y-3 relative overflow-hidden group cursor-pointer"
                  title="Scroll to Standing Monthly Costs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
                      6. Standing Monthly Costs
                    </span>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    {isRecurringLoading ? (
                      <div className="space-y-1.5 py-1">
                        <Skeleton className="h-7 w-36 rounded-lg" />
                        <Skeleton className="h-4 w-36 rounded-md" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-emerald-300 tabular-nums truncate animate-fade-in">
                          {formatINR(effectiveStandingMonthlyCostsPaise)}
                          <span className="text-xs font-normal text-neutral-400 ml-1">/ mo</span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                          <span>
                            {dueRecurringRules.length > 0 ? (
                              <span className="text-amber-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                {dueRecurringRules.length} due ({formatINR(totalRecurringDuePaise)})
                              </span>
                            ) : (
                              `${recurringRules.filter((r) => r.isActive).length} active subscriptions & bills`
                            )}
                          </span>
                          <span className="text-[10px] text-emerald-400/80 group-hover:text-emerald-300 font-medium transition-colors">Manage &rarr;</span>
                        </div>
                      </>
                    )}
                  </div>
                </SpotlightCard>
              </div>
            </section>

            {/* Section: Analytics & Interactive Visual Insights */}
            <AnalyticsDashboard
              isLoading={isAccountsLoading || isTxLoading || isCardsLoading || isFdsLoading || isDebtsLoading}
              transactions={transactions}
              envelopes={envelopes}
              spendableCashPaise={effectiveLiquidFundsPaise}
              savingsAndFDsPaise={effectiveSavingsAndFDsPaise}
              creditCardLiabilitiesPaise={effectiveCreditCardLiabilitiesPaise}
              actualDebtsPaise={effectiveActualDebtsPaise}
            />

            {/* Section: Recurring Alert Banner (when standing expenses are due) */}
            <RecurringAlertBanner
              dueRules={dueRecurringRules}
              totalDuePaise={totalRecurringDuePaise}
              onLogAll={async () => {
                const count = await logAllDueRecurringRules(async (params) => {
                  await addExpense(params);
                });
                await handleTransactionRecorded();
                showToast(`Logged ${count} recurring expenses into ledger`, 'success');
              }}
              onOpenManageModal={() => {
                setLiabilitiesActiveTab('recurring');
                scrollToSection('liabilities-and-assets');
              }}
            />

            {/* Section: Envelope Budgeting */}
            <EnvelopeGrid accounts={accounts} onRefreshAccounts={refreshAccounts} />

            {/* Section: Liabilities, Locked Assets & Goals */}
            <LiabilitiesAndAssetsContainer
              activeTab={liabilitiesActiveTab}
              onTabChange={setLiabilitiesActiveTab}
              recurringRules={recurringRules}
              dueRecurringRules={dueRecurringRules}
              totalRecurringDuePaise={totalRecurringDuePaise}
              totalMonthlyRecurringPaise={totalMonthlyRecurringPaise}
              currentYearMonth={currentYearMonth}
              envelopes={envelopes}
              onAddRecurringRule={async (params) => {
                await addRecurringRule(params);
                showToast('Standing recurring rule added', 'success');
              }}
              onToggleRecurringRuleActive={async (ruleId) => {
                await toggleRecurringRuleActive(ruleId);
                showToast('Rule status updated', 'info');
              }}
              onDeleteRecurringRule={async (ruleId) => {
                await removeRecurringRule(ruleId);
                showToast('Standing rule deleted', 'info');
              }}
              onLogSingleRecurringRule={async (rule) => {
                await logSingleRecurringRule(rule, async (params) => {
                  await addExpense(params);
                });
                await handleTransactionRecorded();
                showToast(`Recorded ${rule.title} into ledger`, 'success');
              }}
              onLogAllDueRecurringRules={async () => {
                const count = await logAllDueRecurringRules(async (params) => {
                  await addExpense(params);
                });
                await handleTransactionRecorded();
                showToast(`Logged ${count} recurring expenses into ledger`, 'success');
              }}
              cards={cards}
              totalCardOutstandingPaise={totalCardOutstandingPaise}
              totalCardLimitPaise={totalCreditLimitPaise}
              cardUtilizationPercent={overallUtilizationPercent}
              isCardsLoading={isCardsLoading}
              onAddCard={async (data) => {
                await addCard(data);
              }}
              onPayCard={async (params) => {
                await payCard(params);
                await handleTransactionRecorded();
                showToast('Credit card bill payment recorded', 'success');
              }}
              onUpdateCard={async (cardId, updates) => {
                await updateCard(cardId, updates);
                showToast('Credit card details updated', 'success');
              }}
              onDeleteCard={async (cardId) => {
                await removeCard(cardId);
                showToast('Credit card removed', 'info');
              }}

              fixedDeposits={fixedDeposits}
              totalFdPrincipalPaise={totalPrincipalPaise}
              totalFdMaturityPaise={totalMaturityPaise}
              isFdsLoading={isFdsLoading}
              onAddFD={async (params) => {
                await addFD(params);
                await handleTransactionRecorded();
                showToast('Fixed deposit registered', 'success');
              }}
              onLiquidateFD={async (params) => {
                await liquidateFD(params);
                await handleTransactionRecorded();
                showToast('Fixed deposit liquidated to account', 'success');
              }}

              selfEmis={selfEmis}
              externalEmis={actualDebts}
              totalSelfEmiRemainingPaise={totalSelfEmiRemainingPaise}
              totalExternalEmiRemainingPaise={totalRemainingDebtPaise}
              isEmisLoading={isEmisLoading || isDebtsLoading}
              onAddSelfEmi={async (params) => {
                await addEmi(params);
                showToast('Self EMI schedule created', 'success');
              }}
              onPaySelfEmi={async (params) => {
                await payEmi(params);
                await handleTransactionRecorded();
                showToast('Self EMI reimbursement recorded', 'success');
              }}
              onUpdateSelfEmi={async (emiId, updates) => {
                await editEmi(emiId, updates);
                showToast('Self EMI updated', 'success');
              }}
              onDeleteSelfEmi={async (emiId) => {
                await removeEmi(emiId);
                showToast('Self EMI removed', 'info');
              }}
              onAddExternalEmi={async (params) => {
                await addDebt(params);
                showToast('External EMI scheduled', 'success');
              }}
              onPayExternalEmi={async (params) => {
                await payDebt(params);
                await handleTransactionRecorded();
                showToast('External EMI payment recorded', 'success');
              }}
              onUpdateExternalEmi={async (debtId, updates) => {
                await editDebt(debtId, updates);
                showToast('External EMI details updated', 'success');
              }}
              onDeleteExternalEmi={async (debtId) => {
                await removeDebt(debtId);
                showToast('External EMI removed', 'info');
              }}

              debtsLoans={debtsLoans}
              totalDebtLoanRemainingPaise={totalDebtLoanRemainingPaise}
              totalDebtLoanBorrowedPaise={totalDebtLoanBorrowedPaise}
              totalDebtLoanRepaidPaise={totalDebtLoanRepaidPaise}
              isDebtsLoansLoading={isDebtsLoansLoading}
              onAddDebtLoan={async (params) => {
                await addDebtLoan(params);
                await handleTransactionRecorded();
                showToast('Debt / Loan recorded successfully', 'success');
              }}
              onPayDebtLoan={async (params) => {
                await payDebtLoan(params);
                await handleTransactionRecorded();
                showToast('Loan payment recorded into ledger', 'success');
              }}
              onUpdateDebtLoan={async (loanId, updates) => {
                await updateDebtLoan(loanId, updates);
                showToast('Debt / Loan details updated', 'success');
              }}
              onDeleteDebtLoan={async (loanId) => {
                await deleteDebtLoan(loanId);
                showToast('Debt / Loan record removed', 'info');
              }}

              targets={targets}
              totalTargetAmountPaise={totalTargetAmountPaise}
              totalContributedPaise={totalContributedPaise}
              isTargetsLoading={isTargetsLoading}
              onAddTarget={async (params) => {
                await addTarget(params);
                showToast('Savings target created', 'success');
              }}
              onContributeTarget={async (targetId, amount) => {
                await contributeToTarget(targetId, amount);
                showToast('Target contribution recorded', 'success');
              }}
              onRemoveTarget={async (targetId) => {
                await removeTarget(targetId);
                showToast('Savings target removed', 'info');
              }}

              accounts={accounts}
            />

            {/* Section: Transaction Ledger */}
            <TransactionTable
              transactions={transactions}
              envelopes={envelopes}
              accounts={accounts}
              isLoading={isTxLoading}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRecordTransactionClick={() => setIsRecordTxModalOpen(true)}
              onDeleteTransaction={async (txId) => {
                await removeTransaction(txId);
                await handleTransactionRecorded();
                showToast('Transaction reverted and removed', 'info');
              }}
            />
          </div>
        )}
      </main>

      {/* Record Transaction Modal */}
      <RecordTransactionModal
        isOpen={isRecordTxModalOpen}
        accounts={accounts}
        creditCards={cards}
        envelopes={envelopes}
        onClose={() => setIsRecordTxModalOpen(false)}
        onRecordExpense={async (params) => {
          const result = await addExpense(params);
          await handleTransactionRecorded();
          showToast('Expense recorded successfully', 'success');

          if (result?.deductionPlan && result.deductionPlan.deductions.length > 0) {
            const envName = envelopes.find((e) => e.id === params.envelopeId)?.name || 'Envelope';
            setReceiptModalData({
              transactionId: result.transactionId,
              payee: params.payee,
              totalAmountPaise: params.amountPaise,
              envelopeName: envName,
              deductionPlan: result.deductionPlan,
            });
          }
          return result;
        }}
        onRecordIncome={async (params) => {
          await addIncome(params);
          await handleTransactionRecorded();
          showToast(
            params.envelopeId ? 'Income deposited & added to envelope' : 'Income added to account',
            'success'
          );
        }}
        onRecordTransfer={async (params) => {
          await addTransfer(params);
          await handleTransactionRecorded();
          showToast('Account transfer recorded', 'success');
        }}
      />

      {/* Real-Life Settlement Receipt Modal */}
      {receiptModalData && (
        <EnvelopePaymentReceiptModal
          isOpen={Boolean(receiptModalData)}
          onClose={() => setReceiptModalData(null)}
          transactionId={receiptModalData.transactionId}
          payee={receiptModalData.payee}
          totalAmountPaise={receiptModalData.totalAmountPaise}
          envelopeName={receiptModalData.envelopeName}
          deductionPlan={receiptModalData.deductionPlan}
          onRevert={async (txId) => {
            await removeTransaction(txId);
            await handleTransactionRecorded();
            showToast('Transaction reverted and refunded to accounts', 'info');
          }}
        />
      )}

      {/* Accounts Management Modal */}
      <AccountListModal
        isOpen={isAccountsModalOpen}
        isLoading={isAccountsLoading}
        accounts={accounts}
        onRefreshAccounts={refreshAccounts}
        onClose={() => setIsAccountsModalOpen(false)}
        onAddAccount={async (params) => {
          await addAccount(params);
          showToast('Account created successfully', 'success');
        }}
        onEditAccount={async (accountId, params) => {
          await editAccount(accountId, params);
          showToast('Account updated successfully', 'success');
        }}
        onDeleteAccount={async (accountId) => {
          await removeAccount(accountId);
          showToast('Account deleted', 'info');
        }}
        onOpenReconcileModal={(accountId) => {
          setReconcileAccountId(accountId);
          setIsAccountsModalOpen(false);
          setIsReconcileModalOpen(true);
        }}
      />

      {/* Bank Statement Reconciliation Modal */}
      <ReconcileModal
        isOpen={isReconcileModalOpen}
        accounts={accounts}
        initialAccountId={reconcileAccountId}
        onClose={() => setIsReconcileModalOpen(false)}
        onReconciliationComplete={async () => {
          await handleTransactionRecorded();
          showToast('Account reconciliation logged and verified', 'success');
        }}
      />

      {/* Standing Recurring Schedules Modal */}
      <RecurringRulesModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        rules={recurringRules}
        accounts={accounts}
        creditCards={cards}
        envelopes={envelopes}
        currentYearMonth={currentYearMonth}
        onAddRule={async (params) => {
          await addRecurringRule(params);
          showToast('Standing recurring rule added', 'success');
        }}
        onToggleActive={async (ruleId) => {
          await toggleRecurringRuleActive(ruleId);
          showToast('Rule status updated', 'info');
        }}
        onDeleteRule={async (ruleId) => {
          await removeRecurringRule(ruleId);
          showToast('Standing rule deleted', 'info');
        }}
        onLogSingleRule={async (rule) => {
          await logSingleRecurringRule(rule, async (params) => {
            await addExpense(params);
          });
          await handleTransactionRecorded();
          showToast(`Recorded ${rule.title} into ledger`, 'success');
        }}
      />

      {/* Export Data Modal */}
      <ExportDataModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        accounts={accounts}
        envelopes={envelopes}
        transactions={transactions}
        creditCards={cards}
        fixedDeposits={fixedDeposits}
        actualDebts={actualDebts}
        debtsLoans={debtsLoans}
        monthlyTargets={targets}
        recurringRules={recurringRules}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenPrivacy={() => {
          setLegalModalTab('privacy');
          setIsLegalModalOpen(true);
        }}
        onOpenTerms={() => {
          setLegalModalTab('terms');
          setIsLegalModalOpen(true);
        }}
      />

      {/* Legal & Privacy Compliance Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        initialTab={legalModalTab}
        onClose={() => {
          setIsLegalModalOpen(false);
          if (window.location.hash || window.location.pathname !== '/') {
            history.replaceState(null, '', '/');
          }
        }}
      />

      {/* "What should we call you?" / Edit Name Modal */}
      <SetNameModal
        isOpen={isSetNameModalOpen}
        onClose={() => setIsSetNameModalOpen(false)}
        isFirstTime={isFirstTimeNameModal}
      />

      {/* Change Account Email Modal */}
      <ChangeEmailModal
        isOpen={isChangeEmailModalOpen}
        onClose={() => setIsChangeEmailModalOpen(false)}
      />

      {/* Set or Update Account Password Modal */}
      <SetPasswordModal
        isOpen={isSetPasswordModalOpen}
        onClose={() => setIsSetPasswordModalOpen(false)}
      />

      {/* Account Deletion & Data Retention Policy Modal */}
      <AccountDeletionModal
        isOpen={isDeletionModalOpen}
        onClose={() => setIsDeletionModalOpen(false)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Interactive Spotlight Onboarding Tour (First-time users only) */}
      <SpotlightTour
        isOpen={isTourOpen}
        onComplete={handleTourComplete}
        onOpenAccounts={() => setIsAccountsModalOpen(true)}
        onOpenRecordTransaction={() => setIsRecordTxModalOpen(true)}
        onSelectLiabilitiesTab={(tab) => setLiabilitiesActiveTab(tab)}
      />


      {/* Floating Action Button (FAB) for Mobile & Tablets (Unified Touch Surface for Vertical & Horizontal Orientations) */}
      {user && isMobileOrTablet && (
        <button
          id="mobile-record-fab"
          data-fab="record-transaction"
          onClick={() => setIsRecordTxModalOpen(true)}
          className={`fixed safe-bottom-fab z-40 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-neutral-950 font-bold shadow-2xl shadow-sky-500/50 active:scale-90 transition-all duration-200 flex items-center justify-center border border-white/20 touch-manipulation min-h-[56px] min-w-[56px] ${isLandscape
            ? 'bottom-5 right-6 sm:bottom-6 sm:right-8 p-4'
            : 'bottom-5 right-5 p-4'
            }`}
          title="Record Transaction"
          aria-label="Record Transaction"
        >
          <Plus className="w-6 h-6 text-white stroke-[2.5]" />
        </button>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 pb-8 sm:pb-4 safe-padding-bottom text-center text-xs text-neutral-500 space-y-1.5 w-full max-w-full overflow-hidden">
        <div>Envello Personal Finance Platform &bull; Deterministic Accounting Engine</div>
        <div className="flex items-center justify-center space-x-3 text-[11px] text-neutral-400">
          <button
            type="button"
            onClick={() => {
              setLegalModalTab('privacy');
              setIsLegalModalOpen(true);
            }}
            className="hover:text-neutral-300 transition underline decoration-white/20 hover:decoration-white"
          >
            Privacy Policy
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => {
              setLegalModalTab('terms');
              setIsLegalModalOpen(true);
            }}
            className="hover:text-neutral-300 transition underline decoration-white/20 hover:decoration-white"
          >
            Terms of Service
          </button>
          <span>&bull;</span>
          <span className="text-emerald-400/90 font-medium">RLS Protected</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
