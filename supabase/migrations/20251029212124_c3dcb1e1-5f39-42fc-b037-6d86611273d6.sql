-- SAFER COMPREHENSIVE FIX: Handle all edge cases

-- Step 1: Delete corrupted Tile Flooring template operations
DELETE FROM template_steps 
WHERE operation_id IN (
  SELECT ops.id FROM template_operations ops
  JOIN projects p ON ops.project_id = p.id
  WHERE p.name = 'Tile Flooring'
);

DELETE FROM template_operations 
WHERE project_id IN (
  SELECT id FROM projects WHERE name = 'Tile Flooring'
);

-- Step 2: Rebuild Tile Flooring from Standard Project Foundation
DO $$
DECLARE
  tile_id uuid;
BEGIN
  SELECT id INTO tile_id FROM projects WHERE name = 'Tile Flooring' LIMIT 1;
  IF tile_id IS NOT NULL THEN
    PERFORM rebuild_project_from_standard(tile_id);
  END IF;
END $$;

-- Step 3: Fix completed_steps - remove old kickoff IDs
-- First ensure all completed_steps are proper arrays
UPDATE project_runs
SET completed_steps = '[]'::jsonb
WHERE completed_steps IS NULL 
   OR jsonb_typeof(completed_steps) != 'array';

-- Now safely remove old kickoff IDs
DO $$
DECLARE
  run_record RECORD;
  clean_steps jsonb;
BEGIN
  FOR run_record IN 
    SELECT id, completed_steps
    FROM project_runs
    WHERE jsonb_typeof(completed_steps) = 'array'
  LOOP
    -- Build clean array without kickoff-step-* IDs
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO clean_steps
    FROM jsonb_array_elements_text(run_record.completed_steps) AS elem
    WHERE elem NOT LIKE 'kickoff-step-%';
    
    -- Update this run
    UPDATE project_runs
    SET completed_steps = clean_steps, updated_at = now()
    WHERE id = run_record.id;
  END LOOP;
END $$;