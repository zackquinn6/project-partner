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
import { enforceStandardPhaseOrdering, validateAndFixSequentialOrdering } from '@/utils/phaseOrderingUtils';
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

  // State to store standard phase order from Standard Project Foundation
  // CRITICAL: Declare this early so it can be used in useMemo hooks below
  const [standardProjectPhases, setStandardProjectPhases] = useState<Phase[]>([]);
  
  // State to track if there are pending order changes that need to be saved
  const [hasPendingOrderChanges, setHasPendingOrderChanges] = useState(false);

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
  const [phaseIdPendingDelete, setPhaseIdPendingDelete] = useState<string | null>(null); // Phase ID waiting for confirmation
  const [phaseToDelete, setPhaseToDelete] = useState<string | null>(null); // Phase ID being deleted (triggers filtering)
  const [isChangingPhaseOrder, setIsChangingPhaseOrder] = useState(false); // Flag to prevent reordering during manual order change
  const [displayPhasesFromDb, setDisplayPhasesFromDb] = useState(false); // Flag to track if displayPhases was set directly from database
  const [isDeletingPhase, setIsDeletingPhase] = useState(false);
  const [reorderingPhaseId, setReorderingPhaseId] = useState<string | null>(null);
  const [skipNextRefresh, setSkipNextRefresh] = useState(false);
  // CRITICAL: Track verified phase IDs for standard projects to filter out deleted phases
  const [verifiedPhaseIds, setVerifiedPhaseIds] = useState<Set<string>>(new Set());
  // CRITICAL: Use ref to prevent infinite loops from updateProject triggering re-renders
  const isUpdatingProjectRef = React.useRef(false);
  const lastSavedPhasesRef = React.useRef<string>('');

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

      // Apply standard phase ordering using Standard Project Foundation order
      const orderedPhases = enforceStandardPhaseOrdering(correctedPhases, standardProjectPhases);
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

  // Validate and fix phase order numbers
  // CRITICAL: This function ensures all phases have unique order numbers and respects standard phase positions
  const validateAndFixPhaseOrderNumbers = (phases: Phase[]): { phases: Phase[]; fixed: boolean; issues: string[] } => {
    const issues: string[] = [];
    let fixed = false;
    const validatedPhases = [...phases];
    
    // Step 1: Collect reserved positions from standard phases
    const reservedByStandardPhases = new Set<string | number>();
    const standardPhaseOrderMap = new Map<string, string | number>(); // phase name -> order number
    
    if (!isEditingStandardProject && standardProjectPhases.length > 0) {
      standardProjectPhases.forEach(phase => {
        const orderNumber = phase.phaseOrderNumber;
        if (orderNumber !== undefined && orderNumber !== null) {
          reservedByStandardPhases.add(orderNumber);
          if (phase.name) {
            standardPhaseOrderMap.set(phase.name, orderNumber);
          }
          if (orderNumber === 'first' || orderNumber === 'First') {
            reservedByStandardPhases.add(1);
          } else if (orderNumber === 'last' || orderNumber === 'Last') {
            reservedByStandardPhases.add(validatedPhases.length);
          }
        }
      });
    }
    
    // Also check current phases for standard phase positions
    validatedPhases.forEach((phase, index) => {
      if (isStandardPhase(phase) && !phase.isLinked) {
        const orderNumber = phase.phaseOrderNumber;
        if (orderNumber !== undefined) {
          reservedByStandardPhases.add(orderNumber);
          if (orderNumber === 'first' || orderNumber === 'First') {
            reservedByStandardPhases.add(1);
          } else if (orderNumber === 'last' || orderNumber === 'Last') {
            reservedByStandardPhases.add(validatedPhases.length);
          } else if (typeof orderNumber === 'number') {
            reservedByStandardPhases.add(orderNumber);
          }
        }
        // Also reserve the actual numeric position where standard phase appears
        const numericPosition = index + 1;
        reservedByStandardPhases.add(numericPosition);
      }
    });
    
    // Step 2: Check for missing order numbers
    validatedPhases.forEach((phase, index) => {
      if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
        issues.push(`Phase "${phase.name}" is missing an order number`);
        fixed = true;
        
        // Assign order number based on position and phase type
        if (isStandardPhase(phase) && !phase.isLinked) {
          // Standard phase: use order from Standard Project Foundation if available
          if (phase.name && standardPhaseOrderMap.has(phase.name)) {
            phase.phaseOrderNumber = standardPhaseOrderMap.get(phase.name)!;
          } else if (index === 0) {
            phase.phaseOrderNumber = 'first';
          } else if (index === validatedPhases.length - 1) {
            phase.phaseOrderNumber = 'last';
          } else {
            phase.phaseOrderNumber = index + 1;
          }
        } else {
          // Custom/linked phase: assign next available number
          let candidateNumber = index + 1;
          while (reservedByStandardPhases.has(candidateNumber) && candidateNumber <= validatedPhases.length + 10) {
            candidateNumber++;
          }
          phase.phaseOrderNumber = candidateNumber;
        }
      }
    });
    
    // Step 3: Check for duplicate order numbers
    const orderNumberUsage = new Map<string | number, Phase[]>();
    validatedPhases.forEach(phase => {
      const order = phase.phaseOrderNumber;
      if (order !== undefined && order !== null) {
        if (!orderNumberUsage.has(order)) {
          orderNumberUsage.set(order, []);
        }
        orderNumberUsage.get(order)!.push(phase);
      }
    });
    
    orderNumberUsage.forEach((phasesWithOrder, order) => {
      if (phasesWithOrder.length > 1) {
        issues.push(`Duplicate order number "${order}" found for phases: ${phasesWithOrder.map(p => p.name).join(', ')}`);
        fixed = true;
        
        // Fix duplicates: keep the first one, reassign others
        phasesWithOrder.forEach((phase, dupIndex) => {
          if (dupIndex === 0) {
            // Keep first occurrence
            return;
          }
          
          // Reassign duplicate
          const phaseIndex = validatedPhases.findIndex(p => p.id === phase.id);
          if (phaseIndex !== -1) {
            if (isStandardPhase(phase) && !phase.isLinked) {
              // Standard phase: use order from Standard Project Foundation
              if (phase.name && standardPhaseOrderMap.has(phase.name)) {
                validatedPhases[phaseIndex].phaseOrderNumber = standardPhaseOrderMap.get(phase.name)!;
              } else {
                // Find next available number
                let candidateNumber = phaseIndex + 1;
                while (orderNumberUsage.has(candidateNumber) && candidateNumber <= validatedPhases.length + 10) {
                  candidateNumber++;
                }
                validatedPhases[phaseIndex].phaseOrderNumber = candidateNumber;
                orderNumberUsage.set(candidateNumber, [validatedPhases[phaseIndex]]);
              }
            } else {
              // Custom/linked phase: find next available number
              let candidateNumber = phaseIndex + 1;
              while (
                (orderNumberUsage.has(candidateNumber) || reservedByStandardPhases.has(candidateNumber)) &&
                candidateNumber <= validatedPhases.length + 10
              ) {
                candidateNumber++;
              }
              validatedPhases[phaseIndex].phaseOrderNumber = candidateNumber;
              if (!orderNumberUsage.has(candidateNumber)) {
                orderNumberUsage.set(candidateNumber, []);
              }
              orderNumberUsage.get(candidateNumber)!.push(validatedPhases[phaseIndex]);
            }
          }
        });
      }
    });
    
    // Step 4: Validate standard phase positions are respected
    if (!isEditingStandardProject) {
      validatedPhases.forEach((phase, index) => {
        if (!isStandardPhase(phase) && !phase.isLinked) {
          const orderNumber = phase.phaseOrderNumber;
          
          // Check if custom phase is using a reserved position
          if (orderNumber === 'first' || orderNumber === 'First' || orderNumber === 1) {
            if (reservedByStandardPhases.has('First') || reservedByStandardPhases.has(1)) {
              issues.push(`Custom phase "${phase.name}" is using reserved position "first" or 1`);
              fixed = true;
              // Reassign to next available position
              let candidateNumber = 3; // Start after Kickoff (1) and Planning (2)
              while (reservedByStandardPhases.has(candidateNumber) && candidateNumber <= validatedPhases.length + 10) {
                candidateNumber++;
              }
              phase.phaseOrderNumber = candidateNumber;
            }
          } else if (orderNumber === 'last' || orderNumber === 'Last' || orderNumber === validatedPhases.length) {
            if (reservedByStandardPhases.has('Last') || reservedByStandardPhases.has(validatedPhases.length)) {
              issues.push(`Custom phase "${phase.name}" is using reserved position "last"`);
              fixed = true;
              // Reassign to position before last
              phase.phaseOrderNumber = Math.max(3, validatedPhases.length - 1);
            }
          } else if (typeof orderNumber === 'number' && reservedByStandardPhases.has(orderNumber)) {
            issues.push(`Custom phase "${phase.name}" is using reserved position ${orderNumber}`);
            fixed = true;
            // Reassign to next available position
            let candidateNumber = orderNumber + 1;
            while (reservedByStandardPhases.has(candidateNumber) && candidateNumber <= validatedPhases.length + 10) {
              candidateNumber++;
            }
            phase.phaseOrderNumber = candidateNumber;
          }
        }
      });
    }
    
    // Step 5: Ensure standard phases have correct positions
    validatedPhases.forEach((phase, index) => {
      if (isStandardPhase(phase) && !phase.isLinked && phase.name) {
        const expectedOrder = standardPhaseOrderMap.get(phase.name);
        if (expectedOrder !== undefined && phase.phaseOrderNumber !== expectedOrder) {
          issues.push(`Standard phase "${phase.name}" has incorrect order number. Expected: ${expectedOrder}, Found: ${phase.phaseOrderNumber}`);
          fixed = true;
          phase.phaseOrderNumber = expectedOrder;
        }
      }
    });
    
    if (fixed && issues.length > 0) {
      console.log('✅ Validated and fixed phase order numbers:', {
        issuesFixed: issues.length,
        issues: issues.slice(0, 5) // Log first 5 issues
      });
    }
    
    return { phases: validatedPhases, fixed, issues };
  };

  // Sort phases by order number while preserving standard phase positions
  const sortPhasesByOrderNumber = (phases: Phase[]): Phase[] => {
    // CRITICAL: Sort ALL phases together by their order numbers
    // This ensures standard and custom phases are interleaved correctly based on order numbers
    const sortedPhases = [...phases].sort((a, b) => {
      const aOrder = a.phaseOrderNumber === 'first' ? -Infinity : 
                    (a.phaseOrderNumber === 'last' ? Infinity : 
                    (typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 1000));
      const bOrder = b.phaseOrderNumber === 'first' ? -Infinity : 
                    (b.phaseOrderNumber === 'last' ? Infinity : 
                    (typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 1000));
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If same order number, standard phases come before non-standard
      const aIsStandard = isStandardPhase(a) && !a.isLinked;
      const bIsStandard = isStandardPhase(b) && !b.isLinked;
      if (aIsStandard && !bIsStandard) return -1;
      if (!aIsStandard && bIsStandard) return 1;
      
      // If both are same type, maintain original order (stable sort)
      return 0;
    });
    
    return sortedPhases;
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
      // CRITICAL: Always preserve 'first' and 'last' designations - never reassign them
      // Check this BEFORE any other logic, regardless of position
      if (phase.phaseOrderNumber === 'first') {
        usedNumbers.add('first');
        return phase;
      }
      if (phase.phaseOrderNumber === 'last') {
        usedNumbers.add('last');
        return phase;
      }
      
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
          usedNumbers.add(phase.phaseOrderNumber);
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
        // CRITICAL: Project phases (custom and linked) must avoid standard phase order numbers
        // First, collect reserved order numbers from standard phases
        const reservedByStandardPhases = new Set<string | number>();
        if (!isEditingStandardProject && standardProjectPhases.length > 0) {
          standardProjectPhases.forEach(stdPhase => {
            if (stdPhase.phaseOrderNumber !== undefined) {
              if (stdPhase.phaseOrderNumber === 'first') {
                reservedByStandardPhases.add('first');
              } else if (stdPhase.phaseOrderNumber === 'last') {
                reservedByStandardPhases.add('last');
              } else if (typeof stdPhase.phaseOrderNumber === 'number') {
                reservedByStandardPhases.add(stdPhase.phaseOrderNumber);
              }
            }
          });
        }
        // Also check current phases for standard phase order numbers
        phases.forEach(p => {
          if (isStandardPhase(p) && !p.isLinked && p.phaseOrderNumber !== undefined) {
            if (p.phaseOrderNumber === 'first') {
              reservedByStandardPhases.add('first');
            } else if (p.phaseOrderNumber === 'last') {
              reservedByStandardPhases.add('last');
            } else if (typeof p.phaseOrderNumber === 'number') {
              reservedByStandardPhases.add(p.phaseOrderNumber);
            }
          }
        });
        
        // Find the next available number that's not already used AND not reserved by standard phases
        let candidateNumber = 1;
        while (
          (usedNumbers.has(candidateNumber) || reservedByStandardPhases.has(candidateNumber)) && 
          candidateNumber <= phases.length + 100
        ) {
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
      const fallbackPhases = rebuiltPhases || [];
      
      // CRITICAL: In Edit Standard mode, filter to ONLY standard phases
      // Standard Project Foundation should never show non-standard or incorporated phases
      if (isEditingStandardProject) {
        const standardPhasesOnly = fallbackPhases.filter(p => isStandardPhase(p) && !p.isLinked);
        console.log('🔒 Edit Standard: Filtered fallback rebuiltPhases to standard only', {
          beforeCount: fallbackPhases.length,
          afterCount: standardPhasesOnly.length,
          filteredOut: fallbackPhases.filter(p => !isStandardPhase(p) || p.isLinked).map(p => ({ 
            name: p.name, 
            isStandard: p.isStandard, 
            isLinked: p.isLinked 
          }))
        });
        return standardPhasesOnly;
      }
      
      // CRITICAL: For regular projects, if rebuiltPhases is empty but we're loading,
      // return empty array to prevent showing stale data
      // But if we have rebuiltPhases, use them
      return fallbackPhases;
    }
    
    // CRITICAL: Filter out deleted phase if we're currently deleting one
    // This prevents the deleted phase from reappearing in mergedPhases
    // CRITICAL: For standard projects, also filter out phases that don't exist in database
    let currentPhasesFiltered = phaseToDelete 
      ? (currentProject.phases || []).filter(p => p.id !== phaseToDelete)
      : (currentProject.phases || []);
    
    // CRITICAL: For standard projects, verify phases exist in database
    // This prevents deleted phases from appearing after page refresh
    if (isEditingStandardProject && verifiedPhaseIds.size > 0) {
      const beforeCount = currentPhasesFiltered.length;
      currentPhasesFiltered = currentPhasesFiltered.filter(phase => {
        const exists = phase.id ? verifiedPhaseIds.has(phase.id) : false;
        if (!exists && phase.id) {
          console.log('🚫 Filtering out deleted phase from currentProject.phases in mergedPhases:', {
            phaseId: phase.id,
            phaseName: phase.name
          });
        }
        return exists;
      });
      const afterCount = currentPhasesFiltered.length;
      if (beforeCount !== afterCount) {
        console.log('✅ Filtered out deleted phases from currentProject.phases in mergedPhases:', {
          beforeCount,
          afterCount,
          filteredCount: beforeCount - afterCount
        });
      }
    }
    
    // Double-check: Also filter from rebuiltPhases if phaseToDelete is set
    // This ensures the deleted phase doesn't come back from the refetch
    const rebuiltPhasesFiltered = phaseToDelete && rebuiltPhases
      ? rebuiltPhases.filter(p => p.id !== phaseToDelete)
      : rebuiltPhases;
    
    // CRITICAL: Always include standard phases from currentProject.phases even if rebuiltPhases is empty
    // CRITICAL: For regular projects, standard phases come ONLY from get_project_workflow_with_standards
    // Do NOT preserve standard phases from currentProject.phases - they might be stale
    // If a standard phase is deleted from Standard Project Foundation, it should disappear from regular projects
    // The get_project_workflow_with_standards function dynamically pulls from Standard Project Foundation
    // so it will always have the current, correct standard phases
    // We used to preserve standard phases here, but that caused deleted phases to reappear
    const standardPhasesFromCurrent: Phase[] = []; // Always empty - don't preserve standard phases from currentProject.phases
    
    // If we have rebuilt phases, merge them with currentProject.phases to preserve correct isStandard flags
    // Use rebuiltPhasesFiltered to ensure deleted phase doesn't reappear
    if (rebuiltPhasesFiltered && rebuiltPhasesFiltered.length > 0) {
      // Create maps for both ID and name matching
      // Use ID as primary identifier, but also check by name for phases that might have been renamed
      const currentPhasesById = new Map<string, Phase>();
      const currentPhasesByName = new Map<string, Phase>();
      currentPhasesFiltered.forEach(phase => {
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
      // CRITICAL: If we just added a phase, preserve the order from currentProject.phases
      // to prevent reordering after refetch
      const shouldPreserveOrder = justAddedPhaseId !== null;
      const mergedRebuiltPhases = rebuiltPhasesFiltered.map(rebuiltPhase => {
        // CRITICAL: For regular projects, standard phases come ONLY from get_project_workflow_with_standards
        // Do NOT override isStandard flag from currentProject.phases for standard phases
        // The rebuiltPhase already has the correct isStandard flag from Standard Project Foundation
        const isStandardFromRebuilt = isStandardPhase(rebuiltPhase);
        
        // First try to match by ID (most reliable)
        const currentPhaseById = rebuiltPhase.id ? currentPhasesById.get(rebuiltPhase.id) : null;
        if (currentPhaseById) {
          // CRITICAL: Preserve phaseOrderNumber from saved JSON (currentProject.phases)
          // This ensures order numbers persist after window close/reopen
          const preservedPhaseOrderNumber = currentPhaseById.phaseOrderNumber;
          
          // CRITICAL: For regular projects, if rebuiltPhase is a standard phase, trust it from Standard Project Foundation
          // Do NOT override with stale data from currentProject.phases
          if (!isEditingStandardProject && isStandardFromRebuilt) {
            // This is a standard phase from Standard Project Foundation - trust it, don't override
            return {
              ...rebuiltPhase,
              isStandard: true, // Trust the Standard Project Foundation
              isLinked: currentPhaseById.isLinked || rebuiltPhase.isLinked,
              phaseOrderNumber: preservedPhaseOrderNumber // CRITICAL: Preserve order number from saved JSON
            };
          }
          
          // For custom phases or Edit Standard mode, preserve isStandard flag from currentProject.phases
          // BUT: If we're not editing Standard Project Foundation and currentProject says it's not standard,
          // override to false
          if (!isEditingStandardProject && !currentPhaseById.isStandard) {
            return {
              ...rebuiltPhase,
              isStandard: false, // Force to false for custom phases
              isLinked: currentPhaseById.isLinked || rebuiltPhase.isLinked,
              phaseOrderNumber: preservedPhaseOrderNumber // CRITICAL: Preserve order number from saved JSON
            };
          }
          return {
            ...rebuiltPhase,
            isStandard: currentPhaseById.isStandard, // Use isStandard from currentProject.phases
            isLinked: currentPhaseById.isLinked || rebuiltPhase.isLinked, // Preserve both flags
            phaseOrderNumber: preservedPhaseOrderNumber // CRITICAL: Preserve order number from saved JSON
          };
        }
        
        // Fallback to name matching if ID doesn't match (e.g., renamed phases)
        const currentPhaseByName = rebuiltPhase.name ? currentPhasesByName.get(rebuiltPhase.name) : null;
        if (currentPhaseByName) {
          // CRITICAL: Preserve phaseOrderNumber from saved JSON (currentProject.phases)
          // This ensures order numbers persist after window close/reopen
          const preservedPhaseOrderNumber = currentPhaseByName.phaseOrderNumber;
          
          // CRITICAL: For regular projects, if rebuiltPhase is a standard phase, trust it from Standard Project Foundation
          // Do NOT override with stale data from currentProject.phases
          if (!isEditingStandardProject && isStandardFromRebuilt) {
            // This is a standard phase from Standard Project Foundation - trust it, don't override
            return {
              ...rebuiltPhase,
              isStandard: true, // Trust the Standard Project Foundation
              isLinked: currentPhaseByName.isLinked || rebuiltPhase.isLinked,
              phaseOrderNumber: preservedPhaseOrderNumber // CRITICAL: Preserve order number from saved JSON
            };
          }
          
          // For custom phases or Edit Standard mode, preserve isStandard flag from currentProject.phases
          // BUT: If we're not editing Standard Project Foundation and currentProject says it's not standard,
          // override to false
          if (!isEditingStandardProject && !currentPhaseByName.isStandard) {
            return {
              ...rebuiltPhase,
              isStandard: false, // Force to false for custom phases
              isLinked: currentPhaseByName.isLinked || rebuiltPhase.isLinked,
              phaseOrderNumber: preservedPhaseOrderNumber // CRITICAL: Preserve order number from saved JSON
            };
          }
          return {
            ...rebuiltPhase,
            isStandard: currentPhaseByName.isStandard,
            isLinked: currentPhaseByName.isLinked || rebuiltPhase.isLinked,
            phaseOrderNumber: preservedPhaseOrderNumber // CRITICAL: Preserve order number from saved JSON
          };
        }
        
        // If phase is not in currentProject.phases, check if it's a newly added phase
        // CRITICAL: New phases in regular templates are ALWAYS non-standard
        // Only phases in Standard Project Foundation can be standard
        const isNewlyAddedPhase = justAddedPhaseId && rebuiltPhase.id === justAddedPhaseId;
        
        if (isNewlyAddedPhase) {
          // This is a newly added phase - set isStandard based on editing mode
          if (isEditingStandardProject) {
            // When editing Standard Project Foundation, new phases become standard
            return {
              ...rebuiltPhase,
              isStandard: true
            };
          } else {
            // When editing regular templates, new phases are ALWAYS custom (isStandard: false)
            // CRITICAL: Explicitly override any isStandard value from the database
            console.log('🔵 Overriding isStandard to false for newly added phase in regular template:', {
              phaseId: rebuiltPhase.id,
              phaseName: rebuiltPhase.name,
              databaseIsStandard: rebuiltPhase.isStandard,
              isEditingStandardProject,
              justAddedPhaseId
            });
            return {
              ...rebuiltPhase,
              isStandard: false // Force to false for regular templates, regardless of database value
            };
          }
        }
        
        // For existing phases not in currentProject.phases, preserve their isStandard flag
        // These are likely standard phases from the Standard Project Foundation
        return rebuiltPhase;
      });
      
      // Get phases from currentProject.phases that aren't in rebuilt phases
      // Check by both ID and name to catch all cases
      // CRITICAL: Always include phases that were just added (even if not in rebuiltPhases yet)
      // CRITICAL: Exclude phases that are being deleted
      // CRITICAL: For regular projects, do NOT include standard phases from currentProject.phases
      // Standard phases should ONLY come from get_project_workflow_with_standards (which pulls from Standard Project Foundation)
      // Including standard phases from currentProject.phases would preserve old/deleted standard phases (stale data)
      const rebuiltPhaseIds = new Set(rebuiltPhasesFiltered.map(p => p.id).filter(Boolean));
      const rebuiltPhaseNames = new Set(rebuiltPhasesFiltered.map(p => p.name).filter(Boolean));
      const phasesOnlyInJson = currentPhasesFiltered.filter(p => {
        // Exclude deleted phase
        if (phaseToDelete && p.id === phaseToDelete) {
          return false;
        }
        // CRITICAL: For regular projects, exclude standard phases from currentProject.phases
        // Standard phases should ONLY come from get_project_workflow_with_standards
        // This ensures regular projects always show the latest standard phases from Standard Project Foundation
        if (!isEditingStandardProject && isStandardPhase(p) && !p.isLinked) {
          console.log('🚫 Excluding stale standard phase from currentProject.phases:', {
            phaseId: p.id,
            phaseName: p.name,
            isStandard: p.isStandard,
            isLinked: p.isLinked
          });
          return false;
        }
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
      // CRITICAL: Always include standard phases from currentProject.phases to prevent them from disappearing
      // during refetch. Merge standard phases that might not be in rebuiltPhases yet.
      let combinedPhases: Phase[];
      if (justAddedPhaseId) {
        // Create a map of phases by ID for quick lookup
        const allPhases = [...mergedRebuiltPhases, ...phasesOnlyInJson];
        const phasesById = new Map(allPhases.map(p => [p.id, p]));
        
        // Reorder based on currentProject.phases order, but only include phases that exist in allPhases
        const orderedPhases = currentPhasesFiltered
          .map(phase => phasesById.get(phase.id))
          .filter((phase): phase is Phase => phase !== undefined);
        
        // Add any phases in allPhases that aren't in currentProject.phases (shouldn't happen, but safety)
        const existingIds = new Set(orderedPhases.map(p => p.id));
        const remainingPhases = allPhases.filter(p => !existingIds.has(p.id));
        
        combinedPhases = [...orderedPhases, ...remainingPhases];
      } else {
        // CRITICAL: Filter out deleted phase from combined phases
        // CRITICAL: Do NOT add back standard phases from currentProject.phases
        // Standard phases should ONLY come from get_project_workflow_with_standards (which dynamically pulls from Standard Project Foundation)
        // If a standard phase is deleted from Standard Project Foundation, it should NOT appear in regular projects
        // Adding back standard phases from currentProject.phases would preserve deleted phases (stale data)
        const basePhases = phaseToDelete
          ? [...mergedRebuiltPhases, ...phasesOnlyInJson].filter(p => p.id !== phaseToDelete)
          : [...mergedRebuiltPhases, ...phasesOnlyInJson];
        
        // CRITICAL: For regular projects, standard phases come ONLY from get_project_workflow_with_standards
        // Do NOT add back standard phases from currentProject.phases - they might be stale/deleted
        // The rebuiltPhasesFiltered already contains the correct, up-to-date standard phases from Standard Project Foundation
        combinedPhases = basePhases;
      }
      
      // CRITICAL: In Edit Standard mode, filter to ONLY standard phases
      // Standard Project Foundation should never show non-standard or incorporated phases
      // This is a safety check to ensure non-standard phases never appear in Edit Standard
      if (isEditingStandardProject) {
        const standardPhasesOnly = combinedPhases.filter(p => isStandardPhase(p) && !p.isLinked);
        console.log('🔒 Edit Standard: Filtered to standard phases only', {
          beforeCount: combinedPhases.length,
          afterCount: standardPhasesOnly.length,
          filteredOut: combinedPhases.filter(p => !isStandardPhase(p) || p.isLinked).map(p => ({ 
            name: p.name, 
            isStandard: p.isStandard, 
            isLinked: p.isLinked 
          }))
        });
        return standardPhasesOnly;
      }
      
      return combinedPhases;
    }
    
    // Fallback: use currentProject.phases directly if no rebuilt phases
    // But filter out deleted phase if we're currently deleting one
    console.log('🔍 No rebuiltPhases, returning currentProject.phases directly');
    let fallbackPhases = phaseToDelete 
      ? (currentProject.phases || []).filter(p => p.id !== phaseToDelete)
      : (currentProject.phases || []);
    
    // CRITICAL: For standard projects, verify phases exist in database
    // This prevents deleted phases from appearing after page refresh
    if (isEditingStandardProject && verifiedPhaseIds.size > 0) {
      const beforeCount = fallbackPhases.length;
      fallbackPhases = fallbackPhases.filter(phase => {
        const exists = phase.id ? verifiedPhaseIds.has(phase.id) : false;
        if (!exists && phase.id) {
          console.log('🚫 Filtering out deleted phase from fallback phases:', {
            phaseId: phase.id,
            phaseName: phase.name
          });
        }
        return exists;
      });
      const afterCount = fallbackPhases.length;
      if (beforeCount !== afterCount) {
        console.log('✅ Filtered out deleted phases from fallback phases:', {
          beforeCount,
          afterCount,
          filteredCount: beforeCount - afterCount
        });
      }
    }
    
    // CRITICAL: In Edit Standard mode, filter to ONLY standard phases
    // Standard Project Foundation should never show non-standard or incorporated phases
    if (isEditingStandardProject) {
      fallbackPhases = fallbackPhases.filter(p => isStandardPhase(p) && !p.isLinked);
      console.log('🔒 Edit Standard: Filtered fallback phases to standard only', {
        beforeCount: (currentProject.phases || []).length,
        afterCount: fallbackPhases.length
      });
    }
    
    return fallbackPhases;
  }, [currentProject?.phases, rebuiltPhases, justAddedPhaseId, phaseToDelete, isEditingStandardProject, verifiedPhaseIds]);
  
  // Process merged phases and update displayPhases
  // Use mergedPhases directly (same as EditWorkflowView uses rawPhases)
  // Process phases similar to EditWorkflowView for consistency
  // CRITICAL: Database is the source of truth - preserve order from database when available
  // CRITICAL: Don't reorder if skipNextRefresh or isChangingPhaseOrder is true
  const processedPhases = React.useMemo(() => {
    // CRITICAL: Skip processing if we're actively changing phase order
    // This prevents reordering while the user is manually changing order positions
    if (skipNextRefresh || isChangingPhaseOrder) {
      console.log('⏭️ Skipping processedPhases - order change in progress:', {
        skipNextRefresh,
        isChangingPhaseOrder
      });
      return [];
    }
    
    // Get phases from mergedPhases (which already handles Edit Standard filtering)
    let phasesToProcess: Phase[] = [];
    
    if (mergedPhases && mergedPhases.length > 0) {
      phasesToProcess = mergedPhases;
    } else if (currentProject?.phases && currentProject.phases.length > 0) {
      // Fallback to current project phases if no merged phases yet
      phasesToProcess = currentProject.phases;
    }
    
    // Filter out deleted phase during deletion process
    if (phaseToDelete) {
      phasesToProcess = phasesToProcess.filter(p => p.id !== phaseToDelete);
    }
    
    if (phasesToProcess.length === 0) {
      return [];
    }
    
    // Deduplicate phases
    const deduplicatedPhases = deduplicatePhases(phasesToProcess);
    
    // CRITICAL: Check if phases already have valid order positions from database
    // If all phases have order positions, preserve the database order (don't reorder)
    // Only apply sequential ordering validation if phases are missing order positions
    const phasesWithOrder = deduplicatedPhases.filter(p => 
      p.phaseOrderNumber !== undefined && 
      p.phaseOrderNumber !== null && 
      p.phaseOrderNumber !== ''
    );
    
    // If all phases have order positions, preserve database order
    // Only apply validation if some phases are missing order positions
    if (phasesWithOrder.length === deduplicatedPhases.length) {
      // All phases have order positions - preserve database order
      // Sort by order number to ensure correct display order, but don't reassign positions
      const sortedPhases = [...deduplicatedPhases].sort((a, b) => {
        const aOrder = typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 
                      a.phaseOrderNumber === 'first' ? 0 : 
                      a.phaseOrderNumber === 'last' ? 9999 : 0;
        const bOrder = typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 
                      b.phaseOrderNumber === 'first' ? 0 : 
                      b.phaseOrderNumber === 'last' ? 9999 : 0;
        return aOrder - bOrder;
      });
      
      console.log('✅ Preserving database order (all phases have order positions):', {
        count: sortedPhases.length,
        phases: sortedPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
      });
      
      return sortedPhases;
    } else {
      // Some phases are missing order positions - apply sequential ordering validation
      console.log('⚠️ Some phases missing order positions, applying sequential ordering validation:', {
        totalPhases: deduplicatedPhases.length,
        phasesWithOrder: phasesWithOrder.length,
        missingOrder: deduplicatedPhases.length - phasesWithOrder.length
      });
      
      const validatedPhases = validateAndFixSequentialOrdering(deduplicatedPhases);
      return validatedPhases;
    }
  }, [mergedPhases, currentProject?.phases, phaseToDelete, skipNextRefresh, isChangingPhaseOrder]);
  
  // CRITICAL: Force immediate refresh on opening StructureManager
  // For Edit Standard, fetch directly from database without intermediate processes
  // This ensures fresh data is loaded immediately when opening
  useEffect(() => {
    if (!currentProject?.id) return;
    
    // Reset state to trigger fresh load
    setPhasesLoaded(false);
    
    const fetchPhasesImmediately = async () => {
      console.log('🔄 Immediate refresh on open:', {
        projectId: currentProject.id,
        isEditingStandardProject
      });
      
      try {
        let freshPhases: Phase[] = [];
        
        if (isEditingStandardProject) {
          // For Edit Standard: fetch directly from database without intermediate processes
          const { data: rebuiltPhases, error } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
            p_project_id: currentProject.id
          });
          
          if (error) {
            console.error('❌ Error fetching phases from database:', error);
            toast.error('Error loading Standard Project Foundation. Please try again.');
            setPhasesLoaded(true); // Prevent infinite retries
            return;
          }
          
          freshPhases = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
          
          // Filter to only standard phases for Edit Standard
          freshPhases = freshPhases.filter(p => isStandardPhase(p) && !p.isLinked);
          
          // CRITICAL: Map step_title to step.step for all steps
          // Database uses step_title but interface expects step.step
          freshPhases = freshPhases.map(phase => ({
            ...phase,
            operations: phase.operations?.map(operation => ({
              ...operation,
              steps: operation.steps?.map(step => ({
                ...step,
                step: step.step || (step as any).step_title
              })).filter(step => step.step) || []
            })) || []
          }));
          
          // CRITICAL: STRICT VALIDATION for Edit Standard - fetch order positions directly from database
          // If ANY phase is missing order position or out of order, BLOCK loading
          if (freshPhases.length > 0) {
            // Fetch position_rule and position_value from database for ALL phases
            const { data: phasePositions, error: positionError } = await supabase
              .from('project_phases')
              .select('id, name, position_rule, position_value')
              .eq('project_id', currentProject.id)
              .in('id', freshPhases.map(p => p.id).filter(id => id));
            
            if (positionError) {
              console.error('❌ CRITICAL: Error fetching phase positions from database:', positionError);
              toast.error('Error validating phase order positions. Edit Standard cannot load.');
              setPhasesLoaded(true);
              return;
            }
            
            if (!phasePositions || phasePositions.length === 0) {
              console.error('❌ CRITICAL: No phase positions found in database');
              toast.error('No phase positions found in database. Edit Standard cannot load.');
              setPhasesLoaded(true);
              return;
            }
            
            // Create map of phase positions
            const positionMap = new Map(phasePositions.map(p => [p.id, p]));
            
            // STRICT VALIDATION: Check ALL phases have position_rule
            const phasesWithoutPositionRule = freshPhases.filter(phase => {
              if (!phase.id) return true;
              const positionData = positionMap.get(phase.id);
              return !positionData || !positionData.position_rule;
            });
            
            if (phasesWithoutPositionRule.length > 0) {
              console.error('❌ CRITICAL VALIDATION FAILED: Phases missing position_rule:', {
                count: phasesWithoutPositionRule.length,
                phases: phasesWithoutPositionRule.map(p => ({ name: p.name, id: p.id }))
              });
              toast.error(`Edit Standard cannot load: ${phasesWithoutPositionRule.length} phase(s) missing order positions in database. Please fix the database.`);
              setPhasesLoaded(true);
              return;
            }
            
            // Derive phaseOrderNumber from position_rule and position_value for validation
            const phasesWithOrder: Array<{ phase: Phase; numericOrder: number }> = [];
            
            freshPhases.forEach(phase => {
              if (!phase.id) return;
              const positionData = positionMap.get(phase.id);
              if (!positionData) return;
              
              let numericOrder: number;
              if (positionData.position_rule === 'first') {
                numericOrder = 1;
              } else if (positionData.position_rule === 'last') {
                numericOrder = freshPhases.length; // Will be validated after
              } else if (positionData.position_rule === 'nth' && positionData.position_value) {
                numericOrder = positionData.position_value;
              } else if (positionData.position_rule === 'last_minus_n' && positionData.position_value) {
                numericOrder = freshPhases.length - positionData.position_value;
              } else {
                console.error('❌ CRITICAL: Invalid position_rule:', positionData);
                numericOrder = -1; // Invalid
              }
              
              phasesWithOrder.push({ phase, numericOrder });
            });
            
            // STRICT VALIDATION: Check for sequential ordering (1, 2, 3, ...) with no gaps
            const sortedByOrder = [...phasesWithOrder].sort((a, b) => a.numericOrder - b.numericOrder);
            const expectedOrders = Array.from({ length: freshPhases.length }, (_, i) => i + 1);
            const actualOrders = sortedByOrder.map(p => p.numericOrder).sort((a, b) => a - b);
            
            // Check for gaps or duplicates
            const hasGaps = actualOrders.some((order, index) => order !== expectedOrders[index]);
            const hasDuplicates = new Set(actualOrders).size !== actualOrders.length;
            const hasInvalidOrders = actualOrders.some(order => order < 1 || order > freshPhases.length);
            
            if (hasGaps || hasDuplicates || hasInvalidOrders) {
              console.error('❌ CRITICAL VALIDATION FAILED: Phases out of sequential order:', {
                hasGaps,
                hasDuplicates,
                hasInvalidOrders,
                expected: expectedOrders,
                actual: actualOrders,
                phases: sortedByOrder.map(p => ({ name: p.phase.name, order: p.numericOrder }))
              });
              toast.error(`Edit Standard cannot load: Phases are out of sequential order or have duplicate positions. Expected order: ${expectedOrders.join(', ')}, Found: ${actualOrders.join(', ')}. Please fix the database.`);
              setPhasesLoaded(true);
              return;
            }
            
            console.log('✅ STRICT VALIDATION PASSED: All phases have valid sequential order positions:', {
              count: freshPhases.length,
              orders: actualOrders,
              phases: sortedByOrder.map(p => ({ name: p.phase.name, order: p.numericOrder }))
            });
            
            // Assign phaseOrderNumber to phases for display
            freshPhases = freshPhases.map(phase => {
              if (!phase.id) return phase;
              const positionData = positionMap.get(phase.id);
              if (!positionData) return phase;
              
              if (positionData.position_rule === 'first') {
                return { ...phase, phaseOrderNumber: 'first' as const };
              } else if (positionData.position_rule === 'last') {
                return { ...phase, phaseOrderNumber: 'last' as const };
              } else if (positionData.position_rule === 'nth' && positionData.position_value) {
                return { ...phase, phaseOrderNumber: positionData.position_value };
              }
              
          return phase;
        });
          }
        } else {
          // For regular projects: use get_project_workflow_with_standards
          const { data, error } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
            p_project_id: currentProject.id
          });
          
          if (error) {
            console.error('❌ Error fetching phases:', error);
            return;
          }
          
          freshPhases = Array.isArray(data) ? data : [];
        }
        
        // CRITICAL: Map step_title to step.step for all steps
        // Database uses step_title but interface expects step.step
        freshPhases = freshPhases.map(phase => ({
          ...phase,
          operations: phase.operations?.map(operation => ({
            ...operation,
            steps: operation.steps?.map(step => ({
              ...step,
              step: step.step || (step as any).step_title
            })).filter(step => step.step) || []
          })) || []
        }));
        
        if (freshPhases.length > 0) {
          // CRITICAL: For regular projects, load Standard Project Foundation phases if not already loaded
          // This ensures we have the correct 'first'/'last' designations before processing
          let standardPhasesToUse = standardProjectPhases;
          
          if (!isEditingStandardProject && standardPhasesToUse.length === 0) {
            // Fetch Standard Project Foundation phases directly within this function
            try {
              const { data: rebuiltStandardPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
                p_project_id: '00000000-0000-0000-0000-000000000001'
              });
              
              if (!rebuildError && rebuiltStandardPhases) {
                let phases = Array.isArray(rebuiltStandardPhases) ? rebuiltStandardPhases : [];
                phases = phases.filter(p => p.isStandard && !p.isLinked);
                
                // Fetch position_rule and position_value from database
                const { data: phasePositions, error: positionError } = await supabase
                  .from('project_phases')
                  .select('id, name, position_rule, position_value')
                  .eq('project_id', '00000000-0000-0000-0000-000000000001')
                  .in('id', phases.map(p => p.id).filter(id => id));
                
                if (!positionError && phasePositions) {
                  const positionMap = new Map(phasePositions.map(p => [p.id, p]));
                  
                  phases = phases.map(phase => {
                    if (phase.id && positionMap.has(phase.id)) {
                      const positionData = positionMap.get(phase.id)!;
                      if (positionData.position_rule === 'first') {
                        phase.phaseOrderNumber = 'first';
                      } else if (positionData.position_rule === 'last') {
                        phase.phaseOrderNumber = 'last';
                      } else if (positionData.position_rule === 'nth' && positionData.position_value) {
                        phase.phaseOrderNumber = positionData.position_value;
                      }
        }
        return phase;
      });
                }
                
                standardPhasesToUse = phases;
                console.log('📋 Loaded Standard Project Foundation phases inline:', {
                  count: standardPhasesToUse.length,
                  phases: standardPhasesToUse.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
                });
              }
            } catch (err) {
              console.warn('⚠️ Could not load Standard Project Foundation inline:', err);
            }
          }
          
          // CRITICAL: For regular projects, update standard phases' order from Standard Project Foundation
          // BEFORE applying sequential ordering - this ensures 'first'/'last' designations are preserved
          let phasesToValidate = deduplicatePhases(freshPhases);
          
          if (!isEditingStandardProject && standardPhasesToUse.length > 0) {
            // Update standard phases' phaseOrderNumber from Standard Project Foundation
            phasesToValidate = phasesToValidate.map(phase => {
              if (isStandardPhase(phase) && !phase.isLinked) {
                const standardPhase = standardPhasesToUse.find(sp => sp.name === phase.name);
                if (standardPhase && standardPhase.phaseOrderNumber !== undefined) {
                  // Preserve 'first'/'last' designations from Standard Project Foundation
                  if (standardPhase.phaseOrderNumber === 'first') {
                    return { ...phase, phaseOrderNumber: 'first' };
                  } else if (standardPhase.phaseOrderNumber === 'last') {
                    return { ...phase, phaseOrderNumber: 'last' };
                  } else if (typeof standardPhase.phaseOrderNumber === 'number') {
                    return { ...phase, phaseOrderNumber: standardPhase.phaseOrderNumber };
                  }
                }
              }
              return phase;
            });
            
            console.log('📋 Updated standard phases from Standard Project Foundation:', {
              count: phasesToValidate.filter(p => isStandardPhase(p) && !p.isLinked).length,
              phases: phasesToValidate.filter(p => isStandardPhase(p) && !p.isLinked).map(p => ({
                name: p.name,
                order: p.phaseOrderNumber
              }))
            });
          }
          
          // CRITICAL: For Edit Standard, phases have already been strictly validated
          // Skip normal validation and use the already-validated phases
          let validatedPhases: Phase[];
          
          if (isEditingStandardProject) {
            // For Edit Standard: phases were already validated and have correct phaseOrderNumber
            // Just sort them by order number
            validatedPhases = sortPhasesByOrderNumber(freshPhases);
            console.log('✅ Edit Standard: Using strictly validated phases (already sorted):', {
              count: validatedPhases.length,
              phases: validatedPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
            });
            } else {
            // For regular projects: apply normal validation
            // CRITICAL: Check for phases missing order positions BEFORE validation
            const phasesWithoutOrder = phasesToValidate.filter(p => 
              p.phaseOrderNumber === undefined || 
              p.phaseOrderNumber === null || 
              p.phaseOrderNumber === ''
            );
            
            if (phasesWithoutOrder.length > 0) {
              console.log('⚠️ Found phases missing order positions:', {
                count: phasesWithoutOrder.length,
                phases: phasesWithoutOrder.map(p => ({ name: p.name, id: p.id, hasOrder: p.phaseOrderNumber !== undefined }))
              });
            }
            
            // Apply sequential ordering validation - ensures ALL phases have order positions
            // For regular projects, this will preserve 'first'/'last' for standard phases from Standard Project Foundation
            validatedPhases = validateAndFixSequentialOrdering(phasesToValidate);
          }
          
          // CRITICAL: Verify ALL phases now have order positions
          const stillMissingOrder = validatedPhases.filter(p => 
            p.phaseOrderNumber === undefined || 
            p.phaseOrderNumber === null || 
            p.phaseOrderNumber === ''
          );
          
          if (stillMissingOrder.length > 0) {
            console.error('❌ CRITICAL: Phases still missing order positions after validation:', {
              count: stillMissingOrder.length,
              phases: stillMissingOrder.map(p => ({ name: p.name, id: p.id }))
            });
            // Force assign order positions to any that are still missing
            validatedPhases.forEach((phase, index) => {
              if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null || phase.phaseOrderNumber === '') {
                phase.phaseOrderNumber = index + 1;
                console.log('🔧 Forced order position assignment:', { name: phase.name, order: phase.phaseOrderNumber });
              }
            });
          }
          
          // CRITICAL: For Edit Standard, strict validation has already passed
          // Phases are already validated and have correct order positions in database
          // Skip persistence - phases are already correct, proceed directly to display
          if (isEditingStandardProject && validatedPhases.length > 0) {
            // Edit Standard phases were already strictly validated - skip persistence block
            // They are already correct in the database, proceed directly to setting displayPhases
            console.log('✅ Edit Standard: Skipping persistence - phases already validated and correct');
          } else if (!isEditingStandardProject) {
            // For regular projects, continue with normal flow (no persistence needed here)
            try {
              // Update all phases in database with their sequential order positions
              const updatePromises: Promise<any>[] = [];
              
              for (let i = 0; i < validatedPhases.length; i++) {
                const phase = validatedPhases[i];
                if (phase.isLinked || !phase.id) continue; // Skip linked phases or phases without IDs
                
                // CRITICAL: Ensure phase has order position assigned
                const sequentialPosition = typeof phase.phaseOrderNumber === 'number' 
                  ? phase.phaseOrderNumber 
                  : (phase.phaseOrderNumber === 'first' ? 1 : phase.phaseOrderNumber === 'last' ? validatedPhases.length : i + 1);
                
                // Determine position_rule and position_value
                let positionRule: string;
                let positionValue: number | null = null;
                
                if (sequentialPosition === 1) {
                  positionRule = 'first';
                  positionValue = null;
                } else if (sequentialPosition === validatedPhases.length) {
                  positionRule = 'last';
                  positionValue = null;
      } else {
                  positionRule = 'nth';
                  positionValue = sequentialPosition;
                }
                
                // Update the phase in database immediately
                updatePromises.push(
                  supabase
                    .from('project_phases')
                    .update({
                      position_rule: positionRule,
                      position_value: positionValue,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', phase.id)
                    .eq('project_id', currentProject.id)
                );
              }
              
              // Wait for all updates to complete
              const updateResults = await Promise.all(updatePromises);
              
              // Check for any update errors
              const updateErrors = updateResults.filter(result => result.error);
              if (updateErrors.length > 0) {
                console.error('❌ Some phase order updates failed:', updateErrors);
              }
              
              console.log('✅ Order positions persisted to database on immediate refresh:', {
                count: validatedPhases.length,
                phases: validatedPhases.map(p => ({ 
                  name: p.name, 
                  id: p.id,
                  order: p.phaseOrderNumber,
                  orderType: typeof p.phaseOrderNumber
                }))
              });
              
              // CRITICAL: Rebuild phases from database after updating positions
              // This ensures the phases JSON reflects the updated order positions
              const { data: rebuiltAfterUpdate, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
                p_project_id: currentProject.id
              });
              
              if (!rebuildError && rebuiltAfterUpdate) {
                const rebuiltPhasesArray = Array.isArray(rebuiltAfterUpdate) ? rebuiltAfterUpdate : [];
                const rebuiltStandardPhases = rebuiltPhasesArray.filter(p => isStandardPhase(p) && !p.isLinked);
                
                // CRITICAL: If phases are missing phaseOrderNumber after rebuild, fetch from database directly
                // and derive phaseOrderNumber from position_rule and position_value
                const phasesNeedingOrderNumbers = rebuiltStandardPhases.filter(p => 
                  p.phaseOrderNumber === undefined || 
                  p.phaseOrderNumber === null || 
                  p.phaseOrderNumber === ''
                );
                
                if (phasesNeedingOrderNumbers.length > 0) {
                  console.log('⚠️ Phases missing phaseOrderNumber after rebuild, fetching from database:', {
                    count: phasesNeedingOrderNumbers.length,
                    phaseIds: phasesNeedingOrderNumbers.map(p => p.id)
                  });
                  
                  // Fetch position_rule and position_value from database for phases missing order numbers
                  const { data: phasePositions, error: positionError } = await supabase
                    .from('project_phases')
                    .select('id, position_rule, position_value')
                    .eq('project_id', currentProject.id)
                    .in('id', phasesNeedingOrderNumbers.map(p => p.id).filter(id => id));
                  
                  if (!positionError && phasePositions) {
                    // Create a map of phase ID to position data
                    const positionMap = new Map(phasePositions.map(p => [p.id, p]));
                    
                    // Derive phaseOrderNumber from position_rule and position_value
                    rebuiltStandardPhases.forEach(phase => {
                      if (phase.id && (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null || phase.phaseOrderNumber === '')) {
                        const positionData = positionMap.get(phase.id);
                        if (positionData) {
                          // Derive numeric order position from position_rule and position_value
                          // getPhaseOrderNumber will convert 1 to 'First' and last position to 'Last' for display
                          if (positionData.position_rule === 'first') {
                            phase.phaseOrderNumber = 1;
                          } else if (positionData.position_rule === 'last') {
                            phase.phaseOrderNumber = rebuiltStandardPhases.length;
                          } else if (positionData.position_rule === 'nth' && positionData.position_value) {
                            phase.phaseOrderNumber = positionData.position_value;
                          } else if (positionData.position_rule === 'last_minus_n' && positionData.position_value) {
                            phase.phaseOrderNumber = rebuiltStandardPhases.length - positionData.position_value;
                          } else {
                            // Fallback: use current index
                            const currentIndex = rebuiltStandardPhases.indexOf(phase);
                            phase.phaseOrderNumber = currentIndex + 1;
                          }
                          console.log('🔧 Derived phaseOrderNumber from database:', {
                            name: phase.name,
                            id: phase.id,
                            position_rule: positionData.position_rule,
                            position_value: positionData.position_value,
                            derivedOrder: phase.phaseOrderNumber,
                            derivedOrderType: typeof phase.phaseOrderNumber
                          });
                        }
                      }
                    });
                  }
                }
                
                // Apply validation again to ensure all rebuilt phases have order positions
                const finalValidatedPhases = validateAndFixSequentialOrdering(rebuiltStandardPhases);
                
                // Verify all phases have order positions
                const finalMissingOrder = finalValidatedPhases.filter(p => 
                  p.phaseOrderNumber === undefined || 
                  p.phaseOrderNumber === null || 
                  p.phaseOrderNumber === ''
                );
                
                if (finalMissingOrder.length === 0) {
                  console.log('✅ All phases have order positions after rebuild:', {
                    count: finalValidatedPhases.length,
                    phases: finalValidatedPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
                  });
                  
                  // Use the rebuilt phases instead
                  validatedPhases.length = 0;
                  validatedPhases.push(...finalValidatedPhases);
                } else {
                  console.error('❌ Phases still missing order positions after rebuild and derivation:', {
                    count: finalMissingOrder.length,
                    phases: finalMissingOrder.map(p => ({ name: p.name, id: p.id }))
                  });
                  // Force assign order positions as last resort
                  finalMissingOrder.forEach((phase, index) => {
                    const phaseIndex = finalValidatedPhases.indexOf(phase);
                    phase.phaseOrderNumber = phaseIndex + 1;
                    console.log('🔧 Force assigned order position as last resort:', {
                      name: phase.name,
                      order: phase.phaseOrderNumber
                    });
                  });
                  validatedPhases.length = 0;
                  validatedPhases.push(...finalValidatedPhases);
                }
              }
            } catch (error) {
              console.error('❌ Error persisting order positions to database:', error);
              // Continue anyway - phases are still valid
            }
          }
          
          // CRITICAL: For regular projects, restore 'first'/'last' designations for standard phases
          // AFTER validation but BEFORE sorting - this ensures standard phases show correct positions
          let finalCheck = validatedPhases.map((phase, index) => {
            if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null || phase.phaseOrderNumber === '') {
              console.warn('⚠️ Phase missing order position at final check, assigning:', {
                name: phase.name,
                index: index + 1
              });
              return {
                ...phase,
                phaseOrderNumber: index + 1 as number
              };
            }
            return phase;
          });
          
          // CRITICAL: For regular projects, restore standard phases' 'first'/'last' from Standard Project Foundation
          // This must happen AFTER validation to override the numeric positions assigned by validateAndFixSequentialOrdering
          if (!isEditingStandardProject && standardPhasesToUse.length > 0) {
            // Create a map of standard phase names to their order numbers from Standard Project Foundation
            const standardOrderMap = new Map<string, string | number>();
            standardPhasesToUse.forEach(sp => {
              if (sp.name && sp.phaseOrderNumber !== undefined) {
                standardOrderMap.set(sp.name, sp.phaseOrderNumber);
              }
            });
            
            finalCheck = finalCheck.map(phase => {
              if (isStandardPhase(phase) && !phase.isLinked && phase.name) {
                const standardOrder = standardOrderMap.get(phase.name);
                if (standardOrder !== undefined) {
                  // Restore 'first'/'last' designations from Standard Project Foundation
                  if (standardOrder === 'first' || standardOrder === 1) {
                    return { ...phase, phaseOrderNumber: 'first' };
                  } else if (standardOrder === 'last') {
                    return { ...phase, phaseOrderNumber: 'last' };
                  } else if (typeof standardOrder === 'number') {
                    // For numeric positions from Standard Project Foundation, preserve them
                    return { ...phase, phaseOrderNumber: standardOrder };
                  }
                }
              }
              return phase;
            });
            
            console.log('📋 Restored standard phase designations from Standard Project Foundation:', {
              count: finalCheck.filter(p => isStandardPhase(p) && !p.isLinked).length,
              phases: finalCheck.filter(p => isStandardPhase(p) && !p.isLinked).map(p => ({
                name: p.name,
                order: p.phaseOrderNumber,
                orderType: typeof p.phaseOrderNumber
              }))
            });
          }
          
          // CRITICAL: Sort phases sequentially by order number before displaying
          // This ensures phases are shown in correct order for both Edit Standard and regular projects
          // The sort will handle 'first' and 'last' correctly (first comes first, last comes last)
          const sortedPhases = sortPhasesByOrderNumber(finalCheck);
          
          // CRITICAL: Set displayPhases directly from database (source of truth)
          setDisplayPhasesFromDb(true);
          setDisplayPhases(sortedPhases);
          setPhasesLoaded(true);
          
          // Update project context to keep everything in sync
              updateProject({
                ...currentProject,
            phases: sortedPhases,
                updatedAt: new Date()
              });
          
          console.log('✅ Phases loaded immediately from database (final, sorted sequentially):', {
            count: sortedPhases.length,
            phases: sortedPhases.map(p => ({ 
              name: p.name, 
              order: p.phaseOrderNumber,
              hasOrder: p.phaseOrderNumber !== undefined && p.phaseOrderNumber !== null
            }))
          });
      } else {
          // No phases found - clear display
          setDisplayPhases([]);
          setPhasesLoaded(true);
        }
      } catch (error) {
        console.error('❌ Error in immediate refresh:', error);
        setPhasesLoaded(true); // Set loaded even on error to prevent infinite retries
      }
    };
    
    // Force immediate fetch when project changes or component mounts
    fetchPhasesImmediately();
  }, [currentProject?.id, isEditingStandardProject]); // Only run when project changes
  
  // Update displayPhases when processedPhases changes (fallback if immediate refresh didn't work)
  // CRITICAL: NEVER override displayPhases if it was set directly from database
  // displayPhases is the source of truth when set from database
  useEffect(() => {
    // CRITICAL: Never overwrite displayPhases if it was set directly from database
    if (displayPhasesFromDb) {
      console.log('🔒 Skipping processedPhases update - displayPhases was set directly from database');
      return;
    }
    
    // Skip if we're actively adding, deleting, or changing phase order (those functions handle their own updates)
    if (isAddingPhase || isDeletingPhase || skipNextRefresh || isChangingPhaseOrder || phasesLoaded) {
      return;
    }
    
    // Update if we have processedPhases and displayPhases is empty
    if (processedPhases.length > 0 && displayPhases.length === 0) {
      console.log('🔄 Fallback: Setting displayPhases from processedPhases', {
        projectId: currentProject?.id,
        processedPhasesCount: processedPhases.length
      });
      
      const sortedForDisplay = sortPhasesByOrderNumber(processedPhases);
      setDisplayPhases(sortedForDisplay);
      setPhasesLoaded(true);
    }
  }, [processedPhases, displayPhases.length, phasesLoaded, isAddingPhase, isDeletingPhase, skipNextRefresh, isChangingPhaseOrder, displayPhasesFromDb, currentProject?.id]);

  // CRITICAL: Verify phases exist in database for standard projects
  // This prevents deleted phases from appearing after page refresh
  useEffect(() => {
    if (isEditingStandardProject && currentProject?.id) {
      const verifyPhases = async () => {
        try {
          const { data: existingPhases, error } = await supabase
            .from('project_phases')
            .select('id')
            .eq('project_id', currentProject.id);
          
          if (error) {
            console.error('❌ Error verifying phases exist:', error);
            setVerifiedPhaseIds(new Set());
          } else if (existingPhases) {
            const verifiedIds = new Set(existingPhases.map(p => p.id));
            setVerifiedPhaseIds(verifiedIds);
            console.log('✅ Verified phase IDs for standard project:', {
              projectId: currentProject.id,
              verifiedCount: verifiedIds.size,
              verifiedIds: Array.from(verifiedIds)
            });
          }
        } catch (err) {
          console.error('❌ Error verifying phases:', err);
          setVerifiedPhaseIds(new Set());
        }
      };
      
      verifyPhases();
    } else {
      // For non-standard projects, clear verified IDs (not needed)
      setVerifiedPhaseIds(new Set());
    }
  }, [isEditingStandardProject, currentProject?.id]);

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
  // CRITICAL: For standard projects, verify phases exist in database to filter out deleted phases
  useEffect(() => {
    if (!phasesLoaded && !rebuildingPhases && currentProject && currentProject.phases && currentProject.phases.length > 0 && displayPhases.length === 0) {
      const initializePhases = async () => {
        let phasesToDisplay = deduplicatePhases(currentProject.phases);
        
        // CRITICAL: For standard projects, verify phases exist in database
        // This prevents deleted phases from appearing after page refresh
        if (isEditingStandardProject) {
          try {
            // Get all phase IDs from project_phases table
            const { data: existingPhases, error } = await supabase
              .from('project_phases')
              .select('id')
              .eq('project_id', currentProject.id);
            
            if (error) {
              console.error('❌ Error verifying phases exist:', error);
              // Continue with phases from JSON if verification fails
            } else if (existingPhases) {
              const existingPhaseIds = new Set(existingPhases.map(p => p.id));
              const beforeCount = phasesToDisplay.length;
              
              // Filter out phases that don't exist in database
              phasesToDisplay = phasesToDisplay.filter(phase => {
                const exists = phase.id ? existingPhaseIds.has(phase.id) : false;
                if (!exists) {
                  console.log('🚫 Filtering out deleted phase from cached JSON:', {
                    phaseId: phase.id,
                    phaseName: phase.name
                  });
                }
                return exists;
              });
              
              const afterCount = phasesToDisplay.length;
              if (beforeCount !== afterCount) {
                console.log('✅ Filtered out deleted phases from cached JSON:', {
                  beforeCount,
                  afterCount,
                  filteredCount: beforeCount - afterCount
                });
              }
            }
          } catch (err) {
            console.error('❌ Error verifying phases:', err);
            // Continue with phases from JSON if verification fails
          }
        }
        
        const phasesWithUniqueOrder = ensureUniqueOrderNumbers(phasesToDisplay);
        const orderedPhases = enforceStandardPhaseOrdering(phasesWithUniqueOrder, standardProjectPhases);
        
        // CRITICAL: Validate and fix phase order numbers when initializing phases
        // This ensures all phases have unique order numbers and respects standard phase positions
        const validationResult = validateAndFixPhaseOrderNumbers(orderedPhases);
        const validatedPhases = validationResult.phases;
        
        if (validationResult.fixed) {
          console.log('🔧 Phase order validation fixed issues during initialization:', {
            issuesCount: validationResult.issues.length,
            sampleIssues: validationResult.issues.slice(0, 3)
          });
          
          // CRITICAL: Persist validation fixes to database
          // This ensures the backend database is properly updated for all phases
          if (currentProject && validatedPhases.length > 0) {
            // Sort phases by order number before saving
            const sortedValidatedPhases = sortPhasesByOrderNumber(validatedPhases);
            
            // Update project JSON with validated phases
            const updatedProject = {
              ...currentProject,
              phases: sortedValidatedPhases,
              updatedAt: new Date()
            };
            
            // Update project context (this saves to database via updateProject)
            updateProject(updatedProject);
            
            // CRITICAL: Also update database project_phases table for Standard Project Foundation
            if (isEditingStandardProject) {
              // Use setTimeout to avoid state update during render
              setTimeout(async () => {
                try {
                  await updatePhaseOrder(sortedValidatedPhases);
                  console.log('✅ Phase order validation fixes persisted to database during initialization');
                } catch (error) {
                  console.error('❌ Error persisting validation fixes to database:', error);
                }
              }, 100);
            }
          }
        }
        
        const sortedPhases = sortPhasesByOrderNumber(validatedPhases);
        if (sortedPhases.length > 0) {
          console.log('🔍 StructureManager initializing displayPhases from currentProject (fallback):', {
            projectId: currentProject.id,
            projectName: currentProject.name,
            phaseCount: sortedPhases.length,
            phaseNames: sortedPhases.map(p => p.name),
            isEditingStandardProject
          });
          setDisplayPhases(sortedPhases);
          setPhasesLoaded(true);
        }
      };
      
      initializePhases();
    }
  }, [currentProject, phasesLoaded, displayPhases.length, rebuildingPhases, isEditingStandardProject]);

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
    // CRITICAL: For standard phases in regular projects, ALWAYS use order from Standard Project Foundation
    // This ensures 'First' and 'Last' positions are shown correctly for standard phases
    if (!isEditingStandardProject && isStandardPhase(phase) && !phase.isLinked && standardProjectPhases.length > 0) {
      const standardPhase = standardProjectPhases.find(sp => sp.name === phase.name);
      if (standardPhase && standardPhase.phaseOrderNumber !== undefined) {
        // CRITICAL: Use Standard Project Foundation order as source of truth for standard phases
        if (standardPhase.phaseOrderNumber === 'first' || standardPhase.phaseOrderNumber === 1) {
          return 'First';
        }
        if (standardPhase.phaseOrderNumber === 'last') {
          return 'Last';
        }
        // Check if it's the last phase in Standard Project Foundation
        const lastStandardPhase = standardProjectPhases[standardProjectPhases.length - 1];
        if (lastStandardPhase && lastStandardPhase.name === phase.name && lastStandardPhase.phaseOrderNumber === 'last') {
          return 'Last';
        }
        // For numeric values, return as-is
        if (typeof standardPhase.phaseOrderNumber === 'number') {
          return standardPhase.phaseOrderNumber;
        }
        return standardPhase.phaseOrderNumber;
      }
    }
    
    // Use phase's own order number if available
    if (phase.phaseOrderNumber !== undefined && phase.phaseOrderNumber !== null) {
      if (phase.phaseOrderNumber === 'first') return 'First';
      if (phase.phaseOrderNumber === 'last') return 'Last';
      if (typeof phase.phaseOrderNumber === 'number') {
        // For non-standard phases, convert numeric positions to 'First'/'Last' for display if appropriate
        // But only if Standard Project Foundation check didn't find a match
        if (phase.phaseOrderNumber === 1 && (!isStandardPhase(phase) || phase.isLinked)) {
          return 'First';
        } else if (phase.phaseOrderNumber === totalPhases && (!isStandardPhase(phase) || phase.isLinked)) {
          return 'Last';
        }
      return phase.phaseOrderNumber;
    }
    }
    
    // CRITICAL: If phase is missing order position, assign it based on current position
    // This ensures dropdown always has a valid value to display
    const sequentialPosition = phaseIndex + 1; // 1-based position
    
    if (sequentialPosition === 1) {
      return 'First';
    } else if (sequentialPosition === totalPhases) {
      return 'Last';
    } else {
      return sequentialPosition;
    }
  };

  // Fetch standard phase order from Standard Project Foundation
  useEffect(() => {
    if (!isEditingStandardProject && currentProject) {
      const fetchStandardPhases = async () => {
        try {
          const { data: standardProject, error } = await supabase
            .from('projects')
            .select('phases')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .single();

          if (!error && standardProject?.phases) {
            // CRITICAL: Rebuild phases from database to get correct position_rule values
            // This ensures we get the actual 'first'/'last' designations from the database
            try {
              const { data: rebuiltStandardPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
                p_project_id: '00000000-0000-0000-0000-000000000001'
              });
              
              if (!rebuildError && rebuiltStandardPhases) {
                let phases = Array.isArray(rebuiltStandardPhases) ? rebuiltStandardPhases : [];
                // Filter to only standard phases
                phases = phases.filter(p => p.isStandard && !p.isLinked);
                
                // Fetch position_rule and position_value from database to derive phaseOrderNumber correctly
                const { data: phasePositions, error: positionError } = await supabase
                  .from('project_phases')
                  .select('id, name, position_rule, position_value')
                  .eq('project_id', '00000000-0000-0000-0000-000000000001')
                  .in('id', phases.map(p => p.id).filter(id => id));
                
                if (!positionError && phasePositions) {
                  // Create a map of phase ID to position data
                  const positionMap = new Map(phasePositions.map(p => [p.id, p]));
                  
                  // Update phases with correct phaseOrderNumber from position_rule
                  phases = phases.map(phase => {
                    if (phase.id && positionMap.has(phase.id)) {
                      const positionData = positionMap.get(phase.id)!;
                      if (positionData.position_rule === 'first') {
                        phase.phaseOrderNumber = 'first';
                      } else if (positionData.position_rule === 'last') {
                        phase.phaseOrderNumber = 'last';
                      } else if (positionData.position_rule === 'nth' && positionData.position_value) {
                        phase.phaseOrderNumber = positionData.position_value;
                      }
                    }
                    return phase;
                  });
                }
                
                // Ensure all phases have phaseOrderNumber
            phases = phases.map((phase, index) => {
              if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
                if (index === 0) {
                  phase.phaseOrderNumber = 'first';
                } else if (index === phases.length - 1) {
                  phase.phaseOrderNumber = 'last';
                } else {
                  phase.phaseOrderNumber = index + 1;
                }
              }
              return phase;
            });
            
                console.log('📋 Fetched Standard Project Foundation phases (from database):', {
              count: phases.length,
              phases: phases.map(p => ({ 
                name: p.name, 
                order: p.phaseOrderNumber,
                hasOrder: p.phaseOrderNumber !== undefined,
                orderType: typeof p.phaseOrderNumber
              }))
            });
            setStandardProjectPhases(phases);
              } else {
                // Fallback to using phases from JSON
                let phases = Array.isArray(standardProject.phases) ? standardProject.phases : [];
                phases = phases.map((phase, index) => {
                  if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
                    if (index === 0) {
                      phase.phaseOrderNumber = 'first';
                    } else if (index === phases.length - 1) {
                      phase.phaseOrderNumber = 'last';
                    } else {
                      phase.phaseOrderNumber = index + 1;
                    }
                  }
                  return phase;
                });
                setStandardProjectPhases(phases);
              }
            } catch (rebuildErr) {
              console.warn('⚠️ Could not rebuild Standard Project Foundation phases, using JSON:', rebuildErr);
              // Fallback to using phases from JSON
              let phases = Array.isArray(standardProject.phases) ? standardProject.phases : [];
              phases = phases.map((phase, index) => {
                if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
                  if (index === 0) {
                    phase.phaseOrderNumber = 'first';
                  } else if (index === phases.length - 1) {
                    phase.phaseOrderNumber = 'last';
                  } else {
                    phase.phaseOrderNumber = index + 1;
                  }
                }
                return phase;
              });
              setStandardProjectPhases(phases);
            }
          } else if (error) {
            console.error('❌ Error fetching Standard Project Foundation phases:', error);
          }
        } catch (error) {
          console.error('Error fetching standard project phases:', error);
        }
      };

      fetchStandardPhases();
    } else {
      setStandardProjectPhases([]);
    }
  }, [isEditingStandardProject, currentProject?.id]);

  // Get available order numbers for dropdown (excluding standard phase numbers in project templates)
  // CRITICAL: This function MUST always return at least one option to ensure dropdown is never empty
  // CRITICAL: This function must query the database for actual position rules, not rely on displayPhases indices
  const getAvailableOrderNumbers = (currentPhase: Phase, currentIndex: number, totalPhases: number): (string | number)[] => {
    const options: (string | number)[] = [];
    
    // CRITICAL: If totalPhases is 0 or invalid, return at least 'First' as a fallback
    if (totalPhases <= 0) {
      console.warn('⚠️ getAvailableOrderNumbers: totalPhases is invalid, returning fallback options');
      return ['First', 1, 'Last'];
    }
    
    // Create a set of reserved order numbers from standard project phases
    const reservedByStandardPhases = new Set<string | number>();
    
    // CRITICAL: Query database for actual position rules from Standard Project Foundation
    // This is the source of truth, not displayPhases indices
    if (!isEditingStandardProject) {
      // Use a synchronous approach: query database position rules
      // We'll use standardProjectPhases if available, but also need to query DB for position_rule/position_value
      const standardProjectId = '00000000-0000-0000-0000-000000000001';
      
      // First, try to get position rules from standardProjectPhases (already loaded)
      // But we need to also consider the actual position rules from the database
      if (standardProjectPhases.length > 0) {
        standardProjectPhases.forEach(phase => {
          const orderNumber = phase.phaseOrderNumber;
          
          if (orderNumber !== undefined && orderNumber !== null) {
            if (orderNumber === 'first' || orderNumber === 'First') {
              reservedByStandardPhases.add('First');
              reservedByStandardPhases.add(1);
              console.log('🔒 Reserved "First" and position 1 for:', phase.name);
            } else if (orderNumber === 'last' || orderNumber === 'Last') {
              reservedByStandardPhases.add('Last');
              reservedByStandardPhases.add(totalPhases); // Reserve the last numeric position
              console.log('🔒 Reserved "Last" and position', totalPhases, 'for:', phase.name);
            } else if (typeof orderNumber === 'number') {
              reservedByStandardPhases.add(orderNumber);
              console.log('🔒 Reserved position', orderNumber, 'for:', phase.name);
            }
          }
        });
      }
      
      // CRITICAL: Also check displayPhases for standard phases and their actual positions
      // This handles cases where standard phases are already in the project
      displayPhases.forEach((phase, index) => {
        if (isStandardPhase(phase) && !phase.isLinked) {
          const orderNumber = phase.phaseOrderNumber;
          
          // Reserve based on phaseOrderNumber
          if (orderNumber === 'first' || orderNumber === 'First') {
            reservedByStandardPhases.add('First');
            reservedByStandardPhases.add(1);
          } else if (orderNumber === 'last' || orderNumber === 'Last') {
            reservedByStandardPhases.add('Last');
            reservedByStandardPhases.add(totalPhases);
          } else if (typeof orderNumber === 'number') {
            reservedByStandardPhases.add(orderNumber);
          }
          
          // CRITICAL: Also reserve the actual numeric position where the standard phase appears
          // This ensures that if a standard phase is at position 4, position 4 is reserved
          // BUT: Only do this if the phase doesn't have a specific order number that conflicts
          // For example, if Planning has orderNumber=2 and is at index 1 (position 2), we already reserved 2
          // But if Ordering has orderNumber='last_minus_n' and is at index 3 (position 4), we need to reserve 4
          const numericPosition = index + 1;
          
          // Only reserve the numeric position if:
          // 1. The phase doesn't have a conflicting orderNumber, OR
          // 2. The phase has 'last_minus_n' type positioning (which maps to a specific numeric position)
          if (orderNumber === 'last' || orderNumber === 'Last') {
            // 'last' already reserves totalPhases, but also reserve the actual position if different
            if (numericPosition !== totalPhases) {
              reservedByStandardPhases.add(numericPosition);
              console.log('🔒 Reserved numeric position', numericPosition, 'for standard phase at that position:', phase.name);
            }
          } else if (orderNumber !== 'first' && orderNumber !== 'First' && typeof orderNumber !== 'number') {
            // Phase has a relative position (like 'last_minus_n'), reserve its actual numeric position
            reservedByStandardPhases.add(numericPosition);
            console.log('🔒 Reserved numeric position', numericPosition, 'for standard phase with relative position:', phase.name, 'orderNumber:', orderNumber);
          } else if (typeof orderNumber === 'number' && orderNumber !== numericPosition) {
            // Phase has a specific order number that doesn't match its current position
            // Reserve both the order number AND the actual position
            reservedByStandardPhases.add(numericPosition);
            console.log('🔒 Reserved numeric position', numericPosition, 'for standard phase (orderNumber mismatch):', phase.name);
          }
        }
      });
      
      console.log('🔒 Reserved positions from Standard Project Foundation:', {
        reserved: Array.from(reservedByStandardPhases),
        reservedCount: reservedByStandardPhases.size,
        totalPhases,
        standardPhases: standardProjectPhases.map(p => ({ 
          name: p.name, 
          order: p.phaseOrderNumber
        }))
      });
    }
    
    // Add 'First' only if not reserved by a standard phase
    const hasFirstOption = !reservedByStandardPhases.has('First');
    if (hasFirstOption) {
      options.push('First');
    }
    
    // Add integer options (1 to totalPhases)
    for (let i = 1; i <= totalPhases; i++) {
      // Skip if this number is reserved by a standard phase (in project template mode)
      if (!isEditingStandardProject && reservedByStandardPhases.has(i)) {
        continue;
      }
      // CRITICAL: If 'first' is reserved by a standard phase, also exclude position 1
      // Position 1 is the same as 'first', so it should be reserved
      if (!isEditingStandardProject && reservedByStandardPhases.has('First') && i === 1) {
        continue;
      }
      // CRITICAL: In Edit Standard mode, if 'First' is available, exclude position 1
      // 'First' and position 1 are the same position, so only show one
      if (isEditingStandardProject && hasFirstOption && i === 1) {
        continue;
      }
      // CRITICAL: If 'last' is reserved by a standard phase, also exclude the last numeric position
      // The last numeric position (totalPhases) is the same as 'last', so it should be reserved
      if (!isEditingStandardProject && reservedByStandardPhases.has('Last') && i === totalPhases) {
        continue;
      }
      options.push(i);
    }
    
    // Add 'Last' only if not reserved by a standard phase
    if (!reservedByStandardPhases.has('Last')) {
      options.push('Last');
    }
    
    // CRITICAL: Ensure we always return at least one option
    // If no options were added (shouldn't happen, but safety check), add fallback options
    if (options.length === 0) {
      console.warn('⚠️ getAvailableOrderNumbers: No options generated, adding fallback options', {
        totalPhases,
        currentIndex,
        phaseName: currentPhase.name,
        reservedByStandardPhases: Array.from(reservedByStandardPhases)
      });
      
      // Find the first available position that's not reserved
      // Start from position 3 (after Kickoff and Planning) and go up
      for (let i = 3; i <= totalPhases; i++) {
        if (!reservedByStandardPhases.has(i) && i !== totalPhases) {
          options.push(i);
          break;
        }
      }
      
      // If still no options, add positions between standard phases
      if (options.length === 0) {
        // Add positions that are likely available (between standard phases)
        // For example, if we have 5 phases and standard phases are at 1, 2, 4, 5
        // Position 3 should be available
        const currentPos = currentIndex + 1;
        const safePositions = [3, 4, 5, 6, 7, 8, 9, 10]; // Common positions that might be available
        for (const pos of safePositions) {
          if (pos <= totalPhases && !reservedByStandardPhases.has(pos) && pos !== totalPhases) {
            options.push(pos);
            if (options.length >= 3) break; // Add at least 3 options
          }
        }
      }
      
      // Final fallback: add current position and adjacent positions if they're not reserved
      if (options.length === 0) {
        const currentPos = currentIndex + 1;
        const candidates = [
          Math.max(1, currentPos - 1),
          currentPos,
          Math.min(totalPhases, currentPos + 1)
        ];
        candidates.forEach(pos => {
          if (pos > 0 && pos <= totalPhases && !reservedByStandardPhases.has(pos) && pos !== totalPhases) {
            options.push(pos);
          }
        });
      }
    }
    
    // Remove duplicates and sort
    const uniqueOptions = Array.from(new Set(options));
    uniqueOptions.sort((a, b) => {
      const aVal = a === 'First' ? -Infinity : a === 'Last' ? Infinity : (typeof a === 'number' ? a : 1000);
      const bVal = b === 'First' ? -Infinity : b === 'Last' ? Infinity : (typeof b === 'number' ? b : 1000);
      return aVal - bVal;
    });
    
    return uniqueOptions;
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
      // For standard phases in Edit Standard mode, recalculate order numbers based on new position
      // For custom/linked phases, assign sequential numbers
      const totalPhases = reorderedPhases.length;
      reorderedPhases.forEach((p, index) => {
        const isStandard = !p.isLinked && isStandardPhase(p);
        
        if (isStandard && isEditingStandardProject) {
          // When editing Standard Project Foundation, standard phases can be reordered
          // Update order numbers based on their new position
          if (index === 0) {
            p.phaseOrderNumber = 'first';
          } else if (index === totalPhases - 1) {
            p.phaseOrderNumber = 'last';
          } else {
            // Other standard phases get their position numbers
            p.phaseOrderNumber = index + 1;
          }
        } else if (isStandard && !isEditingStandardProject) {
          // Standard phases outside Edit Standard mode keep their existing order numbers
          // Don't change them
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
      
      // CRITICAL: Ensure order numbers are sequential based on actual position
      // Reassign order numbers sequentially based on new positions
      reorderedPhases.forEach((p, index) => {
        if (index === 0) {
          p.phaseOrderNumber = 'first';
        } else if (index === reorderedPhases.length - 1) {
          p.phaseOrderNumber = 'last';
        } else {
          p.phaseOrderNumber = index + 1;
        }
      });
      
      // CRITICAL: Sort by order number to ensure correct display order
      const sortedPhases = sortPhasesByOrderNumber(reorderedPhases);
      
      // Update display immediately (UI-only change)
      setDisplayPhases(sortedPhases);
      
      // Update project context
      updateProject({
        ...currentProject,
        phases: reorderedPhases,
        updatedAt: new Date()
      });
      
      // Mark that there are pending order changes (don't save to database yet)
      setHasPendingOrderChanges(true);
      console.log('🔄 Phase reordered in UI (pending save):', {
        phaseId,
        direction,
        oldIndex: phaseIndex,
        newIndex,
        reorderedPhases: reorderedPhases.map(p => ({ id: p.id, name: p.name, order: p.phaseOrderNumber }))
      });
      
      // No database update here - will be saved on window close
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
    
    // Reorder operations by updating the phases JSON directly
    // Operations are ordered by their position in the operations array
    const operation = phase.operations[operationIndex];
    const targetOperation = phase.operations[newIndex];
    
    // Swap operations in the local phase
    const updatedOperations = [...phase.operations];
    [updatedOperations[operationIndex], updatedOperations[newIndex]] = [updatedOperations[newIndex], updatedOperations[operationIndex]];
    
    // Update the phase in the project
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(p => 
        p.id === phaseId 
          ? { ...p, operations: updatedOperations }
          : p
      ),
      updatedAt: new Date()
    };
    
    // Save to database
    const { error: updateError } = await supabase
      .from('projects')
      .update({ phases: updatedProject.phases as any })
      .eq('id', currentProject.id);
    
    if (updateError) {
      toast.error('Error reordering operation');
      return;
    }
    
    // Update local context
    updateProject(updatedProject);
    
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
      
      const orderedPhases = enforceStandardPhaseOrdering(mergedPhases, standardProjectPhases);
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
  
  // Handle phase order change from dropdown
  // CRITICAL: This function must work even when phases don't have order positions yet
  const handlePhaseOrderChange = async (phaseId: string, newOrder: string | number) => {
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }
    
    // Prevent concurrent order changes
    if (isChangingPhaseOrder) {
      console.log('⏭️ Phase order change already in progress, skipping');
      return;
    }
    
    const phase = displayPhases.find(p => p.id === phaseId);
    if (!phase) {
      console.error('❌ Phase not found for order change:', phaseId);
      toast.error('Phase not found');
      return;
    }
    
    console.log('🔄 handlePhaseOrderChange called:', {
      phaseId,
      phaseName: phase.name,
      newOrder,
      currentOrder: phase.phaseOrderNumber,
      totalPhases: displayPhases.length
    });
    
    setIsChangingPhaseOrder(true);
    setSkipNextRefresh(true); // Prevent processedPhases from reordering
    
    try {
      // Convert 'First'/'Last' to numeric positions for sequential ordering
      const targetPosition = newOrder === 'First' ? 1 : newOrder === 'Last' ? displayPhases.length : 
                            typeof newOrder === 'number' ? newOrder : parseInt(String(newOrder), 10);
      
      // Validate target position
      if (isNaN(targetPosition) || targetPosition < 1 || targetPosition > displayPhases.length) {
        console.error('❌ Invalid target position:', targetPosition, 'from newOrder:', newOrder);
        toast.error('Invalid position selected');
        setIsChangingPhaseOrder(false);
        setSkipNextRefresh(false);
        return;
      }
      
      // Create reordered array by moving the phase to target position
      const phasesArray = [...displayPhases];
      const currentIndex = phasesArray.findIndex(p => p.id === phaseId);
      
      if (currentIndex === -1) {
        console.error('❌ Phase not found in displayPhases:', phaseId);
        setIsChangingPhaseOrder(false);
        setSkipNextRefresh(false);
        return;
      }
      
      // Move phase to target position
      const [movedPhase] = phasesArray.splice(currentIndex, 1);
      const targetIndex = Math.min(Math.max(0, targetPosition - 1), phasesArray.length);
      phasesArray.splice(targetIndex, 0, movedPhase);
      
      // CRITICAL: Apply sequential ordering validation (1, 2, 3, ...)
      // This ensures ALL phases have valid order positions, even if they were missing them
      const reorderedPhases = validateAndFixSequentialOrdering(phasesArray);
      
      console.log('✅ Phases reordered:', {
        movedPhase: phase.name,
        fromIndex: currentIndex,
        toIndex: targetIndex,
        before: displayPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber })),
        after: reorderedPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
      });
      
      // Update display immediately (optimistic UI update)
      setDisplayPhases(reorderedPhases);
    
      // CRITICAL: Immediately commit to database
      // Update all phases in database with new positions
      const updatePromises: Promise<any>[] = [];
      
      for (let i = 0; i < reorderedPhases.length; i++) {
        const phase = reorderedPhases[i];
        if (phase.isLinked) continue; // Skip linked phases
        
        const orderPosition = typeof phase.phaseOrderNumber === 'number' ? phase.phaseOrderNumber : 
                              phase.phaseOrderNumber === 'first' ? 1 : reorderedPhases.length;
        
        // Get current phase data from database
        const { data: phaseData } = await supabase
          .from('project_phases')
          .select('id, position_rule, is_standard, standard_phase_id')
          .eq('id', phase.id)
          .eq('project_id', currentProject.id)
          .maybeSingle();
        
        if (!phaseData) continue;
        
        // Determine position_rule and position_value
        // For Edit Standard: use sequential positions (1, 2, 3, ...)
        // For regular projects: preserve standard phase position rules
        let positionRule: string;
        let positionValue: number | null = null;
        
        if (isEditingStandardProject) {
          // Edit Standard: use simple sequential positions
          const sequentialPosition = i + 1; // 1-based position
          
          if (sequentialPosition === 1) {
          positionRule = 'first';
          positionValue = null;
          } else if (sequentialPosition === reorderedPhases.length) {
          positionRule = 'last';
          positionValue = null;
          } else {
            // Use 'nth' rule with sequential position as value
            positionRule = 'nth';
            positionValue = sequentialPosition;
          }
        } else {
          // Regular projects: preserve existing position rules for standard phases
          if (phaseData.is_standard && phaseData.standard_phase_id) {
            // Keep existing position_rule, update position_value if needed
            const existingRule = phaseData.position_rule || 'nth';
            positionRule = existingRule;
            
            if (existingRule === 'nth') {
              positionValue = i + 1; // Sequential position
            } else if (existingRule === 'last_minus_n') {
              const distanceFromLast = reorderedPhases.length - i - 1;
            positionValue = distanceFromLast > 0 ? distanceFromLast : 1;
          } else {
              positionValue = null;
          }
        } else {
            // Custom phases: use last_minus_n
            if (i === 0) {
              positionRule = 'first';
              positionValue = null;
            } else if (i === reorderedPhases.length - 1) {
              positionRule = 'last';
              positionValue = null;
            } else {
              const distanceFromLast = reorderedPhases.length - i - 1;
              positionRule = 'last_minus_n';
              positionValue = distanceFromLast > 0 ? distanceFromLast : 1;
            }
          }
        }
        
        // Update the phase in database immediately
        updatePromises.push(
          supabase
          .from('project_phases')
          .update({
            position_rule: positionRule,
            position_value: positionValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', phase.id)
            .eq('project_id', currentProject.id)
        );
      }
      
      // Wait for all database updates to complete
      await Promise.all(updatePromises);
      
      console.log('✅ Phase order positions saved to database immediately');
      
      // CRITICAL: Don't rebuild phases immediately - the reorderedPhases already have correct order
      // Rebuilding would fetch from database but might apply reordering logic
      // Instead, just update the project JSON and context with the reordered phases we already have
      
      // Update project JSON with reordered phases
      await supabase
        .from('projects')
        .update({ phases: reorderedPhases as any })
        .eq('id', currentProject.id);
      
      // Update context and display - use reorderedPhases directly
      updateProject({
        ...currentProject,
        phases: reorderedPhases,
        updatedAt: new Date()
      });
      
      // DisplayPhases is already updated with reorderedPhases (optimistic update above)
      toast.success('Phase order updated and saved');
      
      console.log('✅ Phase order updated without rebuilding - using reordered phases directly:', {
        count: reorderedPhases.length,
        phases: reorderedPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
      });
      
      // CRITICAL: After database update, rebuild from database to ensure we have fresh data
      // Then update displayPhases with the fresh order from database
      let freshPhasesFromDb: Phase[] = [];
      
      if (isEditingStandardProject) {
        // For Edit Standard: fetch directly from database
        const { data: rebuiltPhases, error } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
          p_project_id: currentProject.id
        });
        
        if (!error && rebuiltPhases) {
          freshPhasesFromDb = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
          freshPhasesFromDb = freshPhasesFromDb.filter(p => isStandardPhase(p) && !p.isLinked);
        }
      } else {
        // For regular projects: use get_project_workflow_with_standards
        const { data, error } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
          p_project_id: currentProject.id
        });
        
        if (!error && data) {
          freshPhasesFromDb = Array.isArray(data) ? data : [];
        }
      }
      
      if (freshPhasesFromDb.length > 0) {
        // Sort by order for display
        const sortedFreshPhases = [...freshPhasesFromDb].sort((a, b) => {
          const aOrder = typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 
                        a.phaseOrderNumber === 'first' ? 0 : 
                        a.phaseOrderNumber === 'last' ? 9999 : 0;
          const bOrder = typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 
                        b.phaseOrderNumber === 'first' ? 0 : 
                        b.phaseOrderNumber === 'last' ? 9999 : 0;
          return aOrder - bOrder;
        });
        
        // CRITICAL: Update displayPhases with fresh data from database (source of truth)
        // Set flag to prevent any intermediate functions from overwriting it
        setDisplayPhasesFromDb(true);
        setDisplayPhases(sortedFreshPhases);
        
        // Update project context with fresh phases
        updateProject({
          ...currentProject,
          phases: sortedFreshPhases,
          updatedAt: new Date()
        });
        
        console.log('✅ Updated displayPhases directly from database (source of truth) after order change:', {
          count: sortedFreshPhases.length,
          phases: sortedFreshPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
        });
      }
      
      // Clear the flag after successful update and database refresh
      setIsChangingPhaseOrder(false);
      // Clear skipNextRefresh now that we have fresh data from database
      setSkipNextRefresh(false);
    } catch (error) {
      console.error('❌ Error saving phase order to database:', error);
      toast.error('Error saving phase order');
      setIsChangingPhaseOrder(false);
      setSkipNextRefresh(false);
      // Revert to previous state on error - read directly from database as source of truth
      try {
        if (isEditingStandardProject) {
          const { data: freshPhases, error: freshError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
            p_project_id: currentProject.id
          });
          if (!freshError && freshPhases) {
            const freshArray = Array.isArray(freshPhases) ? freshPhases : [];
            const freshStandard = freshArray.filter(p => isStandardPhase(p) && !p.isLinked);
            if (freshStandard.length > 0) {
              setDisplayPhasesFromDb(true);
              setDisplayPhases(freshStandard);
            }
          }
        } else {
          const { data: freshPhases, error: freshError } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
            p_project_id: currentProject.id
          });
          if (!freshError && freshPhases) {
            const freshArray = Array.isArray(freshPhases) ? freshPhases : [];
            if (freshArray.length > 0) {
              setDisplayPhasesFromDb(true);
              setDisplayPhases(freshArray);
            }
          }
        }
      } catch (revertError) {
        console.error('❌ Error reverting to database state:', revertError);
      }
    }
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
    
    // Reorder steps by updating the phases JSON directly
    // Steps are ordered by their position in the steps array
    const step = operation.steps[stepIndex];
    const targetStep = operation.steps[newIndex];
    
    // Swap steps in the local operation
    const updatedSteps = [...operation.steps];
    [updatedSteps[stepIndex], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[stepIndex]];
    
    // Update the operation in the phase
    const updatedOperations = phase.operations.map(op =>
      op.id === operationId
        ? { ...op, steps: updatedSteps }
        : op
    );
    
    // Update the phase in the project
    const updatedProject = {
      ...currentProject,
      phases: currentProject.phases.map(p => 
        p.id === phaseId 
          ? { ...p, operations: updatedOperations }
          : p
      ),
      updatedAt: new Date()
    };
    
    // Save to database
    const { error: updateError } = await supabase
      .from('projects')
      .update({ phases: updatedProject.phases as any })
      .eq('id', currentProject.id);
    
    if (updateError) {
      toast.error('Error reordering step');
      return;
    }
    
    // Update local context
    updateProject(updatedProject);
    
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
      
      const orderedPhases = enforceStandardPhaseOrdering(mergedPhases, standardProjectPhases);
      
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
  // Converts phaseOrderNumber to position_rule/position_value and saves to project_phases table
  const updatePhaseOrder = async (reorderedPhases: Phase[]) => {
    if (!currentProject) return;
    
    try {
      console.log('🔄 updatePhaseOrder - reorderedPhases:', reorderedPhases.map(p => ({ id: p.id, name: p.name, phaseOrderNumber: p.phaseOrderNumber, isLinked: p.isLinked })));
      
      const updatePromises: Promise<any>[] = [];
      
      // Update position_rule/position_value for all phases based on their phaseOrderNumber
      for (let i = 0; i < reorderedPhases.length; i++) {
        const phase = reorderedPhases[i];
        if (phase.isLinked) continue; // Skip linked phases
        
        // Get current phase data from database
        const { data: phaseData } = await supabase
          .from('project_phases')
          .select('id, position_rule, is_standard, standard_phase_id')
          .eq('id', phase.id)
          .eq('project_id', currentProject.id)
          .maybeSingle();
        
        if (!phaseData) continue;
        
        // Determine position_rule and position_value based on phaseOrderNumber
        let positionRule: string;
        let positionValue: number | null = null;
        
        if (phase.phaseOrderNumber === 'first') {
          positionRule = 'first';
          positionValue = null;
        } else if (phase.phaseOrderNumber === 'last') {
          positionRule = 'last';
          positionValue = null;
        } else if (typeof phase.phaseOrderNumber === 'number') {
          // For standard phases, keep their existing position_rule if it's 'nth'
          // For custom phases, use 'last_minus_n'
          if (phaseData.is_standard && phaseData.standard_phase_id && phaseData.position_rule === 'nth') {
            // Standard phase with 'nth' rule - keep it, update position_value
            positionRule = 'nth';
            positionValue = phase.phaseOrderNumber;
          } else {
            // Custom phase: calculate position_value based on distance from last
            const totalPhases = reorderedPhases.length;
            const distanceFromLast = totalPhases - i - 1;
            positionRule = 'last_minus_n';
            positionValue = distanceFromLast > 0 ? distanceFromLast : 1;
          }
        } else {
          // Fallback: keep existing position_rule or use 'last_minus_n'
          positionRule = phaseData.position_rule || 'last_minus_n';
          positionValue = phaseData.position_rule === 'last_minus_n' ? (reorderedPhases.length - i - 1) : null;
        }
        
        // Update the phase in database
        const updatePromise = supabase
          .from('project_phases')
          .update({
            position_rule: positionRule,
            position_value: positionValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', phase.id)
          .eq('project_id', currentProject.id);
        
        updatePromises.push(updatePromise);
      }
      
      await Promise.all(updatePromises);
      console.log('✅ updatePhaseOrder - Saved order positions to database');
      
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

      // IMPORTANT: When editing Standard Project Foundation, preserve the user's reordered phase order
      // Don't apply enforceStandardPhaseOrdering as it would revert the reordering
      // For regular projects, apply enforceStandardPhaseOrdering using order from Standard Project Foundation
      let orderedPhases: Phase[];
      if (isEditingStandardProject) {
        // In Edit Standard mode, preserve the exact order from reorderedPhases
        orderedPhases = finalPhases;
      } else {
        // For regular projects, enforce standard phase ordering using Standard Project Foundation order
        orderedPhases = enforceStandardPhaseOrdering(finalPhases, standardProjectPhases);
      }
      
      // CRITICAL: Preserve order numbers from the INPUT reorderedPhases, not from finalPhases
      // This ensures 'first' and 'last' designations are preserved even after database rebuild
      const orderNumberMap = new Map(reorderedPhases.map(p => [p.id, p.phaseOrderNumber]));
      
      // For Edit Standard mode, also create a map by name to preserve order numbers for standard phases
      // This ensures order numbers are preserved even if phase IDs change during rebuild
      const orderNumberByNameMap = new Map<string, string | number>();
      if (isEditingStandardProject) {
        reorderedPhases.forEach(phase => {
          if (phase.name && phase.phaseOrderNumber !== undefined) {
            orderNumberByNameMap.set(phase.name, phase.phaseOrderNumber);
          }
        });
      }
      
      // THEN assign order numbers based on the correct order, but preserve existing ones
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
      
      // Restore preserved order numbers for ALL phases, especially 'first' and 'last'
      phasesWithUniqueOrder.forEach((phase, index) => {
          const preservedOrder = orderNumberMap.get(phase.id);
          if (preservedOrder !== undefined) {
          // CRITICAL: Always restore 'first' and 'last' designations from the original input
          if (preservedOrder === 'first' || preservedOrder === 'last') {
            phase.phaseOrderNumber = preservedOrder;
          } else if (phase.isLinked) {
            // For incorporated phases, restore their order number
            phase.phaseOrderNumber = preservedOrder;
          }
          // For other phases, ensureUniqueOrderNumbers has already assigned correct numbers
        } else if (isEditingStandardProject && phase.name) {
          // Fallback: try to restore by name if ID doesn't match (e.g., after rebuild)
          const orderByName = orderNumberByNameMap.get(phase.name);
          if (orderByName !== undefined) {
            phase.phaseOrderNumber = orderByName;
          }
        }
      });
      
      // CRITICAL: After restoring, ensure the last phase in the sorted array has 'last' if it was originally 'last'
      // This handles the case where the last phase might have been moved during sorting
      if (phasesWithUniqueOrder.length > 0) {
        const originalLastPhase = reorderedPhases.find(p => p.phaseOrderNumber === 'last');
        if (originalLastPhase) {
          // Find the phase in phasesWithUniqueOrder that matches the original last phase
          const lastPhaseInSorted = phasesWithUniqueOrder.find(p => p.id === originalLastPhase.id);
          if (lastPhaseInSorted) {
            // Restore 'last' to this phase
            lastPhaseInSorted.phaseOrderNumber = 'last';
            
            // If this phase is not at the end, move it to the end
            const currentIndex = phasesWithUniqueOrder.indexOf(lastPhaseInSorted);
            if (currentIndex !== phasesWithUniqueOrder.length - 1) {
              phasesWithUniqueOrder.splice(currentIndex, 1);
              phasesWithUniqueOrder.push(lastPhaseInSorted);
            }
          } else {
            // Original last phase not found - ensure the actual last phase has 'last'
            const lastPhase = phasesWithUniqueOrder[phasesWithUniqueOrder.length - 1];
            if (lastPhase && lastPhase.phaseOrderNumber !== 'last') {
              console.warn('⚠️ Original last phase not found, ensuring current last phase has "last":', {
                originalLastPhaseName: originalLastPhase.name,
                currentLastPhaseName: lastPhase.name
              });
              lastPhase.phaseOrderNumber = 'last';
            }
          }
        }
      }
      
      // CRITICAL: Before sorting, ensure the last phase has 'last' if it was originally 'last'
      // This must happen BEFORE sorting so the sort puts it in the right position
      if (phasesWithUniqueOrder.length > 0) {
        const originalLastPhase = reorderedPhases.find(p => p.phaseOrderNumber === 'last');
        if (originalLastPhase) {
          const phaseToUpdate = phasesWithUniqueOrder.find(p => p.id === originalLastPhase.id);
          if (phaseToUpdate) {
            phaseToUpdate.phaseOrderNumber = 'last';
          }
        }
      }
      
      // Sort phases by order number before saving
      const sortedPhases = sortPhasesByOrderNumber(phasesWithUniqueOrder);
      
      // CRITICAL: After sorting, ensure the last phase in the sorted array has 'last' if it was originally 'last'
      // This handles the case where the last phase might have been moved during sorting
      if (sortedPhases.length > 0) {
        const originalLastPhase = reorderedPhases.find(p => p.phaseOrderNumber === 'last');
        if (originalLastPhase) {
          const lastPhase = sortedPhases[sortedPhases.length - 1];
          if (lastPhase.id === originalLastPhase.id) {
            lastPhase.phaseOrderNumber = 'last';
          } else {
            // The original last phase moved - find it and restore 'last', then move it to the end
            const movedPhase = sortedPhases.find(p => p.id === originalLastPhase.id);
            if (movedPhase) {
              movedPhase.phaseOrderNumber = 'last';
              // Move it to the end
              const index = sortedPhases.indexOf(movedPhase);
              sortedPhases.splice(index, 1);
              sortedPhases.push(movedPhase);
            }
          }
        }
      }
      
      // CRITICAL: Ensure all phases have order numbers before saving
      sortedPhases.forEach((phase, index) => {
        if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
          // Assign order number based on position
          if (index === 0) {
            phase.phaseOrderNumber = 'first';
          } else if (index === sortedPhases.length - 1) {
            // Check if this should be 'last' (only if it's a standard phase in regular projects)
            if (!isEditingStandardProject && isStandardPhase(phase) && !phase.isLinked) {
              phase.phaseOrderNumber = 'last';
            } else {
              phase.phaseOrderNumber = index + 1;
            }
          } else {
            phase.phaseOrderNumber = index + 1;
          }
          console.log('🔧 Assigned missing order number in updatePhaseOrder:', {
            phaseName: phase.name,
            phaseId: phase.id,
            assignedOrder: phase.phaseOrderNumber,
            index
          });
        }
      });
      
      // Save final phases JSON to database - explicitly include phaseOrderNumber
      const phasesToSave = sortedPhases.map(phase => ({
        ...phase,
        phaseOrderNumber: phase.phaseOrderNumber // Explicitly include phaseOrderNumber
      }));
      
      console.log('💾 Saving phases with order numbers to database:', {
        projectId: currentProject.id,
        phases: phasesToSave.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
      });
      
      const { error: saveError } = await supabase
        .from('projects')
        .update({ phases: phasesToSave as any })
        .eq('id', currentProject.id);
      
      if (saveError) {
        console.error('❌ Error saving phases with order numbers:', saveError);
        throw saveError;
      }
      
      console.log('✅ Phases saved successfully with order numbers');
      
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
    if (isAddingPhase) {
      console.log('⏭️ Add phase already in progress, skipping');
      return;
    }
    
    if (!currentProject) {
      toast.error('No project selected');
      return;
    }
    
    // CRITICAL: Clear justAddedPhaseId before adding a new phase
    // This prevents the previous phase's ID from interfering with the new phase
    setJustAddedPhaseId(null);
    
    setIsAddingPhase(true);
    setSkipNextRefresh(true);
    const startTime = Date.now();
    const minDisplayTime = 1500; // Minimum 1.5 seconds to show loading state
    
    console.log('🔵 Add Phase button clicked', {
      hasProject: !!currentProject,
      projectId: currentProject?.id,
      isEditingStandardProject,
      isAddingPhase: true
    });
    
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

      // CONDITION 1: Use RPC to immediately commit phase addition to database
      // The RPC function inserts into project_phases table, ensuring visible phases reflect actual database state
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

      // CRITICAL: For regular projects, use get_project_workflow_with_standards to include standard phases
      // For Standard Project Foundation, use rebuild_phases_json_from_project_phases
      let rebuiltPhasesArray: Phase[] = [];
      if (isEditingStandardProject) {
        // For Standard Project Foundation, rebuild from project_phases table
        const { data: rebuiltPhases, error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
          p_project_id: currentProject.id
        });

        if (rebuildError) {
          console.error('❌ Error rebuilding phases:', rebuildError);
          throw rebuildError;
        }
        
        rebuiltPhasesArray = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
      } else {
        // For regular projects, use get_project_workflow_with_standards to get all phases (standard + custom)
        // This prevents standard phases from disappearing during refresh
        const { data: workflowPhases, error: workflowError } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
          p_project_id: currentProject.id
        });

        if (workflowError) {
          console.error('❌ Error getting workflow with standards:', workflowError);
          throw workflowError;
        }
        
        // Parse the result
        if (workflowPhases) {
          if (typeof workflowPhases === 'string') {
            rebuiltPhasesArray = JSON.parse(workflowPhases);
          } else if (Array.isArray(workflowPhases)) {
            rebuiltPhasesArray = workflowPhases;
          }
        }
      }
      
      console.log('✅ Rebuilt phases:', {
        count: rebuiltPhasesArray.length,
        phases: rebuiltPhasesArray,
        isEditingStandardProject
      });

      // Merge with any incorporated phases from current project (they're not in project_phases table)
      const currentPhases = currentProject.phases || [];
      const incorporatedPhases = currentPhases.filter(p => p.isLinked);
      const allPhases = [...rebuiltPhasesArray, ...incorporatedPhases];
      const rawPhases = deduplicatePhases(allPhases);
      
      // CRITICAL: When editing Standard Project Foundation, position new phase at second-to-last position
      // (before the last standard phase)
      let orderedPhases: Phase[];
      if (isEditingStandardProject) {
        // Find the newly added phase
        const newPhase = rawPhases.find(p => 
          p.name === uniquePhaseName || (addedPhaseId && p.id === addedPhaseId)
        );
        
        if (newPhase) {
          // Remove the new phase from the array temporarily
          const phasesWithoutNew = rawPhases.filter(p => 
            p.id !== newPhase.id && p.name !== uniquePhaseName
          );
          
          // Find the last standard phase (one with 'last' order number or at the end)
          const lastStandardPhaseIndex = phasesWithoutNew.findIndex((p, idx) => {
            if (p.isLinked) return false;
            const isLastStandard = isStandardPhase(p) && 
              (p.phaseOrderNumber === 'last' || 
               (idx === phasesWithoutNew.length - 1 && !phasesWithoutNew.slice(idx + 1).some(ph => isStandardPhase(ph) && !ph.isLinked)));
            return isLastStandard;
          });
          
          // Insert new phase at second-to-last position (before last standard phase)
          if (lastStandardPhaseIndex !== -1) {
            phasesWithoutNew.splice(lastStandardPhaseIndex, 0, newPhase);
            orderedPhases = phasesWithoutNew;
            
            // CRITICAL: Set the new phase's order number to ensure it stays at second-to-last
            // Find the last phase's order number and set new phase to be one less
            const lastPhase = orderedPhases[orderedPhases.length - 1];
            if (lastPhase && lastPhase.phaseOrderNumber === 'last') {
              // If last phase has 'last', set new phase to totalPhases - 1 (second-to-last)
              const newPhaseIndex = orderedPhases.findIndex(p => p.id === newPhase.id || p.name === uniquePhaseName);
              if (newPhaseIndex !== -1) {
                orderedPhases[newPhaseIndex].phaseOrderNumber = orderedPhases.length - 1;
              }
            } else if (lastPhase && typeof lastPhase.phaseOrderNumber === 'number') {
              // If last phase has a number, set new phase to that number - 1
              const newPhaseIndex = orderedPhases.findIndex(p => p.id === newPhase.id || p.name === uniquePhaseName);
              if (newPhaseIndex !== -1) {
                orderedPhases[newPhaseIndex].phaseOrderNumber = lastPhase.phaseOrderNumber - 1;
              }
            }
          } else {
            // If no last standard phase found, insert before the last phase
            phasesWithoutNew.splice(phasesWithoutNew.length - 1, 0, newPhase);
            orderedPhases = phasesWithoutNew;
            
            // Set new phase's order number to be second-to-last
            const newPhaseIndex = orderedPhases.findIndex(p => p.id === newPhase.id || p.name === uniquePhaseName);
            const lastPhase = orderedPhases[orderedPhases.length - 1];
            if (newPhaseIndex !== -1 && lastPhase) {
              if (lastPhase.phaseOrderNumber === 'last') {
                orderedPhases[newPhaseIndex].phaseOrderNumber = orderedPhases.length - 1;
              } else if (typeof lastPhase.phaseOrderNumber === 'number') {
                orderedPhases[newPhaseIndex].phaseOrderNumber = lastPhase.phaseOrderNumber - 1;
              } else {
                orderedPhases[newPhaseIndex].phaseOrderNumber = orderedPhases.length - 1;
              }
            }
          }
        } else {
          // New phase not found, use standard ordering
          orderedPhases = enforceStandardPhaseOrdering(rawPhases, standardProjectPhases);
        }
      } else {
        // For regular projects, apply enforceStandardPhaseOrdering using Standard Project Foundation order
        orderedPhases = enforceStandardPhaseOrdering(rawPhases, standardProjectPhases);
        
        // CRITICAL: Verify that the newly added phase is positioned correctly (last_minus_n, not last)
        // Find the newly added phase
        const newPhase = orderedPhases.find(p => 
          p.name === uniquePhaseName || (addedPhaseId && p.id === addedPhaseId)
        );
        if (newPhase) {
          // Find the standard "Close Project" phase (should be last)
          // Check both phaseOrderNumber (UI ordering) and any positionRule from database
          const lastStandardPhaseIndex = orderedPhases.findIndex(p => 
            isStandardPhase(p) && !p.isLinked && (p.phaseOrderNumber === 'last' || (p as any).positionRule === 'last' || (p as any).position_rule === 'last')
          );
          if (lastStandardPhaseIndex !== -1) {
            // Find the new phase index
            const newPhaseIndex = orderedPhases.findIndex(p => p.id === newPhase.id);
            // If new phase is at or after the last phase, move it before
            if (newPhaseIndex >= lastStandardPhaseIndex) {
              // Remove new phase and insert it before the last phase
              orderedPhases.splice(newPhaseIndex, 1);
              orderedPhases.splice(lastStandardPhaseIndex, 0, newPhase);
              console.log('🔧 Repositioned new phase to last_minus_n (before Close Project):', {
                phaseName: newPhase.name,
                oldIndex: newPhaseIndex,
                newIndex: lastStandardPhaseIndex
              });
            }
            // CRITICAL: Explicitly set phaseOrderNumber for new phase to be "last minus one"
            // Calculate the correct numeric position (total phases - 1, since last phase is at totalPhases)
            const totalPhases = orderedPhases.length;
            const newPhaseFinalIndex = orderedPhases.findIndex(p => p.id === newPhase.id);
            if (newPhaseFinalIndex !== -1) {
              // The new phase should be at position (totalPhases - 1) since Close Project is at position totalPhases (or 'last')
              // But we need to ensure it's not less than the position of the phase before it
              const phaseBeforeLast = orderedPhases[lastStandardPhaseIndex - 1];
              if (phaseBeforeLast) {
                const beforeLastOrder = typeof phaseBeforeLast.phaseOrderNumber === 'number' 
                  ? phaseBeforeLast.phaseOrderNumber 
                  : phaseBeforeLast.phaseOrderNumber === 'first' ? 1 
                  : phaseBeforeLast.phaseOrderNumber === 'last' ? totalPhases 
                  : newPhaseFinalIndex;
                // Set new phase to be one position after the phase before last
                newPhase.phaseOrderNumber = Math.max(beforeLastOrder + 1, totalPhases - 1);
              } else {
                // No phase before last, so new phase should be at totalPhases - 1
                newPhase.phaseOrderNumber = totalPhases - 1;
              }
              console.log('🔧 Set phaseOrderNumber for new phase (last minus one):', {
                phaseName: newPhase.name,
                phaseOrderNumber: newPhase.phaseOrderNumber,
                totalPhases,
                lastStandardPhaseIndex,
                newPhaseFinalIndex
              });
            }
          } else {
            // No "Close Project" phase found - set to last position minus one as fallback
            const totalPhases = orderedPhases.length;
            const newPhaseIndex = orderedPhases.findIndex(p => p.id === newPhase.id);
            if (newPhaseIndex !== -1 && totalPhases > 1) {
              newPhase.phaseOrderNumber = totalPhases - 1;
              console.log('🔧 Set phaseOrderNumber for new phase (fallback, no Close Project found):', {
                phaseName: newPhase.name,
                phaseOrderNumber: newPhase.phaseOrderNumber,
                totalPhases
              });
            }
          }
        }
      }
      
      // THEN assign order numbers based on the correct order
      // CRITICAL: Use positionRule/positionValue from database when available
      // This ensures phases respect their database position rules instead of array index
      const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
      
      // CRITICAL: Map positionRule/positionValue to phaseOrderNumber
      // This ensures the database position rules are respected in the UI
      phasesWithUniqueOrder.forEach((phase, index) => {
        // First, try to use positionRule/positionValue from database if available
        const positionRule = (phase as any).positionRule || (phase as any).position_rule;
        const positionValue = (phase as any).positionValue || (phase as any).position_value;
        
        if (positionRule) {
          // Map positionRule to phaseOrderNumber
          if (positionRule === 'first') {
            phase.phaseOrderNumber = 'first';
          } else if (positionRule === 'last') {
            phase.phaseOrderNumber = 'last';
          } else if (positionRule === 'nth' && positionValue !== undefined && positionValue !== null) {
            // For 'nth', use the position_value as the order number
            // BUT: position_value = 1 is equivalent to 'first', which is reserved for standard phases
            // So custom phases should never get position_value = 1
            if (positionValue === 1 && !isStandardPhase(phase)) {
              console.error('❌ ERROR: Custom phase has position_value = 1, which is reserved for standard "Kickoff" phase!', {
                phaseName: phase.name,
                phaseId: phase.id,
                positionRule,
                positionValue
              });
              // Don't assign 'first' to custom phases - use a safe fallback
              phase.phaseOrderNumber = index + 1;
            } else {
              phase.phaseOrderNumber = positionValue;
            }
          } else if (positionRule === 'last_minus_n' && positionValue !== undefined && positionValue !== null) {
            // For 'last_minus_n', calculate the position from the end
            // If there are N total phases and position_value = 1, the phase should be at position N-1
            // position_value = 2 means position N-2, etc.
            const totalPhases = phasesWithUniqueOrder.length;
            
            // Find the last phase (should be "Close Project" with position_rule = 'last')
            const lastPhaseIndex = phasesWithUniqueOrder.findIndex(p => {
              const pRule = (p as any).positionRule || (p as any).position_rule;
              return pRule === 'last' || p.phaseOrderNumber === 'last';
            });
            
            if (lastPhaseIndex !== -1) {
              // Calculate position: last phase is at lastPhaseIndex (0-indexed)
              // In 1-indexed terms, last phase is at position (lastPhaseIndex + 1)
              // For last_minus_n with position_value = 1, the phase should be at (lastPhaseIndex + 1) - 1 = lastPhaseIndex
              // In 1-indexed terms, that's position (lastPhaseIndex) which is second-to-last
              // For position_value = 2, it should be at (lastPhaseIndex + 1) - 2 = lastPhaseIndex - 1
              // In 1-indexed terms, that's position (lastPhaseIndex) which is third-to-last
              const calculatedPosition = (lastPhaseIndex + 1) - positionValue;
              
              // Ensure it's not less than 1 (which would conflict with 'first')
              if (calculatedPosition <= 1 && !isStandardPhase(phase)) {
                console.warn('⚠️ Calculated position for last_minus_n would conflict with first position:', {
                  phaseName: phase.name,
                  calculatedPosition,
                  totalPhases,
                  positionValue,
                  lastPhaseIndex
                });
                phase.phaseOrderNumber = Math.max(2, calculatedPosition); // Use at least position 2
              } else {
                phase.phaseOrderNumber = calculatedPosition;
              }
              
              console.log('✅ Calculated phaseOrderNumber from last_minus_n:', {
                phaseName: phase.name,
                phaseOrderNumber: phase.phaseOrderNumber,
                positionValue,
                lastPhaseIndex,
                totalPhases,
                calculatedPosition
              });
            } else {
              // Fallback: if no last phase found, calculate from total phases
              const calculatedPosition = totalPhases - positionValue;
              if (calculatedPosition <= 1 && !isStandardPhase(phase)) {
                phase.phaseOrderNumber = Math.max(2, calculatedPosition);
              } else {
                phase.phaseOrderNumber = calculatedPosition;
              }
              console.log('✅ Calculated phaseOrderNumber from last_minus_n (fallback, no last phase):', {
                phaseName: phase.name,
                phaseOrderNumber: phase.phaseOrderNumber,
                positionValue,
                totalPhases,
                calculatedPosition
              });
            }
          }
        }
        
        // If phaseOrderNumber is still undefined, assign based on index (fallback)
        if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
          // CRITICAL: Never assign position 1 or 'first' to custom phases
          // Position 1 is reserved for the standard "Kickoff" phase
          if (index === 0) {
            // Check if first position is already taken by a standard phase
            const hasStandardFirst = phasesWithUniqueOrder.some(p => 
              isStandardPhase(p) && !p.isLinked && (p.phaseOrderNumber === 'first' || p.phaseOrderNumber === 1)
            );
            if (hasStandardFirst || !isStandardPhase(phase) || phase.isLinked) {
              // Don't assign 'first' to custom phases or if standard phase already has it
              phase.phaseOrderNumber = index + 1;
            } else {
              phase.phaseOrderNumber = 'first';
            }
          } else if (index === phasesWithUniqueOrder.length - 1) {
            // Check if this should be 'last' (only if it's a standard phase in regular projects)
            if (!isEditingStandardProject && isStandardPhase(phase) && !phase.isLinked) {
              phase.phaseOrderNumber = 'last';
            } else {
              phase.phaseOrderNumber = index + 1;
            }
          } else {
            phase.phaseOrderNumber = index + 1;
          }
          console.log('🔧 Assigned missing order number to phase (fallback):', {
            phaseName: phase.name,
            phaseId: phase.id,
            assignedOrder: phase.phaseOrderNumber,
            index,
            positionRule,
            positionValue
          });
        } else {
          console.log('✅ Using database position rule for phase:', {
            phaseName: phase.name,
            phaseId: phase.id,
            phaseOrderNumber: phase.phaseOrderNumber,
            positionRule,
            positionValue
          });
        }
      });
      
      // CRITICAL: Final pass - ensure ALL phases have order numbers assigned
      // This prevents blank dropdown menus, especially for phases with last_minus_n
      // Sort phases by their current order numbers to determine correct sequential positions
      const phasesWithOrderNumbers = phasesWithUniqueOrder.filter(p => 
        p.phaseOrderNumber !== undefined && p.phaseOrderNumber !== null
      );
      const phasesWithoutOrderNumbers = phasesWithUniqueOrder.filter(p => 
        p.phaseOrderNumber === undefined || p.phaseOrderNumber === null
      );
      
      // Sort phases with order numbers to find gaps
      phasesWithOrderNumbers.sort((a, b) => {
        const aOrder = typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 
                      a.phaseOrderNumber === 'first' ? 0 : 
                      a.phaseOrderNumber === 'last' ? 9999 : 9998;
        const bOrder = typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 
                      b.phaseOrderNumber === 'first' ? 0 : 
                      b.phaseOrderNumber === 'last' ? 9999 : 9998;
        return aOrder - bOrder;
      });
      
      // Assign order numbers to phases that don't have them
      // Insert them in the correct position based on their array index
      phasesWithoutOrderNumbers.forEach((phase, idx) => {
        const phaseIndex = phasesWithUniqueOrder.indexOf(phase);
        
        // Find the correct order number based on surrounding phases
        if (phaseIndex === 0) {
          // First phase - check if 'first' is available
          const hasFirst = phasesWithOrderNumbers.some(p => 
            p.phaseOrderNumber === 'first' || p.phaseOrderNumber === 1
          );
          if (!hasFirst && (isStandardPhase(phase) || isEditingStandardProject)) {
            phase.phaseOrderNumber = 'first';
          } else {
            phase.phaseOrderNumber = 1;
          }
        } else if (phaseIndex === phasesWithUniqueOrder.length - 1) {
          // Last phase - check if 'last' is available
          const hasLast = phasesWithOrderNumbers.some(p => p.phaseOrderNumber === 'last');
          if (!hasLast && !isEditingStandardProject && isStandardPhase(phase) && !phase.isLinked) {
            phase.phaseOrderNumber = 'last';
          } else {
            // Find the highest numeric order number and add 1
            const maxOrder = Math.max(
              ...phasesWithOrderNumbers
                .map(p => typeof p.phaseOrderNumber === 'number' ? p.phaseOrderNumber : 0)
                .filter(n => n > 0)
            );
            phase.phaseOrderNumber = maxOrder + 1;
          }
        } else {
          // Middle phase - find a position between surrounding phases
          const prevPhase = phasesWithUniqueOrder[phaseIndex - 1];
          const nextPhase = phasesWithUniqueOrder[phaseIndex + 1];
          
          const prevOrder = typeof prevPhase?.phaseOrderNumber === 'number' ? prevPhase.phaseOrderNumber :
                           prevPhase?.phaseOrderNumber === 'first' ? 1 :
                           prevPhase?.phaseOrderNumber === 'last' ? 9999 : 0;
          const nextOrder = typeof nextPhase?.phaseOrderNumber === 'number' ? nextPhase.phaseOrderNumber :
                           nextPhase?.phaseOrderNumber === 'first' ? 1 :
                           nextPhase?.phaseOrderNumber === 'last' ? 9999 : 9999;
          
          // Assign a position between prev and next
          if (prevOrder > 0 && nextOrder > prevOrder) {
            phase.phaseOrderNumber = prevOrder + 1;
          } else {
            // Fallback: use index + 1, but ensure it's not 1 for custom phases
            const calculatedOrder = phaseIndex + 1;
            if (calculatedOrder === 1 && !isStandardPhase(phase) && !phase.isLinked) {
              phase.phaseOrderNumber = 2; // Skip position 1 for custom phases
            } else {
              phase.phaseOrderNumber = calculatedOrder;
            }
          }
        }
        
        console.log('🔧 Assigned missing order number in final pass:', {
          phaseName: phase.name,
          phaseId: phase.id,
          assignedOrder: phase.phaseOrderNumber,
          phaseIndex
        });
      });

      // CRITICAL: Set isStandard flag correctly based on whether we're editing Standard Project Foundation
      // - When editing Standard Project Foundation (isEditingStandardProject = true): 
      //   Newly added phases should be isStandard: true (they become part of the standard foundation)
      // - When editing regular project templates (isEditingStandardProject = false):
      //   Newly added phases should be isStandard: false (they're custom phases)
      // CRITICAL: Always use explicit boolean values, never undefined
      const shouldBeStandard = Boolean(isEditingStandardProject);
      
      const phasesWithCorrectStandardFlag = phasesWithUniqueOrder.map(phase => {
        // If this is the newly added phase, set isStandard based on editing mode
        const isNewPhase = phase.name === uniquePhaseName || (addedPhaseId && phase.id === addedPhaseId);
        if (isNewPhase) {
          // CRITICAL: For regular templates, newly added phases are NEVER standard
          // Only allow standard if we're editing Standard Project Foundation
          // CRITICAL: Explicitly set to false for regular projects, regardless of what the database says
          const finalIsStandard = Boolean(isEditingStandardProject);
          console.log('🔵 Setting isStandard for newly added phase:', {
            phaseId: phase.id,
            phaseName: phase.name,
            shouldBeStandard,
            isEditingStandardProject,
            finalIsStandard,
            currentPhaseIsStandard: phase.isStandard,
            addedPhaseId
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
      
      // CRITICAL: Double-check that the new phase has the correct isStandard flag
      // This is a safety measure to ensure correct flag assignment
      const newPhaseInFinal = phasesWithCorrectStandardFlag.find(p => 
        p.name === uniquePhaseName || (addedPhaseId && p.id === addedPhaseId)
      );
      if (newPhaseInFinal) {
        if (!isEditingStandardProject && newPhaseInFinal.isStandard === true) {
          // Regular project: new phase should NOT be standard
          console.error('❌ ERROR: New phase incorrectly marked as standard in regular project! Fixing...');
          newPhaseInFinal.isStandard = false;
        } else if (isEditingStandardProject && newPhaseInFinal.isStandard !== true) {
          // Edit Standard: new phase MUST be standard
          console.error('❌ ERROR: New phase incorrectly NOT marked as standard in Edit Standard! Fixing...');
          newPhaseInFinal.isStandard = true;
        }
      }

      // CRITICAL: Ensure all phases have order numbers before saving
      // Final pass: assign order numbers to any phases that still don't have them
      const phasesWithAllOrderNumbers = phasesWithCorrectStandardFlag.map((phase, index) => {
        if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
          // Find the last phase to determine correct position
          const lastPhaseIndex = phasesWithCorrectStandardFlag.findIndex(p => 
            p.phaseOrderNumber === 'last' || ((p as any).positionRule === 'last' || (p as any).position_rule === 'last')
          );
          
          if (lastPhaseIndex !== -1 && index === lastPhaseIndex - 1) {
            // This is the phase right before "Close Project" - should be "last minus one"
            const totalPhases = phasesWithCorrectStandardFlag.length;
            phase.phaseOrderNumber = totalPhases - 1;
          } else if (index === 0) {
            // First phase
            const hasStandardFirst = phasesWithCorrectStandardFlag.some(p => 
              isStandardPhase(p) && !p.isLinked && (p.phaseOrderNumber === 'first' || p.phaseOrderNumber === 1)
            );
            if (!hasStandardFirst && (isStandardPhase(phase) || isEditingStandardProject)) {
              phase.phaseOrderNumber = 'first';
            } else {
              phase.phaseOrderNumber = 1;
            }
          } else if (index === phasesWithCorrectStandardFlag.length - 1) {
            // Last phase
            if (!isEditingStandardProject && isStandardPhase(phase) && !phase.isLinked) {
              phase.phaseOrderNumber = 'last';
            } else {
              phase.phaseOrderNumber = phasesWithCorrectStandardFlag.length;
            }
          } else {
            phase.phaseOrderNumber = index + 1;
          }
          
          console.log('🔧 Final assignment of missing order number:', {
            phaseName: phase.name,
            phaseId: phase.id,
            assignedOrder: phase.phaseOrderNumber,
            index
          });
        }
        return phase;
      });
      
      // Log order numbers to help debug
      console.log('📋 Phases with order numbers before saving:', {
        phases: phasesWithAllOrderNumbers.map(p => ({ 
          name: p.name, 
          id: p.id,
          order: p.phaseOrderNumber,
          hasOrder: p.phaseOrderNumber !== undefined
        }))
      });
      
      // Update project with rebuilt phases (using phases with correct isStandard flags)
      // CRITICAL: Explicitly include phaseOrderNumber in the JSON to ensure it's saved
      const phasesToSave = phasesWithAllOrderNumbers.map(phase => ({
        ...phase,
        phaseOrderNumber: phase.phaseOrderNumber // Explicitly include phaseOrderNumber
      }));
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ phases: phasesToSave as any })
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
      // CRITICAL: Use phasesToSave (with explicit phaseOrderNumber) instead of phasesWithCorrectStandardFlag
      const updatedProject = {
        ...currentProject,
        phases: phasesToSave,
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
        // Clear the flag after a longer delay to ensure order is preserved
        // This prevents mergedPhases from reordering during the preservation window
        setTimeout(() => {
          setJustAddedPhaseId(null);
        }, 3000); // Longer delay to ensure order preservation completes
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
      
      // CRITICAL: In Edit Standard mode, ensure new phase stays at second-to-last position
      // Position the new phase correctly BEFORE sorting to maintain order
      let finalPhases = phasesWithCorrectStandardFlag;
      if (isEditingStandardProject) {
        // Find the new phase
        const newPhaseIndex = finalPhases.findIndex(p => 
          p.name === uniquePhaseName || (addedPhaseId && p.id === addedPhaseId)
        );
        
        if (newPhaseIndex !== -1 && finalPhases.length > 1) {
          const newPhase = finalPhases[newPhaseIndex];
          const targetIndex = finalPhases.length - 2; // Second-to-last position
          const lastPhase = finalPhases[finalPhases.length - 1];
          
          // Preserve the last phase's order number (should be 'last')
          const lastPhaseOriginalOrder = lastPhase.phaseOrderNumber;
          
          // If new phase is not at second-to-last, move it there
          if (newPhaseIndex !== targetIndex) {
            // Remove from current position
            finalPhases.splice(newPhaseIndex, 1);
            // Insert at second-to-last position (before the last phase)
            finalPhases.splice(targetIndex, 0, newPhase);
            
            // Update order numbers - preserve existing order numbers where possible
            // Only update the new phase's order number, preserve others
            finalPhases.forEach((phase, index) => {
              if (phase.id === newPhase.id) {
                // This is the new phase - set to second-to-last
                if (lastPhaseOriginalOrder === 'last') {
                  // If last phase is 'last', new phase should be totalPhases - 1
                  phase.phaseOrderNumber = finalPhases.length - 1;
                } else if (typeof lastPhaseOriginalOrder === 'number') {
                  // If last phase has a number, new phase should be that number - 1
                  phase.phaseOrderNumber = lastPhaseOriginalOrder - 1;
                } else {
                  // Fallback
                  phase.phaseOrderNumber = finalPhases.length - 1;
                }
              } else if (index === 0 && phase.phaseOrderNumber !== 'first') {
                // Preserve 'first' if it exists, otherwise set it
                phase.phaseOrderNumber = 'first';
              } else if (index === finalPhases.length - 1) {
                // CRITICAL: Always preserve 'last' for the last phase
                phase.phaseOrderNumber = 'last';
              }
              // For other phases, preserve their existing order numbers if they're valid
              // Only update if they don't have a valid order number
              else if (phase.phaseOrderNumber === undefined || 
                      (typeof phase.phaseOrderNumber === 'number' && 
                       (phase.phaseOrderNumber < 1 || phase.phaseOrderNumber >= finalPhases.length))) {
                phase.phaseOrderNumber = index + 1;
              }
            });
            
            console.log('🔧 Repositioned new phase to second-to-last:', {
              newPhaseName: newPhase.name,
              newPhaseId: newPhase.id,
              targetIndex,
              totalPhases: finalPhases.length,
              lastPhaseOriginalOrder,
              newPhaseOrder: newPhase.phaseOrderNumber,
              orderNumbers: finalPhases.map((p, i) => ({ name: p.name, index: i, order: p.phaseOrderNumber }))
            });
          } else {
            // New phase is already at second-to-last, just ensure order numbers are correct
            if (lastPhase.phaseOrderNumber !== 'last') {
              lastPhase.phaseOrderNumber = 'last';
            }
            if (newPhase.phaseOrderNumber === undefined || 
                (typeof newPhase.phaseOrderNumber === 'number' && 
                 newPhase.phaseOrderNumber !== finalPhases.length - 1)) {
              newPhase.phaseOrderNumber = finalPhases.length - 1;
            }
          }
        }
        
        // Now sort to ensure order numbers are respected
        finalPhases = sortPhasesByOrderNumber(finalPhases);
        
        // Double-check after sorting that new phase is still at second-to-last
        // and that last phase still has 'last'
        const newPhaseAfterSort = finalPhases.findIndex(p => 
          p.name === uniquePhaseName || (addedPhaseId && p.id === addedPhaseId)
        );
        const lastPhaseAfterSort = finalPhases[finalPhases.length - 1];
        
        // Ensure last phase always has 'last'
        if (lastPhaseAfterSort && lastPhaseAfterSort.phaseOrderNumber !== 'last') {
          console.warn('⚠️ Last phase lost "last" designation after sort, fixing:', {
            phaseName: lastPhaseAfterSort.name,
            currentOrder: lastPhaseAfterSort.phaseOrderNumber
          });
          lastPhaseAfterSort.phaseOrderNumber = 'last';
        }
        
        if (newPhaseAfterSort !== -1 && newPhaseAfterSort !== finalPhases.length - 2) {
          console.warn('⚠️ New phase moved during sort, repositioning:', {
            currentIndex: newPhaseAfterSort,
            targetIndex: finalPhases.length - 2
          });
          const newPhase = finalPhases[newPhaseAfterSort];
          finalPhases.splice(newPhaseAfterSort, 1);
          finalPhases.splice(finalPhases.length - 2, 0, newPhase);
          
          // Update only the new phase's order number, preserve last phase's 'last'
          if (lastPhaseAfterSort.phaseOrderNumber === 'last') {
            newPhase.phaseOrderNumber = finalPhases.length - 1;
          } else if (typeof lastPhaseAfterSort.phaseOrderNumber === 'number') {
            newPhase.phaseOrderNumber = lastPhaseAfterSort.phaseOrderNumber - 1;
          } else {
            newPhase.phaseOrderNumber = finalPhases.length - 1;
          }
          
          // Ensure last phase still has 'last'
          finalPhases[finalPhases.length - 1].phaseOrderNumber = 'last';
        }
      }
      
      // CRITICAL: Double-check that new phase in finalPhases has correct isStandard flag
      // This ensures it's never incorrectly displayed as standard-locked in regular projects
      const newPhaseInDisplay = finalPhases.find(p => 
        p.name === uniquePhaseName || (addedPhaseId && p.id === addedPhaseId)
      );
      if (newPhaseInDisplay && !isEditingStandardProject && newPhaseInDisplay.isStandard === true) {
        console.error('❌ ERROR: New phase in finalPhases incorrectly marked as standard! Fixing...');
        newPhaseInDisplay.isStandard = false;
        // Update the phase in the array
        const phaseIndex = finalPhases.findIndex(p => p.id === newPhaseInDisplay.id);
        if (phaseIndex !== -1) {
          finalPhases[phaseIndex] = { ...newPhaseInDisplay, isStandard: false };
        }
      }
      
      // CRITICAL: For Edit Standard, preserve ALL existing phase positions
      // Only assign position to the new phase, do NOT reassign existing positions
      if (isEditingStandardProject) {
        // Fetch existing phases from database to get their current positions
        const { data: existingPhasePositions, error: positionFetchError } = await supabase
          .from('project_phases')
          .select('id, name, position_rule, position_value')
          .eq('project_id', currentProject.id)
          .neq('id', addedPhaseId || '');
        
        if (!positionFetchError && existingPhasePositions) {
          // Create a map of existing phase positions
          const positionMap = new Map<string, { rule: string; value: number | null }>();
          existingPhasePositions.forEach(p => {
            if (p.id && p.position_rule) {
              positionMap.set(p.id, { rule: p.position_rule, value: p.position_value });
            }
          });
          
          // Restore existing phase positions from database
          finalPhases.forEach(phase => {
            if (phase.id && positionMap.has(phase.id) && phase.id !== addedPhaseId) {
              const posData = positionMap.get(phase.id)!;
              if (posData.rule === 'first') {
                phase.phaseOrderNumber = 'first';
              } else if (posData.rule === 'last') {
                phase.phaseOrderNumber = 'last';
              } else if (posData.rule === 'nth' && posData.value) {
                phase.phaseOrderNumber = posData.value;
              }
              console.log('✅ Preserved existing phase position from database:', {
                phaseName: phase.name,
                phaseId: phase.id,
                positionRule: posData.rule,
                positionValue: posData.value,
                phaseOrderNumber: phase.phaseOrderNumber
              });
            }
          });
        }
        
        // Only update the new phase's position to "last minus one"
        const newPhase = finalPhases.find(p => p.id === addedPhaseId);
        const lastPhase = finalPhases.find(p => p.phaseOrderNumber === 'last');
        
        if (newPhase && lastPhase) {
          // Set new phase to "last minus one" position
          const totalPhases = finalPhases.length;
          newPhase.phaseOrderNumber = totalPhases - 1;
          
          // Update only the new phase in database
          await supabase
            .from('project_phases')
            .update({
              position_rule: 'nth',
              position_value: totalPhases - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', newPhase.id)
            .eq('project_id', currentProject.id);
          
          console.log('✅ Set new phase position only (preserving all others):', {
            newPhaseName: newPhase.name,
            newPhaseId: newPhase.id,
            newPosition: newPhase.phaseOrderNumber,
            lastPhaseName: lastPhase.name,
            lastPhasePosition: lastPhase.phaseOrderNumber
          });
        }
        
        // Sort phases by their preserved order numbers
        finalPhases = sortPhasesByOrderNumber(finalPhases);
      } else {
        // For regular projects, apply sequential ordering validation
        console.log('🔄 Applying sequential ordering validation after adding phase:', {
          beforeCount: finalPhases.length,
          beforeOrders: finalPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
        });
        
        const sequentiallyOrderedPhases = validateAndFixSequentialOrdering(finalPhases);
        
        console.log('✅ Sequential ordering applied:', {
          afterCount: sequentiallyOrderedPhases.length,
          afterOrders: sequentiallyOrderedPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
        });
        
        finalPhases = sequentiallyOrderedPhases;
        
        // Update phase order in database
        try {
          await updatePhaseOrder(sequentiallyOrderedPhases);
          console.log('✅ Phase order updated in database with sequential ordering');
        } catch (error) {
          console.error('❌ Error updating phase order in database:', error);
        }
      }
      
      // CRITICAL: Update displayPhases immediately with phases (preserved positions for Edit Standard)
      setSkipNextRefresh(true); // Prevent useEffect from triggering another refresh
      setDisplayPhases(finalPhases);
      setPhasesLoaded(true);
      
      // CRITICAL: Before updating project, ensure the last phase has 'last' designation
      const lastPhaseBeforeUpdate = finalPhases[finalPhases.length - 1];
      if (lastPhaseBeforeUpdate && lastPhaseBeforeUpdate.phaseOrderNumber !== 'last') {
        console.warn('⚠️ Last phase does not have "last" designation before updating project, fixing:', {
          phaseName: lastPhaseBeforeUpdate.name,
          currentOrder: lastPhaseBeforeUpdate.phaseOrderNumber
        });
        lastPhaseBeforeUpdate.phaseOrderNumber = 'last';
      }
      
      // Update the project with the correctly ordered phases
      const finalUpdatedProject = {
        ...currentProject,
        phases: finalPhases,
        updatedAt: new Date()
      };
      updateProject(finalUpdatedProject);
      
      // Note: updatedProject was already created and updateProject called above (line 1493-1498)
      // But we're updating again with the correctly ordered phases
      
      // CRITICAL: Don't refetch immediately - it causes reordering
      // The data is already correct in currentProject.phases and the database
      // Only refetch if absolutely necessary, and ensure order is preserved
      // We'll let the normal data flow handle updates, but preserve the order we set
      // The refetch can happen naturally when the component re-renders or when needed
      // For now, skip the refetch to prevent reordering
      // setTimeout(() => {
      //   console.log('🔄 Triggering refetch of dynamic phases after add phase...');
      //   refetchDynamicPhases();
      // }, 2000);
      
      // Ensure minimum display time for loading state
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      toast.success('Phase added successfully');
      
      // Clear flags after a delay to allow UI to settle
      // Keep skipNextRefresh active longer to prevent useEffect from triggering reordering
      setTimeout(() => {
        setIsAddingPhase(false);
        // Keep skipNextRefresh true a bit longer to ensure all async operations complete
        setTimeout(() => {
          setSkipNextRefresh(false);
        }, 1000);
      }, 1500); // Longer delay to ensure no refetch triggers
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
      
      // Clear flags on error
      setIsAddingPhase(false);
      setSkipNextRefresh(false);
      setJustAddedPhaseId(null);
    }
    // CRITICAL: Don't use finally block - it runs even on success and can interfere
    // with the setTimeout that clears isAddingPhase after the UI settles
    // The success path already clears isAddingPhase in setTimeout
    // The error path clears it immediately above
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
      const orderedPhases = enforceStandardPhaseOrdering(phasesWithLinked, standardProjectPhases);
      
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
      const orderedSavedPhases = enforceStandardPhaseOrdering(savedPhases, standardProjectPhases);
      
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
        .select('id, name, description, position_rule, position_value, is_standard')
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
        // Operations are ordered by their position in the operations array, not by display_order
        flow_type: 'prime'
      };

      if (!projectPhase.is_standard) {
        operationPayload.custom_phase_name = projectPhase.name;
        operationPayload.custom_phase_description = projectPhase.description;
        // Custom phase position is handled by position_rule/position_value, not display_order
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
          // Steps are ordered by their position in the steps array, not by display_order
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
          // Steps are ordered by their position in the steps array, not by display_order
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

    // CRITICAL: Store the phase ID to delete, but don't set phaseToDelete yet
    // phaseToDelete triggers filtering - only set it when user confirms deletion
    // Store the ID in phaseIdPendingDelete which doesn't trigger filtering
    setPhaseIdPendingDelete(phaseId);
    setDeletePhaseDialogOpen(true);
  };

  const deletePhase = async () => {
    // Use phaseIdPendingDelete (set when dialog opens) or phaseToDelete (fallback)
    const phaseIdToDelete = phaseIdPendingDelete || phaseToDelete;
    if (!currentProject || !phaseIdToDelete) return;
    
    // NOW set phaseToDelete to trigger filtering - user has confirmed
    setPhaseToDelete(phaseIdToDelete);

    setIsDeletingPhase(true);
    const startTime = Date.now();
    const minDisplayTime = 2000; // Minimum 2 seconds to show loading state

    try {
      // Check if this is an incorporated phase (stored only in JSON)
      const phase = displayPhases.find(p => p.id === phaseIdToDelete);
      const isIncorporatedPhase = phase?.isLinked;

      if (isIncorporatedPhase) {
        // For incorporated phases, just remove from JSON
        const updatedPhases = currentProject.phases.filter(p => p.id !== phaseIdToDelete);
        const orderedPhases = enforceStandardPhaseOrdering(updatedPhases, standardProjectPhases);
        const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
        const sortedPhases = sortPhasesByOrderNumber(phasesWithUniqueOrder);

        // Update project JSON
        const { error: updateError } = await supabase
          .from('projects')
          .update({ phases: sortedPhases as any })
          .eq('id', currentProject.id);

        if (updateError) throw updateError;

        // CRITICAL: In Edit Standard mode, filter to only standard phases
        let phasesToDisplay = sortedPhases;
        if (isEditingStandardProject) {
          phasesToDisplay = phasesToDisplay.filter(p => isStandardPhase(p) && !p.isLinked);
        }
        
        // Update display state IMMEDIATELY - this prevents flicker and preserves order
        setSkipNextRefresh(true); // Prevent useEffect from triggering another refresh
        setDisplayPhases(phasesToDisplay);
        
        // Update local context AFTER display is updated to prevent reordering
        const updatedProject = {
          ...currentProject,
          phases: phasesToDisplay, // Use filtered phasesToDisplay, not sortedPhases
          updatedAt: new Date()
        };
        updateProject(updatedProject);

        // CRITICAL: Read directly from database as source of truth after incorporated phase deletion
        console.log('🔄 Reading phases directly from database after incorporated phase deletion (source of truth)');
        try {
          const { data: freshPhases, error: freshError } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
            p_project_id: currentProject.id
          });
          if (!freshError && freshPhases) {
            const freshArray = Array.isArray(freshPhases) ? freshPhases : [];
            if (freshArray.length > 0) {
              setDisplayPhasesFromDb(true);
              setDisplayPhases(freshArray);
              console.log('✅ Updated displayPhases from database after incorporated phase deletion');
            }
          }
        } catch (error) {
          console.error('❌ Error reading phases from database:', error);
        }
      } else {
        // For regular phases, delete from database tables
        // CRITICAL: Find the project_phases record by name OR ID
        // UI phase IDs might match DB IDs, but we should try both to be safe
        const phase = displayPhases.find(p => p.id === phaseIdToDelete);
        const phaseName = phase?.name;
        
        if (!phaseName) {
          console.error('❌ Could not find phase name for deletion:', { phaseIdToDelete });
          toast.error('Phase not found');
          return;
        }
        
        // Try to find by ID first (most reliable if IDs match)
        let { data: projectPhase, error: findError } = await supabase
          .from('project_phases')
          .select('id, name')
          .eq('project_id', currentProject.id)
          .eq('id', phaseIdToDelete)
          .maybeSingle();

        // If not found by ID, try by name (fallback)
        if (!projectPhase && !findError) {
          console.log('🔍 Phase not found by ID, trying by name:', { phaseName, phaseIdToDelete });
          const { data: projectPhaseByName, error: findByNameError } = await supabase
            .from('project_phases')
            .select('id, name')
            .eq('project_id', currentProject.id)
            .eq('name', phaseName)
            .maybeSingle();
          
          if (projectPhaseByName) {
            projectPhase = projectPhaseByName;
            console.log('✅ Found phase by name:', { phaseId: projectPhase.id, phaseName: projectPhase.name });
          } else if (findByNameError) {
            console.error('❌ Error finding phase by name:', findByNameError);
            findError = findByNameError;
          }
        }

        if (!projectPhase) {
          console.error('❌ Phase not found in database:', { 
            phaseIdToDelete, 
            phaseName, 
            projectId: currentProject.id,
            findError 
          });
          toast.error(`Phase "${phaseName}" not found in database`);
          return;
        }
        
        console.log('✅ Found phase to delete:', { 
          dbPhaseId: projectPhase.id, 
          phaseName: projectPhase.name,
          uiPhaseId: phaseIdToDelete 
        });

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

        // CONDITION 1: Delete phase from database - This immediately commits deletion
        // Ensures visible phases reflect actual phases in database
        const { error: deletePhaseError, data: deleteResult } = await supabase
          .from('project_phases')
          .delete()
          .eq('id', projectPhase.id)
          .select();

        if (deletePhaseError) {
          console.error('❌ Error deleting phase from project_phases:', deletePhaseError);
          throw deletePhaseError;
        }

        // Verify deletion succeeded
        if (!deleteResult || deleteResult.length === 0) {
          console.warn('⚠️ Phase deletion returned no rows - phase may not have existed');
          // Check if phase still exists in database
          const { data: verifyPhase, error: verifyError } = await supabase
            .from('project_phases')
            .select('id, name')
            .eq('id', projectPhase.id)
            .single();
          
          if (verifyPhase && !verifyError) {
            console.error('❌ Phase still exists in database after deletion attempt!', {
              phaseId: projectPhase.id,
              phaseName: verifyPhase.name
            });
            toast.error(`Failed to delete phase "${verifyPhase.name}" - phase still exists in database`);
            throw new Error('Phase deletion failed - phase still exists in database');
          } else {
            console.log('✅ Phase verified as deleted (not found in database)');
          }
        } else {
          console.log('✅ Phase permanently deleted from database:', {
            phaseId: projectPhase.id,
            deletedRows: deleteResult.length,
            deletedPhaseName: deleteResult[0]?.name
          });
          
          // Double-check: Verify phase is actually gone
          const { data: doubleCheck } = await supabase
            .from('project_phases')
            .select('id')
            .eq('id', projectPhase.id)
            .single();
          
          if (doubleCheck) {
            console.error('❌ CRITICAL: Phase still exists after deletion!', {
              phaseId: projectPhase.id
            });
            toast.error('Phase deletion failed - phase still exists');
            throw new Error('Phase deletion verification failed');
          } else {
            console.log('✅ Phase deletion verified - phase no longer exists in database');
          }
        }

        // CRITICAL: Preserve order numbers from displayPhases BEFORE deletion
        // This ensures order numbers are maintained after rebuilding
        const orderNumberMap = new Map<string, string | number>();
        displayPhases.forEach(phase => {
          if (phase.id !== phaseIdToDelete && phase.phaseOrderNumber !== undefined) {
            // Try to match by ID first, then by name
            orderNumberMap.set(phase.id, phase.phaseOrderNumber);
            if (phase.name) {
              orderNumberMap.set(phase.name, phase.phaseOrderNumber);
            }
          }
        });
        
        console.log('🔒 Preserved order numbers before deletion:', {
          count: orderNumberMap.size,
          orders: Array.from(orderNumberMap.entries()).map(([key, order]) => ({
            key,
            order
          }))
        });

        // CRITICAL: Wait a bit to ensure deletion has fully committed before rebuilding
        // This prevents the deleted phase from reappearing in the rebuilt phases
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // CRITICAL: For regular projects, use get_project_workflow_with_standards to include standard phases
        // For Standard Project Foundation, use rebuild_phases_json_from_project_phases
        let rebuiltPhases: Phase[] = [];
        let rebuildError: any = null;
        
        if (isEditingStandardProject) {
          // For Standard Project Foundation, rebuild from project_phases table
          const { data, error } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
            p_project_id: currentProject.id
          });
          rebuiltPhases = Array.isArray(data) ? data : [];
          rebuildError = error;
        } else {
          // For regular projects, use get_project_workflow_with_standards to get all phases (standard + custom)
          // This ensures standard phases remain visible and deleted custom phase is excluded
          const { data, error } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
            p_project_id: currentProject.id
          });
          
          if (error) {
            rebuildError = error;
          } else if (data) {
            // Parse the result
            if (typeof data === 'string') {
              rebuiltPhases = JSON.parse(data);
            } else if (Array.isArray(data)) {
              rebuiltPhases = data;
            }
          }
        }

        if (rebuildError) {
          console.error('❌ Error rebuilding phases after deletion:', rebuildError);
          throw rebuildError;
        }
        
        // CRITICAL: Filter out deleted phase from rebuilt phases as a safety check
        // Even though it should be gone, this ensures it doesn't reappear
        const rebuiltPhasesArray = Array.isArray(rebuiltPhases) ? rebuiltPhases : [];
        const rebuiltPhasesFiltered = rebuiltPhasesArray.filter((p: Phase) => p.id !== phaseIdToDelete);
        
        console.log('🔍 Rebuilt phases after deletion:', {
          beforeFilter: rebuiltPhasesArray.length,
          afterFilter: rebuiltPhasesFiltered.length,
          deletedPhaseId: phaseIdToDelete,
          phases: rebuiltPhasesFiltered.map((p: Phase) => ({ id: p.id, name: p.name }))
        });

        // Merge with any incorporated phases from current project
        // CRITICAL: Use rebuiltPhasesFiltered (not rebuiltPhasesArray) to ensure deleted phase doesn't reappear
        const currentPhases = currentProject.phases || [];
        const incorporatedPhases = currentPhases.filter(p => p.isLinked && p.id !== phaseIdToDelete);
        const allPhases = [...rebuiltPhasesFiltered, ...incorporatedPhases];
        const rawPhases = deduplicatePhases(allPhases);
        
        // CRITICAL: Filter out deleted phase as a safety measure (shouldn't be in rebuiltPhases, but just in case)
        // This is temporary UI filtering - the phase is already permanently deleted from the database above
        const phasesWithoutDeleted = rawPhases.filter(p => p.id !== phaseIdToDelete);
        
        // Verify deleted phase is not in the rebuilt phases
        const deletedPhaseStillPresent = phasesWithoutDeleted.some(p => p.id === phaseIdToDelete);
        if (deletedPhaseStillPresent) {
          console.error('❌ WARNING: Deleted phase still present in rebuilt phases! This should not happen.');
        }
        
      // CONDITION 5: Apply enforceStandardPhaseOrdering FIRST using Standard Project Foundation order
      // This ensures standard project foundation ordering is respected (absolute and relative order numbers)
      const orderedPhases = enforceStandardPhaseOrdering(phasesWithoutDeleted, standardProjectPhases);
        // THEN assign order numbers based on the correct order
        const phasesWithUniqueOrder = ensureUniqueOrderNumbers(orderedPhases);
        
        // CRITICAL: Restore preserved order numbers from displayPhases
        // This ensures order numbers are maintained after deletion
        phasesWithUniqueOrder.forEach(phase => {
          // Try to restore by ID first, then by name
          const preservedOrder = orderNumberMap.get(phase.id) || (phase.name ? orderNumberMap.get(phase.name) : undefined);
          if (preservedOrder !== undefined) {
            // Only restore if it's not a standard phase with a reserved position, or if we're in Edit Standard
            if (isEditingStandardProject || !isStandardPhase(phase) || phase.isLinked) {
              phase.phaseOrderNumber = preservedOrder;
              console.log('🔒 Restored order number for phase:', {
                phaseName: phase.name,
                phaseId: phase.id,
                restoredOrder: preservedOrder
              });
            }
          }
        });

      // CRITICAL: Sort by order number to maintain correct order
      // CONDITION 4: Phases must display sequentially from lowest to highest, top to bottom
      const sortedPhases = sortPhasesByOrderNumber(phasesWithUniqueOrder);

      // CRITICAL: In Edit Standard mode, ensure order numbers are unique and correct after deletion
      // This prevents duplicate order numbers (e.g., two "first" positions)
      // ALWAYS reassign order numbers sequentially after deletion to prevent duplicates
      if (isEditingStandardProject) {
        // Reassign ALL order numbers sequentially based on position
        // This ensures no duplicates and correct ordering
        sortedPhases.forEach((phase, index) => {
          if (index === 0) {
            phase.phaseOrderNumber = 'first';
          } else if (index === sortedPhases.length - 1) {
            phase.phaseOrderNumber = 'last';
          } else {
            phase.phaseOrderNumber = index + 1;
          }
        });
        
        console.log('🔧 Reassigned order numbers after deletion:', {
          phases: sortedPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
        });
      }
      
      // CONDITION 2: Ensure ALL phases have order numbers (no blanks)
      sortedPhases.forEach((phase, index) => {
        if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
          // Assign order number based on position
          if (index === 0) {
            // Check if first position should be 'first' or a number
            const hasStandardFirst = sortedPhases.some(p => 
              isStandardPhase(p) && !p.isLinked && p.phaseOrderNumber === 'first'
            );
            if (!hasStandardFirst && !isEditingStandardProject) {
              phase.phaseOrderNumber = 'first';
            } else {
              phase.phaseOrderNumber = 1;
            }
          } else if (index === sortedPhases.length - 1) {
            // Check if last position should be 'last' or a number
            const hasStandardLast = sortedPhases.some(p => 
              isStandardPhase(p) && !p.isLinked && p.phaseOrderNumber === 'last'
            );
            if (!hasStandardLast && !isEditingStandardProject && isStandardPhase(phase) && !phase.isLinked) {
              phase.phaseOrderNumber = 'last';
            } else {
              phase.phaseOrderNumber = index + 1;
            }
          } else {
            phase.phaseOrderNumber = index + 1;
          }
          console.log('🔧 Assigned missing order number after deletion:', {
            phaseName: phase.name,
            phaseId: phase.id,
            assignedOrder: phase.phaseOrderNumber,
            index
          });
        }
      });

        // CRITICAL: In Edit Standard mode, filter to only standard phases BEFORE updating
        let phasesToDisplay = sortedPhases.filter(p => p.id !== phaseIdToDelete);
        if (isEditingStandardProject) {
          phasesToDisplay = phasesToDisplay.filter(p => isStandardPhase(p) && !p.isLinked);
        }

        // Update display state IMMEDIATELY - this prevents flicker and preserves order
        setSkipNextRefresh(true); // Prevent useEffect from triggering another refresh
        setDisplayPhases(phasesToDisplay);
        
        // CRITICAL: In Edit Standard mode, update phase order in database to persist correct order numbers
        // BUT: Do this AFTER setting displayPhases to prevent the deleted phase from reappearing
        // Also, filter out the deleted phase from phasesToDisplay before calling updatePhaseOrder
        // to ensure it doesn't get included in the rebuild
        if (isEditingStandardProject) {
          // CRITICAL: Ensure deleted phase is filtered out before updating order
          const phasesWithoutDeleted = phasesToDisplay.filter(p => p.id !== phaseIdToDelete);
          
          console.log('🔄 Updating phase order in database after deletion to persist order numbers:', {
            phases: phasesWithoutDeleted.map(p => ({ name: p.name, order: p.phaseOrderNumber })),
            deletedPhaseId: phaseIdToDelete
          });
          try {
            // CRITICAL: Wait a bit to ensure deletion has fully committed before rebuilding
            await new Promise(resolve => setTimeout(resolve, 300));
            
            await updatePhaseOrder(phasesWithoutDeleted);
            console.log('✅ Phase order updated in database after deletion, order numbers preserved');
            
            // CRITICAL: After updatePhaseOrder, read directly from database as source of truth
            // Don't refetch useDynamicPhases - it may cause reordering
            // Instead, rebuild phases directly from database to get fresh data
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Read directly from database as source of truth
            const { data: freshRebuiltPhases, error: freshRebuildError } = await supabase.rpc('rebuild_phases_json_from_project_phases', {
              p_project_id: currentProject.id
            });
            
            if (!freshRebuildError && freshRebuiltPhases) {
              const freshPhasesArray = Array.isArray(freshRebuiltPhases) ? freshRebuiltPhases : [];
              const freshStandardPhases = freshPhasesArray.filter(p => isStandardPhase(p) && !p.isLinked);
              
              // Update displayPhases directly with database data (preserve order)
              if (freshStandardPhases.length > 0) {
                // Sort by order number but preserve database order positions
                const sortedFreshPhases = [...freshStandardPhases].sort((a, b) => {
                  const aOrder = typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 
                                a.phaseOrderNumber === 'first' ? 0 : 
                                a.phaseOrderNumber === 'last' ? 9999 : 0;
                  const bOrder = typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 
                                b.phaseOrderNumber === 'first' ? 0 : 
                                b.phaseOrderNumber === 'last' ? 9999 : 0;
                  return aOrder - bOrder;
                });
                
                setDisplayPhasesFromDb(true);
                setDisplayPhases(sortedFreshPhases);
                console.log('✅ Updated displayPhases from database (source of truth) after deletion:', {
                  count: sortedFreshPhases.length,
                  phases: sortedFreshPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
                });
              }
            }
            
            // Don't call refetchDynamicPhases - it may cause reordering
            // The database is the source of truth, and we've already read from it above
            console.log('✅ Read phases directly from database after deletion (database is source of truth)');
          } catch (error) {
            console.error('❌ Error updating phase order in database after deletion:', error);
            // Continue anyway - the JSON update will still work
          }
        }
        
        // CONDITION 2: Ensure ALL phases have order numbers before saving (no blanks)
        phasesToDisplay.forEach((phase, index) => {
          if (phase.phaseOrderNumber === undefined || phase.phaseOrderNumber === null) {
            // Assign order number based on position
            if (index === 0) {
              // Check if first position should be 'first' or a number
              const hasStandardFirst = phasesToDisplay.some(p => 
                isStandardPhase(p) && !p.isLinked && p.phaseOrderNumber === 'first'
              );
              if (!hasStandardFirst && !isEditingStandardProject) {
                phase.phaseOrderNumber = 'first';
              } else {
                phase.phaseOrderNumber = 1;
              }
            } else if (index === phasesToDisplay.length - 1) {
              // Check if last position should be 'last' or a number
              const hasStandardLast = phasesToDisplay.some(p => 
                isStandardPhase(p) && !p.isLinked && p.phaseOrderNumber === 'last'
              );
              if (!hasStandardLast && !isEditingStandardProject && isStandardPhase(phase) && !phase.isLinked) {
                phase.phaseOrderNumber = 'last';
              } else {
                phase.phaseOrderNumber = index + 1;
              }
            } else {
              phase.phaseOrderNumber = index + 1;
            }
            console.log('🔧 Assigned missing order number after deletion:', {
              phaseName: phase.name,
              phaseId: phase.id,
              assignedOrder: phase.phaseOrderNumber,
              index
            });
          }
        });
        
        // CONDITION 3: Explicitly include phaseOrderNumber in the JSON to ensure it's saved to database
        const phasesToSave = phasesToDisplay.map(phase => ({
          ...phase,
          phaseOrderNumber: phase.phaseOrderNumber // Explicitly include phaseOrderNumber
        }));
        
        console.log('📋 Phases with order numbers before saving after deletion:', {
          phases: phasesToSave.map(p => ({ 
            name: p.name, 
            id: p.id,
            order: p.phaseOrderNumber,
            hasOrder: p.phaseOrderNumber !== undefined
          }))
        });
        
        // Update project JSON - the deleted phase is already gone from database, this just updates the JSON
        const { error: updateError } = await supabase
          .from('projects')
          .update({ phases: phasesToSave as any })
          .eq('id', currentProject.id);

        if (updateError) {
          console.error('❌ Error updating project phases JSON after deletion:', updateError);
          throw updateError;
        }

        // Update local context AFTER display is updated to prevent reordering
        // Use phasesToSave (with explicit phaseOrderNumber) instead of phasesToDisplay
        const updatedProject = {
          ...currentProject,
          phases: phasesToSave, // Use phasesToSave with explicit phaseOrderNumber
          updatedAt: new Date()
        };
        updateProject(updatedProject);
        
        // CRITICAL: For regular projects, read directly from database as source of truth
        // Don't refetch useDynamicPhases - it may cause reordering
        // Instead, read directly from database to get fresh data without deleted phase
        if (!isEditingStandardProject) {
          console.log('🔄 Reading phases directly from database after regular phase deletion (source of truth)');
          // Wait a bit to ensure deletion has fully committed
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Read directly from database using get_project_workflow_with_standards
          const { data: freshWorkflowPhases, error: freshWorkflowError } = await (supabase.rpc as any)('get_project_workflow_with_standards', {
            p_project_id: currentProject.id
          });
          
          if (!freshWorkflowError && freshWorkflowPhases) {
            const freshPhasesArray = Array.isArray(freshWorkflowPhases) ? freshWorkflowPhases : 
                                    (typeof freshWorkflowPhases === 'string' ? JSON.parse(freshWorkflowPhases) : []);
            
            // Update displayPhases directly with database data (preserve order)
            if (freshPhasesArray.length > 0) {
              // Sort by order number but preserve database order positions
              const sortedFreshPhases = [...freshPhasesArray].sort((a, b) => {
                const aOrder = typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 
                              a.phaseOrderNumber === 'first' ? 0 : 
                              a.phaseOrderNumber === 'last' ? 9999 : 0;
                const bOrder = typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 
                              b.phaseOrderNumber === 'first' ? 0 : 
                              b.phaseOrderNumber === 'last' ? 9999 : 0;
                return aOrder - bOrder;
              });
              
              setDisplayPhasesFromDb(true);
              setDisplayPhases(sortedFreshPhases);
              console.log('✅ Updated displayPhases from database (source of truth) after regular deletion:', {
                count: sortedFreshPhases.length,
                phases: sortedFreshPhases.map(p => ({ name: p.name, order: p.phaseOrderNumber }))
              });
            }
          }
          
          // Don't call refetchDynamicPhases - it may cause reordering
          // The database is the source of truth, and we've already read from it above
          console.log('✅ Read phases directly from database after regular deletion (database is source of truth)');
        }
      }

      // Ensure minimum display time for loading state
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      toast.success('Phase deleted');
      setDeletePhaseDialogOpen(false);
      setPhaseIdPendingDelete(null); // Clear pending delete ID
      
      // CRITICAL: Keep phaseToDelete and skipNextRefresh set until refetch completes
      // For regular projects, we've already refetched above
      // For Edit Standard, the refetch happens in the if block above
      // Clear the state flags after a delay to allow any pending operations to complete
      setTimeout(() => {
        setSkipNextRefresh(false);
        setPhaseToDelete(null);
        setIsDeletingPhase(false);
        console.log('✅ Deletion state cleared');
      }, 2000); // Longer delay to ensure all updates are complete
    } catch (error) {
      console.error('Error deleting phase:', error);
      toast.error('Failed to delete phase');
      
      // Ensure minimum display time even on error
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // On error, clear deletion state immediately
      setPhaseToDelete(null);
      setPhaseIdPendingDelete(null);
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
      const orderedPhases = enforceStandardPhaseOrdering(rawPhases, standardProjectPhases);
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
              <Button 
                size="sm" 
                onClick={async () => {
                  // Save pending order changes before closing
                  // CRITICAL: Always save order numbers, even if hasPendingOrderChanges is false
                  // This ensures order numbers are persisted when closing the window
                  if (currentProject) {
                    try {
                      console.log('💾 Saving order numbers to database...');
                      console.log('📋 Current displayPhases before saving:', {
                        phases: displayPhases.map(p => ({ name: p.name, id: p.id, order: p.phaseOrderNumber, isStandard: p.isStandard }))
                      });
                      
                      // CONDITION 3: Use currentProject.phases as source of truth, but update with displayPhases order numbers
                      // This ensures we have all phase data (operations, steps) while preserving order numbers
                      // All phases will have order numbers saved to database upon saving
                      const phasesToSave = displayPhases.map((displayPhase, index) => {
                        // Find the corresponding phase in currentProject.phases to preserve all data
                        const projectPhase = currentProject.phases?.find(p => p.id === displayPhase.id);
                        const phaseToSave = projectPhase ? { ...projectPhase } : { ...displayPhase };
                        
                        // CRITICAL: Always use order number from displayPhases (which has the current order)
                        // If displayPhase doesn't have order number, assign based on position
                        if (displayPhase.phaseOrderNumber === undefined || displayPhase.phaseOrderNumber === null) {
                          if (index === 0) {
                            // Check if first position should be 'first' or a number
                            const hasStandardFirst = displayPhases.some(p => 
                              isStandardPhase(p) && !p.isLinked && p.phaseOrderNumber === 'first'
                            );
                            if (!hasStandardFirst && !isEditingStandardProject) {
                              phaseToSave.phaseOrderNumber = 'first';
                            } else {
                              phaseToSave.phaseOrderNumber = 1;
                            }
                          } else if (index === displayPhases.length - 1) {
                            // Check if last position should be 'last' or a number
                            const hasStandardLast = displayPhases.some(p => 
                              isStandardPhase(p) && !p.isLinked && p.phaseOrderNumber === 'last'
                            );
                            if (!hasStandardLast && !isEditingStandardProject && isStandardPhase(displayPhase) && !displayPhase.isLinked) {
                              phaseToSave.phaseOrderNumber = 'last';
                            } else {
                              phaseToSave.phaseOrderNumber = index + 1;
                            }
                          } else {
                            phaseToSave.phaseOrderNumber = index + 1;
                          }
                          console.log('🔧 Assigned missing order number before saving:', {
                            phaseName: phaseToSave.name,
                            phaseId: phaseToSave.id,
                            assignedOrder: phaseToSave.phaseOrderNumber,
                            index
                          });
                        } else {
                          // Use order number from displayPhases
                          phaseToSave.phaseOrderNumber = displayPhase.phaseOrderNumber;
                        }
                        
                        return {
                          ...phaseToSave,
                          phaseOrderNumber: phaseToSave.phaseOrderNumber // Explicitly include phaseOrderNumber
                        };
                      });
                      
                      console.log('💾 Phases to save with order numbers:', {
                        phases: phasesToSave.map(p => ({ name: p.name, id: p.id, order: p.phaseOrderNumber, hasOrder: p.phaseOrderNumber !== undefined }))
                      });
                      
                      await updatePhaseOrder(phasesToSave);
                      setHasPendingOrderChanges(false);
                      console.log('✅ Order numbers saved to database');
                      toast.success('Order changes saved');
                    } catch (error) {
                      console.error('❌ Error saving order changes:', error);
                      toast.error('Error saving order changes');
                    }
                  }
                  onBack();
                }} 
                className="flex items-center gap-2"
              >
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
            
            // For linked phases, can move between standard phases
            // For custom phases, same constraint
            // For standard phases, only if editing Standard Project
            // Find the last standard phase (one with 'last' order number or at the end)
            const lastStandardPhaseIndex = displayPhases.findIndex((p, idx) => {
              if (p.isLinked) return false;
              const isLastStandard = isStandardPhase(p) && 
                (p.phaseOrderNumber === 'last' || 
                 (idx === displayPhases.length - 1 && !displayPhases.slice(idx + 1).some(ph => isStandardPhase(ph) && !ph.isLinked)));
              return isLastStandard;
            });
            const firstStandardAfterCustomIndex = displayPhases.findIndex((p, idx) => {
              if (p.isLinked) return false;
              // Find first standard phase that comes after custom phases
              return isStandardPhase(p) && idx > 0 && !isStandardPhase(displayPhases[idx - 1]) && !displayPhases[idx - 1].isLinked;
            });
            
            let canMoveUp = false;
            let canMoveDown = false;
            
            if (phaseIsStandard && isEditingStandardProject) {
              // Standard phases can move when editing Standard Project Foundation
              canMoveUp = phaseIndex > 0;
              canMoveDown = phaseIndex < displayPhases.length - 1;
            } else if (!phaseIsStandard || isLinkedPhase) {
              // Custom and linked phases: can move between standard phases
              // They can move up if there's a phase before them (and it's not a locked standard phase in regular projects)
              // They can move down if there's a phase after them (and it's not the last standard phase)
              
              // Can move up if:
              // - Not at index 0
              // - The phase before is not a locked standard phase (in regular projects)
              canMoveUp = phaseIndex > 0 && (
                isEditingStandardProject || // In Edit Standard, can always move up if not at start
                !isStandardPhase(displayPhases[phaseIndex - 1]) || // Can move past non-standard phases
                displayPhases[phaseIndex - 1].isLinked // Can move past linked phases
              );
              
              // Can move down if:
              // - Not at the last position
              // - The phase after is not the last standard phase (in regular projects)
              // - Or if it's the last standard phase but we're in Edit Standard
              if (isEditingStandardProject) {
                // In Edit Standard, can always move down if not at end
                canMoveDown = phaseIndex < displayPhases.length - 1;
              } else {
                // In regular projects, check if we can move past the last standard phase
                if (lastStandardPhaseIndex === -1) {
                  // No last standard phase found, can move freely
                  canMoveDown = phaseIndex < displayPhases.length - 1;
                } else {
                  // Check if we're before the last standard phase
                  if (phaseIndex < lastStandardPhaseIndex - 1) {
                    // More than one position before the last standard phase, can move
                    canMoveDown = true;
                  } else if (phaseIndex === lastStandardPhaseIndex - 1) {
                    // Immediately before the last standard phase - check if next phase is the last standard phase
                    const nextPhase = displayPhases[phaseIndex + 1];
                    if (isStandardPhase(nextPhase) && !nextPhase.isLinked && 
                        (nextPhase.phaseOrderNumber === 'last' || phaseIndex + 1 === lastStandardPhaseIndex)) {
                      // Next phase is the last standard phase, can't move down
                      canMoveDown = false;
                    } else {
                      // Next phase is not the last standard phase, can move
                      canMoveDown = true;
                    }
                  } else {
                    // At or after the last standard phase, can't move down
                    canMoveDown = false;
                  }
                }
              }
              
              console.log('🔍 Re-order button logic:', {
                phaseName: phase.name,
                phaseIndex,
                phaseIsStandard,
                isLinkedPhase,
                lastStandardPhaseIndex,
                firstStandardAfterCustomIndex,
                canMoveUp,
                canMoveDown,
                totalPhases: displayPhases.length,
                phasesBefore: phaseIndex > 0 ? displayPhases[phaseIndex - 1].name : 'none',
                phasesAfter: phaseIndex < displayPhases.length - 1 ? displayPhases[phaseIndex + 1].name : 'none'
              });
            }
            
            return <Card 
              key={phase.id}
              className={`border-2 ${isStandardPhase ? 'bg-blue-50 border-blue-200' : isLinkedPhase ? 'bg-purple-50 border-purple-200' : ''}`}>
                          <CardHeader className="py-1 px-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 flex-1">
                                {/* Reorder buttons visibility:
                                    - Project phases (non-standard, non-linked): Show buttons ✓
                                    - Standard phases in regular projects: NO buttons (locked) ✓
                                    - Standard phases in Edit Standard: Show buttons ✓
                                    - Incorporated phases (linked): Show buttons ✓
                                */}
                                {phaseIsStandard && !isEditingStandardProject ? (
                                  // Standard phases in regular projects: NO reorder buttons (locked)
                                  <div className="w-4" />
                                ) : (
                                  // Project phases, incorporated phases, or standard phases in Edit Standard: Show reorder buttons
                                  <div className="flex flex-col gap-0.5">
                                    {reorderingPhaseId === phase.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                    ) : (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-4 w-4 p-0 ${!canMoveUp ? 'opacity-30 cursor-not-allowed' : ''}`}
                                          onClick={() => movePhase(phase.id, 'up')}
                                          disabled={!canMoveUp || reorderingPhaseId !== null}
                                          title={!canMoveUp ? 'Cannot move up' : 'Move up'}
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={`h-4 w-4 p-0 ${!canMoveDown ? 'opacity-30 cursor-not-allowed' : ''}`}
                                          onClick={() => movePhase(phase.id, 'down')}
                                          disabled={!canMoveDown || reorderingPhaseId !== null}
                                          title={!canMoveDown ? 'Cannot move down' : 'Move down'}
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
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
                                        {/* Show dropdown:
                                            - Standard phases in regular projects: NO dropdown (locked, show read-only)
                                            - Standard phases in Edit Standard: Show dropdown
                                            - Non-standard phases: Show dropdown
                                            - Incorporated phases: Show dropdown (can change but must respect standard order)
                                        */}
                                        <div className="flex items-center gap-1 mr-1">
                                          {isLinkedPhase ? (
                                            // Incorporated phases: Show dropdown
                                            <Select
                                              value={String(getPhaseOrderNumber(phase, phaseIndex, displayPhases.length))}
                                              onValueChange={(value) => {
                                                console.log('🔄 Dropdown onValueChange called:', {
                                                  phaseId: phase.id,
                                                  phaseName: phase.name,
                                                  oldValue: getPhaseOrderNumber(phase, phaseIndex, displayPhases.length),
                                                  newValue: value
                                                });
                                                const newOrder = value === 'First' ? 'First' : value === 'Last' ? 'Last' : parseInt(value, 10);
                                                handlePhaseOrderChange(phase.id, newOrder);
                                              }}
                                              disabled={isChangingPhaseOrder || isAddingPhase || isDeletingPhase}
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
                                          ) : ((phaseIsStandard && isEditingStandardProject) || !phaseIsStandard) ? (
                                            <Select
                                              value={String(getPhaseOrderNumber(phase, phaseIndex, displayPhases.length))}
                                              onValueChange={(value) => {
                                                console.log('🔄 Dropdown onValueChange called:', {
                                                  phaseId: phase.id,
                                                  phaseName: phase.name,
                                                  oldValue: getPhaseOrderNumber(phase, phaseIndex, displayPhases.length),
                                                  newValue: value,
                                                  isEditingStandardProject,
                                                  phaseIsStandard
                                                });
                                                const newOrder = value === 'First' ? 'First' : value === 'Last' ? 'Last' : parseInt(value, 10);
                                                handlePhaseOrderChange(phase.id, newOrder);
                                              }}
                                              disabled={isChangingPhaseOrder || isAddingPhase || isDeletingPhase}
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
                                        {phaseIsStandard && <span className="mr-1">🔒</span>}
                                        {phase.name}
                                        {phaseIsStandard && <span className="text-xs text-blue-600 ml-1">(Standard - Locked)</span>}
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
                                  
                                  {/* Button visibility rules:
                                      - Project phases (non-standard, non-linked): Show edit/delete buttons ✓
                                      - Standard phases in regular projects: NO buttons (locked) ✓
                                      - Standard phases in Edit Standard: Show edit/delete buttons ✓
                                      - Incorporated (linked) phases: Show delete button, NO edit button ✓
                                  */}
                                  {phaseIsStandard && !isEditingStandardProject ? (
                                    // Standard phases in regular projects: NO buttons (locked)
                                    null
                                  ) : isLinkedPhase ? (
                                    // Incorporated phases: Show delete button only (no edit)
                                    <>
                                      <Button size="sm" variant="ghost" onClick={() => handleDeletePhaseClick(phase.id)}>
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    // Project phases (non-standard, non-linked) OR standard phases in Edit Standard: Show edit/delete buttons
                                    <>
                                      {!phaseIsStandard && <Button size="sm" variant="ghost" onClick={() => copyItem('phase', phase)}>
                                        <Copy className="w-4 h-4" />
                                      </Button>}
                                      
                                      {clipboard?.type === 'phase' && !phaseIsStandard && <Button size="sm" variant="ghost" onClick={() => pasteItem('phase')}>
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
                                </div>
                            </div>
                           </CardHeader>
                           
                           <Collapsible open={expandedPhases.has(phase.id)}>
                             <CollapsibleContent>
                               <CardContent>
                              {/* Only show Add Operation button if phase is not standard OR we're editing Standard Project */}
                              {(!phaseIsStandard || isEditingStandardProject) && !phase.isLinked && (
                                <div className="flex items-center gap-2 mb-4">
                                  <Button size="sm" onClick={() => addOperation(phase.id)} className="flex items-center gap-2">
                                    <Plus className="w-3 h-3" />
                                    Add Operation
                                  </Button>
                                </div>
                              )}
                            
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
                                                  {/* Only show move buttons if operation is not standard OR we're editing Standard Project */}
                                                  {!phase.isLinked && (!operation.isStandard || isEditingStandardProject) && (
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
                                                           {/* Only show edit/delete buttons if operation is not standard OR we're editing Standard Project */}
                                                           {(!operation.isStandard || isEditingStandardProject) && (
                                                             <>
                                                               <Button size="sm" variant="ghost" onClick={() => startEdit('operation', operation.id, operation)}>
                                                                 <Edit className="w-3 h-3" />
                                                               </Button>
                                                               {phase.name !== 'Close Project' && <Button size="sm" variant="ghost" onClick={() => deleteOperation(phase.id, operation.id)}>
                                                                   <Trash2 className="w-3 h-3" />
                                                                 </Button>}
                                                             </>
                                                           )}
                                                         </>}
                                                     </>}
                                                 </div>
                                              </div>
                                             </CardHeader>
                                             
                                             <Collapsible open={expandedOperations.has(operation.id)}>
                                               <CollapsibleContent>
                                                 <CardContent className="pt-0">
                                               {/* Only show Add Step button if operation is not standard OR we're editing Standard Project */}
                                               {!phase.isLinked && (!operation.isStandard || isEditingStandardProject) && (
                                                 <div className="flex items-center gap-2 mb-3">
                                                   <Button size="sm" variant="outline" onClick={() => addStep(phase.id, operation.id)} className="flex items-center gap-1 text-xs">
                                                     <Plus className="w-3 h-3" />
                                                     Add Step
                                                   </Button>
                                                 </div>
                                               )}
                                              
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
                                                                    {/* Only show move buttons if step is not standard OR we're editing Standard Project */}
                                                                    {!phase.isLinked && (!phaseIsStandard || isEditingStandardProject) && phase.name !== 'Close Project' && (!step.isStandard || isEditingStandardProject) && (
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
                                                              {/* Only show edit/delete buttons if step is not standard OR we're editing Standard Project */}
                                                              {(!step.isStandard || isEditingStandardProject) && (
                                                                <>
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
                                                                </>
                                                              )}
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
      <AlertDialog open={deletePhaseDialogOpen} onOpenChange={(open) => {
        setDeletePhaseDialogOpen(open);
        // If dialog is closed without confirming, clear the pending delete ID
        if (!open) {
          setPhaseIdPendingDelete(null);
        }
      }}>
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