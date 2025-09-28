-- Fix duplicate phases in Tile Flooring Installation project by reconstructing phases properly
UPDATE public.projects 
SET phases = jsonb_build_array(
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
            'content', 'Set up your DIY profile to receive personalized project recommendations, tool suggestions, and guidance tailored to your skill level and preferences.',
            'contentType', 'text',
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
          ),
          jsonb_build_object(
            'id', 'kickoff-step-2',
            'step', 'Project Overview',
            'description', 'Review and customize your project details, timeline, and objectives',
            'content', 'This is your project overview step. Review all project details and make any necessary customizations before proceeding.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'overview-output',
                'name', 'Project Overview Complete',
                'type', 'none',
                'description', 'Project details reviewed and customized'
              )
            )
          ),
          jsonb_build_object(
            'id', 'kickoff-step-3',
            'step', 'Project Profile',
            'description', 'Set up your project team, home selection, and customization',
            'content', 'Configure your project profile including project name, team members, home selection, and any project-specific customizations.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'project-profile-output',
                'name', 'Project Profile Complete',
                'type', 'none',
                'description', 'Project profile configured and saved'
              )
            )
          ),
          jsonb_build_object(
            'id', 'kickoff-step-4',
            'step', 'Project Partner Agreement',
            'description', 'Review and sign the project partner agreement',
            'content', 'Please review the project partner agreement terms and provide your digital signature to proceed.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'agreement-output',
                'name', 'Signed Agreement',
                'type', 'none',
                'description', 'Project partner agreement signed and documented'
              )
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
            'content', 'Complete the project sizing questionnaire and customize your project workflow by selecting phases from our library or creating custom phases.',
            'contentType', 'text',
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
      ),
      jsonb_build_object(
        'id', 'project-customizer-operation',
        'name', 'Project Customizer',
        'description', 'Customize project phases and workflow',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'project-customizer-step',
            'step', 'Project Customizer',
            'description', 'Customize project phases, operations, and steps to match your specific needs',
            'content', 'Use the project customizer to add, remove, or modify project phases and operations to create a workflow that fits your specific project requirements.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'customization-output',
                'name', 'Project Customized',
                'type', 'none',
                'description', 'Project workflow customized to specific requirements'
              )
            )
          )
        )
      ),
      jsonb_build_object(
        'id', 'project-scheduling-operation',
        'name', 'Project Schedule',
        'description', 'Create project timeline and schedule phases',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'planning-step-2',
            'step', 'Project Scheduling',
            'description', 'Create project timeline and schedule phases',
            'content', 'Plan your project timeline by scheduling phases, setting realistic deadlines, and coordinating with your calendar.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'scheduling-output',
                'name', 'Project Scheduled',
                'type', 'none',
                'description', 'Project timeline and schedule established'
              )
            )
          )
        )
      )
    )
  ),
  -- Ordering Phase
  jsonb_build_object(
    'id', 'ordering-phase',
    'name', 'Ordering',
    'description', 'Order tools and materials for your project',
    'operations', jsonb_build_array(
      jsonb_build_object(
        'id', 'shopping-checklist-operation',
        'name', 'Shopping Checklist',
        'description', 'Create comprehensive shopping list for all project needs',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'shopping-checklist-step',
            'step', 'Create Shopping Checklist',
            'description', 'Generate and review comprehensive shopping list',
            'content', 'Create a comprehensive shopping checklist that includes all tools, materials, and supplies needed for your project. Review quantities, specifications, and prioritize purchases.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'checklist-output',
                'name', 'Shopping Checklist Created',
                'type', 'none',
                'description', 'Complete shopping checklist prepared and organized'
              )
            )
          )
        )
      ),
      jsonb_build_object(
        'id', 'ordering-operation',
        'name', 'Order Tools & Materials',
        'description', 'Purchase or rent required tools and materials',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'ordering-step',
            'step', 'Order Tools & Materials',
            'description', 'Purchase tools, materials, and supplies for your project',
            'content', 'Order all required tools, materials, and supplies for your project. Compare prices, check availability, and coordinate delivery schedules.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'ordering-output',
                'name', 'Tools & Materials Ordered',
                'type', 'none',
                'description', 'All necessary tools and materials ordered and delivery scheduled'
              )
            )
          )
        )
      )
    )
  ),
  -- Extract custom phases (keep existing Install phase as it's project-specific)
  (SELECT phases -> 4 FROM public.projects WHERE id = 'a1a2b3bf-2c49-4134-83ef-805de7f04b87'),
  -- Close Project Phase (single instance)
  jsonb_build_object(
    'id', 'close-project-phase',
    'name', 'Close Project',
    'description', 'Project completion and documentation',
    'operations', jsonb_build_array(
      jsonb_build_object(
        'id', 'tool-material-closeout-operation',
        'name', 'Tool & Material Closeout',
        'description', 'Return rentals and organize remaining materials',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'closeout-step',
            'step', 'Tool & Material Closeout',
            'description', 'Return rental tools and organize leftover materials',
            'content', 'Return all rental tools, organize and store leftover materials, and update your tool and material inventory.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'closeout-output',
                'name', 'Tools & Materials Organized',
                'type', 'none',
                'description', 'Rental tools returned and materials properly stored'
              )
            )
          )
        )
      ),
      jsonb_build_object(
        'id', 'celebration-operation',
        'name', 'Celebration',
        'description', 'Celebrate project completion and share results',
        'steps', jsonb_build_array(
          jsonb_build_object(
            'id', 'celebration-step',
            'step', 'Project Celebration',
            'description', 'Celebrate your completed project and share your success',
            'content', 'Take time to celebrate your completed project! Document your results, share photos with friends and family, and reflect on what you learned.',
            'contentType', 'text',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'celebration-output',
                'name', 'Project Celebrated',
                'type', 'none',
                'description', 'Project completion celebrated and documented'
              )
            )
          )
        )
      )
    )
  )
)
WHERE name = 'Tile Flooring Installation' 
AND revision_number = (
  SELECT MAX(revision_number) 
  FROM public.projects 
  WHERE name = 'Tile Flooring Installation'
);