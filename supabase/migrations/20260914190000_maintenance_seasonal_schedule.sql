-- Seasonal (time-of-year) schedule type for home maintenance.
-- Templates declare season_intent; user tasks store resolved seasonal_months.
-- Idempotent column adds; template UPDATEs by title; backfill template-linked user tasks.

-- ---------------------------------------------------------------------------
-- A) Columns on maintenance_templates
-- ---------------------------------------------------------------------------

ALTER TABLE public.maintenance_templates
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'interval';

ALTER TABLE public.maintenance_templates
  ADD COLUMN IF NOT EXISTS season_intent text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'maintenance_templates_schedule_type_check'
  ) THEN
    ALTER TABLE public.maintenance_templates
      ADD CONSTRAINT maintenance_templates_schedule_type_check
      CHECK (schedule_type IN ('interval', 'seasonal'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'maintenance_templates_season_intent_check'
  ) THEN
    ALTER TABLE public.maintenance_templates
      ADD CONSTRAINT maintenance_templates_season_intent_check
      CHECK (
        season_intent IS NULL
        OR season_intent IN (
          'before_freeze',
          'heating_startup',
          'cooling_startup',
          'spring',
          'fall',
          'spring_and_fall'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'maintenance_templates_seasonal_requires_intent'
  ) THEN
    ALTER TABLE public.maintenance_templates
      ADD CONSTRAINT maintenance_templates_seasonal_requires_intent
      CHECK (
        schedule_type <> 'seasonal'
        OR season_intent IS NOT NULL
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- B) Columns on user_maintenance_tasks
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'interval';

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS seasonal_months integer[];

ALTER TABLE public.user_maintenance_tasks
  ADD COLUMN IF NOT EXISTS seasonal_day integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_maintenance_tasks_schedule_type_check'
  ) THEN
    ALTER TABLE public.user_maintenance_tasks
      ADD CONSTRAINT user_maintenance_tasks_schedule_type_check
      CHECK (schedule_type IN ('interval', 'seasonal'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_maintenance_tasks_seasonal_day_check'
  ) THEN
    ALTER TABLE public.user_maintenance_tasks
      ADD CONSTRAINT user_maintenance_tasks_seasonal_day_check
      CHECK (seasonal_day >= 1 AND seasonal_day <= 31);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_maintenance_tasks_seasonal_requires_months'
  ) THEN
    ALTER TABLE public.user_maintenance_tasks
      ADD CONSTRAINT user_maintenance_tasks_seasonal_requires_months
      CHECK (
        schedule_type <> 'seasonal'
        OR (
          seasonal_months IS NOT NULL
          AND cardinality(seasonal_months) >= 1
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- C) Mark seasonal templates (by title)
-- ---------------------------------------------------------------------------

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'before_freeze',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'inspect outdoor hose bibs',
  'check outdoor hose bibs'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'before_freeze',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'flush lawn sprinkler irrigation system'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'spring_and_fall',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE title ILIKE 'Winterize % open pool';

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'heating_startup',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'inspect furnace',
  'check furnace'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'cooling_startup',
  frequency_days = 365,
  typical_season = 'spring',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'inspect ac unit',
  'check ac unit'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'fall',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'chimney inspection and cleaning',
  'chimney cleaning'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'spring_and_fall',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'clean gutters'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'spring_and_fall',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'inspect downspout drainage',
  'check downspout drainage'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'fall',
  frequency_days = 365,
  typical_season = 'fall',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'leaf cleanup'
);

UPDATE public.maintenance_templates
SET
  schedule_type = 'seasonal',
  season_intent = 'spring',
  frequency_days = 365,
  typical_season = 'spring',
  updated_at = now()
WHERE lower(trim(title)) IN (
  'clean solar panels'
);

-- ---------------------------------------------------------------------------
-- D) Backfill template-linked user tasks (climate-resolved months)
-- ---------------------------------------------------------------------------

