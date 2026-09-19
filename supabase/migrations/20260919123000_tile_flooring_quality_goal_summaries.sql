-- Tile Flooring Installation: rewrite quality goal summaries (kickoff + outcome + process).
-- Ladder aligns with owned Prep / Install / Grout & Finish gating:
--   Good  = core path (no major failures; imperfect edges OK in less-visible areas)
--   Great = + Inspect set tile before cure
--   Professional = + leveling clips, Apply grout sealer, Final finish inspection
-- Tolerances referenced from ANSI A108.02 lippage guidance used in Professional step content.

DO $migration$
DECLARE
  v_project_id uuid;
  v_updated int;
BEGIN
  SELECT p.id INTO v_project_id
  FROM public.projects p
  WHERE lower(btrim(p.name)) = 'tile flooring installation'
    AND p.parent_project_id IS NULL
  ORDER BY p.is_current_version DESC NULLS LAST, p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Tile Flooring Installation root project not found.';
  END IF;

  UPDATE public.project_quality_levels
  SET
    kickoff_summary = 'Bonded, walkable floor with no major failures; imperfect cuts and edges OK in less-visible spots.',
    outcome_summary =
      'Floor is fully bonded, walkable, and free of major failures: no loose or hollow tiles that fail underfoot, no cracked faces from setting, no trip-level lippage, and no open joints that shed grit. The open field may show DIY imperfections. Cut edges and perimeter reveals can be imperfect, especially against walls, cabinets, and other harder-to-see zones.',
    process_summary =
      'Core owned path only across Prep, Install, and Grout & Finish: chosen underlayment, layout, cut, set, cure, pack grout, and wash. Skip formal pre-cure field inspection, leveling-clip systems, mandatory sealing, and the Professional final finish inspection.',
    vs_lower_summary = NULL,
    updated_at = now()
  WHERE project_id = v_project_id
    AND quality_level = 'good';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to update Good quality level (updated=%).', v_updated;
  END IF;

  UPDATE public.project_quality_levels
  SET
    kickoff_summary = 'Clean DIY field across sight lines; pre-cure checks catch lippage, joint width, and hollows.',
    outcome_summary =
      'Field reads as a deliberate DIY install. Lippage and joint width stay inside stated DIY targets across open sight lines, mortar coverage looks intentional on lift checks, and grout joints are tooled clean without heavy haze. Edge cuts are cleaner than Good, but still short of a trade-perfect reveal.',
    process_summary =
      'Core path plus Inspect set tile before cure: verify coverage while setting and walk the field for flatness, lippage, and joint width before the thinset cures so defects are still correctable.',
    vs_lower_summary =
      'Choosing Great instead of Good adds the pre-cure inspection that catches lippage, uneven joints, and hollow spots while they are still fixable. Good still forbids major failures, but can leave those DIY defects in the finished floor, especially at harder-to-see edges.',
    updated_at = now()
  WHERE project_id = v_project_id
    AND quality_level = 'great';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to update Great quality level (updated=%).', v_updated;
  END IF;

  UPDATE public.project_quality_levels
  SET
    kickoff_summary = 'Flawless grout lines and cuts under close inspection; leveling clips, seal, and final QC required.',
    outcome_summary =
      'Near-trade finish under raking light. Grout lines and cut edges look intentional and consistent, including at doorways and other visible transitions. Lippage stays inside the Professional target used in this project (about 1/32 in plus tile warpage for joints under 1/4 in per ANSI A108.02). Grout is sealed where the product requires it, and the floor holds up to close inspection.',
    process_summary =
      'Great path plus Professional-only work: Install leveling clips and verify plane while setting, Apply grout sealer as a required step, and run Final finish inspection against Professional tolerances before calling the floor done.',
    vs_lower_summary =
      'Choosing Professional instead of Great adds leveling clips, mandatory sealing, and a final finish inspection aimed at flawless grout lines and cuts. Great can still look strong for daily use without that extra trade-level edge work.',
    updated_at = now()
  WHERE project_id = v_project_id
    AND quality_level = 'professional';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Expected to update Professional quality level (updated=%).', v_updated;
  END IF;

  -- Refresh frozen run snapshots from catalog copy.
  UPDATE public.project_run_quality_levels prql
  SET
    kickoff_summary = pql.kickoff_summary,
    outcome_summary = pql.outcome_summary,
    process_summary = pql.process_summary,
    vs_lower_summary = pql.vs_lower_summary
  FROM public.project_quality_levels pql
  WHERE prql.source_project_id = pql.project_id
    AND prql.quality_level = pql.quality_level
    AND pql.project_id = v_project_id;

  RAISE NOTICE
    'Tile Flooring Installation quality goal summaries updated for project %',
    v_project_id;
END
$migration$;
