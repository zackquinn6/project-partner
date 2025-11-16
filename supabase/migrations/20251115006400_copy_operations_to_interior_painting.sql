-- COPY OPERATIONS TO INTERIOR PAINTING PROJECT
-- This ensures Interior Painting has operations linked correctly
-- by copying them from the standard foundation

DO $$
DECLARE
  interior_painting_id UUID := '07f3617a-f3a5-4b1a-99e5-2799a71c2ae1'; -- Interior Painting project ID
  standard_project_id CONSTANT UUID := '00000000-0000-0000-0000-000000000001';
  interior_phase RECORD;
  standard_phase RECORD;
  standard_operation RECORD;
  new_operation_id UUID;
  copied_count INTEGER := 0;
  operation_count INTEGER := 0;
  existing_count INTEGER := 0;
BEGIN
  -- Loop through Interior Painting phases
  FOR interior_phase IN
    SELECT * FROM public.project_phases
    WHERE project_id = interior_painting_id
    ORDER BY display_order
  LOOP
    RAISE NOTICE 'Processing phase: % (standard_phase_id: %)', interior_phase.name, interior_phase.standard_phase_id;
    
    -- Find matching phase in standard foundation
    SELECT * INTO standard_phase
    FROM public.project_phases
    WHERE project_id = standard_project_id
      AND standard_phase_id = interior_phase.standard_phase_id
    LIMIT 1;
    
    IF FOUND THEN
      RAISE NOTICE 'Found matching standard foundation phase: % (id: %)', standard_phase.name, standard_phase.id;
      
      -- Copy operations from standard foundation to Interior Painting
      -- Check both phase_id and standard_phase_id matching
      SELECT COUNT(*) INTO operation_count
      FROM public.template_operations op
      WHERE op.project_id = standard_project_id
        AND (
          op.phase_id = standard_phase.id
          OR (op.standard_phase_id = interior_phase.standard_phase_id AND op.phase_id IS NULL)
          OR (op.standard_phase_id = interior_phase.standard_phase_id)
        );
      
      RAISE NOTICE 'Found % operations in standard foundation for phase %', operation_count, interior_phase.name;
      
      FOR standard_operation IN
        SELECT DISTINCT op.* FROM public.template_operations op
        WHERE op.project_id = standard_project_id
          AND (
            op.phase_id = standard_phase.id
            OR (op.standard_phase_id = interior_phase.standard_phase_id AND op.phase_id IS NULL)
            OR (op.standard_phase_id = interior_phase.standard_phase_id)
          )
        ORDER BY op.display_order
      LOOP
        RAISE NOTICE 'Processing operation: % (id: %, phase_id: %, standard_phase_id: %)', 
          standard_operation.name, standard_operation.id, standard_operation.phase_id, standard_operation.standard_phase_id;
        
        -- Check if operation already exists in Interior Painting
        SELECT COUNT(*) INTO existing_count
        FROM public.template_operations existing
        WHERE existing.project_id = interior_painting_id
          AND existing.phase_id = interior_phase.id
          AND existing.name = standard_operation.name;
        
        RAISE NOTICE 'Existing operations count: %', existing_count;
        
        IF NOT EXISTS (
          SELECT 1 FROM public.template_operations existing
          WHERE existing.project_id = interior_painting_id
            AND existing.phase_id = interior_phase.id
            AND existing.name = standard_operation.name
        ) THEN
          -- Copy operation
          INSERT INTO public.template_operations (
            project_id,
            phase_id,
            name,
            description,
            flow_type,
            user_prompt,
            alternate_group,
            display_order,
            standard_phase_id,
            source_operation_id,
            is_reference
          ) VALUES (
            interior_painting_id,
            interior_phase.id,
            standard_operation.name,
            standard_operation.description,
            standard_operation.flow_type,
            standard_operation.user_prompt,
            standard_operation.alternate_group,
            standard_operation.display_order,
            standard_operation.standard_phase_id,
            standard_operation.id,
            true
          ) RETURNING id INTO new_operation_id;
          
          copied_count := copied_count + 1;
          RAISE NOTICE 'Copied operation: % (id: %)', standard_operation.name, new_operation_id;
        ELSE
          RAISE NOTICE 'Operation already exists: %', standard_operation.name;
        END IF;
      END LOOP;
    ELSE
      RAISE NOTICE 'No matching standard foundation phase found for standard_phase_id: %', interior_phase.standard_phase_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Copied % operations to Interior Painting project', copied_count;
END $$;

