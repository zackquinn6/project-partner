import React from 'react';
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
        {coverImageUrl ? (
          <div className="w-full h-48 overflow-hidden bg-muted">
            <img
              src={coverImageUrl}
              alt={projectName ? `${projectName} cover` : 'Project cover'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{projectName}</CardTitle>
          {projectDescription ? (
            <CardDescription className="text-sm">{projectDescription}</CardDescription>
          ) : null}
        </CardHeader>
      </Card>

      <ProjectOverviewStep
        onComplete={() => {}}
        isCompleted={isKickoffStep1Completed}
      />
    </div>
  );
}

