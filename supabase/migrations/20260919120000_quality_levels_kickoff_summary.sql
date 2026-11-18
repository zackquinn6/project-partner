-- Kickoff Goals: short per-level quality explanation stored on each project.
-- Covered by existing project_quality_levels / project_run_quality_levels RLS.

ALTER TABLE public.project_quality_levels
  ADD COLUMN IF NOT EXISTS kickoff_summary text;

ALTER TABLE public.project_run_quality_levels
  ADD COLUMN IF NOT EXISTS kickoff_summary text;

COMMENT ON COLUMN public.project_quality_levels.kickoff_summary IS
  'Very short, project-specific explanation of this quality level for kickoff Goals.';

COMMENT ON COLUMN public.project_run_quality_levels.kickoff_summary IS
  'Frozen kickoff_summary from project_quality_levels at run create.';

-- Tile Flooring Installation: author kickoff blurbs for each level.
DO $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'tile flooring installation'
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Tile Flooring Installation not found; skipped kickoff_summary seed.';
    RETURN;
  END IF;

  UPDATE public.project_quality_levels
  SET
    kickoff_summary = CASE quality_level
      WHEN 'good' THEN
        'Serviceable floor; minor lippage or uneven joints can remain.'
      WHEN 'great' THEN
        'Clean DIY field; verify coverage and lippage before thinset cures.'
      WHEN 'professional' THEN
        'Near-trade plane and joints; leveling system, final QC, and seal required.'
      ELSE kickoff_summary
    END,
    updated_at = now()
  WHERE project_id = v_project_id
    AND quality_level IN ('good', 'great', 'professional');
END;
$$;

-- Keep run snapshots in sync when catalog rows already exist for a run.
UPDATE public.project_run_quality_levels prql
SET kickoff_summary = pql.kickoff_summary
FROM public.project_quality_levels pql
WHERE prql.source_project_id = pql.project_id
  AND prql.quality_level = pql.quality_level
  AND pql.kickoff_summary IS NOT NULL
  AND prql.kickoff_summary IS DISTINCT FROM pql.kickoff_summary;

CREATE OR REPLACE FUNCTION public.copy_project_quality_levels_to_run(p_run_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_host_project_id uuid;
  v_source_ids uuid[];
  v_inserted integer := 0;
BEGIN
  SELECT project_id INTO v_host_project_id
  FROM public.project_runs
  WHERE id = p_run_id;

  IF v_host_project_id IS NULL THEN
    RAISE EXCEPTION 'copy_project_quality_levels_to_run: run % not found or missing project_id', p_run_id;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT x.source_id
    FROM (
      SELECT v_host_project_id AS source_id
      UNION ALL
      SELECT (phase.value->>'sourceProjectId')::uuid
      FROM public.project_runs pr
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pr.phases, '[]'::jsonb)) AS phase(value)
      WHERE pr.id = p_run_id
        AND phase.value->>'sourceProjectId' IS NOT NULL
        AND phase.value->>'sourceProjectId' ~ '^[0-9a-fA-F-]{36}$'
    ) x
    WHERE x.source_id IS NOT NULL
  )
  INTO v_source_ids;

  DELETE FROM public.project_run_quality_levels WHERE project_run_id = p_run_id;

  INSERT INTO public.project_run_quality_levels (
    project_run_id,
    source_project_id,
    source_project_name,
    quality_level,
    kickoff_summary,
    outcome_summary,
    process_summary,
    vs_lower_summary,
    example_image_urls
  )
  SELECT
    p_run_id,
    pql.project_id,
    COALESCE(p.name, pql.project_id::text),
    pql.quality_level,
    pql.kickoff_summary,
    pql.outcome_summary,
    pql.process_summary,
    pql.vs_lower_summary,
    pql.example_image_urls
  FROM public.project_quality_levels pql
  JOIN public.projects p ON p.id = pql.project_id
  WHERE pql.project_id = ANY (v_source_ids);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.copy_project_quality_levels_to_run(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copy_project_quality_levels_to_run(uuid) TO authenticated, service_role;
