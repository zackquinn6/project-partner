-- Function to update app names in all template_steps when an app override is created/updated
-- This ensures app name changes propagate dynamically to all project templates

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
BEGIN
  RAISE NOTICE 'Updating app % in all template_steps with name: %', p_app_id, p_app_name;
  
  -- Loop through all template_steps that have apps
  FOR step_record IN
    SELECT id, apps
    FROM public.template_steps
    WHERE apps IS NOT NULL
      AND apps != '[]'::jsonb
      AND jsonb_typeof(apps) = 'array'
  LOOP
    app_updated := false;
    updated_apps := jsonb_build_array();
    
    -- Update each app in the array if it matches
    FOR i IN 0..jsonb_array_length(step_record.apps) - 1 LOOP
      DECLARE
        current_app JSONB;
        app_action_key TEXT;
        app_id_value TEXT;
      BEGIN
        current_app := step_record.apps->i;
        app_action_key := current_app->>'actionKey';
        app_id_value := current_app->>'id';
        
        -- Match by app.id OR actionKey
        IF (app_id_value = p_app_id OR app_action_key = p_app_id OR 
            app_id_value = CONCAT('app-', p_app_id) OR 
            app_action_key = p_app_id OR
            -- Handle cases where app_id is just the actionKey without "app-" prefix
            (app_id_value LIKE CONCAT('%', p_app_id, '%') AND 
             (app_action_key IS NULL OR app_action_key = p_app_id))) THEN
          
          -- Update the app with new name and optionally description/icon
          updated_apps := updated_apps || jsonb_build_object(
            'id', COALESCE(app_id_value, CONCAT('app-', p_app_id)),
            'appName', p_app_name,
            'appType', COALESCE(current_app->>'appType', 'native'),
            'icon', COALESCE(p_icon, current_app->>'icon', 'Sparkles'),
            'description', COALESCE(p_description, current_app->>'description', ''),
            'actionKey', COALESCE(app_action_key, p_app_id),
            'displayOrder', COALESCE((current_app->>'displayOrder')::INTEGER, 1),
            -- Preserve other fields
            'embedUrl', current_app->>'embedUrl',
            'linkUrl', current_app->>'linkUrl',
            'openInNewTab', (current_app->>'openInNewTab')::BOOLEAN,
            'isBeta', (current_app->>'isBeta')::BOOLEAN
          );
          app_updated := true;
        ELSE
          -- Keep the app as-is
          updated_apps := updated_apps || current_app;
        END IF;
      END;
    END LOOP;
    
    -- If any app was updated, save the changes
    IF app_updated THEN
      UPDATE public.template_steps
      SET apps = updated_apps,
          updated_at = now()
      WHERE id = step_record.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Updated step % (project: %, operation: %)', 
        step_record.id,
        (SELECT project_id FROM template_operations WHERE id = 
         (SELECT operation_id FROM template_steps WHERE id = step_record.id)),
        (SELECT operation_id FROM template_steps WHERE id = step_record.id);
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Updated app name in % template_steps', updated_count;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_app_names_in_templates IS 'Updates app names in all template_steps when app override changes. Ensures dynamic linking of app names in project templates.';

-- Create trigger to auto-update template_steps when app_overrides changes
CREATE OR REPLACE FUNCTION public.trigger_update_app_names_on_override()
RETURNS TRIGGER AS $$
BEGIN
  -- When app override is created or updated, update all template_steps
  PERFORM public.update_app_names_in_templates(
    NEW.app_id,
    NEW.app_name,
    NEW.description,
    NEW.icon
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_app_names_on_override_trigger ON public.app_overrides;
CREATE TRIGGER update_app_names_on_override_trigger
  AFTER INSERT OR UPDATE OF app_name, description, icon ON public.app_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_app_names_on_override();

