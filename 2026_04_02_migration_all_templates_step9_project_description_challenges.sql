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
  'f46b9b02-de31-42e0-ab04-5409ed1f21ee'::uuid,
  $DESC_TOILET$
Replace an existing toilet from supply isolation through leak check: confirm water is off, drain the tank and bowl, remove the old fixture and wax seal, inspect the closet flange and floor, set a new seal, align and compress the new bowl on the bolts, reconnect the supply, and verify a stable, leak-free installation before use.
$DESC_TOILET$,
  $CH_TOILET$
Isolating water and draining the bowl and tank is harder than it sounds because stops can weep under pressure and traps still hold water that returns while you work. This is usually the moment people second-guess whether the supply is truly off.

Lifting the old toilet off the flange breaks the wax seal and exposes a heavy, awkward load in tight bathroom clearances; the flange and finish floor are easy to chip. Many DIYers feel a spike of anxiety here about dropping the bowl or damaging the drain connection.

Seating the new bowl evenly on the wax ring so the seal compresses uniformly—without rocking—takes patience and square alignment to the bolts. Doubt about whether it is “sitting right” is very common; most people slow down here until the bowl feels settled.

Snugging closet bolts evenly without over-torquing is technically finicky because porcelain cracks if one side wins the race while the other is still loose. Frustration often shows up as overtightening or repeated loosen-and-retighten cycles.

Reconnecting the supply and running a real leak check (including at the base over time) is where slow drips and mis-seated compression nuts show up. It is normal to recheck after the first flush cycle and a short wait.
$CH_TOILET$
),
(
  'dbd4d8b4-da79-4fc0-b53a-c8caa1768db1'::uuid,
  $DESC_CAULK$
Remove failed sealant, clean and prep the joint, then apply new caulk for wet areas and paintable finish joints. The workflow covers consistent bead geometry, tooling before the material skins, and checks so the seal looks intentional under paint or in shower corners.
$DESC_CAULK$,
  $CH_CAULK$
Stripping old caulk and residue without gouging drywall, tile, or tub edges takes patience; adhesive left behind fights every pass. This is often where people worry the joint will never look “factory smooth” again.

Choosing the right bead opening and keeping steady gun speed and pressure is harder than it looks—too much material lands in one spot and is difficult to hide. Second-guessing the tip angle or stopping mid-run is normal; most people need a short rhythm reset.

Tooling the bead before it skins—especially overhead or in corners—combines timing with even pressure so the profile stays uniform. Working overhead is physically tiring, which makes rushing tempting; slowing down here is typical and helps avoid ridges and voids.

Wet-area beads demand continuous contact along the intended path so water cannot find a bypass; skips at inside corners or transitions are easy to miss until later. A careful line-of-sight trace after tooling catches most gaps before the job is closed out.
$CH_CAULK$
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
