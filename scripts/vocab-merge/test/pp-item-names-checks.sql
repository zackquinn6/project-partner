-- Checks for 20261111190000_vocab_request_item_names.sql, run on the local stand-in after phase 5.
CREATE TEMP TABLE _check (n serial, result text);

DO $$
DECLARE
  v_tool record;
  v_other record;
  v_request public.vocab_removal_requests;
BEGIN
  PERFORM set_config('test.role', 'service_role', true);
  SELECT public_key, name INTO v_tool FROM public.tools WHERE public_key IS NOT NULL ORDER BY public_key LIMIT 1;
  SELECT public_key, name INTO v_other FROM public.tools WHERE public_key IS NOT NULL ORDER BY public_key OFFSET 1 LIMIT 1;

  v_request := public.vocab_request_removal(v_tool.public_key, 'check', v_other.public_key, 'toolio', 'staff@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN v_request.item_name = v_tool.name AND v_request.replacement_name = v_other.name
    THEN 'PASS request stores the item and replacement names' ELSE 'FAIL request names' END);
  PERFORM public.vocab_cancel_removal(v_request.id, 'toolio', 'staff@example.com');

  INSERT INTO _check (result) SELECT CASE
    WHEN count(*) = 0 THEN 'PASS every request has an item name' ELSE 'FAIL requests without names: ' || count(*) END
    FROM public.vocab_removal_requests WHERE item_name IS NULL;

  INSERT INTO _check (result) SELECT CASE
    WHEN public.vocab_item_name(k.public_key) IS NOT NULL THEN 'PASS a removed item keeps its name from the change feed'
    ELSE 'FAIL removed item name' END
    FROM public.vocab_keys k
    WHERE k.removed_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.vocab_change_events e WHERE e.public_key = k.public_key AND e.change_kind = 'upsert' AND e.payload ? 'name')
    LIMIT 1;
END $$;

SELECT result FROM _check ORDER BY n;
