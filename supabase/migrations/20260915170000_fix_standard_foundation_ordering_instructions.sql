-- Step 2 fix: Tool & Material Ordering instructions on Standard Foundation.
-- Rewrites beginner / intermediate / advanced so Background is valuable domain
-- context, Instructions are sequential actions only, and Error-Recovery has
-- full-sentence diagnosis. Does not touch project runs (those keep their snapshot).
-- Idempotent via ON CONFLICT (step_id, instruction_level).

DO $$
DECLARE
  v_project_id uuid;
  v_step_id uuid;
  v_beginner jsonb;
  v_intermediate jsonb;
  v_advanced jsonb;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.is_standard IS TRUE
      AND p.parent_project_id IS NULL
    ORDER BY p.created_at ASC
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found. Check: SELECT id, name, is_standard, parent_project_id FROM public.projects WHERE is_standard IS TRUE OR id = ''d82dff80-e8ac-4511-be46-3d0e64bb5fc5'';';
  END IF;

  SELECT os.id INTO v_step_id
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id
    AND (
      lower(btrim(os.step_title)) = 'tool & material ordering'
      OR lower(btrim(os.step_title)) = 'tool and material ordering'
      OR (
        lower(btrim(os.step_title)) LIKE '%tool%'
        AND lower(btrim(os.step_title)) LIKE '%material%'
        AND lower(btrim(os.step_title)) LIKE '%order%'
      )
    )
  ORDER BY
    CASE
      WHEN lower(btrim(os.step_title)) = 'tool & material ordering' THEN 0
      WHEN lower(btrim(os.step_title)) = 'tool and material ordering' THEN 1
      ELSE 2
    END,
    os.display_order ASC
  LIMIT 1;

  IF v_step_id IS NULL THEN
    RAISE EXCEPTION 'Tool & Material Ordering step not found on Standard Foundation (%). Check: SELECT os.id, os.step_title FROM operation_steps os JOIN phase_operations po ON po.id = os.operation_id JOIN project_phases pp ON pp.id = po.phase_id WHERE pp.project_id = %',
      v_project_id, v_project_id;
  END IF;

  v_beginner := jsonb_build_array(
    jsonb_build_object(
      'id', 'std-ordering-bg-beginner',
      'type', 'text',
      'title', 'Background/Need-to-Know',
      'display_order', 1,
      'content', $c$Rentals are often the smarter path for tools you will not keep, but schedule pickup and return tightly around when you will use them. Material buying has real complexity: buy extra for cuts and waste, and keep contingency for unplanned issues. Shopping Checklist builds an optimized buy/rent list from your plan, scope, and settings, and tracks what you have already secured. Owned tools drop off the buy list when Tool Library is current. When shopping is done, Tools Ordered and Materials Ordered on this step's Step Checklist finish the step.$c$
    ),
    jsonb_build_object(
      'id', 'std-ordering-instr-beginner',
      'type', 'text',
      'title', 'Instructions',
      'display_order', 2,
      'content', $c$1. Open Shopping Checklist from Apps for This Step.

2. In Shopping Settings:
   - Confirm your Tool Library so owned tools are not re-bought.
   - Choose a material risk level (Just essentials, Practical buffer, or Full contingency).
   - Choose a quality tier (Budget grade, Solid midrange, or Top quality).
   - Add lead days for any materials that take time to arrive.

3. Optionally open Shopping websites for store and rental quick links.

4. Open the Shopping Checklist section. Work the Materials and Tools tabs. Check each item after you buy, rent, borrow, or otherwise secure it.

5. When every listed item is checked, use Complete Shopping if it is shown.$c$
    ),
    jsonb_build_object(
      'id', 'std-ordering-err-beginner',
      'type', 'text',
      'title', 'Error-Recovery',
      'display_order', 3,
      'content', $c$- If your list is missing something, finish your plan so scope, tools, and materials are locked in, then reopen Shopping Checklist.
- If need-by dates are missing, generate a project schedule so rentals and borrowing have dates to work from.
- If a tool you still need is missing because it is treated as owned, update ownership in Tool Library / Tool Shed, then reopen Shopping Checklist.
- If you finished shopping in the app but this step is still incomplete, check Tools Ordered and Materials Ordered on the Step Checklist here.$c$
    )
  );

  v_intermediate := jsonb_build_array(
    jsonb_build_object(
      'id', 'std-ordering-bg-intermediate',
      'type', 'text',
      'title', 'Background/Need-to-Know',
      'display_order', 1,
      'content', $c$Tool rentals are worth using when you will not keep the tool, but schedule them close to use. Material buys need buffer for waste and contingency for surprises. Shopping Checklist optimizes that list from your plan and settings. Tools Ordered and Materials Ordered on the Step Checklist finish this step when shopping is done.$c$
    ),
    jsonb_build_object(
      'id', 'std-ordering-instr-intermediate',
      'type', 'text',
      'title', 'Instructions',
      'display_order', 2,
      'content', $c$1. Open Shopping Checklist from Apps for This Step.
2. Set Shopping Settings (Tool Library, material risk, quality tier, lead days as needed).
3. Check off each Materials and Tools line after you secure it. Use Complete Shopping when the list is fully shopped.$c$
    ),
    jsonb_build_object(
      'id', 'std-ordering-err-intermediate',
      'type', 'text',
      'title', 'Error-Recovery',
      'display_order', 3,
      'content', $c$- If your list is missing something, finish your plan (and generate a schedule if you need need-by dates), then reopen Shopping Checklist.
- If owned-tool filtering is wrong, correct Tool Library / Tool Shed ownership and refresh the checklist.
- If shopping is done in-app but this step is still incomplete, check Tools Ordered and Materials Ordered on the Step Checklist here.$c$
    )
  );

  v_advanced := jsonb_build_array(
    jsonb_build_object(
      'id', 'std-ordering-bg-advanced',
      'type', 'text',
      'title', 'Background/Need-to-Know',
      'display_order', 1,
      'content', $c$Tool rentals save cost versus buying tools you will not keep, but schedule them close to when you need them. Material buying has real complexity: buy extra for waste, and keep contingency for unplanned issues. Shopping Checklist optimizes the buy/rent list from your plan. Tools Ordered and Materials Ordered on the Step Checklist finish this step when shopping is done.$c$
    ),
    jsonb_build_object(
      'id', 'std-ordering-instr-advanced',
      'type', 'text',
      'title', 'Instructions',
      'display_order', 2,
      'content', $c$1. Open Shopping Checklist.
2. Confirm settings, shop Materials and Tools, then Complete Shopping when done.$c$
    ),
    jsonb_build_object(
      'id', 'std-ordering-err-advanced',
      'type', 'text',
      'title', 'Error-Recovery',
      'display_order', 3,
      'content', $c$- If your list is missing something, finish your plan so scope is locked, then reopen Shopping Checklist.
- If a needed tool is missing because it looks owned, fix Tool Library and refresh.
- If shopping is done in-app but this step is still incomplete, check Tools Ordered and Materials Ordered on the Step Checklist here.$c$
    )
  );

  INSERT INTO public.step_instructions (step_id, instruction_level, content)
  VALUES
    (v_step_id, 'beginner', v_beginner),
    (v_step_id, 'intermediate', v_intermediate),
    (v_step_id, 'advanced', v_advanced)
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET
    content = EXCLUDED.content,
    updated_at = now();

  RAISE NOTICE 'Updated step_instructions for Tool & Material Ordering step_id=% on project_id=%', v_step_id, v_project_id;
END $$;
