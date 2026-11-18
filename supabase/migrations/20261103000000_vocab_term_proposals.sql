-- Project Partner and Toolio vocabulary link, phase 5 (Project Partner side, one migration).
-- Toolio proposes a term when it adds a product or project that matches no shared term by name.
-- A Project Partner admin adds it as a new term or points it to an existing one (two-step).
-- Re-runnable; apply in one run.

BEGIN;

CREATE TABLE IF NOT EXISTS public.vocab_term_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL CHECK (entity IN ('tool', 'material', 'project')),
  proposed_key text NOT NULL CHECK (proposed_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  proposed_name text NOT NULL,
  description text,
  requested_by text NOT NULL,
  toolio_item_kind text NOT NULL CHECK (toolio_item_kind IN ('inventory_core', 'project')),
  toolio_item_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'mapped', 'cancelled')),
  result_key text REFERENCES public.vocab_keys (public_key),
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status IN ('approved', 'mapped')) = (result_key IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS vocab_term_proposals_one_open_per_item
  ON public.vocab_term_proposals (toolio_item_kind, toolio_item_id) WHERE status = 'open';

ALTER TABLE public.vocab_term_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vocab_term_proposals_select ON public.vocab_term_proposals;
CREATE POLICY vocab_term_proposals_select ON public.vocab_term_proposals FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.vocab_change_events DROP CONSTRAINT IF EXISTS vocab_change_events_change_kind_check;
ALTER TABLE public.vocab_change_events
  ADD CONSTRAINT vocab_change_events_change_kind_check
  CHECK (change_kind IN ('upsert', 'remove', 'removal_request', 'term_proposal'));

-- Toolio no longer creates terms directly; proposals replace it.
DROP FUNCTION IF EXISTS public.vocab_create_term(text, text, text, text, text, integer, text);

CREATE OR REPLACE FUNCTION public.vocab_emit_proposal(p_proposal public.vocab_term_proposals)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.vocab_change_events (entity, public_key, change_kind, payload)
  VALUES (p_proposal.entity, p_proposal.proposed_key, 'term_proposal', to_jsonb(p_proposal))
$$;

-- Toolio (through project-partner-vocab) proposes a term for an item that matched none by name.
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
    'Toolio proposes a new term',
    format('Toolio added "%s" (%s). Add it as a new term or use an existing one in Requests.', p_name, p_entity),
    jsonb_build_object('proposal_id', v_proposal.id, 'proposed_key', p_key)
  );
  RETURN v_proposal;
END;
$$;

-- A Project Partner admin resolves a proposal: 'approve' adds it as a new term, 'map' points it to an existing term.
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
    RAISE EXCEPTION 'Proposal % is not open', p_proposal_id;
  END IF;

  IF p_decision = 'map' THEN
    SELECT * INTO v_existing FROM public.vocab_keys WHERE public_key = p_existing_key;
    IF NOT FOUND OR v_existing.removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'No current term with key %', p_existing_key;
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
      RAISE EXCEPTION 'The key % is taken. Use an existing term instead.', v_proposal.proposed_key;
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

-- A proposal Project Partner already decided is returned unchanged, so Toolio's mirror records the decision.
CREATE OR REPLACE FUNCTION public.vocab_cancel_proposal(p_proposal_id uuid, p_requested_by text)
RETURNS public.vocab_term_proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.vocab_term_proposals%ROWTYPE;
BEGIN
  PERFORM public.vocab_assert_caller('toolio');
  UPDATE public.vocab_term_proposals
    SET status = 'cancelled', decided_by = p_requested_by, decided_at = now(), updated_at = now()
    WHERE id = p_proposal_id AND status = 'open'
    RETURNING * INTO v_proposal;
  IF FOUND THEN
    PERFORM public.vocab_emit_proposal(v_proposal);
    RETURN v_proposal;
  END IF;
  SELECT * INTO v_proposal FROM public.vocab_term_proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown proposal %', p_proposal_id;
  END IF;
  RETURN v_proposal;
END;
$$;

-- Snapshot also carries open proposals.
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
                         FROM public.vocab_removal_requests r WHERE r.status = 'open'),
    'term_proposals', (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at)
                       FROM public.vocab_term_proposals p WHERE p.status = 'open')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.vocab_emit_proposal(public.vocab_term_proposals) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_propose_term(text, text, text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vocab_cancel_proposal(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vocab_propose_term(text, text, text, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vocab_cancel_proposal(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.vocab_decide_proposal(uuid, text, text, text, text, integer, text) TO authenticated;

COMMIT;
