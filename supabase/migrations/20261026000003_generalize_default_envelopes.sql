-- ==============================================================================
-- Envello - Migration: 20261026000003_generalize_default_envelopes.sql
-- Description: Generalize default envelope names from 'Savings (Super.Money)' to
--              'Savings & Fixed Deposits' for public readiness.
-- ==============================================================================

-- 1. Update existing user envelopes
UPDATE public.envelopes
SET name = 'Savings & Fixed Deposits'
WHERE slug = 'savings' AND name LIKE '%Super.Money%';

-- 2. Update handle_new_user trigger function to use generalized names
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

    -- Seed Default Envelopes with clean, generalized names
    INSERT INTO public.envelopes (user_id, name, slug, icon, color, is_system_reserved, rollover_policy)
    VALUES
        (new.id, 'Regular / Balance', 'regular', 'wallet', '#0ea5e9', true, 'carry_forward'),
        (new.id, 'Emergency', 'emergency', 'shield-alert', '#ef4444', true, 'carry_forward'),
        (new.id, 'Gym', 'gym', 'dumbbell', '#10b981', false, 'carry_forward'),
        (new.id, 'Essentials', 'essentials', 'shopping-cart', '#f59e0b', false, 'carry_forward'),
        (new.id, 'Outing', 'outing', 'utensils', '#8b5cf6', false, 'sweep_to_regular'),
        (new.id, 'Birthdays', 'birthdays', 'gift', '#ec4899', false, 'carry_forward'),
        (new.id, 'Savings & Fixed Deposits', 'savings', 'piggy-bank', '#eab308', true, 'carry_forward'),
        (new.id, 'Credit Cards', 'credit-cards', 'credit-card', '#6366f1', true, 'carry_forward'),
        (new.id, 'EMI(s)', 'emis', 'calendar-clock', '#f97316', true, 'carry_forward'),
        (new.id, 'Monthly Targets', 'monthly-targets', 'target', '#06b6d4', true, 'carry_forward')
    ON CONFLICT (user_id, slug) DO NOTHING;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
        RETURN new;
END;
$$;
