/**
 * Boundary Schema Validators
 * Enforces strict typing, length constraints, and format validation
 * across all user forms before invoking database or API operations.
 */

import { z } from 'zod';

export function getFirstZodError(error: z.ZodError, defaultMsg: string = 'Validation failed.'): string {
  const issue = error.issues?.[0];
  if (issue?.message) return issue.message;
  const legacy = (error as unknown as { errors?: Array<{ message?: string }> }).errors?.[0];
  if (legacy?.message) return legacy.message;
  return defaultMsg;
}

// ==============================================================================
// Authentication Schemas
// ==============================================================================

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must not exceed 128 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const EmailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address.')
  .max(254, 'Email must not exceed 254 characters.');

export const SignUpFormSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const SetPasswordFormSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

// ==============================================================================
// Financial Resource Schemas
// ==============================================================================

export const AccountTypeSchema = z.enum(['checking', 'savings', 'cash', 'other']);

export const CreateAccountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required.').max(100, 'Account name max 100 characters.'),
  institution: z.string().trim().min(1, 'Institution name is required.').max(100, 'Institution max 100 characters.'),
  accountType: AccountTypeSchema,
  initialBalancePaise: z.bigint().nonnegative('Initial balance cannot be negative.').default(0n),
});

export const CreateEnvelopeSchema = z.object({
  name: z.string().trim().min(1, 'Envelope name is required.').max(100, 'Envelope name max 100 characters.'),
  icon: z.string().trim().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid 6-character hex code.').optional(),
  rolloverPolicy: z.enum(['carry_forward', 'sweep_to_regular', 'reset']).default('carry_forward'),
});

export const TransactionDirectionSchema = z.enum(['credit', 'debit']);

export const RecordExpenseSchema = z.object({
  amountPaise: z.bigint().positive('Expense amount must be greater than zero.'),
  payee: z.string().trim().min(1, 'Payee or description is required.').max(500, 'Description max 500 characters.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD.'),
  notes: z.string().max(2000, 'Notes max 2000 characters.').optional(),
  accountId: z.string().uuid().optional().nullable(),
  cardId: z.string().uuid().optional().nullable(),
  envelopeId: z.string().optional().nullable(),
});

export const TransferFundsSchema = z.object({
  fromAccountId: z.string().uuid('Source account is required.'),
  toAccountId: z.string().uuid('Destination account is required.'),
  amountPaise: z.bigint().positive('Transfer amount must be greater than zero.'),
  description: z.string().trim().min(1, 'Transfer note is required.').max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD.'),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: 'Source and destination accounts must be different.',
  path: ['toAccountId'],
});

export const CreditCardSchema = z.object({
  cardName: z.string().trim().min(1, 'Card name is required.').max(100),
  issuer: z.string().trim().min(1, 'Issuer is required.').max(100),
  creditLimitPaise: z.bigint().positive('Credit limit must be greater than zero.'),
  statementDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  warningThresholdPercent: z.number().int().min(1).max(100).default(30),
});

export const ActualDebtSchema = z.object({
  lenderName: z.string().trim().min(1, 'Lender name is required.').max(100),
  initialDebtPaise: z.bigint().positive('Initial debt must be greater than zero.'),
  monthlyInstalmentPaise: z.bigint().positive('Monthly instalment must be greater than zero.'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD.').optional().nullable(),
});

export const MonthlyTargetSchema = z.object({
  title: z.string().trim().min(1, 'Target title is required.').max(200),
  targetAmountPaise: z.bigint().positive('Target amount must be greater than zero.'),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD.'),
});
