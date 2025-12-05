-- =====================================================
-- RLS POLICIES FOR USER TABLES
-- Allow users to manage their own data
-- =====================================================

-- =====================================================
-- HOMES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own homes" ON public.homes;
DROP POLICY IF EXISTS "Users can insert own homes" ON public.homes;
DROP POLICY IF EXISTS "Users can update own homes" ON public.homes;
DROP POLICY IF EXISTS "Users can delete own homes" ON public.homes;

CREATE POLICY "Users can view own homes"
  ON public.homes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own homes"
  ON public.homes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own homes"
  ON public.homes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own homes"
  ON public.homes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- HOME_DETAILS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage home details" ON public.home_details;

CREATE POLICY "Users can manage home details"
  ON public.home_details FOR ALL
  USING (
    home_id IN (
      SELECT id FROM public.homes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    home_id IN (
      SELECT id FROM public.homes WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- HOME_SPACES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage home spaces" ON public.home_spaces;

CREATE POLICY "Users can manage home spaces"
  ON public.home_spaces FOR ALL
  USING (
    home_id IN (
      SELECT id FROM public.homes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    home_id IN (
      SELECT id FROM public.homes WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- PROJECTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view public projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public projects"
  ON public.projects FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PROJECT_PHASES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage project phases" ON public.project_phases;

CREATE POLICY "Users can manage project phases"
  ON public.project_phases FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- PHASE_OPERATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage phase operations" ON public.phase_operations;

CREATE POLICY "Users can manage phase operations"
  ON public.phase_operations FOR ALL
  USING (
    phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    phase_id IN (
      SELECT pp.id FROM public.project_phases pp
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- =====================================================
-- OPERATION_STEPS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage operation steps" ON public.operation_steps;

CREATE POLICY "Users can manage operation steps"
  ON public.operation_steps FOR ALL
  USING (
    operation_id IN (
      SELECT po.id FROM public.phase_operations po
      JOIN public.project_phases pp ON pp.id = po.phase_id
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    operation_id IN (
      SELECT po.id FROM public.phase_operations po
      JOIN public.project_phases pp ON pp.id = po.phase_id
      JOIN public.projects p ON p.id = pp.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- =====================================================
-- PROJECT_RUNS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own project runs" ON public.project_runs;
DROP POLICY IF EXISTS "Users can insert own project runs" ON public.project_runs;
DROP POLICY IF EXISTS "Users can update own project runs" ON public.project_runs;
DROP POLICY IF EXISTS "Users can delete own project runs" ON public.project_runs;

CREATE POLICY "Users can view own project runs"
  ON public.project_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own project runs"
  ON public.project_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project runs"
  ON public.project_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project runs"
  ON public.project_runs FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PROJECT_RUN_SPACES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage project run spaces" ON public.project_run_spaces;

CREATE POLICY "Users can manage project run spaces"
  ON public.project_run_spaces FOR ALL
  USING (
    project_run_id IN (
      SELECT id FROM public.project_runs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_run_id IN (
      SELECT id FROM public.project_runs WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- PROJECT_RUN_PHOTOS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage project run photos" ON public.project_run_photos;

CREATE POLICY "Users can manage project run photos"
  ON public.project_run_photos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USER_CONTRACTORS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own contractors" ON public.user_contractors;

CREATE POLICY "Users can manage own contractors"
  ON public.user_contractors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- CONTRACTOR_PHASE_ASSIGNMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage contractor assignments" ON public.contractor_phase_assignments;

CREATE POLICY "Users can manage contractor assignments"
  ON public.contractor_phase_assignments FOR ALL
  USING (
    project_run_id IN (
      SELECT id FROM public.project_runs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_run_id IN (
      SELECT id FROM public.project_runs WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- USER_ACHIEVEMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;

CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ACHIEVEMENT_NOTIFICATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own achievement notifications" ON public.achievement_notifications;

CREATE POLICY "Users can manage own achievement notifications"
  ON public.achievement_notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FEEDBACK TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;

CREATE POLICY "Users can insert feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true); -- Anyone can submit feedback

CREATE POLICY "Users can view own feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() = user_id::uuid OR user_id IS NULL);

-- =====================================================
-- FEATURE_REQUESTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Anyone can view feature requests" ON public.feature_requests;

CREATE POLICY "Anyone can view feature requests"
  ON public.feature_requests FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own feature requests"
  ON public.feature_requests FOR INSERT
  WITH CHECK (auth.uid() = submitted_by::uuid OR submitted_by IS NULL);

-- =====================================================
-- MAINTENANCE & TASKS
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own maintenance tasks" ON public.user_maintenance_tasks;
CREATE POLICY "Users can manage own maintenance tasks"
  ON public.user_maintenance_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own maintenance completions" ON public.maintenance_completions;
CREATE POLICY "Users can manage own maintenance completions"
  ON public.maintenance_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own home tasks" ON public.home_tasks;
CREATE POLICY "Users can manage own home tasks"
  ON public.home_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own task people" ON public.home_task_people;
CREATE POLICY "Users can manage own task people"
  ON public.home_task_people FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own task subtasks" ON public.home_task_subtasks;
CREATE POLICY "Users can manage own task subtasks"
  ON public.home_task_subtasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own task assignments" ON public.home_task_assignments;
CREATE POLICY "Users can manage own task assignments"
  ON public.home_task_assignments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own task schedules" ON public.home_task_schedules;
CREATE POLICY "Users can manage own task schedules"
  ON public.home_task_schedules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- AI REPAIR ANALYSES
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own repair analyses" ON public.ai_repair_analyses;
CREATE POLICY "Users can manage own repair analyses"
  ON public.ai_repair_analyses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PUBLIC READ TABLES (Anyone can view)
-- =====================================================

-- Achievements (anyone can view)
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- Materials (anyone can view)
DROP POLICY IF EXISTS "Anyone can view materials" ON public.materials;
CREATE POLICY "Anyone can view materials"
  ON public.materials FOR SELECT
  USING (true);

-- Tool brands (anyone can view)
DROP POLICY IF EXISTS "Anyone can view tool brands" ON public.tool_brands;
CREATE POLICY "Anyone can view tool brands"
  ON public.tool_brands FOR SELECT
  USING (true);

-- Tool categories (anyone can view)
DROP POLICY IF EXISTS "Anyone can view tool categories" ON public.tool_categories;
CREATE POLICY "Anyone can view tool categories"
  ON public.tool_categories FOR SELECT
  USING (true);

-- Tool models (anyone can view)
DROP POLICY IF EXISTS "Anyone can view tool models" ON public.tool_models;
CREATE POLICY "Anyone can view tool models"
  ON public.tool_models FOR SELECT
  USING (true);

-- Pricing data (anyone can view)
DROP POLICY IF EXISTS "Anyone can view pricing data" ON public.pricing_data;
CREATE POLICY "Anyone can view pricing data"
  ON public.pricing_data FOR SELECT
  USING (true);

-- Maintenance templates (anyone can view)
DROP POLICY IF EXISTS "Anyone can view maintenance templates" ON public.maintenance_templates;
CREATE POLICY "Anyone can view maintenance templates"
  ON public.maintenance_templates FOR SELECT
  USING (true);

-- Feature roadmap (anyone can view)
DROP POLICY IF EXISTS "Anyone can view feature roadmap" ON public.feature_roadmap;
CREATE POLICY "Anyone can view feature roadmap"
  ON public.feature_roadmap FOR SELECT
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies created successfully for all user tables';
  RAISE NOTICE '✅ Users can now create, read, update, and delete their own data';
END $$;

