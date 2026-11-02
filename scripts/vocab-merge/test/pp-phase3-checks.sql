-- Checks run after the phase 3 migration on the local stand-in. Each row reads PASS or FAIL.
CREATE TEMP TABLE _check (n serial, result text);

-- Load results
INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS no step entry keeps the library-selection shape'
            ELSE 'FAIL ' || count(*) || ' step entries still carry coreItemId' END
FROM public.operation_steps s, jsonb_array_elements(s.tools || s.materials) e WHERE e.value ? 'coreItemId';

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS every step entry has library_id and legacy_name'
            ELSE 'FAIL ' || count(*) || ' step entries miss library_id or legacy_name' END
FROM public.operation_steps s, jsonb_array_elements(s.tools || s.materials) e
WHERE NOT (e.value ? 'library_id' AND e.value ? 'legacy_name');

INSERT INTO _check (result)
SELECT CASE WHEN jsonb_typeof(phases) = 'string' THEN 'PASS run phases stay a JSON string'
            ELSE 'FAIL run phases became ' || jsonb_typeof(phases) END
FROM public.project_runs LIMIT 1;

INSERT INTO _check (result)
SELECT CASE WHEN position('coreItemId' IN phases #>> '{}') = 0 AND position('library_id' IN phases #>> '{}') > 0
            THEN 'PASS run snapshot entries normalized' ELSE 'FAIL run snapshot entries not normalized' END
FROM public.project_runs LIMIT 1;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS owned tools point to live tools'
            ELSE 'FAIL ' || count(*) || ' owned tools point nowhere' END
FROM public.user_profiles u, jsonb_array_elements(u.owned_tools) e
WHERE NOT EXISTS (SELECT 1 FROM public.tools t WHERE t.id::text = e.value->>'tool_id');

INSERT INTO _check (result)
SELECT CASE WHEN count(*) > 0 THEN 'PASS family tool lists built (' || count(*) || ' rows)' ELSE 'FAIL no family tool lists' END
FROM public.project_family_tools;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS change feed empty after load' ELSE 'FAIL load left ' || count(*) || ' events' END
FROM public.vocab_change_events;

INSERT INTO _check (result)
SELECT CASE WHEN EXISTS (SELECT 1 FROM public.project_categories WHERE name = 'Lighting & Electrical')
             AND NOT EXISTS (SELECT 1 FROM public.projects WHERE 'Electrical' = ANY (category))
            THEN 'PASS Electrical merged into Lighting & Electrical' ELSE 'FAIL Electrical category merge' END;

INSERT INTO _check (result)
SELECT CASE WHEN EXISTS (SELECT 1 FROM public.projects WHERE public_key = 'hardwood-flooring-install' AND name = 'Engineered Flooring Installation')
             AND EXISTS (SELECT 1 FROM public.projects WHERE public_key = 'lvp-flooring-install' AND name = 'Laminate Flooring Installation')
            THEN 'PASS flooring split' ELSE 'FAIL flooring split' END;

-- Triggers and guards
DO $$
DECLARE
  v_key text;
  v_root uuid;
BEGIN
  INSERT INTO public.tools (name, category, specialty_scale) VALUES ('Test Gizmo', 'Other', 1) RETURNING public_key INTO v_key;
  INSERT INTO _check (result) VALUES (CASE WHEN v_key = 'test-gizmo' THEN 'PASS new tool gets key test-gizmo' ELSE 'FAIL new tool key ' || v_key END);

  BEGIN
    DELETE FROM public.tools WHERE public_key = 'test-gizmo';
    INSERT INTO _check (result) VALUES ('FAIL direct delete of a shared tool was allowed');
  EXCEPTION WHEN others THEN
    INSERT INTO _check (result) VALUES ('PASS direct delete blocked: ' || SQLERRM);
  END;

  SELECT id INTO v_root FROM public.projects WHERE public_key = 'tile-flooring';
  INSERT INTO public.projects (name, parent_project_id, public_key, category)
    VALUES ('Tile Flooring Installation rev test', v_root, 'tile-flooring', ARRAY['Tile']) RETURNING public_key INTO v_key;
  INSERT INTO _check (result) VALUES (CASE WHEN v_key IS NULL THEN 'PASS revision copy drops the family key' ELSE 'FAIL revision kept key ' || v_key END);

  BEGIN
    UPDATE public.projects SET category = ARRAY['Not A Category'] WHERE id = v_root;
    INSERT INTO _check (result) VALUES ('FAIL unknown category accepted');
  EXCEPTION WHEN others THEN
    INSERT INTO _check (result) VALUES ('PASS unknown category rejected: ' || SQLERRM);
  END;

  SELECT count(*)::text INTO v_key FROM public.vocab_change_events;
  INSERT INTO _check (result) VALUES (CASE WHEN v_key::int > 0 THEN 'PASS edits emit events (' || v_key || ')' ELSE 'FAIL edits emitted no events' END);
END $$;

-- Two-sided removal: Project Partner asks, Toolio approves, no references.
DO $$
DECLARE
  v_request public.vocab_removal_requests;
BEGIN
  PERFORM set_config('test.is_admin', 'true', true);
  v_request := public.vocab_request_removal('test-gizmo', 'test', NULL, 'pp', 'admin@example.com');
  PERFORM set_config('test.is_admin', 'false', true);
  PERFORM set_config('test.role', 'service_role', true);
  v_request := public.vocab_decide_removal(v_request.id, 'toolio', 'approve', 'staff@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.tools WHERE public_key = 'test-gizmo')
     AND EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = 'test-gizmo' AND removed_at IS NOT NULL)
     AND EXISTS (SELECT 1 FROM public.vocab_change_events WHERE public_key = 'test-gizmo' AND change_kind = 'remove')
    THEN 'PASS unused term removed after both approvals' ELSE 'FAIL unused term removal' END);
