-- Removal requests keep the human name of the item (and its replacement) so a request still reads
-- correctly after the item is removed. Shared-vocabulary messages say "item" instead of "term".
-- Re-runnable; apply in one run.

BEGIN;

ALTER TABLE public.vocab_removal_requests ADD COLUMN IF NOT EXISTS item_name text;
ALTER TABLE public.vocab_removal_requests ADD COLUMN IF NOT EXISTS replacement_name text;

-- Current name for a live item, else the name in its last change event (removed items).
CREATE OR REPLACE FUNCTION public.vocab_item_name(p_key text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = p_key AND removed_at IS NULL) THEN
    v_name := public.vocab_term_payload(p_key)->>'name';
  ELSE
    SELECT e.payload->>'name' INTO v_name
    FROM public.vocab_change_events e
    WHERE e.public_key = p_key AND e.change_kind = 'upsert' AND e.payload ? 'name'
    ORDER BY e.seq DESC
    LIMIT 1;
  END IF;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'No name recorded for shared item %', p_key;
  END IF;
  RETURN v_name;
END;
$$;
REVOKE ALL ON FUNCTION public.vocab_item_name(text) FROM PUBLIC, anon, authenticated;

UPDATE public.vocab_removal_requests
  SET item_name = public.vocab_item_name(public_key)
  WHERE item_name IS NULL;
UPDATE public.vocab_removal_requests
  SET replacement_name = public.vocab_item_name(replacement_key)
  WHERE replacement_key IS NOT NULL AND replacement_name IS NULL;

ALTER TABLE public.vocab_removal_requests ALTER COLUMN item_name SET NOT NULL;
ALTER TABLE public.vocab_removal_requests DROP CONSTRAINT IF EXISTS vocab_removal_requests_replacement_name;
ALTER TABLE public.vocab_removal_requests
  ADD CONSTRAINT vocab_removal_requests_replacement_name CHECK ((replacement_key IS NULL) = (replacement_name IS NULL));

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
    RAISE EXCEPTION 'No current shared item %', p_key;
  END IF;
  IF p_replacement_key IS NOT NULL THEN
    SELECT * INTO v_replacement FROM public.vocab_keys WHERE public_key = p_replacement_key;
    IF NOT FOUND OR v_replacement.removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'No current shared item %', p_replacement_key;
    END IF;
    IF v_replacement.entity <> v_key.entity THEN
      RAISE EXCEPTION 'The replacement must also be a %', v_key.entity;
    END IF;
  END IF;
  INSERT INTO public.vocab_removal_requests (
    public_key, item_name, requested_by_app, requested_by_email, reason, replacement_key, replacement_name,
    pp_decision, pp_decided_by, pp_decided_at, toolio_decision, toolio_decided_by, toolio_decided_at
  ) VALUES (
    p_key, public.vocab_item_name(p_key), p_app, p_email, p_reason, p_replacement_key,
    CASE WHEN p_replacement_key IS NOT NULL THEN public.vocab_item_name(p_replacement_key) END,
    CASE WHEN p_app = 'pp' THEN 'approve' END, CASE WHEN p_app = 'pp' THEN p_email END, CASE WHEN p_app = 'pp' THEN now() END,
    CASE WHEN p_app = 'toolio' THEN 'approve' END, CASE WHEN p_app = 'toolio' THEN p_email END, CASE WHEN p_app = 'toolio' THEN now() END
  )
  RETURNING * INTO v_request;
  PERFORM public.vocab_emit_request(v_request);
  IF p_app = 'toolio' THEN
    PERFORM public.notifications_notify_admins(
      'vocab_removal_request',
      'Toolio asks to remove a shared item',
      format('Toolio no longer uses "%s" (%s). Remove or keep it in Requests.', v_request.item_name, v_key.entity),
      jsonb_build_object('request_id', v_request.id, 'public_key', p_key)
    );
  END IF;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_propose_term(
  p_entity text, p_key text, p_name text, p_description text, p_item_kind text, p_item_id uuid, p_requested_by text
)
RETURNS public.vocab_term_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.vocab_term_proposals%ROWTYPE;
BEGIN
  PERFORM public.vocab_assert_caller('toolio');
  INSERT INTO public.vocab_term_proposals (entity, proposed_key, proposed_name, description, requested_by, toolio_item_kind, toolio_item_id)
  VALUES (p_entity, p_key, p_name, p_description, p_requested_by, p_item_kind, p_item_id)
  RETURNING * INTO v_proposal;
  PERFORM public.vocab_emit_proposal(v_proposal);
  PERFORM public.notifications_notify_admins(
    'vocab_term_proposal',
    'Toolio added a new item',
    format('Toolio added "%s" (%s). Add it as a new item or use an existing one in Requests.', p_name, p_entity),
    jsonb_build_object('proposal_id', v_proposal.id, 'proposed_key', p_key)
  );
  RETURN v_proposal;
