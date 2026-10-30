-- ==============================================================================
-- Envello - Migration: 20261031000000_security_hardening.sql
-- Description: Comprehensive database security hardening:
--   1. Fix IDOR vulnerability in purge_user_data with caller identity checks
--   2. Revoke default PUBLIC and anon execution grants on all RPC functions
--   3. Lock down administrative sweep functions to service_role only
--   4. Add text field length check constraints to prevent payload exhaustion
-- ==============================================================================

-- 1. Hardened purge_user_data with strict authorization check
CREATE OR REPLACE FUNCTION public.purge_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Strict caller verification: caller can ONLY purge their own record,
  -- or execution must be triggered by service_role (e.g. Supabase Admin / pg_cron)
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID must not be null';
  END IF;

  IF (auth.uid() IS NULL OR target_user_id != auth.uid()) AND (current_setting('request.jwt.claim.role', true) != 'service_role' AND auth.role() != 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized: cannot purge data for another user (caller=%, target=%)', auth.uid(), target_user_id;
  END IF;

  -- Cascade delete child records
  DELETE FROM public.audit_logs WHERE user_id = target_user_id;
  DELETE FROM public.transaction_entries WHERE user_id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.envelope_allocations WHERE user_id = target_user_id;
  DELETE FROM public.budget_periods WHERE user_id = target_user_id;
  DELETE FROM public.envelopes WHERE user_id = target_user_id;
  DELETE FROM public.credit_card_statements WHERE user_id = target_user_id;
  DELETE FROM public.credit_cards WHERE user_id = target_user_id;
  DELETE FROM public.fixed_deposits WHERE user_id = target_user_id;
  DELETE FROM public.self_emis WHERE user_id = target_user_id;
  DELETE FROM public.actual_debts WHERE user_id = target_user_id;
  DELETE FROM public.monthly_targets WHERE user_id = target_user_id;
  DELETE FROM public.accounts WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Revoke all execution privileges on purge_user_data from untrusted roles
REVOKE ALL ON FUNCTION public.purge_user_data(UUID) FROM PUBLIC, anon;

-- 2. Lock down administrative purge_expired_accounts
REVOKE ALL ON FUNCTION public.purge_expired_accounts() FROM PUBLIC, anon, authenticated;
-- Only service_role and superuser can execute automated sweeps
GRANT EXECUTE ON FUNCTION public.purge_expired_accounts() TO service_role;

-- 3. Lock down user_has_password
REVOKE ALL ON FUNCTION public.user_has_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_password() TO authenticated;

-- 4. Lock down execute_account_transfer
REVOKE ALL ON FUNCTION public.execute_account_transfer(UUID, UUID, BIGINT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_account_transfer(UUID, UUID, BIGINT, TEXT, DATE) TO authenticated;

-- 5. Lock down account deletion user RPCs
REVOKE ALL ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 6. Add string length boundary constraints on user-input text fields (defense in depth)
DO $$
BEGIN
  -- accounts constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_name_len') THEN
    ALTER TABLE public.accounts ADD CONSTRAINT chk_accounts_name_len CHECK (char_length(name) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_institution_len') THEN
    ALTER TABLE public.accounts ADD CONSTRAINT chk_accounts_institution_len CHECK (char_length(institution) <= 100);
  END IF;

  -- envelopes constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_envelopes_name_len') THEN
    ALTER TABLE public.envelopes ADD CONSTRAINT chk_envelopes_name_len CHECK (char_length(name) <= 100);
  END IF;

  -- transactions constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_desc_len') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT chk_transactions_desc_len CHECK (char_length(description) <= 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_notes_len') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT chk_transactions_notes_len CHECK (notes IS NULL OR char_length(notes) <= 2000);
  END IF;

  -- credit_cards constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cards_name_len') THEN
    ALTER TABLE public.credit_cards ADD CONSTRAINT chk_cards_name_len CHECK (char_length(card_name) <= 100);
  END IF;

  -- actual_debts constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_debts_lender_len') THEN
    ALTER TABLE public.actual_debts ADD CONSTRAINT chk_debts_lender_len CHECK (char_length(lender_name) <= 100);
  END IF;

  -- monthly_targets constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_targets_title_len') THEN
    ALTER TABLE public.monthly_targets ADD CONSTRAINT chk_targets_title_len CHECK (char_length(title) <= 200);
  END IF;

  -- audit_logs constraints
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_audit_reason_len') THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT chk_audit_reason_len CHECK (reason IS NULL OR char_length(reason) <= 1000);
  END IF;
END $$;
