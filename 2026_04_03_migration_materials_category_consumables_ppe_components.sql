-- Normalize materials.category to: Consumables | PPE | Components
-- Replaces legacy values (Consumable, Other, Plumbing, Job site, etc.)

ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_category_chk;

UPDATE public.materials
SET category = 'Consumables'
WHERE category IN ('Consumable', 'Other', 'Job site');

UPDATE public.materials
SET category = 'Components'
WHERE category IS NOT NULL
  AND category NOT IN ('PPE', 'Consumables', 'Components');

UPDATE public.materials
SET category = 'Consumables'
WHERE category IS NULL;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_category_chk
  CHECK (category IN ('Consumables', 'PPE', 'Components'));
