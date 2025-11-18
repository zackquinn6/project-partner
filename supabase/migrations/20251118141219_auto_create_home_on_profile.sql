-- Update the handle_new_user function to automatically create a home when a profile is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_home_id UUID;
BEGIN
  -- Create the profile
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );

  -- Automatically create a home for the new user
  -- The home will have minimal info but will allow project kickoff to point to it
  INSERT INTO public.homes (user_id, name, is_primary)
  VALUES (
    NEW.id,
    'My Home',
    true
  )
  RETURNING id INTO new_home_id;

  -- Automatically add admin role for ZackQuinn6@gmail.com
  IF NEW.email = 'ZackQuinn6@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

