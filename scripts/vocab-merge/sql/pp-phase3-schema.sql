-- ===========================================================================
-- Part 1: vocabulary schema (expand). Old structures stay in place.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.vocab_keys (
  public_key text PRIMARY KEY CHECK (public_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  entity text NOT NULL CHECK (entity IN ('category', 'project', 'tool', 'material')),
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  replaced_by_public_key text REFERENCES public.vocab_keys (public_key),
  CHECK (replaced_by_public_key IS NULL OR removed_at IS NOT NULL)
);

ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS public_key text REFERENCES public.vocab_keys (public_key);
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS name_key text;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS public_key text REFERENCES public.vocab_keys (public_key);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS name_key text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS public_key text REFERENCES public.vocab_keys (public_key);

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_public_key_root_only;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_public_key_root_only CHECK (public_key IS NULL OR parent_project_id IS NULL);

CREATE TABLE IF NOT EXISTS public.project_categories (
  public_key text PRIMARY KEY REFERENCES public.vocab_keys (public_key),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vocab_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL REFERENCES public.vocab_keys (public_key),
  alias text NOT NULL,
  source text NOT NULL CHECK (source IN ('pp_name', 'pp_revision_name', 'toolio_name', 'alternates', 'merged_term')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (public_key, alias)
);

CREATE TABLE IF NOT EXISTS public.project_family_tools (
  family_key text NOT NULL REFERENCES public.vocab_keys (public_key),
  term_key text NOT NULL REFERENCES public.vocab_keys (public_key),
  role text NOT NULL CHECK (role IN ('required', 'substitute')),
  source text NOT NULL CHECK (source IN ('steps', 'toolio_seed')),
  PRIMARY KEY (family_key, term_key, source)
);

CREATE TABLE IF NOT EXISTS public.vocab_removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL REFERENCES public.vocab_keys (public_key),
  requested_by_app text NOT NULL CHECK (requested_by_app IN ('pp', 'toolio')),
  requested_by_email text NOT NULL,
  reason text,
  replacement_key text REFERENCES public.vocab_keys (public_key),
  pp_decision text CHECK (pp_decision IN ('approve', 'reject')),
  pp_decided_by text,
  pp_decided_at timestamptz,
  toolio_decision text CHECK (toolio_decision IN ('approve', 'reject')),
  toolio_decided_by text,
  toolio_decided_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (replacement_key IS NULL OR replacement_key <> public_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS vocab_removal_requests_one_open
  ON public.vocab_removal_requests (public_key) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.vocab_change_events (
  seq bigserial PRIMARY KEY,
  entity text NOT NULL,
  public_key text NOT NULL,
  change_kind text NOT NULL CHECK (change_kind IN ('upsert', 'remove', 'removal_request')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vocab_change_events_created_at ON public.vocab_change_events (created_at);

-- Row level security: vocabulary is readable by signed-in users, written by admins.
-- Removal requests are admin-only and change only through the vocab_* functions.
-- The change feed has no client access (service role only).
ALTER TABLE public.vocab_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_family_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_removal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_change_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vocab_keys_select ON public.vocab_keys;
CREATE POLICY vocab_keys_select ON public.vocab_keys FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS project_categories_select ON public.project_categories;
CREATE POLICY project_categories_select ON public.project_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS project_categories_insert ON public.project_categories;
CREATE POLICY project_categories_insert ON public.project_categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS project_categories_update ON public.project_categories;
CREATE POLICY project_categories_update ON public.project_categories FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS vocab_aliases_select ON public.vocab_aliases;
CREATE POLICY vocab_aliases_select ON public.vocab_aliases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS vocab_aliases_insert ON public.vocab_aliases;
CREATE POLICY vocab_aliases_insert ON public.vocab_aliases FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS vocab_aliases_delete ON public.vocab_aliases;
CREATE POLICY vocab_aliases_delete ON public.vocab_aliases FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS project_family_tools_select ON public.project_family_tools;
CREATE POLICY project_family_tools_select ON public.project_family_tools FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS vocab_removal_requests_select ON public.vocab_removal_requests;
CREATE POLICY vocab_removal_requests_select ON public.vocab_removal_requests FOR SELECT TO authenticated USING (public.is_admin());
