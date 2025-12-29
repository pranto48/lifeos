import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckSquare, FileText, Wallet, Target, 
  Calendar, Clock, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { UpcomingFamilyEvents } from '@/components/dashboard/UpcomingFamilyEvents';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    todayTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    activeGoals: 0,
    recentNotes: [] as any[],
    upcomingTasks: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    const [tasksRes, notesRes, transactionsRes, goalsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user?.id),
      supabase.from('notes').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(3),
      supabase.from('transactions').select('*').eq('user_id', user?.id).gte('date', startOfMonth.split('T')[0]),
      supabase.from('goals').select('*').eq('user_id', user?.id).eq('status', 'active'),
    ]);

    const tasks = tasksRes.data || [];
    const todayTasks = tasks.filter(t => t.due_date?.split('T')[0] === today && t.status !== 'completed').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date < new Date().toISOString() && t.status !== 'completed').length;
    const upcomingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5);

    const transactions = transactionsRes.data || [];
    const monthlyIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const monthlyExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      todayTasks,
      completedTasks,
      overdueTasks,
      monthlyIncome,
      monthlyExpense,
      activeGoals: goalsRes.data?.length || 0,
      recentNotes: notesRes.data || [],
      upcomingTasks,
    });
    setLoading(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.goodMorning');
    if (hour < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };

  const statCards = [
    { title: t('dashboard.todayTasks'), value: stats.todayTasks, icon: CheckSquare, color: 'text-blue-400' },
    { title: t('dashboard.overdue'), value: stats.overdueTasks, icon: Clock, color: 'text-red-400' },
    { title: t('dashboard.activeGoals'), value: stats.activeGoals, icon: Target, color: 'text-yellow-400' },
    { title: t('dashboard.completed'), value: stats.completedTasks, icon: CheckSquare, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || t('dashboard.there')}
          </h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="font-mono text-2xl font-bold text-foreground">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Budget Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> {t('dashboard.thisMonthBudget')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-400" />
                <span className="text-sm text-muted-foreground">{t('budget.income')}</span>
              </div>
              <span className="font-mono font-semibold text-green-400">৳{stats.monthlyIncome.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-red-400" />
                <span className="text-sm text-muted-foreground">{t('budget.expenses')}</span>
              </div>
              <span className="font-mono font-semibold text-red-400">৳{stats.monthlyExpense.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('budget.balance')}</span>
                <span className={`font-mono font-bold ${stats.monthlyIncome - stats.monthlyExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ৳{(stats.monthlyIncome - stats.monthlyExpense).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> {t('dashboard.recentNotes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noNotesYet')}</p>
            ) : (
              <div className="space-y-2">
                {stats.recentNotes.map(note => (
                  <div key={note.id} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium text-foreground truncate">{note.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'MMM d')}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Upcoming Tasks + Family Events */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" /> {t('dashboard.upcomingTasks')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noTasksYet')}</p>
            ) : (
              <div className="space-y-2">
                {stats.upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-500' :
                        task.priority === 'high' ? 'bg-orange-500' :
                        task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                      <span className="text-sm text-foreground">{task.title}</span>
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">{format(new Date(task.due_date), 'MMM d')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <UpcomingFamilyEvents />
      </div>
    </div>
  );
}
