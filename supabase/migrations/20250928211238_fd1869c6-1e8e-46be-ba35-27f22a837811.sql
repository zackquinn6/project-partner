-- Let's restore from a clean backup by finding a similar project with proper structure
-- and rebuild the Tile Flooring Installation project phases manually

-- First, let's completely reset both projects to have the standard 4 phases + custom phases
WITH standard_phases AS (
  SELECT 
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
                jsonb_build_object(
                  'id', 'diy-profile-output',
                  'name', 'DIY Profile Complete',
                  'type', 'none',
                  'description', 'Personal DIY profile completed and saved'
                )
              )
            )
          )
        )
      )
    ) as kickoff,
    
    -- Planning Phase  
    jsonb_build_object(
      'id', 'planning-phase',
      'name', 'Planning',
      'description', 'Comprehensive project planning and preparation',
      'operations', jsonb_build_array(
        jsonb_build_object(
          'id', 'initial-planning-operation',
          'name', 'Initial Planning',
          'description', 'Define project scope and select phases',
          'steps', jsonb_build_array(
            jsonb_build_object(
              'id', 'planning-step-1',
              'step', 'Project Work Scope',
              'description', 'Define project scope, measurements, timing, and customize workflow',
              'contentType', 'text',
              'content', 'Complete the project sizing questionnaire and customize your project workflow by selecting phases from our library or creating custom phases.',
              'materials', '[]'::jsonb,
              'tools', '[]'::jsonb,
              'outputs', jsonb_build_array(
                jsonb_build_object(
                  'id', 'scope-output',
                  'name', 'Project Scope Defined',
                  'type', 'none',
                  'description', 'Project scope, timing, and workflow customized'
                )
              )
            )
          )
        )
      )
    ) as planning,
    
    -- Ordering Phase
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
                jsonb_build_object(
                  'id', 'checklist-output',
                  'name', 'Shopping Checklist Prepared',
                  'description', 'Complete shopping checklist prepared and reviewed',
                  'type', 'none'
                )
              )
            )
          )
        )
      )
    ) as ordering,
    
    -- Prep Phase (custom for tile flooring)
    jsonb_build_object(
      'id', 'prep-phase',
      'name', 'Prep',
      'description', 'Surface preparation and project setup',
      'operations', jsonb_build_array(
        jsonb_build_object(
          'id', 'project-setup-op',
          'name', 'Project Setup',
          'description', 'Initial project setup and preparation',
          'steps', jsonb_build_array(
            jsonb_build_object(
              'id', 'furniture-move-step',
              'step', 'Furniture and belongings move',
              'description', 'Remove furniture, fixtures, and personal items; protect adjacent surfaces',
              'contentType', 'text',
              'content', 'Remove furniture, fixtures, and personal items; protect adjacent surfaces',
              'materials', '[]'::jsonb,
              'tools', '[]'::jsonb,
              'outputs', jsonb_build_array(
                jsonb_build_object(
                  'id', 'out-1',
                  'name', 'No personal areas affected by dust',
                  'description', '',
                  'type', 'none'
                )
              )
            )
          )
        )
      )
    ) as prep,
    
    -- Install Phase (custom for tile flooring)
    jsonb_build_object(
      'id', 'install-phase',
      'name', 'Install',
      'description', 'Tile installation process',
      'operations', jsonb_build_array(
        jsonb_build_object(
          'id', 'tile-install-op',
          'name', 'Tile Installation',
          'description', 'Install floor tiles',
          'steps', jsonb_build_array(
            jsonb_build_object(
              'id', 'tile-install-step',
              'step', 'Install Floor Tiles',
              'description', 'Install floor tiles following proper techniques',
              'contentType', 'text',
              'content', 'Install floor tiles using proper adhesive and spacing techniques.',
              'materials', '[]'::jsonb,
              'tools', '[]'::jsonb,
              'outputs', jsonb_build_array(
                jsonb_build_object(
                  'id', 'tile-install-output',
                  'name', 'Tiles Installed',
                  'description', 'Floor tiles properly installed',
                  'type', 'none'
                )
              )
            )
          )
        )
      )
    ) as install,
    
    -- Close Project Phase
    jsonb_build_object(
      'id', 'close-project-phase',
      'name', 'Close Project',
      'description', 'Final cleanup, organization, and celebration of project completion',
      'operations', jsonb_build_array(
        jsonb_build_object(
          'id', 'celebration-operation',
          'name', 'Celebration',
          'description', 'Celebrate project completion and document results',
          'steps', jsonb_build_array(
            jsonb_build_object(
              'id', 'celebration-step',
              'step', 'Project Celebration',
              'description', 'Celebrate your project completion and share your success',
              'contentType', 'text',
              'content', 'Take photos of your completed project, celebrate your achievement, and share with friends and family.',
              'materials', '[]'::jsonb,
              'tools', '[]'::jsonb,
              'outputs', jsonb_build_array(
                jsonb_build_object(
                  'id', 'celebration-output',
                  'name', 'Project Completed',
                  'description', 'Project successfully completed and documented',
                  'type', 'none'
                )
              )
            )
          )
        )
      )
    ) as close_project
)

UPDATE public.projects 
SET phases = (
  SELECT jsonb_build_array(
    sp.kickoff,
    sp.planning,
    sp.ordering,
    sp.prep,
    sp.install,
    sp.close_project
  )
  FROM standard_phases sp
)
WHERE name = 'Tile Flooring Installation';