/**
 * Project Import Pipeline
 * Handles importing AI-generated project content into the database
 */

import { supabase } from '@/integrations/supabase/client';
import { GeneratedProjectStructure } from './aiProjectGenerator';

export interface ImportResult {
  success: boolean;
  projectId?: string;
  errors: string[];
  warnings: string[];
  stats: {
    phasesCreated: number;
    operationsCreated: number;
    stepsCreated: number;
    instructionsCreated: number;
    toolsMatched: number;
    materialsMatched: number;
    processVariablesCreated: number;
    outputsCreated: number;
  };
}

/**
 * Import generated project structure into database
 */
export async function importGeneratedProject(
  projectName: string,
  projectDescription: string,
  category: string[],
  generatedStructure: GeneratedProjectStructure,
  userId: string,
  projectInfo?: {
    effortLevel?: 'Low' | 'Medium' | 'High';
    skillLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
    projectChallenges?: string;
  },
  existingProjectId?: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    errors: [],
    warnings: [],
    stats: {
      phasesCreated: 0,
      operationsCreated: 0,
      stepsCreated: 0,
      instructionsCreated: 0,
      toolsMatched: 0,
      materialsMatched: 0,
      processVariablesCreated: 0,
      outputsCreated: 0,
    },
  };

  try {
    let projectId: string;

    if (existingProjectId) {
      // Update existing project
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: projectName,
          description: projectDescription,
          category,
          effort_level: projectInfo?.effortLevel || null,
          skill_level: projectInfo?.skillLevel || null,
          project_challenges: projectInfo?.projectChallenges || null,
        })
        .eq('id', existingProjectId);

      if (updateError) {
        result.errors.push(`Failed to update project: ${updateError.message}`);
        return result;
      }

      projectId = existingProjectId;

      // IMPORTANT: Only delete NON-STANDARD phases, operations, and steps
      // Standard phases (Kickoff, Planning, Ordering, Close Project) must be preserved
      console.log('🔄 Importing to existing project - preserving standard phases');
      const { data: existingPhases } = await supabase
        .from('project_phases')
        .select('id, is_standard')
        .eq('project_id', projectId);

      if (existingPhases && existingPhases.length > 0) {
        // Separate standard and custom phases
        const standardPhaseIds = existingPhases.filter(p => p.is_standard).map(p => p.id);
        const customPhaseIds = existingPhases.filter(p => !p.is_standard).map(p => p.id);
        
        console.log(`📋 Found ${standardPhaseIds.length} standard phases and ${customPhaseIds.length} custom phases`);
        
        // Only delete custom (non-standard) phases
        if (customPhaseIds.length > 0) {
          // Get operations for custom phases only
          const { data: existingOperations } = await supabase
            .from('template_operations')
            .select('id')
            .in('phase_id', customPhaseIds);

          if (existingOperations && existingOperations.length > 0) {
            const operationIds = existingOperations.map(op => op.id);
            
            // Delete steps for custom operations
            await supabase
              .from('template_steps')
              .delete()
              .in('operation_id', operationIds);

            // Delete step instructions for custom steps
            const { data: stepIds } = await supabase
              .from('template_steps')
              .select('id')
              .in('operation_id', operationIds);
            
            if (stepIds && stepIds.length > 0) {
              await supabase
                .from('step_instructions')
                .delete()
                .in('template_step_id', stepIds.map(s => s.id));
            }
          }

          // Delete operations for custom phases
          await supabase
            .from('template_operations')
            .delete()
            .in('phase_id', customPhaseIds);

          // Delete custom phases only
          await supabase
            .from('project_phases')
            .delete()
            .in('id', customPhaseIds);
          
          console.log(`✅ Deleted ${customPhaseIds.length} custom phases (preserved ${standardPhaseIds.length} standard phases)`);
        } else {
          console.log('ℹ️ No custom phases to delete - only standard phases exist');
        }
      }
    } else {
      // Check for duplicate project name before creating
      const normalizedName = projectName.trim().toLowerCase();
      const { data: existingProjects, error: checkError } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', projectName.trim());

      if (checkError) {
        result.errors.push(`Failed to validate project name: ${checkError.message}`);
        return result;
      }

      if (existingProjects && existingProjects.length > 0) {
        const exactMatch = existingProjects.find(p => p.name.trim().toLowerCase() === normalizedName);
        if (exactMatch) {
          result.errors.push(`A project with the name "${projectName}" already exists. Please choose a unique name.`);
          return result;
        }
      }

      // Create new project using standard methodology
      const { data: newProjectId, error: createError } = await supabase
        .rpc('create_project_with_standard_foundation_v2', {
          p_project_name: projectName,
          p_project_description: projectDescription,
          p_category: category.length > 0 ? category[0] : 'general',
          p_created_by: userId,
        });

      if (createError || !newProjectId) {
        result.errors.push(`Failed to create project: ${createError?.message}`);
        return result;
      }

      projectId = newProjectId;

      // Update project with additional fields
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          category,
          effort_level: projectInfo?.effortLevel || null,
          skill_level: projectInfo?.skillLevel || null,
          project_challenges: projectInfo?.projectChallenges || null,
        })
        .eq('id', projectId);

      if (updateError) {
        result.warnings.push(`Failed to update project metadata: ${updateError.message}`);
      }

      // Note: Standard phases (Kickoff, Planning, Ordering, Close Project) are preserved
      // We only add the generated phases as custom phases
    }

    // Step 2: Process each phase
    // Get current max display_order to place generated phases after standard phases
    const { data: existingPhases } = await supabase
      .from('project_phases')
      .select('display_order')
      .eq('project_id', projectId)
      .order('display_order', { ascending: false })
      .limit(1);

    const baseDisplayOrder = existingPhases && existingPhases.length > 0 
      ? existingPhases[0].display_order + 1 
      : 0;

    for (let phaseIndex = 0; phaseIndex < generatedStructure.phases.length; phaseIndex++) {
      const phase = generatedStructure.phases[phaseIndex];
      
      // Check if phase exists in standard_phases
      const { data: existingStandardPhase } = await supabase
        .from('standard_phases')
        .select('id')
        .eq('name', phase.name)
        .maybeSingle();

      let phaseId: string;
      
      if (existingStandardPhase) {
        // Use existing standard phase - find or create project_phases entry
        const { data: existingProjectPhase } = await supabase
          .from('project_phases')
          .select('id')
          .eq('project_id', projectId)
          .eq('standard_phase_id', existingStandardPhase.id)
          .maybeSingle();
          
        if (existingProjectPhase) {
          phaseId = existingProjectPhase.id;
        } else {
          // Create project_phases entry for standard phase
          const { data: newProjectPhase, error: phaseError } = await supabase
            .from('project_phases')
            .insert({
              project_id: projectId,
              name: phase.name,
              description: phase.description,
              display_order: baseDisplayOrder + phaseIndex,
              is_standard: true,
              standard_phase_id: existingStandardPhase.id,
            })
            .select('id')
            .single();

          if (phaseError || !newProjectPhase) {
            result.warnings.push(`Failed to create project phase "${phase.name}": ${phaseError?.message}`);
            continue;
          }
          phaseId = newProjectPhase.id;
        }
      } else {
        // Create custom phase - first create standard_phase, then project_phases
        const { data: newStandardPhase, error: standardPhaseError } = await supabase
          .from('standard_phases')
          .insert({
            name: phase.name,
            description: phase.description,
            display_order: 999,
          })
          .select('id')
          .single();

        if (standardPhaseError || !newStandardPhase) {
          result.warnings.push(`Failed to create standard phase "${phase.name}": ${standardPhaseError?.message}`);
          continue;
        }

        // Create project_phases entry
        const { data: newProjectPhase, error: phaseError } = await supabase
          .from('project_phases')
          .insert({
            project_id: projectId,
            name: phase.name,
            description: phase.description,
            display_order: baseDisplayOrder + phaseIndex,
            is_standard: false,
            standard_phase_id: newStandardPhase.id,
          })
          .select('id')
          .single();

        if (phaseError || !newProjectPhase) {
          result.warnings.push(`Failed to create project phase "${phase.name}": ${phaseError?.message}`);
          continue;
        }
        phaseId = newProjectPhase.id;
      }

      // Step 3: Process operations
      // First pass: Create all operations to get IDs for alternate groups and dependencies
      const operationIdMap = new Map<string, string>(); // Map operation name/index to DB ID
      const alternateGroups = new Map<string, string[]>(); // Map group ID to operation DB IDs
      
      for (let opIndex = 0; opIndex < phase.operations.length; opIndex++) {
        const operation = phase.operations[opIndex];
        
        // Determine flow_type and alternate_group
        let flowType: string | null = null;
        let alternateGroup: string | null = null;
        let userPrompt: string | null = null;
        let dependentOn: string | null = null;
        
        if (operation.flowType === 'if-necessary') {
          flowType = 'if-necessary';
          userPrompt = operation.decisionCriteria || null;
          // dependentOn will be set after all operations are created
        } else if (operation.flowType === 'alternate') {
          flowType = 'alternate';
          alternateGroup = operation.alternateGroup || `alt-group-${phase.name}-${opIndex}`;
        } else {
          flowType = 'prime'; // Standard flow
        }

        const { data: createdOperation, error: opError } = await supabase
          .from('template_operations')
          .insert({
            project_id: projectId,
            phase_id: phaseId,
            name: operation.name,
            description: operation.description,
            display_order: opIndex,
            flow_type: flowType,
            alternate_group: alternateGroup,
            user_prompt: userPrompt,
          })
          .select('id')
          .single();

        if (opError || !createdOperation) {
          result.warnings.push(`Failed to create operation "${operation.name}": ${opError?.message}`);
          continue;
        }

        // Store operation ID mapping
        const operationKey = `${phase.name}-${operation.name}-${opIndex}`;
        operationIdMap.set(operationKey, createdOperation.id);
        
        // Track alternate groups
        if (alternateGroup) {
          const existing = alternateGroups.get(alternateGroup) || [];
          alternateGroups.set(alternateGroup, [...existing, createdOperation.id]);
        }

        result.stats.operationsCreated++;

        // Step 4: Process steps
        for (let stepIndex = 0; stepIndex < operation.steps.length; stepIndex++) {
          const step = operation.steps[stepIndex];

          // Handle tools - support both string array and object array with alternates
          let toolNames: string[] = [];
          const toolAlternatesMap = new Map<string, string[]>();
          
          if (Array.isArray(step.tools)) {
            step.tools.forEach(tool => {
              if (typeof tool === 'string') {
                toolNames.push(tool);
              } else if (tool && typeof tool === 'object' && 'name' in tool) {
                toolNames.push(tool.name);
                if (tool.alternates && Array.isArray(tool.alternates)) {
                  toolAlternatesMap.set(tool.name, tool.alternates);
                }
              }
            });
          }

          // Match tools and materials
          const matchedTools = await matchToolsToLibrary(toolNames);
          
          // Add alternate tools to matched tools
          const toolsWithAlternates = matchedTools.map(tool => {
            const alternates = toolAlternatesMap.get(tool.name) || [];
            return {
              ...tool,
              alternates: alternates.length > 0 ? alternates : undefined,
            };
          });
          const matchedMaterials = await matchMaterialsToLibrary(step.materials);

          result.stats.toolsMatched += matchedTools.filter(t => t.matched).length;
          result.stats.materialsMatched += matchedMaterials.filter(m => m.matched).length;

          // Create step
          const { data: createdStep, error: stepError } = await supabase
            .from('template_steps')
            .insert({
              operation_id: createdOperation.id,
              step_number: stepIndex + 1,
              step_title: step.stepTitle,
              description: step.description,
              content_sections: [
                {
                  id: `content-${Date.now()}-${stepIndex}`,
                  type: 'text',
                  content: step.description,
                },
              ],
              materials: matchedMaterials.map(m => ({
                name: m.matched ? m.matchedName : m.name,
                description: '',
                category: '',
              })),
              tools: toolsWithAlternates.map(t => ({
                name: t.matched ? t.matchedName : t.name,
                description: '',
                category: '',
                alternates: t.alternates,
              })),
              outputs: step.outputs.map(o => ({
                name: o.name,
                description: o.description,
                type: o.type,
              })),
              apps: [],
              estimated_time_minutes: Math.round(step.timeEstimates.medium * 60),
              display_order: stepIndex,
            })
            .select('id')
            .single();

          if (stepError || !createdStep) {
            result.warnings.push(`Failed to create step "${step.stepTitle}": ${stepError?.message}`);
            continue;
          }

          result.stats.stepsCreated++;

          // Step 5: Create step instructions (3 levels)
          for (const level of ['quick', 'detailed', 'contractor'] as const) {
            const instructionContent = step.instructions[level];

            const { error: instructionError } = await supabase
              .from('step_instructions')
              .insert({
                template_step_id: createdStep.id,
                instruction_level: level,
                content: {
                  text: instructionContent,
                  sections: [],
                  photos: [],
                  videos: [],
                  links: [],
                },
              });

            if (instructionError) {
              result.warnings.push(`Failed to create ${level} instruction for "${step.stepTitle}": ${instructionError.message}`);
            } else {
              result.stats.instructionsCreated++;
            }
          }

          // Step 6: Create process variables
          for (const pv of step.processVariables) {
            // Check if variable exists
            const { data: existingVar } = await supabase
              .from('process_variables')
              .select('id')
              .eq('name', pv.name)
              .single();

            let variableId: string;

            if (existingVar) {
              variableId = existingVar.id;
            } else {
              const { data: newVar, error: varError } = await supabase
                .from('process_variables')
                .insert({
                  name: pv.name,
                  display_name: pv.displayName,
                  description: pv.description,
                  variable_type: pv.variableType,
                  unit: pv.unit || null,
                })
                .select('id')
                .single();

              if (varError || !newVar) {
                result.warnings.push(`Failed to create process variable "${pv.name}": ${varError?.message}`);
                continue;
              }

              variableId = newVar.id;
              result.stats.processVariablesCreated++;
            }

            // Link variable to step
            const { error: linkError } = await supabase
              .from('workflow_step_process_variables')
              .insert({
                step_id: createdStep.id,
                variable_key: pv.name,
                label: pv.displayName,
                description: pv.description,
                variable_type: pv.variableType,
                required: true,
                unit: pv.unit || null,
              });

            if (linkError) {
              result.warnings.push(`Failed to link process variable "${pv.name}" to step: ${linkError.message}`);
            }
          }

          // Step 7: Create outputs
          for (const output of step.outputs) {
            // Check if output exists
            const { data: existingOutput } = await supabase
              .from('outputs')
              .select('id')
              .eq('name', output.name)
              .single();

            let outputId: string;

            if (existingOutput) {
              outputId = existingOutput.id;
            } else {
              const { data: newOutput, error: outputError } = await supabase
                .from('outputs')
                .insert({
                  name: output.name,
                  description: output.description,
                  type: output.type as any,
                  is_required: true,
                })
                .select('id')
                .single();

              if (outputError || !newOutput) {
                result.warnings.push(`Failed to create output "${output.name}": ${outputError?.message}`);
                continue;
              }

              outputId = newOutput.id;
              result.stats.outputsCreated++;
            }

            // Link output to step via workflow_step_outputs
            const { error: linkError } = await supabase
              .from('workflow_step_outputs')
              .insert({
                step_id: createdStep.id,
                name: output.name,
                description: output.description,
                output_type: output.type,
                requirement: output.requirement,
              });

            if (linkError) {
              result.warnings.push(`Failed to link output "${output.name}" to step: ${linkError.message}`);
            }
          }
        }
      }

      result.stats.phasesCreated++;
    }

    // Step 8: Store project risks (if you have a risks table, otherwise store in project metadata)
    // For now, we'll store risks in a JSON field or create a risks table entry

    // Step 9: Rebuild phases JSON from relational tables
    // This ensures the projects.phases JSONB column is in sync with the relational data
    console.log('🔄 Rebuilding phases JSON for project:', projectId);
    const { error: rebuildError } = await supabase.rpc(
      'rebuild_phases_json_from_project_phases',
      { p_project_id: projectId }
    );

    if (rebuildError) {
      result.warnings.push(`Failed to rebuild phases JSON: ${rebuildError.message}`);
      console.error('❌ Error rebuilding phases JSON:', rebuildError);
    } else {
      console.log('✅ Phases JSON rebuilt successfully');
    }

    result.success = true;
    result.projectId = projectId;

    return result;
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Match tools to library
 */
