import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PieChartIcon } from 'lucide-react';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(346, 77%, 50%)', // rose
  'hsl(24, 95%, 53%)',  // orange
  'hsl(47, 96%, 53%)',  // yellow
  'hsl(142, 71%, 45%)', // green
  'hsl(199, 89%, 48%)', // sky
  'hsl(271, 81%, 56%)', // purple
  'hsl(330, 81%, 60%)', // pink
];

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function ExpenseBreakdownChart() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    const [transRes, catRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('user_id', user?.id)
        .eq('type', 'expense')
        .gte('date', startOfMonth),
      supabase
        .from('budget_categories')
        .select('id, name, color')
        .eq('user_id', user?.id)
        .eq('is_income', false)
    ]);

    setTransactions(transRes.data || []);
    setCategories(catRes.data || []);
    setLoading(false);
  };

  const chartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    transactions.forEach(t => {
      const catId = t.category_id || 'uncategorized';
      categoryTotals[catId] = (categoryTotals[catId] || 0) + Number(t.amount);
    });

    const data: CategoryData[] = [];
    let colorIndex = 0;

    Object.entries(categoryTotals).forEach(([catId, total]) => {
      const category = categories.find(c => c.id === catId);
      data.push({
        name: category?.name || 'Other',
        value: total,
        color: category?.color || COLORS[colorIndex % COLORS.length],
      });
      colorIndex++;
    });

    return data.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [transactions, categories]);

  const totalExpense = chartData.reduce((sum, d) => sum + d.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalExpense) * 100).toFixed(1);
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-xs text-muted-foreground">
            ৳{data.value.toLocaleString()} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" /> Expense Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No expenses this month</p>
          </div>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {chartData.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate text-muted-foreground">{item.name}</span>
                  <span className="font-medium text-foreground ml-auto">
                    ৳{(item.value / 1000).toFixed(1)}k
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
