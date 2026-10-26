-- ==============================================================================
-- Envello - Migration: 20261026000002_profiles_insert_policy.sql
-- Description: Ensure authenticated users can insert their own profile row if not present
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile"
            ON public.profiles FOR INSERT
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;
