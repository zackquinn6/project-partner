-- ===========================================================================
-- Phase 6: shared keys for tool_variations / materials_variants (PP side).
-- Apply in Project Partner Supabase SQL editor after phase 3/5 are live.
-- ===========================================================================

-- 1. vocab_keys: variation entities + parent_public_key
ALTER TABLE public.vocab_keys DROP CONSTRAINT IF EXISTS vocab_keys_entity_check;
ALTER TABLE public.vocab_keys
  ADD CONSTRAINT vocab_keys_entity_check
  CHECK (entity IN (
    'category', 'project', 'tool', 'material',
    'tool_variation', 'material_variation'
  ));

ALTER TABLE public.vocab_keys
  ADD COLUMN IF NOT EXISTS parent_public_key text REFERENCES public.vocab_keys (public_key);

ALTER TABLE public.vocab_keys DROP CONSTRAINT IF EXISTS vocab_keys_parent_public_key_shape;
ALTER TABLE public.vocab_keys
  ADD CONSTRAINT vocab_keys_parent_public_key_shape CHECK (
    (entity IN ('tool_variation', 'material_variation') AND parent_public_key IS NOT NULL)
    OR (entity NOT IN ('tool_variation', 'material_variation') AND parent_public_key IS NULL)
  );

CREATE INDEX IF NOT EXISTS vocab_keys_parent_public_key_idx
  ON public.vocab_keys (parent_public_key)
  WHERE parent_public_key IS NOT NULL;

-- 2. Variation rows carry public_key
ALTER TABLE public.tool_variations
  ADD COLUMN IF NOT EXISTS public_key text REFERENCES public.vocab_keys (public_key);
ALTER TABLE public.materials_variants
  ADD COLUMN IF NOT EXISTS public_key text REFERENCES public.vocab_keys (public_key);

CREATE UNIQUE INDEX IF NOT EXISTS tool_variations_public_key_unique
  ON public.tool_variations (public_key) WHERE public_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS materials_variants_public_key_unique
  ON public.materials_variants (public_key) WHERE public_key IS NOT NULL;

-- 3. Term proposals: parent key + inventory_variant kind (CHECK may be named variously)
ALTER TABLE public.vocab_term_proposals
  ADD COLUMN IF NOT EXISTS proposed_parent_key text REFERENCES public.vocab_keys (public_key);

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'vocab_term_proposals'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%toolio_item_kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.vocab_term_proposals DROP CONSTRAINT %I', r.conname);
  END LOOP;
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'vocab_term_proposals'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%entity%'
      AND pg_get_constraintdef(c.oid) ILIKE '%tool%'
  LOOP
    EXECUTE format('ALTER TABLE public.vocab_term_proposals DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.vocab_term_proposals
  ADD CONSTRAINT vocab_term_proposals_entity_check
  CHECK (entity IN (
    'tool', 'material', 'project',
    'tool_variation', 'material_variation'
  ));
ALTER TABLE public.vocab_term_proposals
  ADD CONSTRAINT vocab_term_proposals_toolio_item_kind_check
  CHECK (toolio_item_kind IN ('inventory_core', 'project', 'inventory_variant'));

-- Feed kinds already used by phase 5
ALTER TABLE public.vocab_change_events DROP CONSTRAINT IF EXISTS vocab_change_events_change_kind_check;
ALTER TABLE public.vocab_change_events
  ADD CONSTRAINT vocab_change_events_change_kind_check
  CHECK (change_kind IN ('upsert', 'remove', 'removal_request', 'term_proposal'));

-- 4. Helpers: derive a free variation key under a parent
CREATE OR REPLACE FUNCTION public.vocab_variation_key(p_parent_key text, p_sku text, p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_key text;
  v_n integer := 0;
BEGIN
  IF p_sku IS NOT NULL AND p_sku ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     AND NOT EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = p_sku) THEN
    RETURN p_sku;
  END IF;
  v_base := public.vocab_kebab(p_parent_key || '-' || coalesce(nullif(p_sku, ''), p_name));
  IF v_base IS NULL OR v_base = '' THEN
    RAISE EXCEPTION 'Cannot derive a variation key from parent %, sku %, name %', p_parent_key, p_sku, p_name;
  END IF;
  v_key := v_base;
  WHILE EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = v_key) LOOP
    v_n := v_n + 1;
    v_key := v_base || '-' || v_n::text;
  END LOOP;
  RETURN v_key;
END;
$$;

