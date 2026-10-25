import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Wallet } from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';

interface NetWorthTrackerProps {
  spendableCashPaise: bigint;
  savingsAndFDsPaise: bigint;
  creditCardLiabilitiesPaise: bigint;
  actualDebtsPaise: bigint;
}

export const NetWorthTracker: React.FC<NetWorthTrackerProps> = ({
  spendableCashPaise,
  savingsAndFDsPaise,
  creditCardLiabilitiesPaise,
  actualDebtsPaise,
}) => {
  const { totalAssetsPaise, totalLiabilitiesPaise, netWorthPaise, isSolvent } = useMemo(() => {
    const assets = spendableCashPaise + savingsAndFDsPaise;
    const liabilities = creditCardLiabilitiesPaise + actualDebtsPaise;
    const netWorth = assets - liabilities;
    const solvent = netWorth >= 0n;

    return {
      totalAssetsPaise: assets,
      totalLiabilitiesPaise: liabilities,
      netWorthPaise: netWorth,
      isSolvent: solvent,
    };
  }, [spendableCashPaise, savingsAndFDsPaise, creditCardLiabilitiesPaise, actualDebtsPaise]);

  // Ratio calculation
  const totalVolume = totalAssetsPaise + totalLiabilitiesPaise;
  const assetSharePercent =
    totalVolume > 0n ? Number((totalAssetsPaise * 10000n) / totalVolume) / 100 : 100;
  const liabilitySharePercent =
    totalVolume > 0n ? Number((totalLiabilitiesPaise * 10000n) / totalVolume) / 100 : 0;

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">Net Worth & Solvency Health</h4>
          </div>
          <p className="text-xs text-neutral-400">
            Authoritative solvency: Liquid cash + locked savings vs all unsettled obligations
          </p>
        </div>

        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            isSolvent
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {isSolvent ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
          <span>{isSolvent ? 'Positive Net Worth' : 'Net Liability Balance'}</span>
        </span>
      </div>

      {/* Net Worth Hero Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-neutral-400 font-medium">Authoritative Net Worth</div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums mt-1 ${
              isSolvent ? 'text-white' : 'text-rose-400'
            }`}
          >
            {formatINR(netWorthPaise)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Total Assets ({formatINR(totalAssetsPaise)}) − Total Obligations ({formatINR(totalLiabilitiesPaise)})
          </div>
        </div>

        {/* Quick Summary Pill Boxes */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="p-3 rounded-xl bg-neutral-800/60 border border-white/5 space-y-0.5">
            <div className="text-[10px] text-neutral-400">Total Assets</div>
            <div className="font-mono font-bold text-emerald-400">
              {formatINR(totalAssetsPaise)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-800/60 border border-white/5 space-y-0.5">
            <div className="text-[10px] text-neutral-400">Total Obligations</div>
            <div className="font-mono font-bold text-rose-400">
              {formatINR(totalLiabilitiesPaise)}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Asset vs Liability Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-emerald-400">Assets ({assetSharePercent.toFixed(1)}%)</span>
          <span className="text-rose-400">Liabilities ({liabilitySharePercent.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${assetSharePercent}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${liabilitySharePercent}%` }}
          />
        </div>
        <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-0.5">
          <span>Spendable Cash: {formatINR(spendableCashPaise)} • FDs: {formatINR(savingsAndFDsPaise)}</span>
          <span>Cards: {formatINR(creditCardLiabilitiesPaise)} • Debts: {formatINR(actualDebtsPaise)}</span>
        </div>
      </div>
    </div>
  );
};
