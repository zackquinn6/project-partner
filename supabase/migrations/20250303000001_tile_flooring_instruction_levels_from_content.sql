-- Migration: Populate step_instructions from operation_steps.content for Tile Flooring
-- Splits **BEGINNER:** / **INTERMEDIATE:** / **ADVANCED:** text into separate instruction levels.
-- Project ID: 9c04c190-9409-4eeb-98db-36426aacb39f

DO $$
DECLARE
  step_record RECORD;
  raw_content TEXT;
  v_beginner TEXT;
  v_intermediate TEXT;
  v_advanced TEXT;
  beginner_json JSONB;
  intermediate_json JSONB;
  advanced_json JSONB;
  parts TEXT[];
  rest TEXT;
BEGIN
  FOR step_record IN
    SELECT os.id, os.step_title, os.content AS step_content
    FROM operation_steps os
    JOIN phase_operations po ON os.operation_id = po.id
    JOIN project_phases pp ON po.phase_id = pp.id
    WHERE pp.project_id = '9c04c190-9409-4eeb-98db-36426aacb39f'
      AND os.content IS NOT NULL
      AND os.content::text LIKE '%**BEGINNER:**%'
      AND os.content::text LIKE '%**INTERMEDIATE:**%'
      AND os.content::text LIKE '%**ADVANCED:**%'
    ORDER BY pp.display_order, po.display_order, os.display_order
  LOOP
    raw_content := step_record.step_content::text;

    -- Split: after **BEGINNER:** until **INTERMEDIATE:** (match newline-newline-**INTERMEDIATE:**)
    parts := regexp_split_to_array(raw_content, E'\n\n\\*\\*INTERMEDIATE:\\*\\*');
    IF array_length(parts, 1) >= 1 THEN
      v_beginner := trim(regexp_replace(parts[1], E'^\\*\\*BEGINNER:\\*\\*\\s*', ''));
    ELSE
      v_beginner := NULL;
    END IF;

    -- Split remainder: after **INTERMEDIATE:** until **ADVANCED:**
    IF array_length(parts, 1) >= 2 THEN
      rest := parts[2];
      parts := regexp_split_to_array(rest, E'\n\n\\*\\*ADVANCED:\\*\\*');
      IF array_length(parts, 1) >= 1 THEN
        v_intermediate := trim(regexp_replace(parts[1], E'^\\s*', ''));
      ELSE
        v_intermediate := trim(rest);
      END IF;
      IF array_length(parts, 1) >= 2 THEN
        v_advanced := trim(parts[2]);
      ELSE
        v_advanced := NULL;
      END IF;
    ELSE
      v_intermediate := NULL;
      v_advanced := NULL;
    END IF;

    -- Build single-section content for each level (format expected by UI: id, type, title, content)
    beginner_json := jsonb_build_array(
      jsonb_build_object('id', '1', 'type', 'text', 'title', 'Instructions', 'content', v_beginner)
    );
    intermediate_json := jsonb_build_array(
      jsonb_build_object('id', '1', 'type', 'text', 'title', 'Instructions', 'content', v_intermediate)
    );
    advanced_json := jsonb_build_array(
      jsonb_build_object('id', '1', 'type', 'text', 'title', 'Instructions', 'content', v_advanced)
    );

    INSERT INTO step_instructions (template_step_id, instruction_level, content)
    VALUES (step_record.id, 'beginner', beginner_json)
    ON CONFLICT (template_step_id, instruction_level)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();

    INSERT INTO step_instructions (template_step_id, instruction_level, content)
    VALUES (step_record.id, 'intermediate', intermediate_json)
    ON CONFLICT (template_step_id, instruction_level)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();

    INSERT INTO step_instructions (template_step_id, instruction_level, content)
    VALUES (step_record.id, 'advanced', advanced_json)
    ON CONFLICT (template_step_id, instruction_level)
    DO UPDATE SET content = EXCLUDED.content, updated_at = NOW();
  END LOOP;

  RAISE NOTICE 'Tile flooring step_instructions updated from operation_steps content (beginner/intermediate/advanced)';
END $$;