-- 5. Payload includes parent_public_key and variation rows
CREATE OR REPLACE FUNCTION public.vocab_term_payload(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key public.vocab_keys%ROWTYPE;
  v_body jsonb;
  v_root public.projects%ROWTYPE;
  v_current public.projects%ROWTYPE;
  v_current_id uuid;
BEGIN
  SELECT * INTO v_key FROM public.vocab_keys WHERE public_key = p_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'vocab: unknown key %', p_key;
  END IF;
  IF v_key.removed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'public_key', v_key.public_key,
      'entity', v_key.entity,
      'parent_public_key', v_key.parent_public_key,
      'removed_at', v_key.removed_at,
      'replaced_by_public_key', v_key.replaced_by_public_key
    );
  END IF;
  IF v_key.entity = 'tool' THEN
    SELECT jsonb_build_object('id', t.id, 'name', t.name, 'category', t.category, 'description', t.description)
      INTO v_body FROM public.tools t WHERE t.public_key = p_key;
  ELSIF v_key.entity = 'material' THEN
    SELECT jsonb_build_object('id', m.id, 'name', m.name, 'category', m.category, 'description', m.description)
      INTO v_body FROM public.materials m WHERE m.public_key = p_key;
  ELSIF v_key.entity = 'tool_variation' THEN
    SELECT jsonb_build_object('id', v.id, 'name', v.name, 'sku', v.sku, 'description', v.description,
                              'core_item_id', v.core_item_id)
      INTO v_body FROM public.tool_variations v WHERE v.public_key = p_key;
  ELSIF v_key.entity = 'material_variation' THEN
    SELECT jsonb_build_object('id', v.id, 'name', v.name, 'sku', v.sku,
                              'material_id', v.material_id)
      INTO v_body FROM public.materials_variants v WHERE v.public_key = p_key;
  ELSIF v_key.entity = 'category' THEN
    SELECT jsonb_build_object('name', c.name) INTO v_body FROM public.project_categories c WHERE c.public_key = p_key;
  ELSE
    SELECT * INTO v_root FROM public.projects WHERE public_key = p_key;
    v_current_id := public.vocab_family_current(v_root.id);
    IF v_current_id IS NULL THEN
      v_current := v_root;
    ELSE
      SELECT * INTO v_current FROM public.projects WHERE id = v_current_id;
    END IF;
    v_body := jsonb_build_object(
      'id', v_root.id,
      'current_revision_id', v_current_id,
      'name', v_current.name,
      'description', v_current.description,
      'categories', to_jsonb(v_current.category),
      'tags', to_jsonb(v_current.tags),
      'publish_status', v_current.publish_status,
      'visibility_status', v_current.visibility_status,
      'tools', (SELECT jsonb_agg(jsonb_build_object('term_key', f.term_key, 'role', f.role, 'source', f.source) ORDER BY f.term_key)
                FROM public.project_family_tools f WHERE f.family_key = p_key)
    );
  END IF;
  IF v_body IS NULL THEN
    RAISE EXCEPTION 'vocab: key % has no % row', p_key, v_key.entity;
  END IF;
  RETURN v_body || jsonb_build_object(
    'public_key', p_key,
    'entity', v_key.entity,
    'parent_public_key', v_key.parent_public_key,
    'aliases', (SELECT jsonb_agg(jsonb_build_object('alias', a.alias, 'source', a.source) ORDER BY a.alias)
                FROM public.vocab_aliases a WHERE a.public_key = p_key)
  );
END;
$$;

-- Snapshot: cores/categories/projects before variations (parent keys first)
CREATE OR REPLACE FUNCTION public.vocab_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq bigint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'vocab_snapshot is for the project-partner-vocab function' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT max(seq) INTO v_seq FROM public.vocab_change_events;
  RETURN jsonb_build_object(
    'as_of_seq', CASE WHEN v_seq IS NULL THEN 0 ELSE v_seq END,
    'terms', (
      SELECT jsonb_agg(public.vocab_term_payload(k.public_key) ORDER BY
        CASE k.entity
          WHEN 'tool' THEN 0
          WHEN 'material' THEN 0
          WHEN 'category' THEN 1
          WHEN 'project' THEN 2
          WHEN 'tool_variation' THEN 3
          WHEN 'material_variation' THEN 3
          ELSE 4
        END,
        k.public_key)
      FROM public.vocab_keys k WHERE k.removed_at IS NULL
    ),
    'removal_requests', (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at)
                         FROM public.vocab_removal_requests r WHERE r.status = 'open'),
    'term_proposals', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at)
                       FROM public.vocab_term_proposals p WHERE p.status = 'open')
  );
END;
$$;

