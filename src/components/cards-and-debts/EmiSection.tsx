import React, { useState, useMemo } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, ArrowUpRight } from 'lucide-react';
import type { SelfEmiWithProgress } from '@/hooks/useSelfEmis';
import type { SelfEmiInsert } from '@/lib/api/selfEmis';
import type { ActualDebtRow, ActualDebtInsert } from '@/lib/api/actualDebts';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import { AddSelfEmiModal } from './AddSelfEmiModal';
import { EditSelfEmiModal } from './EditSelfEmiModal';
import { AddExternalEmiModal } from './AddExternalEmiModal';
import { EditExternalEmiModal } from './EditExternalEmiModal';
import { useConfirm } from '@/context/ConfirmContext';

interface EmiSectionProps {
  selfEmis: SelfEmiWithProgress[];
  externalEmis: ActualDebtRow[];
  accounts: AccountItem[];
  totalSelfEmiRemainingPaise: bigint;
  totalExternalEmiRemainingPaise: bigint;
  isLoading: boolean;
  onAddSelfEmi: (params: {
    description: string;
    total_funded_paise: number;
    monthly_reimbursement_paise: number;
    start_date?: string;
  }) => Promise<void>;
  onPaySelfEmi: (params: {
    emiId: string;
    amountPaise: number;
  }) => Promise<void>;
  onUpdateSelfEmi?: (emiId: string, updates: Partial<SelfEmiInsert>) => Promise<void>;
  onDeleteSelfEmi?: (emiId: string) => Promise<void>;
  onAddExternalEmi: (params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }) => Promise<void>;
  onPayExternalEmi: (params: {
    debtId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateExternalEmi?: (debtId: string, updates: Partial<ActualDebtInsert>) => Promise<void>;
  onDeleteExternalEmi?: (debtId: string) => Promise<void>;
}

export const EmiSection: React.FC<EmiSectionProps> = ({
  selfEmis,
  externalEmis,
  accounts,
  totalSelfEmiRemainingPaise,
  totalExternalEmiRemainingPaise,
  isLoading,
  onAddSelfEmi,
  onPaySelfEmi,
  onUpdateSelfEmi,
  onDeleteSelfEmi,
  onAddExternalEmi,
  onPayExternalEmi,
  onUpdateExternalEmi,
  onDeleteExternalEmi,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'self' | 'external'>('all');
  const [isAddSelfOpen, setIsAddSelfOpen] = useState(false);
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false);
  const [editingSelfEmi, setEditingSelfEmi] = useState<SelfEmiWithProgress | null>(null);
  const [editingExternalEmi, setEditingExternalEmi] = useState<ActualDebtRow | null>(null);
  const confirm = useConfirm();

  // Self EMI inline payment state
  const [reimbursingSelfEmiId, setReimbursingSelfEmiId] = useState<string | null>(null);
  const [selfEmiAmountRupees, setSelfEmiAmountRupees] = useState('');
  const [isSelfSubmitting, setIsSelfSubmitting] = useState(false);

  // External EMI inline payment state
  const [payingExternalEmiId, setPayingExternalEmiId] = useState<string | null>(null);
  const [destAccountId, setDestAccountId] = useState<string>(accounts[0]?.id || '');
  const [externalAmountRupees, setExternalAmountRupees] = useState('');
  const [isExternalSubmitting, setIsExternalSubmitting] = useState(false);

  const activeSelfEmis = useMemo(() => selfEmis.filter((e) => !e.is_completed), [selfEmis]);
  const activeExternalEmis = useMemo(() => externalEmis.filter((e) => !e.is_settled), [externalEmis]);

  const totalMonthlySelfEmiPaise = useMemo(
    () => activeSelfEmis.reduce((sum, e) => sum + BigInt(e.monthly_reimbursement_paise || 0), 0n),
    [activeSelfEmis]
  );

  const totalMonthlyExternalEmiPaise = useMemo(
    () => activeExternalEmis.reduce((sum, e) => sum + BigInt(e.monthly_instalment_paise || 0), 0n),
    [activeExternalEmis]
  );

  const totalCombinedMonthlyPaise = totalMonthlySelfEmiPaise + totalMonthlyExternalEmiPaise;
  const totalCombinedRemainingPaise = totalSelfEmiRemainingPaise + totalExternalEmiRemainingPaise;

  const handleReimburseSelf = async (emi: SelfEmiWithProgress) => {
    const remainingPaise = emi.total_funded_paise - emi.total_reimbursed_paise;
    const defaultDuePaise =
      emi.monthly_reimbursement_paise > 0
        ? Math.min(emi.monthly_reimbursement_paise, remainingPaise)
        : remainingPaise;
    const amt = parseFloat(selfEmiAmountRupees) || defaultDuePaise / 100;
    if (isNaN(amt) || amt <= 0) return;

    const amountPaise = Number(toPaise(amt));
    if (amountPaise > remainingPaise) return;

    try {
      setIsSelfSubmitting(true);
      await onPaySelfEmi({
        emiId: emi.id,
        amountPaise,
      });
      setReimbursingSelfEmiId(null);
      setSelfEmiAmountRupees('');
    } finally {
      setIsSelfSubmitting(false);
    }
  };

  const handlePayExternal = async (emi: ActualDebtRow) => {
    if (!destAccountId) return;
    const defaultDuePaise =
      emi.monthly_instalment_paise > 0
        ? Math.min(emi.monthly_instalment_paise, emi.remaining_debt_paise)
        : emi.remaining_debt_paise;
    const amt = parseFloat(externalAmountRupees) || defaultDuePaise / 100;
    if (isNaN(amt) || amt <= 0) return;

    const amountPaise = Number(toPaise(amt));
    if (amountPaise > emi.remaining_debt_paise) return;

    try {
      setIsExternalSubmitting(true);
      await onPayExternalEmi({
        debtId: emi.id,
        fromAccountId: destAccountId,
        amountPaise,
      });
      setPayingExternalEmiId(null);
      setExternalAmountRupees('');
    } finally {
      setIsExternalSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">EMIs (Equated Monthly Instalments)</h3>
            <span className="text-xs text-neutral-400">
              ({activeSelfEmis.length + activeExternalEmis.length} active plans)
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Internal savings reimbursements (Self EMIs) and external financing instalments (External EMIs).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsAddSelfOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center space-x-1.5 transition active:scale-95 min-h-[44px] sm:min-h-[38px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Self EMI</span>
          </button>
          <button
            onClick={() => setIsAddExternalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center space-x-1.5 transition active:scale-95 min-h-[44px] sm:min-h-[38px] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New External EMI</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Strip (Watermelon UI Metric Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 rounded-2xl bg-[#0f1011] border border-white/10 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Self EMIs (Internal)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {activeSelfEmis.length} active
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-indigo-300 tabular-nums">
            {formatINR(totalMonthlySelfEmiPaise)} <span className="text-xs font-normal text-neutral-400">/ mo</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Balance: <span className="text-white font-medium">{formatINR(totalSelfEmiRemainingPaise)}</span>
          </div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              External EMIs (Bank/Lender)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {activeExternalEmis.length} active
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-purple-300 tabular-nums">
            {formatINR(totalMonthlyExternalEmiPaise)} <span className="text-xs font-normal text-neutral-400">/ mo</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Balance: <span className="text-white font-medium">{formatINR(totalExternalEmiRemainingPaise)}</span>
          </div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Combined Monthly Burden
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
              Monthly
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-amber-300 tabular-nums">
            {formatINR(totalCombinedMonthlyPaise)} <span className="text-xs font-normal text-neutral-400">/ mo</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Self + External total EMI outflow</div>
        </div>

        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Total Outstanding Principal
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
              Principal
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-white tabular-nums">
            {formatINR(totalCombinedRemainingPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">Total principal remaining across all plans</div>
        </div>
      </div>

      {/* Filter Tabs (Zero horizontal scrolling wrapping layout) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-neutral-900 border border-white/10 text-xs font-medium w-full sm:w-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'all'
              ? 'bg-neutral-800 text-white font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          All EMIs ({activeSelfEmis.length + activeExternalEmis.length})
        </button>
        <button
          onClick={() => setFilterType('self')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'self'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Self EMIs ({activeSelfEmis.length})
        </button>
        <button
          onClick={() => setFilterType('external')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'external'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          External EMIs ({activeExternalEmis.length})
        </button>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading EMI schedules...</div>
      ) : activeSelfEmis.length === 0 && activeExternalEmis.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3 bg-white/[0.01]">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-white">No Active EMIs Found</div>
          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
            Set up Self EMIs to pay yourself back for large purchases from savings, or track External EMIs to stay on top of bank instalments.
          </p>
          <div className="flex items-center justify-center space-x-2 pt-1">
            <button
              onClick={() => setIsAddSelfOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
            >
              + Add Self EMI
            </button>
            <button
              onClick={() => setIsAddExternalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
            >
              + Add External EMI
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Self EMIs */}
          {(filterType === 'all' || filterType === 'self') &&
            activeSelfEmis.map((emi) => {
              const remainingPaise = emi.total_funded_paise - emi.total_reimbursed_paise;
              const isReimbursing = reimbursingSelfEmiId === emi.id;

              return (
                <div
                  key={`self-${emi.id}`}
                  className="glass-card glass-card-interactive rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 hover:border-indigo-500/30 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                        Self EMI (Internal)
                      </span>
                      <div className="text-sm font-semibold text-white group-hover:text-indigo-200 transition pt-1 truncate">
                        {emi.description}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {onUpdateSelfEmi && (
                        <button
                          onClick={() => setEditingSelfEmi(emi)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition active:scale-95 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Edit Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteSelfEmi && (
                        <button
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: 'Delete Self EMI',
                              message: `Are you sure you want to delete Self EMI "${emi.description}"?`,
                              details: 'Ledger transactions already recorded for this EMI will remain safely logged.',
                              confirmText: 'Delete EMI',
                              cancelText: 'Cancel',
                              variant: 'danger',
                            });
                            if (confirmed) {
                              onDeleteSelfEmi(emi.id);
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

                  {/* Amounts */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[11px] text-neutral-400">Monthly Contribution</div>
                        <div className="text-xl font-bold font-mono tracking-tight text-indigo-300 tabular-nums">
                          {formatINR(emi.monthly_reimbursement_paise)} <span className="text-xs font-normal text-neutral-400">/ mo</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-neutral-400">Remaining to Return</div>
                        <div className="text-xs font-mono text-white font-medium">
                          {formatINR(remainingPaise)}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${emi.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                        <span>{emi.progress_percent}% Reimbursed</span>
                        <span>{formatINR(emi.total_reimbursed_paise)} of {formatINR(emi.total_funded_paise)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reimburse action */}
                  <div className="pt-2 border-t border-white/5">
                    {isReimbursing ? (
                      <div className="space-y-2 text-xs">
                        <div className="text-neutral-300 font-medium">Reimburse savings:</div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="any"
                            value={selfEmiAmountRupees}
                            onChange={(e) => setSelfEmiAmountRupees(e.target.value)}
                            placeholder={(emi.monthly_reimbursement_paise / 100).toString()}
                            className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-base sm:text-sm text-white font-mono"
                          />
                          <button
                            onClick={() => handleReimburseSelf(emi)}
                            disabled={isSelfSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition active:scale-95 cursor-pointer min-h-[36px]"
                          >
                            {isSelfSubmitting ? 'Paying...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => {
                              setReimbursingSelfEmiId(null);
                              setSelfEmiAmountRupees('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-xs transition active:scale-95 cursor-pointer min-h-[36px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 font-mono">Pillar 1 Reimbursement</span>
                        <button
                          onClick={() => {
                            setReimbursingSelfEmiId(emi.id);
                            setSelfEmiAmountRupees((emi.monthly_reimbursement_paise / 100).toString());
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-xs transition active:scale-95 cursor-pointer flex items-center space-x-1 min-h-[36px]"
                        >
                          <span>Reimburse</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          {/* External EMIs */}
          {(filterType === 'all' || filterType === 'external') &&
            activeExternalEmis.map((emi) => {
              const progress =
                emi.initial_debt_paise > 0
                  ? Math.min(
                      100,
                      Math.round(
                        ((emi.initial_debt_paise - emi.remaining_debt_paise) / emi.initial_debt_paise) * 100
                      )
                    )
                  : 100;

              const isPaying = payingExternalEmiId === emi.id;

              return (
                <div
                  key={`ext-${emi.id}`}
                  className="glass-card glass-card-interactive rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 hover:border-purple-500/30 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                        External EMI (Bank / Lender)
                      </span>
                      <div className="text-sm font-semibold text-white group-hover:text-purple-200 transition pt-1 truncate">
                        {emi.lender_name}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {onUpdateExternalEmi && (
                        <button
                          onClick={() => setEditingExternalEmi(emi)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition active:scale-95 cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Edit Details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteExternalEmi && (
                        <button
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: 'Delete External EMI',
                              message: `Are you sure you want to delete External EMI "${emi.lender_name}"?`,
                              details: 'Ledger transactions already recorded for this EMI will remain safely logged.',
                              confirmText: 'Delete EMI',
                              cancelText: 'Cancel',
                              variant: 'danger',
                            });
                            if (confirmed) {
                              onDeleteExternalEmi(emi.id);
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

                  {/* Amounts */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-[11px] text-neutral-400">Monthly Instalment</div>
                        <div className="text-xl font-bold font-mono tracking-tight text-purple-300 tabular-nums">
                          {formatINR(emi.monthly_instalment_paise)} <span className="text-xs font-normal text-neutral-400">/ mo</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-neutral-400">Remaining Balance</div>
                        <div className="text-xs font-mono text-white font-medium">
                          {formatINR(emi.remaining_debt_paise)}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                        <span>{progress}% Paid</span>
                        <span>{formatINR(emi.initial_debt_paise - emi.remaining_debt_paise)} of {formatINR(emi.initial_debt_paise)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Due Date info */}
                  {emi.due_date && (
                    <div className="p-2 rounded-xl bg-neutral-900/60 border border-white/5 text-[11px] flex items-center justify-between text-neutral-400">
                      <span>Next Due Date:</span>
                      <span className="text-purple-300 font-mono font-medium">{emi.due_date}</span>
                    </div>
                  )}

                  {/* Pay action */}
                  <div className="pt-2 border-t border-white/5">
                    {isPaying ? (
                      <div className="space-y-2 text-xs">
                        <div className="text-neutral-300 font-medium">Pay instalment from:</div>
                        <select
                          value={destAccountId}
                          onChange={(e) => setDestAccountId(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-base sm:text-sm text-white"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.institution}) — {formatINR(a.balancePaise)}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="number"
                            step="any"
                            value={externalAmountRupees}
                            onChange={(e) => setExternalAmountRupees(e.target.value)}
                            placeholder={(emi.monthly_instalment_paise / 100).toString()}
                            className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-base sm:text-sm text-white font-mono"
                          />
                          <button
                            onClick={() => handlePayExternal(emi)}
                            disabled={isExternalSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition active:scale-95 cursor-pointer min-h-[36px]"
                          >
                            {isExternalSubmitting ? 'Paying...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => {
                              setPayingExternalEmiId(null);
                              setExternalAmountRupees('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white text-xs transition active:scale-95 cursor-pointer min-h-[36px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 font-mono">Bank Account Outflow</span>
                        {accounts.length > 0 && (
                          <button
                            onClick={() => {
                              setPayingExternalEmiId(emi.id);
                              if (accounts[0]) setDestAccountId(accounts[0].id);
                              setExternalAmountRupees((emi.monthly_instalment_paise / 100).toString());
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-medium text-xs transition active:scale-95 cursor-pointer flex items-center space-x-1 min-h-[36px]"
                          >
                            <span>Pay Instalment</span>
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

      {/* Modals */}
      <AddSelfEmiModal
        isOpen={isAddSelfOpen}
        onClose={() => setIsAddSelfOpen(false)}
        onAddEmi={async (params) => {
          await onAddSelfEmi(params);
        }}
      />

      <EditSelfEmiModal
        isOpen={!!editingSelfEmi}
        emi={editingSelfEmi}
        onClose={() => setEditingSelfEmi(null)}
        onUpdate={async (emiId, updates) => {
          if (onUpdateSelfEmi) {
            await onUpdateSelfEmi(emiId, updates);
          }
        }}
        onDelete={async (emiId) => {
          if (onDeleteSelfEmi) {
            await onDeleteSelfEmi(emiId);
          }
        }}
      />

      <AddExternalEmiModal
        isOpen={isAddExternalOpen}
        onClose={() => setIsAddExternalOpen(false)}
        onAddEmi={async (params) => {
          await onAddExternalEmi(params);
        }}
      />

      <EditExternalEmiModal
        isOpen={!!editingExternalEmi}
        debt={editingExternalEmi}
        onClose={() => setEditingExternalEmi(null)}
        onUpdate={async (debtId, updates) => {
          if (onUpdateExternalEmi) {
            await onUpdateExternalEmi(debtId, updates);
          }
        }}
      />
    </div>
  );
};
