import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User client for auth verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for writing to app_secrets (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("[Save Calendar Credentials] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { action, provider, clientId, clientSecret } = await req.json();

    console.log(`[Save Calendar Credentials] Action: ${action}, Provider: ${provider}, User: ${userId}`);

    // Check if user has admin role for write operations
    if (action === "save") {
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        console.log(`[Save Calendar Credentials] User ${userId} is not an admin, denying access`);
        return new Response(JSON.stringify({ error: "Only administrators can modify OAuth credentials" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "save") {
      if (!provider || !clientId) {
        return new Response(JSON.stringify({ error: "Provider and clientId are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const idKey = provider === "google" ? "GOOGLE_CLIENT_ID" : "MICROSOFT_CLIENT_ID";
      const secretKey = provider === "google" ? "GOOGLE_CLIENT_SECRET" : "MICROSOFT_CLIENT_SECRET";

      // Save Client ID using service role (bypasses RLS)
      const { error: idError } = await supabaseAdmin
        .from("app_secrets")
        .upsert({ id: idKey, value: clientId.trim() }, { onConflict: "id" });

      if (idError) {
        console.error("[Save Calendar Credentials] Error saving client ID:", idError);
        return new Response(JSON.stringify({ error: "Failed to save client ID" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save Client Secret if provided
      if (clientSecret && !clientSecret.includes("••••")) {
        const { error: secretError } = await supabaseAdmin
          .from("app_secrets")
          .upsert({ id: secretKey, value: clientSecret.trim() }, { onConflict: "id" });

        if (secretError) {
          console.error("[Save Calendar Credentials] Error saving client secret:", secretError);
          return new Response(JSON.stringify({ error: "Failed to save client secret" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      console.log(`[Save Calendar Credentials] ${provider} credentials saved successfully`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      // Read credentials (return masked secret)
      const { data: secrets } = await supabaseAdmin
        .from("app_secrets")
        .select("id, value")
        .in("id", [
          "GOOGLE_CLIENT_ID", 
          "GOOGLE_CLIENT_SECRET", 
          "MICROSOFT_CLIENT_ID", 
          "MICROSOFT_CLIENT_SECRET"
        ]);

      const result: Record<string, string> = {};
      
      secrets?.forEach(secret => {
        if (secret.id.includes("SECRET")) {
          // Mask secrets
          result[secret.id] = secret.value ? "••••••••••••" : "";
        } else {
          // Return full client ID
          result[secret.id] = secret.value || "";
        }
      });

      return new Response(JSON.stringify({ credentials: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Save Calendar Credentials] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
