-- =====================================================
-- UPDATE PROJECT_TEMPLATES_LIVE VIEW
-- Resolve dynamic links to standard foundation
-- =====================================================

DROP VIEW IF EXISTS project_templates_live CASCADE;

CREATE OR REPLACE VIEW project_templates_live AS
SELECT 
  p.id,
  p.user_id,
  p.name,
  p.description,
  p.icon,
  p.difficulty_level,
  p.estimated_time,
  p.estimated_cost,
  p.visibility,
  p.is_template,
  p.is_standard,
  p.category,
  p.tags,
  p.created_at,
  p.updated_at,
  'published' as publish_status,
  true as is_current_version,
  1 as revision_number,
  -- Build phases JSONB - resolve dynamic links
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'name', pp.name,
          'description', pp.description,
          'isStandard', COALESCE(pp.is_standard, false),
          'isLinked', COALESCE(pp.is_linked, false),
          'sourceProjectId', pp.source_project_id,
          'sourceProjectName', pp.source_project_name,
          'phaseOrderNumber', CASE
            WHEN pp.position_rule = 'first' THEN to_jsonb('first'::text)
            WHEN pp.position_rule = 'last' THEN to_jsonb('last'::text)
            WHEN pp.position_rule = 'nth' THEN to_jsonb(COALESCE(pp.position_value, 999))
            WHEN pp.position_rule = 'last_minus_n' THEN to_jsonb(COALESCE(pp.position_value, 999))
            ELSE to_jsonb(999)
          END,
          'operations', COALESCE(
            -- If this is a linked phase, get operations from the SOURCE project
            CASE WHEN pp.is_linked = true AND pp.source_project_id IS NOT NULL THEN
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', source_po.id,
                    'name', source_po.operation_name,
                    'description', source_po.operation_description,
                    'estimatedTime', source_po.estimated_time,
                    'flowType', COALESCE(source_po.flow_type, 'prime'),
                    'steps', COALESCE(
                      (
                        SELECT jsonb_agg(
                          jsonb_build_object(
                            'id', source_os.id,
                            'step', source_os.step_title,
                            'description', source_os.description,
                            'contentType', COALESCE(source_os.content_type, 'text'),
                            'content', source_os.content,
                            'materials', COALESCE(source_os.materials, '[]'::jsonb),
                            'tools', COALESCE(source_os.tools, '[]'::jsonb),
                            'outputs', COALESCE(source_os.outputs, '[]'::jsonb)
                          )
                          ORDER BY source_os.display_order
                        )
                        FROM operation_steps source_os
                        WHERE source_os.operation_id = source_po.id
                      ),
                      '[]'::jsonb
                    )
                  )
                  ORDER BY source_po.display_order
                )
                FROM phase_operations source_po
                JOIN project_phases source_pp ON source_pp.id = source_po.phase_id
                WHERE source_pp.project_id = pp.source_project_id
                  AND source_pp.name = pp.name -- Match by phase name
              )
            ELSE
              -- If not linked, get operations from this project's own phases
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', po.id,
                    'name', po.operation_name,
                    'description', po.operation_description,
                    'estimatedTime', po.estimated_time,
                    'flowType', COALESCE(po.flow_type, 'prime'),
                    'steps', COALESCE(
                      (
                        SELECT jsonb_agg(
                          jsonb_build_object(
                            'id', os.id,
                            'step', os.step_title,
                            'description', os.description,
                            'contentType', COALESCE(os.content_type, 'text'),
                            'content', os.content,
                            'materials', COALESCE(os.materials, '[]'::jsonb),
                            'tools', COALESCE(os.tools, '[]'::jsonb),
                            'outputs', COALESCE(os.outputs, '[]'::jsonb)
                          )
                          ORDER BY os.display_order
                        )
                        FROM operation_steps os
                        WHERE os.operation_id = po.id
                      ),
                      '[]'::jsonb
                    )
                  )
                  ORDER BY po.display_order
                )
                FROM phase_operations po
                WHERE po.phase_id = pp.id
              )
            END,
            '[]'::jsonb
          )
        )
        ORDER BY pp.display_order
      )
      FROM project_phases pp
      WHERE pp.project_id = p.id
    ),
    '[]'::jsonb
  ) as phases
FROM projects p
WHERE p.is_template = true;

COMMENT ON VIEW project_templates_live IS 
'Combines projects with their phases in JSONB format. Automatically resolves dynamic links to standard foundation - when isLinked=true, operations and steps are fetched from source_project_id. This ensures standard phase updates automatically appear in all linked projects.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ project_templates_live view updated with dynamic link resolution';
  RAISE NOTICE '✅ Linked phases now fetch operations from source project';
  RAISE NOTICE '✅ Standard foundation changes will automatically propagate to all projects';
END $$;

