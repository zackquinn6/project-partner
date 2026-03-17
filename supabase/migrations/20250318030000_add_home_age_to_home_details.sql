-- Align home_details schema with MaintenancePlanWorkflow usage
-- Adds home_age column so home maintenance plan saving works without 400 errors.

ALTER TABLE public.home_details
ADD COLUMN IF NOT EXISTS home_age TEXT;

