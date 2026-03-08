-- Appliance maintenance templates (category appliances) for Generate Maintenance Plan.
-- Included when user selects Dishwasher, Garbage disposal, or Dryer in the workflow.

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
    'Clean dishwasher interior and filter',
    'Clean the dishwasher interior, spray arms, and filter to remove buildup and maintain performance.',
    'Clean interior, spray arms, and filter monthly or quarterly.',
    '1. Remove bottom rack and check the filter or screen; rinse or clean per manufacturer instructions. 2. Wipe the door gasket and interior. 3. Run an empty cycle with a dishwasher cleaner or a cup of vinegar on the top rack. 4. Clear spray arm holes if clogged.',
    'appliances',
    90,
    2,
    'Clogged filters and spray arms reduce cleaning and can cause odors or pump strain.',
    'A clean dishwasher washes better and lasts longer.',
    'Extends dishwasher life and improves cleaning.'
  ),
  (
    'Inspect dishwasher door seal and connections',
    'Inspect the door gasket and water connections for leaks or wear.',
    'Check door seal and supply/drain connections yearly.',
    '1. Look for cracks or gaps in the door gasket; wipe and close door to confirm a tight seal. 2. Check under the unit and at supply/drain connections for moisture or drips. 3. Tighten connections if needed; replace gasket if damaged. 4. Run a cycle and recheck for leaks.',
    'appliances',
    365,
    2,
    'Leaking gaskets or connections cause water damage and mold.',
    'A good seal and tight connections prevent leaks.',
    'Avoids water damage and mold under or around the dishwasher.'
  )
) AS v(title, description, summary, instructions, category, frequency_days, criticality, risks_of_skipping, benefits_of_maintenance, repair_cost_savings)
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_templates mt
  WHERE lower(trim(mt.title)) = lower(trim(v.title))
);
