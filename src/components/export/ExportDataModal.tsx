import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileJson, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { TransactionWithEntries } from '@/lib/api/transactions';
import type { AccountItem } from '@/lib/api/accounts';
import type { EnvelopeWithDetails } from '@/lib/api/envelopes';
import type { CreditCardWithDetails } from '@/lib/api/creditCards';
import type { FixedDepositRow } from '@/lib/api/fixedDeposits';
import type { ActualDebtRow } from '@/lib/api/actualDebts';
import type { MonthlyTargetWithProgress } from '@/hooks/useMonthlyTargets';
import type { RecurringRule } from '@/types/recurring.types';
import { exportTransactionsToCSV, exportFullBackupToJSON } from '@/lib/export/dataExport';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountItem[];
  envelopes: EnvelopeWithDetails[];
  transactions: TransactionWithEntries[];
  creditCards: CreditCardWithDetails[];
  fixedDeposits: FixedDepositRow[];
  actualDebts: ActualDebtRow[];
  monthlyTargets: MonthlyTargetWithProgress[];
  recurringRules?: RecurringRule[];
}

export const ExportDataModal: React.FC<ExportDataModalProps> = ({
  isOpen,
  onClose,
  accounts,
  envelopes,
  transactions,
  creditCards,
  fixedDeposits,
  actualDebts,
  monthlyTargets,
  recurringRules,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    exportTransactionsToCSV(transactions);
    setDownloadSuccess('Transactions CSV exported successfully!');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleExportJSON = () => {
    exportFullBackupToJSON({
      exportedAt: new Date().toISOString(),
      accounts,
      envelopes,
      transactions,
      creditCards,
      fixedDeposits,
      actualDebts,
      monthlyTargets,
      recurringRules,
    });
    setDownloadSuccess('Complete workspace JSON backup exported successfully!');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl modal-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Export & Backup Data</h3>
              <p className="text-xs text-neutral-400">Download your personal financial records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* CSV Option */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 hover:border-white/10 transition flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Transactions CSV</div>
                <div className="text-xs text-neutral-400">
                  {transactions.length} transactions for Excel / Google Sheets
                </div>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-emerald-400 font-medium border border-emerald-500/20 transition"
            >
              Export CSV
            </button>
          </div>

          {/* JSON Option */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 hover:border-white/10 transition flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Complete Workspace JSON</div>
                <div className="text-xs text-neutral-400">
                  Full snapshot of accounts, envelopes, debts & cards
                </div>
              </div>
            </div>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-indigo-400 font-medium border border-indigo-500/20 transition"
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-neutral-900/40 border border-white/5 text-[11px] text-neutral-400 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Your data is exported client-side directly from your active session.</span>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
