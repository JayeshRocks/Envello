-- ==============================================================================
-- Envello - Phase 1 Initial Database Schema Migration
-- Migration: 20261025000000_initial_schema.sql
-- Description: Core financial schema, RLS policies on 100% of tables, and atomic RPCs
-- ==============================================================================

-- 1. Profiles & Private Beta Allowlist
CREATE TABLE IF NOT EXISTS public.allowed_users (
    email TEXT PRIMARY KEY,
    granted_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of allowed_users during login verification"
    ON public.allowed_users FOR SELECT
    TO authenticated
    USING (true);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    base_currency TEXT NOT NULL DEFAULT 'INR',
    is_allowlisted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. Liquid Accounts (Checking, Savings, Cash)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'cash', 'other')),
    balance_paise BIGINT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own accounts SELECT" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own accounts INSERT" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own accounts UPDATE" ON public.accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own accounts DELETE" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- 3. Envelopes & Budget Periods
CREATE TABLE IF NOT EXISTS public.envelopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_system_reserved BOOLEAN NOT NULL DEFAULT false,
    rollover_policy TEXT NOT NULL DEFAULT 'carry_forward' CHECK (rollover_policy IN ('carry_forward', 'sweep_to_regular', 'reset')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_envelopes_user ON public.envelopes(user_id);
ALTER TABLE public.envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own envelopes SELECT" ON public.envelopes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own envelopes INSERT" ON public.envelopes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own envelopes UPDATE" ON public.envelopes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own envelopes DELETE" ON public.envelopes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.budget_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_key TEXT NOT NULL, -- 'YYYY-MM'
    is_closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_periods_user ON public.budget_periods(user_id);
ALTER TABLE public.budget_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own periods SELECT" ON public.budget_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own periods INSERT" ON public.budget_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own periods UPDATE" ON public.budget_periods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own periods DELETE" ON public.budget_periods FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.envelope_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    envelope_id UUID NOT NULL REFERENCES public.envelopes(id) ON DELETE RESTRICT,
    period_id UUID NOT NULL REFERENCES public.budget_periods(id) ON DELETE CASCADE,
    allocated_paise BIGINT NOT NULL DEFAULT 0,
    spent_paise BIGINT NOT NULL DEFAULT 0,
    carried_over_paise BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, envelope_id, period_id)
);

CREATE INDEX IF NOT EXISTS idx_allocations_lookup ON public.envelope_allocations(user_id, period_id, envelope_id);
ALTER TABLE public.envelope_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage allocations SELECT" ON public.envelope_allocations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage allocations INSERT" ON public.envelope_allocations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage allocations UPDATE" ON public.envelope_allocations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage allocations DELETE" ON public.envelope_allocations FOR DELETE USING (auth.uid() = user_id);

-- 4. Transactions & Double-Entry Ledger
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'income', 'expense', 'transfer', 'envelope_allocation',
        'credit_card_purchase', 'credit_card_payment', 'fd_movement',
        'self_emi_repayment', 'debt_repayment', 'refund', 'adjustment'
    )),
    total_amount_paise BIGINT NOT NULL CHECK (total_amount_paise > 0),
    description TEXT NOT NULL,
    notes TEXT,
    linked_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage transactions SELECT" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage transactions INSERT" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage transactions UPDATE" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage transactions DELETE" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.transaction_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE RESTRICT,
    envelope_id UUID REFERENCES public.envelopes(id) ON DELETE RESTRICT,
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_entries_lookup ON public.transaction_entries(user_id, transaction_id);
ALTER TABLE public.transaction_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage entries SELECT" ON public.transaction_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage entries INSERT" ON public.transaction_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage entries UPDATE" ON public.transaction_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage entries DELETE" ON public.transaction_entries FOR DELETE USING (auth.uid() = user_id);

