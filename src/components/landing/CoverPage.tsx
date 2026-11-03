import React, { useState } from 'react';
import {
  Wallet,
  Mail,
  PiggyBank,
  CreditCard,
  CalendarClock,
  Target,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Scale,
  Repeat,
  Download,
  Lock,
  ChevronRight,
  Calculator,
  Sliders,
  Check,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import { SpotlightCard } from '@/components/common/SpotlightCard';

interface CoverPageProps {
  onOpenAuthModal: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const CoverPage: React.FC<CoverPageProps> = ({
  onOpenAuthModal,
  onOpenPrivacy = () => {},
  onOpenTerms = () => {},
}) => {
  // Interactive Simulator state
  const [simulatorIncomeRupees, setSimulatorIncomeRupees] = useState<number>(85000);
  const [essentialsPercent, setEssentialsPercent] = useState<number>(40);
  const [savingsPercent, setSavingsPercent] = useState<number>(30);
  const [lifestylePercent, setLifestylePercent] = useState<number>(20);

  // Rollover policy interactive demonstrator tab
  const [activeRolloverDemo, setActiveRolloverDemo] = useState<'carry' | 'sweep' | 'reset'>('carry');

  const totalPaise = BigInt(simulatorIncomeRupees) * 100n;
  const essentialsPaise = (totalPaise * BigInt(essentialsPercent)) / 100n;
  const savingsPaise = (totalPaise * BigInt(savingsPercent)) / 100n;
  const lifestylePaise = (totalPaise * BigInt(lifestylePercent)) / 100n;
  const unallocatedPaise = totalPaise - (essentialsPaise + savingsPaise + lifestylePaise);

  const scrollTo = (elementId: string) => {
    const target = document.getElementById(elementId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16 animate-fade-in w-full max-w-full overflow-hidden text-neutral-100">
      {/* =========================================================================
          1. HERO SECTION (Refero Styles + Cult UI Micro-Interactions)
          ========================================================================= */}
      <section className="relative pt-4 pb-8 sm:pt-12 sm:pb-16 text-center space-y-6 max-w-5xl mx-auto px-3 sm:px-6">
        {/* Subtle Linear-inspired background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(650px,95vw)] h-[350px] bg-gradient-to-tr from-sky-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl -z-10 pointer-events-none rounded-full" />

        {/* Brand Pill */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-sky-300 shadow-sm hover:border-sky-500/30 transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>Zero-Based Envelope Accounting &bull; Private Sovereign Cloud</span>
        </div>

        {/* Main Display Title */}
        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] max-w-4xl mx-auto">
          Personal Finance with{' '}
          <span className="text-sky-400">
            Double-Entry Precision
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Envello is an open-source, deterministic personal finance platform. Zero floating-point drift, zero data monetization, and true envelope budgeting designed for mathematical accounting truth.
        </p>

        {/* CTA Buttons Strip (Zero Horizontal Scroll, Wrapping Responsive Layout) */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 w-full">
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-7 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 font-bold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 shadow-xl shadow-sky-500/20 hover:shadow-sky-500/30 group cursor-pointer"
          >
            <span>Sign In to Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => scrollTo('pillars')}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white text-sm font-medium border border-white/10 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
          >
            Explore 6 Pillars
          </button>
          <button
            onClick={() => scrollTo('simulator')}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-sky-200 text-sm font-medium border border-sky-500/25 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Try Simulator</span>
          </button>
        </div>

        {/* Live Product Teaser Card (Watermelon UI Metric Block) */}
        <div className="pt-6 sm:pt-8 max-w-3xl mx-auto">
          <div className="rounded-2xl sm:rounded-3xl bg-[#0b0c0e] border border-white/10 shadow-2xl p-4 sm:p-6 text-left space-y-4 relative overflow-hidden">
            {/* Top accent highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white tracking-tight">Active Financial Workspace</div>
                  <div className="text-[10px] text-neutral-400 font-mono">Current Cycle: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>RLS Guarded</span>
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 border border-white/10 text-[10px] font-mono">
                  Paise-Precision
                </span>
              </div>
            </div>

            {/* Micro Dashboard Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-white/5 space-y-1">
                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Spendable Cash</div>
                <div className="text-lg font-bold font-mono text-white">₹82,450.00</div>
                <div className="text-[10px] text-emerald-400 flex items-center space-x-1">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Checking + Liquid Cash</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-white/5 space-y-1">
                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Envelope Budgeted</div>
                <div className="text-lg font-bold font-mono text-sky-400">₹64,000.00</div>
                <div className="text-[10px] text-neutral-400">6 Earmarked Categories</div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-white/5 space-y-1">
                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Credit Card Utilization</div>
                <div className="text-lg font-bold font-mono text-purple-400">18.4%</div>
                <div className="text-[10px] text-emerald-400">Within &lt;30% Safe Range</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Sovereign Guarantees */}
        <div className="pt-4 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
              <Calculator className="w-3.5 h-3.5" />
              <span>Zero-Float Math</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">Integer paise arithmetic. 0.1 + 0.2 never drifts by a single paisa.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Row Level Security</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">Database-enforced isolation. Strictly auth.uid() bound on every query.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Private Sovereignty</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">Zero third-party trackers, zero data sales, zero ad networks.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0f1011] border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-400">
              <Download className="w-3.5 h-3.5" />
              <span>1-Click Portability</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">Instantly export all ledger entries, FDs, and rules to CSV or JSON.</p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. THE SIX FINANCIAL PILLARS (Cult UI Spotlight Grid)
          ========================================================================= */}
      <section id="pillars" className="space-y-8 scroll-mt-24 max-w-5xl mx-auto px-3 sm:px-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            The Six Financial Pillars
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Standard finance apps display a single ambiguous &ldquo;Total Balance&rdquo; that dangerously blends liquid cash with locked FDs, credit limits, and planning goals. Envello keeps them strictly isolated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Pillar 1: Spendable Cash */}
          <SpotlightCard spotlightColor="rgba(56, 189, 248, 0.18)">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                1. Spendable Cash
              </span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-base font-bold text-white">Liquid Cash Accounts</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Checking accounts, liquid savings, and physical cash. Never inflated by your credit card limits or locked fixed deposits.
              </p>
              <div className="pt-2 text-[10px] text-sky-300 font-mono border-t border-white/5">
                Rule: Only liquid funds can fund envelope purchases.
              </div>
            </div>
          </SpotlightCard>

          {/* Pillar 2: Envelope Allocations */}
          <SpotlightCard spotlightColor="rgba(129, 140, 248, 0.18)">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                2. Envelope Allocations
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-base font-bold text-white">Assigned Job for Every Rupee</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Money designated for specific categories (Groceries, Gym, Dining, Emergency) for this month. Prevents accidental overspending.
              </p>
              <div className="pt-2 text-[10px] text-indigo-300 font-mono border-t border-white/5">
                Rule: Overspending in one never silently drains another.
              </div>
            </div>
          </SpotlightCard>

          {/* Pillar 3: FDs & RDs */}
          <SpotlightCard spotlightColor="rgba(251, 191, 36, 0.18)">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                3. FDs & RDs
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-base font-bold text-white">Protected Fixed Assets</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Fixed deposits, RDs, and term instruments with maturity dates. Completely isolated from your daily spendable cash.
              </p>
              <div className="pt-2 text-[10px] text-amber-300 font-mono border-t border-white/5">
                Rule: Cannot be drawn without formal liquidation entry.
              </div>
            </div>
          </SpotlightCard>

          {/* Pillar 4: Card Liabilities */}
          <SpotlightCard spotlightColor="rgba(192, 132, 252, 0.18)">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                4. Card Liabilities
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-base font-bold text-white">Real-Time Utilization</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Track unsettled card debt with automated &lt;30% utilization safeguards. Settle bills via atomic double-entry database transactions.
              </p>
              <div className="pt-2 text-[10px] text-purple-300 font-mono border-t border-white/5">
                Rule: Available credit limit is debt, never your cash.
              </div>
            </div>
          </SpotlightCard>

          {/* Pillar 5: Actual Debts */}
          <SpotlightCard spotlightColor="rgba(251, 146, 60, 0.18)">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                5. Actual Debts
              </span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <CalendarClock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-base font-bold text-white">External Borrowings</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Money owed to family, friends, or lending institutions. Track principal payoff schedules without mixing with monthly expenses.
              </p>
              <div className="pt-2 text-[10px] text-orange-300 font-mono border-t border-white/5">
                Rule: Separate liabilities from recurring operating costs.
              </div>
            </div>
          </SpotlightCard>

          {/* Pillar 6: Monthly Targets */}
          <SpotlightCard spotlightColor="rgba(34, 211, 238, 0.18)">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                6. Monthly Targets
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-base font-bold text-white">Forward Planning Goals</div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Future purchase milestones (Travel, Laptop, Annual Insurance). Clearly distinguished as targets so they don&apos;t prematurely deduct liquid cash.
              </p>
              <div className="pt-2 text-[10px] text-cyan-300 font-mono border-t border-white/5">
                Rule: Planning intentions are not deducted until funded.
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* =========================================================================
          3. SPECIALIZED SUBSYSTEMS (Watermelon UI Bento Grid Block)
          ========================================================================= */}
      <section id="subsystems" className="space-y-8 scroll-mt-24 max-w-5xl mx-auto px-3 sm:px-6">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Engineered for Precision & Convenience
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Four specialized subsystems designed to automate routine budgeting while preserving mathematical accounting truth.
          </p>
        </div>

        {/* Bento Grid Layout (Watermelon UI Component Block) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Bento Card 1: Rollover Engine (Spans 2 cols on desktop) */}
          <div className="lg:col-span-2 rounded-2xl p-6 bg-[#0f1011] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Month-End Envelope Rollover Engine</h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
                Configure deterministic behavior for unspent money at month-end. Never wonder where your surplus went.
              </p>
            </div>

            {/* Interactive Policy Switcher Demo */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-neutral-900 border border-white/10 w-full">
                {[
                  {
                    id: 'carry',
                    label: 'Carry Forward',
                    rule: 'Accumulates unspent envelope surplus into next month.',
                    example: 'Remaining ₹4,200 in Outing carries forward into next month for a ₹9,200 total pool.',
                    badge: 'Sinking Funds',
                  },
                  {
                    id: 'sweep',
                    label: 'Sweep to Spendable',
                    rule: 'Returns unused category surplus back to your liquid Spendable pool.',
                    example: 'Unspent ₹3,500 in Dining is swept back to Spendable Cash on the 1st of the month.',
                    badge: 'Liquid Surplus',
                  },
                  {
                    id: 'reset',
                    label: 'Reset to Zero',
                    rule: 'Clears allocation clean for fresh, fixed monthly budgets.',
                    example: 'Envelope resets to ₹0 unspent, ready for a fresh monthly allocation without drift.',
                    badge: 'Strict Budgets',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveRolloverDemo(item.id as any)}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-150 min-h-[40px] flex items-center justify-center text-center cursor-pointer active:scale-95 ${
                      activeRolloverDemo === item.id
                        ? 'bg-sky-500 text-neutral-950 font-bold shadow-md shadow-sky-500/25'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Active Policy Dynamic Card */}
              {(() => {
                const policies: Record<string, { label: string; rule: string; example: string; badge: string }> = {
                  carry: {
                    label: 'Carry Forward',
                    rule: 'Accumulates unspent envelope surplus into next month.',
                    example: 'Remaining ₹4,200 in Outing carries forward into next month for a ₹9,200 total pool.',
                    badge: 'Sinking Funds',
                  },
                  sweep: {
                    label: 'Sweep to Spendable',
                    rule: 'Returns unused category surplus back to your liquid Spendable pool.',
                    example: 'Unspent ₹3,500 in Dining is swept back to Spendable Cash on the 1st of the month.',
                    badge: 'Liquid Surplus',
                  },
                  reset: {
                    label: 'Reset to Zero',
                    rule: 'Clears allocation clean for fresh, fixed monthly budgets.',
                    example: 'Envelope resets to ₹0 unspent, ready for a fresh monthly allocation without drift.',
                    badge: 'Strict Budgets',
                  },
                };
                const active = policies[activeRolloverDemo] || policies.carry;

                return (
                  <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sky-400 font-semibold">
                        <Check className="w-4 h-4 flex-shrink-0 text-sky-400" />
                        <span>{active.label}: {active.rule}</span>
                      </div>
                      <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
                        {active.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono bg-neutral-950/60 p-2.5 rounded-lg border border-white/5 leading-relaxed">
                      <span className="text-sky-300 font-semibold">Simulation:</span> {active.example}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bento Card 2: Bank Statement Reconciliation (1 col) */}
          <div className="rounded-2xl p-6 bg-[#0f1011] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Statement Reconciliation</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Reconcile physical bank closing balances against your digital ledger with zero silent record tampering.
              </p>
            </div>

            <div className="space-y-2 text-xs text-neutral-300 border-t border-white/5 pt-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Formal audit adjustments</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Mandatory discrepancy reasons</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Permanent timestamped history</span>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Self EMIs & Credit Safety (1 col) */}
          <div className="rounded-2xl p-6 bg-[#0f1011] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Self EMIs & Credit Health</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                When drawing from emergency savings, set an automated reimbursement plan to repay yourself without interest.
              </p>
            </div>

            <div className="space-y-2 text-xs text-neutral-300 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-neutral-400">Card Utilization Guard</span>
                <span className="text-emerald-400 font-bold">&lt; 30% Guideline</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full w-[24%] bg-emerald-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Bento Card 4: 1-Click Standing Rules (Spans 2 cols on desktop) */}
          <div className="lg:col-span-2 rounded-2xl p-6 bg-[#0f1011] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Repeat className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">1-Click Standing Recurring Bills</h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
                Eliminate the repetitive monthly chore of manual data entry. Track Rent, Internet, Maid, and Subscriptions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 pt-3">
              <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5 text-xs space-y-0.5">
                <div className="text-[10px] text-neutral-500 uppercase font-mono">Cycle Detection</div>
                <div className="font-semibold text-white">Smart Due Detection</div>
                <div className="text-[11px] text-neutral-400">Flags bills due for payment</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5 text-xs space-y-0.5">
                <div className="text-[10px] text-neutral-500 uppercase font-mono">1-Touch Execution</div>
                <div className="font-semibold text-amber-300">Log All Due</div>
                <div className="text-[11px] text-neutral-400">Logs entire cycle in one tap</div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5 text-xs space-y-0.5">
                <div className="text-[10px] text-neutral-500 uppercase font-mono">Audit Invariant</div>
                <div className="font-semibold text-sky-400">Double-Entry Safe</div>
                <div className="text-[11px] text-neutral-400">Debits accounts and envelopes</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. INTERACTIVE LIVE BUDGET SIMULATOR (Tactile Slider Engine)
          ========================================================================= */}
      <section id="simulator" className="p-6 sm:p-9 rounded-3xl bg-[#0f1011] border border-white/10 space-y-6 scroll-mt-24 max-w-5xl mx-auto shadow-2xl relative overflow-hidden">
        {/* Subtle accent border glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Experience True Envelope Allocation
            </h3>
            <p className="text-xs text-neutral-400 max-w-lg">
              In envelope budgeting, every rupee of income is assigned a clear job before the month begins.
            </p>
          </div>

          {/* Monthly Income Presets Strip (Zero Horizontal Scroll, Wrapping Responsive Layout) */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-white/5 space-y-1.5 flex-shrink-0 sm:text-right">
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Monthly Take-Home</span>
              <div className="flex flex-wrap gap-1">
                {[50000, 85000, 150000, 250000].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => setSimulatorIncomeRupees(inc)}
                    className={`text-[10px] px-2.5 py-1 min-h-[32px] rounded-lg font-mono transition cursor-pointer active:scale-95 ${
                      simulatorIncomeRupees === inc
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
                    }`}
                  >
                    ₹{inc >= 100000 ? `${inc / 100000}L` : `${inc / 1000}k`}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {formatINR(totalPaise)}
            </div>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Essentials */}
          <div className="space-y-2.5 p-4 rounded-xl bg-neutral-950/70 border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-200">1. Essentials & Rent</span>
              <span className="font-mono text-amber-400 font-bold">{essentialsPercent}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              value={essentialsPercent}
              onChange={(e) => setEssentialsPercent(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />
            <div className="text-xs font-mono text-neutral-400 text-right tabular-nums">
              {formatINR(essentialsPaise)}
            </div>
          </div>

          {/* Savings */}
          <div className="space-y-2.5 p-4 rounded-xl bg-neutral-950/70 border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-200">2. Savings & FDs</span>
              <span className="font-mono text-sky-400 font-bold">{savingsPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={savingsPercent}
              onChange={(e) => setSavingsPercent(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />
            <div className="text-xs font-mono text-neutral-400 text-right tabular-nums">
              {formatINR(savingsPaise)}
            </div>
          </div>

          {/* Lifestyle */}
          <div className="space-y-2.5 p-4 rounded-xl bg-neutral-950/70 border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-200">3. Lifestyle & Outing</span>
              <span className="font-mono text-purple-400 font-bold">{lifestylePercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={lifestylePercent}
              onChange={(e) => setLifestylePercent(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer h-2 bg-neutral-800 rounded-lg"
            />
            <div className="text-xs font-mono text-neutral-400 text-right tabular-nums">
              {formatINR(lifestylePaise)}
            </div>
          </div>
        </div>

        {/* Visual Multi-Segment Proportional Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-neutral-900 border border-white/10 overflow-hidden flex">
            <div style={{ width: `${essentialsPercent}%` }} className="bg-amber-400 transition-all duration-300" title="Essentials" />
            <div style={{ width: `${savingsPercent}%` }} className="bg-sky-400 transition-all duration-300" title="Savings" />
            <div style={{ width: `${lifestylePercent}%` }} className="bg-purple-400 transition-all duration-300" title="Lifestyle" />
            {unallocatedPaise > 0n && (
              <div
                style={{ width: `${Math.max(0, 100 - essentialsPercent - savingsPercent - lifestylePercent)}%` }}
                className="bg-emerald-500/50 transition-all duration-300"
                title="Unallocated Emergency Buffer"
              />
            )}
          </div>
        </div>

        {/* Allocation status bar */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-400">Unallocated Buffer:</span>
            <span
              className={`font-mono font-bold text-sm tabular-nums ${
                unallocatedPaise >= 0n ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatINR(unallocatedPaise)}
            </span>
            <span className="text-neutral-500">
              ({unallocatedPaise >= 0n ? 'Available for emergency buffer' : 'Over-allocated by ' + formatINR(-unallocatedPaise)})
            </span>
          </div>

          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-4 py-2 min-h-[44px] sm:min-h-[38px] rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold border border-sky-500/30 transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <span>Set up your envelopes</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* =========================================================================
          5. FINAL CALL TO ACTION (Linear-Inspired Dark Surface)
          ========================================================================= */}
      <section className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-sky-950/70 via-indigo-950/60 to-purple-950/70 border border-sky-500/30 text-center space-y-6 overflow-hidden shadow-2xl max-w-5xl mx-auto">
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready for True Financial Sovereignty?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Sign in with your Google account or magic link to access your private financial workspace and begin double-entry budgeting today.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3">
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-8 py-3.5 min-h-[44px] rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-sm transition-all duration-200 active:scale-95 shadow-xl shadow-white/10 hover:shadow-white/20 inline-flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Sign In to Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-neutral-400">
            Private Beta &bull; Strict Row Level Security Guarded
          </p>
        </div>
      </section>

      {/* =========================================================================
          6. LEGAL COMPLIANCE & SOVEREIGN FOOTER
          ========================================================================= */}
      <footer className="pt-8 pb-12 border-t border-white/10 space-y-8 max-w-5xl mx-auto px-3 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand Info */}
          <div className="space-y-2 max-w-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 flex-shrink-0">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">Envello</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Deterministic double-entry envelope budgeting. Built for financial sovereignty, absolute math precision, and strict cryptographic data isolation.
            </p>
          </div>

          {/* Quick Legal & Navigation Links (Zero Horizontal Scroll, Wrapping Layout) */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-neutral-400 hover:text-white transition font-medium min-h-[44px] flex items-center cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={onOpenTerms}
              className="text-neutral-400 hover:text-white transition font-medium min-h-[44px] flex items-center cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => scrollTo('pillars')}
              className="text-neutral-400 hover:text-white transition font-medium min-h-[44px] flex items-center cursor-pointer"
            >
              6 Pillars of Truth
            </button>
            <button
              type="button"
              onClick={() => scrollTo('simulator')}
              className="text-neutral-400 hover:text-white transition font-medium min-h-[44px] flex items-center cursor-pointer"
            >
              Budget Simulator
            </button>
          </div>
        </div>

        {/* Regulatory & Advisory Disclaimer */}
        <div className="p-4 rounded-xl bg-neutral-950/60 border border-white/5 space-y-2 text-[11px] text-neutral-400 leading-relaxed">
          <p>
            <strong className="text-neutral-300">Regulatory Disclaimer:</strong> Envello is a self-directed personal finance software tool. Envello is not a registered investment advisor, broker, or financial depository. Calculations, utilization recommendations (&lt;30%), and simulated projections are deterministic mathematical calculations based entirely on user-entered values.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px] text-neutral-400">
            <span>&copy; {new Date().getFullYear()} Envello. Zero data monetization &bull; AES-256 Encrypted &bull; TLS 1.3</span>
            <span className="text-emerald-400/90 font-medium flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Row Level Security Active</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
