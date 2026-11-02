-- ===========================================================================
-- Part 2: vocabulary functions. public.vocab_name_key is created just before
-- this part from Toolio's inventory_item_name_comparison_key definition.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.vocab_kebab(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(p_text), '[^a-z0-9]+', '-', 'g'))
$$;

-- Registers a key for a new Project Partner term, derived from its name.
CREATE OR REPLACE FUNCTION public.vocab_new_key(p_entity text, p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := public.vocab_kebab(p_name);
BEGIN
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Cannot derive a key from the name "%"', p_name;
  END IF;
  IF EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = v_key) THEN
    RAISE EXCEPTION 'The key "%" is already used by another category, project, tool, or material. Choose a different name.', v_key;
  END IF;
  INSERT INTO public.vocab_keys (public_key, entity) VALUES (v_key, p_entity);
  RETURN v_key;
END;
$$;

-- Converts tool/material entries to the step-entry shape with a library_id.
-- p_map: {"by_id": {"<library id>": {"id","name","category"}}, "by_name": {"<kind>|<name>": {...}}}
-- Library selections ({item, coreItemId}) resolve by coreItemId, step entries by library_id, then by name.
-- With p_require_all, an entry that resolves to nothing raises; otherwise it is left unchanged.
CREATE OR REPLACE FUNCTION public.vocab_map_entries(p_entries jsonb, p_kind text, p_map jsonb, p_require_all boolean)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_src_id text;
  v_src_name text;
  v_target jsonb;
  v_base jsonb;
BEGIN
  IF p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' THEN
    RETURN p_entries;
  END IF;
  FOR v_entry IN SELECT e.value FROM jsonb_array_elements(p_entries) WITH ORDINALITY AS e(value, n) ORDER BY e.n LOOP
    IF jsonb_typeof(v_entry) <> 'object' THEN
      IF p_require_all THEN
        RAISE EXCEPTION 'vocab: % entry is not an object: %', p_kind, v_entry;
      END IF;
      v_out := v_out || jsonb_build_array(v_entry);
      CONTINUE;
    END IF;
    IF v_entry ? 'coreItemId' THEN
      v_src_id := v_entry->>'coreItemId';
      v_src_name := v_entry->>'item';
    ELSE
      v_src_id := v_entry->>'library_id';
      v_src_name := v_entry->>'name';
    END IF;
    v_target := NULL;
    IF v_src_id IS NOT NULL AND (p_map->'by_id') ? v_src_id THEN
      v_target := p_map->'by_id'->v_src_id;
    ELSIF v_src_name IS NOT NULL AND (p_map->'by_name') ? (p_kind || '|' || v_src_name) THEN
      v_target := p_map->'by_name'->(p_kind || '|' || v_src_name);
    END IF;
    IF v_target IS NULL THEN
      IF p_require_all THEN
        RAISE EXCEPTION 'vocab: unresolved % entry %', p_kind, v_entry;
      END IF;
      v_out := v_out || jsonb_build_array(v_entry);
      CONTINUE;
    END IF;
    v_base := v_entry - 'item' - 'coreItemId' - 'isPrime' - 'attributes' - 'variationId' - 'library_tool_id' - 'library_material_id';
    IF NOT v_base ? 'id' THEN
      v_base := v_base || jsonb_build_object('id', p_kind || '-' || gen_random_uuid());
    END IF;
    IF NOT v_base ? 'alternates' THEN
      v_base := v_base || jsonb_build_object('alternates', '[]'::jsonb);
    END IF;
    IF NOT v_base ? 'category' AND v_target ? 'category' THEN
      v_base := v_base || jsonb_build_object('category', v_target->'category');
    END IF;
    IF NOT v_base ? 'legacy_name' THEN
      v_base := v_base || jsonb_build_object('legacy_name', v_src_name);
    END IF;
    v_base := v_base || jsonb_build_object('name', v_target->'name', 'library_id', v_target->'id');
    v_out := v_out || jsonb_build_array(v_base);
  END LOOP;
  RETURN v_out;
END;
$$;

