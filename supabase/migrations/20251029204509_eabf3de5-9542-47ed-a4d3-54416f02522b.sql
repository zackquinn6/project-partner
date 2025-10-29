-- Restore valid completed steps that were incorrectly removed
-- The cleanup removed ALL steps, but should have only removed old kickoff IDs

UPDATE public.project_runs
SET 
  completed_steps = '["67bb11f0-e1b2-48f8-802e-dad057e55dc6","3089d18a-a2d9-438a-b746-220c35f63e39","ed10fdaa-7e50-436c-b502-a89ca4095971"]'::jsonb,
  progress = 25,
  updated_at = now()
WHERE id = '5bb1d0c3-8017-4289-b621-7b6a78235fee';