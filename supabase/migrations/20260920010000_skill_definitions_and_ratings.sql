-- Phase 1: key-skill catalog, template/step links, user proficiency + experience.
-- Skill = proficiency 0-100. Experience = time practiced (seconds) + completion counts.
-- Missing proficiency is treated as low skill by the risk engine (assumed_low_skill).

CREATE TABLE IF NOT EXISTS public.skill_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_baseline boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skill_definitions_slug_unique UNIQUE (slug),
  CONSTRAINT skill_definitions_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT skill_definitions_name_nonblank CHECK (length(trim(name)) > 0),
  CONSTRAINT skill_definitions_category_nonblank CHECK (length(trim(category)) > 0)
);

CREATE INDEX IF NOT EXISTS skill_definitions_active_order_idx
  ON public.skill_definitions (is_active, display_order, name);

ALTER TABLE public.skill_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_definitions_select_authenticated ON public.skill_definitions;
CREATE POLICY skill_definitions_select_authenticated
  ON public.skill_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS skill_definitions_admin_insert ON public.skill_definitions;
CREATE POLICY skill_definitions_admin_insert
  ON public.skill_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS skill_definitions_admin_update ON public.skill_definitions;
CREATE POLICY skill_definitions_admin_update
  ON public.skill_definitions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS skill_definitions_admin_delete ON public.skill_definitions;
CREATE POLICY skill_definitions_admin_delete
  ON public.skill_definitions
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.project_key_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_definitions (id) ON DELETE RESTRICT,
  display_order integer NOT NULL DEFAULT 0,
  required_for_kickoff boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_key_skills_project_skill_unique UNIQUE (project_id, skill_id)
);

CREATE INDEX IF NOT EXISTS project_key_skills_project_order_idx
  ON public.project_key_skills (project_id, display_order);

ALTER TABLE public.project_key_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_key_skills_select_authenticated ON public.project_key_skills;
CREATE POLICY project_key_skills_select_authenticated
  ON public.project_key_skills
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS project_key_skills_admin_insert ON public.project_key_skills;
CREATE POLICY project_key_skills_admin_insert
  ON public.project_key_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS project_key_skills_admin_update ON public.project_key_skills;
CREATE POLICY project_key_skills_admin_update
  ON public.project_key_skills
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS project_key_skills_admin_delete ON public.project_key_skills;
CREATE POLICY project_key_skills_admin_delete
  ON public.project_key_skills
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.operation_step_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_step_id uuid NOT NULL REFERENCES public.operation_steps (id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_definitions (id) ON DELETE RESTRICT,
  importance text NOT NULL DEFAULT 'primary',
  minimum_proficiency_hint integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operation_step_skills_step_skill_unique UNIQUE (operation_step_id, skill_id),
  CONSTRAINT operation_step_skills_importance_check CHECK (importance IN ('primary', 'secondary')),
  CONSTRAINT operation_step_skills_hint_range CHECK (
    minimum_proficiency_hint IS NULL
    OR (minimum_proficiency_hint >= 0 AND minimum_proficiency_hint <= 100)
  )
);

CREATE INDEX IF NOT EXISTS operation_step_skills_step_idx
  ON public.operation_step_skills (operation_step_id);

CREATE INDEX IF NOT EXISTS operation_step_skills_skill_idx
  ON public.operation_step_skills (skill_id);

ALTER TABLE public.operation_step_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operation_step_skills_select_authenticated ON public.operation_step_skills;
CREATE POLICY operation_step_skills_select_authenticated
  ON public.operation_step_skills
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS operation_step_skills_admin_insert ON public.operation_step_skills;
CREATE POLICY operation_step_skills_admin_insert
  ON public.operation_step_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS operation_step_skills_admin_update ON public.operation_step_skills;
CREATE POLICY operation_step_skills_admin_update
  ON public.operation_step_skills
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS operation_step_skills_admin_delete ON public.operation_step_skills;
CREATE POLICY operation_step_skills_admin_delete
  ON public.operation_step_skills
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_skill_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_definitions (id) ON DELETE CASCADE,
  proficiency integer NOT NULL,
  source text NOT NULL DEFAULT 'assessment',
  assumed_low boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_skill_ratings_user_skill_unique UNIQUE (user_id, skill_id),
  CONSTRAINT user_skill_ratings_proficiency_range CHECK (proficiency >= 0 AND proficiency <= 100),
  CONSTRAINT user_skill_ratings_source_check CHECK (source IN ('assessment', 'inferred', 'achievement', 'assumed_low'))
);

