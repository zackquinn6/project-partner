import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { sanitizeInput } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectGenerationRequest {
  projectName: string;
  projectDescription?: string;
  category: string[];
  aiModel?: 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-4o';
  includeWebScraping?: boolean;
  webSources?: string[];
  aiInstructions?: string;
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
  };
  existingProjectId?: string;
  existingContent?: {
    phases?: Array<{ name: string; operations?: Array<{ name: string; steps?: Array<{ stepTitle: string }> }> }>;
    risks?: Array<{ risk: string; mitigation: string }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    
    // Get API key
    const OPENAI_API_KEY = getRequiredSecret('OPENAI_API_KEY');
    
    const request: ProjectGenerationRequest = await req.json();
    
    console.log('Generating project:', request.projectName, 'Category:', request.category, 'Model:', request.aiModel || 'gpt-4o-mini');

    // Fetch existing tools and materials from database
    // Note: This would require database access - for now, we'll pass empty arrays
    // In production, you'd query the database here
    
    // Build the prompt using the project name and category from request
    const systemPrompt = `You are an expert DIY project planner specializing in ${request.category.join(', ')} projects.
Generate comprehensive, detailed project structures with phases, operations, steps, instructions, tools, materials, outputs, process variables, time estimates, and risk management.`;

    // Build comprehensive prompt based on project name and category
    const includeDecisionTrees = request.contentSelection?.decisionTrees ?? true;
    const includeAlternateTools = request.contentSelection?.alternateTools ?? true;
    const includeStructure = request.contentSelection?.structure !== false;
    const includeRisks = request.contentSelection?.risks !== false;
    const isUpdatingExisting = !!request.existingProjectId;
    
    // Build existing content context
    let existingContentContext = '';
    if (isUpdatingExisting && request.existingContent) {
      if (request.existingContent.phases && request.existingContent.phases.length > 0) {
        if (!includeStructure) {
          existingContentContext += `\n\n═══════════════════════════════════════════════════════════════\n`;
          existingContentContext += `⚠️  CRITICAL: STRUCTURE GENERATION IS DISABLED ⚠️\n`;
          existingContentContext += `═══════════════════════════════════════════════════════════════\n`;
          existingContentContext += `\nYOU MUST USE THIS EXACT STRUCTURE - DO NOT CREATE NEW PHASES/OPERATIONS/STEPS:\n\n`;
        } else {
          existingContentContext += `\n\nEXISTING PROJECT STRUCTURE (review before creating new structure):\n`;
        }
        request.existingContent.phases.forEach(phase => {
          existingContentContext += `- Phase: ${phase.name}\n`;
          if (phase.operations) {
            phase.operations.forEach(op => {
              existingContentContext += `  - Operation: ${op.name}\n`;
              if (op.steps) {
                op.steps.forEach(step => {
                  existingContentContext += `    - Step: ${step.stepTitle}\n`;
                });
              }
            });
          }
        });
        if (!includeStructure) {
          existingContentContext += `\n═══════════════════════════════════════════════════════════════\n`;
          existingContentContext += `CRITICAL RULES:\n`;
          existingContentContext += `1. Your response MUST contain ONLY the phases, operations, and steps listed above\n`;
          existingContentContext += `2. DO NOT add, remove, rename, or modify any phases, operations, or steps\n`;
          existingContentContext += `3. ONLY generate content (tools, materials, instructions, etc.) for the existing structure\n`;
          existingContentContext += `4. Any new phases/operations/steps you create will be automatically removed\n`;
          existingContentContext += `═══════════════════════════════════════════════════════════════\n\n`;
        } else {
          existingContentContext += `\nIMPORTANT: Review the existing structure above. You may create new phases/operations/steps if needed, but consider the existing structure first.\n`;
        }
      }
      
      if (request.existingContent.risks && request.existingContent.risks.length > 0) {
        existingContentContext += `\n\nEXISTING PROJECT RISKS (DO NOT DUPLICATE - review these carefully and only add NEW risks that are meaningfully different):\n`;
        request.existingContent.risks.forEach((risk, idx) => {
          existingContentContext += `${idx + 1}. Risk: "${risk.risk}"\n   Mitigation: "${risk.mitigation}"\n`;
        });
        existingContentContext += `\nIMPORTANT: Review the existing risks above. Only generate NEW risks that are:\n`;
        existingContentContext += `- Substantially different from existing risks\n`;
        existingContentContext += `- Not just a rephrasing of an existing risk\n`;
        existingContentContext += `- Add unique value to the project risk assessment\n`;
        existingContentContext += `If a risk is already covered (even with slightly different wording), DO NOT include it.\n`;
      }
    }
    
    const userPrompt = `You are an expert DIY project planner specializing in ${request.category.join(', ')} projects.

${isUpdatingExisting ? 'UPDATE' : 'CREATE'} a comprehensive ${sanitizeInput(request.projectName)} project${isUpdatingExisting ? ' by updating existing content' : ' with complete structure and content'}.

PROJECT: ${sanitizeInput(request.projectName)}
${request.projectDescription ? `DESCRIPTION: ${sanitizeInput(request.projectDescription)}` : ''}
CATEGORY: ${request.category.join(', ')}
${request.aiInstructions ? `\nSPECIFIC INSTRUCTIONS: ${sanitizeInput(request.aiInstructions)}\n` : ''}
${existingContentContext}

CRITICAL CONTENT SELECTION RULES:
${includeStructure ? '✓ STRUCTURE: Selected - You may create/modify phases, operations, and steps' : '✗ STRUCTURE: NOT Selected - DO NOT create, modify, or delete any phases, operations, or steps. Only update content fields that are selected below.'}
${request.contentSelection?.tools !== false ? '✓ TOOLS: Selected - Review and improve tool recommendations for each step' : '✗ TOOLS: NOT Selected - DO NOT search for, suggest, or modify any tools'}
${request.contentSelection?.materials !== false ? '✓ MATERIALS: Selected - Review and improve material recommendations for each step' : '✗ MATERIALS: NOT Selected - DO NOT search for, suggest, or modify any materials'}
${request.contentSelection?.instructions3Level !== false ? '✓ INSTRUCTIONS (3-Level): Selected - Review and improve quick/detailed/contractor instructions' : '✗ INSTRUCTIONS (3-Level): NOT Selected - DO NOT create or modify instructions'}
${request.contentSelection?.outputs !== false ? '✓ OUTPUTS: Selected - Review and improve output definitions for each step' : '✗ OUTPUTS: NOT Selected - DO NOT create or modify outputs'}
${request.contentSelection?.processVariables !== false ? '✓ PROCESS VARIABLES: Selected - Review and improve process variables for each step' : '✗ PROCESS VARIABLES: NOT Selected - DO NOT create or modify process variables'}
${request.contentSelection?.timeEstimation !== false ? '✓ TIME ESTIMATION: Selected - Review and improve time estimates for each step' : '✗ TIME ESTIMATION: NOT Selected - DO NOT create or modify time estimates'}
${includeRisks ? '✓ RISKS: Selected - Review and improve project risk assessment' : '✗ RISKS: NOT Selected - DO NOT create or modify risks'}

IMPORTANT: Even when content types are NOT selected, you MUST still review the project information (name, description, existing structure) to understand the project's intent and context. This understanding helps you make better improvements to the selected content types.

Generate a complete project structure with the following requirements:

${includeStructure ? `1. STRUCTURE: Create phases, operations, and steps
   - Phases should represent major project stages (e.g., Preparation, Execution, Finishing)
   - Operations should group related tasks within each phase
   - Steps should be specific, actionable tasks
   ${isUpdatingExisting && request.existingContent?.phases ? '   - You may create new phases/operations/steps if needed, but review existing structure first' : ''}` : `1. STRUCTURE: CRITICAL - DO NOT CREATE, MODIFY, OR DELETE PHASES, OPERATIONS, OR STEPS
   - Structure generation is DISABLED (checkbox unchecked)
   - You MUST use the EXACT existing structure provided above
   - DO NOT add, remove, or rename any phases, operations, or steps
   - DO NOT change phase/operation/step names, descriptions, or order
   - ONLY update content fields that are selected (tools, materials, instructions, etc.)
   - Review the existing structure to understand the project context, but do not modify it
   - If the existing structure above is empty, return an empty phases array: "phases": []`}

${request.contentSelection?.instructions3Level !== false ? `2. STEP INSTRUCTIONS: Review and improve 3 skill levels for each step
   - QUICK: Brief overview (2-3 sentences) for experienced DIYers
   - DETAILED: Standard instructions (5-7 sentences) with key details
   - CONTRACTOR: Expert-level (8-12 sentences) with technical specifications and best practices
   - Review existing instructions and enhance them based on project context` : `2. STEP INSTRUCTIONS: DO NOT MODIFY
   - Instructions are NOT selected (checkbox unchecked)
   - DO NOT search for, create, or modify any instructions
   - Leave instructions field empty or unchanged`}

${request.contentSelection?.outputs !== false ? `3. OUTPUTS: Review and improve quantified deliverables for each step
   - Each output must have a measurable requirement (e.g., "100% coverage", "No visible brush marks", "Primer dry to touch")
   - Include output name, description, type, and specific requirement
   - Review existing outputs and enhance them based on project context` : `3. OUTPUTS: DO NOT MODIFY
   - Outputs are NOT selected (checkbox unchecked)
   - DO NOT search for, create, or modify any outputs
   - Leave outputs field empty or unchanged`}

${request.contentSelection?.tools !== false || request.contentSelection?.materials !== false ? `4. TOOLS AND MATERIALS: 
   ${request.contentSelection?.tools !== false ? '- TOOLS: Selected - Review existing tools and improve recommendations. Use only tools from the tools library when possible. Match suggested items to library items (use exact names from library). If an item isn't in library, suggest it but note it needs to be added. Consider project context when selecting tools.' : '- TOOLS: NOT Selected - DO NOT search for, suggest, or modify any tools. Leave tools field empty or unchanged.'}
   ${request.contentSelection?.materials !== false ? '- MATERIALS: Selected - Review existing materials and improve recommendations. Use only materials from the materials library when possible. Match suggested items to library items (use exact names from library). If an item isn't in library, suggest it but note it needs to be added. Consider project context when selecting materials.' : '- MATERIALS: NOT Selected - DO NOT search for, suggest, or modify any materials. Leave materials field empty or unchanged.'}
   ${request.contentSelection?.tools !== false || request.contentSelection?.materials !== false ? '- Include quantities where applicable' : ''}` : `4. TOOLS AND MATERIALS: DO NOT MODIFY
   - Tools and materials are NOT selected (checkboxes unchecked)
   - DO NOT search for, create, or modify any tools or materials
   - Leave tools and materials fields empty or unchanged`}

${request.contentSelection?.processVariables !== false ? `5. PROCESS VARIABLES: Review and improve dynamic variables for each step
   - For prep steps: e.g., "cleaner_application_coverage" (percentage)
   - For execution steps: e.g., "material_coverage_rate" (square feet per unit)
   - Include: name (snake_case), displayName, description, variableType, unit (if applicable)
   - Review existing process variables and enhance them based on project context` : `5. PROCESS VARIABLES: DO NOT MODIFY
   - Process variables are NOT selected (checkbox unchecked)
   - DO NOT search for, create, or modify any process variables
   - Leave process variables field empty or unchanged`}

${request.contentSelection?.timeEstimation !== false ? `6. TIME ESTIMATES: Review and improve high, medium, low time ranges in hours
   - Low: Fastest possible time for experienced person
   - Medium: Average time for intermediate skill level
   - High: Time for beginner or complex scenarios
   - Review existing time estimates and refine them based on project context and step complexity` : `6. TIME ESTIMATES: DO NOT MODIFY
   - Time estimation is NOT selected (checkbox unchecked)
   - DO NOT create or modify any time estimates
   - Leave time estimates field empty or unchanged`}

${includeRisks ? `7. RISK MANAGEMENT: Review and improve key risks for the whole project
   - For each risk: risk description, likelihood (low/medium/high), impact (low/medium/high)
   - Mitigation: Specific mitigation measure
   - Mitigation cost: Optional cost estimate (e.g., "$25 for drop cloths")
   ${isUpdatingExisting && request.existingContent?.risks ? '   - CRITICAL: Review existing risks above and DO NOT duplicate them' : ''}
   ${isUpdatingExisting && request.existingContent?.risks ? '   - Only add risks that are substantially different from existing ones' : ''}
   - Consider project context (name, description, structure) when identifying risks` : `7. RISK MANAGEMENT: DO NOT MODIFY
   - Risks are NOT selected (checkbox unchecked)
   - DO NOT search for, create, or modify any risks
   - Leave risks section empty or unchanged`}

${includeDecisionTrees ? `8. DECISION TREES AND ALTERNATIVE OPERATIONS:
   - IF-NECESSARY OPERATIONS: Create operations that are conditional based on project state
     Example: "Wall Spackling (If Necessary)" - only needed if walls have holes/cracks
     - Set flowType: "if-necessary"
     - Include decisionCriteria: Clear criteria for when this operation is needed
     - Set dependentOn: Reference to the operation that determines if this is needed
   
   - ALTERNATIVE OPERATIONS: Create separate operations when the process/methodology is fundamentally different
     Example: "Paint with Roller" vs "Paint with Sprayer" - different techniques, different steps
     - Set flowType: "alternate"
     - Set alternateGroup: Same group ID for all operations that are alternatives to each other
     - Each alternative operation should have complete, independent steps
   
   - STANDARD OPERATIONS: Normal operations in the workflow
     - Set flowType: "standard" or omit` : ''}

Return ONLY valid JSON in this exact structure:
{
  "phases": [
    {
      "name": "Phase Name",
      "description": "Phase description",
      "operations": [
        {
          "name": "Operation Name",
          "description": "Operation description",
          ${includeDecisionTrees ? `"flowType": "standard|if-necessary|alternate",
          "alternateGroup": "group-id-if-alternate",
          "decisionCriteria": "Criteria for if-necessary operations",
          "dependentOn": "operation-id-if-dependent",` : ''}
          "steps": [
            {
              "stepTitle": "Step Title",
              "description": "Step description"${request.contentSelection?.materials !== false ? `,
              "materials": ["Material 1", "Material 2"]` : ''}${request.contentSelection?.tools !== false ? `,
              ${includeAlternateTools ? `"tools": [
                {"name": "Tool 1", "alternates": ["Alternate Tool 1", "Alternate Tool 2"]},
                {"name": "Tool 2"}
              ]` : `"tools": ["Tool 1", "Tool 2"]`}` : ''}${request.contentSelection?.outputs !== false ? `,
              "outputs": [
                {
                  "name": "Output Name",
                  "description": "Output description",
                  "type": "inspection|measurement|document|photo|none",
                  "requirement": "Quantified requirement (e.g., 100% coverage)"
                }
              ]` : ''}${request.contentSelection?.processVariables !== false ? `,
              "processVariables": [
                {
                  "name": "variable_name_snake_case",
                  "displayName": "Display Name",
                  "description": "Variable description",
                  "variableType": "number|text|boolean|measurement",
                  "unit": "unit if applicable"
                }
              ]` : ''}${request.contentSelection?.timeEstimation !== false ? `,
              "timeEstimates": {
                "low": 0.5,
                "medium": 1.0,
                "high": 2.0
              }` : ''}${request.contentSelection?.instructions3Level !== false ? `,
              "instructions": {
                "quick": "Brief quick instruction",
                "detailed": "Detailed standard instruction",
                "contractor": "Expert-level contractor instruction"
              }` : ''}
            }
          ]
        }
      ]
    }
  ]${includeRisks ? `,
  "risks": [
    {
      "risk": "Risk description",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "Specific mitigation measure",
      "mitigationCost": "Optional cost estimate"
    }
  ]` : ''}
}

IMPORTANT CONTEXT UNDERSTANDING:
- ALWAYS review the project name, description, and existing structure to understand the project's intent
- This context helps you make better improvements to the selected content types
- Even if you're not generating certain content types, understanding the project helps you improve what you ARE generating

CONTENT GENERATION RULES:
- Be comprehensive and detailed for selected content types
- Use professional terminology appropriate for ${request.category.join(', ')} projects
${request.contentSelection?.outputs !== false ? '- Ensure all outputs are quantified' : ''}
${request.contentSelection?.tools !== false || request.contentSelection?.materials !== false ? '- Match tools/materials to library when possible' : ''}
${request.contentSelection?.timeEstimation !== false ? '- Include realistic time estimates' : ''}
${includeRisks ? '- Cover all major risks with practical mitigations' : ''}
${request.contentSelection?.instructions3Level !== false ? '- Make instructions appropriate for each skill level' : ''}
- Focus specifically on ${sanitizeInput(request.projectName)} - do NOT generate content for other project types

${!includeStructure ? `
CRITICAL STRUCTURE RESTRICTION - READ CAREFULLY:
- Structure generation is DISABLED (structure checkbox is unchecked)
- You MUST use the EXACT existing structure provided above in "EXISTING PROJECT STRUCTURE"
- DO NOT create, modify, rename, or delete any phases, operations, or steps
- DO NOT add new phases, operations, or steps that are not in the existing structure
- DO NOT propose alternative structures or suggest structural changes
- For each existing phase/operation/step, ONLY update the content fields that are SELECTED (checked)
- For content fields that are NOT selected, leave them empty or unchanged
- If no existing structure is provided, return an empty phases array: "phases": []
- The structure names (phase names, operation names, step titles) MUST match exactly what is provided above
- Review the structure to understand project context, but do not modify it
- Your response MUST contain ONLY the phases, operations, and steps listed in "EXISTING PROJECT STRUCTURE"
- Any phases, operations, or steps not in the existing structure will be automatically removed
- Focus on generating content (tools, materials, instructions, etc.) for the EXISTING structure only` : ''}
${isUpdatingExisting && request.existingContent?.risks && includeRisks ? `
CRITICAL RISK RESTRICTION:
- Review the existing risks listed above carefully
- DO NOT create duplicate risks (even if worded slightly differently)
- Only add risks that are substantially different and add unique value
- If a risk is already covered, skip it entirely` : ''}`;

    const model = request.aiModel || 'gpt-4o-mini';
    const modelName = model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 
                     model === 'gpt-4-turbo' ? 'gpt-4-turbo-preview' : 
                     'gpt-4o';

    console.log('Calling OpenAI API with model:', modelName);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response received, length:', content.length);

    let projectData;
    try {
      projectData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        projectData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // CRITICAL: If structure is deselected, filter out any new phases/operations/steps
    // Only keep phases/operations/steps that match the existing structure
    if (!includeStructure && isUpdatingExisting && request.existingContent?.phases && request.existingContent.phases.length > 0) {
      console.log('Structure deselected - filtering AI response to match existing structure');
      
      // Build a map of existing structure for quick lookup
      const existingStructureMap = new Map<string, Map<string, Set<string>>>();
      request.existingContent.phases.forEach(phase => {
        const phaseMap = new Map<string, Set<string>>();
        if (phase.operations) {
          phase.operations.forEach(op => {
            const stepSet = new Set<string>();
            if (op.steps) {
              op.steps.forEach(step => {
                stepSet.add(step.stepTitle.toLowerCase().trim());
              });
            }
            phaseMap.set(op.name.toLowerCase().trim(), stepSet);
          });
        }
        existingStructureMap.set(phase.name.toLowerCase().trim(), phaseMap);
      });

      // Filter phases to only include existing ones
      const filteredPhases = projectData.phases?.filter((phase: any) => {
        const phaseKey = phase.name?.toLowerCase().trim();
        if (!existingStructureMap.has(phaseKey)) {
          console.log(`Filtering out new phase: ${phase.name}`);
          return false;
        }

        // Filter operations to only include existing ones
        const phaseMap = existingStructureMap.get(phaseKey)!;
        if (phase.operations) {
          phase.operations = phase.operations.filter((op: any) => {
            const opKey = op.name?.toLowerCase().trim();
            if (!phaseMap.has(opKey)) {
              console.log(`Filtering out new operation: ${op.name} in phase ${phase.name}`);
              return false;
            }

            // Filter steps to only include existing ones
            const stepSet = phaseMap.get(opKey)!;
            if (op.steps) {
              op.steps = op.steps.filter((step: any) => {
                const stepKey = step.stepTitle?.toLowerCase().trim();
                if (!stepSet.has(stepKey)) {
                  console.log(`Filtering out new step: ${step.stepTitle} in operation ${op.name}`);
                  return false;
                }
                return true;
              });
            }
            return true;
          });
        }
        return true;
      }) || [];

      // Replace phases with filtered version
      projectData.phases = filteredPhases;
      console.log(`Filtered structure: ${filteredPhases.length} phases (from ${projectData.phases?.length || 0} original)`);
    } else if (!includeStructure) {
      // If structure is deselected but no existing content, return empty phases
      console.log('Structure deselected and no existing content - returning empty phases');
      projectData.phases = [];
    }

    // Calculate cost estimate
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    
    const modelCosts = {
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      'gpt-4o': { input: 2.50, output: 10.0 },
    };
    
    const costs = modelCosts[model] || modelCosts['gpt-4o-mini'];
    const inputCost = (inputTokens / 1_000_000) * costs.input;
    const outputCost = (outputTokens / 1_000_000) * costs.output;
    const totalCost = inputCost + outputCost;

    const metadata = {
      estimatedCost: {
        scraping: request.includeWebScraping ? 0.10 : 0,
        aiProcessing: totalCost,
        total: totalCost + (request.includeWebScraping ? 0.10 : 0),
      },
      sourcesUsed: request.webSources || [],
      generationTime: 0, // Will be set by client
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
      },
    };

    return new Response(JSON.stringify({
      success: true,
      project: projectData,
      metadata,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-project-generator function:', error);
    
    const statusCode = error instanceof Error && 
      (error.message.includes('authorization') || error.message.includes('token')) ? 401 : 500;
    const message = statusCode === 401 ? 'Authentication required' : 
                   error instanceof Error ? error.message : 'Project generation failed';
    
    return new Response(JSON.stringify({ 
      success: false,
      error: message,
      details: error instanceof Error ? error.stack : String(error)
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

