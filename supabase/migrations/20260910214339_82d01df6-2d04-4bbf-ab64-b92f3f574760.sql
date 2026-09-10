-- Helper: is the caller an admin?
CREATE OR REPLACE FUNCTION public.is_caller_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.roles @> ARRAY['admin']::text[]);
$$;
REVOKE ALL ON FUNCTION public.is_caller_admin() FROM PUBLIC, anon, authenticated;

-- Helper: may the caller edit this project's workflow?
CREATE OR REPLACE FUNCTION public.can_caller_edit_project(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_caller_admin()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.project_owners po WHERE po.project_id = p_project_id AND po.user_id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.can_caller_edit_project(uuid) FROM PUBLIC, anon, authenticated;

-- 1) get_photos_by_project_type -> admin only
ALTER FUNCTION public.get_photos_by_project_type() RENAME TO get_photos_by_project_type_internal;
REVOKE ALL ON FUNCTION public.get_photos_by_project_type_internal() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_photos_by_project_type()
RETURNS TABLE(project_id uuid, template_name text, photo_count bigint, public_count bigint, project_partner_count bigint, personal_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_caller_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.get_photos_by_project_type_internal();
END;
$$;
REVOKE ALL ON FUNCTION public.get_photos_by_project_type() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_photos_by_project_type() TO authenticated;

-- 2) get_help_usage_status -> self or admin
ALTER FUNCTION public.get_help_usage_status(uuid) RENAME TO get_help_usage_status_internal;
REVOKE ALL ON FUNCTION public.get_help_usage_status_internal(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_help_usage_status(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(message_count bigint, message_cap integer, remaining integer, period_start timestamp with time zone, period_end timestamp with time zone, capped boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR (p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_caller_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.get_help_usage_status_internal(COALESCE(p_user_id, auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.get_help_usage_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_help_usage_status(uuid) TO authenticated;

-- 3) create_project_run_snapshot -> only for your own account
ALTER FUNCTION public.create_project_run_snapshot(uuid, uuid, text, uuid, timestamp with time zone, timestamp with time zone) RENAME TO create_project_run_snapshot_internal;
REVOKE ALL ON FUNCTION public.create_project_run_snapshot_internal(uuid, uuid, text, uuid, timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_project_run_snapshot(
  p_project_id uuid,
  p_user_id uuid,
  p_run_name text,
  p_home_id uuid DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_plan_end_date timestamp with time zone DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR (p_user_id IS DISTINCT FROM auth.uid() AND NOT public.is_caller_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN public.create_project_run_snapshot_internal(p_project_id, p_user_id, p_run_name, p_home_id, p_start_date, p_plan_end_date);
END;
$$;
REVOKE ALL ON FUNCTION public.create_project_run_snapshot(uuid, uuid, text, uuid, timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_run_snapshot(uuid, uuid, text, uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

-- 4) rebuild_phases_json_from_project_phases -> admins / project owners
ALTER FUNCTION public.rebuild_phases_json_from_project_phases(uuid) RENAME TO rebuild_phases_json_from_project_phases_internal;
REVOKE ALL ON FUNCTION public.rebuild_phases_json_from_project_phases_internal(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rebuild_phases_json_from_project_phases(p_project_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.can_caller_edit_project(p_project_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN public.rebuild_phases_json_from_project_phases_internal(p_project_id);
END;
$$;
REVOKE ALL ON FUNCTION public.rebuild_phases_json_from_project_phases(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rebuild_phases_json_from_project_phases(uuid) TO authenticated;

-- 5) copy_draft_revision_workflow -> admins / project owners of both projects
ALTER FUNCTION public.copy_draft_revision_workflow(uuid, uuid) RENAME TO copy_draft_revision_workflow_internal;
REVOKE ALL ON FUNCTION public.copy_draft_revision_workflow_internal(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.copy_draft_revision_workflow(p_source_project_id uuid, p_target_project_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (public.can_caller_edit_project(p_source_project_id) AND public.can_caller_edit_project(p_target_project_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN public.copy_draft_revision_workflow_internal(p_source_project_id, p_target_project_id);
END;
$$;
REVOKE ALL ON FUNCTION public.copy_draft_revision_workflow(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_draft_revision_workflow(uuid, uuid) TO authenticated;

-- 6) Role-management readers already gate on admin; ensure anon cannot reach them
REVOKE ALL ON FUNCTION public.get_user_profiles_for_role_management() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_profiles_for_role_management() TO authenticated;
REVOKE ALL ON FUNCTION public.set_user_role_for_management(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role_for_management(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_sessions() TO authenticated;