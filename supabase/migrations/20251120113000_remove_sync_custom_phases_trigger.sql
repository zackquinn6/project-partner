-- Remove legacy sync_custom_phases trigger that referenced deprecated columns
-- Custom phase syncing now flows through project_phases/table data instead of parsing projects.phases JSON

DROP TRIGGER IF EXISTS sync_custom_phases_trigger ON public.projects;
DROP FUNCTION IF EXISTS sync_custom_phases_on_update();

