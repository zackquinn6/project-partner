-- Fix the detect_linked_phase_updates function to handle edge cases more defensively
CREATE OR REPLACE FUNCTION public.detect_linked_phase_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_project record;
  phase_element jsonb;
  new_alert jsonb;
  current_alerts jsonb;
  alert_exists boolean;
BEGIN
  -- Only run when publish_status changes to 'published'
  IF NEW.publish_status = 'published' AND 
     (OLD.publish_status IS NULL OR OLD.publish_status != 'published') THEN
    
    -- Find all projects that have incorporated phases from this source project
    FOR affected_project IN
      SELECT DISTINCT id, name, phases, 
        COALESCE(phase_revision_alerts, '[]'::jsonb) as phase_revision_alerts
      FROM public.projects
      WHERE id != NEW.id  -- Don't check the project being published
        AND phases IS NOT NULL
        AND jsonb_typeof(phases) = 'array'  -- Only process if phases is actually an array
        AND (
          CASE 
            WHEN jsonb_typeof(phases) = 'array' THEN jsonb_array_length(phases) > 0
            ELSE false
          END
        )
    LOOP
      -- Check each phase in the affected project
      FOR phase_element IN 
        SELECT * FROM jsonb_array_elements(affected_project.phases)
      LOOP
        -- Check if this phase is linked to the published project
        IF phase_element->>'isLinked' = 'true' 
           AND phase_element->>'sourceProjectId' = NEW.id::text
           AND (phase_element->>'incorporatedRevision')::int < NEW.revision_number THEN
          
          -- Use the pre-coalesced alerts from the SELECT
          current_alerts := affected_project.phase_revision_alerts;
          alert_exists := false;
          
          -- Check if an alert for this phase already exists
          -- Safe to use jsonb_array_length here because we COALESCE'd to [] in the SELECT
          IF jsonb_array_length(current_alerts) > 0 THEN
            SELECT EXISTS (
              SELECT 1 FROM jsonb_array_elements(current_alerts) AS alert
              WHERE alert->>'phaseId' = phase_element->>'id'
            ) INTO alert_exists;
          END IF;
          
          -- Only add alert if it doesn't already exist
          IF NOT alert_exists THEN
            -- Create new alert
            new_alert := jsonb_build_object(
              'phaseId', phase_element->>'id',
              'sourceProjectId', NEW.id::text,
              'currentRevision', (phase_element->>'incorporatedRevision')::int,
              'latestRevision', NEW.revision_number,
              'phaseName', phase_element->>'name',
              'detectedAt', now()
            );
            
            -- Add alert to the project's phase_revision_alerts
            UPDATE public.projects
            SET phase_revision_alerts = current_alerts || new_alert,
                updated_at = now()
            WHERE id = affected_project.id;
            
            -- Log the detection
            PERFORM log_comprehensive_security_event(
              'phase_revision_update_detected',
              'medium',
              'Detected newer revision for linked phase',
              auth.uid(),
              NULL, NULL, NULL,
              jsonb_build_object(
                'affected_project_id', affected_project.id,
                'affected_project_name', affected_project.name,
                'source_project_id', NEW.id,
                'source_project_name', NEW.name,
                'phase_id', phase_element->>'id',
                'phase_name', phase_element->>'name',
                'old_revision', (phase_element->>'incorporatedRevision')::int,
                'new_revision', NEW.revision_number
              )
            );
          END IF;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;