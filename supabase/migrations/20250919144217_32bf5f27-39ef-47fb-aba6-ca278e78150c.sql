-- Complete database reset for tools
-- This will ensure all tool-related data is completely removed

-- Delete all pricing data
DELETE FROM pricing_data WHERE model_id IN (SELECT id FROM tool_models);

-- Delete all tool models
DELETE FROM tool_models;

-- Delete all variation warning flags for tools
DELETE FROM variation_warning_flags WHERE variation_instance_id IN (
    SELECT id FROM variation_instances WHERE item_type = 'tools'
);

-- Delete all tool variations
DELETE FROM variation_instances WHERE item_type = 'tools';

-- Delete all core tools
DELETE FROM tools;