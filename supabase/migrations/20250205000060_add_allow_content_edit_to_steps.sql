-- =====================================================
-- ADD ALLOW_CONTENT_EDIT FIELD TO OPERATION_STEPS
-- This field allows specific steps in standard phases
-- to have editable content while maintaining structure
-- =====================================================

-- Add allow_content_edit column
ALTER TABLE public.operation_steps 
ADD COLUMN IF NOT EXISTS allow_content_edit BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.operation_steps.allow_content_edit IS 'If true, allows editing of content (description, content, materials, tools, outputs) for this step even when it is in a standard phase. Step structure (name, order) remains locked.';

-- Set allow_content_edit=true for the "Measure & Assess" step in Planning phase
-- This step should exist in the Standard Project Foundation
UPDATE public.operation_steps os
SET allow_content_edit = true
FROM public.phase_operations po
JOIN public.project_phases pp ON pp.id = po.phase_id
JOIN public.projects p ON p.id = pp.project_id
WHERE os.operation_id = po.id
  AND pp.name = 'Planning'
  AND po.operation_name = 'Measure & Assess'
  AND p.is_standard = true;

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
    AND p.is_standard = true
    AND os.allow_content_edit = true;
  
  RAISE NOTICE '✅ Added allow_content_edit field to operation_steps table';
  RAISE NOTICE '✅ Set allow_content_edit=true for % "Measure & Assess" step(s) in Planning phase', v_updated_count;
END $$;

