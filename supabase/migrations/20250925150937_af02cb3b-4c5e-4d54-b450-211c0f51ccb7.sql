-- Add diy_length_challenges column to project_runs table
ALTER TABLE public.project_runs 
ADD COLUMN diy_length_challenges text;

-- Update existing project runs to copy DIY challenges from their template projects
UPDATE public.project_runs 
SET diy_length_challenges = p.diy_length_challenges
FROM public.projects p 
WHERE public.project_runs.template_id = p.id 
  AND p.diy_length_challenges IS NOT NULL;