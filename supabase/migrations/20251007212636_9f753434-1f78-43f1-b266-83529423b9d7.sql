-- Add button content sections to standard project phases
-- This updates the Project Customizer, Project Scheduler, and Shopping Checklist steps
-- to include interactive buttons that launch their respective interfaces

UPDATE projects
SET phases = jsonb_set(
  jsonb_set(
    jsonb_set(
      phases,
      '{1,operations,3,steps,0}',
      jsonb_build_object(
        'id', 'planning-step-4',
        'step', 'Customize Workflow',
        'tools', '[]'::jsonb,
        'outputs', jsonb_build_array(
          jsonb_build_object(
            'id', 'customization-output',
            'name', 'Workflow Customized',
            'type', 'none',
            'description', 'Project workflow customized to your needs'
          )
        ),
        'materials', '[]'::jsonb,
        'contentType', 'multi',
        'contentSections', jsonb_build_array(
          jsonb_build_object(
            'id', 'customize-intro',
            'type', 'text',
            'content', 'Use the Project Customizer to add custom work, modify existing phases, or adjust the project workflow to match your specific needs.'
          ),
          jsonb_build_object(
            'id', 'customize-button',
            'type', 'button',
            'content', '',
            'buttonAction', 'project-customizer',
            'buttonLabel', 'Open Project Customizer',
            'buttonIcon', 'HelpCircle',
            'buttonVariant', 'outline'
          )
        ),
        'description', 'Add or modify project phases and operations',
        'estimatedTime', 20
      )
    ),
    '{1,operations,4,steps,0}',
    jsonb_build_object(
      'id', 'planning-step-5',
      'step', 'Schedule Project',
      'tools', '[]'::jsonb,
      'outputs', jsonb_build_array(
        jsonb_build_object(
          'id', 'schedule-output',
          'name', 'Schedule Complete',
          'type', 'none',
          'description', 'Project timeline and milestones scheduled'
        )
      ),
      'materials', '[]'::jsonb,
      'contentType', 'multi',
      'contentSections', jsonb_build_array(
        jsonb_build_object(
          'id', 'schedule-intro',
          'type', 'text',
          'content', 'Use the Project Scheduler to set your start date, target completion date, and schedule individual phases and operations.'
        ),
        jsonb_build_object(
          'id', 'schedule-button',
          'type', 'button',
          'content', '',
          'buttonAction', 'project-scheduler',
          'buttonLabel', 'Open Project Scheduler',
          'buttonIcon', 'Calendar',
          'buttonVariant', 'outline'
        )
      ),
      'description', 'Set project dates and milestones',
      'estimatedTime', 15
    )
  ),
  '{2,operations,0,steps,0}',
  jsonb_build_object(
    'id', 'ordering-step-1',
    'step', 'Review Shopping List',
    'tools', '[]'::jsonb,
    'outputs', jsonb_build_array(
      jsonb_build_object(
        'id', 'checklist-output',
        'name', 'Checklist Reviewed',
        'type', 'none',
        'description', 'Shopping checklist reviewed and verified'
      )
    ),
    'materials', '[]'::jsonb,
    'contentType', 'multi',
    'contentSections', jsonb_build_array(
      jsonb_build_object(
        'id', 'shopping-intro',
        'type', 'text',
        'content', 'Review your complete shopping checklist including all materials and tools needed for the project.'
      ),
      jsonb_build_object(
        'id', 'shopping-button',
        'type', 'button',
        'content', '',
        'buttonAction', 'shopping-checklist',
        'buttonLabel', 'Open Shopping Checklist',
        'buttonIcon', 'ShoppingCart',
        'buttonVariant', 'outline'
      )
    ),
    'description', 'Review complete materials and tools list',
    'estimatedTime', 15
  )
)
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND name = 'Standard Project Foundation';