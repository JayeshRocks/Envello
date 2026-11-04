-- Migration: 20261107000000_add_tutorial_completed_to_profiles.sql
-- Description: Adds tutorial_completed column to public.profiles to persist tour status across all devices

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.tutorial_completed IS 'Persists whether the user has completed or skipped the onboarding spotlight tutorial across all sessions and devices.';
