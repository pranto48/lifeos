import { useState, useEffect } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Salary() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadEntries();
  }, [user]);

  const loadEntries = async () => {
    const { data } = await supabase.from('salary_entries').select('*').eq('user_id', user?.id).order('year', { ascending: false }).order('month', { ascending: false });
    setEntries(data || []);
  };

  const totalNet = entries.reduce((s, e) => s + Number(e.net_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Salary History</h1>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Net Earned</p>
          <p className="font-mono text-2xl font-bold text-primary">৳{totalNet.toLocaleString()}</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Salary Timeline</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No salary entries yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{months[e.month - 1]} {e.year}</p>
                    <p className="text-sm text-muted-foreground">Gross: ৳{Number(e.gross_amount).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-primary">৳{Number(e.net_amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Net</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
