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
  CreditCard,
  Landmark,
  Repeat,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import type { RecurringRule, CreateRecurringRuleParams, RecurringFrequencyType } from '@/types/recurring.types';
import type { AccountItem } from '@/lib/api/accounts';
import type { CreditCardRow } from '@/lib/api/creditCards';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useConfirm } from '@/context/ConfirmContext';
import {
  getRecurringRuleDueStatus,
  formatFrequencyLabel,
  formatOrdinal,
  formatShortDate,
} from '@/lib/accounting/recurringSchedule';

interface RecurringRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RecurringRule[];
  accounts: AccountItem[];
  creditCards?: CreditCardRow[];
  envelopes: EnvelopeWithAllocation[];
  currentYearMonth?: string;
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
  creditCards = [],
  envelopes,
  currentYearMonth: _currentYearMonth,
  onAddRule,
  onToggleActive,
  onDeleteRule,
  onLogSingleRule,
}) => {
  const activeAccounts = accounts.filter((a) => a.isActive);

  const [isAdding, setIsAdding] = useState(false);
  const confirm = useConfirm();
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
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isCard = paymentSource.startsWith('card:');
    const sourceId = paymentSource.replace(/^(account|card):/, '');

    if (!title.trim() || !amountStr.trim() || !sourceId) {
      setError('Please fill in all required fields.');
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

  // Live preview for due date in modal form
  const previewDueDate = (() => {
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
  })();

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      >
        <div className="max-w-2xl w-full bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 border border-white/15 shadow-2xl relative max-h-[90vh] sm:max-h-[88vh] overflow-y-auto modal-panel">
          <button
            onClick={onClose}
            aria-label="Close Recurring Rules Modal"
            className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Automated Schedule</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">Recurring Costs & Standing SIs</h3>
            <p className="text-xs text-neutral-400">
              Set the cost of your items and how often you need them (every X days or a monthly date). Envello alerts you when they are due to be logged into your ledger.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
            {rules.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl space-y-2 bg-white/[0.01]">
                <CalendarClock className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs font-semibold text-neutral-300">No recurring rules configured</p>
                <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                  Add recurring items you buy every X days (water cans, protein, groceries) or bills due on monthly dates (rent, broadband).
                </p>
              </div>
            ) : (
              rules.map((rule) => {
                const dueStatus = getRecurringRuleDueStatus(rule);
                const isDue = dueStatus.isDue;
                const isCard = rule.sourceType === 'card';
                const account = !isCard ? accounts.find((a) => a.id === rule.accountId) : null;
                const card = isCard ? creditCards.find((c) => c.id === rule.cardId) : null;
                const envelope = rule.envelopeId ? envelopes.find((e) => e.id === rule.envelopeId) : null;
                const isLogging = loggingRuleId === rule.id;

                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDue
                        ? 'bg-amber-500/[0.04] border-amber-500/30'
                        : 'bg-neutral-900/80 border-white/10 hover:border-white/20'
                    } ${!rule.isActive ? 'opacity-60 bg-neutral-900/30' : ''}`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white truncate">{rule.title}</span>
                        <span className="text-sm font-mono font-bold text-indigo-300 tabular-nums">
                          {formatINR(rule.amountPaise)}
                        </span>
                        {!rule.isActive && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-white/5">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-indigo-300/90">{formatFrequencyLabel(rule)}</span>
                        <span>•</span>
                        <span className="inline-flex items-center space-x-1">
                          {isCard ? (
                            <>
                              <CreditCard className="w-3 h-3 text-purple-400 inline" />
                              <span className="text-purple-300">{card ? card.card_name : 'Card'}</span>
                            </>
                          ) : (
                            <>
                              <Landmark className="w-3 h-3 text-sky-400 inline" />
                              <span className="text-sky-300">{account ? account.name : 'Account'}</span>
                            </>
                          )}
                        </span>
                        <span>→</span>
                        <span className="text-neutral-300 font-medium">
                          {envelope ? envelope.name : 'Direct Bill'}
                        </span>
                      </div>

                      {/* Schedule status pill */}
                      <div className="pt-0.5">
                        <span
                          className={`inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${
                            isDue
                              ? 'bg-amber-500/15 text-amber-300 font-semibold'
                              : dueStatus.isLoggedCurrentPeriod
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isDue ? (
                            <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                          ) : dueStatus.isLoggedCurrentPeriod ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Calendar className="w-3 h-3 text-neutral-500" />
                          )}
                          <span>{dueStatus.formattedDueDate}</span>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons: Verified 44px min touch targets */}
                    <div className="flex items-center space-x-1.5 self-end sm:self-center flex-shrink-0">
                      {isDue ? (
                        <button
                          onClick={() => handleLogSingle(rule)}
                          disabled={isLogging || !rule.isActive}
                          className="px-3.5 py-2 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Post to ledger"
                        >
                          {isLogging ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                          <span>Log Expense</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLogSingle(rule)}
                          disabled={isLogging || !rule.isActive}
                          className="px-3 py-2 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-medium transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-40 cursor-pointer"
                          title="Post early ahead of schedule"
                        >
                          <span>Log Early</span>
                        </button>
                      )}

                      <button
                        onClick={() => onToggleActive(rule.id)}
                        className={`p-2.5 rounded-xl border transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 cursor-pointer ${
                          rule.isActive
                            ? 'border-white/10 text-neutral-400 hover:text-amber-400 hover:bg-white/5'
                            : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={rule.isActive ? 'Pause rule' : 'Activate rule'}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: 'Delete Recurring Rule',
                            message: `Are you sure you want to delete "${rule.title}"?`,
                            details: 'Future automated postings and due notifications for this rule will be stopped.',
                            confirmText: 'Delete Rule',
                            cancelText: 'Cancel',
                            variant: 'danger',
                          });
                          if (confirmed) {
                            onDeleteRule(rule.id);
                          }
                        }}
                        className="p-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Rule Form */}
          {isAdding ? (
            <form onSubmit={handleCreate} className="p-4 sm:p-5 rounded-2xl bg-neutral-950/80 border border-indigo-500/30 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Configure Recurring Item</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition min-h-[36px]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-300">Item or Bill Name</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Water Cans, Rent, Protein, WiFi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-300">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-base sm:text-sm font-mono text-white focus:outline-none focus:border-indigo-500 tabular-nums"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Frequency selection */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-white flex items-center space-x-1.5">
                    <Repeat className="w-3.5 h-3.5 text-indigo-400" />
                    <span>How often do you need it?</span>
                  </label>

                  <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-white/10 gap-1">
                    <button
                      type="button"
                      onClick={() => setFrequencyType('interval_days')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 min-h-[36px] cursor-pointer ${
                        frequencyType === 'interval_days'
                          ? 'bg-indigo-600 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Every X Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrequencyType('monthly_day')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 min-h-[36px] cursor-pointer ${
                        frequencyType === 'monthly_day'
                          ? 'bg-indigo-600 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Day of Month
                    </button>
                  </div>
                </div>

                {frequencyType === 'interval_days' ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-neutral-300">Repeat every</span>
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={intervalDays}
                          onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 bg-neutral-900 border border-white/20 rounded-xl px-3 py-2 text-base sm:text-sm text-white font-mono text-center focus:border-indigo-500"
                          required
                        />
                        <span className="text-xs text-neutral-300 font-medium">days</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] text-neutral-400">Start Date:</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-neutral-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[7, 14, 15, 30, 60].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setIntervalDays(d)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition min-h-[36px] cursor-pointer ${
                            intervalDays === d
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                              : 'bg-neutral-900 text-neutral-400 border-white/5'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-indigo-300 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 flex items-center justify-between">
                      <span>Repeats every {intervalDays} days</span>
                      <span className="font-mono">Next: {previewDueDate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-neutral-300">Day of month</span>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-20 bg-neutral-900 border border-white/20 rounded-xl px-3 py-2 text-base sm:text-sm text-white font-mono text-center focus:border-indigo-500"
                        required
                      />
                      <span className="text-xs text-neutral-300 font-medium">
                        {formatOrdinal(dayOfMonth)} of each month
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1, 5, 10, 15, 25, 31].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDayOfMonth(d)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition min-h-[36px] cursor-pointer ${
                            dayOfMonth === d
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold'
                              : 'bg-neutral-900 text-neutral-400 border-white/5'
                          }`}
                        >
                          {formatOrdinal(d)}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-indigo-300 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 flex items-center justify-between">
                      <span>{formatOrdinal(dayOfMonth)} of every month</span>
                      <span className="font-mono">Next: {previewDueDate}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment & Envelope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-300">Payment Method</label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
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

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-300">Envelope Category</label>
                  <select
                    value={envelopeId}
                    onChange={(e) => setEnvelopeId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="none">None (Direct Bill / No Envelope)</option>
                    {envelopes.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition min-h-[44px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Recurring Rule</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (activeAccounts.length === 0 && creditCards.length === 0) {
                  setError('Please create an account or add a credit card first before adding recurring rules.');
                  return;
                }
                if (!paymentSource) {
                  setPaymentSource(activeAccounts[0] ? `account:${activeAccounts[0].id}` : `card:${creditCards[0].id}`);
                }
                setIsAdding(true);
              }}
              className="w-full py-3 rounded-xl border border-dashed border-white/15 hover:border-indigo-400/50 hover:bg-white/5 text-neutral-300 hover:text-white text-xs sm:text-sm font-medium transition flex items-center justify-center space-x-2 min-h-[44px] active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Add Recurring Cost or Supply</span>
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
