import { useState, useEffect, useMemo } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Users, Plus, Filter, MoreVertical, Pencil, Trash2, Target, AlertTriangle, Settings, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Transaction {
  id: string;
  amount: number;
  type: string;
  merchant: string | null;
  date: string;
  category_id: string | null;
  family_member_id: string | null;
  account: string | null;
  budget_categories: { name: string; color: string } | null;
  family_members: { name: string; relationship: string } | null;
}

// Income sources will be translated in component
const INCOME_SOURCE_KEYS = [
  { value: 'salary', key: 'income.salary' },
  { value: 'freelance', key: 'income.freelance' },
  { value: 'business', key: 'income.business' },
  { value: 'investment', key: 'income.investment' },
  { value: 'rental', key: 'income.rental' },
  { value: 'gift', key: 'income.gift' },
  { value: 'other', key: 'income.other' },
] as const;

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
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [filterMember, setFilterMember] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', is_income: false, color: '#6b7280' });
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense' as 'expense' | 'income',
    category_id: '',
    family_member_id: '',
    merchant: '',
    account: 'cash',
    date: new Date().toISOString().split('T')[0],
  });

  const [budgetForm, setBudgetForm] = useState({
    category_id: '',
    amount: '',
  });

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadAllTransactions();
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

  const loadAllTransactions = async () => {
    // Load last 12 months of transactions for the chart
    const sixMonthsAgo = format(subMonths(new Date(), 11), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('transactions')
      .select('id, amount, type, date')
      .eq('user_id', user?.id)
      .gte('date', sixMonthsAgo)
      .order('date', { ascending: true });
    setAllTransactions((data as Transaction[]) || []);
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

  // Calculate monthly trend data for chart (last 12 months)
  const monthlyTrendData = useMemo(() => {
    const months: { month: string; income: number; expense: number; balance: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'MMM yyyy');
      
      const monthTransactions = allTransactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });
      
      const monthIncome = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const monthExpense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      months.push({
        month: format(monthDate, 'MMM'),
        income: monthIncome,
        expense: monthExpense,
        balance: monthIncome - monthExpense,
      });
    }
    
    return months;
  }, [allTransactions]);

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

  // Pie chart data for expense breakdown
  const pieChartData = useMemo(() => {
    const categorySpending = categories
      .filter(c => !c.is_income)
      .map(cat => {
        const spent = currentMonthTransactions
          .filter(t => t.category_id === cat.id && t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        return {
          name: cat.name,
          value: spent,
          color: cat.color || '#6b7280',
        };
      })
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
    
    // Add "Uncategorized" if there are expenses without category
    const uncategorized = currentMonthTransactions
      .filter(t => !t.category_id && t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    if (uncategorized > 0) {
      categorySpending.push({
        name: t('budget.uncategorized'),
        value: uncategorized,
        color: '#9ca3af',
      });
    }
    
    return categorySpending;
  }, [currentMonthTransactions, categories]);

  const totalPieValue = pieChartData.reduce((sum, d) => sum + d.value, 0);

  const resetForm = () => {
    setFormData({
      amount: '',
      type: 'expense',
      category_id: '',
      family_member_id: '',
      merchant: '',
      account: 'cash',
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
      account: transaction.account || 'cash',
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
        account: formData.type === 'income' ? formData.account : 'cash',
        date: formData.date,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editingTransaction.id);
        if (error) throw error;
        toast.success(t('budget.transactionUpdated'));
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
              toast.warning(`${t('budget.budgetExceeded')} ৳${newTotal.toLocaleString()} / ৳${Number(budget.amount).toLocaleString()}`);
            } else if ((newTotal / Number(budget.amount)) >= 0.8) {
              toast.info(`${t('budget.approachingLimit')} ${Math.round((newTotal / Number(budget.amount)) * 100)}% ${t('budget.used')}`);
            }
          }
        }
        
        toast.success(t('budget.transactionAdded'));
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

      toast.success(t('budget.budgetSaved'));
      setBudgetDialogOpen(false);
      setBudgetForm({ category_id: '', amount: '' });
      loadBudgets();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('budget.deleteConfirm'))) return;
    
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(t('budget.transactionDeleted'));
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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim() || !user) return;

    try {
      const { error } = await supabase.from('budget_categories').insert({
        user_id: user.id,
        name: newCategory.name.trim(),
        is_income: newCategory.is_income,
        color: newCategory.color,
      });
      if (error) throw error;

      toast.success(t('budget.categoryAdded'));
      setNewCategory({ name: '', is_income: false, color: '#6b7280' });
      loadCategories();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm(t('budget.deleteCategoryConfirm'))) return;

    const { error } = await supabase.from('budget_categories').delete().eq('id', categoryId);
    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success(t('budget.categoryDeleted'));
      loadCategories();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">{t('budget.title')}</h1>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('budget.allMembers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('budget.allMembers')}</SelectItem>
              {familyMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                {t('budget.setBudget')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('budget.setMonthlyLimit')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleBudgetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('budget.category')}</Label>
                  <Select value={budgetForm.category_id} onValueChange={(v) => setBudgetForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={t('budget.selectCategory')} /></SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('budget.monthlyLimit')} (৳)</Label>
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
                  {t('budget.limitApplies')} {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setBudgetDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button type="submit">{t('budget.saveLimit')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                {t('budget.manageCategories')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('budget.addCategory')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('budget.categoryName')}</Label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(c => ({ ...c, name: e.target.value }))}
                    placeholder={t('budget.categoryName')}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('budget.categoryType')}</Label>
                    <Select 
                      value={newCategory.is_income ? 'income' : 'expense'} 
                      onValueChange={(v) => setNewCategory(c => ({ ...c, is_income: v === 'income' }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">{t('budget.expenseCategory')}</SelectItem>
                        <SelectItem value="income">{t('budget.incomeCategory')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('budget.categoryColor')}</Label>
                    <Input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory(c => ({ ...c, color: e.target.value }))}
                      className="h-10 p-1 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="submit">{t('common.add')}</Button>
                </div>
              </form>

              {/* Existing Categories List */}
              <div className="mt-4 border-t pt-4">
                <Label className="text-sm font-medium">{t('budget.existingCategories')}</Label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('budget.noCategories')}</p>
                  ) : (
                    categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 group">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.color || '#6b7280' }}
                          />
                          <span className="text-sm">{cat.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {cat.is_income ? t('budget.income') : t('budget.expense')}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t('budget.addTransaction')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTransaction ? t('budget.editTransaction') : t('budget.addTransaction')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('budget.type')}</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(v: 'expense' | 'income') => setFormData(f => ({ ...f, type: v, category_id: '' }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">{t('budget.expense')}</SelectItem>
                        <SelectItem value="income">{t('budget.income')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('budget.amount')} (৳)</Label>
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
                    <Label>{t('budget.category')}</Label>
                    <Select value={formData.category_id || "none"} onValueChange={(v) => setFormData(f => ({ ...f, category_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder={t('budget.select')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('common.none')}</SelectItem>
                        {filteredCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('budget.date')}</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Income Source - Only show for income type */}
                {formData.type === 'income' && (
                  <div className="space-y-2">
                    <Label>{t('budget.incomeSource')}</Label>
                    <Select value={formData.account} onValueChange={(v) => setFormData(f => ({ ...f, account: v }))}>
                      <SelectTrigger><SelectValue placeholder={t('budget.selectSource')} /></SelectTrigger>
                      <SelectContent>
                        {INCOME_SOURCE_KEYS.map(source => (
                          <SelectItem key={source.value} value={source.value}>{t(source.key as any)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('budget.description')}</Label>
                    <Input
                      value={formData.merchant}
                      onChange={(e) => setFormData(f => ({ ...f, merchant: e.target.value }))}
                      placeholder={t('budget.whereWhat')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {t('family.familyMember')}
                    </Label>
                    <Select value={formData.family_member_id || "none"} onValueChange={(v) => setFormData(f => ({ ...f, family_member_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder={t('common.optional')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('common.none')}</SelectItem>
                        {familyMembers.map(member => (
                          <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button type="submit">{editingTransaction ? t('common.save') : t('common.add')}</Button>
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

      {/* Monthly Spending Trend Chart */}
      {allTransactions.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="Income"
                    stroke="#22c55e" 
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#22c55e' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expense" 
                    name="Expense"
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#ef4444' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Breakdown Pie Chart */}
      {pieChartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Expense Breakdown - {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="h-[250px] w-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {pieChartData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ৳{entry.value.toLocaleString()} ({totalPieValue > 0 ? Math.round((entry.value / totalPieValue) * 100) : 0}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
