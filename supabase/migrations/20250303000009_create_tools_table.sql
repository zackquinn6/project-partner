-- Create tools table for library core items (used by ToolsLibrary, LibraryItemForm, variation_instances.core_item_id).
-- The rebuild only created tool_models; the app expects this table for "Add new tool" and tool library listing.

CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  example_models TEXT,
  photo_url TEXT,
  alternates TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tools" ON public.tools;
CREATE POLICY "Anyone can view tools"
  ON public.tools FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can modify tools" ON public.tools;
CREATE POLICY "Admins can modify tools"
  ON public.tools FOR ALL
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

COMMENT ON TABLE public.tools IS 'Core tool library items; variation_instances reference these via core_item_id when item_type = ''tools''.';
