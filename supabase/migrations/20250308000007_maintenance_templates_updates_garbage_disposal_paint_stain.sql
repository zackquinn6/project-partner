-- Maintenance templates updates:
-- a) Add \"Sharpen garbage disposal\" (low criticality, 6-month cadence).
-- b) Rename existing \"Flush water heater\" task to \"Flush water heater tank\".
-- c) Add \"Paint home exterior - 5yr cycle\".
-- d) Add \"Stain exterior wood - 5yr cycle\".
-- e) Rename all task titles that start with \"Inspect\" to start with \"Check\" instead.

-- a) Sharpen garbage disposal (separate from monthly cleaning).
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
    'Sharpen garbage disposal',
    'Use ice and coarse salt to keep the garbage disposal grinding edges effective and reduce strain on the motor.',
    'Run ice and coarse salt through the disposal to keep the grinding edges sharp and the unit running smoothly.',
    '1. Do not put hands in the disposal. 2. Fill an ice cube tray and freeze plain water. 3. Pour a generous handful of ice cubes into the disposal. 4. Add a small handful of coarse salt (such as rock salt or kosher salt). 5. Run cold water and then run the disposal until the ice is fully ground. 6. Flush with cold water for 15–30 seconds.',
    'interior',
    182,
    1,
    'A dull disposal can struggle to grind food, jam more easily, and put extra load on the motor, leading to clogs and earlier failure.',
    'Helps the disposal grind more effectively so food particles break down faster and clogs are less likely.',
    'Can reduce the chance of disposal jams and plumber visits, and may extend disposal life.'
  )
) AS v(title, description, summary, instructions, category, frequency_days, criticality, risks_of_skipping, benefits_of_maintenance, repair_cost_savings)
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_templates mt
  WHERE lower(trim(mt.title)) = lower(trim(v.title))
);


-- b) Rename existing \"Flush water heater\" to the clearer \"Flush water heater tank\".
UPDATE public.maintenance_templates
SET title = 'Flush water heater tank'
WHERE lower(trim(title)) = 'flush water heater';


-- c) Paint home exterior - 5yr cycle.
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
    'Paint home exterior - 5yr cycle',
    'Repaint the home''s exterior (siding and trim) on a regular cycle to protect against moisture, sun, and weather damage.',
    'Repaint exterior siding and trim about every five years (or per manufacturer/contractor guidance) to maintain protection and appearance.',
    '1. Inspect siding and trim for peeling, cracking, or bare wood. 2. Wash and scrape loose or flaking paint. 3. Repair any damaged wood or trim. 4. Prime bare or repaired areas. 5. Apply exterior-grade paint per manufacturer instructions, typically two coats. 6. Check caulking around joints and seams and refresh as needed.',
    'exterior',
    1825,
    2,
    'Paint that has failed or worn away allows UV and moisture to reach siding and trim, increasing the risk of rot, swelling, and expensive repairs.',
    'Fresh exterior paint renews the weather barrier, improves curb appeal, and can extend the life of siding and trim.',
    'Regular repainting can delay or avoid costly siding and trim replacement and reduce moisture-related repairs.'
  )
) AS v(title, description, summary, instructions, category, frequency_days, criticality, risks_of_skipping, benefits_of_maintenance, repair_cost_savings)
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_templates mt
  WHERE lower(trim(mt.title)) = lower(trim(v.title))
);


-- d) Stain exterior wood - 5yr cycle (e.g., exposed wood siding or trim separate from decks).
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
    'Stain exterior wood - 5yr cycle',
    'Refresh stain on exposed exterior wood siding, trim, or architectural details to protect against moisture and UV damage.',
    'Clean and restain exposed exterior wood every few years to keep it sealed against weather and looking its best.',
    '1. Identify exposed exterior wood that is stained rather than painted (e.g., cedar siding, trim, beams). 2. Clean surfaces with an appropriate exterior wood cleaner; rinse and let dry fully. 3. Lightly sand any rough or peeling areas as needed. 4. Apply exterior-grade stain or stain/sealer per manufacturer instructions. 5. Allow to dry/cure fully before heavy exposure to rain or use.',
    'exterior',
    1825,
    2,
    'Unprotected exterior wood can absorb moisture, crack, warp, or rot, leading to expensive repairs or replacement.',
    'Fresh stain helps shed water, reduces UV damage, and keeps exterior wood attractive longer.',
    'Regular staining can significantly extend the life of exterior wood elements, delaying replacement and structural repairs.'
  )
) AS v(title, description, summary, instructions, category, frequency_days, criticality, risks_of_skipping, benefits_of_maintenance, repair_cost_savings)
WHERE NOT EXISTS (
  SELECT 1 FROM public.maintenance_templates mt
  WHERE lower(trim(mt.title)) = lower(trim(v.title))
);


-- e) Rename titles that start with \"Inspect \" to use \"Check \" instead (e.g., \"Inspect roof for damage\" -> \"Check roof for damage\").
UPDATE public.maintenance_templates
SET title = regexp_replace(title, '^Inspect\\s+', 'Check ')
WHERE title ~ '^Inspect\\s+';

