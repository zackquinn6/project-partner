-- Drop the auto-rebuild triggers (they're causing infinite recursion)
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_insert ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_update ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_operation_delete ON template_operations;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_step_insert ON template_steps;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_step_update ON template_steps;
DROP TRIGGER IF EXISTS trigger_rebuild_phases_after_step_delete ON template_steps;

-- Keep the rebuild function but we'll call it manually when needed
-- This avoids the infinite recursion problem