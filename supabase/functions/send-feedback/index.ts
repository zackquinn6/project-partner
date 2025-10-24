import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { verifyAuth, getRequiredSecret } from "../_shared/auth.ts";
import { sanitizeInput, escapeHtml } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const requestSchema = z.object({
  userEmail: z.string().email().max(255),
  userName: z.string().max(100),
  category: z.string().max(50),
  message: z.string().max(5000),
  currentUrl: z.string().url().max(500).optional()
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const user = await verifyAuth(req);
    
    // Get API key with proper error handling
    const RESEND_API_KEY = getRequiredSecret('RESEND_API_KEY');
    const resend = new Resend(RESEND_API_KEY);
    
    console.log("Processing feedback submission...");
    
    // Parse and validate request body
    const body = await req.json();
    const validatedData = requestSchema.parse(body);
    
    // Verify the email matches the authenticated user
    if (validatedData.userEmail !== user.email) {
      throw new Error('Email mismatch with authenticated user');
    }

    // Additional sanitization for message content
    const sanitizedMessage = sanitizeInput(validatedData.message);

    console.log(`Sending feedback from ${validatedData.userEmail} - Category: ${validatedData.category}`);

    // Send feedback email to support
    const emailResponse = await resend.emails.send({
      from: "Feedback <onboarding@resend.dev>",
      to: ["contact@toolio.us"],
      replyTo: validatedData.userEmail,
      subject: `App Feedback: ${escapeHtml(validatedData.category)}`,
      html: `
        <h2>New App Feedback Received</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${escapeHtml(validatedData.userName)} (${escapeHtml(validatedData.userEmail)})</p>
          <p><strong>Category:</strong> ${escapeHtml(validatedData.category)}</p>
          ${validatedData.currentUrl ? `<p><strong>Page:</strong> ${escapeHtml(validatedData.currentUrl)}</p>` : ''}
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>Feedback Message:</h3>
        <div style="background: white; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
          ${escapeHtml(sanitizedMessage).replace(/\n/g, '<br>')}
        </div>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">
          This feedback was submitted through the Project Partner app.
        </p>
      `,
    });

    console.log("Feedback email sent successfully");

    // Send confirmation email to user
    await resend.emails.send({
      from: "Project Partner <onboarding@resend.dev>",
      to: [validatedData.userEmail],
      subject: "Thank you for your feedback!",
      html: `
        <h2>Thank you for your feedback, ${escapeHtml(validatedData.userName)}!</h2>
        
        <p>We've received your feedback about our Project Partner app and truly appreciate you taking the time to share your thoughts with us.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Feedback Summary:</h3>
          <p><strong>Category:</strong> ${escapeHtml(validatedData.category)}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #007bff; padding-left: 15px; margin: 10px 0; color: #555;">
            ${escapeHtml(sanitizedMessage).replace(/\n/g, '<br>')}
          </blockquote>
        </div>
        
        <p>Our team will review your feedback and use it to improve the app. If you've reported a bug or requested a feature, we'll consider it for future updates.</p>
        
        <p>Keep building great things!</p>
        
        <p>Best regards,<br>
        <strong>The Project Partner Team</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated confirmation email. Please don't reply to this message.
        </p>
      `,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Feedback submitted successfully! Thank you for helping us improve the app." 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-feedback function:", error);
    
    const statusCode = error.message.includes('authorization') || error.message.includes('token') ? 401 : 500;
    const message = statusCode === 401 ? 'Authentication required' : 'Failed to submit feedback';
    
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);