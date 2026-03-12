-- Backfill description, effort_level, and skill_level
-- for known template projects in the projects table.

BEGIN;

-- Tile Flooring Installation
UPDATE projects
SET description = 'Install durable tile flooring over a properly prepared, flat substrate with clean layouts and grout lines.'
WHERE name = 'Tile Flooring Installation'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'High'
WHERE name = 'Tile Flooring Installation'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Advanced'
WHERE name = 'Tile Flooring Installation'
  AND skill_level IS NULL;

-- Toilet Replacement
UPDATE projects
SET description = 'Remove an existing toilet and install a new unit with a reliable seal and leak-free connections.'
WHERE name = 'Toilet Replacement'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'Medium'
WHERE name = 'Toilet Replacement'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Beginner'
WHERE name = 'Toilet Replacement'
  AND skill_level IS NULL;

-- Kitchen Cabinet Installation
UPDATE projects
SET description = 'Plan, hang, and level new kitchen cabinets for a pro-quality finish, including layout, shimming, and fastening to studs.'
WHERE name = 'Kitchen Cabinet Installation'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'High'
WHERE name = 'Kitchen Cabinet Installation'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Advanced'
WHERE name = 'Kitchen Cabinet Installation'
  AND skill_level IS NULL;

-- Interior Door Replacement (prehung or slab)
UPDATE projects
SET description = 'Replace interior doors with new prehung units or slabs, tune fitment, and get smooth, clean operation.'
WHERE name = 'Interior Door Replacement (prehung or slab)'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'Medium'
WHERE name = 'Interior Door Replacement (prehung or slab)'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Intermediate'
WHERE name = 'Interior Door Replacement (prehung or slab)'
  AND skill_level IS NULL;

-- Baseboard + Trim Installation
UPDATE projects
SET description = 'Install baseboard and trim with tight joints and smooth transitions from room to room.'
WHERE name = 'Baseboard + Trim Installation'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'Medium'
WHERE name = 'Baseboard + Trim Installation'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Intermediate'
WHERE name = 'Baseboard + Trim Installation'
  AND skill_level IS NULL;

-- Self-leveler application
UPDATE projects
SET description = 'Prepare and pour self-leveling underlayment to flatten a floor before installing new finishes.'
WHERE name = 'Self-leveler application'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'Medium'
WHERE name = 'Self-leveler application'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Intermediate'
WHERE name = 'Self-leveler application'
  AND skill_level IS NULL;

-- Tile Floor Demolition
UPDATE projects
SET description = 'Remove existing tile flooring and underlayment safely while protecting structure and adjacent finishes.'
WHERE name = 'Tile Floor Demolition'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'High'
WHERE name = 'Tile Floor Demolition'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Intermediate'
WHERE name = 'Tile Floor Demolition'
  AND skill_level IS NULL;

-- Dishwasher Replacement
UPDATE projects
SET description = 'Swap an existing dishwasher, handle water and drain connections, and level the new unit in the cabinet opening.'
WHERE name = 'Dishwasher Replacement'
  AND (description IS NULL OR trim(description) = '');

UPDATE projects
SET effort_level = 'Medium'
WHERE name = 'Dishwasher Replacement'
  AND effort_level IS NULL;

UPDATE projects
SET skill_level = 'Intermediate'
WHERE name = 'Dishwasher Replacement'
  AND skill_level IS NULL;

COMMIT;