WITH seasonal_templates AS (
  SELECT id, season_intent
  FROM public.maintenance_templates
  WHERE schedule_type = 'seasonal'
    AND season_intent IS NOT NULL
),
resolved AS (
  SELECT
    t.id AS task_id,
    st.season_intent,
    COALESCE(hd.climate_region, 'Northeast') AS climate_region,
    CASE
      WHEN st.season_intent = 'before_freeze' THEN
        CASE
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Southeast' THEN ARRAY[12]
          WHEN COALESCE(hd.climate_region, 'Northeast') LIKE 'South % South Central' THEN ARRAY[1]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'West' THEN ARRAY[11]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Midwest' THEN ARRAY[11]
          ELSE ARRAY[11]
        END
      WHEN st.season_intent = 'heating_startup' THEN
        CASE
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Southeast' THEN ARRAY[10]
          WHEN COALESCE(hd.climate_region, 'Northeast') LIKE 'South % South Central' THEN ARRAY[11]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'West' THEN ARRAY[9]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Midwest' THEN ARRAY[9]
          ELSE ARRAY[9]
        END
      WHEN st.season_intent = 'cooling_startup' THEN
        CASE
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Southeast' THEN ARRAY[3]
          WHEN COALESCE(hd.climate_region, 'Northeast') LIKE 'South % South Central' THEN ARRAY[3]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'West' THEN ARRAY[4]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Midwest' THEN ARRAY[4]
          ELSE ARRAY[4]
        END
      WHEN st.season_intent = 'spring' THEN
        CASE
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Southeast' THEN ARRAY[3]
          WHEN COALESCE(hd.climate_region, 'Northeast') LIKE 'South % South Central' THEN ARRAY[3]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'West' THEN ARRAY[4]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Midwest' THEN ARRAY[4]
          ELSE ARRAY[4]
        END
      WHEN st.season_intent = 'fall' THEN
        CASE
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Southeast' THEN ARRAY[11]
          WHEN COALESCE(hd.climate_region, 'Northeast') LIKE 'South % South Central' THEN ARRAY[11]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'West' THEN ARRAY[10]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Midwest' THEN ARRAY[10]
          ELSE ARRAY[10]
        END
      WHEN st.season_intent = 'spring_and_fall' THEN
        CASE
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Southeast' THEN ARRAY[3, 11]
          WHEN COALESCE(hd.climate_region, 'Northeast') LIKE 'South % South Central' THEN ARRAY[3, 11]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'West' THEN ARRAY[4, 10]
          WHEN COALESCE(hd.climate_region, 'Northeast') = 'Midwest' THEN ARRAY[4, 10]
          ELSE ARRAY[4, 10]
        END
      ELSE ARRAY[11]
    END AS months
  FROM public.user_maintenance_tasks t
  INNER JOIN seasonal_templates st ON st.id = t.maintenance_template_id
  LEFT JOIN public.home_details hd ON hd.home_id = t.home_id
)
UPDATE public.user_maintenance_tasks t
SET
  schedule_type = 'seasonal',
  seasonal_months = r.months,
  seasonal_day = 1,
  frequency_days = 365,
  next_due = (
    SELECT MIN(candidate)::timestamptz
    FROM (
      SELECT make_date(
        EXTRACT(YEAR FROM GREATEST(COALESCE(t.last_completed::timestamptz, now()), now()))::int
          + CASE
              WHEN make_date(
                EXTRACT(YEAR FROM GREATEST(COALESCE(t.last_completed::timestamptz, now()), now()))::int,
                m,
                1
              ) < date_trunc('day', GREATEST(COALESCE(t.last_completed::timestamptz, now()), now()))::date
              THEN 1
              ELSE 0
            END,
        m,
        1
      ) AS candidate
      FROM unnest(r.months) AS m
      UNION ALL
      SELECT make_date(
        EXTRACT(YEAR FROM GREATEST(COALESCE(t.last_completed::timestamptz, now()), now()))::int + 1,
        m,
        1
      )
      FROM unnest(r.months) AS m
    ) candidates
    WHERE candidate >= date_trunc('day', GREATEST(COALESCE(t.last_completed::timestamptz, now()), now()))::date
  ),
  updated_at = now()
FROM resolved r
WHERE t.id = r.task_id
  AND t.schedule_type = 'interval';
