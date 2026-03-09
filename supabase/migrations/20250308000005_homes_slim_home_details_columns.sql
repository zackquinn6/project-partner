-- Slim homes to: id, user_id, name, notes, is_primary, photos, created_at, updated_at.
-- Add ZIP_code to homes for maintenance plan (single source for selected home's ZIP).
-- Move address, city, state, home_type, build_year, home_ownership, purchase_date to home_details.

-- 1. Ensure home_details has columns we're moving from homes
ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS build_year text;
ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS home_ownership text;
ALTER TABLE public.home_details
  ADD COLUMN IF NOT EXISTS purchase_date text;

-- 2. Add ZIP_code to homes (single path for maintenance plan ZIP from selected home)
ALTER TABLE public.homes
  ADD COLUMN IF NOT EXISTS "ZIP_code" text;
COMMENT ON COLUMN public.homes."ZIP_code" IS 'ZIP code for the home; used for climate region in maintenance plan.';

-- 3. Migrate data from homes to home_details (only when homes still has these columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'homes' AND column_name = 'address') THEN
    UPDATE public.home_details hd
    SET
      address = h.address,
      city = h.city,
      state = h.state,
      build_year = h.build_year,
      home_ownership = h.home_ownership,
      purchase_date = h.purchase_date,
      home_type = COALESCE(h.home_type, hd.home_type)
    FROM public.homes h
    WHERE hd.home_id = h.id;

    INSERT INTO public.home_details (home_id, address, city, state, home_type, build_year, home_ownership, purchase_date)
    SELECT h.id, h.address, h.city, h.state, h.home_type, h.build_year, h.home_ownership, h.purchase_date
    FROM public.homes h
    WHERE NOT EXISTS (SELECT 1 FROM public.home_details hd2 WHERE hd2.home_id = h.id);
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- 4. Drop moved columns from homes
ALTER TABLE public.homes DROP COLUMN IF EXISTS address;
ALTER TABLE public.homes DROP COLUMN IF EXISTS city;
ALTER TABLE public.homes DROP COLUMN IF EXISTS state;
ALTER TABLE public.homes DROP COLUMN IF EXISTS home_type;
ALTER TABLE public.homes DROP COLUMN IF EXISTS build_year;
ALTER TABLE public.homes DROP COLUMN IF EXISTS home_ownership;
ALTER TABLE public.homes DROP COLUMN IF EXISTS purchase_date;
