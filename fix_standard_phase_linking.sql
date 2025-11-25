-- Fix Standard Phase Linking to Individual Project Templates
-- This script diagnoses and fixes the issue where standard phases are not properly linked to project templates

-- ============================================
-- STEP 1: Diagnostic - Check current linking state
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  templates_without_standard_phase_id INTEGER;
  phases_without_standard_phase_id INTEGER;
  operations_without_source_link INTEGER;
BEGIN
  -- Count templates with standard phases that don't have standard_phase_id set
  SELECT COUNT(DISTINCT pp.project_id) INTO templates_without_standard_phase_id
  FROM project_phases pp
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true
    AND pp.standard_phase_id IS NULL;
  
  -- Count phases without standard_phase_id
  SELECT COUNT(*) INTO phases_without_standard_phase_id
  FROM project_phases pp
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true
    AND pp.standard_phase_id IS NULL;
  
  -- Count operations without source_operation_id links
  SELECT COUNT(*) INTO operations_without_source_link
  FROM template_operations op
  JOIN project_phases pp ON op.phase_id = pp.id
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true
    AND op.source_operation_id IS NULL;
  
  RAISE NOTICE '=== DIAGNOSTIC RESULTS ===';
  RAISE NOTICE 'Templates with phases missing standard_phase_id: %', templates_without_standard_phase_id;
  RAISE NOTICE 'Phases missing standard_phase_id: %', phases_without_standard_phase_id;
  RAISE NOTICE 'Operations missing source_operation_id: %', operations_without_source_link;
END;
$$;

-- ============================================
-- STEP 2: Fix project_phases - Set standard_phase_id for standard phases in templates
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  template_phase RECORD;
  std_phase RECORD;
  fixed_phases_count INTEGER := 0;
BEGIN
  -- For each standard phase in templates that doesn't have standard_phase_id
  FOR template_phase IN
    SELECT pp.*
    FROM project_phases pp
    WHERE pp.project_id != standard_project_id
      AND pp.is_standard = true
      AND pp.standard_phase_id IS NULL
    ORDER BY pp.project_id, pp.display_order
  LOOP
    -- Try to find matching phase in standard foundation by name
    SELECT * INTO std_phase
    FROM project_phases
    WHERE project_id = standard_project_id
      AND name = template_phase.name
      AND is_standard = true
      AND standard_phase_id IS NOT NULL
    LIMIT 1;
    
    IF std_phase.id IS NOT NULL AND std_phase.standard_phase_id IS NOT NULL THEN
      -- Update the template phase to link to the standard phase
      UPDATE project_phases
      SET standard_phase_id = std_phase.standard_phase_id
      WHERE id = template_phase.id;
      
      fixed_phases_count := fixed_phases_count + 1;
      RAISE NOTICE 'Fixed phase "%" in project % - linked to standard_phase_id %', 
        template_phase.name, template_phase.project_id, std_phase.standard_phase_id;
    ELSE
      RAISE WARNING 'Could not find matching standard phase for "%" in project %', 
        template_phase.name, template_phase.project_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % phases with standard_phase_id', fixed_phases_count;
END;
$$;

-- ============================================
-- STEP 3: Fix template_operations - Set source_operation_id for standard operations
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  template_project RECORD;
  std_phase RECORD;
  template_phase RECORD;
  std_operation RECORD;
  template_operation RECORD;
  fixed_operations_count INTEGER := 0;
BEGIN
  -- For each template project
  FOR template_project IN
    SELECT id, name
    FROM projects
    WHERE id != standard_project_id
      AND is_standard_template = false
      AND is_current_version = true
  LOOP
    -- For each standard phase in the template
    FOR template_phase IN
      SELECT pp.*
      FROM project_phases pp
      WHERE pp.project_id = template_project.id
        AND pp.is_standard = true
        AND pp.standard_phase_id IS NOT NULL
      ORDER BY pp.display_order
    LOOP
      -- Find the corresponding phase in standard foundation
      SELECT * INTO std_phase
      FROM project_phases
      WHERE project_id = standard_project_id
        AND standard_phase_id = template_phase.standard_phase_id
      LIMIT 1;
      
      IF std_phase.id IS NOT NULL THEN
        -- For each operation in the template phase that should be linked
        FOR template_operation IN
          SELECT op.*
          FROM template_operations op
          WHERE op.phase_id = template_phase.id
            AND op.source_operation_id IS NULL  -- Not yet linked
        LOOP
          -- Try to find matching operation in standard foundation
          -- Match by name and display_order first, then by name only
          SELECT * INTO std_operation
          FROM template_operations
          WHERE project_id = standard_project_id
            AND phase_id = std_phase.id
            AND name = template_operation.name
            AND display_order = template_operation.display_order
          LIMIT 1;
          
          -- If no exact match, try by name only
          IF std_operation.id IS NULL THEN
            SELECT * INTO std_operation
            FROM template_operations
            WHERE project_id = standard_project_id
              AND phase_id = std_phase.id
              AND name = template_operation.name
            ORDER BY display_order
            LIMIT 1;
          END IF;
          
          IF std_operation.id IS NOT NULL THEN
            -- Link the template operation to the standard foundation operation
            UPDATE template_operations
            SET 
              source_operation_id = std_operation.id,
              is_reference = true,
              is_standard_phase = true
            WHERE id = template_operation.id;
            
            fixed_operations_count := fixed_operations_count + 1;
          ELSE
            RAISE WARNING 'Could not find matching standard operation for "%" in phase "%" of project %', 
              template_operation.name, template_phase.name, template_project.id;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Fixed % operation links across all templates', fixed_operations_count;
