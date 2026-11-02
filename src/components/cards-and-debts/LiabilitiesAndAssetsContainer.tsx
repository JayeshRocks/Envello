import React, { useState } from 'react';
import { CreditCard, Landmark, RefreshCw, CalendarClock, HandCoins, Target } from 'lucide-react';
import type { CreditCardWithDetails, CreditCardRow } from '@/lib/api/creditCards';
import type { FixedDepositRow, DepositType } from '@/lib/api/fixedDeposits';
import type { SelfEmiWithProgress } from '@/hooks/useSelfEmis';
import type { SelfEmiInsert } from '@/lib/api/selfEmis';
import type { ActualDebtRow, ActualDebtInsert } from '@/lib/api/actualDebts';
import type { DebtLoanRow, DebtLoanInsert } from '@/lib/api/debtsLoans';
import type { AccountItem } from '@/lib/api/accounts';
import type { MonthlyTargetWithProgress } from '@/hooks/useMonthlyTargets';
import type { RecurringRule, CreateRecurringRuleParams } from '@/types/recurring.types';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { CreditCardSection } from './CreditCardSection';
import { FixedDepositSection } from './FixedDepositSection';
import { RecurringSection } from './RecurringSection';
import { EmiSection } from './EmiSection';
import { DebtsAndLoansSection } from './DebtsAndLoansSection';
import { MonthlyTargetsSection } from '@/components/targets/MonthlyTargetsSection';

export type SubTabType = 'cards' | 'fds' | 'recurring' | 'emis' | 'debts' | 'targets';

interface LiabilitiesAndAssetsContainerProps {
  activeTab?: SubTabType;
  onTabChange?: (tab: SubTabType) => void;

