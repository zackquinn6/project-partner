-- Add DIY challenges data to the Tile Flooring Installation project
UPDATE projects 
SET diy_length_challenges = 'This project involves precision cutting, heavy lifting of tiles, and working on your knees for extended periods. The tile layout requires careful measurement and planning. Grouting can be messy and requires patience for proper curing time. Consider renting professional tools like a wet tile saw for best results.'
WHERE name = 'Tile Flooring Installation' 
AND revision_number = 1;