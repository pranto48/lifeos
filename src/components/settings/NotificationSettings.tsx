import { useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';

export function NotificationSettings() {
  const { language } = useLanguage();
  const [sendingReminders, setSendingReminders] = useState(false);

  const sendTestReminder = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-task-reminders');
      
      if (error) throw error;
      
      toast({ 
        title: language === 'bn' ? 'রিমাইন্ডার পাঠানো হয়েছে' : 'Reminders Sent', 
        description: data.message || (language === 'bn' ? 'কাজের রিমাইন্ডার প্রসেস করা হয়েছে।' : 'Task reminders have been processed.')
      });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send reminders', 
        variant: 'destructive' 
      });
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="space-y-6">
      <PushNotificationSettings />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5" /> {language === 'bn' ? 'ইমেইল রিমাইন্ডার' : 'Email Reminders'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'কাজ, অভ্যাস এবং পারিবারিক ইভেন্টের জন্য ইমেইল রিমাইন্ডার পরিচালনা করুন।'
              : 'Manage email reminders for tasks, habits, and family events.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {language === 'bn' 
              ? 'আজ বা অতিরিক্ত বকেয়া কাজের জন্য ইমেইল রিমাইন্ডার পান। রিমাইন্ডার আপনার নিবন্ধিত ইমেইল ঠিকানায় পাঠানো হবে।'
              : 'Get email reminders for tasks that are due today or overdue. Reminders are sent to your registered email address.'
            }
          </p>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={sendTestReminder} 
              disabled={sendingReminders}
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingReminders 
                ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Sending...') 
                : (language === 'bn' ? 'এখনই রিমাইন্ডার পাঠান' : 'Send Reminder Now')
              }
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' 
              ? '💡 কাজ (সকাল ৮টা), অভ্যাস (প্রতি ঘণ্টা), এবং পারিবারিক ইভেন্টের (সকাল ৭টা) জন্য স্বয়ংক্রিয় দৈনিক রিমাইন্ডার সক্রিয় আছে।'
              : '💡 Automated daily reminders are enabled for tasks (8 AM), habits (hourly), and family events (7 AM).'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
