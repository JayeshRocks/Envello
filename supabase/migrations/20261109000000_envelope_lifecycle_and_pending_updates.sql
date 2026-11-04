-- ==============================================================================
-- Envello - Migration: 20261109000000_envelope_lifecycle_and_pending_updates.sql
-- Description:
--   1. Comprehensive envelope lifecycle support:
--      - Enable ON DELETE CASCADE on envelope_allocations (envelope deletion cleans allocations).
--      - Enable ON DELETE SET NULL on transaction_entries (envelope deletion preserves ledger records).
--      - Ensure sort_order column on envelopes with performance lookup indexes.
--   2. Default Starter Envelopes Configuration:
--      - 1st: Regular (sort_order = 0, is_system_reserved = false)
--      - 2nd: Emergency (sort_order = 1, is_system_reserved = true [Protected Reserve])
--      - 3rd: Savings (sort_order = 2, is_system_reserved = true [Protected Reserve])
--      - Followed by custom lifestyle categories (Essentials, Gym, Outing, Birthdays).
--   3. Cross-device onboarding persistence:
--      - Ensure tutorial_completed column exists on profiles.
--   4. Envelope allocation sources (account holds) table & RLS:
--      - Ensure public.envelope_allocation_sources exists with least-privilege RLS.
--   5. Idempotent trigger function handle_new_user() updated for all future signups.
-- ==============================================================================

-- 1. Ensure sort_order column exists on envelopes
ALTER TABLE public.envelopes
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_envelopes_user_sort_order
    ON public.envelopes(user_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_envelopes_user_sort
    ON public.envelopes(user_id, sort_order ASC, created_at ASC);

-- 2. Foreign Key Hardening: Allow clean envelope deletion without constraint violations
-- 2.1 envelope_allocations: Delete cascade when envelope is deleted
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'envelope_allocations_envelope_id_fkey'
          AND table_name = 'envelope_allocations'
    ) THEN
        ALTER TABLE public.envelope_allocations
            DROP CONSTRAINT envelope_allocations_envelope_id_fkey;
    END IF;

    ALTER TABLE public.envelope_allocations
        ADD CONSTRAINT envelope_allocations_envelope_id_fkey
        FOREIGN KEY (envelope_id) REFERENCES public.envelopes(id) ON DELETE CASCADE;
END $$;

-- 2.2 transaction_entries: Set envelope_id to NULL when envelope is deleted to preserve ledger history
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transaction_entries_envelope_id_fkey'
          AND table_name = 'transaction_entries'
    ) THEN
        ALTER TABLE public.transaction_entries
            DROP CONSTRAINT transaction_entries_envelope_id_fkey;
    END IF;

    ALTER TABLE public.transaction_entries
        ADD CONSTRAINT transaction_entries_envelope_id_fkey
        FOREIGN KEY (envelope_id) REFERENCES public.envelopes(id) ON DELETE SET NULL;
END $$;

-- 3. Ensure tutorial_completed column exists on public.profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.tutorial_completed IS 'Persists whether the user has completed or skipped the onboarding spotlight tutorial across all sessions and devices.';

-- 4. Ensure envelope_allocation_sources exists with RLS
CREATE TABLE IF NOT EXISTS public.envelope_allocation_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allocation_id UUID NOT NULL REFERENCES public.envelope_allocations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_allocation_account UNIQUE(allocation_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_alloc_sources_user_acc 
    ON public.envelope_allocation_sources(user_id, account_id);

CREATE INDEX IF NOT EXISTS idx_alloc_sources_allocation 
    ON public.envelope_allocation_sources(allocation_id);

ALTER TABLE public.envelope_allocation_sources ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'envelope_allocation_sources' AND policyname = 'Users can view own allocation sources'
    ) THEN
        CREATE POLICY "Users can view own allocation sources"
            ON public.envelope_allocation_sources FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'envelope_allocation_sources' AND policyname = 'Users can insert own allocation sources'
    ) THEN
        CREATE POLICY "Users can insert own allocation sources"
            ON public.envelope_allocation_sources FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'envelope_allocation_sources' AND policyname = 'Users can update own allocation sources'
    ) THEN
        CREATE POLICY "Users can update own allocation sources"
            ON public.envelope_allocation_sources FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'envelope_allocation_sources' AND policyname = 'Users can delete own allocation sources'
    ) THEN
        CREATE POLICY "Users can delete own allocation sources"
            ON public.envelope_allocation_sources FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Align existing user envelopes with default specifications
