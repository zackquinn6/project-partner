-- Rename maintenance template titles that contain slash characters.
-- Slash inside Postgres string literals is valid, but some SQL editors
-- mishandle slash and can end up executing a fragment that treats a later
-- token like "battery" as a relation (42P01).
-- This file intentionally contains no "/" characters.

UPDATE public.maintenance_templates
SET title = 'Test UPS and network battery backup', updated_at = now()
WHERE title ILIKE 'Test UPS % network battery backup';

UPDATE public.maintenance_templates
SET title = 'Winterize or open pool', updated_at = now()
WHERE title ILIKE 'Winterize % open pool';

UPDATE public.maintenance_templates
SET title = 'Clean camera and doorbell lenses and check night vision', updated_at = now()
WHERE title ILIKE 'Clean camera%doorbell lenses and check night vision';

UPDATE public.maintenance_templates
SET title = 'Replace smoke and CO alarm units (10-year life)', updated_at = now()
WHERE title ILIKE 'Replace smoke%CO alarm units (10-year life)';

UPDATE public.maintenance_templates
SET title = 'Check fridge and freezer water filter', updated_at = now()
WHERE title ILIKE 'Check fridge%freezer water filter';

UPDATE public.maintenance_templates
SET title = 'Verify garage door opener remote and keypad batteries', updated_at = now()
WHERE title ILIKE 'Verify garage door opener remote%keypad batteries';

UPDATE public.maintenance_templates
SET title = 'Replace smoke and CO batteries', updated_at = now()
WHERE title ILIKE 'Replace smoke%CO batteries'
  AND title NOT ILIKE '%alarm units%';

UPDATE public.user_maintenance_tasks
SET title = 'Test UPS and network battery backup', updated_at = now()
WHERE title ILIKE 'Test UPS % network battery backup';

UPDATE public.user_maintenance_tasks
SET title = 'Winterize or open pool', updated_at = now()
WHERE title ILIKE 'Winterize % open pool';

UPDATE public.user_maintenance_tasks
SET title = 'Clean camera and doorbell lenses and check night vision', updated_at = now()
WHERE title ILIKE 'Clean camera%doorbell lenses and check night vision';

UPDATE public.user_maintenance_tasks
SET title = 'Replace smoke and CO alarm units (10-year life)', updated_at = now()
WHERE title ILIKE 'Replace smoke%CO alarm units (10-year life)';

UPDATE public.user_maintenance_tasks
SET title = 'Check fridge and freezer water filter', updated_at = now()
WHERE title ILIKE 'Check fridge%freezer water filter';

UPDATE public.user_maintenance_tasks
SET title = 'Verify garage door opener remote and keypad batteries', updated_at = now()
WHERE title ILIKE 'Verify garage door opener remote%keypad batteries';

UPDATE public.user_maintenance_tasks
SET title = 'Replace smoke and CO batteries', updated_at = now()
WHERE title ILIKE 'Replace smoke%CO batteries'
  AND title NOT ILIKE '%alarm units%';
