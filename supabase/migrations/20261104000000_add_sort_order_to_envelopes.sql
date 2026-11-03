-- ==============================================================================
-- Envello - Migration: 20261104000000_add_sort_order_to_envelopes.sql
-- Description: Add sort_order column to envelopes to support custom drag-and-drop
--              and rearrange ordering by users.
-- ==============================================================================

ALTER TABLE public.envelopes
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_envelopes_user_sort_order
ON public.envelopes(user_id, sort_order);
