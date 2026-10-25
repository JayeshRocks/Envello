import React, { useState } from 'react';
import { CreditCard, Landmark, RefreshCw, CalendarClock } from 'lucide-react';
import type { CreditCardWithDetails } from '@/lib/api/creditCards';
import type { FixedDepositRow } from '@/lib/api/fixedDeposits';
import type { SelfEmiWithProgress } from '@/hooks/useSelfEmis';
import type { ActualDebtRow } from '@/lib/api/actualDebts';
import type { AccountItem } from '@/lib/api/accounts';
import { CreditCardSection } from './CreditCardSection';
import { FixedDepositSection } from './FixedDepositSection';
import { SelfEmiSection } from './SelfEmiSection';
import { ActualDebtsSection } from './ActualDebtsSection';

interface LiabilitiesAndAssetsContainerProps {
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
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;

  accounts: AccountItem[];
}

export type SubTabType = 'cards' | 'fds' | 'self_emis' | 'debts';

export const LiabilitiesAndAssetsContainer: React.FC<LiabilitiesAndAssetsContainerProps> = (props) => {
  const [activeTab, setActiveTab] = useState<SubTabType>('cards');

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
  ];

  return (
    <section className="glass-card rounded-2xl border border-white/10 p-6 space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-2 transition ${
                isActive
                  ? 'bg-neutral-800 text-white shadow-lg border border-white/10'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
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
      <div>
        {activeTab === 'cards' && (
          <CreditCardSection
            cards={props.cards}
            accounts={props.accounts}
            totalOutstandingPaise={props.totalCardOutstandingPaise}
            totalLimitPaise={props.totalCardLimitPaise}
            overallUtilizationPercent={props.cardUtilizationPercent}
            isLoading={props.isCardsLoading}
            onAddCard={props.onAddCard}
            onPayCard={props.onPayCard}
          />
        )}

        {activeTab === 'fds' && (
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

        {activeTab === 'self_emis' && (
          <SelfEmiSection
            selfEmis={props.selfEmis}
            totalRemainingPaise={props.totalSelfEmiRemainingPaise}
            isLoading={props.isEmisLoading}
            onAddEmi={props.onAddEmi}
            onPayEmi={props.onPayEmi}
          />
        )}

        {activeTab === 'debts' && (
          <ActualDebtsSection
            actualDebts={props.actualDebts}
            accounts={props.accounts}
            totalRemainingDebtPaise={props.totalActualDebtRemainingPaise}
            isLoading={props.isDebtsLoading}
            onAddDebt={props.onAddDebt}
            onPayDebt={props.onPayDebt}
          />
        )}
      </div>
    </section>
  );
};