END;
$$;

CREATE OR REPLACE FUNCTION public.vocab_decide_proposal(
  p_proposal_id uuid, p_decision text, p_existing_key text, p_entity text, p_category text, p_specialty_scale integer, p_email text
)
RETURNS public.vocab_term_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.vocab_term_proposals%ROWTYPE;
  v_existing public.vocab_keys%ROWTYPE;
  v_result text;
BEGIN
  PERFORM public.vocab_assert_caller('pp');
  SELECT * INTO v_proposal FROM public.vocab_term_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND OR v_proposal.status <> 'open' THEN
    RAISE EXCEPTION 'This new item was already handled';
  END IF;

  IF p_decision = 'map' THEN
    SELECT * INTO v_existing FROM public.vocab_keys WHERE public_key = p_existing_key;
    IF NOT FOUND OR v_existing.removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'No current shared item %', p_existing_key;
    END IF;
    IF v_proposal.toolio_item_kind = 'inventory_core' AND v_existing.entity NOT IN ('tool', 'material') THEN
      RAISE EXCEPTION 'A Toolio product needs a tool or material';
    END IF;
    IF v_proposal.toolio_item_kind = 'project' AND v_existing.entity NOT IN ('project', 'category') THEN
      RAISE EXCEPTION 'A Toolio project needs a project or category';
    END IF;
    v_result := p_existing_key;
  ELSIF p_decision = 'approve' THEN
    IF EXISTS (SELECT 1 FROM public.vocab_keys WHERE public_key = v_proposal.proposed_key) THEN
      RAISE EXCEPTION 'An item named "%" already exists. Use the existing item instead.', v_proposal.proposed_name;
    END IF;
    IF v_proposal.toolio_item_kind = 'inventory_core' AND p_entity NOT IN ('tool', 'material') THEN
      RAISE EXCEPTION 'Choose tool or material';
    END IF;
    INSERT INTO public.vocab_keys (public_key, entity)
      VALUES (v_proposal.proposed_key, CASE WHEN v_proposal.toolio_item_kind = 'project' THEN 'project' ELSE p_entity END);
    IF v_proposal.toolio_item_kind = 'project' THEN
      INSERT INTO public.projects (name, description, category, publish_status, visibility_status, public_key)
        VALUES (v_proposal.proposed_name, v_proposal.description, ARRAY[]::text[], 'draft', 'coming-soon', v_proposal.proposed_key);
    ELSIF p_entity = 'tool' THEN
      INSERT INTO public.tools (name, description, category, specialty_scale, public_key)
        VALUES (v_proposal.proposed_name, v_proposal.description, p_category, p_specialty_scale, v_proposal.proposed_key);
    ELSE
      INSERT INTO public.materials (name, description, category, public_key)
        VALUES (v_proposal.proposed_name, v_proposal.description, p_category, v_proposal.proposed_key);
    END IF;
    v_result := v_proposal.proposed_key;
  ELSE
    RAISE EXCEPTION 'Decision must be approve or map';
  END IF;

  UPDATE public.vocab_term_proposals
    SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'mapped' END,
        result_key = v_result, decided_by = p_email, decided_at = now(), updated_at = now()
    WHERE id = p_proposal_id
    RETURNING * INTO v_proposal;
  PERFORM public.vocab_emit_proposal(v_proposal);
  RETURN v_proposal;
END;
$$;

COMMIT;
