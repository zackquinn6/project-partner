-- Standard Foundation content build-out bundle (Steps 2-10 + audit).
-- Scope: Standard Foundation is_standard phases (Kickoff, Plan, Ordering, Close).
-- Intentionally skips Step 11 quality goals (project-specific process gating).
-- Authoring order per AI_PROJECT_DEVELOPMENT_REFERENCE.md section H.3 / H.5.

-- =============================================================================
-- BEGIN 20260918220000_standard_foundation_step2_instructions.sql
-- =============================================================================
-- Step 2: Standard Foundation - three instruction levels for all 10 steps.
-- Section intent: Background = why/timing/app help; Instructions = numbered actions only;
-- Error-Recovery = full-sentence diagnosis -> fix. Ordering content is re-upserted (already strong).
-- Idempotent via ON CONFLICT (step_id, instruction_level).

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_kickoff CONSTANT uuid := '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid;
  v_step_plan CONSTANT uuid := '3507cbe6-b731-43ad-914c-e6235189818e'::uuid;
  v_step_order CONSTANT uuid := 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid;
  v_step_punch CONSTANT uuid := '111f7777-d4c9-41b2-bf1d-7c6b9d3f51a5'::uuid;
  v_step_ret_tools CONSTANT uuid := 'de4fac81-8129-4f52-8206-65e4508d9259'::uuid;
  v_step_ret_mats CONSTANT uuid := 'cb6ae299-d8e8-4007-83b9-17f215ba0a47'::uuid;
  v_step_store CONSTANT uuid := 'a858ab86-324e-45c1-b6f8-f31ceaa47e2e'::uuid;
  v_step_waste CONSTANT uuid := '51629230-11ce-4e3d-b4b4-a0b790bb7157'::uuid;
  v_step_reflect CONSTANT uuid := 'b1ea3fe6-4bc8-4217-8b06-790e7b7e2d91'::uuid;
  v_step_celebrate CONSTANT uuid := '21b54558-bd51-4ae9-9498-afb1e537f966'::uuid;
  v_missing text[] := ARRAY[]::text[];
  v_sid uuid;
  v_n integer;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE
    AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found (is_standard root or d82dff80-e8ac-4511-be46-3d0e64bb5fc5).';
  END IF;

  FOREACH v_sid IN ARRAY ARRAY[
    v_step_kickoff, v_step_plan, v_step_order, v_step_punch, v_step_ret_tools,
    v_step_ret_mats, v_step_store, v_step_waste, v_step_reflect, v_step_celebrate
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.operation_steps os
      JOIN public.phase_operations po ON po.id = os.operation_id
      JOIN public.project_phases pp ON pp.id = po.phase_id
      WHERE os.id = v_sid AND pp.project_id = v_project_id
    ) THEN
      v_missing := array_append(v_missing, v_sid::text);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Standard Foundation steps missing on project %: %', v_project_id, array_to_string(v_missing, ', ');
  END IF;

  -- ---------------------------------------------------------------------------
  -- Project Kickoff
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_kickoff, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-kick-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Kickoff is where you decide whether this project fits your skills, calendar, and budget before you commit time or money. Skipping it is how DIY projects stall mid-demo. The Project Kickoff app walks four short screens: Match (what the work involves and whether it fits you), Profile (your DIY profile and owned tools), Goals (size, dates, and budget the plan will use), and Plan Setup (which planning steps you will run next in Planning Studio). Confirmed readiness on the Step Checklist finishes this step when you honestly say you are ready to continue.$c$),
    jsonb_build_object('id','sf-kick-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Open Project Kickoff from Apps for This Step.

2. Complete Match: review what the work involves and decide if it is a fit.

3. Complete Profile: set up your profile and currently owned tools.

4. Complete Goals: size the project, set dates, and set a budget band you can actually hold.

5. Complete Plan Setup: pick the planning steps you will run next in Planning Studio.

6. When the app shows kickoff complete, check Confirmed readiness on the Step Checklist here.$c$),
    jsonb_build_object('id','sf-kick-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If Match feels vague, reopen the project catalog description and challenges, then return to Kickoff so your fit judgment uses the same scope.
- If Profile or Goals show a skill, effort, time, or budget mismatch you cannot close, stop here and choose a smaller project or get help before ordering materials.
- If Goals numbers feel made up, open your real calendar and bank balance, then re-enter size, dates, and budget bands you can defend.
- If the step stays incomplete after the app finishes, check Confirmed readiness on the Step Checklist.$c$)
  )),
  (v_step_kickoff, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-kick-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Kickoff locks a go / no-go on skill, effort, time, and budget before planning depth. Project Kickoff covers Match, Profile, Goals, and Plan Setup. Confirmed readiness on the Step Checklist is the exit gate.$c$),
    jsonb_build_object('id','sf-kick-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Open Project Kickoff.
2. Work Match, Profile, Goals, and Plan Setup in order.
3. Check Confirmed readiness when you accept the fit.$c$),
    jsonb_build_object('id','sf-kick-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If fit looks weak on Match, Profile, or Goals, revise the bands or stop before Build Your Plan.
- If the app finished but the step did not, check Confirmed readiness on the Step Checklist.$c$)
  )),
  (v_step_kickoff, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-kick-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Treat Kickoff as a gate, not a formality. Match / Profile / Goals / Plan Setup set the constraints later planning cannot invent. Confirmed readiness closes the step.$c$),
    jsonb_build_object('id','sf-kick-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Run Project Kickoff through Match, Profile, Goals, and Plan Setup.
2. Check Confirmed readiness when constraints are accepted.$c$),
    jsonb_build_object('id','sf-kick-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If constraints fail, stop or resize the project before planning.
- If the checklist is still open, check Confirmed readiness.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Build Your Plan
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_plan, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-plan-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$A locked plan is what Shopping Checklist, schedule dates, and budget tracking read from. Without it, ordering and closeout guess. Project Planning Workflow walks the planning apps in order: Project Customizer (scope and decisions), Project Scheduler (when work happens), Project Budgeting (cost bands), and any other tools you enabled at Kickoff. Plan ready to execute on the Step Checklist finishes this step when those pieces agree.$c$),
    jsonb_build_object('id','sf-plan-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Open Project Planning Workflow from Apps for This Step.

2. Complete Project Customizer: lock scope choices and general project decisions that change steps or materials.

3. Complete Project Scheduler: place phases on calendar days you can actually work, including quiet hours and helper availability.

4. Complete Project Budgeting: set target spend and contingency (use at least 10% of materials, or a minimum of $500 on most DIY projects).

5. Open any other planning apps you enabled at Kickoff and finish their required screens.

6. When the workflow shows planning complete, check Plan ready to execute on the Step Checklist here.$c$),
    jsonb_build_object('id','sf-plan-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If Customizer options are blank, finish Project Kickoff first so tools and project context exist, then reopen the workflow.
- If the schedule has no need-by dates, regenerate the schedule after customizer scope is locked rather than typing dates by hand.
- If budget and schedule disagree (work days exceed what the budget can cover), revise one until both fit, then continue.
- If the workflow finished but this step is open, check Plan ready to execute on the Step Checklist.$c$)
  )),
  (v_step_plan, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-plan-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Planning Workflow produces the scope, calendar, and budget Shopping and closeout depend on. Customizer  ->  Scheduler  ->  Budgeting (plus any Kickoff-enabled tools). Plan ready to execute is the exit gate.$c$),
    jsonb_build_object('id','sf-plan-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Open Project Planning Workflow.
2. Finish Customizer, Scheduler, and Budgeting in order (and any other enabled planning apps).
3. Check Plan ready to execute when scope, dates, and budget agree.$c$),
    jsonb_build_object('id','sf-plan-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a planning screen is empty, finish Kickoff, then reopen the workflow.
- If schedule and budget conflict, revise until both fit before Ordering.
- If the checklist is still open, check Plan ready to execute.$c$)
  )),
  (v_step_plan, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-plan-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Lock customizer decisions, a workable schedule, and a budget with quantified contingency before Ordering. Plan ready to execute closes the step.$c$),
    jsonb_build_object('id','sf-plan-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Run Project Planning Workflow through Customizer, Scheduler, Budgeting, and remaining enabled apps.
2. Check Plan ready to execute when the plan is consistent.$c$),
    jsonb_build_object('id','sf-plan-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If pieces disagree, reconcile scope, dates, and dollars before Ordering.
- If the checklist is open, check Plan ready to execute.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Tool & Material Ordering (keep strong existing copy)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_order, 'beginner', jsonb_build_array(
    jsonb_build_object('id','std-ordering-bg-beginner','type','text','title','Background/Need-to-Know','display_order',1,
      'content', $c$Rentals are often the smarter path for tools you will not keep, but schedule pickup and return tightly around when you will use them. Material buying has real complexity: buy extra for cuts and waste, and keep contingency for unplanned issues. Shopping Checklist builds an optimized buy/rent list from your plan, scope, and settings, and tracks what you have already secured. Owned tools drop off the buy list when Tool Library is current. When shopping is done, Tools Ordered and Materials Ordered on this step's Step Checklist finish the step.$c$),
    jsonb_build_object('id','std-ordering-instr-beginner','type','text','title','Instructions','display_order',2,
      'content', $c$1. Open Shopping Checklist from Apps for This Step.

2. In Shopping Settings:
   - Confirm your Tool Library so owned tools are not re-bought.
   - Choose a material risk level (Just essentials, Practical buffer, or Full contingency).
   - Choose a quality tier (Budget grade, Solid midrange, or Top quality).
   - Add lead days for any materials that take time to arrive.

3. Optionally open Shopping websites for store and rental quick links.

4. Open the Shopping Checklist section. Work the Materials and Tools tabs. Check each item after you buy, rent, borrow, or otherwise secure it.

5. When every listed item is checked, use Complete Shopping if it is shown.$c$),
    jsonb_build_object('id','std-ordering-err-beginner','type','text','title','Error-Recovery','display_order',3,
      'content', $c$- If your list is missing something, finish your plan so scope, tools, and materials are locked in, then reopen Shopping Checklist.
- If need-by dates are missing, generate a project schedule so rentals and borrowing have dates to work from.
- If a tool you still need is missing because it is treated as owned, update ownership in Tool Library / Tool Shed, then reopen Shopping Checklist.
- If you finished shopping in the app but this step is still incomplete, check Tools Ordered and Materials Ordered on the Step Checklist here.$c$)
  )),
  (v_step_order, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','std-ordering-bg-intermediate','type','text','title','Background/Need-to-Know','display_order',1,
      'content', $c$Tool rentals are worth using when you will not keep the tool, but schedule them close to use. Material buys need buffer for waste and contingency for surprises. Shopping Checklist optimizes that list from your plan and settings. Tools Ordered and Materials Ordered on the Step Checklist finish this step when shopping is done.$c$),
    jsonb_build_object('id','std-ordering-instr-intermediate','type','text','title','Instructions','display_order',2,
      'content', $c$1. Open Shopping Checklist from Apps for This Step.
2. Set Shopping Settings (Tool Library, material risk, quality tier, lead days as needed).
3. Check off each Materials and Tools line after you secure it. Use Complete Shopping when the list is fully shopped.$c$),
    jsonb_build_object('id','std-ordering-err-intermediate','type','text','title','Error-Recovery','display_order',3,
      'content', $c$- If your list is missing something, finish your plan (and generate a schedule if you need need-by dates), then reopen Shopping Checklist.
- If owned-tool filtering is wrong, correct Tool Library / Tool Shed ownership and refresh the checklist.
- If shopping is done in-app but this step is still incomplete, check Tools Ordered and Materials Ordered on the Step Checklist here.$c$)
  )),
  (v_step_order, 'advanced', jsonb_build_array(
    jsonb_build_object('id','std-ordering-bg-advanced','type','text','title','Background/Need-to-Know','display_order',1,
      'content', $c$Tool rentals save cost versus buying tools you will not keep, but schedule them close to when you need them. Material buying has real complexity: buy extra for waste, and keep contingency for unplanned issues. Shopping Checklist optimizes the buy/rent list from your plan. Tools Ordered and Materials Ordered on the Step Checklist finish this step when shopping is done.$c$),
    jsonb_build_object('id','std-ordering-instr-advanced','type','text','title','Instructions','display_order',2,
      'content', $c$1. Open Shopping Checklist.
2. Confirm settings, shop Materials and Tools, then Complete Shopping when done.$c$),
    jsonb_build_object('id','std-ordering-err-advanced','type','text','title','Error-Recovery','display_order',3,
      'content', $c$- If your list is missing something, finish your plan so scope is locked, then reopen Shopping Checklist.
- If a needed tool is missing because it looks owned, fix Tool Library and refresh.
- If shopping is done in-app but this step is still incomplete, check Tools Ordered and Materials Ordered on the Step Checklist here.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Complete Punchlist
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_punch, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-punch-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Closeout fails when open outputs are ignored. Quality Control walks every workflow output and requirement still open so you fix defects before tools go back and materials get stored. Punchlist cleared on the Step Checklist finishes this step when every required output passes or has an explicit deferred repair note.$c$),
    jsonb_build_object('id','sf-punch-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Open Quality Control from Apps for This Step.

2. Review each open output and its requirement.

3. For each fail, either correct it now or write a dated repair note with owner and target date.

4. Re-check corrected items in Quality Control until they pass.

5. When no required items remain open without a repair note, check Punchlist cleared on the Step Checklist here.$c$),
    jsonb_build_object('id','sf-punch-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If Quality Control shows nothing, finish earlier owned phases so outputs exist, then reopen this step.
- If an item fails and you cannot fix it today, record the repair note before marking the punchlist clear.
- If the app looks done but the step is open, check Punchlist cleared on the Step Checklist.$c$)
  )),
  (v_step_punch, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-punch-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Quality Control is the gate before wrap-up. Clear every required output or attach a dated repair note. Punchlist cleared is the exit.$c$),
    jsonb_build_object('id','sf-punch-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Open Quality Control.
2. Resolve each open output (fix or dated repair note).
3. Check Punchlist cleared when required items are closed.$c$),
    jsonb_build_object('id','sf-punch-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If the list is empty, finish upstream work so outputs exist.
- If the checklist is open, check Punchlist cleared.$c$)
  )),
  (v_step_punch, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-punch-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Close every required output in Quality Control, or document a dated repair, before wrap-up. Punchlist cleared closes the step.$c$),
    jsonb_build_object('id','sf-punch-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Run Quality Control across open outputs.
2. Check Punchlist cleared when required items are resolved.$c$),
    jsonb_build_object('id','sf-punch-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If items remain without a fix or note, keep the punchlist open.
- If the checklist is open after the app, check Punchlist cleared.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Return Tools
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_ret_tools, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-rt-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Late rental returns burn budget ($25-$75/day late fees are common) and block the next renter. Owned tools that stay dirty or unstored get lost before the next project. Tool Access helps locate rental return sites and hours. Rentals returned, owned stored finishes this step when every borrowed or rented tool is back and owned tools are put away.$c$),
    jsonb_build_object('id','sf-rt-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. List every rented or borrowed tool still on site, with return deadline and location.

2. Open Tool Access if you need return site hours or directions.

3. Clean each rental to the shop's return standard, photograph any pre-existing damage, and return it before the deadline.

4. Store owned tools in their labeled place in Tool Shed / Tool Library locations.

5. Check Rentals returned, owned stored on the Step Checklist when the list is empty.$c$),
    jsonb_build_object('id','sf-rt-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a rental deadline is within 4 hours and you cannot get there, call the shop now to extend or arrange after-hours drop rather than eating a full late day.
- If a tool is missing, search the work area and vehicle once for 15 minutes, then notify the lender or shop with the serial or rental contract number.
- If Tool Access has no nearby site, use the rental contract return address and confirm hours by phone before driving.$c$)
  )),
  (v_step_ret_tools, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-rt-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Return rentals before late fees start and put owned tools away so the next job can find them. Tool Access helps with return logistics. Rentals returned, owned stored is the exit.$c$),
    jsonb_build_object('id','sf-rt-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Inventory rented, borrowed, and owned tools still out.
2. Return rentals (use Tool Access for sites/hours) and store owned tools.
3. Check Rentals returned, owned stored when done.$c$),
    jsonb_build_object('id','sf-rt-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a deadline is close, call the shop to extend before the late fee posts.
- If a tool is missing, escalate to the lender or shop with the contract number after one thorough search.$c$)
  )),
  (v_step_ret_tools, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-rt-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Close the rental clock and restore owned inventory. Tool Access is optional logistics help. Rentals returned, owned stored closes the step.$c$),
    jsonb_build_object('id','sf-rt-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Clear rented and borrowed tools; store owned tools.
2. Check Rentals returned, owned stored.$c$),
    jsonb_build_object('id','sf-rt-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a late fee is imminent, call the shop before the fee posts.
- If inventory is short, notify the lender or shop with the contract id.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Return Materials
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_ret_mats, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-rm-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Unopened or restockable materials are cash sitting in the garage. Most big-box returns need the receipt and original packaging within 30-90 days. Unused materials returned finishes this step when every returnable line is credited or explicitly kept for storage.$c$),
    jsonb_build_object('id','sf-rm-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Sort leftover materials into returnable (unopened, receipt available) versus keep-for-later.

2. Match each returnable item to its receipt or order number.

3. Return items within the store's window; keep the credit receipt with the project budget record.

4. Move keep items to the Store Materials stack.

5. Check Unused materials returned on the Step Checklist when returnable lines are cleared.$c$),
    jsonb_build_object('id','sf-rm-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If the receipt is missing, check email order history and the payment card statement for the SKU before giving up on the return.
- If the store refuses an opened pack, move that item to Store Materials instead of discarding something still useful.
- If credit does not show in budget tracking, log the credit receipt amount the same day you get it.$c$)
  )),
  (v_step_ret_mats, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-rm-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Return restockable leftovers inside the store window; keep useful remnants for Store Materials. Unused materials returned is the exit.$c$),
    jsonb_build_object('id','sf-rm-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Split leftovers into returnable versus keep.
2. Process returns with receipts and file credits.
3. Check Unused materials returned when returnable lines are done.$c$),
    jsonb_build_object('id','sf-rm-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a receipt is missing, pull the digital order before abandoning the return.
- If a return is refused, route the item to Store Materials.$c$)
  )),
  (v_step_ret_mats, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-rm-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Clear returnable stock for credit; stage keepers for storage. Unused materials returned closes the step.$c$),
    jsonb_build_object('id','sf-rm-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Return restockable leftovers; stage keepers for storage.
2. Check Unused materials returned.$c$),
    jsonb_build_object('id','sf-rm-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If credit is blocked, keep the item and store it instead of forcing a refuse return.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Store Materials
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_store, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-sm-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Unlabeled leftovers become trash within a year because nobody trusts the contents. Label with product name, color/SKU, and purchase month so the next repair can match. Leftovers labeled and stored finishes this step when keepers are sealed, labeled, and shelved off the floor.$c$),
    jsonb_build_object('id','sf-sm-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Gather keep materials from the return sort.

2. Seal opened liquids and powders per the label (lid tight, bag liner if the product requires it).

3. Label each package with product name, SKU or color code, and month/year.

4. Store off the floor in a dry area away from freeze/heat extremes the label forbids.

5. Check Leftovers labeled and stored on the Step Checklist when the keep stack is empty.$c$),
    jsonb_build_object('id','sf-sm-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a label is unreadable, photograph the original packaging barcode before discarding the box, then write the SKU on the new label from the photo.
- If a product cannot be sealed safely (damaged can, cured compound), move it to Dispose of Waste instead of storing a leak risk.
- If storage space is full, return one more restockable item or consolidate into fewer bins before declaring storage done.$c$)
  )),
  (v_step_store, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-sm-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Seal, label (name, SKU/color, month), and shelf keepers so future matching works. Leftovers labeled and stored is the exit.$c$),
    jsonb_build_object('id','sf-sm-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Seal and label keep materials.
2. Store them dry and off the floor.
3. Check Leftovers labeled and stored.$c$),
    jsonb_build_object('id','sf-sm-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a package cannot be sealed, dispose of it rather than storing a leak.
- If SKU data is lost, recover it from a packaging photo before labeling.$c$)
  )),
  (v_step_store, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-sm-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Labeled, sealed storage is what makes leftovers usable later. Leftovers labeled and stored closes the step.$c$),
    jsonb_build_object('id','sf-sm-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Seal, label, and shelf keepers.
2. Check Leftovers labeled and stored.$c$),
    jsonb_build_object('id','sf-sm-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a keeper is unsafe to store, route it to waste disposal.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Dispose of Waste
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_waste, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-dw-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Leaving debris in place turns the room back into a hazard and invites mold or pests. Municipal rules differ for paint, solvents, and treated wood - dumpsters and curbside are not automatic yes. Work area clear of waste finishes this step when trash is bagged, sorted for local rules, and removed from the work area.$c$),
    jsonb_build_object('id','sf-dw-b-safe','type','safety-warning','title','Sharp and chemical waste','severity','medium','display_order',0,'width','full','alignment','left',
      'content', $c$Wear gloves and safety glasses when bagging sharp offcuts. Do not pour solvents or oil-based finishes down a drain. Follow local household hazardous waste rules for paints and chemicals.$c$),
    jsonb_build_object('id','sf-dw-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Sweep and collect debris into contractor bags; separate recyclables if your municipality requires it.

2. Set aside paint, solvents, batteries, and treated wood for the disposal method your city publishes (often a HHW drop-off).

3. Bag sharp offcuts so they cannot cut through; double-bag if edges poke.

4. Move bags to the bin, dumpster, or drop-off the same day.

5. Walk the room once more for nails, screws, and dust piles.

6. Check Work area clear of waste on the Step Checklist when the floor is clear.$c$),
    jsonb_build_object('id','sf-dw-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If a bag tears from sharp scrap, stop and re-bag into a thicker contractor bag or a cardboard-lined bin before carrying it.
- If you are unsure a liquid is drain-safe, treat it as HHW and hold it for the published drop-off rather than dumping it.
- If the dumpster is full, stage sealed bags in a dry covered spot and schedule an extra haul within 48 hours rather than leaving loose debris in the room.$c$)
  )),
  (v_step_waste, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-dw-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Clear the room under local disposal rules; keep HHW out of drains. Work area clear of waste is the exit.$c$),
    jsonb_build_object('id','sf-dw-i-safe','type','safety-warning','title','PPE for debris','severity','medium','display_order',0,'width','full','alignment','left',
      'content', $c$Gloves and glasses for sharp scrap; no drain disposal for solvents or oil finishes.$c$),
    jsonb_build_object('id','sf-dw-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Bag debris; segregate HHW and recyclables per local rules.
2. Remove bags from the work area the same day.
3. Final walk for fasteners and dust, then check Work area clear of waste.$c$),
    jsonb_build_object('id','sf-dw-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If bags fail, re-bag before carrying.
- If disposal rules are unclear, hold HHW for the published drop-off.$c$)
  )),
  (v_step_waste, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-dw-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Remove debris and HHW under local rules so the room is safe to occupy. Work area clear of waste closes the step.$c$),
    jsonb_build_object('id','sf-dw-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Clear, segregate, and remove waste.
2. Check Work area clear of waste.$c$),
    jsonb_build_object('id','sf-dw-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If HHW cannot go curbside, hold it for the published drop-off.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Reflect
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_reflect, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-ref-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$After-action notes are what make the next project faster. Capture what burned time, what you would buy differently, and what skill you want to practice. Lessons captured finishes this step when at least three concrete notes exist (time, money, method).$c$),
    jsonb_build_object('id','sf-ref-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Open your project notes or After Action Review if it is available on this run.

2. Write one note on schedule: which step took at least 25% longer than planned and why.

3. Write one note on budget: which purchase you would change (SKU, quantity, or rental vs buy).

4. Write one note on method: which technique you would repeat or avoid.

5. Check Lessons captured on the Step Checklist when the three notes are saved.$c$),
    jsonb_build_object('id','sf-ref-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If you cannot remember timings, open the project schedule history and compare planned versus actual phase dates before writing the schedule note.
- If spend is fuzzy, open budget tracking or the card statement for project dates, then write the budget note from real totals.
- If no review app is present, use the project notes field; the checklist still requires the three concrete notes.$c$)
  )),
  (v_step_reflect, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-ref-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Record schedule, budget, and method lessons while the job is fresh. Lessons captured is the exit.$c$),
    jsonb_build_object('id','sf-ref-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Capture one schedule, one budget, and one method lesson.
2. Check Lessons captured.$c$),
    jsonb_build_object('id','sf-ref-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If memory is thin, pull schedule and budget history before writing.$c$)
  )),
  (v_step_reflect, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-ref-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Three concrete lessons (time, money, method) beat a vague diary. Lessons captured closes the step.$c$),
    jsonb_build_object('id','sf-ref-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Save schedule, budget, and method notes.
2. Check Lessons captured.$c$),
    jsonb_build_object('id','sf-ref-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If notes are vague, rewrite them with a number (hours, dollars, or a named technique).$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  -- ---------------------------------------------------------------------------
  -- Celebrate
  -- ---------------------------------------------------------------------------
  INSERT INTO public.step_instructions (step_id, instruction_level, content) VALUES
  (v_step_celebrate, 'beginner', jsonb_build_array(
    jsonb_build_object('id','sf-cel-b-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Closing without acknowledging the finish is how projects feel endless. A short celebration (photos, a shared meal, or marking the calendar done) locks the psychological end of the job. Completion acknowledged finishes this step when you have recorded the finish in a way you will remember.$c$),
    jsonb_build_object('id','sf-cel-b-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Take at least two after photos of the finished work in normal room lighting.

2. Share the finish with anyone who helped or lived through the disruption (message, meal, or walkthrough).

3. Mark the project complete on your calendar or in the app so the date is recorded.

4. Check Completion acknowledged on the Step Checklist.$c$),
    jsonb_build_object('id','sf-cel-b-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If photos look dark, retake them with overhead lights on and shades open rather than accepting a black frame as the record.
- If nobody is available to share with, still mark the calendar complete and save the photos; the checklist needs the recorded finish, not a party.$c$)
  )),
  (v_step_celebrate, 'intermediate', jsonb_build_array(
    jsonb_build_object('id','sf-cel-i-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Photos plus a recorded finish date close the emotional loop. Completion acknowledged is the exit.$c$),
    jsonb_build_object('id','sf-cel-i-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Capture after photos and mark the project complete.
2. Check Completion acknowledged.$c$),
    jsonb_build_object('id','sf-cel-i-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If the date is not recorded, mark the calendar before checking the output.$c$)
  )),
  (v_step_celebrate, 'advanced', jsonb_build_array(
    jsonb_build_object('id','sf-cel-a-bg','type','text','title','Background/Need-to-Know','display_order',1,'width','full','alignment','left',
      'content', $c$Record the finish so the project has a clear end. Completion acknowledged closes the step.$c$),
    jsonb_build_object('id','sf-cel-a-ins','type','text','title','Instructions','display_order',2,'width','full','alignment','left',
      'content', $c$1. Save after photos and mark completion.
2. Check Completion acknowledged.$c$),
    jsonb_build_object('id','sf-cel-a-er','type','text','title','Error-Recovery','display_order',3,'width','full','alignment','left',
      'content', $c$- If no completion date exists, add one before closing the checklist.$c$)
  ))
  ON CONFLICT (step_id, instruction_level)
  DO UPDATE SET content = EXCLUDED.content, updated_at = now();

  SELECT count(*)::integer INTO v_n
  FROM public.step_instructions si
  WHERE si.step_id IN (
    v_step_kickoff, v_step_plan, v_step_order, v_step_punch, v_step_ret_tools,
    v_step_ret_mats, v_step_store, v_step_waste, v_step_reflect, v_step_celebrate
  )
    AND si.instruction_level IN ('beginner', 'intermediate', 'advanced');

  IF v_n <> 30 THEN
    RAISE EXCEPTION 'Expected 30 instruction rows (10 steps x 3 levels), found %.', v_n;
  END IF;

  RAISE NOTICE 'Standard Foundation step 2 instructions applied for project % (% rows)', v_project_id, v_n;
END
$migration$;

-- END 20260918220000_standard_foundation_step2_instructions.sql

-- =============================================================================
-- BEGIN 20260918220100_standard_foundation_step3_outputs.sql
-- =============================================================================
-- Step 3: Standard Foundation outputs (physical achieved state) for all 10 steps.
-- Preserves Kickoff readiness id and Ordering Tools Ordered / Materials Ordered ids.

DO $migration$
DECLARE
  v_project_id uuid;
  v_updated integer;
  v_step_kickoff CONSTANT uuid := '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid;
  v_step_plan CONSTANT uuid := '3507cbe6-b731-43ad-914c-e6235189818e'::uuid;
  v_step_order CONSTANT uuid := 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid;
  v_step_punch CONSTANT uuid := '111f7777-d4c9-41b2-bf1d-7c6b9d3f51a5'::uuid;
  v_step_ret_tools CONSTANT uuid := 'de4fac81-8129-4f52-8206-65e4508d9259'::uuid;
  v_step_ret_mats CONSTANT uuid := 'cb6ae299-d8e8-4007-83b9-17f215ba0a47'::uuid;
  v_step_store CONSTANT uuid := 'a858ab86-324e-45c1-b6f8-f31ceaa47e2e'::uuid;
  v_step_waste CONSTANT uuid := '51629230-11ce-4e3d-b4b4-a0b790bb7157'::uuid;
  v_step_reflect CONSTANT uuid := 'b1ea3fe6-4bc8-4217-8b06-790e7b7e2d91'::uuid;
  v_step_celebrate CONSTANT uuid := '21b54558-bd51-4ae9-9498-afb1e537f966'::uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  UPDATE public.operation_steps os
  SET outputs = v.outputs::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_kickoff, $j$[
      {"id":"output-1773865215408-0.9212794339230775","name":"Confirmed readiness","type":"none",
       "description":"Skill, effort, budget, and calendar fit are accepted and Kickoff apps are configured.",
       "requirement":"You / Plan screens are completed and the user accepts the fit before Build Your Plan.",
       "qualityChecks":"Kickoff app shows complete; Confirmed readiness is checked on the Step Checklist.",
       "keyInputs":["Catalog scope and challenges","Available hours","Budget band","Skill self-assessment"],
       "mustGetRight":"Do not advance while skill, time, or budget fit is still rejected."}
    ]$j$),
    (v_step_plan, $j$[
      {"id":"sf-out-plan-ready","name":"Plan ready to execute","type":"none",
       "description":"Scope decisions, schedule, and budget agree and are locked for Ordering.",
       "requirement":"Customizer decisions, a generated schedule, and a budget with contingency are complete and consistent.",
       "qualityChecks":"Planning Workflow shows complete; Plan ready to execute is checked.",
       "keyInputs":["Kickoff tool selections","Scope decisions","Workable calendar days","Contingency dollars"],
       "mustGetRight":"Do not open Ordering while schedule and budget still conflict."}
    ]$j$),
    (v_step_order, $j$[
      {"id":"output-1764945723504-0.22211916093684303","name":"Tools Ordered","type":"none",
       "description":"Every tool on the Shopping Checklist is bought, rented, borrowed, or marked owned.",
       "requirement":"No unchecked tool lines remain on the Shopping Checklist Tools tab.",
       "qualityChecks":"Tools tab fully checked; Tools Ordered checked on the Step Checklist.",
       "keyInputs":["Locked plan tool list","Tool Library ownership","Rental need-by dates"],
       "mustGetRight":"Rental pickup dates must land before first use, not after."},
      {"id":"output-1764945739819-0.09311023039522637","name":"Materials Ordered","type":"none",
       "description":"Every material on the Shopping Checklist is secured with waste buffer and lead time accounted for.",
       "requirement":"No unchecked material lines remain on the Shopping Checklist Materials tab.",
       "qualityChecks":"Materials tab fully checked; Materials Ordered checked on the Step Checklist.",
       "keyInputs":["Locked plan quantities","Material risk level","Quality tier","Lead days"],
       "mustGetRight":"Do not start install steps while any required material line is still unchecked."}
    ]$j$),
    (v_step_punch, $j$[
      {"id":"sf-out-punch-cleared","name":"Punchlist cleared","type":"performance-durability",
       "description":"Every required workflow output passes or has a dated repair note with owner.",
       "requirement":"No required Quality Control item remains open without a dated repair note.",
       "qualityChecks":"Quality Control shows no unexplained open fails; Punchlist cleared is checked.",
       "keyInputs":["Step outputs","Requirement text","Repair capacity before wrap-up"],
       "mustGetRight":"Do not return tools while a required fail has neither a fix nor a dated note."}
    ]$j$),
    (v_step_ret_tools, $j$[
      {"id":"sf-out-tools-returned","name":"Rentals returned, owned stored","type":"none",
       "description":"Rented and borrowed tools are back; owned tools are cleaned and put in their storage place.",
       "requirement":"Zero rented or borrowed tools remain on site past their return deadline; owned tools are shelved.",
       "qualityChecks":"Rental contracts closed or receipts filed; owned locations match Tool Library.",
       "keyInputs":["Rental deadlines","Return site hours","Tool Library locations"],
       "mustGetRight":"Return before late fees post (often $25-$75 per day)."}
    ]$j$),
    (v_step_ret_mats, $j$[
      {"id":"sf-out-mats-returned","name":"Unused materials returned","type":"none",
       "description":"Restockable leftovers are credited; keepers are staged for storage.",
       "requirement":"Every returnable line is credited inside the store window or explicitly moved to keep.",
       "qualityChecks":"Credit receipts filed; keep stack handed to Store Materials.",
       "keyInputs":["Receipts and order numbers","Store return window","Opened vs sealed state"],
       "mustGetRight":"Do not discard restockable sealed packs that still fall inside the return window."}
    ]$j$),
    (v_step_store, $j$[
      {"id":"sf-out-mats-stored","name":"Leftovers labeled and stored","type":"none",
       "description":"Keep materials are sealed, labeled with name/SKU/date, and stored dry off the floor.",
       "requirement":"Every keep package has a readable label and a sealed container in a dry storage location.",
       "qualityChecks":"Keep stack is empty; spot-check labels for SKU or color code plus month/year.",
       "keyInputs":["Product packaging data","Seal integrity","Storage climate limits"],
       "mustGetRight":"Do not store unsealed liquids or unlabeled color-matched finishes."}
    ]$j$),
    (v_step_waste, $j$[
      {"id":"sf-out-waste-cleared","name":"Work area clear of waste","type":"safety",
       "description":"Debris is bagged, sorted for local rules, and removed from the work area.",
       "requirement":"No project debris, sharp scrap, or HHW remains in the work area after disposal.",
       "qualityChecks":"Final walk finds no bags, fasteners, or chemical containers left in the room.",
       "keyInputs":["Local disposal rules","HHW drop-off options","Bag strength for sharp scrap"],
       "mustGetRight":"Do not leave sharp offcuts in thin bags or pour solvents down a drain."}
    ]$j$),
    (v_step_reflect, $j$[
      {"id":"sf-out-lessons","name":"Lessons captured","type":"none",
       "description":"Schedule, budget, and method lessons are written with concrete numbers or named techniques.",
       "requirement":"At least one schedule, one budget, and one method note are saved to the project record.",
       "qualityChecks":"Three notes exist and each includes a number or a named technique.",
       "keyInputs":["Planned vs actual schedule","Budget totals","Techniques used"],
       "mustGetRight":"Vague diary lines do not count; rewrite with hours, dollars, or a named method."}
    ]$j$),
    (v_step_celebrate, $j$[
      {"id":"sf-out-celebrated","name":"Completion acknowledged","type":"none",
       "description":"After photos exist and the project finish date is recorded.",
       "requirement":"At least two after photos are saved and a completion date is marked on the calendar or in-app.",
       "qualityChecks":"Photos open and show the finished work; completion date is visible on the calendar or project record.",
       "keyInputs":["Finished work access","Lighting for photos","Calendar or app completion control"],
       "mustGetRight":"Do not close without a recorded finish date."}
    ]$j$)
  ) AS v(step_id, outputs)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 10 THEN
    RAISE EXCEPTION 'Expected 10 foundation steps to receive outputs, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Standard Foundation step 3 outputs applied for project %', v_project_id;
END
$migration$;

-- END 20260918220100_standard_foundation_step3_outputs.sql

-- =============================================================================
-- BEGIN 20260918220200_standard_foundation_step5_tools.sql
-- =============================================================================
-- Step 5: Standard Foundation tools - bootstrap shared library, write step JSON with library ids.
-- Substitutes are child rows with parentId pointing at the primary library id.

DO $migration$
DECLARE
  v_project_id uuid;
  v_updated integer;
  v_missing text[] := ARRAY[]::text[];
  v_name text;
  v_phone uuid;
  v_tablet uuid;
  v_glasses uuid;
  v_gloves uuid;
  v_mask uuid;
  v_marker uuid;
  v_labeler uuid;
  v_tape uuid;
  v_broom uuid;
  v_vac uuid;
  v_required text[] := ARRAY[
    'Smartphone or computer', 'Tablet or laptop', 'Safety Glasses', 'Work Gloves',
    'Dust Mask / Respirator', 'Permanent Marker', 'Label Maker', 'Tape Measure',
    'Broom', 'Shop Vacuum'
  ];
  v_step_kickoff CONSTANT uuid := '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid;
  v_step_plan CONSTANT uuid := '3507cbe6-b731-43ad-914c-e6235189818e'::uuid;
  v_step_order CONSTANT uuid := 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid;
  v_step_punch CONSTANT uuid := '111f7777-d4c9-41b2-bf1d-7c6b9d3f51a5'::uuid;
  v_step_ret_tools CONSTANT uuid := 'de4fac81-8129-4f52-8206-65e4508d9259'::uuid;
  v_step_ret_mats CONSTANT uuid := 'cb6ae299-d8e8-4007-83b9-17f215ba0a47'::uuid;
  v_step_store CONSTANT uuid := 'a858ab86-324e-45c1-b6f8-f31ceaa47e2e'::uuid;
  v_step_waste CONSTANT uuid := '51629230-11ce-4e3d-b4b4-a0b790bb7157'::uuid;
  v_step_reflect CONSTANT uuid := 'b1ea3fe6-4bc8-4217-8b06-790e7b7e2d91'::uuid;
  v_step_celebrate CONSTANT uuid := '21b54558-bd51-4ae9-9498-afb1e537f966'::uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  INSERT INTO public.tools (name, description, category, specialty_scale, alternates)
  SELECT v.name, v.description, v.category, v.specialty_scale, v.alternates
  FROM (VALUES
    ('Smartphone or computer', 'Phone, tablet, or computer used to run in-step apps and capture photos or notes.', 'Other', 1,
     'Tablet or laptop when a larger screen helps for planning and checklists'),
    ('Tablet or laptop', 'Larger screen device for planning workflows, shopping checklists, and photo review.', 'Other', 1,
     'Smartphone when a phone is all that is available'),
    ('Safety Glasses', 'Impact-rated eye protection for debris and cleanup.', 'PPE', 1,
     'Safety goggles where dust or splash comes from the side'),
    ('Work Gloves', 'General hand protection for handling tools, materials, and debris.', 'PPE', 1,
     'Cut-resistant gloves when handling sharp offcuts'),
    ('Dust Mask / Respirator', 'Respiratory protection for dust during cleanup and disposal.', 'PPE', 1,
     'Half-face respirator with P100 filters for fine silica-bearing dust'),
    ('Permanent Marker', 'Writes durable labels on storage containers and packaging.', 'Other', 1,
     'Label maker for printed labels on long-term storage'),
    ('Label Maker', 'Prints adhesive labels for leftover materials and storage bins.', 'Other', 1,
     'Permanent marker plus masking tape when a label maker is not available'),
    ('Tape Measure', 'Measures leftover stock and confirms dimensions before returns.', 'Hand Tool', 1,
     'Folding rule for short interior measurements'),
    ('Broom', 'Clears bulk debris before bagging waste.', 'Other', 1,
     'Shop vacuum for fine dust after the bulk pass'),
    ('Shop Vacuum', 'Removes fine dust and small debris from the work area.', 'Power Tool', 1,
     'Broom plus dustpan for bulk debris when a vacuum is unavailable')
  ) AS v(name, description, category, specialty_scale, alternates)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v.name))
  );

  FOREACH v_name IN ARRAY v_required LOOP
    IF NOT EXISTS (SELECT 1 FROM public.tools t WHERE lower(btrim(t.name)) = lower(btrim(v_name))) THEN
      v_missing := array_append(v_missing, v_name);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Tools library missing rows required by Standard Foundation: %', array_to_string(v_missing, ' | ');
  END IF;

  SELECT id INTO v_phone FROM public.tools WHERE lower(btrim(name)) = 'smartphone or computer' LIMIT 1;
  SELECT id INTO v_tablet FROM public.tools WHERE lower(btrim(name)) = 'tablet or laptop' LIMIT 1;
  SELECT id INTO v_glasses FROM public.tools WHERE lower(btrim(name)) = 'safety glasses' LIMIT 1;
  SELECT id INTO v_gloves FROM public.tools WHERE lower(btrim(name)) = 'work gloves' LIMIT 1;
  SELECT id INTO v_mask FROM public.tools WHERE lower(btrim(name)) = 'dust mask / respirator' LIMIT 1;
  SELECT id INTO v_marker FROM public.tools WHERE lower(btrim(name)) = 'permanent marker' LIMIT 1;
  SELECT id INTO v_labeler FROM public.tools WHERE lower(btrim(name)) = 'label maker' LIMIT 1;
  SELECT id INTO v_tape FROM public.tools WHERE lower(btrim(name)) = 'tape measure' LIMIT 1;
  SELECT id INTO v_broom FROM public.tools WHERE lower(btrim(name)) = 'broom' LIMIT 1;
  SELECT id INTO v_vac FROM public.tools WHERE lower(btrim(name)) = 'shop vacuum' LIMIT 1;

  UPDATE public.operation_steps os
  SET tools = v.tools, updated_at = now()
  FROM (VALUES
    (v_step_kickoff, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Runs Project Kickoff and captures readiness decisions.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_tablet::text, 'name', 'Tablet or laptop',
        'description', 'Larger screen alternate for Kickoff forms.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_phone::text)
    )),
    (v_step_plan, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Runs Project Planning Workflow (customizer, scheduler, budget).',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_tablet::text, 'name', 'Tablet or laptop',
        'description', 'Larger screen alternate for schedule and budget screens.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_phone::text)
    )),
    (v_step_order, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Runs Shopping Checklist and store or rental quick links.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_tablet::text, 'name', 'Tablet or laptop',
        'description', 'Larger screen alternate while working long shopping lists.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_phone::text)
    )),
    (v_step_punch, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Runs Quality Control and records repair notes.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_tape::text, 'name', 'Tape Measure',
        'description', 'Verifies dimensional outputs called out in the punchlist.',
        'category', 'Hand Tool', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_glasses::text, 'name', 'Safety Glasses',
        'description', 'Worn when a punch item needs a corrective cut or scrape.',
        'category', 'PPE', 'alternates', jsonb_build_array(), 'quantity', 1)
    )),
    (v_step_ret_tools, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Runs Tool Access for return sites and hours.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_gloves::text, 'name', 'Work Gloves',
        'description', 'Protects hands while cleaning and carrying returned tools.',
        'category', 'PPE', 'alternates', jsonb_build_array(), 'quantity', 1)
    )),
    (v_step_ret_mats, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Pulls digital receipts and order numbers for returns.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_tape::text, 'name', 'Tape Measure',
        'description', 'Confirms leftover lengths or counts before a return trip.',
        'category', 'Hand Tool', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_gloves::text, 'name', 'Work Gloves',
        'description', 'Handles packaged materials during sorting and return.',
        'category', 'PPE', 'alternates', jsonb_build_array(), 'quantity', 1)
    )),
    (v_step_store, jsonb_build_array(
      jsonb_build_object('id', v_marker::text, 'name', 'Permanent Marker',
        'description', 'Writes product name, SKU or color, and month on keep packages.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_labeler::text, 'name', 'Label Maker',
        'description', 'Printed-label alternate for long-term storage.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_marker::text),
      jsonb_build_object('id', v_gloves::text, 'name', 'Work Gloves',
        'description', 'Handles sealed containers and shelving.',
        'category', 'PPE', 'alternates', jsonb_build_array(), 'quantity', 1)
    )),
    (v_step_waste, jsonb_build_array(
      jsonb_build_object('id', v_broom::text, 'name', 'Broom',
        'description', 'First pass on bulk debris before bagging.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_vac::text, 'name', 'Shop Vacuum',
        'description', 'Fine dust alternate after the bulk sweep.',
        'category', 'Power Tool', 'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_broom::text),
      jsonb_build_object('id', v_gloves::text, 'name', 'Work Gloves',
        'description', 'Required when bagging sharp offcuts.',
        'category', 'PPE', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_glasses::text, 'name', 'Safety Glasses',
        'description', 'Eye protection while handling debris and snapping bags.',
        'category', 'PPE', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_mask::text, 'name', 'Dust Mask / Respirator',
        'description', 'Worn for dusty cleanup passes.',
        'category', 'PPE', 'alternates', jsonb_build_array(), 'quantity', 1)
    )),
    (v_step_reflect, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Opens schedule and budget history and saves after-action notes.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_tablet::text, 'name', 'Tablet or laptop',
        'description', 'Larger screen alternate for writing lessons.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_phone::text)
    )),
    (v_step_celebrate, jsonb_build_array(
      jsonb_build_object('id', v_phone::text, 'name', 'Smartphone or computer',
        'description', 'Captures after photos and marks the completion date.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_tablet::text, 'name', 'Tablet or laptop',
        'description', 'Alternate device for photo review and sharing.',
        'category', 'Other', 'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_phone::text)
    ))
  ) AS v(step_id, tools)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 10 THEN
    RAISE EXCEPTION 'Expected 10 foundation steps to receive tools, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Standard Foundation step 5 tools applied for project %', v_project_id;
END
$migration$;

-- END 20260918220200_standard_foundation_step5_tools.sql

-- =============================================================================
-- BEGIN 20260918220300_standard_foundation_step6_materials.sql
-- =============================================================================
-- Step 6: Standard Foundation materials - bootstrap library; authored array on every step
-- (empty [] for pure app/planning steps; physical closeout steps get real consumables).

DO $migration$
DECLARE
  v_project_id uuid;
  v_updated integer;
  v_missing text[] := ARRAY[]::text[];
  v_name text;
  v_bags uuid;
  v_contractor uuid;
  v_masking uuid;
  v_painters uuid;
  v_bins uuid;
  v_boxes uuid;
  v_required text[] := ARRAY[
    'Trash Bags', 'Contractor Trash Bags', 'Masking Tape', 'Painter''s Tape',
    'Storage Bins', 'Cardboard Boxes'
  ];
  v_step_kickoff CONSTANT uuid := '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid;
  v_step_plan CONSTANT uuid := '3507cbe6-b731-43ad-914c-e6235189818e'::uuid;
  v_step_order CONSTANT uuid := 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid;
  v_step_punch CONSTANT uuid := '111f7777-d4c9-41b2-bf1d-7c6b9d3f51a5'::uuid;
  v_step_ret_tools CONSTANT uuid := 'de4fac81-8129-4f52-8206-65e4508d9259'::uuid;
  v_step_ret_mats CONSTANT uuid := 'cb6ae299-d8e8-4007-83b9-17f215ba0a47'::uuid;
  v_step_store CONSTANT uuid := 'a858ab86-324e-45c1-b6f8-f31ceaa47e2e'::uuid;
  v_step_waste CONSTANT uuid := '51629230-11ce-4e3d-b4b4-a0b790bb7157'::uuid;
  v_step_reflect CONSTANT uuid := 'b1ea3fe6-4bc8-4217-8b06-790e7b7e2d91'::uuid;
  v_step_celebrate CONSTANT uuid := '21b54558-bd51-4ae9-9498-afb1e537f966'::uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  INSERT INTO public.materials (name, description, category, unit, unit_size, alternates)
  SELECT v.name, v.description, v.category, v.unit, v.unit_size, v.alternates
  FROM (VALUES
    ('Trash Bags', 'General household bags for light packaging waste.', 'Consumables', 'each', '13 gallon kitchen bag',
     'Contractor trash bags for sharp or heavy debris'),
    ('Contractor Trash Bags', 'Heavy mil bags for construction debris and sharp offcuts.', 'Consumables', 'each', '3 mil contractor bag',
     'Debris box or bucket for sharp offcuts that cut through bags'),
    ('Masking Tape', 'General purpose tape for temporary labels and sealing light packages.', 'Consumables', 'roll', '0.75 in x 60 yd roll',
     'Painter''s tape when a cleaner remove is needed on finished surfaces'),
    ('Painter''s Tape', 'Low-adhesion tape for clean-remove labeling on finished surfaces.', 'Consumables', 'roll', '1 in x 60 yd roll',
     'Masking tape for rough storage labeling'),
    ('Storage Bins', 'Rigid bins for sealed leftover materials kept for later matching.', 'Components', 'each', '27 gallon tote',
     'Cardboard boxes for short-term dry storage only'),
    ('Cardboard Boxes', 'Short-term dry storage for sealed leftovers when bins are unavailable.', 'Components', 'each', 'moving carton',
     'Storage bins when leftovers will sit longer than a few months')
  ) AS v(name, description, category, unit, unit_size, alternates)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.materials m WHERE lower(btrim(m.name)) = lower(btrim(v.name))
  );

  FOREACH v_name IN ARRAY v_required LOOP
    IF NOT EXISTS (SELECT 1 FROM public.materials m WHERE lower(btrim(m.name)) = lower(btrim(v_name))) THEN
      v_missing := array_append(v_missing, v_name);
    END IF;
  END LOOP;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'Materials library missing rows required by Standard Foundation: %', array_to_string(v_missing, ' | ');
  END IF;

  SELECT id INTO v_bags FROM public.materials WHERE lower(btrim(name)) = 'trash bags' LIMIT 1;
  SELECT id INTO v_contractor FROM public.materials WHERE lower(btrim(name)) = 'contractor trash bags' LIMIT 1;
  SELECT id INTO v_masking FROM public.materials WHERE lower(btrim(name)) = 'masking tape' LIMIT 1;
  SELECT id INTO v_painters FROM public.materials WHERE lower(btrim(name)) = 'painter''s tape' LIMIT 1;
  SELECT id INTO v_bins FROM public.materials WHERE lower(btrim(name)) = 'storage bins' LIMIT 1;
  SELECT id INTO v_boxes FROM public.materials WHERE lower(btrim(name)) = 'cardboard boxes' LIMIT 1;

  UPDATE public.operation_steps os
  SET materials = v.materials, updated_at = now()
  FROM (VALUES
    (v_step_kickoff, '[]'::jsonb),
    (v_step_plan, '[]'::jsonb),
    (v_step_order, '[]'::jsonb),
    (v_step_punch, '[]'::jsonb),
    (v_step_ret_tools, '[]'::jsonb),
    (v_step_ret_mats, jsonb_build_array(
      jsonb_build_object('id', v_masking::text, 'name', 'Masking Tape',
        'description', 'Secures open boxes and temporary return labels on packaging.',
        'category', 'Consumables', 'unit', 'roll', 'unit_size', '0.75 in x 60 yd roll',
        'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_painters::text, 'name', 'Painter''s Tape',
        'description', 'Cleaner-remove alternate on finished surfaces.',
        'category', 'Consumables', 'unit', 'roll', 'unit_size', '1 in x 60 yd roll',
        'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_masking::text)
    )),
    (v_step_store, jsonb_build_array(
      jsonb_build_object('id', v_masking::text, 'name', 'Masking Tape',
        'description', 'Holds handwritten labels on keep packages when a label maker is not used.',
        'category', 'Consumables', 'unit', 'roll', 'unit_size', '0.75 in x 60 yd roll',
        'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_painters::text, 'name', 'Painter''s Tape',
        'description', 'Alternate tape that removes cleaner from finished containers.',
        'category', 'Consumables', 'unit', 'roll', 'unit_size', '1 in x 60 yd roll',
        'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_masking::text),
      jsonb_build_object('id', v_bins::text, 'name', 'Storage Bins',
        'description', 'Rigid dry storage for sealed leftovers kept for later matching.',
        'category', 'Components', 'unit', 'each', 'unit_size', '27 gallon tote',
        'alternates', jsonb_build_array(), 'quantity', 1),
      jsonb_build_object('id', v_boxes::text, 'name', 'Cardboard Boxes',
        'description', 'Short-term dry storage alternate when bins are unavailable.',
        'category', 'Components', 'unit', 'each', 'unit_size', 'moving carton',
        'alternates', jsonb_build_array(), 'quantity', 1, 'parentId', v_bins::text)
    )),
    (v_step_waste, jsonb_build_array(
      jsonb_build_object('id', v_bags::text, 'name', 'Trash Bags',
        'description', 'Light packaging and paper waste only.',
        'category', 'Consumables', 'unit', 'each', 'unit_size', '13 gallon kitchen bag',
        'alternates', jsonb_build_array(), 'quantity', 5),
      jsonb_build_object('id', v_contractor::text, 'name', 'Contractor Trash Bags',
        'description', 'Heavy or sharp debris that cuts thin bags.',
        'category', 'Consumables', 'unit', 'each', 'unit_size', '3 mil contractor bag',
        'alternates', jsonb_build_array(), 'quantity', 5, 'parentId', v_bags::text)
    )),
    (v_step_reflect, '[]'::jsonb),
    (v_step_celebrate, '[]'::jsonb)
  ) AS v(step_id, materials)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 10 THEN
    RAISE EXCEPTION 'Expected 10 foundation steps to receive materials arrays, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Standard Foundation step 6 materials applied for project %', v_project_id;
END
$migration$;

-- END 20260918220300_standard_foundation_step6_materials.sql

-- =============================================================================
-- BEGIN 20260918220400_standard_foundation_step7_process_variables.sql
-- =============================================================================
-- Step 7: Standard Foundation process variables (>=1 per step).

DO $migration$
DECLARE
  v_project_id uuid;
  v_updated integer;
  v_step_kickoff CONSTANT uuid := '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid;
  v_step_plan CONSTANT uuid := '3507cbe6-b731-43ad-914c-e6235189818e'::uuid;
  v_step_order CONSTANT uuid := 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid;
  v_step_punch CONSTANT uuid := '111f7777-d4c9-41b2-bf1d-7c6b9d3f51a5'::uuid;
  v_step_ret_tools CONSTANT uuid := 'de4fac81-8129-4f52-8206-65e4508d9259'::uuid;
  v_step_ret_mats CONSTANT uuid := 'cb6ae299-d8e8-4007-83b9-17f215ba0a47'::uuid;
  v_step_store CONSTANT uuid := 'a858ab86-324e-45c1-b6f8-f31ceaa47e2e'::uuid;
  v_step_waste CONSTANT uuid := '51629230-11ce-4e3d-b4b4-a0b790bb7157'::uuid;
  v_step_reflect CONSTANT uuid := 'b1ea3fe6-4bc8-4217-8b06-790e7b7e2d91'::uuid;
  v_step_celebrate CONSTANT uuid := '21b54558-bd51-4ae9-9498-afb1e537f966'::uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  UPDATE public.operation_steps os
  SET process_variables = v.pv::jsonb, updated_at = now()
  FROM (VALUES
    (v_step_kickoff, $j$[
      {"id":"sf-pv-kick-fit","name":"Readiness fit score","type":"process","unit":"1-5","required":true,
       "description":"Self-rated fit across skill, effort, time, and budget after Kickoff screens. Target 4 or 5 before advancing."},
      {"id":"sf-pv-kick-hours","name":"Available work hours per week","type":"process","unit":"hours/week","required":true,
       "description":"Honest weekly hours you can put on this project without overtime on sleep or family commitments."}
    ]$j$),
    (v_step_plan, $j$[
      {"id":"sf-pv-plan-contingency","name":"Budget contingency percent","type":"process","unit":"%","required":true,
       "description":"Contingency held in Project Budgeting. Target at least 10% of materials, or a minimum of $500 on most DIY projects."},
      {"id":"sf-pv-plan-workdays","name":"Scheduled work days","type":"process","unit":"days","required":true,
       "description":"Count of calendar days with planned work after Scheduler generation."}
    ]$j$),
    (v_step_order, $j$[
      {"id":"sf-pv-order-tools-open","name":"Unchecked tool lines","type":"process","unit":"count","required":true,
       "description":"Shopping Checklist Tools tab lines still unchecked. Target 0 before Tools Ordered."},
      {"id":"sf-pv-order-mats-open","name":"Unchecked material lines","type":"process","unit":"count","required":true,
       "description":"Shopping Checklist Materials tab lines still unchecked. Target 0 before Materials Ordered."},
      {"id":"sf-pv-order-lead","name":"Longest material lead days","type":"process","unit":"days","required":false,
       "description":"Longest lead time entered in Shopping Settings for materials that ship or special-order."}
    ]$j$),
    (v_step_punch, $j$[
      {"id":"sf-pv-punch-open","name":"Open required punch items","type":"process","unit":"count","required":true,
       "description":"Required Quality Control items still open without a dated repair note. Target 0."}
    ]$j$),
    (v_step_ret_tools, $j$[
      {"id":"sf-pv-rt-hours","name":"Hours to next rental deadline","type":"process","unit":"hours","required":true,
       "description":"Hours remaining before the soonest rental return deadline. Act when under 4 hours."},
      {"id":"sf-pv-rt-out","name":"Rented or borrowed tools still out","type":"process","unit":"count","required":true,
       "description":"Count of rented or borrowed tools not yet returned. Target 0."}
    ]$j$),
    (v_step_ret_mats, $j$[
      {"id":"sf-pv-rm-returnable","name":"Returnable lines remaining","type":"process","unit":"count","required":true,
       "description":"Restockable leftover lines not yet credited or moved to keep. Target 0."},
      {"id":"sf-pv-rm-window","name":"Days left in return window","type":"process","unit":"days","required":false,
       "description":"Days remaining on the shortest store return window among returnable items."}
    ]$j$),
    (v_step_store, $j$[
      {"id":"sf-pv-sm-unlabeled","name":"Unlabeled keep packages","type":"process","unit":"count","required":true,
       "description":"Keep packages missing name, SKU or color, and month/year. Target 0."}
    ]$j$),
    (v_step_waste, $j$[
      {"id":"sf-pv-dw-bags","name":"Filled waste bags on site","type":"process","unit":"count","required":true,
       "description":"Filled bags still in the work area. Target 0 after same-day removal."},
      {"id":"sf-pv-dw-hhw","name":"HHW containers pending drop-off","type":"process","unit":"count","required":false,
       "description":"Paint, solvent, or other HHW containers waiting for the published drop-off."}
    ]$j$),
    (v_step_reflect, $j$[
      {"id":"sf-pv-ref-notes","name":"Concrete lesson notes saved","type":"process","unit":"count","required":true,
       "description":"Saved notes that include a number or named technique. Target at least 3 (schedule, budget, method)."}
    ]$j$),
    (v_step_celebrate, $j$[
      {"id":"sf-pv-cel-photos","name":"After photos saved","type":"process","unit":"count","required":true,
       "description":"After photos of the finished work in normal lighting. Target at least 2."}
    ]$j$)
  ) AS v(step_id, pv)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 10 THEN
    RAISE EXCEPTION 'Expected 10 foundation steps to receive process variables, updated %.', v_updated;
  END IF;

  RAISE NOTICE 'Standard Foundation step 7 process variables applied for project %', v_project_id;
END
$migration$;

-- END 20260918220400_standard_foundation_step7_process_variables.sql

-- =============================================================================
-- BEGIN 20260918220500_standard_foundation_step8_time_estimates.sql
-- =============================================================================
-- Step 8: Standard Foundation time estimates (hours). None of these steps are waiting (workers > 0).
-- Rebuilds phases cache after operation_steps enrichment.

DO $migration$
DECLARE
  v_project_id uuid;
  v_updated integer;
  v_step_kickoff CONSTANT uuid := '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid;
  v_step_plan CONSTANT uuid := '3507cbe6-b731-43ad-914c-e6235189818e'::uuid;
  v_step_order CONSTANT uuid := 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid;
  v_step_punch CONSTANT uuid := '111f7777-d4c9-41b2-bf1d-7c6b9d3f51a5'::uuid;
  v_step_ret_tools CONSTANT uuid := 'de4fac81-8129-4f52-8206-65e4508d9259'::uuid;
  v_step_ret_mats CONSTANT uuid := 'cb6ae299-d8e8-4007-83b9-17f215ba0a47'::uuid;
  v_step_store CONSTANT uuid := 'a858ab86-324e-45c1-b6f8-f31ceaa47e2e'::uuid;
  v_step_waste CONSTANT uuid := '51629230-11ce-4e3d-b4b4-a0b790bb7157'::uuid;
  v_step_reflect CONSTANT uuid := 'b1ea3fe6-4bc8-4217-8b06-790e7b7e2d91'::uuid;
  v_step_celebrate CONSTANT uuid := '21b54558-bd51-4ae9-9498-afb1e537f966'::uuid;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  UPDATE public.operation_steps os
  SET time_estimate_low = v.lo,
      time_estimate_med = v.med,
      time_estimate_high = v.hi,
      updated_at = now()
  FROM (VALUES
    (v_step_kickoff, 0.25::numeric, 0.50::numeric, 0.75::numeric),
    (v_step_plan, 0.50::numeric, 1.00::numeric, 1.50::numeric),
    (v_step_order, 0.50::numeric, 1.00::numeric, 2.00::numeric),
    (v_step_punch, 0.50::numeric, 1.00::numeric, 1.50::numeric),
    (v_step_ret_tools, 0.25::numeric, 0.50::numeric, 1.00::numeric),
    (v_step_ret_mats, 0.25::numeric, 0.50::numeric, 1.00::numeric),
    (v_step_store, 0.25::numeric, 0.50::numeric, 1.00::numeric),
    (v_step_waste, 0.50::numeric, 1.00::numeric, 2.00::numeric),
    (v_step_reflect, 0.25::numeric, 0.50::numeric, 0.75::numeric),
    (v_step_celebrate, 0.15::numeric, 0.25::numeric, 0.50::numeric)
  ) AS v(step_id, lo, med, hi)
  WHERE os.id = v.step_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 10 THEN
    RAISE EXCEPTION 'Expected 10 foundation steps to receive time estimates, updated %.', v_updated;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.operation_steps os
    WHERE os.id IN (
      v_step_kickoff, v_step_plan, v_step_order, v_step_punch, v_step_ret_tools,
      v_step_ret_mats, v_step_store, v_step_waste, v_step_reflect, v_step_celebrate
    )
      AND (
        os.time_estimate_low IS NULL OR os.time_estimate_med IS NULL OR os.time_estimate_high IS NULL
        OR os.time_estimate_low = 0 OR os.time_estimate_med = 0 OR os.time_estimate_high = 0
      )
  ) THEN
    RAISE EXCEPTION 'One or more foundation steps still have null or zero time estimates.';
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Standard Foundation step 8 time estimates applied and phases cache rebuilt for project %', v_project_id;
END
$migration$;

-- END 20260918220500_standard_foundation_step8_time_estimates.sql

-- =============================================================================
-- BEGIN 20260918220600_standard_foundation_step4_risks.sql
-- =============================================================================
-- Step 4: Standard Foundation project_risks - delete Generic risk; score and quantify the rest.
-- Components are safety / schedule / budget only. Quality failure modes belong in PFMEA (step 9).
-- Design / finish quality register rows are reframed to schedule or budget impact of rework.

DO $migration$
DECLARE
  v_project_id uuid;
  v_updated integer;
  v_deleted integer;
  v_unscored integer;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  DELETE FROM public.project_risks
  WHERE project_id = v_project_id
    AND lower(btrim(risk_title)) = 'generic risk';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % Generic risk row(s) on Standard Foundation', v_deleted;

  -- -----------------------------------------------------------------------
  -- Safety
  -- -----------------------------------------------------------------------
  UPDATE public.project_risks r
  SET risk_dimension = 'safety',
      severity_score = 9,
      occurrence_score = 3,
      detection_score = 4,
      likelihood = 'low',
      severity = 'high',
      schedule_impact_low_days = NULL,
      schedule_impact_high_days = NULL,
      budget_impact_low = NULL,
      budget_impact_high = NULL,
      mitigation_effort_level = 'low',
      occurrence_driver = 'attention',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Wear step-listed PPE, use guards and push sticks on powered cutters, and stop for a 10-minute break every 50 minutes of continuous physical work.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Put on the PPE named on the active step (glasses, gloves, respirator as listed) before the first cut or lift','benefit','Removes the most common unprotected exposure','completed',false),
        jsonb_build_object('action','Use factory guards and a push stick on cuts under 3 in wide','benefit','Keeps fingers behind the blade line on the dangerous last inch','completed',false),
        jsonb_build_object('action','Set a timer: 50 minutes work, 10 minutes break, no powered work after local quiet hours (often 7:00-8:00p)','benefit','Cuts fatigue-driven mistakes without vague pace advice','completed',false)
      ),
      recommendation = 'Treat missing PPE as a hard stop. Do not start a cutting or overhead step until glasses and any listed respirator are on.',
      benefit = 'An injury ends the project the same day and can need stitches or worse; the control is the method and PPE, not toughness.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'You get injured on the project';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Injury risk update expected 1 row, got %.', v_updated; END IF;

  -- -----------------------------------------------------------------------
  -- Schedule
  -- -----------------------------------------------------------------------
  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 6,
      occurrence_score = 5,
      detection_score = 5,
      likelihood = 'medium',
      severity = 'medium',
      schedule_impact_low_days = 0.5,
      schedule_impact_high_days = 2,
      budget_impact_low = 25,
      budget_impact_high = 150,
      mitigation_effort_level = 'low',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Match each upcoming step to its tool list in Shopping Checklist at least 48 hours before the work day, and rent specialty tools for the need-by date only.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Open Shopping Checklist 48 hours before the work day and confirm every tool line for the next operation is secured','benefit','Catches missing specialty tools before the crew is waiting','completed',false),
        jsonb_build_object('action','Rent specialty tools for the need-by date from the schedule, not the weekend before','benefit','Avoids idle rental days and last-minute stockouts','completed',false),
        jsonb_build_object('action','Watch one tool-specific tutorial for any tool you have used fewer than 3 times','benefit','Reduces bind/slip time that burns half a day','completed',false)
      ),
      recommendation = 'Do not start a step whose primary tool is still unchecked on Shopping Checklist.',
      benefit = 'Wrong tooling typically burns 0.5-2 days and $25-$150 in wasted consumables or re-rentals.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Using the wrong tool for the job';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Wrong tool risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 5,
      occurrence_score = 5,
      detection_score = 4,
      likelihood = 'medium',
      severity = 'medium',
      schedule_impact_low_days = 0.5,
      schedule_impact_high_days = 1,
      budget_impact_low = NULL,
      budget_impact_high = NULL,
      mitigation_effort_level = 'low',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Set a hard start time, add 20 minutes of travel buffer, and confirm by text the night before by 8:00p.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Agree a start time in writing (text) with a 20-minute travel buffer','benefit','Removes ambiguous arrival windows','completed',false),
        jsonb_build_object('action','Send a confirm-or-cancel text by 8:00p the night before','benefit','Catches conflicts before materials are staged','completed',false),
        jsonb_build_object('action','Have a solo fallback task ready that fills the first 2 hours if they are late','benefit','Keeps the day from dying in the first hour','completed',false)
      ),
      recommendation = 'If there is no confirm text by 8:00p the night before, plan the morning as solo work.',
      benefit = 'A no-show typically costs 0.5-1 scheduled day when the work needed two people.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Friend doesn''t show up on time';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Friend late risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 7,
      occurrence_score = 4,
      detection_score = 5,
      likelihood = 'medium',
      severity = 'high',
      schedule_impact_low_days = 1,
      schedule_impact_high_days = 3,
      budget_impact_low = 100,
      budget_impact_high = 500,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'skill',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Assign helpers only to tasks they have done before, and keep critical layout or finish steps for yourself.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Ask for two photos of similar past work before assigning a critical task','benefit','Screens capability before the work day','completed',false),
        jsonb_build_object('action','Give helpers demolition, carrying, and cleanup; keep layout and finish yourself','benefit','Limits rework to non-critical zones','completed',false),
        jsonb_build_object('action','Demo the first unit together for 15 minutes before they work unsupervised','benefit','Catches method mismatches early','completed',false)
      ),
      recommendation = 'If you cannot verify prior similar work, do not assign that person to layout or finish.',
      benefit = 'Helper rework commonly adds 1-3 days and $100-$500 in materials.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Friend doesn''t perform work as expected';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Friend performance risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 5,
      occurrence_score = 5,
      detection_score = 4,
      likelihood = 'medium',
      severity = 'medium',
      schedule_impact_low_days = 0.5,
      schedule_impact_high_days = 1.5,
      budget_impact_low = NULL,
      budget_impact_high = NULL,
      mitigation_effort_level = 'low',
      occurrence_driver = 'attention',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Agree a morning goal list with timed blocks (for example 9:00-11:00 and 1:00-3:00) and a shared end time.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Hold a 10-minute morning standup that names the day''s deliverable and end time','benefit','Aligns pace before distractions start','completed',false),
        jsonb_build_object('action','Use two timed work blocks with one scheduled break, not open-ended hanging out','benefit','Keeps output measurable','completed',false),
        jsonb_build_object('action','Stop assigning new tasks after the second block if the day goal is already missed','benefit','Prevents a late scramble that creates defects','completed',false)
      ),
      recommendation = 'If a helper cannot commit to timed blocks, schedule them for a half day with one clear deliverable.',
      benefit = 'Unfocused help typically burns 0.5-1.5 days of calendar progress.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Friend doesn''t work continuously';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Friend continuity risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 7,
      occurrence_score = 7,
      detection_score = 4,
      likelihood = 'high',
      severity = 'high',
      schedule_impact_low_days = 2,
      schedule_impact_high_days = 7,
      budget_impact_low = NULL,
      budget_impact_high = NULL,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Stop for a documented research block (30-60 minutes) or call a knowledgeable person before continuing past a step you do not understand.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','When stuck more than 15 minutes, start a 30-minute research timer before guessing','benefit','Converts freeze into a bounded recovery','completed',false),
        jsonb_build_object('action','Call or message someone who has done this project type before continuing','benefit','Prevents multi-day rework from a wrong first move','completed',false),
        jsonb_build_object('action','Split the confusing operation into the smallest next physical action and do only that','benefit','Restores momentum without skipping the hard part','completed',false)
      ),
      recommendation = 'Do not force a step you cannot explain in one sentence. Pause, research for 30-60 minutes, then resume.',
      benefit = 'Overwhelm stalls commonly add 2-7 calendar days when the room is already torn apart.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Feeling overwhelmed by complexity';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Overwhelm risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 4,
      occurrence_score = 5,
      detection_score = 3,
      likelihood = 'medium',
      severity = 'low',
      schedule_impact_low_days = 0.25,
      schedule_impact_high_days = 1,
      budget_impact_low = NULL,
      budget_impact_high = NULL,
      mitigation_effort_level = 'low',
      occurrence_driver = 'environment',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Keep powered work inside 8:00-9:00a through 7:00-8:00p unless local rules are tighter, and warn adjacent neighbors 24 hours ahead.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Text or leave a note for adjacent neighbors 24 hours before loud cutting days','benefit','Builds tolerance and reduces stoppage knocks','completed',false),
        jsonb_build_object('action','Schedule wet saws, grinders, and demo for midday blocks, not early morning or late evening','benefit','Keeps noise inside common quiet-hour windows','completed',false),
        jsonb_build_object('action','Use hand tools for the last hour before quiet hours','benefit','Finishes the day without a complaint-driven shutdown','completed',false)
      ),
      recommendation = 'Most people accept 8:00-9:00a starts and work until 7:00-8:00p. No power tools outside that window unless local rules allow it.',
      benefit = 'A noise stoppage typically costs 0.25-1 day when a loud operation has to move.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Noise complaints or neighbor frustration';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Noise risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 7,
      occurrence_score = 3,
      detection_score = 4,
      likelihood = 'low',
      severity = 'high',
      schedule_impact_low_days = 0.5,
      schedule_impact_high_days = 2,
      budget_impact_low = 40,
      budget_impact_high = 200,
      mitigation_effort_level = 'low',
      occurrence_driver = 'tool_condition',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Inspect tools the night before, stage spare blades/bits, and know the nearest same-day rental for the critical tool.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Inspect cords, blades, and batteries the night before a critical day','benefit','Catches failures before the work window opens','completed',false),
        jsonb_build_object('action','Keep one spare blade or bit for each primary cutter on site','benefit','Turns a 2-hour store run into a 2-minute swap','completed',false),
        jsonb_build_object('action','Save the phone number and hours of a same-day rental within 20 minutes of the site','benefit','Restores progress after a hard failure','completed',false)
      ),
      recommendation = 'If the critical tool has no same-day rental backup within 20 minutes, do not start a day that depends on it alone.',
      benefit = 'Breakdowns typically cost 0.5-2 days plus $40-$200 in emergency rental or parts.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Tool failure or breakdown';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Tool failure risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 6,
      occurrence_score = 7,
      detection_score = 5,
      likelihood = 'high',
      severity = 'medium',
      schedule_impact_low_days = 3,
      schedule_impact_high_days = 14,
      budget_impact_low = NULL,
      budget_impact_high = NULL,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'attention',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Break the remaining work into sessions that each end at a visible milestone, and put a weekly 30-minute accountability check on the calendar.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Define the next session as a single visible milestone (for example one wall primed, not the whole room)','benefit','Creates finish signals that sustain effort','completed',false),
        jsonb_build_object('action','Schedule a weekly 30-minute check-in with a friend or calendar reminder until closeout','benefit','Adds external structure when motivation dips','completed',false),
        jsonb_build_object('action','Celebrate each milestone with a recorded photo, not only the final day','benefit','Keeps progress visible in a torn-up space','completed',false)
      ),
      recommendation = 'If more than 7 days pass with no milestone completed, cut session size in half and book the next session on the calendar today.',
      benefit = 'Motivation stalls commonly stretch a weekend job into 1-2 extra weeks.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Losing motivation mid-project';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Motivation risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 5,
      occurrence_score = 7,
      detection_score = 4,
      likelihood = 'high',
      severity = 'medium',
      schedule_impact_low_days = 1,
      schedule_impact_high_days = 5,
      budget_impact_low = 50,
      budget_impact_high = 300,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Publish a room-by-room outage calendar to the household, and stage temporary substitutes before demolition.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Post start and restore dates for each critical room on the fridge or shared calendar','benefit','Aligns expectations before the space goes offline','completed',false),
        jsonb_build_object('action','Stage a mini kitchen or bathroom kit before demo if that room is offline more than 24 hours','benefit','Keeps household function during the outage','completed',false),
        jsonb_build_object('action','Schedule loud or blocking work outside school and dinner windows the household named','benefit','Reduces mid-day shutdowns from household conflict','completed',false)
      ),
      recommendation = 'Do not start demolition in a critical room until restore dates and temporary substitutes are posted.',
      benefit = 'Household conflict typically adds 1-5 days and $50-$300 in temporary living workarounds.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Family members frustrated by the disruption';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Family disruption risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 6,
      occurrence_score = 5,
      detection_score = 4,
      likelihood = 'medium',
      severity = 'medium',
      schedule_impact_low_days = 1,
      schedule_impact_high_days = 4,
      budget_impact_low = 50,
      budget_impact_high = 400,
      mitigation_effort_level = 'low',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Buy the plan quantity plus 10-15% waste buffer, keep packaging labels, and stop work at a clean joint when stock runs out.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Purchase 10-15% extra of finish materials that must match by batch','benefit','Covers cuts, breakage, and measurement variance','completed',false),
        jsonb_build_object('action','Photograph and keep packaging labels with lot or dye-lot codes','benefit','Speeds matching reorders','completed',false),
        jsonb_build_object('action','When stock runs out, stop at a clean joint rather than mixing a new lot mid-field','benefit','Avoids a visible mismatch that forces larger rework','completed',false)
      ),
      recommendation = 'If Shopping Checklist shows zero buffer on a batch-matched material, raise material risk before ordering.',
      benefit = 'Mid-job stockouts typically cost 1-4 days plus $50-$400 in rush buys or mismatched lots.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Running out of materials mid-project';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Materials stockout risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 8,
      occurrence_score = 7,
      detection_score = 3,
      likelihood = 'high',
      severity = 'high',
      schedule_impact_low_days = 2,
      schedule_impact_high_days = 10,
      budget_impact_low = NULL,
      budget_impact_high = NULL,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Build the schedule with a 30-50% time buffer on DIY labor, and sequence by milestones that can pause overnight.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Multiply first-pass DIY labor estimates by 1.3 to 1.5 before publishing household restore dates','benefit','Absorbs variability without immediate schedule failure','completed',false),
        jsonb_build_object('action','Break the project into milestones that each leave the space usable overnight where possible','benefit','Improves recovery when a day overruns','completed',false),
        jsonb_build_object('action','Communicate buffered dates to the household, not the optimistic dates','benefit','Reduces conflict when real duration shows up','completed',false)
      ),
      recommendation = 'If a restore date has no 30-50% buffer on DIY labor, rewrite the schedule before Ordering.',
      benefit = 'Optimistic schedules commonly overrun 2-10 calendar days on multi-day DIY work.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Underestimating project time';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Time underestimate risk update expected 1 row, got %.', v_updated; END IF;

  -- Quality-ish row reframed as schedule cost of rework (finish defects themselves are PFMEA).
  UPDATE public.project_risks r
  SET risk_dimension = 'schedule',
      severity_score = 6,
      occurrence_score = 5,
      detection_score = 4,
      likelihood = 'medium',
      severity = 'medium',
      schedule_impact_low_days = 1,
      schedule_impact_high_days = 5,
      budget_impact_low = 100,
      budget_impact_high = 800,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'attention',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Run Quality Control before wrap-up, and reserve one half-day buffer for punch fixes before tool returns.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Complete the punchlist step before returning rentals','benefit','Keeps specialty tools on site for corrections','completed',false),
        jsonb_build_object('action','Hold a half-day schedule buffer after install for punch fixes','benefit','Prevents a second full mobilization','completed',false),
        jsonb_build_object('action','Fix defects inside the product open or cure window named on the bag when one exists','benefit','Avoids multi-day tear-outs after cure','completed',false)
      ),
      recommendation = 'Do not mark wrap-up tools complete while required punch items are still open without a dated repair note.',
      benefit = 'Visible defects that wait until after tool return typically cost 1-5 days and $100-$800 to remobilize.',
      risk_description = 'Reframed as schedule and remobilization cost. The finish defect itself is tracked in PFMEA on quality outputs.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Visible imperfections after installation';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Visible imperfections risk update expected 1 row, got %.', v_updated; END IF;

  -- -----------------------------------------------------------------------
  -- Budget
  -- -----------------------------------------------------------------------
  UPDATE public.project_risks r
  SET risk_dimension = 'budget',
      severity_score = 8,
      occurrence_score = 5,
      detection_score = 6,
      likelihood = 'medium',
      severity = 'high',
      schedule_impact_low_days = 2,
      schedule_impact_high_days = 14,
      budget_impact_low = 500,
      budget_impact_high = 5000,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Research common hidden issues for this project type, hold at least 10% contingency or $500 minimum, and stop for assessment before improvising a fix.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Read common failure modes for this project type before demo and list three you might find','benefit','Improves early detection and preparedness','completed',false),
        jsonb_build_object('action','Keep a 10% contingency budget or a minimum of $500 before opening walls or floors','benefit','Allows response without stalling the whole job','completed',false),
        jsonb_build_object('action','When a hidden issue appears, stop for a documented assessment before buying a fix','benefit','Prevents compounding damage from reactive purchases','completed',false)
      ),
      recommendation = 'If contingency is under 10% of materials (and under $500), raise it before demolition.',
      benefit = 'Hidden rot, wiring, or plumbing commonly adds $500-$5000 and 2-14 days.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Discovering hidden issues (rot, wiring, plumbing)';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Hidden issues risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'budget',
      severity_score = 6,
      occurrence_score = 5,
      detection_score = 5,
      likelihood = 'medium',
      severity = 'high',
      schedule_impact_low_days = NULL,
      schedule_impact_high_days = NULL,
      budget_impact_low = 100,
      budget_impact_high = 1000,
      mitigation_effort_level = 'low',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Use one payment method for project spend and log every receipt into Project Budgeting within 24 hours.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Put all project purchases on one card or account','benefit','Centralizes the spend history','completed',false),
        jsonb_build_object('action','Log each receipt in Project Budgeting within 24 hours of purchase','benefit','Prevents backlog and missing transactions','completed',false),
        jsonb_build_object('action','Record cash and helper reimbursements the same day','benefit','Closes untraceable gaps in totals','completed',false)
      ),
      recommendation = 'If more than 3 receipts are unlogged, stop new purchases until Project Budgeting is current.',
      benefit = 'Lost tracking commonly hides $100-$1000 of overspend until it is too late to course-correct.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Budget tracking gets lost';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Budget tracking risk update expected 1 row, got %.', v_updated; END IF;

  UPDATE public.project_risks r
  SET risk_dimension = 'budget',
      severity_score = 7,
      occurrence_score = 5,
      detection_score = 5,
      likelihood = 'medium',
      severity = 'high',
      schedule_impact_low_days = 1,
      schedule_impact_high_days = 5,
      budget_impact_low = 150,
      budget_impact_high = 1200,
      mitigation_effort_level = 'low',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Set Shopping Checklist quality tier before buying, inspect stock at pickup, and prefer returnable SKUs with a written return window of at least 30 days.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Choose Solid midrange or Top quality in Shopping Settings when the part is structural or finish-critical','benefit','Avoids false-economy failures that force a second buy','completed',false),
        jsonb_build_object('action','Inspect boards, tile, or finishes at pickup for warp, chips, and dye-lot match before leaving the store','benefit','Catches defects while return is still free','completed',false),
        jsonb_build_object('action','Confirm the return window is at least 30 days on finish materials before opening packs','benefit','Preserves recovery options','completed',false)
      ),
      recommendation = 'Do not buy the lowest-cost option on structural or finish-critical lines without reading current reviews and the return policy.',
      benefit = 'Low-grade materials commonly force $150-$1200 in replacement plus 1-5 days of remobilization.',
      risk_description = 'Tracked as budget and remobilization. Product performance failure modes also belong in PFMEA on Ordering outputs.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Low-quality materials';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Low-quality materials risk update expected 1 row, got %.', v_updated; END IF;

  -- Design disappointment reframed as budget cost of redo (aesthetic miss itself is PFMEA/quality).
  UPDATE public.project_risks r
  SET risk_dimension = 'budget',
      severity_score = 5,
      occurrence_score = 4,
      detection_score = 4,
      likelihood = 'medium',
      severity = 'medium',
      schedule_impact_low_days = 2,
      schedule_impact_high_days = 7,
      budget_impact_low = 200,
      budget_impact_high = 2000,
      mitigation_effort_level = 'medium',
      occurrence_driver = 'process_design',
      prevention_strength = 'procedural',
      mitigation_strategy = 'Validate samples in the actual room lighting for 24 hours and mock layouts before committing the full material buy.',
      mitigation_actions = jsonb_build_array(
        jsonb_build_object('action','Leave finish samples in the room through day and night lighting for 24 hours before ordering the full quantity','benefit','Catches color and sheen surprises before the big buy','completed',false),
        jsonb_build_object('action','Tape or cardboard a mock layout of pattern and scale on the real surface','benefit','Tests visual flow before irreversible install','completed',false),
        jsonb_build_object('action','Get one second opinion from someone who will live with the space before ordering','benefit','Surfaces objections while change is still cheap','completed',false)
      ),
      recommendation = 'Do not place the full finish order until a 24-hour in-room sample pass is done.',
      benefit = 'A design redo after install commonly costs $200-$2000 and 2-7 days.',
      risk_description = 'Reframed as redo cost. Aesthetic requirement failures are authored in PFMEA where an output carries major-aesthetics risk.',
      updated_at = now()
  WHERE r.project_id = v_project_id
    AND r.risk_title = 'Realizing the design doesn''t look as good as expected';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN RAISE EXCEPTION 'Design disappointment risk update expected 1 row, got %.', v_updated; END IF;

  SELECT count(*)::integer INTO v_unscored
  FROM public.project_risks r
  WHERE r.project_id = v_project_id
    AND (
      r.risk_dimension IS NULL
      OR r.severity_score IS NULL
      OR r.occurrence_score IS NULL
      OR r.detection_score IS NULL
    );

  IF v_unscored <> 0 THEN
    RAISE EXCEPTION 'Standard Foundation still has % unscored register risks after step 4.', v_unscored;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND lower(btrim(r.risk_title)) = 'generic risk'
  ) THEN
    RAISE EXCEPTION 'Generic risk row still present on Standard Foundation.';
  END IF;

  RAISE NOTICE 'Standard Foundation step 4 risks updated for project %', v_project_id;
