-- Fix the project phases for the Tile Flooring Installation revision
-- Remove duplicates and ensure proper ordering of phases
UPDATE public.projects 
SET phases = '[
  {
    "id": "kickoff-phase",
    "name": "Kickoff",
    "description": "Essential project setup and agreement",
    "operations": [
      {
        "id": "kickoff-operation",
        "name": "Kickoff",
        "description": "Essential project setup and agreement",
        "steps": [
          {
            "id": "kickoff-step-1",
            "step": "DIY Profile",
            "description": "Complete your DIY profile for personalized project guidance",
            "content": "Set up your DIY profile to receive personalized project recommendations, tool suggestions, and guidance tailored to your skill level and preferences.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "diy-profile-output",
                "name": "DIY Profile Complete",
                "type": "none",
                "description": "Personal DIY profile completed and saved"
              }
            ]
          },
          {
            "id": "kickoff-step-2",
            "step": "Project Overview",
            "description": "Review and customize your project details, timeline, and objectives",
            "content": "This is your project overview step. Review all project details and make any necessary customizations before proceeding.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "overview-output",
                "name": "Project Overview Complete",
                "type": "none",
                "description": "Project details reviewed and customized"
              }
            ]
          },
          {
            "id": "kickoff-step-3",
            "step": "Project Profile",
            "description": "Set up your project team, home selection, and customization",
            "content": "Configure your project profile including project name, team members, home selection, and any project-specific customizations.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "project-profile-output",
                "name": "Project Profile Complete",
                "type": "none",
                "description": "Project profile configured and saved"
              }
            ]
          },
          {
            "id": "kickoff-step-4",
            "step": "Project Partner Agreement",
            "description": "Review and sign the project partner agreement",
            "content": "Please review the project partner agreement terms and provide your digital signature to proceed.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "agreement-output",
                "name": "Signed Agreement",
                "type": "none",
                "description": "Project partner agreement signed and documented"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "planning-phase",
    "name": "Planning",
    "description": "Comprehensive project planning and preparation",
    "operations": [
      {
        "id": "initial-planning-operation",
        "name": "Initial Planning",
        "description": "Define project scope and select phases",
        "steps": [
          {
            "id": "planning-step-1",
            "step": "Project Work Scope",
            "description": "Define project scope, measurements, timing, and customize workflow",
            "content": "Complete the project sizing questionnaire and customize your project workflow by selecting phases from our library or creating custom phases.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "scope-output",
                "name": "Project Scope Defined",
                "type": "none",
                "description": "Project scope, timing, and workflow customized"
              }
            ]
          }
        ]
      },
      {
        "id": "measurement-operation",
        "name": "Measure & Assess",
        "description": "Measure spaces and assess project requirements",
        "steps": [
          {
            "id": "measurement-step-1",
            "step": "Site Measurement",
            "description": "Take accurate measurements of your work area",
            "content": "Measure your work area carefully and document all dimensions needed for your project.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "measurement-output",
                "name": "Measurements Complete",
                "type": "none",
                "description": "All necessary measurements documented"
              }
            ]
          }
        ]
      },
      {
        "id": "final-planning-operation",
        "name": "Final Planning",
        "description": "Finalize project details and create execution plan",
        "steps": [
          {
            "id": "final-planning-step-1",
            "step": "Finalize Project Plan",
            "description": "Review and finalize all project details and timeline",
            "content": "Review your project plan, confirm all details, and create your final execution timeline.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "final-planning-output",
                "name": "Project Plan Finalized",
                "type": "none",
                "description": "Project ready for execution"
              }
            ]
          }
        ]
      },
      {
        "id": "project-customizer-operation",
        "name": "Project Customizer",
        "description": "Customize project phases and workflow",
        "steps": [
          {
            "id": "project-customizer-step",
            "step": "Project Customizer",
            "description": "Customize project phases, operations, and steps to match your specific needs",
            "content": "Use the project customizer to add, remove, or modify project phases and operations to create a workflow that fits your specific project requirements.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "customization-output",
                "name": "Project Customized",
                "type": "none",
                "description": "Project workflow customized to specific requirements"
              }
            ]
          }
        ]
      },
      {
        "id": "project-scheduling-operation",
        "name": "Project Schedule",
        "description": "Create project timeline and schedule phases",
        "steps": [
          {
            "id": "planning-step-2",
            "step": "Project Scheduling",
            "description": "Create project timeline and schedule phases",
            "content": "Plan your project timeline by scheduling phases, setting realistic deadlines, and coordinating with your calendar.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "scheduling-output",
                "name": "Project Scheduled",
                "type": "none",
                "description": "Project timeline and schedule established"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "ordering-phase",
    "name": "Ordering",
    "description": "Order tools and materials for your project",
    "operations": [
      {
        "id": "shopping-checklist-operation",
        "name": "Shopping Checklist",
        "description": "Create comprehensive shopping list for all project needs",
        "steps": [
          {
            "id": "shopping-checklist-step",
            "step": "Create Shopping Checklist",
            "description": "Generate and review comprehensive shopping list",
            "content": "Create a comprehensive shopping checklist that includes all tools, materials, and supplies needed for your project. Review quantities, specifications, and prioritize purchases.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "checklist-output",
                "name": "Shopping Checklist Created",
                "type": "none",
                "description": "Complete shopping checklist prepared and organized"
              }
            ]
          }
        ]
      },
      {
        "id": "ordering-operation",
        "name": "Order Tools & Materials",
        "description": "Purchase or rent required tools and materials",
        "steps": [
          {
            "id": "ordering-step",
            "step": "Order Tools & Materials",
            "description": "Purchase tools, materials, and supplies for your project",
            "content": "Order all required tools, materials, and supplies for your project. Compare prices, check availability, and coordinate delivery schedules.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "ordering-output",
                "name": "Tools & Materials Ordered",
                "type": "none",
                "description": "All necessary tools and materials ordered and delivery scheduled"
              }
            ]
          }
        ]
      }
    ]
  }
]'::jsonb || (phases::jsonb - 0 - 1) || '[
  {
    "id": "close-project-phase",
    "name": "Close Project",
    "description": "Project completion and documentation",
    "operations": [
      {
        "id": "tool-material-closeout-operation",
        "name": "Tool & Material Closeout",
        "description": "Return rentals and organize remaining materials",
        "steps": [
          {
            "id": "closeout-step",
            "step": "Tool & Material Closeout",
            "description": "Return rental tools and organize leftover materials",
            "content": "Return all rental tools, organize and store leftover materials, and update your tool and material inventory.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "closeout-output",
                "name": "Tools & Materials Organized",
                "type": "none",
                "description": "Rental tools returned and materials properly stored"
              }
            ]
          }
        ]
      },
      {
        "id": "celebration-operation",
        "name": "Celebration",
        "description": "Celebrate project completion and share results",
        "steps": [
          {
            "id": "celebration-step",
            "step": "Project Celebration",
            "description": "Celebrate your completed project and share your success",
            "content": "Take time to celebrate your completed project! Document your results, share photos with friends and family, and reflect on what you learned.",
            "contentType": "text",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "celebration-output",
                "name": "Project Celebrated",
                "type": "none",
                "description": "Project completion celebrated and documented"
              }
            ]
          }
        ]
      }
    ]
  }
]'::jsonb
WHERE name = 'Tile Flooring Installation' 
AND revision_number = (
  SELECT MAX(revision_number) 
  FROM public.projects 
  WHERE name = 'Tile Flooring Installation'
);