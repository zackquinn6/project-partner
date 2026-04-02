-- Step 9 (AI_PROJECT_DEVELOPMENT_REFERENCE.md): project description + project_challenges
-- for root catalog templates (parent_project_id IS NULL).
-- Descriptions: brief work + purpose (typically one sentence). Challenges: one paragraph, 2–3 sentences max.
--
-- After adding a new root template, extend INSERT rows below and keep the guard in sync.
-- List roots: SELECT id, name FROM public.projects WHERE parent_project_id IS NULL ORDER BY name;

CREATE TEMP TABLE step9_project_copy (
  id uuid PRIMARY KEY,
  description text NOT NULL,
  project_challenges text NOT NULL
);

INSERT INTO step9_project_copy (id, description, project_challenges) VALUES
(
  '7ab24fb0-3483-4617-8e40-7aa14cb997a6'::uuid,
  $D_BB$
Measuring and cutting baseboard and interior trim, fitting corners and long runs, and fastening for paint-ready joints to finish room perimeters in bedrooms, halls, and living areas.
$D_BB$,
  $C_BB$
Coping or mitering corners and scribing long runs against wavy walls decide whether joints disappear after paint; fill and sand discipline shows under gloss. Most second-guessing happens at the saw before the first pieces meet the last wall.
$C_BB$
),
(
  'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid,
  $D_CAULK$
Removing failed sealant, prepping joints, and applying and tooling new caulk to seal wet areas and paintable transitions in baths and kitchens.
$D_CAULK$,
  $C_CAULK$
Steady gun speed, tip opening, and tooling before the bead skins are harder than they look; overhead and inside corners amplify fatigue. Skips and heavy beads show under raking light, so the hardest stretch is usually continuous wet-area paths and long finish joints.
$C_CAULK$
),
(
  '0679986c-bb12-4015-b0bd-79810b1671f9'::uuid,
  $D_FAN$
Confirming box rating and wiring, hanging the motor and blades, and balancing so a replacement ceiling fan runs smooth in bedrooms and living spaces.
$D_FAN$,
  $C_FAN$
Working overhead from a ladder while supporting weight and verifying a fan-rated box—not just a light box—stacks risk before blades ever spin. Post-install wobble feels worse than it measures and erodes confidence until balance and hardware are dialed in.
$C_FAN$
),
(
  '15f6ac75-c299-4382-b164-8f52569579e6'::uuid,
  $D_DW$
Isolating water and power, swapping the appliance, and reconnecting drain, supply, and electrical so a new dishwasher levels and seals inside kitchen cabinets.
$D_DW$,
  $C_DW$
High-loop or air-gap routing and kink-free hose path in a shallow cabinet fight most swaps; door-to-surround level while the unit is partly slid in is finicky. The first fill and drain cycle is when compression leaks and door seal issues show.
$C_DW$
),
(
  '3b2a9a3c-4c32-4ac9-8000-fa96755843df'::uuid,
  $D_DRY$
Patching damaged drywall, building feathered compound coats, sanding, and priming so repairs read flat under paint on walls and ceilings.
$D_DRY$,
  $C_DRY$
Feather width and flatness under raking light separate invisible patches from halos; sanding too early or too little decides the outcome before color. Matching existing texture on repairs is easy to get wrong on the first pass.
$C_DRY$
),
(
  '21457545-f56e-4c9e-86f1-cffbbdd88163'::uuid,
  $D_FRAME$
Laying out plates and studs, framing door rough openings, and fastening a non-load-bearing partition square so drywall and doors install true in interior remodels.
$D_FRAME$,
  $C_FRAME$
Transferring plumb and square from a wavy floor to a crowned ceiling makes stud packs and door ROs the choke point; small errors read as bindy doors after rock. Anchor choice into slab or questionable framing is where people pause longest.
$C_FRAME$
),
(
  '92d720c9-9aed-4d26-bf42-fff4227cbefc'::uuid,
  $D_DISP$
Wiring and grounding, mounting the sink flange, locking the disposal body, and aligning drain and dishwasher ports under the kitchen sink.
$D_DISP$,
  $C_DISP$
Twist-locking a heavy motor in a blind cabinet while protecting supplies is awkward; basket strainer and flange seating must be dry before celebration. First-run vibration and weeps at slip joints show up minutes after you thought you were done.
$C_DISP$
),
(
  'ecfe698a-34dc-420f-95b9-27cb9149627b'::uuid,
  $D_DOOR$
Hanging slab or prehung interior doors plumb in the opening, setting hardware, and tuning latch and reveals before casing in bedrooms, baths, and common areas.
$D_DOOR$,
  $C_DOOR$
Shimming out-of-square jambs and splitting error between hinge and strike sides decides whether the latch ever hits center. Casings then advertise every jamb decision; most frustration lands on strike plate alignment after the door “looked fine” dry.
$C_DOOR$
),
(
  '7fdb42ca-4dcb-4a4e-b571-dc9e69be012a'::uuid,
  $D_PAINT$
Prepping surfaces, cutting clean lines, rolling fields with consistent texture, and recoating for even sheen on interior walls and trim.
$D_PAINT$,
  $C_PAINT$
Cut lines and wet-edge timing show under side light; rushing the ceiling line or open field is the usual regret. Dust and holidays in the last coat are pace and environment problems more than bad luck.
$C_PAINT$
),
(
  'bde91c51-62b7-4e5a-8028-ba607211a484'::uuid,
  $D_STAIR$
Replacing or resurfacing treads and risers, tying into landings, and finishing for consistent nosing and a quiet walk on interior stairs.
$D_STAIR$,
  $C_STAIR$
Cumulative tread error across a flight and squeaks returning if structure is skipped drive rework; stain and clearcoat on treads show every sanding scratch. Most anxiety sits on the first three treads where errors compound down the run.
$C_STAIR$
),
(
  'c83fc6ba-44cc-43f0-af25-a7e8841ff4e5'::uuid,
  $D_CAB$
Leveling and securing base and wall cabinets on layout, joining runs, and aligning doors and drawers across a full kitchen installation.
$D_CAB$,
  $C_CAB$
Long runs across wavy walls and floors force shim and scribe choices before the first screw; solo upper installs are physically tense. Door and drawer gaps expose tiny layout mistakes across the whole elevation.
$C_CAB$
),
(
  '628250bf-9c67-4d7f-8da7-422770fa029b'::uuid,
  $D_KSINK$
Removing the old sink and faucet, seating the new bowl in the counter, and reconnecting trap, disposal, and supplies without damaging stone or laminate edges.
$D_KSINK$,
  $C_KSINK$
Freeing the old unit without chipping the counter and rebuilding trap geometry with disposal and dishwasher stubs in limited depth frustrate most swaps. Disturbed stops often weep on first pressure even when “nothing changed.”
$C_KSINK$
),
(
  '2a1d5e16-8ccc-4663-9bb4-ddf353205e77'::uuid,
  $D_LAM$
Preparing flat subfloor and moisture rules, racking and locking or gluing laminate or engineered plank, and finishing transitions for durable floors in living spaces.
$D_LAM$,
  $C_LAM$
Flatness and manufacturer tolerances decide click joints and noise long term; visible stagger mistakes cannot be unseen. Last-row rips and door undercuts are where tearout and height errors show first.
$C_LAM$
),
(
  'ec045268-77a5-4f8b-b32a-93b2c1e7f140'::uuid,
  $D_LIGHT$
Verifying power off and box support, splicing and grounding per manufacturer, and mounting the canopy for a secure fixture replacement in rooms and halls.
$D_LIGHT$,
  $C_LIGHT$
Sorting switched-leg vs hot in older boxes while holding weight overhead is cognitively and physically tense; mistakes are not cosmetic. Canopies that will not seat usually mean pinched conductors or wrong strap geometry.
$C_LIGHT$
),
(
  'f3e9c304-96ab-45a3-90e4-b9f50ea7a7b1'::uuid,
  $D_OUT$
Mapping dead power, replacing devices with correct terminations and box fill, and restoring plates square on tile, plaster, or uneven drywall.
$D_OUT$,
  $C_OUT$
Legacy colors, multi-ways, and shared neutrals defeat assumptions; the tester still hot on the “wrong” breaker stalls progress fast. Thick tile or wavey plaster fights device ears until shims or extenders are part of the plan.
$C_OUT$
),
(
  '97da9cd1-6c86-4043-8ee0-4fee4cf07557'::uuid,
  $D_SL$
Priming the slab, mixing and pouring within working time, spike-rolling, and damming so self-leveler corrects plane for hard-surface installs.
$D_SL$,
  $C_SL$
Short pot life means stalled pours skin into cold joints and ridges; bad prime or contaminated slab causes bond failure later. Weak dams let liquid find the next room—door thresholds are the usual anxiety point.
$C_SL$
),
(
  'f877b674-12a1-4cd7-9f99-5a25a5a3dbe8'::uuid,
  $D_SHIP$
Laying out on studs, installing boards with clean reveals, cutting around outlets, and prepping joints for paint or stain on accent walls in living and sleeping rooms.
$D_SHIP$,
  $C_SHIP$
Wavy framing telegraphs as shadow lines under raking light; outlet and switch cuts on finished faces punish one miscut. The last row at the ceiling is where fatigue and reveal drift show up first.
$C_SHIP$
),
(
  '1cbb89df-5c43-4d0b-9d77-51d5853c1f11'::uuid,
  $D_SHWR$
Isolating water, accessing the valve, replacing trim or cartridge, and pressure-testing without scratching plated finishes in tiled showers.
$D_SHWR$,
  $C_SHWR$
Wall-stack depth versus trim-kit stack surprises mid-job; cartridge orientation and clip retention are easy to mis-seat with water still off. Finish metal scratches from the last turns are permanent and amplify hesitation.
$C_SHWR$
),
(
  'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid,
  $D_FOUND$
Composing shared Kickoff, Planning, Ordering, Closing, and related phases into catalog templates so project runs snapshot consistent foundation workflow alongside project-specific steps.
$D_FOUND$,
  $C_FOUND$
Wrong merge order or duplicated foundation phases breaks author expectations and user runs; tracing process map order against database IDs is the slow, exacting part. Foundation revs that touch many templates raise regression fear until golden projects are rechecked.
$C_FOUND$
),
(
  '533b114c-5c2a-4940-a5e6-551164de596b'::uuid,
  $D_STORM$
Mounting a storm door plumb on entry jambs, setting closer and sweep, and sealing the perimeter without binding the primary door at front and side entries.
$D_STORM$,
  $C_STORM$
Brick and wood jambs rarely present a single plane; shimming the Z-bar until plumb takes patience before closer geometry makes sense. Sweep and strike tuning against the primary door is iterative once you see daylight at a corner.
$C_STORM$
),
(
  '3c45b9e3-1a18-4a7b-bba8-7553b66841f7'::uuid,
  $D_BSPL$
Laying out, setting with thinset, beating for coverage, and grouting a kitchen backsplash with caulked changes of plane and clean cuts at outlets and openings.
$D_BSPL$,
  $C_BSPL$
Outlet extenders, plate stack, and lippage read harshly under cabinet lighting; vertical sets fight gravity if mortar is opened too long. Upper courses and inside corners concentrate both fatigue and visible joint drift.
$C_BSPL$
),
(
  'a118dafe-b290-4c76-932a-7cf580ff9d81'::uuid,
  $D_TDEMO$
Breaking tile bond, controlling dust, removing setting materials, and exposing a sound, flat subfloor for replacement flooring in baths and kitchens.
$D_TDEMO$,
  $C_TDEMO$
Dust and shard control exhaust crews fast; aggressive pry bars punch through underlayment you meant to keep. Haul-out pace and fatigue drive sloppy swings that dent adjacent walls—pace breaks matter more than people expect.
$C_TDEMO$
),
(
  '373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0'::uuid,
  $D_TILE$
Preparing the subfloor, completing a layout, and installing with thinset mortar to create a durable, high-performance flooring material in living rooms, kitchens, and bathrooms.
$D_TILE$,
  $C_TILE$
Flatness and deflection requirements decide whether grout and tile survive; coverage under large format and grout wash timing punish rushed work. Most second-guessing lands on whether prep is good enough before the first full sheets go down.
$C_TILE$
),
(
  '8267c526-036d-4f5c-9f17-2ee1b3d87886'::uuid,
  $D_TOILET$
Shutting water, draining, removing the old toilet and seal, inspecting the flange, setting new sealant, bolting the new bowl, and leak-testing supply and base in bathrooms.
$D_TOILET$,
  $C_TOILET$
True shutoff, lifting without flange or floor damage, and even wax compression without a rocking bowl stack into one tight bathroom sequence; slow supply and base weeps often appear after the first cycles.
$C_TOILET$
),
(
  '8b710391-8f07-42c8-9036-58e1bc233f50'::uuid,
  $D_VAN$
Removing the old vanity and top, setting the new cabinet plumb, and reconnecting drain and supplies with correct slip geometry and splash sealing in bathrooms.
$D_VAN$,
  $C_VAN$
New cabinet depth and bowl projection change trap geometry behind a fixed chase; walls exposed after demo are rarely flat. Disturbed stops weep on first pressurization even when the swap felt straightforward.
$C_VAN$
),
(
  '09eb653f-207b-4491-8ad0-4cd71d221d3f'::uuid,
  $D_WP$
Stripping old wallcovering or hanging new paper with matched seams, repaired and primed substrate, and clean cuts at corners and openings in living spaces.
$D_WP$,
  $C_WP$
Hidden layers and painted-over vinyl change strategy mid-wall; moisture discipline while stripping protects face paper. Pattern match and seam rolling show every eighth-inch error under grazing light.
$C_WP$
),
(
  '570ceb64-858f-4796-8119-d3cbbe20863d'::uuid,
  $D_WIN$
Removing the old sash and frame, setting and shimming the new unit square, integrating flashing with the WRB, insulating gaps, and trimming for drainage and air seal at exterior walls.
$D_WIN$,
  $C_WIN$
Shim strategy on twisted openings and correct flashing order carry long leak risk that does not show until seasons later. Foam and screw sequence can bind operation; latch and diagonal check before trim locks in mistakes.
$C_WIN$
);

UPDATE public.projects AS p
SET
  description = s.description,
  project_challenges = s.project_challenges,
  updated_at = timezone('utc', now())
FROM step9_project_copy AS s
WHERE p.id = s.id;

DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(p.id::text || ' — ' || p.name, E'\n' ORDER BY p.name)
  INTO v_missing
  FROM public.projects AS p
  WHERE p.parent_project_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM step9_project_copy AS s
      WHERE s.id = p.id
    );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      USING MESSAGE = format(
        'Step 9 migration: root template row(s) missing from step9_project_copy. Add id + copy to INSERT, then re-run. Missing:%s%s',
        E'\n',
        v_missing
      );
  END IF;
END $$;
