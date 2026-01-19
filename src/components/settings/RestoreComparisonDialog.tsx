import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Loader2, ArrowRight, Check, Minus, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface RestoreComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupData: any;
  onRestore: (selectedTypes: string[]) => void;
  restoring: boolean;
}

interface DataComparison {
  type: string;
  label: string;
  labelBn: string;
  current: number;
  backup: number;
  change: 'add' | 'remove' | 'replace' | 'same';
}

const DATA_TYPES = [
  { key: 'tasks', label: 'Tasks', labelBn: 'কাজ', icon: '📋' },
  { key: 'notes', label: 'Notes', labelBn: 'নোট', icon: '📝' },
  { key: 'goals', label: 'Goals', labelBn: 'গোল', icon: '🎯' },
  { key: 'projects', label: 'Projects', labelBn: 'প্রজেক্ট', icon: '📁' },
  { key: 'transactions', label: 'Transactions', labelBn: 'লেনদেন', icon: '💰' },
  { key: 'habits', label: 'Habits', labelBn: 'অভ্যাস', icon: '✅' },
  { key: 'investments', label: 'Investments', labelBn: 'বিনিয়োগ', icon: '📈' },
  { key: 'salaries', label: 'Salary Entries', labelBn: 'বেতন', icon: '💵' },
  { key: 'family', label: 'Family Members', labelBn: 'পরিবার', icon: '👨‍👩‍👧‍👦' },
  { key: 'familyEvents', label: 'Family Events', labelBn: 'পারিবারিক ইভেন্ট', icon: '🎂' },
  { key: 'budgets', label: 'Budgets', labelBn: 'বাজেট', icon: '📊' },
  { key: 'budgetCategories', label: 'Budget Categories', labelBn: 'বাজেট ক্যাটাগরি', icon: '🏷️' },
  { key: 'taskCategories', label: 'Task Categories', labelBn: 'কাজের ক্যাটাগরি', icon: '📂' },
  { key: 'habitCompletions', label: 'Habit Completions', labelBn: 'অভ্যাস সম্পন্ন', icon: '✨' },
  { key: 'goalMilestones', label: 'Goal Milestones', labelBn: 'গোল মাইলস্টোন', icon: '🏁' },
  { key: 'projectMilestones', label: 'Project Milestones', labelBn: 'প্রজেক্ট মাইলস্টোন', icon: '🚩' },
];

