/**
 * StructureManager Component - Complete Redesign from Scratch
 * 
 * Purpose: Create, edit, and delete phases, operations, and steps for:
 * 1. Standard Project Foundation (basis for all other projects)
 * 2. Regular Projects (must have direct, non-editable linkage to standard foundation)
 * 
 * Key Principles:
 * - Database is the single source of truth
 * - Strict validation on load - show errors if invalid, prevent loading
 * - Position 1 as number (not 'first')
 * - Custom phases can only be at positions 4, 5, 6... up to (last - 1)
 * - Automatically renumber after delete (never change standard phases in regular projects)
 * - Read-only operations/steps for standard phases in regular projects
 * - No fallbacks - if data is invalid, show error
 * - Simple, clear data flow
 * - All operations commit to database immediately
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation } from '@/interfaces/Project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Copy, Trash2, Edit, Check, X, FileOutput, Wrench, Package, 
  Clipboard, ClipboardCheck, Save, ChevronDown, ChevronRight, Link, 
  ExternalLink, ArrowLeft, GitBranch, MoreVertical, Loader2, ChevronUp 
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

interface StructureManagerProps {
  onBack: () => void;
}

interface ClipboardData {
  type: 'phase' | 'operation' | 'step';
  data: Phase | Operation | WorkflowStep;
}

interface ValidationError {
  message: string;
  details?: string[];
}

/**
 * StructureManager Component
 * 
 * Complete redesign implementing all requirements:
 * - Strict validation on load
 * - Position 1 as number (not 'first')
 * - Custom phase positioning rules
 * - Auto-renumbering after delete
 * - Read-only operations/steps for standard phases
 * - Database as single source of truth
 */
