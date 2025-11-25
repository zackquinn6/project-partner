-- Remove display_order column from project_phases, template_operations, and template_steps
-- Migration: 20251126000001_remove_display_order_column.sql
--
-- This migration removes the display_order column as the system now uses
-- position_rule and position_value for phase ordering.

-- ============================================
-- STEP 1: Drop display_order column from project_phases
-- ============================================
ALTER TABLE public.project_phases
DROP COLUMN IF EXISTS display_order;

-- ============================================
-- STEP 2: Drop display_order column from template_operations
-- ============================================
ALTER TABLE public.template_operations
DROP COLUMN IF EXISTS display_order;

-- ============================================
-- STEP 3: Drop display_order column from template_steps
-- ============================================
ALTER TABLE public.template_steps
DROP COLUMN IF EXISTS display_order;

-- ============================================
-- STEP 4: Add comment
-- ============================================
COMMENT ON COLUMN public.project_phases.position_rule IS 
'Position rule for phase ordering. Values: "first", "last", "nth", "last_minus_n", or NULL for custom phases.
Standard phases have position rules. Custom phases in Standard Project Foundation use "last_minus_n".
Custom phases in regular projects have NULL (ordered by creation time or phases JSON).';

