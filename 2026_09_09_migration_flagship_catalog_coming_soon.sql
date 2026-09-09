-- Wave 0: Focus the catalog on flagship families (tile, painting, flooring, carpentry).
-- Everything else becomes a Coming Soon teaser (visibility_status = 'coming-soon').
-- Dust Control stays Coming Soon as a catalog card; it remains usable when linked/incorporated.
--
-- Flagship (kept startable when published/beta):
--   Tile: tile flooring*, tile demo*, tile demolition*
--   Painting: interior painting*, interior paint*, interior wood staining*
--   Flooring: self-leveler*, subfloor*
--   Carpentry: baseboard*, door%trim%
--
-- Apply in Supabase SQL Editor (repo root migration convention).

DO $$
DECLARE
  v_excl CONSTANT uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'd82dff80-e8ac-4511-be46-3d0e64bb5fc5'::uuid
  ];
  v_flagship integer;
  v_soon integer;
BEGIN
  -- Ensure flagship templates are catalog-visible (not coming-soon / not hidden)
  UPDATE public.projects p
  SET
    visibility_status = 'default',
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND coalesce(p.visibility_status, 'default') IN ('coming-soon', 'hidden', 'default')
    AND (
      lower(btrim(p.name)) LIKE 'tile flooring%'
      OR lower(btrim(p.name)) LIKE 'tile demo%'
      OR lower(btrim(p.name)) LIKE 'tile demolition%'
      OR lower(btrim(p.name)) LIKE 'interior painting%'
      OR lower(btrim(p.name)) LIKE 'interior paint%'
      OR lower(btrim(p.name)) LIKE 'interior wood staining%'
      OR lower(btrim(p.name)) LIKE 'self-leveler%'
      OR lower(btrim(p.name)) LIKE 'self leveler%'
      OR lower(btrim(p.name)) LIKE 'subfloor%'
      OR lower(btrim(p.name)) LIKE 'baseboard%'
      OR (
        lower(btrim(p.name)) LIKE 'door%'
        AND lower(btrim(p.name)) LIKE '%trim%'
      )
    );
  GET DIAGNOSTICS v_flagship = ROW_COUNT;
  RAISE NOTICE 'Flagship catalog visibility set to default: % rows', v_flagship;

  -- Non-flagship DIY templates → Coming Soon teaser
  UPDATE public.projects p
  SET
    visibility_status = 'coming-soon',
    updated_at = now()
  WHERE p.id <> ALL (v_excl)
    AND (p.is_standard IS DISTINCT FROM true)
    AND coalesce(p.visibility_status, 'default') <> 'hidden'
    AND NOT (
      lower(btrim(p.name)) LIKE 'tile flooring%'
      OR lower(btrim(p.name)) LIKE 'tile demo%'
      OR lower(btrim(p.name)) LIKE 'tile demolition%'
      OR lower(btrim(p.name)) LIKE 'interior painting%'
      OR lower(btrim(p.name)) LIKE 'interior paint%'
      OR lower(btrim(p.name)) LIKE 'interior wood staining%'
      OR lower(btrim(p.name)) LIKE 'self-leveler%'
      OR lower(btrim(p.name)) LIKE 'self leveler%'
      OR lower(btrim(p.name)) LIKE 'subfloor%'
      OR lower(btrim(p.name)) LIKE 'baseboard%'
      OR (
        lower(btrim(p.name)) LIKE 'door%'
        AND lower(btrim(p.name)) LIKE '%trim%'
      )
    );
  GET DIAGNOSTICS v_soon = ROW_COUNT;
  RAISE NOTICE 'Non-flagship catalog set to coming-soon: % rows', v_soon;
END $$;
