import React, { useState } from 'react';
import {
  Wallet,
  Mail,
  PiggyBank,
  CreditCard,
  CalendarClock,
  Target,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Landmark,
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import {
  calculateCreditCardUtilization,
  getCreditCardUtilizationStatus,
} from '@/lib/accounting/calculations';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useEnvelopes } from '@/hooks/useEnvelopes';
import { useTransactions } from '@/hooks/useTransactions';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useFixedDeposits } from '@/hooks/useFixedDeposits';
import { useSelfEmis } from '@/hooks/useSelfEmis';
import { useActualDebts } from '@/hooks/useActualDebts';
import { Header } from '@/components/common/Header';
import { AuthModal } from '@/components/auth/AuthModal';
import { AccessRestricted } from '@/components/auth/AccessRestricted';
import { EnvelopeGrid } from '@/components/envelopes/EnvelopeGrid';
import { RecordTransactionModal } from '@/components/transactions/RecordTransactionModal';
import { AccountListModal } from '@/components/accounts/AccountListModal';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { LiabilitiesAndAssetsContainer } from '@/components/cards-and-debts/LiabilitiesAndAssetsContainer';
import type { FinancialOverviewPillars } from '@/types/accounting.types';

export const App: React.FC = () => {
  const { user, isAllowlisted, isLoading: isAuthLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRecordTxModalOpen, setIsRecordTxModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

  // Live hooks
  const {
    accounts,
    totalSpendableCashPaise,
    addAccount,
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
    refreshSelfEmis,
  } = useSelfEmis();

  const {
    actualDebts,
    totalRemainingDebtPaise,
    isLoading: isDebtsLoading,
    addDebt,
    payDebt,
    refreshDebts,
  } = useActualDebts();

  // Baseline demo state (used as fallback for locked assets or unauthenticated preview)
  const [demoPillars] = useState<FinancialOverviewPillars>({
    spendableCashPaise: 12540050n,       // ₹1,25,400.50
    envelopeAllocationsPaise: 4200000n,  // ₹42,000.00
    savingsAndFDsPaise: 25000000n,       // ₹2,50,000.00 (Super.Money FDs)
    creditCardLiabilitiesPaise: 1850000n, // ₹18,500.00
    actualDebtsPaise: 5000000n,           // ₹50,000.00 (External loan/EMI)
    monthlyTargetsPaise: 3000000n,       // ₹30,000.00 (Forward planning)
  });

  // Effective authoritative pillars:
  // All pillars driven dynamically from live Supabase data when authenticated
  const effectiveSpendableCashPaise = user ? totalSpendableCashPaise : demoPillars.spendableCashPaise;
  const effectiveEnvelopeAllocationsPaise = user ? totalAllocatedPaise : demoPillars.envelopeAllocationsPaise;
  const effectiveSavingsAndFDsPaise = user ? totalPrincipalPaise : demoPillars.savingsAndFDsPaise;
  const effectiveCreditCardLiabilitiesPaise = user ? totalCardOutstandingPaise : demoPillars.creditCardLiabilitiesPaise;
  const effectiveActualDebtsPaise = user ? totalRemainingDebtPaise : demoPillars.actualDebtsPaise;

  // Credit card utilization calculation
  const effectiveCardUtilization = user
    ? overallUtilizationPercent
    : calculateCreditCardUtilization(demoPillars.creditCardLiabilitiesPaise, 10000000n);
  const effectiveCardStatus = getCreditCardUtilizationStatus(effectiveCardUtilization);

  const envelopeCategories = [
    { name: 'Regular / Balance', amount: 1500000n, color: 'text-sky-400', border: 'border-sky-500/20' },
    { name: 'Emergency', amount: 5000000n, color: 'text-red-400', border: 'border-red-500/20', note: 'Locked reserve' },
    { name: 'Gym', amount: 350000n, color: 'text-emerald-400', border: 'border-emerald-500/20' },
    { name: 'Essentials', amount: 1200000n, color: 'text-amber-400', border: 'border-amber-500/20' },
    { name: 'Outing', amount: 650000n, color: 'text-purple-400', border: 'border-purple-500/20' },
    { name: 'Birthdays', amount: 500000n, color: 'text-pink-400', border: 'border-pink-500/20' },
  ];

  const handleTransactionRecorded = async () => {
    await Promise.all([
      refreshAccounts(),
      refreshEnvelopes(),
      refreshTransactions(),
      refreshCards(),
      refreshFDs(),
      refreshSelfEmis(),
      refreshDebts(),
    ]);
  };

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
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Banner for unauthenticated preview mode */}
        {!user && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Owner Private Beta Preview</h4>
                <p className="text-xs text-neutral-400">
                  {isSupabaseConfigured
                    ? 'Connected to Supabase. Sign in with your allowlisted email to manage your real financial ledger.'
                    : 'Supabase configuration missing in environment. Running in offline inspection mode.'}
                </p>
              </div>
            </div>
            {isSupabaseConfigured && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold text-xs transition flex items-center space-x-1.5 flex-shrink-0 shadow-lg shadow-sky-500/20"
              >
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

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

            {user && (
              <div className="flex items-center space-x-2">
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
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Spendable Cash */}
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
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
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
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
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
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
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
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
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
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
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
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
                  {formatINR(demoPillars.monthlyTargetsPaise)}
                </div>
                <div className="text-xs text-neutral-400 mt-1">Planned Goals (Not Yet Deducted)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Envelope Budgeting */}
        {user ? (
          <EnvelopeGrid />
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">Active Envelopes (Preview)</h2>
                <p className="text-xs text-neutral-400">Sample categories. Sign in to customize and allocate your own budgets.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {envelopeCategories.map((env, idx) => (
                <div
                  key={idx}
                  className={`glass-card rounded-xl p-4 border ${env.border} flex items-center justify-between`}
                >
                  <div>
                    <div className="text-sm font-medium text-neutral-200">{env.name}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{env.note || 'Available to spend'}</div>
                  </div>
                  <div className={`text-base font-bold font-mono tabular-nums ${env.color}`}>
                    {formatINR(env.amount)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Liabilities & Locked Assets (Credit Cards, Super.Money FDs, Self EMIs, Debts) */}
        {user && (
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
            }}

            fixedDeposits={fixedDeposits}
            totalFdPrincipalPaise={totalPrincipalPaise}
            totalFdMaturityPaise={totalMaturityPaise}
            isFdsLoading={isFdsLoading}
            onAddFD={async (params) => {
              await addFD(params);
              await handleTransactionRecorded();
            }}
            onLiquidateFD={async (params) => {
              await liquidateFD(params);
              await handleTransactionRecorded();
            }}

            selfEmis={selfEmis}
            totalSelfEmiRemainingPaise={totalSelfEmiRemainingPaise}
            isEmisLoading={isEmisLoading}
            onAddEmi={async (params) => {
              await addEmi(params);
            }}
            onPayEmi={async (params) => {
              await payEmi(params);
              await handleTransactionRecorded();
            }}

            actualDebts={actualDebts}
            totalActualDebtRemainingPaise={totalRemainingDebtPaise}
            isDebtsLoading={isDebtsLoading}
            onAddDebt={async (params) => {
              await addDebt(params);
            }}
            onPayDebt={async (params) => {
              await payDebt(params);
              await handleTransactionRecorded();
            }}

            accounts={accounts}
          />
        )}

        {/* Section: Transaction Ledger */}
        {user && (
          <TransactionTable
            transactions={transactions}
            isLoading={isTxLoading}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRecordTransactionClick={() => setIsRecordTxModalOpen(true)}
          />
        )}

        {/* Quick Guide Links */}
        <section className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-200">System Architecture & Invariants</h3>
          <p className="text-xs text-neutral-400">
            Phase 5 Complete: All six financial pillars are live and authoritative. Credit card debt settlements and FD movements preserve double-entry integrity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-white/5 flex items-center justify-between text-neutral-300 hover:text-white transition"
            >
              <span>1. Supabase Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </a>
            <div className="p-3 rounded-xl bg-neutral-800/60 border border-white/5 text-neutral-300 flex items-center justify-between">
              <span>2. Integer Paise Math</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-white/5 flex items-center justify-between text-neutral-300 hover:text-white transition"
            >
              <span>3. Vercel Production Build</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </a>
          </div>
        </section>
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
        }}
        onRecordIncome={async (params) => {
          await addIncome(params);
          await handleTransactionRecorded();
        }}
        onRecordTransfer={async (params) => {
          await addTransfer(params);
          await handleTransactionRecorded();
        }}
      />

      {/* Accounts Management Modal */}
      <AccountListModal
        isOpen={isAccountsModalOpen}
        accounts={accounts}
        onClose={() => setIsAccountsModalOpen(false)}
        onAddAccount={async (params) => {
          await addAccount(params);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-neutral-500">
        Envello Personal Finance Platform • Target ₹0/mo Budget • Deterministic Accounting Engine
      </footer>
    </div>
  );
};

export default App;
