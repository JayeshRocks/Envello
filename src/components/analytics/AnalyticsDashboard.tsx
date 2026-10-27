import React from 'react';
import { Download } from 'lucide-react';
import type { TransactionWithEntries } from '@/lib/api/transactions';
import type { EnvelopeWithDetails } from '@/lib/api/envelopes';
import { CashflowChart } from './CashflowChart';
import { EnvelopeBreakdownChart } from './EnvelopeBreakdownChart';
import { NetWorthTracker } from './NetWorthTracker';

interface AnalyticsDashboardProps {
  transactions: TransactionWithEntries[];
  envelopes: EnvelopeWithDetails[];
  spendableCashPaise: bigint;
  savingsAndFDsPaise: bigint;
  creditCardLiabilitiesPaise: bigint;
  actualDebtsPaise: bigint;
  onOpenExportModal: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  transactions,
  envelopes,
  spendableCashPaise,
  savingsAndFDsPaise,
  creditCardLiabilitiesPaise,
  actualDebtsPaise,
  onOpenExportModal,
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

        <button
          onClick={onOpenExportModal}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 border border-white/10 flex items-center space-x-1.5 transition self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Export Data</span>
        </button>
      </div>

      {/* Net Worth Hero */}
      <NetWorthTracker
        spendableCashPaise={spendableCashPaise}
        savingsAndFDsPaise={savingsAndFDsPaise}
        creditCardLiabilitiesPaise={creditCardLiabilitiesPaise}
        actualDebtsPaise={actualDebtsPaise}
      />

      {/* Grid of Cashflow & Envelope Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CashflowChart transactions={transactions} />
        <EnvelopeBreakdownChart envelopes={envelopes} />
      </div>
    </section>
  );
};
