-- Revoke execute on SECURITY DEFINER functions not called by the client
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_step_stuck_aggregates(text, text) FROM anon, authenticated, PUBLIC;

-- Allow users to read their own feature requests
CREATE POLICY "Users can view own feature requests"
ON public.feature_requests
FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());