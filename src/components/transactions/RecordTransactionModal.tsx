import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  AlertCircle,
  ArrowRight,
  Calendar,
  CreditCard,
  Wallet,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import type { AccountItem } from '@/lib/api/accounts';
import type { CreditCardRow } from '@/lib/api/creditCards';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { toPaise, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useFabMorphAnimation } from '@/hooks/useFabMorphAnimation';

interface RecordTransactionModalProps {
  isOpen: boolean;
  accounts: AccountItem[];
  creditCards?: CreditCardRow[];
  envelopes: EnvelopeWithAllocation[];
  onClose: () => void;
  onRecordExpense: (params: {
    accountId?: string | null;
    cardId?: string | null;
    envelopeId?: string | null;
    amountPaise: bigint;
    payee: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  onRecordIncome: (params: {
    accountId: string;
    envelopeId?: string | null;
    amountPaise: bigint;
    source: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  onRecordTransfer: (params: {
    fromAccountId: string;
    toAccountId: string;
    amountPaise: bigint;
    description: string;
    date: string;
  }) => Promise<void>;
}

type TxMode = 'expense' | 'income' | 'transfer';

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  accounts,
  creditCards = [],
  envelopes,
  onClose,
  onRecordExpense,
  onRecordIncome,
  onRecordTransfer,
}) => {
  const [mode, setMode] = useState<TxMode>('expense');
  const [amountRupees, setAmountRupees] = useState('');
  const [payeeOrSource, setPayeeOrSource] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedPaymentSource, setSelectedPaymentSource] = useState('');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState('none');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [reserveConfirmed, setReserveConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isRendered,
    formStyle,
    backdropStyle,
    requestClose,
  } = useFabMorphAnimation({
    isOpen,
    fabId: 'mobile-record-fab',
    onCompleteClose: onClose,
  });

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isRendered, requestClose);

