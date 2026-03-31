import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectOverviewStep } from './KickoffSteps/ProjectOverviewStep';

interface ProjectWorkflowOverviewPageProps {
  isKickoffStep1Completed: boolean;
}

export function ProjectWorkflowOverviewPage({
  isKickoffStep1Completed
}: ProjectWorkflowOverviewPageProps) {
  const { currentProject, currentProjectRun, projects } = useProject();

  const projectName =
    currentProjectRun?.customProjectName ?? currentProjectRun?.name ?? currentProject?.name;

  // In workflow mode, `currentProject` can be null while `currentProjectRun` is set.
  // Resolve template project for description + cover when context project is not loaded.
  const templateProject =
    currentProjectRun && projects
      ? projects.find(p => p.id === currentProjectRun.projectId) || null
      : null;

  const runDescription = currentProjectRun?.description?.trim();
  const templateDescription = (
    currentProject?.description ??
    templateProject?.description ??
    ''
  ).trim();
  const projectDescription =
    runDescription && runDescription.length > 0 ? runDescription : templateDescription;

  const coverImageUrl = currentProject?.cover_image ?? templateProject?.cover_image;

  return (
    <div className="space-y-6">
      <Card className="gradient-card border-0 shadow-card overflow-hidden">
        <CardHeader className={projectDescription ? 'pb-3' : 'pb-5'}>
          <CardTitle className="font-bold" style={{ fontSize: '3em', lineHeight: 1.05 }}>
            {projectName}
          </CardTitle>
          {projectDescription ? (
            <p
              className="mt-3 text-base font-normal leading-relaxed text-muted-foreground sm:text-lg"
              role="doc-subtitle"
            >
              {projectDescription}
            </p>
          ) : null}
        </CardHeader>

        {coverImageUrl ? (
          <div className="mr-auto w-1/2 aspect-[4/3] overflow-hidden rounded-md bg-muted">
            <img
              src={coverImageUrl}
              alt={projectName ? `${projectName} cover` : 'Project cover'}
              className="w-full h-full object-cover object-left"
            />
          </div>
        ) : null}
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="project-details">
          <AccordionTrigger className="text-sm sm:text-base">
            See project details
          </AccordionTrigger>
          <AccordionContent>
            <ProjectOverviewStep
              mode="workflow"
              onComplete={() => {}}
              isCompleted={isKickoffStep1Completed}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

