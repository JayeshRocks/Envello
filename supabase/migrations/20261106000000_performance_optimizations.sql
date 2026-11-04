-- ==============================================================================
-- Envello - Migration: 20261106000000_performance_optimizations.sql
-- Description: Database indexes and atomic RPC functions for instant budget allocation
--              and transaction reversions without client-side network round-trip bottlenecks.
-- ==============================================================================

-- 1. High-frequency lookup and foreign-key indexes
CREATE INDEX IF NOT EXISTS idx_entries_envelope 
    ON public.transaction_entries(envelope_id);

CREATE INDEX IF NOT EXISTS idx_entries_account 
    ON public.transaction_entries(account_id);

CREATE INDEX IF NOT EXISTS idx_entries_user_env 
    ON public.transaction_entries(user_id, envelope_id);

CREATE INDEX IF NOT EXISTS idx_entries_user_acc 
    ON public.transaction_entries(user_id, account_id);

CREATE INDEX IF NOT EXISTS idx_entries_user_created 
    ON public.transaction_entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_budget_periods_user_key 
    ON public.budget_periods(user_id, period_key);

CREATE INDEX IF NOT EXISTS idx_allocations_period_user 
    ON public.envelope_allocations(period_id, user_id);

CREATE INDEX IF NOT EXISTS idx_allocations_envelope_user 
    ON public.envelope_allocations(envelope_id, user_id);

