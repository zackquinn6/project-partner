-- Update the current project run with DIY challenges data
UPDATE public.project_runs 
SET diy_length_challenges = 'Laying tile floor is rewarding but it''s not a light lift—literally. Expect heavy boxes of tile to move, constant bending and kneeling, and plenty of dust and mess. For first‑timers, the real challenge is precision: one wrong cut or a cracked tile can throw off the whole pattern, and fixing mistakes mid‑job is slow and frustrating.'
WHERE id = '4680f261-c4ff-4647-8f51-57d72f1c1e9a';

-- Also update the template project to have DIY challenges so future project runs will get it
UPDATE public.projects 
SET diy_length_challenges = 'Laying tile floor is rewarding but it''s not a light lift—literally. Expect heavy boxes of tile to move, constant bending and kneeling, and plenty of dust and mess. For first‑timers, the real challenge is precision: one wrong cut or a cracked tile can throw off the whole pattern, and fixing mistakes mid‑job is slow and frustrating.'
WHERE id = '69a8ac2a-863e-4dcb-855e-ccd4ef27ebd8';