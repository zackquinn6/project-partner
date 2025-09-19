-- Create tool models for variations that don't have them yet
-- This will enable pricing scraping for more tools

INSERT INTO tool_models (variation_instance_id, model_name, manufacturer)
SELECT 
  vi.id,
  vi.name as model_name,
  CASE 
    WHEN vi.name ILIKE '%dewalt%' THEN 'DeWalt'
    WHEN vi.name ILIKE '%milwaukee%' THEN 'Milwaukee'
    WHEN vi.name ILIKE '%ryobi%' THEN 'Ryobi'
    WHEN vi.name ILIKE '%makita%' THEN 'Makita'
    WHEN vi.name ILIKE '%bosch%' THEN 'Bosch'
    WHEN vi.name ILIKE '%porter%cable%' THEN 'Porter Cable'
    WHEN vi.name ILIKE '%black%decker%' THEN 'Black & Decker'
    WHEN vi.name ILIKE '%craftsman%' THEN 'Craftsman'
    WHEN vi.name ILIKE '%stanley%' THEN 'Stanley'
    WHEN vi.name ILIKE '%irwin%' THEN 'Irwin'
    WHEN vi.name ILIKE '%lenox%' THEN 'Lenox'
    WHEN vi.name ILIKE '%diablo%' THEN 'Diablo'
    WHEN vi.name ILIKE '%ridgid%' THEN 'Ridgid'
    WHEN vi.name ILIKE '%skil%' THEN 'Skil'
    ELSE 'Generic'
  END as manufacturer
FROM variation_instances vi
LEFT JOIN tool_models tm ON tm.variation_instance_id = vi.id
WHERE vi.item_type = 'tools' 
  AND tm.id IS NULL 
  AND vi.name IS NOT NULL
LIMIT 100; -- Start with first 100 to test