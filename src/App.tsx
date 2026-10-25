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
import { AccessRestricted } from '@/components/auth/AccessRestricted';
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

export const App: React.FC = () => {
  const { user, isAllowlisted, isLoading: isAuthLoading, isPasswordRecovery, needsPasswordSetup } = useAuth();
  const { showToast } = useToast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRecordTxModalOpen, setIsRecordTxModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState<string | undefined>(undefined);
  const [isFirstLoginPasswordModalOpen, setIsFirstLoginPasswordModalOpen] = useState(false);

  // Auto-open auth modal if user arrives from a password recovery email
  useEffect(() => {
    if (isPasswordRecovery) {
      setIsAuthModalOpen(true);
    }
  }, [isPasswordRecovery]);

  // If user signed in without a password, prompt them to set one on first login
  useEffect(() => {
    if (user && isAllowlisted && needsPasswordSetup) {
      const dismissed = localStorage.getItem(`envello_dismissed_password_prompt_${user.id}`);
      if (!dismissed) {
        setIsFirstLoginPasswordModalOpen(true);
      }
    } else {
      setIsFirstLoginPasswordModalOpen(false);
    }
  }, [user, isAllowlisted, needsPasswordSetup]);

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

  // 2. Private Beta Gating: Authenticated but email NOT on allowlist
  if (user && isAllowlisted === false) {
    return <AccessRestricted />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Application Header */}
      <Header
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onRecordTransactionClick={() => setIsRecordTxModalOpen(true)}
        onOpenAccountsModal={() => setIsAccountsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!user ? (
          <CoverPage onOpenAuthModal={() => setIsAuthModalOpen(true)} />
        ) : (
          <div className="space-y-8">
            {/* Section: The Six Financial Pillars */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-semibold tracking-tight text-white">Financial Pillars</h2>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Deterministic Math
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Explicit balance taxonomy. Liquid cash is never conflated with credit limits or locked savings.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition"
                    title="Export Data"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button
                    onClick={() => {
                      setReconcileAccountId(undefined);
                      setIsReconcileModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition"
                    title="Reconcile Account Balance against Bank Statement"
                  >
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Reconcile</span>
                  </button>
                  <button
                    onClick={() => setIsRecurringModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition relative"
                    title="Standing Recurring Schedules"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">Recurring</span>
                    {dueRecurringRules.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse absolute -top-0.5 -right-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsAccountsModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition"
                  >
                    <Landmark className="w-3.5 h-3.5 text-sky-400" />
                    <span>{accounts.length} Accounts</span>
                  </button>
                  <button
                    onClick={() => setIsRecordTxModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 text-xs font-semibold shadow-lg shadow-sky-500/20 transition"
                  >
                    + Record Transaction
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
                    <div className="text-2xl font-bold font-mono tracking-tight text-sky-400 tabular-nums">
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
                    <div className="text-2xl font-bold font-mono tracking-tight text-indigo-300 tabular-nums">
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
                    <div className="text-2xl font-bold font-mono tracking-tight text-amber-300 tabular-nums">
                      {formatINR(effectiveSavingsAndFDsPaise)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">Super.Money FDs & Locked Reserves</div>
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
                    <div className="text-2xl font-bold font-mono tracking-tight text-purple-400 tabular-nums">
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
                    <div className="text-2xl font-bold font-mono tracking-tight text-orange-400 tabular-nums">
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
                    <div className="text-2xl font-bold font-mono tracking-tight text-cyan-300 tabular-nums">
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
      />

      {/* First-Login Set Password Modal for Magic Link Users */}
      <SetPasswordModal
        isOpen={isFirstLoginPasswordModalOpen}
        onClose={() => setIsFirstLoginPasswordModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-neutral-500">
        Envello Personal Finance Platform • Target ₹0/mo Budget • Deterministic Accounting Engine
      </footer>
    </div>
  );
};

export default App;
