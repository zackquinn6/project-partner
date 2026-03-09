-- RLS and ownership policies for homes and home_details.
-- Goal: users can only see and modify homes they own, and only see/modify home_details for their own homes.

-- 1. homes: enable RLS and enforce auth.uid() = user_id for all operations
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies (defensive; there may be none)
DROP POLICY IF EXISTS "Users can read own homes" ON public.homes;
DROP POLICY IF EXISTS "Users can insert own homes" ON public.homes;
DROP POLICY IF EXISTS "Users can update own homes" ON public.homes;
DROP POLICY IF EXISTS "Users can delete own homes" ON public.homes;

-- SELECT: only owner can read a home
CREATE POLICY "Users can read own homes"
  ON public.homes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: users may create homes only for themselves
CREATE POLICY "Users can insert own homes"
  ON public.homes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: only owner can update; updates must keep ownership consistent
CREATE POLICY "Users can update own homes"
  ON public.homes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: only owner can delete their home
CREATE POLICY "Users can delete own homes"
  ON public.homes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 2. home_details: link to homes and enforce same ownership via join

-- Add FK home_details.home_id -> homes.id if it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'home_details_home_id_fkey'
      AND conrelid = 'public.home_details'::regclass
  ) THEN
    ALTER TABLE public.home_details
      ADD CONSTRAINT home_details_home_id_fkey
      FOREIGN KEY (home_id)
      REFERENCES public.homes(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE public.home_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own home_details" ON public.home_details;
DROP POLICY IF EXISTS "Users can insert own home_details" ON public.home_details;
DROP POLICY IF EXISTS "Users can update own home_details" ON public.home_details;
DROP POLICY IF EXISTS "Users can delete own home_details" ON public.home_details;

-- Helper ownership check (inlined in policies): a row belongs to the user
-- when its home_id points at a home whose user_id = auth.uid().

CREATE POLICY "Users can read own home_details"
  ON public.home_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.homes h
      WHERE h.id = home_details.home_id
        AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own home_details"
  ON public.home_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.homes h
      WHERE h.id = home_details.home_id
        AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own home_details"
  ON public.home_details
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.homes h
      WHERE h.id = home_details.home_id
        AND h.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.homes h
      WHERE h.id = home_details.home_id
        AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own home_details"
  ON public.home_details
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.homes h
      WHERE h.id = home_details.home_id
        AND h.user_id = auth.uid()
    )
  );

