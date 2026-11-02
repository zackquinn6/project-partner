-- Local stand-in for the Project Partner tables and helpers the phase 3 migration touches.
-- Columns mirror src/integrations/supabase/types.ts; only what the migration reads or writes.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
END $$;

CREATE SCHEMA auth;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('test.role', true) $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE TABLE auth.users (id uuid PRIMARY KEY, email text NOT NULL);
CREATE TABLE public._test_admins (user_id uuid PRIMARY KEY);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-00000000a001', 'admin@example.com'), ('00000000-0000-0000-0000-00000000a002', 'member@example.com');
INSERT INTO public._test_admins VALUES ('00000000-0000-0000-0000-00000000a001');

CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.is_admin', true) = 'true' $$;
CREATE FUNCTION public.is_admin(check_user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public._test_admins WHERE user_id = check_user_id)
$$;

CREATE TABLE public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text CONSTRAINT tools_category_required_chk CHECK (category IN ('PPE', 'Hand Tool', 'Power Tool', 'Other')),
  alternates text,
  specialty_scale integer NOT NULL,
  photo_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  alternates text,
  unit text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tool_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  core_item_id uuid NOT NULL,
  name text NOT NULL,
  sku text
);
CREATE TABLE public.materials_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials (id),
  name text NOT NULL,
  sku text
);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text[],
  tags text[],
  publish_status text DEFAULT 'draft',
  visibility_status text NOT NULL DEFAULT 'default',
  parent_project_id uuid REFERENCES public.projects (id),
  is_foundational boolean NOT NULL DEFAULT false,
  is_standard boolean DEFAULT false,
  item_type text,
  user_id uuid,
  foundation_project_id uuid,
  revision_number integer,
  phases jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id),
  name text NOT NULL,
  source_phase_id uuid
);
CREATE TABLE public.phase_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES public.project_phases (id),
  operation_name text NOT NULL
);
CREATE TABLE public.operation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES public.phase_operations (id),
  step_title text NOT NULL,
  tools jsonb,
  materials jsonb
);
CREATE TABLE public.project_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects (id),
  name text NOT NULL,
  phases jsonb,
  shopping_checklist_data jsonb
);
CREATE TABLE public.user_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool_id uuid NOT NULL REFERENCES public.tools (id),
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  description text,
  model_name text,
  user_photo_url text
);
CREATE TABLE public.user_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  material_id uuid NOT NULL REFERENCES public.materials (id),
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  description text,
  user_photo_url text
);
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY,
  owned_tools jsonb
);
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  type text,
  title text,
  body text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.latest_published_in_family(p_any_project_id uuid) RETURNS uuid LANGUAGE sql STABLE AS $$
  WITH root AS (
    SELECT CASE WHEN parent_project_id IS NULL THEN id ELSE parent_project_id END AS id
    FROM public.projects WHERE id = p_any_project_id
  )
  SELECT p.id FROM public.projects p, root
  WHERE (p.id = root.id OR p.parent_project_id = root.id) AND p.publish_status = 'published'
  ORDER BY p.revision_number DESC NULLS LAST, p.updated_at DESC
  LIMIT 1
$$;

CREATE FUNCTION public.notifications_notify_admins(p_type text, p_title text, p_body text, p_metadata jsonb)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.notifications (type, title, body, metadata) VALUES (p_type, p_title, p_body, p_metadata)
$$;

-- Stand-in for Toolio's normalization: answers from the keys Toolio returned for this export.
CREATE TABLE public._test_name_keys (name text PRIMARY KEY, name_key text NOT NULL);
