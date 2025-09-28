-- Fix duplicate "Close Project" phases in Tile Flooring Installation project
-- Remove duplicate "Close Project" phases, keeping only the last one

-- Helper function to deduplicate phases by name (keep last occurrence)
CREATE OR REPLACE FUNCTION deduplicate_phases(phases_json jsonb)
RETURNS jsonb AS $$
DECLARE
  phase jsonb;
  phase_name text;
  seen_phases jsonb = '[]'::jsonb;
  phase_names_seen text[] = '{}';
  result jsonb = '[]'::jsonb;
BEGIN
  -- Iterate through phases in order
  FOR phase IN SELECT * FROM jsonb_array_elements(phases_json)
  LOOP
    phase_name := phase->>'name';
    
    -- If we've seen this phase name before, remove the previous occurrence
    IF phase_name = ANY(phase_names_seen) THEN
      -- Remove previous occurrence by rebuilding result without matching name
      result := (
        SELECT jsonb_agg(p)
        FROM jsonb_array_elements(result) p
        WHERE p->>'name' != phase_name
      );
    END IF;
    
    -- Add current phase
    result := result || jsonb_build_array(phase);
    phase_names_seen := array_append(phase_names_seen, phase_name);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update both Tile Flooring Installation projects to remove duplicate phases
UPDATE public.projects 
SET phases = deduplicate_phases(phases)
WHERE name = 'Tile Flooring Installation';

-- Clean up the helper function
DROP FUNCTION deduplicate_phases(jsonb);