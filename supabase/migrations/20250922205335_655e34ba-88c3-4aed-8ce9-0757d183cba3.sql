-- Create a special template for manual projects
INSERT INTO projects (
  id,
  name,
  description,
  status,
  publish_status,
  category,
  difficulty,
  phases,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Manual Project Template',
  'Template used for manually logged projects',
  'not-started',
  'published',
  'Manual',
  'Beginner',
  '[]'::jsonb,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;