CREATE INDEX IF NOT EXISTS user_skill_ratings_user_idx
  ON public.user_skill_ratings (user_id);

ALTER TABLE public.user_skill_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_skill_ratings_select_own ON public.user_skill_ratings;
CREATE POLICY user_skill_ratings_select_own
  ON public.user_skill_ratings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_skill_ratings_insert_own ON public.user_skill_ratings;
CREATE POLICY user_skill_ratings_insert_own
  ON public.user_skill_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_skill_ratings_update_own ON public.user_skill_ratings;
CREATE POLICY user_skill_ratings_update_own
  ON public.user_skill_ratings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_skill_ratings_delete_own ON public.user_skill_ratings;
CREATE POLICY user_skill_ratings_delete_own
  ON public.user_skill_ratings
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.user_skill_experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skill_definitions (id) ON DELETE CASCADE,
  experience_seconds bigint NOT NULL DEFAULT 0,
  completion_count integer NOT NULL DEFAULT 0,
  last_practiced_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_skill_experience_user_skill_unique UNIQUE (user_id, skill_id),
  CONSTRAINT user_skill_experience_seconds_nonneg CHECK (experience_seconds >= 0),
  CONSTRAINT user_skill_experience_completions_nonneg CHECK (completion_count >= 0)
);

CREATE INDEX IF NOT EXISTS user_skill_experience_user_idx
  ON public.user_skill_experience (user_id);

ALTER TABLE public.user_skill_experience ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_skill_experience_select_own ON public.user_skill_experience;
CREATE POLICY user_skill_experience_select_own
  ON public.user_skill_experience
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_skill_experience_insert_own ON public.user_skill_experience;
CREATE POLICY user_skill_experience_insert_own
  ON public.user_skill_experience
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_skill_experience_update_own ON public.user_skill_experience;
CREATE POLICY user_skill_experience_update_own
  ON public.user_skill_experience
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_skill_experience_delete_own ON public.user_skill_experience;
CREATE POLICY user_skill_experience_delete_own
  ON public.user_skill_experience
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS overall_proficiency integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_overall_proficiency_range'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_overall_proficiency_range
      CHECK (overall_proficiency IS NULL OR (overall_proficiency >= 0 AND overall_proficiency <= 100));
  END IF;
END $$;

UPDATE public.user_profiles
SET overall_proficiency = CASE skill_level
  WHEN 'newbie' THEN 15
  WHEN 'confident' THEN 50
  WHEN 'hero' THEN 85
  ELSE overall_proficiency
END
WHERE overall_proficiency IS NULL
  AND skill_level IS NOT NULL;

-- Phase 2-6 variation factors on user_profiles / project_runs (conservative defaults applied in riskSignals)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS live_in_during_project boolean,
  ADD COLUMN IF NOT EXISTS occupants_at_risk boolean,
  ADD COLUMN IF NOT EXISTS temporary_kitchen_bath boolean,
  ADD COLUMN IF NOT EXISTS dust_containment_planned boolean,
  ADD COLUMN IF NOT EXISTS helper_count integer,
  ADD COLUMN IF NOT EXISTS work_solo boolean,
  ADD COLUMN IF NOT EXISTS contingency_percent integer,
  ADD COLUMN IF NOT EXISTS finance_constraint boolean;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_helper_count_nonneg'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_helper_count_nonneg
      CHECK (helper_count IS NULL OR helper_count >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_contingency_percent_range'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_contingency_percent_range
      CHECK (contingency_percent IS NULL OR (contingency_percent >= 0 AND contingency_percent <= 100));
  END IF;
END $$;

ALTER TABLE public.project_runs
  ADD COLUMN IF NOT EXISTS concealed_conditions_likelihood integer,
  ADD COLUMN IF NOT EXISTS moisture_substrate_concern boolean,
  ADD COLUMN IF NOT EXISTS access_constrained boolean,
  ADD COLUMN IF NOT EXISTS permit_required boolean,
  ADD COLUMN IF NOT EXISTS outdoor_season_conflict boolean,
  ADD COLUMN IF NOT EXISTS inspection_lag_days integer,
  ADD COLUMN IF NOT EXISTS long_lead_item_count integer,
  ADD COLUMN IF NOT EXISTS material_readiness_ratio numeric,
  ADD COLUMN IF NOT EXISTS open_decision_count integer,
  ADD COLUMN IF NOT EXISTS trade_lead_time_days integer,
  ADD COLUMN IF NOT EXISTS ppe_ventilation_ready boolean;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_runs_concealed_conditions_range'
  ) THEN
    ALTER TABLE public.project_runs
      ADD CONSTRAINT project_runs_concealed_conditions_range
      CHECK (
        concealed_conditions_likelihood IS NULL
        OR (concealed_conditions_likelihood >= 0 AND concealed_conditions_likelihood <= 10)
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_runs_material_readiness_range'
  ) THEN
    ALTER TABLE public.project_runs
      ADD CONSTRAINT project_runs_material_readiness_range
      CHECK (
        material_readiness_ratio IS NULL
        OR (material_readiness_ratio >= 0 AND material_readiness_ratio <= 1)
      );
  END IF;