CREATE INDEX IF NOT EXISTS idx_alloc_sources_alloc_user 
    ON public.envelope_allocation_sources(allocation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_alloc_sources_acc_user 
    ON public.envelope_allocation_sources(account_id, user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_active 
    ON public.accounts(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_envelopes_user_sort 
    ON public.envelopes(user_id, sort_order ASC, created_at ASC);

-- 2. Atomic Envelope Allocation Stored Function
CREATE OR REPLACE FUNCTION public.upsert_envelope_allocation_atomic(
    p_envelope_id UUID,
    p_year_month TEXT,
    p_allocated_paise BIGINT,
    p_funding_sources JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_period_id UUID;
    v_allocation_id UUID;
    v_existing_spent BIGINT := 0;
    v_existing_carried BIGINT := 0;
    v_src JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_allocated_paise < 0 THEN
        RAISE EXCEPTION 'Allocation amount cannot be negative';
    END IF;

    -- 1. Get or create budget period
    SELECT id INTO v_period_id
    FROM public.budget_periods
    WHERE user_id = v_user_id AND period_key = p_year_month;

    IF v_period_id IS NULL THEN
        INSERT INTO public.budget_periods (user_id, period_key)
        VALUES (v_user_id, p_year_month)
        RETURNING id INTO v_period_id;
    END IF;

    -- 2. Check existing allocation and invariant
    SELECT id, COALESCE(spent_paise, 0), COALESCE(carried_over_paise, 0)
    INTO v_allocation_id, v_existing_spent, v_existing_carried
    FROM public.envelope_allocations
    WHERE user_id = v_user_id AND envelope_id = p_envelope_id AND period_id = v_period_id;

    IF p_allocated_paise + v_existing_carried < v_existing_spent THEN
        RAISE EXCEPTION 'Cannot set allocation lower than already spent funds';
    END IF;

    -- 3. Upsert allocation
    IF v_allocation_id IS NOT NULL THEN
        UPDATE public.envelope_allocations
        SET allocated_paise = p_allocated_paise,
            updated_at = now()
        WHERE id = v_allocation_id;
    ELSE
        INSERT INTO public.envelope_allocations (user_id, envelope_id, period_id, allocated_paise, carried_over_paise, spent_paise)
        VALUES (v_user_id, p_envelope_id, v_period_id, p_allocated_paise, 0, 0)
        RETURNING id INTO v_allocation_id;
    END IF;

    -- 4. Sync allocation sources
    DELETE FROM public.envelope_allocation_sources
    WHERE user_id = v_user_id AND allocation_id = v_allocation_id;

    IF p_allocated_paise > 0 AND p_funding_sources IS NOT NULL AND jsonb_array_length(p_funding_sources) > 0 THEN
        FOR v_src IN SELECT * FROM jsonb_array_elements(p_funding_sources)
        LOOP
            IF (v_src->>'amountPaise')::bigint > 0 THEN
                INSERT INTO public.envelope_allocation_sources (user_id, allocation_id, account_id, amount_paise)
                VALUES (
                    v_user_id,
                    v_allocation_id,
                    (v_src->>'accountId')::uuid,
                    (v_src->>'amountPaise')::bigint
                )
                ON CONFLICT (allocation_id, account_id) DO UPDATE
                SET amount_paise = EXCLUDED.amount_paise,
                    updated_at = now();
            END IF;
        END LOOP;
    ELSIF p_allocated_paise > 0 THEN
        -- Fallback: auto-assign to primary active account
        INSERT INTO public.envelope_allocation_sources (user_id, allocation_id, account_id, amount_paise)
        SELECT v_user_id, v_allocation_id, a.id, p_allocated_paise
        FROM public.accounts a
        WHERE a.user_id = v_user_id AND a.is_active = true
        ORDER BY a.created_at ASC
        LIMIT 1
        ON CONFLICT (allocation_id, account_id) DO NOTHING;
    END IF;

    RETURN v_allocation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_envelope_allocation_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_envelope_allocation_atomic TO authenticated;

-- 3. Atomic Transaction Reversion Stored Function
CREATE OR REPLACE FUNCTION public.revert_transaction_atomic(
    p_transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_tx RECORD;
    v_entry RECORD;
    v_period_id UUID;
    v_tx_year_month TEXT;
    v_env RECORD;
    v_alloc RECORD;
    v_acc RECORD;
    v_total_holds BIGINT;
    v_is_surplus BOOLEAN;
    v_adjustment BIGINT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Fetch transaction
    SELECT * INTO v_tx
    FROM public.transactions
    WHERE id = p_transaction_id AND user_id = v_user_id;

    IF v_tx IS NULL THEN
        RAISE EXCEPTION 'Transaction not found or unauthorized';
    END IF;

    v_tx_year_month := to_char(v_tx.transaction_date, 'YYYY-MM');

    -- Resolve budget period of the transaction
    SELECT id INTO v_period_id
    FROM public.budget_periods
    WHERE user_id = v_user_id AND period_key = v_tx_year_month;

    -- Pre-validation checks for envelopes & accounts
    FOR v_entry IN
        SELECT * FROM public.transaction_entries
        WHERE transaction_id = p_transaction_id AND user_id = v_user_id
    LOOP
        -- Envelope checks
        IF v_entry.envelope_id IS NOT NULL AND v_period_id IS NOT NULL THEN
            IF (v_tx.type = 'income' AND v_entry.direction = 'credit') OR
               (v_tx.type = 'envelope_allocation' AND v_entry.direction = 'debit') THEN
                SELECT * INTO v_alloc
                FROM public.envelope_allocations
                WHERE user_id = v_user_id AND envelope_id = v_entry.envelope_id AND period_id = v_period_id;

                SELECT * INTO v_env
                FROM public.envelopes
                WHERE id = v_entry.envelope_id AND user_id = v_user_id;

                IF v_alloc IS NOT NULL THEN
                    IF v_entry.amount_paise > (COALESCE(v_alloc.allocated_paise, 0) + COALESCE(v_alloc.carried_over_paise, 0) - COALESCE(v_alloc.spent_paise, 0)) THEN
                        RAISE EXCEPTION 'Cannot revert: "%" has already spent these funds. Deducting would force envelope into negative balance.', COALESCE(v_env.name, 'Envelope');
                    END IF;
                END IF;
            END IF;
        END IF;

        -- Account checks
        IF v_entry.account_id IS NOT NULL THEN
            v_is_surplus := (v_tx.type = 'adjustment' AND (v_tx.description LIKE '%(+%' OR v_entry.direction = 'credit'))
                            OR (v_tx.type = 'income' AND v_entry.direction = 'debit')
                            OR (v_tx.type = 'transfer' AND v_entry.direction = 'debit');

            IF v_is_surplus THEN
                SELECT * INTO v_acc
                FROM public.accounts
                WHERE id = v_entry.account_id AND user_id = v_user_id;

                IF v_acc IS NOT NULL THEN
                    IF v_acc.balance_paise < v_entry.amount_paise THEN
                        RAISE EXCEPTION 'Cannot revert: Account "%" balance would drop below zero', v_acc.name;
                    END IF;

                    SELECT COALESCE(SUM(amount_paise), 0) INTO v_total_holds
                    FROM public.envelope_allocation_sources
                    WHERE user_id = v_user_id AND account_id = v_entry.account_id;

                    IF v_acc.balance_paise - v_entry.amount_paise < v_total_holds THEN
                        RAISE EXCEPTION 'Cannot revert: Account "%" has funds reserved in envelope holds', v_acc.name;
                    END IF;
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- Execution phase: reverse accounts
    FOR v_entry IN
        SELECT * FROM public.transaction_entries
        WHERE transaction_id = p_transaction_id AND user_id = v_user_id
    LOOP
        IF v_entry.account_id IS NOT NULL THEN
            SELECT * INTO v_acc
            FROM public.accounts
            WHERE id = v_entry.account_id AND user_id = v_user_id;

            IF v_acc IS NOT NULL THEN
                IF v_tx.type = 'adjustment' THEN
                    v_is_surplus := v_tx.description LIKE '%(+%' OR v_entry.direction = 'credit';
                    v_adjustment := CASE WHEN v_is_surplus THEN -v_entry.amount_paise ELSE v_entry.amount_paise END;
                ELSE
                    v_adjustment := CASE WHEN v_entry.direction = 'credit' THEN v_entry.amount_paise ELSE -v_entry.amount_paise END;
                END IF;

                UPDATE public.accounts
                SET balance_paise = balance_paise + v_adjustment,
                    updated_at = now()
                WHERE id = v_entry.account_id AND user_id = v_user_id;
            END IF;
        END IF;
    END LOOP;

    -- Execution phase: reverse envelopes
    FOR v_entry IN
        SELECT * FROM public.transaction_entries
        WHERE transaction_id = p_transaction_id AND user_id = v_user_id
    LOOP
        IF v_entry.envelope_id IS NOT NULL AND v_period_id IS NOT NULL THEN
            SELECT * INTO v_alloc
            FROM public.envelope_allocations
            WHERE user_id = v_user_id AND envelope_id = v_entry.envelope_id AND period_id = v_period_id;

            IF v_alloc IS NOT NULL THEN
                IF v_tx.type = 'expense' AND v_entry.direction = 'debit' THEN
                    UPDATE public.envelope_allocations
                    SET spent_paise = GREATEST(0, spent_paise - v_entry.amount_paise),
                        updated_at = now()
                    WHERE id = v_alloc.id;
                ELSIF v_tx.type = 'income' AND v_entry.direction = 'credit' THEN
                    UPDATE public.envelope_allocations
                    SET allocated_paise = GREATEST(0, allocated_paise - v_entry.amount_paise),
                        updated_at = now()
                    WHERE id = v_alloc.id;
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- Delete entries and transaction
    DELETE FROM public.transaction_entries
    WHERE transaction_id = p_transaction_id AND user_id = v_user_id;

    DELETE FROM public.transactions
    WHERE id = p_transaction_id AND user_id = v_user_id;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revert_transaction_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_transaction_atomic TO authenticated;
