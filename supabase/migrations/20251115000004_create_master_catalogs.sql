-- Phase 1: Create Master Catalogs for Materials, Tools, Outputs
-- This migration implements relational tables to replace JSONB storage
-- Design Intent: Normalize workflow data for better querying, reporting, and standardization

-- ============================================================================
-- STEP TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.step_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Lucide icon name
  color TEXT, -- Hex color for UI
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert common step types
INSERT INTO public.step_types (name, description, icon, color, display_order) VALUES
  ('measurement', 'Taking measurements and assessments', 'Ruler', '#3B82F6', 1),
  ('preparation', 'Surface prep and workspace setup', 'Wrench', '#8B5CF6', 2),
  ('installation', 'Installing materials or components', 'Hammer', '#EF4444', 3),
  ('inspection', 'Quality checks and validation', 'Eye', '#10B981', 4),
  ('finishing', 'Final touches and cleanup', 'Sparkles', '#F59E0B', 5),
  ('documentation', 'Recording and documenting progress', 'FileText', '#6B7280', 6),
  ('decision', 'User decision or selection required', 'GitBranch', '#EC4899', 7),
  ('calculation', 'Calculations and material estimation', 'Calculator', '#14B8A6', 8)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE public.step_types IS 'Categories of workflow steps for classification and filtering';

-- ============================================================================
-- MATERIALS CATALOG
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'materials' 
      AND column_name = 'item'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'materials' 
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.materials RENAME COLUMN item TO name;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'materials' 
      AND column_name = 'unit_size'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'materials' 
      AND column_name = 'unit'
  ) THEN
    ALTER TABLE public.materials RENAME COLUMN unit_size TO unit;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'lumber', 'fasteners', 'paint', 'electrical', 'plumbing', etc.
  unit TEXT, -- 'each', 'linear feet', 'square feet', 'gallon', 'box', 'pound', etc.
  avg_cost_per_unit DECIMAL(10, 2), -- Average cost for budgeting
  is_rental_available BOOLEAN DEFAULT false,
  supplier_link TEXT, -- Optional link to product page
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_material_name_category UNIQUE(name, category)
);

ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'uncategorized',
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS avg_cost_per_unit DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS is_rental_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_link TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_material_name_category'
      AND conrelid = 'public.materials'::regclass
  ) THEN
    ALTER TABLE public.materials
      ADD CONSTRAINT unique_material_name_category UNIQUE(name, category);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);
CREATE INDEX IF NOT EXISTS idx_materials_name ON public.materials(name);

COMMENT ON TABLE public.materials IS 'Master catalog of materials used across all projects';
COMMENT ON COLUMN public.materials.unit IS 'Unit of measurement for quantity calculations';
COMMENT ON COLUMN public.materials.avg_cost_per_unit IS 'Average cost for budgeting estimates';

-- ============================================================================
-- TOOLS CATALOG
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tools' 
      AND column_name = 'item'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tools' 
      AND column_name = 'name'
  ) THEN
    ALTER TABLE public.tools RENAME COLUMN item TO name;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT, -- 'power', 'hand', 'measuring', 'safety', etc.
  is_rental_available BOOLEAN DEFAULT false,
  avg_rental_cost_per_day DECIMAL(10, 2),
  purchase_cost_estimate DECIMAL(10, 2),
  rental_supplier_link TEXT,
  purchase_supplier_link TEXT,
  safety_notes TEXT, -- Safety considerations for tool use
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS is_rental_available BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_rental_cost_per_day DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS purchase_cost_estimate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS rental_supplier_link TEXT,
  ADD COLUMN IF NOT EXISTS purchase_supplier_link TEXT,
  ADD COLUMN IF NOT EXISTS safety_notes TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tools_category ON public.tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_name ON public.tools(name);
CREATE INDEX IF NOT EXISTS idx_tools_rental_available ON public.tools(is_rental_available);

COMMENT ON TABLE public.tools IS 'Master catalog of tools used across all projects';
COMMENT ON COLUMN public.tools.is_rental_available IS 'Whether this tool is commonly available for rent';

-- ============================================================================
-- OUTPUTS CATALOG
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'output_type' AND typnamespace = 'public'::regnamespace
  ) THEN
    EXECUTE '
      CREATE TYPE public.output_type AS ENUM (
        ''none'',
        ''measurement'',
        ''decision'',
        ''document'',
        ''photo'',
        ''inspection'',
        ''material_list'',
        ''tool_list'',
        ''calculation'',
        ''approval'',
        ''schedule''
      )';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type public.output_type NOT NULL DEFAULT 'none',
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB, -- JSON schema for output validation
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outputs_type ON public.outputs(type);
CREATE INDEX IF NOT EXISTS idx_outputs_name ON public.outputs(name);

