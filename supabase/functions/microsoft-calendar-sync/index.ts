import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_API = "https://graph.microsoft.com/v1.0";

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

    // User client for user-specific operations
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for reading app_secrets (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { action, code, redirectUri } = await req.json();

    // Get OAuth credentials from app_secrets using service role (bypasses RLS)
    const { data: secrets, error: secretsError } = await supabaseAdmin
      .from("app_secrets")
      .select("id, value")
      .in("id", ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"]);
    
    console.log("[Microsoft Calendar Sync] Secrets query result:", { 
      found: secrets?.length || 0, 
      error: secretsError?.message 
    });

    const clientId = secrets?.find(s => s.id === "MICROSOFT_CLIENT_ID")?.value;
    const clientSecret = secrets?.find(s => s.id === "MICROSOFT_CLIENT_SECRET")?.value;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Microsoft OAuth credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Microsoft Calendar Sync] Action: ${action} for user: ${userId}`);

    if (action === "get_auth_url") {
      const scopes = [
        "offline_access",
        "Calendars.ReadWrite",
        "User.Read",
      ];

      const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "");
      const callbackUrl = `${baseUrl}.supabase.co/functions/v1/microsoft-calendar-sync`;

      const authUrl = `${MICROSOFT_AUTH_URL}?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: scopes.join(" "),
        response_mode: "query",
        state: userId,
      });

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_code") {
      const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("[Microsoft Calendar Sync] Token exchange error:", tokenData);
        return new Response(JSON.stringify({ error: tokenData.error_description }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Store in google_calendar_sync table with outlook_ prefix for calendar_id
      await supabase.from("google_calendar_sync").upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        sync_enabled: true,
        calendar_id: "outlook_primary",
      }, { onConflict: "user_id" });

      console.log("[Microsoft Calendar Sync] Tokens saved for user:", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      // Find Microsoft config (calendar_id starts with outlook_)
      const { data: syncConfigs } = await supabase
        .from("google_calendar_sync")
        .select("*")
        .eq("user_id", userId);

      const syncConfig = syncConfigs?.find(c => c.calendar_id?.startsWith("outlook_"));

      if (!syncConfig) {
        return new Response(JSON.stringify({ error: "Microsoft Calendar not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh token if expired
      let accessToken = syncConfig.access_token;
      if (new Date(syncConfig.token_expires_at) <= new Date()) {
        const refreshResponse = await fetch(MICROSOFT_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: syncConfig.refresh_token,
            grant_type: "refresh_token",
          }),
        });

        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          accessToken = refreshData.access_token;
          const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
          
          await supabase
            .from("google_calendar_sync")
            .update({ access_token: accessToken, token_expires_at: expiresAt })
            .eq("id", syncConfig.id);
        }
      }

      // Pull events from Microsoft Calendar
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const eventsResponse = await fetch(
        `${GRAPH_API}/me/calendar/calendarView?` +
        new URLSearchParams({
          startDateTime: oneMonthAgo.toISOString(),
          endDateTime: oneMonthAhead.toISOString(),
          $orderby: "start/dateTime",
          $top: "100",
        }),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const eventsData = await eventsResponse.json();
      console.log(`[Microsoft Calendar Sync] Fetched ${eventsData.value?.length || 0} events from Outlook`);

      // Store synced events
      const outlookEvents = eventsData.value || [];
      for (const event of outlookEvents) {
        if (!event.start?.dateTime) continue;

        // Check if already synced
        const { data: existingSync } = await supabase
          .from("synced_calendar_events")
          .select("id")
          .eq("google_event_id", `outlook_${event.id}`)
          .eq("user_id", userId)
          .single();

        if (!existingSync) {
          // Create a family event for imported Outlook events
          const { data: newEvent } = await supabase
            .from("family_events")
            .insert({
              user_id: userId,
              title: event.subject || "Untitled Event",
              event_date: event.start.dateTime,
              event_type: "appointment",
              notes: `Imported from Microsoft Outlook\n${event.bodyPreview || ""}`,
            })
            .select()
            .single();

          if (newEvent) {
            await supabase.from("synced_calendar_events").insert({
              user_id: userId,
              google_event_id: `outlook_${event.id}`,
              local_event_id: newEvent.id,
              local_event_type: "family_event",
            });
          }
        }
      }

      // Push local events to Microsoft Calendar
      const { data: localEvents } = await supabase
        .from("family_events")
        .select("*")
        .eq("user_id", userId)
        .gte("event_date", oneMonthAgo.toISOString())
        .lte("event_date", oneMonthAhead.toISOString());

      let pushedCount = 0;
      for (const localEvent of localEvents || []) {
        // Check if already synced to Outlook
        const { data: existingSync } = await supabase
          .from("synced_calendar_events")
          .select("id, google_event_id")
          .eq("local_event_id", localEvent.id)
          .eq("user_id", userId)
          .single();

        // Only push if not synced OR if synced from Google (not Outlook)
        if (!existingSync || !existingSync.google_event_id?.startsWith("outlook_")) {
          const outlookEvent = {
            subject: localEvent.title,
            body: {
              contentType: "text",
              content: localEvent.notes || "",
            },
            start: {
              dateTime: new Date(localEvent.event_date).toISOString(),
              timeZone: "UTC",
            },
            end: {
              dateTime: new Date(new Date(localEvent.event_date).getTime() + 60 * 60 * 1000).toISOString(),
              timeZone: "UTC",
            },
          };

          const createResponse = await fetch(`${GRAPH_API}/me/calendar/events`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(outlookEvent),
          });

          const createdEvent = await createResponse.json();
          
          if (createdEvent.id) {
            // Update or insert sync record
            if (existingSync) {
              await supabase
                .from("synced_calendar_events")
                .update({ google_event_id: `outlook_${createdEvent.id}` })
                .eq("id", existingSync.id);
            } else {
              await supabase.from("synced_calendar_events").insert({
                user_id: userId,
                google_event_id: `outlook_${createdEvent.id}`,
                local_event_id: localEvent.id,
                local_event_type: "family_event",
              });
            }
            pushedCount++;
          }
        }
      }

      // Update last sync time
      await supabase
        .from("google_calendar_sync")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", syncConfig.id);

      console.log(`[Microsoft Calendar Sync] Sync complete. Pulled: ${outlookEvents.length}, Pushed: ${pushedCount}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Synced ${outlookEvents.length} events from Outlook, pushed ${pushedCount} local events`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Microsoft Calendar Sync] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
