import React, { useState } from 'react';
import { CreditCard, Landmark, RefreshCw, CalendarClock, Target } from 'lucide-react';
import type { CreditCardWithDetails, CreditCardRow } from '@/lib/api/creditCards';
import type { FixedDepositRow } from '@/lib/api/fixedDeposits';
import type { SelfEmiWithProgress } from '@/hooks/useSelfEmis';
import type { SelfEmiInsert } from '@/lib/api/selfEmis';
import type { ActualDebtRow, ActualDebtInsert } from '@/lib/api/actualDebts';
import type { AccountItem } from '@/lib/api/accounts';
import type { MonthlyTargetWithProgress } from '@/hooks/useMonthlyTargets';
import type { RecurringRule, CreateRecurringRuleParams } from '@/types/recurring.types';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { CreditCardSection } from './CreditCardSection';
import { FixedDepositSection } from './FixedDepositSection';
import { RecurringSection } from './RecurringSection';
import { SelfEmiSection } from './SelfEmiSection';
import { ActualDebtsSection } from './ActualDebtsSection';
import { MonthlyTargetsSection } from '@/components/targets/MonthlyTargetsSection';

export type SubTabType = 'cards' | 'fds' | 'recurring' | 'self_emis' | 'debts' | 'targets';

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

  // Self EMIs
  selfEmis: SelfEmiWithProgress[];
  totalSelfEmiRemainingPaise: bigint;
  isEmisLoading: boolean;
  onAddEmi: (params: {
    description: string;
    total_funded_paise: number;
    monthly_reimbursement_paise: number;
    start_date?: string;
  }) => Promise<void>;
  onPayEmi: (params: {
    emiId: string;
    amountPaise: number;
  }) => Promise<void>;
  onUpdateEmi?: (emiId: string, updates: Partial<SelfEmiInsert>) => Promise<void>;
  onDeleteEmi?: (emiId: string) => Promise<void>;

  // Actual Debts
  actualDebts: ActualDebtRow[];
  totalActualDebtRemainingPaise: bigint;
  isDebtsLoading: boolean;
  onAddDebt: (params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }) => Promise<void>;
  onPayDebt: (params: {
    debtId: string;
    amountPaise: number;
    fromAccountId: string;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateDebt?: (debtId: string, updates: Partial<ActualDebtInsert>) => Promise<void>;
  onDeleteDebt?: (debtId: string) => Promise<void>;

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
      name: 'Savings & FDs',
      icon: Landmark,
      count: props.fixedDeposits.filter((f) => !f.is_liquidated).length,
      badgeColor: 'text-emerald-400',
    },
    {
      id: 'recurring' as const,
      name: 'Recurring Costs',
      icon: CalendarClock,
      count: props.recurringRules.filter((r) => r.isActive).length,
      badgeColor: props.dueRecurringRules.length > 0 ? 'text-amber-400 font-bold' : 'text-indigo-400',
    },
    {
      id: 'self_emis' as const,
      name: 'Self EMIs',
      icon: RefreshCw,
      count: props.selfEmis.filter((e) => !e.is_completed).length,
      badgeColor: 'text-indigo-400',
    },
    {
      id: 'debts' as const,
      name: 'Actual Debts',
      icon: CalendarClock,
      count: props.actualDebts.filter((d) => !d.is_settled).length,
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
      className="glass-card rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden scroll-mt-20"
    >
      {/* Tab Navigation header */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3 sm:pb-4 overflow-x-auto scrollbar-none flex-nowrap w-full min-w-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              className={`px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center space-x-2 transition-all duration-200 active:scale-95 flex-shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[40px] ${
                isActive
                  ? 'bg-neutral-800 text-white shadow-lg border border-white/10 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{tab.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-white/10' : 'bg-neutral-800'
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
            envelopes={props.envelopes}
            isLoading={props.isRecurringLoading}
            onAddRule={props.onAddRecurringRule}
            onToggleActive={props.onToggleRecurringRuleActive}
            onDeleteRule={props.onDeleteRecurringRule}
            onLogSingleRule={props.onLogSingleRecurringRule}
            onLogAllDue={props.onLogAllDueRecurringRules}
          />
        )}

        {currentTab === 'self_emis' && (
          <SelfEmiSection
            selfEmis={props.selfEmis}
            totalRemainingPaise={props.totalSelfEmiRemainingPaise}
            isLoading={props.isEmisLoading}
            onAddEmi={props.onAddEmi}
            onPayEmi={props.onPayEmi}
            onUpdateEmi={props.onUpdateEmi}
            onDeleteEmi={props.onDeleteEmi}
          />
        )}

        {currentTab === 'debts' && (
          <ActualDebtsSection
            actualDebts={props.actualDebts}
            accounts={props.accounts}
            totalRemainingDebtPaise={props.totalActualDebtRemainingPaise}
            isLoading={props.isDebtsLoading}
            onAddDebt={props.onAddDebt}
            onPayDebt={props.onPayDebt}
            onUpdateDebt={props.onUpdateDebt}
            onDeleteDebt={props.onDeleteDebt}
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
