-- Migration: 20261102000001_debts_and_loans_schema.sql
-- Description: Create dedicated debts_loans table for manual-pay personal loans and debts

CREATE TABLE IF NOT EXISTS public.debts_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lender_name TEXT NOT NULL CHECK (char_length(lender_name) BETWEEN 1 AND 150),
    borrowed_amount_paise BIGINT NOT NULL CHECK (borrowed_amount_paise > 0),
    remaining_balance_paise BIGINT NOT NULL CHECK (remaining_balance_paise >= 0),
    interest_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (interest_rate_percent >= 0),
    due_date DATE,
    notes TEXT,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.debts_loans ENABLE ROW LEVEL SECURITY;

-- Least-privilege RLS Policy: Authenticated users can manage strictly their own records
CREATE POLICY "Users can manage their own debts and loans"
    ON public.debts_loans
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_debts_loans_user ON public.debts_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_loans_active ON public.debts_loans(user_id, due_date) WHERE is_settled = false;

COMMENT ON TABLE public.debts_loans IS 'Personal debts, friend/family borrowings, and manual-pay lump-sum loans';
