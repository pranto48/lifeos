import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { FolderOpen } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface TaskCategory {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  category_id: string | null;
}

export function TaskCategoriesChart() {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user, mode]);

  const loadData = async () => {
    setLoading(true);

    const [tasksRes, categoriesRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, category_id')
        .eq('user_id', user?.id)
        .eq('task_type', mode),
      supabase
        .from('task_categories')
        .select('id, name, color')
        .eq('user_id', user?.id),
    ]);

    setTasks(tasksRes.data || []);
    setCategories(categoriesRes.data || []);
    setLoading(false);
  };

  const chartData = useMemo(() => {
    const categoryCounts: Record<string, { name: string; count: number; color: string }> = {};

    // Initialize with all categories
    categories.forEach(cat => {
      categoryCounts[cat.id] = { name: cat.name, count: 0, color: cat.color };
    });

    // Add uncategorized
    categoryCounts['uncategorized'] = { name: 'Uncategorized', count: 0, color: '#6b7280' };

    // Count tasks per category
    tasks.forEach(task => {
      if (task.category_id && categoryCounts[task.category_id]) {
        categoryCounts[task.category_id].count++;
      } else {
        categoryCounts['uncategorized'].count++;
      }
    });

    // Convert to chart data format, filter out zero counts
    const data: CategoryData[] = Object.values(categoryCounts)
      .filter(c => c.count > 0)
      .map(c => ({
        name: c.name,
        value: c.count,
        color: c.color,
      }));

    return data;
  }, [tasks, categories]);

  const totalTasks = tasks.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalTasks > 0 ? ((data.value / totalTasks) * 100).toFixed(1) : 0;
      return (
        <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-xs text-muted-foreground">
            {data.value} tasks ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label renderer for outside labels
  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs"
      >
        {name} ({value})
      </text>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FolderOpen className="h-4 w-4" /> Tasks by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No categorized tasks found</p>
          </div>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                    label={chartData.length <= 6 ? renderCustomLabel : false}
                    labelLine={chartData.length <= 6}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate text-muted-foreground">{item.name}</span>
                  <span className="font-medium text-foreground ml-auto">
                    {item.value}
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
