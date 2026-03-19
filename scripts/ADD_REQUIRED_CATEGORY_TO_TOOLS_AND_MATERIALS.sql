BEGIN;

ALTER TABLE public.tools
ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.materials
ADD COLUMN IF NOT EXISTS category text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.tools
    WHERE category IS NULL OR btrim(category) = ''
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce required category on public.tools: found rows with NULL/empty category';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.materials
    WHERE category IS NULL OR btrim(category) = ''
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce required category on public.materials: found rows with NULL/empty category';
  END IF;
END
$$;

ALTER TABLE public.tools
ALTER COLUMN category SET NOT NULL;

ALTER TABLE public.materials
ALTER COLUMN category SET NOT NULL;

COMMIT;
