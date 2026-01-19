import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function getSmtpSettings(supabase: any): Promise<SmtpSettings | null> {
  const { data, error } = await supabase
    .from("smtp_settings")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.log("No active SMTP settings found");
    return null;
  }

  return {
    smtp_host: data.smtp_host,
    smtp_port: data.smtp_port,
    smtp_username: data.smtp_username,
    smtp_password: data.smtp_password,
    from_email: data.from_email,
    from_name: data.from_name,
    use_tls: data.use_tls,
  };
}

async function sendEmail(
  settings: SmtpSettings,
  payload: EmailPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        tls: settings.use_tls,
        auth: {
          username: settings.smtp_username,
          password: settings.smtp_password,
        },
      },
    });

    await client.send({
      from: `${settings.from_name} <${settings.from_email}>`,
      to: payload.to,
      subject: payload.subject,
      content: payload.text || "",
      html: payload.html,
    });

    await client.close();

    return { success: true };
  } catch (error: any) {
    console.error("SMTP send error:", error);
    return { success: false, error: error.message };
  }
}

async function testSmtpConnection(
  settings: SmtpSettings,
  testEmail: string
): Promise<{ success: boolean; error?: string }> {
  const testPayload: EmailPayload = {
    to: testEmail,
    subject: "LifeOS SMTP Test",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0f172a;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 48px; height: 48px; background-color: #22c55e20; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">✅</span>
              </div>
            </div>
            
            <h1 style="color: #f1f5f9; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
              SMTP Test Successful!
            </h1>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Your SMTP settings are configured correctly. This email was sent from LifeOS.
            </p>
            
            <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>SMTP Host:</strong> ${settings.smtp_host}<br>
                <strong>Port:</strong> ${settings.smtp_port}<br>
                <strong>TLS:</strong> ${settings.use_tls ? "Enabled" : "Disabled"}<br>
                <strong>From:</strong> ${settings.from_name} &lt;${settings.from_email}&gt;
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
              This is an automated test email from LifeOS SMTP configuration.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `SMTP Test Successful!\n\nYour SMTP settings are configured correctly.\n\nSMTP Host: ${settings.smtp_host}\nPort: ${settings.smtp_port}\nTLS: ${settings.use_tls ? "Enabled" : "Disabled"}\nFrom: ${settings.from_name} <${settings.from_email}>`,
  };

  return sendEmail(settings, testPayload);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const { action, smtp_settings, test_email, email_payload } = await req.json();

    // For authenticated requests
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated and is admin for test/config actions
    if (action === "test" && authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabase.auth.getUser(token);

      if (authError || !userData.user) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminCheck) {
        return new Response(
          JSON.stringify({ success: false, error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Test with provided settings
      if (smtp_settings && test_email) {
        const result = await testSmtpConnection(smtp_settings, test_email);
        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For sending actual emails (from other edge functions or API key authenticated)
    if (action === "send" && email_payload) {
      // Get active SMTP settings from database
      const settings = await getSmtpSettings(supabase);

      if (!settings) {
        // Fallback to Resend if no SMTP configured
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "LifeOS <onboarding@resend.dev>",
              to: [email_payload.to],
              subject: email_payload.subject,
              html: email_payload.html,
            }),
          });

          const resendResult = await resendResponse.json();
          if (resendResponse.ok) {
            return new Response(
              JSON.stringify({ success: true, provider: "resend" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            return new Response(
              JSON.stringify({ success: false, error: resendResult.message || "Resend failed" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: false, error: "No email provider configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await sendEmail(settings, email_payload);
      return new Response(
        JSON.stringify({ ...result, provider: "smtp" }),
        { status: result.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-smtp-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
