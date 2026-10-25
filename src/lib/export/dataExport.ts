import type { TransactionWithEntries } from '@/lib/api/transactions';
import type { AccountItem } from '@/lib/api/accounts';
import type { EnvelopeWithDetails } from '@/lib/api/envelopes';
import type { CreditCardWithDetails } from '@/lib/api/creditCards';
import type { FixedDepositRow } from '@/lib/api/fixedDeposits';
import type { ActualDebtRow } from '@/lib/api/actualDebts';
import type { MonthlyTargetWithProgress } from '@/hooks/useMonthlyTargets';
import type { RecurringRule } from '@/types/recurring.types';

/**
 * Trigger browser file download
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export transactions to CSV format
 */
export function exportTransactionsToCSV(transactions: TransactionWithEntries[]): void {
  const headers = [
    'Date',
    'Type',
    'Amount (INR)',
    'Description',
    'Notes',
    'Account',
    'Envelope',
  ];

  const rows = transactions.map((tx) => {
    const amountRupees = (Number(tx.totalAmountPaise) / 100).toFixed(2);
    const accountName = tx.entries?.[0]?.accountName || '';
    const envelopeName = tx.entries?.[0]?.envelopeName || '';

    return [
      `"${tx.transactionDate}"`,
      `"${tx.type}"`,
      amountRupees,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
      `"${accountName.replace(/"/g, '""')}"`,
      `"${envelopeName.replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `envello_transactions_${dateStr}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export complete financial workspace data to JSON backup
 */
export function exportFullBackupToJSON(data: {
  exportedAt: string;
  accounts: AccountItem[];
  envelopes: EnvelopeWithDetails[];
  transactions: TransactionWithEntries[];
  creditCards: CreditCardWithDetails[];
  fixedDeposits: FixedDepositRow[];
  actualDebts: ActualDebtRow[];
  monthlyTargets: MonthlyTargetWithProgress[];
  recurringRules?: RecurringRule[];
}): void {
  // Convert BigInts to strings for JSON safety
  const safeData = JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
  );

  const jsonContent = JSON.stringify(safeData, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(
    jsonContent,
    `envello_backup_${dateStr}.json`,
    'application/json;charset=utf-8;'
  );
}
