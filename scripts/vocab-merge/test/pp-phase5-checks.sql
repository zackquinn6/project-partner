-- Checks for the phase 5 proposals migration, run on the local stand-in after phase 3.
CREATE TEMP TABLE _check (n serial, result text);
INSERT INTO public._test_name_keys (name, name_key)
SELECT v.name, v.name_key
FROM (VALUES ('Proposal Test Saw', 'proposal test saw'), ('Proposal Test Glue', 'proposal test glue')) AS v (name, name_key)
WHERE NOT EXISTS (SELECT 1 FROM public._test_name_keys k WHERE k.name = v.name);

DO $$
DECLARE
  v_proposal public.vocab_term_proposals;
  v_existing text;
BEGIN
  PERFORM set_config('test.role', 'service_role', true);
  v_proposal := public.vocab_propose_term('tool', 'proposal-test-saw', 'Proposal Test Saw', 'From Toolio', 'inventory_core', gen_random_uuid(), 'staff@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN v_proposal.status = 'open' AND EXISTS (SELECT 1 FROM public.vocab_change_events WHERE change_kind = 'term_proposal')
     AND EXISTS (SELECT 1 FROM public.notifications WHERE type = 'vocab_term_proposal')
    THEN 'PASS proposal recorded, emitted, and notified' ELSE 'FAIL proposal' END);

  PERFORM set_config('test.is_admin', 'true', true);
  v_proposal := public.vocab_decide_proposal(v_proposal.id, 'approve', NULL, 'tool', 'Power Tool', 3, 'admin@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN v_proposal.status = 'approved' AND v_proposal.result_key = 'proposal-test-saw'
     AND EXISTS (SELECT 1 FROM public.tools WHERE public_key = 'proposal-test-saw' AND specialty_scale = 3)
    THEN 'PASS approve adds a new tool' ELSE 'FAIL approve' END);

  v_proposal := public.vocab_propose_term('project', 'proposal-test-project', 'Proposal Test Project', NULL, 'project', gen_random_uuid(), 'staff@example.com');
  SELECT public_key INTO v_existing FROM public.projects WHERE public_key IS NOT NULL ORDER BY public_key LIMIT 1;
  v_proposal := public.vocab_decide_proposal(v_proposal.id, 'map', v_existing, NULL, NULL, NULL, 'admin@example.com');
  INSERT INTO _check (result) VALUES (CASE
    WHEN v_proposal.status = 'mapped' AND v_proposal.result_key = v_existing
     AND NOT EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = 'proposal-test-project')
    THEN 'PASS map points a proposal to an existing term' ELSE 'FAIL map' END);

  v_proposal := public.vocab_propose_term('material', 'proposal-test-glue', 'Proposal Test Glue', NULL, 'inventory_core', gen_random_uuid(), 'staff@example.com');
  BEGIN
    PERFORM public.vocab_decide_proposal(v_proposal.id, 'map', v_existing, NULL, NULL, NULL, 'admin@example.com');
    INSERT INTO _check (result) VALUES ('FAIL product mapped to a project');
  EXCEPTION WHEN others THEN
    INSERT INTO _check (result) VALUES ('PASS product cannot map to a project: ' || SQLERRM);
  END;
  v_proposal := public.vocab_cancel_proposal(v_proposal.id, 'staff@example.com');
  INSERT INTO _check (result) VALUES (CASE WHEN v_proposal.status = 'cancelled' THEN 'PASS Toolio cancels its proposal' ELSE 'FAIL cancel' END);

  v_proposal := public.vocab_cancel_proposal((SELECT id FROM public.vocab_term_proposals WHERE proposed_key = 'proposal-test-saw'), 'staff@example.com');
  INSERT INTO _check (result) VALUES (CASE WHEN v_proposal.status = 'approved'
    THEN 'PASS cancelling a decided proposal returns the decision' ELSE 'FAIL cancel after decision' END);

  INSERT INTO _check (result) VALUES (CASE
    WHEN public.vocab_snapshot() ? 'term_proposals' THEN 'PASS snapshot lists open proposals' ELSE 'FAIL snapshot proposals' END);
END $$;

SELECT result FROM _check ORDER BY n;
