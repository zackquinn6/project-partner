-- Create a sample beta-testing project for testing beta functionality
INSERT INTO projects (
  id,
  name,
  description,
  publish_status,
  category,
  difficulty,
  effort_level,
  estimated_time,
  phases
) VALUES (
  gen_random_uuid(),
  'Interior Painting Guide',
  'A comprehensive guide to painting interior walls with professional techniques and tips for achieving a smooth, even finish.',
  'beta-testing',
  'Interior',
  'Beginner',
  'Medium',
  '2-3 days',
  '[
    {
      "id": "phase-1",
      "name": "Planning & Preparation",
      "description": "Plan your painting project and prepare the space",
      "operations": [
        {
          "id": "op-1",
          "name": "Room Assessment",
          "description": "Evaluate the room condition and requirements",
          "steps": [
            {
              "id": "step-1",
              "step": "Measure and Calculate Paint Needed",
              "description": "Calculate the amount of paint needed for your project",
              "contentType": "text",
              "content": "Measure wall height and width, subtract windows and doors, divide by coverage area on paint can.",
              "materials": [],
              "tools": [],
              "outputs": [],
              "contentSections": [
                {
                  "id": "section-1",
                  "type": "text",
                  "content": "Before purchasing paint, you need to calculate how much you will need. This prevents waste and ensures you have enough paint to complete the project.",
                  "title": "Why Accurate Measurement Matters",
                  "width": "full",
                  "alignment": "left"
                },
                {
                  "id": "section-2", 
                  "type": "text",
                  "content": "1. Measure the height and width of each wall\n2. Multiply height × width for each wall\n3. Add all walls together for total square footage\n4. Subtract area for windows and doors\n5. Divide by paint coverage (usually 350-400 sq ft per gallon)",
                  "title": "Calculation Steps",
                  "width": "full",
                  "alignment": "left"
                }
              ]
            }
          ]
        }
      ]
    }
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;