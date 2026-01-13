import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { PieChartIcon } from 'lucide-react';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)', // green - completed
  'hsl(47, 96%, 53%)',  // yellow - in progress
  'hsl(199, 89%, 48%)', // sky - pending
  'hsl(346, 77%, 50%)', // rose - overdue
];

interface TaskData {
  name: string;
  value: number;
  color: string;
}

export function TasksBreakdownChart() {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user, mode]);

  const loadData = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from('tasks')
      .select('status, priority, due_date')
      .eq('user_id', user?.id)
      .eq('task_type', mode);

    setTasks(data || []);
    setLoading(false);
  };

  const chartData = useMemo(() => {
    const now = new Date();
    const statusCounts = {
      completed: 0,
      in_progress: 0,
      pending: 0,
      overdue: 0,
    };
    
    tasks.forEach(t => {
      if (t.status === 'completed') {
        statusCounts.completed++;
      } else if (t.due_date && new Date(t.due_date) < now) {
        statusCounts.overdue++;
      } else if (t.status === 'in_progress') {
        statusCounts.in_progress++;
      } else {
        statusCounts.pending++;
      }
    });

    const data: TaskData[] = [
      { name: 'Completed', value: statusCounts.completed, color: COLORS[1] },
      { name: 'In Progress', value: statusCounts.in_progress, color: COLORS[2] },
      { name: 'Pending', value: statusCounts.pending, color: COLORS[3] },
      { name: 'Overdue', value: statusCounts.overdue, color: COLORS[4] },
    ].filter(d => d.value > 0);

    return data;
  }, [tasks]);

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

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" /> Tasks Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No tasks found</p>
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
