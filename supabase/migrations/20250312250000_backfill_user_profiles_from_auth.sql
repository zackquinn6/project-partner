-- One-time backfill: copy auth.users that have no user_profiles row into user_profiles.
-- Runs inside SECURITY DEFINER so we have permission to read auth.users (migration runner may not).

CREATE OR REPLACE FUNCTION public.backfill_user_profiles_from_auth()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  -- Insert only columns that exist: user_id and roles (required). Optionally set full_name/nickname if present.
  INSERT INTO public.user_profiles (user_id, roles)
  SELECT
    au.id,
    ARRAY['user']::text[]
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id
  );
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

SELECT public.backfill_user_profiles_from_auth();

DROP FUNCTION public.backfill_user_profiles_from_auth();
