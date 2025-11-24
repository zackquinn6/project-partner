import React, { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Trash2, Edit, Check, X, FileOutput, Wrench, Package, Clipboard, ClipboardCheck, Save, ChevronDown, ChevronRight, Link, ExternalLink, ArrowLeft, GitBranch, MoreVertical, Loader2, ChevronUp } from 'lucide-react';
import { FlowTypeSelector, getFlowTypeBadge } from './FlowTypeSelector';
import { StepTypeSelector, getStepTypeIcon } from './StepTypeSelector';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OutputEditForm } from './OutputEditForm';
import { MultiContentEditor } from './MultiContentEditor';
import { MultiContentRenderer } from './MultiContentRenderer';
import { DecisionTreeFlowchart } from './DecisionTreeFlowchart';
import { DecisionPointEditor } from './DecisionPointEditor';
import { PhaseIncorporationDialog } from './PhaseIncorporationDialog';
import { DecisionTreeManager } from './DecisionTreeManager';
import { enforceStandardPhaseOrdering } from '@/utils/phaseOrderingUtils';
import { supabase } from '@/integrations/supabase/client';
import { useDynamicPhases } from '@/hooks/useDynamicPhases';
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
  // CRITICAL: Ensure this is always a boolean (true or false), never undefined
  const isEditingStandardProject = Boolean(
    currentProject?.id === '00000000-0000-0000-0000-000000000001' || 
    currentProject?.isStandardTemplate === true
  );

  // Helper to check if a phase is standard - use isStandard flag from phase data
  // No hardcoded names - rely on database flag
  const isStandardPhase = (phase: Phase) => {
    return phase.isStandard === true;
  };

  // Helper to check if item can be edited/deleted in Edit Standard mode
  const canEditInStandardMode = (isStandard: boolean) => {
    return isEditingStandardProject; // In Edit Standard mode, all items including standard ones can be edited
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
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [justAddedPhaseId, setJustAddedPhaseId] = useState<string | null>(null);
  const [deletePhaseDialogOpen, setDeletePhaseDialogOpen] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<string | null>(null);
  const [isDeletingPhase, setIsDeletingPhase] = useState(false);
  const [reorderingPhaseId, setReorderingPhaseId] = useState<string | null>(null);

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

    // Check phase ordering - verify standard phases are in correct order
    const standardPhases = phases.filter(p => isStandardPhase(p) && !p.isLinked);
    // Find phases with 'first' and 'last' order numbers
    const firstPhase = standardPhases.find(p => p.phaseOrderNumber === 'first');
    const lastPhase = standardPhases.find(p => p.phaseOrderNumber === 'last');
    const firstPhaseIndex = firstPhase ? phases.findIndex(p => p.id === firstPhase.id) : -1;
    const lastPhaseIndex = lastPhase ? phases.findIndex(p => p.id === lastPhase.id) : -1;
    // Check if first phase is actually first and last phase is actually last
    if ((firstPhaseIndex !== -1 && firstPhaseIndex !== 0) || (lastPhaseIndex !== -1 && lastPhaseIndex !== phases.length - 1)) {
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

  // Get phases directly from project and ensure no duplicates, then enforce ordering
  const deduplicatePhases = (phases: Phase[]): Phase[] => {
    console.log('🔍 Deduplicating phases. Input count:', phases.length);
    const seen = new Set<string>();
    const result: Phase[] = [];
    for (const phase of phases) {
      if (!phase || !phase.id) {
        console.warn('🔍 Skipping phase with missing id:', phase);
        continue;
      }
      // Use ID for deduplication instead of name to allow multiple phases with same name but different IDs
      // For linked phases, use a combination of id and sourceProjectId to ensure uniqueness
      const key = phase.isLinked && phase.sourceProjectId 
        ? `${phase.id}-${phase.sourceProjectId}` 
        : phase.id;
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

  // Sort phases by order number while preserving standard phase positions
  const sortPhasesByOrderNumber = (phases: Phase[]): Phase[] => {
    // Separate standard and non-standard phases using isStandard flag
    const standardPhases: Phase[] = [];
    const nonStandardPhases: Phase[] = [];
    
    phases.forEach(phase => {
      if (isStandardPhase(phase)) {
        standardPhases.push(phase);
      } else {
        nonStandardPhases.push(phase);
      }
    });
    
    // Sort non-standard phases by order number
    nonStandardPhases.sort((a, b) => {
      const aOrder = a.phaseOrderNumber;
      const bOrder = b.phaseOrderNumber;
      
      // Handle 'first' and 'last' special values
      if (aOrder === 'first') return -1;
      if (bOrder === 'first') return 1;
      if (aOrder === 'last') return 1;
      if (bOrder === 'last') return -1;
      
      // Handle numeric order numbers
      if (typeof aOrder === 'number' && typeof bOrder === 'number') {
        return aOrder - bOrder;
      }
      if (typeof aOrder === 'number') return -1;
      if (typeof bOrder === 'number') return 1;
      
      // If both are undefined or same type, maintain order
      return 0;
    });
    
    // Reconstruct array: Standard phases (sorted by order number) -> non-standard phases
    const result: Phase[] = [];
    
    // Sort standard phases by their order numbers
    // Phases with 'first' come first, 'last' comes last, numeric values in between
    standardPhases.sort((a, b) => {
      const aOrder = a.phaseOrderNumber === 'first' ? -Infinity : (a.phaseOrderNumber === 'last' ? Infinity : (typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 1000));
      const bOrder = b.phaseOrderNumber === 'first' ? -Infinity : (b.phaseOrderNumber === 'last' ? Infinity : (typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 1000));
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      // Fallback to name if order numbers are the same
      return (a.name || '').localeCompare(b.name || '');
    });
    
    // Add standard phases (sorted)
    result.push(...standardPhases);
    
    // Add non-standard phases (preserving their relative order)
    result.push(...nonStandardPhases);
    
    return result;
  };

  // Ensure no duplicate order numbers across phases and make them consecutive
  // IMPORTANT: This function assumes phases are already in the correct order (enforced by enforceStandardPhaseOrdering)
  // It preserves existing order numbers and only assigns new ones to phases that don't have them
  const ensureUniqueOrderNumbers = (phases: Phase[]): Phase[] => {
    const usedNumbers = new Set<string | number>();
    
    // First pass: collect all existing order numbers
    phases.forEach(phase => {
      if (phase.phaseOrderNumber !== undefined) {
        usedNumbers.add(phase.phaseOrderNumber);
      }
    });
    
    // Second pass: assign order numbers based on actual position in the array
    // Standard phases with 'first' or 'last' should keep those values
    return phases.map((phase, index) => {
      // If phase already has an order number, preserve it (unless it's a duplicate)
      if (phase.phaseOrderNumber !== undefined) {
        // Check if this order number is already used by another phase
        const isDuplicate = Array.from(usedNumbers).some((num, idx) => {
          if (idx === index) return false; // Don't check against self
          const otherPhase = phases.find((p, i) => i !== index && p.phaseOrderNumber === num);
          return otherPhase?.phaseOrderNumber === phase.phaseOrderNumber;
        });
        
        if (!isDuplicate) {
          // Order number is valid, keep it
          return phase;
        }
        // If duplicate, we'll reassign below
      }
      
      if (isStandardPhase(phase)) {
        // Standard phases get special order numbers based on position rules
        // If it's the first phase and doesn't have an order number, assign 'first'
        if (index === 0 && phase.phaseOrderNumber === undefined) {
          phase.phaseOrderNumber = 'first';
          usedNumbers.add('first');
        } else if (index === phases.length - 1 && phase.phaseOrderNumber === undefined) {
          // If it's the last phase and doesn't have an order number, assign 'last'
          phase.phaseOrderNumber = 'last';
          usedNumbers.add('last');
        } else if (phase.phaseOrderNumber === undefined) {
          // For other standard phases, assign sequential numbers
          let candidateNumber = index + 1;
          while (usedNumbers.has(candidateNumber) && candidateNumber <= phases.length + 10) {
            candidateNumber++;
          }
          phase.phaseOrderNumber = candidateNumber;
          usedNumbers.add(candidateNumber);
        }
      } else {
        // Custom and linked phases get consecutive numbers
        // Find the next available number that's not already used
        let candidateNumber = 1;
        while (usedNumbers.has(candidateNumber) && candidateNumber <= phases.length + 10) {
          candidateNumber++;
        }
        phase.phaseOrderNumber = candidateNumber;
        usedNumbers.add(candidateNumber);
      }
      
      return phase;
    });
  };
  
  // State to track if we've loaded fresh phases from database
  const [phasesLoaded, setPhasesLoaded] = useState(false);
  const [displayPhases, setDisplayPhases] = useState<Phase[]>([]);

  // Rebuild phases from database (like EditWorkflowView does)
  // This ensures we get fresh data, but we'll merge with currentProject.phases to preserve correct isStandard flags
  const { phases: rebuiltPhases, loading: rebuildingPhases, refetch: refetchDynamicPhases } = useDynamicPhases(currentProject?.id);
  
  // Merge rebuilt phases with currentProject.phases to preserve correct isStandard flags
  // This ensures custom phases aren't incorrectly tagged as standard
  // Use currentProject.phases as the source of truth for isStandard flags
  // Same logic as EditWorkflowView for consistency
  const mergedPhases = React.useMemo(() => {
    console.log('🔍 StructureManager mergedPhases useMemo:', {
      hasCurrentProject: !!currentProject,
      currentProjectPhasesCount: currentProject?.phases?.length || 0,
      currentProjectPhaseNames: currentProject?.phases?.map(p => ({ name: p.name, isStandard: p.isStandard, isLinked: p.isLinked })) || [],
      rebuiltPhasesCount: rebuiltPhases?.length || 0,
      rebuiltPhaseNames: rebuiltPhases?.map(p => ({ name: p.name, isStandard: p.isStandard, isLinked: p.isLinked })) || []
    });
    
    if (!currentProject?.phases || currentProject.phases.length === 0) {
      console.log('🔍 No currentProject.phases, returning rebuiltPhases');
      return rebuiltPhases || [];
    }
    
    // If we have rebuilt phases, merge them with currentProject.phases to preserve correct isStandard flags
    if (rebuiltPhases && rebuiltPhases.length > 0) {
      // Create maps for both ID and name matching
      // Use ID as primary identifier, but also check by name for phases that might have been renamed
      const currentPhasesById = new Map<string, Phase>();
      const currentPhasesByName = new Map<string, Phase>();
      currentProject.phases.forEach(phase => {
        if (phase.id) {
          currentPhasesById.set(phase.id, phase);
        }
        if (phase.name) {
          // If multiple phases have the same name, keep the first one
          if (!currentPhasesByName.has(phase.name)) {
            currentPhasesByName.set(phase.name, phase);
          }
        }
      });
      
      // Merge: Use rebuilt phases from DB for fresh data, but update isStandard from currentProject.phases
      // This ensures custom phases aren't incorrectly tagged as standard
      // CRITICAL: For regular templates (not editing Standard Project Foundation),
      // only phases with isStandard: true from currentProject.phases should remain standard.
      // All newly added phases must be non-standard.
      const mergedRebuiltPhases = rebuiltPhases.map(rebuiltPhase => {
        // First try to match by ID (most reliable)
        const currentPhaseById = rebuiltPhase.id ? currentPhasesById.get(rebuiltPhase.id) : null;
        if (currentPhaseById) {
          // Preserve isStandard flag from currentProject.phases (source of truth)
          // BUT: If we're not editing Standard Project Foundation and currentProject says it's not standard,
          // override to false
          if (!isEditingStandardProject && !currentPhaseById.isStandard) {
            return {
              ...rebuiltPhase,
              isStandard: false, // Force to false for custom phases
              isLinked: currentPhaseById.isLinked || rebuiltPhase.isLinked
            };
          }
          return {
            ...rebuiltPhase,
            isStandard: currentPhaseById.isStandard, // Use isStandard from currentProject.phases
            isLinked: currentPhaseById.isLinked || rebuiltPhase.isLinked // Preserve both flags
          };
        }
        
        // Fallback to name matching if ID doesn't match (e.g., renamed phases)
        const currentPhaseByName = rebuiltPhase.name ? currentPhasesByName.get(rebuiltPhase.name) : null;
        if (currentPhaseByName) {
          // BUT: If we're not editing Standard Project Foundation and currentProject says it's not standard,
          // override to false
          if (!isEditingStandardProject && !currentPhaseByName.isStandard) {
            return {
              ...rebuiltPhase,
              isStandard: false, // Force to false for custom phases
              isLinked: currentPhaseByName.isLinked || rebuiltPhase.isLinked
            };
          }
          return {
            ...rebuiltPhase,
            isStandard: currentPhaseByName.isStandard,
            isLinked: currentPhaseByName.isLinked || rebuiltPhase.isLinked
          };
        }
        
        // If phase is not in currentProject.phases, it's a newly added phase
        // Set isStandard based on whether we're editing Standard Project Foundation
        // - When editing Standard Project Foundation: new phases should be isStandard: true
        // - When editing regular templates: new phases should ALWAYS be isStandard: false
        if (isEditingStandardProject) {
          // When editing Standard Project Foundation, new phases become standard
          return {
            ...rebuiltPhase,
            isStandard: true
          };
        } else {
          // When editing regular templates, new phases are ALWAYS custom (isStandard: false)
          // CRITICAL: Explicitly override any isStandard value from the database
          console.log('🔵 Overriding isStandard to false for new phase in regular template:', {
            phaseId: rebuiltPhase.id,
            phaseName: rebuiltPhase.name,
            databaseIsStandard: rebuiltPhase.isStandard,
            isEditingStandardProject
          });
          return {
            ...rebuiltPhase,
            isStandard: false // Force to false for regular templates, regardless of database value
          };
        }
      });
      
      // Get phases from currentProject.phases that aren't in rebuilt phases
      // Check by both ID and name to catch all cases
      // CRITICAL: Always include phases that were just added (even if not in rebuiltPhases yet)
      const rebuiltPhaseIds = new Set(rebuiltPhases.map(p => p.id).filter(Boolean));
      const rebuiltPhaseNames = new Set(rebuiltPhases.map(p => p.name).filter(Boolean));
      const phasesOnlyInJson = currentProject.phases.filter(p => {
        // Always include if this is the just-added phase
        if (justAddedPhaseId && p.id === justAddedPhaseId) {
          return true;
        }
        // Include if not found by ID or name in rebuilt phases
        const notFoundById = p.id ? !rebuiltPhaseIds.has(p.id) : true;
        const notFoundByName = p.name ? !rebuiltPhaseNames.has(p.name) : true;
        // Include if either ID or name doesn't match (covers all cases)
        return notFoundById && notFoundByName;
      });
      
      console.log('🔍 StructureManager merge result:', {
        mergedRebuiltPhasesCount: mergedRebuiltPhases.length,
        phasesOnlyInJsonCount: phasesOnlyInJson.length,
        phasesOnlyInJsonNames: phasesOnlyInJson.map(p => ({ id: p.id, name: p.name, isStandard: p.isStandard, isLinked: p.isLinked })),
        totalMergedCount: mergedRebuiltPhases.length + phasesOnlyInJson.length
      });
      
      // Combine: merged rebuilt phases (with corrected isStandard) + phases only in JSON
      return [...mergedRebuiltPhases, ...phasesOnlyInJson];
    }
    
    // Fallback: use currentProject.phases directly if no rebuilt phases
    console.log('🔍 No rebuiltPhases, returning currentProject.phases directly');
    return currentProject.phases;
  }, [currentProject?.phases, rebuiltPhases, justAddedPhaseId]);
  
  // Process merged phases and update displayPhases
  // Use mergedPhases directly (same as EditWorkflowView uses rawPhases)
  // Process phases similar to EditWorkflowView for consistency
  const processedPhases = React.useMemo(() => {
    let phasesToProcess: Phase[] = [];
    
    if (mergedPhases && mergedPhases.length > 0) {
      phasesToProcess = mergedPhases;
    } else if (currentProject?.phases && currentProject.phases.length > 0) {
      // Fallback to current project phases if no merged phases yet
      phasesToProcess = currentProject.phases;
    }
    
    if (phasesToProcess.length > 0) {
      const rawPhases = deduplicatePhases(phasesToProcess);
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(rawPhases);
      const orderedPhases = enforceStandardPhaseOrdering(phasesWithUniqueOrder);
      const sortedPhases = sortPhasesByOrderNumber(orderedPhases);
      return sortedPhases;
    }
    
    return [];
  }, [mergedPhases, currentProject?.phases]);
  
  // Update displayPhases when processedPhases changes
  // Always update displayPhases to match processedPhases (even if empty)
  // This ensures displayPhases is always in sync with processedPhases
  useEffect(() => {
    console.log('🔍 StructureManager processed phases:', {
      projectId: currentProject?.id,
      projectName: currentProject?.name,
      mergedPhasesCount: mergedPhases?.length || 0,
      currentProjectPhasesCount: currentProject?.phases?.length || 0,
      processedPhasesCount: processedPhases.length,
      rebuiltPhasesCount: rebuiltPhases?.length || 0,
      phaseNames: processedPhases.map(p => ({ name: p.name, isStandard: p.isStandard, isLinked: p.isLinked })),
      rebuiltPhaseNames: rebuiltPhases?.map(p => p.name) || [],
      currentPhaseNames: currentProject?.phases?.map(p => p.name) || [],
      phasesOnlyInJson: mergedPhases ? currentProject?.phases?.filter(p => 
        p.name && !rebuiltPhases?.some(rp => rp.name === p.name)
      ).map(p => p.name) || [] : []
    });
    
    // Always update displayPhases to match processedPhases
    // BUT: If we just added a phase, check if it's in processedPhases before overwriting
    // This prevents the new phase from disappearing before the refetch completes
    if (justAddedPhaseId) {
      const newPhaseInProcessed = processedPhases.some(p => p.id === justAddedPhaseId);
      if (!newPhaseInProcessed) {
        console.log('⚠️ Newly added phase not yet in processedPhases, preserving displayPhases');
        // Don't overwrite displayPhases if the new phase isn't in processedPhases yet
        return;
      } else {
        console.log('✅ Newly added phase found in processedPhases, updating displayPhases');
      }
    }
    
    // CRITICAL: Filter out deleted phase during deletion process to prevent flicker
    // If we're currently deleting a phase, make sure it doesn't reappear during refetch
    const phasesToDisplay = phaseToDelete 
      ? processedPhases.filter(p => p.id !== phaseToDelete)
      : processedPhases;
    
    setDisplayPhases(phasesToDisplay);
    setPhasesLoaded(true);
      
    // Update local context with fresh phases ONLY if phases actually changed
    // This prevents infinite loops from updateProject triggering re-renders
    if (currentProject && processedPhases.length > 0) {
      // Check if phases actually changed before updating
      const currentPhaseIds = new Set((currentProject.phases || []).map(p => p.id));
      const processedPhaseIds = new Set(processedPhases.map(p => p.id));
      const phasesChanged = 
        currentPhaseIds.size !== processedPhaseIds.size ||
        !Array.from(currentPhaseIds).every(id => processedPhaseIds.has(id)) ||
        !Array.from(processedPhaseIds).every(id => currentPhaseIds.has(id));
      
      if (phasesChanged) {
        console.log('🔧 updateProject called: phases changed', {
          projectId: currentProject.id,
          oldCount: currentProject.phases?.length || 0,
          newCount: processedPhases.length
        });
        updateProject({
          ...currentProject,
          phases: processedPhases,
          updatedAt: new Date()
        });
      }
    }
  }, [processedPhases, rebuildingPhases, currentProject?.id, rebuiltPhases?.length, mergedPhases?.length, justAddedPhaseId]);

  // Reset phases when project changes
  useEffect(() => {
    if (currentProject) {
      setPhasesLoaded(false);
      // Don't clear displayPhases immediately - let mergedPhases effect handle it
      // This prevents flickering and ensures phases are visible
    }
  }, [currentProject?.id]);

  // Initialize displayPhases with current project phases if not loaded yet
  // Use currentProject.phases as the primary source (like EditWorkflowView)
  // This ensures all phases are visible immediately, including custom phases
  // Only run if mergedPhases hasn't populated displayPhases yet
  useEffect(() => {
    if (!phasesLoaded && !rebuildingPhases && currentProject && currentProject.phases && currentProject.phases.length > 0 && displayPhases.length === 0) {
      const rawPhases = deduplicatePhases(currentProject.phases);
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(rawPhases);
      const orderedPhases = enforceStandardPhaseOrdering(phasesWithUniqueOrder);
      const sortedPhases = sortPhasesByOrderNumber(orderedPhases);
      if (sortedPhases.length > 0) {
        console.log('🔍 StructureManager initializing displayPhases from currentProject (fallback):', {
          projectId: currentProject.id,
          projectName: currentProject.name,
          phaseCount: sortedPhases.length,
          phaseNames: sortedPhases.map(p => p.name)
        });
        setDisplayPhases(sortedPhases);
        setPhasesLoaded(true);
      }
    }
  }, [currentProject, phasesLoaded, displayPhases.length, rebuildingPhases]);

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

  // Get phase order number (First, Last, or integer)
  const getPhaseOrderNumber = (phase: Phase, phaseIndex: number, totalPhases: number): string | number => {
    if (phase.phaseOrderNumber !== undefined) {
      if (phase.phaseOrderNumber === 'first') return 'First';
      if (phase.phaseOrderNumber === 'last') return 'Last';
      return phase.phaseOrderNumber;
    }
    // Default: use index + 1
    return phaseIndex + 1;
  };

  // State to store standard phase order numbers from Standard Project Foundation
  const [standardPhaseOrderNumbers, setStandardPhaseOrderNumbers] = useState<Set<string | number>>(new Set());

  // Fetch standard phase order numbers from Standard Project Foundation
  useEffect(() => {
    if (!isEditingStandardProject && currentProject) {
      const fetchStandardPhaseOrders = async () => {
        try {
          const { data: standardProject, error } = await supabase
            .from('projects')
            .select('phases')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

          if (!error && standardProject?.phases) {
            const phases = Array.isArray(standardProject.phases) ? standardProject.phases : [];
            const orderNumbers = new Set<string | number>();
            phases.forEach((phase: Phase) => {
              if (phase.phaseOrderNumber !== undefined) {
                if (phase.phaseOrderNumber === 'first') orderNumbers.add('First');
                else if (phase.phaseOrderNumber === 'last') orderNumbers.add('Last');
                else orderNumbers.add(phase.phaseOrderNumber);
              }
            });
            setStandardPhaseOrderNumbers(orderNumbers);
          }
        } catch (error) {
          console.error('Error fetching standard phase order numbers:', error);
        }
      };

      fetchStandardPhaseOrders();
    } else {
      setStandardPhaseOrderNumbers(new Set());
    }
  }, [isEditingStandardProject, currentProject?.id]);

  // Get available order numbers for dropdown (excluding standard phase numbers in project templates)
  const getAvailableOrderNumbers = (currentPhase: Phase, currentIndex: number, totalPhases: number): (string | number)[] => {
    const options: (string | number)[] = ['First', 'Last'];
    
    // Add integer options (1 to totalPhases)
    for (let i = 1; i <= totalPhases; i++) {
      // Skip if this number is reserved by a standard phase (in project template mode)
      if (!isEditingStandardProject && standardPhaseOrderNumbers.has(i)) {
        continue;
      }
      options.push(i);
    }
    
    return options;
  };

  // Handle phase order number change
  const handlePhaseOrderChange = async (phaseId: string, newOrder: string | number) => {
    if (!currentProject) return;
    
    const phaseIndex = displayPhases.findIndex(p => p.id === phaseId);
    if (phaseIndex === -1) return;
    
    const phase = displayPhases[phaseIndex];
    const totalPhases = displayPhases.length;
    
    // Convert 'First' and 'Last' to actual positions
    let targetPosition: number;
    if (newOrder === 'First') {
      targetPosition = 0;
    } else if (newOrder === 'Last') {
      targetPosition = totalPhases - 1;
    } else if (typeof newOrder === 'number') {
      targetPosition = newOrder - 1; // Convert to 0-based index
    } else {
      return;
    }
    
    // If moving to same position, do nothing
    if (targetPosition === phaseIndex) return;
    
    // Reorder phases array
    const reorderedPhases = Array.from(displayPhases);
    const [removed] = reorderedPhases.splice(phaseIndex, 1);
    reorderedPhases.splice(targetPosition, 0, removed);
    
    // Renumber all phases to avoid duplicates
    // Set the moved phase's order number
    const movedPhase = reorderedPhases[targetPosition];
    if (newOrder === 'First') {
      movedPhase.phaseOrderNumber = 'first';
    } else if (newOrder === 'Last') {
      movedPhase.phaseOrderNumber = 'last';
    } else {
      movedPhase.phaseOrderNumber = newOrder;
    }
    
    // Renumber all other phases sequentially
    // Track which numbers are already used
    const usedNumbers = new Set<string | number>();
    usedNumbers.add(movedPhase.phaseOrderNumber);
    
    reorderedPhases.forEach((p, index) => {
      if (p.id === phaseId) {
        // Already set above
        return;
      }
      
      // Assign sequential number, avoiding conflicts
      let assignedNumber: 'first' | 'last' | number;
      
      if (index === 0 && !usedNumbers.has('first') && !usedNumbers.has(1)) {
        // First position available - check if this phase was originally 'first'
        const originalPhase = displayPhases.find(orig => orig.id === p.id);
        if (originalPhase?.phaseOrderNumber === 'first') {
          assignedNumber = 'first';
        } else {
          assignedNumber = 1;
        }
      } else if (index === totalPhases - 1 && !usedNumbers.has('last') && !usedNumbers.has(totalPhases)) {
        // Last position available - check if this phase was originally 'last'
        const originalPhase = displayPhases.find(orig => orig.id === p.id);
        if (originalPhase?.phaseOrderNumber === 'last') {
          assignedNumber = 'last';
        } else {
          assignedNumber = totalPhases;
        }
      } else {
        // Middle position - find next available number
        let candidateNumber = index + 1;
        while (usedNumbers.has(candidateNumber) && candidateNumber <= totalPhases) {
          candidateNumber++;
        }
        // If we've exhausted all numbers, go backwards
        if (candidateNumber > totalPhases) {
          candidateNumber = index;
          while (usedNumbers.has(candidateNumber) && candidateNumber >= 1) {
            candidateNumber--;
          }
        }
        assignedNumber = candidateNumber;
      }
      
      p.phaseOrderNumber = assignedNumber;
      usedNumbers.add(assignedNumber);
    });
    
    // Update database
    await updatePhaseOrder(reorderedPhases);
  };

  // Move phase up/down
  const movePhase = async (phaseId: string, direction: 'up' | 'down') => {
    if (!currentProject) return;
    
    const phaseIndex = displayPhases.findIndex(p => p.id === phaseId);
    if (phaseIndex === -1) return;
    
    const newIndex = direction === 'up' ? phaseIndex - 1 : phaseIndex + 1;
    if (newIndex < 0 || newIndex >= displayPhases.length) return;
    
    const phase = displayPhases[phaseIndex];
    const phaseIsStandard = isStandardPhase(phase);
    const isLinkedPhase = phase.isLinked;
    
    // Block reordering of standard phases (unless editing Standard Project Foundation)
    if (phaseIsStandard && !isEditingStandardProject) {
      toast.error('Cannot reorder standard phases. Standard phases are locked and must remain in their designated positions.');
        return;
      }
    
    // Validate constraints for standard phases (only in Standard Project Foundation)
    if (phaseIsStandard && isEditingStandardProject) {
      // In Standard Project Foundation, we can reorder but should maintain logical order
      // This is handled by position rules in the database
    }
    
    // Validate custom and linked phase constraints
    if (!phaseIsStandard) {
      if (newIndex < 3) {
        toast.error('Custom and incorporated phases must come after the first 3 standard phases');
        return;
      }
      // Find the last standard phase (if any) - custom phases must come before it
      const lastStandardPhaseIndex = displayPhases.findIndex((p, idx, arr) => {
        if (p.isLinked) return false;
        const isLastStandard = isStandardPhase(p) && 
          (idx === arr.length - 1 || !arr.slice(idx + 1).some(ph => isStandardPhase(ph) && !ph.isLinked));
        return isLastStandard;
      });
      if (lastStandardPhaseIndex !== -1 && newIndex >= lastStandardPhaseIndex) {
        toast.error('Custom and incorporated phases must come before the last standard phase');
        return;
      }
    }
    
    // Set loading state and track start time for minimum display duration
    const startTime = Date.now();
    const minDisplayTime = 2000; // Minimum 2 seconds
    setReorderingPhaseId(phaseId);
    
    try {
      // Reorder phases
      const reorderedPhases = Array.from(displayPhases);
      const [removed] = reorderedPhases.splice(phaseIndex, 1);
      reorderedPhases.splice(newIndex, 0, removed);
      
      // Update phase order numbers based on new positions
      // For standard phases, preserve their special order numbers
      // For custom/linked phases, assign sequential numbers
      const totalPhases = reorderedPhases.length;
      reorderedPhases.forEach((p, index) => {
        const isStandard = !p.isLinked && isStandardPhase(p);
        
        if (isStandard) {
          // Standard phases keep their special positions based on phaseOrderNumber
          // If they have 'first' or 'last', preserve it; otherwise use position
          if (p.phaseOrderNumber === 'first' || (index === 0 && p.phaseOrderNumber === undefined)) {
            p.phaseOrderNumber = 'first';
          } else if (p.phaseOrderNumber === 'last' || (index === totalPhases - 1 && p.phaseOrderNumber === undefined)) {
            p.phaseOrderNumber = 'last';
          } else if (p.phaseOrderNumber === undefined) {
            // Other standard phases get their position numbers
            p.phaseOrderNumber = index + 1;
          }
        } else {
          // Custom and linked phases get sequential numbers
          // But preserve 'first' or 'last' if they were at those positions and no standard phase is there
          if (index === 0 && !reorderedPhases[0].isLinked && !isStandardPhase(reorderedPhases[0])) {
            // First custom phase could be 'first' if no standard phase is first
            const hasStandardFirst = reorderedPhases.some(ph => isStandardPhase(ph) && !ph.isLinked && ph.phaseOrderNumber === 'first');
            if (!hasStandardFirst) {
              p.phaseOrderNumber = 'first';
            } else {
              p.phaseOrderNumber = index + 1;
            }
          } else if (index === totalPhases - 1 && !reorderedPhases[totalPhases - 1].isLinked && !isStandardPhase(reorderedPhases[totalPhases - 1])) {
            // Last custom phase could be 'last' if no standard phase is last
            const hasStandardLast = reorderedPhases.some(ph => isStandardPhase(ph) && !ph.isLinked && ph.phaseOrderNumber === 'last');
            if (!hasStandardLast) {
              p.phaseOrderNumber = 'last';
            } else {
              p.phaseOrderNumber = index + 1;
            }
          } else {
            p.phaseOrderNumber = index + 1;
          }
        }
      });
      
      console.log('🔄 Reordering phases - before updatePhaseOrder:', {
        phaseId,
        direction,
        oldIndex: phaseIndex,
        newIndex,
        reorderedPhases: reorderedPhases.map(p => ({ id: p.id, name: p.name, order: p.phaseOrderNumber }))
      });
      
      await updatePhaseOrder(reorderedPhases);
      
      console.log('✅ Reordering complete - displayPhases should update');
      
      // Ensure minimum display time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } catch (error) {
      console.error('Error reordering phase:', error);
      // Ensure minimum display time even on error
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } finally {
      setReorderingPhaseId(null);
    }
  };
  
  // Move operation up/down
  const moveOperation = async (phaseId: string, operationId: string, direction: 'up' | 'down') => {
    if (!currentProject) return;
    
    const phase = displayPhases.find(p => p.id === phaseId);
    if (!phase || phase.isLinked) {
      toast.error('Operations within incorporated phases cannot be reordered');
      return;
    }
    
    const operationIndex = phase.operations.findIndex(o => o.id === operationId);
    if (operationIndex === -1) return;
    
    const newIndex = direction === 'up' ? operationIndex - 1 : operationIndex + 1;
    if (newIndex < 0 || newIndex >= phase.operations.length) return;
    
    // Update operation order in template_operations table
    const operation = phase.operations[operationIndex];
    const targetOperation = phase.operations[newIndex];
    
    // Get current display_order values (may not be in TypeScript interface but exists in DB)
    const currentOrder = (operation as any).display_order ?? operationIndex;
    const targetOrder = (targetOperation as any).display_order ?? newIndex;
    
    // Swap display_order values
    const { error: updateError1 } = await supabase
      .from('template_operations')
      .update({ display_order: -1 }) // Temporary value to avoid conflicts
      .eq('id', operation.id);
    
    if (updateError1) {
      toast.error('Error reordering operation');
      return;
    }
    
    const { error: updateError2 } = await supabase
      .from('template_operations')
      .update({ display_order: currentOrder })
      .eq('id', targetOperation.id);
    
    if (updateError2) {
      toast.error('Error reordering operation');
      return;
    }
    
    const { error: updateError3 } = await supabase
      .from('template_operations')
      .update({ display_order: targetOrder })
      .eq('id', operation.id);
    
    if (updateError3) {
      toast.error('Error reordering operation');
      return;
    }
    
    // Rebuild phases JSON from relational data
    const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
      p_project_id: currentProject.id
    });

    if (!rebuildError && rebuiltPhases) {
      // Merge with incorporated phases if any
      const allPhases = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
      const mergedPhases = [...allPhases];
      
      // Add any incorporated phases from current display
      displayPhases.forEach(p => {
        if (p.isLinked && !mergedPhases.find(mp => mp.id === p.id)) {
          mergedPhases.push(p);
        }
      });
      
      const orderedPhases = enforceStandardPhaseOrdering(mergedPhases);
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
      const sortedPhases = sortPhasesByOrderNumber(phasesWithUniqueOrder);
      
      await supabase
        .from('projects')
        .update({ phases: sortedPhases as any })
        .eq('id', currentProject.id);
      
      updateProject({
        ...currentProject,
        phases: sortedPhases as any,
        updatedAt: new Date()
      });
      
      // Update display state
      setDisplayPhases(sortedPhases);
    }
    
    toast.success('Operation reordered successfully');
  };
  
  // Move step up/down
  const moveStep = async (phaseId: string, operationId: string, stepId: string, direction: 'up' | 'down') => {
    if (!currentProject) return;
    
    const phase = displayPhases.find(p => p.id === phaseId);
    if (!phase || phase.isLinked) {
      toast.error('Steps within incorporated phases cannot be reordered');
      return;
    }
    
    const operation = phase.operations.find(o => o.id === operationId);
    if (!operation) return;
    
    const stepIndex = operation.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return;
    
    const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (newIndex < 0 || newIndex >= operation.steps.length) return;
    
    // Update step order in template_steps table
    const step = operation.steps[stepIndex];
    const targetStep = operation.steps[newIndex];
    
    // Get current display_order values (may not be in TypeScript interface but exists in DB)
    const currentOrder = (step as any).display_order ?? stepIndex;
    const targetOrder = (targetStep as any).display_order ?? newIndex;
    
    // Swap display_order values
    const { error: updateError1 } = await supabase
      .from('template_steps')
      .update({ display_order: -1 }) // Temporary value to avoid conflicts
      .eq('id', step.id);
    
    if (updateError1) {
      toast.error('Error reordering step');
      return;
    }
    
    const { error: updateError2 } = await supabase
      .from('template_steps')
      .update({ display_order: currentOrder })
      .eq('id', targetStep.id);
    
    if (updateError2) {
      toast.error('Error reordering step');
      return;
    }
    
    const { error: updateError3 } = await supabase
      .from('template_steps')
      .update({ display_order: targetOrder })
      .eq('id', step.id);
    
    if (updateError3) {
      toast.error('Error reordering step');
      return;
    }
    
    // Rebuild phases JSON from relational data
    const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
      p_project_id: currentProject.id
    });

    if (!rebuildError && rebuiltPhases) {
      // Merge with incorporated phases if any
      const allPhases = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
      const mergedPhases = [...allPhases];
      
      // Add any incorporated phases from current display
      displayPhases.forEach(p => {
        if (p.isLinked && !mergedPhases.find(mp => mp.id === p.id)) {
          mergedPhases.push(p);
        }
      });
      
      const orderedPhases = enforceStandardPhaseOrdering(mergedPhases);
      
      await supabase
        .from('projects')
        .update({ phases: orderedPhases as any })
        .eq('id', currentProject.id);
      
      updateProject({
        ...currentProject,
        phases: orderedPhases as any,
        updatedAt: new Date()
      });
      
      // Update display state
      setDisplayPhases(orderedPhases);
    }
    
    toast.success('Step reordered successfully');
  };
  
  // Update phase order in database
  const updatePhaseOrder = async (reorderedPhases: Phase[]) => {
    if (!currentProject) return;
    
    try {
      // Separate incorporated phases (linked phases) - they're not in project_phases table
      const incorporatedPhases = reorderedPhases.filter(p => p.isLinked);
      // Keep non-incorporated phases in the order they appear in reorderedPhases
      const nonIncorporatedPhases = reorderedPhases.filter(p => !p.isLinked);
      
      console.log('🔄 updatePhaseOrder - reorderedPhases:', reorderedPhases.map(p => ({ id: p.id, name: p.name, isLinked: p.isLinked })));
      console.log('🔄 updatePhaseOrder - nonIncorporatedPhases:', nonIncorporatedPhases.map(p => ({ id: p.id, name: p.name })));
      
      // Create a map of phase ID to its display_order position in reorderedPhases (excluding incorporated)
      // This ensures we set display_order based on the actual position in reorderedPhases
      let nonIncorporatedIndex = 0;
      const phaseDisplayOrderMap = new Map<string, number>();
      for (const phase of reorderedPhases) {
        if (!phase.isLinked) {
          phaseDisplayOrderMap.set(phase.id, nonIncorporatedIndex);
          nonIncorporatedIndex++;
        }
      }
      
      // Two-pass update to avoid unique constraint conflicts
      // Pass 1: Set all display_order values to temporary negative values to free up slots
      const tempUpdatePromises: Promise<void>[] = [];
      
      for (let i = 0; i < nonIncorporatedPhases.length; i++) {
        const phase = nonIncorporatedPhases[i];
        const displayOrder = phaseDisplayOrderMap.get(phase.id) ?? i;
        
        if (isEditingStandardProject && phase.isStandard) {
          // Standard phases - update standard_phases table
          const updatePromise = (async () => {
            const { data: standardPhase } = await supabase
              .from('standard_phases')
              .select('id')
              .eq('name', phase.name)
              .single();
            
            if (standardPhase) {
              // For standard phases, we can update directly since there's no unique constraint conflict
              await supabase
                .from('standard_phases')
                .update({ 
                  display_order: displayOrder,
                  updated_at: new Date().toISOString()
                })
                .eq('id', standardPhase.id);
            }
          })();
          tempUpdatePromises.push(updatePromise);
        } else {
          // Custom phases - update project_phases table (skip incorporated phases)
          const updatePromise = (async () => {
            const { data: phaseData } = await supabase
              .from('project_phases')
              .select('id')
              .eq('id', phase.id)
              .eq('project_id', currentProject.id)
              .maybeSingle();
            
            if (phaseData) {
              // First pass: set to temporary negative value to avoid conflicts
              await supabase
                .from('project_phases')
                .update({ 
                  display_order: -(displayOrder + 1000), // Use negative values as temporary
                  updated_at: new Date().toISOString()
                })
                .eq('id', phaseData.id);
            }
          })();
          tempUpdatePromises.push(updatePromise);
        }
      }
      
      await Promise.all(tempUpdatePromises);
      
      // Pass 2: Update to final display_order values (now safe since all slots are free)
      const finalUpdatePromises: Promise<void>[] = [];
      
      for (let i = 0; i < nonIncorporatedPhases.length; i++) {
        const phase = nonIncorporatedPhases[i];
        const displayOrder = phaseDisplayOrderMap.get(phase.id) ?? i;
        
        if (!isEditingStandardProject || !phase.isStandard) {
          // Only update project_phases in second pass (standard_phases already done in first pass)
          const updatePromise = (async () => {
            const { data: phaseData } = await supabase
              .from('project_phases')
              .select('id')
              .eq('id', phase.id)
              .eq('project_id', currentProject.id)
              .maybeSingle();
            
            if (phaseData) {
              await supabase
                .from('project_phases')
                .update({ 
                  display_order: displayOrder,
                  updated_at: new Date().toISOString()
                })
                .eq('id', phaseData.id);
            }
          })();
          finalUpdatePromises.push(updatePromise);
        }
      }
      
      await Promise.all(finalUpdatePromises);
      
      // Rebuild phases JSON from project_phases table (this only includes non-incorporated phases)
      const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
        p_project_id: currentProject.id
      });

      if (rebuildError) throw rebuildError;

      // Merge incorporated phases back into the rebuilt phases, preserving their order
      // The rebuilt phases are in the correct order, but we need to insert incorporated phases
      // at their correct positions based on the reorderedPhases array
      const finalPhases: Phase[] = [];
      const rebuiltPhasesArray = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
      const rebuiltPhasesMap = new Map(rebuiltPhasesArray.map((p: Phase) => [p.id, p]));
      const phaseOrderMap = new Map(reorderedPhases.map((p: Phase) => [p.id, p.phaseOrderNumber]));
      
      // Build final phases array maintaining the order from reorderedPhases
      for (const phase of reorderedPhases) {
        if (phase.isLinked) {
          // For incorporated phases, use the phase from reorderedPhases directly
          finalPhases.push(phase);
        } else {
          // For non-incorporated phases, use the rebuilt phase (which has updated operations/steps)
          const rebuiltPhase = rebuiltPhasesMap.get(phase.id);
          if (rebuiltPhase) {
            // Preserve phase order number from reorderedPhases
            const orderNumber = phaseOrderMap.get(phase.id);
            if (orderNumber !== undefined) {
              rebuiltPhase.phaseOrderNumber = orderNumber;
            }
            finalPhases.push(rebuiltPhase);
          } else {
            // Fallback to original if not found in rebuilt
            finalPhases.push(phase);
          }
        }
      }

      // IMPORTANT: Apply enforceStandardPhaseOrdering FIRST to ensure Close Project is always last
      // This preserves custom/incorporated phase order but ensures standard phases are in correct positions
      const orderedPhases = enforceStandardPhaseOrdering(finalPhases);
      
      // Preserve existing order numbers before applying ensureUniqueOrderNumbers
      const orderNumberMap = new Map(finalPhases.map(p => [p.id, p.phaseOrderNumber]));
      
      // THEN assign order numbers based on the correct order, but preserve existing ones
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
      
      // Restore preserved order numbers for incorporated phases
      phasesWithUniqueOrder.forEach(phase => {
        if (phase.isLinked && orderNumberMap.has(phase.id)) {
          const preservedOrder = orderNumberMap.get(phase.id);
          if (preservedOrder !== undefined) {
            phase.phaseOrderNumber = preservedOrder;
          }
        }
      });
      
      // Sort phases by order number before saving
      const sortedPhases = sortPhasesByOrderNumber(phasesWithUniqueOrder);
      
      // Save final phases JSON to database - explicitly include phaseOrderNumber
      const phasesToSave = sortedPhases.map(phase => ({
        ...phase,
        phaseOrderNumber: phase.phaseOrderNumber // Explicitly include phaseOrderNumber
      }));
      
      await supabase
        .from('projects')
        .update({ phases: phasesToSave as any })
        .eq('id', currentProject.id);
      
      // Update local context with sorted phases
      updateProject({
        ...currentProject,
        phases: sortedPhases as any,
        updatedAt: new Date()
      });
      
      // Update display state immediately with the reordered phases
      console.log('🔄 Updating displayPhases with reordered phases:', {
        count: sortedPhases.length,
        phases: sortedPhases.map(p => ({ id: p.id, name: p.name, order: p.phaseOrderNumber }))
      });
      
      setDisplayPhases(sortedPhases);
      
      toast.success('Phase reordered successfully');
    } catch (error) {
      console.error('Error reordering phases:', error);
      toast.error('Failed to reorder phases');
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

  // Validation functions for duplicate names
  const validatePhaseNames = (phases: Phase[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const phaseNames = new Map<string, number>();
    
    phases.forEach((phase, index) => {
      const name = phase.name?.trim();
      if (!name) return;
      
      if (phaseNames.has(name)) {
        errors.push(`Duplicate phase name: "${name}"`);
      } else {
        phaseNames.set(name, index);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateOperationNames = (phases: Phase[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    phases.forEach(phase => {
      const operationNames = new Map<string, number>();
      
      phase.operations?.forEach((operation, index) => {
        const name = operation.name?.trim();
        if (!name) return;
        
        if (operationNames.has(name)) {
          errors.push(`Duplicate operation name "${name}" in phase "${phase.name}"`);
        } else {
          operationNames.set(name, index);
        }
      });
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const validateStepNames = (phases: Phase[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    phases.forEach(phase => {
      phase.operations?.forEach(operation => {
        const stepNames = new Map<string, number>();
        
        operation.steps?.forEach((step, index) => {
          const name = step.step?.trim();
          if (!name) return;
          
          if (stepNames.has(name)) {
            errors.push(`Duplicate step name "${name}" in operation "${operation.name}" (phase "${phase.name}")`);
          } else {
            stepNames.set(name, index);
          }
        });
      });
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const getUniquePhaseName = (baseName: string, existingPhases: Phase[]): string => {
    const existingNames = new Set(existingPhases.map(p => p.name?.trim().toLowerCase()));
    let candidateName = baseName;
    let counter = 1;
    
    while (existingNames.has(candidateName.toLowerCase())) {
      counter++;
      candidateName = `${baseName} ${counter}`;
    }
    
    return candidateName;
  };

  // CRUD operations
  const addPhase = async () => {
    console.log('🔵 Add Phase button clicked', {
      hasProject: !!currentProject,
      projectId: currentProject?.id,
      isEditingStandardProject,
      isAddingPhase
    });
    
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }
    
    if (isAddingPhase) {
      console.log('⚠️ Already adding phase, ignoring click');
      return; // Prevent multiple clicks
    }
    
    setIsAddingPhase(true);
    const startTime = Date.now();
    const minDisplayTime = 2000; // Minimum 2 seconds to show loading state
    
    try {
      // Get unique phase name by checking existing phases from the database
      // Query the database directly to ensure we have all phase names, not just what's in displayPhases
      const { data: existingPhasesData, error: fetchError } = await supabase
        .from('project_phases')
        .select('name')
        .eq('project_id', currentProject.id);
      
      if (fetchError) {
        console.warn('⚠️ Could not fetch existing phases from database, using currentProject.phases:', fetchError);
      }
      
      // Use database phases if available, otherwise fall back to currentProject.phases
      const allExistingPhases = existingPhasesData && existingPhasesData.length > 0
        ? existingPhasesData.map(p => ({ name: p.name } as Phase))
        : (currentProject.phases || []);
      
      const uniquePhaseName = getUniquePhaseName('New Phase', allExistingPhases);
      const phaseDescription = 'Phase description';

      console.log('🔵 Calling add_custom_project_phase RPC', {
        projectId: currentProject.id,
        phaseName: uniquePhaseName,
        isStandardProject: isEditingStandardProject,
        existingPhaseCount: allExistingPhases.length
      });

      // Use RPC to safely insert a custom phase with a unique display order
      // The RPC function will check for duplicate phase names within the project
      const { data: rpcResult, error: addPhaseError } = await supabase.rpc('add_custom_project_phase', {
        p_project_id: currentProject.id,
        p_phase_name: uniquePhaseName,
        p_phase_description: phaseDescription
      });

      if (addPhaseError) {
        console.error('❌ Error adding phase:', addPhaseError);
        console.error('❌ Full error details:', JSON.stringify(addPhaseError, null, 2));
        // Check if error is due to duplicate phase name
        if (addPhaseError.message && addPhaseError.message.includes('already exists')) {
          toast.error(`A phase with the name "${uniquePhaseName}" already exists in this project. Please try again - a unique name will be generated automatically.`);
        } else if (addPhaseError.code === '23505' && addPhaseError.message.includes('idx_project_phases_project_name_unique')) {
          toast.error(`A phase with the name "${uniquePhaseName}" already exists in this project. Please try again - a unique name will be generated automatically.`);
        } else {
          console.error('❌ Unexpected error adding phase:', {
            error: addPhaseError,
            errorCode: addPhaseError.code,
            errorMessage: addPhaseError.message,
            errorDetails: addPhaseError.details,
            errorHint: addPhaseError.hint,
            projectId: currentProject.id,
            isStandardProject: isEditingStandardProject,
            phaseName: uniquePhaseName
          });
          const errorMessage = addPhaseError.message || addPhaseError.details || 'Unknown error';
          toast.error(`Failed to add phase: ${errorMessage}`);
          throw addPhaseError;
        }
        return;
      }
      
      console.log('✅ Phase added successfully:', {
        rpcResult,
        projectId: currentProject.id,
        isStandardProject: isEditingStandardProject,
        phaseName: uniquePhaseName
      });

      // CRITICAL: Update the is_standard flag in project_phases table IMMEDIATELY after RPC call
      // This must happen before rebuilding phases to ensure the correct flag is used
      // Query for the newly added phase by name to get its ID
      const { data: newPhaseData, error: phaseQueryError } = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', currentProject.id)
        .eq('name', uniquePhaseName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      // CRITICAL: Store the phase ID for later use
      let addedPhaseId: string | null = null;
      
      if (!phaseQueryError && newPhaseData?.id) {
        addedPhaseId = newPhaseData.id;
        // CRITICAL: For regular templates, is_standard must be false (not undefined)
        // For Standard Project Foundation, is_standard should be true
        const shouldBeStandard = Boolean(isEditingStandardProject);
        
        const { error: phaseUpdateError } = await supabase
          .from('project_phases')
          .update({ 
            is_standard: shouldBeStandard // Explicitly set to true or false, never undefined
          })
          .eq('id', newPhaseData.id)
          .eq('project_id', currentProject.id);
        
        if (phaseUpdateError) {
          console.error('❌ Error updating project_phases is_standard flag:', phaseUpdateError);
          // Don't throw - continue with rebuild
        } else {
          console.log('✅ Updated project_phases is_standard flag BEFORE rebuild:', {
            phaseId: newPhaseData.id,
            phaseName: uniquePhaseName,
            isStandard: shouldBeStandard,
            isEditingStandardProject
          });
        }
      } else {
        console.warn('⚠️ Could not find newly added phase to update is_standard flag:', phaseQueryError);
      }

      // Rebuild phases JSON from relational data
      const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
        p_project_id: currentProject.id
      });

      if (rebuildError) {
        console.error('❌ Error rebuilding phases:', rebuildError);
        throw rebuildError;
      }
      
      console.log('✅ Rebuilt phases:', {
        count: Array.isArray(rebuiltPhases) ? rebuiltPhases.length : 0,
        phases: rebuiltPhases
      });

      // Merge with any incorporated phases from current project (they're not in project_phases table)
      const rebuiltPhasesArray = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
      const currentPhases = currentProject.phases || [];
      const incorporatedPhases = currentPhases.filter(p => p.isLinked);
      const allPhases = [...rebuiltPhasesArray, ...incorporatedPhases];
      const rawPhases = deduplicatePhases(allPhases);
      // IMPORTANT: Apply enforceStandardPhaseOrdering FIRST to ensure Close Project is last
      const orderedPhases = enforceStandardPhaseOrdering(rawPhases);
      // THEN assign order numbers based on the correct order
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
      
      // CRITICAL: Set isStandard flag correctly based on whether we're editing Standard Project Foundation
      // - When editing Standard Project Foundation (isEditingStandardProject = true): 
      //   Newly added phases should be isStandard: true (they become part of the standard foundation)
      // - When editing regular project templates (isEditingStandardProject = false):
      //   Newly added phases should be isStandard: false (they're custom phases)
      // CRITICAL: Always use explicit boolean values, never undefined
      const shouldBeStandard = Boolean(isEditingStandardProject);
      
      const phasesWithCorrectStandardFlag = phasesWithUniqueOrder.map(phase => {
        // If this is the newly added phase, set isStandard based on editing mode
        if (phase.name === uniquePhaseName || (addedPhaseId && phase.id === addedPhaseId)) {
          // CRITICAL: For regular templates, newly added phases are NEVER standard
          // Only allow standard if we're editing Standard Project Foundation
          const finalIsStandard = shouldBeStandard;
          console.log('🔵 Setting isStandard for newly added phase:', {
            phaseId: phase.id,
            phaseName: phase.name,
            shouldBeStandard,
            isEditingStandardProject,
            finalIsStandard
          });
          return {
            ...phase,
            isStandard: finalIsStandard // Explicitly true or false, never undefined
          };
        }
        // For existing phases, preserve their isStandard flag
        // When editing Standard Project Foundation, phases added there become standard
        // When editing regular templates, phases added there are custom (isStandard: false)
        return phase;
      });

      // Update project with rebuilt phases (using phases with correct isStandard flags)
      const { error: updateError } = await supabase
        .from('projects')
        .update({ phases: phasesWithCorrectStandardFlag as any })
        .eq('id', currentProject.id);
        
      if (updateError) {
        console.error('❌ Error updating project phases:', updateError);
        throw updateError;
      }

      // Note: The is_standard flag was already updated in project_phases table BEFORE rebuilding phases
      // This ensures the rebuild function reads the correct value from the database

      console.log('✅ Updated project phases in database:', {
        projectId: currentProject.id,
        phaseCount: phasesWithCorrectStandardFlag.length,
        phaseNames: phasesWithCorrectStandardFlag.map(p => p.name),
        newPhaseIncluded: phasesWithCorrectStandardFlag.some(p => p.name === uniquePhaseName),
        newPhaseIsStandard: phasesWithCorrectStandardFlag.find(p => p.name === uniquePhaseName)?.isStandard,
        isEditingStandardProject
      });

      // Update local context immediately - this triggers mergedPhases recalculation
      const updatedProject = {
        ...currentProject,
        phases: phasesWithCorrectStandardFlag,
        updatedAt: new Date()
      };
      updateProject(updatedProject);

      console.log('✅ Updated local context:', {
        projectId: updatedProject.id,
        phaseCount: updatedProject.phases.length,
        phaseNames: updatedProject.phases.map(p => p.name),
        phaseIsStandardFlags: updatedProject.phases.map(p => ({ name: p.name, isStandard: p.isStandard }))
      });

      // Update display state immediately to show the new phase right away
      // This ensures the phase is visible even before refetch completes
      // Find the newly added phase from phasesWithCorrectStandardFlag
      const addedPhase = phasesWithCorrectStandardFlag.find(p => 
        p.name === uniquePhaseName || (addedPhaseId && p.id === addedPhaseId)
      );
      
      if (addedPhase?.id) {
        setJustAddedPhaseId(addedPhase.id);
        // Clear the flag after refetch completes
        setTimeout(() => {
          setJustAddedPhaseId(null);
        }, 2000);
      }
      
      console.log('✅ Setting displayPhases:', {
        count: phasesWithCorrectStandardFlag.length,
        phaseNames: phasesWithCorrectStandardFlag.map(p => p.name),
        phaseIsStandardFlags: phasesWithCorrectStandardFlag.map(p => ({ name: p.name, isStandard: p.isStandard })),
        newPhaseName: uniquePhaseName,
        newPhaseId: addedPhase?.id,
        newPhaseIsStandard: addedPhase?.isStandard,
        isStandardProject: isEditingStandardProject,
        shouldBeStandard
      });
      
      // CRITICAL: Update displayPhases immediately with the new phase
      // This ensures it's visible right away
      setDisplayPhases(phasesWithCorrectStandardFlag);
      setPhasesLoaded(true);
      
      // Note: updatedProject was already created and updateProject called above (line 1493-1498)
      // No need to duplicate this - the phase is already persisted
      
      // Trigger refetch of dynamic phases to ensure consistency
      // Add a small delay to allow database to fully propagate the change
      // This ensures useDynamicPhases includes the new phase in future renders
      // The refetch will update rebuiltPhases, which will then be merged with currentProject.phases
      setTimeout(() => {
        console.log('🔄 Triggering refetch of dynamic phases after add phase...');
        refetchDynamicPhases();
      }, 2000); // Increased delay to ensure database propagation
      
      // Ensure minimum display time for loading state
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      toast.success('Phase added successfully');
    } catch (error: any) {
      console.error('❌ Error adding phase:', error);
      console.error('❌ Error details:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        projectId: currentProject?.id,
        isStandardProject: isEditingStandardProject
      });
      toast.error(`Failed to add phase: ${error?.message || 'Unknown error'}`);
      
      // Ensure minimum display time even on error
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } finally {
      setIsAddingPhase(false);
    }
  };
  const handleIncorporatePhase = async (incorporatedPhase: Phase & {
    sourceProjectId: string;
    sourceProjectName: string;
    incorporatedRevision: number;
  }) => {
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

    try {
      // Generate new ID to avoid conflicts
      const newPhaseId = `linked-phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const linkedPhase: Phase = {
        ...incorporatedPhase,
        id: newPhaseId,
        // Use new ID to avoid conflicts
        isLinked: true,
        sourceProjectId: incorporatedPhase.sourceProjectId,
        sourceProjectName: incorporatedPhase.sourceProjectName,
        incorporatedRevision: incorporatedPhase.incorporatedRevision
      };
      console.log('🔍 Created linked phase:', linkedPhase);

      // Add linked phase and enforce standard phase ordering
      const phasesWithLinked = [...currentProject.phases, linkedPhase];
      const orderedPhases = enforceStandardPhaseOrdering(phasesWithLinked);
      
      // Ensure unique and consecutive order numbers
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
      
      // Log phases with order numbers before saving
      console.log('🔍 Phases with order numbers before save:', phasesWithUniqueOrder.map(p => ({ 
        id: p.id, 
        name: p.name, 
        isLinked: p.isLinked, 
        phaseOrderNumber: p.phaseOrderNumber 
      })));
      
      // Save to database - incorporated phases are stored in JSON only
      // Make sure phaseOrderNumber is included in the JSON
      const phasesToSave = phasesWithUniqueOrder.map(phase => ({
        ...phase,
        phaseOrderNumber: phase.phaseOrderNumber // Explicitly include phaseOrderNumber
      }));
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          phases: phasesToSave as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProject.id);

      if (updateError) {
        console.error('Error saving incorporated phase:', updateError);
        toast.error('Failed to save incorporated phase');
        return;
      }

      // Verify the save by reading back from database
      const { data: savedProject, error: readError } = await supabase
        .from('projects')
        .select('phases')
        .eq('id', currentProject.id)
        .single();

      if (readError) {
        console.error('Error reading back saved phases:', readError);
        toast.error('Failed to verify saved phase');
        return;
      }

      // Use the phases from the database to ensure consistency
      const savedPhases = Array.isArray(savedProject?.phases) ? savedProject.phases : phasesWithUniqueOrder;
      
      // Check if order numbers are preserved in saved phases
      console.log('🔍 Saved phases from database:', savedPhases.map(p => ({ 
        id: p.id, 
        name: p.name, 
        isLinked: p.isLinked, 
        phaseOrderNumber: p.phaseOrderNumber 
      })));
      
      // Apply ordering to saved phases, but preserve existing order numbers for ALL phases
      const orderedSavedPhases = enforceStandardPhaseOrdering(savedPhases);
      
      // Create a map of saved phases with their order numbers
      const savedPhasesMap = new Map(savedPhases.map(p => [p.id, p]));
      
      // Preserve order numbers from saved data for ALL phases (not just incorporated)
      orderedSavedPhases.forEach(phase => {
        if (savedPhasesMap.has(phase.id)) {
          const savedPhase = savedPhasesMap.get(phase.id);
          if (savedPhase?.phaseOrderNumber !== undefined) {
            // Preserve the order number from the database
            phase.phaseOrderNumber = savedPhase.phaseOrderNumber;
          }
        }
      });
      
      // Only assign order numbers to phases that don't have them
      // Don't overwrite existing order numbers
      const finalPhases = orderedSavedPhases.map(phase => {
        if (phase.phaseOrderNumber === undefined) {
          // Only assign if missing - use ensureUniqueOrderNumbers logic but preserve existing
          const isStandard = !phase.isLinked && isStandardPhase(phase);
          
          if (isStandard) {
            // For standard phases, assign based on position
            // First standard phase gets 'first', last gets 'last', others get sequential numbers
            const standardPhases = savedPhases.filter(p => isStandardPhase(p) && !p.isLinked);
            const standardIndex = standardPhases.findIndex(p => p.id === phase.id);
            if (standardIndex === 0) {
              phase.phaseOrderNumber = 'first';
            } else if (standardIndex === standardPhases.length - 1) {
              phase.phaseOrderNumber = 'last';
            } else {
              phase.phaseOrderNumber = standardIndex + 1;
            }
          } else {
            // Find next available number
            const usedNumbers = new Set(orderedSavedPhases
              .filter(p => p.phaseOrderNumber !== undefined)
              .map(p => p.phaseOrderNumber));
            let candidateNumber = 4;
            while (usedNumbers.has(candidateNumber) && candidateNumber <= orderedSavedPhases.length + 10) {
              candidateNumber++;
            }
            phase.phaseOrderNumber = candidateNumber;
          }
        }
        return phase;
      });
      
      // Sort phases by order number before displaying
      const sortedFinalPhases = sortPhasesByOrderNumber(finalPhases);
      
      // Log final phases with order numbers
      console.log('🔍 Final phases with order numbers:', sortedFinalPhases.map(p => ({ 
        id: p.id, 
        name: p.name, 
        isLinked: p.isLinked, 
        phaseOrderNumber: p.phaseOrderNumber 
      })));

      // Update local context immediately with verified data
      const updatedProject = {
        ...currentProject,
        phases: sortedFinalPhases,
        updatedAt: new Date()
      };
      console.log('🔍 Updated project phases count:', updatedProject.phases.length);
      updateProject(updatedProject);
      
      // Update display state immediately with verified data
      setDisplayPhases(sortedFinalPhases);
      
      toast.success('Phase incorporated successfully');
    } catch (error) {
      console.error('Error incorporating phase:', error);
      toast.error('Failed to incorporate phase');
    }
  };

  const addOperation = async (phaseId: string) => {
    if (!currentProject) return;
    const phase = displayPhases.find(p => p.id === phaseId);
    if (!phase) return;

    // Block adding operations to linked phases
    if (phase.isLinked) {
      toast.error('Cannot add operations to incorporated phases');
      return;
    }

    // Block adding operations to standard phases unless editing Standard Project
    if (phase.isStandard && !isEditingStandardProject) {
      toast.error('Cannot add operations to standard phases');
      return;
    }

    // Check for duplicate operation names within this phase
    const existingOperationNames = new Set(
      phase.operations?.map(op => op.name?.trim().toLowerCase()).filter(Boolean) || []
    );
    let operationName = 'New Operation';
    let counter = 1;
    while (existingOperationNames.has(operationName.toLowerCase())) {
      counter++;
      operationName = `New Operation ${counter}`;
    }

    try {
      const phaseIndex = currentProject.phases.findIndex(p => p.id === phaseId);
      if (phaseIndex === -1) return;

      const operationCount = currentProject.phases[phaseIndex].operations.length;
      
      // Get the project_phases record to link the operation
      const { data: projectPhase } = await supabase
        .from('project_phases')
        .select('id, name, description, display_order, is_standard')
        .eq('id', phaseId)
        .eq('project_id', currentProject.id)
        .single();

      if (!projectPhase) {
        toast.error('Phase not found in database');
        return;
      }
      
      // Insert operation into template_operations using project_phase ID
      const operationPayload: Record<string, any> = {
        project_id: currentProject.id,
        phase_id: projectPhase.id,
        name: operationName,
        description: 'Operation description',
        display_order: operationCount,
        flow_type: 'prime'
      };

      if (!projectPhase.is_standard) {
        operationPayload.custom_phase_name = projectPhase.name;
        operationPayload.custom_phase_description = projectPhase.description;
        operationPayload.custom_phase_display_order = projectPhase.display_order;
      }

      const { data: newOperation, error } = await supabase
        .from('template_operations')
        .insert([operationPayload as any])
        .select()
        .single();

      if (error) throw error;

      // Add a default step to this operation
      const { error: defaultStepError } = await supabase
        .from('template_steps')
        .insert({
          operation_id: newOperation.id,
          step_number: 1,
          step_title: 'New Step',
          description: 'Step description',
          content_sections: [],
          materials: [],
          tools: [],
          outputs: [],
          apps: [],
          estimated_time_minutes: 0,
          display_order: 0,
          flow_type: 'prime',
          step_type: 'prime'
        });

      if (defaultStepError) throw defaultStepError;

      // Rebuild phases JSON from project_phases
      const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
        p_project_id: currentProject.id
      });

      if (rebuildError) throw rebuildError;

      // Update project with rebuilt phases
      await supabase
        .from('projects')
        .update({ phases: rebuiltPhases as any })
        .eq('id', currentProject.id);

      updateProject({
        ...currentProject,
        phases: rebuiltPhases as any,
        updatedAt: new Date()
      });

      toast.success('Operation added');
    } catch (error) {
      console.error('Error adding operation:', error);
      toast.error('Failed to add operation');
    }
  };
  const addStep = async (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    const phase = displayPhases.find(p => p.id === phaseId);
    if (!phase) return;
    const operation = phase.operations.find(o => o.id === operationId);
    if (!operation) return;

    // Block adding steps to linked phases
    if (phase.isLinked) {
      toast.error('Cannot add steps to incorporated phases');
      return;
    }

    // Block adding steps to standard operations unless editing Standard Project
    if (operation.isStandard && !isEditingStandardProject) {
      toast.error('Cannot add steps to standard operations');
      return;
    }

    // Check for duplicate step names within this operation
    const existingStepNames = new Set(
      operation.steps?.map(step => step.step?.trim().toLowerCase()).filter(Boolean) || []
    );
    let stepName = 'New Step';
    let counter = 1;
    while (existingStepNames.has(stepName.toLowerCase())) {
      counter++;
      stepName = `New Step ${counter}`;
    }

    try {
      // The operationId from the UI IS the database ID after rebuild
      // Use it directly
      const actualOperationId = operationId;
      
      // Get current step count for this operation
      const { count } = await supabase
        .from('template_steps')
        .select('*', { count: 'exact', head: true })
        .eq('operation_id', actualOperationId);

      const stepCount = count || 0;
      
      // Insert step into template_steps
      const { error } = await supabase
        .from('template_steps')
        .insert({
          operation_id: actualOperationId,
          step_number: stepCount + 1,
          step_title: stepName,
          description: 'Step description',
          content_sections: [],
          materials: [],
          tools: [],
          outputs: [],
          apps: [],
          estimated_time_minutes: 0,
          display_order: stepCount,
          flow_type: 'prime',
          step_type: 'prime',
          time_estimate_low: null,
          time_estimate_medium: null,
          time_estimate_high: null
        });

      if (error) throw error;

      // Rebuild and enforce ordering using new function
      const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
        p_project_id: currentProject.id
      });

      if (rebuildError) throw rebuildError;

      // Update project
      await supabase
        .from('projects')
        .update({ phases: rebuiltPhases as any })
        .eq('id', currentProject.id);

      updateProject({
        ...currentProject,
        phases: rebuiltPhases as any,
        updatedAt: new Date()
      });

      toast.success('Step added');
    } catch (error) {
      console.error('Error adding step:', error);
      toast.error('Failed to add step');
    }
  };

  // Delete operations - Allow deleting in Edit Standard mode
  const handleDeletePhaseClick = (phaseId: string) => {
    if (!currentProject) return;

    // Check if this is a standard phase
    const phase = displayPhases.find(p => p.id === phaseId);

    // Block deleting standard phases (unless editing Standard Project Foundation)
    if (!isEditingStandardProject && phase && isStandardPhase(phase)) {
      toast.error('Cannot delete standard phases. Standard phases are locked and linked to all project templates.');
      return;
    }

    setPhaseToDelete(phaseId);
    setDeletePhaseDialogOpen(true);
  };

  const deletePhase = async () => {
    if (!currentProject || !phaseToDelete) return;

    setIsDeletingPhase(true);
    const startTime = Date.now();
    const minDisplayTime = 2000; // Minimum 2 seconds to show loading state

    try {
      // Check if this is an incorporated phase (stored only in JSON)
      const phase = displayPhases.find(p => p.id === phaseToDelete);
      const isIncorporatedPhase = phase?.isLinked;

      if (isIncorporatedPhase) {
        // For incorporated phases, just remove from JSON
        const updatedPhases = currentProject.phases.filter(p => p.id !== phaseToDelete);
        const orderedPhases = enforceStandardPhaseOrdering(updatedPhases);
        const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
        const sortedPhases = sortPhasesByOrderNumber(phasesWithUniqueOrder);

        // Update project JSON
        const { error: updateError } = await supabase
          .from('projects')
          .update({ phases: sortedPhases as any })
          .eq('id', currentProject.id);

        if (updateError) throw updateError;

        // Update local context immediately
        const updatedProject = {
          ...currentProject,
          phases: sortedPhases,
          updatedAt: new Date()
        };
        updateProject(updatedProject);

        // Update display state immediately - don't call loadFreshPhases() for incorporated phases
        // since they're only stored in JSON and we already have the updated data
        setDisplayPhases(sortedPhases);
      } else {
        // For regular phases, delete from database tables
        // Find the project_phases record by name (since UI phase IDs are different from DB IDs)
        const { data: projectPhase } = await supabase
          .from('project_phases')
          .select('id')
          .eq('project_id', currentProject.id)
          .eq('id', phaseToDelete)
          .single();

        if (!projectPhase) {
          toast.error('Phase not found in database');
          return;
        }

        // Delete from database - get operations first
        const { data: operations } = await supabase
          .from('template_operations')
          .select('id')
          .eq('project_id', currentProject.id)
          .eq('phase_id', projectPhase.id);

        if (operations && operations.length > 0) {
          const operationIds = operations.map(op => op.id);
          
          // Delete steps first
          await supabase
            .from('template_steps')
            .delete()
            .in('operation_id', operationIds);

          // Delete operations
          await supabase
            .from('template_operations')
            .delete()
            .eq('phase_id', projectPhase.id);
        }

        // Delete phase
        await supabase
          .from('project_phases')
          .delete()
          .eq('id', projectPhase.id);

        // Rebuild phases JSON
        const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
          p_project_id: currentProject.id
        });

        if (rebuildError) throw rebuildError;

        // Merge with any incorporated phases from current project
        const rebuiltPhasesArray = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
        const currentPhases = currentProject.phases || [];
        const incorporatedPhases = currentPhases.filter(p => p.isLinked && p.id !== phaseToDelete);
        const allPhases = [...rebuiltPhasesArray, ...incorporatedPhases];
        const rawPhases = deduplicatePhases(allPhases);
        // IMPORTANT: Apply enforceStandardPhaseOrdering FIRST to ensure Close Project is last
        const orderedPhases = enforceStandardPhaseOrdering(rawPhases);
        // THEN assign order numbers based on the correct order
        const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);

        // Update project
        await supabase
          .from('projects')
          .update({ phases: phasesWithUniqueOrder as any })
          .eq('id', currentProject.id);

        // Update local context immediately
        const updatedProject = {
          ...currentProject,
          phases: phasesWithUniqueOrder,
          updatedAt: new Date()
        };
        updateProject(updatedProject);

        // Update display state immediately - filter out deleted phase to prevent flicker
        // This ensures the phase disappears immediately and doesn't reappear during refetch
        setDisplayPhases(phasesWithUniqueOrder.filter(p => p.id !== phaseToDelete));
      }

      // Ensure minimum display time for loading state
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      toast.success('Phase deleted');
      setDeletePhaseDialogOpen(false);
      setPhaseToDelete(null);
      
      // Refetch from database once to ensure consistency, but only after state is updated
      // This single refetch will update the mergedPhases, which will then update displayPhases
      // The deleted phase is already filtered out, so it won't reappear
      setTimeout(() => {
        refetchDynamicPhases();
      }, 1000);
    } catch (error) {
      console.error('Error deleting phase:', error);
      toast.error('Failed to delete phase');
      
      // Ensure minimum display time even on error
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
    } finally {
      setIsDeletingPhase(false);
    }
  };
  const deleteOperation = async (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    const phase = currentProject.phases.find(p => p.id === phaseId);
    const operation = phase?.operations.find(op => op.id === operationId);

    // In Edit Standard mode, allow deleting even standard operations
    if (!isEditingStandardProject && operation?.isStandard) {
      toast.error('Cannot delete standard operations. Use Edit Standard to modify standard phases.');
      return;
    }

    if (!confirm('Are you sure you want to delete this operation? This will also delete all its steps.')) {
      return;
    }

    try {
      // Delete steps first
      await supabase
        .from('template_steps')
        .delete()
        .eq('operation_id', operationId);

      // Delete operation
      await supabase
        .from('template_operations')
        .delete()
        .eq('id', operationId);

      // Rebuild phases JSON
      const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
        p_project_id: currentProject.id
      });

      if (rebuildError) throw rebuildError;

      // Update project
      await supabase
        .from('projects')
        .update({ phases: rebuiltPhases as any })
        .eq('id', currentProject.id);

      updateProject({
        ...currentProject,
        phases: rebuiltPhases as any,
        updatedAt: new Date()
      });

      toast.success('Operation deleted');
    } catch (error) {
      console.error('Error deleting operation:', error);
      toast.error('Failed to delete operation');
    }
  };
  const deleteStep = async (phaseId: string, operationId: string, stepId: string) => {
    if (!currentProject) return;
    const phase = currentProject.phases.find(p => p.id === phaseId);
    const operation = phase?.operations.find(op => op.id === operationId);
    const step = operation?.steps.find(s => s.id === stepId);

    // In Edit Standard mode, allow deleting even standard steps
    if (!isEditingStandardProject && step?.isStandard) {
      toast.error('Cannot delete standard steps. Use Edit Standard to modify standard phases.');
      return;
    }

    if (!confirm('Are you sure you want to delete this step?')) {
      return;
    }

    try {
      // Delete step from database
      await supabase
        .from('template_steps')
        .delete()
        .eq('id', stepId);

      // Rebuild phases JSON
      const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
        p_project_id: currentProject.id
      });

      if (rebuildError) throw rebuildError;

      // Update project
      await supabase
        .from('projects')
        .update({ phases: rebuiltPhases as any })
        .eq('id', currentProject.id);

      updateProject({
        ...currentProject,
        phases: rebuiltPhases as any,
        updatedAt: new Date()
      });

      toast.success('Step deleted');
    } catch (error) {
      console.error('Error deleting step:', error);
      toast.error('Failed to delete step');
    }
  };

  // Edit operations - Allow editing in Edit Standard mode
  const startEdit = (type: 'phase' | 'operation' | 'step', id: string, data: any) => {
    // Block editing of incorporated phases, operations, and steps
    if (type === 'phase') {
      const phase = displayPhases.find(p => p.id === id);
      if (phase?.isLinked) {
        toast.error('Cannot edit incorporated phases. They are dynamically linked to the source project.');
        return;
      }
    } else if (type === 'operation' || type === 'step') {
      // Find the parent phase to check if it's incorporated
      const parentPhase = displayPhases.find(p => 
        p.operations.some(op => 
          op.id === id || op.steps.some(s => s.id === id)
        )
      );
      if (parentPhase?.isLinked) {
        toast.error('Cannot edit operations or steps in incorporated phases. They are dynamically linked to the source project.');
        return;
      }
    }
    
    // In Edit Standard mode, allow editing all items including standard ones
    if (!isEditingStandardProject) {
      if (type === 'phase') {
        const phase = displayPhases.find(p => p.id === id);
        if (phase?.isStandard) {
          toast.error('Cannot edit standard phases. Use Edit Standard to modify standard phases.');
          return;
        }
      } else if (type === 'operation') {
        // Check if this operation is marked as standard
        if (data?.isStandard) {
          toast.error('Cannot edit standard operations. Use Edit Standard to modify standard phases.');
          return;
        }
      } else if (type === 'step') {
        // Check if this step is marked as standard
        if (data?.isStandard) {
          toast.error('Cannot edit standard steps. Use Edit Standard to modify standard phases.');
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
  const saveEdit = async () => {
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
        
        // Validate phase names for duplicates
        const phaseValidation = validatePhaseNames(updatedProject.phases);
        if (!phaseValidation.isValid) {
          toast.error(phaseValidation.errors[0] || 'Duplicate phase names found');
          return;
        }
        
        // Update phase name/description in project_phases table
        const phase = updatedProject.phases[phaseIndex];
        if (!phase.isStandard || isEditingStandardProject) {
          // Check for duplicate phase name in database before updating
          const newPhaseName = editingItem.data.name?.trim();
          if (newPhaseName) {
            const { data: existingPhases, error: checkError } = await supabase
              .from('project_phases')
              .select('id, name')
              .eq('project_id', currentProject.id)
              .neq('id', phase.id) // Exclude current phase
              .ilike('name', newPhaseName);

            if (checkError) {
              console.error('Error checking for duplicate phase name:', checkError);
              toast.error('Failed to validate phase name');
              return;
            }

            if (existingPhases && existingPhases.length > 0) {
              const exactMatch = existingPhases.find(p => p.name.trim().toLowerCase() === newPhaseName.toLowerCase());
              if (exactMatch) {
                toast.error(`A phase with the name "${newPhaseName}" already exists in this project. Please choose a unique name.`);
                return;
              }
            }
          }

          // Update custom phases in project_phases table
          const { data: projectPhase, error: fetchError } = await supabase
            .from('project_phases')
            .select('id')
            .eq('id', phase.id)
            .eq('project_id', currentProject.id)
            .single();
          
          if (projectPhase && !fetchError) {
            const { error: updateError } = await supabase
              .from('project_phases')
              .update({ 
                name: editingItem.data.name,
                description: editingItem.data.description || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', projectPhase.id);
            
            if (updateError) {
              // Check if error is due to duplicate name constraint
              if (updateError.code === '23505' && updateError.message.includes('idx_project_phases_project_name_unique')) {
                toast.error(`A phase with the name "${editingItem.data.name}" already exists in this project. Please choose a unique name.`);
              } else {
              console.error('❌ Error updating phase name:', updateError);
              toast.error('Failed to save phase name');
              }
              return;
            }
          }
        }
      }
    } else if (editingItem.type === 'operation') {
      for (const phase of updatedProject.phases) {
        const operationIndex = phase.operations.findIndex(o => o.id === editingItem.id);
        if (operationIndex !== -1) {
          phase.operations[operationIndex] = {
            ...phase.operations[operationIndex],
            ...editingItem.data
          };
          
          // Validate operation names for duplicates within this phase
          const operationValidation = validateOperationNames([phase]);
          if (!operationValidation.isValid) {
            toast.error(operationValidation.errors[0] || 'Duplicate operation names found');
            return;
          }
          
          // Update operation name/description in template_operations table
          const operation = phase.operations[operationIndex];
          if (!operation.isStandard || isEditingStandardProject) {
            const { error: updateError } = await supabase
              .from('template_operations')
              .update({ 
                name: editingItem.data.name,
                description: editingItem.data.description || null,
                updated_at: new Date().toISOString()
              })
              .eq('id', operation.id);
            
            if (updateError) {
              console.error('❌ Error updating operation name:', updateError);
              toast.error('Failed to save operation name');
              return;
            }
          }
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
            
            // Validate step names for duplicates within this operation
            const stepValidation = validateStepNames([{ ...phase, operations: [operation] }]);
            if (!stepValidation.isValid) {
              toast.error(stepValidation.errors[0] || 'Duplicate step names found');
              return;
            }
            
            // Update step name/description in template_steps table
            const step = operation.steps[stepIndex];
            if (!step.isStandard || isEditingStandardProject) {
              const { error: updateError } = await supabase
                .from('template_steps')
                .update({ 
                  step_title: editingItem.data.step || editingItem.data.step_title,
                  description: editingItem.data.description || null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', step.id);
              
              if (updateError) {
                console.error('❌ Error updating step name:', updateError);
                toast.error('Failed to save step name');
                return;
              }
            }
            break;
          }
        }
      }
    }
    // Rebuild phases from database to ensure JSON is updated with correct names
    const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
      p_project_id: currentProject.id
    });

    if (!rebuildError && rebuiltPhases) {
      // Merge incorporated phases back in (they're not in project_phases table)
      const rebuiltPhasesArray = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
      const incorporatedPhases = updatedProject.phases.filter(p => p.isLinked);
      const allPhases = [...rebuiltPhasesArray, ...incorporatedPhases];
      const rawPhases = deduplicatePhases(allPhases);
      const orderedPhases = enforceStandardPhaseOrdering(rawPhases);
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
      const sortedPhases = sortPhasesByOrderNumber(phasesWithUniqueOrder);
      
      // Update JSON column in database
      await supabase
        .from('projects')
        .update({ 
          phases: sortedPhases as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProject.id);
      
      // Update local state with fresh data
      updatedProject.phases = sortedPhases;
      setDisplayPhases(sortedPhases);
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
  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Structure Manager</h2>
              <p className="text-muted-foreground">Use up/down arrows to reorder phases, operations, and steps (incorporated phases are read-only modules)</p>
            </div>
            <div className="flex items-center gap-2">
              {clipboard && <Badge variant="outline" className="flex items-center gap-1">
                  <ClipboardCheck className="w-3 h-3" />
                  {clipboard.type} copied
                </Badge>}
                <Button variant="outline" size="sm" onClick={() => setShowDecisionTreeManager(true)} className="flex items-center gap-1.5 text-xs px-2.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  Decision Tree
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowIncorporationDialog(true)} className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Incorporate Phase
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
      <div className="container mx-auto px-6 py-8">
        {/* Action buttons above structure table */}
        <div className="flex items-center gap-2 mb-4">
          <Button 
            size="sm" 
            onClick={addPhase} 
            className="flex items-center gap-2"
            disabled={isAddingPhase}
          >
            {isAddingPhase ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Phase
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExpandedPhases(expandedPhases.size === displayPhases.length ? new Set() : new Set(displayPhases.map(p => p.id)))} 
            className="flex items-center gap-2"
          >
            {expandedPhases.size === displayPhases.length ? (
              <>
                <ChevronRight className="w-4 h-4" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Expand All
              </>
            )}
          </Button>
        </div>
        
        <div className="space-y-4">
          {displayPhases.map((phase, phaseIndex) => {
            // Use isStandard flag from phase data - no hardcoded names
            const phaseIsStandard = isStandardPhase(phase);
            const isLinkedPhase = phase.isLinked;
            const isEditing = editingItem?.type === 'phase' && editingItem.id === phase.id;
            
            // For linked phases, can move between Ordering (index 2) and Close Project (last)
            // For custom phases, same constraint
            // For standard phases, only if editing Standard Project
            const orderingIndex = displayPhases.findIndex(p => p.name === 'Ordering' && !p.isLinked);
            const closeProjectIndex = displayPhases.findIndex(p => p.name === 'Close Project' && !p.isLinked);
            
            let canMoveUp = false;
            let canMoveDown = false;
            
            if (phaseIsStandard && isEditingStandardProject) {
              // Standard phases can move when editing Standard Project Foundation
              canMoveUp = phaseIndex > 0;
              canMoveDown = phaseIndex < displayPhases.length - 1;
            } else if (!isStandardPhase) {
              // Custom and linked phases: must be after Ordering and before Close Project
              canMoveUp = phaseIndex > orderingIndex + 1; // Can move up if not immediately after Ordering
              canMoveDown = closeProjectIndex !== -1 && phaseIndex < closeProjectIndex - 1; // Can move down if not immediately before Close Project
            }
            
            return <Card 
              key={phase.id}
              className={`border-2 ${isStandardPhase ? 'bg-blue-50 border-blue-200' : isLinkedPhase ? 'bg-purple-50 border-purple-200' : ''}`}>
                          <CardHeader className="py-1 px-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 flex-1">
                                {((!phaseIsStandard || isEditingStandardProject) && !isLinkedPhase) || isLinkedPhase ? (
                                  <div className="flex flex-col gap-0.5">
                                    {reorderingPhaseId === phase.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                    ) : (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0"
                                          onClick={() => movePhase(phase.id, 'up')}
                                          disabled={!canMoveUp || reorderingPhaseId !== null}
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-4 w-4 p-0"
                                          onClick={() => movePhase(phase.id, 'down')}
                                          disabled={!canMoveDown || reorderingPhaseId !== null}
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-4" />
                                )}
                                
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
                                        {/* Phase Order Number */}
                                        <div className="flex items-center gap-1 mr-1">
                                          {isEditingStandardProject && !isLinkedPhase ? (
                                            <Select
                                              value={String(getPhaseOrderNumber(phase, phaseIndex, displayPhases.length))}
                                              onValueChange={(value) => {
                                                const newOrder = value === 'First' ? 'First' : value === 'Last' ? 'Last' : parseInt(value, 10);
                                                handlePhaseOrderChange(phase.id, newOrder);
                                              }}
                                            >
                                              <SelectTrigger className="w-16 h-5 text-xs px-1">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {getAvailableOrderNumbers(phase, phaseIndex, displayPhases.length).map((order) => (
                                                  <SelectItem key={String(order)} value={String(order)}>
                                                    {String(order)}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          ) : (
                                            <span className="text-xs font-medium text-muted-foreground min-w-[2rem]">
                                              {getPhaseOrderNumber(phase, phaseIndex, displayPhases.length)}
                                            </span>
                                          )}
                                        </div>
                                        {isStandardPhase && <span className="mr-1">🔒</span>}
                                        {phase.name}
                                        {isStandardPhase && <span className="text-xs text-blue-600 ml-1">(Standard - Locked)</span>}
                                        {isLinkedPhase && (
                                          <span className="text-xs text-purple-600 ml-1 flex items-center gap-1">
                                            <Link className="w-3 h-3" />
                                            Linked From {phase.sourceProjectName}
                                          </span>
                                        )}
                                      </CardTitle>
                                     <p className="text-muted-foreground text-xs">{phase.description}</p>
                                   </div>}
                              </div>
                              
                                 <div className="flex items-center gap-2">
                                  <Badge variant="outline">{phase.operations.length} operations</Badge>
                                  
                                  {/* Show edit/delete buttons for non-incorporated phases */}
                                  {(!phaseIsStandard || isEditingStandardProject) && !isLinkedPhase && (
                                    <>
                                      {!phaseIsStandard && <Button size="sm" variant="ghost" onClick={() => copyItem('phase', phase)}>
                                        <Copy className="w-4 h-4" />
                                      </Button>}
                                      
                                      {clipboard?.type === 'phase' && !isStandardPhase && <Button size="sm" variant="ghost" onClick={() => pasteItem('phase')}>
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
                                          
                                          <Button size="sm" variant="ghost" onClick={() => handleDeletePhaseClick(phase.id)}>
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </>}
                                    </>
                                  )}
                                  
                                  {/* Show delete button only for incorporated phases (no edit) */}
                                  {isLinkedPhase && (
                                    <Button size="sm" variant="ghost" onClick={() => handleDeletePhaseClick(phase.id)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
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
                            
                            <div className="space-y-3">
                              {phase.operations.map((operation, operationIndex) => {
                                const isOperationEditing = editingItem?.type === 'operation' && editingItem.id === operation.id;
                                const canMoveOpUp = operationIndex > 0 && !phase.isLinked;
                                const canMoveOpDown = operationIndex < phase.operations.length - 1 && !phase.isLinked;
                                
                                return <Card 
                                  key={operation.id}
                                  className={`ml-6 ${isStandardPhase ? 'bg-muted/20' : ''}`}>
                                            <CardHeader className="pb-3">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 flex-1">
                                                  {!phase.isLinked && (
                                                    <div className="flex flex-col gap-0.5">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-4 w-4 p-0"
                                                        onClick={() => moveOperation(phase.id, operation.id, 'up')}
                                                        disabled={!canMoveOpUp}
                                                      >
                                                        <ChevronUp className="w-3 h-3" />
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-4 w-4 p-0"
                                                        onClick={() => moveOperation(phase.id, operation.id, 'down')}
                                                        disabled={!canMoveOpDown}
                                                      >
                                                        <ChevronDown className="w-3 h-3" />
                                                      </Button>
                                                    </div>
                                                  )}
                                                  {phase.isLinked && <div className="w-4" />}
                                                  
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
                                                         {operation.isStandard && !isEditingStandardProject && <Badge variant="secondary" className="text-xs">Standard 🔒</Badge>}
                                                         {!operation.isStandard && phase.isStandard && <Badge variant="outline" className="text-xs bg-blue-50">Custom</Badge>}
                                                       </h4>
                                                       <p className="text-muted-foreground text-xs">{operation.description}</p>
                                                     </div>}
                                                </div>
                                                
                                                 <div className="flex items-center gap-1">
                                                   <Badge variant="outline" className="text-xs">{operation.steps.length} steps</Badge>
                                                   
                                                   {!phase.isLinked && ((!phaseIsStandard && !operation.isStandard) || isEditingStandardProject) && phase.name !== 'Close Project' && <>
                                                       {!operation.isStandard && <Button size="sm" variant="ghost" onClick={() => copyItem('operation', operation)}>
                                                         <Copy className="w-3 h-3" />
                                                       </Button>}
                                                       
                                                       {clipboard?.type === 'operation' && !operation.isStandard && <Button size="sm" variant="ghost" onClick={() => pasteItem('operation', {
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
                                                           <Button size="sm" variant="ghost" onClick={() => startEdit('operation', operation.id, operation)}>
                                                             <Edit className="w-3 h-3" />
                                                           </Button>
                                                           {phase.name !== 'Close Project' && <Button size="sm" variant="ghost" onClick={() => deleteOperation(phase.id, operation.id)}>
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
                                               {!phase.isLinked && <div className="flex items-center gap-2 mb-3">
                                                 <Button size="sm" variant="outline" onClick={() => addStep(phase.id, operation.id)} className="flex items-center gap-1 text-xs">
                                                   <Plus className="w-3 h-3" />
                                                   Add Step
                                                 </Button>
                                               </div>}
                                              
                                              <div className="space-y-2">
                                                {operation.steps.map((step, stepIndex) => {
                                                  const isStepEditing = editingItem?.type === 'step' && editingItem.id === step.id;
                                                  const canMoveStepUp = stepIndex > 0 && !phase.isLinked && ((!phaseIsStandard || isEditingStandardProject) && phase.name !== 'Close Project');
                                                  const canMoveStepDown = stepIndex < operation.steps.length - 1 && !phase.isLinked && ((!phaseIsStandard || isEditingStandardProject) && phase.name !== 'Close Project');
                                                  
                                                  return <Card 
                                                    key={step.id}
                                                    className={`ml-4 ${isStandardPhase ? 'bg-muted/10' : ''}`}>
                                                              <CardContent className="p-3">
                                                                <div className="flex items-center justify-between">
                                                                  <div className="flex items-center gap-2 flex-1">
                                                                    {!phase.isLinked && (!phaseIsStandard || isEditingStandardProject) && phase.name !== 'Close Project' && (
                                                                      <div className="flex flex-col gap-0.5">
                                                                        <Button
                                                                          variant="ghost"
                                                                          size="sm"
                                                                          className="h-4 w-4 p-0"
                                                                          onClick={() => moveStep(phase.id, operation.id, step.id, 'up')}
                                                                          disabled={!canMoveStepUp}
                                                                        >
                                                                          <ChevronUp className="w-3 h-3" />
                                                                        </Button>
                                                                        <Button
                                                                          variant="ghost"
                                                                          size="sm"
                                                                          className="h-4 w-4 p-0"
                                                                          onClick={() => moveStep(phase.id, operation.id, step.id, 'down')}
                                                                          disabled={!canMoveStepDown}
                                                                        >
                                                                          <ChevronDown className="w-3 h-3" />
                                                                        </Button>
                                                                      </div>
                                                                    )}
                                                                    {(phase.isLinked || (phaseIsStandard && !isEditingStandardProject) || (phaseIsStandard && phase.phaseOrderNumber === 'last')) && <div className="w-4" />}
                                                                    
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
                                                                          <div className="text-xs space-y-2">
                                                                            <StepTypeSelector value={editingItem.data.stepType} onValueChange={value => setEditingItem({
                                                                 ...editingItem,
                                                                 data: {
                                                                   ...editingItem.data,
                                                                   stepType: value
                                                                 }
                                                               })} />
                                                                            <div className="p-2 bg-muted/50 rounded-md text-xs">
                                                                              <div className="flex items-center justify-between">
                                                                                <span className="text-muted-foreground">Flow Type:</span>
                                                                                {getFlowTypeBadge(editingItem.data.flowType)}
                                                                              </div>
                                                                              <p className="text-[10px] text-muted-foreground mt-1">
                                                                                Edit flow type in Decision Tree Manager
                                                                              </p>
                                                                            </div>
                                                                          </div>
                                                                        </div> : <div className="flex-1">
                                                                          <div className="flex items-center gap-2">
                                                                            <p className="font-medium text-xs">{step.step}</p>
                                                                            {step.stepType && (() => {
                                                                              const typeInfo = getStepTypeIcon(step.stepType);
                                                                              return typeInfo ? (
                                                                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                                  <div className={`w-2 h-2 rounded-full ${typeInfo.color}`} />
                                                                                  {typeInfo.label}
                                                                                </Badge>
                                                                              ) : null;
                                                                            })()}
                                                                            {getFlowTypeBadge(step.flowType)}
                                                                            {step.isStandard && !isEditingStandardProject && <Badge variant="secondary" className="text-xs">Standard 🔒</Badge>}
                                                                            {!step.isStandard && phase.isStandard && <Badge variant="outline" className="text-xs bg-blue-50">Custom</Badge>}
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
                                                     
                                                        {!phase.isLinked && (isStepEditing ? <>
                                                             <Button size="sm" onClick={saveEdit}>
                                                               <Check className="w-3 h-3" />
                                                             </Button>
                                                             <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                                               <X className="w-3 h-3" />
                                                             </Button>
                                                            </> : <>
                                                              
                                                              <Button size="sm" variant="ghost" onClick={() => startEdit('step', step.id, step)}>
                                                                <Edit className="w-3 h-3" />
                                                              </Button>
                                                              
                                                              {!step.isStandard && <Button size="sm" variant="ghost" onClick={() => copyItem('step', step)}>
                                                                <Copy className="w-3 h-3" />
                                                              </Button>}
                                                              
                                                              {clipboard?.type === 'step' && !step.isStandard && <Button size="sm" variant="ghost" onClick={() => pasteItem('step', {
                                                                phaseId: phase.id,
                                                                operationId: operation.id
                                                              })}>
                                                                  <Clipboard className="w-3 h-3" />
                                                                </Button>}
                                                              
                                                              <Button size="sm" variant="ghost" onClick={() => deleteStep(phase.id, operation.id, step.id)}>
                                                                 <Trash2 className="w-3 h-3" />
                                                               </Button>
                                                           </>)}
                                                                  </div>
                                                                </div>
                                                              </CardContent>
                                                            </Card>;
                                                })}
                                              </div>
                                                 </CardContent>
                                               </CollapsibleContent>
                                             </Collapsible>
                                          </Card>;
                              })}
                            </div>
                               </CardContent>
                             </CollapsibleContent>
                           </Collapsible>
                        </Card>;
          })}
        </div>
      </div>

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
      <PhaseIncorporationDialog open={showIncorporationDialog} onOpenChange={setShowIncorporationDialog} onIncorporatePhase={handleIncorporatePhase} />

      {/* Delete Phase Confirmation Dialog */}
      <AlertDialog open={deletePhaseDialogOpen} onOpenChange={setDeletePhaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this phase? This will also delete all its operations and steps. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingPhase}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePhase}
              disabled={isDeletingPhase}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingPhase ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Phase'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decision Tree Manager */}
      <DecisionTreeManager open={showDecisionTreeManager} onOpenChange={setShowDecisionTreeManager} currentProject={currentProject} />
    </div>
  </div>
  );
};