import { useState, useEffect, useCallback, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Tool, Material, Output, ContentSection, Phase, Operation, Project, AppReference } from '@/interfaces/Project';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MultiContentEditor } from '@/components/MultiContentEditor';
import { MultiContentRenderer } from '@/components/MultiContentRenderer';
import { StepTypeSelector } from '@/components/StepTypeSelector';
import { ToolsMaterialsWindow } from '@/components/ToolsMaterialsWindow';
import { RiskManagementWindow } from '@/components/RiskManagementWindow';
import { DecisionTreeManager } from '@/components/DecisionTreeManager';
import { MultiSelectLibraryDialog } from '@/components/MultiSelectLibraryDialog';
import { StructureManager } from '@/components/StructureManager';
import { OutputEditForm } from '@/components/OutputEditForm';
import { ProjectContentImport } from '@/components/ProjectContentImport';
import { CompactToolsTable } from '@/components/CompactToolsTable';
import { CompactMaterialsTable } from '@/components/CompactMaterialsTable';
import { CompactProcessVariablesTable } from '@/components/CompactProcessVariablesTable';
import { CompactOutputsTable } from '@/components/CompactOutputsTable';
import { CompactTimeEstimation } from '@/components/CompactTimeEstimation';
import { CompactAppsSection } from '@/components/CompactAppsSection';
import { AppsLibraryDialog } from '@/components/AppsLibraryDialog';
import { ArrowLeft, Eye, Edit, Package, Wrench, FileOutput, Plus, X, Settings, Save, ChevronLeft, ChevronRight, FileText, List, Upload, Trash2, Brain, Sparkles, RefreshCw, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDynamicPhases } from '@/hooks/useDynamicPhases';
import { enforceStandardPhaseOrdering } from '@/utils/phaseOrderingUtils';

