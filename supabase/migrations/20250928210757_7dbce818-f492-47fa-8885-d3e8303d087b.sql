-- Revert to original phase structure and properly add Ordering phase
-- First, let's restore the original phases from a working backup approach

-- Create the ordering phase structure to insert
WITH original_phases AS (
  -- Get original phases from backup or recreate the basic structure we know works
  SELECT jsonb_build_array(
    -- Kickoff Phase
    jsonb_build_object(
      'id', 'kickoff-phase',
      'name', 'Kickoff', 
      'description', 'Essential project setup and agreement',
      'operations', jsonb_build_array(
        jsonb_build_object(
          'id', 'kickoff-operation',
          'name', 'Kickoff',
          'description', 'Essential project setup and agreement',
          'steps', jsonb_build_array(
            jsonb_build_object(
              'id', 'kickoff-step-1',
              'step', 'DIY Profile',
              'description', 'Complete your DIY profile for personalized project guidance',
              'contentType', 'text',
              'content', 'Set up your DIY profile to receive personalized project recommendations, tool suggestions, and guidance tailored to your skill level and preferences.', 
              'materials', '[]'::jsonb,
              'tools', '[]'::jsonb,
              'outputs', jsonb_build_array(
                jsonb_build_object('id', 'diy-profile-output', 'name', 'DIY Profile Complete', 'type', 'none', 'description', 'Personal DIY profile completed and saved')
              )
            )
          )
        )
      )
    ),
    -- Planning Phase  
    jsonb_build_object(
      'id', 'planning-phase',
      'name', 'Planning',
      'description', 'Comprehensive project planning and preparation', 
      'operations', '[]'::jsonb
    ),
    -- Ordering Phase (NEW)
    jsonb_build_object(
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
                jsonb_build_object('id', 'checklist-output', 'name', 'Shopping Checklist Prepared', 'description', 'Complete shopping checklist prepared and reviewed', 'type', 'none')
              )
            )
          )
        )
      )
    ),  
    -- Prep Phase
    jsonb_build_object(
      'id', 'prep-phase',
      'name', 'Prep',
      'description', 'Surface preparation and project setup',
      'operations', '[]'::jsonb
    ),
    -- Install Phase
    jsonb_build_object(
      'id', 'install-phase', 
      'name', 'Install',
      'description', 'Main installation work',
      'operations', '[]'::jsonb
    ),
    -- Close Project Phase
    jsonb_build_object(
      'id', 'close-project-phase',
      'name', 'Close Project',
      'description', 'Final cleanup, organization, and celebration of project completion',
      'operations', '[]'::jsonb  
    )
  ) as clean_phases
)

-- Reset both projects to clean structure
UPDATE public.projects 
SET phases = op.clean_phases
FROM original_phases op
WHERE name = 'Tile Flooring Installation';