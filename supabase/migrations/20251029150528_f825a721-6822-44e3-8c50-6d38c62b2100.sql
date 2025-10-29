
-- Rebuild phases JSON for all projects to sync with current template_operations
-- This ensures all projects reflect the latest template data

-- First, rebuild the Standard Project Foundation
UPDATE public.projects
SET phases = rebuild_phases_json_from_templates(id),
    updated_at = now()
WHERE is_standard_template = true;

-- Then, rebuild all other project templates (non-archived, non-runs)
UPDATE public.projects
SET phases = rebuild_phases_json_from_templates(id),
    updated_at = now()
WHERE is_standard_template = false
  AND publish_status != 'archived'
  AND id NOT IN (SELECT DISTINCT template_id FROM public.project_runs WHERE template_id IS NOT NULL);

-- Log the sync
DO $$
BEGIN
  PERFORM log_comprehensive_security_event(
    'standard_phases_cascaded',
    'medium',
    'Rebuilt phases JSON for all projects to cascade standard phase changes',
    auth.uid(),
    NULL, NULL, NULL,
    jsonb_build_object(
      'operation', 'cascade_standard_phase_changes',
      'timestamp', now()
    )
  );
END $$;
