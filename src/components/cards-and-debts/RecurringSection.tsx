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
} from 'lucide-react';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import type { RecurringRule, CreateRecurringRuleParams } from '@/types/recurring.types';
import type { AccountItem } from '@/lib/api/accounts';
import type { CreditCardRow } from '@/lib/api/creditCards';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';

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
  currentYearMonth,
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
  const [paymentSource, setPaymentSource] = useState(
    activeAccounts[0] ? `account:${activeAccounts[0].id}` : (creditCards[0] ? `card:${creditCards[0].id}` : '')
  );
  const [envelopeId, setEnvelopeId] = useState('none');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggingRuleId, setLoggingRuleId] = useState<string | null>(null);
  const [isLoggingAll, setIsLoggingAll] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isCard = paymentSource.startsWith('card:');
    const sourceId = paymentSource.replace(/^(account|card):/, '');

    if (!title.trim() || !amountStr.trim() || !sourceId) {
      setError('Please provide a title, amount, and payment method.');
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
        dayOfMonth: Number(dayOfMonth),
      });

      setTitle('');
      setAmountStr('');
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
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CalendarClock className="w-5 h-5 text-indigo-400" />
              <span>Standing Monthly Costs & SIs</span>
            </h3>
            {activeRules.length > 0 && (
              <span className="text-xs font-mono font-medium text-neutral-400">
                ({formatINR(totalMonthlyPaise)}/mo)
              </span>
            )}
            {dueRules.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                {dueRules.length} due ({formatINR(totalDuePaise)})
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400">
            Automated recurring bills (Rent, Utilities, Subscriptions, Maid). Due rules can be logged with 1-click.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {dueRules.length > 0 && (
            <button
              onClick={handleLogAll}
              disabled={isLoggingAll}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition shadow-sm active:scale-95 disabled:opacity-50 flex items-center space-x-1.5 min-h-[38px]"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 transition active:scale-95 min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Cancel' : 'Add Recurring Cost'}</span>
          </button>
        </div>
      </div>

      {/* Add Rule Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="glass-card rounded-2xl p-4 sm:p-5 border border-indigo-500/30 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
              <CalendarClock className="w-4 h-4 text-indigo-400" />
              <span>New Standing Monthly Rule</span>
            </h4>
            <span className="text-[11px] text-neutral-400">Automates regular monthly expenses</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-400 text-xs font-medium mb-1">
                Expense Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. WiFi, Rent, Netflix, Gym"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-neutral-400 text-xs font-medium mb-1">
                Monthly Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono text-base sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-neutral-400 text-xs font-medium mb-1">
                Due Day of Month (1 - 31)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-400 text-xs font-medium mb-1">
                Payment Method
              </label>
              <select
                value={paymentSource}
                onChange={(e) => setPaymentSource(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
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

            <div>
              <label className="block text-neutral-400 text-xs font-medium mb-1">
                Assign to Envelope (Optional)
              </label>
              <select
                value={envelopeId}
                onChange={(e) => setEnvelopeId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="none">None (Direct Bill / No Envelope)</option>
                {envelopes.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end space-x-2 pt-2 sm:pt-0">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Standing Rule'}
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-2 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Rules Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading standing costs...</div>
      ) : rules.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="text-xs text-neutral-400">
            No recurring expenses configured. Track monthly rent, subscriptions, utilities, and standing bills.
          </div>
          <button
            onClick={() => {
              if (!paymentSource) {
                setPaymentSource(activeAccounts[0] ? `account:${activeAccounts[0].id}` : (creditCards[0] ? `card:${creditCards[0].id}` : ''));
              }
              setIsAdding(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition active:scale-95 min-h-[38px]"
          >
            Create Your First Recurring Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => {
            const isLoggedThisMonth = rule.lastLoggedYearMonth === currentYearMonth;
            const isDue = rule.isActive && !isLoggedThisMonth;
            const isCard = rule.sourceType === 'card';
            const envelope = rule.envelopeId ? envelopes.find((e) => e.id === rule.envelopeId) : null;
            const account = !isCard ? accounts.find((a) => a.id === rule.accountId) : null;
            const card = isCard ? creditCards.find((c) => c.id === rule.cardId) : null;

            return (
              <div
                key={rule.id}
                className={`glass-card glass-card-interactive rounded-2xl p-5 border relative overflow-hidden space-y-3.5 transition group ${
                  isDue
                    ? 'border-amber-500/30 hover:border-amber-500/50'
                    : 'border-white/10 hover:border-indigo-500/30'
                } ${!rule.isActive ? 'opacity-60 bg-neutral-900/40' : ''}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition">
                        {rule.title}
                      </span>
                      {!rule.isActive && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center space-x-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      <span>Due on {rule.dayOfMonth}th of month</span>
                    </div>
                  </div>

                  {/* Monthly Amount */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold font-mono text-white tabular-nums">
                      {formatINR(rule.amountPaise)}
                    </div>
                    <div className="text-[10px] text-neutral-500">per month</div>
                  </div>
                </div>

                {/* Tags row: Account & Envelope */}
                <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none flex-nowrap text-[10px]">
                  {envelope ? (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-sky-400 border border-white/5 flex items-center space-x-1 flex-shrink-0">
                      <Layers className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[100px]">{envelope.name}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800/40 text-neutral-400 border border-white/5 flex items-center space-x-1 flex-shrink-0">
                      <span>Direct Bill</span>
                    </span>
                  )}
                  {isCard ? (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center space-x-1 flex-shrink-0">
                      <CreditCard className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[100px]">{card ? card.card_name : 'Card'}</span>
                    </span>
                  ) : account ? (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-400 border border-white/5 flex items-center space-x-1 flex-shrink-0">
                      <Landmark className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[100px]">{account.name}</span>
                    </span>
                  ) : null}
                </div>

                {/* Status & Actions footer */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    {isLoggedThisMonth ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Logged for {currentYearMonth}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-amber-400 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending for {currentYearMonth}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {isDue && (
                      <button
                        onClick={() => handleLogSingle(rule)}
                        disabled={loggingRuleId === rule.id}
                        className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition active:scale-95 disabled:opacity-50 flex items-center space-x-1"
                        title="Log this expense into ledger"
                      >
                        <Check className="w-3 h-3" />
                        <span>{loggingRuleId === rule.id ? 'Logging...' : 'Log'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onToggleActive(rule.id)}
                      className={`p-1.5 rounded-lg border transition ${
                        rule.isActive
                          ? 'border-white/5 text-neutral-400 hover:text-amber-400 hover:bg-white/5'
                          : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={rule.isActive ? 'Pause rule' : 'Resume rule'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {deleteConfirmId === rule.id ? (
                      <div className="flex items-center space-x-1 bg-red-500/10 border border-red-500/30 rounded-lg p-0.5">
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-red-300 hover:text-white"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1 py-0.5 text-[10px] text-neutral-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(rule.id)}
                        className="p-1.5 rounded-lg border border-white/5 text-neutral-400 hover:text-red-400 hover:bg-white/5 transition"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
