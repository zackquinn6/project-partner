-- Update existing project runs to copy DIY challenges from their template projects
UPDATE project_runs 
SET diy_length_challenges = (
    SELECT p.diy_length_challenges 
    FROM projects p 
    WHERE p.id = project_runs.template_id
)
WHERE diy_length_challenges IS NULL 
AND template_id IS NOT NULL;