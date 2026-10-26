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
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';

interface CoverPageProps {
  onOpenAuthModal: () => void;
}

export const CoverPage: React.FC<CoverPageProps> = ({ onOpenAuthModal }) => {
  // Interactive Simulator state for prospective budgeters
  const [simulatorIncomeRupees, setSimulatorIncomeRupees] = useState<number>(85000);
  const [essentialsPercent, setEssentialsPercent] = useState<number>(40);
  const [savingsPercent, setSavingsPercent] = useState<number>(30);
  const [lifestylePercent, setLifestylePercent] = useState<number>(20);

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
    <div className="space-y-20 pb-16 animate-fade-in">
      {/* 1. Hero Section */}
      <section className="relative pt-6 pb-12 sm:pt-12 sm:pb-16 text-center space-y-6 max-w-4xl mx-auto px-4">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-sky-500/15 via-indigo-500/15 to-purple-500/15 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 text-xs font-medium text-sky-300">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Deterministic Envelope Budgeting • Privacy-First Cloud</span>
        </div>

        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Personal Finance with{' '}
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Double-Entry Precision
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Envello is a zero-cost, privacy-first personal finance platform. Zero floating-point arithmetic errors, explicit balance taxonomy, and true envelope budgeting designed for absolute accounting accuracy.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenAuthModal}
            className="w-full sm:w-auto px-7 py-3 min-h-[44px] rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-neutral-950 font-bold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2 shadow-xl shadow-sky-500/20 hover:shadow-sky-500/30 group"
          >
            <span>Sign In to Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => scrollTo('pillars')}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm font-medium border border-white/10 active:scale-95 transition-all duration-200"
          >
            Explore the 6 Pillars
          </button>
          <button
            onClick={() => scrollTo('simulator')}
            className="w-full sm:w-auto px-5 py-3 min-h-[44px] rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 text-sm font-medium border border-sky-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-1.5"
          >
            <Sliders className="w-4 h-4" />
            <span>Try Simulator</span>
          </button>
        </div>

        {/* Credibility badges */}
        <div className="pt-6 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
              <Calculator className="w-3.5 h-3.5" />
              <span>Zero-Float Math</span>
            </div>
            <p className="text-[11px] text-neutral-400">Integer paise arithmetic. Never loses a single paisa.</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Row Level Security</span>
            </div>
            <p className="text-[11px] text-neutral-400">Database-enforced isolation. Strictly auth.uid() bound.</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Privacy Focused</span>
            </div>
            <p className="text-[11px] text-neutral-400">Zero third-party analytics. Pure sovereign financial privacy.</p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-400">
              <Download className="w-3.5 h-3.5" />
              <span>Data Ownership</span>
            </div>
            <p className="text-[11px] text-neutral-400">1-click full export to CSV & JSON format anytime.</p>
          </div>
        </div>
      </section>

      {/* 2. The Core Problem & The 6 Balance Pillars */}
      <section id="pillars" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            The Six Financial Pillars
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            Traditional finance apps display an ambiguous &ldquo;Total Balance&rdquo; that dangerously blends liquid cash with locked FDs, credit card limits, and planning goals. Envello keeps them strictly separate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Pillar 1 */}
          <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 border border-sky-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                1. Spendable Cash
              </span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">Liquid Accounts Only</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Checking accounts, liquid savings, and physical cash. Never inflated by your credit card limits or locked fixed deposits.
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 border border-indigo-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                2. Envelope Allocations
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">Assigned Job for Every Rupee</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Money specifically assigned to categories (Groceries, Gym, Dining, Emergency) for this month. Prevents accidental overspending.
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 border border-amber-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                3. Savings & Locked FDs
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">Protected Assets</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Fixed deposits, term instruments, and high-yield savings with maturity dates. Completely isolated from your daily spendable cash.
              </p>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 border border-purple-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                4. Card Liabilities
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">Real-Time Utilization</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Track outstanding card statements with an automated &lt;30% utilization guideline. Settle bills without ledger distortion.
              </p>
            </div>
          </div>

          {/* Pillar 5 */}
          <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 border border-orange-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                5. Actual Debts
              </span>
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                <CalendarClock className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">External Obligations</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                External loans, personal borrowings, and lender liabilities. Track monthly installments and targeted payoff horizons.
              </p>
            </div>
          </div>

          {/* Pillar 6 */}
          <div className="glass-card glass-card-interactive rounded-2xl p-5 space-y-3 border border-cyan-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                6. Monthly Targets
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Target className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-white">Forward Planning</div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Aspirational saving targets (e.g. Travel, Laptop). Clearly identified as future goals so they don&apos;t prematurely deduct liquid balances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Deep-Dive Capabilities Grid */}
      <section id="subsystems" className="space-y-8 scroll-mt-24">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Engineered for Precision & Convenience
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            Four specialized subsystems designed to automate routine budgeting while preserving accounting truth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Subsystem 1: Envelope Rollover */}
          <div className="glass-card glass-card-interactive p-6 rounded-2xl border border-white/5 space-y-4 hover:border-sky-500/30 group">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Custom Rollover Policies</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Choose how unspent money behaves at month-end. Configure envelopes with:
              </p>
            </div>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Carry Forward:</strong> Accumulate unspent funds for periodic expenses (Birthdays, Holidays).</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span><strong>Sweep to Regular:</strong> Automatically sweep dining/entertainment surpluses back into your general balance.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span><strong>Reset:</strong> Zero out for fixed allocations each month.</span>
              </li>
            </ul>
          </div>

          {/* Subsystem 2: Bank Statement Reconciliation */}
          <div className="glass-card glass-card-interactive p-6 rounded-2xl border border-white/5 space-y-4 hover:border-emerald-500/30 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Scale className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Audited Bank Statement Reconciliation</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Compare your physical bank statement closing balance against your ledger.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Zero-Silent Overwrites:</strong> Never corrupt past transactions to force a balance to match.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Formal Adjustments:</strong> Logs surplus or deficit adjustment transactions with mandatory reasons.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Permanent Audit Trail:</strong> Review timestamped reconciliation history directly in the app.</span>
              </li>
            </ul>
          </div>

          {/* Subsystem 3: Self EMIs & Credit Health */}
          <div className="glass-card glass-card-interactive p-6 rounded-2xl border border-white/5 space-y-4 hover:border-purple-500/30 group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Self EMIs & Credit Safety</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Smart liability controls that prevent credit card traps and savings depletion.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span><strong>Self EMIs:</strong> When borrowing from emergency savings for a big purchase, set an EMI schedule to reimburse yourself.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span><strong>Credit Health Gauge:</strong> Visual alerts if utilization exceeds 30% to protect credit score.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <span><strong>Bill Settle RPC:</strong> Settle card bills with atomic double-entry updates across bank and card.</span>
              </li>
            </ul>
          </div>

          {/* Subsystem 4: Standing Schedules */}
          <div className="glass-card glass-card-interactive p-6 rounded-2xl border border-white/5 space-y-4 hover:border-indigo-500/30 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Repeat className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">1-Click Recurring Expenses</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Eliminate the repetitive monthly friction of manual data entry.
              </p>
            </div>
            <ul className="space-y-2 text-xs text-neutral-300">
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span><strong>Standing Rules:</strong> Configure monthly obligations like Rent, Broadband, Maid, and Gym.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span><strong>Smart Due Detection:</strong> Envello automatically detects expenses due for the active cycle.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span><strong>1-Click Log All:</strong> Record all pending monthly expenses into the ledger in one touch.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Budget Simulator */}
      <section id="simulator" className="p-6 sm:p-8 rounded-3xl bg-neutral-900/70 border border-white/10 space-y-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
              <Sliders className="w-3.5 h-3.5" />
              <span>Interactive Demonstration</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Experience True Envelope Allocation
            </h3>
            <p className="text-xs text-neutral-400">
              In envelope budgeting, every rupee of income is assigned a clear job before the month begins.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-white/5 space-y-1.5 flex-shrink-0 sm:text-right">
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Monthly Income</span>
              <div className="flex gap-1">
                {[50000, 85000, 150000].map((inc) => (
                  <button
                    key={inc}
                    onClick={() => setSimulatorIncomeRupees(inc)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono transition ${
                      simulatorIncomeRupees === inc
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-white/5'
                    }`}
                  >
                    ₹{inc >= 100000 ? `${inc / 100000}L` : `${inc / 1000}k`}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {formatINR(totalPaise)}
            </div>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
          {/* Essentials */}
          <div className="space-y-2 p-4 rounded-xl bg-neutral-950/60 border border-white/5">
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
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="text-xs font-mono text-neutral-400 text-right">
              {formatINR(essentialsPaise)}
            </div>
          </div>

          {/* Savings */}
          <div className="space-y-2 p-4 rounded-xl bg-neutral-950/60 border border-white/5">
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
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="text-xs font-mono text-neutral-400 text-right">
              {formatINR(savingsPaise)}
            </div>
          </div>

          {/* Lifestyle */}
          <div className="space-y-2 p-4 rounded-xl bg-neutral-950/60 border border-white/5">
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
              className="w-full accent-purple-400 cursor-pointer"
            />
            <div className="text-xs font-mono text-neutral-400 text-right">
              {formatINR(lifestylePaise)}
            </div>
          </div>
        </div>

        {/* Allocation status bar */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-neutral-400">Unallocated Buffer:</span>
            <span
              className={`font-mono font-bold text-sm ${
                unallocatedPaise >= 0n ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatINR(unallocatedPaise)}
            </span>
            <span className="text-neutral-500">
              ({unallocatedPaise >= 0n ? 'Available for emergency reserves' : 'Over-allocated by ' + formatINR(-unallocatedPaise)})
            </span>
          </div>

          <button
            onClick={onOpenAuthModal}
            className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-medium border border-sky-500/30 transition flex items-center space-x-1"
          >
            <span>Set up your envelopes</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 5. Final CTA Banner */}
      <section className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-sky-950/70 via-indigo-950/60 to-purple-950/70 border border-sky-500/30 text-center space-y-6 overflow-hidden shadow-2xl">
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready for True Financial Sovereignty?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300">
            Sign in with your Google account to access your private financial ledger and begin zero-based budgeting today.
          </p>
        </div>

        <div>
          <button
            onClick={onOpenAuthModal}
            className="px-8 py-3.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-sm transition-all duration-200 active:scale-95 shadow-xl shadow-white/10 hover:shadow-white/20 inline-flex items-center space-x-2"
          >
            <span>Sign In to Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-neutral-400 mt-2">
            Secure Cloud • Row Level Security Guarded
          </p>
        </div>
      </section>
    </div>
  );
};
