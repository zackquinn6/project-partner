import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
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
      // Reordering existing new phase within the selectedPhases
      const newPhases = [...selectedPhases];
      const [draggedPhase] = newPhases.splice(draggedPhaseIndex, 1);
      
      const insertIndex = targetIndex !== undefined ? Math.min(targetIndex, newPhases.length) : newPhases.length;
      newPhases.splice(insertIndex, 0, draggedPhase);
      
      setSelectedPhases(newPhases);
    } else if (draggedItem) {
      // Adding new phase from library - insert into the project at the specified position
      const newPhase: Phase = {
        id: `${draggedItem.id}-${Date.now()}`,
        name: draggedItem.name,
        description: `${draggedItem.description} (from ${draggedItem.sourceProjectName})`,
        operations: draggedItem.operations
      };
      
      if (targetIndex !== undefined && currentProjectRun) {
        // Calculate valid insertion positions (after standard phases, before Close Project)
        const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering'];
        const standardPhaseCount = standardPhaseNames.filter(name => 
          currentProjectRun.phases.some((p: any) => p.name === name)
        ).length;
        
        const closeProjectIndex = currentProjectRun.phases.findIndex((p: any) => p.name === 'Close Project');
        const validInsertIndex = Math.max(standardPhaseCount, Math.min(targetIndex, closeProjectIndex >= 0 ? closeProjectIndex : currentProjectRun.phases.length));
        
        // Insert directly into project run phases
        const updatedPhases = [...currentProjectRun.phases];
        updatedPhases.splice(validInsertIndex, 0, newPhase);
        
        // Update the project run immediately
        updateProjectRun({
          ...currentProjectRun,
          phases: updatedPhases,
          updatedAt: new Date()
        });
      } else {
        // Add to selectedPhases list (these will be inserted at the end when confirmed)
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

    // Calculate insert position (before Close Project if it exists)
    const closeProjectIndex = currentProjectRun.phases.findIndex((p: any) => p.name === 'Close Project');
    const insertIndex = closeProjectIndex >= 0 ? closeProjectIndex : currentProjectRun.phases.length;

    // Insert the selected phases at the calculated position
    const updatedPhases = [...currentProjectRun.phases];
    updatedPhases.splice(insertIndex, 0, ...selectedPhases);
    
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
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={onClose}
      size="content-large"
      title="Add Unplanned Work"
      description="Add additional phases to handle unexpected work discovered during your project"
    >

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

          {/* Project Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Project Plan</CardTitle>
              <CardDescription>
                Current project phases - drop new phases to add them to your workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="space-y-1 min-h-64 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg transition-colors" 
                onDragOver={handleDragOver} 
                onDrop={handleDrop} 
                onDragEnd={handleDragEnd}
              >
                {/* Show current project phases with drop zones */}
                {currentProjectRun && currentProjectRun.phases.map((phase: any, index: number) => {
                  const isStandardPhase = ['Kickoff', 'Planning', 'Ordering', 'Close Project'].includes(phase.name);
                  const canDropBefore = !(['Kickoff', 'Planning', 'Ordering'].includes(phase.name));
                  const canDropAfter = !(phase.name === 'Close Project');
                  
                  return (
                    <div key={`phase-${phase.id}-${phase.name}-${index}`}>
                      {/* Drop Zone before each phase (only if allowed) */}
                      {canDropBefore && (
                        <div 
                          className={`h-2 ${dropZoneIndex === index ? 'bg-blue-200 border-2 border-dashed border-blue-400' : 'border border-dashed border-muted-foreground/20'} rounded transition-all duration-200`}
                          onDragOver={e => handleDragOver(e, index)}
                          onDrop={e => handleDrop(e, index)}
                        >
                          {dropZoneIndex === index && (
                            <div className="text-xs text-blue-600 text-center py-1">Drop new phase here</div>
                          )}
                        </div>
                      )}

                      {/* Existing Phase */}
                      <Card className={`border ${isStandardPhase ? 'border-blue-200 bg-blue-50' : 'border-muted bg-muted/50'}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={isStandardPhase ? "default" : "secondary"} className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="font-medium text-sm">{phase.name}</span>
                            {isStandardPhase && (
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                Standard
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground ml-auto">
                              {phase.operations?.length || 0} operation(s)
                            </div>
                          </div>
                          {phase.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {phase.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      {/* Drop Zone after each phase (only if allowed) */}
                      {canDropAfter && (
                        <div 
                          className={`h-2 ${dropZoneIndex === index + 1 ? 'bg-blue-200 border-2 border-dashed border-blue-400' : 'border border-dashed border-muted-foreground/20'} rounded transition-all duration-200`}
                          onDragOver={e => handleDragOver(e, index + 1)}
                          onDrop={e => handleDrop(e, index + 1)}
                        >
                          {dropZoneIndex === index + 1 && (
                            <div className="text-xs text-blue-600 text-center py-1">Drop new phase here</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Final drop zone at the end (before Close Project if it exists) */}
                {currentProjectRun && (
                  <div 
                    className={`h-4 ${dropZoneIndex === (currentProjectRun?.phases?.length || 0) ? 'bg-blue-200 border-2 border-dashed border-blue-400' : 'border border-dashed border-muted-foreground/30'} rounded transition-all duration-200`}
                    onDragOver={e => {
                      const closeProjectIndex = currentProjectRun.phases.findIndex((p: any) => p.name === 'Close Project');
                      const targetIndex = closeProjectIndex >= 0 ? closeProjectIndex : currentProjectRun.phases.length;
                      handleDragOver(e, targetIndex);
                    }}
                    onDrop={e => {
                      const closeProjectIndex = currentProjectRun.phases.findIndex((p: any) => p.name === 'Close Project');
                      const targetIndex = closeProjectIndex >= 0 ? closeProjectIndex : currentProjectRun.phases.length;
                      handleDrop(e, targetIndex);
                    }}
                  >
                    {(() => {
                      const closeProjectIndex = currentProjectRun.phases.findIndex((p: any) => p.name === 'Close Project');
                      const targetIndex = closeProjectIndex >= 0 ? closeProjectIndex : currentProjectRun.phases.length;
                      return dropZoneIndex === targetIndex ? (
                        <div className="text-xs text-blue-600 text-center py-2">Drop new phase here</div>
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          {closeProjectIndex >= 0 ? 'Add phases before Close Project' : 'Add phases to the end'}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Show selected/new phases that will be added */}
                {selectedPhases.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2 text-green-700">New Phases to Add:</h4>
                    {selectedPhases.map((phase, index) => (
                      <Card key={phase.id} className="mb-2 border-green-200 bg-green-50">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {phase.name}
                                  {phase.id.startsWith('manual-') && (
                                    <Badge variant="outline" className="ml-2 text-xs border-yellow-300 text-yellow-700">
                                      Custom
                                    </Badge>
                                  )}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {phase.description}
                                </p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemovePhase(phase.id)} 
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {!currentProjectRun?.phases?.length && selectedPhases.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Drop phases here to add to your project</p>
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
    </ResponsiveDialog>
  );
};