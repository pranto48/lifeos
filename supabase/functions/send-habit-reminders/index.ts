import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

async function validateApiKey(supabase: any, apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;
  
  try {
    const { data, error } = await supabase
      .from('app_secrets')
      .select('value')
      .eq('id', 'edge_function_secret')
      .single();
    
    if (error || !data) {
      console.error('Error fetching API key from database:', error);
      return false;
    }
    
    return data.value === apiKey;
  } catch (e) {
    console.error('API key validation error:', e);
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Life OS <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return res.json();
}

async function sendPushToUser(supabase: any, userId: string, title: string, body: string, url: string) {
  try {
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) return 0;

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url,
      tag: 'habit-reminder'
    });

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await fetch(sub.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'TTL': '86400' },
          body: payload,
        });
        sent++;
      } catch (e) {
        console.error('Push failed:', e);
      }
    }
    return sent;
  } catch (error) {
    console.error('Error sending push:', error);
    return 0;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate API key
  const apiKey = req.headers.get('x-api-key');
  const isValid = await validateApiKey(supabase, apiKey);
  
  if (!isValid) {
    console.error('Unauthorized: Invalid or missing API key');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    console.log("API key validated successfully, starting habit reminders job...");

    const now = new Date();
    console.log(`Current UTC time: ${now.toISOString()}`);

    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select(`id, title, description, reminder_time, user_id, color`)
      .eq("reminder_enabled", true)
      .eq("is_archived", false);

    if (habitsError) {
      console.error("Error fetching habits:", habitsError);
      throw habitsError;
    }

    console.log(`Found ${habits?.length || 0} habits with reminders enabled`);

    if (!habits || habits.length === 0) {
      return new Response(
        JSON.stringify({ message: "No habits with reminders found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userIds = [...new Set(habits.map(h => h.user_id))];
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, timezone, email")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]));

    const today = new Date().toISOString().split("T")[0];
    const { data: completions, error: completionsError } = await supabase
      .from("habit_completions")
      .select("habit_id")
      .eq("completed_at", today);

    if (completionsError) {
      console.error("Error fetching completions:", completionsError);
    }

    const completedHabitIds = new Set((completions || []).map(c => c.habit_id));

    let emailsSent = 0;
    let pushSent = 0;
    const errors: string[] = [];

    for (const profile of profiles || []) {
      const userTimezone = profile.timezone || "Asia/Dhaka";
      const userEmail = emailMap.get(profile.user_id) || profile.email;

      const userHabits = habits.filter(h => 
        h.user_id === profile.user_id && !completedHabitIds.has(h.id)
      );

      if (userHabits.length === 0) {
        console.log(`No pending habits for user ${profile.user_id}`);
        continue;
      }

      const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
      const userHour = userNow.getHours();
      const userMinute = userNow.getMinutes();

      const habitsToRemind = userHabits.filter(h => {
        if (!h.reminder_time) return false;
        const [reminderHour, reminderMinute] = h.reminder_time.split(":").map(Number);
        
        const reminderTotalMinutes = reminderHour * 60 + reminderMinute;
        const currentTotalMinutes = userHour * 60 + userMinute;
        const diff = Math.abs(reminderTotalMinutes - currentTotalMinutes);
        
        return diff <= 30;
      });

      if (habitsToRemind.length === 0) {
        console.log(`No habits to remind for user ${profile.user_id} at ${userHour}:${userMinute}`);
        continue;
      }

      console.log(`Sending reminder for ${habitsToRemind.length} habits to user ${profile.user_id}`);

      // Send push notification
      const pushTitle = `⏰ ${habitsToRemind.length} habit${habitsToRemind.length > 1 ? 's' : ''} waiting`;
      const pushBody = habitsToRemind.map(h => h.title).join(', ');
      const sentPush = await sendPushToUser(supabase, profile.user_id, pushTitle, pushBody, '/habits');
      pushSent += sentPush;

      if (!userEmail) {
        console.log(`No email found for user ${profile.user_id}`);
        continue;
      }

      const habitsList = habitsToRemind.map(h => 
        `<li style="margin-bottom: 12px;">
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${h.color}; margin-right: 8px;"></span>
          <strong>${h.title}</strong>
          ${h.description ? `<br><span style="color: #666; font-size: 14px;">${h.description}</span>` : ""}
        </li>`
      ).join("");

      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; padding: 40px 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h1 style="color: #18181b; margin: 0 0 8px 0; font-size: 24px;">Hey ${profile.full_name || "there"}! 👋</h1>
              <p style="color: #71717a; margin: 0 0 24px 0;">Time to work on your daily habits:</p>
              
              <ul style="list-style: none; padding: 0; margin: 0 0 24px 0;">
                ${habitsList}
              </ul>
              
              <p style="color: #71717a; font-size: 14px; margin: 0;">
                Keep your streak going! Every small step counts. 🔥
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                Life OS - Your Personal Dashboard
              </p>
            </div>
          </body>
          </html>
        `;

        await sendEmail(
          userEmail,
          `⏰ Habit Reminder: ${habitsToRemind.length} habit${habitsToRemind.length > 1 ? "s" : ""} waiting for you!`,
          emailHtml
        );

        console.log("Email sent successfully to:", userEmail);
        emailsSent++;
      } catch (emailError: any) {
        console.error(`Failed to send email to ${userEmail}:`, emailError);
        errors.push(`${userEmail}: ${emailError.message}`);
      }
    }

    console.log(`Habit reminders job completed. Sent ${emailsSent} emails and ${pushSent} push notifications.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        pushSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Error in send-habit-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});