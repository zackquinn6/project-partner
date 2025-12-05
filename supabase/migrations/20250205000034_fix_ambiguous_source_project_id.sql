-- =====================================================
-- FIX AMBIGUOUS source_project_id REFERENCES
-- Qualify function parameter references to avoid ambiguity
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id UUID,
  revision_notes_text TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_project RECORD;
  v_new_project_id UUID;
  v_new_revision_number INTEGER;
  v_phase RECORD;
  v_operation RECORD;
  v_step RECORD;
  v_new_phase_id UUID;
  v_new_operation_id UUID;
BEGIN
  -- Get source project details
  SELECT * INTO v_source_project
  FROM public.projects
  WHERE id = create_project_revision_v2.source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found: %', create_project_revision_v2.source_project_id;
  END IF;
  
  -- Determine revision number
  -- If source has a parent, use its revision number + 1
  -- Otherwise, this is revision 2 (source is revision 1)
  IF v_source_project.parent_project_id IS NOT NULL THEN
    -- Source is already a revision, get its parent's max revision
    SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO v_new_revision_number
    FROM public.projects
    WHERE id = v_source_project.parent_project_id
       OR parent_project_id = v_source_project.parent_project_id;
  ELSE
    -- Source is the original, check for existing revisions
    SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO v_new_revision_number
    FROM public.projects
    WHERE id = create_project_revision_v2.source_project_id
       OR parent_project_id = create_project_revision_v2.source_project_id;
  END IF;
  
  -- Mark old current version as not current
  UPDATE public.projects
  SET is_current_version = false
  WHERE (id = create_project_revision_v2.source_project_id OR parent_project_id = COALESCE(v_source_project.parent_project_id, create_project_revision_v2.source_project_id))
    AND is_current_version = true;
  
  -- Determine parent project ID (the original project, not the source)
  DECLARE
    v_parent_project_id UUID;
  BEGIN
    IF v_source_project.parent_project_id IS NOT NULL THEN
      v_parent_project_id := v_source_project.parent_project_id;
    ELSE
      v_parent_project_id := create_project_revision_v2.source_project_id;
    END IF;
    
    -- Create new revision project
    INSERT INTO public.projects (
      user_id,
      name,
      description,
      icon,
      difficulty_level,
      estimated_time,
      estimated_cost,
      visibility,
      is_template,
      is_standard,
      category,
      tags,
      parent_project_id,
      revision_number,
      is_current_version,
      publish_status,
      revision_notes,
      created_at,
      updated_at
    )
    VALUES (
      v_source_project.user_id,
      v_source_project.name,
      v_source_project.description,
      v_source_project.icon,
      v_source_project.difficulty_level,
      v_source_project.estimated_time,
      v_source_project.estimated_cost,
      v_source_project.visibility,
      v_source_project.is_template,
      false, -- Revisions are never standard
      v_source_project.category,
      v_source_project.tags,
      v_parent_project_id,
      v_new_revision_number,
      true, -- New revision is current
      'draft', -- New revisions start as draft
      revision_notes_text,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_new_project_id;
    
    RAISE NOTICE 'Created new revision % for project % (parent: %)', 
      v_new_revision_number, v_new_project_id, v_parent_project_id;
    
    -- Copy all phases from source project (including linked phases)
    FOR v_phase IN 
      SELECT * FROM public.project_phases
      WHERE project_id = create_project_revision_v2.source_project_id
      ORDER BY display_order
    LOOP
      -- Insert phase
      INSERT INTO public.project_phases (
        project_id,
        name,
        description,
        display_order,
        position_rule,
        position_value,
        is_standard,
        is_linked,
        source_project_id,
        source_project_name,
        created_at,
        updated_at
      )
      VALUES (
        v_new_project_id,
        v_phase.name,
        v_phase.description,
        v_phase.display_order,
        v_phase.position_rule,
        v_phase.position_value,
        v_phase.is_standard,
        v_phase.is_linked,
        v_phase.source_project_id, -- Keep link to original standard if linked
        v_phase.source_project_name,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_new_phase_id;
      
      RAISE NOTICE '  - Copied phase: % (ID: %)', v_phase.name, v_new_phase_id;
      
      -- Copy operations for this phase
      FOR v_operation IN
        SELECT * FROM public.phase_operations
        WHERE phase_id = v_phase.id
        ORDER BY display_order
      LOOP
        INSERT INTO public.phase_operations (
          phase_id,
          operation_name,
          operation_description,
          display_order,
          estimated_time,
          flow_type,
          created_at,
          updated_at
        )
        VALUES (
          v_new_phase_id,
          v_operation.operation_name,
          v_operation.operation_description,
          v_operation.display_order,
          v_operation.estimated_time,
          v_operation.flow_type,
          NOW(),
          NOW()
        )
        RETURNING id INTO v_new_operation_id;
        
        RAISE NOTICE '    - Copied operation: % (ID: %)', v_operation.operation_name, v_new_operation_id;
        
        -- Copy steps for this operation
        FOR v_step IN
          SELECT * FROM public.operation_steps
          WHERE operation_id = v_operation.id
          ORDER BY display_order
        LOOP
          INSERT INTO public.operation_steps (
            operation_id,
            step_title,
            description,
            content_type,
            content,
            display_order,
            materials,
            tools,
            outputs,
            created_at,
            updated_at
          )
          VALUES (
            v_new_operation_id,
            v_step.step_title,
            v_step.description,
            v_step.content_type,
            v_step.content,
            v_step.display_order,
            v_step.materials,
            v_step.tools,
            v_step.outputs,
            NOW(),
            NOW()
          );
          
          RAISE NOTICE '      - Copied step: %', v_step.step_title;
        END LOOP;
      END LOOP;
    END LOOP;
    
    -- Rebuild phases JSONB from relational data
    UPDATE public.projects
    SET phases = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'name', pp.name,
          'description', pp.description,
          'isStandard', COALESCE(pp.is_standard, false),
          'isLinked', COALESCE(pp.is_linked, false),
          'sourceProjectId', pp.source_project_id,
          'sourceProjectName', pp.source_project_name,
          'phaseOrderNumber', CASE
            WHEN pp.position_rule = 'first' THEN to_jsonb('first'::text)
            WHEN pp.position_rule = 'last' THEN to_jsonb('last'::text)
            WHEN pp.position_rule = 'nth' THEN to_jsonb(COALESCE(pp.position_value, 999))
            WHEN pp.position_rule = 'last_minus_n' THEN to_jsonb(COALESCE(pp.position_value, 999))
            ELSE to_jsonb(999)
          END,
          'operations', COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', po.id,
                  'name', po.operation_name,
                  'description', po.operation_description,
                  'estimatedTime', po.estimated_time,
                  'flowType', COALESCE(po.flow_type, 'prime'),
                  'steps', COALESCE(
                    (
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', os.id,
                          'step', os.step_title,
                          'description', os.description,
                          'contentType', COALESCE(os.content_type, 'text'),
                          'content', os.content,
                          'materials', COALESCE(os.materials, '[]'::jsonb),
                          'tools', COALESCE(os.tools, '[]'::jsonb),
                          'outputs', COALESCE(os.outputs, '[]'::jsonb)
                        )
                        ORDER BY os.display_order
                      )
                      FROM operation_steps os
                      WHERE os.operation_id = po.id
                    ),
                    '[]'::jsonb
                  )
                )
                ORDER BY po.display_order
              )
              FROM phase_operations po
              WHERE po.phase_id = pp.id
            ),
            '[]'::jsonb
          )
        )
        ORDER BY pp.display_order
      )
      FROM project_phases pp
      WHERE pp.project_id = v_new_project_id
    ),
    updated_at = NOW()
    WHERE id = v_new_project_id;
    
    RAISE NOTICE '✅ Revision % created successfully with ID: %', v_new_revision_number, v_new_project_id;
    
    RETURN v_new_project_id;
  END;
END;
$$;

COMMENT ON FUNCTION public.create_project_revision_v2 IS 
'Creates a new revision of a project. Copies all phases, operations, and steps from the source project.
Sets the new revision as current_version=true and marks old revisions as current_version=false.
Returns the UUID of the newly created revision.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ create_project_revision_v2 function fixed - ambiguous references resolved';
END $$;

