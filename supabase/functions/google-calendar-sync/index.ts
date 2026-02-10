import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("[Google Calendar Sync] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { action, code, redirectUri } = await req.json();

    // Get OAuth credentials from app_secrets using service role (bypasses RLS)
    const { data: secrets, error: secretsError } = await supabaseAdmin
      .from("app_secrets")
      .select("id, value")
      .in("id", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
    
    console.log("[Google Calendar Sync] Secrets query result:", { 
      found: secrets?.length || 0, 
      error: secretsError?.message 
    });

    const clientId = secrets?.find(s => s.id === "GOOGLE_CLIENT_ID")?.value;
    const clientSecret = secrets?.find(s => s.id === "GOOGLE_CLIENT_SECRET")?.value;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Google OAuth credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Google Calendar Sync] Action: ${action} for user: ${userId}`);

    if (action === "get_auth_url") {
      const scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ];

      // Use the custom domain redirect URI that matches Google Cloud Console settings
      // Append /settings to match the callback handler
      const baseUrl = redirectUri || "https://my.arifmahmud.com";
      const callbackUrl = baseUrl.endsWith("/settings") ? baseUrl : `${baseUrl}/settings`;

      const authUrl = `${GOOGLE_OAUTH_URL}?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state: "google_calendar",
      });

      console.log("[Google Calendar Sync] Generated auth URL with redirect:", callbackUrl);

      return new Response(JSON.stringify({ authUrl, callbackUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "exchange_code") {
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
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
        console.error("[Google Calendar Sync] Token exchange error:", tokenData);
        return new Response(JSON.stringify({ error: tokenData.error_description }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      await supabase.from("google_calendar_sync").upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        sync_enabled: true,
        calendar_id: "primary",
      }, { onConflict: "user_id" });

      console.log("[Google Calendar Sync] Tokens saved for user:", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync") {
      // Get Google config (calendar_id is "primary" or doesn't start with "outlook_")
      const { data: syncConfigs } = await supabase
        .from("google_calendar_sync")
        .select("*")
        .eq("user_id", userId);

      const syncConfig = syncConfigs?.find(c => !c.calendar_id?.startsWith("outlook_"));

      if (!syncConfig) {
        return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh token if expired
      let accessToken = syncConfig.access_token;
      if (new Date(syncConfig.token_expires_at) <= new Date()) {
        const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
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
            .eq("user_id", userId);
        }
      }

      // Pull events from Google Calendar
      const calendarId = syncConfig.calendar_id || "primary";
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const eventsResponse = await fetch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?` +
        new URLSearchParams({
          timeMin: oneMonthAgo.toISOString(),
          timeMax: oneMonthAhead.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
        }),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const eventsData = await eventsResponse.json();
      console.log(`[Google Calendar Sync] Fetched ${eventsData.items?.length || 0} events from Google`);

      // Store synced events
      const googleEvents = eventsData.items || [];
      for (const event of googleEvents) {
        if (!event.start?.dateTime && !event.start?.date) continue;

        const eventDate = event.start.dateTime || event.start.date;
        
        // Check if already synced
        const { data: existingSync } = await supabase
          .from("synced_calendar_events")
          .select("id")
          .eq("google_event_id", event.id)
          .eq("user_id", userId)
          .single();

        if (!existingSync) {
          // Create a family event for imported Google events
          const { data: newEvent } = await supabase
            .from("family_events")
            .insert({
              user_id: userId,
              title: event.summary || "Untitled Event",
              event_date: eventDate,
              event_type: "appointment",
              notes: `Imported from Google Calendar\n${event.description || ""}`,
            })
            .select()
            .single();

          if (newEvent) {
            await supabase.from("synced_calendar_events").insert({
              user_id: userId,
              google_event_id: event.id,
              local_event_id: newEvent.id,
              local_event_type: "family_event",
            });
          }
        }
      }

      let pushedCount = 0;

      // Helper function to validate date
      const isValidDate = (dateStr: string): boolean => {
        if (!dateStr) return false;
        const parsed = new Date(dateStr);
        return !isNaN(parsed.getTime());
      };

      // Helper function to push event to Google Calendar
      const pushToGoogle = async (title: string, date: string, notes: string, localId: string, localType: string, userTimezone: string = "Asia/Dhaka") => {
        // Validate date before processing
        if (!isValidDate(date)) {
          console.log(`[Google Calendar Sync] Skipping ${localType} "${title}" - invalid date: ${date}`);
          return false;
        }

        // Check if already synced - use maybeSingle to avoid errors
        const { data: existingSync } = await supabase
          .from("synced_calendar_events")
          .select("id, google_event_id")
          .eq("local_event_id", localId)
          .eq("local_event_type", localType)
          .eq("user_id", userId)
          .maybeSingle();

        // Skip if already synced to Google (has a proper Google event ID, not outlook_)
        if (existingSync?.google_event_id && !existingSync.google_event_id.startsWith("outlook_")) {
          console.log(`[Google Calendar Sync] Skipping ${localType} "${title}" - already synced`);
          return false;
        }

        const parsedDate = new Date(date);
        const googleEvent = {
          summary: title,
          description: notes || "",
          start: {
            dateTime: parsedDate.toISOString(),
            timeZone: userTimezone,
          },
          end: {
            dateTime: new Date(parsedDate.getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: userTimezone,
          },
        };

        const createResponse = await fetch(
          `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(googleEvent),
          }
        );

        const createdEvent = await createResponse.json();
        
        if (createdEvent.id) {
          if (existingSync) {
            await supabase
              .from("synced_calendar_events")
              .update({ google_event_id: createdEvent.id, last_synced_at: new Date().toISOString() })
              .eq("id", existingSync.id);
          } else {
            await supabase.from("synced_calendar_events").insert({
              user_id: userId,
              google_event_id: createdEvent.id,
              local_event_id: localId,
              local_event_type: localType,
            });
          }
          console.log(`[Google Calendar Sync] Pushed ${localType} "${title}" to Google`);
          return true;
        } else {
          console.error(`[Google Calendar Sync] Failed to create event:`, createdEvent);
        }
        return false;
      };

      // Push family_events
      const { data: localEvents } = await supabase
        .from("family_events")
        .select("*")
        .eq("user_id", userId)
        .gte("event_date", oneMonthAgo.toISOString())
        .lte("event_date", oneMonthAhead.toISOString());

      for (const localEvent of localEvents || []) {
        if (await pushToGoogle(localEvent.title, localEvent.event_date, localEvent.notes || "", localEvent.id, "family_event")) {
          pushedCount++;
        }
      }

      // Push ALL tasks with due dates (both Office and Personal)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .not("due_date", "is", null)
        .gte("due_date", oneMonthAgo.toISOString().split("T")[0])
        .lte("due_date", oneMonthAhead.toISOString().split("T")[0]);

      console.log(`[Google Calendar Sync] Found ${tasks?.length || 0} tasks with due dates (Office + Personal)`);

      for (const task of tasks || []) {
        // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
        const dueDateOnly = task.due_date?.split("T")[0] || task.due_date;
        const taskDate = task.due_time 
          ? `${dueDateOnly}T${task.due_time}` 
          : `${dueDateOnly}T09:00:00`;
        const typeLabel = task.task_type === "office" ? "🏢" : "🏠";
        const notes = `[Task - ${task.task_type || "personal"}] ${task.description || ""}\nPriority: ${task.priority || "Normal"}\nStatus: ${task.status || "Pending"}`;
        if (await pushToGoogle(`${typeLabel}📋 ${task.title}`, taskDate, notes, task.id, "task")) {
          pushedCount++;
        }
      }

      // Push ALL goals with target dates (both Office and Personal)
      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .not("target_date", "is", null)
        .gte("target_date", oneMonthAgo.toISOString().split("T")[0])
        .lte("target_date", oneMonthAhead.toISOString().split("T")[0]);

      console.log(`[Google Calendar Sync] Found ${goals?.length || 0} goals with target dates (Office + Personal)`);

      for (const goal of goals || []) {
        // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
        const targetDateOnly = goal.target_date?.split("T")[0] || goal.target_date;
        const typeLabel = goal.goal_type === "office" ? "🏢" : "🏠";
        const notes = `[Goal - ${goal.goal_type || "personal"}] ${goal.description || ""}\nCategory: ${goal.category || "General"}\nProgress: ${goal.current_amount || 0}/${goal.target_amount || 0}`;
        if (await pushToGoogle(`${typeLabel}🎯 ${goal.title}`, `${targetDateOnly}T09:00:00`, notes, goal.id, "goal")) {
          pushedCount++;
        }
      }

      // Push transactions (expenses) with dates
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .gte("date", oneMonthAgo.toISOString().split("T")[0])
        .lte("date", oneMonthAhead.toISOString().split("T")[0]);

      console.log(`[Google Calendar Sync] Found ${transactions?.length || 0} transactions`);

      for (const tx of transactions || []) {
        // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
        const txDateOnly = tx.date?.split("T")[0] || tx.date;
        const emoji = tx.type === "income" ? "💰" : "💸";
        const notes = `[${tx.type === "income" ? "Income" : "Expense"}] Amount: ${tx.amount}\nMerchant: ${tx.merchant || "N/A"}\nAccount: ${tx.account || "N/A"}\n${tx.notes || ""}`;
        if (await pushToGoogle(`${emoji} ${tx.merchant || tx.type}: $${tx.amount}`, `${txDateOnly}T12:00:00`, notes, tx.id, "transaction")) {
          pushedCount++;
        }
      }

      // Update last sync time
      await supabase
        .from("google_calendar_sync")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("user_id", userId);

      console.log(`[Google Calendar Sync] Sync complete. Pulled: ${googleEvents.length}, Pushed: ${pushedCount}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Synced ${googleEvents.length} events from Google, pushed ${pushedCount} items (events, tasks, goals, transactions)`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Google Calendar Sync] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
