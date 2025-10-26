import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { WorkflowDecisionEngine } from './WorkflowDecisionEngine';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { CheckCircle2 } from 'lucide-react';

interface ProjectSpace {
  id: string;
  name: string;
  spaceType: string;
  scaleValue?: number;
  scaleUnit?: string;
}

interface SpaceDecisionFlowProps {
  spaces: ProjectSpace[];
  projectRun: ProjectRun;
  spaceDecisions: Record<string, {
    standardDecisions: Record<string, string[]>;
    ifNecessaryWork: Record<string, string[]>;
  }>;
  onSpaceDecision: (
    spaceId: string,
    phaseId: string,
    type: 'standard' | 'ifNecessary',
    decisions: string[]
  ) => void;
}

export const SpaceDecisionFlow: React.FC<SpaceDecisionFlowProps> = ({
  spaces,
  projectRun,
  spaceDecisions,
  onSpaceDecision
}) => {
  const handleStandardDecision = (spaceId: string) => (phaseId: string, alternatives: string[]) => {
    onSpaceDecision(spaceId, phaseId, 'standard', alternatives);
  };

  const handleIfNecessaryWork = (spaceId: string) => (phaseId: string, optionalWork: string[]) => {
    onSpaceDecision(spaceId, phaseId, 'ifNecessary', optionalWork);
  };

  const getSpaceDecisionState = (spaceId: string) => {
    return {
      standardDecisions: spaceDecisions[spaceId]?.standardDecisions || {},
      ifNecessaryWork: spaceDecisions[spaceId]?.ifNecessaryWork || {}
    };
  };

  const isSpaceComplete = (spaceId: string) => {
    // Check if all required decisions are made for this space
    const spaceState = spaceDecisions[spaceId];
    if (!spaceState) return false;

    // Count required decisions
    let requiredCount = 0;
    let madeCount = 0;

    projectRun.phases?.forEach(phase => {
      const alternateGroups = new Map<string, any>();
      phase.operations.forEach(operation => {
        const flowType = (operation as any).flowType || 'prime';
        if (flowType === 'alternate') {
          const groupKey = (operation as any).alternateGroup || 'choice-group';
          if (!alternateGroups.has(groupKey)) {
            alternateGroups.set(groupKey, true);
            requiredCount++;
            
            const decisions = spaceState.standardDecisions[phase.id] || [];
            if (decisions.some(d => d.startsWith(groupKey + ':'))) {
              madeCount++;
            }
          }
        }
      });
    });

    return requiredCount === 0 || madeCount === requiredCount;
  };

  if (spaces.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Please add spaces in the previous step to continue.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {spaces.map((space) => (
        <Card key={space.id} className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>{space.name}</span>
                {space.scaleValue && (
                  <Badge variant="outline" className="text-xs">
                    {space.scaleValue} {space.scaleUnit}
                  </Badge>
                )}
              </div>
              {isSpaceComplete(space.id) && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Make decisions for how this space will be completed
            </p>
          </CardHeader>
          <CardContent>
            <WorkflowDecisionEngine
              projectRun={projectRun}
              onStandardDecision={handleStandardDecision(space.id)}
              onIfNecessaryWork={handleIfNecessaryWork(space.id)}
              customizationState={getSpaceDecisionState(space.id)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
