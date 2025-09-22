-- Update existing projects to include the three standard Planning phase operations
-- Add Measure & Assess, Final Planning, and Project Schedule operations to Planning phase

UPDATE projects 
SET phases = (
  SELECT jsonb_agg(
    CASE 
      WHEN phase->>'name' = 'Planning' THEN
        jsonb_build_object(
          'id', phase->>'id',
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
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'scope-output',
                      'name', 'Project Scope Defined',
                      'description', 'Project scope, timing, and workflow customized',
                      'type', 'none'
                    )
                  )
                )
              )
            ),
            jsonb_build_object(
              'id', 'measurement-operation',
              'name', 'Measure & Assess',
              'description', 'Measure spaces and assess project requirements',
              'steps', jsonb_build_array(
                jsonb_build_object(
                  'id', 'measurement-step-1',
                  'step', 'Site Measurement',
                  'description', 'Take accurate measurements of your work area',
                  'contentType', 'text',
                  'content', 'Measure your work area carefully and document all dimensions needed for your project.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'measurement-output',
                      'name', 'Measurements Complete',
                      'description', 'All necessary measurements documented',
                      'type', 'none'
                    )
                  )
                )
              )
            ),
            jsonb_build_object(
              'id', 'final-planning-operation',
              'name', 'Final Planning',
              'description', 'Finalize project details and create execution plan',
              'steps', jsonb_build_array(
                jsonb_build_object(
                  'id', 'final-planning-step-1',
                  'step', 'Finalize Project Plan',
                  'description', 'Review and finalize all project details and timeline',
                  'contentType', 'text',
                  'content', 'Review your project plan, confirm all details, and create your final execution timeline.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'final-planning-output',
                      'name', 'Project Plan Finalized',
                      'description', 'Project ready for execution',
                      'type', 'none'
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
                  'contentType', 'text',
                  'content', 'Plan your project timeline by scheduling phases, setting realistic deadlines, and coordinating with your calendar.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'scheduling-output',
                      'name', 'Project Scheduled',
                      'description', 'Project timeline and schedule established',
                      'type', 'none'
                    )
                  )
                )
              )
            )
          )
        )
      ELSE phase
    END
  )
  FROM jsonb_array_elements(phases) AS phase
)
WHERE jsonb_path_exists(phases, '$[*] ? (@.name == "Planning")');