COMMENT ON TABLE public.outputs IS 'Master catalog of step outputs (deliverables)';
COMMENT ON COLUMN public.outputs.validation_rules IS 'JSON schema defining required fields and validation rules';

-- ============================================================================
-- PROCESS VARIABLES
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'variable_type' AND typnamespace = 'public'::regnamespace
  ) THEN
    EXECUTE '
      CREATE TYPE public.variable_type AS ENUM (
        ''number'',
        ''text'',
        ''boolean'',
        ''date'',
        ''measurement'',
        ''list''
      )';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.process_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  variable_type public.variable_type NOT NULL,
  unit TEXT, -- For measurement types (ft, sqft, inches, etc.)
  default_value TEXT,
  validation_rules JSONB, -- Min/max, regex, etc.
  used_in_calculations BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_process_variables_name ON public.process_variables(name);
CREATE INDEX IF NOT EXISTS idx_process_variables_type ON public.process_variables(variable_type);

COMMENT ON TABLE public.process_variables IS 'Dynamic variables used in workflows for calculations and decisions';
COMMENT ON COLUMN public.process_variables.used_in_calculations IS 'Whether this variable is used in material/cost calculations';

-- ============================================================================
-- JUNCTION TABLES (Step Relationships)
-- ============================================================================

-- Link steps to materials
CREATE TABLE IF NOT EXISTS public.step_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2),
  quantity_formula TEXT, -- Formula using process variables (e.g., "area * 1.1")
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_step_material UNIQUE(step_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_step_materials_step ON public.step_materials(step_id);
CREATE INDEX IF NOT EXISTS idx_step_materials_material ON public.step_materials(material_id);

COMMENT ON TABLE public.step_materials IS 'Junction table linking steps to required materials';
COMMENT ON COLUMN public.step_materials.quantity_formula IS 'Formula for dynamic quantity calculation using process variables';

-- Link steps to tools
CREATE TABLE IF NOT EXISTS public.step_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  is_optional BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_step_tool UNIQUE(step_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_step_tools_step ON public.step_tools(step_id);
CREATE INDEX IF NOT EXISTS idx_step_tools_tool ON public.step_tools(tool_id);

COMMENT ON TABLE public.step_tools IS 'Junction table linking steps to required tools';

-- Link steps to outputs
CREATE TABLE IF NOT EXISTS public.step_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  output_id UUID NOT NULL REFERENCES public.outputs(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_step_output UNIQUE(step_id, output_id)
);

CREATE INDEX IF NOT EXISTS idx_step_outputs_step ON public.step_outputs(step_id);
CREATE INDEX IF NOT EXISTS idx_step_outputs_output ON public.step_outputs(output_id);

COMMENT ON TABLE public.step_outputs IS 'Junction table linking steps to expected outputs';

-- Link steps to process variables
CREATE TABLE IF NOT EXISTS public.step_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.template_steps(id) ON DELETE CASCADE,
  variable_id UUID NOT NULL REFERENCES public.process_variables(id) ON DELETE CASCADE,
  is_input BOOLEAN DEFAULT true, -- true = step collects this value, false = step uses this value
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_step_variable UNIQUE(step_id, variable_id)
);

CREATE INDEX IF NOT EXISTS idx_step_variables_step ON public.step_variables(step_id);
CREATE INDEX IF NOT EXISTS idx_step_variables_variable ON public.step_variables(variable_id);

COMMENT ON TABLE public.step_variables IS 'Junction table linking steps to process variables they collect or use';

-- Link step types to steps
ALTER TABLE public.template_steps 
  ADD COLUMN IF NOT EXISTS step_type_id UUID REFERENCES public.step_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_template_steps_type ON public.template_steps(step_type_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.step_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_variables ENABLE ROW LEVEL SECURITY;

-- Everyone can view catalogs
DROP POLICY IF EXISTS "Everyone can view step types" ON public.step_types;
CREATE POLICY "Everyone can view step types" ON public.step_types FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view materials" ON public.materials;
CREATE POLICY "Everyone can view materials" ON public.materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view tools" ON public.tools;
CREATE POLICY "Everyone can view tools" ON public.tools FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view outputs" ON public.outputs;
CREATE POLICY "Everyone can view outputs" ON public.outputs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view process variables" ON public.process_variables;
CREATE POLICY "Everyone can view process variables" ON public.process_variables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view step materials" ON public.step_materials;
CREATE POLICY "Everyone can view step materials" ON public.step_materials FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view step tools" ON public.step_tools;
CREATE POLICY "Everyone can view step tools" ON public.step_tools FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view step outputs" ON public.step_outputs;
CREATE POLICY "Everyone can view step outputs" ON public.step_outputs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Everyone can view step variables" ON public.step_variables;
CREATE POLICY "Everyone can view step variables" ON public.step_variables FOR SELECT USING (true);

-- Only admins can manage catalogs
DROP POLICY IF EXISTS "Admins can manage step types" ON public.step_types;
CREATE POLICY "Admins can manage step types" ON public.step_types FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials" ON public.materials FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage tools" ON public.tools;
CREATE POLICY "Admins can manage tools" ON public.tools FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage outputs" ON public.outputs;
CREATE POLICY "Admins can manage outputs" ON public.outputs FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage process variables" ON public.process_variables;
CREATE POLICY "Admins can manage process variables" ON public.process_variables FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage step materials" ON public.step_materials;
CREATE POLICY "Admins can manage step materials" ON public.step_materials FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage step tools" ON public.step_tools;
CREATE POLICY "Admins can manage step tools" ON public.step_tools FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage step outputs" ON public.step_outputs;
CREATE POLICY "Admins can manage step outputs" ON public.step_outputs FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can manage step variables" ON public.step_variables;
CREATE POLICY "Admins can manage step variables" ON public.step_variables FOR ALL USING (is_admin(auth.uid()));

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_step_types_updated_at ON public.step_types;
CREATE TRIGGER update_step_types_updated_at BEFORE UPDATE ON public.step_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tools_updated_at ON public.tools;
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON public.tools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_outputs_updated_at ON public.outputs;
CREATE TRIGGER update_outputs_updated_at BEFORE UPDATE ON public.outputs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_process_variables_updated_at ON public.process_variables;
CREATE TRIGGER update_process_variables_updated_at BEFORE UPDATE ON public.process_variables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIGRATION FUNCTIONS
-- ============================================================================

-- Function to migrate materials from JSONB to relational
CREATE OR REPLACE FUNCTION migrate_materials_from_jsonb_to_relational()
RETURNS INTEGER AS $$
DECLARE
  step_record RECORD;
  material_json JSONB;
  material_name TEXT;
  material_id UUID;
  migrated_count INTEGER := 0;
BEGIN
  -- Loop through all steps with materials
  FOR step_record IN
    SELECT id, materials FROM template_steps 
    WHERE materials IS NOT NULL AND jsonb_array_length(materials) > 0
  LOOP
    -- Loop through each material in the JSONB array
    FOR material_json IN SELECT * FROM jsonb_array_elements(step_record.materials)
    LOOP
      material_name := material_json->>'name';
      
      IF material_name IS NOT NULL AND material_name != '' THEN
        -- Insert or get material from catalog
        INSERT INTO materials (name, description, category, unit)
        VALUES (
          material_name,
          material_json->>'description',
          'uncategorized', -- Default category
          material_json->>'unit'
        )
        ON CONFLICT (name, category) DO UPDATE SET
          description = COALESCE(EXCLUDED.description, materials.description),
          unit = COALESCE(EXCLUDED.unit, materials.unit)
        RETURNING id INTO material_id;
        
        -- Link material to step
        INSERT INTO step_materials (step_id, material_id, quantity, is_optional, notes)
        VALUES (
          step_record.id,
          material_id,
          COALESCE((material_json->>'quantity')::DECIMAL, 1),
          COALESCE((material_json->>'isOptional')::BOOLEAN, false),
          material_json->>'notes'
        )
        ON CONFLICT (step_id, material_id) DO NOTHING;
        
        migrated_count := migrated_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate tools from JSONB to relational
CREATE OR REPLACE FUNCTION migrate_tools_from_jsonb_to_relational()
RETURNS INTEGER AS $$
DECLARE
  step_record RECORD;
  tool_json JSONB;
  tool_name TEXT;
  tool_id UUID;
  migrated_count INTEGER := 0;
BEGIN
  FOR step_record IN
    SELECT id, tools FROM template_steps 
    WHERE tools IS NOT NULL AND jsonb_array_length(tools) > 0
  LOOP
    FOR tool_json IN SELECT * FROM jsonb_array_elements(step_record.tools)
    LOOP
      tool_name := tool_json->>'name';
      
      IF tool_name IS NOT NULL AND tool_name != '' THEN
        INSERT INTO tools (name, description, category)
        VALUES (
          tool_name,
          tool_json->>'description',
          'uncategorized'
        )
        ON CONFLICT (name) DO UPDATE SET
          description = COALESCE(EXCLUDED.description, tools.description)
        RETURNING id INTO tool_id;
        
        INSERT INTO step_tools (step_id, tool_id, is_optional, notes)
        VALUES (
          step_record.id,
          tool_id,
          COALESCE((tool_json->>'isOptional')::BOOLEAN, false),
          tool_json->>'notes'
        )
        ON CONFLICT (step_id, tool_id) DO NOTHING;
        
        migrated_count := migrated_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate outputs from JSONB to relational
CREATE OR REPLACE FUNCTION migrate_outputs_from_jsonb_to_relational()
RETURNS INTEGER AS $$
DECLARE
  step_record RECORD;
  output_json JSONB;
  output_name TEXT;
  output_record_id UUID;
  output_type_val TEXT;
  migrated_count INTEGER := 0;
BEGIN
  FOR step_record IN
    SELECT id, outputs FROM template_steps 
    WHERE outputs IS NOT NULL AND jsonb_array_length(outputs) > 0
  LOOP
    FOR output_json IN SELECT * FROM jsonb_array_elements(step_record.outputs)
    LOOP
      output_name := output_json->>'name';
      output_type_val := COALESCE(output_json->>'type', 'none');
      
      IF output_name IS NOT NULL AND output_name != '' THEN
        INSERT INTO outputs (name, description, type, is_required)
        VALUES (
          output_name,
          output_json->>'description',
          output_type_val::output_type,
          false
        )
        ON CONFLICT (name) DO UPDATE SET
          description = COALESCE(EXCLUDED.description, outputs.description),
          type = EXCLUDED.type
        RETURNING id INTO output_record_id;
        
        INSERT INTO step_outputs (step_id, output_id, is_required, notes)
        VALUES (
          step_record.id,
          output_record_id,
          COALESCE((output_json->>'isRequired')::BOOLEAN, false),
          output_json->>'notes'
        )
        ON CONFLICT (step_id, output_id) DO NOTHING;
        
        migrated_count := migrated_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute migrations
SELECT migrate_materials_from_jsonb_to_relational() as materials_migrated;
SELECT migrate_tools_from_jsonb_to_relational() as tools_migrated;
SELECT migrate_outputs_from_jsonb_to_relational() as outputs_migrated;

-- ============================================================================
-- HELPER VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: All materials for a specific step
CREATE OR REPLACE VIEW step_materials_detail AS
SELECT 
  sm.step_id,
  sm.id as step_material_id,
  m.id as material_id,
  m.name as material_name,
  m.description as material_description,
  m.category as material_category,
  m.unit as material_unit,
  sm.quantity,
  sm.quantity_formula,
  sm.is_optional,
  m.avg_cost_per_unit,
  (sm.quantity * m.avg_cost_per_unit) as estimated_cost,
  sm.notes
FROM step_materials sm
JOIN materials m ON sm.material_id = m.id;

-- View: All tools for a specific step
CREATE OR REPLACE VIEW step_tools_detail AS
SELECT 
  st.step_id,
  st.id as step_tool_id,
  t.id as tool_id,
  t.name as tool_name,
  t.description as tool_description,
  t.category as tool_category,
  t.is_rental_available,
  t.avg_rental_cost_per_day,
  st.is_optional,
  st.notes
FROM step_tools st
JOIN tools t ON st.tool_id = t.id;

-- View: All outputs for a specific step
CREATE OR REPLACE VIEW step_outputs_detail AS
SELECT 
  so.step_id,
  so.id as step_output_id,
  o.id as output_id,
  o.name as output_name,
  o.description as output_description,
  o.type as output_type,
  so.is_required,
  o.validation_rules,
  so.notes
FROM step_outputs so
JOIN outputs o ON so.output_id = o.id;

COMMENT ON VIEW step_materials_detail IS 'Complete material information for each step with cost calculations';
COMMENT ON VIEW step_tools_detail IS 'Complete tool information for each step';
COMMENT ON VIEW step_outputs_detail IS 'Complete output information for each step';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 1 Complete: Master catalogs created and data migrated';
  RAISE NOTICE 'Tables created: step_types, materials, tools, outputs, process_variables';
  RAISE NOTICE 'Junction tables: step_materials, step_tools, step_outputs, step_variables';
  RAISE NOTICE 'JSONB data migrated to relational tables (JSONB columns preserved for backwards compatibility)';
END $$;

