import { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Users, Plus, Filter, MoreVertical, Pencil, Trash2, Target, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  merchant: string | null;
  date: string;
  category_id: string | null;
  family_member_id: string | null;
  budget_categories: { name: string; color: string } | null;
  family_members: { name: string; relationship: string } | null;
}

interface Category {
  id: string;
  name: string;
  is_income: boolean;
  color: string | null;
}

interface Budget {
  id: string;
  category_id: string;
  amount: number;
  month: number;
  year: number;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
}

export default function Budget() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'expense' | 'income',
    category_id: '',
    family_member_id: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [budgetForm, setBudgetForm] = useState({
    category_id: '',
    amount: '',
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadCategories();
      loadFamilyMembers();
      loadBudgets();
    }
  }, [user]);

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, budget_categories(name, color), family_members(name, relationship)')
      .eq('user_id', user?.id)
      .order('date', { ascending: false })
      .limit(100);
    setTransactions((data as Transaction[]) || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');
    setCategories(data || []);
  };

  const loadBudgets = async () => {
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user?.id)
      .eq('month', currentMonth)
      .eq('year', currentYear);
    setBudgets(data || []);
  };

  const loadFamilyMembers = async () => {
    const { data } = await supabase
      .from('family_members')
      .select('id, name, relationship')
      .eq('user_id', user?.id)
      .order('name');
    setFamilyMembers(data || []);
  };

  const filteredTransactions = filterMember === 'all' 
    ? transactions 
    : transactions.filter(t => t.family_member_id === filterMember);

  // Filter to current month for budget tracking
  const currentMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
  });

  const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const filteredCategories = categories.filter(c => c.is_income === (formData.type === 'income'));
  const expenseCategories = categories.filter(c => !c.is_income);

  // Calculate spending per category for current month
  const spendingByCategory = expenseCategories.map(cat => {
    const spent = currentMonthTransactions
      .filter(t => t.category_id === cat.id && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const budget = budgets.find(b => b.category_id === cat.id);
    const limit = budget ? Number(budget.amount) : 0;
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    
    return {
      ...cat,
      spent,
      limit,
      percentage: Math.min(percentage, 100),
      overBudget: spent > limit && limit > 0,
      nearLimit: percentage >= 80 && percentage < 100,
    };
  }).filter(c => c.limit > 0 || c.spent > 0);

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'expense',
      category_id: '',
      family_member_id: '',
      merchant: '',
      date: new Date().toISOString().split('T')[0],
    });
    setEditingTransaction(null);
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: String(transaction.amount),
      type: transaction.type as 'expense' | 'income',
      category_id: transaction.category_id || '',
      family_member_id: transaction.family_member_id || '',
      merchant: transaction.merchant || '',
      date: transaction.date,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !user) return;

    try {
      const payload = {
        user_id: user.id,
        amount: parseFloat(formData.amount),
        type: formData.type,
        category_id: formData.category_id || null,
        family_member_id: formData.family_member_id || null,
        merchant: formData.merchant.trim() || null,
        date: formData.date,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editingTransaction.id);
        if (error) throw error;
        toast.success('Transaction updated!');
      } else {
        const { error } = await supabase.from('transactions').insert(payload);
        if (error) throw error;
        
        // Check if this transaction exceeds budget
        if (formData.category_id && formData.type === 'expense') {
          const budget = budgets.find(b => b.category_id === formData.category_id);
          if (budget) {
            const currentSpent = currentMonthTransactions
              .filter(t => t.category_id === formData.category_id && t.type === 'expense')
              .reduce((sum, t) => sum + Number(t.amount), 0);
            const newTotal = currentSpent + parseFloat(formData.amount);
            
            if (newTotal > Number(budget.amount)) {
              toast.warning(`Budget exceeded for this category! Spent: ৳${newTotal.toLocaleString()} / ৳${Number(budget.amount).toLocaleString()}`);
            } else if ((newTotal / Number(budget.amount)) >= 0.8) {
              toast.info(`Approaching budget limit! ${Math.round((newTotal / Number(budget.amount)) * 100)}% used`);
            }
          }
        }
        
        toast.success('Transaction added!');
      }

      setDialogOpen(false);
      resetForm();
      loadTransactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetForm.category_id || !budgetForm.amount || !user) return;

    try {
      // Check if budget exists for this category/month/year
      const existingBudget = budgets.find(b => b.category_id === budgetForm.category_id);

      if (existingBudget) {
        const { error } = await supabase
          .from('budgets')
          .update({ amount: parseFloat(budgetForm.amount) })
          .eq('id', existingBudget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('budgets').insert({
          user_id: user.id,
          category_id: budgetForm.category_id,
          amount: parseFloat(budgetForm.amount),
          month: currentMonth,
          year: currentYear,
        });
        if (error) throw error;
      }

      toast.success('Budget limit saved!');
      setBudgetDialogOpen(false);
      setBudgetForm({ category_id: '', amount: '' });
      loadBudgets();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Transaction deleted');
      loadTransactions();
    }
  };

  // Calculate spending by family member
  const spendingByMember = familyMembers.map(member => {
    const memberTransactions = transactions.filter(t => t.family_member_id === member.id && t.type === 'expense');
    const total = memberTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    return { ...member, total, count: memberTransactions.length };
  }).filter(m => m.total > 0).sort((a, b) => b.total - a.total);

  // Categories with budget alerts
  const alertCategories = spendingByCategory.filter(c => c.overBudget || c.nearLimit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Budget & Spending</h1>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              {familyMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Set Budget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Monthly Budget Limit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBudgetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={budgetForm.category_id} onValueChange={(v) => setBudgetForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Limit (৳)</Label>
                  <Input
                    type="number"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                    className="font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This limit applies to {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Limit</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Transaction</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(v: 'expense' | 'income') => setFormData(f => ({ ...f, type: v, category_id: '' }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData(f => ({ ...f, amount: e.target.value }))}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category_id || "none"} onValueChange={(v) => setFormData(f => ({ ...f, category_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.merchant}
                      onChange={(e) => setFormData(f => ({ ...f, merchant: e.target.value }))}
                      placeholder="Where/what?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      Family Member
                    </Label>
                    <Select value={formData.family_member_id || "none"} onValueChange={(v) => setFormData(f => ({ ...f, family_member_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {familyMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingTransaction ? 'Save' : 'Add'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Budget Alerts */}
      {alertCategories.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Budget Alerts</p>
                <div className="mt-1 space-y-1">
                  {alertCategories.map(cat => (
                    <p key={cat.id} className="text-sm text-muted-foreground">
                      <span className="font-medium">{cat.name}:</span>{' '}
                      {cat.overBudget ? (
                        <span className="text-red-500">Over budget by ৳{(cat.spent - cat.limit).toLocaleString()}</span>
                      ) : (
                        <span className="text-orange-500">{Math.round(cat.percentage)}% used</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Budget Progress */}
      {spendingByCategory.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Budget Progress - {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {spendingByCategory.map(cat => (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color || '#6b7280' }}
                    />
                    <span className="font-medium text-foreground">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono ${cat.overBudget ? 'text-red-500' : 'text-muted-foreground'}`}>
                      ৳{cat.spent.toLocaleString()}
                    </span>
                    {cat.limit > 0 && (
                      <span className="text-muted-foreground">/ ৳{cat.limit.toLocaleString()}</span>
                    )}
                    {cat.overBudget && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
                {cat.limit > 0 && (
                  <Progress 
                    value={cat.percentage} 
                    className={`h-2 ${cat.overBudget ? '[&>div]:bg-red-500' : cat.nearLimit ? '[&>div]:bg-orange-500' : ''}`}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Family Spending Summary */}
      {spendingByMember.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Spending by Family Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {spendingByMember.map(member => (
                <div 
                  key={member.id} 
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setFilterMember(member.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ৳{member.total.toLocaleString()} • {member.count} transactions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {filterMember !== 'all' 
              ? `Transactions for ${familyMembers.find(m => m.id === filterMember)?.name}` 
              : 'Recent Transactions'
            }
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {filterMember !== 'all' ? 'No transactions for this family member' : "No transactions yet. Press 'e' to add one!"}
            </p>
          ) : (
            filteredTransactions.slice(0, 20).map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group">
                <div className="flex items-center gap-3">
                  {t.type === 'income' ? <ArrowUpRight className="h-4 w-4 text-green-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{t.merchant || t.budget_categories?.name || 'Transaction'}</p>
                      {t.family_members && (
                        <Badge variant="secondary" className="text-xs py-0">
                          <Users className="h-3 w-3 mr-1" />
                          {t.family_members.name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(t.date), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-semibold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}৳{Number(t.amount).toLocaleString()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(t)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
