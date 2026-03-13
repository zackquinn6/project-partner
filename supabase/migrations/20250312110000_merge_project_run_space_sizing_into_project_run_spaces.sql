-- Merge project_run_space_sizing into project_run_spaces: add sizing_by_unit JSONB and migrate data.

-- Add column: object mapping scaling_unit -> numeric size value (e.g. {"per square feet": 100})
ALTER TABLE project_run_spaces
  ADD COLUMN IF NOT EXISTS sizing_by_unit jsonb DEFAULT '{}'::jsonb;

-- Migrate existing project_run_space_sizing into project_run_spaces.sizing_by_unit (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_run_space_sizing') THEN
    WITH sized AS (
      SELECT
        space_id,
        jsonb_object_agg(
          scaling_unit,
          CASE
            WHEN jsonb_typeof(size_value) = 'number' THEN size_value
            ELSE to_jsonb(COALESCE((size_value #>> '{}')::numeric, 0))
          END
        ) AS sizing
      FROM project_run_space_sizing
      GROUP BY space_id
    )
    UPDATE project_run_spaces prs
    SET sizing_by_unit = sized.sizing
    FROM sized
    WHERE prs.id = sized.space_id;

    DROP TABLE project_run_space_sizing;
  END IF;
END $$;
