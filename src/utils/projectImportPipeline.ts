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
  userId: string
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
    // Step 1: Create project template
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: projectName,
        description: projectDescription,
        category,
        publish_status: 'draft',
        created_by: userId,
        phases: [], // Will be populated by trigger
      })
      .select('id')
      .single();

    if (projectError || !project) {
      result.errors.push(`Failed to create project: ${projectError?.message}`);
      return result;
    }

    const projectId = project.id;

    // Step 2: Process each phase
    for (const phase of generatedStructure.phases) {
      // Check if phase exists in standard_phases or create custom phase
      let phaseId: string;

      // Try to find existing standard phase
      const { data: existingPhase } = await supabase
        .from('standard_phases')
        .select('id')
        .eq('name', phase.name)
        .single();

      if (existingPhase) {
        phaseId = existingPhase.id;
      } else {
        // Create custom standard phase
        const { data: newPhase, error: phaseError } = await supabase
          .from('standard_phases')
          .insert({
            name: phase.name,
            description: phase.description,
            is_locked: false,
            position_rule: 'nth',
            position_value: 999, // Will be adjusted
          })
          .select('id')
          .single();

        if (phaseError || !newPhase) {
          result.warnings.push(`Failed to create phase "${phase.name}": ${phaseError?.message}`);
          continue;
        }

        phaseId = newPhase.id;
      }

      // Step 3: Process operations
      for (let opIndex = 0; opIndex < phase.operations.length; opIndex++) {
        const operation = phase.operations[opIndex];

        const { data: createdOperation, error: opError } = await supabase
          .from('template_operations')
          .insert({
            project_id: projectId,
            standard_phase_id: phaseId,
            name: operation.name,
            description: operation.description,
            display_order: opIndex,
          })
          .select('id')
          .single();

        if (opError || !createdOperation) {
          result.warnings.push(`Failed to create operation "${operation.name}": ${opError?.message}`);
          continue;
        }

        result.stats.operationsCreated++;

        // Step 4: Process steps
        for (let stepIndex = 0; stepIndex < operation.steps.length; stepIndex++) {
          const step = operation.steps[stepIndex];

          // Match tools and materials
          const matchedTools = await matchToolsToLibrary(step.tools);
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
              tools: matchedTools.map(t => ({
                name: t.matched ? t.matchedName : t.name,
                description: '',
                category: '',
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

