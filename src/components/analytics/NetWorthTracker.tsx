import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, Wallet } from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import { SpotlightCard } from '@/components/common/SpotlightCard';

interface NetWorthTrackerProps {
  liquidFundsPaise?: bigint;
  spendableCashPaise?: bigint;
  savingsAndFDsPaise: bigint;
  creditCardLiabilitiesPaise: bigint;
  actualDebtsPaise: bigint;
}

export const NetWorthTracker: React.FC<NetWorthTrackerProps> = ({
  liquidFundsPaise,
  spendableCashPaise,
  savingsAndFDsPaise,
  creditCardLiabilitiesPaise,
  actualDebtsPaise,
}) => {
  const effectiveLiquidFunds = liquidFundsPaise ?? spendableCashPaise ?? 0n;

  const { totalAssetsPaise, totalLiabilitiesPaise, netWorthPaise, isSolvent } = useMemo(() => {
    const assets = effectiveLiquidFunds + savingsAndFDsPaise;
    const liabilities = creditCardLiabilitiesPaise + actualDebtsPaise;
    const netWorth = assets - liabilities;
    const solvent = netWorth >= 0n;

    return {
      totalAssetsPaise: assets,
      totalLiabilitiesPaise: liabilities,
      netWorthPaise: netWorth,
      isSolvent: solvent,
    };
  }, [effectiveLiquidFunds, savingsAndFDsPaise, creditCardLiabilitiesPaise, actualDebtsPaise]);

  // Ratio calculation
  const totalVolume = totalAssetsPaise + totalLiabilitiesPaise;
  const assetSharePercent =
    totalVolume > 0n ? Number((totalAssetsPaise * 10000n) / totalVolume) / 100 : 100;
  const liabilitySharePercent =
    totalVolume > 0n ? Number((totalLiabilitiesPaise * 10000n) / totalVolume) / 100 : 0;

  return (
    <SpotlightCard
      spotlightColor={isSolvent ? 'rgba(16, 185, 129, 0.16)' : 'rgba(244, 63, 94, 0.16)'}
      className="p-5 sm:p-6 space-y-5 border border-white/10 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white tracking-tight">Net Worth & Solvency Health</h4>
          </div>
          <p className="text-xs text-neutral-400">
            Authoritative solvency: Liquid funds + locked term assets vs all unsettled obligations
          </p>
        </div>

        <span
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border font-mono ${
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
      <div className="p-4 sm:p-5 rounded-xl bg-[#0b0c0e] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
        <div>
          <div className="text-xs text-neutral-400 font-medium">Authoritative Net Worth</div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight tabular-nums mt-1 ${
              isSolvent ? 'text-white' : 'text-rose-400'
            }`}
          >
            {formatINR(netWorthPaise)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1 font-mono">
            Total Assets ({formatINR(totalAssetsPaise)}) − Total Obligations ({formatINR(totalLiabilitiesPaise)})
          </div>
        </div>

        {/* Quick Summary Pill Boxes */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-3 text-xs w-full sm:w-auto">
          <div className="p-3 rounded-xl bg-neutral-900/90 border border-white/5 space-y-0.5">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Total Assets</div>
            <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm truncate tabular-nums">
              {formatINR(totalAssetsPaise)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-neutral-900/90 border border-white/5 space-y-0.5">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Total Obligations</div>
            <div className="font-mono font-bold text-rose-400 text-xs sm:text-sm truncate tabular-nums">
              {formatINR(totalLiabilitiesPaise)}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Asset vs Liability Ratio Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-emerald-400 font-semibold">Assets ({assetSharePercent.toFixed(1)}%)</span>
          <span className="text-rose-400 font-semibold">Liabilities ({liabilitySharePercent.toFixed(1)}%)</span>
        </div>
        <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden flex border border-white/5">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${assetSharePercent}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${liabilitySharePercent}%` }}
          />
        </div>
        <div className="text-[10px] text-neutral-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-0.5 font-mono">
          <span>Liquid Funds: {formatINR(effectiveLiquidFunds)} • FDs & RDs: {formatINR(savingsAndFDsPaise)}</span>
          <span>Cards: {formatINR(creditCardLiabilitiesPaise)} • Debts: {formatINR(actualDebtsPaise)}</span>
        </div>
      </div>
    </SpotlightCard>
  );
};
