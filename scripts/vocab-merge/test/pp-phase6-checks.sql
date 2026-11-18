-- Checks for PP phase 6 variant keys (run after pp-phase6-variant-keys.sql on a stand-in or copy).
CREATE TEMP TABLE _check (n serial, result text);

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS every tool variation has a public_key'
  ELSE 'FAIL ' || count(*) || ' tool variations unkeyed' END
FROM public.tool_variations WHERE public_key IS NULL;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS every material variation has a public_key'
  ELSE 'FAIL ' || count(*) || ' material variations unkeyed' END
FROM public.materials_variants WHERE public_key IS NULL;

INSERT INTO _check (result)
SELECT CASE WHEN count(*) = 0 THEN 'PASS variation keys carry parent_public_key'
  ELSE 'FAIL ' || count(*) || ' variation keys missing parent' END
FROM public.vocab_keys
WHERE entity IN ('tool_variation', 'material_variation')
  AND removed_at IS NULL
  AND parent_public_key IS NULL;

INSERT INTO _check (result)
SELECT CASE WHEN EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = 'drum-fan' AND removed_at IS NULL)
  THEN 'PASS drum-fan term exists' ELSE 'FAIL drum-fan missing' END;

DO $$
DECLARE
  v_parent text;
  v_parent_id uuid;
  v_key text;
  v_req uuid;
BEGIN
  SELECT t.public_key, t.id INTO v_parent, v_parent_id
  FROM public.tools t WHERE t.public_key IS NOT NULL ORDER BY t.public_key LIMIT 1;
  IF v_parent IS NULL THEN
    INSERT INTO _check (result) VALUES ('FAIL no parent tool for dual-removal check');
    RETURN;
  END IF;

  INSERT INTO public.tool_variations (id, core_item_id, name, attribute_definitions, attributes)
  VALUES (gen_random_uuid(), v_parent_id, 'Phase 6 Removal Child', '[]'::jsonb, '{}'::jsonb)
  RETURNING public_key INTO v_key;

  INSERT INTO _check (result) VALUES (CASE WHEN v_key IS NOT NULL
    THEN 'PASS insert assigns variation key' ELSE 'FAIL variation insert key' END);

  BEGIN
    -- Attempting to complete a core removal while a keyed child exists must fail.
    INSERT INTO public.vocab_removal_requests (
      public_key, requested_by_app, requested_by_email, status, pp_decision, toolio_decision
    ) VALUES (v_parent, 'pp', 'admin@example.com', 'approved', 'approve', 'approve')
    RETURNING id INTO v_req;
    PERFORM public.vocab_complete_removal(v_req);
    INSERT INTO _check (result) VALUES ('FAIL core removal ignored keyed children');
  EXCEPTION WHEN others THEN
    INSERT INTO _check (result) VALUES ('PASS core removal blocked while keyed children exist');
    DELETE FROM public.vocab_removal_requests WHERE id = v_req;
  END;
END $$;

SELECT result FROM _check ORDER BY n;