-- Applies vocab_map_entries to every step's tools and materials inside a phases array.
CREATE OR REPLACE FUNCTION public.vocab_walk_phases(p_phases jsonb, p_map jsonb, p_require_all boolean)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_phase jsonb;
  v_ops jsonb;
  v_op jsonb;
  v_steps jsonb;
  v_step jsonb;
BEGIN
  IF p_phases IS NULL OR jsonb_typeof(p_phases) <> 'array' THEN
    RETURN p_phases;
  END IF;
  FOR v_phase IN SELECT p.value FROM jsonb_array_elements(p_phases) WITH ORDINALITY AS p(value, n) ORDER BY p.n LOOP
    IF jsonb_typeof(v_phase) = 'object' AND jsonb_typeof(v_phase->'operations') = 'array' THEN
      v_ops := '[]'::jsonb;
      FOR v_op IN SELECT o.value FROM jsonb_array_elements(v_phase->'operations') WITH ORDINALITY AS o(value, n) ORDER BY o.n LOOP
        IF jsonb_typeof(v_op) = 'object' AND jsonb_typeof(v_op->'steps') = 'array' THEN
          v_steps := '[]'::jsonb;
          FOR v_step IN SELECT s.value FROM jsonb_array_elements(v_op->'steps') WITH ORDINALITY AS s(value, n) ORDER BY s.n LOOP
            IF jsonb_typeof(v_step) = 'object' THEN
              IF jsonb_typeof(v_step->'tools') = 'array' THEN
                v_step := jsonb_set(v_step, '{tools}', public.vocab_map_entries(v_step->'tools', 'tool', p_map, p_require_all));
              END IF;
              IF jsonb_typeof(v_step->'materials') = 'array' THEN
                v_step := jsonb_set(v_step, '{materials}', public.vocab_map_entries(v_step->'materials', 'material', p_map, p_require_all));
              END IF;
            END IF;
            v_steps := v_steps || jsonb_build_array(v_step);
          END LOOP;
          v_op := jsonb_set(v_op, '{steps}', v_steps);
        END IF;
        v_ops := v_ops || jsonb_build_array(v_op);
      END LOOP;
      v_phase := jsonb_set(v_phase, '{operations}', v_ops);
    END IF;
    v_out := v_out || jsonb_build_array(v_phase);
  END LOOP;
  RETURN v_out;
END;
$$;

