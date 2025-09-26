-- Update project runs to inherit DIY challenges from their template projects
UPDATE public.project_runs 
SET diy_length_challenges = p.diy_length_challenges
FROM public.projects p 
WHERE project_runs.template_id = p.id 
  AND project_runs.diy_length_challenges IS NULL 
  AND p.diy_length_challenges IS NOT NULL;