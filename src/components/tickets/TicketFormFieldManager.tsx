import { useState } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, GripVertical, X } from 'lucide-react';
import type { TicketFormField } from '@/hooks/useTickets';

const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];

export function TicketFormFieldManager() {
  const { formFields, categories, addFormField, updateFormField, deleteFormField } = useTickets();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<TicketFormField | null>(null);
  const [formData, setFormData] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    category_id: '' as string | null,
    is_required: false,
    is_active: true,
    placeholder: '',
    default_value: '',
    field_options: [] as { label: string; value: string }[],
  });
  const [newOption, setNewOption] = useState({ label: '', value: '' });

  const resetForm = () => {
    setFormData({
      field_name: '',
      field_label: '',
      field_type: 'text',
      category_id: null,
      is_required: false,
      is_active: true,
      placeholder: '',
      default_value: '',
      field_options: [],
    });
    setEditingField(null);
    setNewOption({ label: '', value: '' });
  };

  const openEdit = (field: TicketFormField) => {
    setEditingField(field);
    setFormData({
      field_name: field.field_name,
      field_label: field.field_label,
      field_type: field.field_type,
      category_id: field.category_id,
      is_required: field.is_required,
      is_active: field.is_active,
      placeholder: field.placeholder || '',
      default_value: field.default_value || '',
      field_options: field.field_options || [],
    });
    setDialogOpen(true);
  };

  const handleAddOption = () => {
    if (!newOption.label || !newOption.value) return;
    setFormData(prev => ({
      ...prev,
      field_options: [...prev.field_options, { ...newOption }],
    }));
    setNewOption({ label: '', value: '' });
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      field_options: prev.field_options.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Generate field_name from label if not provided
    const fieldName = formData.field_name || formData.field_label.toLowerCase().replace(/\s+/g, '_');

    const dataToSubmit = {
      ...formData,
      field_name: fieldName,
      category_id: formData.category_id || null,
      field_options: formData.field_type === 'select' ? formData.field_options : null,
    };

    try {
      if (editingField) {
        await updateFormField(editingField.id, dataToSubmit);
        toast({ title: 'Field Updated' });
      } else {
        await addFormField(dataToSubmit);
        toast({ title: 'Field Created' });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    try {
      await deleteFormField(id);
      toast({ title: 'Field Deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Group fields by category
  const globalFields = formFields.filter(f => !f.category_id);
  const categoryFields = categories.map(cat => ({
    category: cat,
    fields: formFields.filter(f => f.category_id === cat.id),
  })).filter(g => g.fields.length > 0);

  const renderField = (field: TicketFormField, index: number) => (
    <motion.div
      key={field.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${!field.is_active ? 'opacity-50' : ''}`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{field.field_label}</p>
          <Badge variant="outline">{fieldTypes.find(t => t.value === field.field_type)?.label}</Badge>
          {field.is_required && <Badge variant="secondary">Required</Badge>}
        </div>
        <p className="text-sm text-muted-foreground font-mono">{field.field_name}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => openEdit(field)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(field.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custom Form Fields</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingField ? 'Edit Field' : 'Add Field'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Field Label</Label>
                  <Input
                    value={formData.field_label}
                    onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))}
                    placeholder="e.g., Department"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Field Name (optional)</Label>
                  <Input
                    value={formData.field_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                    placeholder="Auto-generated from label"
                  />
                  <p className="text-xs text-muted-foreground">Used internally. Leave blank to auto-generate.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Field Type</Label>
                    <Select
                      value={formData.field_type}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, field_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category (Optional)</Label>
                    <Select
                      value={formData.category_id || 'all'}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v === 'all' ? null : v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Placeholder</Label>
                  <Input
                    value={formData.placeholder}
                    onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                    placeholder="Placeholder text"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Value</Label>
                  <Input
                    value={formData.default_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, default_value: e.target.value }))}
                    placeholder="Default value"
                  />
                </div>

                {/* Options for select fields */}
                {formData.field_type === 'select' && (
                  <div className="space-y-2">
                    <Label>Dropdown Options</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newOption.label}
                        onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Label"
                        className="flex-1"
                      />
                      <Input
                        value={newOption.value}
                        onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={handleAddOption}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.field_options.map((opt, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {opt.label}
                          <button type="button" onClick={() => handleRemoveOption(i)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_required}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_required: checked }))}
                    />
                    <Label>Required</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Active</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingField ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {formFields.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No custom fields yet</p>
          ) : (
            <div className="space-y-6">
              {/* Global fields */}
              {globalFields.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Global Fields (All Categories)</h3>
                  <div className="space-y-2">
                    {globalFields.map((field, index) => renderField(field, index))}
                  </div>
                </div>
              )}

              {/* Category-specific fields */}
              {categoryFields.map(({ category, fields }) => (
                <div key={category.id}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    {category.name} Only
                  </h3>
                  <div className="space-y-2">
                    {fields.map((field, index) => renderField(field, index))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
