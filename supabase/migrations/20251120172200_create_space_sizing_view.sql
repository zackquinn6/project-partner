-- Create a view to simplify querying space sizing data
-- This view joins project_run_spaces with project_run_space_sizing for easier access

CREATE OR REPLACE VIEW public.space_sizing_view AS
SELECT 
  prs.id as space_id,
  prs.project_run_id,
  prs.space_name,
  prs.space_type,
  prs.priority,
  prss.scaling_unit,
  prss.size_value,
  prss.created_at as sizing_created_at,
  prss.updated_at as sizing_updated_at
FROM public.project_run_spaces prs
LEFT JOIN public.project_run_space_sizing prss ON prs.id = prss.space_id;

COMMENT ON VIEW public.space_sizing_view IS 'View joining project_run_spaces with project_run_space_sizing for easier querying of space sizing data. Each row represents one sizing value for one space.';

-- Grant access to authenticated users
GRANT SELECT ON public.space_sizing_view TO authenticated;

