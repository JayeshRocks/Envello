-- ==============================================================================
-- Envello - Migration: 20261027000001_account_deletion_grace_period.sql
-- Description: 30-day account deletion grace period, scheduled closure, cancellation, and immediate purge RPCs
-- ==============================================================================

-- 1. Add deletion lifecycle fields to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deletion_status TEXT NOT NULL DEFAULT 'active' CHECK (deletion_status IN ('active', 'pending_deletion')),
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

-- 2. Function to request 30-day scheduled account closure
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
  scheduled_date TIMESTAMPTZ;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: cannot request deletion for unauthenticated user';
  END IF;

  scheduled_date := timezone('utc'::text, now()) + interval '30 days';

  UPDATE public.profiles
  SET 
    deletion_status = 'pending_deletion',
    deletion_requested_at = timezone('utc'::text, now()),
    scheduled_deletion_at = scheduled_date,
    updated_at = timezone('utc'::text, now())
  WHERE id = current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'scheduled_deletion_at', scheduled_date
  );
END;
$$;

-- 3. Function to cancel account deletion and restore active status
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: cannot cancel deletion for unauthenticated user';
  END IF;

  UPDATE public.profiles
  SET 
    deletion_status = 'active',
    deletion_requested_at = NULL,
    scheduled_deletion_at = NULL,
    updated_at = timezone('utc'::text, now())
  WHERE id = current_user_id;

  RETURN true;
END;
$$;

-- 4. Function to purge expired accounts or perform immediate purge
CREATE OR REPLACE FUNCTION public.purge_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.recurring_rules WHERE user_id = target_user_id;
  DELETE FROM public.monthly_targets WHERE user_id = target_user_id;
  DELETE FROM public.actual_debts WHERE user_id = target_user_id;
  DELETE FROM public.self_emis WHERE user_id = target_user_id;
  DELETE FROM public.fixed_deposits WHERE user_id = target_user_id;
  DELETE FROM public.credit_card_payments WHERE user_id = target_user_id;
  DELETE FROM public.credit_cards WHERE user_id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.envelope_allocations WHERE user_id = target_user_id;
  DELETE FROM public.budget_periods WHERE user_id = target_user_id;
  DELETE FROM public.envelopes WHERE user_id = target_user_id;
  DELETE FROM public.accounts WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 5. Updated immediate purge function (bypasses 30-day grace period upon explicit user request)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: cannot delete unauthenticated account';
  END IF;

  PERFORM public.purge_user_data(current_user_id);
  RETURN true;
END;
$$;

-- 6. Cron / Sweep function to purge all accounts past their 30-day scheduled deadline
CREATE OR REPLACE FUNCTION public.purge_expired_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  expired_record RECORD;
  purged_count integer := 0;
BEGIN
  FOR expired_record IN 
    SELECT id FROM public.profiles 
    WHERE deletion_status = 'pending_deletion' 
      AND scheduled_deletion_at <= timezone('utc'::text, now())
  LOOP
    PERFORM public.purge_user_data(expired_record.id);
    purged_count := purged_count + 1;
  END LOOP;

  RETURN purged_count;
END;
$$;

-- Grant execution to authenticated users for their own operations
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
