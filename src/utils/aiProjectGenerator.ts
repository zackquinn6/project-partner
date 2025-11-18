/**
 * AI Project Generator Utilities
 * Handles AI-powered project content generation with web scraping and content population
 */

import { supabase } from '@/integrations/supabase/client';

export interface ProjectGenerationRequest {
  projectName: string;
  projectDescription?: string;
  category: string[];
  aiModel?: 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-4o';
  includeWebScraping?: boolean;
  webSources?: string[];
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
  };
}

export interface GeneratedProjectStructure {
  phases: Array<{
    name: string;
    description: string;
    operations: Array<{
      name: string;
      description: string;
      flowType?: 'if-necessary' | 'alternate' | 'standard';
      alternateGroup?: string; // Group ID for alternative operations
      decisionCriteria?: string; // Criteria for if-necessary operations
      dependentOn?: string; // Operation ID this depends on
      steps: Array<{
        stepTitle: string;
        description: string;
        materials: string[];
        tools: Array<{
          name: string;
          alternates?: string[]; // Alternate tool names
        }>;
        outputs: Array<{
          name: string;
          description: string;
          type: string;
          requirement: string;
        }>;
        processVariables: Array<{
          name: string;
          displayName: string;
          description: string;
          variableType: 'number' | 'text' | 'boolean' | 'measurement';
          unit?: string;
        }>;
        timeEstimates: {
          low: number;
          medium: number;
          high: number;
        };
        instructions: {
          quick: string;
          detailed: string;
          contractor: string;
        };
      }>;
    }>;
  }>;
  risks: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
    mitigationCost?: string;
  }>;
  metadata: {
    estimatedCost: {
      scraping: number;
      aiProcessing: number;
      total: number;
    };
    sourcesUsed: string[];
    generationTime: number;
  };
}

export interface CostEstimate {
  scraping: {
    estimated: number;
    actual?: number;
  };
  aiProcessing: {
    estimated: number;
    actual?: number;
    model: string;
    tokensUsed?: {
      input: number;
      output: number;
    };
  };
  total: {
    estimated: number;
    actual?: number;
  };
}

/**
 * Calculate cost estimate for project generation
 */
export function calculateCostEstimate(
  projectName: string,
  estimatedSteps: number = 50,
  model: 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-4o' = 'gpt-4o-mini',
  includeWebScraping: boolean = true
): CostEstimate {
  // Cost per 1M tokens (as of 2024)
  const modelCosts = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4o': { input: 2.50, output: 10.0 },
  };

  // Estimate tokens per step (rough estimates)
  const tokensPerStep = {
    input: 2000, // Average prompt size per step
    output: 1500, // Average response size per step
  };

  const totalInputTokens = estimatedSteps * tokensPerStep.input;
  const totalOutputTokens = estimatedSteps * tokensPerStep.output;

  const inputCost = (totalInputTokens / 1_000_000) * modelCosts[model].input;
  const outputCost = (totalOutputTokens / 1_000_000) * modelCosts[model].output;
  const aiProcessingCost = inputCost + outputCost;

  // Web scraping cost (infrastructure, minimal)
  const scrapingCost = includeWebScraping ? 0.10 : 0;

  return {
    scraping: {
      estimated: scrapingCost,
    },
    aiProcessing: {
      estimated: aiProcessingCost,
      model,
      tokensUsed: {
        input: totalInputTokens,
        output: totalOutputTokens,
      },
    },
    total: {
      estimated: scrapingCost + aiProcessingCost,
    },
  };
}

/**
 * Generate project using AI
 */
export async function generateProjectWithAI(
  request: ProjectGenerationRequest
): Promise<GeneratedProjectStructure> {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke('ai-project-generator', {
      body: {
        projectName: request.projectName,
        projectDescription: request.projectDescription,
        category: request.category,
        aiModel: request.aiModel || 'gpt-4o-mini',
        includeWebScraping: request.includeWebScraping ?? true,
        webSources: request.webSources || [],
        contentSelection: request.contentSelection,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate project');
    }

    const generationTime = Date.now() - startTime;

    return {
      ...data.project,
      metadata: {
        ...data.metadata,
        generationTime,
      },
    };
  } catch (error) {
    console.error('Error generating project:', error);
    throw error;
  }
}

/**
 * Match tools and materials to existing library
 */
export async function matchToolsAndMaterials(
  suggestedItems: string[],
  type: 'tools' | 'materials'
): Promise<Array<{ name: string; matched: boolean; matchedId?: string; matchedName?: string }>> {
  try {
    const table = type === 'tools' ? 'tools' : 'materials';
    
    // Fetch all items from library
    const { data: libraryItems, error } = await supabase
      .from(table)
      .select('id, name')
      .order('name');

    if (error) {
      console.error(`Error fetching ${table}:`, error);
      return suggestedItems.map(item => ({ name: item, matched: false }));
    }

    // Simple fuzzy matching
    return suggestedItems.map(suggested => {
      const normalizedSuggested = suggested.toLowerCase().trim();
      
      // Try exact match first
      let match = libraryItems?.find(
        item => item.name.toLowerCase().trim() === normalizedSuggested
      );

      // Try partial match
      if (!match) {
        match = libraryItems?.find(
          item => normalizedSuggested.includes(item.name.toLowerCase().trim()) ||
                  item.name.toLowerCase().trim().includes(normalizedSuggested)
        );
      }

      if (match) {
        return {
          name: suggested,
          matched: true,
          matchedId: match.id,
          matchedName: match.name,
        };
      }

      return {
        name: suggested,
        matched: false,
      };
    });
  } catch (error) {
    console.error(`Error matching ${type}:`, error);
    return suggestedItems.map(item => ({ name: item, matched: false }));
  }
}

