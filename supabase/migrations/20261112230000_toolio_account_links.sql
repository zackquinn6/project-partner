-- Shared login: admins link or unlink a Project Partner account and a Toolio account.
-- The link is the account's `custom:toolio` identity (provider_id = the Toolio user id, the OIDC `sub`),
-- the same row Supabase creates when someone signs in with Toolio. Signing in with that Toolio account
-- then always opens this account, even when the emails differ.
-- Callable only by service_role (the toolio-account and project-partner-vocab edge functions).
-- Re-runnable.

BEGIN;

-- Every current link.
CREATE OR REPLACE FUNCTION public.toolio_account_links()
RETURNS TABLE (user_id uuid, user_email text, toolio_user_id text, toolio_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT i.user_id, u.email::text, i.provider_id, (i.identity_data->>'email')
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE i.provider = 'custom:toolio'
  ORDER BY u.email
$$;

-- The account with exactly this email, or NULL.
CREATE OR REPLACE FUNCTION public.toolio_find_user_id(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id FROM auth.users u WHERE lower(u.email) = lower(btrim(p_email))
$$;

CREATE OR REPLACE FUNCTION public.toolio_link_account(p_user_id uuid, p_toolio_user_id text, p_toolio_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_other_user uuid;
  v_current text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'No Project Partner account %', p_user_id;
  END IF;
  IF p_toolio_user_id IS NULL OR btrim(p_toolio_user_id) = '' OR p_toolio_email IS NULL OR btrim(p_toolio_email) = '' THEN
    RAISE EXCEPTION 'A Toolio account id and email are required';
  END IF;

  SELECT user_id INTO v_other_user FROM auth.identities
    WHERE provider = 'custom:toolio' AND provider_id = p_toolio_user_id;
  IF v_other_user = p_user_id THEN
    RETURN;
  END IF;
  IF v_other_user IS NOT NULL THEN
    RAISE EXCEPTION 'That Toolio account is already linked to %', (SELECT email FROM auth.users WHERE id = v_other_user);
  END IF;

  SELECT identity_data->>'email' INTO v_current FROM auth.identities
    WHERE provider = 'custom:toolio' AND user_id = p_user_id;
  IF FOUND THEN
    RAISE EXCEPTION 'This account is already linked to Toolio account %. Unlink it first.', v_current;
  END IF;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    p_toolio_user_id,
    p_user_id,
    jsonb_build_object('sub', p_toolio_user_id, 'email', lower(btrim(p_toolio_email)), 'email_verified', true),
    'custom:toolio',
    now(),
    now()
  );

  UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('providers', (
          SELECT jsonb_agg(DISTINCT p ORDER BY p)
          FROM (SELECT jsonb_array_elements_text(raw_app_meta_data->'providers') AS p UNION SELECT 'custom:toolio') s
        )),
        updated_at = now()
    WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.toolio_unlink_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider = 'custom:toolio' AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'This account is not linked to Toolio';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider <> 'custom:toolio' AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'This account signs in only with Toolio, so it cannot be unlinked';
  END IF;

  DELETE FROM auth.identities WHERE provider = 'custom:toolio' AND user_id = p_user_id;

  UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('providers', (
          SELECT jsonb_agg(p ORDER BY p)
          FROM jsonb_array_elements_text(raw_app_meta_data->'providers') AS p
          WHERE p <> 'custom:toolio'
        )),
        updated_at = now()
    WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.toolio_account_links() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toolio_find_user_id(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toolio_link_account(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toolio_unlink_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toolio_account_links() TO service_role;
GRANT EXECUTE ON FUNCTION public.toolio_find_user_id(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.toolio_link_account(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.toolio_unlink_account(uuid) TO service_role;

COMMIT;
