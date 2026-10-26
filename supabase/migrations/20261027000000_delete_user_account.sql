-- ==============================================================================
-- Envello - Migration: 20261027000000_delete_user_account.sql
-- Description: RPC function allowing authenticated users to permanently delete their account and wipe all cascaded financial records
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obtain the authenticated user UUID from JWT session
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: cannot delete unauthenticated account';
  END IF;

  -- 1. Explicitly clean up all financial records belonging to current_user_id
  -- (Order respects foreign key RESTRICT constraints on transaction_entries)
  DELETE FROM public.audit_logs WHERE user_id = current_user_id;
  DELETE FROM public.transaction_entries WHERE user_id = current_user_id;
  DELETE FROM public.transactions WHERE user_id = current_user_id;
  DELETE FROM public.envelope_allocations WHERE user_id = current_user_id;
  DELETE FROM public.budget_periods WHERE user_id = current_user_id;
  DELETE FROM public.envelopes WHERE user_id = current_user_id;
  DELETE FROM public.credit_card_statements WHERE user_id = current_user_id;
  DELETE FROM public.credit_cards WHERE user_id = current_user_id;
  DELETE FROM public.fixed_deposits WHERE user_id = current_user_id;
  DELETE FROM public.self_emis WHERE user_id = current_user_id;
  DELETE FROM public.actual_debts WHERE user_id = current_user_id;
  DELETE FROM public.monthly_targets WHERE user_id = current_user_id;
  DELETE FROM public.accounts WHERE user_id = current_user_id;
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- 2. Delete the user from auth.users (permanently removes login credentials, sessions, and identities)
  DELETE FROM auth.users WHERE id = current_user_id;

  RETURN true;
END;
$$;

-- Revoke execute from anonymous/public roles and grant strictly to authenticated users
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
