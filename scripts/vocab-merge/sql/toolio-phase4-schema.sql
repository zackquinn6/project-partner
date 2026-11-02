-- ===========================================================================
-- Part 1: Project Partner vocabulary mirror and links (additive).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.pp_vocab_terms (
  public_key text PRIMARY KEY,
  entity text NOT NULL CHECK (entity IN ('tool', 'material')),
  pp_id uuid NOT NULL,
  name text NOT NULL,
  category text,
  description text,
  updated_seq bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pp_vocab_projects (
  public_key text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('family', 'category')),
  pp_id uuid,
  name text NOT NULL,
  description text,
  categories text[],
  tags text[],
  publish_status text,
  visibility_status text,
  updated_seq bigint NOT NULL,
  CHECK ((kind = 'family') = (pp_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.pp_vocab_project_terms (
  project_key text NOT NULL REFERENCES public.pp_vocab_projects (public_key) ON DELETE CASCADE,
  term_key text NOT NULL REFERENCES public.pp_vocab_terms (public_key) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('required', 'substitute')),
  source text NOT NULL CHECK (source IN ('steps', 'toolio_seed')),
  PRIMARY KEY (project_key, term_key, source)
);

CREATE TABLE IF NOT EXISTS public.pp_vocab_aliases (
  public_key text NOT NULL,
  alias text NOT NULL,
  source text NOT NULL,
  PRIMARY KEY (public_key, alias)
);

CREATE TABLE IF NOT EXISTS public.pp_vocab_removal_requests (
  id uuid PRIMARY KEY,
  public_key text NOT NULL,
  requested_by_app text NOT NULL CHECK (requested_by_app IN ('pp', 'toolio')),
  requested_by_email text NOT NULL,
  reason text,
  replacement_key text,
  pp_decision text,
  pp_decided_by text,
  toolio_decision text,
  toolio_decided_by text,
  status text NOT NULL CHECK (status IN ('open', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pp_vocab_sync_state (
  id boolean PRIMARY KEY CHECK (id),
  enabled boolean NOT NULL,
  last_seq bigint NOT NULL,
  last_run_at timestamptz,
  last_error text
);

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS pp_vocab_key text REFERENCES public.pp_vocab_terms (public_key);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pp_vocab_key text REFERENCES public.pp_vocab_projects (public_key);
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pp_vocab_key_core_only;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_pp_vocab_key_core_only CHECK (parent_inventory_item_id IS NULL OR pp_vocab_key IS NULL);
CREATE INDEX IF NOT EXISTS inventory_items_pp_vocab_key_idx ON public.inventory_items (pp_vocab_key);
CREATE INDEX IF NOT EXISTS projects_pp_vocab_key_idx ON public.projects (pp_vocab_key);

-- Row level security: staff and catalog admins read the mirror; only the service role writes it.
ALTER TABLE public.pp_vocab_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_vocab_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_vocab_project_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_vocab_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_vocab_removal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pp_vocab_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pp_vocab_terms_staff_select ON public.pp_vocab_terms;
CREATE POLICY pp_vocab_terms_staff_select ON public.pp_vocab_terms FOR SELECT TO authenticated
  USING (public.rls_user_is_catalog_admin() OR public._toolio_is_staff());
DROP POLICY IF EXISTS pp_vocab_projects_staff_select ON public.pp_vocab_projects;
CREATE POLICY pp_vocab_projects_staff_select ON public.pp_vocab_projects FOR SELECT TO authenticated
  USING (public.rls_user_is_catalog_admin() OR public._toolio_is_staff());
DROP POLICY IF EXISTS pp_vocab_project_terms_staff_select ON public.pp_vocab_project_terms;
CREATE POLICY pp_vocab_project_terms_staff_select ON public.pp_vocab_project_terms FOR SELECT TO authenticated
  USING (public.rls_user_is_catalog_admin() OR public._toolio_is_staff());
DROP POLICY IF EXISTS pp_vocab_aliases_staff_select ON public.pp_vocab_aliases;
CREATE POLICY pp_vocab_aliases_staff_select ON public.pp_vocab_aliases FOR SELECT TO authenticated
  USING (public.rls_user_is_catalog_admin() OR public._toolio_is_staff());
DROP POLICY IF EXISTS pp_vocab_removal_requests_staff_select ON public.pp_vocab_removal_requests;
CREATE POLICY pp_vocab_removal_requests_staff_select ON public.pp_vocab_removal_requests FOR SELECT TO authenticated
  USING (public.rls_user_is_catalog_admin() OR public._toolio_is_staff());
DROP POLICY IF EXISTS pp_vocab_sync_state_staff_select ON public.pp_vocab_sync_state;
CREATE POLICY pp_vocab_sync_state_staff_select ON public.pp_vocab_sync_state FOR SELECT TO authenticated
  USING (public.rls_user_is_catalog_admin() OR public._toolio_is_staff());

-- ===========================================================================
-- Part 2: applying Project Partner payloads (one path for the load, sync, and reload).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.pp_vocab_text_array(p_value jsonb)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN jsonb_typeof(p_value) = 'array'
    THEN ARRAY(SELECT jsonb_array_elements_text(p_value)) END
$$;

-- Drops a removed term. Toolio links block it (foreign key), so a removal never orphans an item.
CREATE OR REPLACE FUNCTION public.pp_vocab_remove_term(p_key text, p_entity text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_entity IN ('tool', 'material') THEN
    IF EXISTS (SELECT 1 FROM public.inventory_items WHERE pp_vocab_key = p_key) THEN
      RAISE EXCEPTION 'Project Partner removed % but Toolio inventory still links to it', p_key;
    END IF;
    DELETE FROM public.pp_vocab_terms WHERE public_key = p_key;
  ELSE
    IF EXISTS (SELECT 1 FROM public.projects WHERE pp_vocab_key = p_key) THEN
      RAISE EXCEPTION 'Project Partner removed % but a Toolio project still links to it', p_key;
    END IF;
    DELETE FROM public.pp_vocab_projects WHERE public_key = p_key;
  END IF;
  DELETE FROM public.pp_vocab_aliases WHERE public_key = p_key;
END;
$$;

-- Upserts one term from its full Project Partner payload (vocab_term_payload).
CREATE OR REPLACE FUNCTION public.pp_vocab_apply_term(p_payload jsonb, p_seq bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := p_payload->>'public_key';
  v_entity text := p_payload->>'entity';
BEGIN
  IF v_key IS NULL OR v_entity IS NULL THEN
    RAISE EXCEPTION 'pp_vocab: payload without public_key or entity: %', p_payload;
  END IF;
  IF p_payload ? 'removed_at' THEN
    PERFORM public.pp_vocab_remove_term(v_key, v_entity);
    RETURN;
  END IF;
  IF v_entity IN ('tool', 'material') THEN
    INSERT INTO public.pp_vocab_terms (public_key, entity, pp_id, name, category, description, updated_seq)
    VALUES (v_key, v_entity, (p_payload->>'id')::uuid, p_payload->>'name', p_payload->>'category', p_payload->>'description', p_seq)
    ON CONFLICT (public_key) DO UPDATE SET
      entity = EXCLUDED.entity, pp_id = EXCLUDED.pp_id, name = EXCLUDED.name, category = EXCLUDED.category,
      description = EXCLUDED.description, updated_seq = EXCLUDED.updated_seq;
  ELSIF v_entity IN ('project', 'category') THEN
    INSERT INTO public.pp_vocab_projects (public_key, kind, pp_id, name, description, categories, tags, publish_status, visibility_status, updated_seq)
    VALUES (
      v_key,
      CASE WHEN v_entity = 'project' THEN 'family' ELSE 'category' END,
      CASE WHEN v_entity = 'project' THEN (p_payload->>'id')::uuid END,
      p_payload->>'name',
      p_payload->>'description',
      public.pp_vocab_text_array(p_payload->'categories'),
      public.pp_vocab_text_array(p_payload->'tags'),
      p_payload->>'publish_status',
      p_payload->>'visibility_status',
      p_seq
    )
    ON CONFLICT (public_key) DO UPDATE SET
      kind = EXCLUDED.kind, pp_id = EXCLUDED.pp_id, name = EXCLUDED.name, description = EXCLUDED.description,
      categories = EXCLUDED.categories, tags = EXCLUDED.tags, publish_status = EXCLUDED.publish_status,
      visibility_status = EXCLUDED.visibility_status, updated_seq = EXCLUDED.updated_seq;
    IF v_entity = 'project' THEN
      DELETE FROM public.pp_vocab_project_terms WHERE project_key = v_key;
      INSERT INTO public.pp_vocab_project_terms (project_key, term_key, role, source)
      SELECT v_key, t->>'term_key', t->>'role', t->>'source'
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_payload->'tools') = 'array' THEN p_payload->'tools' ELSE '[]'::jsonb END) t;
    END IF;
  ELSE
    RAISE EXCEPTION 'pp_vocab: unknown entity %', v_entity;
  END IF;
  DELETE FROM public.pp_vocab_aliases WHERE public_key = v_key;
  INSERT INTO public.pp_vocab_aliases (public_key, alias, source)
  SELECT v_key, a->>'alias', a->>'source'
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_payload->'aliases') = 'array' THEN p_payload->'aliases' ELSE '[]'::jsonb END) a;
END;
$$;

CREATE OR REPLACE FUNCTION public.pp_vocab_apply_request(p_payload jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.pp_vocab_removal_requests (
    id, public_key, requested_by_app, requested_by_email, reason, replacement_key,
    pp_decision, pp_decided_by, toolio_decision, toolio_decided_by, status, created_at, updated_at
  ) VALUES (
    (p_payload->>'id')::uuid, p_payload->>'public_key', p_payload->>'requested_by_app', p_payload->>'requested_by_email',
    p_payload->>'reason', p_payload->>'replacement_key', p_payload->>'pp_decision', p_payload->>'pp_decided_by',
    p_payload->>'toolio_decision', p_payload->>'toolio_decided_by', p_payload->>'status',
    (p_payload->>'created_at')::timestamptz, (p_payload->>'updated_at')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    replacement_key = EXCLUDED.replacement_key, pp_decision = EXCLUDED.pp_decision, pp_decided_by = EXCLUDED.pp_decided_by,
    toolio_decision = EXCLUDED.toolio_decision, toolio_decided_by = EXCLUDED.toolio_decided_by,
    status = EXCLUDED.status, updated_at = EXCLUDED.updated_at
$$;

-- Applies change events in seq order; events at or below last_seq were already applied.
CREATE OR REPLACE FUNCTION public.pp_vocab_apply_events(p_events jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event jsonb;
  v_seq bigint;
  v_last bigint;
  v_applied integer := 0;
BEGIN
  SELECT last_seq INTO v_last FROM public.pp_vocab_sync_state WHERE id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pp_vocab_sync_state is missing';
  END IF;
  FOR v_event IN
    SELECT e.value FROM jsonb_array_elements(p_events) AS e(value) ORDER BY (e.value->>'seq')::bigint
  LOOP
    v_seq := (v_event->>'seq')::bigint;
    IF v_seq <= v_last THEN
      CONTINUE;
    END IF;
    IF v_event->>'change_kind' IN ('upsert', 'remove') THEN
      PERFORM public.pp_vocab_apply_term(v_event->'payload', v_seq);
    ELSIF v_event->>'change_kind' = 'removal_request' THEN
      PERFORM public.pp_vocab_apply_request(v_event->'payload');
    ELSE
      RAISE EXCEPTION 'pp_vocab: unknown change_kind % at seq %', v_event->>'change_kind', v_seq;
    END IF;
    v_last := v_seq;
    v_applied := v_applied + 1;
  END LOOP;
  UPDATE public.pp_vocab_sync_state SET last_seq = v_last, last_run_at = now(), last_error = NULL WHERE id;
  RETURN jsonb_build_object('applied', v_applied, 'last_seq', v_last);
END;
$$;

-- Replaces the mirror with a full snapshot and moves the cursor to its position.
CREATE OR REPLACE FUNCTION public.pp_vocab_apply_snapshot(p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq bigint := (p_snapshot->>'as_of_seq')::bigint;
  v_terms jsonb := CASE WHEN jsonb_typeof(p_snapshot->'terms') = 'array' THEN p_snapshot->'terms' ELSE '[]'::jsonb END;
  v_term jsonb;
  v_keys text[];
BEGIN
  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'pp_vocab: snapshot without as_of_seq';
  END IF;
  SELECT array_agg(t->>'public_key') INTO v_keys FROM jsonb_array_elements(v_terms) t;
  -- Terms before families, since family tool lists reference terms.
  FOR v_term IN
    SELECT t FROM jsonb_array_elements(v_terms) t
    ORDER BY CASE t->>'entity' WHEN 'tool' THEN 0 WHEN 'material' THEN 0 WHEN 'category' THEN 1 ELSE 2 END
  LOOP
    PERFORM public.pp_vocab_apply_term(v_term, v_seq);
  END LOOP;
  DELETE FROM public.pp_vocab_terms WHERE public_key <> ALL (v_keys);
  DELETE FROM public.pp_vocab_projects WHERE public_key <> ALL (v_keys);
  DELETE FROM public.pp_vocab_aliases WHERE public_key <> ALL (v_keys);
  DELETE FROM public.pp_vocab_removal_requests WHERE status = 'open';
  PERFORM public.pp_vocab_apply_request(r)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_snapshot->'removal_requests') = 'array'
                                 THEN p_snapshot->'removal_requests' ELSE '[]'::jsonb END) r;
  INSERT INTO public.pp_vocab_sync_state (id, enabled, last_seq, last_run_at)
  VALUES (true, true, v_seq, now())
  ON CONFLICT (id) DO UPDATE SET last_seq = EXCLUDED.last_seq, last_run_at = EXCLUDED.last_run_at, last_error = NULL;
  RETURN jsonb_build_object('terms', jsonb_array_length(v_terms), 'last_seq', v_seq);
END;
$$;

REVOKE ALL ON FUNCTION public.pp_vocab_remove_term(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pp_vocab_apply_term(jsonb, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pp_vocab_apply_request(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pp_vocab_apply_events(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pp_vocab_apply_snapshot(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pp_vocab_apply_term(jsonb, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.pp_vocab_apply_request(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.pp_vocab_apply_events(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.pp_vocab_apply_snapshot(jsonb) TO service_role;
