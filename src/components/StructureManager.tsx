import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Trash2, Edit, Check, X, GripVertical, FileOutput, Wrench, Package, Clipboard, ClipboardCheck, Save, ChevronDown, ChevronRight, Link, ExternalLink, ArrowLeft, GitBranch } from 'lucide-react';
import { FlowTypeSelector, getFlowTypeBadge } from './FlowTypeSelector';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OutputEditForm } from './OutputEditForm';
import { MultiContentEditor } from './MultiContentEditor';
import { MultiContentRenderer } from './MultiContentRenderer';
import { DecisionTreeFlowchart } from './DecisionTreeFlowchart';
import { DecisionPointEditor } from './DecisionPointEditor';
import { PhaseIncorporationDialog } from './PhaseIncorporationDialog';
import { DecisionTreeManager } from './DecisionTreeManager';
import { enforceStandardPhaseOrdering } from '@/utils/phaseOrderingUtils';
interface StructureManagerProps {
  onBack: () => void;
}
interface ClipboardData {
  type: 'phase' | 'operation' | 'step';
  data: Phase | Operation | WorkflowStep;
}
export const StructureManager: React.FC<StructureManagerProps> = ({
  onBack
}) => {
  const {
    currentProject,
    updateProject
  } = useProject();
  
  // Detect if editing Standard Project Foundation
  const isEditingStandardProject = currentProject?.id === '00000000-0000-0000-0000-000000000001' || currentProject?.isStandardTemplate;
  
  // Helper to check if a phase is standard by name
  const isStandardPhase = (phaseName: string) => {
    return ['Kickoff', 'Planning', 'Ordering', 'Close Project'].includes(phaseName);
  };
  const [editingItem, setEditingItem] = useState<{
    type: 'phase' | 'operation' | 'step';
    id: string;
    data: any;
  } | null>(null);
  const [showOutputEdit, setShowOutputEdit] = useState<{
    stepId: string;
    output?: Output;
  } | null>(null);
  const [showToolsMaterialsEdit, setShowToolsMaterialsEdit] = useState<{
    stepId: string;
    type: 'tools' | 'materials';
  } | null>(null);
  const [showStepContentEdit, setShowStepContentEdit] = useState<{
    stepId: string;
    step: WorkflowStep;
  } | null>(null);
  const [showDecisionTreeView, setShowDecisionTreeView] = useState(false);
  const [showDecisionTreeManager, setShowDecisionTreeManager] = useState(false);
  const [showDecisionEditor, setShowDecisionEditor] = useState<{
    step: WorkflowStep;
  } | null>(null);
  const [showIncorporationDialog, setShowIncorporationDialog] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [oneTimeCorrectionApplied, setOneTimeCorrectionApplied] = useState(false);

  // Collapsible state
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  // One-time correction for phase ordering and duplicate IDs
  useEffect(() => {
    if (!currentProject || oneTimeCorrectionApplied) return;
    
    let needsCorrection = false;
    const phases = currentProject.phases;
    
    // Check for duplicate IDs
    const seenIds = new Set<string>();
    const duplicateIds = phases.filter(phase => {
      if (seenIds.has(phase.id)) return true;
      seenIds.add(phase.id);
      return false;
    });
    
    if (duplicateIds.length > 0) {
      console.log('🔧 One-time correction: Found duplicate phase IDs:', duplicateIds.map(p => p.id));
      needsCorrection = true;
    }
    
    // Check phase ordering
    const standardPhases = phases.filter(p => ['Kickoff', 'Planning', 'Ordering', 'Close Project'].includes(p.name) && !p.isLinked);
    const kickoff = standardPhases.find(p => p.name === 'Kickoff');
    const planning = standardPhases.find(p => p.name === 'Planning'); 
    const ordering = standardPhases.find(p => p.name === 'Ordering');
    const closeProject = standardPhases.find(p => p.name === 'Close Project');
    
    const kickoffIndex = kickoff ? phases.findIndex(p => p.id === kickoff.id) : -1;
    const planningIndex = planning ? phases.findIndex(p => p.id === planning.id) : -1;
    const orderingIndex = ordering ? phases.findIndex(p => p.id === ordering.id) : -1;
    const closeProjectIndex = closeProject ? phases.findIndex(p => p.id === closeProject.id) : -1;
    
    if ((kickoffIndex > planningIndex && planningIndex !== -1) || 
        (planningIndex > orderingIndex && orderingIndex !== -1) ||
        (closeProjectIndex !== -1 && closeProjectIndex !== phases.length - 1)) {
      console.log('🔧 One-time correction: Found phases out of order');
      needsCorrection = true;
    }
    
    if (needsCorrection) {
      console.log('🔧 Applying one-time correction to phase structure...');
      
      // Fix duplicate IDs by regenerating them
      const correctedPhases = phases.map((phase, index) => {
        const duplicateCount = phases.slice(0, index).filter(p => p.id === phase.id).length;
        if (duplicateCount > 0) {
          return {
            ...phase,
            id: `${phase.id}-corrected-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
        }
        return phase;
      });
      
      // Apply standard phase ordering
      const orderedPhases = enforceStandardPhaseOrdering(correctedPhases);
      
      const updatedProject = {
        ...currentProject,
        phases: orderedPhases,
        updatedAt: new Date()
      };
      
      updateProject(updatedProject);
      toast.success('Phase structure corrected - standard phases are now properly ordered');
    }
    
    setOneTimeCorrectionApplied(true);
  }, [currentProject, oneTimeCorrectionApplied, updateProject]);
  
  if (!currentProject) {
    return <div>No project selected</div>;
  }

  // Get phases directly from project and ensure no duplicates
  const deduplicatePhases = (phases: Phase[]): Phase[] => {
    console.log('🔍 Deduplicating phases. Input count:', phases.length);
    const seen = new Set<string>();
    const result: Phase[] = [];
    for (const phase of phases) {
      // Use ID for deduplication instead of name to allow multiple phases with same name but different IDs
      const key = phase.isLinked ? `${phase.id}-${phase.sourceProjectId}` : phase.id;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(phase);
      } else {
        console.log('🔍 Duplicate phase filtered out:', phase.name, 'Key:', key);
      }
    }
    console.log('🔍 Deduplicated phases. Output count:', result.length);
    return result;
  };
  const displayPhases = deduplicatePhases(currentProject?.phases || []);
  console.log('🔍 Display phases count:', displayPhases.length);

  // Toggle functions for collapsible sections
  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };
  const toggleOperationExpansion = (operationId: string) => {
    setExpandedOperations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  };

  // Initialize all phases and operations as collapsed by default
  // No useEffect needed - they start collapsed with empty Sets

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !currentProject) return;
    const {
      source,
      destination,
      type
    } = result;
    if (source.index === destination.index && source.droppableId === destination.droppableId) {
      return;
    }

    if (type === 'phases') {
      // If editing Standard Project, don't allow any phase reordering
      if (isEditingStandardProject) {
        toast.error('Cannot reorder phases in Standard Project. Use position rules to control phase positioning.');
        return;
      }
      
      // Get phase being moved
      const sourcePhase = displayPhases[source.index];
      const destinationPhase = displayPhases[destination.index];
      
      const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
      const isSourceStandard = standardPhaseNames.includes(sourcePhase?.name || '') && !sourcePhase?.isLinked;
      const isDestinationStandard = standardPhaseNames.includes(destinationPhase?.name || '') && !destinationPhase?.isLinked;
      
      // Prevent moving standard phases or moving phases to standard phase positions
      if (isSourceStandard) {
        toast.error(`Cannot move standard phase "${sourcePhase.name}". Standard phases must remain in their fixed positions.`);
        return;
      }

      // Define required positions for standard phases
      const kickoffIndex = displayPhases.findIndex(p => p.name === 'Kickoff' && !p.isLinked);
      const planningIndex = displayPhases.findIndex(p => p.name === 'Planning' && !p.isLinked);
      const orderingIndex = displayPhases.findIndex(p => p.name === 'Ordering' && !p.isLinked);
      const closeProjectIndex = displayPhases.findIndex(p => p.name === 'Close Project' && !p.isLinked);

      // Prevent moving non-standard phases into standard phase positions
      const standardPositions = [kickoffIndex, planningIndex, orderingIndex, closeProjectIndex].filter(i => i !== -1);
      if (standardPositions.includes(destination.index)) {
        toast.error('Cannot move phases into standard phase positions. Standard phases must remain in order: Kickoff → Planning → Ordering → [Custom Phases] → Close Project');
        return;
      }

      // Only allow reordering of non-standard phases
      const updatedProject = { ...currentProject };
      const newPhases = Array.from(updatedProject.phases);
      const [removed] = newPhases.splice(source.index, 1);
      newPhases.splice(destination.index, 0, removed);
      
      // Verify the result maintains standard phase ordering
      const finalPhases = newPhases;
      const finalKickoffIndex = finalPhases.findIndex(p => p.name === 'Kickoff' && !p.isLinked);
      const finalPlanningIndex = finalPhases.findIndex(p => p.name === 'Planning' && !p.isLinked);
      const finalOrderingIndex = finalPhases.findIndex(p => p.name === 'Ordering' && !p.isLinked);
      const finalCloseProjectIndex = finalPhases.findIndex(p => p.name === 'Close Project' && !p.isLinked);
      
      // Validate ordering
      if (finalKickoffIndex !== -1 && finalPlanningIndex !== -1 && finalKickoffIndex > finalPlanningIndex) {
        toast.error('Invalid ordering: Kickoff must come before Planning');
        return;
      }
      if (finalPlanningIndex !== -1 && finalOrderingIndex !== -1 && finalPlanningIndex > finalOrderingIndex) {
        toast.error('Invalid ordering: Planning must come before Ordering');
        return;
      }
      if (finalCloseProjectIndex !== -1) {
        const hasPhaseAfterClose = finalPhases.slice(finalCloseProjectIndex + 1).some(p => true);
        if (hasPhaseAfterClose) {
          toast.error('Invalid ordering: Close Project must be the last phase');
          return;
        }
      }

      updatedProject.phases = newPhases;
      updateProject(updatedProject);
      toast.success('Phase reordered successfully');

    } else if (type === 'operations') {
      const phaseId = source.droppableId.split('-')[1];
      const phase = displayPhases.find(p => p.id === phaseId);
      
      // Allow reordering operations (including custom operations in standard phases)
      // Standard operations remain locked by their isStandard flag
      
      const updatedProject = { ...currentProject };
      const phaseIndex = currentProject.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const operations = Array.from(currentProject.phases[phaseIndex].operations);
        const [removed] = operations.splice(source.index, 1);
        operations.splice(destination.index, 0, removed);
        updatedProject.phases[phaseIndex].operations = operations;
        updateProject(updatedProject);
        toast.success('Operation reordered successfully');
      }
    } else if (type === 'steps') {
      const [phaseId, operationId] = source.droppableId.split('-').slice(1);
      // Allow reordering steps (including custom steps in standard phases)
      // Standard steps remain locked by their isStandard flag
      
      const updatedProject = { ...currentProject };
      const phaseIndex = currentProject.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex !== -1) {
        const operationIndex = currentProject.phases[phaseIndex].operations.findIndex(o => o.id === operationId);
        if (operationIndex !== -1) {
          const steps = Array.from(currentProject.phases[phaseIndex].operations[operationIndex].steps);
          const [removed] = steps.splice(source.index, 1);
          steps.splice(destination.index, 0, removed);
          updatedProject.phases[phaseIndex].operations[operationIndex].steps = steps;
          updateProject(updatedProject);
          toast.success('Step reordered successfully');
        }
      }
    }
  };

  // Copy/Paste functionality
  const copyItem = (type: 'phase' | 'operation' | 'step', data: Phase | Operation | WorkflowStep) => {
    setClipboard({
      type,
      data: JSON.parse(JSON.stringify(data))
    });
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} copied to clipboard`);
  };
  const pasteItem = (targetType: 'phase' | 'operation' | 'step', targetLocation?: {
    phaseId?: string;
    operationId?: string;
  }) => {
    if (!clipboard || !currentProject) return;
    const updatedProject = {
      ...currentProject
    };
    const newId = `${clipboard.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (clipboard.type === 'phase' && targetType === 'phase') {
      const newPhase = {
        ...(clipboard.data as Phase),
        id: newId,
        name: `${(clipboard.data as Phase).name} (Copy)`
      };
      updatedProject.phases.push(newPhase);
    } else if (clipboard.type === 'operation' && targetType === 'operation' && targetLocation?.phaseId) {
      const phaseIndex = updatedProject.phases.findIndex(p => p.id === targetLocation.phaseId);
      if (phaseIndex !== -1) {
        const newOperation = {
          ...(clipboard.data as Operation),
          id: newId,
          name: `${(clipboard.data as Operation).name} (Copy)`
        };
        updatedProject.phases[phaseIndex].operations.push(newOperation);
      }
    } else if (clipboard.type === 'step' && targetType === 'step' && targetLocation?.phaseId && targetLocation?.operationId) {
      const phaseIndex = updatedProject.phases.findIndex(p => p.id === targetLocation.phaseId);
      if (phaseIndex !== -1) {
        const operationIndex = updatedProject.phases[phaseIndex].operations.findIndex(o => o.id === targetLocation.operationId);
        if (operationIndex !== -1) {
          const newStep = {
            ...(clipboard.data as WorkflowStep),
            id: newId,
            step: `${(clipboard.data as WorkflowStep).step} (Copy)`
          };
          updatedProject.phases[phaseIndex].operations[operationIndex].steps.push(newStep);
        }
      }
    }
    updateProject(updatedProject);
    toast.success('Item pasted successfully');
  };

  // CRUD operations
  const addPhase = () => {
    if (!currentProject) return;
    const newPhase: Phase = {
      id: `phase-${Date.now()}`,
      name: 'New Phase',
      description: 'Phase description',
      operations: [],
      isLinked: false
    };
    
    // Add new phase and enforce standard phase ordering
    const phasesWithNew = [...currentProject.phases, newPhase];
    const orderedPhases = enforceStandardPhaseOrdering(phasesWithNew);
    
    const updatedProject = {
      ...currentProject,
      phases: orderedPhases,
      updatedAt: new Date()
    };
    updateProject(updatedProject);
  };

  const handleIncorporatePhase = (incorporatedPhase: Phase & { sourceProjectId: string; sourceProjectName: string; incorporatedRevision: number }) => {
    if (!currentProject) return;

    console.log('🔍 Incorporating phase:', incorporatedPhase);
    console.log('🔍 Current project phases:', currentProject.phases.length);

    // Check if incorporating from same project
    if (incorporatedPhase.sourceProjectId === currentProject.id) {
      console.warn('⚠️ Warning: Incorporating phase from same project');
    }

    // Check for duplicate phase names
    const existingPhaseNames = currentProject.phases.map(p => p.name);
    if (existingPhaseNames.includes(incorporatedPhase.name)) {
      console.warn('⚠️ Warning: Phase with same name already exists:', incorporatedPhase.name);
    }

    // Generate new ID to avoid conflicts
    const newPhaseId = `linked-phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const linkedPhase: Phase = {
      ...incorporatedPhase,
      id: newPhaseId, // Use new ID to avoid conflicts
      isLinked: true,
      sourceProjectId: incorporatedPhase.sourceProjectId,
      sourceProjectName: incorporatedPhase.sourceProjectName,
      incorporatedRevision: incorporatedPhase.incorporatedRevision
    };

    console.log('🔍 Created linked phase:', linkedPhase);

    // Add linked phase and enforce standard phase ordering
    const phasesWithLinked = [...currentProject.phases, linkedPhase];
    const orderedPhases = enforceStandardPhaseOrdering(phasesWithLinked);

    const updatedProject = {
      ...currentProject,
      phases: orderedPhases,
      updatedAt: new Date()
    };

    console.log('🔍 Updated project phases count:', updatedProject.phases.length);

    updateProject(updatedProject);
  };
  const addOperation = (phaseId: string) => {
    if (!currentProject) return;

    // Check if this is a standard phase
    const phase = displayPhases.find(p => p.id === phaseId);
    
    // Allow adding custom operations to standard phases in project templates
    // (Standard Project itself still restricts, but individual templates can add custom work)
    const newOperation: Operation = {
      id: `operation-${Date.now()}`,
      name: 'New Custom Operation',
      description: 'Custom operation description',
      steps: [],
      isStandard: false // Mark as custom operation
    };
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: [...phase.operations, newOperation]
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success(phase?.isStandard 
      ? 'Custom operation added to standard phase' 
      : 'Operation added successfully');
  };
  const addStep = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    
    // Check if this is a standard phase
    const phase = displayPhases.find(p => p.id === phaseId);
    
    // Allow adding custom steps to standard phases in project templates
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      step: 'New Custom Step',
      description: 'Custom step description',
      contentType: 'text',
      content: '',
      materials: [],
      tools: [],
      outputs: [],
      contentSections: [],
      flowType: 'prime',
      isStandard: false // Mark as custom step
    };
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: phase.operations.map(operation => operation.id === operationId ? {
          ...operation,
          steps: [...operation.steps, newStep]
        } : operation)
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success(phase?.isStandard 
      ? 'Custom step added to standard phase' 
      : 'Step added successfully');
  };

  // Delete operations
  const deletePhase = (phaseId: string) => {
    if (!currentProject) return;

    // Check if this is a standard phase
    const phase = displayPhases.find(p => p.id === phaseId);
    
    // Prevent deleting standard phases in non-standard projects
    if (!isEditingStandardProject && phase?.isStandard) {
      toast.error('Cannot delete standard phases. Standard phases are read-only in this project.');
      return;
    }
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.filter(phase => phase.id !== phaseId),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success('Phase deleted');
  };
  const deleteOperation = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    
    const phase = currentProject.phases.find(p => p.id === phaseId);
    const operation = phase?.operations.find(op => op.id === operationId);
    
    // Prevent deleting standard operations (but allow deleting custom operations in standard phases)
    if (!isEditingStandardProject && operation?.isStandard) {
      toast.error('Cannot delete standard operations. Only custom operations can be deleted.');
      return;
    }
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: phase.operations.filter(op => op.id !== operationId)
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success('Operation deleted');
  };
  const deleteStep = (phaseId: string, operationId: string, stepId: string) => {
    if (!currentProject) return;
    
    const phase = currentProject.phases.find(p => p.id === phaseId);
    const operation = phase?.operations.find(op => op.id === operationId);
    const step = operation?.steps.find(s => s.id === stepId);
    
    // Prevent deleting standard steps (but allow deleting custom steps in standard phases)
    if (!isEditingStandardProject && step?.isStandard) {
      toast.error('Cannot delete standard steps. Only custom steps can be deleted.');
      return;
    }
    
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: phase.operations.map(operation => operation.id === operationId ? {
          ...operation,
          steps: operation.steps.filter(step => step.id !== stepId)
        } : operation)
      } : phase),
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success('Step deleted');
  };

  // Edit operations
  const startEdit = (type: 'phase' | 'operation' | 'step', id: string, data: any) => {
    // Check if trying to edit standard content
    if (!isEditingStandardProject) {
      if (type === 'phase') {
        const phase = displayPhases.find(p => p.id === id);
        if (phase?.isStandard) {
          toast.error('Cannot edit standard phases. Standard phases are read-only in this project.');
          return;
        }
      } else if (type === 'operation') {
        // Check if this operation is marked as standard
        if (data?.isStandard) {
          toast.error('Cannot edit standard operations. Only custom operations can be edited.');
          return;
        }
      } else if (type === 'step') {
        // Check if this step is marked as standard
        if (data?.isStandard) {
          toast.error('Cannot edit standard steps. Only custom steps can be edited.');
          return;
        }
      }
    }
    
    setEditingItem({
      type,
      id,
      data: {
        ...data
      }
    });
  };
  const saveEdit = () => {
    if (!editingItem || !currentProject) return;
    const updatedProject = {
      ...currentProject
    };
    if (editingItem.type === 'phase') {
      const phaseIndex = updatedProject.phases.findIndex(p => p.id === editingItem.id);
      if (phaseIndex !== -1) {
        updatedProject.phases[phaseIndex] = {
          ...updatedProject.phases[phaseIndex],
          ...editingItem.data
        };
      }
    } else if (editingItem.type === 'operation') {
      for (const phase of updatedProject.phases) {
        const operationIndex = phase.operations.findIndex(o => o.id === editingItem.id);
        if (operationIndex !== -1) {
          phase.operations[operationIndex] = {
            ...phase.operations[operationIndex],
            ...editingItem.data
          };
          break;
        }
      }
    } else if (editingItem.type === 'step') {
      for (const phase of updatedProject.phases) {
        for (const operation of phase.operations) {
          const stepIndex = operation.steps.findIndex(s => s.id === editingItem.id);
          if (stepIndex !== -1) {
            operation.steps[stepIndex] = {
              ...operation.steps[stepIndex],
              ...editingItem.data
            };
            break;
          }
        }
      }
    }
    updatedProject.updatedAt = new Date();
    updateProject(updatedProject);
    setEditingItem(null);
    toast.success(`${editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)} updated`);
  };

  // Get all available steps for decision point linking
  const getAllAvailableSteps = () => {
    const steps: {
      id: string;
      name: string;
      phaseId: string;
      operationId: string;
    }[] = [];
    displayPhases.forEach(phase => {
      phase.operations.forEach(operation => {
        operation.steps.forEach(step => {
          steps.push({
            id: step.id,
            name: step.step,
            phaseId: phase.id,
            operationId: operation.id
          });
        });
      });
    });
    return steps;
  };
  const handleDecisionEditorSave = (updatedStep: WorkflowStep) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject
    };

    // Find and update the step
    for (const phase of updatedProject.phases) {
      for (const operation of phase.operations) {
        const stepIndex = operation.steps.findIndex(s => s.id === updatedStep.id);
        if (stepIndex !== -1) {
          operation.steps[stepIndex] = updatedStep;
          updatedProject.updatedAt = new Date();
          updateProject(updatedProject);
          return;
        }
      }
    }
  };
  if (showDecisionTreeView) {
    return <DecisionTreeFlowchart phases={displayPhases} onBack={() => setShowDecisionTreeView(false)} onUpdatePhases={updatedPhases => {
      if (currentProject) {
        // Filter out standard phases and update only user phases
        const userPhases = updatedPhases.slice(3);
        const updatedProject = {
          ...currentProject,
          phases: userPhases,
          updatedAt: new Date()
        };
        updateProject(updatedProject);
      }
    }} />;
  }
  return <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Structure Manager</h2>
              <p className="text-muted-foreground">Drag and drop to reorder, copy/paste to duplicate</p>
            </div>
            <div className="flex items-center gap-2">
              {clipboard && <Badge variant="outline" className="flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  {clipboard.type} copied
                </Badge>}
                <Button variant="outline" size="sm" onClick={() => setShowDecisionTreeManager(true)} className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Decision Tree Manager
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowIncorporationDialog(true)} className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Incorporate Phase
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExpandedPhases(expandedPhases.size === displayPhases.length ? new Set() : new Set(displayPhases.map(p => p.id)))} className="flex items-center gap-2">
                 {expandedPhases.size === displayPhases.length ? <>
                     <ChevronRight className="w-4 h-4" />
                     Collapse All
                   </> : <>
                     <ChevronDown className="w-4 h-4" />
                     Expand All
                   </>}
               </Button>
              <Button size="sm" onClick={addPhase} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Phase
              </Button>
              <Button size="sm" onClick={onBack} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Done Editing
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="container mx-auto px-6 py-8">
          <Droppable droppableId="phases" type="phases">
            {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {displayPhases.map((phase, phaseIndex) => {
                const standardPhaseNames = ['Kickoff', 'Planning', 'Ordering', 'Close Project'];
                // Check if editing Standard Project Foundation OR if this is a standard phase in any project
                const isStandardPhase = (standardPhaseNames.includes(phase.name) && !phase.isLinked) || 
                                       (isEditingStandardProject && standardPhaseNames.includes(phase.name));
                const isLinkedPhase = phase.isLinked;
                const isEditing = editingItem?.type === 'phase' && editingItem.id === phase.id;
                
                // Prevent dragging of standard phases
                const isDragDisabled = isStandardPhase;
                
                return <Draggable key={phase.id} draggableId={phase.id} index={phaseIndex} isDragDisabled={isDragDisabled}>
                      {(provided, snapshot) => <Card ref={provided.innerRef} {...provided.draggableProps} className={`border-2 ${snapshot.isDragging ? 'shadow-lg' : ''} ${isStandardPhase ? 'bg-blue-50 border-blue-200' : isLinkedPhase ? 'bg-purple-50 border-purple-200' : ''}`}>
                          <CardHeader className="py-1 px-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 flex-1">
                                {!isStandardPhase && <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                                  </div>}
                                {isStandardPhase && <div className="w-3" />}
                                
                                {isEditing ? <div className="flex-1 space-y-1">
                                    <Input value={editingItem.data.name} onChange={e => setEditingItem({
                              ...editingItem,
                              data: {
                                ...editingItem.data,
                                name: e.target.value
                              }
                            })} placeholder="Phase name" className="text-xs h-6" />
                                    <Textarea value={editingItem.data.description} onChange={e => setEditingItem({
                              ...editingItem,
                              data: {
                                ...editingItem.data,
                                description: e.target.value
                              }
                            })} placeholder="Phase description" rows={1} className="text-xs" />
                                  </div> : <div className="flex-1">
                                      <CardTitle className="flex items-center gap-1 text-xs">
                                        <Button variant="ghost" size="sm" onClick={() => togglePhaseExpansion(phase.id)} className="p-0.5 h-auto">
                                          {expandedPhases.has(phase.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </Button>
                                        {isStandardPhase && <span className="mr-1">🔒</span>}
                                        {phase.name}
                                        {isStandardPhase && <span className="text-xs text-blue-600 ml-1">(Standard - Locked)</span>}
                                        {isLinkedPhase && (
                                          <div className="flex items-center gap-1 ml-1">
                                            <Link className="w-3 h-3 text-purple-600" />
                                            <span className="text-xs text-purple-600">Linked</span>
                                          </div>
                                        )}
                                      </CardTitle>
                                     <p className="text-muted-foreground text-xs">{phase.description}</p>
                                     {isLinkedPhase && (
                                       <p className="text-xs text-purple-600">
                                         From: {phase.sourceProjectName} (Rev {phase.incorporatedRevision})
                                       </p>
                                     )}
                                   </div>}
                              </div>
                              
                               <div className="flex items-center gap-2">
                                <Badge variant="outline">{phase.operations.length} operations</Badge>
                                
                                {!isStandardPhase && !isLinkedPhase && <>
                                    <Button size="sm" variant="ghost" onClick={() => copyItem('phase', phase)}>
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    
                                    {clipboard?.type === 'phase' && <Button size="sm" variant="ghost" onClick={() => pasteItem('phase')}>
                                        <Clipboard className="w-4 h-4" />
                                      </Button>}
                                    
                                    {isEditing ? <>
                                        <Button size="sm" onClick={saveEdit}>
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </> : <>
                                        <Button size="sm" variant="ghost" onClick={() => startEdit('phase', phase.id, phase)}>
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        
                                        <Button size="sm" variant="ghost" onClick={() => deletePhase(phase.id)}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>}
                                  </>}
                                
                              </div>
                            </div>
                           </CardHeader>
                           
                           <Collapsible open={expandedPhases.has(phase.id)}>
                             <CollapsibleContent>
                               <CardContent>
                              <div className="flex items-center gap-2 mb-4">
                                  <Button size="sm" onClick={() => addOperation(phase.id)} className="flex items-center gap-2">
                                    <Plus className="w-3 h-3" />
                                    Add Operation
                                  </Button>
                              </div>
                            
                            <Droppable droppableId={`operations-${phase.id}`} type="operations">
                              {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                  {phase.operations.map((operation, operationIndex) => {
                                const isOperationEditing = editingItem?.type === 'operation' && editingItem.id === operation.id;
                                return <Draggable key={operation.id} draggableId={operation.id} index={operationIndex} isDragDisabled={isStandardPhase || phase.name === 'Close Project'}>
                                        {(provided, snapshot) => <Card ref={provided.innerRef} {...provided.draggableProps} className={`ml-6 ${snapshot.isDragging ? 'shadow-lg' : ''} ${isStandardPhase ? 'bg-muted/20' : ''}`}>
                                            <CardHeader className="pb-3">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                  {!isStandardPhase && phase.name !== 'Close Project' && <div {...provided.dragHandleProps}>
                                                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                                    </div>}
                                                  
                                                  {isOperationEditing ? <div className="flex-1 space-y-2">
                                                      <Input value={editingItem.data.name} onChange={e => setEditingItem({
                                              ...editingItem,
                                              data: {
                                                ...editingItem.data,
                                                name: e.target.value
                                              }
                                            })} placeholder="Operation name" className="text-sm" />
                                                      <Textarea value={editingItem.data.description} onChange={e => setEditingItem({
                                              ...editingItem,
                                              data: {
                                                ...editingItem.data,
                                                description: e.target.value
                                              }
                                            })} placeholder="Operation description" rows={1} className="text-sm" />
                                                    </div> : <div className="flex-1">
                                                       <h4 className="font-medium text-sm flex items-center gap-2">
                                                         <Button variant="ghost" size="sm" onClick={() => toggleOperationExpansion(operation.id)} className="p-1 h-auto">
                                                           {expandedOperations.has(operation.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                         </Button>
                                                         {operation.name}
                                                         {operation.isStandard && !isEditingStandardProject && (
                                                           <Badge variant="secondary" className="text-xs">Standard 🔒</Badge>
                                                         )}
                                                         {!operation.isStandard && phase.isStandard && (
                                                           <Badge variant="outline" className="text-xs bg-blue-50">Custom</Badge>
                                                         )}
                                                       </h4>
                                                       <p className="text-muted-foreground text-xs">{operation.description}</p>
                                                     </div>}
                                                </div>
                                                
                                                <div className="flex items-center gap-1">
                                                  <Badge variant="outline" className="text-xs">{operation.steps.length} steps</Badge>
                                                  
                                                  {!isStandardPhase && phase.name !== 'Close Project' && <>
                                                      <Button size="sm" variant="ghost" onClick={() => copyItem('operation', operation)}>
                                                        <Copy className="w-3 h-3" />
                                                      </Button>
                                                      
                                                      {clipboard?.type === 'operation' && <Button size="sm" variant="ghost" onClick={() => pasteItem('operation', {
                                              phaseId: phase.id
                                            })}>
                                                          <Clipboard className="w-3 h-3" />
                                                        </Button>}
                                                      
                                                      {isOperationEditing ? <>
                                                          <Button size="sm" onClick={saveEdit}>
                                                            <Check className="w-3 h-3" />
                                                          </Button>
                                                          <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                                            <X className="w-3 h-3" />
                                                          </Button>
                                                        </> : <>
                                                          <Button size="sm" variant="ghost" onClick={() => startEdit('operation', operation.id, operation)} disabled={operation.isStandard && !isEditingStandardProject}>
                                                            <Edit className="w-3 h-3" />
                                                          </Button>
                                                          {phase.name !== 'Close Project' && <Button size="sm" variant="ghost" onClick={() => deleteOperation(phase.id, operation.id)} disabled={operation.isStandard && !isEditingStandardProject}>
                                                              <Trash2 className="w-3 h-3" />
                                                            </Button>}
                                                        </>}
                                                    </>}
                                                </div>
                                              </div>
                                             </CardHeader>
                                             
                                             <Collapsible open={expandedOperations.has(operation.id)}>
                                               <CollapsibleContent>
                                                 <CardContent className="pt-0">
                                               <div className="flex items-center gap-2 mb-3">
                                                 <Button size="sm" variant="outline" onClick={() => addStep(phase.id, operation.id)} className="flex items-center gap-1 text-xs">
                                                   <Plus className="w-3 h-3" />
                                                   Add Step
                                                 </Button>
                                               </div>
                                              
                                              <Droppable droppableId={`steps-${phase.id}-${operation.id}`} type="steps">
                                                {provided => <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                                    {operation.steps.map((step, stepIndex) => {
                                                const isStepEditing = editingItem?.type === 'step' && editingItem.id === step.id;
                                                return <Draggable key={step.id} draggableId={step.id} index={stepIndex} isDragDisabled={isStandardPhase || phase.name === 'Close Project'}>
                                                          {(provided, snapshot) => <Card ref={provided.innerRef} {...provided.draggableProps} className={`ml-4 ${snapshot.isDragging ? 'shadow-lg' : ''} ${isStandardPhase ? 'bg-muted/10' : ''}`}>
                                                              <CardContent className="p-3">
                                                                <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-2 flex-1">
                                                                    {!isStandardPhase && phase.name !== 'Close Project' && <div {...provided.dragHandleProps}>
                                                                        <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                                                                      </div>}
                                                                    
                                                                     {isStepEditing ? <div className="flex-1 space-y-2">
                                                                         <Input value={editingItem.data.step} onChange={e => setEditingItem({
                                                              ...editingItem,
                                                              data: {
                                                                ...editingItem.data,
                                                                step: e.target.value
                                                              }
                                                            })} placeholder="Step name" className="text-xs" />
                                                                         <Textarea value={editingItem.data.description} onChange={e => setEditingItem({
                                                              ...editingItem,
                                                              data: {
                                                                ...editingItem.data,
                                                                description: e.target.value
                                                              }
                                                            })} placeholder="Step description" rows={1} className="text-xs" />
                                                                         <div className="text-xs">
                                                                           <FlowTypeSelector value={editingItem.data.flowType} onValueChange={value => setEditingItem({
                                                                ...editingItem,
                                                                data: {
                                                                  ...editingItem.data,
                                                                  flowType: value
                                                                }
                                                              })} />
                                                                         </div>
                                                                       </div> : <div className="flex-1">
                                                                         <div className="flex items-center gap-2">
                                                                           <p className="font-medium text-xs">{step.step}</p>
                                                                           {getFlowTypeBadge(step.flowType)}
                                                                           {step.isStandard && !isEditingStandardProject && (
                                                                             <Badge variant="secondary" className="text-xs">Standard 🔒</Badge>
                                                                           )}
                                                                           {!step.isStandard && phase.isStandard && (
                                                                             <Badge variant="outline" className="text-xs bg-blue-50">Custom</Badge>
                                                                           )}
                                                                         </div>
                                                                         <p className="text-muted-foreground text-xs">{step.description}</p>
                                                                       </div>}
                                                                  </div>
                                                                  
                                                                   <div className="flex items-center gap-1">
                                                                     <div className="flex items-center gap-1">
                                                                       {step.tools?.length > 0 && <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                           <Wrench className="w-2 h-2" />
                                                                           {step.tools.length}
                                                                         </Badge>}
                                                                       {step.materials?.length > 0 && <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                           <Package className="w-2 h-2" />
                                                                           {step.materials.length}
                                                                         </Badge>}
                                                                       {step.outputs?.length > 0 && <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                           <FileOutput className="w-2 h-2" />
                                                                           {step.outputs.length}
                                                                         </Badge>}
                                                                     </div>
                                                     
                                                       {isStepEditing ? <>
                                                            <Button size="sm" onClick={saveEdit}>
                                                              <Check className="w-3 h-3" />
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                                              <X className="w-3 h-3" />
                                                            </Button>
                                                          </> : <>
                                                            <Button size="sm" variant="ghost" onClick={() => setShowDecisionEditor({
                                                               step
                                                             })} title="Configure decision point">
                                                              🔀
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => startEdit('step', step.id, step)} disabled={step.isStandard && !isEditingStandardProject}>
                                                              <Edit className="w-3 h-3" />
                                                            </Button>
                                                            
                                                            <Button size="sm" variant="ghost" onClick={() => copyItem('step', step)}>
                                                              <Copy className="w-3 h-3" />
                                                            </Button>
                                                            
                                                            {clipboard?.type === 'step' && <Button size="sm" variant="ghost" onClick={() => pasteItem('step', {
                                                               phaseId: phase.id,
                                                               operationId: operation.id
                                                             })}>
                                                                <Clipboard className="w-3 h-3" />
                                                              </Button>}
                                                            
                                                            <Button size="sm" variant="ghost" onClick={() => deleteStep(phase.id, operation.id, step.id)} disabled={step.isStandard && !isEditingStandardProject}>
                                                                <Trash2 className="w-3 h-3" />
                                                              </Button>
                                                          </>}
                                                                  </div>
                                                                </div>
                                                              </CardContent>
                                                            </Card>}
                                                        </Draggable>;
                                              })}
                                                    {provided.placeholder}
                                                  </div>}
                                               </Droppable>
                                                 </CardContent>
                                               </CollapsibleContent>
                                             </Collapsible>
                                          </Card>}
                                      </Draggable>;
                              })}
                                  {provided.placeholder}
                                </div>}
                             </Droppable>
                               </CardContent>
                             </CollapsibleContent>
                           </Collapsible>
                        </Card>}
                    </Draggable>;
              })}
                {provided.placeholder}
              </div>}
          </Droppable>
        </div>
      </DragDropContext>

      {/* Step Content Edit Dialog */}
      {showStepContentEdit && <Dialog open={!!showStepContentEdit} onOpenChange={() => setShowStepContentEdit(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Step Content: {showStepContentEdit.step.step}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <MultiContentEditor sections={showStepContentEdit.step.contentSections || []} onChange={sections => {
              const updatedProject = {
                ...currentProject
              };

              // Find and update the step
              for (const phase of updatedProject.phases) {
                for (const operation of phase.operations) {
                  const stepIndex = operation.steps.findIndex(s => s.id === showStepContentEdit.stepId);
                  if (stepIndex !== -1) {
                    operation.steps[stepIndex] = {
                      ...operation.steps[stepIndex],
                      contentSections: sections
                    };
                    updateProject(updatedProject);
                    return;
                  }
                }
              }
            }} />
            </div>
          </DialogContent>
        </Dialog>}

      {/* Decision Point Editor Dialog */}
      {showDecisionEditor && <DecisionPointEditor open={!!showDecisionEditor} onOpenChange={() => setShowDecisionEditor(null)} step={showDecisionEditor.step} availableSteps={getAllAvailableSteps()} onSave={handleDecisionEditorSave} />}
      
      {/* Phase Incorporation Dialog */}
      <PhaseIncorporationDialog
        open={showIncorporationDialog}
        onOpenChange={setShowIncorporationDialog}
        onIncorporatePhase={handleIncorporatePhase}
      />

      {/* Decision Tree Manager */}
      <DecisionTreeManager
        open={showDecisionTreeManager}
        onOpenChange={setShowDecisionTreeManager}
        currentProject={currentProject}
      />
    </div>
    </div>;
};