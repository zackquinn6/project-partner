-- Verify admin status for zackquinn6@gmail.com

-- Check if user exists and get their roles
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  ur.role,
  ur.created_at as role_created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'zackquinn6@gmail.com';

-- Check all roles for this user
SELECT 
  'All roles for user' as info,
  role,
  created_at,
  updated_at
FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'zackquinn6@gmail.com'
);

-- Count total admin users
SELECT 
  'Total admin users' as info,
  COUNT(*) as count
FROM public.user_roles
WHERE role = 'admin';

