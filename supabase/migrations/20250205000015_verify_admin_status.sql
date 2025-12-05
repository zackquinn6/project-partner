-- Diagnostic: Verify admin status for zackquinn6@gmail.com

DO $$
DECLARE
  v_user_id UUID;
  v_role_count INTEGER;
  v_roles TEXT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'zackquinn6@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ ERROR: User zackquinn6@gmail.com NOT FOUND in auth.users';
    RAISE NOTICE 'You need to sign up first!';
  ELSE
    RAISE NOTICE '✅ User found: %', v_user_id;
    
    -- Check roles
    SELECT COUNT(*) INTO v_role_count
    FROM public.user_roles
    WHERE user_id = v_user_id;
    
    RAISE NOTICE 'Total roles for user: %', v_role_count;
    
    -- List all roles
    FOR v_roles IN 
      SELECT role 
      FROM public.user_roles 
      WHERE user_id = v_user_id
    LOOP
      RAISE NOTICE '  - Role: %', v_roles;
    END LOOP;
    
    -- Check specifically for admin
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = v_user_id AND role = 'admin'
    ) THEN
      RAISE NOTICE '✅ ADMIN ROLE IS PRESENT';
    ELSE
      RAISE NOTICE '❌ ADMIN ROLE IS MISSING - Adding it now...';
      
      -- Add admin role
      INSERT INTO public.user_roles (user_id, role, created_at, updated_at)
      VALUES (v_user_id, 'admin', NOW(), NOW())
      ON CONFLICT (user_id, role) DO UPDATE
      SET updated_at = NOW();
      
      RAISE NOTICE '✅ Admin role added successfully';
    END IF;
  END IF;
END $$;

-- Final verification - show current state
SELECT 
  'CURRENT STATUS:' as status,
  u.email,
  STRING_AGG(ur.role, ', ') as roles
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'zackquinn6@gmail.com'
GROUP BY u.email;

