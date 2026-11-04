import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  CreditCard,
  Landmark,
  CheckCircle2,
  Clock,
  Trash2,
  Power,
  Layers,
  Check,
  Calendar,
  AlertCircle,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import type { RecurringRule, CreateRecurringRuleParams, RecurringFrequencyType } from '@/types/recurring.types';
import type { AccountItem } from '@/lib/api/accounts';
import type { CreditCardRow } from '@/lib/api/creditCards';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { useConfirm } from '@/context/ConfirmContext';
import { SkeletonCardsGrid } from '@/components/common/Skeleton';
import {
  getRecurringRuleDueStatus,
  formatFrequencyLabel,
  formatOrdinal,
  formatShortDate,
} from '@/lib/accounting/recurringSchedule';

interface RecurringSectionProps {
  rules: RecurringRule[];
  dueRules: RecurringRule[];
  totalDuePaise: bigint;
  totalMonthlyPaise: bigint;
  currentYearMonth: string;
  accounts: AccountItem[];
  creditCards?: CreditCardRow[];
  envelopes: EnvelopeWithAllocation[];
  isLoading?: boolean;
  onAddRule: (params: CreateRecurringRuleParams) => Promise<void>;
  onToggleActive: (ruleId: string) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onLogSingleRule: (rule: RecurringRule) => Promise<void>;
  onLogAllDue: () => Promise<void>;
}

