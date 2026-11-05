import React from 'react';
import type { TransactionWithEntries } from '@/lib/api/transactions';
import type { EnvelopeWithDetails } from '@/lib/api/envelopes';
import { CashflowChart } from './CashflowChart';
import { EnvelopeBreakdownChart } from './EnvelopeBreakdownChart';
import { NetWorthTracker } from './NetWorthTracker';

interface AnalyticsDashboardProps {
  isLoading?: boolean;
  isEnvelopesLoading?: boolean;
  transactions: TransactionWithEntries[];
  envelopes: EnvelopeWithDetails[];
  spendableCashPaise: bigint;
  savingsAndFDsPaise: bigint;
  creditCardLiabilitiesPaise: bigint;
  actualDebtsPaise: bigint;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  isLoading = false,
  isEnvelopesLoading = false,
  transactions,
  envelopes,
  spendableCashPaise,
  savingsAndFDsPaise,
  creditCardLiabilitiesPaise,
  actualDebtsPaise,
}) => {
  return (
    <section className="space-y-4 max-w-full overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Analytics & Visual Insights</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Interactive
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Real-time trends, spending distributions, and solvency health
          </p>
        </div>
      </div>

      {/* Net Worth Hero */}
      <NetWorthTracker
        isLoading={isLoading}
        spendableCashPaise={spendableCashPaise}
        savingsAndFDsPaise={savingsAndFDsPaise}
        creditCardLiabilitiesPaise={creditCardLiabilitiesPaise}
        actualDebtsPaise={actualDebtsPaise}
      />

      {/* Grid of Cashflow & Envelope Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CashflowChart transactions={transactions} isLoading={isLoading} />
        <EnvelopeBreakdownChart envelopes={envelopes} isLoading={isEnvelopesLoading || isLoading} />
      </div>
    </section>
  );
};