END
$migration$;

-- END 20260918220600_standard_foundation_step4_risks.sql

-- =============================================================================
-- BEGIN 20260918220700_standard_foundation_step9_pfmea.sql
-- =============================================================================
-- Step 9: Standard Foundation PFMEA for Kickoff readiness and Ordering outputs.
-- Ensures projects_pfmea + requirements, then authors failure modes / effects / causes / controls.
-- Idempotent: clears authored FM trees for these steps, then rewrites.

DO $migration$
DECLARE
  v_project_id uuid;
  v_step_kickoff CONSTANT uuid := '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid;
  v_step_order CONSTANT uuid := 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid;
  v_out_ready CONSTANT text := 'output-1773865215408-0.9212794339230775';
  v_out_tools CONSTANT text := 'output-1764945723504-0.22211916093684303';
  v_out_mats CONSTANT text := 'output-1764945739819-0.09311023039522637';
  v_req_ready uuid;
  v_req_tools uuid;
  v_req_mats uuid;
  v_fm_ready uuid := 'a1000001-d82d-4f80-9e46-000000000011'::uuid;
  v_fm_tools uuid := 'a1000001-d82d-4f80-9e46-000000000012'::uuid;
  v_fm_mats uuid := 'a1000001-d82d-4f80-9e46-000000000013'::uuid;
  v_cause_ready uuid;
  v_cause_tools uuid;
  v_cause_mats uuid;
  v_n integer;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE os.id = v_step_kickoff AND pp.project_id = v_project_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE os.id = v_step_order AND pp.project_id = v_project_id
  ) THEN
    RAISE EXCEPTION 'Kickoff or Ordering step missing on Standard Foundation %.', v_project_id;
  END IF;

  IF to_regclass('public.projects_pfmea') IS NOT NULL THEN
    INSERT INTO public.projects_pfmea (project_id)
    VALUES (v_project_id)
    ON CONFLICT (project_id) DO UPDATE SET updated_at = now();
  END IF;

  DELETE FROM public.pfmea_action_items
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_kickoff, v_step_order)
  );

  DELETE FROM public.pfmea_controls
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_kickoff, v_step_order)
  )
  OR cause_id IN (
    SELECT c.id FROM public.pfmea_potential_causes c
    JOIN public.pfmea_failure_modes fm ON fm.id = c.failure_mode_id
    WHERE fm.operation_step_id IN (v_step_kickoff, v_step_order)
  );

  DELETE FROM public.pfmea_potential_causes
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_kickoff, v_step_order)
  );

  DELETE FROM public.pfmea_potential_effects
  WHERE failure_mode_id IN (
    SELECT fm.id FROM public.pfmea_failure_modes fm
    WHERE fm.operation_step_id IN (v_step_kickoff, v_step_order)
  );

  DELETE FROM public.pfmea_failure_modes
  WHERE operation_step_id IN (v_step_kickoff, v_step_order);

  DELETE FROM public.pfmea_requirements
  WHERE project_id = v_project_id
    AND operation_step_id IN (v_step_kickoff, v_step_order)
    AND output_id IN (v_out_ready, v_out_tools, v_out_mats);

  INSERT INTO public.pfmea_requirements (
    id, project_id, operation_step_id, output_id, requirement_text, display_order
  ) VALUES
  ('a1000001-d82d-4f80-9e46-000000000001'::uuid, v_project_id, v_step_kickoff, v_out_ready,
   'Kickoff Profile and Goals screens are completed and the user accepts skill, effort, time, and budget fit before Build Your Plan.', 1),
  ('a1000001-d82d-4f80-9e46-000000000002'::uuid, v_project_id, v_step_order, v_out_tools,
   'Every tool line on the Shopping Checklist Tools tab is secured (bought, rented, borrowed, or owned) before install work starts.', 1),
  ('a1000001-d82d-4f80-9e46-000000000003'::uuid, v_project_id, v_step_order, v_out_mats,
   'Every material line on the Shopping Checklist Materials tab is secured with waste buffer and lead time accounted for before install work starts.', 2);

  v_req_ready := 'a1000001-d82d-4f80-9e46-000000000001'::uuid;
  v_req_tools := 'a1000001-d82d-4f80-9e46-000000000002'::uuid;
  v_req_mats := 'a1000001-d82d-4f80-9e46-000000000003'::uuid;

  INSERT INTO public.pfmea_failure_modes (
    id, project_id, operation_step_id, requirement_id, failure_mode, severity_score
  ) VALUES
  (v_fm_ready, v_project_id, v_step_kickoff, v_req_ready,
   'User advances past Kickoff without accepting skill, effort, time, or budget fit.', 7),
  (v_fm_tools, v_project_id, v_step_order, v_req_tools,
   'Install work starts while one or more required tools are still unchecked on Shopping Checklist.', 8),
  (v_fm_mats, v_project_id, v_step_order, v_req_mats,
   'Install work starts while required materials are missing, under-buffered, or still in lead time.', 8);

  INSERT INTO public.pfmea_potential_effects (failure_mode_id, effect_description, severity_score)
  VALUES
  (v_fm_ready, 'The project stalls mid-demo when calendar, skill, or budget reality shows up, leaving the space unusable for days.', 7),
  (v_fm_tools, 'Work stops mid-operation waiting on a tool, burning a scheduled day and often a same-day rental premium.', 8),
  (v_fm_mats, 'Work stops mid-field for a store run or dye-lot mismatch, forcing a pause of 1-4 days and possible remobilization cost.', 8);

  INSERT INTO public.pfmea_potential_causes (
    failure_mode_id, cause_description, occurrence_score, occurrence_driver,
    implicated_item_kind, implicated_item_id
  ) VALUES
  (v_fm_ready,
   'Kickoff screens are skipped or Confirmed readiness is checked without completing Profile and Goals.',
   5, 'attention', 'output', v_out_ready),
  (v_fm_tools,
   'Shopping Checklist Tools tab is left partially unchecked, or owned-tool filtering hides a still-needed rental.',
   5, 'process_design', 'output', v_out_tools),
  (v_fm_mats,
   'Material risk is set to essentials-only, lead days are omitted, or Materials Ordered is checked before the list is complete.',
   6, 'process_design', 'output', v_out_mats);

  SELECT c.id INTO v_cause_ready
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_ready
  ORDER BY c.created_at DESC
  LIMIT 1;

  SELECT c.id INTO v_cause_tools
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_tools
  ORDER BY c.created_at DESC
  LIMIT 1;

  SELECT c.id INTO v_cause_mats
  FROM public.pfmea_potential_causes c
  WHERE c.failure_mode_id = v_fm_mats
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_cause_ready IS NULL OR v_cause_tools IS NULL OR v_cause_mats IS NULL THEN
    RAISE EXCEPTION 'PFMEA causes failed to resolve.';
  END IF;

  INSERT INTO public.pfmea_controls (
    failure_mode_id, cause_id, control_type, control_description, detection_score, control_strength
  ) VALUES
  (v_fm_ready, v_cause_ready, 'prevention',
   'Require Project Kickoff completion through Profile and Goals before Confirmed readiness can be checked.',
   NULL, 'procedural'),
  (v_fm_ready, v_cause_ready, 'detection',
   'Step Checklist shows Confirmed readiness only after Kickoff app completion state is true.',
   4, NULL),
  (v_fm_tools, v_cause_tools, 'prevention',
   'Keep install steps blocked until Shopping Checklist Tools tab has zero unchecked lines and Tool Library ownership is current.',
   NULL, 'procedural'),
  (v_fm_tools, v_cause_tools, 'detection',
   'Tools Ordered checklist item stays open while any Tools tab line is unchecked.',
   3, NULL),
  (v_fm_mats, v_cause_mats, 'prevention',
   'Set material risk to Practical buffer or Full contingency for batch-matched finishes, and enter lead days before Complete Shopping.',
   NULL, 'procedural'),
  (v_fm_mats, v_cause_mats, 'detection',
   'Materials Ordered checklist item stays open while any Materials tab line is unchecked.',
   3, NULL);

  SELECT count(*)::integer INTO v_n
  FROM public.pfmea_failure_modes
  WHERE operation_step_id IN (v_step_kickoff, v_step_order)
    AND project_id = v_project_id;

  IF v_n <> 3 THEN
    RAISE EXCEPTION 'Expected 3 PFMEA failure modes on Kickoff/Ordering, found %.', v_n;
  END IF;

  RAISE NOTICE 'Standard Foundation step 9 PFMEA applied for project %', v_project_id;
