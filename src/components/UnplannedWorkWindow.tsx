import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Plus, GripVertical, Trash2, AlertTriangle, Layers, X } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Phase, Operation, WorkflowStep } from '@/interfaces/Project';

interface UnplannedWorkWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DraggedPhase extends Phase {
  sourceProjectId: string;
  sourceProjectName: string;
}

export const UnplannedWorkWindow: React.FC<UnplannedWorkWindowProps> = ({
  isOpen,
  onClose
}) => {
  const {
    currentProjectRun,
    updateProjectRun,
    projects
  } = useProject();

  const [selectedPhases, setSelectedPhases] = useState<Phase[]>([]);
  const [isManualPhaseDialogOpen, setIsManualPhaseDialogOpen] = useState(false);
  const [manualPhaseForm, setManualPhaseForm] = useState({
    name: '',
    description: ''
  });
  const [draggedItem, setDraggedItem] = useState<DraggedPhase | null>(null);
  const [draggedPhaseIndex, setDraggedPhaseIndex] = useState<number | null>(null);
  const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null);

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
    setDraggedPhaseIndex(null);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleSelectedPhaseDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPhaseIndex(index);
    setDraggedItem(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    if (draggedPhaseIndex !== null) {
      e.dataTransfer.dropEffect = 'move';
      setDropZoneIndex(targetIndex ?? null);
    } else {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    
    if (draggedPhaseIndex !== null) {
      // Reordering existing phase
      const newPhases = [...selectedPhases];
      const [draggedPhase] = newPhases.splice(draggedPhaseIndex, 1);
      
      const insertIndex = targetIndex !== undefined ? targetIndex : newPhases.length;
      newPhases.splice(insertIndex, 0, draggedPhase);
      
      setSelectedPhases(newPhases);
    } else if (draggedItem) {
      // Adding new phase from library
      const newPhase: Phase = {
        id: `${draggedItem.id}-${Date.now()}`,
        name: draggedItem.name,
        description: `${draggedItem.description} (from ${draggedItem.sourceProjectName})`,
        operations: draggedItem.operations
      };
      
      if (targetIndex !== undefined) {
        const newPhases = [...selectedPhases];
        newPhases.splice(targetIndex, 0, newPhase);
        setSelectedPhases(newPhases);
      } else {
        setSelectedPhases(prev => [...prev, newPhase]);
      }
    }
    
    setDraggedItem(null);
    setDraggedPhaseIndex(null);
    setDropZoneIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedPhaseIndex(null);
    setDropZoneIndex(null);
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

  const handleAddUnplannedWork = async () => {
    if (!currentProjectRun || selectedPhases.length === 0) return;

    // Add the selected phases to the current project run
    const updatedPhases = [...currentProjectRun.phases, ...selectedPhases];
    
    await updateProjectRun({
      ...currentProjectRun,
      phases: updatedPhases,
      updatedAt: new Date()
    });
    
    // Reset state and close
    setSelectedPhases([]);
    onClose();
  };

  const hasManualPhases = selectedPhases.some(phase => phase.id.startsWith('manual-'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Add Unplanned Work</DialogTitle>
              <DialogDescription>
                Add additional phases to handle unexpected work discovered during your project
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Phases Library */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Phase Library
              </CardTitle>
              <CardDescription>
                Drag phases from other projects to handle unplanned work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availablePhases.map(phase => (
                  <Card 
                    key={`${phase.sourceProjectId}-${phase.id}`} 
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow" 
                    draggable 
                    onDragStart={e => handleDragStart(e, phase)}
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
                  <Button variant="outline" className="w-full" onClick={() => setIsManualPhaseDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Phase
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Phase</DialogTitle>
                      <DialogDescription>
                        Create a custom phase for your specific unplanned work
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
                          onChange={e => setManualPhaseForm(prev => ({
                            ...prev,
                            name: e.target.value
                          }))} 
                          placeholder="Enter phase name" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="phase-description">Description</Label>
                        <Textarea 
                          id="phase-description" 
                          value={manualPhaseForm.description} 
                          onChange={e => setManualPhaseForm(prev => ({
                            ...prev,
                            description: e.target.value
                          }))} 
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
              <CardTitle>Unplanned Work Phases</CardTitle>
              <CardDescription>
                Phases to add to your project workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="space-y-1 min-h-64 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg transition-colors" 
                onDragOver={handleDragOver} 
                onDrop={handleDrop} 
                onDragEnd={handleDragEnd}
              >
                {/* Drop Zone before first phase */}
                <div 
                  className={`h-2 ${dropZoneIndex === 0 ? 'bg-blue-200 border-2 border-dashed border-blue-400' : ''} rounded transition-all duration-200`}
                  onDragOver={e => handleDragOver(e, 0)}
                  onDrop={e => handleDrop(e, 0)}
                />

                {/* Selected Phases */}
                {selectedPhases.map((phase, index) => (
                  <div key={phase.id}>
                    <Card 
                      className={`group cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedPhaseIndex === index ? 'opacity-50' : ''
                      }`} 
                      draggable 
                      onDragStart={e => handleSelectedPhaseDragStart(e, index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
                            <div className="flex-1">
                              <h4 className="font-medium">
                                {index + 1}. {phase.name}
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
                    
                    {/* Drop Zone after each phase */}
                    <div 
                      className={`h-2 ${dropZoneIndex === index + 1 ? 'bg-blue-200 border-2 border-dashed border-blue-400' : ''} rounded transition-all duration-200`}
                      onDragOver={e => handleDragOver(e, index + 1)}
                      onDrop={e => handleDrop(e, index + 1)}
                    />
                  </div>
                ))}

                {selectedPhases.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Drop phases here to add unplanned work</p>
                  </div>
                )}
              </div>

              {hasManualPhases && (
                <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Your unplanned work includes custom phases. These are not covered by our success guarantee.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddUnplannedWork} 
                  disabled={selectedPhases.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Unplanned Work
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};