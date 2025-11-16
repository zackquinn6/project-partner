-- NORMALIZE PHASE ID FOR OPERATIONS
-- Remove standard_phase_id from template_operations and ensure all operations use phase_id
-- Standard vs custom is determined by project_phases.is_standard flag

-- 1. First, ensure all operations in standard foundation have phase_id set
-- (They might currently only have standard_phase_id)
UPDATE public.template_operations op
SET phase_id = pp.id
FROM public.project_phases pp
WHERE op.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND op.phase_id IS NULL
  AND op.standard_phase_id IS NOT NULL
  AND pp.project_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND pp.standard_phase_id = op.standard_phase_id;

-- 2. For operations in other projects, set phase_id based on standard_phase_id matching
UPDATE public.template_operations op
SET phase_id = pp.id
FROM public.project_phases pp
WHERE op.phase_id IS NULL
  AND op.standard_phase_id IS NOT NULL
  AND pp.project_id = op.project_id
  AND pp.standard_phase_id = op.standard_phase_id;

-- 3. Add is_standard flag to template_operations for quick reference (derived from project_phases)
ALTER TABLE public.template_operations
  ADD COLUMN IF NOT EXISTS is_standard_phase BOOLEAN NOT NULL DEFAULT false;

-- 4. Populate is_standard_phase from project_phases
UPDATE public.template_operations op
SET is_standard_phase = COALESCE(pp.is_standard, false)
FROM public.project_phases pp
WHERE op.phase_id = pp.id;

-- 5. Create index for is_standard_phase
CREATE INDEX IF NOT EXISTS idx_template_operations_is_standard_phase 
  ON public.template_operations(is_standard_phase);

-- 6. Create trigger to keep is_standard_phase in sync with project_phases.is_standard
CREATE OR REPLACE FUNCTION public.sync_operation_is_standard_phase()
RETURNS TRIGGER AS $$
BEGIN
  -- When a project_phases.is_standard changes, update all operations linked to that phase
  UPDATE public.template_operations
  SET is_standard_phase = NEW.is_standard
  WHERE phase_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_operation_is_standard_phase_trigger ON public.project_phases;
CREATE TRIGGER sync_operation_is_standard_phase_trigger
  AFTER UPDATE OF is_standard ON public.project_phases
  FOR EACH ROW
  WHEN (OLD.is_standard IS DISTINCT FROM NEW.is_standard)
  EXECUTE FUNCTION public.sync_operation_is_standard_phase();

-- 7. Also sync when operations are linked to phases
CREATE OR REPLACE FUNCTION public.sync_operation_is_standard_on_insert_update()
RETURNS TRIGGER AS $$
BEGIN
  -- When an operation is inserted or updated with a phase_id, sync is_standard_phase
  IF NEW.phase_id IS NOT NULL THEN
    SELECT COALESCE(is_standard, false) INTO NEW.is_standard_phase
    FROM public.project_phases
    WHERE id = NEW.phase_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_operation_is_standard_on_insert_update_trigger ON public.template_operations;
CREATE TRIGGER sync_operation_is_standard_on_insert_update_trigger
  BEFORE INSERT OR UPDATE OF phase_id ON public.template_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_operation_is_standard_on_insert_update();

-- 8. Update is_custom_phase to be based on is_standard_phase instead of standard_phase_id
-- First drop the old generated column
ALTER TABLE public.template_operations DROP COLUMN IF EXISTS is_custom_phase;

-- Recreate it as a generated column based on is_standard_phase (inverse)
ALTER TABLE public.template_operations
ADD COLUMN IF NOT EXISTS is_custom_phase BOOLEAN 
GENERATED ALWAYS AS (NOT is_standard_phase) STORED;

-- Recreate index for custom phases
DROP INDEX IF EXISTS idx_template_operations_custom_phase;
CREATE INDEX IF NOT EXISTS idx_template_operations_custom_phase 
  ON public.template_operations(custom_phase_name) 
  WHERE is_custom_phase = true;

-- 9. Update constraint to work with new schema (based on is_standard_phase instead of standard_phase_id)
ALTER TABLE public.template_operations DROP CONSTRAINT IF EXISTS custom_phase_metadata_check;
ALTER TABLE public.template_operations
ADD CONSTRAINT custom_phase_metadata_check
CHECK (
  (is_standard_phase = true AND custom_phase_name IS NULL) OR
  (is_standard_phase = false AND custom_phase_name IS NOT NULL)
);

-- 10. Drop standard_phase_id column from template_operations (after ensuring phase_id is set)
-- First check if all operations have phase_id
DO $$
DECLARE
  null_phase_id_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_phase_id_count
  FROM public.template_operations
  WHERE phase_id IS NULL;
  
  IF null_phase_id_count > 0 THEN
    RAISE NOTICE 'WARNING: % operations still have NULL phase_id. Cannot drop standard_phase_id yet.', null_phase_id_count;
  ELSE
    RAISE NOTICE 'All operations have phase_id set. Safe to remove standard_phase_id.';
    -- Drop the column
    ALTER TABLE public.template_operations DROP COLUMN IF EXISTS standard_phase_id;
    -- Drop index on standard_phase_id if it exists
    DROP INDEX IF EXISTS idx_template_operations_phase;
  END IF;
END $$;

