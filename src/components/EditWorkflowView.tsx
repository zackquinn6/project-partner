import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { WorkflowStep, Tool, Material, Output, ContentSection, Phase, Operation, Project, AppReference, StepInput, getDefaultStepContentSections, type GeneralProjectDecision } from '@/interfaces/Project';
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
import { PFMEAManagement } from '@/components/PFMEAManagement';
import { OutputEditForm } from '@/components/OutputEditForm';
import { ProjectContentImport } from '@/components/ProjectContentImport';
import { CompactToolsTable } from '@/components/CompactToolsTable';
import { CompactMaterialsTable } from '@/components/CompactMaterialsTable';
import { CompactProcessVariablesTable } from '@/components/CompactProcessVariablesTable';
import { CompactOutputsTable } from '@/components/CompactOutputsTable';
import { CompactTimeEstimation, CompactTimeEstimationReadOnly } from '@/components/CompactTimeEstimation';
import { CompactPpeTable } from '@/components/CompactPpeTable';
import { CompactAppsSection } from '@/components/CompactAppsSection';
import { AppsLibraryDialog } from '@/components/AppsLibraryDialog';
import { AIProjectGenerator } from '@/components/AIProjectGenerator';
import { ArrowLeft, Eye, Edit, Package, Wrench, FileOutput, X, Settings, Save, ChevronLeft, ChevronRight, FileText, List, Upload, Trash2, Brain, Sparkles, RefreshCw, Lock, Shield, Menu, Info, Crosshair, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { enforceStandardPhaseOrdering } from '@/utils/phaseOrderingUtils';
import { parseGeneralProjectDecisionsFromPrerequisites } from '@/utils/generalProjectDecisions';
import { parseProcessVariablesFromDb } from '@/utils/processVariablesUtils';
import {
  resolveIncorporatedSourcePhase,
  type ResolvedIncorporatedSourcePhase
} from '@/utils/incorporatedPhaseResolution';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Extended interfaces for step-level usage
interface StepMaterial extends Material {
  quantity?: number;
  purpose?: string;
  parentId?: string;
}
interface StepTool extends Tool {
  quantity?: number;
  purpose?: string;
  parentId?: string;
}

function viewOrderedToolRows(tools: StepTool[]): { tool: StepTool; depth: 0 | 1 }[] {
  const safe = tools || [];
  const indexOrder = new Map(safe.map((t, i) => [t.id, i]));
  const primaries = safe.filter((t) => !t.parentId);
  const rows: { tool: StepTool; depth: 0 | 1 }[] = [];
  for (const p of primaries) {
    rows.push({ tool: p, depth: 0 });
    const children = safe
      .filter((t) => t.parentId === p.id)
      .sort((a, b) => (indexOrder.get(a.id) ?? 0) - (indexOrder.get(b.id) ?? 0));
    for (const c of children) {
      rows.push({ tool: c, depth: 1 });
    }
  }
  return rows;
}

function viewOrderedMaterialRows(materials: StepMaterial[]): { material: StepMaterial; depth: 0 | 1 }[] {
  const safe = materials || [];
  const indexOrder = new Map(safe.map((m, i) => [m.id, i]));
  const primaries = safe.filter((m) => !m.parentId);
  const rows: { material: StepMaterial; depth: 0 | 1 }[] = [];
  for (const p of primaries) {
    rows.push({ material: p, depth: 0 });
    const children = safe
      .filter((m) => m.parentId === p.id)
      .sort((a, b) => (indexOrder.get(a.id) ?? 0) - (indexOrder.get(b.id) ?? 0));
    for (const c of children) {
      rows.push({ material: c, depth: 1 });
    }
  }
  return rows;
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

  // Use the same data source and detection logic as Process Map (StructureManager)
  // Both components work identically for Standard Project Foundation and regular project templates
  // The only difference is isEditingStandardProject flag which controls edit permissions
  
  // Detect if editing Standard Project Foundation
  // Check both the hardcoded ID and the isStandardTemplate flag
  const isEditingStandardProject = currentProject?.isStandardTemplate || currentProject?.id === 'd82dff80-e8ac-4511-be46-3d0e64bb5fc5';
  
  // Load phases directly from database - EXACTLY like Process Map does
  // This ensures workflow editor and Process Map always match
  const [rawPhases, setRawPhases] = React.useState<Phase[]>([]);
  const [loadingPhases, setLoadingPhases] = React.useState(true);
  const phasesProjectIdRef = React.useRef<string | undefined>(undefined);
  
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
              display_order,
              materials,
              tools,
              outputs,
              process_variables,
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
                contentType: 'text',
                content: '',
                contentSections: parsedContentSections,
                allowContentEdit: step.allow_content_edit || false,
                displayOrder: step.display_order || 0,
                materials: step.materials || [],
                tools: step.tools || [],
                outputs: step.outputs || [],
                inputs: parseProcessVariablesFromDb(step.process_variables),
                timeEstimation: {
                  variableTime: {
                    low: step.time_estimate_low || 0,
                    medium: step.time_estimate_med || 0,
                    high: step.time_estimate_high || 0
                  }
                },
                workersNeeded: step.number_of_workers ?? 1,
                skillLevel: step.skill_level || 'Intermediate'
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
          source_project_id,
          source_phase_id
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

      const sourceProjectIds = Array.from(new Set(
        (customPhasesData || [])
          .filter((phase: any) => phase.source_project_id)
          .map((phase: any) => phase.source_project_id)
      ));

      const sourceProjectsMap = new Map<string, { id: string; name: string }>();
      if (sourceProjectIds.length > 0) {
        const { data: sourceProjects, error: sourceProjectsError } = await supabase
          .from('projects')
          .select('id, name, parent_project_id, revision_number, updated_at')
          .in('id', sourceProjectIds);

        if (sourceProjectsError) {
          throw new Error(`Failed to load incorporated source projects: ${sourceProjectsError.message}`);
        }

        const familyIds = Array.from(new Set(
          (sourceProjects || []).map((project: any) => project.parent_project_id || project.id)
        ));

        const [familyRootResult, familyRevisionResult] = await Promise.all([
          supabase
            .from('projects')
            .select('id, name, parent_project_id, revision_number, updated_at')
            .in('id', familyIds)
            .eq('publish_status', 'published'),
          supabase
            .from('projects')
            .select('id, name, parent_project_id, revision_number, updated_at')
            .in('parent_project_id', familyIds)
            .eq('publish_status', 'published')
        ]);

        if (familyRootResult.error) {
          throw new Error(`Failed to load incorporated project families: ${familyRootResult.error.message}`);
        }

        if (familyRevisionResult.error) {
          throw new Error(`Failed to load incorporated project revisions: ${familyRevisionResult.error.message}`);
        }

        const latestByFamily = new Map<string, any>();
        [...(familyRootResult.data || []), ...(familyRevisionResult.data || [])].forEach((project: any) => {
          const familyId = project.parent_project_id || project.id;
          const existing = latestByFamily.get(familyId);

          if (!existing) {
            latestByFamily.set(familyId, project);
            return;
          }

          const projectRevision = project.revision_number ?? 0;
          const existingRevision = existing.revision_number ?? 0;
          const projectUpdatedAt = new Date(project.updated_at).getTime();
          const existingUpdatedAt = new Date(existing.updated_at).getTime();

          if (
            projectRevision > existingRevision ||
            (projectRevision === existingRevision && projectUpdatedAt > existingUpdatedAt)
          ) {
            latestByFamily.set(familyId, project);
          }
        });

        (sourceProjects || []).forEach((project: any) => {
          const familyId = project.parent_project_id || project.id;
          // Prefer latest published in the family; if none exist, use the linked source row (FK on the phase).
          const latestProject = latestByFamily.get(familyId) ?? project;

          sourceProjectsMap.set(project.id, {
            id: latestProject.id,
            name: latestProject.name
          });
        });
      }
      
      // Process custom phases (including incorporated)
      const customPhases: Phase[] = await Promise.all((customPhasesData || []).map(async (phaseData: any) => {
        const isLinked = !!phaseData.source_project_id;
        let operationsWithSteps: any[] = [];
        let sourceProjectName: string | undefined;
        let resolvedIncorporated: ResolvedIncorporatedSourcePhase | null = null;

        if (isLinked) {
          const sourceProject = sourceProjectsMap.get(phaseData.source_project_id);
          if (!sourceProject) {
            throw new Error(`Could not resolve incorporated source project for phase "${phaseData.name}"`);
          }

          resolvedIncorporated = await resolveIncorporatedSourcePhase(
            sourceProject.id,
            phaseData.source_phase_id,
            phaseData.name,
            phaseData.source_project_id
          );

          const priorName = phaseData.name;
          const priorDesc = phaseData.description;
          if (
            phaseData.id &&
            (priorName !== resolvedIncorporated.name ||
              (priorDesc ?? null) !== (resolvedIncorporated.description ?? null))
          ) {
            const { error: syncErr } = await supabase
              .from('project_phases')
              .update({
                name: resolvedIncorporated.name,
                description: resolvedIncorporated.description
              })
              .eq('id', phaseData.id);
            if (syncErr) {
              throw new Error(`Failed to sync incorporated phase label from source: ${syncErr.message}`);
            }
          }

          const { data: sourceOperations, error: sourceOperationsError } = await supabase
            .from('phase_operations')
            .select(`
              id,
              operation_name,
              operation_description,
              flow_type,
              display_order,
              estimated_time
            `)
            .eq('phase_id', resolvedIncorporated.sourcePhaseId)
            .order('display_order');

          if (sourceOperationsError) {
            throw new Error(`Failed to load incorporated operations for "${phaseData.name}": ${sourceOperationsError.message}`);
          }
          
          operationsWithSteps = await Promise.all((sourceOperations || []).map(async (op: any) => {
            const { data: steps, error: stepsError } = await supabase
              .from('operation_steps')
              .select(`
                id,
                step_title,
                apps,
                description,
                display_order,
                materials,
                tools,
                outputs,
                process_variables,
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
                  inputs: parseProcessVariablesFromDb(s.process_variables),
                  contentType: 'text',
                  content: '',
                  contentSections: parsedContentSections,
                  allowContentEdit: s.allow_content_edit || false,
                  timeEstimation: {
                    variableTime: {
                      low: s.time_estimate_low || 0,
                      medium: s.time_estimate_med || 0,
                      high: s.time_estimate_high || 0
                    }
                  },
                  workersNeeded: s.number_of_workers ?? 1,
                  skillLevel: s.skill_level || 'Intermediate'
                };
              })
            };
          }));
          
          sourceProjectName = sourceProject.name;
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
                display_order,
                materials,
                tools,
                outputs,
                process_variables,
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
                  inputs: parseProcessVariablesFromDb(s.process_variables),
                  contentType: 'text',
                  content: '',
                  contentSections: parsedContentSections,
                  allowContentEdit: s.allow_content_edit || false,
                  timeEstimation: {
                    variableTime: {
                      low: s.time_estimate_low || 0,
                      medium: s.time_estimate_med || 0,
                      high: s.time_estimate_high || 0
                    }
                  },
                  workersNeeded: s.number_of_workers ?? 1,
                  skillLevel: s.skill_level || 'Intermediate'
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
          name: resolvedIncorporated ? resolvedIncorporated.name : phaseData.name,
          description: resolvedIncorporated
            ? resolvedIncorporated.description ?? ''
            : phaseData.description,
          isStandard: false,
          isLinked,
          sourceProjectId: phaseData.source_project_id,
          sourcePhaseId: resolvedIncorporated?.sourcePhaseId,
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
              display_order,
              materials,
              tools,
              outputs,
              process_variables,
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
                  inputs: parseProcessVariablesFromDb(s.process_variables),
                  contentType: 'text',
                  content: '',
                  contentSections: parsedContentSections,
                  timeEstimation: {
                    variableTime: {
                      low: s.time_estimate_low || 0,
                      medium: s.time_estimate_med || 0,
                      high: s.time_estimate_high || 0
                    }
                  },
                  workersNeeded: s.number_of_workers ?? 1,
                  skillLevel: s.skill_level || 'Intermediate',
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

  // Before paint: when the workflow project id changes, enter loading and drop stale phases so we
  // never flash empty state (and spurious "no phases" toasts) while the async fetch is in flight.
  useLayoutEffect(() => {
    const id = currentProject?.id;
    if (!id) {
      phasesProjectIdRef.current = undefined;
      return;
    }
    if (phasesProjectIdRef.current !== id) {
      phasesProjectIdRef.current = id;
      setLoadingPhases(true);
      setRawPhases([]);
    }
  }, [currentProject?.id]);
  
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
  
  // Listen for phase updates from Process Map
  React.useEffect(() => {
    const handlePhaseUpdate = (event: CustomEvent) => {
      // Refresh phases when Process Map updates them
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

  // Apply standard phase ordering to match Process Map
  // This ensures the workflow editor shows phases in the same order as Process Map
  // Also deduplicate phases like Process Map does
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
  
  // Sort phases by order number (same logic as Process Map)
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

  // Stable counts for post-load validation (derive from rawPhases only — deduplicatedPhases is a new array each render).
  const loadedStructureSummary = React.useMemo(() => {
    const seen = new Set<string>();
    const deduped: Phase[] = [];
    for (const phase of rawPhases) {
      const key = phase.isLinked ? `${phase.id}-${phase.sourceProjectId}` : phase.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(phase);
      }
    }
    const phaseCount = deduped.length;
    const operationCount = deduped.reduce((n, p) => n + (p.operations?.length ?? 0), 0);
    return { phaseCount, operationCount };
  }, [rawPhases]);

  // Helper to check if current step is from a standard or incorporated phase
  const isStepFromStandardOrIncorporatedPhase = (step: WorkflowStep | undefined) => {
    if (!step || isEditingStandardProject) return false;
    
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

  // After load completes: warn only on truly empty structure (not while phases are still fetching).
  useEffect(() => {
    if (!currentProject?.id || loadingPhases) {
      return;
    }
    const hasPhases = loadedStructureSummary.phaseCount > 0;
    const hasOperations = hasPhases && loadedStructureSummary.operationCount > 0;

    if (!hasPhases) {
      toast.error('This project has no phases. The project data may be corrupted.');
    } else if (!hasOperations) {
      toast.error('This project has phases but no operations. The project structure may be incomplete.');
    }
  }, [
    currentProject?.id,
    loadingPhases,
    isEditingStandardProject,
    loadedStructureSummary.phaseCount,
    loadedStructureSummary.operationCount,
  ]);
  const [viewMode, setViewMode] = useState<'steps' | 'structure'>('steps');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingOutput, setEditingOutput] = useState<Output | null>(null);
  const [outputEditOpen, setOutputEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toolsMaterialsOpen, setToolsMaterialsOpen] = useState(false);
  const [riskManagementOpen, setRiskManagementOpen] = useState(false);
  const [pfmeaOpen, setPfmeaOpen] = useState(false);
  const [pfmeaRefreshNonce, setPfmeaRefreshNonce] = useState(0);
  const [toolsLibraryOpen, setToolsLibraryOpen] = useState(false);
  const [materialsLibraryOpen, setMaterialsLibraryOpen] = useState(false);
  const [ppeLibraryOpen, setPpeLibraryOpen] = useState(false);
  /** Step row id of primary tool/material when picking a substitute from the library */
  const [alternateToolParentId, setAlternateToolParentId] = useState<string | null>(null);
  const [alternateMaterialParentId, setAlternateMaterialParentId] = useState<string | null>(null);
  const [alternatePpeToolParentId, setAlternatePpeToolParentId] = useState<string | null>(null);
  const [alternatePpeMaterialParentId, setAlternatePpeMaterialParentId] = useState<string | null>(null);
  const [appsLibraryOpen, setAppsLibraryOpen] = useState(false);
  const [aiProjectGeneratorOpen, setAiProjectGeneratorOpen] = useState(false);
  const [decisionTreeOpen, setDecisionTreeOpen] = useState(false);
  const [generalProjectDecisionsForEditor, setGeneralProjectDecisionsForEditor] = useState<GeneralProjectDecision[]>([]);

  useEffect(() => {
    if (!currentProject?.id) {
      setGeneralProjectDecisionsForEditor([]);
      return;
    }
    let cancelled = false;
    void supabase
      .from('projects')
      .select('scheduling_prerequisites')
      .eq('id', currentProject.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setGeneralProjectDecisionsForEditor(
          parseGeneralProjectDecisionsFromPrerequisites(data?.scheduling_prerequisites)
        );
      });
    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, decisionTreeOpen]);
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

  const [instructionsDataSourcesDraft, setInstructionsDataSourcesDraft] = useState('');
  const [savingInstructionsDataSources, setSavingInstructionsDataSources] = useState(false);

  useEffect(() => {
    if (!currentProject?.id) {
      setInstructionsDataSourcesDraft('');
      return;
    }
    const v = currentProject.instructionsDataSources;
    setInstructionsDataSourcesDraft(v === null || v === undefined ? '' : String(v));
  }, [currentProject?.id, currentProject?.instructionsDataSources]);

  const handleSaveInstructionsDataSources = useCallback(async () => {
    if (!currentProject) return;
    setSavingInstructionsDataSources(true);
    try {
      const trimmed = instructionsDataSourcesDraft.trim();
      const value = trimmed === '' ? null : trimmed;
      await updateProject({
        ...currentProject,
        instructionsDataSources: value,
      });
    } finally {
      setSavingInstructionsDataSources(false);
    }
  }, [currentProject, instructionsDataSourcesDraft, updateProject]);

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
      const sectionsWithDisplayOrder = sections.map((section, index) => ({
        ...section,
        display_order: index + 1
      }));

      const { error } = await supabase
        .from('step_instructions')
        .upsert({
          step_id: stepId,
          instruction_level: targetLevel,
          content: sectionsWithDisplayOrder as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'step_id,instruction_level'
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
        .eq('step_id', stepId)
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
        const content = Array.isArray(data.content)
          ? (data.content as unknown as ContentSection[]).sort((a, b) => {
              const aOrder = typeof (a as any).display_order === 'number' ? (a as any).display_order : Number.MAX_SAFE_INTEGER;
              const bOrder = typeof (b as any).display_order === 'number' ? (b as any).display_order : Number.MAX_SAFE_INTEGER;
              return aOrder - bOrder;
            })
          : null;
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
      toast.error('Cannot edit standard steps. Only custom steps can be edited in this project.');
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
    
    let stepPersistedToDb = false;
    let operationStepsSaveFailed = false;

    await updateProject(updatedProject);

    // If editing Standard Project Foundation, also update operation_steps table
    if (isEditingStandardProject) {
      try {
        // Ensure apps is properly formatted - handle both array and ensure it's not undefined
        const appsToSave = Array.isArray(editingStep.apps) ? editingStep.apps : (editingStep.apps ? [editingStep.apps] : []);
        
        const updateData: any = {
          step_title: editingStep.step,
          description: editingStep.description,
          step_type: editingStep.stepType || 'scaled',
          flow_type: editingStep.flowType || 'prime',
          materials: editingStep.materials || [] as any,
          tools: editingStep.tools || [] as any,
          outputs: editingStep.outputs || [] as any,
          process_variables: editingStep.inputs || [] as any,
          apps: appsToSave,
          time_estimate_low: editingStep.timeEstimation?.variableTime?.low || 0,
          time_estimate_med: editingStep.timeEstimation?.variableTime?.medium || 0,
          time_estimate_high: editingStep.timeEstimation?.variableTime?.high || 0,
          number_of_workers: editingStep.workersNeeded ?? 1,
          skill_level: editingStep.skillLevel || 'Intermediate',
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
        try {
          const appsToSave = Array.isArray(editingStep.apps) ? editingStep.apps : (editingStep.apps ? [editingStep.apps] : []);
          
          // Editable standard steps (allow_content_edit): flow/decision structure stays managed elsewhere; step type, time, and workers are admin-editable in the workflow editor
          const updateData: any = isEditableStandardStep ? {
            step_title: editingStep.step,
            description: editingStep.description,
            step_type: editingStep.stepType || 'scaled',
            materials: editingStep.materials || [] as any,
            tools: editingStep.tools || [] as any,
            outputs: editingStep.outputs || [] as any,
            process_variables: editingStep.inputs || [] as any,
            apps: appsToSave,
            time_estimate_low: editingStep.timeEstimation?.variableTime?.low || 0,
            time_estimate_med: editingStep.timeEstimation?.variableTime?.medium || 0,
            time_estimate_high: editingStep.timeEstimation?.variableTime?.high || 0,
            number_of_workers: editingStep.workersNeeded ?? 1,
            skill_level: editingStep.skillLevel || 'Intermediate',
            updated_at: new Date().toISOString()
          } : {
            // For custom steps, allow all fields to be updated
            step_title: editingStep.step,
            description: editingStep.description,
            step_type: editingStep.stepType || 'scaled',
            flow_type: editingStep.flowType || 'prime',
            materials: editingStep.materials || [] as any,
            tools: editingStep.tools || [] as any,
            outputs: editingStep.outputs || [] as any,
            process_variables: editingStep.inputs || [] as any,
            apps: appsToSave,
            time_estimate_low: editingStep.timeEstimation?.variableTime?.low || 0,
            time_estimate_med: editingStep.timeEstimation?.variableTime?.medium || 0,
            time_estimate_high: editingStep.timeEstimation?.variableTime?.high || 0,
            number_of_workers: editingStep.workersNeeded ?? 1,
            skill_level: editingStep.skillLevel || 'Intermediate',
            updated_at: new Date().toISOString()
          };

          const { error, data } = await supabase
            .from('operation_steps')
            .update(updateData)
            .eq('id', editingStep.id)
            .select('*');
          
          if (error) {
            operationStepsSaveFailed = true;
            console.error('❌ Error saving custom step to operation_steps:', error);
            toast.error(`Failed to save step: ${error.message}`);
          } else {
            stepPersistedToDb = true;
                        // Reload phases to reflect the changes
            if (currentProject?.id) {
              const reloadedPhases = await loadPhasesFromDatabase(currentProject.id);
              setRawPhases(reloadedPhases);
            }
          }
        } catch (err) {
          operationStepsSaveFailed = true;
          console.error('❌ Exception saving custom step:', err);
        }
      }
    }

    if (!stepPersistedToDb && !operationStepsSaveFailed) {
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
      type: 'process' as const,
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
      };

  const instructionSectionPickerOptions = React.useMemo(() => {
    if (!editMode || !editingStep) return [];
    const currentStepId = editingStep.id;
    const fromPending =
      pendingContentChanges && pendingContentRef.current.stepId === currentStepId
        ? pendingContentChanges
        : null;
    const fromLoaded =
      levelSpecificContentKey.stepId === currentStepId &&
      levelSpecificContentKey.level === instructionLevel &&
      levelSpecificContent &&
      levelSpecificContent.length > 0
        ? levelSpecificContent
        : null;
    const raw =
      fromPending ??
      fromLoaded ??
      (editingStep.contentSections && editingStep.contentSections.length > 0
        ? editingStep.contentSections
        : []);
    return raw.map((s) => ({
      id: s.id,
      label: s.title?.trim() ? s.title : `${s.type} section`,
    }));
  }, [
    editMode,
    editingStep,
    pendingContentChanges,
    levelSpecificContent,
    levelSpecificContentKey.stepId,
    levelSpecificContentKey.level,
    instructionLevel,
  ]);

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
            generalDecisions={generalProjectDecisionsForEditor}
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

    if (!editMode && isLoadingContent && step.id === currentStep?.id) {
      return (
        <div className="flex items-center justify-center min-h-[8rem]">
          <p className="text-muted-foreground text-sm">
            Loading {instructionLevel} level content...
          </p>
        </div>
      );
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
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <Button variant="ghost" onClick={onBackToAdmin} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Project Manager
                </Button>
              </div>
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Open navigation menu" className="h-9 w-9">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        onBackToAdmin();
                      }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Project Manager
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex gap-2">
                <Button onClick={() => setViewMode('structure')} variant="default" size="sm" className="flex items-center gap-2">
                  <List className="w-4 h-4 max-lg:hidden" />
                  Process Map
                </Button>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Process Map
              </Badge>
            </div>
            <div className="md:hidden">
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Process Map
              </Badge>
            </div>
          </div>
        </div>

        <div className="w-full px-6">
          <StructureManager
            onBack={() => {
              setViewMode('steps');
              if (currentProject?.id) {
                setLoadingPhases(true);
                loadPhasesFromDatabase(currentProject.id)
                  .then((phases) => {
                    setRawPhases(phases);
                    setLoadingPhases(false);
                  })
                  .catch((err) => {
                    console.error('Failed to refresh phases after Process Map:', err);
                    setLoadingPhases(false);
                  });
              }
            }}
          />
        </div>
      </div>;
  }
  return <div className="fixed inset-0 bg-background overflow-auto z-50">
      {/* Header with Project Name and Controls */}
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="w-full px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-base font-bold leading-snug sm:text-lg md:text-xl">
              {isEditingStandardProject ? '🔒 Standard Project Foundation Editor' : `Workflow Editor: ${currentProject?.name?.replace(/\s*\([Dd]raft\)\s*/g, '').replace(/\s*\(Rev\s+\d+\)\s*/gi, '').trim() || 'Untitled Project'}`}
              </h1>
              {!isEditingStandardProject ? (
                <div className="hidden md:flex mt-2 items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          aria-label="Template editing restrictions"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Standard and incorporated phases must be edited outside this template.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : null}
            </div>
            <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:justify-start">
              {editMode && (
                <Badge variant="outline" className="max-w-full truncate bg-primary/10 text-primary border-primary/20">
                  Editing: {currentStep?.step}
                </Badge>
              )}

              {/* Desktop/tablet header actions */}
              <div className="hidden md:flex flex-wrap gap-2">
                {editMode ? (
                  <>
                    <Button onClick={handleSaveEdit} size="icon" variant="outline" title="Save Changes">
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleCancelEdit} size="icon" variant="outline" title="Cancel">
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setViewMode('structure')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <List className="w-4 h-4 max-lg:hidden" />
                      Process Map
                    </Button>
                    <Button
                      onClick={() => {
                        if (!currentProject?.id) {
                          toast.error('No project selected');
                          return;
                        }
                        setPfmeaRefreshNonce((n) => n + 1);
                        setPfmeaOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={!currentProject?.id}
                      title="PFMEA"
                    >
                      <FileText className="w-4 h-4" />
                      PFMEA
                    </Button>
                    <Button
                      onClick={() => setRiskManagementOpen(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={!currentProject?.id}
                      title="Risk-Less — project risks for this template"
                    >
                      <Crosshair className="w-4 h-4" />
                      Risk-Less
                    </Button>
                    <Button
                      onClick={() => setDecisionTreeOpen(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Brain className="w-4 h-4" />
                      Decision Tree
                    </Button>
                    <Button
                      onClick={() => setImportOpen(true)}
                      variant="outline"
                      size="icon"
                      title="Import"
                      className="h-9 w-9 p-0 flex items-center justify-center"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setAiProjectGeneratorOpen(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Project Generator
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
                  </>
                )}
              </div>

              {/* Slim-width header actions */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Open actions menu">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {editMode ? (
                      <>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleSaveEdit();
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleCancelEdit();
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            toast.error('Standard and incorporated phases must be edited outside this template.');
                          }}
                        >
                          <Info className="w-4 h-4 mr-2" />
                          Template restrictions
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setViewMode('structure');
                          }}
                        >
                          Process Map
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!currentProject?.id}
                          onSelect={(e) => {
                            e.preventDefault();
                            if (!currentProject?.id) return;
                            setPfmeaRefreshNonce((n) => n + 1);
                            setPfmeaOpen(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          PFMEA
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!currentProject?.id}
                          onSelect={(e) => {
                            e.preventDefault();
                            if (!currentProject?.id) return;
                            setRiskManagementOpen(true);
                          }}
                        >
                          <Crosshair className="w-4 h-4 mr-2" />
                          Risk-Less
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setDecisionTreeOpen(true);
                          }}
                        >
                          <Brain className="w-4 h-4 mr-2" />
                          Decision Tree
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setImportOpen(true);
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Import
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setAiProjectGeneratorOpen(true);
                          }}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Project Generator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            onBackToAdmin();
                          }}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save and Close
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-3 py-4 sm:px-6 sm:py-8">
        {!editMode && (
          <Card className="mb-6 border-border/80 p-0 overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="instruction-data-sources" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]]:border-b border-border/80">
                  <div className="flex flex-col items-start gap-1 text-left pr-2">
                    <span className="text-base font-semibold">Instruction data sources</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 px-6 pb-6 pt-2">
                    <p className="text-sm text-muted-foreground">
                      Document where this project&apos;s step instructions come from (manuals, codes, internal
                      references, SMEs, etc.). One field for the whole template.
                    </p>
                    <Textarea
                      value={instructionsDataSourcesDraft}
                      onChange={(e) => setInstructionsDataSourcesDraft(e.target.value)}
                      placeholder="e.g. IRC 2021 Chapter 3; manufacturer installation guide SKU 123; in-house playbook v2"
                      rows={4}
                      className="text-sm"
                      disabled={savingInstructionsDataSources}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveInstructionsDataSources}
                      disabled={savingInstructionsDataSources}
                    >
                      {savingInstructionsDataSources ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save data sources
                        </>
                      )}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}

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
                  {(() => {
                    const ppeTools = (editingStep?.tools || []).filter((t) => t.category === 'PPE');
                    const nonPpeTools = (editingStep?.tools || []).filter((t) => t.category !== 'PPE');
                    const ppeMaterials = (editingStep?.materials || []).filter((m) => m.category === 'PPE');
                    const nonPpeMaterials = (editingStep?.materials || []).filter((m) => m.category !== 'PPE');

                    return (
                      <>
                        <Card className="bg-muted/30 border shadow-sm">
                          <CardHeader>
                            <CardTitle>Tools</CardTitle>
                            <CardDescription>Tools required for this step (excluding PPE)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <CompactToolsTable
                              title="Tools"
                              tools={nonPpeTools}
                              contentSectionOptions={instructionSectionPickerOptions}
                              onToolsChange={(tools) => updateEditingStep('tools', [...tools, ...ppeTools])}
                              onAddTool={() => {
                                setAlternateToolParentId(null);
                                setToolsLibraryOpen(true);
                              }}
                              onAddAlternate={(parentId) => {
                                setAlternateToolParentId(parentId);
                                setToolsLibraryOpen(true);
                              }}
                            />
                          </CardContent>
                        </Card>

                        <Card className="bg-muted/30 border shadow-sm">
                          <CardHeader>
                            <CardTitle>Materials</CardTitle>
                            <CardDescription>Materials for this step (excluding PPE)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <CompactMaterialsTable
                              title="Materials"
                              materials={nonPpeMaterials}
                              contentSectionOptions={instructionSectionPickerOptions}
                              onMaterialsChange={(materials) =>
                                updateEditingStep('materials', [...materials, ...ppeMaterials])
                              }
                              onAddMaterial={() => {
                                setAlternateMaterialParentId(null);
                                setMaterialsLibraryOpen(true);
                              }}
                              onAddAlternate={(parentId) => {
                                setAlternateMaterialParentId(parentId);
                                setMaterialsLibraryOpen(true);
                              }}
                            />
                          </CardContent>
                        </Card>

                        <Card className="bg-muted/30 border shadow-sm">
                          <CardHeader>
                            <CardTitle>Personal protective equipment</CardTitle>
                            <CardDescription>PPE items for this step</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <CompactPpeTable
                              ppeTools={ppeTools}
                              ppeMaterials={ppeMaterials}
                              contentSectionOptions={instructionSectionPickerOptions}
                              onPpeToolsChange={(tools) =>
                                updateEditingStep('tools', [...nonPpeTools, ...tools])
                              }
                              onPpeMaterialsChange={(materials) =>
                                updateEditingStep('materials', [...nonPpeMaterials, ...materials])
                              }
                              onAddPpe={() => {
                                setAlternatePpeToolParentId(null);
                                setAlternatePpeMaterialParentId(null);
                                setPpeLibraryOpen(true);
                              }}
                              onAddAlternatePpeTool={(parentId) => {
                                setAlternatePpeToolParentId(parentId);
                                setAlternatePpeMaterialParentId(null);
                                setPpeLibraryOpen(true);
                              }}
                              onAddAlternatePpeMaterial={(parentId) => {
                                setAlternatePpeMaterialParentId(parentId);
                                setAlternatePpeToolParentId(null);
                                setPpeLibraryOpen(true);
                              }}
                            />
                          </CardContent>
                        </Card>
                      </>
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
                    type: 'process' as const,
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

                {/* Time Estimation — admin workflow editor: always editable (incl. allow_content_edit steps) */}
                <Card className="bg-muted/30 border shadow-sm">
                  <CardHeader>
                    <CardTitle>Time Estimation & Step Type</CardTitle>
                    <CardDescription>Configure step type, time estimates (low / expected / high), workers, and skill level. Step type determines how time estimates are interpreted.</CardDescription>
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
                      typicalProjectSize={currentProject?.typicalProjectSize}
                      onChange={timeEstimation => updateEditingStep('timeEstimation', timeEstimation)}
                      onWorkersChange={workersNeeded => updateEditingStep('workersNeeded', workersNeeded)}
                      onSkillLevelChange={skillLevel => updateEditingStep('skillLevel', skillLevel)}
                    />
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    onClick={handlePrevious}
                    disabled={currentStepIndex === 0}
                    variant="outline"
                    className="h-10 w-10 shrink-0 p-0 sm:h-9 sm:w-auto sm:gap-2 sm:px-3"
                    aria-label="Previous step"
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-0" />
                    <span className="hidden sm:inline">Previous Step</span>
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={currentStepIndex >= allSteps.length - 1}
                    className="h-10 w-10 shrink-0 p-0 sm:h-9 sm:w-auto sm:gap-2 sm:px-3"
                    aria-label="Next step"
                  >
                    <span className="hidden sm:inline">Next Step</span>
                    <ChevronRight className="h-4 w-4 sm:ml-0" />
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {currentStep?.phaseName}
                        </Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="outline">
                          {currentStep?.operationName}
                        </Badge>
                      </div>
                      <>
                        <CardTitle className="break-words text-lg sm:text-2xl">{currentStep?.step}</CardTitle>
                        {currentStep?.description && <CardDescription className="text-base">
                            {currentStep.description}
                          </CardDescription>}
                      </>
                    </div>
                    <div className="flex shrink-0 gap-2 sm:self-start">
                      {(!isStepFromStandardOrIncorporatedPhase(currentStep) || currentStep?.allowContentEdit) && (
                        <Button onClick={handleStartEdit} variant="outline" size="sm" className="w-full sm:w-auto">
                          <Edit className="mr-2 h-4 w-4 shrink-0" />
                          {currentStep?.allowContentEdit ? 'Edit Content' : 'Edit Step'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Instructions */}
              <Card className="bg-muted/30 border shadow-sm">
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle>Instructions</CardTitle>
                      <CardDescription>
                        Step content for the selected detail level (matches the content editor).
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-sm font-medium whitespace-nowrap">Detail level:</Label>
                      <Select
                        value={instructionLevel}
                        onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') =>
                          setInstructionLevel(value)
                        }
                      >
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
                <CardContent className="p-8 pt-0">{renderContent(currentStep)}</CardContent>
              </Card>

              {currentStep &&
                (() => {
                  const nonPpeTools = (currentStep.tools || []).filter((t) => t.category !== 'PPE') as StepTool[];
                  const toolRows = viewOrderedToolRows(nonPpeTools);
                  return (
                    <Card className="bg-muted/30 border shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Wrench className="w-5 h-5" />
                          Tools
                        </CardTitle>
                        <CardDescription>Tools required for this step</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {toolRows.length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
                            No tools on this step.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {toolRows.map(({ tool, depth }) => (
                              <div
                                key={tool.id}
                                className={`p-3 bg-background/50 rounded-lg ${depth === 1 ? 'ml-3 border-l-2 border-l-primary/20' : ''}`}
                              >
                                <div className="font-medium">{tool.name}</div>
                                {tool.category && depth === 0 && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {tool.category}
                                  </Badge>
                                )}
                                {tool.description && (
                                  <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>
                                )}
                                {(tool.quantity !== undefined || (tool.purpose && tool.purpose.trim().length > 0)) && (
                                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                                    {tool.quantity !== undefined && (
                                      <div>Quantity: {tool.quantity}</div>
                                    )}
                                    {tool.purpose && tool.purpose.trim().length > 0 && (
                                      <div>Purpose: {tool.purpose}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

              {currentStep &&
                (() => {
                  const nonPpeMaterials = (currentStep.materials || []).filter(
                    (m) => m.category !== 'PPE'
                  ) as StepMaterial[];
                  const materialRows = viewOrderedMaterialRows(nonPpeMaterials);
                  return (
                    <Card className="bg-muted/30 border shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Package className="w-5 h-5" />
                          Materials
                        </CardTitle>
                        <CardDescription>Materials for this step</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {materialRows.length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
                            No materials on this step.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {materialRows.map(({ material, depth }) => (
                              <div
                                key={material.id}
                                className={`p-3 bg-background/50 rounded-lg ${depth === 1 ? 'ml-3 border-l-2 border-l-primary/20' : ''}`}
                              >
                                <div className="font-medium">{material.name}</div>
                                {material.category && depth === 0 && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {material.category}
                                  </Badge>
                                )}
                                {material.description && (
                                  <div className="text-sm text-muted-foreground mt-1">{material.description}</div>
                                )}
                                {(material.quantity !== undefined ||
                                  (material.purpose && material.purpose.trim().length > 0) ||
                                  (material.unit && material.unit.trim().length > 0)) && (
                                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                                    {material.quantity !== undefined && (
                                      <div>
                                        Quantity: {material.quantity}
                                        {material.unit && material.unit.trim().length > 0
                                          ? ` ${material.unit}`
                                          : ''}
                                      </div>
                                    )}
                                    {material.purpose && material.purpose.trim().length > 0 && (
                                      <div>Purpose: {material.purpose}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

              {currentStep &&
                (() => {
                  const ppeTools = (currentStep.tools || []).filter((t) => t.category === 'PPE') as StepTool[];
                  const ppeMaterials = (currentStep.materials || []).filter(
                    (m) => m.category === 'PPE'
                  ) as StepMaterial[];
                  const ppeToolRows = viewOrderedToolRows(ppeTools);
                  const ppeMaterialRows = viewOrderedMaterialRows(ppeMaterials);
                  const hasPpe = ppeToolRows.length > 0 || ppeMaterialRows.length > 0;
                  return (
                    <Card className="bg-muted/30 border shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Shield className="w-5 h-5" />
                          Personal protective equipment
                        </CardTitle>
                        <CardDescription>PPE for this step</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!hasPpe ? (
                          <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
                            No ppe on this step.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {ppeToolRows.map(({ tool, depth }) => (
                              <div
                                key={tool.id}
                                className={`p-3 bg-background/50 rounded-lg ${depth === 1 ? 'ml-3 border-l-2 border-l-primary/20' : ''}`}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{tool.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Tool
                                  </Badge>
                                </div>
                                {tool.description && (
                                  <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>
                                )}
                                {(tool.quantity !== undefined || (tool.purpose && tool.purpose.trim().length > 0)) && (
                                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                                    {tool.quantity !== undefined && (
                                      <div>Quantity: {tool.quantity}</div>
                                    )}
                                    {tool.purpose && tool.purpose.trim().length > 0 && (
                                      <div>Purpose: {tool.purpose}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {ppeMaterialRows.map(({ material, depth }) => (
                              <div
                                key={material.id}
                                className={`p-3 bg-background/50 rounded-lg ${depth === 1 ? 'ml-3 border-l-2 border-l-primary/20' : ''}`}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{material.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    Material
                                  </Badge>
                                </div>
                                {material.description && (
                                  <div className="text-sm text-muted-foreground mt-1">{material.description}</div>
                                )}
                                {(material.quantity !== undefined ||
                                  (material.purpose && material.purpose.trim().length > 0) ||
                                  (material.unit && material.unit.trim().length > 0)) && (
                                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                                    {material.quantity !== undefined && (
                                      <div>
                                        Quantity: {material.quantity}
                                        {material.unit && material.unit.trim().length > 0
                                          ? ` ${material.unit}`
                                          : ''}
                                      </div>
                                    )}
                                    {material.purpose && material.purpose.trim().length > 0 && (
                                      <div>Purpose: {material.purpose}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

              {currentStep && (
                <Card className="bg-muted/30 border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileOutput className="w-5 h-5" />
                      Outputs
                    </CardTitle>
                    <CardDescription>What this step produces</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!currentStep.outputs || currentStep.outputs.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
                        No outputs on this step.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentStep.outputs.map((output) => (
                          <div key={output.id} className="p-3 bg-background/50 rounded-lg">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="font-medium">{output.name}</div>
                              {output.type !== 'none' &&
                                ['major-aesthetics', 'performance-durability', 'safety'].includes(
                                  output.type
                                ) && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {output.type.replace('-', ' ')}
                                  </Badge>
                                )}
                            </div>
                            {output.description && (
                              <div className="text-sm text-muted-foreground mt-1">{output.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep && (
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="w-5 h-5" />
                      Apps for this step
                    </CardTitle>
                    <CardDescription>Linked apps and tools</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!currentStep.apps || currentStep.apps.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md border-primary/20">
                        No apps linked to this step.
                      </div>
                    ) : (
                      <CompactAppsSection
                        apps={currentStep.apps}
                        onAppsChange={() => {}}
                        onAddApp={() => {}}
                        onLaunchApp={() => {}}
                        editMode={false}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep && (
                <Card className="bg-muted/30 border shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="w-5 h-5" />
                      Time estimation
                    </CardTitle>
                    <CardDescription>Duration, workers, and skill (preview only)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CompactTimeEstimationReadOnly
                      step={currentStep}
                      scalingUnit={currentProject?.scalingUnit}
                      typicalProjectSize={currentProject?.typicalProjectSize}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={handlePrevious}
                  disabled={currentStepIndex === 0}
                  variant="outline"
                  className="h-10 w-10 shrink-0 p-0 sm:h-9 sm:w-auto sm:gap-2 sm:px-3"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentStepIndex >= allSteps.length - 1}
                  className="h-10 w-10 shrink-0 p-0 sm:h-9 sm:w-auto sm:gap-2 sm:px-3"
                  aria-label="Next step"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
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
                    // Optionally refresh or navigate to the new project
        }}
      />
      {/* Tools & Materials Library */}
      <ToolsMaterialsWindow open={toolsMaterialsOpen} onOpenChange={setToolsMaterialsOpen} />
      
      {/* Risk-Less (template risks for the project being edited) */}
      {currentProject && (
        <RiskManagementWindow
          open={riskManagementOpen}
          onOpenChange={setRiskManagementOpen}
          projectId={currentProject.id}
          mode="template"
          workflowEditorRiskLess
          templateProjectDisplayName={currentProject.name}
        />
      )}

      {/* PFMEA */}
      <Dialog open={pfmeaOpen} onOpenChange={setPfmeaOpen}>
        <DialogContent className="relative fixed inset-0 z-50 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 shadow-none overflow-hidden md:max-w-none md:max-h-none md:rounded-none [&>button]:hidden">
          <DialogHeader className="px-2 md:px-4 py-1.5 md:py-2 border-b flex-shrink-0 bg-background">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg md:text-xl font-bold">Process FMEA</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPfmeaOpen(false)}
                className="h-7 px-2 text-[9px] md:text-xs"
              >
                Close
              </Button>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 md:px-4 py-3 md:py-4">
            {currentProject?.id ? <PFMEAManagement projectId={currentProject.id} refreshTrigger={pfmeaRefreshNonce} /> : null}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Apps Library Dialog */}
      <AppsLibraryDialog open={appsLibraryOpen} onOpenChange={setAppsLibraryOpen} selectedApps={editingStep?.apps || []} onAppsSelected={apps => updateEditingStep('apps', apps)} />
      
      <MultiSelectLibraryDialog
        open={toolsLibraryOpen}
        onOpenChange={(open) => {
          setToolsLibraryOpen(open);
          if (!open) setAlternateToolParentId(null);
        }}
        type="tools"
        categoryExclude="PPE"
        titleOverride={alternateToolParentId ? 'Select substitute tool' : null}
        availableStepTools={editingStep?.tools?.map((t) => ({
          id: t.id,
          name: t.name,
        })) || []}
        onSelect={(selectedItems) => {
          const parentId = alternateToolParentId;
          setAlternateToolParentId(null);
          const newTools: StepTool[] = selectedItems.map((item) => ({
            id: `tool-${Date.now()}-${Math.random()}`,
            name: item.item,
            description: item.description || '',
            category: item.category as StepTool['category'],
            alternates: [],
            quantity: item.quantity,
            ...(parentId ? { parentId } : {}),
          }));
          updateEditingStep('tools', [...(editingStep?.tools || []), ...newTools]);
        }}
      />

      <MultiSelectLibraryDialog
        open={materialsLibraryOpen}
        onOpenChange={(open) => {
          setMaterialsLibraryOpen(open);
          if (!open) setAlternateMaterialParentId(null);
        }}
        type="materials"
        categoryExclude="PPE"
        titleOverride={alternateMaterialParentId ? 'Select substitute material' : null}
        onSelect={(selectedItems) => {
          const parentId = alternateMaterialParentId;
          setAlternateMaterialParentId(null);
          const newMaterials: StepMaterial[] = selectedItems.map((item) => ({
            id: `material-${Date.now()}-${Math.random()}`,
            name: item.item,
            description: item.description || '',
            category: item.category as StepMaterial['category'],
            alternates: [],
            quantity: item.quantity,
            unit: item.unit || undefined,
            ...(parentId ? { parentId } : {}),
          }));
          updateEditingStep('materials', [...(editingStep?.materials || []), ...newMaterials]);
        }}
      />

      <MultiSelectLibraryDialog
        open={ppeLibraryOpen}
        onOpenChange={(open) => {
          setPpeLibraryOpen(open);
          if (!open) {
            setAlternatePpeToolParentId(null);
            setAlternatePpeMaterialParentId(null);
          }
        }}
        type="ppe"
        titleOverride={
          alternatePpeToolParentId || alternatePpeMaterialParentId
            ? 'Select substitute PPE'
            : 'Select PPE'
        }
        onSelect={(selectedItems) => {
          const parentToolId = alternatePpeToolParentId;
          const parentMaterialId = alternatePpeMaterialParentId;
          setAlternatePpeToolParentId(null);
          setAlternatePpeMaterialParentId(null);

          const selectedTools = selectedItems.filter((item) => item.sourceType === 'tools');
          const selectedMaterials = selectedItems.filter((item) => item.sourceType === 'materials');

          const newPpeTools: StepTool[] = selectedTools.map((item) => ({
            id: `ppe-tool-${Date.now()}-${Math.random()}`,
            name: item.item,
            description: item.description || '',
            category: item.category as StepTool['category'],
            alternates: [],
            quantity: item.quantity,
            ...(parentToolId ? { parentId: parentToolId } : {}),
          }));

          const newPpeMaterials: StepMaterial[] = selectedMaterials.map((item) => ({
            id: `ppe-material-${Date.now()}-${Math.random()}`,
            name: item.item,
            description: item.description || '',
            category: item.category as StepMaterial['category'],
            alternates: [],
            quantity: item.quantity,
            unit: item.unit || undefined,
            ...(parentMaterialId ? { parentId: parentMaterialId } : {}),
          }));

          if (!editingStep) {
            return;
          }

          const updatedStep = {
            ...editingStep,
            tools: [...(editingStep.tools || []), ...newPpeTools],
            materials: [...(editingStep.materials || []), ...newPpeMaterials],
          };

          setEditingStep(updatedStep);
          editingStepRef.current = updatedStep;
        }}
      />

      {/* Decision Tree Manager */}
      <DecisionTreeManager 
        open={decisionTreeOpen}
        onOpenChange={setDecisionTreeOpen}
        currentProject={currentProject}
        phases={displayPhases}
        editingStandardFoundation={isEditingStandardProject}
      />
    </div>;
}