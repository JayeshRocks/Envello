import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Power,
  Layers,
  Landmark,
  Check,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import type { RecurringRule, CreateRecurringRuleParams } from '@/types/recurring.types';
import type { AccountItem } from '@/lib/api/accounts';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';

interface RecurringSectionProps {
  rules: RecurringRule[];
  dueRules: RecurringRule[];
  totalDuePaise: bigint;
  totalMonthlyPaise: bigint;
  currentYearMonth: string;
  accounts: AccountItem[];
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
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');
  const [envelopeId, setEnvelopeId] = useState(envelopes[0]?.id || '');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggingRuleId, setLoggingRuleId] = useState<string | null>(null);
  const [isLoggingAll, setIsLoggingAll] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const effectiveAccId = accountId || activeAccounts[0]?.id;
    const effectiveEnvId = envelopeId || envelopes[0]?.id;

    if (!title.trim() || !amountStr.trim() || !effectiveAccId || !effectiveEnvId) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const amountPaise = toPaise(amountStr);
      await onAddRule({
        title: title.trim(),
        amountPaise,
        accountId: effectiveAccId,
        envelopeId: effectiveEnvId,
        dayOfMonth: Number(dayOfMonth),
      });

      setTitle('');
      setAmountStr('');
      setIsAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recurring rule.');
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Standing Monthly Costs & Bills</h3>
            <span className="text-xs text-neutral-400">({activeRules.length} active)</span>
          </div>
          <p className="text-xs text-neutral-400">
            Total Monthly Commitment:{' '}
            <span className="font-mono text-indigo-400 font-semibold">{formatINR(totalMonthlyPaise)}</span> / mo
            {dueRules.length > 0 && (
              <>
                {' '}• Due this cycle:{' '}
                <span className="font-mono text-amber-400 font-semibold">{formatINR(totalDuePaise)}</span> ({dueRules.length} pending)
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              if (!accountId && activeAccounts[0]) setAccountId(activeAccounts[0].id);
              if (!envelopeId && envelopes[0]) setEnvelopeId(envelopes[0].id);
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
                Pay From (Bank Account)
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institution})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 text-xs font-medium mb-1">
                Assign to Envelope
              </label>
              <select
                value={envelopeId}
                onChange={(e) => setEnvelopeId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              >
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
              if (!accountId && activeAccounts[0]) setAccountId(activeAccounts[0].id);
              if (!envelopeId && envelopes[0]) setEnvelopeId(envelopes[0].id);
              setIsAdding(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition active:scale-95"
          >
            Create Your First Recurring Rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => {
            const isLoggedThisMonth = rule.lastLoggedYearMonth === currentYearMonth;
            const isDue = rule.isActive && !isLoggedThisMonth;
            const envelope = envelopes.find((e) => e.id === rule.envelopeId);
            const account = accounts.find((a) => a.id === rule.accountId);

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
                  {envelope && (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-sky-400 border border-white/5 flex items-center space-x-1 flex-shrink-0">
                      <Layers className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[100px]">{envelope.name}</span>
                    </span>
                  )}
                  {account && (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-400 border border-white/5 flex items-center space-x-1 flex-shrink-0">
                      <Landmark className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[100px]">{account.name}</span>
                    </span>
                  )}
                </div>

                {/* Status & Actions footer */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <div>
                    {isLoggedThisMonth ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Logged ({currentYearMonth})</span>
                      </span>
                    ) : isDue ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] text-amber-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due this month</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-500">Inactive</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Log button */}
                    {isDue && (
                      <button
                        onClick={() => handleLogSingle(rule)}
                        disabled={loggingRuleId === rule.id}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1 transition active:scale-95 disabled:opacity-50 min-h-[32px]"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>{loggingRuleId === rule.id ? 'Logging...' : 'Log'}</span>
                      </button>
                    )}

                    {/* Pause/Activate toggle */}
                    <button
                      onClick={() => onToggleActive(rule.id)}
                      title={rule.isActive ? 'Pause Rule' : 'Activate Rule'}
                      className={`p-1.5 rounded-lg border text-xs transition active:scale-95 min-h-[32px] min-w-[32px] flex items-center justify-center ${
                        rule.isActive
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-white/5'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete rule */}
                    {deleteConfirmId === rule.id ? (
                      <div className="inline-flex items-center space-x-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-lg">
                        <button
                          onClick={async () => {
                            await onDeleteRule(rule.id);
                            setDeleteConfirmId(null);
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 hover:text-white transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(rule.id)}
                        title="Delete Standing Rule"
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 border border-transparent transition active:scale-95 min-h-[32px] min-w-[32px] flex items-center justify-center"
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

