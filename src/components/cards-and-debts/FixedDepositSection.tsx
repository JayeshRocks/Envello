import React, { useState } from 'react';
import { Landmark, Plus, CheckCircle2 } from 'lucide-react';
import type { FixedDepositRow } from '@/lib/api/fixedDeposits';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR } from '@/lib/accounting/currency';
import { AddFixedDepositModal } from './AddFixedDepositModal';

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
  const [liquidatingFdId, setLiquidatingFdId] = useState<string | null>(null);
  const [destAccountId, setDestAccountId] = useState<string>(accounts[0]?.id || '');
  const [isLiquidating, setIsLiquidating] = useState(false);

  const activeFDs = fixedDeposits.filter((fd) => !fd.is_liquidated);

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
            <h3 className="text-base font-semibold text-white">Savings & Fixed Deposits</h3>
            <span className="text-xs text-neutral-400">({activeFDs.length} locked assets)</span>
          </div>
          <p className="text-xs text-neutral-400">
            Total Principal: <span className="font-mono text-emerald-400 font-semibold">{formatINR(totalPrincipalPaise)}</span> • Estimated Maturity:{' '}
            <span className="font-mono text-emerald-300 font-semibold">{formatINR(totalMaturityPaise)}</span>
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 self-start sm:self-auto transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Fixed Deposit</span>
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading fixed deposits...</div>
      ) : activeFDs.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="text-xs text-neutral-400">No fixed deposits tracked yet.</div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition"
          >
            Track Super.Money or Bank FD
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeFDs.map((fd) => {
            const isTargetedForLiquidation = liquidatingFdId === fd.id;

            return (
              <div
                key={fd.id}
                className="glass-card glass-card-interactive rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 hover:border-emerald-500/30 group"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs text-neutral-400 font-medium tracking-wide uppercase">
                      Fixed Deposit
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-emerald-300 transition">
                      {fd.institution}
                    </div>
                  </div>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {fd.interest_rate_percent}% p.a.
                  </span>
                </div>

                {/* Amounts */}
                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-400">Locked Principal</div>
                  <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {formatINR(fd.principal_paise)}
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
                    <span>Maturity Yield:</span>
                    <span className="font-mono text-emerald-300 font-medium">
                      {formatINR(fd.maturity_amount_paise)}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-white/5 text-[11px] space-y-1 text-neutral-400">
                  <div className="flex items-center justify-between">
                    <span>Started:</span>
                    <span className="text-neutral-300">{fd.start_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Matures On:</span>
                    <span className="text-emerald-400 font-medium">{fd.maturity_date}</span>
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
                        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
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
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 text-[11px] text-neutral-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmLiquidation(fd.id)}
                          disabled={isLiquidating}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white font-medium"
                        >
                          {isLiquidating ? 'Redeeming...' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Locked Pillar 3 Asset</span>
                      </span>
                      {accounts.length > 0 && (
                        <button
                          onClick={() => {
                            setLiquidatingFdId(fd.id);
                            if (accounts[0]) setDestAccountId(accounts[0].id);
                          }}
                          className="text-xs text-neutral-400 hover:text-white transition"
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
