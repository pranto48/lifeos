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

interface QuickAddGoalProps {
  onClose: () => void;
}

const categories = [
  { value: 'family', label: 'Family' },
  { value: 'career', label: 'Career' },
  { value: 'finance', label: 'Finance' },
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
  { value: 'personal', label: 'Personal' },
];

export function QuickAddGoal({ onClose }: QuickAddGoalProps) {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('personal');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        target_amount: targetAmount ? parseFloat(targetAmount) : null,
        target_date: targetDate || null,
        status: 'active',
        goal_type: mode,
      });

      if (error) throw error;

      toast({
        title: 'Goal created',
        description: 'Your goal has been set!',
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
        <Label htmlFor="goal-title">Goal Title</Label>
        <Input
          id="goal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to achieve?"
          className="bg-muted/50 border-border"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-description">Description (optional)</Label>
        <Textarea
          id="goal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your goal..."
          className="bg-muted/50 border-border resize-none h-20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-target">Target Amount (৳)</Label>
          <Input
            id="goal-target"
            type="number"
            step="0.01"
            min="0"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="Optional"
            className="bg-muted/50 border-border font-mono"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="goal-date">Target Date</Label>
        <Input
          id="goal-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="bg-muted/50 border-border"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Goal
        </Button>
      </div>
    </form>
  );
}