async function matchToolsToLibrary(toolNames: string[]): Promise<Array<{
  name: string;
  matched: boolean;
  matchedId?: string;
  matchedName?: string;
}>> {
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name');

  return toolNames.map(toolName => {
    const normalized = toolName.toLowerCase().trim();
    const match = tools?.find(t => 
      t.name.toLowerCase().trim() === normalized ||
      normalized.includes(t.name.toLowerCase().trim()) ||
      t.name.toLowerCase().trim().includes(normalized)
    );

    return match
      ? { name: toolName, matched: true, matchedId: match.id, matchedName: match.name }
      : { name: toolName, matched: false };
  });
}

/**
 * Match materials to library
 */
async function matchMaterialsToLibrary(materialNames: string[]): Promise<Array<{
  name: string;
  matched: boolean;
  matchedId?: string;
  matchedName?: string;
}>> {
  const { data: materials } = await supabase
    .from('materials')
    .select('id, name');

  return materialNames.map(materialName => {
    const normalized = materialName.toLowerCase().trim();
    const match = materials?.find(m => 
      m.name.toLowerCase().trim() === normalized ||
      normalized.includes(m.name.toLowerCase().trim()) ||
      m.name.toLowerCase().trim().includes(normalized)
    );

    return match
      ? { name: materialName, matched: true, matchedId: match.id, matchedName: match.name }
      : { name: materialName, matched: false };
  });
}

