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
        existingContentContext += `\n\nEXISTING PROJECT STRUCTURE (DO NOT DUPLICATE - only update content for these):\n`;
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
        existingContentContext += `\nIMPORTANT: If structure is not selected, ONLY generate content for the existing phases/operations/steps listed above. DO NOT create new phases, operations, or steps.\n`;
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

Generate a complete project structure with the following requirements:

${includeStructure ? `1. STRUCTURE: Create phases, operations, and steps
   - Phases should represent major project stages (e.g., Preparation, Execution, Finishing)
   - Operations should group related tasks within each phase
   - Steps should be specific, actionable tasks
   ${isUpdatingExisting && request.existingContent?.phases ? '   - You may create new phases/operations/steps if needed, but review existing structure first' : ''}` : `1. STRUCTURE: CRITICAL - DO NOT CREATE NEW PHASES, OPERATIONS, OR STEPS
   - Structure generation is DISABLED
   - ONLY generate content (instructions, tools, materials, outputs, etc.) for the existing phases/operations/steps listed above
   - DO NOT include any new phases, operations, or steps in your response
   - If the existing structure above is empty, return an empty phases array: "phases": []`}

2. STEP INSTRUCTIONS: Provide 3 skill levels for each step
   - QUICK: Brief overview (2-3 sentences) for experienced DIYers
   - DETAILED: Standard instructions (5-7 sentences) with key details
   - CONTRACTOR: Expert-level (8-12 sentences) with technical specifications and best practices

3. OUTPUTS: Quantified deliverables for each step
   - Each output must have a measurable requirement (e.g., "100% coverage", "No visible brush marks", "Primer dry to touch")
   - Include output name, description, type, and specific requirement

4. TOOLS AND MATERIALS: 
   - Use only tools and materials that have been added to tools library
   - Match suggested items to library items (use exact names from library)
   - If an item isn't in library, suggest it but note it needs to be added
   - Include quantities where applicable

5. PROCESS VARIABLES: Dynamic variables for each step
   - For prep steps: e.g., "cleaner_application_coverage" (percentage)
   - For execution steps: e.g., "material_coverage_rate" (square feet per unit)
   - Include: name (snake_case), displayName, description, variableType, unit (if applicable)

6. TIME ESTIMATES: High, medium, low time ranges in hours
   - Low: Fastest possible time for experienced person
   - Medium: Average time for intermediate skill level
   - High: Time for beginner or complex scenarios

${includeRisks ? `7. RISK MANAGEMENT: Key risks for the whole project
   - For each risk: risk description, likelihood (low/medium/high), impact (low/medium/high)
   - Mitigation: Specific mitigation measure
   - Mitigation cost: Optional cost estimate (e.g., "$25 for drop cloths")
   ${isUpdatingExisting && request.existingContent?.risks ? '   - CRITICAL: Review existing risks above and DO NOT duplicate them' : ''}
   ${isUpdatingExisting && request.existingContent?.risks ? '   - Only add risks that are substantially different from existing ones' : ''}` : `7. RISK MANAGEMENT: DO NOT GENERATE RISKS
   - Risks are not selected for generation
   - Skip the risks section entirely`}

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
              "description": "Step description",
              "materials": ["Material 1", "Material 2"],
              ${includeAlternateTools ? `"tools": [
                {"name": "Tool 1", "alternates": ["Alternate Tool 1", "Alternate Tool 2"]},
                {"name": "Tool 2"}
              ],` : `"tools": ["Tool 1", "Tool 2"],`}
              "outputs": [
                {
                  "name": "Output Name",
                  "description": "Output description",
                  "type": "inspection|measurement|document|photo|none",
                  "requirement": "Quantified requirement (e.g., 100% coverage)"
                }
              ],
              "processVariables": [
                {
                  "name": "variable_name_snake_case",
                  "displayName": "Display Name",
                  "description": "Variable description",
                  "variableType": "number|text|boolean|measurement",
                  "unit": "unit if applicable"
                }
              ],
              "timeEstimates": {
                "low": 0.5,
                "medium": 1.0,
                "high": 2.0
              },
              "instructions": {
                "quick": "Brief quick instruction",
                "detailed": "Detailed standard instruction",
                "contractor": "Expert-level contractor instruction"
              }
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

IMPORTANT:
- Be comprehensive and detailed
- Use professional terminology appropriate for ${request.category.join(', ')} projects
- Ensure all outputs are quantified
- Match tools/materials to library when possible
- Include realistic time estimates
${includeRisks ? '- Cover all major risks with practical mitigations' : '- DO NOT generate risks section'}
- Make instructions appropriate for each skill level
- Focus specifically on ${sanitizeInput(request.projectName)} - do NOT generate content for other project types
${!includeStructure ? `
CRITICAL STRUCTURE RESTRICTION:
- Structure generation is DISABLED (structure checkbox is unchecked)
- You MUST use the EXACT existing structure provided above in "EXISTING PROJECT STRUCTURE"
- For each existing phase/operation/step, ONLY update the content fields (instructions, tools, materials, outputs, processVariables, timeEstimates)
- DO NOT create any new phases, operations, or steps
- If no existing structure is provided, return an empty phases array: "phases": []
- The structure names (phase names, operation names, step titles) MUST match exactly what is provided above` : ''}
${isUpdatingExisting && request.existingContent?.risks ? `
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