-- 5.1 Regular: 1st place, Protected Reserve OFF
UPDATE public.envelopes
SET name = 'Regular',
    is_system_reserved = false,
    sort_order = 0
WHERE slug = 'regular'
   OR name IN ('Regular / Balance', 'Regular/Balance', 'Spendable');

-- 5.2 Emergency: 2nd place, Protected Reserve ON
UPDATE public.envelopes
SET name = 'Emergency',
    is_system_reserved = true,
    sort_order = 1
WHERE slug = 'emergency'
   OR name = 'Emergency';

-- 5.3 Savings: 3rd place, Protected Reserve ON, emerald theme
UPDATE public.envelopes
SET name = 'Savings',
    icon = 'piggy-bank',
    color = '#10b981',
    is_system_reserved = true,
    sort_order = 2
WHERE slug = 'savings'
   OR name IN ('Savings & Fixed Deposits', 'Savings (Super.Money)', 'Savings and Fixed Deposit');

-- 5.4 Lifestyle categories
UPDATE public.envelopes SET sort_order = 3, is_system_reserved = false WHERE slug = 'essentials';
UPDATE public.envelopes SET sort_order = 4, is_system_reserved = false WHERE slug = 'gym';
UPDATE public.envelopes SET sort_order = 5, is_system_reserved = false WHERE slug = 'outing';
UPDATE public.envelopes SET sort_order = 6, is_system_reserved = false WHERE slug = 'birthdays';

-- For any custom user envelopes, assign sort_orders starting from 7 upwards
WITH ranked_custom AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order, created_at) + 6 AS new_order
    FROM public.envelopes
    WHERE slug NOT IN ('regular', 'emergency', 'savings', 'essentials', 'gym', 'outing', 'birthdays')
)
UPDATE public.envelopes e
SET sort_order = rc.new_order
FROM ranked_custom rc
WHERE e.id = rc.id;

-- 6. Update handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create or update Profile (always allowlisted in beta)
    INSERT INTO public.profiles (id, email, display_name, is_allowlisted, tutorial_completed)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, 'user'), '@', 1)),
        true,
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET is_allowlisted = true,
        email = COALESCE(EXCLUDED.email, profiles.email);

    -- Seed Default Envelopes:
    -- 1st: Regular (is_system_reserved: false, sort_order: 0)
    -- 2nd: Emergency (is_system_reserved: true, sort_order: 1)
    -- 3rd: Savings (is_system_reserved: true, sort_order: 2)
    -- Followed by lifestyle categories
    INSERT INTO public.envelopes (user_id, name, slug, icon, color, is_system_reserved, rollover_policy, sort_order)
    VALUES
        (new.id, 'Regular', 'regular', 'wallet', '#0ea5e9', false, 'carry_forward', 0),
        (new.id, 'Emergency', 'emergency', 'shield-alert', '#ef4444', true, 'carry_forward', 1),
        (new.id, 'Savings', 'savings', 'piggy-bank', '#10b981', true, 'carry_forward', 2),
        (new.id, 'Essentials', 'essentials', 'shopping-cart', '#f59e0b', false, 'carry_forward', 3),
        (new.id, 'Gym', 'gym', 'dumbbell', '#10b981', false, 'carry_forward', 4),
        (new.id, 'Outing', 'outing', 'utensils', '#8b5cf6', false, 'sweep_to_regular', 5),
        (new.id, 'Birthdays', 'birthdays', 'gift', '#ec4899', false, 'carry_forward', 6)
    ON CONFLICT (user_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order,
        is_system_reserved = EXCLUDED.is_system_reserved;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
        RETURN new;
END;
$$;
