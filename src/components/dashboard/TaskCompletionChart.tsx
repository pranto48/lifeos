import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, subMonths, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { TrendingUp } from 'lucide-react';

type TimeRange = 'week' | 'month';

export function TaskCompletionChart() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadTasks();
  }, [user, timeRange]);

  const loadTasks = async () => {
    setLoading(true);
    const startDate = timeRange === 'week' 
      ? subDays(new Date(), 7) 
      : subMonths(new Date(), 1);

    const { data } = await supabase
      .from('tasks')
      .select('id, status, completed_at, created_at')
      .eq('user_id', user?.id)
      .gte('created_at', startDate.toISOString());

    setTasks(data || []);
    setLoading(false);
  };

  const chartData = useMemo(() => {
    if (timeRange === 'week') {
      const days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });

      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const completed = tasks.filter(t => 
          t.completed_at && format(new Date(t.completed_at), 'yyyy-MM-dd') === dayStr
        ).length;
        const created = tasks.filter(t => 
          format(new Date(t.created_at), 'yyyy-MM-dd') === dayStr
        ).length;

        return {
          name: format(day, 'EEE'),
          completed,
          created,
        };
      });
    } else {
      const weeks = eachWeekOfInterval({
        start: subMonths(new Date(), 1),
        end: new Date()
      }, { weekStartsOn: 0 });

      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        const completed = tasks.filter(t => {
          if (!t.completed_at) return false;
          const date = new Date(t.completed_at);
          return date >= weekStart && date <= weekEnd;
        }).length;
        const created = tasks.filter(t => {
          const date = new Date(t.created_at);
          return date >= weekStart && date <= weekEnd;
        }).length;

        return {
          name: format(weekStart, 'MMM d'),
          completed,
          created,
        };
      });
    }
  }, [tasks, timeRange]);

  const totalCompleted = tasks.filter(t => t.status === 'completed').length;
  const totalCreated = tasks.length;
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Task Completion Trend
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setTimeRange('week')}
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setTimeRange('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={10}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Created"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Completed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{totalCompleted}</span> of {totalCreated} tasks completed
              </div>
              <div className={`text-sm font-semibold ${completionRate >= 70 ? 'text-green-500' : completionRate >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                {completionRate}% completion rate
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
