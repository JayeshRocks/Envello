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
  Lock,
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
import { Header } from '@/components/common/Header';
import { AuthModal } from '@/components/auth/AuthModal';
import { AccessRestricted } from '@/components/auth/AccessRestricted';
import { EnvelopeGrid } from '@/components/envelopes/EnvelopeGrid';
import { RecordTransactionModal } from '@/components/transactions/RecordTransactionModal';
import { AccountListModal } from '@/components/accounts/AccountListModal';
import { TransactionTable } from '@/components/transactions/TransactionTable';
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
  // Spendable cash & envelope allocations are driven dynamically from live Supabase data
  const effectiveSpendableCashPaise = user ? totalSpendableCashPaise : demoPillars.spendableCashPaise;
  const effectiveEnvelopeAllocationsPaise = user ? totalAllocatedPaise : demoPillars.envelopeAllocationsPaise;

  // Credit card demonstration calculation
  const demoCardLimit = 10000000n; // ₹1,00,000.00
  const cardUtilization = calculateCreditCardUtilization(
    demoPillars.creditCardLiabilitiesPaise,
    demoCardLimit
  );
  const cardStatus = getCreditCardUtilizationStatus(cardUtilization);

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
        onRecordTransactionClick={() => {
          if (!user) {
            setIsAuthModalOpen(true);
          } else {
            setIsRecordTxModalOpen(true);
          }
        }}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Banner: Unauthenticated Preview Mode */}
        {!user && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 flex-shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-sm text-white">Previewing Envello Workspace</div>
                <p className="text-xs text-neutral-400 max-w-xl">
                  You are previewing sample data with the deterministic accounting engine. Sign in with your allowlisted email to connect your personal financial ledger.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Setup Banner if Supabase connection is pending */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">Welcome to Envello! Database Connection Setup Needed</div>
              <p className="text-xs text-amber-200/80">
                To connect your local workspace to Supabase, copy your Project URL and anon key into <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-amber-300">.env</code>.
              </p>
            </div>
          </div>
        )}

        {/* Section: Six Pillars of Financial Clarity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
                <span>Financial Overview</span>
                <span className="text-xs font-normal text-neutral-400">(Six Pillars of Clarity)</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Balances are strictly categorized into liquid cash, allocations, locked savings, and debts.
              </p>
            </div>
            {user && (
              <button
                onClick={() => setIsAccountsModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-300 hover:text-white text-xs font-medium transition"
              >
                <Landmark className="w-3.5 h-3.5 text-sky-400" />
                <span>Manage Accounts ({accounts.length})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Spendable Cash */}
            <div
              onClick={() => {
                if (user) setIsAccountsModalOpen(true);
              }}
              className={`glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden transition ${
                user ? 'cursor-pointer hover:border-sky-500/30' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  1. Spendable Cash
                </span>
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                  {formatINR(effectiveSpendableCashPaise)}
                </div>
                <div className="text-xs text-neutral-400 mt-1 flex items-center justify-between">
                  <span>Liquid Bank Accounts & Cash</span>
                  {user && <span className="text-sky-400 text-[11px]">Manage →</span>}
                </div>
              </div>
            </div>

            {/* 2. Envelope Allocations */}
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  2. Envelope Budget
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
                  {formatINR(demoPillars.savingsAndFDsPaise)}
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
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-red-400 tabular-nums">
                  {formatINR(demoPillars.creditCardLiabilitiesPaise)}
                </div>
                <div className="flex items-center space-x-2 text-xs mt-1">
                  <span className="text-neutral-400">Utilization:</span>
                  <span
                    className={`font-semibold font-mono ${
                      cardStatus === 'safe'
                        ? 'text-emerald-400'
                        : cardStatus === 'warning'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {cardUtilization.toFixed(1)}% ({cardStatus === 'safe' ? '<30% Safe' : 'High'})
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
                  {formatINR(demoPillars.actualDebtsPaise)}
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
          <h3 className="text-sm font-semibold text-neutral-200">Next Steps & Documentation</h3>
          <p className="text-xs text-neutral-400">
            Phase 4 Transaction Ledger is active. Record expenses, income, and account transfers in integer paise.
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
            <div className="p-3 rounded-xl bg-neutral-800/60 border border-white/5 text-neutral-300">
              <span>2. Check <code className="text-sky-400 font-mono">public.transactions</code></span>
            </div>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-white/5 flex items-center justify-between text-neutral-300 hover:text-white transition"
            >
              <span>3. Vercel Production Deployment</span>
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
