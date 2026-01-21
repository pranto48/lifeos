import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, FolderOpen } from 'lucide-react';
import { useTaskCategories, TaskCategory } from '@/hooks/useTaskCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899',
  '#14b8a6', '#ef4444', '#eab308', '#06b6d4', '#6366f1',
  '#f43f5e', '#84cc16', '#a855f7', '#0ea5e9', '#10b981',
];

const PRESET_ICONS = [
  'Folder', 'Briefcase', 'User', 'Users', 'Search', 'Calendar',
  'CheckCircle', 'Star', 'Heart', 'Zap', 'Code', 'FileText',
  'Clock', 'Target', 'Flag', 'Tag', 'Bookmark', 'Archive',
];

interface CategoryFormProps {
  onSubmit: (name: string, color: string, icon: string) => void;
  onCancel: () => void;
  initialName?: string;
  initialColor?: string;
  initialIcon?: string;
  submitLabel: string;
}

function CategoryForm({ onSubmit, onCancel, initialName = '', initialColor = '#3b82f6', initialIcon = 'Folder', submitLabel }: CategoryFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);
  const [icon, setIcon] = useState(initialIcon);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Category name is required');
      return;
    }
    onSubmit(name.trim(), color, icon);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Category Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Development, Marketing..."
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Label className="text-sm text-muted-foreground">Custom:</Label>
          <Input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-8 p-0 border-0 cursor-pointer"
          />
          <Input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-24 font-mono text-sm"
            placeholder="#000000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              className={`px-2 py-1 rounded text-xs border transition-all ${icon === i ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
              onClick={() => setIcon(i)}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

export function TaskCategoryManager() {
  const { categories, loading, isAdmin, addCategory, updateCategory, deleteCategory, canEditCategory } = useTaskCategories();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);

  const handleAddCategory = async (name: string, color: string, icon: string) => {
    const result = await addCategory(name, color, icon);
    if (result) {
      toast.success('Category created');
      setIsAddDialogOpen(false);
    } else {
      toast.error('Failed to create category');
    }
  };

  const handleUpdateCategory = async (name: string, color: string, icon: string) => {
    if (!editingCategory) return;
    const result = await updateCategory(editingCategory.id, { name, color, icon });
    if (result) {
      toast.success('Category updated');
      setEditingCategory(null);
    } else {
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Tasks with this category will keep their data but won't show a category.`)) return;
    const result = await deleteCategory(id);
    if (result) {
      toast.success('Category deleted');
    } else {
      toast.error('Failed to delete category');
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Task Categories
        </CardTitle>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <CategoryForm
                onSubmit={handleAddCategory}
                onCancel={() => setIsAddDialogOpen(false)}
                submitLabel="Create Category"
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No categories yet. Create one to organize your tasks.
          </p>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium text-foreground">{category.name}</span>
                  <span className="text-xs text-muted-foreground">({category.icon || 'Folder'})</span>
                  {category.is_admin_category && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Admin</span>
                  )}
                </div>
                {canEditCategory(category) && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingCategory(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              onSubmit={handleUpdateCategory}
              onCancel={() => setEditingCategory(null)}
              initialName={editingCategory.name}
              initialColor={editingCategory.color}
              initialIcon={editingCategory.icon || 'Folder'}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
