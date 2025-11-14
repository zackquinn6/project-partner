-- Migration: Normalize workflow step resources into relational tables
-- Goal: Store tools, materials, outputs, process variables, and step types relationally
-- while keeping JSON columns for backwards compatibility via sync triggers.

-------------------------------
-- 1. Step Types Dimension Table
-------------------------------
CREATE TABLE IF NOT EXISTS public.workflow_step_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.workflow_step_types (key, label, description)
VALUES
  ('prime', 'Prime', 'Default execution step'),
  ('scaled', 'Scaled', 'Step with scaling and unit-based logic'),
  ('quality_control', 'Quality Control', 'Inspection or QC checkpoint'),
  ('alternate', 'Alternate Flow', 'Conditional or alternate path step'),
  ('if_necessary', 'If Necessary', 'Optional step executed when required'),
  ('inspection', 'Inspection', 'Dedicated inspection/verification step')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.workflow_step_types
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage workflow_step_types"
  ON public.workflow_step_types
  FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read workflow_step_types"
  ON public.workflow_step_types
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_workflow_step_types_updated_at
  BEFORE UPDATE ON public.workflow_step_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-----------------------------------------
-- 2. Relational Tables for Step Resources
-----------------------------------------

CREATE TABLE IF NOT EXISTS public.workflow_step_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  legacy_material_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT,
  quantity TEXT,
  alternates TEXT[],
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_materials_step
  ON public.workflow_step_materials(step_id);

CREATE TABLE IF NOT EXISTS public.workflow_step_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  legacy_tool_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT,
  quantity TEXT,
  alternates TEXT[],
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_tools_step
  ON public.workflow_step_tools(step_id);

CREATE TABLE IF NOT EXISTS public.workflow_step_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  legacy_output_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  output_type TEXT,
  requirement TEXT,
  potential_effects TEXT,
  quality_checks TEXT,
  must_get_right TEXT,
  allowances TEXT,
  reference_specification TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_outputs_step
  ON public.workflow_step_outputs(step_id);

CREATE TABLE IF NOT EXISTS public.workflow_step_process_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  variable_key TEXT,
  label TEXT,
  description TEXT,
  variable_type TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  unit TEXT,
  options JSONB,
  source_step_id TEXT,
  source_step_name TEXT,
  target_value TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_step_process_variables_step
  ON public.workflow_step_process_variables(step_id);

-- Enable RLS + policies
ALTER TABLE public.workflow_step_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_process_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage workflow_step_materials"
  ON public.workflow_step_materials FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage workflow_step_tools"
  ON public.workflow_step_tools FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage workflow_step_outputs"
  ON public.workflow_step_outputs FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage workflow_step_process_variables"
  ON public.workflow_step_process_variables FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated read workflow_step_materials"
  ON public.workflow_step_materials FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read workflow_step_tools"
  ON public.workflow_step_tools FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read workflow_step_outputs"
  ON public.workflow_step_outputs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read workflow_step_process_variables"
  ON public.workflow_step_process_variables FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_workflow_step_materials_updated_at
  BEFORE UPDATE ON public.workflow_step_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_workflow_step_tools_updated_at
  BEFORE UPDATE ON public.workflow_step_tools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_workflow_step_outputs_updated_at
  BEFORE UPDATE ON public.workflow_step_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_workflow_step_process_variables_updated_at
  BEFORE UPDATE ON public.workflow_step_process_variables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

--------------------------------------------------
-- 3. Map legacy template_steps to step type table
--------------------------------------------------
ALTER TABLE public.template_steps
  ADD COLUMN IF NOT EXISTS step_type_id UUID REFERENCES public.workflow_step_types(id);

UPDATE public.template_steps ts
SET step_type_id = (
  SELECT id FROM public.workflow_step_types
  WHERE key = COALESCE(lower(ts.step_type), 'prime')
)
WHERE ts.step_type_id IS NULL;

----------------------------------------------------
-- 4. Backfill resources from legacy JSON structures
----------------------------------------------------

WITH material_data AS (
  SELECT
    ts.id AS step_id,
    material.value AS material,
    material.ordinality - 1 AS ord
  FROM public.template_steps ts
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ts.materials, '[]'::jsonb)) WITH ORDINALITY AS material(value, ordinality)
)
INSERT INTO public.workflow_step_materials (
  step_id,
  legacy_material_id,
  name,
  description,
  category,
  unit,
  quantity,
  alternates,
  notes,
  metadata,
  display_order
)
SELECT
  md.step_id,
  md.material->>'id',
  COALESCE(md.material->>'name', 'Material'),
  md.material->>'description',
  md.material->>'category',
  md.material->>'unit',
  md.material->>'quantity',
  CASE
    WHEN md.material ? 'alternates' THEN (
      SELECT array_agg(value::text)
      FROM jsonb_array_elements_text(md.material->'alternates') AS value
    )
    ELSE NULL
  END,
  md.material->>'notes',
  md.material,
  COALESCE(md.ord, 0)
