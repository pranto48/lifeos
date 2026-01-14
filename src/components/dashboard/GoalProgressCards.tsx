import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Target } from 'lucide-react';
import { format } from 'date-fns';

interface Goal {
  id: string;
  title: string;
  target_amount: number | null;
  current_amount: number | null;
  target_date: string | null;
  category: string | null;
}

export function GoalProgressCards() {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadGoals();
  }, [user, mode]);

  const loadGoals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('goals')
      .select('id, title, target_amount, current_amount, target_date, category')
      .eq('user_id', user?.id)
      .in('status', ['active', 'in_progress'])
      .eq('goal_type', mode)
      .order('created_at', { ascending: false })
      .limit(4);

    setGoals(data || []);
    setLoading(false);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-primary';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Target className="h-4 w-4" /> Goal Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : goals.length === 0 ? (
          <div className="h-40 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No active goals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map(goal => {
              const target = goal.target_amount || 0;
              const current = goal.current_amount || 0;
              const hasFinancialTarget = target > 0;
              const progress = hasFinancialTarget ? Math.min(100, Math.round((current / target) * 100)) : 0;

              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {hasFinancialTarget ? (
                          <span>৳{current.toLocaleString()} / ৳{target.toLocaleString()}</span>
                        ) : (
                          <span>{goal.category || 'Goal'}</span>
                        )}
                        {goal.target_date && (
                          <>
                            <span>•</span>
                            <span>{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {hasFinancialTarget && (
                      <span className={`text-sm font-bold ${progress >= 100 ? 'text-green-500' : progress >= 70 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {progress}%
                      </span>
                    )}
                  </div>
                  {hasFinancialTarget && (
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
