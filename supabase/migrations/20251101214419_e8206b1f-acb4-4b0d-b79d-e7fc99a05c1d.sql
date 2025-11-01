-- Link existing template_operations to project_phases

-- Update Standard Project Foundation operations to link to project_phases
UPDATE template_operations o
SET phase_id = pp.id
FROM project_phases pp
WHERE o.project_id = pp.project_id
  AND o.standard_phase_id = pp.standard_phase_id
  AND o.phase_id IS NULL
  AND pp.is_standard = true;

-- Update custom phase operations to link to project_phases
UPDATE template_operations o
SET phase_id = pp.id
FROM project_phases pp
WHERE o.project_id = pp.project_id
  AND o.custom_phase_name = pp.name
  AND o.phase_id IS NULL
  AND pp.is_standard = false;

-- Verify the fix for Standard Project
DO $$
DECLARE
  unlinked_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unlinked_count
  FROM template_operations
  WHERE project_id = '00000000-0000-0000-0000-000000000001'
    AND phase_id IS NULL;
  
  IF unlinked_count > 0 THEN
    RAISE NOTICE 'WARNING: % operations still unlinked in Standard Project Foundation', unlinked_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All Standard Project Foundation operations are now linked to phases';
  END IF;
END $$;