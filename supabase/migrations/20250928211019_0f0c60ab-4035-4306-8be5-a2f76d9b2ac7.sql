-- Rebuild the Kickoff phase since it's completely corrupted (null)
UPDATE public.projects 
SET phases = jsonb_set(
  phases, 
  '{0}', 
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
                'description', 'Personal DIY profile completed and saved',
                'type', 'none'
              )
            )
          ),
          jsonb_build_object(
            'id', 'kickoff-step-2',
            'step', 'Project Overview',
            'description', 'Review and customize your project details, timeline, and objectives',
            'contentType', 'text',
            'content', 'This is your project overview step. Review all project details and make any necessary customizations before proceeding.',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'overview-output',
                'name', 'Project Overview Complete',
                'description', 'Project details reviewed and customized',
                'type', 'none'
              )
            )
          ),
          jsonb_build_object(
            'id', 'kickoff-step-3',
            'step', 'Project Profile',
            'description', 'Set up your project team, home selection, and customization',
            'contentType', 'text',
            'content', 'Configure your project profile including project name, team members, home selection, and any project-specific customizations.',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'project-profile-output',
                'name', 'Project Profile Complete',
                'description', 'Project profile configured and saved',
                'type', 'none'
              )
            )
          ),
          jsonb_build_object(
            'id', 'kickoff-step-4',
            'step', 'Project Partner Agreement',
            'description', 'Review and sign the project partner agreement',
            'contentType', 'text',
            'content', 'Please review the project partner agreement terms and provide your digital signature to proceed.',
            'materials', '[]'::jsonb,
            'tools', '[]'::jsonb,
            'outputs', jsonb_build_array(
              jsonb_build_object(
                'id', 'agreement-output',
                'name', 'Signed Agreement',
                'description', 'Project partner agreement signed and documented',
                'type', 'none'
              )
            )
          )
        )
      )
    )
  )
)
WHERE name = 'Tile Flooring Installation';