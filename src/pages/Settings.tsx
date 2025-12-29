import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Download, LogOut, Mail, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { SessionManagement } from '@/components/settings/SessionManagement';
import { PasswordChange } from '@/components/settings/PasswordChange';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { BiometricManagement } from '@/components/settings/BiometricManagement';
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user?.id).maybeSingle();
    if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', user?.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: 'Saved', description: 'Profile updated successfully.' });
    setLoading(false);
  };

  const sendTestReminder = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-task-reminders');
      
      if (error) throw error;
      
      toast({ 
        title: 'Reminders Sent', 
        description: data.message || 'Task reminders have been processed.'
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

  const exportData = async () => {
    toast({ title: 'Exporting...', description: 'Preparing your data export.' });
    const [tasks, notes, transactions, goals, investments, projects, salaries, habits, family] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user?.id),
      supabase.from('notes').select('id, title, content, tags, is_pinned, is_favorite, is_vault, created_at, updated_at').eq('user_id', user?.id),
      supabase.from('transactions').select('*').eq('user_id', user?.id),
      supabase.from('goals').select('*').eq('user_id', user?.id),
      supabase.from('investments').select('*').eq('user_id', user?.id),
      supabase.from('projects').select('*').eq('user_id', user?.id),
      supabase.from('salary_entries').select('*').eq('user_id', user?.id),
      supabase.from('habits').select('*').eq('user_id', user?.id),
      supabase.from('family_members').select('*').eq('user_id', user?.id),
    ]);
    
    const data = { 
      tasks: tasks.data, 
      notes: notes.data?.map(n => ({ ...n, content: n.is_vault ? '[ENCRYPTED]' : n.content })), 
      transactions: transactions.data, 
      goals: goals.data, 
      investments: investments.data, 
      projects: projects.data,
      salaries: salaries.data,
      habits: habits.data,
      family: family.data,
      exportedAt: new Date().toISOString() 
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast({ title: 'Export complete', description: 'Your data has been downloaded.' });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-muted/50" />
          </div>
          <Button onClick={saveProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <SessionManagement />
      
      <PasswordChange />
      
      <TwoFactorAuth />

      <BiometricManagement />

      <PushNotificationSettings />

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Bell className="h-5 w-5" /> Email Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Get email reminders for tasks that are due today or overdue. 
            Reminders are sent to your registered email address.
          </p>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={sendTestReminder} 
              disabled={sendingReminders}
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingReminders ? 'Sending...' : 'Send Reminder Now'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Automated daily reminders are enabled for tasks (8 AM), habits (hourly), and family events (7 AM).
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" /> Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Row Level Security</p>
                <p className="text-xs text-muted-foreground">All your data is protected with database-level security policies. Only you can access your data.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Vault Notes Encryption</p>
                <p className="text-xs text-muted-foreground">Vault notes use AES-256-GCM encryption with PBKDF2 key derivation. Your passphrase never leaves your browser.</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" /> Export All Data
            </Button>
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <SettingsIcon className="h-5 w-5" /> Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-foreground">Timezone</span>
            <span className="text-sm text-muted-foreground">{profile?.timezone || 'Asia/Dhaka'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-foreground">Currency</span>
            <span className="text-sm text-muted-foreground">{profile?.currency || 'BDT'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-foreground">Date Format</span>
            <span className="text-sm text-muted-foreground">{profile?.date_format || 'DD/MM/YYYY'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
