-- Remove the redundant dryer vent cleaning task (90 days frequency)
-- Keep the annual one (365 days frequency)
DELETE FROM maintenance_templates 
WHERE id = 'ab072ae8-e5b3-46ac-bccb-e0bf5137ea9b';