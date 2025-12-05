-- Make zackquinn6@gmail.com an admin
-- This migration grants admin privileges

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'zackquinn6@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User zackquinn6@gmail.com not found yet - they need to sign up first';
  ELSE
    -- Remove any existing non_member or member roles
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
    AND role IN ('member', 'non_member');
    
    -- Add admin role
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (v_user_id, 'admin', NOW(), NOW())
    ON CONFLICT (user_id, role) DO UPDATE
    SET updated_at = NOW();
    
    RAISE NOTICE 'Successfully granted admin role to zackquinn6@gmail.com (user_id: %)', v_user_id;
  END IF;
END $$;