END $$;

-- A used term without a replacement cannot be removed.
DO $$
DECLARE
  v_key text;
  v_request public.vocab_removal_requests;
BEGIN
  SELECT t.public_key INTO v_key
  FROM public.tools t
  WHERE EXISTS (SELECT 1 FROM public.operation_steps s WHERE s.tools::text LIKE '%' || t.id::text || '%')
  LIMIT 1;
  PERFORM set_config('test.role', 'service_role', true);
  v_request := public.vocab_request_removal(v_key, 'test', NULL, 'toolio', 'staff@example.com');
  PERFORM set_config('test.is_admin', 'true', true);
  BEGIN
    PERFORM public.vocab_decide_removal(v_request.id, 'pp', 'approve', 'admin@example.com');
    INSERT INTO _check (result) VALUES ('FAIL used term removed without a replacement');
  EXCEPTION WHEN others THEN
    INSERT INTO _check (result) VALUES ('PASS used term kept without a replacement: ' || SQLERRM);
  END;
  PERFORM public.vocab_decide_removal(v_request.id, 'pp', 'reject', 'admin@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN EXISTS (SELECT 1 FROM public.notifications WHERE type = 'vocab_removal_request')
    THEN 'PASS Toolio request notified admins' ELSE 'FAIL no admin notification' END);
END $$;

-- A used term with a replacement: references move, then the term is removed.
DO $$
DECLARE
  v_old public.tools;
  v_new public.tools;
  v_request public.vocab_removal_requests;
BEGIN
  SELECT t.* INTO v_old FROM public.tools t
  WHERE EXISTS (SELECT 1 FROM public.operation_steps s WHERE s.tools::text LIKE '%' || t.id::text || '%')
  LIMIT 1;
  SELECT t.* INTO v_new FROM public.tools t WHERE t.id <> v_old.id ORDER BY t.name LIMIT 1;
  PERFORM set_config('test.is_admin', 'true', true);
  v_request := public.vocab_request_removal(v_old.public_key, 'test', v_new.public_key, 'pp', 'admin@example.com');
  PERFORM set_config('test.role', 'service_role', true);
  PERFORM public.vocab_decide_removal(v_request.id, 'toolio', 'approve', 'staff@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.operation_steps s WHERE s.tools::text LIKE '%' || v_old.id::text || '%')
     AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.phases::text LIKE '%' || v_old.id::text || '%')
     AND NOT EXISTS (SELECT 1 FROM public.tools WHERE id = v_old.id)
     AND EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = v_old.public_key AND replaced_by_public_key = v_new.public_key)
    THEN 'PASS replaced term removed and references moved' ELSE 'FAIL replacement removal' END);
END $$;

-- Toolio access through the vocab function's database calls.
DO $$
DECLARE
  v_snapshot jsonb;
  v_term jsonb;
BEGIN
  PERFORM set_config('test.role', 'service_role', true);
  v_snapshot := public.vocab_snapshot();
  INSERT INTO _check (result) VALUES (CASE
    WHEN jsonb_array_length(v_snapshot->'terms') = (SELECT count(*) FROM public.vocab_keys WHERE removed_at IS NULL)
     AND (v_snapshot->>'as_of_seq')::bigint = (SELECT max(seq) FROM public.vocab_change_events)
    THEN 'PASS snapshot carries every current term (' || jsonb_array_length(v_snapshot->'terms') || ')' ELSE 'FAIL snapshot' END);

  v_term := public.vocab_create_term('tool', 'test-widget', 'Test Widget', 'From Toolio', 'Other', 2, 'admin@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN v_term->>'public_key' = 'test-widget' AND EXISTS (SELECT 1 FROM public.tools WHERE public_key = 'test-widget')
    THEN 'PASS Toolio creates a term under its key' ELSE 'FAIL create_term' END);

  BEGIN
    PERFORM public.vocab_create_term('tool', 'test-widget', 'Another Widget', NULL, 'Other', 2, 'admin@example.com');
    INSERT INTO _check (result) VALUES ('FAIL duplicate key accepted');
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO _check (result) VALUES ('PASS duplicate key is a conflict');
  END;

  BEGIN
    PERFORM public.vocab_create_term('tool', 'test-widget-2', 'Test Widget 2', NULL, 'Other', 2, 'member@example.com');
    INSERT INTO _check (result) VALUES ('FAIL non-admin created a term');
  EXCEPTION WHEN insufficient_privilege THEN
    INSERT INTO _check (result) VALUES ('PASS non-admin email refused');
  END;
END $$;

SELECT result FROM _check ORDER BY n;
SELECT 'tools' AS what, count(*) FROM public.tools
UNION ALL SELECT 'materials', count(*) FROM public.materials
UNION ALL SELECT 'categories', count(*) FROM public.project_categories
UNION ALL SELECT 'families', count(*) FROM public.projects WHERE parent_project_id IS NULL
UNION ALL SELECT 'aliases', count(*) FROM public.vocab_aliases
UNION ALL SELECT 'family tool rows', count(*) FROM public.project_family_tools;
