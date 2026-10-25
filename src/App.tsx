import React, { useState } from 'react';
import {
  Wallet,
  Mail,
  PiggyBank,
  CreditCard,
  CalendarClock,
  Target,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PlusCircle,
  Database,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import {
  calculateCreditCardUtilization,
  getCreditCardUtilizationStatus,
} from '@/lib/accounting/calculations';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { FinancialOverviewPillars } from '@/types/accounting.types';

export const App: React.FC = () => {
  // Demo state representing the authoritative 6 balance pillars
  const [pillars] = useState<FinancialOverviewPillars>({
    spendableCashPaise: 12540050n,      // ₹1,25,400.50
    envelopeAllocationsPaise: 4200000n, // ₹42,000.00
    savingsAndFDsPaise: 25000000n,      // ₹2,50,000.00 (Super.Money FDs)
    creditCardLiabilitiesPaise: 1850000n,// ₹18,500.00
    actualDebtsPaise: 5000000n,          // ₹50,000.00 (External loan/EMI)
    monthlyTargetsPaise: 3000000n,      // ₹30,000.00 (Forward planning)
  });

  // Example credit card demonstration calculation
  const demoCardLimit = 10000000n; // ₹1,00,000.00
  const cardUtilization = calculateCreditCardUtilization(
    pillars.creditCardLiabilitiesPaise,
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                Envello
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                Phase 1 Foundation
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-white/5">
              <Database className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-neutral-400">Supabase:</span>
              {isSupabaseConfigured ? (
                <span className="text-emerald-400 font-medium flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Setup Required
                </span>
              )}
            </div>

            <button
              onClick={() => alert('Add Transaction modal will open here once Phase 4 is integrated.')}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition shadow-sm shadow-sky-500/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Transaction</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Setup Banner if Supabase is pending */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">Welcome to Envello! Database Connection Setup Needed</div>
              <p className="text-xs text-amber-200/80">
                To connect your local workspace to Supabase, create a free project at supabase.com, copy your Project URL and anon public key into <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-amber-300">.env</code>, and run the migration in <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-amber-300">supabase/migrations/</code>.
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Spendable Cash */}
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">1. Spendable Cash</span>
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
                  {formatINR(pillars.spendableCashPaise)}
                </div>
                <div className="text-xs text-neutral-400 mt-1">Liquid Bank Accounts & Cash in Hand</div>
              </div>
            </div>

            {/* 2. Envelope Allocations */}
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">2. Envelope Budget</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-indigo-300 tabular-nums">
                  {formatINR(pillars.envelopeAllocationsPaise)}
                </div>
                <div className="text-xs text-neutral-400 mt-1">Allocated for Current Month Spending</div>
              </div>
            </div>

            {/* 3. Savings & Fixed Deposits */}
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">3. Savings & FDs</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <PiggyBank className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-amber-300 tabular-nums">
                  {formatINR(pillars.savingsAndFDsPaise)}
                </div>
                <div className="text-xs text-neutral-400 mt-1">Super.Money FDs & Locked Reserves</div>
              </div>
            </div>

            {/* 4. Credit Card Liabilities */}
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">4. Card Liabilities</span>
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-red-400 tabular-nums">
                  {formatINR(pillars.creditCardLiabilitiesPaise)}
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
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">5. Actual Debts</span>
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                  <CalendarClock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-orange-400 tabular-nums">
                  {formatINR(pillars.actualDebtsPaise)}
                </div>
                <div className="text-xs text-neutral-400 mt-1">External Loans & Debts Owed</div>
              </div>
            </div>

            {/* 6. Monthly Targets */}
            <div className="glass-card rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">6. Monthly Targets</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Target className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-cyan-300 tabular-nums">
                  {formatINR(pillars.monthlyTargetsPaise)}
                </div>
                <div className="text-xs text-neutral-400 mt-1">Planned Goals (Not Yet Deducted)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Envelope Budgeting Demonstration */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Active Envelopes</h2>
              <p className="text-xs text-neutral-400">Configured according to your personal spending taxonomy.</p>
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

        {/* Quick Guide Links */}
        <section className="p-6 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-200">Next Steps & Setup Documentation</h3>
          <p className="text-xs text-neutral-400">
            Phase 1 Core Foundation is implemented. Follow the guides below to connect Supabase and deploy to Vercel:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-white/5 flex items-center justify-between text-neutral-300 hover:text-white transition"
            >
              <span>1. Create Free Supabase Project</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </a>
            <div className="p-3 rounded-xl bg-neutral-800/60 border border-white/5 text-neutral-300">
              <span>2. Run SQL in <code className="text-sky-400 font-mono">supabase/migrations/</code></span>
            </div>
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-white/5 flex items-center justify-between text-neutral-300 hover:text-white transition"
            >
              <span>3. Deploy to Vercel Hobby</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-neutral-500">
        Envello Personal Finance Platform • Target ₹0/mo Budget • Deterministic Accounting Engine
      </footer>
    </div>
  );
};

export default App;
