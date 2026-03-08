-- Consolidate "Test smoke detectors" and "Test carbon monoxide detectors" into a single task.
-- Smoke alarms, fire detectors, and CO detectors are tested the same way; one task covers all.

-- 1. Insert consolidated template if it does not exist
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
SELECT
  'Test smoke and CO detectors',
  'Test all smoke alarms (fire detectors) and carbon monoxide detectors so they sound when triggered.',
  'Verify every smoke and CO detector responds correctly.',
  '1. Locate all smoke alarms and CO detectors (often near bedrooms, hallways, and fuel-burning appliances). 2. Press and hold the test button on each until the alarm sounds. 3. Replace batteries or units that do not respond. 4. Test monthly.',
  'safety',
  30,
  3,
  'Non-working smoke or CO detectors delay escape and increase risk of fire injury, death, or carbon monoxide poisoning.',
  'Working detectors provide early warning in a fire and alert to dangerous CO levels.',
  'Avoids fire- and CO-related injury, death, and property damage.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_templates mt
  WHERE lower(trim(mt.title)) = 'test smoke and co detectors'
);

-- 2. Point any user tasks that used the old templates to the consolidated template
UPDATE public.user_maintenance_tasks umt
SET template_id = (
  SELECT id FROM public.maintenance_templates
  WHERE lower(trim(title)) = 'test smoke and co detectors'
  LIMIT 1
)
WHERE template_id IN (
  SELECT id FROM public.maintenance_templates
  WHERE lower(trim(title)) IN ('test smoke detectors', 'test carbon monoxide detectors')
);

-- 3. Remove the duplicate templates
DELETE FROM public.maintenance_templates
WHERE lower(trim(title)) IN ('test smoke detectors', 'test carbon monoxide detectors');
