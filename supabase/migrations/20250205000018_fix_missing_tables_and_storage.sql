-- =====================================================
-- FIX MISSING TABLES, VIEW COLUMNS, AND STORAGE
-- =====================================================

-- =====================================================
-- 1. CREATE APP_SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read app settings
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Only admins can modify app settings
DROP POLICY IF EXISTS "Admins can modify app settings" ON public.app_settings;
CREATE POLICY "Admins can modify app settings"
  ON public.app_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default beta_mode setting
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('beta_mode', 'false'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 2. FIX PROJECT_TEMPLATES_LIVE VIEW
-- Add missing columns that frontend expects
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
  -- Add columns frontend expects
  'published' as publish_status,
  true as is_current_version,
  1 as revision_number,
  -- Build phases JSONB from relational project_phases table
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
            ),
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

-- =====================================================
-- 3. CREATE STORAGE BUCKET FOR HOME PHOTOS
-- =====================================================

-- Insert storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('home-photos', 'home-photos', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. CREATE STORAGE POLICIES FOR HOME PHOTOS
-- =====================================================

-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Users can upload own home photos" ON storage.objects;
CREATE POLICY "Users can upload own home photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'home-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view their own photos
DROP POLICY IF EXISTS "Users can view own home photos" ON storage.objects;
CREATE POLICY "Users can view own home photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'home-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own photos
DROP POLICY IF EXISTS "Users can update own home photos" ON storage.objects;
CREATE POLICY "Users can update own home photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'home-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'home-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own photos
DROP POLICY IF EXISTS "Users can delete own home photos" ON storage.objects;
CREATE POLICY "Users can delete own home photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'home-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ app_settings table created';
  RAISE NOTICE '✅ project_templates_live view updated with missing columns';
  RAISE NOTICE '✅ home-photos storage bucket created';
  RAISE NOTICE '✅ Storage RLS policies applied';
END $$;

