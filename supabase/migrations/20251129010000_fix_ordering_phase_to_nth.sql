-- Migration: Fix Ordering phase to use 'nth' position_rule instead of 'last_minus_n'
-- Ordering should be an 'nth' phase with position_value=4, not 'last_minus_n'

BEGIN;

-- Step 1: Update Ordering phase in Standard Project Foundation
-- Ordering should be position 3, not 4
UPDATE public.project_phases
SET 
  position_rule = 'nth',
  position_value = 3
WHERE project_id = '00000000-0000-0000-0000-000000000001'::UUID
  AND name = 'Ordering'
  AND (position_rule = 'last_minus_n' OR position_value != 3);

-- Step 2: Rebuild phases JSON for Standard Project Foundation
PERFORM rebuild_phases_json_from_project_phases('00000000-0000-0000-0000-000000000001'::UUID);

COMMIT;

