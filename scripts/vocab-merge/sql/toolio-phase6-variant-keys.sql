-- ===========================================================================
-- Phase 6: mirror variation terms and allow inventory children to link (Toolio).
-- Apply in Toolio SQL editor after phase 4/5 and after PP phase 6 is live.
-- Before the reconcile section below, run a Project Partner snapshot_reload so
-- variation terms (and drum-fan) exist in pp_vocab_terms.
-- ===========================================================================

-- 1. Mirror: variation entities + parent_public_key
ALTER TABLE public.pp_vocab_terms DROP CONSTRAINT IF EXISTS pp_vocab_terms_entity_check;
ALTER TABLE public.pp_vocab_terms
  ADD CONSTRAINT pp_vocab_terms_entity_check
  CHECK (entity IN ('tool', 'material', 'tool_variation', 'material_variation'));

ALTER TABLE public.pp_vocab_terms
  ADD COLUMN IF NOT EXISTS parent_public_key text;

ALTER TABLE public.pp_vocab_terms DROP CONSTRAINT IF EXISTS pp_vocab_terms_parent_shape;
ALTER TABLE public.pp_vocab_terms
  ADD CONSTRAINT pp_vocab_terms_parent_shape CHECK (
    (entity IN ('tool_variation', 'material_variation') AND parent_public_key IS NOT NULL)
    OR (entity IN ('tool', 'material') AND parent_public_key IS NULL)
  );

CREATE INDEX IF NOT EXISTS pp_vocab_terms_parent_public_key_idx
  ON public.pp_vocab_terms (parent_public_key)
  WHERE parent_public_key IS NOT NULL;

