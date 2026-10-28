import React, { useState } from 'react';
import {
  CalendarClock,
  X,
  Plus,
  Check,
  Trash2,
  Power,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import type { RecurringRule, CreateRecurringRuleParams } from '@/types/recurring.types';
import type { AccountItem } from '@/lib/api/accounts';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface RecurringRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RecurringRule[];
  accounts: AccountItem[];
  envelopes: EnvelopeWithAllocation[];
  currentYearMonth: string;
  onAddRule: (params: CreateRecurringRuleParams) => Promise<void>;
  onToggleActive: (ruleId: string) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onLogSingleRule: (rule: RecurringRule) => Promise<void>;
}

export const RecurringRulesModal: React.FC<RecurringRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  accounts,
  envelopes,
  currentYearMonth,
  onAddRule,
  onToggleActive,
  onDeleteRule,
  onLogSingleRule,
}) => {
  const activeAccounts = accounts.filter(a => a.isActive);

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');
  const [envelopeId, setEnvelopeId] = useState(envelopes[0]?.id || '');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggingRuleId, setLoggingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !amountStr.trim() || !accountId || !envelopeId) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const amountPaise = toPaise(amountStr);
      await onAddRule({
        title: title.trim(),
        amountPaise,
        accountId,
        envelopeId,
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

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
    >
      <div className="max-w-xl w-full glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 border border-white/15 shadow-2xl relative max-h-[90vh] sm:max-h-[88vh] overflow-y-auto modal-panel">
        <button
          onClick={onClose}
          aria-label="Close Recurring Rules Modal"
          className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Standing Schedules & Recurring Rules</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Monthly Recurring Expenses</h2>
          <p className="text-xs text-neutral-400">
            Define recurring expenses like Rent, WiFi, and Gym. Envello tracks them monthly and provides 1-click recording into your ledger.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Existing Rules List */}
        <div className="space-y-2.5">
          {rules.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-neutral-900/30 border border-white/5 space-y-2">
              <CalendarClock className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs font-medium text-neutral-300">No recurring rules configured</p>
              <p className="text-[11px] text-neutral-500">
                Add standing rules for your recurring expenses (Rent, Maid, Subscriptions) to enable 1-click recording every month.
              </p>
            </div>
          ) : (
            rules.map((rule) => {
              const account = accounts.find((a) => a.id === rule.accountId);
              const envelope = envelopes.find((e) => e.id === rule.envelopeId);
              const isLoggedThisMonth = rule.lastLoggedYearMonth === currentYearMonth;
              const isLogging = loggingRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    rule.isActive
                      ? 'bg-neutral-900/80 border-white/5 hover:border-white/15'
                      : 'bg-neutral-900/30 border-white/5 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white">{rule.title}</span>
                      <span className="text-sm font-mono font-bold text-indigo-300">
                        {formatINR(rule.amountPaise)}
                      </span>
                      {!rule.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-1.5">
                      <span>Day {rule.dayOfMonth} of month</span>
                      <span>•</span>
                      <span>{account ? account.name : 'Unknown Account'}</span>
                      <span>→</span>
                      <span className="text-neutral-300 font-medium">{envelope ? envelope.name : 'Envelope'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {/* Status / Log Action */}
                    {isLoggedThisMonth ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" />
                        <span>Logged</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleLogSingle(rule)}
                        disabled={isLogging || !rule.isActive}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium transition flex items-center space-x-1 shadow-sm disabled:opacity-50"
                        title="Log into ledger for current month"
                      >
                        {isLogging ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Log for Month</span>
                      </button>
                    )}

                    {/* Pause / Resume Button */}
                    <button
                      onClick={() => onToggleActive(rule.id)}
                      className={`p-1.5 rounded-lg text-xs transition ${
                        rule.isActive
                          ? 'text-neutral-400 hover:text-amber-400 hover:bg-white/5'
                          : 'text-neutral-500 hover:text-emerald-400 hover:bg-white/5'
                      }`}
                      title={rule.isActive ? 'Pause Rule' : 'Activate Rule'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/5 transition"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Rule Form */}
        {isAdding ? (
          <form onSubmit={handleCreate} className="p-4 rounded-xl bg-neutral-900/60 border border-indigo-500/30 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Add New Standing Rule</span>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-300">Expense Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Apartment Rent, WiFi"
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-300">Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-base sm:text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-300">Source Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-300">Envelope Category</label>
                <select
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {envelopes.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-neutral-300 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  <span>Day of Month</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-base sm:text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Standing Rule</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (activeAccounts.length === 0) {
                setError('Please create a liquid account first before adding recurring rules.');
                return;
              }
              if (!accountId && activeAccounts[0]) setAccountId(activeAccounts[0].id);
              if (!envelopeId && envelopes[0]) setEnvelopeId(envelopes[0].id);
              setIsAdding(true);
            }}
            className="w-full py-2.5 rounded-xl border border-dashed border-white/15 hover:border-indigo-400/50 hover:bg-white/5 text-neutral-300 hover:text-white text-xs font-medium transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Standing Rule</span>
          </button>
        )}
      </div>
    </div>
  );
};
