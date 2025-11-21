import React, { useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectData } from '@/contexts/ProjectDataContext';
import { WorkflowStep, Material, Tool, Output, Phase, Operation, Project } from '@/interfaces/Project';
import { ProjectSelector } from '@/components/ProjectSelector';
import ProjectRollup from '@/components/ProjectRollup';
import EditWorkflowView from '@/components/EditWorkflowView';
import EditableUserView from '@/components/EditableUserView';
import { ProjectContentImport } from '@/components/ProjectContentImport';
import { RevisionHistoryWindow } from '@/components/RevisionHistoryWindow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Plus, Check, X, ChevronRight, ChevronDown, Package, Wrench, FileOutput, Import, GripVertical, History, Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const FILTER_DESCRIPTIONS = {
  skill: "Matches your experience level. Beginner: new to projects. Intermediate: comfortable with light/medium DIY work but not advanced trades. Advanced: have delivered high-skill projects like trim, tile, electrical, or plumbing with great results.",
  effort: "Represents the physical effort required. Painting might be low effort, while demolishing an old kitchen is high effort."
} as const;

interface EditingState {
  type: 'phase' | 'operation' | 'step' | null;
  id: string | null;
  data: any;
}

interface TableRow {
  type: 'phase' | 'operation' | 'step';
  id: string;
  data: Phase | Operation | WorkflowStep;
  parentId?: string;
  level: number;
}

interface ProjectManagementWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProjectManagementWindow: React.FC<ProjectManagementWindowProps> = ({ open, onOpenChange }) => {
  const {
    currentProject,
    updateProject,
    deleteProject,
    projects,
    setCurrentProject,
    fetchProjects
  } = useProject();
  
  const { updateProjectsCache } = useProjectData();
  