-- Create term: support variations under a parent key (p_category holds parent key for variations)
CREATE OR REPLACE FUNCTION public.vocab_create_term(
  p_entity text, p_key text, p_name text, p_description text, p_category text, p_specialty_scale integer, p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_parent_key text;
  v_parent_id uuid;
  v_parent_entity text;
BEGIN
  SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = lower(p_email);
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND (v_user IS NULL OR NOT public.is_admin(v_user)) THEN
    RAISE EXCEPTION '% is not a Project Partner admin', p_email USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF auth.role() = 'service_role' AND v_user IS NOT NULL AND NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION '% is not a Project Partner admin', p_email USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = p_key) THEN
    RAISE EXCEPTION 'Key % already exists', p_key USING ERRCODE = 'unique_violation';
  END IF;

  IF p_entity IN ('tool_variation', 'material_variation') THEN
    v_parent_key := p_category;
    IF v_parent_key IS NULL THEN
      RAISE EXCEPTION 'parent public_key is required to create a %', p_entity;
    END IF;
    SELECT entity INTO v_parent_entity FROM public.vocab_keys
    WHERE public_key = v_parent_key AND removed_at IS NULL;
    IF p_entity = 'tool_variation' AND v_parent_entity IS DISTINCT FROM 'tool' THEN
      RAISE EXCEPTION 'Parent % is not a live tool for %', v_parent_key, p_entity;
    ELSIF p_entity = 'material_variation' AND v_parent_entity IS DISTINCT FROM 'material' THEN
      RAISE EXCEPTION 'Parent % is not a live material for %', v_parent_key, p_entity;
    END IF;
    INSERT INTO public.vocab_keys (public_key, entity, parent_public_key)
      VALUES (p_key, p_entity, v_parent_key);
    IF p_entity = 'tool_variation' THEN
      SELECT id INTO v_parent_id FROM public.tools WHERE public_key = v_parent_key;
      INSERT INTO public.tool_variations (id, core_item_id, name, description, public_key, attribute_definitions, attributes)
        VALUES (gen_random_uuid(), v_parent_id, p_name, p_description, p_key, '[]'::jsonb, '{}'::jsonb);
    ELSE
      SELECT id INTO v_parent_id FROM public.materials WHERE public_key = v_parent_key;
      INSERT INTO public.materials_variants (id, material_id, name, description, public_key, attribute_definitions, attributes)
        VALUES (gen_random_uuid(), v_parent_id, p_name, p_description, p_key, '[]'::jsonb, '{}'::jsonb);
    END IF;
    RETURN public.vocab_term_payload(p_key);
  END IF;

  IF p_entity IN ('tool', 'material') AND EXISTS (
    SELECT 1 FROM public.tools WHERE p_entity = 'tool' AND name_key = public.vocab_name_key(p_name)
    UNION ALL SELECT 1 FROM public.materials WHERE p_entity = 'material' AND name_key = public.vocab_name_key(p_name)
  ) THEN
    RAISE EXCEPTION 'A % named % already exists', p_entity, p_name USING ERRCODE = 'unique_violation';
  END IF;
  INSERT INTO public.vocab_keys (public_key, entity) VALUES (p_key, p_entity);
  IF p_entity = 'tool' THEN
    INSERT INTO public.tools (name, description, category, specialty_scale, public_key)
      VALUES (p_name, p_description, p_category, p_specialty_scale, p_key);
  ELSIF p_entity = 'material' THEN
    INSERT INTO public.materials (name, description, category, public_key) VALUES (p_name, p_description, p_category, p_key);
  ELSIF p_entity = 'category' THEN
    INSERT INTO public.project_categories (public_key, name) VALUES (p_key, p_name);
  ELSIF p_entity = 'project' THEN
    INSERT INTO public.projects (name, description, category, publish_status, visibility_status, public_key)
      VALUES (p_name, p_description, CASE WHEN p_category IS NULL THEN ARRAY[]::text[] ELSE ARRAY[p_category] END,
              'draft', 'coming-soon', p_key);
  ELSE
    RAISE EXCEPTION 'Unknown entity %', p_entity;
  END IF;
  RETURN public.vocab_term_payload(p_key);
END;
$$;

