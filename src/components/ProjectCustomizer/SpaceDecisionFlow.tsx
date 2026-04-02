import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { WorkflowDecisionEngine } from './WorkflowDecisionEngine';
import { ProjectRun } from '../../interfaces/ProjectRun';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

interface ProjectSpace {
  id: string;
  space_name: string; // Changed from 'name' to 'space_name' for clarity and consistency with database
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
  const { projects } = useProject();
  const [spaceSizingData, setSpaceSizingData] = useState<Map<string, Record<string, number>>>(new Map());

  // Get template project to access scaling unit and name
  const templateProject = projectRun?.projectId
    ? projects.find(p => p.id === projectRun.projectId)
    : null;
  const projectScaleUnit = templateProject?.scalingUnit?.replace('per ', '') || projectRun?.scalingUnit?.replace('per ', '') || 'item';
  const currentProjectName = templateProject?.name || projectRun.name || 'Current Project';

  // Extract unique incorporated phases with their scaling units
  const incorporatedPhases = useMemo(() => {
    const uniquePhases = new Map<string, { projectName: string; scalingUnit: string }>();
    
    projectRun.phases?.forEach((phase: any) => {
      if (phase.isLinked && phase.sourceProjectName && phase.sourceScalingUnit) {
        // Only add if not already in map (unique by project name)
        if (!uniquePhases.has(phase.sourceProjectName)) {
          // Normalize scaling unit (remove "per " prefix if present)
          const normalizedUnit = phase.sourceScalingUnit.startsWith('per ') 
            ? phase.sourceScalingUnit.replace('per ', '')
            : phase.sourceScalingUnit;
          
          uniquePhases.set(phase.sourceProjectName, {
            projectName: phase.sourceProjectName,
            scalingUnit: normalizedUnit
          });
        }
      }
    });
    
    return Array.from(uniquePhases.values());
  }, [projectRun.phases]);

  // Load sizing data for all spaces from project_run_spaces.sizing_by_unit
  useEffect(() => {
    const loadSizingData = async () => {
      if (spaces.length === 0) return;

      const spaceIds = spaces.map(s => s.id);
      const { data, error } = await supabase
        .from('project_run_spaces')
        .select('id, sizing_by_unit')
        .in('id', spaceIds);

      if (error) {
        console.error('Error loading sizing data:', error);
        return;
      }

      const sizingMap = new Map<string, Record<string, number>>();
      (data || []).forEach((row: { id: string; sizing_by_unit?: Record<string, number> | null }) => {
        const byUnit = row.sizing_by_unit && typeof row.sizing_by_unit === 'object' ? row.sizing_by_unit : {};
        sizingMap.set(row.id, byUnit as Record<string, number>);
      });

      setSpaceSizingData(sizingMap);
    };

    loadSizingData();
  }, [spaces.map(s => s.id).join(',')]);
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

  // Note: This component should always receive at least one space (default "Space 1")
  // The check below is kept as a safety fallback but should rarely be needed
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
                <span>{space.space_name}</span>
              </div>
              {isSpaceComplete(space.id) && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              )}
            </CardTitle>
            {(() => {
              const parts: string[] = [];
              const mainVal =
                space.scaleValue ??
                spaceSizingData.get(space.id)?.[projectScaleUnit] ??
                0;
              parts.push(`${currentProjectName} ${mainVal} ${projectScaleUnit}`);
              incorporatedPhases.forEach((phase) => {
                const spaceSizing = spaceSizingData.get(space.id) || {};
                const currentValue = spaceSizing[phase.scalingUnit];
                if (currentValue !== undefined && currentValue !== 0) {
                  parts.push(`${phase.projectName} ${currentValue} ${phase.scalingUnit}`);
                }
              });
              return (
                <p className="mt-2 border-t pt-2 text-left text-xs leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">Sizing — </span>
                  {parts.join(' · ')}
                </p>
              );
            })()}
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
