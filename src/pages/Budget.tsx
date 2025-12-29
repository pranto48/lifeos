import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function Budget() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadCategories();
    }
  }, [user]);

  const loadTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*, budget_categories(name, color)').eq('user_id', user?.id).order('date', { ascending: false }).limit(50);
    setTransactions(data || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from('budget_categories').select('*').eq('user_id', user?.id);
    setCategories(data || []);
  };

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Budget & Spending</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20"><ArrowUpRight className="h-5 w-5 text-green-400" /></div>
            <div><p className="text-sm text-muted-foreground">Income</p><p className="font-mono text-xl font-bold text-green-400">৳{income.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/20"><ArrowDownRight className="h-5 w-5 text-red-400" /></div>
            <div><p className="text-sm text-muted-foreground">Expenses</p><p className="font-mono text-xl font-bold text-red-400">৳{expense.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/20"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Balance</p><p className={`font-mono text-xl font-bold ${income - expense >= 0 ? 'text-green-400' : 'text-red-400'}`}>৳{(income - expense).toLocaleString()}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm text-muted-foreground">Recent Transactions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions yet. Press 'e' to add one!</p>
          ) : (
            transactions.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {t.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-green-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.merchant || t.budget_categories?.name || 'Transaction'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <span className={`font-mono font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}৳{Number(t.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
