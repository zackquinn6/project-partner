-- Step 9 (AI_PROJECT_DEVELOPMENT_REFERENCE.md): project description + project_challenges
-- for root catalog templates (parent_project_id IS NULL).
--
-- After adding a new root template, extend INSERT rows below and keep the guard in sync.
-- List roots: SELECT id, name FROM public.projects WHERE parent_project_id IS NULL ORDER BY name;

-- Session-scoped staging (single migration batch on one connection).
CREATE TEMP TABLE step9_project_copy (
  id uuid PRIMARY KEY,
  description text NOT NULL,
  project_challenges text NOT NULL
);

INSERT INTO step9_project_copy (id, description, project_challenges) VALUES
(
  '7ab24fb0-3483-4617-8e40-7aa14cb997a6'::uuid,
  $D_BB$
Install and finish baseboard and interior trim so joints meet cleanly at corners and transitions, fasteners are placed for a stable reveal, and the final profile is ready for paint or stain without obvious gaps or nail show-through.
$D_BB$,
  $C_BB$
Inside and outside corners demand accurate miters or copes; small angle errors open visually after paint. This is when many people start doubting whether their saw or their eye is wrong.

Long runs telegraph wall waviness, so scribing or selective shim work matters more than it looks on a single stick. Frustration often builds when the first pieces looked fine and the last few will not sit flat.

Nail holes and seams need consistent fill and sanding or they read as dimples under gloss paint. Rushing the prep step is normal to want to skip; most people slow down once they see the first coat highlight every flaw.
$C_BB$
),
(
  'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid,
  $D_CAULK$
Remove failed sealant, clean and prep the joint, then apply new caulk for wet areas and paintable finish joints. The workflow covers consistent bead geometry, tooling before the material skins, and checks so the seal looks intentional under paint or in shower corners.
$D_CAULK$,
  $C_CAULK$
Stripping old caulk and residue without gouging drywall, tile, or tub edges takes patience; adhesive left behind fights every pass. This is often where people worry the joint will never look factory smooth again.

Choosing the right bead opening and keeping steady gun speed and pressure is harder than it looks—too much material lands in one spot and is difficult to hide. Second-guessing the tip angle or stopping mid-run is normal; most people need a short rhythm reset.

Tooling the bead before it skins—especially overhead or in corners—combines timing with even pressure so the profile stays uniform. Working overhead is physically tiring, which makes rushing tempting; slowing down here is typical and helps avoid ridges and voids.

Wet-area beads demand continuous contact along the intended path so water cannot find a bypass; skips at inside corners or transitions are easy to miss until later. A careful line-of-sight trace after tooling catches most gaps before the job is closed out.
$C_CAULK$
),
(
  '0679986c-bb12-4015-b0bd-79810b1671f9'::uuid,
  $D_FAN$
Replace or upgrade a ceiling fan on an existing rated box: remove the old fixture, confirm support and wiring, assemble and hang the new fan, set blade balance, and verify stable operation without wobble or pull-chain interference.
$D_FAN$,
  $C_FAN$
Working overhead on a ladder while holding a motor and aligning a downrod taxes balance and reach; the moment the old fan frees from the box is when many people feel a surge of “do not drop this.”

Confirming the outlet box is fan-rated—not just a light box—is a technical gate that is easy to assume away. Doubt here is appropriate; most people pause to read stamps, screws, and manufacturer notes before hanging weight.

Blade tracking and balance show up only at speed; a small wobble feels bigger than it is and shakes confidence. Taking time to tweak blade position and hardware is normal before calling the job done.
$C_FAN$
),
(
  '15f6ac75-c299-4382-b164-8f52569579e6'::uuid,
  $D_DW$
Swap a dishwasher in place: shut off and verify water and power, disconnect lines, slide the old unit out, align the new unit to cabinets and floor, reconnect supply, drain, and power, then level, anchor, and leak-test through a monitored cycle.
$D_DW$,
  $C_DW$
The drain hose path and high loop or air-gap rules are easy to get wrong in the cramped cabinet chase. This is where people often feel boxed in and second-guess whether the hose will kink when the unit slides home.

Leveling front-to-back so the door meets the surround evenly takes patience while the unit is partly slid in. Frustration spikes when the toe-kick or adjuster feet fight you on a floor that is not flat.

The first fill and drain cycle is the emotional checkpoint for leaks at compression fittings and the door seal. It is normal to watch the first run closely and recheck torque after things wet-cycle once.
$C_DW$
),
(
  '3b2a9a3c-4c32-4ac9-8000-fa96755843df'::uuid,
  $D_DRY$
Patch damaged drywall, retape or float seams as needed, and build successive coats so the repair hides flat under raking light before primer and topcoat.
$D_DRY$,
  $C_DRY$
Feathering compound far enough past the patch is technically dull work; stopping too soon leaves a halo that telegraphs after paint. Many DIYers feel impatient here and want to sand too early.

Sanding dust and soft edges make it hard to see true flatness until primer goes on. Doubt about whether the wall is “good enough” is very common at the first coat.

Matching existing texture on repairs—orange peel, knockdown, or hand textures—takes practice and lighting discipline. This is where people often slow down or redo a spot once they see it in daylight.
$C_DRY$
),
(
  '21457545-f56e-4c9e-86f1-cffbbdd88163'::uuid,
  $D_FRAME$
Lay out and build a non-load-bearing partition: sole and top plates, stud layout for doors and intersecting walls, square corners, and fastening to floor and ceiling without assuming structural loads you are not qualified to move.
$D_FRAME$,
  $C_FRAME$
Transferring a straight line from floor to ceiling in older homes fights crown in plates and joists; small bow reads as a crooked doorway later. This is when people start questioning every measurement.

Door rough openings need consistent width and plumb jambs before drywall locks you in. Frustration often shows up as trimming studs repeatedly to “make it fit.”

Fastening to concrete, steel, or questionable subfloor without the right anchors feels sketchy fast. Pausing to verify anchor pull-out and spacing is normal; most people want a second check before sheathing.
$C_FRAME$
),
(
  '92d720c9-9aed-4d26-bf42-fff4227cbefc'::uuid,
  $D_DISP$
Install or replace a garbage disposer under the sink: remove the old flange and mount, wire and ground per manufacturer, mate the sink flange and disposal body, align drain and dishwasher knockouts, and test for leaks and vibration.
$D_DISP$,
  $C_DISP$
Holding the disposal while engaging the twist lock in tight cabinet space is awkward and heavy. This is the moment many people worry about cross-threading or dropping the unit onto supply lines.

Sink flange and putty or gasket seating must be leak-free before you celebrate; small drips hide at the basket strainer. Doubt about whether the flange is truly tight is common.

Vibration can loosen slip joints if supports are wrong; the first run with water and a short grind cycle is emotionally tense. Watching for weeps at every joint for a few minutes after is normal.
$C_DISP$
),
(
  'ecfe698a-34dc-420f-95b9-27cb9149627b'::uuid,
  $D_DOOR$
Replace an interior slab or prehung unit: remove the old door and jamb if needed, set plumb and square in the opening, shim and fasten, set hardware bore and strike alignment, and adjust reveals before casing.
$D_DOOR$,
  $C_DOOR$
Old openings are rarely perfectly plumb or square; shimming strategy matters more than the door quality. People often feel stuck deciding which side of the jamb to “split the error.”

Hinge mortise depth and backset affect swing and latch engagement; a sixteenth shows up as rub or a miss. Frustration builds when the latch misses the plate after everything looked centered dry.

Casing miters at the floor with uneven wall planes telegraph quickly. This is where most folks slow down and sneak test fits before final nails.
$C_DOOR$
),
(
  '7fdb42ca-4dcb-4a4e-b571-dc9e69be012a'::uuid,
  $D_PAINT$
Prepare walls and trim, prime as needed, then apply consistent coats of interior paint with clean cut lines, controlled roller texture, and cure-appropriate recoats for an even finish under room lighting.
$D_PAINT$,
  $C_PAINT$
Cutting crisp lines freehand or with tape is technically slower than rolling open field; bleed and bridging show at eye level. Many DIYers feel pressure to speed up and then regret the ceiling line.

Roller texture and wet-edge timing show as holidays or lap marks under side light. Doubt about whether to add another coat is common right before the room looks “almost good.”

Dust and hair in finish coats feel like bad luck but are environmental control problems. Slowing down on final passes and lighting checks is normal before calling walls done.
$C_PAINT$
),
(
  'bde91c51-62b7-4e5a-8028-ba607211a484'::uuid,
  $D_STAIR$
Reface or resurface existing interior stairs: remove or cover treads and risers as designed, address squeaks and adhesive, install new tread/riser materials, and finish transitions at landings and nosings for safe, uniform rise and run feel.
$D_STAIR$,
  $C_STAIR$
Each tread must land flat and flush with consistent nosing projection; small errors stack across a flight. This is where people start measuring three times after the first tread looks off.

Squeaks return if structure and adhesive strategy are skipped for cosmetics. Frustration peaks when a quiet test walk finds a pop after finish is down.

Stain and clearcoat on treads highlight sanding scratches and drips under window light. Most people slow down on the last coat because mistakes are hard to hide on high-wear surfaces.
$C_STAIR$
),
(
  'c83fc6ba-44cc-43f0-af25-a7e8841ff4e5'::uuid,
  $D_CAB$
Install kitchen cabinets on layout lines: locate high points, set and level bases, hang uppers with secure blocking or studs, join runs, and align doors and drawer fronts before final hardware and panels.
$D_CAB$,
  $C_CAB$
Finding true level across long runs when walls and floors diverge forces selective shimming and scribe decisions. Many installers feel mentally tired before the first cabinet is screwed home.

Upper cabinet lift and temporary support in solo work is physically awkward; the moment the box clears the ledger is high anxiety for most people.

Door and drawer gap consistency exposes tiny placement errors across the whole kitchen. This is where people tend to micro-adjust for a long time—normal before declaring alignment done.
$C_CAB$
),
(
  '628250bf-9c67-4d7f-8da7-422770fa029b'::uuid,
  $D_KSINK$
Replace a kitchen sink and faucet in the countertop: disconnect supplies and disposal ties, cut or free the old sink, seat and clamp the new bowl, reconnect drain and trap, and leak-test hot, cold, and sprayer paths.
$D_KSINK$,
  $C_KSINK$
Old silicone and clips fight removal without damaging laminate or stone edges. This is when people worry they will chip the counter before the new sink ever drops in.

Sink deck height, reveal, and clip torque must balance seal without distorting lightweight stainless. Doubt about whether the gasket is “squished enough” is common.

Reassembling trap alignment with disposal and dishwasher tailpieces is tight-quarters plumbing Tetris. Frustration rises when the trap hits the back wall or disposal body; most people need a couple of dry rotations to find a happy geometry.
$C_KSINK$
),
(
  '2a1d5e16-8ccc-4663-9bb4-ddf353205e77'::uuid,
  $D_LAM$
Install floating or glue-down laminate or engineered plank: prep flatness and moisture, lay underlayment if required, rack planks for blend, cut and lock or adhere rows, and finish transitions, moldings, and expansion gaps at perimeters.
$D_LAM$,
  $C_LAM$
Flatness requirements are unforgiving; low spots telegraph as bounce or joint click over time. Many DIYers feel discouraged when a long level shows waves they did not notice bare subfloor.

Staggering end joints and avoiding H-patterns is cognitively tedious on the first few rows. This is where rushing creates a pattern mistake that cannot be unseen.

Last-row rip cuts and door undercuts need patience; tearout on fragile faces shows at transitions. Most people slow down here because mistakes are visible at the threshold everyone crosses.
$C_LAM$
),
(
  'ec045268-77a5-4f8b-b32a-93b2c1e7f140'::uuid,
  $D_LIGHT$
Replace a light fixture on an existing circuit: verify power off, confirm box support for weight, connect conductors and ground per manufacturer, mount canopy without pinching wire, and restore power for functional and secure installation.
$D_LIGHT$,
  $C_LIGHT$
Identifying switched-leg vs always-hot in older boxes is cognitively tense even with a tester. This is the step where people pause and recheck because mistakes are not cosmetic.

Holding a heavy fixture while making up splices overhead is physically awkward. Anxiety spikes when wire nuts feel tight but the canopy will not seat.

Grounding path and strap screws into plastic vs metal boxes trip confidence if the house has mixed eras. It is normal to read the box stamp and instructions twice before energizing.
$C_LIGHT$
),
(
  'f3e9c304-96ab-45a3-90e4-b9f50ea7a7b1'::uuid,
  $D_OUT$
Replace receptacles or switches: map and verify dead power, note wire roles in older wiring, install devices with correct termination torque and box fill, install plates square, and test polarity and GFCI/AFCI behavior as applicable.
$D_OUT$,
  $C_OUT$
Back-stabbed or brittle old devices and aluminum-era wiring demand explicit identification before swap. Many DIYers feel doubt the moment wire colors do not match textbook diagrams.

Multi-gang boxes with shared neutrals or switched halves confuse even careful workers. Frustration builds when the tester still shows hot after the breaker you thought was right.

Device depth and ears against thick tile or wavy plaster fight flush plates. Most people slow down with shims or jumbo plates once the first screw strips or the yoke bends.
$C_OUT$
),
(
  '97da9cd1-6c86-4043-8ee0-4fee4cf07557'::uuid,
  $D_SL$
Pour and spread self-leveling underlayment to correct subfloor plane: prime per system data, mix at ratio and time, pour to working thickness, spike-roll to release air, and protect the cure from drafts, traffic, and premature coverings.
$D_SL$,
  $C_SL$
Working time is short; a stalled pour skins before you expected and leaves a cold joint or ridge. This is when people feel rushed and wish they had mixed smaller batches.

Priming wrong or on contaminated slabs causes bond failure that shows only later. Doubt about whether the primer is “tacky enough” is common—most slow down to read the bucket again.

Edge dams and terminations must be true or liquid finds the low path into rooms you did not mean to treat. Anxiety runs high at doorways until barriers prove tight.
$C_SL$
),
(
  'f877b674-12a1-4cd7-9f99-5a25a5a3dbe8'::uuid,
  $D_SHIP$
Install shiplap or accent wall boards on layout: find studs, manage reveals and outlets, cope inside corners if needed, nail or screw with consistent set, and prep joints for paint or stain without telegraphing every board edge.
$D_SHIP$,
  $C_SHIP$
Walls that are not flat make board edges read as a roller coaster under raking light. Many DIYers question whether to scribe, shim, or accept shadow lines.

Outlet and switch box extenders and cutouts multiply chances for chip-out on painted faces. Frustration spikes when one miscut wastes a visible board.

Outside corners and last pieces need tight thinking about expansion and seasonal movement. Most people slow down on the final row because mistakes face the bed or sofa.
$C_SHIP$
),
(
  '1cbb89df-5c43-4d0b-9d77-51d5853c1f11'::uuid,
  $D_SHWR$
Replace shower trim or valve-related components per scope: isolate water, access the valve, swap trim or cartridge as designed, restore seal paths, and pressure-test without overtightening finishes that scratch or crack.
$D_SHWR$,
  $C_SHWR$
Deep-set valves and odd manufacturer stacks make “universal” trim kits lie. This is when people feel tricked by the wall depth they cannot see until the escutcheon is short.

Cartridge orientation and clip retention are easy to mis-seat while water is still off. Doubt about whether the handle will pull out the cartridge on first use is common.

Finish metal scratches from channel locks or grit show permanently. Most folks slow down on the last quarter-turn and still recheck for weeps at the plate.
$C_SHWR$
),
(
  'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid,
  $D_FOUND$
Standard Foundation bundles reusable phases and steps—Kickoff, Planning, Ordering, Closing, and related shared segments—that merge with project-specific workflow content so authors do not rebuild the same scaffolding for every template.
$D_FOUND$,
  $C_FOUND$
Authors must understand which foundation segments attach to a given catalog project without duplicating user-facing steps. The technical friction is mapping IDs and order so runs snapshot cleanly in the database.

Merge mistakes read as missing phases or doubled kickoff in the app, which creates quiet confusion for builders and testers. It is normal to slow down and trace phase order against the process map.

Keeping foundation copy aligned when the library revs means touching many templates; the emotional drag is fear of regressions. Most teams batch-verify a few golden projects after each foundation change.
$C_FOUND$
),
(
  '533b114c-5c2a-4940-a5e6-551164de596b'::uuid,
  $D_STORM$
Install a storm door on an existing entry: verify jamb square and hinge side, set Z-bar or mounting kit plumb, manage sweep and closer geometry, and seal perimeter without binding the primary door operation.
$D_STORM$,
  $C_STORM$
Brick or wood jambs rarely offer a square plane across the full height; shims and selective plane reads matter. Many DIYers feel the first hang is “close enough” until the closer fights the latch.

Closer speed and bracket placement affect slam risk and child safety. Doubt about whether the door will hold open without drifting is common on windy tests.

Perimeter weatherstrip compression vs primary door swing is a narrow window. Most people adjust sweeps and strikes iteratively after seeing daylight at the bottom corner.
$C_STORM$
),
(
  '3c45b9e3-1a18-4a7b-bba8-7553b66841f7'::uuid,
  $D_BSPL$
Set tile on a kitchen backsplash: layout to minimize thin slivers, cut around outlets and windows, spread mortar consistently, beat in for coverage, grout and caulk changes of plane, and seal natural stone if specified.
$D_BSPL$,
  $C_BSPL$
Outlet extenders and plate fit against tile thickness bite first-timers. This is where people realize their cuts around boxes were optimistic.

Small format tiles forgive less lippage under undercabinet raking light. Frustration builds when a few high corners read louder than the field.

Vertical surfaces mean mortar and gravity fight you on the upper courses. Most DIYers slow down on the last row because arms tire and joints open when you rush.
$C_BSPL$
),
(
  'a118dafe-b290-4c76-932a-7cf580ff9d81'::uuid,
  $D_TDEMO$
Remove existing floor tile and setting bed to expose a workable subfloor: manage dust, break bond without destroying structure, strip thinset or mortar, and flat-patch or prep for the next system per plan.
$D_TDEMO$,
  $C_TDEMO$
Dust and shard control is physically punishing; the room gets slippery fast. Many people feel overwhelmed when the first few feet take longer than the whole day they imagined.

Underlayment damage from aggressive pry bars shows up as extra cost if you punch through. Doubt about whether to save vs replace plywood is common at spongy spots.

Weight and haul-out trips drain stamina; fatigue drives rushed swings that dent walls. It is normal to pace breaks so precision comes back for the last quarter of the room.
$C_TDEMO$
),
(
  '373adcbf-0a8c-42e9-9bcb-b135c8ddbfd0'::uuid,
  $D_TILE$
Install floor tile on a prepared substrate: layout, mortar mixing and open time discipline, trowel notch selection, beat-in for coverage, maintain joints and lippage, grout, and cure before traffic and sealing if required.
$D_TILE$,
  $C_TILE$
Flatness and deflection requirements are the hidden technical gate; ignoring them shows as cracked grout later. This is where many DIYers wish they had spent more time on prep.

Large-format coverage checks are humbling; voids under tile are confidence killers once you know to look. Doubt spikes on the first few full sheets.

Grout timing and washing passes stain porous tile if you blink. Most people slow down on cleanup because haze removal is slower than setting was.
$C_TILE$
),
(
  '8267c526-036d-4f5c-9f17-2ee1b3d87886'::uuid,
  $D_TOILET$
Replace an existing toilet from supply isolation through leak check: confirm water is off, drain the tank and bowl, remove the old fixture and wax seal, inspect the closet flange and floor, set a new seal, align and compress the new bowl on the bolts, reconnect the supply, and verify a stable, leak-free installation before use.
$D_TOILET$,
  $C_TOILET$
Isolating water and draining the bowl and tank is harder than it sounds because stops can weep under pressure and traps still hold water that returns while you work. This is usually the moment people second-guess whether the supply is truly off.

Lifting the old toilet off the flange breaks the wax seal and exposes a heavy, awkward load in tight bathroom clearances; the flange and finish floor are easy to chip. Many DIYers feel a spike of anxiety here about dropping the bowl or damaging the drain connection.

Seating the new bowl evenly on the wax ring so the seal compresses uniformly—without rocking—takes patience and square alignment to the bolts. Doubt about whether it is sitting right is very common; most people slow down here until the bowl feels settled.

Snugging closet bolts evenly without over-torquing is technically finicky because porcelain cracks if one side wins the race while the other is still loose. Frustration often shows up as overtightening or repeated loosen-and-retighten cycles.

Reconnecting the supply and running a real leak check (including at the base over time) is where slow drips and mis-seated compression nuts show up. It is normal to recheck after the first flush cycle and a short wait.
$C_TOILET$
),
(
  '8b710391-8f07-42c8-9036-58e1bc233f50'::uuid,
  $D_VAN$
Replace a bathroom vanity: disconnect supply and drain, remove the top and cabinet, address wall and floor flatness, set the new unit plumb, reconnect plumbing with correct slip joint geometry, and seal top and splash interfaces.
$D_VAN$,
  $C_VAN$
Drain trap geometry often changes with cabinet depth and sink bowl projection; the new P-trap may not land where the old one did. This is when people feel boxed in behind the cabinet.

Walls behind old vanities hide surprises—tile lines, paint ridges, or missing drywall. Frustration jumps when the new splash does not sit flat without scribe or filler.

Supply stops that have not moved in years weep when disturbed. Most DIYers slow down on first pressurization because a slow drip at a compression nut is easy to miss until it stains the cabinet.
$C_VAN$
),
(
  '09eb653f-207b-4491-8ad0-4cd71d221d3f'::uuid,
  $D_WP$
Remove old wallpaper or hang new wallcovering: test layers and adhesives, score and steam or strip systematically, skim and prime as needed, or reverse-hang new paper with matched seams and clean cuts at corners and openings.
$D_WP$,
  $C_WP$
Old vinyl or painted-over paper hides additional layers that change the strip strategy mid-wall. Many people feel defeated when one corner peels fast and the rest fights every inch.

Steam and water discipline matters; oversaturation damages drywall face paper. Doubt about whether to repair or skim the wall is common once fuzzing appears.

Pattern match and seam rolling on hangs show every eighth-inch error under grazing light. Most DIYers slow down at inside corners because shortcuts read as gaps the same day.
$C_WP$
),
(
  '570ceb64-858f-4796-8119-d3cbbe20863d'::uuid,
  $D_WIN$
Replace a window unit in an existing opening: free sash and frame, verify opening square and structural needs per manufacturer, set, shim, square, fasten, flash and integrate WRB layers, insulate gaps, and trim interior and exterior for drainage and air seal.
$D_WIN$,
  $C_WIN$
Rough openings out of square force selective shim packs that change reveal and operation feel. This is where people start questioning whether the window is bad or the house is.

Flashing sequence mistakes are wet-wall failures that show seasons later. Anxiety runs high at the sill pan and head flashing laps because the stakes feel invisible until the first storm.

Foam and backer rod choices affect bow and bind in vinyl or wood units. Most installers pause before final screws to check diagonal operation and latch engagement.
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
