-- Default home for every auth user at signup; backfill users who have none.

CREATE OR REPLACE FUNCTION public.create_default_home_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_home_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.homes WHERE user_id = p_user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.homes (user_id, name, is_primary)
  VALUES (p_user_id, 'My Home', true)
  RETURNING id INTO new_home_id;

  INSERT INTO public.home_details (home_id, home_ownership)
  VALUES (new_home_id, 'own');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_default_home()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_default_home_for_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_default_home ON auth.users;

CREATE TRIGGER on_auth_user_created_default_home
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user_default_home();

-- Users created before this migration
SELECT public.create_default_home_for_user(u.id)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.homes h WHERE h.user_id = u.id);
