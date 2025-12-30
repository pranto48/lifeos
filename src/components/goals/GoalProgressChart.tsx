import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Goal {
  id: string;
  title: string;
  category: string | null;
  target_amount: number | null;
  current_amount: number | null;
  created_at?: string;
}

interface GoalProgressChartProps {
  goals: Goal[];
}

export default function GoalProgressChart({ goals }: GoalProgressChartProps) {
  const { t } = useLanguage();

  const chartData = useMemo(() => {
    // Filter only financial goals (those with target_amount)
    const financialGoals = goals.filter(g => g.target_amount && g.target_amount > 0);
    
    if (financialGoals.length === 0) return [];

    // Group by category and calculate progress
    const categoryProgress: Record<string, { target: number; current: number; count: number }> = {};
    
    financialGoals.forEach(goal => {
      const category = goal.category || 'personal';
      if (!categoryProgress[category]) {
        categoryProgress[category] = { target: 0, current: 0, count: 0 };
      }
      categoryProgress[category].target += Number(goal.target_amount) || 0;
      categoryProgress[category].current += Number(goal.current_amount) || 0;
      categoryProgress[category].count += 1;
    });

    return Object.entries(categoryProgress).map(([category, data]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      target: data.target,
      current: data.current,
      progress: data.target > 0 ? Math.round((data.current / data.target) * 100) : 0,
      goals: data.count,
    }));
  }, [goals]);

  const totalProgress = useMemo(() => {
    const financialGoals = goals.filter(g => g.target_amount && g.target_amount > 0);
    const totalTarget = financialGoals.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0);
    const totalCurrent = financialGoals.reduce((sum, g) => sum + (Number(g.current_amount) || 0), 0);
    return {
      target: totalTarget,
      current: totalCurrent,
      percentage: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0,
    };
  }, [goals]);

  if (chartData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t('goals.financialProgress')}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('goals.noFinancialGoals')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t('goals.financialProgress')}
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t('goals.overallProgress')}</p>
            <p className="text-lg font-bold text-primary">{totalProgress.percentage}%</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          ৳{totalProgress.current.toLocaleString()} / ৳{totalProgress.target.toLocaleString()}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="category" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number, name: string) => [
                  `৳${value.toLocaleString()}`,
                  name === 'target' ? t('goals.targetAmount') : t('goals.currentAmount')
                ]}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area 
                type="monotone" 
                dataKey="target" 
                stroke="hsl(var(--muted-foreground))" 
                fillOpacity={1} 
                fill="url(#colorTarget)" 
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Area 
                type="monotone" 
                dataKey="current" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorCurrent)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Category breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          {chartData.map((item) => (
            <div key={item.category} className="p-2 rounded-md bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">{item.category}</p>
              <p className="text-sm font-semibold text-primary">{item.progress}%</p>
              <p className="text-xs text-muted-foreground">{item.goals} {item.goals === 1 ? 'goal' : 'goals'}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
