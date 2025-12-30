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

const EVENT_TYPE_EMOJI: Record<string, string> = {
  birthday: "🎂",
  anniversary: "💕",
  graduation: "🎓",
  other: "📅",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary", 
  graduation: "Graduation",
  other: "Event",
};

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
    console.log("API key validated successfully, starting family event reminders job...");

    const today = new Date();
    const currentYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    console.log(`Checking events for ${todayMonth}/${todayDay}/${currentYear}`);

    // Get all family events
    const { data: events, error: eventsError } = await supabase
      .from("family_events")
      .select(`
        id,
        title,
        event_type,
        event_date,
        reminder_days,
        user_id,
        notes,
        family_member:family_members(name, relationship)
      `);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      throw eventsError;
    }

    console.log(`Found ${events?.length || 0} family events`);

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No family events found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(events.map(e => e.user_id))];

    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, timezone")
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

    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]));
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    // Find events that need reminders
    const eventsToRemind: Array<{
      event: typeof events[0];
      daysUntil: number;
      userEmail: string;
      userName: string;
    }> = [];

    for (const event of events) {
      const eventDate = new Date(event.event_date);
      const eventMonth = eventDate.getMonth() + 1;
      const eventDay = eventDate.getDate();

      // Calculate next occurrence this year
      let nextOccurrence = new Date(currentYear, eventMonth - 1, eventDay);
      if (nextOccurrence < today) {
        nextOccurrence = new Date(currentYear + 1, eventMonth - 1, eventDay);
      }

      // Calculate days until the event
      const timeDiff = nextOccurrence.getTime() - today.getTime();
      const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // Check if we should send a reminder
      const reminderDays = event.reminder_days || 7;
      
      if (daysUntil === reminderDays || daysUntil === 1 || daysUntil === 0) {
        const userEmail = emailMap.get(event.user_id);
        const profile = profileMap.get(event.user_id);
        
        if (userEmail) {
          eventsToRemind.push({
            event,
            daysUntil,
            userEmail,
            userName: profile?.full_name || "there",
          });
        }
      }
    }

    console.log(`Found ${eventsToRemind.length} events needing reminders`);

    if (eventsToRemind.length === 0) {
      return new Response(
        JSON.stringify({ message: "No events need reminders today" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Group events by user
    const eventsByUser = new Map<string, typeof eventsToRemind>();
    for (const item of eventsToRemind) {
      const existing = eventsByUser.get(item.userEmail) || [];
      existing.push(item);
      eventsByUser.set(item.userEmail, existing);
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Send emails to each user
    for (const [userEmail, userEvents] of eventsByUser) {
      const userName = userEvents[0].userName;
      
      const eventsList = userEvents.map(item => {
        const emoji = EVENT_TYPE_EMOJI[item.event.event_type] || "📅";
        const label = EVENT_TYPE_LABEL[item.event.event_type] || "Event";
        const familyMember = item.event.family_member as unknown as { name: string; relationship: string } | null;
        const memberName = familyMember?.name;
        const memberRelation = familyMember?.relationship;
        
        let timeText = "";
        if (item.daysUntil === 0) {
          timeText = '<span style="color: #ec4899; font-weight: 600;">TODAY!</span>';
        } else if (item.daysUntil === 1) {
          timeText = '<span style="color: #f97316; font-weight: 600;">Tomorrow</span>';
        } else {
          timeText = `in <strong>${item.daysUntil} days</strong>`;
        }

        return `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">${emoji}</span>
                <div>
                  <p style="margin: 0; font-weight: 600; color: #18181b;">${item.event.title}</p>
                  ${memberName ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #71717a;">${memberName}${memberRelation ? ` (${memberRelation})` : ""}</p>` : ""}
                  <p style="margin: 4px 0 0 0; font-size: 14px; color: #71717a;">${label} ${timeText}</p>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      const urgentCount = userEvents.filter(e => e.daysUntil <= 1).length;
      const subject = urgentCount > 0 
        ? `🔔 ${urgentCount} family event${urgentCount > 1 ? "s" : ""} coming up soon!`
        : `📅 Family Event Reminder: ${userEvents.length} upcoming event${userEvents.length > 1 ? "s" : ""}`;

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
              <h1 style="color: #18181b; margin: 0 0 8px 0; font-size: 24px;">Hey ${userName}! 👋</h1>
              <p style="color: #71717a; margin: 0 0 24px 0;">Here are your upcoming family events:</p>
              
              <table style="width: 100%; border-collapse: collapse;">
                ${eventsList}
              </table>
              
              <p style="color: #71717a; font-size: 14px; margin: 24px 0 0 0;">
                Don't forget to prepare something special! 🎁
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                Life OS - Your Personal Dashboard
              </p>
            </div>
          </body>
          </html>
        `;

        await sendEmail(userEmail, subject, emailHtml);
        console.log("Email sent successfully to:", userEmail);
        emailsSent++;
      } catch (emailError: any) {
        console.error(`Failed to send email to ${userEmail}:`, emailError);
        errors.push(`${userEmail}: ${emailError.message}`);
      }
    }

    console.log(`Family event reminders job completed. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        eventsProcessed: eventsToRemind.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Error in send-family-event-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});