-- Default kickoff quality goal to Great for new and existing project runs.

ALTER TABLE public.project_runs
  ALTER COLUMN initial_quality_goal SET DEFAULT 'great';

UPDATE public.project_runs
SET initial_quality_goal = 'great'
WHERE initial_quality_goal IS NULL;