-- Complete removal: variations as first-class; cores cannot silently drop keyed children
CREATE OR REPLACE FUNCTION public.vocab_complete_removal(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.vocab_removal_requests%ROWTYPE;
  v_entity text;
  v_old_id uuid;
  v_old_name text;
  v_new_id uuid;
  v_new_name text;
  v_new_category text;
  v_map jsonb;
  v_like text;
  v_step_refs bigint;
  v_copy_refs bigint;
  v_user_refs bigint;
  v_child_keys bigint;
  v_family_ids uuid[];
  v_new_root uuid;
BEGIN
  SELECT * INTO v_request FROM public.vocab_removal_requests WHERE id = p_request_id;
  IF v_request.status <> 'approved' THEN
    RAISE EXCEPTION 'Removal request % is not approved', p_request_id;
  END IF;
  SELECT entity INTO v_entity FROM public.vocab_keys WHERE public_key = v_request.public_key;
  PERFORM set_config('vocab.completing_removal', 'on', true);

  IF v_entity IN ('tool_variation', 'material_variation') THEN
    IF v_entity = 'tool_variation' THEN
      SELECT id, name INTO v_old_id, v_old_name FROM public.tool_variations WHERE public_key = v_request.public_key;
      IF v_request.replacement_key IS NOT NULL THEN
        SELECT id, name INTO v_new_id, v_new_name FROM public.tool_variations WHERE public_key = v_request.replacement_key;
      END IF;
      DELETE FROM public.tool_variations WHERE id = v_old_id;
    ELSE
      SELECT id, name INTO v_old_id, v_old_name FROM public.materials_variants WHERE public_key = v_request.public_key;
      IF v_request.replacement_key IS NOT NULL THEN
        SELECT id, name INTO v_new_id, v_new_name FROM public.materials_variants WHERE public_key = v_request.replacement_key;
      END IF;
      DELETE FROM public.materials_variants WHERE id = v_old_id;
    END IF;

  ELSIF v_entity IN ('tool', 'material') THEN
    SELECT count(*) INTO v_child_keys
    FROM public.vocab_keys
    WHERE parent_public_key = v_request.public_key AND removed_at IS NULL;
    IF v_child_keys > 0 THEN
      RAISE EXCEPTION 'Cannot remove "%": % linked variation(s) still exist. Remove or remap them first.',
        v_request.public_key, v_child_keys;
    END IF;
    IF v_entity = 'tool' THEN
      SELECT id, name INTO v_old_id, v_old_name FROM public.tools WHERE public_key = v_request.public_key;
      SELECT id, name, category INTO v_new_id, v_new_name, v_new_category FROM public.tools WHERE public_key = v_request.replacement_key;
    ELSE
      SELECT id, name INTO v_old_id, v_old_name FROM public.materials WHERE public_key = v_request.public_key;
      SELECT id, name, category INTO v_new_id, v_new_name, v_new_category FROM public.materials WHERE public_key = v_request.replacement_key;
    END IF;
    v_like := '%' || v_old_id::text || '%';
    SELECT count(*) INTO v_step_refs FROM public.operation_steps
      WHERE tools::text LIKE v_like OR materials::text LIKE v_like;
    SELECT (SELECT count(*) FROM public.projects WHERE phases::text LIKE v_like)
         + (SELECT count(*) FROM public.project_runs WHERE phases::text LIKE v_like)
      INTO v_copy_refs;
    SELECT (SELECT count(*) FROM public.user_tools WHERE tool_id = v_old_id)
         + (SELECT count(*) FROM public.user_materials WHERE material_id = v_old_id)
         + (SELECT count(*) FROM public.user_profiles WHERE owned_tools::text LIKE v_like)
      INTO v_user_refs;
    IF v_request.replacement_key IS NULL AND v_step_refs + v_copy_refs + v_user_refs > 0 THEN
      RAISE EXCEPTION 'Cannot remove "%": used by % steps, % saved project copies or runs, and % user tool records. Choose a replacement.',
        v_old_name, v_step_refs, v_copy_refs, v_user_refs;
    END IF;
    IF v_request.replacement_key IS NOT NULL THEN
      v_map := jsonb_build_object('by_id', jsonb_build_object(v_old_id::text,
        jsonb_build_object('id', v_new_id, 'name', v_new_name, 'category', v_new_category)), 'by_name', '{}'::jsonb);
      UPDATE public.operation_steps
        SET tools = public.vocab_map_entries(tools, 'tool', v_map, false),
            materials = public.vocab_map_entries(materials, 'material', v_map, false)
        WHERE tools::text LIKE v_like OR materials::text LIKE v_like;
      UPDATE public.projects SET phases = public.vocab_walk_phases(phases, v_map, false) WHERE phases::text LIKE v_like;
      UPDATE public.project_runs SET phases = public.vocab_walk_run_phases(phases, v_map, false) WHERE phases::text LIKE v_like;
      UPDATE public.user_profiles SET owned_tools = public.vocab_map_owned_tools(owned_tools, v_map, false) WHERE owned_tools::text LIKE v_like;
      IF v_entity = 'tool' THEN
        UPDATE public.user_tools SET tool_id = v_new_id WHERE tool_id = v_old_id;
        UPDATE public.tool_variations SET core_item_id = v_new_id WHERE core_item_id = v_old_id AND public_key IS NULL;
      ELSE
        UPDATE public.user_materials SET material_id = v_new_id WHERE material_id = v_old_id;
        UPDATE public.materials_variants SET material_id = v_new_id WHERE material_id = v_old_id AND public_key IS NULL;
      END IF;
    ELSE
      IF v_entity = 'tool' THEN
        DELETE FROM public.tool_variations WHERE core_item_id = v_old_id AND public_key IS NULL;
      ELSE
        DELETE FROM public.materials_variants WHERE material_id = v_old_id AND public_key IS NULL;
      END IF;
    END IF;
    IF v_entity = 'tool' THEN
      DELETE FROM public.tools WHERE id = v_old_id;
    ELSE
      DELETE FROM public.materials WHERE id = v_old_id;
    END IF;

  ELSIF v_entity = 'project' THEN
    SELECT array_agg(p.id) INTO v_family_ids
    FROM public.projects p
    WHERE p.id = (SELECT id FROM public.projects WHERE public_key = v_request.public_key)
       OR p.parent_project_id = (SELECT id FROM public.projects WHERE public_key = v_request.public_key);
    SELECT id INTO v_new_root FROM public.projects WHERE public_key = v_request.replacement_key;
    UPDATE public.project_runs SET project_id = v_new_root WHERE project_id = ANY (v_family_ids);
    DELETE FROM public.operation_steps WHERE operation_id IN (
      SELECT op.id FROM public.phase_operations op
      JOIN public.project_phases ph ON op.phase_id = ph.id
      WHERE ph.project_id = ANY (v_family_ids));
    DELETE FROM public.phase_operations WHERE phase_id IN (SELECT id FROM public.project_phases WHERE project_id = ANY (v_family_ids));
    DELETE FROM public.project_phases WHERE project_id = ANY (v_family_ids);
    DELETE FROM public.projects WHERE id = ANY (v_family_ids) AND parent_project_id IS NOT NULL;
    DELETE FROM public.projects WHERE id = ANY (v_family_ids);

  ELSE
    SELECT name INTO v_old_name FROM public.project_categories WHERE public_key = v_request.public_key;
    SELECT name INTO v_new_name FROM public.project_categories WHERE public_key = v_request.replacement_key;
    UPDATE public.projects
      SET category = (
        SELECT array_agg(DISTINCT c ORDER BY c)
        FROM unnest(array_remove(category, v_old_name) || CASE WHEN v_new_name IS NULL THEN ARRAY[]::text[] ELSE ARRAY[v_new_name] END) AS c
      )
      WHERE v_old_name = ANY (category);
    DELETE FROM public.project_categories WHERE public_key = v_request.public_key;
  END IF;

  IF v_request.replacement_key IS NOT NULL THEN
    INSERT INTO public.project_family_tools (family_key, term_key, role, source)
      SELECT family_key, v_request.replacement_key, role, source FROM public.project_family_tools WHERE term_key = v_request.public_key
      ON CONFLICT DO NOTHING;
    INSERT INTO public.vocab_aliases (public_key, alias, source)
      SELECT v_request.replacement_key, alias, source FROM public.vocab_aliases WHERE public_key = v_request.public_key
      ON CONFLICT DO NOTHING;
    IF v_old_name IS NOT NULL THEN
      INSERT INTO public.vocab_aliases (public_key, alias, source) VALUES (v_request.replacement_key, v_old_name, 'merged_term')
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  DELETE FROM public.project_family_tools WHERE term_key = v_request.public_key OR family_key = v_request.public_key;
  DELETE FROM public.vocab_aliases WHERE public_key = v_request.public_key;
  UPDATE public.vocab_keys SET removed_at = now(), replaced_by_public_key = v_request.replacement_key
    WHERE public_key = v_request.public_key;
  PERFORM public.vocab_emit(v_request.public_key, 'remove');
  IF v_request.replacement_key IS NOT NULL THEN
    PERFORM public.vocab_emit(v_request.replacement_key, 'upsert');
  END IF;
  PERFORM set_config('vocab.completing_removal', 'off', true);
END;
$$;

-- Variation write triggers
CREATE OR REPLACE FUNCTION public.vocab_variation_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity text := TG_ARGV[0];
  v_parent_key text;
  v_parent_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.public_key IS NOT NULL AND NEW.public_key IS DISTINCT FROM OLD.public_key THEN
    RAISE EXCEPTION 'The key of variation "%" cannot change', OLD.name;
  END IF;
  IF v_entity = 'tool_variation' THEN
    SELECT public_key INTO v_parent_key FROM public.tools WHERE id = NEW.core_item_id;
    v_parent_id := NEW.core_item_id;
  ELSE
    SELECT public_key INTO v_parent_key FROM public.materials WHERE id = NEW.material_id;
    v_parent_id := NEW.material_id;
  END IF;
  IF v_parent_key IS NULL THEN
    RAISE EXCEPTION 'Variation "%" parent has no public_key yet', NEW.name;
  END IF;
  IF NEW.public_key IS NULL THEN
    NEW.public_key := public.vocab_variation_key(v_parent_key, NEW.sku, NEW.name);
    INSERT INTO public.vocab_keys (public_key, entity, parent_public_key)
      VALUES (NEW.public_key, v_entity, v_parent_key)
      ON CONFLICT (public_key) DO NOTHING;
  ELSE
    INSERT INTO public.vocab_keys (public_key, entity, parent_public_key)
      VALUES (NEW.public_key, v_entity, v_parent_key)
      ON CONFLICT (public_key) DO UPDATE SET
        parent_public_key = EXCLUDED.parent_public_key
      WHERE public.vocab_keys.removed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_variation_after_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.vocab_emit(NEW.public_key, 'upsert');
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS vocab_tool_variations_before_write ON public.tool_variations;
CREATE TRIGGER vocab_tool_variations_before_write
  BEFORE INSERT OR UPDATE ON public.tool_variations
  FOR EACH ROW EXECUTE FUNCTION public.vocab_variation_before_write('tool_variation');
DROP TRIGGER IF EXISTS vocab_tool_variations_after_write ON public.tool_variations;
CREATE TRIGGER vocab_tool_variations_after_write
  AFTER INSERT OR UPDATE OF name, sku, description, public_key, core_item_id ON public.tool_variations
  FOR EACH ROW EXECUTE FUNCTION public.vocab_variation_after_write();
DROP TRIGGER IF EXISTS vocab_tool_variations_delete_guard ON public.tool_variations;
CREATE TRIGGER vocab_tool_variations_delete_guard BEFORE DELETE ON public.tool_variations
  FOR EACH ROW EXECUTE FUNCTION public.vocab_delete_guard('tool_variation');

DROP TRIGGER IF EXISTS vocab_materials_variants_before_write ON public.materials_variants;
CREATE TRIGGER vocab_materials_variants_before_write
  BEFORE INSERT OR UPDATE ON public.materials_variants
  FOR EACH ROW EXECUTE FUNCTION public.vocab_variation_before_write('material_variation');
DROP TRIGGER IF EXISTS vocab_materials_variants_after_write ON public.materials_variants;
CREATE TRIGGER vocab_materials_variants_after_write
  AFTER INSERT OR UPDATE OF name, sku, public_key, material_id ON public.materials_variants
  FOR EACH ROW EXECUTE FUNCTION public.vocab_variation_after_write();
DROP TRIGGER IF EXISTS vocab_materials_variants_delete_guard ON public.materials_variants;
CREATE TRIGGER vocab_materials_variants_delete_guard BEFORE DELETE ON public.materials_variants
  FOR EACH ROW EXECUTE FUNCTION public.vocab_delete_guard('material_variation');

-- 6. Propose / decide / cancel (phase 5 RPCs, extended for variants)
CREATE OR REPLACE FUNCTION public.vocab_emit_proposal(p_proposal public.vocab_term_proposals)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vocab_change_events (entity, public_key, change_kind, payload)
  VALUES (p_proposal.entity, p_proposal.proposed_key, 'term_proposal', to_jsonb(p_proposal));
END;
$$;

DROP FUNCTION IF EXISTS public.vocab_propose_term(text, text, text, text, text, uuid, text);
CREATE OR REPLACE FUNCTION public.vocab_propose_term(
  p_entity text, p_key text, p_name text, p_description text,
  p_item_kind text, p_item_id uuid, p_requested_by text,
  p_parent_key text DEFAULT NULL
)
RETURNS public.vocab_term_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.vocab_term_proposals;
  v_parent_entity text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'vocab_propose_term is for the project-partner-vocab function' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_entity NOT IN ('tool', 'material', 'project', 'tool_variation', 'material_variation') THEN
    RAISE EXCEPTION 'entity must be tool, material, project, tool_variation, or material_variation';
  END IF;
  IF p_item_kind NOT IN ('inventory_core', 'project', 'inventory_variant') THEN
    RAISE EXCEPTION 'toolio_item_kind must be inventory_core, project, or inventory_variant';
  END IF;
  IF (p_entity IN ('tool_variation', 'material_variation')) <> (p_item_kind = 'inventory_variant') THEN
    RAISE EXCEPTION 'variant entities require inventory_variant kind';
  END IF;
  IF p_item_kind = 'inventory_variant' THEN
    IF p_parent_key IS NULL THEN
      RAISE EXCEPTION 'parent_key is required for inventory_variant proposals';
    END IF;
    SELECT entity INTO v_parent_entity FROM public.vocab_keys
    WHERE public_key = p_parent_key AND removed_at IS NULL;
    IF p_entity = 'tool_variation' AND v_parent_entity IS DISTINCT FROM 'tool' THEN
      RAISE EXCEPTION 'Parent % is not a live tool', p_parent_key;
    ELSIF p_entity = 'material_variation' AND v_parent_entity IS DISTINCT FROM 'material' THEN
      RAISE EXCEPTION 'Parent % is not a live material', p_parent_key;
    END IF;
  ELSIF p_parent_key IS NOT NULL THEN
    RAISE EXCEPTION 'parent_key is only valid for inventory_variant proposals';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.vocab_term_proposals
    WHERE toolio_item_id = p_item_id AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Toolio item % already has an open proposal', p_item_id USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.vocab_term_proposals (
    entity, proposed_key, proposed_name, description, requested_by,
    toolio_item_kind, toolio_item_id, proposed_parent_key, status
  ) VALUES (
    p_entity, p_key, p_name, p_description, p_requested_by,
    p_item_kind, p_item_id, p_parent_key, 'open'
  ) RETURNING * INTO v_proposal;

  PERFORM public.vocab_emit_proposal(v_proposal);
  PERFORM public.notifications_notify_admins(
    'vocab_term_proposal',
    'New shared item from Toolio',
    p_name,
    jsonb_build_object('proposal_id', v_proposal.id, 'entity', p_entity, 'proposed_key', p_key)
  );
  RETURN v_proposal;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_decide_proposal(
  p_proposal_id uuid, p_decision text, p_existing_key text,
  p_entity text, p_category text, p_specialty_scale integer, p_email text
)
RETURNS public.vocab_term_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_proposal public.vocab_term_proposals;
  v_result_key text;
  v_entity text;
  v_existing_entity text;
  v_parent_key text;
