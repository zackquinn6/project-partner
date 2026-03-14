-- 1) One-time backfill: copy auth.users that have no user_profiles row into user_profiles.
-- 2) Trigger: on every new auth user, insert a row into user_profiles so signups always get a profile.

-- One-time: insert missing users from auth.users into user_profiles (default role 'user').
INSERT INTO public.user_profiles (user_id, roles, full_name, nickname)
SELECT
  au.id,
  ARRAY['user']::text[],
  au.raw_user_meta_data->>'full_name',
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id
);

-- Function: create user_profiles row when a new auth user is inserted.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, roles, full_name, nickname)
  VALUES (
    NEW.id,
    ARRAY['user']::text[],
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS 'Creates a user_profiles row when a new user is inserted in auth.users. Default role: user.';

-- Trigger on auth.users so every new signup gets a user_profiles row.
DROP TRIGGER IF EXISTS on_auth_user_created_sync_user_profiles ON auth.users;

CREATE TRIGGER on_auth_user_created_sync_user_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
