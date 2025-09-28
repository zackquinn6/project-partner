-- Manually reconstruct the phases array from scratch with proper structure
-- Since the current structure is corrupted, let's rebuild it completely

WITH original_phases AS (
  -- Get the original phases from the first project before we corrupted it
  SELECT phases->0->0 as kickoff_phase,
         phases->0->1 as planning_phase,
         phases->0->2 as prep_phase,
         phases->0->3 as install_phase,
         phases->0->4 as close_phase
  FROM public.projects 
  WHERE name = 'Tile Flooring Installation' AND revision_number = 0
),
ordering_phase AS (
  SELECT jsonb_build_object(
    'id', 'ordering-phase',
    'name', 'Ordering',
    'description', 'Order all required tools and materials for the project',
    'operations', jsonb_build_array(
      jsonb_build_object(
        'id', 'shopping-checklist-operation',
        'name', 'Shopping Checklist',
        'description', 'Review and prepare shopping checklist',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'ordering-step-1',
            'step', 'Shopping Checklist',
            'description', 'Review and prepare complete shopping checklist for tools and materials',
            'contentType', 'text',
            'content', 'Use the Shopping Checklist to review all required tools and materials, compare prices, and prepare for your shopping trip or online orders.',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'checklist-output',
                'name', 'Shopping Checklist Prepared',
                'description', 'Complete shopping checklist prepared and reviewed',
                'type', 'none'
              )
            )
          )
        )
      ),
      jsonb_build_object(
        'id', 'ordering-operation',
        'name', 'Tool & Material Ordering',
        'description', 'Order all project tools and materials',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'ordering-step-2',
            'step', 'Tool & Material Ordering',
            'description', 'Order all required tools and materials for your project using the integrated shopping browser',
            'contentType', 'text',
            'content', 'Use our integrated shopping browser to purchase all required tools and materials for your project. Our system will help you find the best prices and ensure you get everything you need.',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'ordering-output',
                'name', 'All Items Ordered',
                'description', 'All required tools and materials have been ordered',
                'type', 'none'
              )
            )
          )
        )
      )
    )
  ) as ordering_data
)

UPDATE public.projects 
SET phases = (
  SELECT jsonb_build_array(
    op.kickoff_phase,
    op.planning_phase,
    ord.ordering_data,
    op.prep_phase,
    op.install_phase,
    op.close_phase
  )
  FROM original_phases op, ordering_phase ord
)
WHERE name = 'Tile Flooring Installation';