export const RecurringSection: React.FC<RecurringSectionProps> = ({
  rules,
  dueRules,
  totalDuePaise,
  totalMonthlyPaise,
  currentYearMonth: _currentYearMonth,
  accounts,
  creditCards = [],
  envelopes,
  isLoading,
  onAddRule,
  onToggleActive,
  onDeleteRule,
  onLogSingleRule,
  onLogAllDue,
}) => {
  const activeAccounts = accounts.filter((a) => a.isActive);
  const activeRules = rules.filter((r) => r.isActive);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [frequencyType, setFrequencyType] = useState<RecurringFrequencyType>('interval_days');
  const [intervalDays, setIntervalDays] = useState<number>(15);
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentSource, setPaymentSource] = useState(
    activeAccounts[0] ? `account:${activeAccounts[0].id}` : (creditCards[0] ? `card:${creditCards[0].id}` : '')
  );
  const [envelopeId, setEnvelopeId] = useState('none');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggingRuleId, setLoggingRuleId] = useState<string | null>(null);
  const [isLoggingAll, setIsLoggingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isCard = paymentSource.startsWith('card:');
    const sourceId = paymentSource.replace(/^(account|card):/, '');

    if (!title.trim() || !amountStr.trim() || !sourceId) {
      setError('Please provide an item title, amount, and payment method.');
      return;
    }

    try {
      setIsSubmitting(true);
      const amountPaise = toPaise(amountStr);
      await onAddRule({
        title: title.trim(),
        amountPaise,
        sourceType: isCard ? 'card' : 'account',
        accountId: !isCard ? sourceId : undefined,
        cardId: isCard ? sourceId : undefined,
        envelopeId: envelopeId === 'none' || !envelopeId ? null : envelopeId,
        frequencyType,
        intervalDays: frequencyType === 'interval_days' ? Number(intervalDays) : undefined,
        dayOfMonth: frequencyType === 'monthly_day' ? Number(dayOfMonth) : undefined,
        startDate,
      });

      setTitle('');
      setAmountStr('');
      setIntervalDays(15);
      setDayOfMonth(5);
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recurring rule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogSingle = async (rule: RecurringRule) => {
    try {
      setLoggingRuleId(rule.id);
      await onLogSingleRule(rule);
    } finally {
      setLoggingRuleId(null);
    }
  };

  const handleLogAll = async () => {
    try {
      setIsLoggingAll(true);
      await onLogAllDue();
    } finally {
      setIsLoggingAll(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    await onDeleteRule(ruleId);
  };

  // Preview next due date for the item currently being created
  const previewDueDate = React.useMemo(() => {
    const today = new Date();
    if (frequencyType === 'interval_days') {
      const days = Number(intervalDays) || 15;
      const [y, m, d] = (startDate || today.toISOString().split('T')[0]).split('-').map(Number);
      const base = new Date(y, m - 1, d);
      const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
      return formatShortDate(next, true);
    }
    const day = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
    const year = today.getFullYear();
    const month = today.getMonth();
    const targetThisMonth = new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
    if (today <= targetThisMonth) {
      return formatShortDate(targetThisMonth, true);
    }
    const targetNextMonth = new Date(year, month + 1, Math.min(day, new Date(year, month + 2, 0).getDate()));
    return formatShortDate(targetNextMonth, true);
  }, [frequencyType, intervalDays, dayOfMonth, startDate]);

  return (
    <div id="recurring-section" className="space-y-4 scroll-mt-24">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CalendarClock className="w-5 h-5 text-indigo-400" />
              <span>Standing Costs & Recurring Needs</span>
            </h3>
            {activeRules.length > 0 && (
              <span className="text-xs font-mono font-medium text-neutral-400">
                ({formatINR(totalMonthlyPaise)}/mo normalized)
              </span>
            )}
            {dueRules.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                {dueRules.length} due now ({formatINR(totalDuePaise)})
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400">
            Tell how much each item costs and how often you need it (in number of days or monthly billing day). Envello alerts you exactly when it is due to be logged into your ledger.
          </p>
        </div>

        {/* Action Button Placement - Responsive Layout with 44px min touch target */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          {dueRules.length > 0 && (
            <button
              onClick={handleLogAll}
              disabled={isLoggingAll}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 min-h-[44px] cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isLoggingAll ? 'Logging...' : `Log All Due (${dueRules.length})`}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (!paymentSource) {
                setPaymentSource(activeAccounts[0] ? `account:${activeAccounts[0].id}` : (creditCards[0] ? `card:${creditCards[0].id}` : ''));
              }
              setIsAdding(!isAdding);
            }}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm text-white font-medium shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 transition active:scale-95 min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Cancel' : 'Add Recurring Cost'}</span>
          </button>
        </div>
      </div>

      {/* Reimagined Add Item Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="glass-card rounded-2xl p-4 sm:p-6 border border-indigo-500/40 bg-neutral-900/90 shadow-2xl space-y-5 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <h4 className="text-sm sm:text-base font-semibold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Configure Recurring Cost or Regular Supply</span>
              </h4>
              <p className="text-xs text-neutral-400">
                Specify amount and frequency so Envello can track when it is due for repurchase or payment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition min-h-[36px]"
            >
              Close
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Row 1: Item Name & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-neutral-300 text-xs font-medium">
                  Item or Bill Name
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water Cans (20L), Rent, Protein, WiFi, Maid"
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-300 text-xs font-medium">
                  Item Cost Amount (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-950 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono text-base sm:text-sm tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Frequency Selector (Segmented Selector) */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                  <span>How often do you need this item?</span>
                </label>

                {/* Frequency Mode Segmented Pills */}
                <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-white/10 gap-1">
                  <button
                    type="button"
                    onClick={() => setFrequencyType('interval_days')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 min-h-[36px] flex items-center space-x-1.5 cursor-pointer ${
                      frequencyType === 'interval_days'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>Every X Days</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequencyType('monthly_day')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 min-h-[36px] flex items-center space-x-1.5 cursor-pointer ${
                      frequencyType === 'monthly_day'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>Day of Month</span>
                  </button>
                </div>
              </div>

              {/* Mode A: Interval in Days Input & Quick Presets */}
              {frequencyType === 'interval_days' ? (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-neutral-300">Repeat every</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          required
                          value={intervalDays}
                          onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 bg-neutral-950 border border-white/20 rounded-xl px-3 py-2 text-base sm:text-sm text-white font-mono text-center focus:border-indigo-500"
                        />
                        <span className="text-xs text-neutral-300 font-medium">days</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400">Anchor / Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-neutral-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Preset Cadence Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-neutral-500">Quick presets:</span>
                    {[
                      { label: 'Weekly (7d)', days: 7 },
                      { label: 'Fortnightly (14d)', days: 14 },
                      { label: '15 Days', days: 15 },
                      { label: 'Monthly (30d)', days: 30 },
                      { label: 'Bi-Monthly (60d)', days: 60 },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => setIntervalDays(preset.days)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition min-h-[36px] active:scale-95 cursor-pointer ${
                          intervalDays === preset.days
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-white/5'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-indigo-300/90 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 flex items-center justify-between">
                    <span>Triggers cadence: Repeats every {intervalDays} days</span>
                    <span className="font-mono font-medium">First Due: {previewDueDate}</span>
                  </div>
                </div>
              ) : (
                /* Mode B: Day of Month Input & Quick Presets */
                <div className="space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neutral-300">Triggers on the</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-20 bg-neutral-950 border border-white/20 rounded-xl px-3 py-2 text-base sm:text-sm text-white font-mono text-center focus:border-indigo-500"
                    />
                    <span className="text-xs text-neutral-300 font-medium">
                      {formatOrdinal(dayOfMonth)} of every month
                    </span>
                  </div>

                  {/* Preset Day Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-neutral-500">Quick presets:</span>
                    {[
                      { label: '1st of Month', day: 1 },
                      { label: '5th of Month', day: 5 },
                      { label: '10th of Month', day: 10 },
                      { label: '15th of Month', day: 15 },
                      { label: '25th of Month', day: 25 },
                      { label: 'Month End (31st)', day: 31 },
                    ].map((preset) => (
                      <button
                        key={preset.day}
                        type="button"
                        onClick={() => setDayOfMonth(preset.day)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition min-h-[36px] active:scale-95 cursor-pointer ${
                          dayOfMonth === preset.day
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-white/5'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-[11px] text-indigo-300/90 bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 flex items-center justify-between">
                    <span>Triggers cadence: {formatOrdinal(dayOfMonth)} of each month</span>
                    <span className="font-mono font-medium">Next Due: {previewDueDate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Payment Source & Envelope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-neutral-300 text-xs font-medium">
                  Payment Method
                </label>
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <optgroup label="🏦 Bank Accounts & Cash">
                    {activeAccounts.map((a) => (
                      <option key={a.id} value={`account:${a.id}`}>
                        {a.name} ({a.institution})
                      </option>
                    ))}
                  </optgroup>
                  {creditCards && creditCards.length > 0 && (
                    <optgroup label="💳 Credit Cards">
                      {creditCards.map((c) => (
                        <option key={c.id} value={`card:${c.id}`}>
                          {c.card_name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-300 text-xs font-medium">
                  Assign to Envelope (Optional)
                </label>
                <select
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="none">None (Direct Bill / Unassigned)</option>
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({formatINR(env.availablePaise)} available)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form Action Buttons: 44px min height touch target, high visual contrast */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs sm:text-sm font-medium transition active:scale-95 min-h-[44px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50 min-h-[44px] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Rule...' : 'Save Recurring Rule'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Rules Grid */}
      {isLoading ? (
        <SkeletonCardsGrid count={3} />
      ) : rules.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3 bg-white/[0.01]">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-white">No Recurring Costs Configured</div>
          <div className="text-xs text-neutral-400 max-w-md mx-auto">
            Track supplies you need every X days (water, protein, groceries) or bills due on specific monthly dates (rent, WiFi, subscriptions).
          </div>
          <button
            onClick={() => {
              if (!paymentSource) {
                setPaymentSource(activeAccounts[0] ? `account:${activeAccounts[0].id}` : (creditCards[0] ? `card:${creditCards[0].id}` : ''));
              }
              setIsAdding(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition active:scale-95 min-h-[44px] cursor-pointer"
          >
            Create Your First Recurring Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => {
            const dueStatus = getRecurringRuleDueStatus(rule);
            const isDue = dueStatus.isDue;
            const isCard = rule.sourceType === 'card';
            const envelope = rule.envelopeId ? envelopes.find((e) => e.id === rule.envelopeId) : null;
            const account = !isCard ? accounts.find((a) => a.id === rule.accountId) : null;
            const card = isCard ? creditCards.find((c) => c.id === rule.cardId) : null;

            return (
              <div
                key={rule.id}
                className={`glass-card rounded-2xl p-5 border relative overflow-hidden space-y-4 transition-all duration-200 flex flex-col justify-between ${
                  isDue
                    ? 'border-amber-500/40 bg-amber-500/[0.03] shadow-lg shadow-amber-500/5'
                    : 'border-white/10 hover:border-indigo-500/30'
                } ${!rule.isActive ? 'opacity-60 bg-neutral-900/40' : ''}`}
              >
                {/* Header row */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {rule.title}
                        </span>
                        {!rule.isActive && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-white/5">
                            Paused
                          </span>
                        )}
                      </div>

                      {/* Frequency Badge */}
                      <div className="text-[11px] text-neutral-400 flex items-center space-x-1.5 mt-1 font-mono">
                        <Repeat className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                        <span>{formatFrequencyLabel(rule)}</span>
                      </div>
                    </div>

                    {/* Amount Block */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold font-mono text-white tabular-nums">
                        {formatINR(rule.amountPaise)}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {rule.frequencyType === 'interval_days' ? `per ${rule.intervalDays || 30}d` : 'per month'}
                      </div>
                    </div>
                  </div>

                  {/* Tags row: Account & Envelope */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {envelope ? (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-sky-400 border border-white/5 flex items-center space-x-1 flex-shrink-0 font-medium">
                        <Layers className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{envelope.name}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800/40 text-neutral-400 border border-white/5 flex items-center space-x-1 flex-shrink-0 font-mono">
                        <span>Direct Bill</span>
                      </span>
                    )}

                    {isCard ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center space-x-1 flex-shrink-0 font-medium">
                        <CreditCard className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{card ? card.card_name : 'Card'}</span>
                      </span>
                    ) : account ? (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-300 border border-white/5 flex items-center space-x-1 flex-shrink-0 font-medium">
                        <Landmark className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{account.name}</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Real-Time Due Schedule Banner */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      !rule.isActive
                        ? 'bg-neutral-900 border-white/5 text-neutral-500'
                        : isDue
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : dueStatus.isLoggedCurrentPeriod
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-neutral-900/80 border-white/10 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-medium">
                      {isDue ? (
                        <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
                      ) : dueStatus.isLoggedCurrentPeriod ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      )}
                      <span>{dueStatus.formattedDueDate}</span>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 border border-white/5">
                      {isDue ? 'Triggered' : dueStatus.isLoggedCurrentPeriod ? 'Recorded' : 'Upcoming'}
                    </span>
                  </div>
                </div>

                {/* Verified Button Placements & Touch Ergonomics */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex-1">
                    {isDue ? (
                      <button
                        onClick={() => handleLogSingle(rule)}
                        disabled={loggingRuleId === rule.id}
                        className="w-full px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs sm:text-sm font-semibold transition shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                        title="Post this due expense into your double-entry ledger"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>{loggingRuleId === rule.id ? 'Posting...' : `Log Expense (${formatINR(rule.amountPaise)})`}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLogSingle(rule)}
                        disabled={loggingRuleId === rule.id || !rule.isActive}
                        className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/10 text-xs sm:text-sm font-medium transition active:scale-95 disabled:opacity-40 flex items-center justify-center space-x-1.5 min-h-[44px] cursor-pointer"
                        title="Post early ahead of scheduled due date"
                      >
                        <span>{loggingRuleId === rule.id ? 'Posting...' : 'Log Early'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={() => onToggleActive(rule.id)}
                      className={`p-2.5 rounded-xl border transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer active:scale-95 ${
                        rule.isActive
                          ? 'border-white/10 text-neutral-400 hover:text-amber-400 hover:bg-white/5'
                          : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={rule.isActive ? 'Pause recurring trigger' : 'Resume recurring trigger'}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Delete Recurring Rule',
                          message: `Are you sure you want to delete "${rule.title}"?`,
                          details: 'Future automated transaction postings and due notifications for this rule will be stopped.',
                          confirmText: 'Delete Rule',
                          cancelText: 'Cancel',
                          variant: 'danger',
                        });
                        if (confirmed) {
                          await handleDelete(rule.id);
                        }
                      }}
                      className="p-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer active:scale-95"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