END
$migration$;

-- END 20260918220700_standard_foundation_step9_pfmea.sql

-- =============================================================================
-- BEGIN 20260918220800_standard_foundation_step10_catalog_copy.sql
-- =============================================================================
-- Step 10: Standard Foundation catalog copy (description + project_challenges, <=200 chars each).
-- User-facing meaning of the foundation, not meta DB talk. No em-dashes.

DO $migration$
DECLARE
  v_project_id uuid;
  v_description CONSTANT text :=
    'Shared kickoff, planning, ordering, and closeout used by every DIY project: confirm fit, lock a plan, get tools and materials, then punchlist, return, store, and wrap up.';
  v_challenges CONSTANT text :=
    'Honesty at kickoff and a locked plan before shopping are the hard parts. Skipping either stalls mid-project when time, budget, or missing gear catches up.';
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  IF length(v_description) > 200 OR length(v_challenges) > 200 THEN
    RAISE EXCEPTION 'Catalog copy exceeds 200 characters (description %, challenges %).',
      length(v_description), length(v_challenges);
  END IF;

  UPDATE public.projects
  SET description = v_description,
      project_challenges = v_challenges,
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Standard Foundation step 10 catalog copy applied for project % (desc %, challenges %)',
    v_project_id, length(v_description), length(v_challenges);
