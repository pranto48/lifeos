import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Building2, Briefcase, User } from 'lucide-react';
import { RecurringEventForm } from '@/components/calendar/RecurringEventForm';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import { useSupportData } from '@/hooks/useSupportData';

interface QuickAddTaskProps {
  onClose: () => void;
}

export function QuickAddTask({ onClose }: QuickAddTaskProps) {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const { language } = useLanguage();
  const { categories } = useTaskCategories();
  const { units, departments, supportUsers, getDepartmentsByUnit, getUsersByDepartment } = useSupportData();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  
  // Support user selection (for office tasks)
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedSupportUserId, setSelectedSupportUserId] = useState<string>('');
  
  // Filter departments and users based on selection
  const filteredDepartments = selectedUnitId ? getDepartmentsByUnit(selectedUnitId) : [];
  const filteredUsers = selectedDeptId ? getUsersByDepartment(selectedDeptId).filter(u => u.is_active) : [];

  // Reset dependent selections when parent changes
  useEffect(() => {
    setSelectedDeptId('');
    setSelectedSupportUserId('');
  }, [selectedUnitId]);

  useEffect(() => {
    setSelectedSupportUserId('');
  }, [selectedDeptId]);

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
        support_user_id: mode === 'office' && selectedSupportUserId ? selectedSupportUserId : null,
      });

      if (error) throw error;

      toast({
        title: language === 'bn' ? 'কাজ তৈরি হয়েছে' : 'Task created',
        description: isRecurring 
          ? (language === 'bn' ? `আপনার পুনরাবৃত্তিমূলক কাজ (${recurringPattern}) যোগ করা হয়েছে।` : `Your recurring task (${recurringPattern}) has been added.`)
          : (language === 'bn' ? 'আপনার কাজ সফলভাবে যোগ করা হয়েছে।' : 'Your task has been added successfully.'),
      });
      // Dispatch event to notify Tasks page to refresh
      window.dispatchEvent(new CustomEvent('tasks-updated'));
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
        <Label htmlFor="task-title">{language === 'bn' ? 'শিরোনাম' : 'Title'}</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={language === 'bn' ? 'কী করতে হবে?' : 'What needs to be done?'}
          className="bg-muted/50 border-border"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">{language === 'bn' ? 'বিবরণ (ঐচ্ছিক)' : 'Description (optional)'}</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={language === 'bn' ? 'আরো বিস্তারিত যোগ করুন...' : 'Add more details...'}
          className="bg-muted/50 border-border resize-none h-20"
        />
      </div>

      {/* Support User Selection - Only show for office mode */}
      {mode === 'office' && units.length > 0 && (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
          <Label className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            {language === 'bn' ? 'সাপোর্ট ইউজার (ঐচ্ছিক)' : 'Support User (optional)'}
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Unit Selection */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {language === 'bn' ? 'ইউনিট' : 'Unit'}
              </Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Selection */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {language === 'bn' ? 'বিভাগ' : 'Department'}
              </Label>
              <Select 
                value={selectedDeptId} 
                onValueChange={setSelectedDeptId}
                disabled={!selectedUnitId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Selection */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {language === 'bn' ? 'ইউজার' : 'User'}
              </Label>
              <Select 
                value={selectedSupportUserId} 
                onValueChange={setSelectedSupportUserId}
                disabled={!selectedDeptId}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন' : 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                      {u.designation && <span className="text-muted-foreground ml-1">({u.designation})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{language === 'bn' ? 'অগ্রাধিকার' : 'Priority'}</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{language === 'bn' ? 'নিম্ন' : 'Low'}</SelectItem>
              <SelectItem value="medium">{language === 'bn' ? 'মাঝারি' : 'Medium'}</SelectItem>
              <SelectItem value="high">{language === 'bn' ? 'উচ্চ' : 'High'}</SelectItem>
              <SelectItem value="urgent">{language === 'bn' ? 'জরুরি' : 'Urgent'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{language === 'bn' ? 'বিভাগ' : 'Category'}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="bg-muted/50 border-border">
              <SelectValue placeholder={language === 'bn' ? 'বিভাগ নির্বাচন' : 'Select category'} />
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
        <Label htmlFor="task-due">{language === 'bn' ? 'শেষ তারিখ' : 'Due Date'}</Label>
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
          {language === 'bn' ? 'বাতিল' : 'Cancel'}
        </Button>
        <Button type="submit" disabled={!title.trim() || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {language === 'bn' ? 'কাজ যোগ করুন' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
}
