-- Create user-scoped inventory tables for tools and materials.
-- user_tools: per-user tool inventory
-- user_materials: per-user material inventory

BEGIN;

-- 1) user_tools table
CREATE TABLE IF NOT EXISTS public.user_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  -- Cached fields to avoid denormalized JSON in profiles
  name text NOT NULL,
  description text,
  model_name text,
  quantity integer NOT NULL CHECK (quantity >= 0),
  user_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_tools_user_id ON public.user_tools(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tools_user_tool ON public.user_tools(user_id, tool_id);

-- 2) user_materials table
CREATE TABLE IF NOT EXISTS public.user_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  -- Cached fields for quick access
  name text NOT NULL,
  description text,
  unit text,
  unit_size text,
  brand text,
  purchase_location text,
  quantity numeric NOT NULL CHECK (quantity >= 0),
  user_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_materials_user_id ON public.user_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_materials_user_material ON public.user_materials(user_id, material_id);

COMMIT;

