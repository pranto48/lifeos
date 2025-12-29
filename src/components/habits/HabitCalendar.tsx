import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HabitWithStats } from '@/hooks/useHabits';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitCalendarProps {
  habits: HabitWithStats[];
  onToggleCompletion: (habitId: string, date: string) => void;
}

export function HabitCalendar({ habits, onToggleCompletion }: HabitCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedHabit, setSelectedHabit] = useState<string | null>(habits[0]?.id || null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const selectedHabitData = habits.find(h => h.id === selectedHabit);
  
  // Get completions for selected habit
  const completionDates = new Set(
    selectedHabitData?.completions.map(c => c.completed_at) || []
  );

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const startDay = monthStart.getDay();

  // Calculate stats for the month
  const monthCompletions = selectedHabitData?.completions.filter(c => {
    const date = new Date(c.completed_at);
    return isSameMonth(date, currentMonth);
  }).length || 0;

  const daysInMonth = days.length;
  const completionRate = daysInMonth > 0 ? Math.round((monthCompletions / daysInMonth) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Habit Selector */}
      {habits.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {habits.map(habit => (
            <button
              key={habit.id}
              onClick={() => setSelectedHabit(habit.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                selectedHabit === habit.id
                  ? 'text-white shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
              style={{
                backgroundColor: selectedHabit === habit.id ? habit.color : undefined,
              }}
            >
              {habit.title}
            </button>
          ))}
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h3 className="text-lg font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={isSameMonth(currentMonth, new Date())}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{monthCompletions} days completed</span>
        <span>•</span>
        <span>{completionRate}% completion rate</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
        
        {/* Empty cells for days before month start */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Day cells */}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCompleted = completionDates.has(dateStr);
          const isToday = isSameDay(day, new Date());
          const isFuture = day > new Date();
          
          return (
            <motion.button
              key={dateStr}
              whileHover={{ scale: isFuture ? 1 : 1.1 }}
              whileTap={{ scale: isFuture ? 1 : 0.95 }}
              onClick={() => !isFuture && selectedHabit && onToggleCompletion(selectedHabit, dateStr)}
              disabled={isFuture}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all relative',
                isCompleted && 'text-white',
                !isCompleted && !isFuture && 'hover:bg-muted',
                !isCompleted && isFuture && 'text-muted-foreground/40 cursor-not-allowed',
                !isCompleted && !isFuture && 'text-foreground',
                isToday && !isCompleted && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              )}
              style={{
                backgroundColor: isCompleted ? selectedHabitData?.color : undefined,
              }}
            >
              {format(day, 'd')}
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: selectedHabitData?.color }}
                />
              )}
              <span className="relative z-10">{format(day, 'd')}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div 
            className="w-3 h-3 rounded" 
            style={{ backgroundColor: selectedHabitData?.color || '#22c55e' }}
          />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded ring-2 ring-primary" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
