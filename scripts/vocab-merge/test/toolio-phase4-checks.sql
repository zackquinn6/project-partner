-- Checks run after Toolio's phase 4 migration on the local stand-in. Each row reads PASS or FAIL.
CREATE TEMP TABLE _check (n serial, result text);

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS every inventory core is linked' ELSE 'FAIL ' || count(*) || ' cores unlinked' END
FROM public.inventory_items WHERE parent_inventory_item_id IS NULL AND pp_vocab_key IS NULL;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS variants carry no link' ELSE 'FAIL ' || count(*) || ' variants linked' END
FROM public.inventory_items WHERE parent_inventory_item_id IS NOT NULL AND pp_vocab_key IS NOT NULL;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS every project is linked' ELSE 'FAIL ' || count(*) || ' projects unlinked' END
FROM public.projects WHERE pp_vocab_key IS NULL;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) > 0 THEN 'PASS family tool lists mirrored (' || count(*) || ')' ELSE 'FAIL no family tool lists' END
FROM public.pp_vocab_project_terms;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 1 THEN 'PASS open removal request mirrored' ELSE 'FAIL removal requests: ' || count(*) END
FROM public.pp_vocab_removal_requests WHERE status = 'open';

DO $$
DECLARE
  v_last bigint;
  v_unlinked text;
  v_linked text;
  v_result jsonb;
BEGIN
  SELECT last_seq INTO v_last FROM public.pp_vocab_sync_state WHERE id;

  -- A new term arrives through the feed.
  v_result := public.pp_vocab_apply_events(jsonb_build_array(jsonb_build_object(
    'seq', v_last + 1, 'change_kind', 'upsert',
    'payload', jsonb_build_object('public_key', 'feed-test-tool', 'entity', 'tool', 'id', gen_random_uuid(), 'name', 'Feed Test Tool',
                                  'category', 'Other', 'aliases', jsonb_build_array(jsonb_build_object('alias', 'Feed Tool', 'source', 'pp_name'))))));
  INSERT INTO _check (result) VALUES (CASE
    WHEN EXISTS (SELECT 1 FROM public.pp_vocab_terms WHERE public_key = 'feed-test-tool')
     AND EXISTS (SELECT 1 FROM public.pp_vocab_aliases WHERE public_key = 'feed-test-tool')
     AND (SELECT last_seq FROM public.pp_vocab_sync_state WHERE id) = v_last + 1
    THEN 'PASS upsert event applied and cursor advanced' ELSE 'FAIL upsert event' END);

  -- Replaying the same event is a no-op.
  v_result := public.pp_vocab_apply_events(jsonb_build_array(jsonb_build_object(
    'seq', v_last + 1, 'change_kind', 'upsert',
    'payload', jsonb_build_object('public_key', 'feed-test-tool', 'entity', 'tool', 'id', gen_random_uuid(), 'name', 'Changed'))));
  INSERT INTO _check (result) VALUES (CASE
    WHEN (v_result->>'applied')::int = 0 AND (SELECT name FROM public.pp_vocab_terms WHERE public_key = 'feed-test-tool') = 'Feed Test Tool'
    THEN 'PASS already-applied event skipped' ELSE 'FAIL replayed event changed the mirror' END);

  -- A term nothing in Toolio links to is removed.
  SELECT t.public_key INTO v_unlinked FROM public.pp_vocab_terms t
  WHERE NOT EXISTS (SELECT 1 FROM public.inventory_items i WHERE i.pp_vocab_key = t.public_key) AND t.public_key <> 'feed-test-tool'
  ORDER BY t.public_key LIMIT 1;
  PERFORM public.pp_vocab_apply_events(jsonb_build_array(jsonb_build_object(
    'seq', v_last + 2, 'change_kind', 'remove',
    'payload', jsonb_build_object('public_key', v_unlinked, 'entity', 'tool', 'removed_at', now(), 'replaced_by_public_key', NULL))));
  INSERT INTO _check (result) VALUES (CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.pp_vocab_terms WHERE public_key = v_unlinked)
    THEN 'PASS unlinked term removed (' || v_unlinked || ')' ELSE 'FAIL unlinked term kept' END);

  -- A term a Toolio core still links to cannot disappear.
  SELECT pp_vocab_key INTO v_linked FROM public.inventory_items WHERE pp_vocab_key IS NOT NULL ORDER BY pp_vocab_key LIMIT 1;
  BEGIN
    PERFORM public.pp_vocab_apply_events(jsonb_build_array(jsonb_build_object(
      'seq', v_last + 3, 'change_kind', 'remove',
      'payload', jsonb_build_object('public_key', v_linked, 'entity', 'tool', 'removed_at', now()))));
    INSERT INTO _check (result) VALUES ('FAIL linked term removed');
  EXCEPTION WHEN others THEN
    INSERT INTO _check (result) VALUES ('PASS linked term kept: ' || SQLERRM);
  END;

  -- Removal requests flow through the feed.
  PERFORM public.pp_vocab_apply_events(jsonb_build_array(jsonb_build_object(
    'seq', v_last + 3, 'change_kind', 'removal_request',
    'payload', (SELECT to_jsonb(r) || jsonb_build_object('status', 'rejected', 'toolio_decision', 'reject', 'updated_at', now())
                FROM public.pp_vocab_removal_requests r WHERE status = 'open' LIMIT 1))));
  INSERT INTO _check (result) VALUES (CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.pp_vocab_removal_requests WHERE status = 'open')
    THEN 'PASS removal request decision mirrored' ELSE 'FAIL removal request decision' END);
END $$;

SELECT result FROM _check ORDER BY n;
SELECT 'terms' AS what, count(*) FROM public.pp_vocab_terms
UNION ALL SELECT 'projects and categories', count(*) FROM public.pp_vocab_projects
UNION ALL SELECT 'linked cores', count(*) FROM public.inventory_items WHERE pp_vocab_key IS NOT NULL
UNION ALL SELECT 'linked projects', count(*) FROM public.projects WHERE pp_vocab_key IS NOT NULL;
