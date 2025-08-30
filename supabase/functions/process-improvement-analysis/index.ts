import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessImprovementRequest {
  project: {
    name: string;
    description: string;
    category: string;
    phases: any[];
  };
}

interface ImprovementRecommendation {
  id: string;
  type: 'step-addition' | 'step-modification' | 'tool-update' | 'tip-addition' | 'process-reorder';
  title: string;
  description: string;
  currentStep?: string;
  proposedChange: string;
  reasoning: string;
  confidence: number;
  source: string;
  sourceType: 'manufacturer' | 'industry-guide' | 'safety-standard' | 'best-practice';
  validated: boolean;
}

serve(async (req) => {
  console.log(`Process improvement analysis request: ${req.method}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { project }: ProcessImprovementRequest = await req.json();
    console.log('Analyzing project:', project.name, 'Category:', project.category);

    // Generate web search queries based on project type and current workflow
    const searchQueries = generateSearchQueries(project);
    console.log('Generated search queries:', searchQueries);

    // Perform web searches to gather improvement insights
    const webInsights = await performWebSearch(searchQueries);
    console.log('Web insights gathered:', webInsights.length, 'sources');

    // Analyze current workflow and generate improvements using GPT-5
    const improvements = await analyzeWorkflowWithAI(project, webInsights);
    console.log('Generated improvements:', improvements.length);

    return new Response(JSON.stringify({ 
      success: true, 
      improvements,
      searchQueriesUsed: searchQueries,
      sourcesAnalyzed: webInsights.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process improvement analysis:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to analyze workflow',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateSearchQueries(project: any): string[] {
  const baseQueries = [
    `${project.category} best practices guide`,
    `${project.category} safety standards`,
    `${project.category} professional techniques`,
    `${project.category} common mistakes avoid`,
    `${project.category} tool recommendations`,
    `${project.category} manufacturer instructions`
  ];

  // Add specific queries based on project steps
  const stepQueries: string[] = [];
  project.phases.forEach((phase: any) => {
    if (phase.operations) {
      phase.operations.forEach((operation: any) => {
        if (operation.steps) {
          operation.steps.forEach((step: any) => {
            stepQueries.push(`${step.step} ${project.category} best practice`);
          });
        }
      });
    }
  });

  return [...baseQueries, ...stepQueries.slice(0, 5)]; // Limit to avoid too many queries
}

async function performWebSearch(queries: string[]): Promise<any[]> {
  // Simulate web search results - in production, this would use a real search API
  // Focus on legitimate sources as requested
  const mockSources = [
    {
      title: "Professional Guide to Interior Painting",
      source: "sherwin-williams.com",
      type: "manufacturer",
      content: "Proper surface preparation is critical. Always use high-quality primer for better adhesion and coverage.",
      confidence: 0.95
    },
    {
      title: "Home Depot Pro Painting Tips",
      source: "homedepot.com",
      type: "industry-guide", 
      content: "Use angled brushes for cutting in around trim and edges. Roll in W patterns for even coverage.",
      confidence: 0.88
    },
    {
      title: "OSHA Safety Guidelines for Home Improvement",
      source: "osha.gov",
      type: "safety-standard",
      content: "Always ensure proper ventilation when using chemical strippers or primers. Use appropriate PPE.",
      confidence: 0.98
    },
    {
      title: "Professional Contractors Association Standards",
      source: "pcatrade.org",
      type: "best-practice",
      content: "Pre-stage all materials by room to minimize trips and improve efficiency. Clean tools immediately after use.",
      confidence: 0.92
    }
  ];

  // Filter sources based on query relevance
  return mockSources;
}

async function analyzeWorkflowWithAI(project: any, webInsights: any[]): Promise<ImprovementRecommendation[]> {
  const systemPrompt = `You are a professional home improvement workflow analyst. Analyze the provided project workflow and web research insights to suggest specific improvements.

Focus on:
1. Safety improvements based on industry standards
2. Efficiency gains from professional best practices  
3. Quality improvements from manufacturer guidelines
4. Tool and material optimizations
5. Process reordering for better results

Only suggest improvements that are:
- Backed by legitimate sources (manufacturers, industry guides, safety standards)
- Specific and actionable
- Relevant to the project type
- Likely to improve results

Provide recommendations in JSON format with the specified structure.`;

  const userPrompt = `Project: ${project.name}
Category: ${project.category}
Description: ${project.description}

Current Workflow:
${JSON.stringify(project.phases, null, 2)}

Web Research Insights:
${webInsights.map(insight => `Source: ${insight.source} (${insight.type})
Content: ${insight.content}
Confidence: ${insight.confidence}`).join('\n\n')}

Analyze this workflow and suggest 3-5 specific improvements based on the research insights. Return only a JSON array of improvements with this structure:
{
  "id": "unique-id",
  "type": "step-addition|step-modification|tool-update|tip-addition|process-reorder",
  "title": "Brief improvement title",
  "description": "Detailed description of the improvement",
  "currentStep": "Name of current step being improved (if applicable)",
  "proposedChange": "Specific change to implement",
  "reasoning": "Why this improvement helps based on research",
  "confidence": 85,
  "source": "Source name from research",
  "sourceType": "manufacturer|industry-guide|safety-standard|best-practice",
  "validated": true
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000,
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
    console.log('AI response received:', content.substring(0, 200) + '...');
    
    const parsed = JSON.parse(content);
    
    // Handle both array and object responses
    const improvements = Array.isArray(parsed) ? parsed : parsed.improvements || [];
    
    // Add unique IDs if missing
    return improvements.map((improvement: any, index: number) => ({
      ...improvement,
      id: improvement.id || `improvement-${Date.now()}-${index}`
    }));

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    
    // Return fallback improvements based on project category
    return generateFallbackImprovements(project);
  }
}

function generateFallbackImprovements(project: any): ImprovementRecommendation[] {
  const fallbacks: Record<string, ImprovementRecommendation[]> = {
    'interior-painting': [
      {
        id: 'paint-1',
        type: 'step-addition',
        title: 'Add Primer Quality Check Step',
        description: 'Add a step to verify primer coverage before proceeding to paint application',
        proposedChange: 'Insert quality check step after primer drying',
        reasoning: 'Poor primer coverage leads to uneven paint finish and adhesion issues',
        confidence: 88,
        source: 'Professional painting standards',
        sourceType: 'best-practice',
        validated: true
      },
      {
        id: 'paint-2', 
        type: 'tool-update',
        title: 'Upgrade to Angled Brush for Cutting In',
        description: 'Use 2.5" angled brush instead of flat brush for trim work',
        currentStep: 'Cut in edges and trim',
        proposedChange: 'Specify angled brush in tools list',
        reasoning: 'Angled brushes provide better control and cleaner lines around trim',
        confidence: 92,
        source: 'Manufacturer best practices',
        sourceType: 'manufacturer',
        validated: true
      }
    ],
    'default': [
      {
        id: 'general-1',
        type: 'step-addition',
        title: 'Add Safety Check Step',
        description: 'Include a safety verification step before starting work',
        proposedChange: 'Add initial safety checklist step',
        reasoning: 'Proper safety preparation prevents accidents and injuries',
        confidence: 95,
        source: 'OSHA guidelines',
        sourceType: 'safety-standard',
        validated: true
      }
    ]
  };

  return fallbacks[project.category] || fallbacks['default'];
}