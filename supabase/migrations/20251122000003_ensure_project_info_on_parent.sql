-- Ensure project information is stored on parent project and shared across revisions
-- When creating revisions, use parent project's project info fields instead of copying from source
-- This ensures project info (description, category, estimated times, etc.) is consistent across all revisions

CREATE OR REPLACE FUNCTION public.create_project_revision_v2(
  source_project_id UUID,
  revision_notes_text TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_project_id UUID;
  source_project RECORD;
  phase_record RECORD;
  new_phase_id UUID;
  operation_record RECORD;
  new_operation_id UUID;
  step_record RECORD;
  parent_project_id_val UUID;
  max_revision_number INTEGER;
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  parent_project RECORD;
BEGIN
  -- Prevent revisions of Standard Project
  IF source_project_id = standard_project_id THEN
    RAISE EXCEPTION 'Cannot create revision of Standard Project Foundation';
  END IF;
  
  -- Get source project
  SELECT * INTO source_project FROM projects WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found';
  END IF;
  
  -- Determine parent project ID
  parent_project_id_val := COALESCE(source_project.parent_project_id, source_project_id);
  
  -- Get parent project to reuse project info and photos/images from parent (shared across all revisions)
  SELECT * INTO parent_project FROM projects WHERE id = parent_project_id_val;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent project not found';
  END IF;
  
  -- Calculate revision number: MAX across all revisions of the same parent + 1
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO max_revision_number
  FROM projects
  WHERE parent_project_id = parent_project_id_val OR id = parent_project_id_val;
  
  RAISE NOTICE 'Creating revision % for parent project %', max_revision_number, parent_project_id_val;
  
  -- Create new project (revision) - use parent project's project info and images (shared across all revisions)
  INSERT INTO projects (
    name,
    description,
    category,
    difficulty,
    effort_level,
    skill_level,
    estimated_time,
    estimated_time_per_unit,
    scaling_unit,
    project_challenges,
    item_type,
    project_type,
    publish_status,
    created_by,
    parent_project_id,
    revision_number,
    revision_notes,
    is_standard_template,
    is_current_version,
    estimated_total_time,
    typical_project_size,
    -- Reuse photos/images from parent project (shared across all revisions)
    cover_image,
    image,
    images
  ) VALUES (
    source_project.name, -- Name can be different per revision
    -- Use parent project's project info fields (shared across all revisions)
    parent_project.description,
    parent_project.category,
    parent_project.difficulty,
    parent_project.effort_level,
    parent_project.skill_level,
    parent_project.estimated_time,
    parent_project.estimated_time_per_unit,
    parent_project.scaling_unit,
    parent_project.project_challenges,
    parent_project.item_type,
    parent_project.project_type,
    'draft',
    auth.uid(),
    parent_project_id_val,
    max_revision_number,
    revision_notes_text,
    false,
    true,
    parent_project.estimated_total_time,
    parent_project.typical_project_size,
    -- Use parent project's images (shared across revisions)
    parent_project.cover_image,
    parent_project.image,
    parent_project.images
  ) RETURNING id INTO new_project_id;
  
  -- Archive source project (but keep it, don't delete)
  UPDATE projects
  SET is_current_version = false,
      publish_status = 'archived'
  WHERE id = source_project_id;
  
  -- Only copy CUSTOM phases (is_standard = false) - standard phases remain dynamically linked
  FOR phase_record IN
    SELECT *
    FROM public.project_phases
    WHERE project_id = source_project_id
      AND is_standard = false
    ORDER BY display_order
  LOOP
    -- Insert custom phase into new revision
    INSERT INTO public.project_phases (
      project_id,
      name,
      description,
      display_order,
      is_standard,
      is_linked,
      source_project_id,
      source_phase_id,
      source_scaling_unit,
      estimated_time,
      estimated_total_time,
      typical_project_size
    ) VALUES (
      new_project_id,
      phase_record.name,
      phase_record.description,
      phase_record.display_order,
      false,
      phase_record.is_linked,
      phase_record.source_project_id,
      phase_record.source_phase_id,
      phase_record.source_scaling_unit,
      phase_record.estimated_time,
      phase_record.estimated_total_time,
      phase_record.typical_project_size
    ) RETURNING id INTO new_phase_id;
    
    -- Copy operations for this custom phase
    FOR operation_record IN
      SELECT *
      FROM public.phase_operations
      WHERE phase_id = phase_record.id
      ORDER BY display_order
    LOOP
      INSERT INTO public.phase_operations (
        phase_id,
        name,
        description,
        display_order,
        source_operation_id
      ) VALUES (
        new_phase_id,
        operation_record.name,
        operation_record.description,
        operation_record.display_order,
        operation_record.source_operation_id
      ) RETURNING id INTO new_operation_id;
      
      -- Copy steps for this operation
      FOR step_record IN
        SELECT *
        FROM public.operation_steps
        WHERE operation_id = operation_record.id
        ORDER BY display_order
      LOOP
        INSERT INTO public.operation_steps (
          operation_id,
          step,
          description,
          display_order,
          step_type,
          time_estimation,
          skill_level,
          effort_level,
          workers_needed,
          apps,
          source_step_id,
          outputs,
          tools_materials,
          risks
        ) VALUES (
          new_operation_id,
          step_record.step,
          step_record.description,
          step_record.display_order,
          step_record.step_type,
          step_record.time_estimation,
          step_record.skill_level,
          step_record.effort_level,
          step_record.workers_needed,
          step_record.apps,
          step_record.source_step_id,
          step_record.outputs,
          step_record.tools_materials,
          step_record.risks
        );
      END LOOP;
    END LOOP;
  END LOOP;
  
  -- Rebuild phases JSON for the new revision
  -- This will dynamically include standard phases from Standard Project Foundation
  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases(new_project_id, NULL)
  WHERE id = new_project_id;
  
  RETURN new_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_project_revision_v2(UUID, TEXT) IS 
'Creates a new revision of a project. Uses parent project''s project info fields (description, category, estimated times, etc.) and images (shared across all revisions). Only copies CUSTOM phases (is_standard = false) into project_phases. Standard phases remain dynamically linked from Standard Project Foundation via rebuild_phases_json_from_project_phases.';

-- Update project_templates_live view to inherit all project info from parent project
-- This ensures project info is consistent across all revisions in the catalog
DROP VIEW IF EXISTS public.project_templates_live;

CREATE VIEW public.project_templates_live AS
SELECT
  p.id,
  p.name,
  -- Inherit project info from parent project (or use self if no parent)
  COALESCE(parent.description, p.description) AS description,
  COALESCE(parent.project_challenges, p.project_challenges) AS project_challenges,
  COALESCE(parent.project_type, p.project_type) AS project_type,
  -- Always use parent project's images if parent exists (shared across all revisions)
  CASE 
    WHEN p.parent_project_id IS NOT NULL THEN COALESCE(parent.image, parent.cover_image, (CASE WHEN parent.images IS NOT NULL AND array_length(parent.images, 1) > 0 THEN parent.images[1] ELSE NULL END))
    ELSE p.image
  END AS image,
  CASE 
    WHEN p.parent_project_id IS NOT NULL THEN parent.images
    ELSE p.images
  END AS images,
  CASE 
    WHEN p.parent_project_id IS NOT NULL THEN parent.cover_image
    ELSE p.cover_image
  END AS cover_image,
  -- Inherit project info fields from parent
  COALESCE(parent.category, p.category) AS category,
  COALESCE(parent.difficulty, p.difficulty) AS difficulty,
  COALESCE(parent.effort_level, p.effort_level) AS effort_level,
  COALESCE(parent.skill_level, p.skill_level) AS skill_level,
  COALESCE(parent.estimated_time, p.estimated_time) AS estimated_time,
  COALESCE(parent.estimated_time_per_unit, p.estimated_time_per_unit) AS estimated_time_per_unit,
  COALESCE(parent.scaling_unit, p.scaling_unit) AS scaling_unit,
  COALESCE(parent.item_type, p.item_type) AS item_type,
  -- Inherit estimated total time and typical project size from parent
  COALESCE(
    parent.estimated_total_time,
    p.estimated_total_time
  ) AS estimated_total_time,
  COALESCE(
    parent.typical_project_size,
    p.typical_project_size
  ) AS typical_project_size,
  p.publish_status,
  p.published_at,
  p.beta_released_at,
  p.archived_at,
  p.release_notes,
  p.revision_notes,
  p.revision_number,
  p.parent_project_id,
  p.created_from_revision,
  p.is_standard_template,
  p.is_current_version,
  p.phase_revision_alerts,
  p.owner_id,
  p.created_by,
  p.created_at,
  p.updated_at,
  p.start_date,
  p.plan_end_date,
  p.end_date,
  COALESCE(
    public.rebuild_phases_json_from_project_phases(p.id, NULL),
    '[]'::jsonb
  ) AS phases
FROM public.projects p
LEFT JOIN public.projects parent ON parent.id = p.parent_project_id;

GRANT SELECT ON public.project_templates_live TO authenticated;
GRANT SELECT ON public.project_templates_live TO anon;

COMMENT ON VIEW public.project_templates_live IS 
'Live view of project templates. All project info fields (description, category, estimated times, images, etc.) are inherited from parent project to ensure consistency across revisions.';

