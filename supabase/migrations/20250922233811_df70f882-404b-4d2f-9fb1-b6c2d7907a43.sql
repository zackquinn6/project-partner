-- Update Close Project phase to have the correct operations: "Tool & Material Closeout" and "Celebration"
UPDATE projects 
SET phases = (
  SELECT jsonb_agg(
    CASE 
      WHEN phase->>'name' = 'Close Project' OR phase->>'name' = 'Finish' THEN
        jsonb_build_object(
          'id', 'close-project-phase',
          'name', 'Close Project',
          'description', 'Final cleanup, organization, and celebration of project completion',
          'operations', jsonb_build_array(
            jsonb_build_object(
              'id', 'tool-material-closeout-operation',
              'name', 'Tool & Material Closeout',
              'description', 'Handle tools and materials after project completion',
              'steps', jsonb_build_array(
                jsonb_build_object(
                  'id', 'return-tools-step',
                  'step', 'Return Tools',
                  'description', 'Clean and return any rented tools to avoid late fees',
                  'contentType', 'text',
                  'content', 'Clean all rented tools thoroughly and return them to the rental facility. Check rental agreements for return deadlines to avoid additional charges.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'return-tools-output',
                      'name', 'Rented Tools Returned',
                      'description', 'All rented tools cleaned and returned on time',
                      'type', 'none'
                    )
                  )
                ),
                jsonb_build_object(
                  'id', 'store-tools-step',
                  'step', 'Store Tools',
                  'description', 'Organize and store newly purchased tools',
                  'contentType', 'text',
                  'content', 'Clean and properly store all purchased tools in your tool storage area. Keep receipts and warranty information in a safe place.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'store-tools-output',
                      'name', 'Tools Organized',
                      'description', 'Purchased tools cleaned and properly stored',
                      'type', 'none'
                    )
                  )
                ),
                jsonb_build_object(
                  'id', 'store-materials-step',
                  'step', 'Store Materials',
                  'description', 'Organize and store leftover materials for future use',
                  'contentType', 'text',
                  'content', 'Properly organize and store any remaining materials in a dry, safe location. Label containers and keep receipts for warranty purposes.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'store-materials-output',
                      'name', 'Materials Stored',
                      'description', 'Leftover materials properly organized and stored',
                      'type', 'none'
                    )
                  )
                ),
                jsonb_build_object(
                  'id', 'dispose-materials-step',
                  'step', 'Dispose Materials',
                  'description', 'Responsibly dispose of construction waste and debris',
                  'contentType', 'text',
                  'content', 'Dispose of construction waste according to local regulations. Separate recyclable materials and hazardous waste for proper disposal.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'dispose-materials-output',
                      'name', 'Waste Disposed',
                      'description', 'Construction waste responsibly disposed of',
                      'type', 'none'
                    )
                  )
                )
              )
            ),
            jsonb_build_object(
              'id', 'celebration-operation',
              'name', 'Celebration',
              'description', 'Celebrate your successful project completion',
              'steps', jsonb_build_array(
                jsonb_build_object(
                  'id', 'celebrate-step',
                  'step', 'Celebrate Your Success',
                  'description', 'Take time to appreciate your accomplishment and share your success',
                  'contentType', 'text',
                  'content', 'Congratulations on completing your project! Take photos of your finished work, share with family and friends, and enjoy the satisfaction of a job well done.',
                  'materials', jsonb_build_array(),
                  'tools', jsonb_build_array(),
                  'outputs', jsonb_build_array(
                    jsonb_build_object(
                      'id', 'celebration-output',
                      'name', 'Project Celebrated',
                      'description', 'Achievement recognized and celebrated',
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