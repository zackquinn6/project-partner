import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { sanitizeInput } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  photos: z.array(z.string()).min(1).max(5), // Base64 image strings
  description: z.string().max(1000).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    
    // Get API key with proper error handling
    const GOOGLE_GEMINI_API_KEY = getRequiredSecret('GOOGLE_GEMINI_API_KEY');
    
    // Parse and validate request body
    const body = await req.json();
    const validatedData = requestSchema.parse(body);
    
    // Sanitize description if provided
    const sanitizedDescription = validatedData.description ? sanitizeInput(validatedData.description) : '';

    // Prepare content for Gemini Vision API
    const prompt = `You are an expert home repair analyst specializing in bathroom remodeling, tile work, plumbing, and window repairs. 

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
- Provide realistic time and cost estimates

Please analyze these home repair photos. ${sanitizedDescription ? `Additional context: ${sanitizedDescription}` : ''}`;

    // Prepare parts for Gemini request
    const parts = [
      { text: prompt },
      ...validatedData.photos.map((photo: string) => ({
        inline_data: {
          mime_type: "image/jpeg",
          data: photo.split(',')[1] // Remove data:image/jpeg;base64, prefix
        }
      }))
    ];

    console.log('Sending request to Google Gemini with', validatedData.photos.length, 'photos');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Gemini API error:', response.status, errorData);
      throw new Error('AI analysis service error');
    }

    const data = await response.json();
    console.log('Google Gemini response received');

    const analysisText = data.candidates[0].content.parts[0].text;
    
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
    
    const statusCode = error.message?.includes('authorization') || error.message?.includes('token') ? 401 : 500;
    const message = statusCode === 401 ? 'Authentication required' : 'Analysis failed';
    
    return new Response(JSON.stringify({ error: message }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});