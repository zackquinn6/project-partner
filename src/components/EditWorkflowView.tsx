import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Tool, Material, Output, ContentSection, Phase, Operation, Project, AppReference, getDefaultStepContentSections } from '@/interfaces/Project';
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
import { AIProjectGenerator } from '@/components/AIProjectGenerator';
import { ArrowLeft, Eye, Edit, Package, Wrench, FileOutput, Plus, X, Settings, Save, ChevronLeft, ChevronRight, FileText, List, Upload, Trash2, Brain, Sparkles, RefreshCw, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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

  // Use the same data source and detection logic as StructureManager
  // Both components work identically for Standard Project Foundation and regular project templates
  // The only difference is isEditingStandardProject flag which controls edit permissions
  
  // Detect if editing Standard Project Foundation
  // Check both the hardcoded ID and the isStandardTemplate flag
  const isEditingStandardProject = currentProject?.isStandardTemplate || currentProject?.id === 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5';
  
  // Load phases directly from database - EXACTLY like StructureManager does
  // This ensures workflow editor and structure manager always match
  const [rawPhases, setRawPhases] = React.useState<Phase[]>([]);
  const [loadingPhases, setLoadingPhases] = React.useState(true);
  
  const loadPhasesFromDatabase = React.useCallback(async (projectId: string): Promise<Phase[]> => {
    if (!projectId) {
      return [];
    }
    
    // Check if this is the standard project by checking is_standard flag
    // Use isEditingStandardProject flag which is set based on currentProject.isStandardTemplate
    const isStandardProject = isEditingStandardProject;
    
    if (isStandardProject) {
      // Edit Standard: Read directly from project_phases table (same approach as UnifiedProjectManagement)
      // Use separate queries instead of nested selects to avoid column alias issues with new fields
      const { data: phasesData, error: phasesError } = await supabase
        .from('project_phases')
        .select(`
          id,
          name,
          description,
          position_rule,
          position_value,
          is_standard,
          is_linked,
          source_project_id
        `)
        .eq('project_id', projectId)
        .eq('is_standard', true)  // Only show standard phases when editing standard project
        .order('position_rule', { ascending: true })
        .order('position_value', { ascending: true, nullsFirst: false });
      
      if (phasesError) {
        throw new Error(`Failed to load phases: ${phasesError.message}`);
      }
      
      if (!phasesData || phasesData.length === 0) {
        return [];
      }
      
      // Load operations and steps separately for each phase to avoid nested select issues
      const phases: Phase[] = await Promise.all(phasesData.map(async (phaseData: any) => {
        // Get operations for this phase
        const { data: operations, error: operationsError } = await supabase
          .from('phase_operations')
          .select(`
            id,
            operation_name,
            operation_description,
            display_order,
            estimated_time,
            flow_type
          `)
          .eq('phase_id', phaseData.id)
          .order('display_order', { ascending: true });
        
        if (operationsError) {
          console.error(`❌ Error loading operations for phase "${phaseData.name}":`, operationsError);
        }
        
        // Get steps for each operation
        const operationsWithSteps = await Promise.all((operations || []).map(async (op: any) => {
          const { data: steps, error: stepsError } = await supabase
            .from('operation_steps')
            .select(`
              id,
              step_title,
              apps,
              description,
              content_type,
              content,
              content_sections,
              display_order,
              materials,
              tools,
              outputs,
              time_estimate_low,
              time_estimate_med,
              time_estimate_high,
              number_of_workers,
              skill_level,
              allow_content_edit
            `)
            .eq('operation_id', op.id)
            .order('display_order', { ascending: true });
          
          if (stepsError) {
            console.error(`❌ Error loading steps for operation "${op.operation_name}":`, stepsError);
          }
          
          return {
            id: op.id,
            name: op.operation_name,
            description: op.operation_description || '',
            estimatedTime: op.estimated_time || '',
            flowType: op.flow_type || 'prime',
            displayOrder: op.display_order || 0,
            isStandard: phaseData.is_standard || false,
            steps: (steps || []).map((step: any) => {
              let parsedContentSections: any[] = [];
              if (step.content_sections) {
                if (typeof step.content_sections === 'string') {
                  try {
                    parsedContentSections = JSON.parse(step.content_sections);
                  } catch (_) {
                    parsedContentSections = [];
                  }
                } else if (Array.isArray(step.content_sections)) {
                  parsedContentSections = step.content_sections;
                }
              }
              return {
                id: step.id,
                step: step.step_title,
                apps: (() => {
                  let parsedApps: any[] = [];
                  const stepApps = (step as any).apps;
                  if (stepApps) {
                    if (typeof stepApps === 'string') {
                      try {
                        parsedApps = JSON.parse(stepApps);
                      } catch (_) {
                        parsedApps = [];
                      }
                    } else if (Array.isArray(stepApps)) {
                      parsedApps = stepApps;
                    }
                  }
                  return parsedApps;
                })(),
                description: step.description || '',
                contentType: step.content_type || 'text',
                content: step.content || '',
                contentSections: parsedContentSections,
                allowContentEdit: step.allow_content_edit || false,
                displayOrder: step.display_order || 0,
                materials: step.materials || [],
                tools: step.tools || [],
                outputs: step.outputs || [],
                timeEstimation: {
                  variableTime: {
                    low: step.time_estimate_low || 0,
                    medium: step.time_estimate_med || 0,
                    high: step.time_estimate_high || 0
                  }
                },
                workersNeeded: step.number_of_workers || 1,
                skillLevel: step.skill_level || 'intermediate'
              };
            }).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
          };
        }));
        
        return {
          id: phaseData.id,
          name: phaseData.name,
          description: phaseData.description || '',
          isStandard: phaseData.is_standard || false,
          isLinked: phaseData.is_linked || false,
          sourceProjectId: phaseData.source_project_id,
          sourceProjectName: undefined,
          phaseOrderNumber: phaseData.position_rule === 'last' ? 'last'
            : (phaseData.position_rule === 'nth' && phaseData.position_value) ? phaseData.position_value
            : 999,
          operations: operationsWithSteps.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
        };
      }));
      
      return phases;
    } else {
      // Regular projects: Read directly from project_phases
      // 1. Get custom phases from current project
      // 2. Get standard phases from Standard Project Foundation
      
      // Get ALL phases for this project (both custom and standard phases that belong to this project)
      // Don't filter by is_standard - get all phases and let the code determine which are custom
      const { data: allPhasesData, error: allPhasesError } = await supabase
        .from('project_phases')
        .select(`
          id,
          name,
          description,
          is_standard,
          is_linked,
          position_rule,
          position_value,
          source_project_id
        `)
        .eq('project_id', projectId)
        .order('position_rule', { ascending: true })
        .order('position_value', { ascending: true, nullsFirst: false });
      
      // Filter to get custom phases: phases that belong to this project and are NOT standard phases from Standard Project Foundation
      // Custom phases are those where:
      // 1. is_standard = false (explicitly marked as custom)
      // 2. is_standard is null/undefined (treat as custom by default)
      // 3. is_linked = true but source_project_id is NOT the standard project (incorporated from another project)
      // We exclude phases where is_standard = true AND source_project_id = standardProjectId (these are standard phases we'll load separately)
      const customPhasesData = (allPhasesData || []).filter((phase: any) => {
        // If explicitly marked as standard AND linked from standard project, exclude it (we'll load it from standard project)
        if (phase.is_standard === true && phase.is_linked === true && phase.source_project_id === standardProjectId) {
          return false;
        }
        // All other phases belong to this project and should be shown
        return true;
      });
      
      const customError = allPhasesError;
      
      if (customError) {
        throw new Error(`Failed to load phases: ${customError.message}`);
      }
      
      // Get standard phases from Standard Project Foundation
      // Find the standard project ID first
      const { data: standardProject } = await supabase
        .from('projects')
        .select('id')
        .eq('is_standard', true)
        .single();
      
      const standardProjectId = standardProject?.id;
      
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
        .eq('project_id', standardProjectId || '00000000-0000-0000-0000-000000000001')
        .eq('is_standard', true)
        .order('position_rule', { ascending: true })
        .order('position_value', { ascending: true, nullsFirst: false });
      
      if (standardError) {
        throw new Error(`Failed to load standard phases: ${standardError.message}`);
      }
      
      // Process custom phases (including incorporated)
      const customPhases: Phase[] = await Promise.all((customPhasesData || []).map(async (phaseData: any) => {
        const isLinked = !!phaseData.source_project_id;
        let operationsWithSteps: any[] = [];
        let sourceProjectName: string | undefined;
        
        if (isLinked) {
          // For incorporated phases, fetch operations and steps from the phase itself
          const { data: sourceOperations } = await supabase
            .from('phase_operations')
            .select(`
              id,
              operation_name,
              operation_description,
              flow_type,
              display_order,
              estimated_time
            `)
            .eq('phase_id', phaseData.id)  // Use the phase's own ID, not source_phase_id
            .order('display_order');
          
          operationsWithSteps = await Promise.all((sourceOperations || []).map(async (op: any) => {
            const { data: steps, error: stepsError } = await supabase
              .from('operation_steps')
              .select(`
                id,
                step_title,
                apps,
                description,
                content_type,
                content,
                content_sections,
                display_order,
                materials,
                tools,
                outputs,
                time_estimate_low,
                time_estimate_med,
                time_estimate_high,
                allow_content_edit
              `)
              .eq('operation_id', op.id)
              .order('display_order');
            
            if (stepsError) {
              console.error(`❌ Error loading steps for incorporated phase operation "${op.operation_name}":`, stepsError);
            }
            
            return {
              id: op.id,
              name: op.operation_name,
              description: op.operation_description,
              flowType: op.flow_type,
              userPrompt: op.user_prompt,
              displayOrder: op.display_order,
              isStandard: op.is_reference,
              steps: (steps || []).map((s: any) => {
                // Parse apps field - handle both JSON string and array
                let parsedApps: any[] = [];
                if (s.apps) {
                  if (typeof s.apps === 'string') {
                    try {
                      parsedApps = JSON.parse(s.apps);
                    } catch (e) {
                      console.error('Error parsing apps JSON:', e);
                      parsedApps = [];
                    }
                  } else if (Array.isArray(s.apps)) {
                    parsedApps = s.apps;
                  }
                }
                
                // Parse tools field
                let parsedTools: any[] = [];
                if (s.tools) {
                  if (typeof s.tools === 'string') {
                    try {
                      parsedTools = JSON.parse(s.tools);
                    } catch (e) {
                      console.error('Error parsing tools JSON:', e);
                      parsedTools = [];
                    }
                  } else if (Array.isArray(s.tools)) {
                    parsedTools = s.tools;
                  }
                }
                
                // Parse materials field
                let parsedMaterials: any[] = [];
                if (s.materials) {
                  if (typeof s.materials === 'string') {
                    try {
                      parsedMaterials = JSON.parse(s.materials);
                    } catch (e) {
                      console.error('Error parsing materials JSON:', e);
                      parsedMaterials = [];
                    }
                  } else if (Array.isArray(s.materials)) {
                    parsedMaterials = s.materials;
                  }
                }
                
                // Parse outputs field
                let parsedOutputs: any[] = [];
                if (s.outputs) {
                  if (typeof s.outputs === 'string') {
                    try {
                      parsedOutputs = JSON.parse(s.outputs);
                    } catch (e) {
                      console.error('Error parsing outputs JSON:', e);
                      parsedOutputs = [];
                    }
                  } else if (Array.isArray(s.outputs)) {
                    parsedOutputs = s.outputs;
                  }
                }
                
                // Parse content_sections field
                let parsedContentSections: any[] = [];
                if (s.content_sections) {
                  if (typeof s.content_sections === 'string') {
                    try {
                      parsedContentSections = JSON.parse(s.content_sections);
                    } catch (e) {
                      console.error('Error parsing content_sections JSON:', e);
                      parsedContentSections = [];
                    }
                  } else if (Array.isArray(s.content_sections)) {
                    parsedContentSections = s.content_sections;
                  }
                }
                
                return {
                  id: s.id,
                  step: s.step_title,
                  description: s.description,
                  stepType: s.step_type,
                  displayOrder: s.display_order,
                  flowType: s.flow_type,
                  apps: parsedApps,
                  tools: parsedTools,
                  materials: parsedMaterials,
                  outputs: parsedOutputs,
                  contentType: s.content_type || 'text',
                  content: s.content || '',
                  contentSections: parsedContentSections,
                  allowContentEdit: s.allow_content_edit || false,
                  timeEstimation: {
                    variableTime: {
                      low: s.time_estimate_low || 0,
                      medium: s.time_estimate_med || 0,
                      high: s.time_estimate_high || 0
                    }
                  },
                  workersNeeded: s.number_of_workers || 1,
                  skillLevel: s.skill_level
                };
              })
            };
          }));
          
          // Get source project name
          const { data: sourceProject } = await supabase
            .from('projects')
            .select('name')
            .eq('id', phaseData.source_project_id)
            .single();
          
          sourceProjectName = sourceProject?.name;
        } else {
          // For regular custom phases, fetch operations and steps normally
          const { data: operations } = await supabase
            .from('phase_operations')
            .select(`
              id,
              operation_name,
              operation_description,
              flow_type,
              display_order
            `)
            .eq('phase_id', phaseData.id)
            .order('display_order');
          
          operationsWithSteps = await Promise.all((operations || []).map(async (op: any) => {
            const { data: steps, error: stepsError } = await supabase
              .from('operation_steps')
              .select(`
                id,
                step_title,
                apps,
                description,
                content_type,
                content,
                content_sections,
                display_order,
                materials,
                tools,
                outputs,
                time_estimate_low,
                time_estimate_med,
                time_estimate_high,
                number_of_workers,
                skill_level,
                allow_content_edit
              `)
              .eq('operation_id', op.id)
              .order('display_order');
            
            if (stepsError) {
              console.error(`❌ Error loading steps for custom phase operation "${op.operation_name}":`, stepsError);
            }
            
            return {
              id: op.id,
              name: op.operation_name,
              description: op.operation_description,
              flowType: op.flow_type,
              userPrompt: op.user_prompt,
              displayOrder: op.display_order,
              isStandard: op.is_reference,
              steps: (steps || []).map((s: any) => {
                // Parse apps field - handle both JSON string and array
                let parsedApps: any[] = [];
                if (s.apps) {
                  if (typeof s.apps === 'string') {
                    try {
                      parsedApps = JSON.parse(s.apps);
                    } catch (e) {
                      console.error('Error parsing apps JSON:', e);
                      parsedApps = [];
                    }
                  } else if (Array.isArray(s.apps)) {
                    parsedApps = s.apps;
                  }
                }
                
                // Parse tools field
                let parsedTools: any[] = [];
                if (s.tools) {
                  if (typeof s.tools === 'string') {
                    try {
                      parsedTools = JSON.parse(s.tools);
                    } catch (e) {
                      console.error('Error parsing tools JSON:', e);
                      parsedTools = [];
                    }
                  } else if (Array.isArray(s.tools)) {
                    parsedTools = s.tools;
                  }
                }
                
                // Parse materials field
                let parsedMaterials: any[] = [];
                if (s.materials) {
                  if (typeof s.materials === 'string') {
                    try {
                      parsedMaterials = JSON.parse(s.materials);
                    } catch (e) {
                      console.error('Error parsing materials JSON:', e);
                      parsedMaterials = [];
                    }
                  } else if (Array.isArray(s.materials)) {
                    parsedMaterials = s.materials;
                  }
                }
                
                // Parse outputs field
                let parsedOutputs: any[] = [];
                if (s.outputs) {
                  if (typeof s.outputs === 'string') {
                    try {
                      parsedOutputs = JSON.parse(s.outputs);
                    } catch (e) {
                      console.error('Error parsing outputs JSON:', e);
                      parsedOutputs = [];
                    }
                  } else if (Array.isArray(s.outputs)) {
                    parsedOutputs = s.outputs;
                  }
                }
                
                // Parse content_sections field
                let parsedContentSections: any[] = [];
                if (s.content_sections) {
                  if (typeof s.content_sections === 'string') {
                    try {
                      parsedContentSections = JSON.parse(s.content_sections);
                    } catch (e) {
                      console.error('Error parsing content_sections JSON:', e);
                      parsedContentSections = [];
                    }
                  } else if (Array.isArray(s.content_sections)) {
                    parsedContentSections = s.content_sections;
                  }
                }
                
                return {
                  id: s.id,
                  step: s.step_title,
                  description: s.description,
                  stepType: s.step_type,
                  displayOrder: s.display_order,
                  flowType: s.flow_type,
                  apps: parsedApps,
                  tools: parsedTools,
                  materials: parsedMaterials,
                  outputs: parsedOutputs,
                  contentType: s.content_type || 'text',
                  content: s.content || '',
                  contentSections: parsedContentSections,
                  allowContentEdit: s.allow_content_edit || false,
                  timeEstimation: {
                    variableTime: {
                      low: s.time_estimate_low || 0,
                      medium: s.time_estimate_med || 0,
                      high: s.time_estimate_high || 0
                    }
                  },
                  workersNeeded: s.number_of_workers || 1,
                  skillLevel: s.skill_level
                };
              })
            };
          }));
        }
        
        // Derive phaseOrderNumber from position_rule
        // 'first' is now 'nth' with position_value = 1
        let phaseOrderNumber: number | string;
        if (phaseData.position_rule === 'last') {
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
          isStandard: false,
          isLinked,
          sourceProjectId: phaseData.source_project_id,
          sourceProjectName,
          phaseOrderNumber,
          position_rule: phaseData.position_rule,
          position_value: phaseData.position_value,
          operations: operationsWithSteps
        } as Phase;
      }));
      
      // Process standard phases
      const standardPhases: Phase[] = await Promise.all((standardPhasesData || []).map(async (phaseData: any) => {
        // Get operations for this phase
        const { data: operations } = await supabase
          .from('phase_operations')
          .select(`
            id,
            operation_name,
            operation_description,
            flow_type,
            display_order
          `)
          .eq('phase_id', phaseData.id)
          .order('display_order');
        
        // Get steps for each operation
        const operationsWithSteps = await Promise.all((operations || []).map(async (op: any) => {
          const { data: steps, error: stepsError } = await supabase
            .from('operation_steps')
            .select(`
              id,
              step_title,
              apps,
              description,
              content_type,
              content,
              content_sections,
              display_order,
              materials,
              tools,
              outputs,
              time_estimate_low,
              time_estimate_med,
              time_estimate_high,
              number_of_workers,
              skill_level,
              allow_content_edit
            `)
            .eq('operation_id', op.id)
            .order('display_order');
          
          if (stepsError) {
            console.error(`❌ Error loading steps for standard phase operation "${op.operation_name}":`, stepsError);
          }
          
          return {
            id: op.id,
            name: op.operation_name,
            description: op.operation_description,
            flowType: op.flow_type,
            displayOrder: op.display_order,
            isStandard: phaseData.is_standard,
            steps: (steps || [])
              .map((s: any) => {
                // Parse apps field - handle both JSON string and array
                let parsedApps: any[] = [];
                if (s.apps) {
                  if (typeof s.apps === 'string') {
                    try {
                      parsedApps = JSON.parse(s.apps);
                    } catch (e) {
                      console.error('Error parsing apps JSON:', e);
                      parsedApps = [];
                    }
                  } else if (Array.isArray(s.apps)) {
                    parsedApps = s.apps;
                  }
                }
                
                // Parse tools field
                let parsedTools: any[] = [];
                if (s.tools) {
                  if (typeof s.tools === 'string') {
                    try {
                      parsedTools = JSON.parse(s.tools);
                    } catch (e) {
                      console.error('Error parsing tools JSON:', e);
                      parsedTools = [];
                    }
                  } else if (Array.isArray(s.tools)) {
                    parsedTools = s.tools;
                  }
                }
                
                // Parse materials field
                let parsedMaterials: any[] = [];
                if (s.materials) {
                  if (typeof s.materials === 'string') {
                    try {
                      parsedMaterials = JSON.parse(s.materials);
                    } catch (e) {
                      console.error('Error parsing materials JSON:', e);
                      parsedMaterials = [];
                    }
                  } else if (Array.isArray(s.materials)) {
                    parsedMaterials = s.materials;
                  }
                }
                
                // Parse outputs field
                let parsedOutputs: any[] = [];
                if (s.outputs) {
                  if (typeof s.outputs === 'string') {
                    try {
                      parsedOutputs = JSON.parse(s.outputs);
                    } catch (e) {
                      console.error('Error parsing outputs JSON:', e);
                      parsedOutputs = [];
                    }
                  } else if (Array.isArray(s.outputs)) {
                    parsedOutputs = s.outputs;
                  }
                }
                
                // Parse content_sections field
                let parsedContentSections: any[] = [];
                if (s.content_sections) {
                  if (typeof s.content_sections === 'string') {
                    try {
                      parsedContentSections = JSON.parse(s.content_sections);
                    } catch (e) {
                      console.error('Error parsing content_sections JSON:', e);
                      parsedContentSections = [];
                    }
                  } else if (Array.isArray(s.content_sections)) {
                    parsedContentSections = s.content_sections;
                  }
                }
                
                return {
                  id: s.id,
                  step: s.step_title,
                  description: s.description,
                  stepType: s.step_type,
                  displayOrder: s.display_order,
                  flowType: s.flow_type,
                  apps: parsedApps,
                  tools: parsedTools,
                  materials: parsedMaterials,
                  outputs: parsedOutputs,
                  contentType: s.content_type || 'text',
                  content: s.content || '',
                  contentSections: parsedContentSections,
                  timeEstimation: {
                    variableTime: {
                      low: s.time_estimate_low || 0,
                      medium: s.time_estimate_med || 0,
                      high: s.time_estimate_high || 0
                    }
                  },
                  workersNeeded: s.number_of_workers || 1,
                  skillLevel: s.skill_level,
                  allowContentEdit: s.allow_content_edit || false
                };
              })
              .sort((a, b) => {
                // Explicitly sort by displayOrder to ensure correct order
                const aOrder = a.displayOrder ?? 999;
                const bOrder = b.displayOrder ?? 999;
                return aOrder - bOrder;
              })
          };
        }));
        
        // Sort operations by displayOrder
        operationsWithSteps.sort((a, b) => {
          const aOrder = a.displayOrder ?? 999;
          const bOrder = b.displayOrder ?? 999;
          return aOrder - bOrder;
        });
        
        // Derive phaseOrderNumber from position_rule
        // 'first' is now 'nth' with position_value = 1
        let phaseOrderNumber: number | string;
        if (phaseData.position_rule === 'last') {
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
          isStandard: true,
          isLinked: false,
          phaseOrderNumber,
          position_rule: phaseData.position_rule,
          position_value: phaseData.position_value,
          operations: operationsWithSteps
        } as Phase;
      }));
      
      // Combine custom and standard phases
      return [...customPhases, ...standardPhases];
    }
  }, [isEditingStandardProject]);
  
  // Load phases when project changes
  React.useEffect(() => {
    if (currentProject?.id) {
      setLoadingPhases(true);
      loadPhasesFromDatabase(currentProject.id)
        .then(phases => {
          setRawPhases(phases);
          setLoadingPhases(false);
        })
        .catch(error => {
          console.error('❌ Failed to load phases:', error);
          setRawPhases([]);
          setLoadingPhases(false);
        });
    } else {
      setRawPhases([]);
      setLoadingPhases(false);
    }
  }, [currentProject?.id, loadPhasesFromDatabase]);
  
  // Listen for phase updates from StructureManager
  React.useEffect(() => {
    const handlePhaseUpdate = (event: CustomEvent) => {
      // Refresh phases when StructureManager updates them
      if (currentProject?.id && event.detail?.projectId === currentProject.id) {
        const updateKind = event.detail?.updateKind;
        const stepId = event.detail?.stepId;
        const newStepTitle = event.detail?.newStepTitle;

        // Step rename updates should patch local state (avoid disruptive full reload)
        if (updateKind === 'step_renamed' && stepId && typeof newStepTitle === 'string') {
          setRawPhases(prev => prev.map(phase => ({
            ...phase,
            operations: phase.operations.map(op => ({
              ...op,
              steps: op.steps.map(step => (
                step.id === stepId
                  ? { ...step, step: newStepTitle }
                  : step
              ))
            }))
          })));
          return;
        }

        setLoadingPhases(true);
        loadPhasesFromDatabase(currentProject.id)
          .then(phases => {
            setRawPhases(phases);
            setLoadingPhases(false);
          })
          .catch(error => {
            console.error('Failed to refresh phases:', error);
            setLoadingPhases(false);
          });
      }
    };
    
    window.addEventListener('phasesUpdated' as any, handlePhaseUpdate as EventListener);
    return () => {
      window.removeEventListener('phasesUpdated' as any, handlePhaseUpdate as EventListener);
    };
  }, [currentProject?.id, loadPhasesFromDatabase]);

  // Helper to check if a phase is standard - use isStandard flag from phase data
  // No hardcoded names - rely on database flag
  const isStandardPhase = (phase: Phase) => {
    return phase.isStandard === true;
  };

  // No longer needed - we load phases directly from database

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
  
  // Sort phases by order number (same logic as StructureManager)
  const sortPhasesByOrderNumber = (phases: Phase[]): Phase[] => {
    const sortedPhases = [...phases].sort((a, b) => {
      const aOrder = a.phaseOrderNumber === 'last' ? Infinity : 
                    (typeof a.phaseOrderNumber === 'number' ? a.phaseOrderNumber : 1000);
      const bOrder = b.phaseOrderNumber === 'last' ? Infinity : 
                    (typeof b.phaseOrderNumber === 'number' ? b.phaseOrderNumber : 1000);
      
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
  
  const deduplicatedPhases = deduplicatePhases(rawPhases);
  
  // Order numbers are already set from database (position_rule/position_value)
  // No need to preserve or restore from currentProject.phases JSON
  
  // CRITICAL: Sort ALL phases together by order number
  // This ensures 'first' is first, 'last' is last, and numeric orders (2, 3, 4, etc.) are in between sequentially
  // Do NOT use enforceStandardPhaseOrdering here as it groups phases incorrectly
  const displayPhases = sortPhasesByOrderNumber(deduplicatedPhases);

  // Helper to check if current step is from a standard or incorporated phase
  const isStepFromStandardOrIncorporatedPhase = (step: WorkflowStep | undefined) => {
    if (!step || isEditingStandardProject) {
      if (isEditingStandardProject) {
      }
      return false;
    }
    
    // Get the phase containing this step
    const phaseName = step.phaseName;
    if (!phaseName) {
      // No phase name - allow editing (shouldn't happen, but be permissive)
      return false;
    }
    
    const phase = displayPhases.find(p => p.name === phaseName);
    if (!phase) {
      // Phase not found in displayPhases - allow editing
      // This can happen with phases that haven't been properly loaded
      // We want to allow editing in this case
      return false;
    }
    
    // Block editing if phase is:
    // 1. Marked as standard (isStandard === true), OR
    // 2. Incorporated from another project (isLinked === true)
    // 
    // EXCEPTION: If step has allowContentEdit=true, allow content editing even in standard phases
    // This allows project-specific content customization for specific steps (e.g., "Measure & Assess")
    // 
    // NOTE: We check phase.isStandard, not step.isStandard, because the phase-level flag
    // is the source of truth for whether content is editable.
    // The database should be the single source of truth - no hardcoded phase names.
    
    const isStandardPhase = phase.isStandard === true;
    const isLinkedPhase = phase.isLinked === true;
    const allowContentEdit = step.allowContentEdit === true;
    
    // Allow editing if step has allowContentEdit flag, even in standard phases
    // This allows content customization while maintaining step structure
    const shouldBlock = (isStandardPhase || isLinkedPhase) && !allowContentEdit;
    
    return shouldBlock;
  };

  // Debug log to check phases and show helpful message if empty
  useEffect(() => {
    if (currentProject) {
      const hasPhases = displayPhases && displayPhases.length > 0;
      const hasOperations = hasPhases && displayPhases.some(p => p.operations && p.operations.length > 0);
      
      // Show warning if no phases
      if (!hasPhases) {
        toast.error('This project has no phases. The project data may be corrupted.');
      } else if (!hasOperations) {
        toast.error('This project has phases but no operations. The project structure may be incomplete.');
      }
    }
  }, [currentProject?.id, isEditingStandardProject, displayPhases]);
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
  const [ppeToolsLibraryOpen, setPpeToolsLibraryOpen] = useState(false);
  const [ppeMaterialsLibraryOpen, setPpeMaterialsLibraryOpen] = useState(false);
  const [ppeEditorType, setPpeEditorType] = useState<'tools' | 'materials'>('tools');
  const [appsLibraryOpen, setAppsLibraryOpen] = useState(false);
  const [showStructureManager, setShowStructureManager] = useState(false);
  const [aiProjectGeneratorOpen, setAiProjectGeneratorOpen] = useState(false);
  const [decisionTreeOpen, setDecisionTreeOpen] = useState(false);
  const [instructionLevel, setInstructionLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [levelSpecificContent, setLevelSpecificContent] = useState<ContentSection[] | null>(null);
  const [levelSpecificContentKey, setLevelSpecificContentKey] = useState<{ stepId: string | null; level: 'beginner' | 'intermediate' | 'advanced' }>({
    stepId: null,
    level: 'intermediate',
  });
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [pendingContentChanges, setPendingContentChanges] = useState<ContentSection[] | null>(null);
  const [pendingContentLevel, setPendingContentLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<Date>(new Date());
  const pendingContentRef = useRef<{
    stepId: string | null;
    changes: ContentSection[] | null;
    level: 'beginner' | 'intermediate' | 'advanced';
  }>({
    stepId: null,
    changes: null,
    level: 'intermediate',
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

  // Flatten all steps from all phases and operations for navigation
  const allSteps = displayPhases.flatMap(phase => phase.operations.flatMap(operation => operation.steps.map(step => ({
    ...step,
    phaseName: phase.name,
    operationName: operation.name,
    phaseId: phase.id,
    operationId: operation.id
  }))));
  const currentStep = allSteps[currentStepIndex];
  const progress = allSteps.length > 0 ? (currentStepIndex + 1) / allSteps.length * 100 : 0;
  
  // Debug logging for current step (moved here after currentStep is declared)
  useEffect(() => {
    if (currentProject && currentStep) {
      const phase = displayPhases.find(p => p.name === currentStep.phaseName);
    }
  }, [currentProject?.id, displayPhases, currentStep]);
  
  useEffect(() => {
    if (currentStep && (!editingStep || editingStep.id !== currentStep.id)) {
      setEditingStep({
        ...currentStep
      });
      editingStepRef.current = currentStep;
    }
  }, [currentStep?.id]);

  // Prevent cross-step UI leakage: clear pending/loaded state when step changes
  useEffect(() => {
    const stepId = currentStep?.id ?? null;
    if (!stepId) return;

    if (pendingContentRef.current.stepId && pendingContentRef.current.stepId !== stepId) {
      setPendingContentChanges(null);
    }
    if (levelSpecificContentKey.stepId && levelSpecificContentKey.stepId !== stepId) {
      setLevelSpecificContent(null);
    }
  }, [currentStep?.id, levelSpecificContentKey.stepId]);

  // Save instruction content to database - stable version using refs
  const saveInstructionContentStable = useCallback(async (
    sections: ContentSection[] | null, 
    targetLevel: 'beginner' | 'intermediate' | 'advanced',
    silent: boolean = false,
    overrideStepId?: string | null
  ) => {
    const stepId = overrideStepId ?? editingStepRef.current?.id ?? null;
    if (!stepId || !sections) return;
    
    try {
      if (!silent) {
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
        if (targetLevel === pendingContentRef.current.level && stepId === pendingContentRef.current.stepId) {
          setPendingContentChanges(null);
          pendingContentRef.current.changes = null;
          pendingContentRef.current.stepId = null;
        }
        if (!silent) {
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
    if (!stepId) return;
    
    // Save pending changes from ref to their ORIGINAL level before loading new level (silent)
    if (pendingContentRef.current.changes && pendingContentRef.current.level && pendingContentRef.current.stepId) {
      await saveInstructionContentStable(
        pendingContentRef.current.changes,
        pendingContentRef.current.level,
        true,
        pendingContentRef.current.stepId
      );
      lastSaveRef.current = new Date();
      pendingContentRef.current = { stepId: null, changes: null, level: instructionLevel };
      setPendingContentChanges(null);
    }
    
    setIsLoadingContent(true);
    
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
        setLevelSpecificContentKey({ stepId, level: instructionLevel });
        setPendingContentLevel(instructionLevel);
        pendingContentRef.current.level = instructionLevel;
      } else if (data?.content) {
        // Content is stored as Json, convert to ContentSection[]
        const content = Array.isArray(data.content) ? data.content as unknown as ContentSection[] : null;
        setLevelSpecificContent(content);
        setLevelSpecificContentKey({ stepId, level: instructionLevel });
        setPendingContentLevel(instructionLevel);
        pendingContentRef.current.level = instructionLevel;
      } else {
        setLevelSpecificContent(null);
        setLevelSpecificContentKey({ stepId, level: instructionLevel });
        setPendingContentLevel(instructionLevel);
        pendingContentRef.current.level = instructionLevel;
      }
    } catch (err) {
      console.error('Exception loading instruction content:', err);
      setLevelSpecificContent(null);
      setLevelSpecificContentKey({ stepId, level: instructionLevel });
      setPendingContentLevel(instructionLevel);
      pendingContentRef.current.level = instructionLevel;
    } finally {
      setIsLoadingContent(false);
    }
  }, [instructionLevel, editMode, saveInstructionContentStable]);

  // Load content when instruction level changes or step changes
  useEffect(() => {
    loadInstructionContent();
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
      if (timeSinceLastSave > 5000 && pendingContentRef.current.changes && pendingContentRef.current.stepId) {
        saveInstructionContentStable(
          pendingContentRef.current.changes,
          pendingContentRef.current.level,
          true,
          pendingContentRef.current.stepId
        );
        lastSaveRef.current = new Date();
        pendingContentRef.current = { stepId: null, changes: null, level: pendingContentRef.current.level };
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
    // Check if this step is standard (unless allowContentEdit is true)
    if (!isEditingStandardProject && currentStep?.isStandard && !currentStep?.allowContentEdit) {
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
    // Save pending content changes to correct level first (silent)
    if (pendingContentRef.current.changes && pendingContentRef.current.level && pendingContentRef.current.stepId) {
      await saveInstructionContentStable(
        pendingContentRef.current.changes,
        pendingContentRef.current.level,
        true,
        pendingContentRef.current.stepId
      );
      lastSaveRef.current = new Date();
      pendingContentRef.current = { stepId: null, changes: null, level: 'intermediate' };
      setPendingContentChanges(null);
    }

    // Update only custom phases (standard phases are generated dynamically)
    const updatedProject = {
      ...currentProject,
      phases: displayPhases.map(phase => ({
        ...phase,
        operations: phase.operations.map(operation => ({
          ...operation,
          steps: operation.steps.map(step => step.id === editingStep.id ? editingStep : step)
        }))
      })),
      updatedAt: new Date()
    };
    
    updateProject(updatedProject);
    
    // If editing Standard Project Foundation, also update operation_steps table
    if (isEditingStandardProject) {
      try {
        // Ensure apps is properly formatted - handle both array and ensure it's not undefined
        const appsToSave = Array.isArray(editingStep.apps) ? editingStep.apps : (editingStep.apps ? [editingStep.apps] : []);
        
        const updateData: any = {
          step_title: editingStep.step,
          description: editingStep.description,
          content_type: editingStep.contentType || 'text',
          content: editingStep.content || '',
          step_type: editingStep.stepType || 'scaled',
          flow_type: editingStep.flowType || 'prime',
          materials: editingStep.materials || [] as any,
          tools: editingStep.tools || [] as any,
          outputs: editingStep.outputs || [] as any,
          apps: appsToSave,
          time_estimate_low: editingStep.timeEstimation?.variableTime?.low || 0,
          time_estimate_med: editingStep.timeEstimation?.variableTime?.medium || 0,
          time_estimate_high: editingStep.timeEstimation?.variableTime?.high || 0,
          number_of_workers: editingStep.workersNeeded ?? 1,
          skill_level: editingStep.skillLevel || 'intermediate',
          updated_at: new Date().toISOString()
        };

        const { error, data } = await supabase
          .from('operation_steps')
          .update(updateData)
          .eq('id', editingStep.id)
          .select('*'); // Select all fields to verify everything was saved
        
        if (error) {
          console.error('❌ SaveEdit: Error updating operation_steps:', error);
          toast.error(`Failed to save step: ${error.message}`);
        } else {
          toast.success('Step saved successfully');
          
          // Reload phases to reflect the changes
          if (currentProject?.id) {
            const reloadedPhases = await loadPhasesFromDatabase(currentProject.id);
            setRawPhases(reloadedPhases);
          }
        }
      } catch (err) {
        console.error('❌ SaveEdit: Exception updating operation_steps:', err);
        toast.error('Failed to save standard project changes');
      }
    } else {
      // For regular projects, also save to operation_steps if this is a custom step
      
      // Find the phase and operation to determine if this step should be saved to database
      const currentPhase = displayPhases.find(p => p.operations.some(op => op.steps.some(s => s.id === editingStep.id)));
      const isCustomStep = currentPhase && !currentPhase.isStandard && !currentPhase.isLinked;
      const isEditableStandardStep = editingStep.allowContentEdit === true;
      
      if (isCustomStep || isEditableStandardStep) {
        if (isEditableStandardStep) {
        } else {
        }
        try {
          const appsToSave = Array.isArray(editingStep.apps) ? editingStep.apps : (editingStep.apps ? [editingStep.apps] : []);
          
          // For editable standard steps, only update content fields, not structural fields
          const updateData: any = isEditableStandardStep ? {
            // Content fields only - structure remains locked
            description: editingStep.description,
            content_type: editingStep.contentType || 'text',
            content: editingStep.content || '',
            materials: editingStep.materials || [] as any,
            tools: editingStep.tools || [] as any,
            outputs: editingStep.outputs || [] as any,
            apps: appsToSave,
            updated_at: new Date().toISOString()
          } : {
            // For custom steps, allow all fields to be updated
            step_title: editingStep.step,
            description: editingStep.description,
            content_type: editingStep.contentType || 'text',
            content: editingStep.content || '',
            step_type: editingStep.stepType || 'scaled',
            flow_type: editingStep.flowType || 'prime',
            materials: editingStep.materials || [] as any,
            tools: editingStep.tools || [] as any,
            outputs: editingStep.outputs || [] as any,
            apps: appsToSave,
            time_estimate_low: editingStep.timeEstimation?.variableTime?.low || 0,
            time_estimate_med: editingStep.timeEstimation?.variableTime?.medium || 0,
            time_estimate_high: editingStep.timeEstimation?.variableTime?.high || 0,
            number_of_workers: editingStep.workersNeeded ?? 1,
            skill_level: editingStep.skillLevel || 'intermediate',
            updated_at: new Date().toISOString()
          };

          const { error, data } = await supabase
            .from('operation_steps')
            .update(updateData)
            .eq('id', editingStep.id)
            .select('*');
          
          if (error) {
            console.error('❌ Error saving custom step to operation_steps:', error);
            toast.error(`Failed to save step: ${error.message}`);
          } else {
            toast.success('Step saved successfully');
            
            // Reload phases to reflect the changes
            if (currentProject?.id) {
              const reloadedPhases = await loadPhasesFromDatabase(currentProject.id);
              setRawPhases(reloadedPhases);
            }
          }
        } catch (err) {
          console.error('❌ Exception saving custom step:', err);
        }
      } else {
      }
    }
    
    setEditMode(false);
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
      console.error('❌ updateEditingStep: No editingStep found');
      return;
    }
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
      phases: [...displayPhases, ...importedPhases],
      updatedAt: new Date()
    };
    updateProject(updatedProject);
    toast.success(`Imported ${importedPhases.length} phases successfully`);
  };
  const renderContent = (step: typeof currentStep) => {
    if (!step) return null;
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
        const currentStepId = editingStepRef.current?.id ?? null;
        const pendingMatchesStep = !!currentStepId && pendingContentRef.current.stepId === currentStepId;
        const loadedMatchesStep =
          !!currentStepId &&
          levelSpecificContentKey.stepId === currentStepId &&
          levelSpecificContentKey.level === instructionLevel;

        if (pendingContentChanges && pendingMatchesStep) {
          contentSections = pendingContentChanges;
        } else if (loadedMatchesStep && levelSpecificContent && levelSpecificContent.length > 0) {
          contentSections = levelSpecificContent;
        } else if (editingStep.contentSections && editingStep.contentSections.length > 0) {
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
        } else {
          contentSections = getDefaultStepContentSections();
        }
      } catch (e) {
        contentSections = getDefaultStepContentSections();
      }
      
      return <div className="space-y-6">
          <MultiContentEditor 
            sections={contentSections} 
            onChange={(sections) => {
              // Track both the changes and which level they belong to
              const currentStepId = editingStepRef.current?.id ?? null;
              setPendingContentChanges(sections);
              setPendingContentLevel(instructionLevel);
              pendingContentRef.current = { stepId: currentStepId, changes: sections, level: instructionLevel };
            }} 
          />
        </div>;
    }

    // In view mode, try to load level-specific content first
    // If levelSpecificContent is available (loaded in edit mode), use it
    if (
      levelSpecificContent &&
      levelSpecificContent.length > 0 &&
      levelSpecificContentKey.stepId === step.id &&
      levelSpecificContentKey.level === instructionLevel
    ) {
      return <MultiContentRenderer sections={levelSpecificContent} />;
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
        <p className="text-muted-foreground">No content available. Click Edit Step to add instructions.</p>
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
  
  // Show loading screen while phases are being loaded
  if (loadingPhases) {
    return <div className="fixed inset-0 bg-background overflow-auto z-50 flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-8 space-y-4">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Loading workflow structure...</p>
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
  return <div className="fixed inset-0 bg-background overflow-auto z-50">
      {/* Header with Project Name and Controls */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {isEditingStandardProject ? '🔒 Standard Project Foundation Editor' : `Workflow Editor: ${currentProject?.name?.replace(/\s*\([Dd]raft\)\s*/g, '').replace(/\s*\(Rev\s+\d+\)\s*/gi, '').trim() || 'Untitled Project'}`}
              </h1>
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
                     <Button onClick={() => setAiProjectGeneratorOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
                       <Sparkles className="w-4 h-4" />
                       AI Project Generator
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
                        {editingStep.allowContentEdit ? (
                          <div className="mt-2">
                            <Input 
                              id="step-title" 
                              value={editingStep.step} 
                              disabled 
                              className="text-2xl font-bold bg-muted cursor-not-allowed" 
                              placeholder="Step title..." 
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Step structure is locked. Only content can be edited for this step.
                            </p>
                          </div>
                        ) : (
                          <Input id="step-title" value={editingStep.step} onChange={e => updateEditingStep('step', e.target.value)} className="text-2xl font-bold mt-2" placeholder="Step title..." />
                        )}
                      </div>
                      <div>
                        <Label htmlFor="step-description" className="text-base font-medium">Description</Label>
                        <Textarea id="step-description" value={editingStep.description || ''} onChange={e => updateEditingStep('description', e.target.value)} placeholder="Step description..." className="mt-2" rows={3} />
                      </div>
                      {!editingStep.allowContentEdit && (
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
                      )}
                      {editingStep.allowContentEdit && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Flow Type</Label>
                        <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                          Flow type is part of the step structure and cannot be modified.
                        </div>
                      </div>
                      )}
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
                        <Label className="text-sm font-medium whitespace-nowrap">Detail Level:</Label>
                        <Select value={instructionLevel} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setInstructionLevel(value)}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
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
                      Apps for this step
                    </CardTitle>
                    
                  </CardHeader>
                  <CardContent>
                    <CompactAppsSection apps={editingStep.apps || []} onAppsChange={apps => {
                updateEditingStep('apps', apps);
              }} onAddApp={() => setAppsLibraryOpen(true)} onLaunchApp={() => {}} editMode={true} />
                  </CardContent>
                </Card>

                {/* Tools, Materials, PPE, Inputs, and Outputs */}
                <div className="grid lg:grid-cols-1 gap-6">
                  {/* Tools & Materials + PPE Card */}
                  {(() => {
                    const ppeTools = (editingStep?.tools || []).filter(t => t.category === 'PPE');
                    const nonPpeTools = (editingStep?.tools || []).filter(t => t.category !== 'PPE');
                    const ppeMaterials = (editingStep?.materials || []).filter(m => m.category === 'PPE');
                    const nonPpeMaterials = (editingStep?.materials || []).filter(m => m.category !== 'PPE');

                    return (
                      <Card className="bg-muted/30 border shadow-sm">
                        <CardHeader>
                          <CardTitle>Tools & Materials</CardTitle>
                          <CardDescription>Manage tools, materials, and PPE for this step</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <CompactToolsTable
                            title="Tools"
                            tools={nonPpeTools}
                            onToolsChange={tools => updateEditingStep('tools', [...tools, ...ppeTools])}
                            onAddTool={() => setToolsLibraryOpen(true)}
                          />

                          <CompactMaterialsTable
                            title="Materials"
                            materials={nonPpeMaterials}
                            onMaterialsChange={materials => updateEditingStep('materials', [...materials, ...ppeMaterials])}
                            onAddMaterial={() => setMaterialsLibraryOpen(true)}
                          />

                          <div className="pt-2 border-t">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="space-y-1">
                                <CardTitle className="text-base">Personal Protective Equipment</CardTitle>
                                <CardDescription>Manage PPE tools/materials tagged as PPE</CardDescription>
                              </div>

                              <div className="min-w-[160px]">
                                <Label className="text-xs font-medium">PPE Type</Label>
                                <Select value={ppeEditorType} onValueChange={(value: 'tools' | 'materials') => setPpeEditorType(value)}>
                                  <SelectContent>
                                    <SelectItem value="tools">PPE Tools</SelectItem>
                                    <SelectItem value="materials">PPE Materials</SelectItem>
                                  </SelectContent>
                                  <SelectTrigger className="h-8 mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                </Select>
                              </div>
                            </div>

                            {ppeEditorType === 'tools' ? (
                              <CompactToolsTable
                                title="PPE Tools"
                                addButtonLabel="Add PPE Tool"
                                tools={ppeTools}
                                onToolsChange={tools => updateEditingStep('tools', [...nonPpeTools, ...tools])}
                                onAddTool={() => setPpeToolsLibraryOpen(true)}
                              />
                            ) : (
                              <CompactMaterialsTable
                                title="PPE Materials"
                                addButtonLabel="Add PPE Material"
                                materials={ppeMaterials}
                                onMaterialsChange={materials => updateEditingStep('materials', [...nonPpeMaterials, ...materials])}
                                onAddMaterial={() => setPpeMaterialsLibraryOpen(true)}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                {/* Process Variables Card */}
                  <Card className="bg-muted/30 border shadow-sm">
                    <CardHeader>
                       <CardTitle>Process Variables</CardTitle>
                       <CardDescription>
                         Define process variables for this step
                       </CardDescription>
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
                {!editingStep.allowContentEdit && (
                <Card className="bg-muted/30 border shadow-sm">
                  <CardHeader>
                    <CardTitle>Time Estimation & Step Type</CardTitle>
                    <CardDescription>Configure time estimates and step type. Step type determines how time estimates are interpreted.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <StepTypeSelector 
                        value={editingStep.stepType} 
                        onValueChange={value => updateEditingStep('stepType', value)} 
                      />
                    </div>
                <CompactTimeEstimation 
                  step={editingStep} 
                  scalingUnit={currentProject?.scalingUnit} 
                  onChange={timeEstimation => updateEditingStep('timeEstimation', timeEstimation)}
                  onWorkersChange={workersNeeded => updateEditingStep('workersNeeded', workersNeeded)}
                  onSkillLevelChange={skillLevel => updateEditingStep('skillLevel', skillLevel)}
                />
                  </CardContent>
                </Card>
                )}
                {editingStep.allowContentEdit && (
                <Card className="bg-muted/30 border shadow-sm opacity-60">
                  <CardHeader>
                    <CardTitle>Time Estimation & Step Type</CardTitle>
                    <CardDescription className="text-muted-foreground">Step structure is locked. Only content can be edited for this step.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
                      Time estimation and step type are part of the step structure and cannot be modified.
                    </div>
                  </CardContent>
                </Card>
                )}

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
                      {(!isStepFromStandardOrIncorporatedPhase(currentStep) || currentStep?.allowContentEdit) && (
                        <Button onClick={handleStartEdit} variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          {currentStep?.allowContentEdit ? 'Edit Content' : 'Edit Step'}
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
                                       {output.type !== "none" && ['major-aesthetics', 'performance-durability', 'safety'].includes(output.type) && (
                                         <Badge variant="outline" className="text-xs capitalize">{output.type.replace('-', ' ')}</Badge>
                                       )}
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
      
      {/* AI Project Generator Dialog */}
      <AIProjectGenerator
        open={aiProjectGeneratorOpen}
        onOpenChange={setAiProjectGeneratorOpen}
        onProjectCreated={(projectId) => {
          toast.success('Project created successfully!');
          // Optionally refresh or navigate to the new project
        }}
      />
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
      
      <MultiSelectLibraryDialog open={toolsLibraryOpen} onOpenChange={setToolsLibraryOpen} type="tools" categoryExclude="PPE" availableStepTools={editingStep?.tools?.map(t => ({
      id: t.id,
      name: t.name
    })) || []} onSelect={selectedItems => {
      const newTools: StepTool[] = selectedItems.map(item => ({
        id: `tool-${Date.now()}-${Math.random()}`,
        name: item.item,
        description: item.description || '',
        category: item.category as any,
        alternates: [],
        quantity: item.quantity
      }));
      updateEditingStep('tools', [...(editingStep?.tools || []), ...newTools]);
    }} />
      
      <MultiSelectLibraryDialog open={materialsLibraryOpen} onOpenChange={setMaterialsLibraryOpen} type="materials" categoryExclude="PPE" onSelect={selectedItems => {
      const newMaterials: StepMaterial[] = selectedItems.map(item => ({
        id: `material-${Date.now()}-${Math.random()}`,
        name: item.item,
        description: item.description || '',
        category: item.category as any,
        alternates: [],
        quantity: item.quantity,
        unit: item.unit || undefined
      }));
      updateEditingStep('materials', [...(editingStep?.materials || []), ...newMaterials]);
    }} />

      <MultiSelectLibraryDialog
        open={ppeToolsLibraryOpen}
        onOpenChange={setPpeToolsLibraryOpen}
        type="tools"
        categoryInclude="PPE"
        availableStepTools={editingStep?.tools?.map(t => ({
          id: t.id,
          name: t.name
        })) || []}
        onSelect={selectedItems => {
          const newPpeTools: StepTool[] = selectedItems.map(item => ({
            id: `ppe-tool-${Date.now()}-${Math.random()}`,
            name: item.item,
            description: item.description || '',
            category: item.category as any,
            alternates: [],
            quantity: item.quantity
          }));
          updateEditingStep('tools', [...(editingStep?.tools || []), ...newPpeTools]);
        }}
      />

      <MultiSelectLibraryDialog
        open={ppeMaterialsLibraryOpen}
        onOpenChange={setPpeMaterialsLibraryOpen}
        type="materials"
        categoryInclude="PPE"
        onSelect={selectedItems => {
          const newPpeMaterials: StepMaterial[] = selectedItems.map(item => ({
            id: `ppe-material-${Date.now()}-${Math.random()}`,
            name: item.item,
            description: item.description || '',
            category: item.category as any,
            alternates: [],
            quantity: item.quantity,
            unit: item.unit || undefined
          }));
          updateEditingStep('materials', [...(editingStep?.materials || []), ...newPpeMaterials]);
        }}
      />

      {/* Decision Tree Manager */}
      <DecisionTreeManager 
        open={decisionTreeOpen}
        onOpenChange={setDecisionTreeOpen}
        currentProject={currentProject}
      />
    </div>;
}