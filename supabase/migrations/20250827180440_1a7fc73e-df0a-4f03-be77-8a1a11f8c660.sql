-- Add photo_url to variation_instances
ALTER TABLE variation_instances ADD COLUMN photo_url text;

-- Add unique constraint for variation attribute values per core item
-- We'll modify the logic to ensure values are unique per core item in the application layer
-- since we need to track which core item the values belong to

-- Add core_item_id to variation_attribute_values to make values unique per core item
ALTER TABLE variation_attribute_values ADD COLUMN core_item_id uuid;

-- Create index for better performance
CREATE INDEX idx_variation_attribute_values_core_item ON variation_attribute_values(core_item_id, attribute_id);