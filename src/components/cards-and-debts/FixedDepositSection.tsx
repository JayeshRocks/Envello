import React, { useState, useMemo } from 'react';
import { Landmark, Plus, CheckCircle2 } from 'lucide-react';
import type { FixedDepositRow, DepositType } from '@/lib/api/fixedDeposits';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR } from '@/lib/accounting/currency';
import { AddFixedDepositModal } from './AddFixedDepositModal';
import { SkeletonCardsGrid } from '@/components/common/Skeleton';

interface FixedDepositSectionProps {
  fixedDeposits: FixedDepositRow[];
  accounts: AccountItem[];
  totalPrincipalPaise: bigint;
  totalMaturityPaise: bigint;
  isLoading: boolean;
  onAddFD: (params: {
    institution: string;
    principal_paise: number;
    interest_rate_percent: number;
    start_date: string;
    maturity_date: string;
    maturity_amount_paise: number;
    deposit_type?: DepositType;
    monthly_deposit_paise?: number;
    funding_account_id?: string;
  }) => Promise<void>;
  onLiquidateFD: (params: {
    fdId: string;
    destinationAccountId: string;
    liquidatedAmountPaise?: number;
    liquidationDate?: string;
  }) => Promise<void>;
}

export const FixedDepositSection: React.FC<FixedDepositSectionProps> = ({
  fixedDeposits,
  accounts,
  totalPrincipalPaise,
  totalMaturityPaise,
  isLoading,
  onAddFD,
  onLiquidateFD,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'fd' | 'rd'>('all');
  const [liquidatingFdId, setLiquidatingFdId] = useState<string | null>(null);
  const [destAccountId, setDestAccountId] = useState<string>(accounts[0]?.id || '');
  const [isLiquidating, setIsLiquidating] = useState(false);

  const activeFDs = useMemo(() => {
    return fixedDeposits.filter((fd) => !fd.is_liquidated);
  }, [fixedDeposits]);

  const fdsList = useMemo(() => {
    return activeFDs.filter((fd) => fd.deposit_type === 'fd' || !fd.deposit_type);
  }, [activeFDs]);

  const rdsList = useMemo(() => {
    return activeFDs.filter((fd) => fd.deposit_type === 'rd');
  }, [activeFDs]);

  const totalFdPrincipalPaise = useMemo(() => {
    return fdsList.reduce((sum, fd) => sum + BigInt(fd.principal_paise), 0n);
  }, [fdsList]);

  const totalFdMaturityPaise = useMemo(() => {
    return fdsList.reduce((sum, fd) => sum + BigInt(fd.maturity_amount_paise), 0n);
  }, [fdsList]);

  const totalRdMonthlyPaise = useMemo(() => {
    return rdsList.reduce((sum, fd) => sum + BigInt(fd.monthly_deposit_paise || 0), 0n);
  }, [rdsList]);

  const totalRdTargetPaise = useMemo(() => {
    return rdsList.reduce((sum, fd) => sum + BigInt(fd.principal_paise), 0n);
  }, [rdsList]);

  const filteredDeposits = useMemo(() => {
    if (filterType === 'all') return activeFDs;
    if (filterType === 'fd') return fdsList;
    if (filterType === 'rd') return rdsList;
    return activeFDs;
  }, [filterType, activeFDs, fdsList, rdsList]);

  const handleConfirmLiquidation = async (fdId: string) => {
    if (!destAccountId) return;
    try {
      setIsLiquidating(true);
      await onLiquidateFD({
        fdId,
        destinationAccountId: destAccountId,
      });
      setLiquidatingFdId(null);
    } finally {
      setIsLiquidating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Fixed Deposits & Recurring Deposits</h3>
            <span className="text-xs text-neutral-400">
              ({activeFDs.length} active term deposits)
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Locked principal and disciplined monthly recurring deposits isolated from daily spending.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm shadow-sm flex items-center space-x-1.5 self-start sm:self-auto transition active:scale-95 min-h-[44px] sm:min-h-[38px] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Term Deposit</span>
        </button>
      </div>

      {/* Metric Cards Strip (Watermelon UI Metric Blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 rounded-2xl bg-[#0f1011] border border-white/10 shadow-lg">
        {/* Fixed Deposits Metric */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              FDs
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {fdsList.length} active
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-white tabular-nums">
            {formatINR(totalFdPrincipalPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Maturity: <span className="text-emerald-400 font-medium">{formatINR(totalFdMaturityPaise)}</span>
          </div>
        </div>

        {/* Recurring Deposits Metric */}
        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              RDs
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {rdsList.length} active
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-indigo-300 tabular-nums">
            {formatINR(totalRdMonthlyPaise)} <span className="text-xs font-normal text-neutral-400">/ mo</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Target: <span className="text-indigo-400 font-medium">{formatINR(totalRdTargetPaise)}</span>
          </div>
        </div>

        {/* Total Locked Principal */}
        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Total Locked Principal
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10">
              Principal
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-amber-300 tabular-nums">
            {formatINR(totalPrincipalPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            FD Principal + Total RD Targets
          </div>
        </div>

        {/* Total Projected Maturity */}
        <div className="space-y-1 sm:border-l sm:border-white/10 sm:pl-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Combined Maturity
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Maturity
            </span>
          </div>
          <div className="text-lg font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
            {formatINR(totalMaturityPaise)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Total Expected Payout
          </div>
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
          All Deposits ({activeFDs.length})
        </button>
        <button
          onClick={() => setFilterType('fd')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'fd'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          FDs ({fdsList.length})
        </button>
        <button
          onClick={() => setFilterType('rd')}
          className={`px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer min-h-[36px] sm:min-h-[30px] ${
            filterType === 'rd'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          RDs ({rdsList.length})
        </button>
      </div>

      {/* Grid of Deposits */}
      {isLoading ? (
        <SkeletonCardsGrid count={3} />
      ) : filteredDeposits.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3 bg-white/[0.01]">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-white">No Term Deposits Found</div>
          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
            Track your Fixed Deposits (FD) or Recurring Deposits (RD) to monitor your long-term wealth growth deterministically.
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
          >
            + Add First Deposit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeposits.map((fd) => {
            const isTargetedForLiquidation = liquidatingFdId === fd.id;
            const isRD = fd.deposit_type === 'rd';

            return (
              <div
                key={fd.id}
                className={`glass-card glass-card-interactive rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 group ${
                  isRD ? 'hover:border-indigo-500/30' : 'hover:border-amber-500/30'
                }`}
              >
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                          isRD
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isRD ? 'RD' : 'FD'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition pt-1">
                      {fd.institution}
                    </div>
                  </div>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-white/5 text-neutral-300 border border-white/10">
                    {fd.interest_rate_percent}% p.a.
                  </span>
                </div>

                {/* Amounts */}
                <div className="space-y-1">
                  {isRD ? (
                    <>
                      <div className="text-[11px] text-neutral-400">Monthly Contribution</div>
                      <div className="text-xl font-bold font-mono tracking-tight text-indigo-300 tabular-nums">
                        {formatINR(fd.monthly_deposit_paise || 0)} <span className="text-xs font-normal text-neutral-400">/ mo</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
                        <span>Total Target Principal:</span>
                        <span className="font-mono text-white font-medium">{formatINR(fd.principal_paise)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[11px] text-neutral-400">Locked Principal</div>
                      <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                        {formatINR(fd.principal_paise)}
                      </div>
                    </>
                  )}

                  <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
                    <span>Maturity Yield:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {formatINR(fd.maturity_amount_paise)}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-[11px] space-y-1 text-neutral-400">
                  <div className="flex items-center justify-between">
                    <span>Started:</span>
                    <span className="text-neutral-300 font-mono">{fd.start_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Matures On:</span>
                    <span className="text-emerald-400 font-medium font-mono">{fd.maturity_date}</span>
                  </div>
                </div>

                {/* Liquidation controls */}
                <div className="pt-2 border-t border-white/5">
                  {isTargetedForLiquidation ? (
                    <div className="space-y-2 text-xs">
                      <div className="text-neutral-300 font-medium">Select destination account:</div>
                      <select
                        value={destAccountId}
                        onChange={(e) => setDestAccountId(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 sm:py-1.5 text-base sm:text-sm text-white"
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.institution})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          onClick={() => setLiquidatingFdId(null)}
                          className="px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-neutral-800 text-xs sm:text-sm text-neutral-300 transition active:scale-95 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmLiquidation(fd.id)}
                          disabled={isLiquidating}
                          className="px-4 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm text-white font-medium transition active:scale-95 cursor-pointer"
                        >
                          {isLiquidating ? 'Redeeming...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Pillar 3 Asset</span>
                      </span>
                      {accounts.length > 0 && (
                        <button
                          onClick={() => {
                            setLiquidatingFdId(fd.id);
                            if (accounts[0]) setDestAccountId(accounts[0].id);
                          }}
                          className="text-xs sm:text-sm text-neutral-300 hover:text-white transition py-2 px-3.5 rounded-xl hover:bg-white/5 min-h-[44px] sm:min-h-[38px] flex items-center active:scale-95 cursor-pointer"
                        >
                          Redeem / Liquidate
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
      <AddFixedDepositModal
        isOpen={isAddOpen}
        accounts={accounts}
        onClose={() => setIsAddOpen(false)}
        onAddFD={async (params) => {
          await onAddFD(params);
        }}
      />
    </div>
  );
};
