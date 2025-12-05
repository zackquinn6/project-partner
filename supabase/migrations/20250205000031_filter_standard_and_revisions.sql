-- =====================================================
-- ADD MISSING COLUMNS AND UPDATE PROJECT_TEMPLATES_LIVE VIEW
-- Filter out standard foundation and only show latest published revisions
-- =====================================================

-- Add publish_status column if it doesn't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS publish_status TEXT DEFAULT 'published' CHECK (publish_status IN ('draft', 'published', 'beta-testing', 'archived'));

-- Add is_current_version column if it doesn't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN DEFAULT true;

-- Add revision_number column if it doesn't exist
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;

-- parent_project_id should already exist from migration 20250205000023

-- Update existing projects to have default values
UPDATE public.projects 
SET 
  publish_status = COALESCE(publish_status, 'published'),
  is_current_version = COALESCE(is_current_version, true),
  revision_number = COALESCE(revision_number, 1)
WHERE publish_status IS NULL OR is_current_version IS NULL OR revision_number IS NULL;

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
  COALESCE(p.publish_status, 'published') as publish_status,
  COALESCE(p.is_current_version, true) as is_current_version,
  COALESCE(p.revision_number, 1) as revision_number,
  p.parent_project_id,
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
WHERE 
  -- Only show templates
  p.is_template = true
  -- Exclude standard foundation (is_standard = true)
  AND (p.is_standard IS NULL OR p.is_standard = false)
  -- Only show latest revisions (is_current_version = true OR no parent_project_id)
  AND (p.is_current_version = true OR p.parent_project_id IS NULL)
  -- Only show published or beta-testing projects
  AND COALESCE(p.publish_status, 'published') IN ('published', 'beta-testing');

COMMENT ON VIEW project_templates_live IS 
'Combines projects with their phases in JSONB format. Automatically resolves dynamic links to standard foundation. 
FILTERS:
- Excludes standard foundation (is_standard = true)
- Only shows latest revisions (is_current_version = true OR no parent_project_id)
- Only shows published/beta-testing projects (excludes draft and archived)
This ensures the catalog only shows production-ready project templates.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ project_templates_live view updated';
  RAISE NOTICE '✅ Now filters out standard foundation (is_standard = true)';
  RAISE NOTICE '✅ Only shows latest revisions (is_current_version = true)';
  RAISE NOTICE '✅ Only shows published/beta-testing projects';
END $$;

