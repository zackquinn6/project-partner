-- Populate Standard Project Foundation with complete standard phases
-- Based on projectUtils.ts: Kickoff, Planning, Ordering, Close Project

UPDATE public.projects
SET phases = '[
  {
    "id": "kickoff-phase",
    "name": "Kickoff",
    "description": "Essential project setup and agreement",
    "operations": [
      {
        "id": "kickoff-diy-profile",
        "name": "DIY Profile",
        "description": "Complete your DIY profile for personalized guidance",
        "steps": [
          {
            "id": "kickoff-step-1",
            "step": "DIY Profile",
            "description": "Complete your DIY profile for personalized project guidance",
            "contentType": "text",
            "content": "Set up your DIY profile to receive personalized project recommendations, tool suggestions, and guidance tailored to your skill level and preferences.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "diy-profile-output", "name": "DIY Profile Complete", "description": "Personal DIY profile completed and saved", "type": "none"}],
            "estimatedTime": 10
          }
        ]
      },
      {
        "id": "kickoff-project-overview",
        "name": "Project Overview",
        "description": "Review project details and timeline",
        "steps": [
          {
            "id": "kickoff-step-2",
            "step": "Project Overview",
            "description": "Review and customize your project details, timeline, and objectives",
            "contentType": "text",
            "content": "This is your project overview step. Review all project details and make any necessary customizations before proceeding.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "overview-output", "name": "Project Overview Complete", "description": "Project details reviewed and customized", "type": "none"}],
            "estimatedTime": 15
          }
        ]
      },
      {
        "id": "kickoff-project-profile",
        "name": "Project Profile",
        "description": "Set up project team and home selection",
        "steps": [
          {
            "id": "kickoff-step-3",
            "step": "Project Profile",
            "description": "Set up your project team, home selection, and customization",
            "contentType": "text",
            "content": "Configure your project profile including project name, team members, home selection, and any project-specific customizations.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "project-profile-output", "name": "Project Profile Complete", "description": "Project profile configured and saved", "type": "none"}],
            "estimatedTime": 10
          }
        ]
      },
      {
        "id": "kickoff-service-terms",
        "name": "Service Terms",
        "description": "Review and sign service terms",
        "steps": [
          {
            "id": "kickoff-step-4",
            "step": "Service Terms",
            "description": "Review and sign the service terms",
            "contentType": "text",
            "content": "Please review the service terms and provide your digital signature to proceed.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "agreement-output", "name": "Signed Agreement", "description": "Service terms signed and documented", "type": "none"}],
            "estimatedTime": 5
          }
        ]
      }
    ]
  },
  {
    "id": "planning-phase",
    "name": "Planning",
    "description": "Project planning, measurement, and preparation",
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
            "contentType": "text",
            "content": "Complete the project sizing questionnaire and customize your project workflow by selecting phases from our library or creating custom phases.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "scope-output", "name": "Project Scope Defined", "description": "Project scope and workflow customized", "type": "none"}],
            "estimatedTime": 30
          }
        ]
      },
      {
        "id": "measure-assess-operation",
        "name": "Measure & Assess",
        "description": "Take measurements and assess site conditions",
        "steps": [
          {
            "id": "planning-step-2",
            "step": "Measure & Assess",
            "description": "Take detailed measurements and assess site conditions",
            "contentType": "text",
            "content": "Measure your project area and assess any conditions that may affect your project execution.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "measurements-output", "name": "Measurements Complete", "description": "All measurements and assessments documented", "type": "none"}],
            "estimatedTime": 45
          }
        ]
      },
      {
        "id": "final-planning-operation",
        "name": "Final Planning",
        "description": "Finalize materials, tools, and timeline",
        "steps": [
          {
            "id": "planning-step-3",
            "step": "Final Planning",
            "description": "Review and finalize all project details",
            "contentType": "text",
            "content": "Finalize your materials list, tools needed, and project timeline before ordering.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "final-plan-output", "name": "Final Plan Complete", "description": "All planning finalized and ready for ordering", "type": "none"}],
            "estimatedTime": 30
          }
        ]
      },
      {
        "id": "project-customizer-operation",
        "name": "Project Customizer",
        "description": "Customize project workflow and phases",
        "steps": [
          {
            "id": "planning-step-4",
            "step": "Customize Workflow",
            "description": "Add or modify project phases and operations",
            "contentType": "text",
            "content": "Use the Project Customizer to add custom work, modify existing phases, or adjust the project workflow to match your specific needs.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "customization-output", "name": "Workflow Customized", "description": "Project workflow customized to your needs", "type": "none"}],
            "estimatedTime": 20
          }
        ]
      },
      {
        "id": "project-scheduler-operation",
        "name": "Project Scheduler",
        "description": "Schedule project timeline and milestones",
        "steps": [
          {
            "id": "planning-step-5",
            "step": "Schedule Project",
            "description": "Set project dates and milestones",
            "contentType": "text",
            "content": "Use the Project Scheduler to set your start date, target completion date, and schedule individual phases and operations.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "schedule-output", "name": "Schedule Complete", "description": "Project timeline and milestones scheduled", "type": "none"}],
            "estimatedTime": 15
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
        "description": "Review and prepare shopping checklist",
        "steps": [
          {
            "id": "ordering-step-1",
            "step": "Review Shopping List",
            "description": "Review complete materials and tools list",
            "contentType": "text",
            "content": "Review your complete shopping checklist including all materials and tools needed for the project.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "checklist-output", "name": "Checklist Reviewed", "description": "Shopping checklist reviewed and verified", "type": "none"}],
            "estimatedTime": 15
          }
        ]
      },
      {
        "id": "tool-material-ordering-operation",
        "name": "Tool & Material Ordering",
        "description": "Order or acquire tools and materials",
        "steps": [
          {
            "id": "ordering-step-2",
            "step": "Order Items",
            "description": "Purchase or rent required items",
            "contentType": "text",
            "content": "Order materials from suppliers and arrange tool rentals or purchases as needed.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "ordering-output", "name": "Items Ordered", "description": "All tools and materials ordered or acquired", "type": "none"}],
            "estimatedTime": 30
          }
        ]
      }
    ]
  },
  {
    "id": "close-project-phase",
    "name": "Close Project",
    "description": "Project closeout, tool/material return, and celebration",
    "operations": [
      {
        "id": "tool-material-closeout-operation",
        "name": "Tool & Material Closeout",
        "description": "Return tools and dispose of materials",
        "steps": [
          {
            "id": "closeout-step-1",
            "step": "Clean Tools",
            "description": "Clean and prepare tools for return",
            "contentType": "text",
            "content": "Clean all tools thoroughly and prepare them for return to rental facility or storage.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "clean-tools-output", "name": "Tools Cleaned", "description": "All tools cleaned and ready for return", "type": "none"}],
            "estimatedTime": 30
          },
          {
            "id": "closeout-step-2",
            "step": "Return Tools",
            "description": "Return rented tools",
            "contentType": "text",
            "content": "Return all rented tools to the rental facility and document returns.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "return-tools-output", "name": "Tools Returned", "description": "All tools returned and documented", "type": "none"}],
            "estimatedTime": 20
          },
          {
            "id": "closeout-step-3",
            "step": "Dispose Materials",
            "description": "Properly dispose of waste materials",
            "contentType": "text",
            "content": "Dispose of waste materials according to local regulations and store any leftover materials for future use.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "dispose-output", "name": "Materials Disposed", "description": "Waste materials properly disposed", "type": "none"}],
            "estimatedTime": 45
          }
        ]
      },
      {
        "id": "celebration-operation",
        "name": "Celebration",
        "description": "Document project completion and celebrate",
        "steps": [
          {
            "id": "closeout-step-4",
            "step": "Document Completion",
            "description": "Take photos and document project",
            "contentType": "text",
            "content": "Take final photos of your completed project and document any lessons learned.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "documentation-output", "name": "Project Documented", "description": "Final photos and documentation complete", "type": "none"}],
            "estimatedTime": 15
          },
          {
            "id": "closeout-step-5",
            "step": "Provide Feedback",
            "description": "Share your project experience",
            "contentType": "text",
            "content": "Provide feedback on your project experience to help us improve our guidance and tools.",
            "materials": [],
            "tools": [],
            "outputs": [{"id": "feedback-output", "name": "Feedback Provided", "description": "Project feedback submitted", "type": "none"}],
            "estimatedTime": 10
          }
        ]
      }
    ]
  }
]'::jsonb,
updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';
