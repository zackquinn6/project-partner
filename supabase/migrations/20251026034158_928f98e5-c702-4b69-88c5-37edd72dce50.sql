-- Fix check_phase_revision_updates to handle non-array phase_revision_alerts
CREATE OR REPLACE FUNCTION public.check_phase_revision_updates()
RETURNS TABLE(
    project_id uuid,
    project_name text,
    alerts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Only admins can run this function
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id as project_id,
        p.name as project_name,
        p.phase_revision_alerts as alerts
    FROM public.projects p
    WHERE p.phase_revision_alerts IS NOT NULL
      AND jsonb_typeof(p.phase_revision_alerts) = 'array'
      AND jsonb_array_length(p.phase_revision_alerts) > 0
    ORDER BY p.updated_at DESC;
END;
$$;