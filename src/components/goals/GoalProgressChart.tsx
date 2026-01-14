import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
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

const COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 90%, 56%)',
  'hsl(142, 76%, 36%)',
  'hsl(45, 93%, 47%)',
  'hsl(280, 65%, 60%)',
  'hsl(340, 82%, 52%)',
];

export default function GoalProgressChart({ goals }: GoalProgressChartProps) {
  const { t } = useLanguage();

  const chartData = useMemo(() => {
    const financialGoals = goals.filter(g => g.target_amount && g.target_amount > 0);
    
    if (financialGoals.length === 0) return [];

    return financialGoals.slice(0, 6).map((goal, index) => {
      const target = Number(goal.target_amount) || 0;
      const current = Number(goal.current_amount) || 0;
      const progress = target > 0 ? Math.round((current / target) * 100) : 0;
      
      return {
        name: goal.title.length > 12 ? goal.title.substring(0, 12) + '...' : goal.title,
        fullName: goal.title,
        target,
        current,
        progress,
        remaining: Math.max(0, target - current),
        category: goal.category || 'General',
        colorIndex: index,
      };
    });
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground text-sm mb-1">{data.fullName}</p>
          <p className="text-xs text-muted-foreground mb-2">{data.category}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-mono text-foreground">৳{data.current.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-mono text-foreground">৳{data.target.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-1 mt-1">
              <span className="text-muted-foreground">Progress:</span>
              <span className={`font-bold ${data.progress >= 100 ? 'text-green-500' : data.progress >= 70 ? 'text-primary' : 'text-orange-500'}`}>
                {data.progress}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
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
      <CardContent className="pt-2">
        {/* 3D-style Bar Chart */}
        <div className="h-[220px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              barCategoryGap="20%"
            >
              <defs>
                {COLORS.map((color, index) => (
                  <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="50%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                  </linearGradient>
                ))}
                {/* 3D shadow effect */}
                <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.3"/>
                </filter>
              </defs>
              <XAxis 
                type="number" 
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
              <Bar 
                dataKey="progress" 
                radius={[0, 8, 8, 0]}
                filter="url(#shadow3d)"
                style={{ 
                  filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))',
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#barGradient-${entry.colorIndex})`}
                    style={{
                      filter: 'brightness(1.05)',
                    }}
                  />
                ))}
                <LabelList 
                  dataKey="progress" 
                  position="right" 
                  formatter={(value: number) => `${value}%`}
                  style={{ 
                    fill: 'hsl(var(--foreground))', 
                    fontSize: 11, 
                    fontWeight: 600 
                  }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Legend Cards - Infographic Style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          {chartData.map((item, index) => (
            <div 
              key={item.fullName} 
              className="relative p-3 rounded-lg overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${COLORS[index]}15 0%, ${COLORS[index]}05 100%)`,
                borderLeft: `3px solid ${COLORS[index]}`
              }}
            >
              {/* 3D effect background shape */}
              <div 
                className="absolute top-0 right-0 w-12 h-12 rounded-full opacity-10"
                style={{ 
                  background: COLORS[index],
                  transform: 'translate(30%, -30%)'
                }}
              />
              <p className="text-xs text-muted-foreground truncate font-medium">{item.fullName}</p>
              <p className="text-lg font-bold" style={{ color: COLORS[index] }}>{item.progress}%</p>
              <p className="text-xs text-muted-foreground">
                ৳{(item.current / 1000).toFixed(1)}k / ৳{(item.target / 1000).toFixed(1)}k
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