export const StructureManager: React.FC<StructureManagerProps> = ({ onBack }) => {
  const { currentProject, updateProject } = useProject();
  
  // Core state
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isDeletingPhase, setIsDeletingPhase] = useState(false);
  const [phaseToDelete, setPhaseToDelete] = useState<string | null>(null);
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  
  // UI state
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<{
    type: 'phase' | 'operation' | 'step';
    id: string;
    data: any;
  } | null>(null);
  const [deletePhaseDialogOpen, setDeletePhaseDialogOpen] = useState(false);
  
  // Dialogs and other UI
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
  
  // Detect if editing Standard Project Foundation
  const isEditingStandardProject = Boolean(
    currentProject?.id === '00000000-0000-0000-0000-000000000001' || 
    currentProject?.isStandardTemplate === true
  );
  
  // Helper functions
  const isStandardPhase = (phase: Phase) => phase.isStandard === true;
  const isLinkedPhase = (phase: Phase) => phase.isLinked === true;
  
  /**
   * STRICT VALIDATION: Validate that phases are sequentially ordered
   * Returns validation error if invalid, null if valid
   */
  const validatePhaseOrdering = useCallback((phasesToValidate: Phase[]): ValidationError | null => {
    if (phasesToValidate.length === 0) {
      return null; // Empty is valid
    }
    
    const errors: string[] = [];
    
    // Check 1: All phases must have position_rule
    const phasesWithoutRule = phasesToValidate.filter(phase => {
      const positionRule = (phase as any)?.position_rule;
      return !positionRule;
    });
    
    if (phasesWithoutRule.length > 0) {
      errors.push(`${phasesWithoutRule.length} phase(s) missing position_rule: ${phasesWithoutRule.map(p => p.name).join(', ')}`);
    }
    
    // Check 2: Sequential ordering - check ALL 'nth' phases (including standard phases) for gaps
    // All phases with position_rule='nth' must have consecutive position_value with no gaps
    // Only 'first' and 'last' phases are excluded from this check
    const nthPhases = phasesToValidate
      .map((phase) => {
        const positionRule = (phase as any)?.position_rule;
        const positionValue = (phase as any)?.position_value;
        
        if (positionRule === 'nth' && typeof positionValue === 'number') {
          return { phase, numericOrder: positionValue };
        }
        return null;
      })
      .filter((item): item is { phase: Phase; numericOrder: number } => item !== null);
    
    // Sort by numeric order
    nthPhases.sort((a, b) => a.numericOrder - b.numericOrder);
    
    // Check for duplicates and gaps in ALL 'nth' phases (standard and custom)
    if (nthPhases.length > 0) {
      const actualOrders = nthPhases.map(p => p.numericOrder);
      const hasDuplicates = new Set(actualOrders).size !== actualOrders.length;
      
      if (hasDuplicates) {
        errors.push(`Duplicate position values found in 'nth' phases: ${actualOrders.join(', ')}`);
      }
      
      // Check for gaps: all 'nth' phases must be consecutive
      // This includes standard phases with 'nth' rule (e.g., Planning, Ordering)
      const sortedOrders = [...actualOrders].sort((a, b) => a - b);
      const minOrder = sortedOrders[0];
      const expectedOrders = Array.from({ length: nthPhases.length }, (_, i) => minOrder + i);
      const hasGaps = sortedOrders.some((order, index) => order !== expectedOrders[index]);
      
      if (hasGaps) {
        errors.push(`Phases out of sequential order. Expected consecutive values starting from ${minOrder}, Found: ${sortedOrders.join(', ')}`);
      }
    }
    
    // Check 2b: Exactly one 'first' and one 'last' phase (only required for Standard Project Foundation)
    // Custom projects and revisions may not have 'first'/'last' phases - they can use 'nth' only
    if (isEditingStandardProject) {
      const firstPhases = phasesToValidate.filter(p => (p as any)?.position_rule === 'first');
      const lastPhases = phasesToValidate.filter(p => (p as any)?.position_rule === 'last');
      
      if (firstPhases.length !== 1) {
        errors.push(`Expected exactly 1 'first' phase, found ${firstPhases.length}`);
      }
      
      if (lastPhases.length !== 1) {
        errors.push(`Expected exactly 1 'last' phase, found ${lastPhases.length}`);
      }
    }
    
    // Check 3: Custom phases must be between last numbered standard phase and 'last'
    if (!isEditingStandardProject) {
      const standardPhases = phasesToValidate.filter(p => isStandardPhase(p) && !isLinkedPhase(p));
      if (standardPhases.length > 0) {
        // Find the last numbered standard phase (not 'last')
        const numberedStandardPhases = standardPhases.filter(p => {
          const positionRule = (p as any).position_rule;
          return positionRule === 'nth' || positionRule === 'first';
        });
        
        if (numberedStandardPhases.length > 0) {
          const lastNumberedStandardPhase = numberedStandardPhases[numberedStandardPhases.length - 1];
          const lastNumberedPosition = (lastNumberedStandardPhase as any).position_value || 1;
          
          const customPhases = phasesToValidate.filter(p => !isStandardPhase(p) && !isLinkedPhase(p));
          const invalidCustomPhases = customPhases.filter(p => {
            const positionValue = (p as any).position_value;
            return typeof positionValue === 'number' && (positionValue <= lastNumberedPosition || positionValue >= phasesToValidate.length);
          });
          
          if (invalidCustomPhases.length > 0) {
            errors.push(`Custom phases must be between position ${lastNumberedPosition + 1} and ${phasesToValidate.length - 1}. Invalid: ${invalidCustomPhases.map(p => p.name).join(', ')}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return {
        message: `Validation failed: ${errors.length} error(s) found`,
        details: errors
      };
    }
    
    return null;
  }, [isEditingStandardProject]);
  
  /**
   * Load phases directly from database - NO intermediate steps or copying
   * Reads directly from project_phases table with position_rule and position_value
   */
  const loadPhases = useCallback(async (projectId: string): Promise<Phase[]> => {
    if (!projectId) {
      throw new Error('No project ID provided');
    }
    
    const STANDARD_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
    
    if (isEditingStandardProject) {
      // Edit Standard: Read directly from project_phases table
      const { data: phasesData, error } = await supabase
        .from('project_phases')
        .select(`
          id,
          name,
          description,
          is_standard,
          position_rule,
          position_value
        `)
        .eq('project_id', projectId)
        .eq('is_standard', true)
        .order('position_rule', { ascending: true })
        .order('position_value', { ascending: true, nullsFirst: false });
      
      if (error) {
        throw new Error(`Failed to load phases: ${error.message}`);
      }
      
      // Convert to Phase format with operations and steps
      const phases: Phase[] = await Promise.all((phasesData || []).map(async (phaseData: any) => {
        // Get operations for this phase
        const { data: operations } = await supabase
          .from('template_operations')
          .select(`
            id,
            operation_name,
            operation_description,
            flow_type,
            user_prompt,
            display_order,
            is_reference
          `)
          .eq('phase_id', phaseData.id)
          .order('display_order');
        
        // Get steps for each operation
        const operationsWithSteps = await Promise.all((operations || []).map(async (op: any) => {
          const { data: steps } = await supabase
            .from('template_steps')
            .select(`
              id,
              step_title,
              description,
              step_type,
              display_order
            `)
            .eq('operation_id', op.id)
            .order('display_order');
          
          return {
            id: op.id,
            name: op.operation_name,
            description: op.operation_description,
            flowType: op.flow_type,
            userPrompt: op.user_prompt,
            displayOrder: op.display_order,
            isStandard: op.is_reference || phaseData.is_standard,
            steps: (steps || []).map((s: any) => ({
              id: s.id,
              step: s.step_title,
              description: s.description,
              stepType: s.step_type,
              displayOrder: s.display_order
            }))
          };
        }));
        
        // Derive phaseOrderNumber from position_rule
        let phaseOrderNumber: number | string;
        if (phaseData.position_rule === 'first') {
          phaseOrderNumber = 1;
        } else if (phaseData.position_rule === 'last') {
          phaseOrderNumber = 'last';
        } else if (phaseData.position_rule === 'nth' && phaseData.position_value) {
          phaseOrderNumber = phaseData.position_value;
        } else {
          phaseOrderNumber = 999;
        }
        
        return {
          id: phaseData.id,
          name: phaseData.name,
          description: phaseData.description,
          isStandard: phaseData.is_standard,
          isLinked: false,
          phaseOrderNumber,
          position_rule: phaseData.position_rule,
          position_value: phaseData.position_value,
          operations: operationsWithSteps
        } as Phase;
      }));
      
      return phases;
    } else {
      // Regular projects: Read directly from project_phases
      // 1. Get custom phases from current project
      // 2. Get standard phases from Standard Project Foundation
      
      // Get custom phases
      const { data: customPhasesData, error: customError } = await supabase
        .from('project_phases')
        .select(`
          id,
          name,
          description,
          is_standard,
          position_rule,
          position_value
        `)
        .eq('project_id', projectId)
        .eq('is_standard', false)
        .order('position_rule', { ascending: true })
        .order('position_value', { ascending: true, nullsFirst: false });
      
      if (customError) {
        throw new Error(`Failed to load custom phases: ${customError.message}`);
      }
      
      // Get standard phases from Standard Project Foundation
      const { data: standardPhasesData, error: standardError } = await supabase
        .from('project_phases')
        .select(`
          id,
          name,
          description,
          is_standard,
          position_rule,
          position_value
        `)
        .eq('project_id', STANDARD_PROJECT_ID)
        .eq('is_standard', true)
        .order('position_rule', { ascending: true })
        .order('position_value', { ascending: true, nullsFirst: false });
      
      if (standardError) {
        throw new Error(`Failed to load standard phases: ${standardError.message}`);
      }
      
      // Combine both and convert to Phase format
      const allPhasesData = [...(standardPhasesData || []), ...(customPhasesData || [])];
      
      const phases: Phase[] = await Promise.all(allPhasesData.map(async (phaseData: any) => {
        // Get operations for this phase
        const { data: operations } = await supabase
          .from('template_operations')
          .select(`
            id,
            operation_name,
            operation_description,
            flow_type,
            user_prompt,
            display_order,
            is_reference
          `)
          .eq('phase_id', phaseData.id)
          .order('display_order');
        
        // Get steps for each operation
        const operationsWithSteps = await Promise.all((operations || []).map(async (op: any) => {
          const { data: steps } = await supabase
            .from('template_steps')
            .select(`
              id,
              step_title,
              description,
              step_type,
              display_order
            `)
            .eq('operation_id', op.id)
            .order('display_order');
          
          return {
            id: op.id,
            name: op.operation_name,
            description: op.operation_description,
            flowType: op.flow_type,
            userPrompt: op.user_prompt,
            displayOrder: op.display_order,
            isStandard: op.is_reference || phaseData.is_standard,
            steps: (steps || []).map((s: any) => ({
              id: s.id,
              step: s.step_title,
              description: s.description,
              stepType: s.step_type,
              displayOrder: s.display_order
            }))
          };
        }));
        
        // Derive phaseOrderNumber from position_rule
        let phaseOrderNumber: number | string;
        if (phaseData.position_rule === 'first') {
          phaseOrderNumber = 1;
        } else if (phaseData.position_rule === 'last') {
          phaseOrderNumber = 'last';
        } else if (phaseData.position_rule === 'nth' && phaseData.position_value) {
          phaseOrderNumber = phaseData.position_value;
        } else {
          phaseOrderNumber = 999;
        }
        
        return {
          id: phaseData.id,
          name: phaseData.name,
          description: phaseData.description,
          isStandard: phaseData.is_standard,
          isLinked: phaseData.is_standard && phaseData.project_id !== projectId,
          phaseOrderNumber,
          position_rule: phaseData.position_rule,
          position_value: phaseData.position_value,
          operations: operationsWithSteps
        } as Phase;
      }));
      
      return phases;
    }
  }, [isEditingStandardProject]);
  
  /**
   * Sort phases by order number
   */
  const sortPhasesByOrderNumber = (phasesToSort: Phase[]): Phase[] => {
    return [...phasesToSort].sort((a, b) => {
      const aOrder = a.phaseOrderNumber === 'last' ? Infinity : 
                    (typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 1000);
      const bOrder = b.phaseOrderNumber === 'last' ? Infinity : 
                    (typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 1000);
      return aOrder - bOrder;
    });
  };
  
  // Track loaded project ID to prevent infinite loops
  const loadedProjectIdRef = React.useRef<string | null>(null);
  const isLoadingRef = React.useRef(false);
  
  /**
   * Helper function to reload phases with position data from database
   * This is used after delete, order change, and other operations
   */
  const reloadPhasesWithPositions = useCallback(async (projectId: string): Promise<Phase[]> => {
    // Load phases directly from database (already includes position data)
    const loadedPhases = await loadPhases(projectId);
    
    // Validate and sort
    const validationError = validatePhaseOrdering(loadedPhases);
    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }
    
    return sortPhasesByOrderNumber(loadedPhases);
  }, [loadPhases, validatePhaseOrdering]);
  
  /**
   * Load and validate phases on component mount or project change
   */
  useEffect(() => {
    const projectId = currentProject?.id;
    
    if (!projectId) {
      setPhases([]);
      setLoading(false);
      setValidationError(null);
      loadedProjectIdRef.current = null;
      isLoadingRef.current = false;
      return;
    }
    
    // Prevent re-loading if we're already loading or have already loaded this project
    if (isLoadingRef.current || loadedProjectIdRef.current === projectId) {
      return;
    }
    
    const fetchAndValidate = async () => {
      isLoadingRef.current = true;
      setLoading(true);
      setValidationError(null);
      loadedProjectIdRef.current = projectId;
      
      try {
        // Load phases directly from database (already includes position data)
        const loadedPhases = await loadPhases(projectId);
        
        // STRICT VALIDATION - ENFORCE: Block all operations if validation fails
        const validationError = validatePhaseOrdering(loadedPhases);
        if (validationError) {
          setValidationError(validationError);
          setPhases([]);
          setLoading(false);
          // Show detailed error message
          const errorDetails = validationError.details ? validationError.details.join('\n') : validationError.message;
          toast.error(`Validation failed: ${validationError.message}`, {
            description: errorDetails,
            duration: 10000
          });
          console.error('Validation errors:', validationError.details || [validationError.message]);
          loadedProjectIdRef.current = null; // Reset on validation error to allow retry
          isLoadingRef.current = false;
          return; // BLOCK: Do not proceed with loading phases
        }
        
        // Sort phases by order number
        const sortedPhases = sortPhasesByOrderNumber(loadedPhases);
        
        setPhases(sortedPhases);
        setValidationError(null);
        
        // CRITICAL: Do NOT call updateProject here - it causes infinite loops
        // The phases are already in local state (setPhases), which is sufficient for display
        // updateProject should only be called when user makes explicit changes, not during initial load
      } catch (error: any) {
        console.error('Error loading phases:', error);
        setValidationError({
          message: error.message || 'Failed to load phases',
          details: [error.toString()]
        });
        setPhases([]);
        toast.error(`Error loading phases: ${error.message || 'Unknown error'}. Please contact an admin to review the database.`);
        loadedProjectIdRef.current = null; // Reset on error to allow retry
      } finally {
        isLoadingRef.current = false;
        setLoading(false);
      }
    };
    
    fetchAndValidate();
  }, [currentProject?.id, isEditingStandardProject]);
  
  // Reset loaded project ID when project ID changes
  useEffect(() => {
    const projectId = currentProject?.id;
    if (loadedProjectIdRef.current && loadedProjectIdRef.current !== projectId) {
      loadedProjectIdRef.current = null;
      isLoadingRef.current = false;
    }
  }, [currentProject?.id]);
  
  /**
   * Get phase order number for display
   */
  const getPhaseOrderNumber = (phase: Phase, index: number, total: number): string => {
    if (phase.phaseOrderNumber === 'last') {
      return 'Last';
    }
    if (typeof phase.phaseOrderNumber === 'number') {
      if (phase.phaseOrderNumber === 1) {
        return 'First';
      }
      return String(phase.phaseOrderNumber);
    }
    // Fallback to index + 1
    return String(index + 1);
  };
  
  /**
   * Add a new phase to the database
   * Position: last minus one (e.g., if 5 phases, new phase becomes position 4)
   */
  const handleAddPhase = useCallback(async () => {
    if (!currentProject?.id) {
      toast.error('No project selected');
      return;
    }
    
    // ENFORCE VALIDATION: Block operation if validation fails
    if (validationError) {
      toast.error('Cannot add phase: Validation errors must be resolved first', {
        description: validationError.message
      });
      return;
    }
    
    setIsAddingPhase(true);
    
    try {
      // Get unique phase name
      const { data: existingPhases } = await supabase
        .from('project_phases')
        .select('name')
        .eq('project_id', currentProject.id);
      
      const existingNames = new Set((existingPhases || []).map(p => p.name.toLowerCase()));
      let phaseName = 'New Phase';
      let counter = 1;
      while (existingNames.has(phaseName.toLowerCase())) {
        phaseName = `New Phase ${counter}`;
        counter++;
      }
      
      // Calculate position: Get total phases and determine position
      const { data: allPhases } = await supabase
        .from('project_phases')
        .select('id, position_rule, position_value')
        .eq('project_id', currentProject.id);
      
      const totalPhases = allPhases?.length || 0;
      
      // Determine position rule and value
      let positionRule: string;
      let positionValue: number | null = null;
      
      if (isEditingStandardProject) {
        // For Edit Standard: find last phase and place before it
        const lastPhase = allPhases?.find(p => p.position_rule === 'last');
        if (lastPhase) {
          // Place before last phase
          const nthPhases = allPhases?.filter(p => p.position_rule === 'nth' && p.position_value) || [];
          const maxNthValue = nthPhases.length > 0 
            ? Math.max(...nthPhases.map(p => p.position_value as number))
            : 0;
          positionRule = 'nth';
          positionValue = maxNthValue + 1;
        } else {
          positionRule = 'nth';
          positionValue = totalPhases + 1;
        }
      } else {
        // For regular projects: place after all existing phases but before 'last'
        const nthPhases = allPhases?.filter(p => p.position_rule === 'nth' && p.position_value) || [];
        const maxNthValue = nthPhases.length > 0 
          ? Math.max(...nthPhases.map(p => p.position_value as number))
          : 0;
        positionRule = 'nth';
        positionValue = maxNthValue + 1;
      }
      
      // Insert phase directly into database
      const { data: addedPhase, error: insertError } = await supabase
        .from('project_phases')
        .insert({
          project_id: currentProject.id,
          name: phaseName,
          description: 'Phase description',
          is_standard: isEditingStandardProject,
          position_rule: positionRule,
          position_value: positionValue
        })
        .select('id')
        .single();
      
      if (insertError || !addedPhase?.id) {
        throw insertError || new Error('Failed to add phase to database');
      }
      
      // Create default operation and step directly in database
      const { data: newOperation, error: operationError } = await supabase
        .from('template_operations')
        .insert({
          phase_id: addedPhase.id,
          project_id: currentProject.id,
          operation_name: 'New Operation',
          operation_description: 'Operation description',
          flow_type: 'prime',
          display_order: 1,
          is_reference: false
        })
        .select('id')
        .single();
      
      if (operationError || !newOperation?.id) {
        throw operationError || new Error('Failed to create default operation');
      }
      
      // Create default step directly in database
      const { error: stepError } = await supabase
        .from('template_steps')
        .insert({
          operation_id: newOperation.id,
          step_title: 'New Step',
          description: 'Step description',
          display_order: 1,
          content_sections: [],
          materials: [],
          tools: [],
          outputs: [],
          apps: [],
          flow_type: 'prime',
          step_type: 'prime'
        });
      
      if (stepError) {
        throw stepError;
      }
      
      // Reload phases with position data from database
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      
      // Reset loadedProjectIdRef to allow immediate UI update
      loadedProjectIdRef.current = null;
      
      // Update UI immediately
      setPhases(sortedPhases);
      
      toast.success('Phase added successfully');
    } catch (error: any) {
      console.error('Error adding phase:', error);
      toast.error(`Failed to add phase: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingPhase(false);
    }
  }, [currentProject, phases.length, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Delete a phase from the database
   * First sends delete command, then refreshes UI
   * Automatically renumbers remaining phases (never changes standard phases in regular projects)
   */
  const handleDeletePhase = useCallback(async (phaseId: string) => {
    if (!currentProject?.id || !phaseId) {
      return;
    }
    
    // ENFORCE VALIDATION: Block operation if validation fails
    if (validationError) {
      toast.error('Cannot delete phase: Validation errors must be resolved first', {
        description: validationError.message
      });
      return;
    }
    
    const phaseToDelete = phases.find(p => p.id === phaseId);
    if (!phaseToDelete) {
      toast.error('Phase not found');
      return;
    }
    
    // Check if this is a standard phase in a regular project (cannot delete)
    if (!isEditingStandardProject && isStandardPhase(phaseToDelete) && !isLinkedPhase(phaseToDelete)) {
      toast.error('Cannot delete standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    setIsDeletingPhase(true);
    setPhaseToDelete(phaseId);
    
    try {
      // Delete phase from database first
      const { error: deleteError } = await supabase
        .from('project_phases')
        .delete()
        .eq('id', phaseId)
        .eq('project_id', currentProject.id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Reload phases from database after delete (with position data)
      // Skip validation temporarily since we're about to renumber
      let reloadedPhases: Phase[];
      try {
        reloadedPhases = await reloadPhasesWithPositions(currentProject.id);
      } catch (validationError: any) {
        // If validation fails after delete, still try to reload without validation
        // This can happen when phases have gaps after deletion
        console.warn('Validation failed after delete, will fix with renumbering:', validationError);
        const { data: phasesData } = await supabase
          .from('project_phases')
          .select('*')
          .eq('project_id', currentProject.id);
        
        if (!phasesData) {
          throw new Error('Failed to reload phases after delete');
        }
        
        // Convert to Phase format manually
        reloadedPhases = await Promise.all(
          phasesData.map(async (phaseData) => {
            const { data: operations } = await supabase
              .from('template_operations')
              .select('*')
              .eq('phase_id', phaseData.id)
              .order('display_order');
            
            const operationsWithSteps = await Promise.all(
              (operations || []).map(async (op) => {
                const { data: steps } = await supabase
                  .from('template_steps')
                  .select('*')
                  .eq('operation_id', op.id)
                  .order('display_order');
                
                return {
                  ...op,
                  steps: (steps || []).map(s => ({
                    ...s,
                    name: s.step_title,
                    displayOrder: s.display_order
                  }))
                };
              })
            );
            
            return {
              id: phaseData.id,
              name: phaseData.name,
              description: phaseData.description,
              operations: operationsWithSteps,
              isStandard: phaseData.is_standard || false,
              phaseOrderNumber: phaseData.position_rule === 'first' ? 1 :
                               phaseData.position_rule === 'last' ? 'last' :
                               phaseData.position_value,
              position_rule: phaseData.position_rule,
              position_value: phaseData.position_value
            } as Phase;
          })
        );
      }
      
      // For regular projects: auto-renumber custom phases only, never change standard phases
      if (!isEditingStandardProject) {
        // Get custom phases that need renumbering
        const customPhases = reloadedPhases.filter(p => 
          !isStandardPhase(p) && !isLinkedPhase(p) && p.id
        );
        
        // Renumber custom phases sequentially (preserve standard phase positions)
        let customPosition = 1;
        for (const customPhase of customPhases.sort((a, b) => {
          const aPos = typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 
                      a.phaseOrderNumber === 'last' ? Infinity : 1000;
          const bPos = typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 
                      b.phaseOrderNumber === 'last' ? Infinity : 1000;
          return aPos - bPos;
        })) {
          if (customPhase.id) {
            await supabase
              .from('project_phases')
              .update({
                position_rule: 'nth',
                position_value: customPosition++,
                updated_at: new Date().toISOString()
              })
              .eq('id', customPhase.id)
              .eq('project_id', currentProject.id);
          }
        }
      } else {
        // For Edit Standard: renumber all phases sequentially
        for (let i = 0; i < reloadedPhases.length; i++) {
          const phase = reloadedPhases[i];
          if (!phase.id || isLinkedPhase(phase)) continue;
          
          if (i === 0) {
            await supabase
              .from('project_phases')
              .update({
                position_rule: 'first',
                position_value: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', phase.id)
              .eq('project_id', currentProject.id);
          } else if (i === reloadedPhases.length - 1) {
            await supabase
              .from('project_phases')
              .update({
                position_rule: 'last',
                position_value: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', phase.id)
              .eq('project_id', currentProject.id);
          } else {
            await supabase
              .from('project_phases')
              .update({
                position_rule: 'nth',
                position_value: i + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', phase.id)
              .eq('project_id', currentProject.id);
          }
        }
      }
      
      // Reload phases with position data after renumbering
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      
      // Reset loadedProjectIdRef to allow immediate UI update
      loadedProjectIdRef.current = null;
      
      // Update UI immediately
      setPhases(sortedPhases);
      
      toast.success('Phase deleted successfully');
    } catch (error: any) {
      console.error('Error deleting phase:', error);
      toast.error(`Failed to delete phase: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDeletingPhase(false);
      setPhaseToDelete(null);
      setDeletePhaseDialogOpen(false);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Toggle phase expansion
   */
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
  
  /**
   * Toggle operation expansion
   */
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
  
  /**
   * Start editing an item (phase, operation, or step)
   */
  const startEdit = useCallback((type: 'phase' | 'operation' | 'step', id: string, data: any) => {
    // Block editing of incorporated phases, operations, and steps
    if (type === 'phase') {
      const phase = phases.find(p => p.id === id);
      if (phase?.isLinked) {
        toast.error('Cannot edit incorporated phases. They are dynamically linked to the source project.');
        return;
      }
    } else if (type === 'operation' || type === 'step') {
      // Find the parent phase to check if it's incorporated
      const parentPhase = phases.find(p => 
        p.operations.some(op => 
          op.id === id || op.steps.some(s => s.id === id)
        )
      );
      if (parentPhase?.isLinked) {
        toast.error('Cannot edit operations or steps in incorporated phases. They are dynamically linked to the source project.');
        return;
      }
    }
    
    // In regular projects, block editing standard phases/operations/steps
    if (!isEditingStandardProject) {
      if (type === 'phase') {
        const phase = phases.find(p => p.id === id);
        if (phase?.isStandard) {
          toast.error('Cannot edit standard phases. Use Edit Standard to modify standard phases.');
          return;
        }
      } else if (type === 'operation') {
        if (data?.isStandard) {
          toast.error('Cannot edit standard operations. Use Edit Standard to modify standard phases.');
          return;
        }
      } else if (type === 'step') {
        if (data?.isStandard) {
          toast.error('Cannot edit standard steps. Use Edit Standard to modify standard phases.');
          return;
        }
      }
    }
    
    // For steps, ensure step_title is properly set from step property
    const editData = type === 'step' 
      ? { ...data, step_title: data.step_title || data.step || '' }
      : { ...data };
    
    setEditingItem({
      type,
      id,
      data: editData
    });
  }, [phases, isEditingStandardProject]);
  
  /**
   * Save edits to database
   */
  const saveEdit = useCallback(async () => {
    if (!editingItem || !currentProject) return;
    
    try {
      if (editingItem.type === 'phase') {
        const phase = phases.find(p => p.id === editingItem.id);
        if (!phase || (phase.isStandard && !isEditingStandardProject)) {
          toast.error('Cannot save phase changes');
          return;
        }
        
        // Update phase in database
        const { error } = await supabase
          .from('project_phases')
          .update({
            name: editingItem.data.name,
            description: editingItem.data.description || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)
          .eq('project_id', currentProject.id);
        
        if (error) {
          throw error;
        }
      } else if (editingItem.type === 'operation') {
        const { error } = await supabase
          .from('template_operations')
          .update({
            operation_name: editingItem.data.name,  // Changed from name
            operation_description: editingItem.data.description || null,  // Changed from description
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);
        
        if (error) {
          throw error;
        }
      } else if (editingItem.type === 'step') {
        // Ensure we use step_title (the actual database field)
        const stepTitle = editingItem.data.step_title || editingItem.data.step || '';
        const { error } = await supabase
          .from('template_steps')
          .update({
            step_title: stepTitle,
            description: editingItem.data.description || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);
        
        if (error) {
          throw error;
        }
      }
      
      // Reload phases with position data from database
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      
      // Reset loadedProjectIdRef to allow immediate UI update
      loadedProjectIdRef.current = null;
      
      // Update UI immediately
      setPhases(sortedPhases);
      
      setEditingItem(null);
      toast.success(`${editingItem.type.charAt(0).toUpperCase() + editingItem.type.slice(1)} updated successfully`);
    } catch (error: any) {
      console.error('Error saving edit:', error);
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  }, [editingItem, currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Handle delete phase click (opens confirmation dialog)
   */
  const handleDeletePhaseClick = useCallback((phaseId: string) => {
    setPhaseToDelete(phaseId);
    setDeletePhaseDialogOpen(true);
  }, []);
  
  /**
   * Delete an operation from the database
   */
  const handleDeleteOperation = useCallback(async (operationId: string) => {
    if (!currentProject?.id || !operationId) {
      return;
    }
    
    const operation = phases
      .flatMap(p => p.operations)
      .find(op => op.id === operationId);
    
    if (!operation) {
      toast.error('Operation not found');
      return;
    }
    
    // Check if can delete
    const parentPhase = phases.find(p => p.operations.some(op => op.id === operationId));
    if (!parentPhase) {
      toast.error('Parent phase not found');
      return;
    }
    
    if (parentPhase.isLinked) {
      toast.error('Cannot delete operations in incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(parentPhase)) {
      toast.error('Cannot delete operations in standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    if (operation.isStandard && !isEditingStandardProject) {
      toast.error('Cannot delete standard operations. Use Edit Standard to modify standard phases.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${operation.name}"? This will also delete all its steps. This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete all steps for this operation first
      const { error: deleteStepsError } = await supabase
        .from('template_steps')
        .delete()
        .eq('operation_id', operationId);
      
      if (deleteStepsError) {
        throw deleteStepsError;
      }
      
      // Delete the operation
      const { error: deleteError } = await supabase
        .from('template_operations')
        .delete()
        .eq('id', operationId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Reload phases with position data
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Operation deleted successfully');
    } catch (error: any) {
      console.error('Error deleting operation:', error);
      toast.error(`Failed to delete operation: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Move an operation up (decrease display_order)
   */
  const handleMoveOperationUp = useCallback(async (operationId: string, phaseId: string) => {
    if (!currentProject?.id) {
      return;
    }
    
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const currentIndex = phase.operations.findIndex(op => op.id === operationId);
    if (currentIndex <= 0) return;
    
    const operation = phase.operations[currentIndex];
    const prevOperation = phase.operations[currentIndex - 1];
    
    // Check permissions
    if (phase.isLinked) {
      toast.error('Cannot reorder operations in incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(phase)) {
      toast.error('Cannot reorder operations in standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Get current display_order values
      const { data: ops } = await supabase
        .from('template_operations')
        .select('id, display_order')
        .in('id', [operation.id, prevOperation.id]);
      
      if (!ops || ops.length !== 2) return;
      
      const op1 = ops.find(o => o.id === operation.id);
      const op2 = ops.find(o => o.id === prevOperation.id);
      
      if (!op1 || !op2) return;
      
      // Swap display_order
      await supabase
        .from('template_operations')
        .update({ display_order: op2.display_order })
        .eq('id', operation.id);
      
      await supabase
        .from('template_operations')
        .update({ display_order: op1.display_order })
        .eq('id', prevOperation.id);
      
      // Reload phases
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Operation moved up');
    } catch (error: any) {
      console.error('Error moving operation up:', error);
      toast.error(`Failed to move operation: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Move an operation down (increase display_order)
   */
  const handleMoveOperationDown = useCallback(async (operationId: string, phaseId: string) => {
    if (!currentProject?.id) {
      return;
    }
    
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const currentIndex = phase.operations.findIndex(op => op.id === operationId);
    if (currentIndex < 0 || currentIndex >= phase.operations.length - 1) return;
    
    const operation = phase.operations[currentIndex];
    const nextOperation = phase.operations[currentIndex + 1];
    
    // Check permissions
    if (phase.isLinked) {
      toast.error('Cannot reorder operations in incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(phase)) {
      toast.error('Cannot reorder operations in standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Get current display_order values
      const { data: ops } = await supabase
        .from('template_operations')
        .select('id, display_order')
        .in('id', [operation.id, nextOperation.id]);
      
      if (!ops || ops.length !== 2) return;
      
      const op1 = ops.find(o => o.id === operation.id);
      const op2 = ops.find(o => o.id === nextOperation.id);
      
      if (!op1 || !op2) return;
      
      // Swap display_order
      await supabase
        .from('template_operations')
        .update({ display_order: op2.display_order })
        .eq('id', operation.id);
      
      await supabase
        .from('template_operations')
        .update({ display_order: op1.display_order })
        .eq('id', nextOperation.id);
      
      // Reload phases
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Operation moved down');
    } catch (error: any) {
      console.error('Error moving operation down:', error);
      toast.error(`Failed to move operation: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Move a step up (decrease display_order)
   */
  const handleMoveStepUp = useCallback(async (stepId: string, operationId: string, phaseId: string) => {
    if (!currentProject?.id) {
      return;
    }
    
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const operation = phase.operations.find(op => op.id === operationId);
    if (!operation) return;
    
    const currentIndex = operation.steps.findIndex(s => s.id === stepId);
    if (currentIndex <= 0) return;
    
    const step = operation.steps[currentIndex];
    const prevStep = operation.steps[currentIndex - 1];
    
    // Check permissions
    if (phase.isLinked) {
      toast.error('Cannot reorder steps in incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(phase)) {
      toast.error('Cannot reorder steps in standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Get current display_order values
      const { data: steps } = await supabase
        .from('template_steps')
        .select('id, display_order')
        .in('id', [step.id, prevStep.id]);
      
      if (!steps || steps.length !== 2) return;
      
      const s1 = steps.find(s => s.id === step.id);
      const s2 = steps.find(s => s.id === prevStep.id);
      
      if (!s1 || !s2) return;
      
      // Swap display_order
      await supabase
        .from('template_steps')
        .update({ display_order: s2.display_order })
        .eq('id', step.id);
      
      await supabase
        .from('template_steps')
        .update({ display_order: s1.display_order })
        .eq('id', prevStep.id);
      
      // Reload phases
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Step moved up');
    } catch (error: any) {
      console.error('Error moving step up:', error);
      toast.error(`Failed to move step: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Move a step down (increase display_order)
   */
  const handleMoveStepDown = useCallback(async (stepId: string, operationId: string, phaseId: string) => {
    if (!currentProject?.id) {
      return;
    }
    
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) return;
    
    const operation = phase.operations.find(op => op.id === operationId);
    if (!operation) return;
    
    const currentIndex = operation.steps.findIndex(s => s.id === stepId);
    if (currentIndex < 0 || currentIndex >= operation.steps.length - 1) return;
    
    const step = operation.steps[currentIndex];
    const nextStep = operation.steps[currentIndex + 1];
    
    // Check permissions
    if (phase.isLinked) {
      toast.error('Cannot reorder steps in incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(phase)) {
      toast.error('Cannot reorder steps in standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Get current display_order values
      const { data: steps } = await supabase
        .from('template_steps')
        .select('id, display_order')
        .in('id', [step.id, nextStep.id]);
      
      if (!steps || steps.length !== 2) return;
      
      const s1 = steps.find(s => s.id === step.id);
      const s2 = steps.find(s => s.id === nextStep.id);
      
      if (!s1 || !s2) return;
      
      // Swap display_order
      await supabase
        .from('template_steps')
        .update({ display_order: s2.display_order })
        .eq('id', step.id);
      
      await supabase
        .from('template_steps')
        .update({ display_order: s1.display_order })
        .eq('id', nextStep.id);
      
      // Reload phases
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Step moved down');
    } catch (error: any) {
      console.error('Error moving step down:', error);
      toast.error(`Failed to move step: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Delete a step from the database
   */
  const handleDeleteStep = useCallback(async (stepId: string) => {
    if (!currentProject?.id || !stepId) {
      return;
    }
    
    const step = phases
      .flatMap(p => p.operations)
      .flatMap(op => op.steps)
      .find(s => s.id === stepId);
    
    if (!step) {
      toast.error('Step not found');
      return;
    }
    
    // Find parent operation and phase
    const parentOperation = phases
      .flatMap(p => p.operations)
      .find(op => op.steps.some(s => s.id === stepId));
    
    if (!parentOperation) {
      toast.error('Parent operation not found');
      return;
    }
    
    const parentPhase = phases.find(p => p.operations.some(op => op.id === parentOperation.id));
    
    if (!parentPhase) {
      toast.error('Parent phase not found');
      return;
    }
    
    // Check if can delete
    if (parentPhase.isLinked) {
      toast.error('Cannot delete steps in incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(parentPhase)) {
      toast.error('Cannot delete steps in standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    if (step.isStandard && !isEditingStandardProject) {
      toast.error('Cannot delete standard steps. Use Edit Standard to modify standard phases.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${step.step || 'this step'}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Delete the step
      const { error: deleteError } = await supabase
        .from('template_steps')
        .delete()
        .eq('id', stepId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Reload phases with position data
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Step deleted successfully');
    } catch (error: any) {
      console.error('Error deleting step:', error);
      toast.error(`Failed to delete step: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Add a new operation to a phase
   */
  const handleAddOperation = useCallback(async (phaseId: string) => {
    if (!currentProject?.id) {
      toast.error('No project selected');
      return;
    }
    
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) {
      toast.error('Phase not found');
      return;
    }
    
    // Check if can add operation
    if (phase.isLinked) {
      toast.error('Cannot add operations to incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(phase)) {
      toast.error('Cannot add operations to standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Get unique operation name
      const { data: existingOperations } = await supabase
        .from('template_operations')
        .select('operation_name')  // Changed from name
        .eq('phase_id', phaseId);
      
      const existingNames = new Set((existingOperations || []).map(op => (op as any).operation_name?.toLowerCase() || ''));
      let operationName = 'New Operation';
      let counter = 1;
      while (existingNames.has(operationName.toLowerCase())) {
        operationName = `New Operation ${counter}`;
        counter++;
      }
      
      // Insert new operation
      // Must comply with custom_phase_metadata_check constraint
      const phaseIsStandard = isStandardPhase(phase);
      
      // Build insert object based on phase type
      const insertData: any = {
        phase_id: phaseId,
        project_id: currentProject.id,
        operation_name: operationName,  // Changed from name
        operation_description: 'Operation description',  // Changed from description
        flow_type: 'prime',
        display_order: 1  // Use sequential ordering starting at 1
      };
      
      // Note: is_standard_phase, custom_phase_name, and custom_phase_description removed
      // Phase standard status comes from project_phases.is_standard
      
      const { data: newOperation, error: insertError } = await supabase
        .from('template_operations')
        .insert(insertData)
        .select('id')
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      // Automatically create one step for the new operation
      const { data: existingSteps } = await supabase
        .from('template_steps')
        .select('step_title')
        .eq('operation_id', newOperation.id);
      
      const existingStepNames = new Set((existingSteps || []).map(s => s.step_title?.toLowerCase() || ''));
      let stepName = 'New Step';
      let stepCounter = 1;
      while (existingStepNames.has(stepName.toLowerCase())) {
        stepName = `New Step ${stepCounter}`;
        stepCounter++;
      }
      
      const { error: stepInsertError } = await supabase
        .from('template_steps')
        .insert({
          operation_id: newOperation.id,
          step_title: stepName,
          description: 'Step description',
          display_order: 1,
          content_sections: [],
          materials: [],
          tools: [],
          outputs: [],
          apps: [],
          flow_type: 'prime',
          step_type: 'prime'
        });
      
      if (stepInsertError) {
        console.error('Error creating default step:', stepInsertError);
        // Don't throw - operation was created successfully, step can be added manually
      }
      
      // Reload phases with position data
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Operation added successfully');
    } catch (error: any) {
      console.error('Error adding operation:', error);
      toast.error(`Failed to add operation: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Add a new step to an operation
   */
  const handleAddStep = useCallback(async (phaseId: string, operationId: string) => {
    if (!currentProject?.id) {
      toast.error('No project selected');
      return;
    }
    
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) {
      toast.error('Phase not found');
      return;
    }
    
    const operation = phase.operations.find(op => op.id === operationId);
    if (!operation) {
      toast.error('Operation not found');
      return;
    }
    
    // Check if can add step
    if (phase.isLinked) {
      toast.error('Cannot add steps to incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && isStandardPhase(phase)) {
      toast.error('Cannot add steps to standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Get existing steps to determine display_order and unique name
      const { data: existingSteps } = await supabase
        .from('template_steps')
        .select('step_title, display_order')
        .eq('operation_id', operationId)
        .order('display_order', { ascending: true });
      
      const existingNames = new Set((existingSteps || []).map(s => s.step_title?.toLowerCase() || ''));
      let stepName = 'New Step';
      let counter = 1;
      while (existingNames.has(stepName.toLowerCase())) {
        stepName = `New Step ${counter}`;
        counter++;
      }
      
      // Calculate display_order based on actual database count
      const nextStepNumber = existingSteps && existingSteps.length > 0 
        ? Math.max(...existingSteps.map(s => s.display_order || 0)) + 1
        : 1;
      
      // Insert new step with all required fields
      const { data: newStep, error: insertError } = await supabase
        .from('template_steps')
        .insert({
          operation_id: operationId,
          step_title: stepName,
          description: 'Step description',
          display_order: nextStepNumber,
          content_sections: [],
          materials: [],
          tools: [],
          outputs: [],
          apps: [],
          flow_type: 'prime',
          step_type: 'prime'
        })
        .select('id, step_title')
        .single();
      
      if (insertError) {
        console.error('Error inserting step:', insertError);
        toast.error(`Failed to add step: ${insertError.message || 'Unknown error'}`);
        throw insertError;
      }
      
      console.log('Step created successfully:', newStep);
      
      // Reload phases with position data
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Step added successfully');
    } catch (error: any) {
      console.error('Error adding step:', error);
      toast.error(`Failed to add step: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions]);
  
  /**
   * Helper to update phase position in database
   */
  const updatePhasePosition = useCallback(async (phaseId: string, orderNumber: number | 'last', totalPhases: number) => {
    if (!currentProject?.id) return;
    
    let positionRule: string;
    let positionValue: number | null = null;
    
    if (orderNumber === 1) {
      positionRule = 'first';
    } else if (orderNumber === 'last') {
      positionRule = 'last';
    } else if (typeof orderNumber === 'number') {
      positionRule = 'nth';
      positionValue = orderNumber;
    } else {
      return;
    }
    
    await supabase
      .from('project_phases')
      .update({
        position_rule: positionRule,
        position_value: positionValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', phaseId)
      .eq('project_id', currentProject.id);
  }, [currentProject]);
  
  /**
   * Move a phase up (decrease position)
   */
  const handleMovePhaseUp = useCallback(async (phaseId: string) => {
    if (!currentProject?.id) {
      toast.error('No project selected');
      return;
    }
    
    // ENFORCE VALIDATION: Block operation if validation fails
    if (validationError) {
      toast.error('Cannot move phase: Validation errors must be resolved first', {
        description: validationError.message
      });
      return;
    }
    
    const currentIndex = phases.findIndex(p => p.id === phaseId);
    if (currentIndex <= 0) {
      return; // Already at top
    }
    
    const phase = phases[currentIndex];
    const prevPhase = phases[currentIndex - 1];
    
    // Check permissions
    if (phase.isLinked || prevPhase.isLinked) {
      toast.error('Cannot reorder incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && (isStandardPhase(phase) || isStandardPhase(prevPhase))) {
      toast.error('Cannot reorder standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Swap positions
      const tempOrder = phase.phaseOrderNumber;
      phase.phaseOrderNumber = prevPhase.phaseOrderNumber;
      prevPhase.phaseOrderNumber = tempOrder;
      
      // Update database positions
      await updatePhasePosition(phase.id, phase.phaseOrderNumber, phases.length);
      await updatePhasePosition(prevPhase.id, prevPhase.phaseOrderNumber, phases.length);
      
      // Reload phases
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Phase moved up');
    } catch (error: any) {
      console.error('Error moving phase up:', error);
      toast.error(`Failed to move phase: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions, updatePhasePosition]);
  
  /**
   * Move a phase down (increase position)
   */
  const handleMovePhaseDown = useCallback(async (phaseId: string) => {
    if (!currentProject?.id) {
      toast.error('No project selected');
      return;
    }
    
    // ENFORCE VALIDATION: Block operation if validation fails
    if (validationError) {
      toast.error('Cannot move phase: Validation errors must be resolved first', {
        description: validationError.message
      });
      return;
    }
    
    const currentIndex = phases.findIndex(p => p.id === phaseId);
    if (currentIndex < 0 || currentIndex >= phases.length - 1) {
      return; // Already at bottom
    }
    
    const phase = phases[currentIndex];
    const nextPhase = phases[currentIndex + 1];
    
    // Check permissions
    if (phase.isLinked || nextPhase.isLinked) {
      toast.error('Cannot reorder incorporated phases');
      return;
    }
    
    if (!isEditingStandardProject && (isStandardPhase(phase) || isStandardPhase(nextPhase))) {
      toast.error('Cannot reorder standard phases. Use Edit Standard to modify standard phases.');
      return;
    }
    
    try {
      // Swap positions
      const tempOrder = phase.phaseOrderNumber;
      phase.phaseOrderNumber = nextPhase.phaseOrderNumber;
      nextPhase.phaseOrderNumber = tempOrder;
      
      // Update database positions
      await updatePhasePosition(phase.id, phase.phaseOrderNumber, phases.length);
      await updatePhasePosition(nextPhase.id, nextPhase.phaseOrderNumber, phases.length);
      
      // Reload phases
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      loadedProjectIdRef.current = null;
      setPhases(sortedPhases);
      
      toast.success('Phase moved down');
    } catch (error: any) {
      console.error('Error moving phase down:', error);
      toast.error(`Failed to move phase: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, isEditingStandardProject, reloadPhasesWithPositions, updatePhasePosition]);
  
  /**
   * Handle phase order change from dropdown
   */
  const handlePhaseOrderChange = useCallback(async (phaseId: string, newOrder: string | number) => {
    if (!currentProject?.id) {
      toast.error('No project selected');
      return;
    }
    
    const phase = phases.find(p => p.id === phaseId);
    if (!phase) {
      toast.error('Phase not found');
      return;
    }
    
    try {
      // Convert 'First'/'Last' to numeric positions
      const targetPosition = newOrder === 'First' ? 1 : 
                            newOrder === 'Last' ? phases.length : 
                            typeof newOrder === 'number' ? newOrder : 
                            parseInt(String(newOrder), 10);
      
      if (isNaN(targetPosition) || targetPosition < 1 || targetPosition > phases.length) {
        toast.error('Invalid position selected');
        return;
      }
      
      // Reorder phases array
      const phasesArray = [...phases];
      const currentIndex = phasesArray.findIndex(p => p.id === phaseId);
      if (currentIndex === -1) return;
      
      const [movedPhase] = phasesArray.splice(currentIndex, 1);
      const targetIndex = Math.min(Math.max(0, targetPosition - 1), phasesArray.length);
      phasesArray.splice(targetIndex, 0, movedPhase);
      
      // Update order numbers sequentially (1, 2, 3...)
      phasesArray.forEach((p, index) => {
        if (index === 0) {
          p.phaseOrderNumber = 1; // Position 1 as number, not 'first'
        } else if (index === phasesArray.length - 1) {
          p.phaseOrderNumber = 'last';
        } else {
          p.phaseOrderNumber = index + 1;
        }
      });
      
      // Update database positions
      for (let i = 0; i < phasesArray.length; i++) {
        const p = phasesArray[i];
        if (!p.id || isLinkedPhase(p)) continue;
        
        let positionRule: string;
        let positionValue: number | null = null;
        
        if (i === 0) {
          positionRule = 'first';
        } else if (i === phasesArray.length - 1) {
          positionRule = 'last';
        } else {
          positionRule = 'nth';
          positionValue = i + 1;
        }
        
        await supabase
          .from('project_phases')
          .update({
            position_rule: positionRule,
            position_value: positionValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', p.id)
          .eq('project_id', currentProject.id);
      }
      
      // Reload phases with position data from database
      const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
      
      // Reset loadedProjectIdRef to allow immediate UI update
      loadedProjectIdRef.current = null;
      
      // Update UI immediately
      setPhases(sortedPhases);
      
      toast.success('Phase order updated');
    } catch (error: any) {
      console.error('Error changing phase order:', error);
      toast.error(`Failed to change phase order: ${error.message || 'Unknown error'}`);
    }
  }, [currentProject, phases, reloadPhasesWithPositions]);
  
  /**
   * Get available order numbers for dropdown
   */
  const getAvailableOrderNumbers = (currentPhase: Phase, currentIndex: number, totalPhases: number): (string | number)[] => {
    const options: (string | number)[] = [];
    
    if (totalPhases <= 0) {
      return ['First', 1, 'Last'];
    }
    
    // Add 'First' (position 1)
    options.push('First');
    
    // Add integer options (2 to totalPhases-1)
    for (let i = 2; i < totalPhases; i++) {
      options.push(i);
    }
    
    // Add 'Last'
    if (totalPhases > 1) {
      options.push('Last');
    }
    
    return options;
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading phases...</span>
      </div>
    );
  }
  
  // Render validation error
  if (validationError) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Validation Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 mb-4">{validationError.message}</p>
            {validationError.details && validationError.details.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Details:</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {validationError.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm text-gray-600">
              Please contact an admin to review and fix the database. The Structure Manager cannot load until validation passes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentProject) {
    return (
      <div className="p-6">
        <p>No project selected</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }
  
  // Render main UI
  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Structure Manager</h2>
                <p className="text-muted-foreground text-sm">
                  {isEditingStandardProject ? 'Edit Standard Project Foundation' : currentProject.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDecisionTreeManager(true)}>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Decision Tree
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowIncorporationDialog(true)}>
                  <Link className="w-4 h-4 mr-2" />
                  Incorporate Phase
                </Button>
                <Button onClick={onBack} variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Done Editing
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8">
          {/* Add Phase Button */}
          <div className="flex items-center gap-2 mb-4">
            <Button 
              size="sm" 
              onClick={handleAddPhase} 
              disabled={isAddingPhase || isDeletingPhase}
              className="flex items-center gap-2"
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
              onClick={() => {
                if (expandedPhases.size === phases.length) {
                  setExpandedPhases(new Set());
                } else {
                  setExpandedPhases(new Set(phases.map(p => p.id)));
                }
              }}
            >
              {expandedPhases.size === phases.length ? (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Expand All
                </>
              )}
            </Button>
          </div>
          
          {/* Phases List */}
          <div className="space-y-4">
            {phases.map((phase, phaseIndex) => {
              const phaseIsStandard = isStandardPhase(phase);
              const phaseIsLinked = isLinkedPhase(phase);
              const isExpanded = expandedPhases.has(phase.id);
              const isEditing = editingItem?.type === 'phase' && editingItem.id === phase.id;
              
              return (
                <Card 
                  key={phase.id}
                  className={`border-2 ${phaseIsStandard ? 'bg-blue-50 border-blue-200' : phaseIsLinked ? 'bg-purple-50 border-purple-200' : ''}`}
                >
                  <CardHeader className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => togglePhaseExpansion(phase.id)}
                          className="p-1 h-auto"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                        
                        {/* Phase Order Dropdown */}
                        {phaseIsStandard && !isEditingStandardProject ? (
                          // Standard phases in regular projects: read-only display
                          <span className="text-xs font-medium min-w-[2rem]">
                            {getPhaseOrderNumber(phase, phaseIndex, phases.length)}
                          </span>
                        ) : (
                          // Show dropdown for editable phases
                          <Select
                            value={String(getPhaseOrderNumber(phase, phaseIndex, phases.length))}
                            onValueChange={(value) => {
                              const newOrder = value === 'First' ? 'First' : 
                                             value === 'Last' ? 'Last' : 
                                             parseInt(value, 10);
                              handlePhaseOrderChange(phase.id, newOrder);
                            }}
                            disabled={isDeletingPhase || isAddingPhase}
                          >
                            <SelectTrigger className="w-16 h-6 text-xs px-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getAvailableOrderNumbers(phase, phaseIndex, phases.length).map((order) => (
                                <SelectItem key={String(order)} value={String(order)}>
                                  {String(order)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        {phaseIsStandard && <span>🔒</span>}
                        
                        {isEditing ? (
                          <div className="flex-1 space-y-1">
                            <Input 
                              value={editingItem.data.name} 
                              onChange={e => setEditingItem({
                                ...editingItem,
                                data: { ...editingItem.data, name: e.target.value }
                              })} 
                              placeholder="Phase name" 
                              className="text-sm h-7" 
                            />
                            <Textarea 
                              value={editingItem.data.description || ''} 
                              onChange={e => setEditingItem({
                                ...editingItem,
                                data: { ...editingItem.data, description: e.target.value }
                              })} 
                              placeholder="Phase description" 
                              rows={1} 
                              className="text-xs" 
                            />
                          </div>
                        ) : (
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {phase.name}
                              {phaseIsStandard && <span className="text-xs text-blue-600">(Standard - Locked)</span>}
                              {phaseIsLinked && (
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  <Link className="w-3 h-3" />
                                  <span>Linked From {phase.sourceProjectName}</span>
                                </Badge>
                              )}
                            </CardTitle>
                            {phase.description && (
                              <p className="text-muted-foreground text-xs mt-1">{phase.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{phase.operations.length} operations</Badge>
                        
                        {/* Button visibility rules */}
                        {phaseIsStandard && !isEditingStandardProject ? (
                          // Standard phases in regular projects: NO buttons
                          null
                        ) : phaseIsLinked ? (
                          // Incorporated phases: Show delete button only
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeletePhaseClick(phase.id)}
                            disabled={isDeletingPhase}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          // Project phases OR standard phases in Edit Standard: Show edit/delete/reorder buttons
                          <>
                            {isEditing ? (
                              <>
                                <Button size="sm" onClick={saveEdit}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMovePhaseUp(phase.id)}
                                  disabled={phaseIndex === 0}
                                  title="Move up"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMovePhaseDown(phase.id)}
                                  disabled={phaseIndex === phases.length - 1}
                                  title="Move down"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => startEdit('phase', phase.id, phase)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleDeletePhaseClick(phase.id)}
                                  disabled={isDeletingPhase}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <Collapsible open={isExpanded}>
                      <CollapsibleContent>
                        <CardContent>
                          {/* Add Operation Button */}
                          {!phaseIsLinked && (isEditingStandardProject || !phaseIsStandard) && (
                            <div className="mb-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddOperation(phase.id)}
                                className="flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Add Operation
                              </Button>
                            </div>
                          )}
                          
                          {/* Operations List */}
                          <div className="space-y-3">
                            {phase.operations.map((operation, operationIndex) => {
                              const isOperationEditing = editingItem?.type === 'operation' && editingItem.id === operation.id;
                              const operationIsStandard = operation.isStandard === true;
                              const isOperationExpanded = expandedOperations.has(operation.id);
                              
                              // Check if operations/steps in standard phases are read-only in regular projects
                              const isReadOnly = !isEditingStandardProject && phaseIsStandard;
                              
                              return (
                                <Card key={operation.id} className="ml-4">
                                  <CardHeader className="py-2 px-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleOperationExpansion(operation.id)}
                                          className="p-1 h-auto"
                                        >
                                          {isOperationExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </Button>
                                        
                                        {isOperationEditing ? (
                                          <div className="flex-1 space-y-1">
                                            <Input
                                              value={editingItem.data.name || ''}
                                              onChange={e => setEditingItem({
                                                ...editingItem,
                                                data: { ...editingItem.data, name: e.target.value }
                                              })}
                                              placeholder="Operation name"
                                              className="text-sm h-7"
                                            />
                                            <Textarea
                                              value={editingItem.data.description || ''}
                                              onChange={e => setEditingItem({
                                                ...editingItem,
                                                data: { ...editingItem.data, description: e.target.value }
                                              })}
                                              placeholder="Operation description"
                                              rows={1}
                                              className="text-xs"
                                            />
                                          </div>
                                        ) : (
                                          <div className="flex-1">
                                            <p className="text-sm font-medium flex items-center gap-2">
                                              {operation.name}
                                              {operationIsStandard && !isEditingStandardProject && (
                                                <Badge variant="secondary" className="text-xs">Standard 🔒</Badge>
                                              )}
                                            </p>
                                            {operation.description && (
                                              <p className="text-xs text-muted-foreground mt-1">{operation.description}</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {operation.steps.length} steps
                                        </Badge>
                                        
                                        {/* Button visibility for operations */}
                                        {!isReadOnly && !phaseIsLinked && (
                                          <>
                                            {isOperationEditing ? (
                                              <>
                                                <Button size="sm" onClick={saveEdit}>
                                                  <Check className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                                  <X className="w-3 h-3" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                {(!operationIsStandard || isEditingStandardProject) && (
                                                  <>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => handleMoveOperationUp(operation.id, phase.id)}
                                                      disabled={operationIndex === 0}
                                                      title="Move up"
                                                    >
                                                      <ChevronUp className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => handleMoveOperationDown(operation.id, phase.id)}
                                                      disabled={operationIndex === phase.operations.length - 1}
                                                      title="Move down"
                                                    >
                                                      <ChevronDown className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => startEdit('operation', operation.id, operation)}
                                                    >
                                                      <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => handleDeleteOperation(operation.id)}
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                  </>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  
                                  {isOperationExpanded && (
                                    <Collapsible open={isOperationExpanded}>
                                      <CollapsibleContent>
                                        <CardContent className="pt-0">
                                          {/* Add Step Button */}
                                          {!phaseIsLinked && (isEditingStandardProject || !phaseIsStandard) && (
                                            <div className="mb-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAddStep(phase.id, operation.id)}
                                                className="flex items-center gap-1 text-xs"
                                              >
                                                <Plus className="w-3 h-3" />
                                                Add Step
                                              </Button>
                                            </div>
                                          )}
                                          
                                          {/* Steps List */}
                                          <div className="space-y-2">
                                            {operation.steps.map((step, stepIndex) => {
                                              const isStepEditing = editingItem?.type === 'step' && editingItem.id === step.id;
                                              const stepIsStandard = step.isStandard === true;
                                              
                                              return (
                                                <Card key={step.id} className="ml-4">
                                                  <CardContent className="p-2">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex-1">
                                                        {isStepEditing ? (
                                                          <div className="space-y-1">
                                                            <Input
                                                              value={editingItem.data.step || editingItem.data.step_title || ''}
                                                              onChange={e => setEditingItem({
                                                                ...editingItem,
                                                                data: { 
                                                                  ...editingItem.data, 
                                                                  step: e.target.value,
                                                                  step_title: e.target.value
                                                                }
                                                              })}
                                                              placeholder="Step name"
                                                              className="text-xs h-6"
                                                            />
                                                            <Textarea
                                                              value={editingItem.data.description || ''}
                                                              onChange={e => setEditingItem({
                                                                ...editingItem,
                                                                data: { ...editingItem.data, description: e.target.value }
                                                              })}
                                                              placeholder="Step description"
                                                              rows={1}
                                                              className="text-xs"
                                                            />
                                                          </div>
                                                        ) : (
                                                          <div>
                                                            <p className="text-xs font-medium flex items-center gap-2">
                                                              {step.step}
                                                              {stepIsStandard && !isEditingStandardProject && (
                                                                <Badge variant="secondary" className="text-xs">Standard 🔒</Badge>
                                                              )}
                                                            </p>
                                                            {step.description && (
                                                              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                      
                                                      {/* Button visibility for steps */}
                                                      {!isReadOnly && !phaseIsLinked && (
                                                        <>
                                                          {isStepEditing ? (
                                                            <>
                                                              <Button size="sm" onClick={saveEdit}>
                                                                <Check className="w-3 h-3" />
                                                              </Button>
                                                              <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                                                <X className="w-3 h-3" />
                                                              </Button>
                                                            </>
                                                          ) : (
                                                            <>
                                                              {(!stepIsStandard || isEditingStandardProject) && (
                                                                <>
                                                                  <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleMoveStepUp(step.id, operation.id, phase.id)}
                                                                    disabled={stepIndex === 0}
                                                                    title="Move up"
                                                                  >
                                                                    <ChevronUp className="w-3 h-3" />
                                                                  </Button>
                                                                  <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleMoveStepDown(step.id, operation.id, phase.id)}
                                                                    disabled={stepIndex === operation.steps.length - 1}
                                                                    title="Move down"
                                                                  >
                                                                    <ChevronDown className="w-3 h-3" />
                                                                  </Button>
                                                                  <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => startEdit('step', step.id, step)}
                                                                  >
                                                                    <Edit className="w-3 h-3" />
                                                                  </Button>
                                                                  <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteStep(step.id)}
                                                                  >
                                                                    <Trash2 className="w-3 h-3" />
                                                                  </Button>
                                                                </>
                                                              )}
                                                            </>
                                                          )}
                                                        </>
                                                      )}
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              );
                                            })}
                                          </div>
                                        </CardContent>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

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
              onClick={() => {
                if (phaseToDelete) {
                  handleDeletePhase(phaseToDelete);
                }
              }}
              disabled={isDeletingPhase}
              className="bg-red-600 hover:bg-red-700"
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
      <DecisionTreeManager 
        open={showDecisionTreeManager} 
        onOpenChange={setShowDecisionTreeManager} 
        currentProject={currentProject} 
      />
      
      {/* Phase Incorporation Dialog */}
      <PhaseIncorporationDialog 
        open={showIncorporationDialog} 
        onOpenChange={setShowIncorporationDialog}
        onIncorporatePhase={async (phaseToIncorporate) => {
          if (!currentProject?.id) {
            toast.error('No project selected');
            return;
          }
          
          try {
            // Check if phase with same name already exists
            const { data: existingPhases } = await supabase
              .from('project_phases')
              .select('name')
              .eq('project_id', currentProject.id)
              .eq('name', phaseToIncorporate.name);
            
            if (existingPhases && existingPhases.length > 0) {
              toast.error(`A phase named "${phaseToIncorporate.name}" already exists in this project`);
              return;
            }
            
            // Get the source phase ID from the source project
            const { data: sourcePhase } = await supabase
              .from('project_phases')
              .select('id')
              .eq('project_id', phaseToIncorporate.sourceProjectId)
              .eq('name', phaseToIncorporate.name)
              .single();
            
            if (!sourcePhase?.id) {
              toast.error('Source phase not found');
              return;
            }
            
            // Get current phase count to determine position
            const { count: phaseCount } = await supabase
              .from('project_phases')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', currentProject.id);
            
            const totalPhases = phaseCount || 0;
            
            // Create incorporated phase record
            // Store source information in description (temporary solution)
            // The get_project_workflow_with_standards function should handle this
            const incorporatedDescription = phaseToIncorporate.description 
              ? `${phaseToIncorporate.description}\n\n[Incorporated from: ${phaseToIncorporate.sourceProjectName} (Revision ${phaseToIncorporate.incorporatedRevision})]`
              : `[Incorporated from: ${phaseToIncorporate.sourceProjectName} (Revision ${phaseToIncorporate.incorporatedRevision})]`;
            
            // Determine position rule and value
            const positionRule = totalPhases > 0 ? 'last_minus_n' : 'first';
            const positionValue = totalPhases > 0 ? 1 : null; // 1 means before the last one
            
            const { data: newPhase, error: insertError } = await supabase
              .from('project_phases')
              .insert({
                project_id: currentProject.id,
                name: phaseToIncorporate.name,
                description: incorporatedDescription,
                is_standard: false,
                position_rule: positionRule,
                position_value: positionValue
                // Note: standard_phase_id removed, use is_standard flag instead
              })
              .select('id')
              .single();
            
            if (insertError) {
              throw insertError;
            }
            
            // Create reference operations that point to source operations
            // Get operations from source phase
            const { data: sourceOperations } = await supabase
              .from('template_operations')
              .select('id, name, description, display_order, flow_type')
              .eq('phase_id', sourcePhase.id)
              .order('display_order', { ascending: true });
            
            if (sourceOperations && sourceOperations.length > 0) {
              for (const sourceOp of sourceOperations) {
                // Create reference operation
                const { error: opError } = await supabase
                  .from('template_operations')
                  .insert({
                    project_id: currentProject.id,
                    phase_id: newPhase.id,
                    operation_name: sourceOp.operation_name || sourceOp.name,  // Changed from name
                    operation_description: sourceOp.operation_description || sourceOp.description,  // Changed from description
                    flow_type: sourceOp.flow_type || 'prime',
                    display_order: sourceOp.display_order,
                    source_operation_id: sourceOp.id,
                    is_reference: true
                    // Note: is_standard_phase, custom_phase_name, and custom_phase_description removed
                  });
                
                if (opError) {
                  console.error('Error creating reference operation:', opError);
                }
              }
            }
            
            // Reload phases
            const sortedPhases = await reloadPhasesWithPositions(currentProject.id);
            loadedProjectIdRef.current = null;
            setPhases(sortedPhases);
            
            setShowIncorporationDialog(false);
            toast.success(`Phase "${phaseToIncorporate.name}" incorporated successfully`);
          } catch (error: any) {
            console.error('Error incorporating phase:', error);
            toast.error(`Failed to incorporate phase: ${error.message || 'Unknown error'}`);
          }
        }}
      />
    </div>
  );
};
