import { useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, Pencil, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

interface TaskChecklistProps {
  taskId: string;
  items: ChecklistItem[];
  onUpdate: () => void;
}

export function TaskChecklist({ taskId, items, onUpdate }: TaskChecklistProps) {
  const { user } = useAuth();
  const [newItem, setNewItem] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = async () => {
    if (!newItem.trim() || !user) return;

    setIsAdding(true);
    const { error } = await supabase.from('task_checklists').insert({
      task_id: taskId,
      user_id: user.id,
      title: newItem.trim(),
      sort_order: items.length,
    });

    if (error) {
      toast.error('Failed to add checklist item');
    } else {
      setNewItem('');
      onUpdate();
    }
    setIsAdding(false);
  };

  const handleToggle = async (item: ChecklistItem) => {
    const { error } = await supabase
      .from('task_checklists')
      .update({ is_completed: !item.is_completed })
      .eq('id', item.id);

    if (!error) onUpdate();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('task_checklists').delete().eq('id', id);
    if (!error) {
      onUpdate();
    } else {
      toast.error('Failed to delete item');
    }
  };

  const startEditing = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingTitle.trim()) return;

    const { error } = await supabase
      .from('task_checklists')
      .update({ title: editingTitle.trim() })
      .eq('id', id);

    if (!error) {
      setEditingId(null);
      setEditingTitle('');
      onUpdate();
    } else {
      toast.error('Failed to update item');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const completedCount = items.filter(i => i.is_completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Subtasks</span>
          <span className="font-mono">{completedCount}/{items.length} ({progress}%)</span>
        </div>
      )}

      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 group py-1 px-2 rounded hover:bg-muted/50 transition-colors"
          >
            <button
              onClick={() => handleToggle(item)}
              className="flex-shrink-0"
            >
              {item.is_completed ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>

            {editingId === item.id ? (
              <div className="flex-1 flex items-center gap-1">
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="h-6 text-sm py-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(item.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleSaveEdit(item.id)}
                >
                  <Check className="h-3 w-3 text-primary" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={cancelEdit}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <span
                  className={`text-sm flex-1 ${
                    item.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {item.title}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => startEditing(item)}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add subtask..."
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddItem();
            }
          }}
          disabled={isAdding}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={handleAddItem}
          disabled={!newItem.trim() || isAdding}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