  const [currentView, setCurrentView] = useState<'table' | 'editWorkflow' | 'dragdrop'>('table');
  const [editing, setEditing] = useState<EditingState>({
    type: null,
    id: null,
    data: null
  });
  const [editingProject, setEditingProject] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);

  const updateProjectData = async (updatedProject: typeof currentProject) => {
    if (updatedProject) {
      console.log('updateProjectData called with project:', updatedProject);
      console.log('Project phases being updated:', updatedProject.phases);
      await updateProject({
        ...updatedProject,
        updatedAt: new Date()
      });
    }
  };

  // Build flat table structure from hierarchical data - FIXED: Use processed phases with standard phases
  const buildTableRows = (): TableRow[] => {
    if (!currentProject || !Array.isArray(currentProject.phases)) return [];
    
    // Use the project phases directly - standard phases are saved in the database
    const processedPhases = currentProject.phases;
    
    console.log('Admin view: Building table rows with processed phases:', {
      originalPhases: currentProject.phases.map(p => p.name),
      processedPhases: processedPhases.map(p => p.name)
    });
    
    const rows: TableRow[] = [];
    processedPhases.forEach(phase => {
      rows.push({
        type: 'phase',
        id: phase.id,
        data: phase,
        level: 0
      });

      if (expandedPhases.has(phase.id)) {
        phase.operations.forEach(operation => {
          rows.push({
            type: 'operation',
            id: operation.id,
            data: operation,
            parentId: phase.id,
            level: 1
          });

          if (expandedOperations.has(operation.id)) {
            operation.steps.forEach(step => {
              rows.push({
                type: 'step',
                id: step.id,
                data: step,
                parentId: operation.id,
                level: 2
              });
            });
          }
        });
      }
    });
    return rows;
  };

  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
        const phase = currentProject?.phases.find(p => p.id === phaseId);
        phase?.operations.forEach(op => {
          setExpandedOperations(prev => {
            const newOpSet = new Set(prev);
            newOpSet.delete(op.id);
            return newOpSet;
          });
        });
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

  // Add functions
  const addPhase = () => {
    if (!currentProject) return;
    
    console.log('Adding phase - current phases:', currentProject.phases);
    
    // Ensure phases is an array and get current phases
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    
    const newPhase: Phase = {
      id: Date.now().toString(),
      name: 'New Phase',
      description: '',
      operations: [],
      isStandard: false
    };
    
    console.log('New phase created:', newPhase);
    console.log('Current phases array:', currentPhases);
    
    const updatedPhases = [...currentPhases, newPhase];
    console.log('Updated phases array:', updatedPhases);
    
    const updatedProject = {
      ...currentProject,
      phases: updatedPhases
    };
    
    console.log('Final updated project phases:', updatedProject.phases);
    updateProjectData(updatedProject);
    setEditing({
      type: 'phase',
      id: newPhase.id,
      data: { ...newPhase }
    });
    setExpandedPhases(prev => new Set([...prev, newPhase.id]));
    // Removed duplicate toast - updateProject in context already shows one
  };

  const addOperation = (phaseId: string) => {
    if (!currentProject) return;
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    
    const newOperation: Operation = {
      id: Date.now().toString(),
      name: 'New Operation',
      description: '',
      steps: []
    };
    const updatedProject = {
      ...currentProject,
      phases: currentPhases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: [...(phase.operations || []), newOperation]
      } : phase)
    };
    updateProjectData(updatedProject);
    setEditing({
      type: 'operation',
      id: newOperation.id,
      data: { ...newOperation }
    });
    setExpandedPhases(prev => new Set([...prev, phaseId]));
    setExpandedOperations(prev => new Set([...prev, newOperation.id]));
  };

  const addStep = (phaseId: string, operationId: string) => {
    if (!currentProject) return;
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      step: 'New Step',
      description: '',
      contentType: 'text',
      content: '',
      materials: [],
      tools: [],
      outputs: []
    };
    const updatedProject = {
      ...currentProject,
      phases: currentPhases.map(phase => phase.id === phaseId ? {
        ...phase,
        operations: (phase.operations || []).map(op => op.id === operationId ? {
          ...op,
          steps: [...(op.steps || []), newStep]
        } : op)
      } : phase)
    };
    updateProjectData(updatedProject);
    setEditing({
      type: 'step',
      id: newStep.id,
      data: { ...newStep }
    });
    setExpandedPhases(prev => new Set([...prev, phaseId]));
    setExpandedOperations(prev => new Set([...prev, operationId]));
  };

  // Update functions
  const updateItem = (type: string, id: string, updates: any) => {
    if (!currentProject) return;
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    let updatedProject = { ...currentProject };
    
    if (type === 'phase') {
      updatedProject.phases = currentPhases.map(phase => 
        phase.id === id ? { ...phase, ...updates } : phase
      );
    } else if (type === 'operation') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).map(op => 
          op.id === id ? { ...op, ...updates } : op
        )
      }));
    } else if (type === 'step') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).map(op => ({
          ...op,
          steps: (op.steps || []).map(step => 
            step.id === id ? { ...step, ...updates } : step
          )
        }))
      }));
    }
    updateProjectData(updatedProject);
  };

  // Delete functions
  const deleteItem = (type: string, id: string) => {
    if (!currentProject) return;
    
    // Ensure phases is an array
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    let updatedProject = { ...currentProject };
    
    if (type === 'phase') {
      updatedProject.phases = currentPhases.filter(phase => phase.id !== id);
    } else if (type === 'operation') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).filter(op => op.id !== id)
      }));
    } else if (type === 'step') {
      updatedProject.phases = currentPhases.map(phase => ({
        ...phase,
        operations: (phase.operations || []).map(op => ({
          ...op,
          steps: (op.steps || []).filter(step => step.id !== id)
        }))
      }));
    }
    updateProjectData(updatedProject);
  };

  const handleImportContent = (importedPhases: Phase[]) => {
    if (!currentProject) return;
    
    // Merge imported phases with existing ones
    const currentPhases = Array.isArray(currentProject.phases) ? currentProject.phases : [];
    const updatedProject = {
      ...currentProject,
      phases: [...currentPhases, ...importedPhases]
    };
    
    updateProjectData(updatedProject);
    
    // Expand all imported phases for visibility
    const newExpandedPhases = new Set([...expandedPhases]);
    importedPhases.forEach(phase => {
      newExpandedPhases.add(phase.id);
      phase.operations.forEach(op => {
        setExpandedOperations(prev => new Set([...prev, op.id]));
      });
    });
    setExpandedPhases(newExpandedPhases);
  };

  const createNewRevision = async () => {
    if (!currentProject) return;
    
    const revisionNotes = window.prompt('Enter revision notes and summary of changes:');
    if (revisionNotes === null) return;
    
    try {
      console.log('🔄 Creating revision from project:', currentProject.id);
      
      // Use revision function that properly handles project_phases architecture
      const { data: newRevisionId, error } = await supabase.rpc('create_project_revision_v2', {
        source_project_id: currentProject.id,
        revision_notes_text: revisionNotes || null
      });
      
      if (error) {
        console.error('Error creating revision:', error);
        toast.error('Failed to create revision');
        return;
      }
      
      // Fetch the new revision
      const { data: newRevision, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', newRevisionId)
        .single();
      
      if (fetchError || !newRevision) {
        console.error('Error fetching revision:', fetchError);
        toast.error('Revision created but failed to load');
        return;
      }
      
      // Parse phases
      const parsedPhases = typeof newRevision.phases === 'string' 
        ? JSON.parse(newRevision.phases) 
        : newRevision.phases || [];
      
      console.log('✅ Revision created with', parsedPhases.length, 'phases');
      
      toast.success(`Revision ${newRevision.revision_number} created successfully`);
      
      // Refresh projects
      fetchProjects();
      
    } catch (error) {
      console.error('❌ Error creating revision:', error);
      toast.error("Failed to create revision. Please try again.");
    }
  };

  const startEdit = (type: EditingState['type'], id: string, data: any) => {
    setEditing({ type, id, data: { ...data } });
  };

  const saveEdit = () => {
    if (!editing.type || !editing.id || !editing.data) return;
    updateItem(editing.type, editing.id, editing.data);
    setEditing({ type: null, id: null, data: null });
  };

  const cancelEdit = () => {
    setEditing({ type: null, id: null, data: null });
  };

  const getIndentStyle = (level: number) => ({
    paddingLeft: `${level * 24}px`
  });

  const renderRowContent = (row: TableRow) => {
    const isEditing = editing.type === row.type && editing.id === row.id;
    const data = row.data as any;
    const nameField = row.type === 'step' ? 'step' : 'name';
    
    switch (row.type) {
      case 'phase':
        const phase = data as Phase;
        const isPhaseExpanded = expandedPhases.has(phase.id);
        return (
          <>
            <TableCell style={getIndentStyle(row.level)}>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => togglePhaseExpansion(phase.id)} className="p-1 h-6 w-6">
                  {isPhaseExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                {isEditing ? (
                  <Input 
                    value={editing.data.name} 
                    onChange={e => setEditing(prev => ({
                      ...prev,
                      data: { ...prev.data, name: e.target.value }
                    }))} 
                    className="font-bold" 
                  />
                ) : (
                  <span className="font-bold text-lg text-primary">{phase.name}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {isEditing ? (
                <Textarea 
                  value={editing.data.description} 
                  onChange={e => setEditing(prev => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  }))} 
                />
              ) : (
                <span className="text-sm text-muted-foreground">{phase.description || 'No description'}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button size="icon" variant="outline" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <></>
                
                )}
              </div>
            </TableCell>
          </>
        );
      case 'operation':
        const operation = data as Operation;
        const isOperationExpanded = expandedOperations.has(operation.id);
        return (
          <>
            <TableCell style={getIndentStyle(row.level)}>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toggleOperationExpansion(operation.id)} className="p-1 h-6 w-6">
                  {isOperationExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
                {isEditing ? (
                  <Input 
                    value={editing.data.name} 
                    onChange={e => setEditing(prev => ({
                      ...prev,
                      data: { ...prev.data, name: e.target.value }
                    }))} 
                    className="font-medium" 
                  />
                ) : (
                  <span className="font-medium text-blue-600">{operation.name}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {isEditing ? (
                <Textarea 
                  value={editing.data.description} 
                  onChange={e => setEditing(prev => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  }))} 
                />
              ) : (
                <span className="text-sm text-muted-foreground">{operation.description || 'No description'}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button size="icon" variant="outline" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <></>
                
                )}
              </div>
            </TableCell>
          </>
        );
      case 'step':
        const step = data as WorkflowStep;
        return (
          <>
            <TableCell style={getIndentStyle(row.level)}>
              <div className="flex items-center gap-2">
                <div className="w-6" />
                {isEditing ? (
                  <Input 
                    value={editing.data.step} 
                    onChange={e => setEditing(prev => ({
                      ...prev,
                      data: { ...prev.data, step: e.target.value }
                    }))} 
                  />
                ) : (
                  <span>{step.step}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              {isEditing ? (
                <Textarea 
                  value={editing.data.description} 
                  onChange={e => setEditing(prev => ({
                    ...prev,
                    data: { ...prev.data, description: e.target.value }
                  }))} 
                />
              ) : (
                <span className="text-sm text-muted-foreground">{step.description || 'No description'}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <Button size="icon" variant="outline" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <></>
                
                )}
              </div>
            </TableCell>
          </>
        );
      default:
        return null;
    }
  };

  const renderProjectSelector = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
              <CardTitle>Project Selection & Details</CardTitle>
              {currentProject && (
                <div className="flex items-center gap-2 mt-1">
                  <CardDescription>
                    {editingProject 
                      ? "Editing project details - make your changes below" 
                      : "Choose a project to manage and edit its details"}
                  </CardDescription>
                  {currentProject.revisionNumber && (
                    <Badge variant="outline" className="text-xs">
                      Rev {currentProject.revisionNumber}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          <div className="flex gap-2">
            {currentProject && editingProject && (
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-md">
                <Edit className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Edit Mode Active</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ProjectSelector 
          isAdminMode={true} 
          onEditProjectDetails={() => setEditingProject(true)}
        />
        {currentProject && editingProject && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Project Name</label>
                <Input 
                  value={currentProject.name} 
                  onChange={(e) => updateProjectData({...currentProject, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input 
                  value={Array.isArray(currentProject.category) ? currentProject.category.join(', ') : (currentProject.category || '')} 
                  onChange={(e) => updateProjectData({...currentProject, category: e.target.value ? e.target.value.split(',').map(c => c.trim()) : []})}
                  className="mt-1"
                  placeholder="Enter categories separated by commas"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={currentProject.description} 
                onChange={(e) => updateProjectData({...currentProject, description: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Project Challenges</label>
              <Textarea 
                value={currentProject.projectChallenges || ''} 
                onChange={(e) => updateProjectData({...currentProject, projectChallenges: e.target.value})}
                className="mt-1"
                placeholder="Describe the most difficult aspects of this project..."
              />
              <p className="text-xs text-muted-foreground mt-1">Admin field: Explain the most challenging parts of this project</p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Publish Status</label>
                <Select 
                  value={currentProject.publishStatus || 'draft'} 
                  onValueChange={(value) => updateProjectData({...currentProject, publishStatus: value as any})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                        Draft (Admin Only)
                      </div>
                    </SelectItem>
                    <SelectItem value="beta-testing">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        Beta Testing
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Published
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium">Skill Level</label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full p-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1"
                          aria-label="Skill Level info"
                        >
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        <p>{FILTER_DESCRIPTIONS.skill}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <select 
                  value={currentProject.skillLevel || ''} 
                  onChange={(e) => updateProjectData({...currentProject, skillLevel: e.target.value as any})}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-sm font-medium">Effort Level</label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full p-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1"
                          aria-label="Effort Level info"
                        >
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        <p>{FILTER_DESCRIPTIONS.effort}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <select 
                  value={currentProject.effortLevel || ''} 
                  onChange={(e) => updateProjectData({...currentProject, effortLevel: e.target.value as any})}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select effort level</option>
                  <option value="Low">Low Effort</option>
                  <option value="Medium">Medium Effort</option>
                  <option value="High">High Effort</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Estimated Time</label>
                <Input 
                  value={currentProject.estimatedTime || ''} 
                  onChange={(e) => updateProjectData({...currentProject, estimatedTime: e.target.value})}
                  className="mt-1"
                  placeholder="e.g., 0.5-1 hours per sqft"
                />
                <p className="text-xs text-muted-foreground mt-1">Time per scaling unit</p>
              </div>
            </div>
            {/* Estimated Total Time and Typical Project Size Section */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium">Estimated Total Time</label>
                <Input 
                  value={currentProject.estimatedTotalTime || ''} 
                  onChange={(e) => updateProjectData({...currentProject, estimatedTotalTime: e.target.value})}
                  className="mt-1"
                  placeholder="e.g., 40-60 hours"
                />
                <p className="text-xs text-muted-foreground mt-1">Total time for typical project size</p>
              </div>
              <div>
                <label className="text-sm font-medium">Typical Project Size</label>
                <Input 
                  type="number"
                  value={currentProject.typicalProjectSize || ''} 
                  onChange={(e) => updateProjectData({...currentProject, typicalProjectSize: e.target.value ? parseFloat(e.target.value) : undefined})}
                  className="mt-1"
                  placeholder="e.g., 100"
                />
                <p className="text-xs text-muted-foreground mt-1">Size used for estimated total time</p>
              </div>
            </div>
            {currentProject && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button 
                  onClick={async () => {
                    if (!currentProject) return;
                    
                    try {
                      // Step 1: Save phases JSONB and project fields to database
                      const { error: updateError } = await supabase
                        .from('projects')
                        .update({ 
                          phases: currentProject.phases as any,
                          estimated_time: currentProject.estimatedTime || null,
                          estimated_total_time: currentProject.estimatedTotalTime || null,
                          typical_project_size: currentProject.typicalProjectSize || null,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', currentProject.id);
                      
                      if (updateError) {
                        console.error('Error saving phases:', updateError);
                        toast.error('Failed to save changes');
                        return;
                      }
                      
                      // Step 2: Sync custom phases to template_operations tables
                      const { error: syncError } = await supabase.rpc(
                        'sync_custom_phases_to_tables',
                        { p_project_id: currentProject.id }
                      );
                      
                      if (syncError) {
                        console.error('Error syncing custom phases:', syncError);
                        toast.error('Saved but failed to sync structure');
                        return;
                      }
                      
                      console.log('✅ Custom phases synced to tables');
                      toast.success('Changes saved successfully');
                      setEditingProject(false);
                      
                      // Refresh to show updated data
                      fetchProjects();
                    } catch (error) {
                      console.error('Error saving:', error);
                      toast.error('Failed to save changes');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Done Editing
                </Button>
                <Button onClick={() => setEditingProject(false)} variant="ghost">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <div className="flex-1" />
                <Button onClick={() => createNewRevision()} variant="secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Revision
                </Button>
                <Button onClick={() => setShowRevisionHistory(true)} variant="outline">
                  <History className="w-4 h-4 mr-2" />
                  Revision History
                </Button>
                <Button 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                      try {
                        await deleteProject(currentProject.id);
                        setEditingProject(false);
                        // Keep the project management window open after deletion
                      } catch (error) {
                        console.error('Error deleting project:', error);
                      }
                    }
                  }} 
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!currentProject) {
    return (
      <ResponsiveDialog 
        open={open} 
        onOpenChange={onOpenChange}
        title="Project Management"
        size="standard-window"
      >
        <div className="overflow-y-auto flex-1 px-4 py-6">
          {renderProjectSelector()}
        </div>
      </ResponsiveDialog>
    );
  }

  // If in workflow edit mode, render full-screen
  if (currentView === 'editWorkflow' || currentView === 'dragdrop') {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <EditWorkflowView onBackToAdmin={() => setCurrentView('table')} />
      </div>
    );
  }

  const renderView = () => {
    return (
      <div className="space-y-6">
        {renderProjectSelector()}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Workflow Structure</CardTitle>
              <CardDescription>Manage the workflow structure</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button className="w-full" variant="outline" onClick={() => setCurrentView('dragdrop')}>
                Workflow Editor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildTableRows().map((row) => (
                  <TableRow key={`${row.type}-${row.id}`}>
                    {renderRowContent(row)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <ProjectContentImport
          open={showImport}
          onOpenChange={setShowImport}
          onImport={handleImportContent}
        />
        
        <RevisionHistoryWindow
          open={showRevisionHistory}
          onOpenChange={setShowRevisionHistory}
        />
      </div>
    );
  };

  return (
    <ResponsiveDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Project Management"
      size="standard-window"
    >
      <div className="overflow-y-auto flex-1 px-4 py-6">
        {renderView()}
      </div>
    </ResponsiveDialog>
  );
};