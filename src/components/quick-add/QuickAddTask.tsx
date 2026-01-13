import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Loader2 } from 'lucide-react';
import { RecurringEventForm } from '@/components/calendar/RecurringEventForm';
import { useTaskCategories } from '@/hooks/useTaskCategories';

interface QuickAddTaskProps {
  onClose: () => void;
}

export function QuickAddTask({ onClose }: QuickAddTaskProps) {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const { categories } = useTaskCategories();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category_id: categoryId || null,
        due_date: dueDate || null,
        status: 'todo',
        task_type: mode,
        is_recurring: isRecurring,
        recurring_pattern: isRecurring ? recurringPattern : null,
      });

      if (error) throw error;

      toast({
        title: 'Task created',
        description: isRecurring 
          ? `Your recurring task (${recurringPattern}) has been added.`
          : 'Your task has been added successfully.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="bg-muted/50 border-border"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description (optional)</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details..."
          className="bg-muted/50 border-border resize-none h-20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-due">Due Date</Label>
        <Input
          id="task-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-muted/50 border-border"
        />
      </div>

      <RecurringEventForm
        isRecurring={isRecurring}
        onIsRecurringChange={setIsRecurring}
        recurringPattern={recurringPattern}
        onRecurringPatternChange={setRecurringPattern}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Task
        </Button>
      </div>
    </form>
  );
}
