-- Merge user_roles into user_profiles: add roles array and migrate data, then drop user_roles.

-- 1. Add roles column to user_profiles (array of role strings; default includes 'user')
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY['user']::text[];

-- 2. Migrate: set roles from user_roles for each user (aggregate all roles per user)
UPDATE user_profiles up
SET roles = sub.roles
FROM (
  SELECT user_id, array_agg(DISTINCT role ORDER BY role) AS roles
  FROM user_roles
  GROUP BY user_id
) sub
WHERE up.user_id = sub.user_id;

-- 3. Ensure every user has at least 'user' in roles (no empty array)
UPDATE user_profiles
SET roles = array_append(roles, 'user')
WHERE NOT ('user' = ANY(roles));

-- 4. Drop the user_roles table
DROP TABLE IF EXISTS user_roles;
