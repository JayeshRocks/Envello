-- ==============================================================================
-- Envello - Migration: 20261026000001_remove_whitelist.sql
-- Description: Remove allowlist gating so any authenticated user has direct workspace access
-- ==============================================================================

-- 1. Update all existing profiles to be allowlisted
UPDATE public.profiles SET is_allowlisted = true;

-- 2. Update trigger to always set is_allowlisted = true for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create Profile (always allowlisted)
    INSERT INTO public.profiles (id, email, display_name, is_allowlisted)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET is_allowlisted = true;

    -- Seed Owner Default Envelopes
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
        (new.id, 'EMI(s)', 'emis', 'calendar-clock', '#f97316', true, 'carry_forward')
    ON CONFLICT (user_id, slug) DO NOTHING;

    RETURN new;
END;
$$;

-- 3. Drop allowed_users table
DROP TABLE IF EXISTS public.allowed_users CASCADE;