-- project_runs.phases may hold a JSON string that contains the phases; it is walked and stored back the same way.
CREATE OR REPLACE FUNCTION public.vocab_walk_run_phases(p_phases jsonb, p_map jsonb, p_require_all boolean)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT CASE jsonb_typeof(p_phases)
    WHEN 'string' THEN to_jsonb(public.vocab_walk_phases((p_phases #>> '{}')::jsonb, p_map, p_require_all)::text)
    ELSE public.vocab_walk_phases(p_phases, p_map, p_require_all)
  END
$$;

-- user_profiles.owned_tools entries {id, tool_id, name, item}: resolves tool_id by id, then by name (name, else item, as the app reads it).
CREATE OR REPLACE FUNCTION public.vocab_map_owned_tools(p_owned jsonb, p_map jsonb, p_require_all boolean)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_out jsonb := '[]'::jsonb;
  v_entry jsonb;
  v_name text;
  v_target jsonb;
BEGIN
  IF p_owned IS NULL OR jsonb_typeof(p_owned) <> 'array' THEN
    RETURN p_owned;
  END IF;
  FOR v_entry IN SELECT e.value FROM jsonb_array_elements(p_owned) WITH ORDINALITY AS e(value, n) ORDER BY e.n LOOP
    v_target := NULL;
    IF jsonb_typeof(v_entry) = 'object' THEN
      v_name := CASE WHEN nullif(btrim(v_entry->>'name'), '') IS NOT NULL THEN v_entry->>'name' ELSE v_entry->>'item' END;
      IF v_entry->>'tool_id' IS NOT NULL AND (p_map->'by_id') ? (v_entry->>'tool_id') THEN
        v_target := p_map->'by_id'->(v_entry->>'tool_id');
      ELSIF v_name IS NOT NULL AND (p_map->'by_name') ? ('tool|' || v_name) THEN
        v_target := p_map->'by_name'->('tool|' || v_name);
      END IF;
    END IF;
    IF v_target IS NULL THEN
      IF p_require_all AND jsonb_typeof(v_entry) = 'object' AND (v_entry->>'tool_id' IS NOT NULL OR v_name IS NOT NULL) THEN
        RAISE EXCEPTION 'vocab: unresolved owned tool %', v_entry;
      END IF;
      v_out := v_out || jsonb_build_array(v_entry);
    ELSE
      v_out := v_out || jsonb_build_array(v_entry || jsonb_build_object('tool_id', v_target->'id'));
    END IF;
  END LOOP;
  RETURN v_out;
END;
$$;

-- A family's current revision: latest published, else newest draft, else none.
CREATE OR REPLACE FUNCTION public.vocab_family_current(p_root uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := public.latest_published_in_family(p_root);
BEGIN
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;
  SELECT p.id INTO v_id
  FROM public.projects p
  WHERE (p.id = p_root OR p.parent_project_id = p_root) AND p.publish_status = 'draft'
  ORDER BY p.updated_at DESC
  LIMIT 1;
  RETURN v_id;
END;
$$;

-- Full current state of one term, as carried by the change feed and the snapshot.
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
    RETURN jsonb_build_object('public_key', v_key.public_key, 'entity', v_key.entity, 'removed_at', v_key.removed_at,
      'replaced_by_public_key', v_key.replaced_by_public_key);
  END IF;
  IF v_key.entity = 'tool' THEN
    SELECT jsonb_build_object('id', t.id, 'name', t.name, 'category', t.category, 'description', t.description)
      INTO v_body FROM public.tools t WHERE t.public_key = p_key;
  ELSIF v_key.entity = 'material' THEN
    SELECT jsonb_build_object('id', m.id, 'name', m.name, 'category', m.category, 'description', m.description)
      INTO v_body FROM public.materials m WHERE m.public_key = p_key;
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
    'aliases', (SELECT jsonb_agg(jsonb_build_object('alias', a.alias, 'source', a.source) ORDER BY a.alias)
                FROM public.vocab_aliases a WHERE a.public_key = p_key)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_emit(p_key text, p_kind text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.vocab_change_events (entity, public_key, change_kind, payload)
  SELECT k.entity, k.public_key, p_kind, public.vocab_term_payload(k.public_key)
  FROM public.vocab_keys k
  WHERE k.public_key = p_key
$$;

-- Rebuilds a family's tool list from its latest published revision's steps.
CREATE OR REPLACE FUNCTION public.vocab_rebuild_family_tools(p_root uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_rev uuid;
BEGIN
  SELECT public_key INTO v_key FROM public.projects WHERE id = p_root;
  v_rev := public.latest_published_in_family(p_root);
  IF v_key IS NULL OR v_rev IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.project_family_tools WHERE family_key = v_key AND source = 'steps';
  INSERT INTO public.project_family_tools (family_key, term_key, role, source)
  SELECT v_key, x.term_key, CASE WHEN bool_or(NOT x.is_substitute) THEN 'required' ELSE 'substitute' END, 'steps'
  FROM (
    SELECT k.public_key AS term_key, (e.value ? 'parentId') AS is_substitute
    FROM public.project_phases ph
    JOIN public.phase_operations op
      ON op.phase_id = CASE WHEN ph.source_phase_id IS NULL THEN ph.id ELSE ph.source_phase_id END
    JOIN public.operation_steps s ON s.operation_id = op.id
    CROSS JOIN LATERAL jsonb_array_elements(
      (CASE WHEN jsonb_typeof(s.tools) = 'array' THEN s.tools ELSE '[]'::jsonb END)
      || (CASE WHEN jsonb_typeof(s.materials) = 'array' THEN s.materials ELSE '[]'::jsonb END)
    ) AS e(value)
    JOIN (SELECT id, public_key FROM public.tools UNION ALL SELECT id, public_key FROM public.materials) k
      ON k.id::text = e.value->>'library_id'
    WHERE ph.project_id = v_rev
  ) x
  GROUP BY x.term_key;
  PERFORM public.vocab_emit(v_key, 'upsert');
END;
$$;

-- ---------------------------------------------------------------------------
-- Two-sided removal
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.vocab_assert_caller(p_app text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_app = 'pp' THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only Project Partner admins can act on removal requests';
    END IF;
  ELSIF p_app = 'toolio' THEN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Toolio removal actions come only through the project-partner-vocab function';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown app %', p_app;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_emit_request(p_request public.vocab_removal_requests)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.vocab_change_events (entity, public_key, change_kind, payload)
  SELECT k.entity, k.public_key, 'removal_request', to_jsonb(p_request)
  FROM public.vocab_keys k WHERE k.public_key = p_request.public_key
$$;

CREATE OR REPLACE FUNCTION public.vocab_request_removal(
  p_key text, p_reason text, p_replacement_key text, p_app text, p_email text
)
RETURNS public.vocab_removal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key public.vocab_keys%ROWTYPE;
  v_replacement public.vocab_keys%ROWTYPE;
  v_request public.vocab_removal_requests%ROWTYPE;
BEGIN
  PERFORM public.vocab_assert_caller(p_app);
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'A requester email is required';
  END IF;
  SELECT * INTO v_key FROM public.vocab_keys WHERE public_key = p_key;
  IF NOT FOUND OR v_key.removed_at IS NOT NULL THEN
    RAISE EXCEPTION 'No current term with key %', p_key;
  END IF;
  IF p_replacement_key IS NOT NULL THEN
    SELECT * INTO v_replacement FROM public.vocab_keys WHERE public_key = p_replacement_key;
    IF NOT FOUND OR v_replacement.removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'No current term with key %', p_replacement_key;
    END IF;
    IF v_replacement.entity <> v_key.entity THEN
      RAISE EXCEPTION 'The replacement must also be a %', v_key.entity;
    END IF;
  END IF;
  INSERT INTO public.vocab_removal_requests (
    public_key, requested_by_app, requested_by_email, reason, replacement_key,
    pp_decision, pp_decided_by, pp_decided_at, toolio_decision, toolio_decided_by, toolio_decided_at
  ) VALUES (
    p_key, p_app, p_email, p_reason, p_replacement_key,
    CASE WHEN p_app = 'pp' THEN 'approve' END, CASE WHEN p_app = 'pp' THEN p_email END, CASE WHEN p_app = 'pp' THEN now() END,
    CASE WHEN p_app = 'toolio' THEN 'approve' END, CASE WHEN p_app = 'toolio' THEN p_email END, CASE WHEN p_app = 'toolio' THEN now() END
  )
  RETURNING * INTO v_request;
  PERFORM public.vocab_emit_request(v_request);
  IF p_app = 'toolio' THEN
    PERFORM public.notifications_notify_admins(
      'vocab_removal_request',
      'Toolio asks to remove a shared term',
      format('Toolio no longer uses "%s" (%s). Approve or reject the removal in Tools & Materials.', p_key, v_key.entity),
      jsonb_build_object('request_id', v_request.id, 'public_key', p_key)
    );
  END IF;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_cancel_removal(p_request_id uuid, p_app text, p_email text)
RETURNS public.vocab_removal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.vocab_removal_requests%ROWTYPE;
BEGIN
  PERFORM public.vocab_assert_caller(p_app);
  SELECT * INTO v_request FROM public.vocab_removal_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'open' THEN
    RAISE EXCEPTION 'Removal request % is not open', p_request_id;
  END IF;
  IF v_request.requested_by_app <> p_app THEN
    RAISE EXCEPTION 'Only the app that asked for the removal can cancel it';
  END IF;
  UPDATE public.vocab_removal_requests SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id RETURNING * INTO v_request;
  PERFORM public.vocab_emit_request(v_request);
  RETURN v_request;
END;
$$;

-- Performs an approved removal. Internal: called only by vocab_decide_removal.
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
  v_family_ids uuid[];
  v_new_root uuid;
BEGIN
  SELECT * INTO v_request FROM public.vocab_removal_requests WHERE id = p_request_id;
  IF v_request.status <> 'approved' THEN
    RAISE EXCEPTION 'Removal request % is not approved', p_request_id;
  END IF;
  SELECT entity INTO v_entity FROM public.vocab_keys WHERE public_key = v_request.public_key;
  PERFORM set_config('vocab.completing_removal', 'on', true);

  IF v_entity IN ('tool', 'material') THEN
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
        UPDATE public.tool_variations SET core_item_id = v_new_id WHERE core_item_id = v_old_id;
      ELSE
        UPDATE public.user_materials SET material_id = v_new_id WHERE material_id = v_old_id;
        UPDATE public.materials_variants SET material_id = v_new_id WHERE material_id = v_old_id;
      END IF;
    ELSE
      IF v_entity = 'tool' THEN
        DELETE FROM public.tool_variations WHERE core_item_id = v_old_id;
      ELSE
        DELETE FROM public.materials_variants WHERE material_id = v_old_id;
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

CREATE OR REPLACE FUNCTION public.vocab_decide_removal(p_request_id uuid, p_app text, p_decision text, p_email text)
RETURNS public.vocab_removal_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.vocab_removal_requests%ROWTYPE;
BEGIN
  PERFORM public.vocab_assert_caller(p_app);
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Decision must be approve or reject';
  END IF;
  SELECT * INTO v_request FROM public.vocab_removal_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status <> 'open' THEN
    RAISE EXCEPTION 'Removal request % is not open', p_request_id;
  END IF;
  IF v_request.requested_by_app = p_app THEN
    RAISE EXCEPTION 'The other app decides this request';
  END IF;
  IF p_app = 'pp' THEN
    UPDATE public.vocab_removal_requests
      SET pp_decision = p_decision, pp_decided_by = p_email, pp_decided_at = now(),
          status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END, updated_at = now()
      WHERE id = p_request_id RETURNING * INTO v_request;
  ELSE
    UPDATE public.vocab_removal_requests
      SET toolio_decision = p_decision, toolio_decided_by = p_email, toolio_decided_at = now(),
          status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END, updated_at = now()
      WHERE id = p_request_id RETURNING * INTO v_request;
  END IF;
  PERFORM public.vocab_emit_request(v_request);
  IF v_request.status = 'approved' THEN
    PERFORM public.vocab_complete_removal(p_request_id);
  END IF;
  RETURN v_request;
END;
$$;

-- ---------------------------------------------------------------------------
-- Toolio access (project-partner-vocab edge function, service role only)
-- ---------------------------------------------------------------------------

-- Every current term plus open removal requests, and the feed position they reflect.
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
    'terms', (SELECT jsonb_agg(public.vocab_term_payload(k.public_key) ORDER BY k.entity, k.public_key)
              FROM public.vocab_keys k WHERE k.removed_at IS NULL),
    'removal_requests', (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.created_at)
                         FROM public.vocab_removal_requests r WHERE r.status = 'open')
  );
END;
$$;

-- Creates a term under a key Toolio chooses (core sku or project slug). The requester must be a Project Partner admin.
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
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'vocab_create_term is for the project-partner-vocab function' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = lower(p_email);
  IF v_user IS NULL OR NOT public.is_admin(v_user) THEN
    RAISE EXCEPTION '% is not a Project Partner admin', p_email USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = p_key) THEN
    RAISE EXCEPTION 'Key % already exists', p_key USING ERRCODE = 'unique_violation';
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

REVOKE ALL ON FUNCTION public.vocab_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_create_term(text, text, text, text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vocab_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.vocab_create_term(text, text, text, text, text, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.vocab_complete_removal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_emit(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_emit_request(public.vocab_removal_requests) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_new_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vocab_request_removal(text, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vocab_decide_removal(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.vocab_cancel_removal(uuid, text, text) TO authenticated, service_role;