// Extended interfaces for step-level usage
interface StepMaterial extends Material {
  quantity?: number;
  purpose?: string;
}
interface StepTool extends Tool {
  quantity?: number;
  purpose?: string;
}
interface EditWorkflowViewProps {
  onBackToAdmin: () => void;
}
export default function EditWorkflowView({
  onBackToAdmin
}: EditWorkflowViewProps) {
  const {
    currentProject,
    updateProject
  } = useProject();

  // Fetch dynamic phases for template projects (not Standard Project Foundation)
  const { phases: dynamicPhases, loading: dynamicPhasesLoading } = useDynamicPhases(
    currentProject?.id !== '00000000-0000-0000-0000-000000000001' ? currentProject?.id : undefined
  );

  // Use the same data source as StructureManager to ensure consistency
  // StructureManager uses currentProject?.phases directly, so we should too
  // This ensures both views show the exact same phases in the same order
  // Note: We still fetch dynamic phases for potential future use, but prioritize stored phases for consistency
  let rawPhases: Phase[] = [];
  if (currentProject?.id === '00000000-0000-0000-0000-000000000001') {
    // Standard Project Foundation: use stored phases
    rawPhases = currentProject?.phases || [];
  } else {
    // Template project: use stored phases from currentProject to match StructureManager
    // This ensures both views show the same phases
    rawPhases = currentProject?.phases || [];
  }

  // Detect if editing Standard Project Foundation
  const isEditingStandardProject = currentProject?.id === '00000000-0000-0000-0000-000000000001' || currentProject?.isStandardTemplate;

  // Helper to check if a phase is standard by name
  const isStandardPhase = (phaseName: string) => {
    return ['Kickoff', 'Planning', 'Ordering', 'Close Project'].includes(phaseName);
  };

  // Helper to check if current step is from a standard or incorporated phase
  const isStepFromStandardOrIncorporatedPhase = () => {
    if (!currentStep || isEditingStandardProject) return false;
    
    // Check if step itself is marked as standard
    if (currentStep.isStandard) return true;
    
    // Check if the phase containing this step is standard or incorporated
    const phaseName = currentStep.phaseName;
    if (!phaseName) return false;
    
    const phase = phases.find(p => p.name === phaseName);
    if (!phase) return false;
    
    // Check if phase is standard or incorporated (linked)
    return phase.isStandard === true || phase.isLinked === true || isStandardPhase(phaseName);
  };

  // Debug log to check phases and show helpful message if empty
  useEffect(() => {
    if (currentProject) {
      const hasPhases = phases && phases.length > 0;
      const hasOperations = hasPhases && phases.some(p => p.operations && p.operations.length > 0);
      
      console.log('🔍 EditWorkflowView - Project loaded:', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        isEditingStandardProject,
        usingDynamicPhases: currentProject.id !== '00000000-0000-0000-0000-000000000001' && dynamicPhases.length > 0,
        hasPhases,
        hasOperations,
        phaseCount: phases?.length || 0,
        phases: phases?.map(p => ({
          name: p.name,
          isStandard: p.isStandard,
          operationCount: p.operations?.length || 0
        }))
      });

      // Show warning if no phases
      if (!hasPhases && !dynamicPhasesLoading) {
        toast.error('This project has no phases. The project data may be corrupted.');
      } else if (!hasOperations && !dynamicPhasesLoading) {
        toast.error('This project has phases but no operations. The project structure may be incomplete.');
      }
    }
  }, [currentProject?.id, isEditingStandardProject, phases, dynamicPhases.length, dynamicPhasesLoading]);
  const [viewMode, setViewMode] = useState<'steps' | 'structure'>('steps');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingOutput, setEditingOutput] = useState<Output | null>(null);
  const [outputEditOpen, setOutputEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);
  const [toolsLibraryOpen, setToolsLibraryOpen] = useState(false);
  const [materialsLibraryOpen, setMaterialsLibraryOpen] = useState(false);
  const [appsLibraryOpen, setAppsLibraryOpen] = useState(false);
  const [showStructureManager, setShowStructureManager] = useState(false);
  const [processImprovementOpen, setProcessImprovementOpen] = useState(false);
  const [decisionTreeOpen, setDecisionTreeOpen] = useState(false);
  const [instructionLevel, setInstructionLevel] = useState<'quick' | 'detailed' | 'new_user'>('detailed');
  const [levelSpecificContent, setLevelSpecificContent] = useState<ContentSection[] | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [pendingContentChanges, setPendingContentChanges] = useState<ContentSection[] | null>(null);
  const [pendingContentLevel, setPendingContentLevel] = useState<'quick' | 'detailed' | 'new_user'>('detailed');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<Date>(new Date());
  const pendingContentRef = useRef<{ changes: ContentSection[] | null; level: 'quick' | 'detailed' | 'new_user' }>({ 
    changes: null, 
    level: 'detailed' 
  });
  const editingStepRef = useRef<WorkflowStep | null>(null);

  // Structure editing state
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [editingStructureStep, setEditingStructureStep] = useState<WorkflowStep | null>(null);
  const [showAddDialog, setShowAddDialog] = useState<{
    type: 'phase' | 'operation' | 'step';
    parentId?: string;
  } | null>(null);

  
  // Apply standard phase ordering to match Structure Manager
  // This ensures the workflow editor shows phases in the same order as structure manager
  // Also deduplicate phases like StructureManager does
  const deduplicatePhases = (phases: Phase[]): Phase[] => {
    const seen = new Set<string>();
    const result: Phase[] = [];
    for (const phase of phases) {
      // Use ID for deduplication, with special handling for linked phases
      const key = phase.isLinked ? `${phase.id}-${phase.sourceProjectId}` : phase.id;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(phase);
      }
    }
    return result;
  };
  
  const deduplicatedPhases = deduplicatePhases(rawPhases);
  const displayPhases = enforceStandardPhaseOrdering(deduplicatedPhases);

  // Debug logging
  useEffect(() => {
    if (currentProject) {
      console.log('🔍 EditWorkflowView - currentProject loaded:', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        phaseCount: phases?.length,
        phases: phases?.map(p => ({
          name: p.name,
          operationCount: p.operations?.length,
          operations: p.operations?.map(op => ({
            name: op.name,
            stepCount: op.steps?.length,
            steps: op.steps?.map(s => s.step)
          }))
        }))
      });
    }
  }, [currentProject?.id, phases]);

  // Flatten all steps from all phases and operations for navigation
  const allSteps = displayPhases.flatMap(phase => phase.operations.flatMap(operation => operation.steps.map(step => ({
    ...step,
    phaseName: phase.name,
    operationName: operation.name,
    phaseId: phase.id,
    operationId: operation.id
  }))));
  console.log('🔍 EditWorkflowView - allSteps flattened:', {
    totalSteps: allSteps.length,
    steps: allSteps.map(s => `${s.phaseName} > ${s.operationName} > ${s.step}`)
  });
  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? (currentStepIndex + 1) / allSteps.length * 100 : 0;
  useEffect(() => {
    if (currentStep && (!editingStep || editingStep.id !== currentStep.id)) {
      setEditingStep({
        ...currentStep
      });
      editingStepRef.current = currentStep;
    }
  }, [currentStep?.id]);

  // Save instruction content to database - stable version using refs
  const saveInstructionContentStable = useCallback(async (
    sections: ContentSection[] | null, 
    targetLevel: 'quick' | 'detailed' | 'new_user',
    silent: boolean = false
  ) => {
    const stepId = editingStepRef.current?.id;
    if (!stepId || !sections) return;
    
    try {
      if (!silent) {
        console.log(`💾 Saving content to level: ${targetLevel}`, { 
          stepId,
          sectionCount: sections.length 
        });
      }
      
      const { error } = await supabase
        .from('step_instructions')
        .upsert({
          template_step_id: stepId,
          instruction_level: targetLevel,
          content: sections as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'template_step_id,instruction_level'
        });

      if (error) {
        console.error('Error saving instruction content:', error);
        if (!silent) {
          toast.error('Failed to save content');
        }
      } else {
        // Only clear pending changes if we saved the current pending level
        if (targetLevel === pendingContentRef.current.level) {
          setPendingContentChanges(null);
          pendingContentRef.current.changes = null;
        }
        if (!silent) {
          console.log(`✅ ${targetLevel} content saved successfully`);
        }
      }
    } catch (err) {
      console.error('Exception saving instruction content:', err);
      if (!silent) {
        toast.error('Failed to save content');
      }
    }
  }, []);

  // Load instruction content based on selected level - stable version
  const loadInstructionContent = useCallback(async () => {
    const stepId = editingStepRef.current?.id;
    if (!stepId || !editMode) return;
    
    // Save pending changes from ref to their ORIGINAL level before loading new level (silent)
    if (pendingContentRef.current.changes && pendingContentRef.current.level) {
      console.log(`💾 Saving pending changes for level: ${pendingContentRef.current.level} before switching to: ${instructionLevel}`);
      await saveInstructionContentStable(pendingContentRef.current.changes, pendingContentRef.current.level, true);
      lastSaveRef.current = new Date();
      pendingContentRef.current = { changes: null, level: instructionLevel };
      setPendingContentChanges(null);
    }
    
    setIsLoadingContent(true);
    console.log(`📥 Loading content for level: ${instructionLevel}`);
    
    try {
      const { data, error } = await supabase
        .from('step_instructions')
        .select('content')
        .eq('template_step_id', stepId)
        .eq('instruction_level', instructionLevel)
        .maybeSingle();

      if (error) {
        console.error('Error loading instruction content:', error);
        setLevelSpecificContent(null);
        setPendingContentLevel(instructionLevel);
        pendingContentRef.current.level = instructionLevel;
      } else if (data?.content) {
        // Content is stored as Json, convert to ContentSection[]
        const content = Array.isArray(data.content) ? data.content as unknown as ContentSection[] : null;
        setLevelSpecificContent(content);
        setPendingContentLevel(instructionLevel);
        pendingContentRef.current.level = instructionLevel;
        console.log(`✅ Loaded ${content?.length || 0} sections for ${instructionLevel}`);
      } else {
        setLevelSpecificContent(null);
        setPendingContentLevel(instructionLevel);
        pendingContentRef.current.level = instructionLevel;
        console.log(`ℹ️ No content found for ${instructionLevel} level`);
      }
    } catch (err) {
      console.error('Exception loading instruction content:', err);
      setLevelSpecificContent(null);
      setPendingContentLevel(instructionLevel);
      pendingContentRef.current.level = instructionLevel;
    } finally {
      setIsLoadingContent(false);
    }
  }, [instructionLevel, editMode, saveInstructionContentStable]);

  // Load content when instruction level changes or step changes
  useEffect(() => {
    if (editMode) {
      loadInstructionContent();
    }
  }, [instructionLevel, editingStep?.id, editMode, loadInstructionContent]);

  // Debounced auto-save - only saves after 60 seconds of complete inactivity
  useEffect(() => {
    if (!editMode || !pendingContentChanges || !pendingContentLevel) {
      return;
    }
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    
    // Set up new timeout that only fires after 60 seconds of no changes
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Only save if content hasn't been saved recently (prevent duplicate saves)
      const timeSinceLastSave = new Date().getTime() - lastSaveRef.current.getTime();
      if (timeSinceLastSave > 5000 && pendingContentRef.current.changes) {
        console.log(`⏰ Auto-saving content for level: ${pendingContentRef.current.level} after 60s inactivity`);
        saveInstructionContentStable(pendingContentRef.current.changes, pendingContentRef.current.level, true);
        lastSaveRef.current = new Date();
        pendingContentRef.current = { changes: null, level: pendingContentRef.current.level };
        setPendingContentChanges(null);
      }
    }, 60000); // 60 seconds
    
    // Cleanup function
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [editMode, pendingContentChanges, pendingContentLevel]); // Removed saveInstructionContent from deps

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const handleNext = () => {
    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setEditMode(false);
    }
  };
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setEditMode(false);
    }
  };
  const handleStartEdit = () => {
    // Check if this step is standard
    if (!isEditingStandardProject && currentStep?.isStandard) {
      toast('Cannot edit standard steps. Only custom steps can be edited in this project.');
      return;
    }
    
    setEditMode(true);
    const stepToEdit = { ...currentStep };
    setEditingStep(stepToEdit);
    editingStepRef.current = stepToEdit;
  };
  const handleCancelEdit = () => {
    setEditMode(false);
    const stepToEdit = { ...currentStep };
    setEditingStep(stepToEdit);
    editingStepRef.current = stepToEdit;
  };
  const handleSaveEdit = async () => {
    if (!editingStep || !currentProject) {
      console.error('SaveEdit: Missing data', {
        editingStep: !!editingStep,
        currentProject: !!currentProject
      });
      return;
    }
    console.log('💾 SaveEdit: Starting save with:', {
      stepId: editingStep.id,
      stepName: editingStep.step,
      contentSections: editingStep.contentSections?.length || 0,
      hasContent: !!editingStep.content,
      appsCount: editingStep.apps?.length || 0,
      apps: editingStep.apps
    });

    // Save pending content changes to correct level first (silent)
    if (pendingContentRef.current.changes && pendingContentRef.current.level) {
      console.log(`💾 Saving pending changes for level: ${pendingContentRef.current.level} before closing edit mode`);
      await saveInstructionContentStable(pendingContentRef.current.changes, pendingContentRef.current.level, true);
      lastSaveRef.current = new Date();
      pendingContentRef.current = { changes: null, level: 'detailed' };
      setPendingContentChanges(null);
    }

    // Update only custom phases (standard phases are generated dynamically)
    const updatedProject = {
      ...currentProject,
      phases: phases.map(phase => ({
        ...phase,
        operations: phase.operations.map(operation => ({
          ...operation,
          steps: operation.steps.map(step => step.id === editingStep.id ? editingStep : step)
        }))
      })),
      updatedAt: new Date()
    };
    
    console.log('SaveEdit: Calling updateProject');
    updateProject(updatedProject);
    
    // If editing Standard Project Foundation, also update template_steps table
    if (isEditingStandardProject) {
      console.log('💾 SaveEdit: Also updating template_steps table for Standard Project');
      try {
        const { error } = await supabase
          .from('template_steps')
          .update({
            step_title: editingStep.step,
            step_number: (editingStep as any).stepNumber || 0,
            description: editingStep.description,
            content_sections: (editingStep.contentSections || editingStep.content) as any,
            materials: editingStep.materials || [] as any,
            tools: editingStep.tools || [] as any,
            outputs: editingStep.outputs || [] as any,
            apps: editingStep.apps || [] as any,
            estimated_time_minutes: (editingStep as any).estimated_time || 0,
            flow_type: (editingStep as any).flowType || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingStep.id);
        
        if (error) {
          console.error('SaveEdit: Error updating template_steps:', error);
          toast.error("Warning: Step saved to project but failed to sync to template. Changes may not appear in new projects.");
        } else {
          console.log('SaveEdit: Successfully synced to template_steps');
          toast.success('Step saved to Standard Project');
        }
      } catch (err) {
        console.error('SaveEdit: Exception updating template_steps:', err);
        toast.error('Failed to save standard project changes');
      }
    }
    
    setEditMode(false);
    console.log('SaveEdit: Completed successfully');
  };
  const handleEditOutput = (output: Output) => {
    setEditingOutput(output);
    setOutputEditOpen(true);
  };
  const handleSaveOutput = (updatedOutput: Output) => {
    if (!editingOutput || !currentProject || !editingStep) return;

    // Find the output in the current editing step and update it
    const outputIndex = editingStep.outputs.findIndex(o => o.id === updatedOutput.id);
    if (outputIndex !== -1) {
      const updatedOutputs = [...editingStep.outputs];
      updatedOutputs[outputIndex] = updatedOutput;
      updateEditingStep('outputs', updatedOutputs);
    }
    setOutputEditOpen(false);
    setEditingOutput(null);
  };
  const handleAddStepInput = (inputName: string) => {
    if (!editingStep || !inputName.trim()) return;

    // Check if input already exists
    const existingInput = editingStep.inputs?.find(input => input.name === inputName.trim());
    if (existingInput) return;

    // Add new input to step
    const newInput = {
      id: `input-${Date.now()}-${Math.random()}`,
      name: inputName.trim(),
      type: 'text' as const,
      required: false
    };
    updateEditingStep('inputs', [...(editingStep.inputs || []), newInput]);
  };
  const updateEditingStep = (field: keyof WorkflowStep, value: any) => {
    if (!editingStep) {
      console.error('updateEditingStep: No editingStep found');
      return;
    }
    console.log('updateEditingStep:', {
      field,
      valueType: typeof value,
      hasValue: !!value
    });
    const updated = {
      ...editingStep,
      [field]: value
    };
    setEditingStep(updated);
    editingStepRef.current = updated;
  };

  // Handle import functionality
  const handleImport = (importedPhases: Phase[]) => {
    if (!currentProject) return;
    const updatedProject = {
      ...currentProject,
      phases: [...phases, ...importedPhases],
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success(`Imported ${importedPhases.length} phases successfully`);
  };
  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;
    console.log('🎨 EditWorkflowView renderContent:', {
      stepId: step.id,
      stepName: step.step,
      hasContentSections: !!step.contentSections,
      contentSectionsLength: step.contentSections?.length,
      contentSections: step.contentSections,
      contentType: (step as any).contentType,
      editMode,
      instructionLevel,
      levelSpecificContent: levelSpecificContent?.length
    });
    if (editMode && editingStep) {
      // Use level-specific content if available, otherwise use default step content
      let contentSections: ContentSection[] = [];
      
      if (isLoadingContent) {
        return <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Loading {instructionLevel} level content...</p>
        </div>;
      }
      
      try {
        // Use pending changes if available, otherwise use loaded content
        if (pendingContentChanges) {
          contentSections = pendingContentChanges;
        } else if (levelSpecificContent && levelSpecificContent.length > 0) {
          contentSections = levelSpecificContent;
        } else if (editingStep.contentSections) {
          contentSections = editingStep.contentSections;
        } else if (editingStep.content) {
          // Migrate existing content to new format
          const contentStr = typeof editingStep.content === 'string' ? editingStep.content : '';
          contentSections = [{
            id: `section-${Date.now()}`,
            type: 'text',
            content: contentStr,
            title: '',
            width: 'full',
            alignment: 'left'
          }];
        }
      } catch (e) {
        contentSections = [];
      }
      
      return <div className="space-y-6">
          <MultiContentEditor 
            sections={contentSections} 
            onChange={(sections) => {
              // Track both the changes and which level they belong to
              setPendingContentChanges(sections);
              setPendingContentLevel(instructionLevel);
              pendingContentRef.current = { changes: sections, level: instructionLevel };
            }} 
          />
        </div>;
    }

    // Render multi-content sections if available, otherwise fallback to legacy
    if (step.contentSections && step.contentSections.length > 0) {
      return <MultiContentRenderer sections={step.contentSections} />;
    }

    // Handle case where content might be an array (content_sections)
    if (Array.isArray(step.content) && step.content.length > 0) {
      return <MultiContentRenderer sections={step.content} />;
    }

    // Fallback for steps with legacy string content
    if (typeof step.content === 'string' && step.content.trim()) {
      return <div className="text-muted-foreground whitespace-pre-wrap">
          {step.content}
        </div>;
    }

    // Show empty state only if truly no content
    return <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <p className="text-muted-foreground">No content available. Edit this step to add content.</p>
      </div>;
  };

  // Group steps by phase and operation for sidebar navigation
  const groupedSteps = displayPhases.reduce((acc, phase) => {
    acc[phase.name] = phase.operations.reduce((opAcc, operation) => {
      opAcc[operation.name] = operation.steps;
      return opAcc;
    }, {} as Record<string, any[]>);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);
  if (!currentProject) {
    return <div className="fixed inset-0 bg-background overflow-auto z-50 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No project selected</p>
          </CardContent>
        </Card>
      </div>;
  }
  if (viewMode === 'structure') {
    return <div className="fixed inset-0 bg-background overflow-auto z-50">
        {/* Header with Back Button and View Toggle */}
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Project Manager
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button onClick={() => setViewMode('structure')} variant="default" size="sm" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Structure Manager
                </Button>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Structure Mode
              </Badge>
            </div>
          </div>
        </div>

        <div className="w-full px-6">
          <StructureManager onBack={() => setViewMode('steps')} />
        </div>
      </div>;
  }
  if (allSteps.length === 0) {
    const hasPhases = displayPhases.length > 0;
    const hasOperations = hasPhases && displayPhases.some(p => p.operations && p.operations.length > 0);
    
    return <div className="fixed inset-0 bg-background overflow-auto z-50">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Project Manager
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button onClick={() => setViewMode('structure')} variant={'default'} size="sm" className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Structure Manager
                </Button>
              </div>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Project Structure Setup Required</CardTitle>
              <CardDescription>
                This project needs workflow steps to be added
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">Current Status:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Phases: {hasPhases ? `✓ ${displayPhases.length} phases found` : '✗ No phases'}</li>
                  <li>Operations: {hasOperations ? '✓ Operations exist' : '✗ No operations in phases'}</li>
                  <li>Steps: ✗ No workflow steps</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm">
                  {!hasPhases && "This project has no phases. "}
                  {hasPhases && !hasOperations && "This project has phases but no operations. "}
                  {hasOperations && "This project has operations but no steps. "}
                  Use the Structure Manager to build your project workflow.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => setViewMode('structure')} className="flex items-center gap-2 flex-1">
                  <List className="w-4 h-4" />
                  Open Structure Manager
                </Button>
                <Button onClick={onBackToAdmin} variant="outline">
                  Back to Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  return <div className="fixed inset-0 bg-background overflow-auto z-50">
      {/* Header with Project Name and Controls */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {isEditingStandardProject ? '🔒 Standard Project Foundation Editor' : `Workflow Editor: ${currentProject?.name || 'Untitled Project'}`}
              </h1>
              {!isEditingStandardProject && dynamicPhasesLoading && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Loading workflow with latest standard phases...</span>
                  </div>
                </div>
              )}
              {!isEditingStandardProject && (
                <p className="text-xs text-muted-foreground mt-2">
                  Standard and incorporated phases must be edited outside this template.
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {editMode && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Editing: {currentStep?.step}
                </Badge>}
                <div className="flex gap-2">
                {editMode ? <>
                    <Button onClick={handleSaveEdit} size="icon" variant="outline" title="Save Changes">
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleCancelEdit} size="icon" variant="outline" title="Cancel">
                      <X className="w-4 h-4" />
                    </Button>
                  </> : <>
                    <Button onClick={() => setViewMode('structure')} variant="outline" size="sm" className="flex items-center gap-2">
                      <List className="w-4 h-4" />
                      Structure Manager
                    </Button>
                    <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Import
                    </Button>
                     <Button onClick={() => setProcessImprovementOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                       <Brain className="w-4 h-4" />
                       Process Improvement
                     </Button>
                     <Button onClick={() => setRiskManagementOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                       <Shield className="w-4 h-4" />
                       Risk Management
                     </Button>
                      <Button 
                        onClick={() => {
                          onBackToAdmin();
                        }} 
                        variant="default" 
                        size="sm" 
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save and Close
                      </Button>
                   </>}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        {editMode ?
      // Full-screen edit mode
      <div className="space-y-6">

            {/* Step Details */}
            {editingStep && <div className="space-y-6">
                {/* Basic Info */}
                <Card className="gradient-card border-0 shadow-card">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {currentStep?.phaseName}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline">
                        {currentStep?.operationName}
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="step-title" className="text-base font-medium">Step Title</Label>
                        <Input id="step-title" value={editingStep.step} onChange={e => updateEditingStep('step', e.target.value)} className="text-2xl font-bold mt-2" placeholder="Step title..." />
                      </div>
                      <div>
                        <Label htmlFor="step-description" className="text-base font-medium">Description</Label>
                        <Textarea id="step-description" value={editingStep.description || ''} onChange={e => updateEditingStep('description', e.target.value)} placeholder="Step description..." className="mt-2" rows={3} />
                      </div>
                      <div>
                        <StepTypeSelector 
                          value={editingStep.stepType} 
                          onValueChange={value => updateEditingStep('stepType', value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm text-muted-foreground">Flow Type</Label>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDecisionTreeOpen(true)}
                            className="h-7 text-xs"
                          >
                            Open Decision Tree Manager
                          </Button>
                        </div>
                        <div className="p-2 bg-muted rounded-md text-sm">
                          {editingStep.flowType === 'alternate' && (
                            <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
                              Alternate - Decision point in workflow
                            </Badge>
                          )}
                          {editingStep.flowType === 'if-necessary' && (
                            <Badge variant="secondary" className="bg-gray-500/10 text-gray-700 border-gray-500/20">
                              If Necessary - Conditional operation
                            </Badge>
                          )}
                          {!['alternate', 'if-necessary'].includes(editingStep.flowType || '') && (
                            <span className="text-muted-foreground text-xs">
                              This step is part of the main workflow path
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Content Editor */}
                <Card className="gradient-card border-0 shadow-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle>Step Content</CardTitle>
                        <CardDescription>Add instructions, images, videos, and other content for this step</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium whitespace-nowrap">Instruction Level:</Label>
                        <Select value={instructionLevel} onValueChange={(value: 'quick' | 'detailed' | 'new_user') => setInstructionLevel(value)}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="quick">Quick</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                            <SelectItem value="new_user">New User</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {renderContent(currentStep)}
                  </CardContent>
                </Card>

                {/* Apps Section */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Apps & Tools
                    </CardTitle>
                    
                  </CardHeader>
                  <CardContent>
                    <CompactAppsSection apps={editingStep.apps || []} onAppsChange={apps => {
                console.log('📱 Apps changed:', {
                  count: apps.length,
                  apps
                });
                updateEditingStep('apps', apps);
              }} onAddApp={() => setAppsLibraryOpen(true)} onLaunchApp={() => {}} editMode={true} />
                  </CardContent>
                </Card>

                {/* Tools, Materials, Inputs, and Outputs */}
                <div className="grid lg:grid-cols-1 gap-6">
                  {/* Tools & Materials Card */}
                  <Card className="bg-muted/30 border shadow-sm">
                    <CardHeader>
                      <CardTitle>Tools & Materials</CardTitle>
                      <CardDescription>Manage tools and materials for this step</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CompactToolsTable tools={editingStep.tools} onToolsChange={tools => updateEditingStep('tools', tools)} onAddTool={() => setToolsLibraryOpen(true)} />
                      
                      <CompactMaterialsTable materials={editingStep.materials} onMaterialsChange={materials => updateEditingStep('materials', materials)} onAddMaterial={() => setMaterialsLibraryOpen(true)} />
                    </CardContent>
                  </Card>

                {/* Process Variables Card */}
                  <Card className="bg-muted/30 border shadow-sm">
                    <CardHeader>
                       <CardTitle>Process Variables</CardTitle>
                       <CardDescription>Define process variables for this step</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CompactProcessVariablesTable variables={editingStep.inputs || []} onVariablesChange={variables => updateEditingStep('inputs', variables)} onAddVariable={() => {
                  const newInput = {
                    id: `input-${Date.now()}-${Math.random()}`,
                    name: '',
                    type: 'text' as const,
                    required: false
                  };
                  updateEditingStep('inputs', [...(editingStep?.inputs || []), newInput]);
                }} />
                    </CardContent>
                  </Card>

                  {/* Outputs Card */}
                  <Card className="bg-muted/30 border shadow-sm">
                    <CardHeader>
                      <CardTitle>Step Outputs</CardTitle>
                      <CardDescription>Manage outputs produced by this step</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CompactOutputsTable outputs={editingStep.outputs || []} onOutputsChange={outputs => updateEditingStep('outputs', outputs)} onAddOutput={() => {
                  const newOutput: Output = {
                    id: `output-${Date.now()}-${Math.random()}`,
                    name: 'New Output',
                    description: '',
                    type: 'none'
                  };
                  updateEditingStep('outputs', [...(editingStep?.outputs || []), newOutput]);
                }} onEditOutput={output => {
                  setEditingOutput(output);
                  setOutputEditOpen(true);
                }} />
                    </CardContent>
                  </Card>
                </div>

                {/* Time Estimation */}
                <CompactTimeEstimation step={editingStep} scalingUnit={currentProject?.scalingUnit} onChange={timeEstimation => updateEditingStep('timeEstimation', timeEstimation)} />

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button onClick={handlePrevious} disabled={currentStepIndex === 0} variant="outline">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous Step
                  </Button>
                  <Button onClick={handleNext} disabled={currentStepIndex >= allSteps.length - 1}>
                    Next Step
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>}
          </div> :
      // Normal grid layout with sidebar
      <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <Card className="lg:col-span-1 bg-muted/20 border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Workflow Steps</CardTitle>
                <CardDescription>
                  Step {currentStepIndex + 1} of {allSteps.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                <div className="space-y-4">
                  {Object.entries(groupedSteps).map(([phase, operations]) => <div key={phase} className="space-y-2">
                      <h4 className="font-semibold text-primary">{phase}</h4>
                      {Object.entries(operations).map(([operation, opSteps]) => <div key={operation} className="ml-2 space-y-1">
                          <h5 className="text-sm font-medium text-muted-foreground">{operation}</h5>
                          {opSteps.map(step => {
                    const stepIndex = allSteps.findIndex(s => s.id === step.id);
                    return <div key={step.id} className={`ml-2 p-2 rounded text-sm cursor-pointer transition-fast ${step.id === currentStep?.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted/50'}`} onClick={() => {
                      setCurrentStepIndex(stepIndex);
                      setEditMode(false);
                    }}>
                                <div className="flex items-center gap-2">
                                  <span className="truncate">{step.step}</span>
                                </div>
                              </div>;
                  })}
                        </div>)}
                    </div>)}
                </div>
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Header */}
              <Card className="bg-muted/30 border shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {currentStep?.phaseName}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline">
                          {currentStep?.operationName}
                        </Badge>
                      </div>
                      <>
                        <CardTitle className="text-2xl">{currentStep?.step}</CardTitle>
                        {currentStep?.description && <CardDescription className="text-base">
                            {currentStep.description}
                          </CardDescription>}
                      </>
                    </div>
                    <div className="flex gap-2">
                      {!isStepFromStandardOrIncorporatedPhase() && (
                        <Button onClick={handleStartEdit} variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Step
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Content */}
              <Card className="bg-muted/30 border shadow-sm">
                <CardContent className="p-8">
                  {renderContent(currentStep)}
                </CardContent>
              </Card>

              {/* Apps Section - View Mode */}
              {(() => {
            console.log('🎨 Rendering apps section:', {
              stepId: currentStep?.id,
              stepName: currentStep?.step,
              hasApps: !!currentStep?.apps,
              appsLength: currentStep?.apps?.length || 0,
              apps: currentStep?.apps
            });
            return null;
          })()}
              
              {currentStep && currentStep.apps && currentStep.apps.length > 0 && <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      Apps for This Step
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <CompactAppsSection apps={currentStep.apps} onAppsChange={() => {}} onAddApp={() => {}} onLaunchApp={() => {}} editMode={false} />
                  </CardContent>
                </Card>}

              {/* Tools, Materials, and Outputs */}
              <Card className="bg-muted/30 border shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Tools, Materials & Outputs</h3>
                  </div>
                  <Accordion type="multiple" defaultValue={["materials", "tools", "outputs"]} className="w-full">
                    {/* Materials */}
                    {currentStep?.materials?.length > 0 && <AccordionItem value="materials">
                        <AccordionTrigger className="text-lg font-semibold">
                          Materials Needed ({currentStep?.materials?.length || 0})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {currentStep.materials.map(material => <div key={material.id} className="p-3 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{material.name}</div>
                                    {material.category && <Badge variant="outline" className="text-xs mt-1">{material.category}</Badge>}
                                    {material.description && <div className="text-sm text-muted-foreground mt-1">{material.description}</div>}
                                  </div>
                                </div>
                              </div>)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                    {/* Tools */}
                    {currentStep?.tools?.length > 0 && <AccordionItem value="tools">
                        <AccordionTrigger className="text-lg font-semibold">
                          Tools Required ({currentStep?.tools?.length || 0})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {currentStep.tools.map(tool => <div key={tool.id} className="p-3 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{tool.name}</div>
                                    {tool.category && <Badge variant="outline" className="text-xs mt-1">{tool.category}</Badge>}
                                    {tool.description && <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>}
                                  </div>
                                </div>
                              </div>)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>}

                    {/* Outputs */}
                    {currentStep?.outputs?.length > 0 && <AccordionItem value="outputs">
                        <AccordionTrigger className="text-lg font-semibold">
                          Outputs ({currentStep.outputs.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {currentStep.outputs.map(output => <div key={output.id} className="p-3 bg-background/50 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                       <div className="font-medium">{output.name}</div>
                                       {output.type !== "none" && <Badge variant="outline" className="text-xs capitalize">{output.type}</Badge>}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">{output.description}</div>
                                  </div>
                                  
                                </div>
                              </div>)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>}
                  </Accordion>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button onClick={handlePrevious} disabled={currentStepIndex === 0} variant="outline">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={handleNext} disabled={currentStepIndex >= allSteps.length - 1}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>}
      </div>

      {/* Output Edit Form */}
      {editingOutput && <OutputEditForm output={editingOutput} isOpen={outputEditOpen} onClose={() => {
      setOutputEditOpen(false);
      setEditingOutput(null);
    }} onSave={handleSaveOutput} stepInputs={editingStep?.inputs || []} onAddStepInput={handleAddStepInput} />}

      {/* Import Dialog */}
      <ProjectContentImport open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
      
      {/* Process Improvement Coming Soon Dialog */}
      <Dialog open={processImprovementOpen} onOpenChange={setProcessImprovementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Process Improvement
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-center">
              Feature coming soon. This will streamline creation of process content.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setProcessImprovementOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Tools & Materials Library */}
      <ToolsMaterialsWindow open={toolsMaterialsOpen} onOpenChange={setToolsMaterialsOpen} />
      
      {/* Risk Management */}
      {currentProject && (
        <RiskManagementWindow
          open={riskManagementOpen}
          onOpenChange={setRiskManagementOpen}
          projectId={currentProject.id}
          mode="template"
        />
      )}
      
      {/* Apps Library Dialog */}
      <AppsLibraryDialog open={appsLibraryOpen} onOpenChange={setAppsLibraryOpen} selectedApps={editingStep?.apps || []} onAppsSelected={apps => updateEditingStep('apps', apps)} />
      
      <MultiSelectLibraryDialog open={toolsLibraryOpen} onOpenChange={setToolsLibraryOpen} type="tools" availableStepTools={editingStep?.tools?.map(t => ({
      id: t.id,
      name: t.name
    })) || []} onSelect={selectedItems => {
      const newTools: StepTool[] = selectedItems.map(item => ({
        id: `tool-${Date.now()}-${Math.random()}`,
        name: item.item,
        description: item.description || '',
        category: 'Hand Tool',
        alternates: [],
        quantity: item.quantity
      }));
      updateEditingStep('tools', [...(editingStep?.tools || []), ...newTools]);
    }} />
      
      <MultiSelectLibraryDialog open={materialsLibraryOpen} onOpenChange={setMaterialsLibraryOpen} type="materials" onSelect={selectedItems => {
      const newMaterials: StepMaterial[] = selectedItems.map(item => ({
        id: `material-${Date.now()}-${Math.random()}`,
        name: item.item,
        description: item.description || '',
        category: 'Consumable',
        alternates: [],
        quantity: item.quantity
      }));
      updateEditingStep('materials', [...(editingStep?.materials || []), ...newMaterials]);
    }} />

      {/* Decision Tree Manager */}
      <DecisionTreeManager 
        open={decisionTreeOpen}
        onOpenChange={setDecisionTreeOpen}
        currentProject={currentProject}
      />
    </div>;
}