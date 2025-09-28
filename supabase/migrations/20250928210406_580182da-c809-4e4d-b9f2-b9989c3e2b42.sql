-- Add missing Ordering phase to both Tile Flooring Installation revisions
-- First, let's create the standard ordering phase structure

WITH ordering_phase AS (
  SELECT jsonb_build_object(
    'id', 'ordering-phase',
    'name', 'Ordering',
    'description', 'Procurement and acquisition of materials and tools',
    'operations', jsonb_build_array(
      jsonb_build_object(
        'id', 'shopping-checklist-operation',
        'name', 'Shopping Checklist',
        'description', 'Generate and review comprehensive shopping list',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'generate-shopping-list',
            'step', 'Generate Shopping List',
            'description', 'Review project requirements and generate comprehensive shopping list',
            'contentType', 'text',
            'content', 'Review your project timeline and generate a comprehensive shopping list based on all materials and tools needed for each phase.',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'shopping-list-output',
                'name', 'Shopping List Generated',
                'type', 'none',
                'description', 'Comprehensive shopping list created and organized'
              )
            )
          )
        )
      ),
      jsonb_build_object(
        'id', 'ordering-operation',
        'name', 'Tool & Material Ordering',
        'description', 'Order or acquire all necessary materials and tools',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'order-materials-tools',
            'step', 'Order Materials & Tools',
            'description', 'Purchase or acquire all materials and tools from your shopping list',
            'contentType', 'text',
            'content', 'Order all materials and tools from your shopping list. Consider delivery times and coordinate with your project timeline.',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'materials-ordered-output',
                'name', 'Materials & Tools Ordered',
                'type', 'none',
                'description', 'All required materials and tools have been ordered or acquired'
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
  SELECT jsonb_agg(
    CASE 
      WHEN phase_with_index.index = 1 -- Insert after Planning (index 1)
      THEN jsonb_build_array(phase_with_index.phase, op.phase_data)
      ELSE jsonb_build_array(phase_with_index.phase)
    END
  )
  FROM (
    SELECT phase, row_number() OVER () - 1 as index
    FROM jsonb_array_elements(phases) phase
  ) phase_with_index,
  ordering_phase op
)
WHERE name = 'Tile Flooring Installation';