END $$;

INSERT INTO public.skill_definitions (slug, name, description, category, display_order, is_baseline)
VALUES
  ('site-prep-protection', 'Site prep and protection', 'Containment, masking, dust control, floor/wall protection before work starts.', 'prep', 10, true),
  ('demo-haul-out', 'Demo and haul-out', 'Controlled demolition, debris handling, and disposal logistics.', 'prep', 20, true),
  ('layout-measuring', 'Layout and measuring', 'Accurate layout, leveling, squaring, and transfer of marks.', 'layout', 30, true),
  ('substrate-flatness', 'Substrate and flatness assessment', 'Reading floors/walls, spotting soft spots, and judging readiness for finish.', 'assessment', 40, true),
  ('mixing-materials', 'Mixing and materials science', 'Mixing thinset, mud, paint, and other wet materials to the right consistency.', 'materials', 50, true),
  ('cutting-tile-lumber-drywall', 'Cutting', 'Cutting tile, lumber, drywall, and trim safely and accurately.', 'fabrication', 60, true),
  ('fastening-assembly', 'Fastening and assembly', 'Mechanical fastening, assembly sequence, and structural-enough connections for DIY scope.', 'fabrication', 70, true),
  ('waterproofing-wet-areas', 'Waterproofing and wet-area detailing', 'Membranes, corners, niches, and transitions in wet zones.', 'wet', 80, true),
  ('finish-grout-caulk-paint', 'Finish work', 'Grout, caulk, paint cut-in, and final surface quality.', 'finish', 90, true),
  ('electrical-basics-diy', 'Electrical basics (DIY-safe)', 'Basic fixture-level electrical work within DIY-safe boundaries; knowing when to stop.', 'systems', 100, true),
  ('plumbing-basics-diy', 'Plumbing basics (DIY-safe)', 'Basic shutoffs, fixture swaps, and leak awareness within DIY-safe boundaries.', 'systems', 110, true),
  ('ladder-elevation', 'Ladder and elevation work', 'Safe ladder setup, work at height, and fall awareness.', 'safety', 120, true),
  ('heavy-lifting-handling', 'Heavy lifting and material handling', 'Moving sheet goods, tile boxes, and tools without injury or damage.', 'safety', 130, true),
  ('inspection-qc-checks', 'Inspection readiness and QC checks', 'Knowing what good looks like and catching defects before they are covered up.', 'quality', 140, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  is_baseline = EXCLUDED.is_baseline,
  is_active = true,
  updated_at = now();

INSERT INTO public.user_skill_ratings (user_id, skill_id, proficiency, source, assumed_low, updated_at)
SELECT
  up.user_id,
  sd.id,
  GREATEST(0, LEAST(100, round((kv.value)::numeric)::integer)),
  'inferred',
  false,
  now()
FROM public.user_profiles up
CROSS JOIN LATERAL jsonb_each_text(COALESCE(up.project_skills, '{}'::jsonb)) AS kv(key, value)
JOIN public.skill_definitions sd ON sd.slug = CASE kv.key
  WHEN 'Demo & heavy lifting' THEN 'demo-haul-out'
  WHEN 'Drywall finishing' THEN 'finish-grout-caulk-paint'
  WHEN 'Painting' THEN 'finish-grout-caulk-paint'
  WHEN 'Electrical' THEN 'electrical-basics-diy'
  WHEN 'Plumbing' THEN 'plumbing-basics-diy'
  WHEN 'Precision & high patience: tiling, trim' THEN 'layout-measuring'
  WHEN 'High heights / ladders' THEN 'ladder-elevation'
  ELSE NULL
END
WHERE up.project_skills IS NOT NULL
  AND jsonb_typeof(up.project_skills) = 'object'
  AND kv.value ~ '^[0-9]+(\.[0-9]+)?$'
ON CONFLICT (user_id, skill_id) DO NOTHING;
