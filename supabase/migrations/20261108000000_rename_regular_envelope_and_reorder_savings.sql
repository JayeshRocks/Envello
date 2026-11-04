-- ==============================================================================
-- Envello - Migration: 20261108000000_rename_regular_envelope_and_reorder_savings.sql
-- Description:
--   1. Rename default envelope from 'Regular / Balance' (or 'Spendable') to 'Regular'.
--   2. Explicitly reorder default envelopes so Savings is in the third place:
--        1. Regular (sort_order = 0)
--        2. Emergency (sort_order = 1)
--        3. Savings (sort_order = 2)
--        4. Essentials (sort_order = 3)
--        5. Gym (sort_order = 4)
--        6. Outing (sort_order = 5)
--        7. Birthdays (sort_order = 6)
--   3. Update handle_new_user() trigger function to seed 'Regular' and explicit sort_order values.
-- ==============================================================================

-- 1. Rename existing 'regular' envelope to 'Regular' across all users
UPDATE public.envelopes
SET name = 'Regular'
WHERE slug = 'regular'
   OR name IN ('Regular / Balance', 'Regular/Balance', 'Spendable');

-- 2. Update sort_order for standard envelopes to place Savings in the third place (0-indexed: 2)
UPDATE public.envelopes
SET sort_order = 0
WHERE slug = 'regular';

UPDATE public.envelopes
SET sort_order = 1
WHERE slug = 'emergency';

UPDATE public.envelopes
SET sort_order = 2
WHERE slug = 'savings';

UPDATE public.envelopes
SET sort_order = 3
WHERE slug = 'essentials';

UPDATE public.envelopes
SET sort_order = 4
WHERE slug = 'gym';

UPDATE public.envelopes
SET sort_order = 5
WHERE slug = 'outing';

UPDATE public.envelopes
SET sort_order = 6
WHERE slug = 'birthdays';

-- For any custom user envelopes, assign sort_orders starting from 7 upwards so they do not collide with default top tiers
WITH ranked_custom AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY sort_order, created_at) + 6 AS new_order
    FROM public.envelopes
    WHERE slug NOT IN ('regular', 'emergency', 'savings', 'essentials', 'gym', 'outing', 'birthdays')
)
UPDATE public.envelopes e
SET sort_order = rc.new_order
FROM ranked_custom rc
WHERE e.id = rc.id;

-- 3. Update handle_new_user() trigger function with 'Regular' and explicit sort_orders
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

    -- Seed Default Envelopes: Regular (1st), Emergency (2nd), Savings (3rd), followed by custom categories
    INSERT INTO public.envelopes (user_id, name, slug, icon, color, is_system_reserved, rollover_policy, sort_order)
    VALUES
        (new.id, 'Regular', 'regular', 'wallet', '#0ea5e9', true, 'carry_forward', 0),
        (new.id, 'Emergency', 'emergency', 'shield-alert', '#ef4444', true, 'carry_forward', 1),
        (new.id, 'Savings', 'savings', 'piggy-bank', '#10b981', true, 'carry_forward', 2),
        (new.id, 'Essentials', 'essentials', 'shopping-cart', '#f59e0b', false, 'carry_forward', 3),
        (new.id, 'Gym', 'gym', 'dumbbell', '#10b981', false, 'carry_forward', 4),
        (new.id, 'Outing', 'outing', 'utensils', '#8b5cf6', false, 'sweep_to_regular', 5),
        (new.id, 'Birthdays', 'birthdays', 'gift', '#ec4899', false, 'carry_forward', 6)
    ON CONFLICT (user_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order;

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
        RETURN new;
END;
$$;
