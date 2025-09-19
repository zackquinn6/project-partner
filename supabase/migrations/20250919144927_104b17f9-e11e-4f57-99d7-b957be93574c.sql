-- Clear existing tools completely for fresh import
DELETE FROM pricing_data;
DELETE FROM tool_models; 
DELETE FROM variation_warning_flags;
DELETE FROM variation_instances WHERE item_type = 'tools';
DELETE FROM tools;