-- Fix PostgREST RPC ambiguity:
-- Some environments have an older overload of create_project_revision_v2 with reversed arg order:
--   (new_name text, p_source_project_id uuid)
-- Supabase/PostgREST resolves RPC by named params and can’t choose between the two.
-- Drop the reversed overload so calls with { p_source_project_id, new_name } are unambiguous.

DROP FUNCTION IF EXISTS public.create_project_revision_v2(new_name text, p_source_project_id uuid);

-- Fix PostgREST RPC ambiguity:
-- Some environments have an older overload of create_project_revision_v2 with reversed arg order:
--   (new_name text, p_source_project_id uuid)
-- Supabase/PostgREST resolves RPC by named params and can’t choose between the two.
-- Drop the reversed overload so calls with { p_source_project_id, new_name } are unambiguous.

DROP FUNCTION IF EXISTS public.create_project_revision_v2(new_name text, p_source_project_id uuid);

