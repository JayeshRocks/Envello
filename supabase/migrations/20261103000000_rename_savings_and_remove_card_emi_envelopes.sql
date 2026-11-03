-- ==============================================================================
-- Envello - Migration: 20261103000000_rename_savings_and_remove_card_emi_envelopes.sql
-- Description: Standardize core envelopes: rename 'Savings & Fixed Deposits' to
--              'Savings' (capital untouched bank interest reserve) and purge
--              redundant 'Credit Cards' and 'EMI(s)' default envelopes.
-- ==============================================================================

-- 1. Rename existing 'savings' envelopes to 'Savings' with emerald theme
UPDATE public.envelopes
SET name = 'Savings',
    icon = 'piggy-bank',
    color = '#10b981',
    is_system_reserved = true
WHERE slug = 'savings'
   OR name IN ('Savings & Fixed Deposits', 'Savings (Super.Money)', 'Savings and Fixed Deposit');

-- Also standardize 'regular' envelope to 'Spendable'
UPDATE public.envelopes
SET name = 'Spendable'
WHERE slug = 'regular' AND name IN ('Regular / Balance', 'Regular/Balance');

-- 2. Clean up legacy unreferenced credit-cards, emis, and monthly-targets envelopes
-- First delete allocations for those envelopes if no transaction entries reference them
DELETE FROM public.envelope_allocations
WHERE envelope_id IN (
    SELECT e.id
    FROM public.envelopes e
    WHERE e.slug IN ('credit-cards', 'emis', 'monthly-targets')
      AND NOT EXISTS (
          SELECT 1 FROM public.transaction_entries te WHERE te.envelope_id = e.id
      )
);

-- Next delete the envelopes themselves
DELETE FROM public.envelopes
WHERE slug IN ('credit-cards', 'emis', 'monthly-targets')
  AND NOT EXISTS (
      SELECT 1 FROM public.transaction_entries te WHERE te.envelope_id = envelopes.id
  );

-- 3. Update handle_new_user() trigger function to omit credit-cards and emis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create or update Profile (always allowlisted in beta)
    INSERT INTO public.profiles (id, email, display_name, is_allowlisted)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(COALESCE(new.email, 'user'), '@', 1)),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET is_allowlisted = true,
        email = COALESCE(EXCLUDED.email, profiles.email);

    -- Seed Default Envelopes: Spendable, Emergency, Savings, and custom life categories
    INSERT INTO public.envelopes (user_id, name, slug, icon, color, is_system_reserved, rollover_policy)
    VALUES
        (new.id, 'Spendable', 'regular', 'wallet', '#0ea5e9', true, 'carry_forward'),
        (new.id, 'Emergency', 'emergency', 'shield-alert', '#ef4444', true, 'carry_forward'),
        (new.id, 'Savings', 'savings', 'piggy-bank', '#10b981', true, 'carry_forward'),
        (new.id, 'Essentials', 'essentials', 'shopping-cart', '#f59e0b', false, 'carry_forward'),
        (new.id, 'Gym', 'gym', 'dumbbell', '#10b981', false, 'carry_forward'),
        (new.id, 'Outing', 'outing', 'utensils', '#8b5cf6', false, 'sweep_to_regular'),
        (new.id, 'Birthdays', 'birthdays', 'gift', '#ec4899', false, 'carry_forward')
    ON CONFLICT (user_id, slug) DO NOTHING;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
        RETURN new;
END;
$$;
