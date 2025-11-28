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
 * Update step content without modifying structure
 */
async function updateStepContent(
  stepId: string,
  generatedStep: any,
  contentSelection: any,
  result: ImportResult
): Promise<void> {
  // Update instructions if selected
  if (contentSelection?.instructions3Level !== false) {
    for (const level of ['quick', 'detailed', 'contractor'] as const) {
      const instructionContent = generatedStep.instructions[level];
      
      // Check if instruction already exists
      const { data: existingInstruction } = await supabase
        .from('step_instructions')
        .select('id')
        .eq('template_step_id', stepId)
        .eq('instruction_level', level)
        .maybeSingle();

      if (existingInstruction) {
        // Update existing instruction
        const { error: updateError } = await supabase
          .from('step_instructions')
          .update({
            content: {
              text: instructionContent,
              sections: [],
              photos: [],
              videos: [],
              links: [],
            },
          })
          .eq('id', existingInstruction.id);

        if (updateError) {
          result.warnings.push(`Failed to update ${level} instruction: ${updateError.message}`);
        } else {
          result.stats.instructionsCreated++;
        }
      } else {
        // Create new instruction
        const { error: insertError } = await supabase
          .from('step_instructions')
          .insert({
            template_step_id: stepId,
            instruction_level: level,
            content: {
              text: instructionContent,
              sections: [],
              photos: [],
              videos: [],
              links: [],
            },
          });

        if (insertError) {
          result.warnings.push(`Failed to create ${level} instruction: ${insertError.message}`);
        } else {
          result.stats.instructionsCreated++;
        }
      }
    }
  }

  // Update tools if selected
  if (contentSelection?.tools !== false) {
    // Handle tools - support both string array and object array with alternates
    let toolNames: string[] = [];
    const toolAlternatesMap = new Map<string, string[]>();
    
    if (Array.isArray(generatedStep.tools)) {
      generatedStep.tools.forEach((tool: any) => {
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

    // Match tools to library
    const toolsWithAlternates: any[] = [];
    const unmatchedTools: string[] = [];
    for (const toolName of toolNames) {
      const { data: matchedTool } = await supabase
        .from('tools')
        .select('id, item')
        .ilike('item', toolName)
        .limit(1)
        .maybeSingle();

      const isMatched = !!matchedTool;
      toolsWithAlternates.push({
        name: toolName,
        matched: isMatched,
        matchedName: matchedTool?.item || toolName,
        alternates: toolAlternatesMap.get(toolName) || [],
      });

      if (matchedTool) {
        result.stats.toolsMatched++;
      } else {
        unmatchedTools.push(toolName);
      }
    }
    
    // Flag unmatched tools to user
    if (unmatchedTools.length > 0) {
      result.warnings.push(`⚠️ Tools not found in library (${unmatchedTools.length}): ${unmatchedTools.join(', ')}. Please add these to the tools library to ensure proper nomenclature.`);
    }

    // Update step with new tools
    const { error: updateError } = await supabase
      .from('template_steps')
      .update({
        tools: JSON.stringify(toolsWithAlternates.map(t => ({
          name: t.matched ? t.matchedName : t.name,
          description: '',
          category: '',
          alternates: t.alternates,
        }))),
      })
      .eq('id', stepId);

    if (updateError) {
      result.warnings.push(`Failed to update tools for step: ${updateError.message}`);
    }
  }

  // Update materials if selected
  if (contentSelection?.materials !== false) {
    const materialNames = Array.isArray(generatedStep.materials) 
      ? generatedStep.materials.map((m: any) => typeof m === 'string' ? m : m.name)
      : [];

    // Match materials to library
    const matchedMaterials: any[] = [];
    const unmatchedMaterials: string[] = [];
    for (const materialName of materialNames) {
      const { data: matchedMaterial } = await supabase
        .from('materials')
        .select('id, item')
        .ilike('item', materialName)
        .limit(1)
        .maybeSingle();

      const isMatched = !!matchedMaterial;
      matchedMaterials.push({
        name: materialName,
        matched: isMatched,
        matchedName: matchedMaterial?.item || materialName,
      });

      if (matchedMaterial) {
        result.stats.materialsMatched++;
      } else {
        unmatchedMaterials.push(materialName);
      }
    }
    
    // Flag unmatched materials to user
    if (unmatchedMaterials.length > 0) {
      result.warnings.push(`⚠️ Materials not found in library (${unmatchedMaterials.length}): ${unmatchedMaterials.join(', ')}. Please add these to the materials library to ensure proper nomenclature.`);
    }

    // Update step with new materials
    const { error: updateError } = await supabase
      .from('template_steps')
      .update({
        materials: JSON.stringify(matchedMaterials.map(m => ({
          name: m.matched ? m.matchedName : m.name,
          description: '',
          category: '',
        }))),
      })
      .eq('id', stepId);

    if (updateError) {
      result.warnings.push(`Failed to update materials for step: ${updateError.message}`);
    }
  }

  // Update outputs if selected
  if (contentSelection?.outputs !== false && Array.isArray(generatedStep.outputs) && generatedStep.outputs.length > 0) {
    // Delete existing outputs for this step
    await supabase
      .from('workflow_step_outputs')
      .delete()
      .eq('step_id', stepId);

    // Track outputs by name to prevent duplicates
    const seenOutputNames = new Set<string>();
    
    // Create new outputs
    for (const output of generatedStep.outputs) {
      if (!output || !output.name) {
        continue; // Skip invalid outputs
      }
      
      // Check for duplicate output name
      if (seenOutputNames.has(output.name.toLowerCase().trim())) {
        result.warnings.push(`Skipping duplicate output "${output.name}"`);
        continue;
      }
      seenOutputNames.add(output.name.toLowerCase().trim());
      
      const { data: existingOutput } = await supabase
        .from('outputs')
        .select('id')
        .eq('name', output.name)
        .maybeSingle();

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

      // Link output to step
      const { error: linkError } = await supabase
        .from('workflow_step_outputs')
        .insert({
          step_id: stepId,
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

  // Update process variables if selected
  if (contentSelection?.processVariables !== false) {
    // Delete existing process variables for this step
    await supabase
      .from('workflow_step_process_variables')
      .delete()
      .eq('step_id', stepId);

    // Create new process variables
    for (const pv of generatedStep.processVariables) {
      const { data: existingVar } = await supabase
        .from('process_variables')
        .select('id')
        .eq('name', pv.name)
        .maybeSingle();

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
          step_id: stepId,
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
  }
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
  existingProjectId?: string,
  contentSelection?: {
    structure?: boolean;
    tools?: boolean;
    materials?: boolean;
    instructions3Level?: boolean;
    instructions1Level?: boolean;
    outputs?: boolean;
    processVariables?: boolean;
    timeEstimation?: boolean;
    decisionTrees?: boolean;
    alternateTools?: boolean;
    risks?: boolean;
  }
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
      risksCreated: 0,
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

      // If structure is not selected, skip all phase/operation/step deletion
      // Only update content within existing steps
      if (contentSelection?.structure === false) {
        console.log('📝 Content-only update mode: Skipping structure changes, only updating step content');
        // Skip to content update section - don't delete anything
      } else {
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
    // If structure is not selected, skip phase/operation/step creation and only update content
    if (contentSelection?.structure === false) {
      console.log('📝 Content-only mode: Updating existing step content without modifying structure');
      
      // Fetch all existing steps for this project
      const { data: allPhases } = await supabase
        .from('project_phases')
        .select(`
          id,
          name,
          template_operations (
            id,
            name,
            template_steps (
              id,
              step_title,
              description
            )
          )
        `)
        .eq('project_id', projectId);

      if (!allPhases) {
        result.errors.push('Failed to fetch existing project structure for content update');
        return result;
      }

      // Match generated structure to existing structure and update content
      for (const generatedPhase of generatedStructure.phases) {
        const existingPhase = allPhases.find(p => 
          p.name.toLowerCase().trim() === generatedPhase.name.toLowerCase().trim()
        );

        if (!existingPhase) {
          result.warnings.push(`Phase "${generatedPhase.name}" not found in existing project - skipping`);
          continue;
        }

        for (const generatedOp of generatedPhase.operations) {
          const existingOp = existingPhase.template_operations?.find((op: any) =>
            op.name.toLowerCase().trim() === generatedOp.name.toLowerCase().trim()
          );

          if (!existingOp) {
            result.warnings.push(`Operation "${generatedOp.name}" not found in phase "${generatedPhase.name}" - skipping`);
            continue;
          }

          for (const generatedStep of generatedOp.steps) {
            const existingStep = existingOp.template_steps?.find((step: any) =>
              step.step_title.toLowerCase().trim() === generatedStep.stepTitle.toLowerCase().trim()
            );

            if (!existingStep) {
              result.warnings.push(`Step "${generatedStep.stepTitle}" not found in operation "${generatedOp.name}" - skipping`);
              continue;
            }

            // Update step content based on contentSelection settings
            await updateStepContent(
              existingStep.id,
              generatedStep,
              contentSelection,
              result
            );
          }
        }
      }

      // Rebuild phases JSON after content updates
      const { error: rebuildError } = await supabase.rpc(
        'rebuild_phases_json_from_project_phases',
        { p_project_id: projectId }
      );

      if (rebuildError) {
        result.warnings.push(`Failed to rebuild phases JSON: ${rebuildError.message}`);
      }

      result.success = true;
      result.projectId = projectId;
      return result;
    }

    // Normal structure import mode - create/update phases, operations, and steps
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
      
      // Check if phase exists in Standard Project Foundation with is_standard: true
      // Standard Project Foundation is the source of truth for standard phases
      const standardProjectId = '00000000-0000-0000-0000-000000000001';
      const { data: existingStandardPhase } = await supabase
        .from('project_phases')
        .select('id, is_standard')
        .eq('project_id', standardProjectId)
        .eq('name', phase.name)
        .eq('is_standard', true)
        .maybeSingle();
      
      // Only treat as standard phase if it exists in Standard Project Foundation with is_standard: true
      const isCoreStandardPhase = existingStandardPhase !== null;

      let phaseId: string;
      
      if (existingStandardPhase && isCoreStandardPhase) {
        // Use existing standard phase from Standard Project Foundation
        // Find or create project_phases entry with same name and is_standard flag
        const { data: existingProjectPhase } = await supabase
          .from('project_phases')
          .select('id')
          .eq('project_id', projectId)
          .eq('name', phase.name)
          .eq('is_standard', true)
          .maybeSingle();
          
        if (existingProjectPhase) {
          phaseId = existingProjectPhase.id;
        } else {
          // Create project_phases entry for standard phase
          // Note: standard_phase_id removed, use is_standard flag instead
          const { data: newProjectPhase, error: phaseError } = await supabase
            .from('project_phases')
            .insert({
              project_id: projectId,
              name: phase.name,
              description: phase.description,
              is_standard: true,
              position_rule: 'nth',
              position_value: baseDisplayOrder + phaseIndex
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
        // Create custom phase - same as manually created phases
        // Note: standard_phase_id removed, use is_standard flag instead
        const { data: newProjectPhase, error: phaseError } = await supabase
          .from('project_phases')
          .insert({
            project_id: projectId,
            name: phase.name,
            description: phase.description,
            is_standard: false,
            position_rule: 'nth',
            position_value: baseDisplayOrder + phaseIndex
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
      // Validate that phase has operations - if not, create a default operation
      if (!phase.operations || !Array.isArray(phase.operations) || phase.operations.length === 0) {
        console.warn(`⚠️ Phase "${phase.name}" has no operations. Creating default operation.`);
        result.warnings.push(`Phase "${phase.name}" had no operations - created default operation`);
        phase.operations = [{
          name: `${phase.name} - Main Operation`,
          description: `Main operation for ${phase.name}`,
          steps: []
        }];
      }
      
      // First pass: Create all operations to get IDs for alternate groups and dependencies
      const operationIdMap = new Map<string, string>(); // Map operation name/index to DB ID
      const alternateGroups = new Map<string, string[]>(); // Map group ID to operation DB IDs
      
      for (let opIndex = 0; opIndex < phase.operations.length; opIndex++) {
        const operation = phase.operations[opIndex];
        
        // Validate that operation has steps - if not, create a default step
        if (!operation.steps || !Array.isArray(operation.steps) || operation.steps.length === 0) {
          console.warn(`⚠️ Operation "${operation.name}" in phase "${phase.name}" has no steps. Creating default step.`);
          result.warnings.push(`Operation "${operation.name}" had no steps - created default step`);
          operation.steps = [{
            stepTitle: `${operation.name} - Main Step`,
            description: `Main step for ${operation.name}`,
            materials: [],
            tools: [],
            outputs: [],
            processVariables: [],
            timeEstimates: {
              low: 0.5,
              medium: 1.0,
              high: 2.0
            },
            instructions: {
              quick: `Complete ${operation.name}`,
              detailed: `Follow the standard process for ${operation.name}`,
              contractor: `Professional approach to ${operation.name}`
            }
          }];
        }
        
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
          flowType = 'prime';
        }

        const { data: createdOperation, error: opError } = await supabase
          .from('template_operations')
          .insert({
            project_id: projectId,
            phase_id: phaseId,
            operation_name: operation.name,  // Changed from name
            operation_description: operation.description,  // Changed from description
            display_order: opIndex,
            flow_type: flowType,
            alternate_group: alternateGroup,
            user_prompt: userPrompt,
            dependent_on: dependentOn,
          })
          .select('id')
          .single();

        if (opError || !createdOperation) {
          result.errors.push(`Failed to create operation "${operation.name}": ${opError?.message}`);
          console.error(`❌ Failed to create operation "${operation.name}":`, opError);
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
        console.log(`✅ Created operation "${operation.name}" with ${operation.steps?.length || 0} steps`);

          // Step 4: Process steps
        for (let stepIndex = 0; stepIndex < operation.steps.length; stepIndex++) {
          const step = operation.steps[stepIndex];
          
          // Validate step has required fields
          if (!step.stepTitle || !step.description) {
            console.warn(`⚠️ Step at index ${stepIndex} in operation "${operation.name}" is missing required fields. Skipping.`);
            result.warnings.push(`Step at index ${stepIndex} in operation "${operation.name}" is missing required fields`);
            continue;
          }

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
          
          // Ensure step has default values for optional fields
          if (!step.materials || !Array.isArray(step.materials)) {
            step.materials = [];
          }
          if (!step.outputs || !Array.isArray(step.outputs)) {
            step.outputs = [];
          }
          if (!step.processVariables || !Array.isArray(step.processVariables)) {
            step.processVariables = [];
          }
          if (!step.timeEstimates) {
            step.timeEstimates = {
              low: 0.5,
              medium: 1.0,
              high: 2.0
            };
          }
          if (!step.instructions) {
            step.instructions = {
              quick: step.description || `Complete ${step.stepTitle}`,
              detailed: step.description || `Follow the standard process for ${step.stepTitle}`,
              contractor: step.description || `Professional approach to ${step.stepTitle}`
            };
          }

          // Match tools to library
          const toolsWithAlternates: any[] = [];
          const unmatchedTools: string[] = [];
          for (const toolName of toolNames) {
            const { data: matchedTool } = await supabase
              .from('tools')
              .select('id, item')
              .ilike('item', toolName)
              .limit(1)
              .maybeSingle();

            const isMatched = !!matchedTool;
            toolsWithAlternates.push({
              name: toolName,
              matched: isMatched,
              matchedName: matchedTool?.item || toolName,
              alternates: toolAlternatesMap.get(toolName) || [],
            });

            if (matchedTool) {
              result.stats.toolsMatched++;
            } else {
              unmatchedTools.push(toolName);
            }
          }
          
          // Flag unmatched tools to user
          if (unmatchedTools.length > 0) {
            result.warnings.push(`⚠️ Tools not found in library (${unmatchedTools.length}): ${unmatchedTools.join(', ')}. Please add these to the tools library to ensure proper nomenclature.`);
          }

          // Match materials to library
          const materialNames = Array.isArray(step.materials) 
            ? step.materials.map(m => typeof m === 'string' ? m : m.name)
            : [];

          const matchedMaterials: any[] = [];
          const unmatchedMaterials: string[] = [];
          for (const materialName of materialNames) {
            const { data: matchedMaterial } = await supabase
              .from('materials')
              .select('id, item')
              .ilike('item', materialName)
              .limit(1)
              .maybeSingle();

            const isMatched = !!matchedMaterial;
            matchedMaterials.push({
              name: materialName,
              matched: isMatched,
              matchedName: matchedMaterial?.item || materialName,
            });

            if (matchedMaterial) {
              result.stats.materialsMatched++;
            } else {
              unmatchedMaterials.push(materialName);
            }
          }
          
          // Flag unmatched materials to user
          if (unmatchedMaterials.length > 0) {
            result.warnings.push(`⚠️ Materials not found in library (${unmatchedMaterials.length}): ${unmatchedMaterials.join(', ')}. Please add these to the materials library to ensure proper nomenclature.`);
          }

          const { data: createdStep, error: stepError } = await supabase
            .from('template_steps')
            .insert({
              operation_id: createdOperation.id,
              display_order: stepIndex + 1,  // Changed from step_number
              step_title: step.stepTitle,
              description: step.description,
              content_sections: [
                {
                  id: `content-${Date.now()}-${stepIndex}`,
                  type: 'text',
                  content: step.description,
                },
              ],
              materials: (contentSelection?.materials !== false ? matchedMaterials.map(m => ({
                name: m.matched ? m.matchedName : m.name,
                description: '',
                category: '',
              })) : []),
              tools: (contentSelection?.tools !== false ? toolsWithAlternates.map(t => ({
                name: t.matched ? t.matchedName : t.name,
                description: '',
                category: '',
                alternates: t.alternates,
              })) : []),
              outputs: (Array.isArray(step.outputs) ? step.outputs.map(o => ({
                name: o.name || 'Output',
                description: o.description || '',
                type: o.type || 'none',
              })) : []),
              apps: [],
              display_order: stepIndex,
            })
            .select('id')
            .single();

          if (stepError || !createdStep) {
            result.errors.push(`Failed to create step "${step.stepTitle}" in operation "${operation.name}": ${stepError?.message}`);
            console.error(`❌ Failed to create step "${step.stepTitle}":`, stepError);
            continue;
          }

          result.stats.stepsCreated++;
          console.log(`✅ Created step "${step.stepTitle}" (ID: ${createdStep.id})`);

          // Step 5: Create step instructions (3 levels) - only if selected
          if (contentSelection?.instructions3Level !== false) {
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
          }

          // Step 6: Create process variables - only if selected
          if (contentSelection?.processVariables !== false && Array.isArray(step.processVariables) && step.processVariables.length > 0) {
            for (const pv of step.processVariables) {
              if (!pv || !pv.name) {
                continue; // Skip invalid process variables
              }
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
          }

          // Step 7: Create outputs - only if selected
          if (contentSelection?.outputs !== false && Array.isArray(step.outputs) && step.outputs.length > 0) {
            // Track outputs by name to prevent duplicates
            const seenOutputNames = new Set<string>();
            
            for (const output of step.outputs) {
              if (!output || !output.name) {
                continue; // Skip invalid outputs
              }
              
              // Check for duplicate output name within this step
              if (seenOutputNames.has(output.name.toLowerCase().trim())) {
                result.warnings.push(`Skipping duplicate output "${output.name}" for step "${step.stepTitle}"`);
                continue;
              }
              seenOutputNames.add(output.name.toLowerCase().trim());
              
              // Check if output already linked to this step (prevent duplicate links)
              const { data: existingLink } = await supabase
                .from('workflow_step_outputs')
                .select('id')
                .eq('step_id', createdStep.id)
                .eq('name', output.name)
                .maybeSingle();
              
              if (existingLink) {
                result.warnings.push(`Output "${output.name}" already linked to step "${step.stepTitle}" - skipping duplicate`);
                continue;
              }
              
              // Check if output exists
              const { data: existingOutput } = await supabase
                .from('outputs')
                .select('id')
                .eq('name', output.name)
                .maybeSingle();

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
        
        // Final validation: Ensure operation has at least one step
        // If no steps were created (all failed), create a default step
        const { data: operationSteps, error: stepsCheckError } = await supabase
          .from('template_steps')
          .select('id')
          .eq('operation_id', createdOperation.id)
          .limit(1);
        
        if (stepsCheckError) {
          result.warnings.push(`Failed to verify steps for operation "${operation.name}": ${stepsCheckError.message}`);
        } else if (!operationSteps || operationSteps.length === 0) {
          // No steps were created - create a default step
          console.warn(`⚠️ Operation "${operation.name}" has no steps after import. Creating default step.`);
          result.warnings.push(`Operation "${operation.name}" had no steps after import - created default step`);
          
          const { data: defaultStep, error: defaultStepError } = await supabase
            .from('template_steps')
            .insert({
              operation_id: createdOperation.id,
              display_order: 1,  // Changed from step_number
              step_title: `${operation.name} - Main Step`,
              description: `Main step for ${operation.name}`,
              content_sections: [{
                id: `content-${Date.now()}`,
                type: 'text',
                content: `Complete ${operation.name}`,
              }],
              materials: [],
              tools: [],
              outputs: [],
              apps: [],
              display_order: 0,
            })
            .select('id')
            .single();
          
          if (defaultStepError || !defaultStep) {
            result.errors.push(`Failed to create default step for operation "${operation.name}": ${defaultStepError?.message}`);
          } else {
            result.stats.stepsCreated++;
            console.log(`✅ Created default step for operation "${operation.name}"`);
          }
        }
      }
      
      // Final validation: Ensure phase has at least one operation
      const { data: phaseOperations, error: opsCheckError } = await supabase
        .from('template_operations')
        .select('id')
        .eq('phase_id', phaseId)
        .limit(1);
      
      if (opsCheckError) {
        result.warnings.push(`Failed to verify operations for phase "${phase.name}": ${opsCheckError.message}`);
      } else if (!phaseOperations || phaseOperations.length === 0) {
        // No operations were created - create a default operation with a step
        console.warn(`⚠️ Phase "${phase.name}" has no operations after import. Creating default operation and step.`);
        result.warnings.push(`Phase "${phase.name}" had no operations after import - created default operation and step`);
        
        const { data: defaultOp, error: defaultOpError } = await supabase
          .from('template_operations')
          .insert({
            project_id: projectId,
            phase_id: phaseId,
            operation_name: `${phase.name} - Main Operation`,  // Changed from name
            operation_description: `Main operation for ${phase.name}`,  // Changed from description
            display_order: 0,
            flow_type: 'prime',
          })
          .select('id')
          .single();
        
        if (defaultOpError || !defaultOp) {
          result.errors.push(`Failed to create default operation for phase "${phase.name}": ${defaultOpError?.message}`);
        } else {
          result.stats.operationsCreated++;
          
          // Create default step for the default operation
          const { data: defaultStep, error: defaultStepError } = await supabase
            .from('template_steps')
            .insert({
              operation_id: defaultOp.id,
              display_order: 1,  // Changed from step_number
              step_title: `${phase.name} - Main Step`,
              description: `Main step for ${phase.name}`,
              content_sections: [{
                id: `content-${Date.now()}`,
                type: 'text',
                content: `Complete ${phase.name}`,
              }],
              materials: [],
              tools: [],
              outputs: [],
              apps: [],
              display_order: 0,
            })
            .select('id')
            .single();
          
          if (defaultStepError || !defaultStep) {
            result.errors.push(`Failed to create default step for phase "${phase.name}": ${defaultStepError?.message}`);
          } else {
            result.stats.stepsCreated++;
            console.log(`✅ Created default operation and step for phase "${phase.name}"`);
          }
        }
      }

      result.stats.phasesCreated++;
    }

    // Step 8: Store project risks - import if risks exist in generated structure
    // Note: If risks are shown in preview, they should be imported regardless of checkbox
    // The checkbox controls whether AI generates NEW risks, but existing risks in the structure should be imported
    console.log('🔍 Risk import check:', {
      risksSelected: contentSelection?.risks !== false,
      hasRisks: !!generatedStructure.risks,
      risksIsArray: Array.isArray(generatedStructure.risks),
      risksCount: generatedStructure.risks?.length || 0,
      risks: generatedStructure.risks,
      contentSelectionRisks: contentSelection?.risks
    });

    // Import risks if they exist in the generated structure
    // Only skip if explicitly disabled AND we're updating existing project (to avoid overwriting)
    const shouldImportRisks = generatedStructure.risks && 
                              Array.isArray(generatedStructure.risks) && 
                              generatedStructure.risks.length > 0 &&
                              (contentSelection?.risks !== false || !existingProjectId);

    if (shouldImportRisks) {
      console.log(`📋 Importing ${generatedStructure.risks.length} risks for project ${projectId}`);
      
      // Fetch existing risks from relational table
      const { data: existingRisks, error: fetchError } = await supabase
        .from('project_risks')
        .select('risk, mitigation')
        .eq('project_id', projectId);

      if (fetchError) {
        console.error('Error fetching existing risks:', fetchError);
        result.warnings.push(`Failed to fetch existing risks: ${fetchError.message}`);
      }

      const existingRisksList = existingRisks || [];
      console.log(`📋 Found ${existingRisksList.length} existing risks`);
      
      // Get current max display_order
      const { data: maxOrderData } = await supabase
        .from('project_risks')
        .select('display_order')
        .eq('project_id', projectId)
        .order('display_order', { ascending: false })
        .limit(1);
      
      let nextDisplayOrder = (maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order : -1) + 1;
      
      // Filter out duplicate risks (check if risk description is similar)
      const newRisks = generatedStructure.risks.filter(newRisk => {
        if (!newRisk || !newRisk.risk) {
          console.warn('⚠️ Skipping invalid risk:', newRisk);
          return false;
        }
        
        // Check if a similar risk already exists
        const isDuplicate = existingRisksList.some(existingRisk => {
          const existingRiskText = (existingRisk?.risk || '').toLowerCase().trim();
          const newRiskText = (newRisk.risk || '').toLowerCase().trim();
          
          // Simple similarity check - if risk descriptions are very similar, consider it a duplicate
          if (existingRiskText === newRiskText) return true;
          if (existingRiskText.includes(newRiskText) || newRiskText.includes(existingRiskText)) {
            // If one contains the other, they're likely duplicates
            return true;
          }
          return false;
        });
        
        if (isDuplicate) {
          console.log(`⚠️ Skipping duplicate risk: "${newRisk.risk}"`);
          result.warnings.push(`Skipping duplicate risk: "${newRisk.risk}"`);
        }
        
        return !isDuplicate;
      });

      console.log(`📋 After deduplication: ${newRisks.length} new risks to insert`);

      // Insert new non-duplicate risks into relational table
      if (newRisks.length > 0) {
        const risksToInsert = newRisks.map(risk => ({
          project_id: projectId,
          risk: risk.risk,
          likelihood: (risk.likelihood || 'medium') as any,
          impact: (risk.impact || 'medium') as any,
          mitigation: risk.mitigation || null,
          display_order: nextDisplayOrder++,
        }));

        console.log('📋 Inserting risks:', risksToInsert);

        const { error: risksError } = await supabase
          .from('project_risks')
          .insert(risksToInsert);

        if (risksError) {
          console.error('❌ Error inserting risks:', risksError);
          result.warnings.push(`Failed to insert project risks: ${risksError.message}`);
        } else {
          console.log(`✅ Successfully inserted ${newRisks.length} new risks (${generatedStructure.risks.length - newRisks.length} duplicates skipped)`);
          result.stats.risksCreated = newRisks.length;
        }
      } else {
        console.log('⚠️ No new risks to insert (all were duplicates)');
      }
    } else {
      console.log('⚠️ Risks not imported:', {
        risksSelected: contentSelection?.risks !== false,
        hasRisks: !!generatedStructure.risks,
        risksIsArray: Array.isArray(generatedStructure.risks),
        risksCount: generatedStructure.risks?.length || 0
      });
    }

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
      
      // Verify the rebuild worked by fetching the updated project
      const { data: updatedProject, error: fetchError } = await supabase
        .from('projects')
        .select('id, phases')
        .eq('id', projectId)
        .single();
      
      if (!fetchError && updatedProject) {
        const phasesArray = Array.isArray(updatedProject.phases) ? updatedProject.phases : 
                           (typeof updatedProject.phases === 'string' ? JSON.parse(updatedProject.phases) : []);
        console.log(`✅ Verified phases JSON: ${phasesArray.length} phases found`);
        
        if (phasesArray.length === 0) {
          result.warnings.push('Warning: Phases JSON rebuild completed but no phases found. This may indicate an issue with the import.');
          console.warn('⚠️ Phases JSON is empty after rebuild');
        }
      } else {
        console.error('❌ Error verifying rebuilt phases:', fetchError);
        result.warnings.push(`Failed to verify rebuilt phases: ${fetchError?.message}`);
      }
    }

    result.success = true;
    result.projectId = projectId;

    return result;
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}
