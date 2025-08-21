import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Plus, GripVertical, Trash2, AlertTriangle, Layers } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Phase, Operation, WorkflowStep } from '@/interfaces/Project';

interface ProjectCustomizationStepProps {
  onComplete: () => void;
  isCompleted: boolean;
}

interface DraggedPhase extends Phase {
  sourceProjectId: string;
  sourceProjectName: string;
}

export const ProjectCustomizationStep: React.FC<ProjectCustomizationStepProps> = ({
  onComplete,
  isCompleted
}) => {
  const { currentProjectRun, updateProjectRun, projects } = useProject();
  const [selectedPhases, setSelectedPhases] = useState<Phase[]>([]);
  const [isManualPhaseDialogOpen, setIsManualPhaseDialogOpen] = useState(false);
  const [manualPhaseForm, setManualPhaseForm] = useState({
    name: '',
    description: ''
  });
  const [draggedItem, setDraggedItem] = useState<DraggedPhase | null>(null);

  // Initialize with current phases (excluding kickoff)
  useEffect(() => {
    if (currentProjectRun) {
      const nonKickoffPhases = currentProjectRun.phases.filter(
        phase => phase.name !== 'Kickoff'
      );
      setSelectedPhases(nonKickoffPhases);
    }
  }, [currentProjectRun]);

  // Get available phases from other published projects
  const availablePhases: DraggedPhase[] = projects
    .filter(project => project.publishStatus === 'published' && project.id !== currentProjectRun?.templateId)
    .flatMap(project => 
      project.phases
        .filter(phase => phase.name !== 'Kickoff')
        .map(phase => ({
          ...phase,
          sourceProjectId: project.id,
          sourceProjectName: project.name
        }))
    );

  const handleDragStart = (e: React.DragEvent, phase: DraggedPhase) => {
    setDraggedItem(phase);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem) {
      // Create a new phase without the source metadata
      const newPhase: Phase = {
        id: `${draggedItem.id}-${Date.now()}`, // Unique ID for this instance
        name: draggedItem.name,
        description: `${draggedItem.description} (from ${draggedItem.sourceProjectName})`,
        operations: draggedItem.operations
      };
      
      setSelectedPhases(prev => [...prev, newPhase]);
      setDraggedItem(null);
    }
  };

  const handleRemovePhase = (phaseId: string) => {
    setSelectedPhases(prev => prev.filter(phase => phase.id !== phaseId));
  };

  const handleAddManualPhase = () => {
    if (!manualPhaseForm.name.trim()) return;

    const newPhase: Phase = {
      id: `manual-${Date.now()}`,
      name: manualPhaseForm.name,
      description: manualPhaseForm.description,
      operations: []
    };

    setSelectedPhases(prev => [...prev, newPhase]);
    setManualPhaseForm({ name: '', description: '' });
    setIsManualPhaseDialogOpen(false);
  };

  const handleSaveCustomization = async () => {
    if (!currentProjectRun) return;

    // Combine kickoff phase with selected phases
    const kickoffPhase = currentProjectRun.phases.find(phase => phase.name === 'Kickoff');
    const updatedPhases = kickoffPhase ? [kickoffPhase, ...selectedPhases] : selectedPhases;

    await updateProjectRun({
      ...currentProjectRun,
      phases: updatedPhases,
      updatedAt: new Date()
    });

    onComplete();
  };

  const hasManualPhases = selectedPhases.some(phase => phase.id.startsWith('manual-'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          Project Customization
          {isCompleted && <CheckCircle className="w-6 h-6 text-green-500" />}
        </h2>
        <Badge variant={isCompleted ? "default" : "secondary"}>
          {isCompleted ? "Completed" : "Customize Project"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Phases Library */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Phase Library
            </CardTitle>
            <CardDescription>
              Drag phases from other projects to customize your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availablePhases.map((phase) => (
                <Card
                  key={`${phase.sourceProjectId}-${phase.id}`}
                  className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, phase)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
                      <div className="flex-1">
                        <h4 className="font-medium">{phase.name}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {phase.description}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          from {phase.sourceProjectName}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {phase.operations.length} operation(s)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {availablePhases.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No additional phases available</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Dialog open={isManualPhaseDialogOpen} onOpenChange={setIsManualPhaseDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Phase
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Phase</DialogTitle>
                    <DialogDescription>
                      Create a custom phase for your specific needs
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <strong>Warning:</strong> Custom phases are not covered by our success guarantee. 
                      Use pre-built phases when possible for best results.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phase-name">Phase Name</Label>
                      <Input
                        id="phase-name"
                        value={manualPhaseForm.name}
                        onChange={(e) => setManualPhaseForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter phase name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phase-description">Description</Label>
                      <Textarea
                        id="phase-description"
                        value={manualPhaseForm.description}
                        onChange={(e) => setManualPhaseForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this phase involves"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setIsManualPhaseDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddManualPhase} disabled={!manualPhaseForm.name.trim()}>
                        Add Phase
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Selected Phases */}
        <Card>
          <CardHeader>
            <CardTitle>Your Project Workflow</CardTitle>
            <CardDescription>
              Phases in your customized project (drop zones are highlighted)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="space-y-3 min-h-64 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Kickoff Phase (always first and locked) */}
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-800">1. Kickoff</h4>
                      <p className="text-sm text-green-600">Required project initialization</p>
                      <Badge variant="secondary" className="mt-1 text-xs bg-green-100 text-green-800">
                        Required Phase
                      </Badge>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Selected Phases */}
              {selectedPhases.map((phase, index) => (
                <Card key={phase.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {index + 2}. {phase.name}
                          {phase.id.startsWith('manual-') && (
                            <Badge variant="outline" className="ml-2 text-xs border-yellow-300 text-yellow-700">
                              Custom
                            </Badge>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {phase.description}
                        </p>
                        <div className="text-xs text-muted-foreground mt-2">
                          {phase.operations.length} operation(s)
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePhase(phase.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {selectedPhases.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Drop phases here to customize your project</p>
                </div>
              )}
            </div>

            {hasManualPhases && (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Your project includes custom phases. These are not covered by our success guarantee.
                </AlertDescription>
              </Alert>
            )}

            {!isCompleted && (
              <Button onClick={handleSaveCustomization} className="w-full mt-4">
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Project Customization
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};