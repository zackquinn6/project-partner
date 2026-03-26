-- Drop `_v2` suffix from three RPC functions.
-- This is a rename (no behavior change), plus dropping any reversed-arg overloads that can break PostgREST RPC resolution.

-- 1) create_project_revision_v2 -> create_project_revision
DROP FUNCTION IF EXISTS public.create_project_revision_v2(new_name text, p_source_project_id uuid);
DO $$
DECLARE
  r_v2 RECORD;
  r_tgt RECORD;
BEGIN
  -- Only run if at least one _v2 overload exists.
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_revision_v2'
  ) THEN
    -- Rename any existing (non-v2) overload(s) to a legacy name to avoid collisions.
    FOR r_tgt IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_revision'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p2
        JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
        WHERE n2.nspname = 'public'
          AND p2.proname = 'create_project_revision__legacy_v2rename'
          AND pg_get_function_identity_arguments(p2.oid) = r_tgt.args
      ) THEN
        EXECUTE format(
          'ALTER FUNCTION public.create_project_revision(%s) RENAME TO create_project_revision__legacy_v2rename',
          r_tgt.args
        );
      END IF;
    END LOOP;

    -- Rename all _v2 overload(s) to the non-v2 target name.
    FOR r_v2 IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_revision_v2'
    LOOP
      EXECUTE format(
        'ALTER FUNCTION public.create_project_revision_v2(%s) RENAME TO create_project_revision',
        r_v2.args
      );
    END LOOP;
  END IF;
END
$$;

-- 2) create_project_run_snapshot_v2 -> create_project_run_snapshot
DO $$
DECLARE
  r_v2 RECORD;
  r_tgt RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_run_snapshot_v2'
  ) THEN
    FOR r_tgt IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_run_snapshot'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p2
        JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
        WHERE n2.nspname = 'public'
          AND p2.proname = 'create_project_run_snapshot__legacy_v2rename'
          AND pg_get_function_identity_arguments(p2.oid) = r_tgt.args
      ) THEN
        EXECUTE format(
          'ALTER FUNCTION public.create_project_run_snapshot(%s) RENAME TO create_project_run_snapshot__legacy_v2rename',
          r_tgt.args
        );
      END IF;
    END LOOP;

    FOR r_v2 IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_run_snapshot_v2'
    LOOP
      EXECUTE format(
        'ALTER FUNCTION public.create_project_run_snapshot_v2(%s) RENAME TO create_project_run_snapshot',
        r_v2.args
      );
    END LOOP;
  END IF;
END
$$;

-- 3) create_project_with_standard_foundation_v2 -> create_project_with_standard_foundation
DO $$
DECLARE
  r_v2 RECORD;
  r_tgt RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_with_standard_foundation_v2'
  ) THEN
    FOR r_tgt IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_with_standard_foundation'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p2
        JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
        WHERE n2.nspname = 'public'
          AND p2.proname = 'create_project_with_standard_foundation__legacy_v2rename'
          AND pg_get_function_identity_arguments(p2.oid) = r_tgt.args
      ) THEN
        EXECUTE format(
          'ALTER FUNCTION public.create_project_with_standard_foundation(%s) RENAME TO create_project_with_standard_foundation__legacy_v2rename',
          r_tgt.args
        );
      END IF;
    END LOOP;

    FOR r_v2 IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_with_standard_foundation_v2'
    LOOP
      EXECUTE format(
        'ALTER FUNCTION public.create_project_with_standard_foundation_v2(%s) RENAME TO create_project_with_standard_foundation',
        r_v2.args
      );
    END LOOP;
  END IF;
END
$$;

-- Drop `_v2` suffix from three RPC functions.
-- This is a rename (no behavior change), plus dropping any reversed-arg overloads that can break PostgREST RPC resolution.

-- 1) create_project_revision_v2 -> create_project_revision
DROP FUNCTION IF EXISTS public.create_project_revision_v2(new_name text, p_source_project_id uuid);
DO $$
DECLARE
  r_v2 RECORD;
  r_tgt RECORD;
BEGIN
  -- Only run if at least one _v2 overload exists.
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_revision_v2'
  ) THEN
    -- Rename any existing (non-v2) overload(s) to a legacy name to avoid collisions.
    FOR r_tgt IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_revision'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p2
        JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
        WHERE n2.nspname = 'public'
          AND p2.proname = 'create_project_revision__legacy_v2rename'
          AND pg_get_function_identity_arguments(p2.oid) = r_tgt.args
      ) THEN
        EXECUTE format(
          'ALTER FUNCTION public.create_project_revision(%s) RENAME TO create_project_revision__legacy_v2rename',
          r_tgt.args
        );
      END IF;
    END LOOP;

    -- Rename all _v2 overload(s) to the non-v2 target name.
    FOR r_v2 IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_revision_v2'
    LOOP
      EXECUTE format(
        'ALTER FUNCTION public.create_project_revision_v2(%s) RENAME TO create_project_revision',
        r_v2.args
      );
    END LOOP;
  END IF;
END
$$;

-- 2) create_project_run_snapshot_v2 -> create_project_run_snapshot
DO $$
DECLARE
  r_v2 RECORD;
  r_tgt RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_run_snapshot_v2'
  ) THEN
    FOR r_tgt IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_run_snapshot'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p2
        JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
        WHERE n2.nspname = 'public'
          AND p2.proname = 'create_project_run_snapshot__legacy_v2rename'
          AND pg_get_function_identity_arguments(p2.oid) = r_tgt.args
      ) THEN
        EXECUTE format(
          'ALTER FUNCTION public.create_project_run_snapshot(%s) RENAME TO create_project_run_snapshot__legacy_v2rename',
          r_tgt.args
        );
      END IF;
    END LOOP;

    FOR r_v2 IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_run_snapshot_v2'
    LOOP
      EXECUTE format(
        'ALTER FUNCTION public.create_project_run_snapshot_v2(%s) RENAME TO create_project_run_snapshot',
        r_v2.args
      );
    END LOOP;
  END IF;
END
$$;

-- 3) create_project_with_standard_foundation_v2 -> create_project_with_standard_foundation
DO $$
DECLARE
  r_v2 RECORD;
  r_tgt RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_project_with_standard_foundation_v2'
  ) THEN
    FOR r_tgt IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_with_standard_foundation'
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p2
        JOIN pg_namespace n2 ON n2.oid = p2.pronamespace
        WHERE n2.nspname = 'public'
          AND p2.proname = 'create_project_with_standard_foundation__legacy_v2rename'
          AND pg_get_function_identity_arguments(p2.oid) = r_tgt.args
      ) THEN
        EXECUTE format(
          'ALTER FUNCTION public.create_project_with_standard_foundation(%s) RENAME TO create_project_with_standard_foundation__legacy_v2rename',
          r_tgt.args
        );
      END IF;
    END LOOP;

    FOR r_v2 IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'create_project_with_standard_foundation_v2'
    LOOP
      EXECUTE format(
        'ALTER FUNCTION public.create_project_with_standard_foundation_v2(%s) RENAME TO create_project_with_standard_foundation',
        r_v2.args
      );
    END LOOP;
  END IF;
END
$$;

