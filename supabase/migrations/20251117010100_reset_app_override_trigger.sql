-- Ensure app overrides can be saved now that template operations no longer have standard_phase_id
-- Recreate the update_app_names_in_templates helper without any references to template_operations.standard_phase_id
-- and rebuild the trigger that fires after an override changes.

DROP TRIGGER IF EXISTS update_app_names_on_override_trigger ON public.app_overrides;
DROP FUNCTION IF EXISTS public.trigger_update_app_names_on_override() CASCADE;
DROP FUNCTION IF EXISTS public.update_app_names_in_templates(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_app_names_in_templates(
  p_app_id TEXT,
  p_app_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  step_record RECORD;
  updated_apps JSONB;
  app_updated BOOLEAN;
  i INTEGER;
  current_app JSONB;
  app_action_key TEXT;
  app_id_value TEXT;
BEGIN
  RAISE NOTICE 'Updating app % in all template_steps with name: %', p_app_id, p_app_name;
  
  FOR step_record IN
    SELECT id, apps
    FROM public.template_steps
    WHERE apps IS NOT NULL
      AND apps != '[]'::jsonb
      AND jsonb_typeof(apps) = 'array'
  LOOP
    app_updated := false;
    updated_apps := jsonb_build_array();

    FOR i IN 0..jsonb_array_length(step_record.apps) - 1 LOOP
      current_app := step_record.apps->i;
      app_action_key := current_app->>'actionKey';
      app_id_value := current_app->>'id';

      IF (
        app_id_value = p_app_id OR 
        REPLACE(app_id_value, 'app-', '') = p_app_id OR 
        app_action_key = p_app_id
      ) THEN
        updated_apps := updated_apps || jsonb_build_object(
          'id', COALESCE(app_id_value, CONCAT('app-', p_app_id)),
          'appName', p_app_name,
          'appType', COALESCE(current_app->>'appType', 'native'),
          'icon', COALESCE(NULLIF(p_icon, ''), current_app->>'icon', 'Sparkles'),
          'description', COALESCE(NULLIF(p_description, ''), current_app->>'description', ''),
          'actionKey', COALESCE(app_action_key, p_app_id),
          'displayOrder', COALESCE((current_app->>'displayOrder')::INTEGER, 1),
          'embedUrl', current_app->>'embedUrl',
          'linkUrl', current_app->>'linkUrl',
          'openInNewTab', (current_app->>'openInNewTab')::BOOLEAN,
          'isBeta', (current_app->>'isBeta')::BOOLEAN
        );
        app_updated := true;
      ELSE
        updated_apps := updated_apps || current_app;
      END IF;
    END LOOP;

    IF app_updated THEN
      UPDATE public.template_steps
      SET apps = updated_apps,
          updated_at = now()
      WHERE id = step_record.id;

      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated template_step %', step_record.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Updated app name in % template_steps', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_app_names_in_templates IS
'Updates app names inside template_steps when an app override changes. Compatible with normalized phase schema.';

CREATE OR REPLACE FUNCTION public.trigger_update_app_names_on_override()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_app_names_in_templates(
    NEW.app_id,
    NEW.app_name,
    NEW.description,
    NEW.icon
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_app_names_on_override_trigger
  AFTER INSERT OR UPDATE OF app_name, description, icon ON public.app_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_app_names_on_override();

