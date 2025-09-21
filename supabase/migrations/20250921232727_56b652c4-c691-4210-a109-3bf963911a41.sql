-- Update tile flooring installation project to remove non-standard phases
-- Keep only standard phases: Kickoff, Planning, Close Project

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
            "step": "Project Overview",
            "description": "Review and customize your project details, timeline, and objectives",
            "contentType": "text",
            "content": "This is your project overview step. Review all project details and make any necessary customizations before proceeding.",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "overview-output",
                "name": "Project Overview Complete",
                "description": "Project details reviewed and customized",
                "type": "none"
              }
            ]
          },
          {
            "id": "kickoff-step-2",
            "step": "Project Partner Agreement",
            "description": "Review and sign the project partner agreement",
            "contentType": "text",
            "content": "Please review the project partner agreement terms and provide your digital signature to proceed.",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "agreement-output",
                "name": "Signed Agreement",
                "description": "Project partner agreement signed and documented",
                "type": "none"
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
            "contentType": "text",
            "content": "Complete the project sizing questionnaire and customize your project workflow by selecting phases from our library or creating custom phases.",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "scope-output",
                "name": "Project Scope Defined",
                "description": "Project scope, timing, and workflow customized",
                "type": "none"
              }
            ]
          },
          {
            "id": "planning-step-2",
            "step": "Project Scheduling",
            "description": "Create project timeline and schedule phases",
            "contentType": "text",
            "content": "Plan your project timeline by scheduling phases, setting realistic deadlines, and coordinating with your calendar.",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "scheduling-output",
                "name": "Project Scheduled",
                "description": "Project timeline and schedule established",
                "type": "none"
              }
            ]
          }
        ]
      },
      {
        "id": "measurement-operation",
        "name": "Measurement & Assessment",
        "description": "Measure spaces and assess project requirements",
        "steps": [
          {
            "id": "measurement-step-1",
            "step": "Site Measurement",
            "description": "Take accurate measurements of your work area",
            "contentType": "text",
            "content": "Measure your work area carefully and document all dimensions needed for your project.",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "measurement-output",
                "name": "Measurements Complete",
                "description": "All necessary measurements documented",
                "type": "none"
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
            "contentType": "text",
            "content": "Review your project plan, confirm all details, and create your final execution timeline.",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "final-planning-output",
                "name": "Project Plan Finalized",
                "description": "Project ready for execution",
                "type": "none"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "close-project-phase",
    "name": "Close Project",
    "description": "Complete project closure and documentation",
    "operations": [
      {
        "id": "close-operation",
        "name": "Project Closure",
        "description": "Finalize project and document completion",
        "steps": [
          {
            "id": "close-step-1",
            "step": "Project Completion Review",
            "description": "Review completed work and document final results",
            "contentType": "text",
            "content": "Conduct a final review of all completed work, document any lessons learned, and officially close the project.",
            "materials": [],
            "tools": [],
            "outputs": [
              {
                "id": "completion-output",
                "name": "Project Completed",
                "description": "Project officially closed and documented",
                "type": "none"
              }
            ]
          }
        ]
      }
    ]
  }
]'::jsonb,
updated_at = now()
WHERE id = 'dbca17f2-ff6c-4085-8b10-9298f66f180a';