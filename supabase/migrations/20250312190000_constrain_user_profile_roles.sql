-- Constrain user_profiles.roles to the three allowed values:
--   - 'user'
--   - 'admin'
--   - 'project_owner'
--
-- This enforces that roles is a non-empty array and that every element
-- is one of the allowed role identifiers.

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_roles_allowed_values
  CHECK (
    roles IS NOT NULL
    AND array_length(roles, 1) > 0
    AND (
      SELECT bool_and(role = ANY (ARRAY['user', 'admin', 'project_owner']))
      FROM unnest(roles) AS role
    )
  );

