import { supabase } from '@/integrations/supabase/client';
import { Project, Phase, Operation, WorkflowStep } from '@/interfaces/Project';
import { toast } from 'sonner';

/**
 * Synchronizes a single custom phase to the database template tables.
 * This ensures custom phases are properly stored in template_operations and template_steps
 * so they persist through revisions.
 */
export async function syncPhaseToDatabase(
  projectId: string,
  phase: Phase,
  displayOrder: number
): Promise<void> {
  // Skip standard phases (they're managed by the Standard Project Foundation)
  if (phase.isStandard || phase.isLinked) {
    console.log('⏭️ Skipping standard/linked phase:', phase.name);
    return;
  }

  console.log('🔄 Syncing custom phase to database:', {
    projectId,
    phaseName: phase.name,
    operationCount: phase.operations.length,
    displayOrder
  });

  try {
    // Sync each operation in the custom phase
    for (let opIndex = 0; opIndex < phase.operations.length; opIndex++) {
      const operation = phase.operations[opIndex];
      
      // Check if operation already exists in database
      // Note: custom_phase_name removed, match by phase_id instead
      const { data: phaseRecord } = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', projectId)
        .eq('name', phase.name)
        .maybeSingle();
      
      if (!phaseRecord) {
        console.warn('⚠️ Phase not found in database:', phase.name);
        continue;
      }
      
      const { data: existingOp, error: checkError } = await supabase
        .from('template_operations')
        .select('id')
        .eq('project_id', projectId)
        .eq('phase_id', phaseRecord.id)
        .eq('operation_name', operation.name)  // Changed from name
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing operation:', checkError);
        throw checkError;
      }

      let operationId: string;

      if (existingOp) {
        // Update existing operation
        console.log('🔄 Updating existing operation:', operation.name);
        
        const { error: updateError } = await supabase
          .from('template_operations')
          .update({
            operation_description: operation.description || null,  // Changed from description
            display_order: displayOrder,  // Changed from custom_phase_display_order
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOp.id);

        if (updateError) throw updateError;
        operationId = existingOp.id;
      } else {
        // Insert new operation
        console.log('➕ Creating new operation:', operation.name);
        
        // Note: is_standard_phase, custom_phase_name, custom_phase_description, and standard_phase_id removed
        // Phase standard status comes from project_phases.is_standard
        const { data: newOp, error: insertError } = await supabase
          .from('template_operations')
          .insert({
            project_id: projectId,
            phase_id: phaseRecord.id,
            operation_name: operation.name,  // Changed from name
            operation_description: operation.description || null,  // Changed from description
            display_order: displayOrder,  // Changed from custom_phase_display_order
            flow_type: operation.flowType || 'prime'
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        operationId = newOp.id;
      }

      // Sync steps for this operation
      await syncStepsForOperation(operationId, operation.steps);
    }

    console.log('✅ Custom phase synced successfully:', phase.name);
  } catch (error) {
    console.error('❌ Error syncing custom phase:', error);
    throw error;
  }
}

/**
 * Synchronizes steps for a specific operation.
 */
async function syncStepsForOperation(
  operationId: string,
  steps: WorkflowStep[]
): Promise<void> {
  // Delete existing steps that are no longer in the array
  const stepIds = steps.filter(s => s.id).map(s => s.id);
  if (stepIds.length > 0) {
    await supabase
      .from('template_steps')
      .delete()
      .eq('operation_id', operationId)
      .not('id', 'in', `(${stepIds.join(',')})`);
  }

  // Upsert all steps
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    const step = steps[stepIndex];

    const stepData = {
      operation_id: operationId,
      display_order: stepIndex + 1,  // Changed from step_number
      step_title: step.step || `Step ${stepIndex + 1}`,
      description: step.description || null,
      content_sections: JSON.stringify(step.content || []),
      materials: JSON.stringify(step.materials || []),
      tools: JSON.stringify(step.tools || []),
      outputs: JSON.stringify(step.outputs || []),
      apps: JSON.stringify(step.apps || []),
      flow_type: step.flowType || 'prime',
      step_type: step.stepType || 'prime',
      time_estimate_low: step.timeEstimation?.variableTime?.low || null,
      time_estimate_medium: step.timeEstimation?.variableTime?.medium || null,
      time_estimate_high: step.timeEstimation?.variableTime?.high || null,
      workers_needed: step.workersNeeded ?? 1,
      skill_level: step.skillLevel || null
    };

    if (step.id) {
      // Update existing step
      const { error: updateError } = await supabase
        .from('template_steps')
        .update(stepData)
        .eq('id', step.id)
        .eq('operation_id', operationId);

      if (updateError) {
        console.error('❌ Error updating step:', updateError);
        throw updateError;
      }
    } else {
      // Insert new step
      const { error: insertError } = await supabase
        .from('template_steps')
        .insert(stepData);

      if (insertError) {
        console.error('❌ Error inserting step:', insertError);
        throw insertError;
      }
    }
  }
}

/**
 * Synchronizes all custom phases in a project to the database.
 * This should be called whenever a project is saved to ensure consistency.
 */
export async function syncAllPhasesToDatabase(project: Project): Promise<void> {
  if (!project.phases || project.phases.length === 0) {
    console.log('⏭️ No phases to sync');
    return;
  }

  const customPhases = project.phases.filter(p => !p.isStandard && !p.isLinked);
  
  console.group('🔄 Syncing Custom Phases to Database');
  console.log('Project:', project.id, project.name);
  console.log('Total phases:', project.phases.length);
  console.log('Custom phases:', customPhases.length);

  try {
    let customPhaseDisplayOrder = 100; // Start after standard phases

    for (const phase of customPhases) {
      await syncPhaseToDatabase(project.id, phase, customPhaseDisplayOrder);
      customPhaseDisplayOrder += 10;
    }

    console.log('✅ All custom phases synced successfully');
    console.groupEnd();
  } catch (error) {
    console.error('❌ Error syncing custom phases:', error);
    console.groupEnd();
    toast.error('Failed to sync custom phases to database');
    throw error;
  }
}

/**
 * Removes a custom phase from the database.
 */
export async function deletePhaseFromDatabase(
  projectId: string,
  phaseName: string
): Promise<void> {
  console.log('🗑️ Deleting custom phase from database:', { projectId, phaseName });

  try {
    // Get phase ID first
    const { data: phaseRecord } = await supabase
      .from('project_phases')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', phaseName)
      .eq('is_standard', false)  // Custom phases have is_standard = false
      .maybeSingle();
    
    if (!phaseRecord) {
      console.warn('⚠️ Phase not found:', phaseName);
      return;
    }
    
    // Get all operations for this custom phase
    const { data: operations, error: fetchError } = await supabase
      .from('template_operations')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase_id', phaseRecord.id);

    if (fetchError) throw fetchError;

    if (operations && operations.length > 0) {
      const operationIds = operations.map(op => op.id);

      // Delete all steps for these operations
      const { error: deleteStepsError } = await supabase
        .from('template_steps')
        .delete()
        .in('operation_id', operationIds);

      if (deleteStepsError) throw deleteStepsError;

      // Delete all operations for this custom phase
      const { error: deleteOpsError } = await supabase
        .from('template_operations')
        .delete()
        .eq('project_id', projectId)
        .eq('phase_id', phaseRecord.id);

      if (deleteOpsError) throw deleteOpsError;

      console.log('✅ Custom phase deleted from database');
    }
  } catch (error) {
    console.error('❌ Error deleting custom phase:', error);
    throw error;
  }
}
