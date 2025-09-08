import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  userEmail: string;
  userName: string;
  category: string;
  message: string;
  currentUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing feedback submission...");
    
    const { userEmail, userName, category, message, currentUrl }: FeedbackRequest = await req.json();

    console.log(`Sending feedback from ${userEmail} (${userName}) - Category: ${category}`);

    // Send feedback email to support
    const emailResponse = await resend.emails.send({
      from: "Feedback <onboarding@resend.dev>",
      to: ["zackquinn6@gmail.com"], // Replace with your actual support email
      replyTo: userEmail,
      subject: `App Feedback: ${category}`,
      html: `
        <h2>New App Feedback Received</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${userName} (${userEmail})</p>
          <p><strong>Category:</strong> ${category}</p>
          ${currentUrl ? `<p><strong>Page:</strong> ${currentUrl}</p>` : ''}
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>Feedback Message:</h3>
        <div style="background: white; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">
          This feedback was submitted through the DIY Project Assistant app.
        </p>
      `,
    });

    console.log("Feedback email sent successfully:", emailResponse);

    // Send confirmation email to user
    const confirmationResponse = await resend.emails.send({
      from: "DIY Project Assistant <onboarding@resend.dev>",
      to: [userEmail],
      subject: "Thank you for your feedback!",
      html: `
        <h2>Thank you for your feedback, ${userName}!</h2>
        
        <p>We've received your feedback about our DIY Project Assistant app and truly appreciate you taking the time to share your thoughts with us.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Feedback Summary:</h3>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #007bff; padding-left: 15px; margin: 10px 0; color: #555;">
            ${message.replace(/\n/g, '<br>')}
          </blockquote>
        </div>
        
        <p>Our team will review your feedback and use it to improve the app. If you've reported a bug or requested a feature, we'll consider it for future updates.</p>
        
        <p>Keep building great things!</p>
        
        <p>Best regards,<br>
        <strong>The DIY Project Assistant Team</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is an automated confirmation email. Please don't reply to this message.
        </p>
      `,
    });

    console.log("Confirmation email sent successfully:", confirmationResponse);

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
    return new Response(
      JSON.stringify({ 
        error: "Failed to submit feedback. Please try again later.",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);