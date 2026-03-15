-- Project owner invitations: per-project invite with token; accept creates usage_agreement (project_owner) + project_owners row.
-- Also: allow agreement_type 'project_owner' in usage_agreements; ensure notifications table exists for in-app invites.

-- 1. Create project_owner_invitations (one row per invited user per project)
CREATE TABLE IF NOT EXISTS public.project_owner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz NOT NULL,
  terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_owner_invitations_token ON public.project_owner_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_project_owner_invitations_invited_user ON public.project_owner_invitations(invited_user_id) WHERE invited_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_owner_invitations_project ON public.project_owner_invitations(project_id);

-- One pending invitation per (project_id, invited_email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_owner_invitations_project_email_pending
  ON public.project_owner_invitations(project_id, invited_email)
  WHERE status = 'pending';

COMMENT ON TABLE public.project_owner_invitations IS 'Invitations to become project owner for a specific project. Accept flow creates usage_agreement (project_owner) and project_owners row.';

-- 1b. Ensure project_owners has unique (user_id, project_id) for ON CONFLICT in accept RPC
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_owners_user_project ON public.project_owners(user_id, project_id);

-- 2. Allow agreement_type 'project_owner' in usage_agreements (project_id required for project_owner)
DO $$
BEGIN
  ALTER TABLE public.usage_agreements DROP CONSTRAINT IF EXISTS usage_agreements_agreement_type_check;
  ALTER TABLE public.usage_agreements
    ADD CONSTRAINT usage_agreements_agreement_type_check
    CHECK (agreement_type IN ('liability', 'membership', 'project_owner'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.usage_agreements.agreement_type IS 'Type of agreement: liability, membership, or project_owner (per-project).';

-- 3. Ensure notifications table exists for in-app project owner invite notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

COMMENT ON TABLE public.notifications IS 'In-app notifications; metadata can hold link (e.g. accept-project-owner token).';

-- 4. RLS for project_owner_invitations: admins manage; invitee can read own (by token in accept flow we use service role or a policy that allows read by token)
ALTER TABLE public.project_owner_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_owner_invitations_admin_all ON public.project_owner_invitations;
CREATE POLICY project_owner_invitations_admin_all ON public.project_owner_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.roles @> '["admin"]'::jsonb
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.roles @> '["admin"]'::jsonb
    )
  );

-- Invitee can read their own invitation when they have the token (we use a function that accepts token and returns invitation if valid)
-- For accept page we will use an RPC or allow select where invitation_token = token (exposed via edge function or anon policy with token). Safer: use RPC get_project_owner_invitation_by_token(token) returning invitation + project name.
DROP POLICY IF EXISTS project_owner_invitations_invitee_by_token ON public.project_owner_invitations;
-- Allow read for the invited user when they are authenticated (so they can load the accept page after login)
CREATE POLICY project_owner_invitations_invitee_read ON public.project_owner_invitations
  FOR SELECT
  TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 5. RLS for notifications: users see only their own
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Service role can insert notifications (for invite flow from backend/edge function)
-- Admins inserting notifications for invitees: allow insert when inviter is admin (backend will set user_id to invitee)
DROP POLICY IF EXISTS notifications_insert_by_admin ON public.notifications;
CREATE POLICY notifications_insert_by_admin ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.roles @> '["admin"]'::jsonb
    )
  );

-- 7. RPC: get invitation by token (for accept page; only returns if pending and not expired)
CREATE OR REPLACE FUNCTION public.get_project_owner_invitation_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  project_name text,
  invited_email text,
  status text,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.project_id,
    p.name::text,
    i.invited_email,
    i.status,
    i.expires_at
  FROM public.project_owner_invitations i
  JOIN public.projects p ON p.id = i.project_id
  WHERE i.invitation_token = p_token
    AND i.status = 'pending'
    AND i.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: accept invitation (caller must be authenticated; invitation must be for their email/user and pending)
CREATE OR REPLACE FUNCTION public.accept_project_owner_invitation(p_invitation_id uuid)
RETURNS void AS $$
DECLARE
  v_invitation record;
  v_roles jsonb;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invitation
  FROM public.project_owner_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > now();

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or no longer valid';
  END IF;

  IF v_invitation.invited_user_id IS NOT NULL AND v_invitation.invited_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Invitation is for another user';
  END IF;

  IF v_invitation.invited_user_id IS NULL THEN
    IF (SELECT email FROM auth.users WHERE id = v_user_id) <> v_invitation.invited_email THEN
      RAISE EXCEPTION 'Invitation email does not match your account';
    END IF;
  END IF;

  -- Record usage_agreement (project_owner); full_name from profile or invitation email
  INSERT INTO public.usage_agreements (user_id, agreement_type, project_id, full_name, agreed_at, policy_version)
  SELECT
    v_user_id,
    'project_owner',
    v_invitation.project_id,
    COALESCE(up.display_name, up.full_name, up.nickname, v_invitation.invited_email),
    now(),
    v_invitation.terms_version
  FROM public.user_profiles up
  WHERE up.user_id = v_user_id;

  -- Add project_owners row (ignore if already exists)
  INSERT INTO public.project_owners (user_id, project_id, created_by)
  VALUES (v_user_id, v_invitation.project_id, v_invitation.invited_by)
  ON CONFLICT (user_id, project_id) DO NOTHING;

  -- Ensure project_owner role (roles is jsonb in user_profiles)
  SELECT up.roles INTO v_roles
  FROM public.user_profiles up
  WHERE up.user_id = v_user_id;

  IF v_roles IS NULL OR NOT (v_roles ? 'project_owner') THEN
    UPDATE public.user_profiles
    SET roles = CASE
      WHEN v_roles IS NULL THEN '["user", "project_owner"]'::jsonb
      ELSE (v_roles || '["project_owner"]'::jsonb)
    END
    WHERE user_id = v_user_id;
  END IF;

  -- Mark invitation accepted
  UPDATE public.project_owner_invitations
  SET status = 'accepted', invited_user_id = v_user_id, updated_at = now()
  WHERE id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
