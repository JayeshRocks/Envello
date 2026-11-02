import React, { useState, useMemo } from 'react';
import { HandCoins, Plus, CheckCircle2, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import type { DebtLoanRow, DebtLoanInsert } from '@/lib/api/debtsLoans';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR } from '@/lib/accounting/currency';
import { AddDebtLoanModal } from './AddDebtLoanModal';
import { EditDebtLoanModal } from './EditDebtLoanModal';
import { RecordLoanPaymentModal } from './RecordLoanPaymentModal';

interface DebtsAndLoansSectionProps {
  debtsLoans: DebtLoanRow[];
  accounts: AccountItem[];
  totalRemainingBalancePaise: bigint;
  totalBorrowedPaise: bigint;
  totalRepaidPaise: bigint;
  isLoading: boolean;
  onAddDebtLoan: (params: {
    lender_name: string;
    borrowed_amount_paise: number;
    remaining_balance_paise?: number;
    interest_rate_percent?: number;
    due_date?: string;
    notes?: string;
    initial_deposit_account_id?: string;
  }) => Promise<void>;
  onPayDebtLoan: (params: {
    loanId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateDebtLoan?: (loanId: string, updates: Partial<DebtLoanInsert>) => Promise<void>;
  onDeleteDebtLoan?: (loanId: string) => Promise<void>;
}

export const DebtsAndLoansSection: React.FC<DebtsAndLoansSectionProps> = ({
  debtsLoans,
  accounts,
  totalRemainingBalancePaise,
  totalBorrowedPaise,
  totalRepaidPaise,
  isLoading,
  onAddDebtLoan,
  onPayDebtLoan,
  onUpdateDebtLoan,
  onDeleteDebtLoan,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [payingLoanId, setPayingLoanId] = useState<string | null>(null);
  const [editingLoan, setEditingLoan] = useState<DebtLoanRow | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'active' | 'settled'>('active');

  const activeLoans = useMemo(() => debtsLoans.filter((d) => !d.is_settled), [debtsLoans]);
  const settledLoans = useMemo(() => debtsLoans.filter((d) => d.is_settled), [debtsLoans]);

  const displayedLoans = useMemo(() => {
    if (filterType === 'all') return debtsLoans;
    if (filterType === 'settled') return settledLoans;
    return activeLoans;
  }, [filterType, debtsLoans, activeLoans, settledLoans]);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Debts &amp; Loans</h3>
            <span className="text-xs text-neutral-400">
              ({activeLoans.length} active liabilities)
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Lump-sum loans and personal debts owed to friends, family, or lenders with manual settlement.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {activeLoans.length > 0 && accounts.length > 0 && (
            <button
              onClick={() => setPayingLoanId(activeLoans[0]?.id || null)}
              className="px-3.5 py-2 sm:py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 min-h-[44px] sm:min-h-[38px] cursor-pointer flex items-center space-x-1.5"
            >
              <HandCoins className="w-3.5 h-3.5 text-orange-400" />
              <span>Pay Loan</span>
            </button>
          )}
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-2 sm:py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center space-x-1.5 transition active:scale-95 min-h-[44px] sm:min-h-[38px] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Debt / Loan</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Strip (Watermelon UI Metric Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 rounded-2xl bg-[#0f1011] border border-white/10 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Active Loans
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {activeLoans.length} open
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-white tabular-nums">
            {formatINR(totalRemainingBalancePaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Current total balance owed</div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Initial Borrowed
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
              Principal
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-neutral-200 tabular-nums">
            {formatINR(totalBorrowedPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Original debt principal</div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Total Repaid
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Repaid
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
            {formatINR(totalRepaidPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Principal returned to date</div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Settled Loans
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
              Closed
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-neutral-300 tabular-nums">
            {settledLoans.length} closed
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Fully repaid liabilities</div>
        </div>
      </div>

      {/* Filter Tabs (Zero horizontal scrolling wrapping layout) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-white/10 text-xs font-medium w-full sm:w-auto">
        <button
          onClick={() => setFilterType('active')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'active'
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Active Debts ({activeLoans.length})
        </button>
        <button
          onClick={() => setFilterType('settled')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'settled'
              ? 'bg-neutral-800 text-white font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Settled ({settledLoans.length})
        </button>
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'all'
              ? 'bg-neutral-800 text-white font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          All Records ({debtsLoans.length})
        </button>
      </div>

      {/* List of Debts & Loans */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading debts and loans...</div>
      ) : displayedLoans.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3 bg-white/[0.01]">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-white">No Debts or Loans Found</div>
          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
            {filterType === 'settled'
              ? 'You have no settled loan records yet.'
              : 'Record personal borrowings, family advances, or lump-sum loans to settle them manually with full ledger accounting.'}
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
          >
            + Add First Debt / Loan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedLoans.map((loan) => {
            const progress =
              loan.borrowed_amount_paise > 0
                ? Math.min(
                    100,
                    Math.round(
                      ((loan.borrowed_amount_paise - loan.remaining_balance_paise) /
                        loan.borrowed_amount_paise) *
                        100
                    )
                  )
                : 100;

            return (
              <div
                key={loan.id}
                className="glass-card glass-card-interactive rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 hover:border-orange-500/30 group"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                          loan.is_settled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}
                      >
                        {loan.is_settled ? 'Settled' : 'Active Debt'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-orange-200 transition pt-1 truncate">
                      {loan.lender_name}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {loan.interest_rate_percent > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/10">
                        {loan.interest_rate_percent}% p.a.
                      </span>
                    )}
                    {onUpdateDebtLoan && (
                      <button
                        onClick={() => setEditingLoan(loan)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition active:scale-95 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Edit Details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteDebtLoan && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete debt record for "${loan.lender_name}"?`)) {
                            onDeleteDebtLoan(loan.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition active:scale-95 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Balance & Progress */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] text-neutral-400">Remaining Balance</div>
                      <div className="text-xl font-bold font-mono tracking-tight text-orange-400 tabular-nums">
                        {formatINR(loan.remaining_balance_paise)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-neutral-400">Initial Borrowed</div>
                      <div className="text-xs font-mono text-neutral-300">
                        {formatINR(loan.borrowed_amount_paise)}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          loan.is_settled ? 'bg-emerald-400' : 'bg-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                      <span>{progress}% Repaid</span>
                      <span>
                        {formatINR(loan.borrowed_amount_paise - loan.remaining_balance_paise)} paid
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes & Due Date info */}
                {(loan.due_date || loan.notes) && (
                  <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-[11px] space-y-1 text-neutral-400">
                    {loan.due_date && (
                      <div className="flex items-center justify-between">
                        <span>Target Due Date:</span>
                        <span className="text-neutral-200 font-mono font-medium">
                          {loan.due_date}
                        </span>
                      </div>
                    )}
                    {loan.notes && (
                      <p className="text-[11px] text-neutral-400 line-clamp-2 italic pt-0.5">
                        &ldquo;{loan.notes}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom Action (Manual Pay like Credit Card) */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  {loan.is_settled ? (
                    <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Debt Fully Settled</span>
                    </span>
                  ) : (
                    <>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        Manual Payoff
                      </span>
                      {accounts.length > 0 && (
                        <button
                          onClick={() => setPayingLoanId(loan.id)}
                          className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition active:scale-95 flex items-center space-x-1 cursor-pointer min-h-[38px]"
                        >
                          <span>Pay Debt</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <AddDebtLoanModal
        isOpen={isAddOpen}
        accounts={accounts}
        onClose={() => setIsAddOpen(false)}
        onAddDebtLoan={async (params) => {
          await onAddDebtLoan(params);
        }}
      />

      {/* Manual Payment Modal (Like Credit Card Payment) */}
      <RecordLoanPaymentModal
        isOpen={!!payingLoanId}
        loans={activeLoans.length > 0 ? activeLoans : debtsLoans}
        accounts={accounts}
        preselectedLoanId={payingLoanId || undefined}
        onClose={() => setPayingLoanId(null)}
        onRecordPayment={async (params) => {
          await onPayDebtLoan(params);
        }}
      />

      {/* Edit Modal */}
      <EditDebtLoanModal
        isOpen={!!editingLoan}
        debt={editingLoan}
        onClose={() => setEditingLoan(null)}
        onUpdate={async (loanId, updates) => {
          if (onUpdateDebtLoan) {
            await onUpdateDebtLoan(loanId, updates);
          }
        }}
      />
    </div>
  );
};