  // Initialize selected dropdowns when modal opens or lists load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
      if (accounts.length > 1) {
        setToAccountId(accounts[1].id);
      }
    }
    if (!selectedPaymentSource) {
      if (accounts.length > 0) {
        setSelectedPaymentSource('account:' + accounts[0].id);
      } else if (creditCards && creditCards.length > 0) {
        setSelectedPaymentSource('card:' + creditCards[0].id);
      }
    }
  }, [accounts, creditCards, selectedAccountId, selectedPaymentSource, isOpen]);

  // Reset envelope selection and confirmation when modal closes or selection changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEnvelopeId('none');
      setReserveConfirmed(false);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setReserveConfirmed(false);
  }, [selectedEnvelopeId]);

  if (!isRendered) return null;

  const currentEnteredPaise = toPaise(amountRupees || '0');
  const selectedEnvelope = envelopes.find((e) => e.id === selectedEnvelopeId);
  const isEnvelopeSelected = Boolean(selectedEnvelopeId && selectedEnvelopeId !== 'none' && selectedEnvelope);
  const isProtectedEnvelope = mode === 'expense' && Boolean(selectedEnvelope?.isProtected ?? selectedEnvelope?.isSystemReserved);
  const isExpenseExceedingEnvelope =
    mode === 'expense' && isEnvelopeSelected && selectedEnvelope
      ? currentEnteredPaise > selectedEnvelope.availablePaise
      : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentEnteredPaise <= 0n) {
      setError('Please enter an amount greater than zero.');
      return;
    }

    if (mode === 'income' || mode === 'transfer') {
      if (!selectedAccountId) {
        setError('Please select an account.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'expense') {
        const isCard = selectedPaymentSource.startsWith('card:');
        const sourceId = selectedPaymentSource.replace(/^(account|card):/, '');
        if (!sourceId) {
          setError('Please select a payment method.');
          return;
        }

        // Enforce that an expense cannot exceed available envelope balance
        if (isEnvelopeSelected && selectedEnvelope) {
          if (currentEnteredPaise > selectedEnvelope.availablePaise) {
            setError(
              `Expense amount (${formatINR(currentEnteredPaise)}) exceeds available balance in "${selectedEnvelope.name}" (${formatINR(selectedEnvelope.availablePaise)}). Cannot overspend an envelope into negative. Please select "None" for a direct bill or allocate budget first.`
            );
            return;
          }

          if (isProtectedEnvelope && !reserveConfirmed) {
            setError(`Please confirm that you explicitly authorize spending from your protected reserve ("${selectedEnvelope.name}").`);
            return;
          }
        }

        await onRecordExpense({
          accountId: !isCard ? sourceId : undefined,
          cardId: isCard ? sourceId : undefined,
          envelopeId: isEnvelopeSelected ? selectedEnvelopeId : null,
          amountPaise: currentEnteredPaise,
          payee: payeeOrSource.trim() || 'Expense',
          date,
          notes: notes.trim() || undefined,
        });
      } else if (mode === 'income') {
        await onRecordIncome({
          accountId: selectedAccountId,
          envelopeId: isEnvelopeSelected ? selectedEnvelopeId : null,
          amountPaise: currentEnteredPaise,
          source: payeeOrSource.trim() || 'Income',
          date,
          notes: notes.trim() || undefined,
        });
      } else if (mode === 'transfer') {
        if (!toAccountId || toAccountId === selectedAccountId) {
          setError('Please choose a different destination account.');
          return;
        }
        await onRecordTransfer({
          fromAccountId: selectedAccountId,
          toAccountId,
          amountPaise: currentEnteredPaise,
          description: payeeOrSource.trim() || 'Account Transfer',
          date,
        });
      }

      // Reset and trigger smooth morphing close
      setAmountRupees('');
      setPayeeOrSource('');
      setNotes('');
      setSelectedEnvelopeId('none');
      requestClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isRendered) return null;

  return (
    <ModalPortal>
      {/* Modal backdrop with dynamic opacity and blur transition */}
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        style={backdropStyle}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay pointer-events-auto"
      >
        {/* Modal Form Dialog */}
        <div
          style={formStyle}
          onClick={(e) => e.stopPropagation()}
          className="max-w-lg w-full bg-[#0f1011] rounded-2xl sm:rounded-3xl border border-sky-500/25 shadow-[0_0_50px_-10px_rgba(56,189,248,0.3)] relative max-h-[90vh] sm:max-h-[88vh] overflow-y-auto p-5 sm:p-7 space-y-4 sm:space-y-5"
        >
          <button
            type="button"
            onClick={requestClose}
            className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition cursor-pointer z-10"
            title="Close modal"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Record Transaction</h2>
          <p className="text-xs text-neutral-400">
            Double-entry ledger entry. Affects accounts and category envelopes accurately.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-900 border border-white/5 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('expense');
              setSelectedEnvelopeId('none');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg transition min-h-[44px] active:scale-95 ${
              mode === 'expense'
                ? 'bg-rose-500 text-white shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('income');
              setSelectedEnvelopeId('none');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg transition min-h-[44px] active:scale-95 ${
              mode === 'income'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('transfer');
              setSelectedEnvelopeId('none');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg transition min-h-[44px] active:scale-95 ${
              mode === 'transfer'
                ? 'bg-indigo-500 text-white shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
              <span>Amount (₹ INR)</span>
              <span
                className={`text-xs font-mono font-bold ${
                  mode === 'income'
                    ? 'text-emerald-400'
                    : mode === 'expense'
                    ? 'text-rose-400'
                    : 'text-indigo-400'
                }`}
              >
                {formatINR(currentEnteredPaise)}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                required
                autoFocus
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl glass-input text-base font-mono text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500 tabular-nums"
              />
            </div>

            {/* Quick Amount Chips — Wraps seamlessly on mobile & tablet without horizontal scroll */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[100, 200, 500, 1000, 2000, 5000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => {
                    const current = parseFloat(amountRupees) || 0;
                    setAmountRupees((current + quick).toString());
                  }}
                  className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs font-mono font-medium text-neutral-300 hover:text-white border border-white/5 active:scale-95 transition flex items-center justify-center"
                >
                  +₹{quick}
                </button>
              ))}
              {amountRupees && (
                <button
                  type="button"
                  onClick={() => setAmountRupees('')}
                  className="px-2.5 py-1.5 min-h-[36px] rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 font-medium border border-red-500/20 active:scale-95 transition flex items-center justify-center"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Payee / Description / Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              {mode === 'expense' ? 'Payee / Store' : mode === 'income' ? 'Income Source / Payer' : 'Transfer Note'}
            </label>
            <input
              type="text"
              value={payeeOrSource}
              onChange={(e) => setPayeeOrSource(e.target.value)}
              placeholder={
                mode === 'expense'
                  ? 'e.g. Swiggy, Groceries, Amazon'
                  : mode === 'income'
                  ? 'e.g. Monthly Salary, Freelance, Dividend'
                  : 'e.g. ATM Cash Withdrawal, Account to Account'
              }
              required
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Expense: Payment Method (Account or Card) & Optional Envelope */}
          {mode === 'expense' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">Payment Method</label>
                  <select
                    value={selectedPaymentSource}
                    onChange={(e) => setSelectedPaymentSource(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                  >
                    <optgroup label="🏦 Bank Accounts & Cash">
                      {accounts.map((acc) => (
                        <option key={acc.id} value={`account:${acc.id}`} className="bg-neutral-900 text-white">
                          {acc.name} ({formatINR(acc.balancePaise)})
                        </option>
                      ))}
                    </optgroup>
                    {creditCards && creditCards.length > 0 && (
                      <optgroup label="💳 Credit Cards">
                        {creditCards.map((card) => {
                          const availablePaise = BigInt(card.credit_limit_paise) - BigInt(card.outstanding_balance_paise);
                          return (
                            <option key={card.id} value={`card:${card.id}`} className="bg-neutral-900 text-white">
                              {card.card_name} ({formatINR(availablePaise)} available)
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-300">Budget Envelope</label>
                    <span className="text-[10px] text-neutral-400">Optional for direct bills</span>
                  </div>
                  <select
                    value={selectedEnvelopeId}
                    onChange={(e) => setSelectedEnvelopeId(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border focus:ring-1 ${
                      isExpenseExceedingEnvelope
                        ? 'border-red-500/50 focus:ring-red-500'
                        : 'border-white/10 focus:ring-sky-500'
                    }`}
                  >
                    <option value="none" className="bg-neutral-900 text-neutral-400 font-medium">
                      None (Direct Account / Card Bill)
                    </option>
                    {envelopes.map((env) => (
                      <option key={env.id} value={env.id} className="bg-neutral-900 text-white">
                        {env.name} ({formatINR(env.availablePaise)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Real-time Envelope Warning / Info Pill */}
              {isEnvelopeSelected && selectedEnvelope && (
                isExpenseExceedingEnvelope ? (
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                    <span>
                      Exceeds available balance in {selectedEnvelope.name} ({formatINR(selectedEnvelope.availablePaise)}). Envelopes cannot go negative; choose &quot;None&quot; or allocate budget first.
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                      <span>Debits from {selectedEnvelope.name} envelope</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-semibold">{formatINR(selectedEnvelope.availablePaise)} available</span>
                  </div>
                )
              )}

              {/* Protected Reserve Confirmation Banner */}
              {isProtectedEnvelope && selectedEnvelope && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 font-semibold text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Protected Reserve Confirmation</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    "{selectedEnvelope.name}" is designated as a protected reserve. Confirm you explicitly intend to draw funds from it.
                  </p>
                  <label className="flex items-start space-x-2.5 pt-1 cursor-pointer select-none min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={reserveConfirmed}
                      onChange={(e) => setReserveConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-white/20 text-amber-500 focus:ring-amber-500 bg-black/40 cursor-pointer"
                    />
                    <span className="text-[11px] text-amber-200 font-medium">
                      I explicitly confirm spending from {selectedEnvelope.name}.
                    </span>
                  </label>
                </div>
              )}

              {/* Dynamic Payment Impact Pill */}
              {selectedPaymentSource.startsWith('card:') ? (
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 flex-shrink-0 text-purple-400" />
                  <span>Charged to Credit Card. Increases card outstanding debt; liquid cash is untouched.</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs flex items-center space-x-2">
                  <Wallet className="w-4 h-4 flex-shrink-0 text-sky-400" />
                  <span>Paid from Liquid Cash. Directly debits your bank account balance.</span>
                </div>
              )}
            </div>
          )}

          {/* Income: Deposited In Account & Optional Envelope */}
          {mode === 'income' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300">Deposited In Account</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                        {acc.name} ({formatINR(acc.balancePaise)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-neutral-300">Add to Envelope</label>
                    <span className="text-[10px] text-neutral-400">Optional allocation</span>
                  </div>
                  <select
                    value={selectedEnvelopeId}
                    onChange={(e) => setSelectedEnvelopeId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="none" className="bg-neutral-900 text-neutral-400 font-medium">
                      None (Direct Inflow to Account)
                    </option>
                    {envelopes.map((env) => (
                      <option key={env.id} value={env.id} className="bg-neutral-900 text-white">
                        {env.name} ({formatINR(env.availablePaise)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Income Impact Pill */}
              {isEnvelopeSelected && selectedEnvelope ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
                  <Layers className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>
                    Deposited into {accounts.find((a) => a.id === selectedAccountId)?.name || 'account'} AND adds{' '}
                    <span className="font-mono font-semibold text-white">{formatINR(currentEnteredPaise)}</span> directly to{' '}
                    <span className="font-semibold text-white">{selectedEnvelope.name}</span>&apos;s budget allocation.
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs flex items-center space-x-2">
                  <Wallet className="w-4 h-4 flex-shrink-0 text-sky-400" />
                  <span>Direct Inflow to Account. Increases liquid bank cash; envelope allocations remain unassigned.</span>
                </div>
              )}
            </div>
          )}

          {/* Transfer: From Account & To Account */}
          {mode === 'transfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">From Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                      {acc.name} ({formatINR(acc.balancePaise)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">To Account</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                >
                  {accounts
                    .filter((a) => a.id !== selectedAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                        {acc.name} ({formatINR(acc.balancePaise)})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Transaction Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isExpenseExceedingEnvelope ||
                (isProtectedEnvelope && !reserveConfirmed)
              }
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-white text-sm font-semibold transition shadow-lg active:scale-[0.98] min-h-[44px] disabled:opacity-50 ${
                mode === 'income'
                  ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                  : mode === 'expense'
                  ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/25'
                  : 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/25'
              }`}
            >
              <span>
                {isSubmitting
                  ? 'Recording...'
                  : mode === 'expense'
                  ? 'Record Expense'
                  : mode === 'income'
                  ? 'Record Income'
                  : 'Execute Transfer'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
  );
};
