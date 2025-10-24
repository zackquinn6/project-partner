-- Fix home_task_schedules RLS policy to prevent privilege escalation
-- Split single FOR ALL policy into separate policies for each operation

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can manage their own schedules" ON public.home_task_schedules;

-- Create separate policies for each operation
CREATE POLICY "Users can view own schedules"
  ON public.home_task_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules"
  ON public.home_task_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.home_task_schedules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.home_task_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Allow admins to view all schedules for support purposes
CREATE POLICY "Admins can view all schedules"
  ON public.home_task_schedules FOR SELECT
  USING (is_admin(auth.uid()));

-- Restrict project data to authenticated users only
-- Update template_steps policies
DROP POLICY IF EXISTS "Everyone can view template steps" ON public.template_steps;
CREATE POLICY "Authenticated users can view template steps"
  ON public.template_steps FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update template_operations policies
DROP POLICY IF EXISTS "Everyone can view template operations" ON public.template_operations;
CREATE POLICY "Authenticated users can view template operations"
  ON public.template_operations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update standard_phases policies
DROP POLICY IF EXISTS "Everyone can view standard phases" ON public.standard_phases;
CREATE POLICY "Authenticated users can view standard phases"
  ON public.standard_phases FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update variation_instances policies
DROP POLICY IF EXISTS "Everyone can view variation instances" ON public.variation_instances;
CREATE POLICY "Authenticated users can view variation instances"
  ON public.variation_instances FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update tool_models policies
DROP POLICY IF EXISTS "Everyone can view tool models" ON public.tool_models;
CREATE POLICY "Authenticated users can view tool models"
  ON public.tool_models FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update variation_warning_flags policies
DROP POLICY IF EXISTS "Everyone can view variation warning flags" ON public.variation_warning_flags;
CREATE POLICY "Authenticated users can view variation warning flags"
  ON public.variation_warning_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update warning_flags policies
DROP POLICY IF EXISTS "Everyone can view warning flags" ON public.warning_flags;
CREATE POLICY "Authenticated users can view warning flags"
  ON public.warning_flags FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update home_risks policies
DROP POLICY IF EXISTS "Everyone can view home risks" ON public.home_risks;
CREATE POLICY "Authenticated users can view home risks"
  ON public.home_risks FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update maintenance_templates policies
DROP POLICY IF EXISTS "Everyone can view maintenance templates" ON public.maintenance_templates;
CREATE POLICY "Authenticated users can view maintenance templates"
  ON public.maintenance_templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update tools policies (keep admin policy, add authenticated view)
DROP POLICY IF EXISTS "Authenticated users can view tools" ON public.tools;
CREATE POLICY "Authenticated users can view tools"
  ON public.tools FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update materials policies (keep admin policy, add authenticated view)
DROP POLICY IF EXISTS "Authenticated users can view materials" ON public.materials;
CREATE POLICY "Authenticated users can view materials"
  ON public.materials FOR SELECT
  USING (auth.uid() IS NOT NULL);