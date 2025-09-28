-- Remove duplicate sample projects, keeping only official projects
DELETE FROM projects 
WHERE id IN (
  '273bab97-a7d7-4d45-95b7-2ce70b4f8cf3', -- Interior Painting duplicate
  '2343655e-b693-4ba8-bd5c-248b5b25bfd7', -- Bathroom Mirror duplicate  
  'b5202e28-2960-4682-946f-020bb462b6ac', -- Kitchen Backsplash duplicate
  '9def1e37-1d36-4b78-8f84-f936533ece3a', -- Interior Painting duplicate
  '6e98a787-9df4-4766-b30f-1ccac97249e5', -- Kitchen Backsplash duplicate
  '2bcf95a7-1663-444f-b1b0-172decb35762', -- Bathroom Mirror duplicate
  '9101400b-b4ab-41a7-858e-d1c67dc4f642', -- Interior Painting duplicate
  '498affe8-a52e-4472-8a34-262fa0cd860d', -- Kitchen Backsplash duplicate
  '7115e95e-fc7b-4d5a-b1da-a37d5bec62fa', -- Bathroom Mirror duplicate
  '4b2a6c6f-8519-4592-848c-0801410df0f5'  -- Tile Flooring draft duplicate
);

-- Ensure the original Tile Flooring Installation project is published
UPDATE projects 
SET publish_status = 'published'
WHERE id = 'caa74687-63fc-4bd1-865b-032a043fdcdc' 
AND name = 'Tile Flooring Installation';