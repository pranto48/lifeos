import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Download, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

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

  const exportData = async () => {
    toast({ title: 'Exporting...', description: 'Preparing your data export.' });
    const [tasks, notes, transactions, goals, investments, projects] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user?.id),
      supabase.from('notes').select('*').eq('user_id', user?.id),
      supabase.from('transactions').select('*').eq('user_id', user?.id),
      supabase.from('goals').select('*').eq('user_id', user?.id),
      supabase.from('investments').select('*').eq('user_id', user?.id),
      supabase.from('projects').select('*').eq('user_id', user?.id),
    ]);
    const data = { tasks: tasks.data, notes: notes.data, transactions: transactions.data, goals: goals.data, investments: investments.data, projects: projects.data, exportedAt: new Date().toISOString() };
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
        <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><User className="h-5 w-5" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-muted/50" />
          </div>
          <Button onClick={saveProfile} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><Shield className="h-5 w-5" /> Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Your data is protected with Row Level Security. Only you can access your data.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData}><Download className="h-4 w-4 mr-2" /> Export All Data</Button>
            <Button variant="destructive" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Sign Out</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="flex items-center gap-2 text-foreground"><SettingsIcon className="h-5 w-5" /> Preferences</CardTitle></CardHeader>
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
