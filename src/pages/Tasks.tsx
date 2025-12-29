import { useState, useEffect } from 'react';
import { Plus, CheckSquare, Clock, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Tasks() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setTasks(data || []);
  };

  const toggleTask = async (id: string, completed: boolean) => {
    await supabase.from('tasks').update({ 
      status: completed ? 'completed' : 'todo',
      completed_at: completed ? new Date().toISOString() : null 
    }).eq('id', id);
    loadTasks();
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'active') return t.status !== 'completed';
    return true;
  });

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };

  const filterLabels: Record<string, string> = {
    all: t('common.all'),
    active: t('tasks.active'),
    completed: t('tasks.completed'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('tasks.title')}</h1>
        <div className="flex gap-2">
          {['all', 'active', 'completed'].map(f => (
            <Button key={f} variant={filter === f ? 'default' : 'ghost'} size="sm" onClick={() => setFilter(f)}>
              {filterLabels[f]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('tasks.noTasksYet')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map(task => (
            <Card key={task.id} className="bg-card border-border hover:bg-muted/30 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox checked={task.status === 'completed'} onCheckedChange={(c) => toggleTask(task.id, !!c)} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</p>
                  {task.description && <p className="text-sm text-muted-foreground truncate">{task.description}</p>}
                </div>
                <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                {task.due_date && <span className="text-xs text-muted-foreground">{format(new Date(task.due_date), 'MMM d')}</span>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