-- 5. Credit Cards & Statements
CREATE TABLE IF NOT EXISTS public.credit_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_name TEXT NOT NULL,
    issuer TEXT NOT NULL,
    credit_limit_paise BIGINT NOT NULL CHECK (credit_limit_paise > 0),
    outstanding_balance_paise BIGINT NOT NULL DEFAULT 0,
    statement_day INT NOT NULL CHECK (statement_day BETWEEN 1 AND 31),
    payment_due_day INT NOT NULL CHECK (payment_due_day BETWEEN 1 AND 31),
    warning_threshold_percent INT NOT NULL DEFAULT 30 CHECK (warning_threshold_percent BETWEEN 1 AND 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cards_user ON public.credit_cards(user_id);
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage credit cards SELECT" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage credit cards INSERT" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage credit cards UPDATE" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage credit cards DELETE" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.credit_card_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    statement_date DATE NOT NULL,
    due_date DATE NOT NULL,
    statement_balance_paise BIGINT NOT NULL,
    minimum_payment_paise BIGINT NOT NULL DEFAULT 0,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.credit_card_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage statements SELECT" ON public.credit_card_statements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage statements INSERT" ON public.credit_card_statements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage statements UPDATE" ON public.credit_card_statements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage statements DELETE" ON public.credit_card_statements FOR DELETE USING (auth.uid() = user_id);

-- 6. Fixed Deposits & Savings Assets
CREATE TABLE IF NOT EXISTS public.fixed_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    principal_paise BIGINT NOT NULL CHECK (principal_paise > 0),
    interest_rate_percent NUMERIC(5, 2) NOT NULL,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    maturity_amount_paise BIGINT NOT NULL,
    is_liquidated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.fixed_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage FDs SELECT" ON public.fixed_deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage FDs INSERT" ON public.fixed_deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage FDs UPDATE" ON public.fixed_deposits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage FDs DELETE" ON public.fixed_deposits FOR DELETE USING (auth.uid() = user_id);

-- 7. Self EMIs & Actual Debts
CREATE TABLE IF NOT EXISTS public.self_emis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    total_funded_paise BIGINT NOT NULL CHECK (total_funded_paise > 0),
    monthly_reimbursement_paise BIGINT NOT NULL CHECK (monthly_reimbursement_paise > 0),
    total_reimbursed_paise BIGINT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.self_emis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage self EMIs SELECT" ON public.self_emis FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage self EMIs INSERT" ON public.self_emis FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage self EMIs UPDATE" ON public.self_emis FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage self EMIs DELETE" ON public.self_emis FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.actual_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lender_name TEXT NOT NULL,
    initial_debt_paise BIGINT NOT NULL CHECK (initial_debt_paise > 0),
    remaining_debt_paise BIGINT NOT NULL,
    monthly_instalment_paise BIGINT NOT NULL,
    due_date DATE,
    is_settled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.actual_debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage actual debts SELECT" ON public.actual_debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage actual debts INSERT" ON public.actual_debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage actual debts UPDATE" ON public.actual_debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage actual debts DELETE" ON public.actual_debts FOR DELETE USING (auth.uid() = user_id);

-- 8. Monthly Targets & Audit Logs
CREATE TABLE IF NOT EXISTS public.monthly_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount_paise BIGINT NOT NULL CHECK (target_amount_paise > 0),
    target_date DATE NOT NULL,
    current_contributed_paise BIGINT NOT NULL DEFAULT 0,
    is_achieved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage targets SELECT" ON public.monthly_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage targets INSERT" ON public.monthly_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage targets UPDATE" ON public.monthly_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage targets DELETE" ON public.monthly_targets FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_name TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'ADJUSTMENT')),
    old_state JSONB,
    new_state JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own audit logs SELECT" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert audit logs INSERT" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Automatic Profile Creation & Default Envelopes Seeding Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_allowlisted BOOLEAN := false;
BEGIN
    -- Check if email exists in allowed_users
    SELECT EXISTS (
        SELECT 1 FROM public.allowed_users WHERE email = new.email
    ) INTO v_is_allowlisted;

    -- Create Profile
    INSERT INTO public.profiles (id, email, display_name, is_allowlisted)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        v_is_allowlisted
    );

    -- Seed Owner Default Envelopes
    INSERT INTO public.envelopes (user_id, name, slug, icon, color, is_system_reserved, rollover_policy)
    VALUES
        (new.id, 'Regular / Balance', 'regular', 'wallet', '#0ea5e9', true, 'carry_forward'),
        (new.id, 'Emergency', 'emergency', 'shield-alert', '#ef4444', true, 'carry_forward'),
        (new.id, 'Gym', 'gym', 'dumbbell', '#10b981', false, 'carry_forward'),
        (new.id, 'Essentials', 'essentials', 'shopping-cart', '#f59e0b', false, 'carry_forward'),
        (new.id, 'Outing', 'outing', 'utensils', '#8b5cf6', false, 'sweep_to_regular'),
        (new.id, 'Birthdays', 'birthdays', 'gift', '#ec4899', false, 'carry_forward'),
        (new.id, 'Savings (Super.Money)', 'savings', 'piggy-bank', '#eab308', true, 'carry_forward'),
        (new.id, 'Credit Cards', 'credit-cards', 'credit-card', '#6366f1', true, 'carry_forward'),
        (new.id, 'EMI(s)', 'emis', 'calendar-clock', '#f97316', true, 'carry_forward'),
        (new.id, 'Monthly Targets', 'monthly-targets', 'target', '#06b6d4', true, 'carry_forward');

    RETURN new;
END;
$$;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Atomic Account-to-Account Transfer RPC
CREATE OR REPLACE FUNCTION public.execute_account_transfer(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount_paise BIGINT,
    p_description TEXT,
    p_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_transaction_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF p_amount_paise <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    -- Debit source account
    UPDATE public.accounts
    SET balance_paise = balance_paise - p_amount_paise, updated_at = now()
    WHERE id = p_from_account_id AND user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Source account not found or unauthorized'; END IF;

    -- Credit destination account
    UPDATE public.accounts
    SET balance_paise = balance_paise + p_amount_paise, updated_at = now()
    WHERE id = p_to_account_id AND user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination account not found or unauthorized'; END IF;

    -- Insert master transaction
    INSERT INTO public.transactions (user_id, transaction_date, type, total_amount_paise, description)
    VALUES (v_user_id, p_date, 'transfer', p_amount_paise, p_description)
    RETURNING id INTO v_transaction_id;

    -- Insert debit leg
    INSERT INTO public.transaction_entries (transaction_id, user_id, account_id, direction, amount_paise)
    VALUES (v_transaction_id, v_user_id, p_from_account_id, 'debit', p_amount_paise);

    -- Insert credit leg
    INSERT INTO public.transaction_entries (transaction_id, user_id, account_id, direction, amount_paise)
    VALUES (v_transaction_id, v_user_id, p_to_account_id, 'credit', p_amount_paise);

    RETURN v_transaction_id;
END;
$$;