-- Term proposals mirror (may already exist from phase 5)
CREATE TABLE IF NOT EXISTS public.pp_vocab_term_proposals (
  id uuid PRIMARY KEY,
  entity text NOT NULL,
  proposed_key text NOT NULL,
  proposed_name text NOT NULL,
  description text,
  requested_by text NOT NULL,
  toolio_item_kind text NOT NULL,
  toolio_item_id uuid NOT NULL,
  proposed_parent_key text,
  status text NOT NULL,
  result_key text,
  decided_by text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

ALTER TABLE public.pp_vocab_term_proposals
  ADD COLUMN IF NOT EXISTS proposed_parent_key text;

-- 2. Drop phase-4/5 rules that forbid children from linking or waiting.
--    inventory_items_pp_vocab_linked_or_pending required cores linked XOR pending and
--    children neither; phase 6 applies linked XOR pending to every inventory row.
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pp_vocab_key_core_only;
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pp_vocab_linked_or_pending;
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pp_vocab_link_shape;

CREATE OR REPLACE FUNCTION public.inventory_pp_vocab_link_ok(
  p_parent_id uuid,
  p_key text,
  p_pending boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity text;
  v_parent_of_term text;
  v_core_key text;
BEGIN
  -- Linked XOR pending: exactly one of key / pending.
  IF (p_key IS NOT NULL) = coalesce(p_pending, false) THEN
    RETURN false;
  END IF;
  IF p_key IS NULL THEN
    RETURN true;
  END IF;
  SELECT entity, parent_public_key INTO v_entity, v_parent_of_term
  FROM public.pp_vocab_terms WHERE public_key = p_key;
  IF v_entity IS NULL THEN
    RETURN false;
  END IF;
  IF p_parent_id IS NULL THEN
    RETURN v_entity IN ('tool', 'material');
  END IF;
  IF v_entity NOT IN ('tool_variation', 'material_variation') THEN
    RETURN false;
  END IF;
  SELECT pp_vocab_key INTO v_core_key FROM public.inventory_items WHERE id = p_parent_id;
  RETURN v_core_key IS NOT NULL AND v_core_key = v_parent_of_term;
END;
$$;

-- 3. Apply term: include variations
CREATE OR REPLACE FUNCTION public.pp_vocab_remove_term(p_key text, p_entity text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_entity IN ('tool', 'material', 'tool_variation', 'material_variation') THEN
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

CREATE OR REPLACE FUNCTION public.pp_vocab_apply_term(p_payload jsonb, p_seq bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := p_payload->>'public_key';
  v_entity text := p_payload->>'entity';
  v_parent text := p_payload->>'parent_public_key';
BEGIN
  IF v_key IS NULL OR v_entity IS NULL THEN
    RAISE EXCEPTION 'pp_vocab: payload without public_key or entity: %', p_payload;
  END IF;
  IF p_payload ? 'removed_at' THEN
    PERFORM public.pp_vocab_remove_term(v_key, v_entity);
    RETURN;
  END IF;
  IF v_entity IN ('tool', 'material', 'tool_variation', 'material_variation') THEN
    INSERT INTO public.pp_vocab_terms (public_key, entity, pp_id, name, category, description, parent_public_key, updated_seq)
    VALUES (
      v_key, v_entity, (p_payload->>'id')::uuid, p_payload->>'name', p_payload->>'category',
      p_payload->>'description',
      CASE WHEN v_entity IN ('tool_variation', 'material_variation') THEN v_parent END,
      p_seq
    )
    ON CONFLICT (public_key) DO UPDATE SET
      entity = EXCLUDED.entity, pp_id = EXCLUDED.pp_id, name = EXCLUDED.name, category = EXCLUDED.category,
      description = EXCLUDED.description, parent_public_key = EXCLUDED.parent_public_key,
      updated_seq = EXCLUDED.updated_seq;
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

-- Snapshot order: cores before variations
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
  FOR v_term IN
    SELECT t FROM jsonb_array_elements(v_terms) t
    ORDER BY CASE t->>'entity'
      WHEN 'tool' THEN 0 WHEN 'material' THEN 0
      WHEN 'category' THEN 1
      WHEN 'project' THEN 2
      WHEN 'tool_variation' THEN 3 WHEN 'material_variation' THEN 3
      ELSE 4
    END
  LOOP
    PERFORM public.pp_vocab_apply_term(v_term, v_seq);
  END LOOP;
  DELETE FROM public.pp_vocab_terms WHERE public_key <> ALL (coalesce(v_keys, ARRAY[]::text[]));
  DELETE FROM public.pp_vocab_projects WHERE public_key <> ALL (coalesce(v_keys, ARRAY[]::text[]));
  DELETE FROM public.pp_vocab_aliases WHERE public_key <> ALL (coalesce(v_keys, ARRAY[]::text[]));
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

-- Apply decided proposals to waiting inventory (cores and variants) and projects
CREATE OR REPLACE FUNCTION public.pp_vocab_apply_proposal(p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := (p_payload->>'toolio_item_id')::uuid;
  v_kind text := p_payload->>'toolio_item_kind';
  v_status text := p_payload->>'status';
  v_result text := p_payload->>'result_key';
BEGIN
  INSERT INTO public.pp_vocab_term_proposals (
    id, entity, proposed_key, proposed_name, description, requested_by,
    toolio_item_kind, toolio_item_id, proposed_parent_key, status, result_key, decided_by, created_at, updated_at
  ) VALUES (
    (p_payload->>'id')::uuid, p_payload->>'entity', p_payload->>'proposed_key', p_payload->>'proposed_name',
    p_payload->>'description', p_payload->>'requested_by', v_kind, v_id,
    p_payload->>'proposed_parent_key', v_status, v_result, p_payload->>'decided_by',
    (p_payload->>'created_at')::timestamptz, (p_payload->>'updated_at')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status, result_key = EXCLUDED.result_key, decided_by = EXCLUDED.decided_by,
    proposed_parent_key = EXCLUDED.proposed_parent_key, updated_at = EXCLUDED.updated_at;

  IF v_status IN ('approved', 'mapped') AND v_result IS NOT NULL THEN
    IF v_kind = 'inventory_core' THEN
      UPDATE public.inventory_items i
      SET pp_vocab_key = v_result, pp_vocab_pending = false
      FROM public.pp_vocab_terms t
      WHERE i.id = v_id
        AND i.parent_inventory_item_id IS NULL
        AND i.pp_vocab_pending IS TRUE AND i.pp_vocab_key IS NULL
        AND t.public_key = v_result
        AND t.entity IN ('tool', 'material');
    ELSIF v_kind = 'inventory_variant' THEN
      UPDATE public.inventory_items i
      SET pp_vocab_key = v_result, pp_vocab_pending = false
      FROM public.pp_vocab_terms t, public.inventory_items p
      WHERE i.id = v_id
        AND i.parent_inventory_item_id = p.id
        AND i.pp_vocab_pending IS TRUE AND i.pp_vocab_key IS NULL
        AND t.public_key = v_result
        AND t.entity IN ('tool_variation', 'material_variation')
        AND t.parent_public_key = p.pp_vocab_key;
    ELSIF v_kind = 'project' THEN
      UPDATE public.projects
      SET pp_vocab_key = v_result, pp_vocab_pending = false
      WHERE id = v_id AND pp_vocab_pending IS TRUE AND pp_vocab_key IS NULL;
    END IF;
  END IF;
END;
$$;

-- Ensure apply_events routes term_proposal
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
    ELSIF v_event->>'change_kind' = 'term_proposal' THEN
      PERFORM public.pp_vocab_apply_proposal(v_event->'payload');
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

-- 4. Soft-match children to mirrored variation terms under the same parent core key
--    (normalized name, then SKU). Unmatched children wait for a proposal.
WITH child AS (
  SELECT
    c.id,
    c.sku,
    public.inventory_item_name_comparison_key(c.name) AS name_key,
    p.pp_vocab_key AS parent_key
  FROM public.inventory_items c
  JOIN public.inventory_items p ON p.id = c.parent_inventory_item_id
  WHERE c.pp_vocab_key IS NULL
    AND coalesce(c.pp_vocab_pending, false) = false
    AND p.pp_vocab_key IS NOT NULL
),
by_name AS (
  SELECT DISTINCT ON (child.id)
    child.id AS child_id,
    t.public_key
  FROM child
  JOIN public.pp_vocab_terms t
    ON t.parent_public_key = child.parent_key
   AND t.entity IN ('tool_variation', 'material_variation')
   AND public.inventory_item_name_comparison_key(t.name) = child.name_key
  ORDER BY child.id, t.public_key
),
by_sku AS (
  SELECT DISTINCT ON (child.id)
    child.id AS child_id,
    t.public_key
  FROM child
  JOIN public.pp_vocab_terms t
    ON t.parent_public_key = child.parent_key
   AND t.entity IN ('tool_variation', 'material_variation')
   AND child.sku IS NOT NULL
   AND t.public_key = child.sku
  WHERE NOT EXISTS (SELECT 1 FROM by_name n WHERE n.child_id = child.id)
  ORDER BY child.id, t.public_key
),
matched AS (
  SELECT * FROM by_name
  UNION ALL
  SELECT * FROM by_sku
)
UPDATE public.inventory_items i
SET pp_vocab_key = m.public_key, pp_vocab_pending = false
FROM matched m
WHERE i.id = m.child_id;

UPDATE public.inventory_items c
SET pp_vocab_pending = true
WHERE c.parent_inventory_item_id IS NOT NULL
  AND c.pp_vocab_key IS NULL
  AND coalesce(c.pp_vocab_pending, false) = false;

-- Drum Fan core: link if the term is mirrored and the core is still waiting
UPDATE public.inventory_items
SET pp_vocab_key = 'drum-fan', pp_vocab_pending = false
WHERE parent_inventory_item_id IS NULL
  AND public.inventory_item_name_comparison_key(name) = public.inventory_item_name_comparison_key('Drum Fan')
  AND pp_vocab_key IS NULL
  AND EXISTS (SELECT 1 FROM public.pp_vocab_terms WHERE public_key = 'drum-fan');

-- 5. Enforce link shape after reconcile (replaces linked_or_pending for cores and children)
ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_pp_vocab_link_shape;
ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_pp_vocab_link_shape
  CHECK (public.inventory_pp_vocab_link_ok(parent_inventory_item_id, pp_vocab_key, pp_vocab_pending));

-- Keep the old name as an alias expectation for anything that looked it up: not recreated.
-- inventory_pp_vocab_link_ok already enforces linked XOR pending on every row.
