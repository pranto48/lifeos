import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_KEY_ID = "resend_api_key";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated and is an admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ success: false, error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, apiKey, testEmail } = await req.json();

    switch (action) {
      case "get": {
        // Get the current API key status (masked)
        const { data } = await supabase
          .from("app_secrets")
          .select("value, created_at")
          .eq("id", RESEND_KEY_ID)
          .maybeSingle();

        if (data?.value) {
          // Mask the API key for display
          const maskedKey = data.value.substring(0, 6) + "••••••••" + data.value.substring(data.value.length - 4);
          return new Response(
            JSON.stringify({ 
              hasKey: true, 
              maskedKey,
              createdAt: data.created_at 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ hasKey: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "save": {
        if (!apiKey || !apiKey.startsWith("re_")) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid API key format" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Upsert the API key
        const { error } = await supabase
          .from("app_secrets")
          .upsert({
            id: RESEND_KEY_ID,
            value: apiKey,
            created_at: new Date().toISOString(),
          }, { onConflict: "id" });

        if (error) {
          console.error("Failed to save API key:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to save API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Resend API key saved successfully by admin:", user.id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { error } = await supabase
          .from("app_secrets")
          .delete()
          .eq("id", RESEND_KEY_ID);

        if (error) {
          console.error("Failed to delete API key:", error);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to delete API key" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Resend API key deleted by admin:", user.id);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "test": {
        // Get the saved API key
        const { data: secretData } = await supabase
          .from("app_secrets")
          .select("value")
          .eq("id", RESEND_KEY_ID)
          .maybeSingle();

        if (!secretData?.value) {
          return new Response(
            JSON.stringify({ success: false, error: "No API key configured" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Send a test email
        const emailTo = testEmail || user.email;
        
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${secretData.value}`,
            },
            body: JSON.stringify({
              from: "LifeOS <onboarding@resend.dev>",
              to: [emailTo],
              subject: "LifeOS - Resend API Test",
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                  </head>
                  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0f172a;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
                      <div style="text-align: center; margin-bottom: 24px;">
                        <div style="width: 48px; height: 48px; background-color: #22c55e20; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                          <span style="font-size: 24px;">✅</span>
                        </div>
                      </div>
                      <h1 style="color: #f1f5f9; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                        Resend API Test Successful
                      </h1>
                      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                        Your Resend API key is configured correctly. LifeOS can now send email notifications.
                      </p>
                      <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
                      <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
                        This test email was sent from LifeOS
                      </p>
                    </div>
                  </body>
                </html>
              `,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            console.log("Test email sent successfully:", result);
            return new Response(
              JSON.stringify({ success: true }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            console.error("Resend API error:", result);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: result.message || "Failed to send test email" 
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (error: any) {
          console.error("Test email error:", error);
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("Error in manage-resend-key function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