END;
$$;

-- ============================================
-- STEP 4: Rebuild phases JSON for all affected templates
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  template_project RECORD;
  rebuilt_count INTEGER := 0;
BEGIN
  -- Rebuild phases JSON for all templates that have standard phases
  FOR template_project IN
    SELECT DISTINCT p.id, p.name
    FROM projects p
    JOIN project_phases pp ON pp.project_id = p.id
    WHERE p.id != standard_project_id
      AND p.is_standard_template = false
      AND p.is_current_version = true
      AND pp.is_standard = true
  LOOP
    UPDATE projects
    SET phases = public.rebuild_phases_json_from_project_phases(template_project.id)
    WHERE id = template_project.id;
    
    rebuilt_count := rebuilt_count + 1;
    RAISE NOTICE 'Rebuilt phases JSON for project: %', template_project.name;
  END LOOP;
  
  RAISE NOTICE 'Rebuilt phases JSON for % templates', rebuilt_count;
END;
$$;

-- ============================================
-- STEP 5: Final Verification
-- ============================================
DO $$
DECLARE
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  total_templates INTEGER;
  linked_templates INTEGER;
  total_operations INTEGER;
  linked_operations INTEGER;
  phases_with_standard_phase_id INTEGER;
  phases_without_standard_phase_id INTEGER;
BEGIN
  -- Count templates with standard phases
  SELECT COUNT(DISTINCT pp.project_id) INTO total_templates
  FROM project_phases pp
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true;
  
  -- Count templates with at least one linked operation
  SELECT COUNT(DISTINCT pp.project_id) INTO linked_templates
  FROM project_phases pp
  JOIN template_operations op ON op.phase_id = pp.id
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true
    AND op.source_operation_id IS NOT NULL;
  
  -- Count operations
  SELECT COUNT(*) INTO total_operations
  FROM template_operations op
  JOIN project_phases pp ON op.phase_id = pp.id
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true;
  
  -- Count linked operations
  SELECT COUNT(*) INTO linked_operations
  FROM template_operations op
  JOIN project_phases pp ON op.phase_id = pp.id
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true
    AND op.source_operation_id IS NOT NULL;
  
  -- Count phases with standard_phase_id
  SELECT COUNT(*) INTO phases_with_standard_phase_id
  FROM project_phases pp
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true
    AND pp.standard_phase_id IS NOT NULL;
  
  -- Count phases without standard_phase_id
  SELECT COUNT(*) INTO phases_without_standard_phase_id
  FROM project_phases pp
  WHERE pp.project_id != standard_project_id
    AND pp.is_standard = true
    AND pp.standard_phase_id IS NULL;
  
  RAISE NOTICE '=== FINAL VERIFICATION ===';
  RAISE NOTICE 'Templates with standard phases: %', total_templates;
  RAISE NOTICE 'Templates with linked operations: %', linked_templates;
  RAISE NOTICE 'Phases with standard_phase_id: %', phases_with_standard_phase_id;
  RAISE NOTICE 'Phases without standard_phase_id: %', phases_without_standard_phase_id;
  RAISE NOTICE 'Total standard operations in templates: %', total_operations;
  RAISE NOTICE 'Linked operations: %', linked_operations;
  
  IF total_operations > 0 THEN
    RAISE NOTICE 'Linking success rate: % percent', 
      ROUND((linked_operations::NUMERIC / total_operations * 100)::NUMERIC, 2);
  END IF;
  
  IF phases_without_standard_phase_id > 0 THEN
    RAISE WARNING 'WARNING: % phases still missing standard_phase_id', phases_without_standard_phase_id;
  END IF;
  
  IF linked_operations < total_operations THEN
    RAISE WARNING 'WARNING: % operations still not linked', (total_operations - linked_operations);
  END IF;
END;
$$;

