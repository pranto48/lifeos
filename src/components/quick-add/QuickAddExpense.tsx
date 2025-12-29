import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface QuickAddExpenseProps {
  onClose: () => void;
}

interface Category {
  id: string;
  name: string;
  is_income: boolean;
}

export function QuickAddExpense({ onClose }: QuickAddExpenseProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('budget_categories')
      .select('id, name, is_income')
      .eq('user_id', user?.id)
      .order('name');
    
    if (data) {
      setCategories(data);
    }
  };

  const filteredCategories = categories.filter(c => c.is_income === (type === 'income'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        amount: parseFloat(amount),
        type,
        category_id: categoryId || null,
        merchant: merchant.trim() || null,
        date,
      });

      if (error) throw error;

      toast({
        title: type === 'expense' ? 'Expense added' : 'Income added',
        description: `৳${parseFloat(amount).toLocaleString()} recorded.`,
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v: 'expense' | 'income') => setType(v)}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount (৳)</Label>
          <Input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="bg-muted/50 border-border font-mono"
            autoFocus
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-date">Date</Label>
          <Input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-muted/50 border-border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expense-merchant">Merchant / Description</Label>
        <Input
          id="expense-merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Where did you spend?"
          className="bg-muted/50 border-border"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!amount || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add {type === 'expense' ? 'Expense' : 'Income'}
        </Button>
      </div>
    </form>
  );
}
