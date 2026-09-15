CREATE OR REPLACE FUNCTION public.user_achievements_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text;
BEGIN
  -- Service role / server-side jobs bypass caller checks.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot record achievements for another user';
    END IF;
  END IF;

  v_type := COALESCE(NEW.type, 'unlock');
  IF v_type NOT IN ('xp', 'unlock') THEN
    RAISE EXCEPTION 'Invalid achievement type';
  END IF;

  IF NEW.project_run_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_runs pr
      WHERE pr.id = NEW.project_run_id AND pr.user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Project run does not belong to this user';
    END IF;
  END IF;

  IF v_type = 'xp' THEN
    IF NEW.xp_amount IS NULL OR NEW.xp_amount < 0 OR NEW.xp_amount > 1000 THEN
      RAISE EXCEPTION 'XP amount out of allowed range';
    END IF;
    IF TG_OP = 'INSERT' AND EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = NEW.user_id
        AND COALESCE(ua.type, 'unlock') = 'xp'
        AND COALESCE(ua.project_run_id::text, '') = COALESCE(NEW.project_run_id::text, '')
        AND COALESCE(ua.phase_name, '') = COALESCE(NEW.phase_name, '')
        AND COALESCE(ua.reason, '') = COALESCE(NEW.reason, '')
    ) THEN
      RAISE EXCEPTION 'XP already awarded for this milestone';
    END IF;
  ELSE
    IF NEW.achievement_id IS NULL THEN
      RAISE EXCEPTION 'Achievement id required';
    END IF;
    NEW.xp_amount := NULL;
    IF TG_OP = 'INSERT' AND EXISTS (
      SELECT 1 FROM public.user_achievements ua
      WHERE ua.user_id = NEW.user_id
        AND COALESCE(ua.type, 'unlock') <> 'xp'
        AND ua.achievement_id = NEW.achievement_id
    ) THEN
      RAISE EXCEPTION 'Achievement already unlocked';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.user_achievements_validate() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_achievements_validate_trg ON public.user_achievements;
CREATE TRIGGER user_achievements_validate_trg
BEFORE INSERT OR UPDATE ON public.user_achievements
FOR EACH ROW EXECUTE FUNCTION public.user_achievements_validate();