export function RestoreComparisonDialog({ 
  open, 
  onOpenChange, 
  backupData, 
  onRestore,
  restoring 
}: RestoreComparisonDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [comparisons, setComparisons] = useState<DataComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (open && backupData) {
      loadCurrentData();
      // Select all by default
      setSelectedTypes(DATA_TYPES.map(t => t.key));
    }
  }, [open, backupData]);

  const loadCurrentData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [
        tasks, notes, goals, projects, transactions, habits,
        investments, salaries, family, familyEvents, budgets,
        budgetCategories, taskCategories, habitCompletions,
        goalMilestones, projectMilestones
      ] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('investments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('salary_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('family_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('family_events').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('budget_categories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('task_categories').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('habit_completions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('goal_milestones').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('project_milestones').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);

      const currentCounts: Record<string, number> = {
        tasks: tasks.count || 0,
        notes: notes.count || 0,
        goals: goals.count || 0,
        projects: projects.count || 0,
        transactions: transactions.count || 0,
        habits: habits.count || 0,
        investments: investments.count || 0,
        salaries: salaries.count || 0,
        family: family.count || 0,
        familyEvents: familyEvents.count || 0,
        budgets: budgets.count || 0,
        budgetCategories: budgetCategories.count || 0,
        taskCategories: taskCategories.count || 0,
        habitCompletions: habitCompletions.count || 0,
        goalMilestones: goalMilestones.count || 0,
        projectMilestones: projectMilestones.count || 0,
      };

      const newComparisons: DataComparison[] = DATA_TYPES.map(type => {
        const current = currentCounts[type.key] || 0;
        const backup = backupData[type.key]?.length || 0;
        
        let change: 'add' | 'remove' | 'replace' | 'same' = 'same';
        if (current === 0 && backup > 0) change = 'add';
        else if (current > 0 && backup === 0) change = 'remove';
        else if (current !== backup) change = 'replace';

        return {
          type: type.key,
          label: type.label,
          labelBn: type.labelBn,
          current,
          backup,
          change,
        };
      });

      setComparisons(newComparisons);
    } catch (error) {
      console.error('Failed to load current data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const selectAll = () => {
    setSelectedTypes(DATA_TYPES.map(t => t.key));
  };

  const deselectAll = () => {
    setSelectedTypes([]);
  };

  const getChangeIcon = (change: string) => {
    switch (change) {
      case 'add': return <Plus className="h-3 w-3 text-green-500" />;
      case 'remove': return <Minus className="h-3 w-3 text-destructive" />;
      case 'replace': return <ArrowRight className="h-3 w-3 text-yellow-500" />;
      default: return <Check className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getChangeBadge = (change: string) => {
    switch (change) {
      case 'add': return <Badge variant="outline" className="text-green-500 border-green-500/30 text-xs">{language === 'bn' ? 'নতুন' : 'New'}</Badge>;
      case 'remove': return <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">{language === 'bn' ? 'মুছে যাবে' : 'Remove'}</Badge>;
      case 'replace': return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs">{language === 'bn' ? 'প্রতিস্থাপন' : 'Replace'}</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground text-xs">{language === 'bn' ? 'একই' : 'Same'}</Badge>;
    }
  };

  const selectedCount = selectedTypes.length;
  const totalItems = comparisons.filter(c => selectedTypes.includes(c.type)).reduce((sum, c) => sum + c.backup, 0);
  const currentItems = comparisons.filter(c => selectedTypes.includes(c.type)).reduce((sum, c) => sum + c.current, 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {language === 'bn' ? 'পুনরুদ্ধার পূর্বরূপ ও নির্বাচন' : 'Restore Preview & Selection'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {language === 'bn' 
              ? 'কোন ডেটা পুনরুদ্ধার করতে চান তা নির্বাচন করুন। নির্বাচিত ধরনের বিদ্যমান ডেটা মুছে যাবে।'
              : 'Select which data types to restore. Existing data for selected types will be deleted.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-muted-foreground">
              {language === 'bn' ? 'ডেটা তুলনা করা হচ্ছে...' : 'Comparing data...'}
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'ব্যাকআপ তারিখ' : 'Backup Date'}:</span>
                <span className="font-medium">{new Date(backupData.exportedAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'নির্বাচিত ধরন' : 'Selected Types'}:</span>
                <span className="font-medium">{selectedCount} / {DATA_TYPES.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{language === 'bn' ? 'বর্তমান → ব্যাকআপ' : 'Current → Backup'}:</span>
                <span className="font-medium">{currentItems} → {totalItems} {language === 'bn' ? 'আইটেম' : 'items'}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                {language === 'bn' ? 'সব নির্বাচন করুন' : 'Select All'}
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                onClick={deselectAll}
                className="text-xs text-primary hover:underline"
              >
                {language === 'bn' ? 'সব বাদ দিন' : 'Deselect All'}
              </button>
            </div>

            {/* Data Type Selection */}
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {comparisons.map((comp) => {
                  const typeInfo = DATA_TYPES.find(t => t.key === comp.type);
                  const isSelected = selectedTypes.includes(comp.type);
                  
                  return (
                    <div
                      key={comp.type}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isSelected 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-muted/30 border-border'
                      }`}
                    >
                      <Checkbox
                        id={comp.type}
                        checked={isSelected}
                        onCheckedChange={() => toggleType(comp.type)}
                      />
                      <span className="text-lg">{typeInfo?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={comp.type} className="font-medium cursor-pointer">
                          {language === 'bn' ? comp.labelBn : comp.label}
                        </Label>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{comp.current} {language === 'bn' ? 'বর্তমান' : 'current'}</span>
                          {getChangeIcon(comp.change)}
                          <span>{comp.backup} {language === 'bn' ? 'ব্যাকআপে' : 'in backup'}</span>
                        </div>
                      </div>
                      {getChangeBadge(comp.change)}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                {language === 'bn' 
                  ? 'সতর্কতা: নির্বাচিত ধরনের সমস্ত বিদ্যমান ডেটা স্থায়ীভাবে মুছে যাবে এবং ব্যাকআপ থেকে প্রতিস্থাপিত হবে।'
                  : 'Warning: All existing data for selected types will be permanently deleted and replaced from backup.'
                }
              </p>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={restoring}>
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onRestore(selectedTypes)}
            disabled={selectedTypes.length === 0 || restoring || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {restoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'bn' ? 'পুনরুদ্ধার হচ্ছে...' : 'Restoring...'}
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                {language === 'bn' ? `${selectedCount} ধরন পুনরুদ্ধার করুন` : `Restore ${selectedCount} Types`}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
