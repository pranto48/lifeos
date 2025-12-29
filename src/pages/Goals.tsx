import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const categoryColors: Record<string, string> = { family: 'bg-pink-500/20 text-pink-400', career: 'bg-blue-500/20 text-blue-400', finance: 'bg-green-500/20 text-green-400', health: 'bg-teal-500/20 text-teal-400', learning: 'bg-purple-500/20 text-purple-400', personal: 'bg-orange-500/20 text-orange-400' };

export default function Goals() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadGoals();
  }, [user]);

  const loadGoals = async () => {
    const { data } = await supabase.from('goals').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setGoals(data || []);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t('goals.goalsAndPlans')}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('goals.noGoalsYet')}</p>
            </CardContent>
          </Card>
        ) : (
          goals.map(goal => {
            const progress = goal.target_amount && goal.current_amount ? Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100) : 0;
            return (
              <Card key={goal.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{goal.title}</h3>
                      <Badge className={categoryColors[goal.category] || 'bg-muted text-muted-foreground'}>{goal.category}</Badge>
                    </div>
                    <Badge variant={goal.status === 'completed' ? 'default' : 'secondary'}>{goal.status}</Badge>
                  </div>
                  {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
                  {goal.target_amount && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('goals.progress')}</span>
                        <span className="font-mono text-foreground">৳{Number(goal.current_amount || 0).toLocaleString()} / ৳{Number(goal.target_amount).toLocaleString()}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  {goal.target_date && <p className="text-xs text-muted-foreground">{t('goals.targetDate')}: {format(new Date(goal.target_date), 'MMM d, yyyy')}</p>}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
