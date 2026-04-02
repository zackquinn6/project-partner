-- Backfill public.tools.category where missing or blank (required by tools_category_required_chk).
-- Allowed values must match the app and constraint: PPE, Hand Tool, Power Tool, Other.

UPDATE public.tools
SET category = 'PPE'
WHERE (category IS NULL OR trim(category) = '')
  AND lower(name) ~* '(glove|goggle|goggles|mask|respirator|helmet|ppe|vest|ear plug|earplug|hard hat|safety glasses)';

UPDATE public.tools
SET category = 'Power Tool'
WHERE (category IS NULL OR trim(category) = '')
  AND lower(name) ~* '(drill|saw|circular|jigsaw|miter|router|sander|grinder|driver|nailer|oscillating|multitool|power)';

UPDATE public.tools
SET category = 'Hand Tool'
WHERE (category IS NULL OR trim(category) = '')
  AND lower(name) ~* '(wrench|hammer|plier|pliers|chisel|screwdriver|level|square|knife|trowel|putty|clamp|mallet|tape measure|stud finder)';

UPDATE public.tools
SET category = 'Other'
WHERE category IS NULL OR trim(category) = '';
