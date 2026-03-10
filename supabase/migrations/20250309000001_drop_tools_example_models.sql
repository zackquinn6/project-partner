-- Remove unused variant field from tools table.
-- Variant structure lives in variation_instances and related tables (Variations tab).
ALTER TABLE tools DROP COLUMN IF EXISTS example_models;
