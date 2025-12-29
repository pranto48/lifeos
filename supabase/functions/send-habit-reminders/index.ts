import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting habit reminders job...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time
    const now = new Date();
    console.log(`Current UTC time: ${now.toISOString()}`);

    // Get all habits with reminders enabled
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select(`
        id,
        title,
        description,
        reminder_time,
        user_id,
        color
      `)
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

    // Get unique user IDs
    const userIds = [...new Set(habits.map(h => h.user_id))];
    
    // Get user profiles with timezone info
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, timezone, email")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Get auth users for emails
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    // Create email map from auth users
    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]));

    // Get today's completions to avoid reminding for already completed habits
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
    const errors: string[] = [];

    // Process each user's habits
    for (const profile of profiles || []) {
      const userTimezone = profile.timezone || "Asia/Dhaka";
      const userEmail = emailMap.get(profile.user_id) || profile.email;
      
      if (!userEmail) {
        console.log(`No email found for user ${profile.user_id}`);
        continue;
      }

      // Get user's habits that haven't been completed today
      const userHabits = habits.filter(h => 
        h.user_id === profile.user_id && !completedHabitIds.has(h.id)
      );

      if (userHabits.length === 0) {
        console.log(`No pending habits for user ${profile.user_id}`);
        continue;
      }

      // Check if it's the right time for this user's timezone
      const userNow = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
      const userHour = userNow.getHours();
      const userMinute = userNow.getMinutes();

      // Find habits whose reminder time matches current time (within 30 min window)
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

      console.log(`Sending reminder for ${habitsToRemind.length} habits to ${userEmail}`);

      // Build email content
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

    console.log(`Habit reminders job completed. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
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
