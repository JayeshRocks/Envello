-- ==============================================================================
-- Envello - Migration: 20261026000000_user_has_password.sql
-- Description: RPC function to safely check if the authenticated user has a password
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.user_has_password()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (encrypted_password IS NOT NULL AND encrypted_password != '')
     FROM auth.users
     WHERE id = auth.uid()),
    false
  );
$$;

-- Allow authenticated users to check their own password status
GRANT EXECUTE ON FUNCTION public.user_has_password() TO authenticated;
