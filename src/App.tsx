import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Mail,
  PiggyBank,
  CreditCard,
  CalendarClock,
  Target,
  Landmark,
  Download,
  Scale,
  Plus,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import { getCreditCardUtilizationStatus } from '@/lib/accounting/calculations';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { useAccounts } from '@/hooks/useAccounts';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useFixedDeposits } from '@/hooks/useFixedDeposits';
import { useSelfEmis } from '@/hooks/useSelfEmis';
import { useActualDebts } from '@/hooks/useActualDebts';
import { useMonthlyTargets } from '@/hooks/useMonthlyTargets';
import { Header } from '@/components/common/Header';
import { AuthModal } from '@/components/auth/AuthModal';
import { CoverPage } from '@/components/landing/CoverPage';
import { EnvelopeGrid } from '@/components/envelopes/EnvelopeGrid';
import { RecordTransactionModal } from '@/components/transactions/RecordTransactionModal';
import { AccountListModal } from '@/components/accounts/AccountListModal';
import { ReconcileModal } from '@/components/accounts/ReconcileModal';
import { RecurringAlertBanner } from '@/components/recurring/RecurringAlertBanner';
import { RecurringRulesModal } from '@/components/recurring/RecurringRulesModal';
import { useRecurringRules } from '@/hooks/useRecurringRules';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { LiabilitiesAndAssetsContainer } from '@/components/cards-and-debts/LiabilitiesAndAssetsContainer';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { ExportDataModal } from '@/components/export/ExportDataModal';
import { SetPasswordModal } from '@/components/auth/SetPasswordModal';
import { SetNameModal } from '@/components/auth/SetNameModal';
import { ChangeEmailModal } from '@/components/auth/ChangeEmailModal';
import { AccountDeletionModal } from '@/components/auth/AccountDeletionModal';
import { LegalModal, LegalTab } from '@/components/legal/LegalModal';

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
  } = useAuth();
  const { showToast } = useToast();
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
  const [isCancelingDeletion, setIsCancelingDeletion] = useState(false);

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
    totalSpendableCashPaise,
    addAccount,
    editAccount,
    removeAccount,
    refreshAccounts,
  } = useAccounts();

  const {
    envelopes,
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
    currentYearMonth,
    addRule: addRecurringRule,
    toggleRuleActive: toggleRecurringRuleActive,
    removeRule: removeRecurringRule,
    logSingleRule: logSingleRecurringRule,
    logAllDueRules: logAllDueRecurringRules,
    refreshRules: refreshRecurringRules,
  } = useRecurringRules();

  // Authoritative pillars driven dynamically from live Supabase data
  const effectiveSpendableCashPaise = totalSpendableCashPaise;
  const effectiveEnvelopeAllocationsPaise = totalAllocatedPaise;
  const effectiveSavingsAndFDsPaise = totalPrincipalPaise;
  const effectiveCreditCardLiabilitiesPaise = totalCardOutstandingPaise;
  const effectiveActualDebtsPaise = totalRemainingDebtPaise;
  const effectiveMonthlyTargetsPaise = totalTargetAmountPaise;

  // Credit card utilization calculation
  const effectiveCardUtilization = overallUtilizationPercent;
  const effectiveCardStatus = getCreditCardUtilizationStatus(effectiveCardUtilization);

  const handleTransactionRecorded = async () => {
    await Promise.all([
      refreshAccounts(),
      refreshEnvelopes(),
      refreshTransactions(),
      refreshCards(),
      refreshFDs(),
      refreshSelfEmis(),
      refreshDebts(),
      refreshTargets(),
      refreshRecurringRules(),
    ]);
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col w-full max-w-full overflow-x-hidden relative">
      {/* Top Application Header */}
      <Header
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onRecordTransactionClick={() => setIsRecordTxModalOpen(true)}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 pb-24 sm:pb-8 min-w-0 max-w-full overflow-x-hidden">
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
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none flex-nowrap pb-1.5 sm:pb-0 w-full sm:w-auto">
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition flex-shrink-0 whitespace-nowrap active:scale-95 shadow-sm"
                    title="Export Data"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => {
                      setReconcileAccountId(undefined);
                      setIsReconcileModalOpen(true);
                    }}
                    className="px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition flex-shrink-0 whitespace-nowrap active:scale-95 shadow-sm"
                    title="Reconcile Account Balance against Bank Statement"
                  >
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Reconcile</span>
                  </button>
                  <button
                    onClick={() => setIsRecurringModalOpen(true)}
                    className="px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition relative flex-shrink-0 whitespace-nowrap active:scale-95 shadow-sm"
                    title="Standing Recurring Schedules"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Recurring</span>
                    {dueRecurringRules.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse absolute -top-0.5 -right-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsAccountsModalOpen(true)}
                    className="px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs sm:text-sm text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition flex-shrink-0 whitespace-nowrap active:scale-95 shadow-sm"
                  >
                    <Landmark className="w-3.5 h-3.5 text-sky-400" />
                    <span>{accounts.length} Accounts</span>
                  </button>
                </div>
              </div>

              {/* The 6 Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Spendable Cash */}
                <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      1. Spendable Cash
                    </span>
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-sky-400 tabular-nums truncate">
                      {formatINR(effectiveSpendableCashPaise)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">Liquid Bank Accounts & Cash</div>
                  </div>
                </div>

                {/* 2. Envelope Allocations */}
                <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      2. Envelope Allocations
                    </span>
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Mail className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-indigo-300 tabular-nums truncate">
                      {formatINR(effectiveEnvelopeAllocationsPaise)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">Allocated for Current Month Spending</div>
                  </div>
                </div>

                {/* 3. Savings & Fixed Deposits */}
                <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      3. Savings & FDs
                    </span>
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-amber-300 tabular-nums truncate">
                      {formatINR(effectiveSavingsAndFDsPaise)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">Fixed Deposits & Term Reserves</div>
                  </div>
                </div>

                {/* 4. Credit Card Liabilities */}
                <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      4. Card Liabilities
                    </span>
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-purple-400 tabular-nums truncate">
                      {formatINR(effectiveCreditCardLiabilitiesPaise)}
                    </div>
                    <div className="flex items-center space-x-2 text-xs mt-1">
                      <span className="text-neutral-400">Utilization:</span>
                      <span
                        className={`font-semibold font-mono ${
                          effectiveCardStatus === 'safe'
                            ? 'text-emerald-400'
                            : effectiveCardStatus === 'warning'
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {effectiveCardUtilization.toFixed(1)}% ({effectiveCardStatus === 'safe' ? '<30% Safe' : effectiveCardStatus === 'warning' ? '30-50% Warning' : 'Danger >50%'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Actual Debts */}
                <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      5. Actual Debts
                    </span>
                    <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                      <CalendarClock className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-orange-400 tabular-nums truncate">
                      {formatINR(effectiveActualDebtsPaise)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">External Loans & Debts Owed</div>
                  </div>
                </div>

                {/* 6. Monthly Targets */}
                <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                      6. Monthly Targets
                    </span>
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Target className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl xs:text-2xl font-bold font-mono tracking-tight text-cyan-300 tabular-nums truncate">
                      {formatINR(effectiveMonthlyTargetsPaise)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">Planned Goals (Not Yet Deducted)</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Analytics & Interactive Visual Insights */}
            <AnalyticsDashboard
              transactions={transactions}
              envelopes={envelopes}
              spendableCashPaise={effectiveSpendableCashPaise}
              savingsAndFDsPaise={effectiveSavingsAndFDsPaise}
              creditCardLiabilitiesPaise={effectiveCreditCardLiabilitiesPaise}
              actualDebtsPaise={effectiveActualDebtsPaise}
              onOpenExportModal={() => setIsExportModalOpen(true)}
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
              onOpenManageModal={() => setIsRecurringModalOpen(true)}
            />

            {/* Section: Envelope Budgeting */}
            <EnvelopeGrid />

            {/* Section: Liabilities, Locked Assets & Goals */}
            <LiabilitiesAndAssetsContainer
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
              totalSelfEmiRemainingPaise={totalSelfEmiRemainingPaise}
              isEmisLoading={isEmisLoading}
              onAddEmi={async (params) => {
                await addEmi(params);
                showToast('Self EMI schedule created', 'success');
              }}
              onPayEmi={async (params) => {
                await payEmi(params);
                await handleTransactionRecorded();
                showToast('Self EMI installment paid', 'success');
              }}
              onUpdateEmi={async (emiId, updates) => {
                await editEmi(emiId, updates);
                showToast('Self EMI updated', 'success');
              }}
              onDeleteEmi={async (emiId) => {
                await removeEmi(emiId);
                showToast('Self EMI removed', 'info');
              }}

              actualDebts={actualDebts}
              totalActualDebtRemainingPaise={totalRemainingDebtPaise}
              isDebtsLoading={isDebtsLoading}
              onAddDebt={async (params) => {
                await addDebt(params);
                showToast('Debt liability created', 'success');
              }}
              onPayDebt={async (params) => {
                await payDebt(params);
                await handleTransactionRecorded();
                showToast('Debt payment recorded', 'success');
              }}
              onUpdateDebt={async (debtId, updates) => {
                await editDebt(debtId, updates);
                showToast('Debt details updated', 'success');
              }}
              onDeleteDebt={async (debtId) => {
                await removeDebt(debtId);
                showToast('Debt record removed', 'info');
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
        envelopes={envelopes}
        onClose={() => setIsRecordTxModalOpen(false)}
        onRecordExpense={async (params) => {
          await addExpense(params);
          await handleTransactionRecorded();
          showToast('Expense recorded successfully', 'success');
        }}
        onRecordIncome={async (params) => {
          await addIncome(params);
          await handleTransactionRecorded();
          showToast('Income added to account', 'success');
        }}
        onRecordTransfer={async (params) => {
          await addTransfer(params);
          await handleTransactionRecorded();
          showToast('Account transfer recorded', 'success');
        }}
      />

      {/* Accounts Management Modal */}
      <AccountListModal
        isOpen={isAccountsModalOpen}
        accounts={accounts}
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

      {/* Mobile Floating Action Button (FAB) */}
      {user && (
        <button
          onClick={() => setIsRecordTxModalOpen(true)}
          className="fixed bottom-5 right-5 safe-bottom-fab sm:hidden z-40 p-4 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-neutral-950 font-bold shadow-2xl shadow-sky-500/50 active:scale-90 transition-all duration-200 flex items-center justify-center border border-white/20 touch-manipulation"
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
