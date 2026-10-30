import { describe, it, expect } from 'vitest';
import {
  PasswordSchema,
  CreateAccountSchema,
  TransferFundsSchema,
  RecordExpenseSchema,
  CreditCardSchema,
} from './schemas';

describe('validation schemas', () => {
  describe('PasswordSchema', () => {
    it('approves compliant strong passwords (8+ chars, upper, lower, number)', () => {
      expect(PasswordSchema.safeParse('SecurePassword123').success).toBe(true);
      expect(PasswordSchema.safeParse('Envello#2026Strong').success).toBe(true);
    });

    it('rejects passwords under 8 characters', () => {
      const result = PasswordSchema.safeParse('Short1A');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });

    it('rejects passwords missing an uppercase letter', () => {
      const result = PasswordSchema.safeParse('alllowercase123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase letter');
      }
    });

    it('rejects passwords missing a lowercase letter', () => {
      const result = PasswordSchema.safeParse('ALLUPPERCASE123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('lowercase letter');
      }
    });

    it('rejects passwords missing a number', () => {
      const result = PasswordSchema.safeParse('NoNumbersHereAtAll');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least one number');
      }
    });
  });

  describe('Financial Schemas', () => {
    it('validates account creation parameters', () => {
      const valid = CreateAccountSchema.safeParse({
        name: 'HDFC Salary',
        institution: 'HDFC Bank',
        accountType: 'savings',
        initialBalancePaise: 500000n,
      });
      expect(valid.success).toBe(true);

      const invalid = CreateAccountSchema.safeParse({
        name: '',
        institution: 'SBI',
        accountType: 'savings',
      });
      expect(invalid.success).toBe(false);
    });

    it('rejects account-to-account transfer if source equals destination', () => {
      const sameId = '123e4567-e89b-12d3-a456-426614174000';
      const result = TransferFundsSchema.safeParse({
        fromAccountId: sameId,
        toAccountId: sameId,
        amountPaise: 10000n,
        description: 'Internal transfer',
        date: '2026-10-30',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be different');
      }
    });

    it('validates expense recording parameters', () => {
      const valid = RecordExpenseSchema.safeParse({
        amountPaise: 45000n,
        payee: 'Grocery Store',
        date: '2026-10-30',
      });
      expect(valid.success).toBe(true);

      const zeroAmount = RecordExpenseSchema.safeParse({
        amountPaise: 0n,
        payee: 'Free Item',
        date: '2026-10-30',
      });
      expect(zeroAmount.success).toBe(false);
    });

    it('validates credit card configuration bounds', () => {
      const valid = CreditCardSchema.safeParse({
        cardName: 'Infinia',
        issuer: 'HDFC',
        creditLimitPaise: 10000000n,
        statementDay: 15,
        paymentDueDay: 5,
        warningThresholdPercent: 30,
      });
      expect(valid.success).toBe(true);

      const invalidDay = CreditCardSchema.safeParse({
        cardName: 'Card',
        issuer: 'Bank',
        creditLimitPaise: 50000n,
        statementDay: 35, // Invalid day of month
        paymentDueDay: 10,
      });
      expect(invalidDay.success).toBe(false);
    });
  });
});
