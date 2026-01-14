import { useState } from 'react';
import { FolderOpen, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TaskCategory } from '@/hooks/useTaskCategories';

interface BulkCategoryAssignProps {
  selectedTaskIds: string[];
  categories: TaskCategory[];
  onComplete: () => void;
  onCancel: () => void;
}

export function BulkCategoryAssign({ selectedTaskIds, categories, onComplete, onCancel }: BulkCategoryAssignProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (selectedTaskIds.length === 0) {
      toast.error('No tasks selected');
      return;
    }

    setAssigning(true);
    try {
      const categoryId = selectedCategory === 'none' ? null : selectedCategory;
      
      const { error } = await supabase
        .from('tasks')
        .update({ category_id: categoryId })
        .in('id', selectedTaskIds);

      if (error) throw error;

      toast.success(`Category assigned to ${selectedTaskIds.length} task(s)`);
      onComplete();
    } catch (error: any) {
      toast.error('Failed to assign category');
      console.error(error);
    } finally {
      setAssigning(false);
    }
  };

  const selectedCat = categories.find(c => c.id === selectedCategory);

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Check className="h-3 w-3" />
          {selectedTaskIds.length} selected
        </Badge>
      </div>
      
      <div className="flex-1 flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Remove category</span>
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleAssign}
          disabled={assigning || !selectedCategory}
        >
          {assigning ? 'Assigning...' : 'Apply'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
