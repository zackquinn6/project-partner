import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photos, description } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      throw new Error('At least one photo is required');
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are an expert home repair analyst specializing in bathroom remodeling, tile work, plumbing, and window repairs. 

Analyze the provided photos and provide a comprehensive repair assessment in the following JSON format:

{
  "issue_category": "Brief category name (e.g., 'Cracked Grout', 'Water Damage', 'Plumbing Leak')",
  "severity_level": "critical|high|medium|low",
  "estimated_cost_range": "$X - $Y range with brief explanation",
  "action_plan": "Detailed step-by-step repair instructions. Focus on safety, proper preparation, execution, and cleanup. Be specific about techniques for bathroom/tile/plumbing issues.",
  "root_cause_analysis": "Explain what likely caused this issue and how to prevent it in the future",
  "recommended_materials": ["List", "of", "specific", "materials", "needed"],
  "recommended_tools": ["List", "of", "specific", "tools", "needed"],
  "difficulty_level": "Beginner|Intermediate|Advanced|Professional Required",
  "estimated_time": "X hours/days with brief explanation"
}

IMPORTANT: 
- Prioritize bathroom, tile, plumbing, and window repair expertise
- Be specific about materials (brands, sizes, grades when relevant)
- Include safety warnings for electrical/water issues
- Consider moisture/ventilation concerns for bathroom repairs
- Suggest when professional help is recommended
- Provide realistic time and cost estimates`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Please analyze these home repair photos. ${description ? `Additional context: ${description}` : ''}`
          },
          ...photos.map((photo: string) => ({
            type: "image_url",
            image_url: {
              url: photo,
              detail: "high"
            }
          }))
        ]
      }
    ];

    console.log('Sending request to OpenAI with', photos.length, 'photos');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const analysisText = data.choices[0].message.content;
    
    // Parse the JSON response
    let analysisResult;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', analysisText);
      
      // Fallback: create structured response from text
      analysisResult = {
        issue_category: "Repair Issue Identified",
        severity_level: "medium",
        estimated_cost_range: "Cost estimate pending detailed assessment",
        action_plan: analysisText,
        root_cause_analysis: "Professional assessment recommended for root cause analysis",
        recommended_materials: ["Contact professional for material list"],
        recommended_tools: ["Contact professional for tool requirements"],
        difficulty_level: "Professional Required",
        estimated_time: "Assessment needed"
      };
    }

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify(analysisResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-repair-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: 'Analysis failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});