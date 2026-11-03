-- ==============================================================================
-- Envello - Migration: 20261105000000_envelope_allocation_sources.sql
-- Description: Track physical liquid account backing and holds for envelope allocations.
--              Every envelope allocation is funded by one or more liquid accounts.
-- ==============================================================================

-- 1. Create table for tracking account-level holds for envelope allocations
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

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_alloc_sources_user_acc 
    ON public.envelope_allocation_sources(user_id, account_id);

CREATE INDEX IF NOT EXISTS idx_alloc_sources_allocation 
    ON public.envelope_allocation_sources(allocation_id);

-- 3. Row Level Security
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
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
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

-- 4. Initial Backfill: Seed allocation sources for existing active envelope allocations
-- Backfill using the user's primary/first active liquid account
INSERT INTO public.envelope_allocation_sources (user_id, allocation_id, account_id, amount_paise)
SELECT
    ea.user_id,
    ea.id,
    acc.id,
    ea.allocated_paise
FROM public.envelope_allocations ea
JOIN LATERAL (
    SELECT id FROM public.accounts a
    WHERE a.user_id = ea.user_id AND a.is_active = true
    ORDER BY a.created_at ASC
    LIMIT 1
) acc ON true
WHERE ea.allocated_paise > 0
ON CONFLICT (allocation_id, account_id) DO NOTHING;
