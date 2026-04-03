import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, CheckCircle, HelpCircle } from 'lucide-react';
import { Phase, Operation } from '@/interfaces/Project';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface UserProjectCustomizerProps {
  phases: Phase[];
  onBack: () => void;
  onSave: (selections: CustomizationSelections) => void;
}

export interface CustomizationSelections {
  alternateChoices: Record<string, string>; // operationId -> chosen operation id
  ifNecessaryChoices: Record<string, boolean>; // operationId -> included or not
}

export const UserProjectCustomizer: React.FC<UserProjectCustomizerProps> = ({
  phases,
  onBack,
  onSave
}) => {
  const [selections, setSelections] = useState<CustomizationSelections>({
    alternateChoices: {},
    ifNecessaryChoices: {}
  });

  // Group operations by type
  const { alternateGroups, ifNecessaryOps } = useMemo(() => {
    const alternates = new Map<string, { prompt: string; operations: Operation[]; phaseId: string }>();
    const ifNecessary: Array<{ operation: Operation; phaseId: string; phaseName: string }> = [];

    phases.forEach(phase => {
      phase.operations.forEach(operation => {
        const flowType = operation.steps[0]?.flowType || 'prime';
        
        if (flowType === 'alternate') {
          const groupKey = (operation as any).alternateGroup || 'substrate-choice';
          if (!alternates.has(groupKey)) {
            alternates.set(groupKey, {
              prompt: (operation as any).userPrompt || 'Choose an option:',
              operations: [],
              phaseId: phase.id
            });
          }
          alternates.get(groupKey)!.operations.push(operation);
        } else if (flowType === 'if-necessary') {
          ifNecessary.push({
            operation,
            phaseId: phase.id,
            phaseName: phase.name
          });
        }
      });
    });

    return {
      alternateGroups: Array.from(alternates.entries()),
      ifNecessaryOps: ifNecessary
    };
  }, [phases]);

  const handleAlternateChoice = (groupKey: string, operationId: string) => {
    setSelections(prev => ({
      ...prev,
      alternateChoices: {
        ...prev.alternateChoices,
        [groupKey]: operationId
      }
    }));
  };

  const handleIfNecessaryToggle = (operationId: string, checked: boolean) => {
    setSelections(prev => ({
      ...prev,
      ifNecessaryChoices: {
        ...prev.ifNecessaryChoices,
        [operationId]: checked
      }
    }));
  };

  const handleSave = () => {
    onSave(selections);
      };

  const alternateDecisionsCount = alternateGroups.length;
  const alternateAnsweredCount = Object.keys(selections.alternateChoices).length;
  const ifNecessarySelectedCount = Object.values(selections.ifNecessaryChoices).filter(Boolean).length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold">Customize Your Project</h2>
              <p className="text-muted-foreground">Make decisions about your specific project needs</p>
            </div>
          </div>
          <Button 
            onClick={handleSave}
            disabled={alternateAnsweredCount < alternateDecisionsCount}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Save Selections
          </Button>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Required Decisions: {alternateAnsweredCount} / {alternateDecisionsCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Optional Work: {ifNecessarySelectedCount} selected</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Alternate Choices Section */}
          {alternateGroups.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Badge variant="destructive">Required</Badge>
                  Project Configuration
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  These decisions determine which path your project will follow
                </p>
              </div>

              {alternateGroups.map(([groupKey, group]) => (
                <Card key={groupKey} className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="text-base">{group.prompt}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={selections.alternateChoices[groupKey] || ''}
                      onValueChange={(value) => handleAlternateChoice(groupKey, value)}
                      className="space-y-3"
                    >
                      {group.operations.map(operation => (
                        <div key={operation.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value={operation.id} id={operation.id} className="mt-1" />
                          <Label htmlFor={operation.id} className="flex-1 cursor-pointer">
                            <div>
                              <p className="font-medium">{operation.name}</p>
                              {operation.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {operation.description}
                                </p>
                              )}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    
                    {selections.alternateChoices[groupKey] && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Selected: {group.operations.find(op => op.id === selections.alternateChoices[groupKey])?.name}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {alternateGroups.length > 0 && ifNecessaryOps.length > 0 && (
            <Separator />
          )}

          {/* If Necessary Section */}
          {ifNecessaryOps.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Badge variant="secondary">Optional</Badge>
                  Additional Work (If Necessary)
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Select any additional tasks that apply to your specific situation
                </p>
              </div>

              {ifNecessaryOps.map(({ operation, phaseId, phaseName }) => {
                const userPrompt = (operation as any).userPrompt;
                
                return (
                  <Card key={operation.id} className="border-l-4 border-l-gray-500">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={operation.id}
                          checked={selections.ifNecessaryChoices[operation.id] || false}
                          onCheckedChange={(checked) => handleIfNecessaryToggle(operation.id, checked as boolean)}
                          className="mt-1"
                        />
                        <Label htmlFor={operation.id} className="flex-1 cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{operation.name}</p>
                              {operation.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {operation.description}
                                </p>
                              )}
                              {userPrompt && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                                  <HelpCircle className="w-3 h-3 inline mr-1" />
                                  {userPrompt}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className="ml-4 text-xs">
                              {phaseName}
                            </Badge>
                          </div>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {alternateGroups.length === 0 && ifNecessaryOps.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No customization options available for this project
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
