-- Create get_project_workflow_with_standards function
-- This function returns the complete workflow for a project, including standard phases
-- Migration: 20250129000002_create_get_project_workflow_with_standards.sql

-- ============================================
-- STEP 1: Create get_project_workflow_with_standards function
-- ============================================
CREATE OR REPLACE FUNCTION public.get_project_workflow_with_standards(
  p_project_id UUID
)
RETURNS JSONB AS $$
DECLARE
  workflow_json JSONB;
BEGIN
  -- Use rebuild_phases_json_from_project_phases to get the complete workflow
  -- This function already handles:
  -- 1. Getting all phases (standard and custom) from project_phases table
  -- 2. Getting all operations for each phase
  -- 3. For standard operations with source_operation_id, pulling steps from Standard Project Foundation
  -- 4. Building the complete phases JSON with all content
  
  SELECT public.rebuild_phases_json_from_project_phases(p_project_id)
  INTO workflow_json;
  
  -- Return the workflow JSON
  RETURN COALESCE(workflow_json, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Add comment documenting the function
-- ============================================
COMMENT ON FUNCTION public.get_project_workflow_with_standards IS 
'Returns the complete workflow for a project template, including all standard phases and custom phases.

This function:
- Returns all phases from the project (both standard and custom)
- For standard phases, dynamically pulls content from Standard Project Foundation
- For standard operations with source_operation_id, pulls steps from the foundation
- Ensures templates always get the latest content from Standard Project Foundation

Used by the UI to display project workflows in EditWorkflowView and other components.';

