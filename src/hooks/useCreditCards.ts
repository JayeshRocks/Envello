import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  fetchCreditCards,
  createCreditCard,
  updateCreditCard,
  recordCreditCardPayment,
  type CreditCardRow,
  type CreditCardWithDetails,
} from '@/lib/api/creditCards';
import {
  calculateCreditCardUtilization,
  getCreditCardUtilizationStatus,
} from '@/lib/accounting/calculations';

export function useCreditCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCardRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    if (!user) {
      setCards([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCreditCards(user.id);
      setCards(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch credit cards';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const cardsWithDetails: CreditCardWithDetails[] = useMemo(() => {
    return cards.map(c => {
      const util = calculateCreditCardUtilization(
        BigInt(c.outstanding_balance_paise),
        BigInt(c.credit_limit_paise)
      );
      const status = getCreditCardUtilizationStatus(util);
      return {
        ...c,
        utilization_percent: util,
        utilization_status: status,
      };
    });
  }, [cards]);

  const totalOutstandingPaise = useMemo(() => {
    return cards
      .filter(c => c.is_active)
      .reduce((sum, c) => sum + BigInt(c.outstanding_balance_paise), 0n);
  }, [cards]);

  const totalCreditLimitPaise = useMemo(() => {
    return cards
      .filter(c => c.is_active)
      .reduce((sum, c) => sum + BigInt(c.credit_limit_paise), 0n);
  }, [cards]);

  const overallUtilizationPercent = useMemo(() => {
    return calculateCreditCardUtilization(totalOutstandingPaise, totalCreditLimitPaise);
  }, [totalOutstandingPaise, totalCreditLimitPaise]);

  const addCard = async (data: {
    card_name: string;
    issuer: string;
    credit_limit_paise: number;
    outstanding_balance_paise?: number;
    statement_day: number;
    payment_due_day: number;
    warning_threshold_percent?: number;
  }) => {
    if (!user) throw new Error('Authentication required');
    const newCard = await createCreditCard(user.id, data);
    setCards(prev => [newCard, ...prev]);
    return newCard;
  };

  const payCard = async (params: {
    cardId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    await recordCreditCardPayment(user.id, params);
    await loadCards();
  };

  return {
    cards: cardsWithDetails,
    totalOutstandingPaise,
    totalCreditLimitPaise,
    overallUtilizationPercent,
    isLoading,
    error,
    refreshCards: loadCards,
    addCard,
    payCard,
    updateCard: async (cardId: string, updates: Partial<CreditCardRow>) => {
      if (!user) throw new Error('Authentication required');
      const updated = await updateCreditCard(user.id, cardId, updates);
      setCards(prev => prev.map(c => (c.id === cardId ? updated : c)));
      return updated;
    },
  };
}
