import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
// @ts-ignore
import webPush from 'https://esm.sh/web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Loan {
  id: string;
  user_id: string;
  lender_name: string;
  monthly_payment: number | null;
  next_payment_date: string | null;
  reminder_days: number;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active loans with upcoming payments
    const today = new Date();
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .eq('status', 'active')
      .not('next_payment_date', 'is', null);

    if (loansError) {
      throw loansError;
    }

    const remindersToSend: { loan: Loan; daysUntil: number }[] = [];

    for (const loan of loans || []) {
      if (loan.next_payment_date) {
        const paymentDate = new Date(loan.next_payment_date);
        const diffTime = paymentDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Send reminder if within reminder_days threshold
        if (diffDays >= 0 && diffDays <= (loan.reminder_days || 3)) {
          remindersToSend.push({ loan, daysUntil: diffDays });
        }
      }
    }

    console.log(`Found ${remindersToSend.length} loan payment reminders to send`);

    // Send push notifications
    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(
        'mailto:admin@lifeos.local',
        vapidPublicKey,
        vapidPrivateKey
      );

      for (const { loan, daysUntil } of remindersToSend) {
        // Get push subscriptions for the user
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', loan.user_id);

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No push subscriptions for user ${loan.user_id}`);
          continue;
        }

        const dueMessage = daysUntil === 0 
          ? 'Payment due today!' 
          : `Payment due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;

        const payload = JSON.stringify({
          title: `💳 Loan Payment Reminder`,
          body: `${loan.lender_name}: ${dueMessage}${loan.monthly_payment ? ` - ৳${loan.monthly_payment.toLocaleString()}` : ''}`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: `loan-reminder-${loan.id}`,
          data: {
            url: '/loans',
            loanId: loan.id
          }
        });

        for (const sub of subscriptions) {
          try {
            await webPush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              },
              payload
            );
            console.log(`Sent notification for loan ${loan.id} to user ${loan.user_id}`);
          } catch (error: any) {
            console.error(`Failed to send notification:`, error);
            
            // Remove invalid subscriptions
            if (error.statusCode === 410 || error.statusCode === 404) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_sent: remindersToSend.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error('Error sending loan reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
