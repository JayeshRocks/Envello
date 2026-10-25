-- ==============================================================================
-- Envello - Migration: 20261026000001_remove_whitelist.sql
-- Description: Fix handle_new_user trigger, eliminate allowed_users dependency,
--              and protect user registration with fail-safe error handling.
-- ==============================================================================

-- 1. Ensure allowed_users table is safely dropped if not already
DROP TABLE IF EXISTS public.allowed_users CASCADE;

-- 2. Update all existing profiles to be allowlisted
UPDATE public.profiles SET is_allowlisted = true;

-- 3. Replace handle_new_user with a fail-safe version that never references allowed_users
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

    -- Seed Default Envelopes
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
        (new.id, 'Monthly Targets', 'monthly-targets', 'target', '#06b6d4', true, 'carry_forward')
    ON CONFLICT (user_id, slug) DO NOTHING;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Prevent registration failure by catching any error gracefully
        RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
        RETURN new;
END;
$$;

-- 4. Re-bind the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
