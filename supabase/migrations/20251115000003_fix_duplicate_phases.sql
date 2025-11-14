-- Fix duplicate phases bug in build_phases_json_with_dynamic_standard
-- ROOT CAUSE: Naive array concatenation was creating duplicate phases
-- FIX: Smart merge that deduplicates phases by name and merges operations

CREATE OR REPLACE FUNCTION public.build_phases_json_with_dynamic_standard(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_phases jsonb;
  standard_phases jsonb;
  custom_phases jsonb;
  merged_phases jsonb := '[]'::jsonb;
  phase_elem jsonb;
  phase_name text;
  existing_phase jsonb;
  standard_project_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get phases from Standard Project Foundation
  SELECT phases INTO standard_phases
  FROM public.projects
  WHERE id = standard_project_id;
  
  -- Get phases from the template project
  SELECT phases INTO custom_phases
  FROM public.projects
  WHERE id = p_project_id;
  
  -- If no standard phases, just return custom phases
  IF standard_phases IS NULL OR jsonb_array_length(standard_phases) = 0 THEN
    RETURN COALESCE(custom_phases, '[]'::jsonb);
  END IF;
  
  -- If no custom phases, just return standard phases
  IF custom_phases IS NULL OR jsonb_array_length(custom_phases) = 0 THEN
    RETURN standard_phases;
  END IF;
  
  -- SMART MERGE: Combine phases by name, merge operations within matching phases
  -- Start with standard phases as base
  merged_phases := standard_phases;
  
  -- For each custom phase, either merge with existing or add new
  FOR i IN 0..(jsonb_array_length(custom_phases) - 1) LOOP
    phase_elem := custom_phases -> i;
    phase_name := phase_elem ->> 'name';
    
    -- Check if this phase name already exists in merged_phases
    existing_phase := NULL;
    FOR j IN 0..(jsonb_array_length(merged_phases) - 1) LOOP
      IF merged_phases -> j ->> 'name' = phase_name THEN
        existing_phase := merged_phases -> j;
        
        -- Merge operations from custom phase into existing phase
        -- Concatenate operations arrays (operations should be unique by ID)
        merged_phases := jsonb_set(
          merged_phases,
          ARRAY[j::text, 'operations'],
          COALESCE(existing_phase -> 'operations', '[]'::jsonb) || COALESCE(phase_elem -> 'operations', '[]'::jsonb)
        );
        
        EXIT; -- Found and merged, stop searching
      END IF;
    END LOOP;
    
    -- If phase doesn't exist in merged_phases, add it
    IF existing_phase IS NULL THEN
      merged_phases := merged_phases || jsonb_build_array(phase_elem);
    END IF;
  END LOOP;
  
  RETURN merged_phases;
END;
$$;

COMMENT ON FUNCTION public.build_phases_json_with_dynamic_standard IS 
'Merges standard phases from foundation with custom phases from template.
Deduplicates phases by name and merges operations within matching phases.
Prevents duplicate phase names that were causing navigation pane issues.';

