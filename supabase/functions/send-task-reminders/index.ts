import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tasks due today or overdue
    const today = new Date().toISOString().split('T')[0];
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        due_date,
        priority,
        user_id
      `)
      .lte('due_date', today)
      .neq('status', 'completed')
      .neq('status', 'cancelled');

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      console.log("No tasks due for reminders");
      return new Response(JSON.stringify({ message: "No tasks need reminders" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(tasks.map(t => t.user_id))];
    
    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    const emailsSent: string[] = [];
    
    for (const userId of userIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (!userData?.user?.email) continue;

      const userEmail = userData.user.email;
      const profile = profiles?.find(p => p.user_id === userId);
      const userName = profile?.full_name || 'there';
      
      const userTasks = tasks.filter(t => t.user_id === userId);
      
      // Format tasks for email
      const tasksList = userTasks.map(task => {
        const isOverdue = task.due_date < today;
        const priorityEmoji = task.priority === 'urgent' ? '🔴' : 
                              task.priority === 'high' ? '🟠' : 
                              task.priority === 'medium' ? '🟡' : '🟢';
        return `${priorityEmoji} ${task.title} ${isOverdue ? '(OVERDUE)' : '(Due Today)'}`;
      }).join('<br/>');

      const overdueCounts = userTasks.filter(t => t.due_date < today).length;
      const todayCount = userTasks.length - overdueCounts;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%); padding: 30px; border-radius: 12px; color: white;">
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">📋 Task Reminder</h1>
            <p style="margin: 0; opacity: 0.8;">Hello ${userName}, here are your pending tasks</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 20px;">
            <div style="display: flex; gap: 20px; margin-bottom: 20px;">
              ${overdueCounts > 0 ? `<div style="background: #fef2f2; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${overdueCounts}</div>
                <div style="font-size: 12px; color: #991b1b;">Overdue</div>
              </div>` : ''}
              ${todayCount > 0 ? `<div style="background: #fefce8; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
                <div style="font-size: 28px; font-weight: bold; color: #ca8a04;">${todayCount}</div>
                <div style="font-size: 12px; color: #854d0e;">Due Today</div>
              </div>` : ''}
            </div>
            
            <h3 style="margin: 0 0 15px 0; color: #1e293b;">Your Tasks:</h3>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
              ${tasksList}
            </div>
          </div>
          
          <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 20px;">
            Sent from your Life OS Dashboard
          </p>
        </div>
      `;

      try {
        // Send email via Resend API directly
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Life OS <onboarding@resend.dev>",
            to: [userEmail],
            subject: `📋 ${userTasks.length} task${userTasks.length > 1 ? 's' : ''} need your attention`,
            html,
          }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error(`Error sending email to ${userEmail}:`, emailResult);
        } else {
          emailsSent.push(userEmail);
          console.log(`Reminder sent to ${userEmail}`);
        }
      } catch (emailErr) {
        console.error(`Failed to send email to ${userEmail}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: emailsSent.length,
        message: `Sent reminders to ${emailsSent.length} users`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-task-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
