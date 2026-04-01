import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { verifyAuth } from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CertificateEmailRequest {
  to_email: string;
  certificate_data: {
    project_name: string;
    completed_date: string;
    user_name: string;
    difficulty?: string;
    image_data: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    await verifyAuth(req);
    const { to_email, certificate_data }: CertificateEmailRequest = await req.json();

    // Convert base64 image to attachment
    const imageData = certificate_data.image_data.split(',')[1];
    
    const emailResponse = await resend.emails.send({
      from: "Project Partner <onboarding@resend.dev>",
      to: [to_email],
      subject: `🏆 Certificate of Completion: ${certificate_data.project_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .certificate-image {
              width: 100%;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              margin: 20px 0;
            }
            .content {
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .button {
              display: inline-block;
              background: #f97316;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏆 Congratulations!</h1>
            <p>You've completed a DIY project with Project Partner</p>
          </div>

          <div class="content">
            <h2>${certificate_data.project_name}</h2>
            <p><strong>Completed:</strong> ${new Date(certificate_data.completed_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            ${certificate_data.difficulty ? `<p><strong>Difficulty:</strong> ${certificate_data.difficulty}</p>` : ''}
          </div>

          <img src="cid:certificate" alt="Certificate" class="certificate-image" />

          <div class="content">
            <h3>Share Your Achievement!</h3>
            <p>Your certificate is attached to this email. Download it and share it on social media to celebrate your DIY success!</p>
            <p>Ready for your next project? Project Partner has dozens of guided workflows waiting for you.</p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} Project Partner. Empowering DIY Excellence.</p>
            <p>Keep building, keep learning, keep achieving!</p>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `${certificate_data.project_name.replace(/[^a-z0-9]/gi, '_')}-certificate.png`,
          content: imageData,
          content_id: 'certificate',
        }
      ]
    });

    console.log("Certificate email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-certificate-email function:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status =
      message === "Missing authorization header" || message === "Invalid or expired token"
        ? 401
        : 500;

    return new Response(
      JSON.stringify({ error: status === 401 ? message : "Internal server error" }),
      {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