END
$migration$;

-- END 20260918220800_standard_foundation_step10_catalog_copy.sql

-- =============================================================================
-- BEGIN 20260918220900_standard_foundation_content_audit.sql
-- =============================================================================
-- Content audit: Standard Foundation (is_standard phases ARE in scope here).
-- Asserts completeness for all 10 foundation steps. Quality goals (Step 11) intentionally skipped.
-- Rebuilds phases cache once more after enrichment migrations.

DO $migration$
DECLARE
  v_project_id uuid;
  v_gaps text[] := ARRAY[]::text[];
  v_row record;
  v_expected integer := 10;
  v_found integer;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE p.is_standard IS TRUE AND p.parent_project_id IS NULL
  ORDER BY p.created_at ASC
  LIMIT 1;

  IF v_project_id IS NULL THEN
    SELECT p.id INTO v_project_id
    FROM public.projects p
    WHERE p.id = 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
    LIMIT 1;
  END IF;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Standard Foundation project not found.';
  END IF;

  SELECT count(*)::integer INTO v_found
  FROM public.operation_steps os
  JOIN public.phase_operations po ON po.id = os.operation_id
  JOIN public.project_phases pp ON pp.id = po.phase_id
  WHERE pp.project_id = v_project_id;

  IF v_found <> v_expected THEN
    v_gaps := array_append(v_gaps, format('expected %s foundation steps, found %s', v_expected, v_found));
  END IF;

  FOR v_row IN
    SELECT
      os.step_title,
      os.step_type,
      os.number_of_workers,
      os.skill_level,
      os.description,
      os.time_estimate_low, os.time_estimate_med, os.time_estimate_high,
      jsonb_typeof(os.outputs::jsonb) AS outputs_type,
      jsonb_typeof(os.tools::jsonb) AS tools_type,
      jsonb_typeof(os.materials::jsonb) AS materials_type,
      jsonb_typeof(os.process_variables::jsonb) AS pv_type,
      coalesce(CASE WHEN jsonb_typeof(os.outputs::jsonb) = 'array'
                    THEN jsonb_array_length(os.outputs::jsonb) END, 0) AS outputs_n,
      coalesce(CASE WHEN jsonb_typeof(os.tools::jsonb) = 'array'
                    THEN jsonb_array_length(os.tools::jsonb) END, 0) AS tools_n,
      coalesce(CASE WHEN jsonb_typeof(os.process_variables::jsonb) = 'array'
                    THEN jsonb_array_length(os.process_variables::jsonb) END, 0) AS pv_n,
      (
        SELECT count(DISTINCT si.instruction_level)
        FROM public.step_instructions si
        WHERE si.step_id = os.id
          AND si.instruction_level IN ('beginner', 'intermediate', 'advanced')
          AND jsonb_typeof(si.content) = 'array'
          AND jsonb_array_length(si.content) >= 3
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(si.content) s
            WHERE coalesce(s->>'title', '') ILIKE 'Background%'
              AND nullif(btrim(s->>'content'), '') IS NOT NULL
          )
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(si.content) s
            WHERE coalesce(s->>'title', '') ILIKE 'Instructions%'
              AND nullif(btrim(s->>'content'), '') IS NOT NULL
          )
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(si.content) s
            WHERE coalesce(s->>'title', '') ILIKE 'Error-Recovery%'
              AND nullif(btrim(s->>'content'), '') IS NOT NULL
          )
      ) AS levels_n
    FROM public.operation_steps os
    JOIN public.phase_operations po ON po.id = os.operation_id
    JOIN public.project_phases pp ON pp.id = po.phase_id
    WHERE pp.project_id = v_project_id
    ORDER BY
             CASE WHEN pp.position_rule = 'last' THEN 1 ELSE 0 END,
             pp.position_value NULLS LAST,
             pp.created_at ASC,
             pp.id ASC,
             po.display_order,
             os.display_order
  LOOP
    IF v_row.levels_n <> 3 THEN
      v_gaps := array_append(v_gaps, format('%s: %s of 3 complete instruction levels', v_row.step_title, v_row.levels_n));
    END IF;
    IF v_row.outputs_type IS DISTINCT FROM 'array' OR v_row.outputs_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no outputs', v_row.step_title));
    END IF;
    IF v_row.tools_type IS DISTINCT FROM 'array' OR v_row.tools_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no tools', v_row.step_title));
    END IF;
    IF v_row.materials_type IS DISTINCT FROM 'array' THEN
      v_gaps := array_append(v_gaps, format('%s: materials never authored', v_row.step_title));
    END IF;
    IF v_row.pv_type IS DISTINCT FROM 'array' OR v_row.pv_n = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: no process variables', v_row.step_title));
    END IF;
    IF v_row.time_estimate_low IS NULL OR v_row.time_estimate_med IS NULL OR v_row.time_estimate_high IS NULL
       OR v_row.time_estimate_low = 0 OR v_row.time_estimate_med = 0 OR v_row.time_estimate_high = 0 THEN
      v_gaps := array_append(v_gaps, format('%s: incomplete or zero time estimates', v_row.step_title));
    END IF;
    IF v_row.step_type IS NULL OR v_row.number_of_workers IS NULL OR v_row.skill_level IS NULL
       OR v_row.description IS NULL OR btrim(v_row.description) = '' THEN
      v_gaps := array_append(v_gaps, format('%s: incomplete structure metadata', v_row.step_title));
    END IF;
  END LOOP;

  FOR v_row IN
    SELECT os.step_title, req.output_id
    FROM public.pfmea_requirements req
    JOIN public.operation_steps os ON os.id = req.operation_step_id
    WHERE req.project_id = v_project_id
      AND req.output_id IS NOT NULL
      AND jsonb_typeof(os.outputs::jsonb) = 'array'
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(os.outputs::jsonb) AS o
        WHERE o->>'id' = req.output_id
      )
  LOOP
    v_gaps := array_append(v_gaps, format('%s: PFMEA requirement points at missing output %s', v_row.step_title, v_row.output_id));
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM public.pfmea_failure_modes fm
    WHERE fm.project_id = v_project_id
      AND fm.operation_step_id = '40b366df-d2cb-4da8-9be7-28056183d5bc'::uuid
  ) THEN
    v_gaps := array_append(v_gaps, 'Project Kickoff: no PFMEA failure modes');
  END IF;

  IF (
    SELECT count(*)::integer FROM public.pfmea_failure_modes fm
    WHERE fm.project_id = v_project_id
      AND fm.operation_step_id = 'c7b7d58f-d3c3-4381-9b5a-019a7d7427af'::uuid
  ) < 2 THEN
    v_gaps := array_append(v_gaps, 'Tool & Material Ordering: fewer than 2 PFMEA failure modes');
  END IF;

  FOR v_row IN
    SELECT r.risk_title
    FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND (
        r.risk_dimension IS NULL
        OR r.severity_score IS NULL
        OR r.occurrence_score IS NULL
        OR r.detection_score IS NULL
      )
  LOOP
    v_gaps := array_append(v_gaps, format('register risk "%s": missing component or scores', v_row.risk_title));
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.project_risks r
    WHERE r.project_id = v_project_id
      AND lower(btrim(r.risk_title)) = 'generic risk'
  ) THEN
    v_gaps := array_append(v_gaps, 'register still contains Generic risk');
  END IF;

  IF (
    SELECT length(coalesce(p.description, '')) FROM public.projects p WHERE p.id = v_project_id
  ) = 0 OR (
    SELECT length(coalesce(p.project_challenges, '')) FROM public.projects p WHERE p.id = v_project_id
  ) = 0 THEN
    v_gaps := array_append(v_gaps, 'catalog description or project_challenges is empty');
  END IF;

  -- Intentional skip: quality goals are project-specific process gating, not authored on the foundation.
  RAISE NOTICE 'Standard Foundation intentionally skips Step 11 quality goals (project_quality_levels / min_quality_goal). Process gating belongs on owning project templates.';

  IF array_length(v_gaps, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Standard Foundation is not content-complete:\n  %', array_to_string(v_gaps, E'\n  ');
  END IF;

  UPDATE public.projects
  SET phases = public.rebuild_phases_json_from_project_phases_internal(v_project_id),
      updated_at = now()
  WHERE id = v_project_id;

  RAISE NOTICE 'Standard Foundation content audit passed for project %', v_project_id;
END
$migration$;

-- END 20260918220900_standard_foundation_content_audit.sql