FROM material_data md;

WITH tool_data AS (
  SELECT
    ts.id AS step_id,
    tool.value AS tool,
    tool.ordinality - 1 AS ord
  FROM public.template_steps ts
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ts.tools, '[]'::jsonb)) WITH ORDINALITY AS tool(value, ordinality)
)
INSERT INTO public.workflow_step_tools (
  step_id,
  legacy_tool_id,
  name,
  description,
  category,
  unit,
  quantity,
  alternates,
  notes,
  metadata,
  display_order
)
SELECT
  td.step_id,
  td.tool->>'id',
  COALESCE(td.tool->>'name', 'Tool'),
  td.tool->>'description',
  td.tool->>'category',
  td.tool->>'unit',
  td.tool->>'quantity',
  CASE
    WHEN td.tool ? 'alternates' THEN (
      SELECT array_agg(value::text)
      FROM jsonb_array_elements_text(td.tool->'alternates') AS value
    )
    ELSE NULL
  END,
  td.tool->>'notes',
  td.tool,
  COALESCE(td.ord, 0)
FROM tool_data td;

WITH output_data AS (
  SELECT
    ts.id AS step_id,
    output.value AS output,
    output.ordinality - 1 AS ord
  FROM public.template_steps ts
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ts.outputs, '[]'::jsonb)) WITH ORDINALITY AS output(value, ordinality)
)
INSERT INTO public.workflow_step_outputs (
  step_id,
  legacy_output_id,
  name,
  description,
  output_type,
  requirement,
  potential_effects,
  quality_checks,
  must_get_right,
  allowances,
  reference_specification,
  metadata,
  display_order
)
SELECT
  od.step_id,
  od.output->>'id',
  COALESCE(od.output->>'name', 'Output'),
  od.output->>'description',
  od.output->>'type',
  od.output->>'requirement',
  od.output->>'potentialEffects',
  od.output->>'qualityChecks',
  od.output->>'mustGetRight',
  od.output->>'allowances',
  od.output->>'referenceSpecification',
  od.output,
  COALESCE(od.ord, 0)
FROM output_data od;

-------------------------------------------------------------
-- 5. Helper functions to sync JSON <-> relational structures
-------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rebuild_step_resources_json(p_step_id UUID)
RETURNS VOID AS $$
DECLARE
  materials_json JSONB := '[]'::jsonb;
  tools_json JSONB := '[]'::jsonb;
  outputs_json JSONB := '[]'::jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', COALESCE(wsm.legacy_material_id, wsm.id::text),
      'name', wsm.name,
      'description', wsm.description,
      'category', wsm.category,
      'unit', wsm.unit,
      'quantity', wsm.quantity,
      'alternates', wsm.alternates,
      'notes', wsm.notes,
      'metadata', wsm.metadata
    ) ORDER BY wsm.display_order
  ), '[]'::jsonb)
  INTO materials_json
  FROM public.workflow_step_materials wsm
  WHERE wsm.step_id = p_step_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', COALESCE(wst.legacy_tool_id, wst.id::text),
      'name', wst.name,
      'description', wst.description,
      'category', wst.category,
      'unit', wst.unit,
      'quantity', wst.quantity,
      'alternates', wst.alternates,
      'notes', wst.notes,
      'metadata', wst.metadata
    ) ORDER BY wst.display_order
  ), '[]'::jsonb)
  INTO tools_json
  FROM public.workflow_step_tools wst
  WHERE wst.step_id = p_step_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', COALESCE(wso.legacy_output_id, wso.id::text),
      'name', wso.name,
      'description', wso.description,
      'type', wso.output_type,
      'requirement', wso.requirement,
      'potentialEffects', wso.potential_effects,
      'qualityChecks', wso.quality_checks,
      'mustGetRight', wso.must_get_right,
      'allowances', wso.allowances,
      'referenceSpecification', wso.reference_specification,
      'metadata', wso.metadata
    ) ORDER BY wso.display_order
  ), '[]'::jsonb)
  INTO outputs_json
  FROM public.workflow_step_outputs wso
  WHERE wso.step_id = p_step_id;

  UPDATE public.template_steps
  SET
    materials = materials_json,
    tools = tools_json,
    outputs = outputs_json,
    updated_at = now()
  WHERE id = p_step_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_resources_from_step_json()
