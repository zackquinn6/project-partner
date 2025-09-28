-- Add sample published projects for the catalog
INSERT INTO public.projects (name, description, category, difficulty, estimated_time, effort_level, skill_level, publish_status, phases) VALUES 
(
  'Interior Painting',
  'Transform your room with a fresh coat of paint. Learn proper techniques for preparation, priming, and painting.',
  'Interior',
  'Beginner',
  '1-2 days',
  'Low',
  'Beginner',
  'published',
  '[
    {
      "id": "kickoff",
      "name": "Project Kickoff",
      "operations": [
        {
          "id": "planning",
          "name": "Planning & Preparation",
          "steps": [
            {"id": "kickoff-step-1", "step": "DIY Profile", "description": "Complete your DIY profile", "estimatedTime": "15 min"},
            {"id": "kickoff-step-2", "step": "Project Overview", "description": "Review project scope and requirements", "estimatedTime": "20 min"},
            {"id": "kickoff-step-3", "step": "Project Profile", "description": "Set up project details", "estimatedTime": "15 min"},
            {"id": "kickoff-step-4", "step": "Project Partner Agreement", "description": "Establish project agreements", "estimatedTime": "10 min"}
          ]
        }
      ]
    },
    {
      "id": "planning",
      "name": "Planning Phase",
      "operations": [
        {
          "id": "preparation",
          "name": "Room Preparation",
          "steps": [
            {"id": "prep-step-1", "step": "Move Furniture", "description": "Remove or cover furniture and belongings", "estimatedTime": "1 hour"},
            {"id": "prep-step-2", "step": "Wall Preparation", "description": "Clean walls and repair holes", "estimatedTime": "2 hours"}
          ]
        }
      ]
    },
    {
      "id": "execution",
      "name": "Painting Phase",
      "operations": [
        {
          "id": "painting",
          "name": "Paint Application",
          "steps": [
            {"id": "paint-step-1", "step": "Prime Walls", "description": "Apply primer to prepared walls", "estimatedTime": "2 hours"},
            {"id": "paint-step-2", "step": "Paint Walls", "description": "Apply paint with proper technique", "estimatedTime": "3 hours"},
            {"id": "paint-step-3", "step": "Clean Up", "description": "Clean brushes and restore room", "estimatedTime": "1 hour"}
          ]
        }
      ]
    }
  ]'::jsonb
),
(
  'Kitchen Backsplash Installation', 
  'Add style to your kitchen with a beautiful tile backsplash. Perfect weekend project for intermediate DIYers.',
  'Kitchen',
  'Intermediate', 
  '1-2 days',
  'Medium',
  'Intermediate',
  'published',
  '[
    {
      "id": "kickoff",
      "name": "Project Kickoff",
      "operations": [
        {
          "id": "planning",
          "name": "Planning & Preparation", 
          "steps": [
            {"id": "kickoff-step-1", "step": "DIY Profile", "description": "Complete your DIY profile", "estimatedTime": "15 min"},
            {"id": "kickoff-step-2", "step": "Project Overview", "description": "Review project scope and requirements", "estimatedTime": "20 min"},
            {"id": "kickoff-step-3", "step": "Project Profile", "description": "Set up project details", "estimatedTime": "15 min"},
            {"id": "kickoff-step-4", "step": "Project Partner Agreement", "description": "Establish project agreements", "estimatedTime": "10 min"}
          ]
        }
      ]
    },
    {
      "id": "planning", 
      "name": "Planning Phase",
      "operations": [
        {
          "id": "measurement",
          "name": "Design & Measurement",
          "steps": [
            {"id": "design-step-1", "step": "Measure Backsplash Area", "description": "Measure wall area for backsplash", "estimatedTime": "30 min"},
            {"id": "design-step-2", "step": "Plan Layout", "description": "Design tile layout and pattern", "estimatedTime": "45 min"}
          ]
        }
      ]
    },
    {
      "id": "execution",
      "name": "Installation Phase", 
      "operations": [
        {
          "id": "installation",
          "name": "Backsplash Installation",
          "steps": [
            {"id": "install-step-1", "step": "Wall Preparation", "description": "Clean and prepare wall surface", "estimatedTime": "1 hour"},
            {"id": "install-step-2", "step": "Install Tiles", "description": "Apply adhesive and install tiles", "estimatedTime": "4 hours"},
            {"id": "install-step-3", "step": "Grout Installation", "description": "Apply grout and clean tiles", "estimatedTime": "2 hours"}
          ]
        }
      ]
    }
  ]'::jsonb
),
(
  'Bathroom Mirror Installation',
  'Install a stylish new bathroom mirror with proper mounting and safety considerations.',
  'Interior',
  'Beginner',
  '2-3 hours',
  'Low',
  'Beginner',
  'published',
  '[
    {
      "id": "kickoff",
      "name": "Project Kickoff",
      "operations": [
        {
          "id": "planning",
          "name": "Planning & Preparation", 
          "steps": [
            {"id": "kickoff-step-1", "step": "DIY Profile", "description": "Complete your DIY profile", "estimatedTime": "15 min"},
            {"id": "kickoff-step-2", "step": "Project Overview", "description": "Review project scope and requirements", "estimatedTime": "20 min"},
            {"id": "kickoff-step-3", "step": "Project Profile", "description": "Set up project details", "estimatedTime": "15 min"},
            {"id": "kickoff-step-4", "step": "Project Partner Agreement", "description": "Establish project agreements", "estimatedTime": "10 min"}
          ]
        }
      ]
    },
    {
      "id": "execution",
      "name": "Installation Phase", 
      "operations": [
        {
          "id": "installation",
          "name": "Mirror Installation",
          "steps": [
            {"id": "measure-step", "step": "Measure and Mark", "description": "Measure wall and mark mounting points", "estimatedTime": "30 min"},
            {"id": "mount-step", "step": "Mount Mirror", "description": "Secure mirror to wall with appropriate hardware", "estimatedTime": "45 min"},
            {"id": "test-step", "step": "Test Installation", "description": "Verify secure mounting and adjust as needed", "estimatedTime": "15 min"}
          ]
        }
      ]
    }
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;