  // Cards
  cards: CreditCardWithDetails[];
  totalCardOutstandingPaise: bigint;
  totalCardLimitPaise: bigint;
  cardUtilizationPercent: number;
  isCardsLoading: boolean;
  onAddCard: (data: {
    card_name: string;
    issuer: string;
    credit_limit_paise: number;
    outstanding_balance_paise?: number;
    statement_day: number;
    payment_due_day: number;
    warning_threshold_percent?: number;
  }) => Promise<void>;
  onPayCard: (params: {
    cardId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateCard?: (cardId: string, updates: Partial<CreditCardRow>) => Promise<void>;
  onDeleteCard?: (cardId: string) => Promise<void>;

  // FDs
  fixedDeposits: FixedDepositRow[];
  totalFdPrincipalPaise: bigint;
  totalFdMaturityPaise: bigint;
  isFdsLoading: boolean;
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

  // Recurring Commitments (Standing Bills)
  recurringRules: RecurringRule[];
  dueRecurringRules: RecurringRule[];
  totalRecurringDuePaise: bigint;
  totalMonthlyRecurringPaise: bigint;
  currentYearMonth: string;
  envelopes: EnvelopeWithAllocation[];
  isRecurringLoading?: boolean;
  onAddRecurringRule: (params: CreateRecurringRuleParams) => Promise<void>;
  onToggleRecurringRuleActive: (ruleId: string) => Promise<void>;
  onDeleteRecurringRule: (ruleId: string) => Promise<void>;
  onLogSingleRecurringRule: (rule: RecurringRule) => Promise<void>;
  onLogAllDueRecurringRules: () => Promise<void>;

  // EMIs: Self EMIs (internal) & External EMIs (lenders)
  selfEmis: SelfEmiWithProgress[];
  externalEmis: ActualDebtRow[];
  totalSelfEmiRemainingPaise: bigint;
  totalExternalEmiRemainingPaise: bigint;
  isEmisLoading: boolean;
  onAddSelfEmi: (params: {
    description: string;
    total_funded_paise: number;
    monthly_reimbursement_paise: number;
    start_date?: string;
  }) => Promise<void>;
  onPaySelfEmi: (params: {
    emiId: string;
    amountPaise: number;
  }) => Promise<void>;
  onUpdateSelfEmi?: (emiId: string, updates: Partial<SelfEmiInsert>) => Promise<void>;
  onDeleteSelfEmi?: (emiId: string) => Promise<void>;
  onAddExternalEmi: (params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }) => Promise<void>;
  onPayExternalEmi: (params: {
    debtId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateExternalEmi?: (debtId: string, updates: Partial<ActualDebtInsert>) => Promise<void>;
  onDeleteExternalEmi?: (debtId: string) => Promise<void>;

  // Debts & Loans: Personal & external lump-sum debts with manual card-like payment
  debtsLoans: DebtLoanRow[];
  totalDebtLoanRemainingPaise: bigint;
  totalDebtLoanBorrowedPaise: bigint;
  totalDebtLoanRepaidPaise: bigint;
  isDebtsLoansLoading: boolean;
  onAddDebtLoan: (params: {
    lender_name: string;
    borrowed_amount_paise: number;
    remaining_balance_paise?: number;
    interest_rate_percent?: number;
    due_date?: string;
    notes?: string;
    initial_deposit_account_id?: string;
  }) => Promise<void>;
  onPayDebtLoan: (params: {
    loanId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateDebtLoan?: (loanId: string, updates: Partial<DebtLoanInsert>) => Promise<void>;
  onDeleteDebtLoan?: (loanId: string) => Promise<void>;

  // Target Goals (One-Time Major Purchases)
  targets: MonthlyTargetWithProgress[];
  totalTargetAmountPaise: bigint;
  totalContributedPaise: bigint;
  isTargetsLoading: boolean;
  onAddTarget: (params: {
    title: string;
    target_amount_paise: number;
    target_date: string;
    current_contributed_paise?: number;
  }) => Promise<void>;
  onContributeTarget: (targetId: string, amountPaise: number) => Promise<void>;
  onRemoveTarget: (targetId: string) => Promise<void>;

  accounts: AccountItem[];
}

export const LiabilitiesAndAssetsContainer: React.FC<LiabilitiesAndAssetsContainerProps> = (props) => {
  const [internalActiveTab, setInternalActiveTab] = useState<SubTabType>('cards');
  const currentTab = props.activeTab !== undefined ? props.activeTab : internalActiveTab;

  const handleTabSelect = (tab: SubTabType) => {
    setInternalActiveTab(tab);
    if (props.onTabChange) {
      props.onTabChange(tab);
    }
  };

  const activeSelfEmisCount = props.selfEmis.filter((e) => !e.is_completed).length;
  const activeExternalEmisCount = props.externalEmis.filter((d) => !d.is_settled).length;
  const activeDebtsLoansCount = props.debtsLoans.filter((d) => !d.is_settled).length;

  const tabs = [
    {
      id: 'cards' as const,
      name: 'Credit Cards',
      icon: CreditCard,
      count: props.cards.length,
      badgeColor: 'text-purple-400',
    },
    {
      id: 'fds' as const,
      name: 'Fixed Deposits & RDs',
      icon: Landmark,
      count: props.fixedDeposits.filter((f) => !f.is_liquidated).length,
      badgeColor: 'text-amber-400',
    },
    {
      id: 'recurring' as const,
      name: 'Recurring Costs',
      icon: CalendarClock,
      count: props.recurringRules.filter((r) => r.isActive).length,
      badgeColor: props.dueRecurringRules.length > 0 ? 'text-amber-400 font-bold' : 'text-indigo-400',
    },
    {
      id: 'emis' as const,
      name: 'EMIs',
      icon: RefreshCw,
      count: activeSelfEmisCount + activeExternalEmisCount,
      badgeColor: 'text-indigo-400',
    },
    {
      id: 'debts' as const,
      name: 'Debts & Loans',
      icon: HandCoins,
      count: activeDebtsLoansCount,
      badgeColor: 'text-orange-400',
    },
    {
      id: 'targets' as const,
      name: 'Target Goals',
      icon: Target,
      count: props.targets.filter((t) => !t.is_achieved).length,
      badgeColor: 'text-cyan-400',
    },
  ];

  return (
    <section
      id="liabilities-and-assets"
      className="rounded-2xl bg-[#0f1011] border border-white/10 p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden scroll-mt-20 shadow-xl"
    >
      {/* Tab Navigation header — Responsive grid on mobile & tablet, flex-wrap on desktop (No horizontal scrolling) */}
      <div className="grid grid-cols-2 xs:grid-cols-3 lg:flex lg:flex-wrap items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-3 sm:pb-4 w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              className={`px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center sm:justify-start space-x-2 transition-all duration-200 active:scale-95 min-h-[44px] sm:min-h-[40px] w-full lg:w-auto cursor-pointer ${
                isActive
                  ? 'bg-neutral-800 text-white shadow-lg border border-white/15 font-semibold ring-1 ring-sky-500/25'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/80 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{tab.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono flex-shrink-0 ${
                  isActive ? 'bg-white/10 text-white' : 'bg-neutral-900'
                } ${tab.badgeColor}`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div key={currentTab} className="animate-fade-in">
        {currentTab === 'cards' && (
          <CreditCardSection
            cards={props.cards}
            accounts={props.accounts}
            totalOutstandingPaise={props.totalCardOutstandingPaise}
            totalLimitPaise={props.totalCardLimitPaise}
            overallUtilizationPercent={props.cardUtilizationPercent}
            isLoading={props.isCardsLoading}
            onAddCard={props.onAddCard}
            onPayCard={props.onPayCard}
            onUpdateCard={props.onUpdateCard}
            onDeleteCard={props.onDeleteCard}
          />
        )}

        {currentTab === 'fds' && (
          <FixedDepositSection
            fixedDeposits={props.fixedDeposits}
            accounts={props.accounts}
            totalPrincipalPaise={props.totalFdPrincipalPaise}
            totalMaturityPaise={props.totalFdMaturityPaise}
            isLoading={props.isFdsLoading}
            onAddFD={props.onAddFD}
            onLiquidateFD={props.onLiquidateFD}
          />
        )}

        {currentTab === 'recurring' && (
          <RecurringSection
            rules={props.recurringRules}
            dueRules={props.dueRecurringRules}
            totalDuePaise={props.totalRecurringDuePaise}
            totalMonthlyPaise={props.totalMonthlyRecurringPaise}
            currentYearMonth={props.currentYearMonth}
            accounts={props.accounts}
            creditCards={props.cards}
            envelopes={props.envelopes}
            isLoading={props.isRecurringLoading}
            onAddRule={props.onAddRecurringRule}
            onToggleActive={props.onToggleRecurringRuleActive}
            onDeleteRule={props.onDeleteRecurringRule}
            onLogSingleRule={props.onLogSingleRecurringRule}
            onLogAllDue={props.onLogAllDueRecurringRules}
          />
        )}

        {currentTab === 'emis' && (
          <EmiSection
            selfEmis={props.selfEmis}
            externalEmis={props.externalEmis}
            accounts={props.accounts}
            totalSelfEmiRemainingPaise={props.totalSelfEmiRemainingPaise}
            totalExternalEmiRemainingPaise={props.totalExternalEmiRemainingPaise}
            isLoading={props.isEmisLoading}
            onAddSelfEmi={props.onAddSelfEmi}
            onPaySelfEmi={props.onPaySelfEmi}
            onUpdateSelfEmi={props.onUpdateSelfEmi}
            onDeleteSelfEmi={props.onDeleteSelfEmi}
            onAddExternalEmi={props.onAddExternalEmi}
            onPayExternalEmi={props.onPayExternalEmi}
            onUpdateExternalEmi={props.onUpdateExternalEmi}
            onDeleteExternalEmi={props.onDeleteExternalEmi}
          />
        )}

        {currentTab === 'debts' && (
          <DebtsAndLoansSection
            debtsLoans={props.debtsLoans}
            accounts={props.accounts}
            totalRemainingBalancePaise={props.totalDebtLoanRemainingPaise}
            totalBorrowedPaise={props.totalDebtLoanBorrowedPaise}
            totalRepaidPaise={props.totalDebtLoanRepaidPaise}
            isLoading={props.isDebtsLoansLoading}
            onAddDebtLoan={props.onAddDebtLoan}
            onPayDebtLoan={props.onPayDebtLoan}
            onUpdateDebtLoan={props.onUpdateDebtLoan}
            onDeleteDebtLoan={props.onDeleteDebtLoan}
          />
        )}

        {currentTab === 'targets' && (
          <MonthlyTargetsSection
            targets={props.targets}
            totalTargetAmountPaise={props.totalTargetAmountPaise}
            totalContributedPaise={props.totalContributedPaise}
            isLoading={props.isTargetsLoading}
            onAddTarget={props.onAddTarget}
            onContribute={props.onContributeTarget}
            onRemoveTarget={props.onRemoveTarget}
          />
        )}
      </div>
    </section>
  );
};
