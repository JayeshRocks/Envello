import type { ComponentType } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Layers,
  CreditCard,
  Landmark,
  HandCoins,
  CalendarClock,
  Scale,
  Receipt,
} from 'lucide-react';
import type { TransactionRecord } from '@/lib/api/transactions';
import { formatINR } from './currency';

export interface TransactionDisplayInfo {
  typeLabel: string;
  badgeClassName: string;
  amountColor: string;
  amountPrefix: string;
  formattedAmount: string;
  Icon: ComponentType<{ className?: string }>;
}

/**
 * Deterministically computes presentation metadata (label, badge styling, liquid account impact prefix,
 * and distinct financial color) for any transaction record in the ledger.
 *
 * Rules:
 * - Expenses: Red (text-rose-400), prefix '-'
 * - Income: Green (text-emerald-400), prefix '+'
 * - Transfers & Reallocations: White (text-white), prefix '' (neutral internal movements)
 * - Credit Card Payments & Spends: Purple (text-purple-400), prefix '-'
 * - FDs & RDs: Amber (text-amber-400), '-' on deposit/funding, '+' on liquidation/return
 * - Debt Repayments: Orange (text-orange-400), prefix '-'
 * - Self EMIs: Cyan (text-cyan-400), prefix '-'
 * - Reconciliation Adjustments: Teal (text-teal-400), '+' for surplus, '-' for deficit
 */
export function getTransactionDisplayInfo(tx: TransactionRecord): TransactionDisplayInfo {
  switch (tx.type) {
    case 'expense':
      return {
        typeLabel: 'Expense',
        badgeClassName: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        amountColor: 'text-rose-400',
        amountPrefix: '-',
        formattedAmount: `-${formatINR(tx.totalAmountPaise)}`,
        Icon: ArrowDownLeft,
      };

    case 'income':
      return {
        typeLabel: 'Income',
        badgeClassName: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        amountColor: 'text-emerald-400',
        amountPrefix: '+',
        formattedAmount: `+${formatINR(tx.totalAmountPaise)}`,
        Icon: ArrowUpRight,
      };

    case 'transfer':
      return {
        typeLabel: 'Transfer',
        badgeClassName: 'bg-neutral-800 text-neutral-300 border-white/10',
        amountColor: 'text-white',
        amountPrefix: '',
        formattedAmount: formatINR(tx.totalAmountPaise),
        Icon: ArrowRightLeft,
      };

    case 'envelope_allocation':
      return {
        typeLabel: 'Reallocation',
        badgeClassName: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        amountColor: 'text-white',
        amountPrefix: '',
        formattedAmount: formatINR(tx.totalAmountPaise),
        Icon: Layers,
      };

    case 'credit_card_payment':
      return {
        typeLabel: 'Card Payment',
        badgeClassName: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        amountColor: 'text-purple-400',
        amountPrefix: '-',
        formattedAmount: `-${formatINR(tx.totalAmountPaise)}`,
        Icon: CreditCard,
      };

    case 'credit_card_purchase':
      return {
        typeLabel: 'Card Spend',
        badgeClassName: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        amountColor: 'text-purple-400',
        amountPrefix: '-',
        formattedAmount: `-${formatINR(tx.totalAmountPaise)}`,
        Icon: CreditCard,
      };

    case 'debt_repayment':
      return {
        typeLabel: 'Debt Payment',
        badgeClassName: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        amountColor: 'text-orange-400',
        amountPrefix: '-',
        formattedAmount: `-${formatINR(tx.totalAmountPaise)}`,
        Icon: HandCoins,
      };

    case 'self_emi_repayment':
      return {
        typeLabel: 'Self EMI',
        badgeClassName: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        amountColor: 'text-cyan-400',
        amountPrefix: '-',
        formattedAmount: `-${formatINR(tx.totalAmountPaise)}`,
        Icon: CalendarClock,
      };

    case 'fd_movement': {
      // Check if this movement is deposit/funding vs return/liquidation
      const isReturn =
        tx.entries.some((e) => e.accountId && e.direction === 'debit') ||
        /liquidat|mature|return/i.test(tx.description || '') ||
        /liquidat|mature|return/i.test(tx.notes || '');

      const isRd = /rd\b|recurring deposit/i.test(tx.description || '');

      if (isReturn) {
        return {
          typeLabel: isRd ? 'RD Return' : 'FD Return',
          badgeClassName: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          amountColor: 'text-amber-400',
          amountPrefix: '+',
          formattedAmount: `+${formatINR(tx.totalAmountPaise)}`,
          Icon: Landmark,
        };
      }

      return {
        typeLabel: isRd ? 'RD Deposit' : 'FD Deposit',
        badgeClassName: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        amountColor: 'text-amber-400',
        amountPrefix: '-',
        formattedAmount: `-${formatINR(tx.totalAmountPaise)}`,
        Icon: Landmark,
      };
    }

    case 'adjustment': {
      const isSurplus =
        tx.description.includes('(+') ||
        tx.entries.some((e) => e.accountId && e.direction === 'debit');

      return {
        typeLabel: 'Reconciliation',
        badgeClassName: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
        amountColor: 'text-teal-400',
        amountPrefix: isSurplus ? '+' : '-',
        formattedAmount: `${isSurplus ? '+' : '-'}${formatINR(tx.totalAmountPaise)}`,
        Icon: Scale,
      };
    }

    case 'refund':
      return {
        typeLabel: 'Refund',
        badgeClassName: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        amountColor: 'text-emerald-400',
        amountPrefix: '+',
        formattedAmount: `+${formatINR(tx.totalAmountPaise)}`,
        Icon: ArrowUpRight,
      };

    default: {
      const accEntry = tx.entries.find((e) => e.accountId);
      const isCredit = accEntry?.direction === 'credit';
      const isDebit = accEntry?.direction === 'debit';
      const prefix = isDebit ? '+' : isCredit ? '-' : '';

      const rawType = (tx as { type?: string }).type;
      const formattedType = rawType
        ? rawType.charAt(0).toUpperCase() + rawType.slice(1).replace(/_/g, ' ')
        : 'Transaction';

      return {
        typeLabel: formattedType,
        badgeClassName: 'bg-neutral-800 text-neutral-300 border-white/10',
        amountColor: 'text-neutral-300',
        amountPrefix: prefix,
        formattedAmount: `${prefix}${formatINR(tx.totalAmountPaise)}`,
        Icon: Receipt,
      };
    }
  }
}
