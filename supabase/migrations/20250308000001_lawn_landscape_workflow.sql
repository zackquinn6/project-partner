-- Lawn & landscape maintenance plan workflow: templates and home_details columns.
-- Templates: Leaf cleanup (low), Flush lawn sprinkler irrigation (high). Clean gutters remains in exterior.
-- home_details: lawn_landscape_choice, sprinkler_system for workflow persistence.

-- Landscaping templates (category landscaping)
INSERT INTO public.maintenance_templates (
  title,
  description,
  summary,
  instructions,
  category,
  frequency_days,
  criticality,
  risks_of_skipping,
  benefits_of_maintenance,
  repair_cost_savings
)
SELECT v.title, v.description, v.summary, v.instructions, v.category, v.frequency_days, v.criticality, v.risks_of_skipping, v.benefits_of_maintenance, v.repair_cost_savings
FROM (VALUES
  (
    'Leaf cleanup',
    'Remove leaves and debris from lawn, beds, and gutters to prevent matting and drainage issues.',
    'Clear leaves from yard and planting beds seasonally.',
    '1. Rake or blow leaves from lawn and beds. 2. Compost or dispose of leaves. 3. Clear roof and gutter areas if needed. 4. Repeat as needed in fall and spring.',
    'landscaping',
    90,
    1,
    'Matted leaves smother grass and can cause mold; clogged drainage leads to water issues.',
    'Clean yard and beds support healthy turf and drainage.',
    'Reduces lawn disease and drainage problems.'
  ),
  (
    'Flush lawn sprinkler irrigation system',
    'Flush the lawn sprinkler or irrigation system to clear sediment and ensure even water distribution.',
    'Flush irrigation lines and check heads annually.',
    '1. Turn off water to the system. 2. Open manual drain valves or use blow-out per manufacturer instructions. 3. Run each zone briefly to flush debris. 4. Check and clean spray heads; replace broken ones. 5. Restore water and test each zone.',
    'landscaping',
    365,
    3,
    'Unflushed systems develop clogs, uneven coverage, and can damage pumps or valves.',
    'A flushed system delivers even water and extends equipment life.',
    'Prevents clogged heads and pump damage; ensures even lawn coverage.'
  )
) AS v(title, description, summary, instructions, category, frequency_days, criticality, risks_of_skipping, benefits_of_maintenance, repair_cost_savings)
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_templates mt
  WHERE lower(trim(mt.title)) = lower(trim(v.title))
);

-- home_details: lawn & landscape choices for plan generator
ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS lawn_landscape_choice text;

ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS sprinkler_system boolean;

COMMENT ON COLUMN public.home_details.lawn_landscape_choice IS 'Lawn & landscape step: yes, not_important, or no_lawn.';
COMMENT ON COLUMN public.home_details.sprinkler_system IS 'Whether the home has a sprinkler/irrigation system (for maintenance plan).';