RETURNS TRIGGER AS $$
DECLARE
  skip TEXT;
BEGIN
  skip := COALESCE(current_setting('app.skip_step_resource_from_json', true), 'false');
  IF skip = 'true' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.skip_step_json_from_resource', 'true', true);

  DELETE FROM public.workflow_step_materials WHERE step_id = NEW.id;
  INSERT INTO public.workflow_step_materials (
    step_id, legacy_material_id, name, description, category, unit, quantity, alternates, notes, metadata, display_order
  )
  SELECT
    NEW.id,
    material->>'id',
    COALESCE(material->>'name', 'Material'),
    material->>'description',
    material->>'category',
    material->>'unit',
    material->>'quantity',
    CASE
      WHEN material ? 'alternates' THEN (
        SELECT array_agg(value::text)
        FROM jsonb_array_elements_text(material->'alternates') AS value
      )
      ELSE NULL
    END,
    material->>'notes',
    material,
    idx - 1
  FROM jsonb_array_elements(COALESCE(NEW.materials, '[]'::jsonb)) WITH ORDINALITY AS arr(material, idx);

  DELETE FROM public.workflow_step_tools WHERE step_id = NEW.id;
  INSERT INTO public.workflow_step_tools (
    step_id, legacy_tool_id, name, description, category, unit, quantity, alternates, notes, metadata, display_order
  )
  SELECT
    NEW.id,
    tool->>'id',
    COALESCE(tool->>'name', 'Tool'),
    tool->>'description',
    tool->>'category',
    tool->>'unit',
    tool->>'quantity',
    CASE
      WHEN tool ? 'alternates' THEN (
        SELECT array_agg(value::text)
        FROM jsonb_array_elements_text(tool->'alternates') AS value
      )
      ELSE NULL
    END,
    tool->>'notes',
    tool,
    idx - 1
  FROM jsonb_array_elements(COALESCE(NEW.tools, '[]'::jsonb)) WITH ORDINALITY AS arr(tool, idx);

  DELETE FROM public.workflow_step_outputs WHERE step_id = NEW.id;
  INSERT INTO public.workflow_step_outputs (
    step_id, legacy_output_id, name, description, output_type, requirement,
    potential_effects, quality_checks, must_get_right, allowances, reference_specification, metadata, display_order
  )
  SELECT
    NEW.id,
    output->>'id',
    COALESCE(output->>'name', 'Output'),
    output->>'description',
    output->>'type',
    output->>'requirement',
    output->>'potentialEffects',
    output->>'qualityChecks',
    output->>'mustGetRight',
    output->>'allowances',
    output->>'referenceSpecification',
    output,
    idx - 1
  FROM jsonb_array_elements(COALESCE(NEW.outputs, '[]'::jsonb)) WITH ORDINALITY AS arr(output, idx);

  PERFORM set_config('app.skip_step_json_from_resource', 'false', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_step_json_from_resources()
RETURNS TRIGGER AS $$
DECLARE
  skip TEXT;
  target_step UUID;
BEGIN
  skip := COALESCE(current_setting('app.skip_step_json_from_resource', true), 'false');
  IF skip = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  target_step := COALESCE(NEW.step_id, OLD.step_id);
  IF target_step IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM set_config('app.skip_step_resource_from_json', 'true', true);
  PERFORM public.rebuild_step_resources_json(target_step);
  PERFORM set_config('app.skip_step_resource_from_json', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_template_steps_sync_resources
  AFTER INSERT OR UPDATE OF materials, tools, outputs ON public.template_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_resources_from_step_json();

CREATE TRIGGER trg_workflow_step_materials_sync_json
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_step_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_step_json_from_resources();

CREATE TRIGGER trg_workflow_step_tools_sync_json
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_step_tools
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_step_json_from_resources();

CREATE TRIGGER trg_workflow_step_outputs_sync_json
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_step_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_step_json_from_resources();

-- Process variables currently don't have JSON counterparts.
-- Future UI work will directly manage workflow_step_process_variables.

----------------------------------------------------------
-- 6. Initial sync to ensure relational + JSON consistency
----------------------------------------------------------
DO $$
DECLARE
  step_rec RECORD;
BEGIN
  FOR step_rec IN SELECT id FROM public.template_steps LOOP
    PERFORM public.rebuild_step_resources_json(step_rec.id);
  END LOOP;
END;
$$;


