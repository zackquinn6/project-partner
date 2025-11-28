import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  success: boolean;
  templatesUpdated: number;
  templatesFailed: number;
  failedTemplates: Array<{
    name: string;
    id: string;
    error: string;
  }>;
  details: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SYNC: Starting standard phase sync by admin:', user.id);

    const standardProjectId = '00000000-0000-0000-0000-000000000001';
    const result: SyncResult = {
      success: true,
      templatesUpdated: 0,
      templatesFailed: 0,
      failedTemplates: [],
      details: [],
    };

    // Rebuild Standard Project phases from template_steps to ensure phases JSON is current
    console.log('SYNC: Rebuilding Standard Project phases JSON from template_steps...');
    result.details.push('Rebuilding Standard Project phases JSON from template_steps...');
    const { error: rebuildError } = await supabase.rpc('rebuild_phases_json_from_templates', {
      p_project_id: standardProjectId
    });

    if (rebuildError) {
      console.error('SYNC: Failed to rebuild Standard Project:', rebuildError);
      throw new Error(`Failed to rebuild Standard Project: ${rebuildError.message}`);
    }
    
    console.log('SYNC: ✓ Standard Project phases JSON rebuilt');
    result.details.push('✓ Standard Project phases JSON rebuilt successfully');

    // Step 2: Get all project templates INCLUDING REVISIONS (not just parents)
    // This ensures that the CURRENT/PUBLISHED versions get updated
    const { data: templates, error: templatesError } = await supabase
      .from('projects')
      .select('id, name, revision_number, is_current_version, parent_project_id')
      .eq('is_standard_template', false)
      .neq('id', standardProjectId);

    if (templatesError) {
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }

    result.details.push(`Found ${templates?.length || 0} templates to update (including all revisions)`);
    
  // SAFETY CHECK: Verify Standard Project has data to cascade
  // CRITICAL: Use is_standard flag to identify standard phases, not just standard_phase_id
  // This ensures newly added standard phases are included
  const { data: standardOpsCheck, error: standardOpsCheckError } = await supabase
    .from('template_operations')
    .select(`
      id,
      name,
      project_phases!inner(is_standard, standard_phase_id)
    `)
    .eq('project_id', standardProjectId)
    .eq('project_phases.is_standard', true);  // Use is_standard flag, not standard_phase_id
  
  if (standardOpsCheckError) {
    throw new Error(`Failed to verify standard operations: ${standardOpsCheckError.message}`);
  }
  
  if (!standardOpsCheck || standardOpsCheck.length === 0) {
    throw new Error('No standard operations found in Standard Project - cannot cascade');
  }
  
  console.log(`SYNC: Standard Project has ${standardOpsCheck.length} standard operations to cascade`);
  result.details.push(`✓ Verified Standard Project has ${standardOpsCheck.length} operations to cascade`);

    // Step 3: Update each template (including revisions)
    for (const template of templates || []) {
      // Declare revisionLabel ONCE at the start of the loop
      const revisionLabel = template.revision_number 
        ? ` [Rev ${template.revision_number}${template.is_current_version ? ' ⭐CURRENT' : ''}]`
        : '';
      
      try {
        console.log(`SYNC: Updating template "${template.name}"${revisionLabel} (${template.id})`);
        let stepsUpdatedCount = 0;
        let stepsMissingCount = 0;
        
        // Get all standard operations from Standard Project
        // CRITICAL: Use is_standard flag to identify standard phases, not just standard_phase_id
        // This ensures newly added standard phases are included in the sync
        const { data: standardOps, error: standardOpsError } = await supabase
          .from('template_operations')
          .select(`
            id,
            name,
            project_phases!inner(is_standard, standard_phase_id)
          `)
          .eq('project_id', standardProjectId)
          .eq('project_phases.is_standard', true);  // Use is_standard flag, not standard_phase_id

        if (standardOpsError) {
          throw new Error(`Failed to fetch standard operations: ${standardOpsError.message}`);
        }

        // For each standard operation, copy steps to template
        for (const standardOp of standardOps || []) {
          const standardPhaseId = (standardOp as any).project_phases?.standard_phase_id;
          const standardPhaseName = (standardOp as any).project_phases?.name;
          
          // Find matching operation in template
          // CRITICAL: Match by standard_phase_id if available, otherwise match by phase name and is_standard flag
          // This ensures newly added standard phases without standard_phase_id are still synced
          let templateOp;
          let templateOpError;
          
          if (standardPhaseId) {
            // Try matching by standard_phase_id first (for existing standard phases)
            const { data, error } = await supabase
              .from('template_operations')
              .select(`
                id,
                project_phases!inner(is_standard, standard_phase_id)
              `)
              .eq('project_id', template.id)
              .eq('project_phases.standard_phase_id', standardPhaseId)
              .eq('name', standardOp.name)
              .maybeSingle();
            templateOp = data;
            templateOpError = error;
          }
          
          // If no match by standard_phase_id, try matching by phase name and is_standard flag
          if (!templateOp && !templateOpError && standardPhaseName) {
            const { data, error } = await supabase
              .from('template_operations')
              .select(`
                id,
                project_phases!inner(is_standard, name)
              `)
              .eq('project_id', template.id)
              .eq('project_phases.is_standard', true)
              .eq('project_phases.name', standardPhaseName)
              .eq('name', standardOp.name)
              .maybeSingle();
            templateOp = data;
            templateOpError = error;
          }

          if (templateOpError) {
            console.error(`SYNC: Error finding operation "${standardOp.name}":`, templateOpError);
            continue;
          }

          if (!templateOp) {
            console.warn(`SYNC: No matching operation in template for ${standardOp.name}`);
            continue;
          }

          // Get all steps from standard operation
          const { data: standardSteps, error: standardStepsError } = await supabase
            .from('template_steps')
            .select('*')
            .eq('operation_id', standardOp.id)
            .order('display_order');

          if (standardStepsError) {
            console.error(`SYNC: Failed to fetch standard steps: ${standardStepsError.message}`);
            continue;
          }

          // Get template steps to match by step_title
          const { data: templateSteps, error: templateStepsError } = await supabase
            .from('template_steps')
            .select('id, step_title')
            .eq('operation_id', templateOp.id);

          if (templateStepsError) {
            console.error(`SYNC: Failed to fetch template steps: ${templateStepsError.message}`);
            continue;
          }

          // Update each matching step
          for (const standardStep of standardSteps || []) {
            const matchingTemplateStep = templateSteps?.find(
              ts => ts.step_title === standardStep.step_title
            );

            if (matchingTemplateStep) {
              const appsCount = standardStep.apps && Array.isArray(standardStep.apps) ? standardStep.apps.length : 0;
              console.log(`SYNC: Updating step "${standardStep.step_title}" in "${template.name}"${revisionLabel}`, {
                appsCount,
                templateStepId: matchingTemplateStep.id
              });
              
              // Update the template step with standard step data
              const { error: updateStepError } = await supabase
                .from('template_steps')
                .update({
                  step_number: standardStep.step_number,
                  description: standardStep.description,
                  content_sections: standardStep.content_sections,
                  materials: standardStep.materials,
                  tools: standardStep.tools,
                  outputs: standardStep.outputs,
                  apps: standardStep.apps,
                  flow_type: standardStep.flow_type,
                  step_type: standardStep.step_type,
                  display_order: standardStep.display_order,
                  updated_at: new Date().toISOString()
                })
                .eq('id', matchingTemplateStep.id);

              if (updateStepError) {
                console.error(`SYNC: ✗ Failed to update step "${standardStep.step_title}":`, updateStepError);
                stepsMissingCount++;
              } else {
                console.log(`SYNC: ✓ Step "${standardStep.step_title}" updated (${appsCount} apps)`);
                stepsUpdatedCount++;
              }
            } else {
              console.warn(`SYNC: ✗ No matching step found for "${standardStep.step_title}" in "${template.name}"${revisionLabel}`);
              stepsMissingCount++;
            }
          }
        }

        // Rebuild this template's phases JSON to reflect changes
        console.log(`SYNC: Rebuilding phases JSON for "${template.name}"${revisionLabel}`);
        const { error: templateRebuildError } = await supabase.rpc('rebuild_phases_json_from_templates', {
          p_project_id: template.id
        });

        if (templateRebuildError) {
          console.error(`SYNC: Rebuild failed for "${template.name}"${revisionLabel}:`, templateRebuildError);
          throw new Error(templateRebuildError.message);
        }
        
        console.log(`SYNC: ✓ Phases JSON rebuilt for "${template.name}"${revisionLabel}`);

        // VERIFICATION: Check that updates actually worked
        const { data: verifyStep, error: verifyError } = await supabase
          .from('template_steps')
          .select('step_title, apps')
          .eq('operation_id', await supabase
            .from('template_operations')
            .select('id')
            .eq('project_id', template.id)
            .limit(1)
            .single()
            .then(res => res.data?.id)
          )
          .ilike('step_title', '%timeline%')
          .maybeSingle();
        
        if (verifyStep) {
          const appsCount = verifyStep.apps && Array.isArray(verifyStep.apps) ? verifyStep.apps.length : 0;
          console.log(`SYNC: VERIFICATION - "${template.name}"${revisionLabel} "Set Project Timeline" has ${appsCount} apps`);
        }

        // Update the template's updated_at timestamp
        const { error: updateError } = await supabase
          .from('projects')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', template.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        result.templatesUpdated++;
        result.details.push(`✓ Updated: ${template.name}${revisionLabel} (${stepsUpdatedCount} steps updated, ${stepsMissingCount} steps missing)`);
        console.log(`SYNC: ✓ Successfully updated "${template.name}"${revisionLabel} - ${stepsUpdatedCount} steps updated`);
      } catch (error) {
        result.templatesFailed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failedTemplates.push({
          name: `${template.name}${revisionLabel}`,
          id: template.id,
          error: errorMessage,
        });
        result.details.push(`✗ Failed: ${template.name}${revisionLabel} - ${errorMessage}`);
        console.error(`SYNC: ✗ Failed to update "${template.name}"${revisionLabel}:`, error);
      }
    }

    // Log to security events
    await supabase.rpc('log_comprehensive_security_event', {
      event_type_param: 'manual_standard_phase_sync',
      severity_param: 'high',
      description_param: `Admin manually synced standard phases to ${result.templatesUpdated} templates`,
      user_id_param: user.id,
      user_email_param: user.email || null,
      ip_address_param: null,
      user_agent_param: req.headers.get('user-agent') || null,
      additional_data_param: result,
    });

    result.details.push(
      `\nSync completed: ${result.templatesUpdated} updated, ${result.templatesFailed} failed`
    );

    console.log('SYNC: Completed -', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SYNC: Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
