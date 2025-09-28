-- Fix the phases array by properly inserting Ordering phase after Planning
-- For both Tile Flooring Installation revisions

WITH ordering_phase AS (
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
  ) as phase_data
)

UPDATE public.projects 
SET phases = (
  -- Reconstruct phases array: Kickoff, Planning, Ordering, Prep, Install, Close Project
  SELECT jsonb_build_array(
    phases->0, -- Kickoff
    phases->1, -- Planning  
    op.phase_data, -- Ordering (inserted)
    phases->2, -- Prep
    phases->3, -- Install
    phases->4  -- Close Project
  )
  FROM ordering_phase op
)
WHERE name = 'Tile Flooring Installation';