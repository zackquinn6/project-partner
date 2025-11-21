-- Create contractors table
-- Contractors are professionals (skill level = Professional) that can be assigned to phases
-- Stored at user level for reuse across projects

CREATE TABLE IF NOT EXISTS public.user_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  specialty TEXT, -- e.g., "Plumbing", "Electrical", "Flooring"
  contact_email TEXT,
  contact_phone TEXT,
  cost_per_hour NUMERIC,
  availability_mode TEXT NOT NULL CHECK (availability_mode IN ('general', 'specific')) DEFAULT 'general',
  weekends_only BOOLEAN NOT NULL DEFAULT false,
  weekdays_after_five_pm BOOLEAN NOT NULL DEFAULT false,
  working_hours_start TIME NOT NULL DEFAULT '08:00',
  working_hours_end TIME NOT NULL DEFAULT '17:00',
  availability_dates JSONB DEFAULT '{}'::jsonb, -- Specific date availability
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_contractors_user_id ON public.user_contractors(user_id);

-- Enable RLS
ALTER TABLE public.user_contractors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own contractors"
  ON public.user_contractors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contractors"
  ON public.user_contractors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contractors"
  ON public.user_contractors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contractors"
  ON public.user_contractors FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_contractors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_contractors_updated_at
  BEFORE UPDATE ON public.user_contractors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_contractors_updated_at();

COMMENT ON TABLE public.user_contractors IS 'User-level contractors (professionals) that can be assigned to phases requiring Professional skill level.';

