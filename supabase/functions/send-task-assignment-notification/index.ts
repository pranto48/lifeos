import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    // Skip polling subscriptions
    if (subscription.endpoint.startsWith('polling-')) {
      return false;
    }

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Push failed with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

async function sendEmailNotification(
  resend: Resend,
  recipientEmail: string,
  recipientName: string,
  title: string,
  body: string,
  type: string
): Promise<boolean> {
  try {
    const emailSubject = title;
    
    let actionColor = '#3b82f6'; // blue for assignments
    if (type === 'accepted') actionColor = '#22c55e'; // green
    if (type === 'rejected') actionColor = '#ef4444'; // red

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #0f172a;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 48px; height: 48px; background-color: ${actionColor}20; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">📋</span>
              </div>
            </div>
            
            <h1 style="color: #f1f5f9; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
              ${title}
            </h1>
            
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
              Hi ${recipientName || 'there'},
            </p>
            
            <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
                ${body}
              </p>
            </div>
            
            <div style="text-align: center;">
              <a href="https://lifeos.lovable.app/tasks" style="display: inline-block; background-color: ${actionColor}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px;">
                View Tasks
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #334155; margin: 32px 0;" />
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
              This notification was sent from LifeOS. You can manage your notification preferences in Settings.
            </p>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "LifeOS <notifications@resend.dev>",
      to: [recipientEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { type, assignment_id, recipient_user_id, task_title, sender_name, message } = await req.json();

    if (!type || !recipient_user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build notification content based on type
    let title: string;
    let body: string;
    const url = '/tasks';

    switch (type) {
      case 'assignment':
        title = 'New Task Assignment';
        body = `${sender_name} assigned you a task: "${task_title}"${message ? ` - "${message}"` : ''}`;
        break;
      case 'accepted':
        title = 'Task Assignment Accepted';
        body = `${sender_name} accepted your task: "${task_title}"`;
        break;
      case 'rejected':
        title = 'Task Assignment Declined';
        body = `${sender_name} declined your task: "${task_title}"`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid notification type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    console.log(`Sending ${type} notification to user ${recipient_user_id}`);

    // Get recipient's profile for email
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', recipient_user_id)
      .single();

    // Get recipient's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', recipient_user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
    }

    const payload: PushPayload = {
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url,
      tag: `task-assignment-${assignment_id || 'general'}`
    };

    let pushSuccessCount = 0;
    const failedEndpoints: string[] = [];

    // Try push notifications first
    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        const success = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        );
        
        if (success) {
          pushSuccessCount++;
        } else if (!sub.endpoint.startsWith('polling-')) {
          failedEndpoints.push(sub.id);
        }
      }

      // Clean up failed subscriptions
      if (failedEndpoints.length > 0) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .in('id', failedEndpoints);
      }
    }

    // Send email as fallback if no push notifications were successful
    let emailSent = false;
    if (pushSuccessCount === 0 && resend && recipientProfile?.email) {
      console.log('No push notifications sent, falling back to email');
      emailSent = await sendEmailNotification(
        resend,
        recipientProfile.email,
        recipientProfile.full_name || '',
        title,
        body,
        type
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        push_sent: pushSuccessCount,
        email_sent: emailSent
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-task-assignment-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
