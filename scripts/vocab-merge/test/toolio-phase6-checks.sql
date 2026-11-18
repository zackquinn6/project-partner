-- Checks for Toolio phase 6 variant keys (run after phase 4/5 + toolio-phase6-variant-keys.sql).
CREATE TEMP TABLE _check (n serial, result text);

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS every inventory core is linked or waiting'
  ELSE 'FAIL ' || count(*) || ' cores neither linked nor waiting' END
FROM public.inventory_items
WHERE parent_inventory_item_id IS NULL
  AND pp_vocab_key IS NULL AND coalesce(pp_vocab_pending, false) = false;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS every inventory variant is linked or waiting'
  ELSE 'FAIL ' || count(*) || ' variants neither linked nor waiting' END
FROM public.inventory_items
WHERE parent_inventory_item_id IS NOT NULL
  AND pp_vocab_key IS NULL AND coalesce(pp_vocab_pending, false) = false;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS linked variants use variation terms'
  ELSE 'FAIL ' || count(*) || ' children linked to non-variation terms' END
FROM public.inventory_items i
JOIN public.pp_vocab_terms t ON t.public_key = i.pp_vocab_key
WHERE i.parent_inventory_item_id IS NOT NULL
  AND t.entity NOT IN ('tool_variation', 'material_variation');

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS child parent_public_key matches core link'
  ELSE 'FAIL ' || count(*) || ' children with parent key mismatch' END
FROM public.inventory_items c
JOIN public.inventory_items p ON p.id = c.parent_inventory_item_id
JOIN public.pp_vocab_terms t ON t.public_key = c.pp_vocab_key
WHERE c.pp_vocab_key IS NOT NULL
  AND t.parent_public_key IS DISTINCT FROM p.pp_vocab_key;

INSERT INTO _check (result)
SELECT CASE WHEN EXISTS (SELECT 1 FROM public.pp_vocab_terms WHERE public_key = 'drum-fan')
  AND EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE parent_inventory_item_id IS NULL
      AND public.inventory_item_name_comparison_key(name) = public.inventory_item_name_comparison_key('Drum Fan')
      AND pp_vocab_key = 'drum-fan'
  )
  THEN 'PASS Drum Fan core linked'
  WHEN NOT EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE parent_inventory_item_id IS NULL
      AND public.inventory_item_name_comparison_key(name) = public.inventory_item_name_comparison_key('Drum Fan')
  )
  THEN 'PASS Drum Fan not in this stand-in'
  ELSE 'FAIL Drum Fan still unlinked'
END;

DO $$
DECLARE
  v_parent text;
  v_child_key text := 'phase6-check-variation';
  v_core uuid;
  v_child uuid;
  v_last bigint;
BEGIN
  SELECT public_key INTO v_parent FROM public.pp_vocab_terms
  WHERE entity IN ('tool', 'material') ORDER BY public_key LIMIT 1;
  IF v_parent IS NULL THEN
    INSERT INTO _check (result) VALUES ('FAIL no parent term for variation upsert test');
    RETURN;
  END IF;
  SELECT last_seq INTO v_last FROM public.pp_vocab_sync_state WHERE id;
  PERFORM public.pp_vocab_apply_events(jsonb_build_array(jsonb_build_object(
    'seq', v_last + 1, 'change_kind', 'upsert',
    'payload', jsonb_build_object(
      'public_key', v_child_key, 'entity', 'tool_variation', 'id', gen_random_uuid(),
      'name', 'Phase 6 Check Variation', 'parent_public_key', v_parent, 'aliases', '[]'::jsonb))));
  INSERT INTO _check (result) VALUES (CASE
    WHEN EXISTS (
      SELECT 1 FROM public.pp_vocab_terms
      WHERE public_key = v_child_key AND parent_public_key = v_parent AND entity = 'tool_variation')
    THEN 'PASS variation upsert mirrored' ELSE 'FAIL variation upsert' END);

  SELECT id INTO v_core FROM public.inventory_items
  WHERE parent_inventory_item_id IS NULL AND pp_vocab_key = v_parent LIMIT 1;
  IF v_core IS NULL THEN
    INSERT INTO public.inventory_items (name, sku, pp_vocab_key, pp_vocab_pending)
    VALUES ('Phase 6 Parent Core', 'phase6-parent-core', v_parent, false)
    RETURNING id INTO v_core;
  END IF;
  INSERT INTO public.inventory_items (name, sku, parent_inventory_item_id, pp_vocab_pending)
  VALUES ('Phase 6 Check Variation', 'phase6-check-variation', v_core, true)
  RETURNING id INTO v_child;
  PERFORM public.pp_vocab_apply_proposal(jsonb_build_object(
    'id', gen_random_uuid(), 'entity', 'tool_variation', 'proposed_key', v_child_key,
    'proposed_name', 'Phase 6 Check Variation', 'requested_by', 'staff@example.com',
    'toolio_item_kind', 'inventory_variant', 'toolio_item_id', v_child,
    'proposed_parent_key', v_parent, 'status', 'approved', 'result_key', v_child_key,
    'created_at', now(), 'updated_at', now()));
  INSERT INTO _check (result) SELECT CASE WHEN pp_vocab_key = v_child_key AND NOT pp_vocab_pending
    THEN 'PASS variant proposal links child' ELSE 'FAIL variant proposal link' END
  FROM public.inventory_items WHERE id = v_child;
END $$;

SELECT result FROM _check ORDER BY n;