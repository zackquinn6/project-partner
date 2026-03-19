import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProject } from '@/contexts/ProjectContext';
import { ProjectOverviewStep } from './KickoffSteps/ProjectOverviewStep';

interface ProjectWorkflowOverviewPageProps {
  isKickoffStep1Completed: boolean;
}

export function ProjectWorkflowOverviewPage({
  isKickoffStep1Completed
}: ProjectWorkflowOverviewPageProps) {
  const { currentProject, currentProjectRun } = useProject();

  const projectName =
    currentProjectRun?.customProjectName ?? currentProjectRun?.name ?? currentProject?.name;

  const projectDescription =
    currentProjectRun?.description ?? currentProject?.description;

  const coverImageUrl = currentProject?.cover_image;

  return (
    <div className="space-y-6">
      <Card className="gradient-card border-0 shadow-card overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="font-bold" style={{ fontSize: '3em', lineHeight: 1.05 }}>
            {projectName}
          </CardTitle>
        </CardHeader>

        {coverImageUrl ? (
          <div className="w-full h-52 overflow-hidden bg-muted">
            <img
              src={coverImageUrl}
              alt={projectName ? `${projectName} cover` : 'Project cover'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        {projectDescription ? (
          <div className="px-6 pb-6">
            <CardDescription className="text-sm leading-relaxed">
              {projectDescription}
            </CardDescription>
          </div>
        ) : null}
      </Card>

      <Accordion type="single" collapsible defaultValue="project-details">
        <AccordionItem value="project-details">
          <AccordionTrigger className="text-sm sm:text-base">
            See project details
          </AccordionTrigger>
          <AccordionContent>
            <ProjectOverviewStep
              onComplete={() => {}}
              isCompleted={isKickoffStep1Completed}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

