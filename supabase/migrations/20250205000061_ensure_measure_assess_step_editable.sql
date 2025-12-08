-- =====================================================
-- ENSURE MEASURE & ASSESS STEP IS EDITABLE
-- This migration ensures the "Measure & Assess" step
-- in the Planning phase has allow_content_edit=true
-- =====================================================

-- Update all "Measure & Assess" steps in Planning phase to allow content editing
UPDATE public.operation_steps os
SET allow_content_edit = true
FROM public.phase_operations po
JOIN public.project_phases pp ON pp.id = po.phase_id
JOIN public.projects p ON p.id = pp.project_id
WHERE os.operation_id = po.id
  AND pp.name = 'Planning'
  AND po.operation_name = 'Measure & Assess'
  AND (p.is_standard = true OR p.is_standard = false); -- Update in both standard and template projects

-- Success message
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  JOIN public.projects p ON p.id = pp.project_id
  WHERE pp.name = 'Planning'
    AND po.operation_name = 'Measure & Assess'
    AND os.allow_content_edit = true;
  
  RAISE NOTICE '✅ Set allow_content_edit=true for % "Measure & Assess" step(s) in Planning phase', v_updated_count;
  
  -- Also show which projects were updated
  FOR v_updated_count IN
    SELECT DISTINCT p.name, p.is_standard
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    JOIN public.projects p ON p.id = pp.project_id
    WHERE pp.name = 'Planning'
      AND po.operation_name = 'Measure & Assess'
      AND os.allow_content_edit = true
  LOOP
    RAISE NOTICE '   - Project: % (is_standard: %)', v_updated_count, v_updated_count;
  END LOOP;
END $$;

