/**
 * AI Prompt Templates for Project Generation
 * Templates for generating comprehensive DIY project content
 */

export interface PromptContext {
  projectName: string;
  projectDescription?: string;
  category: string[];
  existingTools?: string[];
  existingMaterials?: string[];
}

/**
 * Main prompt for generating complete project structure
 */
export function getProjectGenerationPrompt(context: PromptContext): string {
  const { projectName, projectDescription, category, existingTools = [], existingMaterials = [] } = context;

  return `You are an expert DIY project planner specializing in ${category.join(', ')} projects.

Create a comprehensive interior painting project with complete structure and content.

PROJECT: ${projectName}
${projectDescription ? `DESCRIPTION: ${projectDescription}` : ''}
CATEGORY: ${category.join(', ')}

${existingTools.length > 0 ? `AVAILABLE TOOLS IN LIBRARY: ${existingTools.join(', ')}` : ''}
${existingMaterials.length > 0 ? `AVAILABLE MATERIALS IN LIBRARY: ${existingMaterials.join(', ')}` : ''}

Generate a complete project structure with the following requirements:

1. STRUCTURE: Create phases, operations, and steps
   - Phases should represent major project stages (e.g., Preparation, Execution, Finishing)
   - Operations should group related tasks within each phase
   - Steps should be specific, actionable tasks

2. STEP INSTRUCTIONS: Provide 3 skill levels for each step
   - QUICK: Brief overview for experienced DIYers (2-3 sentences)
   - DETAILED: Standard instructions with key details (5-7 sentences)
   - CONTRACTOR: Expert-level with technical specifications and best practices (8-12 sentences)

3. OUTPUTS: Quantified deliverables for each step
   - Each output must have a measurable requirement (e.g., "100% coverage", "No visible brush marks", "Primer dry to touch")
   - Include output name, description, type, and specific requirement

4. TOOLS AND MATERIALS: 
   - Use ONLY tools and materials from the library if available
   - Match suggested items to library items (use exact names from library)
   - If an item isn't in library, suggest it but note it needs to be added
   - Include quantities where applicable

5. PROCESS VARIABLES: Dynamic variables for each step
   - For prep steps: e.g., "cleaner_application_coverage" (percentage)
   - For painting steps: e.g., "lighting_brightness" (lumens or description)
   - Include: name (snake_case), displayName, description, variableType, unit (if applicable)

6. TIME ESTIMATES: High, medium, low time ranges in hours
   - Low: Fastest possible time for experienced person
   - Medium: Average time for intermediate skill level
   - High: Time for beginner or complex scenarios

7. RISK MANAGEMENT: Key risks for the whole project
   - For each risk: risk description, likelihood (low/medium/high), impact (low/medium/high)
   - Mitigation: Specific mitigation measure
   - Mitigation cost: Optional cost estimate (e.g., "$25 for drop cloths")

Return the response as a JSON object with this exact structure:
{
  "phases": [
    {
      "name": "Phase Name",
      "description": "Phase description",
      "operations": [
        {
          "name": "Operation Name",
          "description": "Operation description",
          "steps": [
            {
              "stepTitle": "Step Title",
              "description": "Step description",
              "materials": ["Material 1", "Material 2"],
              "tools": ["Tool 1", "Tool 2"],
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
  ],
  "risks": [
    {
      "risk": "Risk description",
      "likelihood": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "Specific mitigation measure",
      "mitigationCost": "Optional cost estimate"
    }
  ]
}

IMPORTANT:
- Be comprehensive and detailed
- Use professional terminology
- Ensure all outputs are quantified
- Match tools/materials to library when possible
- Include realistic time estimates
- Cover all major risks with practical mitigations
- Make instructions appropriate for each skill level`;
}

/**
 * Prompt for web scraping content extraction
 */
export function getWebScrapingExtractionPrompt(
  scrapedContent: string,
  projectName: string,
  category: string[]
): string {
  return `Extract relevant project information from the following web content for a ${category.join(', ')} project: "${projectName}"

WEB CONTENT:
${scrapedContent}

Extract:
1. Step-by-step instructions
2. Required tools and materials
3. Safety warnings
4. Time estimates
5. Best practices
6. Common mistakes to avoid

Format as structured JSON that can be integrated into the project generation system.`;
}

/**
 * Prompt for refining generated content
 */
export function getContentRefinementPrompt(
  generatedContent: any,
  feedback?: string
): string {
  return `Review and refine the following generated project content:

${JSON.stringify(generatedContent, null, 2)}

${feedback ? `SPECIFIC FEEDBACK: ${feedback}` : ''}

Refine the content to ensure:
1. All instructions are clear and actionable
2. Tools and materials are properly matched to library
3. Outputs are properly quantified
4. Time estimates are realistic
5. Process variables are relevant and well-defined
6. Risks are comprehensive with practical mitigations

Return the refined content in the same JSON structure.`;
}

/**
 * Prompt for generating instruction variations by skill level
 */
export function getInstructionLevelPrompt(
  baseInstruction: string,
  level: 'quick' | 'detailed' | 'contractor'
): string {
  const levelDescriptions = {
    quick: 'Brief overview (2-3 sentences) for experienced DIYers who need a reminder',
    detailed: 'Standard instructions (5-7 sentences) with key details for intermediate users',
    contractor: 'Expert-level instructions (8-12 sentences) with technical specifications, best practices, and professional tips',
  };

  return `Convert the following instruction to ${level} level:

BASE INSTRUCTION:
${baseInstruction}

REQUIREMENTS:
- ${levelDescriptions[level]}
- Include all critical information
- Use appropriate technical depth
- Maintain clarity and actionability

Return only the ${level} level instruction text.`;
}

