import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function getResendApiKey(supabase: any): Promise<string | null> {
  // First try environment variable
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey) {
    return envKey;
  }

  // Then try app_secrets table (admin-configured key)
  try {
    const { data } = await supabase
      .from("app_secrets")
      .select("value")
      .eq("id", "resend_api_key")
      .maybeSingle();

    if (data?.value) {
      return data.value;
    }
  } catch (error) {
    console.error("Error fetching Resend API key from app_secrets:", error);
  }

  return null;
}

async function sendWithResend(payload: EmailPayload, supabase: any): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = await getResendApiKey(supabase);
  
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured (neither in env nor in app_secrets)");
    return { success: false, error: "Email service not configured. Please configure Resend API key in Admin Settings." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "LifeOS <onboarding@resend.dev>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("Email sent successfully via Resend:", result);
      return { success: true };
    } else {
      console.error("Resend API error:", result);
      return { success: false, error: result.message || "Failed to send email" };
    }
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}

function generateTaskReminderEmail(taskTitle: string, dueDate: string, priority: string): { html: string; text: string } {
  const priorityColors: Record<string, string> = {
    urgent: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#22c55e",
  };

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background-color: #3b82f620; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">📋</span>
            </div>
          </div>
          
          <h1 style="color: #f1f5f9; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
            Task Reminder
          </h1>
          
          <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
              ${taskTitle}
            </p>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0;">
              <strong>Due:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; color: white; background-color: ${priorityColors[priority] || '#6366f1'};">
              ${priority.toUpperCase()}
            </span>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
            Don't forget to complete this task before the deadline!
          </p>
          
          <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
            This reminder was sent from LifeOS
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `Task Reminder\n\n${taskTitle}\nDue: ${dueDate}\nPriority: ${priority}\n\nDon't forget to complete this task before the deadline!`;

  return { html, text };
}

function generateLoanReminderEmail(loanName: string, amount: number, dueDate: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background-color: #f9731620; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">💰</span>
            </div>
          </div>
          
          <h1 style="color: #f1f5f9; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
            Loan Payment Reminder
          </h1>
          
          <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
              ${loanName}
            </p>
            <p style="color: #22c55e; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
              ৳${amount.toLocaleString()}
            </p>
            <p style="color: #94a3b8; font-size: 14px; margin: 0;">
              <strong>Due:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
            Your loan payment is due soon. Make sure to complete the payment on time!
          </p>
          
          <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
            This reminder was sent from LifeOS
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `Loan Payment Reminder\n\n${loanName}\nAmount: ৳${amount.toLocaleString()}\nDue: ${dueDate}\n\nYour loan payment is due soon. Make sure to complete the payment on time!`;

  return { html, text };
}

function generateTaskAssignmentEmail(taskTitle: string, assignerName: string, message?: string): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0f172a;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 48px; height: 48px; background-color: #8b5cf620; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="font-size: 24px;">📌</span>
            </div>
          </div>
          
          <h1 style="color: #f1f5f9; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
            New Task Assignment
          </h1>
          
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; text-align: center;">
            <strong style="color: #e2e8f0;">${assignerName}</strong> has assigned you a task
          </p>
          
          <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0;">
              ${taskTitle}
            </p>
            ${message ? `<p style="color: #94a3b8; font-size: 14px; margin: 12px 0 0 0; font-style: italic;">"${message}"</p>` : ''}
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
            Open LifeOS to accept or decline this task assignment.
          </p>
          
          <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
          
          <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
            This notification was sent from LifeOS
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `New Task Assignment\n\n${assignerName} has assigned you a task: ${taskTitle}\n${message ? `Message: "${message}"` : ''}\n\nOpen LifeOS to accept or decline this task assignment.`;

  return { html, text };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify API key for cron job calls
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) {
      const { data: secretData } = await supabase
        .from("app_secrets")
        .select("value")
        .eq("id", "api_key")
        .maybeSingle();

      if (!secretData || secretData.value !== apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid API key" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { type, to, data } = await req.json();

    let emailContent: { html: string; text: string };
    let subject: string;

    switch (type) {
      case "task_reminder":
        emailContent = generateTaskReminderEmail(data.taskTitle, data.dueDate, data.priority);
        subject = `Reminder: ${data.taskTitle}`;
        break;

      case "loan_reminder":
        emailContent = generateLoanReminderEmail(data.loanName, data.amount, data.dueDate);
        subject = `Loan Payment Due: ${data.loanName}`;
        break;

      case "task_assignment":
        emailContent = generateTaskAssignmentEmail(data.taskTitle, data.assignerName, data.message);
        subject = `New Task Assignment: ${data.taskTitle}`;
        break;

      case "custom":
        emailContent = { html: data.html, text: data.text || "" };
        subject = data.subject;
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Invalid notification type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const result = await sendWithResend({
      to,
      subject,
      html: emailContent.html,
      text: emailContent.text,
    }, supabase);

    console.log(`Email notification sent (${type}):`, { to, subject, success: result.success });

    return new Response(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-email-notification function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
