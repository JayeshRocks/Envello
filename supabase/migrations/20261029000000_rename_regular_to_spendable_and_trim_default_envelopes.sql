-- ==============================================================================
-- Envello - Migration: 20261029000000_rename_regular_to_spendable_and_trim_default_envelopes.sql
-- Description: 
--   1. Rename default envelope 'Regular / Balance' to 'Spendable'
--   2. Update handle_new_user() trigger function to only seed the 6 designated
--      first-time envelopes: Spendable, Emergency, Gym, Essentials, Outing, Birthdays.
-- ==============================================================================

-- 1. Update existing user envelopes from 'Regular / Balance' to 'Spendable'
UPDATE public.envelopes
SET name = 'Spendable'
WHERE name IN ('Regular / Balance', 'Regular/Balance');

-- 2. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create or update Profile (always allowlisted)
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

    -- Seed the 6 designated first-time envelopes only:
    -- Spendable, Emergency, Gym, Essentials, Outing, Birthdays
    INSERT INTO public.envelopes (user_id, name, slug, icon, color, is_system_reserved, rollover_policy)
    VALUES
        (new.id, 'Spendable', 'regular', 'wallet', '#0ea5e9', true, 'carry_forward'),
        (new.id, 'Emergency', 'emergency', 'shield-alert', '#ef4444', true, 'carry_forward'),
        (new.id, 'Gym', 'gym', 'dumbbell', '#10b981', false, 'carry_forward'),
        (new.id, 'Essentials', 'essentials', 'shopping-cart', '#f59e0b', false, 'carry_forward'),
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

