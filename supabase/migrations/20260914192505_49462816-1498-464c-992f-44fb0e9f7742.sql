-- 1) Fix mutable search_path on helper functions
ALTER FUNCTION public.apply_decision_details_to_phases_json(jsonb, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.remap_id_array_via_map(jsonb, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.remap_id_text_via_map(text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.remap_scheduling_prerequisites_for_revision(jsonb, jsonb) SET search_path = public, pg_temp;

-- 2) Anonymous callers must not run the internal rate-limit check
REVOKE EXECUTE ON FUNCTION public.enhanced_rate_limit_check(text, text, integer, integer) FROM anon;

-- 3) Standardize admin check in user_sessions SELECT policy
DROP POLICY IF EXISTS user_sessions_select_visible ON public.user_sessions;
CREATE POLICY user_sessions_select_visible
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());