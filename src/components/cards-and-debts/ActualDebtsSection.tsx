import React, { useState } from 'react';
import { CalendarClock, Plus, CheckCircle, ArrowUpRight, Pencil } from 'lucide-react';
import type { ActualDebtRow, ActualDebtInsert } from '@/lib/api/actualDebts';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import { AddActualDebtModal } from './AddActualDebtModal';
import { EditDebtModal } from './EditDebtModal';

interface ActualDebtsSectionProps {
  actualDebts: ActualDebtRow[];
  accounts: AccountItem[];
  totalRemainingDebtPaise: bigint;
  isLoading: boolean;
  onAddDebt: (params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }) => Promise<void>;
  onPayDebt: (params: {
    debtId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateDebt?: (debtId: string, updates: Partial<ActualDebtInsert>) => Promise<void>;
  onDeleteDebt?: (debtId: string) => Promise<void>;
}

export const ActualDebtsSection: React.FC<ActualDebtsSectionProps> = ({
  actualDebts,
  accounts,
  totalRemainingDebtPaise,
  isLoading,
  onAddDebt,
  onPayDebt,
  onUpdateDebt,
  onDeleteDebt,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [editingDebt, setEditingDebt] = useState<ActualDebtRow | null>(null);
  const [destAccountId, setDestAccountId] = useState<string>(accounts[0]?.id || '');
  const [customAmountRupees, setCustomAmountRupees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeDebts = actualDebts.filter((d) => !d.is_settled);

  const handlePay = async (debt: ActualDebtRow) => {
    if (!destAccountId) return;
    const amt = parseFloat(customAmountRupees) || (debt.monthly_instalment_paise / 100);
    if (isNaN(amt) || amt <= 0) return;

    try {
      setIsSubmitting(true);
      await onPayDebt({
        debtId: debt.id,
        fromAccountId: destAccountId,
        amountPaise: Number(toPaise(amt)),
      });
      setPayingDebtId(null);
      setCustomAmountRupees('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Actual Debts (External Liabilities)</h3>
            <span className="text-xs text-neutral-400">({activeDebts.length} active)</span>
          </div>
          <p className="text-xs text-neutral-400">
            Total Remaining Owed:{' '}
            <span className="font-mono text-orange-400 font-semibold">{formatINR(totalRemainingDebtPaise)}</span>
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs text-white font-medium shadow-lg shadow-orange-600/20 flex items-center space-x-1.5 self-start sm:self-auto transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Debt</span>
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading debts...</div>
      ) : activeDebts.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="text-xs text-neutral-400">Zero external debts recorded. You are debt-free!</div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition"
          >
            Track A Debt or Loan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDebts.map((debt) => {
            const isPaying = payingDebtId === debt.id;
            const progress =
              debt.initial_debt_paise > 0
                ? ((debt.initial_debt_paise - debt.remaining_debt_paise) / debt.initial_debt_paise) * 100
                : 0;

            return (
              <div
                key={debt.id}
                className="glass-card glass-card-interactive rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 hover:border-orange-500/30 group"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs text-neutral-400 font-medium tracking-wide uppercase">
                      Lender / Creditor
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-orange-300 transition">
                      {debt.lender_name}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {progress.toFixed(0)}% Repaid
                    </span>
                    {onUpdateDebt && (
                      <button
                        onClick={() => setEditingDebt(debt)}
                        title="Edit Debt Details"
                        aria-label="Edit Debt Details"
                        className="p-1.5 sm:p-1 min-h-[32px] min-w-[32px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/5 transition"
                      >
                        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Amounts */}
                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-400">Remaining Debt Owed</div>
                  <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {formatINR(debt.remaining_debt_paise)}
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
                    <span>Monthly Instalment:</span>
                    <span className="font-mono text-orange-300 font-medium">
                      {formatINR(debt.monthly_instalment_paise)}
                    </span>
                  </div>
                </div>

                {/* Due Date & Initial */}
                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-[11px] space-y-1 text-neutral-400">
                  <div className="flex items-center justify-between">
                    <span>Initial Loan:</span>
                    <span className="text-neutral-300 font-mono">{formatINR(debt.initial_debt_paise)}</span>
                  </div>
                  {debt.due_date && (
                    <div className="flex items-center justify-between">
                      <span>Target Date:</span>
                      <span className="text-orange-400 font-medium">{debt.due_date}</span>
                    </div>
                  )}
                </div>

                {/* Action footer */}
                <div className="pt-2 border-t border-white/5">
                  {isPaying ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-neutral-400 block mb-1">Pay From Bank:</label>
                        <select
                          value={destAccountId}
                          onChange={(e) => setDestAccountId(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 sm:py-1 text-base sm:text-sm text-white"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.institution})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="any"
                          value={customAmountRupees}
                          onChange={(e) => setCustomAmountRupees(e.target.value)}
                          placeholder={(debt.monthly_instalment_paise / 100).toString()}
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-white font-mono min-h-[44px] sm:min-h-[38px]"
                        />
                        <button
                          onClick={() => handlePay(debt)}
                          disabled={isSubmitting}
                          className="px-4 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-orange-600 hover:bg-orange-500 text-xs sm:text-sm text-white font-medium flex-shrink-0 transition active:scale-95"
                        >
                          {isSubmitting ? '...' : 'Pay'}
                        </button>
                        <button
                          onClick={() => setPayingDebtId(null)}
                          className="p-2.5 sm:p-2 min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center rounded-xl bg-neutral-800 text-xs text-neutral-400 transition active:scale-95"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-orange-400" />
                        <span>Pillar 5 Debt</span>
                      </span>
                      {accounts.length > 0 && (
                        <button
                          onClick={() => {
                            setPayingDebtId(debt.id);
                            if (accounts[0]) setDestAccountId(accounts[0].id);
                            setCustomAmountRupees((debt.monthly_instalment_paise / 100).toString());
                          }}
                          className="text-xs sm:text-sm text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1 py-2 px-3.5 rounded-xl hover:bg-orange-500/10 min-h-[44px] sm:min-h-[38px] transition active:scale-95"
                        >
                          <span>Record Payment</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddActualDebtModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddDebt={async (params) => {
          await onAddDebt(params);
        }}
      />

      {/* Edit Debt Modal */}
      {onUpdateDebt && onDeleteDebt && (
        <EditDebtModal
          isOpen={Boolean(editingDebt)}
          debt={editingDebt}
          onClose={() => setEditingDebt(null)}
          onUpdate={onUpdateDebt}
          onDelete={onDeleteDebt}
        />
      )}
    </div>
  );
};