BEGIN
  SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = lower(p_email);
  IF v_user IS NULL OR NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION '% is not a Project Partner admin', p_email USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_proposal FROM public.vocab_term_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown proposal %', p_proposal_id;
  END IF;
  IF v_proposal.status <> 'open' THEN
    RAISE EXCEPTION 'Proposal % is not open', p_proposal_id;
  END IF;

  IF p_decision = 'map' THEN
    IF p_existing_key IS NULL THEN
      RAISE EXCEPTION 'existing_key is required to map a proposal';
    END IF;
    SELECT entity INTO v_existing_entity FROM public.vocab_keys
    WHERE public_key = p_existing_key AND removed_at IS NULL;
    IF v_existing_entity IS NULL THEN
      RAISE EXCEPTION 'No live term %', p_existing_key;
    END IF;
    IF v_proposal.toolio_item_kind = 'inventory_core' AND v_existing_entity NOT IN ('tool', 'material') THEN
      RAISE EXCEPTION 'A product proposal can only map to a tool or material';
    END IF;
    IF v_proposal.toolio_item_kind = 'project' AND v_existing_entity NOT IN ('project', 'category') THEN
      RAISE EXCEPTION 'A project proposal can only map to a project or category';
    END IF;
    IF v_proposal.toolio_item_kind = 'inventory_variant' THEN
      IF v_existing_entity NOT IN ('tool_variation', 'material_variation') THEN
        RAISE EXCEPTION 'A variant proposal can only map to a variation term';
      END IF;
      IF (SELECT parent_public_key FROM public.vocab_keys WHERE public_key = p_existing_key)
         IS DISTINCT FROM v_proposal.proposed_parent_key THEN
        RAISE EXCEPTION 'Mapped variation must share parent %', v_proposal.proposed_parent_key;
      END IF;
    END IF;
    v_result_key := p_existing_key;
    UPDATE public.vocab_term_proposals SET
      status = 'mapped', result_key = v_result_key, decided_by = p_email, decided_at = now(), updated_at = now()
    WHERE id = p_proposal_id RETURNING * INTO v_proposal;

  ELSIF p_decision = 'approve' THEN
    IF v_proposal.toolio_item_kind = 'inventory_variant' THEN
      v_entity := v_proposal.entity;
      v_parent_key := v_proposal.proposed_parent_key;
      IF v_parent_key IS NULL THEN
        RAISE EXCEPTION 'Proposal % is missing proposed_parent_key', p_proposal_id;
      END IF;
      PERFORM public.vocab_create_term(
        v_entity, v_proposal.proposed_key, v_proposal.proposed_name, v_proposal.description,
        v_parent_key, NULL, p_email
      );
    ELSIF v_proposal.toolio_item_kind = 'inventory_core' THEN
      v_entity := coalesce(p_entity, v_proposal.entity);
      IF v_entity NOT IN ('tool', 'material') THEN
        RAISE EXCEPTION 'Approve a product as tool or material';
      END IF;
      PERFORM public.vocab_create_term(
        v_entity, v_proposal.proposed_key, v_proposal.proposed_name, v_proposal.description,
        p_category, p_specialty_scale, p_email
      );
    ELSIF v_proposal.toolio_item_kind = 'project' THEN
      PERFORM public.vocab_create_term(
        'project', v_proposal.proposed_key, v_proposal.proposed_name, v_proposal.description,
        p_category, NULL, p_email
      );
    ELSE
      RAISE EXCEPTION 'Unknown toolio_item_kind %', v_proposal.toolio_item_kind;
    END IF;
    v_result_key := v_proposal.proposed_key;
    UPDATE public.vocab_term_proposals SET
      status = 'approved', result_key = v_result_key, decided_by = p_email, decided_at = now(), updated_at = now(),
      entity = CASE WHEN v_proposal.toolio_item_kind = 'inventory_core' THEN coalesce(p_entity, entity) ELSE entity END
    WHERE id = p_proposal_id RETURNING * INTO v_proposal;
  ELSE
    RAISE EXCEPTION 'decision must be approve or map';
  END IF;

  PERFORM public.vocab_emit_proposal(v_proposal);
  RETURN v_proposal;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_cancel_proposal(p_proposal_id uuid, p_requested_by text)
