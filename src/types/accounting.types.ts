/**
 * Envello - Core Accounting Domain Types
 * Strict typing for financial math, double-entry ledger, and balance taxonomy.
 */

export type CurrencyUnit = 'INR';

export type AccountType = 'checking' | 'savings' | 'cash' | 'other';

export type EnvelopeRolloverPolicy = 'carry_forward' | 'sweep_to_regular' | 'reset';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'envelope_allocation'
  | 'credit_card_purchase'
  | 'credit_card_payment'
  | 'fd_movement'
  | 'self_emi_repayment'
  | 'debt_repayment'
  | 'refund'
  | 'adjustment';

export type LedgerDirection = 'debit' | 'credit';

/**
 * Six Pillars of Financial Clarity
 * The UI must always display these explicitly. Never reduce to a single ambiguous "Total Balance".
 */
export interface FinancialOverviewPillars {
  /** 1. Liquid Checking, Savings, and Cash in hand */
  spendableCashPaise: bigint;
  /** 2. Total active allocations across all envelopes for the current period */
  envelopeAllocationsPaise: bigint;
  /** 3. Long-term locked reserves, Fixed Deposits, Term Assets, etc. */
  savingsAndFDsPaise: bigint;
  /** 4. Current unsettled liabilities across all credit cards */
  creditCardLiabilitiesPaise: bigint;
  /** 5. External debts owed to individuals, loans, or providers */
  actualDebtsPaise: bigint;
  /** 6. Target contribution goals planned for the period (planning only) */
  monthlyTargetsPaise: bigint;
}

export interface AccountSummary {
  id: string;
  name: string;
  institution: string;
  accountType: AccountType;
  balancePaise: bigint;
  isActive: boolean;
}

export interface EnvelopeSummary {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  allocatedPaise: bigint;
  spentPaise: bigint;
  carriedOverPaise: bigint;
  availablePaise: bigint;
  isSystemReserved: boolean;
  rolloverPolicy: EnvelopeRolloverPolicy;
  sortOrder?: number;
  allocationId?: string;
}

export type EnvelopeWithAllocation = EnvelopeSummary;

export interface CreditCardSummary {
  id: string;
  cardName: string;
  issuer: string;
  creditLimitPaise: bigint;
  outstandingBalancePaise: bigint;
  availableCreditPaise: bigint;
  utilizationPercent: number;
  utilizationStatus: 'safe' | 'warning' | 'danger';
  statementDay: number;
  paymentDueDay: number;
}
