-- Create function to incorporate the latest revision of a linked phase
CREATE OR REPLACE FUNCTION public.incorporate_latest_phase_revision(
    p_project_id uuid,
    p_phase_id text,
    p_source_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    current_project record;
    source_project record;
    current_phases jsonb;
    updated_phases jsonb;
    phase_element jsonb;
    rebuilt_source_phases jsonb;
    phase_name_to_match text;
    source_phase_data jsonb;
    updated_phase jsonb;
BEGIN
    -- Only admins can run this function
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Get the current project
    SELECT * INTO current_project
    FROM public.projects
    WHERE id = p_project_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Project not found: %', p_project_id;
    END IF;

    -- Get the source project (latest published revision)
    SELECT * INTO source_project
    FROM public.projects
    WHERE id = p_source_project_id
      AND publish_status = 'published'
      AND is_current_version = true
    ORDER BY revision_number DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source project not found or not published: %', p_source_project_id;
    END IF;

    -- Rebuild phases from source project to get latest structure
    SELECT phases INTO rebuilt_source_phases
    FROM public.rebuild_phases_json_from_project_phases(p_source_project_id);
    
    IF rebuilt_source_phases IS NULL THEN
        -- Fallback to stored phases
        SELECT phases INTO rebuilt_source_phases
        FROM public.projects
        WHERE id = p_source_project_id
          AND publish_status = 'published'
          AND is_current_version = true;
    END IF;

    -- Get current phases
    current_phases := COALESCE(current_project.phases, '[]'::jsonb);

    -- Get the phase name from current project to match in source
    SELECT phase->>'name' INTO phase_name_to_match
    FROM jsonb_array_elements(current_phases) phase
    WHERE phase->>'id' = p_phase_id
    LIMIT 1;
    
    -- Find matching phase in source project by name
    SELECT phase INTO source_phase_data
    FROM jsonb_array_elements(rebuilt_source_phases) phase
    WHERE phase->>'name' = phase_name_to_match
      AND COALESCE(phase->>'isStandard', 'false') = 'false'  -- Only non-standard phases
    LIMIT 1;
    
    IF source_phase_data IS NULL THEN
        RAISE EXCEPTION 'Phase "%" not found in source project', phase_name_to_match;
    END IF;
    
    -- Build updated phases array
    updated_phases := jsonb_agg(
        CASE
            WHEN phase->>'id' = p_phase_id AND phase->>'isLinked' = 'true' THEN
                -- Update this phase with latest data from source, preserving ID and order
                source_phase_data || jsonb_build_object(
                    'id', phase->>'id',  -- Keep the same ID in the incorporating project
                    'isLinked', true,
                    'sourceProjectId', p_source_project_id::text,
                    'sourceProjectName', source_project.name,
                    'incorporatedRevision', source_project.revision_number,
                    'sourceScalingUnit', COALESCE(phase->>'sourceScalingUnit', source_project.scaling_unit),
                    'phaseOrderNumber', phase->>'phaseOrderNumber'  -- Preserve order number
                )
            ELSE
                phase
        END
    )
    FROM jsonb_array_elements(current_phases) phase;

    -- Update the project with new phases
    UPDATE public.projects
    SET phases = updated_phases,
        updated_at = now()
    WHERE id = p_project_id;

    -- Remove the alert for this phase
    PERFORM public.update_phase_revision_alert(
        p_project_id,
        p_phase_id,
        'incorporate'
    );

    -- Log the action
    PERFORM log_comprehensive_security_event(
        'phase_revision_incorporated',
        'medium',
        'Admin incorporated latest revision for linked phase',
        auth.uid(),
        NULL, NULL, NULL,
        jsonb_build_object(
            'project_id', p_project_id,
            'phase_id', p_phase_id,
            'source_project_id', p_source_project_id,
            'source_revision', source_project.revision_number
        )
    );
END;
$$;

COMMENT ON FUNCTION public.incorporate_latest_phase_revision IS 'Incorporates the latest published revision of a linked phase into a project';
