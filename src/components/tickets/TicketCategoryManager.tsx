import { useState } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, GripVertical, HardDrive, AppWindow, Wifi, Mail, Printer, UserCog, HelpCircle, Ticket } from 'lucide-react';
import type { TicketCategory } from '@/hooks/useTickets';

const iconOptions = [
  { value: 'Ticket', label: 'Ticket', Icon: Ticket },
  { value: 'HardDrive', label: 'Hardware', Icon: HardDrive },
  { value: 'AppWindow', label: 'Software', Icon: AppWindow },
  { value: 'Wifi', label: 'Network', Icon: Wifi },
  { value: 'Mail', label: 'Email', Icon: Mail },
  { value: 'Printer', label: 'Printer', Icon: Printer },
  { value: 'UserCog', label: 'Account', Icon: UserCog },
  { value: 'HelpCircle', label: 'Help', Icon: HelpCircle },
];

const colorOptions = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#6b7280',
];

export function TicketCategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useTickets();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'Ticket',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'Ticket',
      is_active: true,
    });
    setEditingCategory(null);
  };

  const openEdit = (category: TicketCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon,
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast({ title: 'Category Updated' });
      } else {
        await addCategory(formData);
        toast({ title: 'Category Created' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(id);
      toast({ title: 'Category Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ticket Categories</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map(({ value, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon: value }))}
                      className={`p-2 rounded-lg border-2 transition-colors ${
                        formData.icon === value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No categories yet</p>
          ) : (
            categories.map((category, index) => {
              const IconComponent = iconOptions.find(i => i.value === category.icon)?.Icon || Ticket;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${!category.is_active ? 'opacity-50' : ''}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
