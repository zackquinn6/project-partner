-- Seed trade foundation: Tile Flooring Installation is foundational;
-- Tile Backsplash and Tile Shower/Bath build on it (linked phases).
-- Match by catalog name + revision root (parent_project_id IS NULL).
-- Does not seed hidden operations — configure show/hide in admin Structure Manager.
-- Apply AFTER supabase/migrations/20260911190000_foundational_catalog_projects.sql

DO $$
DECLARE
  v_flooring_id uuid;
  v_backsplash_id uuid;
  v_shower_id uuid;
  v_foundation_live uuid;
BEGIN
  SELECT p.id INTO v_flooring_id
  FROM public.projects p
  WHERE p.parent_project_id IS NULL
    AND COALESCE(p.is_standard, false) = false
    AND (
      lower(p.name) = 'tile flooring installation'
      OR (p.name ILIKE '%tile%' AND p.name ILIKE '%floor%')
    )
  ORDER BY
    CASE WHEN lower(p.name) = 'tile flooring installation' THEN 0 ELSE 1 END,
    p.updated_at DESC
  LIMIT 1;

  IF v_flooring_id IS NULL THEN
    RAISE NOTICE 'Tile Flooring Installation root not found; skipping foundational seed';
    RETURN;
  END IF;

  v_foundation_live := public.latest_published_in_family(v_flooring_id);

  UPDATE public.projects
  SET is_foundational = true,
      foundation_project_id = NULL,
      updated_at = now()
  WHERE id = v_flooring_id
     OR parent_project_id = v_flooring_id;

  SELECT p.id INTO v_backsplash_id
  FROM public.projects p
  WHERE p.parent_project_id IS NULL
    AND COALESCE(p.is_standard, false) = false
    AND p.id <> v_flooring_id
    AND (
      lower(p.name) LIKE 'tile backsplash%'
      OR (p.name ILIKE '%tile%' AND p.name ILIKE '%backsplash%')
    )
  ORDER BY
    CASE WHEN lower(p.name) LIKE 'tile backsplash%' THEN 0 ELSE 1 END,
    p.updated_at DESC
  LIMIT 1;

  SELECT p.id INTO v_shower_id
  FROM public.projects p
  WHERE p.parent_project_id IS NULL
    AND COALESCE(p.is_standard, false) = false
    AND p.id <> v_flooring_id
    AND p.id IS DISTINCT FROM v_backsplash_id
    AND (
      lower(p.name) LIKE 'tile shower%'
      OR lower(p.name) LIKE 'tile bath%'
      OR (p.name ILIKE '%tile%' AND (p.name ILIKE '%shower%' OR p.name ILIKE '%bath%'))
    )
  ORDER BY
    CASE
      WHEN lower(p.name) LIKE 'tile shower%' THEN 0
      WHEN lower(p.name) LIKE 'tile bath%' THEN 1
      ELSE 2
    END,
    p.updated_at DESC
  LIMIT 1;

  IF v_backsplash_id IS NOT NULL THEN
    DELETE FROM public.project_phases pp
    WHERE pp.project_id = v_backsplash_id
      AND COALESCE(pp.is_standard, false) = false
      AND pp.source_project_id IS NULL
      AND lower(trim(pp.name)) IN (
        SELECT lower(trim(fp.name))
        FROM public.project_phases fp
        WHERE fp.project_id = v_foundation_live
          AND NOT (
            COALESCE(fp.is_standard, false) = true
            AND COALESCE(fp.is_linked, false) = false
          )
      );

    UPDATE public.projects
    SET is_foundational = false,
        foundation_project_id = v_flooring_id,
        updated_at = now()
    WHERE id = v_backsplash_id;

    INSERT INTO public.project_phases (
      project_id, name, description, is_standard, is_linked,
      position_rule, position_value, source_project_id, source_phase_id
    )
    SELECT
      v_backsplash_id,
      fp.name,
      fp.description,
      false,
      true,
      'nth',
      (
        SELECT COALESCE(MAX(c.position_value), 2)
        FROM public.project_phases c
        WHERE c.project_id = v_backsplash_id AND c.position_rule = 'nth'
      ) + ROW_NUMBER() OVER (
        ORDER BY
          CASE
            WHEN fp.position_rule = 'nth' THEN COALESCE(fp.position_value, 999)
            WHEN fp.position_rule = 'last' THEN 2147483647
            ELSE 999
          END ASC,
          fp.created_at ASC
      ),
      v_foundation_live,
      fp.id
    FROM public.project_phases fp
    WHERE fp.project_id = v_foundation_live
      AND NOT (
        COALESCE(fp.is_standard, false) = true
        AND COALESCE(fp.is_linked, false) = false
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.project_phases c
        WHERE c.project_id = v_backsplash_id
          AND (
            c.source_phase_id = fp.id
            OR lower(trim(c.name)) = lower(trim(fp.name))
          )
      );

    PERFORM public.rebuild_phases_json_from_project_phases_internal(v_backsplash_id);
    RAISE NOTICE 'Attached Tile Backsplash % onto flooring foundation %', v_backsplash_id, v_flooring_id;
  ELSE
    RAISE NOTICE 'Tile Backsplash root not found; skipped';
  END IF;

  IF v_shower_id IS NOT NULL THEN
    DELETE FROM public.project_phases pp
    WHERE pp.project_id = v_shower_id
      AND COALESCE(pp.is_standard, false) = false
      AND pp.source_project_id IS NULL
      AND lower(trim(pp.name)) IN (
        SELECT lower(trim(fp.name))
        FROM public.project_phases fp
        WHERE fp.project_id = v_foundation_live
          AND NOT (
            COALESCE(fp.is_standard, false) = true
            AND COALESCE(fp.is_linked, false) = false
          )
      );

    UPDATE public.projects
    SET is_foundational = false,
        foundation_project_id = v_flooring_id,
        updated_at = now()
    WHERE id = v_shower_id;

    INSERT INTO public.project_phases (
      project_id, name, description, is_standard, is_linked,
      position_rule, position_value, source_project_id, source_phase_id
    )
    SELECT
      v_shower_id,
      fp.name,
      fp.description,
      false,
      true,
      'nth',
      (
        SELECT COALESCE(MAX(c.position_value), 2)
        FROM public.project_phases c
        WHERE c.project_id = v_shower_id AND c.position_rule = 'nth'
      ) + ROW_NUMBER() OVER (
        ORDER BY
          CASE
            WHEN fp.position_rule = 'nth' THEN COALESCE(fp.position_value, 999)
            WHEN fp.position_rule = 'last' THEN 2147483647
            ELSE 999
          END ASC,
          fp.created_at ASC
      ),
      v_foundation_live,
      fp.id
    FROM public.project_phases fp
    WHERE fp.project_id = v_foundation_live
      AND NOT (
        COALESCE(fp.is_standard, false) = true
        AND COALESCE(fp.is_linked, false) = false
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.project_phases c
        WHERE c.project_id = v_shower_id
          AND (
            c.source_phase_id = fp.id
            OR lower(trim(c.name)) = lower(trim(fp.name))
          )
      );

    PERFORM public.rebuild_phases_json_from_project_phases_internal(v_shower_id);
    RAISE NOTICE 'Attached Tile Shower/Bath % onto flooring foundation %', v_shower_id, v_flooring_id;
  ELSE
    RAISE NOTICE 'Tile Shower/Bath root not found; skipped';
  END IF;
END $$;
