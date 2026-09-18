import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { sanitizeInput } from "../_shared/validation.ts";
import {
  assertUserRateLimit,
  createServiceClient,
  hasPaidEntitlement,
} from "../_shared/entitlement.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Maximum photo size: 10MB (after base64 decoding)
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

// Input validation schema
const requestSchema = z.object({
  photos: z.array(z.string()).min(1).max(5), // Base64 image strings
  description: z.string().max(1000).optional()
});

/**
 * Validate base64 image format and size
 */
function validateBase64Image(base64String: string): { valid: boolean; error?: string } {
  try {
    // Check if it's a valid base64 image format
    const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Pattern.test(base64String)) {
      return { valid: false, error: 'Invalid image format. Must be JPEG, PNG, GIF, or WebP' };
    }

    // Extract the base64 data (remove data:image/...;base64, prefix)
    const base64Data = base64String.split(',')[1];
    if (!base64Data) {
      return { valid: false, error: 'Invalid base64 data' };
    }

    // Calculate decoded size (base64 is ~1.33x larger than original)
    const decodedSize = (base64Data.length * 3) / 4;
    
    // Account for padding
    const padding = (base64Data.match(/=/g) || []).length;
    const actualSize = decodedSize - padding;

    if (actualSize > MAX_PHOTO_SIZE_BYTES) {
      return { 
        valid: false, 
        error: `Image size exceeds maximum of ${MAX_PHOTO_SIZE_BYTES / (1024 * 1024)}MB` 
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Failed to validate image format' };
  }
}

/**
 * Log security event for audit trail
 */
async function logAuditEvent(userId: string, photosCount: number, success: boolean) {
  try {
    // Log to console for edge function logs
    console.log(`AI Repair Analysis Request: user=${userId}, photos=${photosCount}, success=${success}, timestamp=${new Date().toISOString()}`);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);

    const admin = createServiceClient();
    const entitled = await hasPaidEntitlement(admin, user.id);
    if (!entitled) {
      return new Response(
        JSON.stringify({
          error: "AI repair analysis requires an active membership or trial.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { allowed } = await assertUserRateLimit(
      admin,
      user.id,
      "ai-repair-analysis",
      30,
      60,
    );
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    
    // Get API key with proper error handling
    const GOOGLE_GEMINI_API_KEY = getRequiredSecret('GOOGLE_GEMINI_API_KEY');
    
    // Parse and validate request body
    const body = await req.json();
    const validatedData = requestSchema.parse(body);
    
    // Validate each photo for format and size
    for (let i = 0; i < validatedData.photos.length; i++) {
      const validation = validateBase64Image(validatedData.photos[i]);
      if (!validation.valid) {
        await logAuditEvent(user.id, validatedData.photos.length, false);
        return new Response(
          JSON.stringify({ error: `Photo ${i + 1}: ${validation.error}` }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_GEMINI_API_KEY,
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

    // Log successful request for audit trail
    await logAuditEvent(user.id, validatedData.photos.length, true);

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