import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subDays, parseISO } from 'date-fns';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: string;
  target_per_day: number;
  is_archived: boolean;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  notes: string | null;
  created_at: string;
}

export interface HabitWithStats extends Habit {
  completions: HabitCompletion[];
  streak: number;
  completedToday: boolean;
  totalCompletions: number;
}

export function useHabits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const habitsQuery = useQuery({
    queryKey: ['habits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Habit[];
    },
    enabled: !!user?.id,
  });

  const completionsQuery = useQuery({
    queryKey: ['habit_completions', user?.id],
    queryFn: async () => {
      // Get completions from the last 90 days for streak calculation
      const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .gte('completed_at', startDate)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data as HabitCompletion[];
    },
    enabled: !!user?.id,
  });

  const calculateStreak = (habitId: string, completions: HabitCompletion[]): number => {
    const habitCompletions = completions
      .filter(c => c.habit_id === habitId)
      .map(c => c.completed_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (habitCompletions.length === 0) return 0;

    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Check if completed today or yesterday to start counting
    if (habitCompletions[0] !== today && habitCompletions[0] !== yesterday) {
      return 0;
    }

    let expectedDate = habitCompletions[0];
    
    for (const completionDate of habitCompletions) {
      if (completionDate === expectedDate) {
        streak++;
        expectedDate = format(subDays(parseISO(expectedDate), 1), 'yyyy-MM-dd');
      } else if (completionDate < expectedDate) {
        break;
      }
    }

    return streak;
  };

  const habitsWithStats: HabitWithStats[] = (habitsQuery.data || []).map(habit => {
    const completions = (completionsQuery.data || []).filter(c => c.habit_id === habit.id);
    const today = format(new Date(), 'yyyy-MM-dd');
    const completedToday = completions.some(c => c.completed_at === today);
    
    return {
      ...habit,
      completions,
      streak: calculateStreak(habit.id, completionsQuery.data || []),
      completedToday,
      totalCompletions: completions.length,
    };
  });

  const createHabit = useMutation({
    mutationFn: async (habit: Partial<Habit>) => {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user!.id,
          title: habit.title!,
          description: habit.description,
          icon: habit.icon || 'CheckCircle',
          color: habit.color || '#22c55e',
          frequency: habit.frequency || 'daily',
          target_per_day: habit.target_per_day || 1,
          reminder_enabled: habit.reminder_enabled || false,
          reminder_time: habit.reminder_time || '08:00:00',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit created!');
    },
    onError: (error) => {
      toast.error('Failed to create habit');
      console.error(error);
    },
  });

  const updateHabit = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Habit> & { id: string }) => {
      const { data, error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      toast.success('Habit updated!');
    },
    onError: (error) => {
      toast.error('Failed to update habit');
      console.error(error);
    },
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit_completions'] });
      toast.success('Habit deleted!');
    },
    onError: (error) => {
      toast.error('Failed to delete habit');
      console.error(error);
    },
  });

  const toggleCompletion = useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date?: string }) => {
      const completionDate = date || format(new Date(), 'yyyy-MM-dd');
      
      // Check if already completed
      const existing = (completionsQuery.data || []).find(
        c => c.habit_id === habitId && c.completed_at === completionDate
      );

      if (existing) {
        // Remove completion
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add completion
        const { error } = await supabase
          .from('habit_completions')
          .insert({
            habit_id: habitId,
            user_id: user!.id,
            completed_at: completionDate,
          });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['habit_completions'] });
      if (result.action === 'added') {
        toast.success('Habit completed! 🎉');
      }
    },
    onError: (error) => {
      toast.error('Failed to update completion');
      console.error(error);
    },
  });

  return {
    habits: habitsWithStats,
    isLoading: habitsQuery.isLoading || completionsQuery.isLoading,
    createHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
  };
}
