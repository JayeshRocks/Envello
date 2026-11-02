-- Migration: 20261102000000_savings_and_deposits_types.sql
-- Description: Expand fixed_deposits table to support Recurring Deposits (RDs)

ALTER TABLE public.fixed_deposits 
  ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'fd' CHECK (deposit_type IN ('fd', 'rd')),
  ADD COLUMN IF NOT EXISTS monthly_deposit_paise BIGINT DEFAULT 0;

COMMENT ON COLUMN public.fixed_deposits.deposit_type IS 'Type of term deposit: fd (Fixed Deposit) or rd (Recurring Deposit)';
COMMENT ON COLUMN public.fixed_deposits.monthly_deposit_paise IS 'Monthly contribution in paise for recurring deposits (RD)';
