-- =====================================================
-- MAKE ZACKQUINN6@GMAIL.COM AN ADMIN
-- This migration ensures ZackQuinn6@gmail.com has admin role
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  -- Try to find user by email (case-insensitive)
  SELECT id, email INTO v_user_id, v_email
  FROM auth.users
  WHERE LOWER(email) = LOWER('ZackQuinn6@gmail.com')
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User ZackQuinn6@gmail.com not found yet - they need to sign up first';
    RAISE NOTICE 'This migration will run again when the user signs up';
  ELSE
    RAISE NOTICE 'Found user: % (email: %)', v_user_id, v_email;
    
    -- Remove any existing conflicting roles (member, non_member, user, project_owner)
    -- Keep admin role if it exists
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id
    AND role IN ('member', 'non_member', 'user', 'project_owner');
    
    -- Add admin role (or update if it already exists)
    INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
    VALUES (v_user_id, 'admin', NOW(), NOW())
    ON CONFLICT (user_id, role) 
    DO UPDATE SET updated_at = NOW();
    
    RAISE NOTICE '✅ Successfully granted admin role to % (user_id: %)', v_email, v_user_id;
  END IF;
END $$;

