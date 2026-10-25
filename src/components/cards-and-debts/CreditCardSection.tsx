import React, { useState } from 'react';
import { CreditCard, Plus, ArrowUpRight, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import type { CreditCardWithDetails } from '@/lib/api/creditCards';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR } from '@/lib/accounting/currency';
import { AddCreditCardModal } from './AddCreditCardModal';
import { RecordCardPaymentModal } from './RecordCardPaymentModal';

interface CreditCardSectionProps {
  cards: CreditCardWithDetails[];
  accounts: AccountItem[];
  totalOutstandingPaise: bigint;
  totalLimitPaise: bigint;
  overallUtilizationPercent: number;
  isLoading: boolean;
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
}

export const CreditCardSection: React.FC<CreditCardSectionProps> = ({
  cards,
  accounts,
  totalOutstandingPaise,
  totalLimitPaise,
  overallUtilizationPercent,
  isLoading,
  onAddCard,
  onPayCard,
}) => {
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<string | undefined>();

  const handleOpenPayment = (cardId?: string) => {
    setSelectedCardForPayment(cardId);
    setIsPaymentOpen(true);
  };

  const getStatusBadge = (status: 'safe' | 'warning' | 'danger', percent: number) => {
    if (status === 'safe') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" />
          <span>{percent.toFixed(1)}% Safe (&lt;30%)</span>
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" />
          <span>{percent.toFixed(1)}% Warning (30-50%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
        <ShieldAlert className="w-3 h-3" />
        <span>{percent.toFixed(1)}% Danger (&gt;50%)</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-white">Credit Cards & Liabilities</h3>
            <span className="text-xs text-neutral-400">({cards.length} active)</span>
          </div>
          <p className="text-xs text-neutral-400">
            Total Outstanding: <span className="font-mono text-purple-400 font-semibold">{formatINR(totalOutstandingPaise)}</span> of{' '}
            <span className="font-mono text-neutral-300">{formatINR(totalLimitPaise)}</span> ({overallUtilizationPercent.toFixed(1)}% aggregate)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {cards.length > 0 && accounts.length > 0 && (
            <button
              onClick={() => handleOpenPayment()}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-sky-400 border border-sky-500/20 font-medium flex items-center space-x-1.5 transition"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Pay Bill</span>
            </button>
          )}
          <button
            onClick={() => setIsAddCardOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-medium shadow-lg shadow-purple-600/20 flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-neutral-500">Loading credit cards...</div>
      ) : cards.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="text-xs text-neutral-400">No credit cards added yet.</div>
          <button
            onClick={() => setIsAddCardOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-white/10 transition"
          >
            Add Your First Credit Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const util = card.utilization_percent;
            const status = card.utilization_status;
            const barColor =
              status === 'safe'
                ? 'bg-emerald-500'
                : status === 'warning'
                ? 'bg-amber-500'
                : 'bg-red-500';

            return (
              <div
                key={card.id}
                className="glass-card rounded-2xl p-5 border border-white/10 relative overflow-hidden space-y-4 hover:border-purple-500/30 transition group"
              >
                {/* Visual Top Bar */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs text-neutral-400 font-medium tracking-wide uppercase">
                      {card.issuer}
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-purple-300 transition">
                      {card.card_name}
                    </div>
                  </div>
                  {getStatusBadge(status, util)}
                </div>

                {/* Balances */}
                <div className="space-y-1">
                  <div className="text-[11px] text-neutral-400">Outstanding Balance</div>
                  <div className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
                    {formatINR(card.outstanding_balance_paise)}
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
                    <span>Limit: {formatINR(card.credit_limit_paise)}</span>
                    <span className="font-mono text-neutral-300 font-medium">
                      Available: {formatINR(Math.max(0, card.credit_limit_paise - card.outstanding_balance_paise))}
                    </span>
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1.5">
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${barColor} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, util))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>Cycle: {card.statement_day}th stmt</span>
                    <span>Due: {card.payment_due_day}th</span>
                  </div>
                </div>

                {/* Action footer */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400">
                    {card.outstanding_balance_paise === 0
                      ? 'Fully settled'
                      : 'Unsettled liability'}
                  </span>
                  {card.outstanding_balance_paise > 0 && accounts.length > 0 && (
                    <button
                      onClick={() => handleOpenPayment(card.id)}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center space-x-1"
                    >
                      <span>Pay Bill</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Card Modal */}
      <AddCreditCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onAddCard={async (data) => {
          await onAddCard(data);
        }}
      />

      {/* Record Payment Modal */}
      <RecordCardPaymentModal
        isOpen={isPaymentOpen}
        cards={cards}
        accounts={accounts}
        preselectedCardId={selectedCardForPayment}
        onClose={() => setIsPaymentOpen(false)}
        onRecordPayment={async (params) => {
          await onPayCard(params);
        }}
      />
    </div>
  );
};