RETURNS public.vocab_term_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.vocab_term_proposals;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'vocab_cancel_proposal is for the project-partner-vocab function' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_proposal FROM public.vocab_term_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown proposal %', p_proposal_id;
  END IF;
  IF v_proposal.status <> 'open' THEN
    RETURN v_proposal;
  END IF;
  UPDATE public.vocab_term_proposals SET
    status = 'cancelled', updated_at = now()
  WHERE id = p_proposal_id RETURNING * INTO v_proposal;
  PERFORM public.vocab_emit_proposal(v_proposal);
  RETURN v_proposal;
END;
$$;

-- 7. Backfill keys for existing variations (explicit public_key; triggers register vocab_keys + emit)
--    Avoid SET name = name: some clients/paths treat no-op updates as skippable.
DO $$
DECLARE
  r record;
  v_key text;
  v_parent text;
  v_failed integer := 0;
BEGIN
  FOR r IN
    SELECT v.id, v.name, v.sku, t.public_key AS parent_key
    FROM public.tool_variations v
    JOIN public.tools t ON t.id = v.core_item_id
    WHERE v.public_key IS NULL AND t.public_key IS NOT NULL
  LOOP
    BEGIN
      v_key := public.vocab_variation_key(r.parent_key, r.sku, r.name);
      UPDATE public.tool_variations SET public_key = v_key WHERE id = r.id AND public_key IS NULL;
    EXCEPTION WHEN others THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'tool variation % (%) backfill failed: %', r.id, r.name, SQLERRM;
    END;
  END LOOP;

  FOR r IN
    SELECT v.id, v.name, v.sku, m.public_key AS parent_key
    FROM public.materials_variants v
    JOIN public.materials m ON m.id = v.material_id
    WHERE v.public_key IS NULL AND m.public_key IS NOT NULL
  LOOP
    BEGIN
      v_key := public.vocab_variation_key(r.parent_key, r.sku, r.name);
      UPDATE public.materials_variants SET public_key = v_key WHERE id = r.id AND public_key IS NULL;
    EXCEPTION WHEN others THEN
      v_failed := v_failed + 1;
      RAISE NOTICE 'material variation % (%) backfill failed: %', r.id, r.name, SQLERRM;
    END;
  END LOOP;

  IF v_failed > 0 THEN
    RAISE NOTICE 'Variation backfill finished with % row error(s); see notices above', v_failed;
  END IF;
END $$;

-- Drum Fan: ensure a live tool term exists for the pending Toolio core
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = 'drum-fan' AND removed_at IS NULL) THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.tools WHERE lower(name) = 'drum fan' AND public_key IS NOT NULL) THEN
    RETURN;
  END IF;
  INSERT INTO public.vocab_keys (public_key, entity) VALUES ('drum-fan', 'tool')
    ON CONFLICT (public_key) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.tools WHERE public_key = 'drum-fan') THEN
    INSERT INTO public.tools (name, description, category, specialty_scale, public_key)
      VALUES ('Drum Fan', 'Large air mover for drying and ventilation', 'Power Tool', 1, 'drum-fan');
  END IF;
  PERFORM public.vocab_emit('drum-fan', 'upsert');
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;
