-- Checks for Toolio's phase 5 migration, run on the local stand-in after phase 4.
CREATE TEMP TABLE _check (n serial, result text);

DO $$
DECLARE
  v_term public.pp_vocab_terms;
  v_core uuid;
  v_new uuid;
  v_variant uuid;
  v_family public.pp_vocab_projects;
  v_project uuid;
  v_last bigint;
BEGIN
  SELECT * INTO v_term FROM public.pp_vocab_terms ORDER BY public_key LIMIT 1;
  INSERT INTO public.inventory_items (name, sku) VALUES (upper(v_term.name), 'auto-link-test') RETURNING id INTO v_core;
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_key = v_term.public_key AND NOT pp_vocab_pending
    THEN 'PASS new product links to the term with the same name' ELSE 'FAIL auto link: ' || coalesce(pp_vocab_key, 'none') END
    FROM public.inventory_items WHERE id = v_core;

  INSERT INTO public.inventory_items (name, sku) VALUES ('Never Seen Gadget', 'never-seen-gadget') RETURNING id INTO v_new;
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_key IS NULL AND pp_vocab_pending
    THEN 'PASS new product without a match waits for a term' ELSE 'FAIL waiting product' END
    FROM public.inventory_items WHERE id = v_new;

  INSERT INTO public.inventory_items (name, sku, parent_inventory_item_id) VALUES ('Never Seen Gadget · Large', 'never-seen-gadget-large', v_new) RETURNING id INTO v_variant;
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_key IS NULL AND NOT pp_vocab_pending
    THEN 'PASS variants carry no link and do not wait' ELSE 'FAIL variant state' END
    FROM public.inventory_items WHERE id = v_variant;

  BEGIN
    UPDATE public.inventory_items SET pp_vocab_pending = false WHERE id = v_new;
    INSERT INTO _check (result) VALUES ('FAIL product left neither linked nor waiting');
  EXCEPTION WHEN check_violation THEN
    INSERT INTO _check (result) VALUES ('PASS a product must be linked or waiting');
  END;

  SELECT last_seq INTO v_last FROM public.pp_vocab_sync_state WHERE id;
  PERFORM public.pp_vocab_apply_events(jsonb_build_array(
    jsonb_build_object('seq', v_last + 1, 'change_kind', 'term_proposal', 'payload', jsonb_build_object(
      'id', gen_random_uuid(), 'entity', 'tool', 'proposed_key', 'never-seen-gadget', 'proposed_name', 'Never Seen Gadget',
      'requested_by', 'staff@example.com', 'toolio_item_kind', 'inventory_core', 'toolio_item_id', v_new,
      'status', 'mapped', 'result_key', v_term.public_key, 'created_at', now(), 'updated_at', now()))));
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_key = v_term.public_key AND NOT pp_vocab_pending
    THEN 'PASS decided proposal links the waiting product' ELSE 'FAIL proposal link' END
    FROM public.inventory_items WHERE id = v_new;

  PERFORM public.pp_vocab_apply_proposal(jsonb_build_object(
    'id', gen_random_uuid(), 'entity', 'tool', 'proposed_key', 'never-seen-gadget-large', 'proposed_name', 'Never Seen Gadget · Large',
    'requested_by', 'staff@example.com', 'toolio_item_kind', 'inventory_core', 'toolio_item_id', v_variant,
    'status', 'approved', 'result_key', v_term.public_key, 'created_at', now(), 'updated_at', now()));
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_key IS NULL AND NOT pp_vocab_pending
    THEN 'PASS a decision for an item that no longer waits changes nothing' ELSE 'FAIL decision linked a non-waiting item' END
    FROM public.inventory_items WHERE id = v_variant;

  SELECT * INTO v_family FROM public.pp_vocab_projects WHERE kind = 'family' ORDER BY public_key LIMIT 1;
  INSERT INTO public.projects (slug, name) VALUES ('auto-link-project', v_family.name) RETURNING id INTO v_project;
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_key = v_family.public_key
    THEN 'PASS new project links to the family with the same name' ELSE 'FAIL project auto link' END
    FROM public.projects WHERE id = v_project;
  INSERT INTO public.projects (slug, name) VALUES ('brand-new-project', 'Brand New Project Type') RETURNING id INTO v_project;
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_pending THEN 'PASS new project without a match waits' ELSE 'FAIL project waiting' END
    FROM public.projects WHERE id = v_project;

  PERFORM * FROM public.pp_vocab_project_coverage((SELECT id FROM public.projects WHERE pp_vocab_key IS NOT NULL AND slug = 'tile-flooring'));
  INSERT INTO _check (result) SELECT CASE WHEN count(*) > 0 THEN 'PASS coverage lists ' || count(*) || ' terms for tile-flooring' ELSE 'FAIL coverage empty' END
    FROM public.pp_vocab_project_coverage((SELECT id FROM public.projects WHERE slug = 'tile-flooring'));
END $$;

SELECT result FROM _check ORDER BY n;
