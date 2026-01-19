import { useState, useEffect, useRef } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Upload, Loader2, Calendar, Clock, Database, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, addDays, addWeeks, addMonths, startOfDay } from 'date-fns';

interface BackupSchedule {
  id: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  last_backup_at: string | null;
  next_backup_at: string;
  is_active: boolean;
}

export function DataExport() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [frequency, setFrequency] = useState<string>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(0); // Sunday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<any>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadBackupSchedule();
  }, [user]);

  const loadBackupSchedule = async () => {
    if (!user) return;
    setLoadingSchedule(true);
    try {
      const { data, error } = await supabase
        .from('backup_schedules')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSchedule(data);
        setFrequency(data.frequency);
        setDayOfWeek(data.day_of_week ?? 0);
        setDayOfMonth(data.day_of_month ?? 1);
        setIsActive(data.is_active);
      }
    } catch (error) {
      console.error('Failed to load backup schedule:', error);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const calculateNextBackup = (freq: string, dow: number, dom: number): Date => {
    const now = new Date();
    const today = startOfDay(now);
    
    if (freq === 'daily') {
      return addDays(today, 1);
    } else if (freq === 'weekly') {
      const currentDay = today.getDay();
      const daysUntil = dow >= currentDay ? dow - currentDay : 7 - (currentDay - dow);
      return addDays(today, daysUntil === 0 ? 7 : daysUntil);
    } else if (freq === 'monthly') {
      const nextMonth = addMonths(today, today.getDate() >= dom ? 1 : 0);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), dom);
    }
    return addWeeks(today, 1);
  };

  const saveBackupSchedule = async () => {
    if (!user) return;
    setSavingSchedule(true);
    try {
      const nextBackup = calculateNextBackup(frequency, dayOfWeek, dayOfMonth);
      
      const scheduleData = {
        user_id: user.id,
        frequency,
        day_of_week: frequency === 'weekly' ? dayOfWeek : null,
        day_of_month: frequency === 'monthly' ? dayOfMonth : null,
        next_backup_at: nextBackup.toISOString(),
        is_active: isActive,
      };

      if (schedule?.id) {
        const { error } = await supabase
          .from('backup_schedules')
          .update(scheduleData)
          .eq('id', schedule.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('backup_schedules')
          .insert(scheduleData);
        
        if (error) throw error;
      }

      await loadBackupSchedule();
      toast({
        title: language === 'bn' ? 'সেটিংস সেভ হয়েছে' : 'Settings Saved',
        description: language === 'bn' 
          ? 'ব্যাকআপ শিডিউল আপডেট হয়েছে।'
          : 'Backup schedule has been updated.',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const runManualBackup = async () => {
    setExporting('manual');
    try {
      const data = await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Update last backup timestamp if schedule exists
      if (schedule?.id) {
        const nextBackup = calculateNextBackup(frequency, dayOfWeek, dayOfMonth);
        await supabase
          .from('backup_schedules')
          .update({ 
            last_backup_at: new Date().toISOString(),
            next_backup_at: nextBackup.toISOString()
          })
          .eq('id', schedule.id);
        await loadBackupSchedule();
      }

      toast({ 
        title: language === 'bn' ? 'ব্যাকআপ সম্পন্ন' : 'Backup Complete',
        description: language === 'bn' ? 'ডাটাবেস ব্যাকআপ ডাউনলোড হয়েছে।' : 'Database backup has been downloaded.'
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const fetchAllData = async () => {
    const [
      tasks, notes, transactions, goals, investments, projects, 
      salaries, habits, family, familyEvents, budgets, budgetCategories,
      taskCategories, habitCompletions, goalMilestones, projectMilestones
    ] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user?.id),
      supabase.from('notes').select('id, title, content, tags, is_pinned, is_favorite, is_vault, note_type, created_at, updated_at').eq('user_id', user?.id),
      supabase.from('transactions').select('*').eq('user_id', user?.id),
      supabase.from('goals').select('*').eq('user_id', user?.id),
      supabase.from('investments').select('*').eq('user_id', user?.id),
      supabase.from('projects').select('*').eq('user_id', user?.id),
      supabase.from('salary_entries').select('*').eq('user_id', user?.id),
      supabase.from('habits').select('*').eq('user_id', user?.id),
      supabase.from('family_members').select('*').eq('user_id', user?.id),
      supabase.from('family_events').select('*').eq('user_id', user?.id),
      supabase.from('budgets').select('*').eq('user_id', user?.id),
      supabase.from('budget_categories').select('*').eq('user_id', user?.id),
      supabase.from('task_categories').select('*').eq('user_id', user?.id),
      supabase.from('habit_completions').select('*').eq('user_id', user?.id),
      supabase.from('goal_milestones').select('*').eq('user_id', user?.id),
      supabase.from('project_milestones').select('*').eq('user_id', user?.id),
    ]);

    return {
      tasks: tasks.data || [],
      notes: notes.data?.map(n => ({ ...n, content: n.is_vault ? '[ENCRYPTED]' : n.content })) || [],
      transactions: transactions.data || [],
      goals: goals.data || [],
      investments: investments.data || [],
      projects: projects.data || [],
      salaries: salaries.data || [],
      habits: habits.data || [],
      family: family.data || [],
      familyEvents: familyEvents.data || [],
      budgets: budgets.data || [],
      budgetCategories: budgetCategories.data || [],
      taskCategories: taskCategories.data || [],
      habitCompletions: habitCompletions.data || [],
      goalMilestones: goalMilestones.data || [],
      projectMilestones: projectMilestones.data || [],
      exportedAt: new Date().toISOString(),
      version: '2.0',
    };
  };

  const exportJSON = async () => {
    setExporting('json');
    try {
      const data = await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ 
        title: language === 'bn' ? 'JSON এক্সপোর্ট সম্পন্ন' : 'JSON Export Complete',
        description: language === 'bn' ? 'আপনার ডেটা ডাউনলোড হয়েছে।' : 'Your data has been downloaded.'
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const exportCSV = async () => {
    setExporting('csv');
    try {
      const data = await fetchAllData();
      
      // Helper to convert array to CSV
      const arrayToCSV = (arr: any[], name: string) => {
        if (!arr.length) return '';
        const headers = Object.keys(arr[0]);
        const rows = arr.map(obj => 
          headers.map(h => {
            const val = obj[h];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return JSON.stringify(val).replace(/"/g, '""');
            return String(val).replace(/"/g, '""');
          }).map(v => `"${v}"`).join(',')
        );
        return `--- ${name} ---\n${headers.join(',')}\n${rows.join('\n')}\n\n`;
      };

      let csvContent = '';
      csvContent += arrayToCSV(data.tasks, 'Tasks');
      csvContent += arrayToCSV(data.notes, 'Notes');
      csvContent += arrayToCSV(data.transactions, 'Transactions');
      csvContent += arrayToCSV(data.goals, 'Goals');
      csvContent += arrayToCSV(data.investments, 'Investments');
      csvContent += arrayToCSV(data.projects, 'Projects');
      csvContent += arrayToCSV(data.salaries, 'Salary Entries');
      csvContent += arrayToCSV(data.habits, 'Habits');
      csvContent += arrayToCSV(data.family, 'Family Members');
      csvContent += arrayToCSV(data.familyEvents, 'Family Events');
      csvContent += arrayToCSV(data.budgets, 'Budgets');
      csvContent += arrayToCSV(data.budgetCategories, 'Budget Categories');
      csvContent += arrayToCSV(data.taskCategories, 'Task Categories');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos-backup-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ 
        title: language === 'bn' ? 'CSV এক্সপোর্ট সম্পন্ন' : 'CSV Export Complete',
        description: language === 'bn' ? 'আপনার ডেটা ডাউনলোড হয়েছে।' : 'Your data has been downloaded.'
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const exportPDF = async () => {
    setExporting('pdf');
    try {
      const data = await fetchAllData();
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>LifeOS Export - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
            h2 { color: #4f46e5; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f3f4f6; }
            .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .summary-item { display: inline-block; margin-right: 30px; }
            .count { font-size: 24px; font-weight: bold; color: #7c3aed; }
          </style>
        </head>
        <body>
          <h1>LifeOS Data Export</h1>
          <p>Exported on: ${new Date().toLocaleString()}</p>
          
          <div class="summary">
            <div class="summary-item"><span class="count">${data.tasks.length}</span> Tasks</div>
            <div class="summary-item"><span class="count">${data.notes.length}</span> Notes</div>
            <div class="summary-item"><span class="count">${data.goals.length}</span> Goals</div>
            <div class="summary-item"><span class="count">${data.transactions.length}</span> Transactions</div>
            <div class="summary-item"><span class="count">${data.habits.length}</span> Habits</div>
            <div class="summary-item"><span class="count">${data.family.length}</span> Family Members</div>
          </div>

          <h2>Tasks (${data.tasks.length})</h2>
          <table>
            <tr><th>Title</th><th>Status</th><th>Priority</th><th>Due Date</th></tr>
            ${data.tasks.map((t: any) => `<tr><td>${t.title}</td><td>${t.status || '-'}</td><td>${t.priority || '-'}</td><td>${t.due_date || '-'}</td></tr>`).join('')}
          </table>

          <h2>Goals (${data.goals.length})</h2>
          <table>
            <tr><th>Title</th><th>Status</th><th>Target Date</th><th>Progress</th></tr>
            ${data.goals.map((g: any) => `<tr><td>${g.title}</td><td>${g.status || '-'}</td><td>${g.target_date || '-'}</td><td>${g.target_amount ? `${g.current_amount || 0}/${g.target_amount}` : '-'}</td></tr>`).join('')}
          </table>

          <h2>Notes (${data.notes.length})</h2>
          <table>
            <tr><th>Title</th><th>Type</th><th>Created</th></tr>
            ${data.notes.map((n: any) => `<tr><td>${n.title}</td><td>${n.note_type || '-'}</td><td>${new Date(n.created_at).toLocaleDateString()}</td></tr>`).join('')}
          </table>

          <h2>Transactions (${data.transactions.length})</h2>
          <table>
            <tr><th>Description</th><th>Type</th><th>Amount</th><th>Date</th></tr>
            ${data.transactions.slice(0, 50).map((t: any) => `<tr><td>${t.description || '-'}</td><td>${t.type}</td><td>${t.amount}</td><td>${t.date}</td></tr>`).join('')}
            ${data.transactions.length > 50 ? `<tr><td colspan="4">... and ${data.transactions.length - 50} more transactions</td></tr>` : ''}
          </table>

          <h2>Habits (${data.habits.length})</h2>
          <table>
            <tr><th>Name</th><th>Frequency</th><th>Created</th></tr>
            ${data.habits.map((h: any) => `<tr><td>${h.title}</td><td>${h.frequency || 'daily'}</td><td>${new Date(h.created_at).toLocaleDateString()}</td></tr>`).join('')}
          </table>

          <h2>Family Members (${data.family.length})</h2>
          <table>
            <tr><th>Name</th><th>Relationship</th><th>DOB</th></tr>
            ${data.family.map((f: any) => `<tr><td>${f.name}</td><td>${f.relationship}</td><td>${f.date_of_birth || '-'}</td></tr>`).join('')}
          </table>
        </body>
        </html>
      `;

      // Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }

      toast({ 
        title: language === 'bn' ? 'PDF রেডি' : 'PDF Ready',
        description: language === 'bn' ? 'প্রিন্ট ডায়ালগ থেকে PDF সেভ করুন।' : 'Save as PDF from the print dialog.'
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.exportedAt) {
        throw new Error('Invalid backup file format');
      }

      // Show confirmation
      const confirmed = window.confirm(
        language === 'bn' 
          ? `এই ব্যাকআপ ইমপোর্ট করতে চান?\n\nকাজ: ${data.tasks?.length || 0}\nনোট: ${data.notes?.length || 0}\nগোল: ${data.goals?.length || 0}\nলেনদেন: ${data.transactions?.length || 0}\n\nবিদ্যমান ডেটা প্রতিস্থাপিত হবে না।`
          : `Import this backup?\n\nTasks: ${data.tasks?.length || 0}\nNotes: ${data.notes?.length || 0}\nGoals: ${data.goals?.length || 0}\nTransactions: ${data.transactions?.length || 0}\n\nExisting data will not be replaced.`
      );

      if (!confirmed) {
        setImporting(false);
        return;
      }

      // Import data (note: this is additive, not replacing)
      let imported = 0;

      // Import tasks
      if (data.tasks?.length) {
        const { error } = await supabase.from('tasks').insert(
          data.tasks.map((t: any) => ({
            ...t,
            id: undefined, // Generate new ID
            user_id: user?.id,
            created_at: undefined,
            updated_at: undefined
          }))
        );
        if (!error) imported += data.tasks.length;
      }

      // Import goals
      if (data.goals?.length) {
        const { error } = await supabase.from('goals').insert(
          data.goals.map((g: any) => ({
            ...g,
            id: undefined,
            user_id: user?.id,
            created_at: undefined,
            updated_at: undefined
          }))
        );
        if (!error) imported += data.goals.length;
      }

      toast({ 
        title: language === 'bn' ? 'ইমপোর্ট সম্পন্ন' : 'Import Complete',
        description: language === 'bn' ? `${imported} আইটেম ইমপোর্ট হয়েছে।` : `${imported} items imported.`
      });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to import data', 
        variant: 'destructive' 
      });
    } finally {
      setImporting(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.exportedAt) {
        throw new Error('Invalid backup file format');
      }

      setPendingRestoreData(data);
      setRestoreDialogOpen(true);
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to read backup file', 
        variant: 'destructive' 
      });
    } finally {
      // Reset input
      e.target.value = '';
    }
  };

  const executeRestore = async () => {
    if (!pendingRestoreData || !user) return;

    setRestoring(true);
    setRestoreDialogOpen(false);
    
    try {
      const data = pendingRestoreData;
      
      // Delete all existing data first (in order to avoid foreign key issues)
      // Delete dependent tables first
      await Promise.all([
        supabase.from('task_checklists').delete().eq('user_id', user.id),
        supabase.from('habit_completions').delete().eq('user_id', user.id),
        supabase.from('goal_milestones').delete().eq('user_id', user.id),
        supabase.from('project_milestones').delete().eq('user_id', user.id),
      ]);

      // Delete main tables
      await Promise.all([
        supabase.from('tasks').delete().eq('user_id', user.id),
        supabase.from('notes').delete().eq('user_id', user.id),
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('goals').delete().eq('user_id', user.id),
        supabase.from('investments').delete().eq('user_id', user.id),
        supabase.from('projects').delete().eq('user_id', user.id),
        supabase.from('salary_entries').delete().eq('user_id', user.id),
        supabase.from('habits').delete().eq('user_id', user.id),
        supabase.from('family_events').delete().eq('user_id', user.id),
        supabase.from('budgets').delete().eq('user_id', user.id),
      ]);

      // Delete categories after budgets/tasks that reference them
      await Promise.all([
        supabase.from('budget_categories').delete().eq('user_id', user.id),
        supabase.from('task_categories').delete().eq('user_id', user.id),
        supabase.from('family_members').delete().eq('user_id', user.id),
      ]);

      let restored = 0;

      // Restore budget categories first (needed for transactions and budgets)
      if (data.budgetCategories?.length) {
        const { error } = await supabase.from('budget_categories').insert(
          data.budgetCategories.map((c: any) => ({
            ...c,
            user_id: user.id,
          }))
        );
        if (!error) restored += data.budgetCategories.length;
      }

      // Restore task categories (needed for tasks)
      if (data.taskCategories?.length) {
        const { error } = await supabase.from('task_categories').insert(
          data.taskCategories.map((c: any) => ({
            ...c,
            user_id: user.id,
          }))
        );
        if (!error) restored += data.taskCategories.length;
      }

      // Restore family members (needed for family events)
      if (data.family?.length) {
        const { error } = await supabase.from('family_members').insert(
          data.family.map((f: any) => ({
            ...f,
            user_id: user.id,
          }))
        );
        if (!error) restored += data.family.length;
      }

      // Restore goals (needed for milestones)
      if (data.goals?.length) {
        const { error } = await supabase.from('goals').insert(
          data.goals.map((g: any) => ({
            ...g,
            user_id: user.id,
          }))
        );
        if (!error) restored += data.goals.length;
      }

      // Restore projects (needed for milestones and tasks)
      if (data.projects?.length) {
        const { error } = await supabase.from('projects').insert(
          data.projects.map((p: any) => ({
            ...p,
            user_id: user.id,
          }))
        );
        if (!error) restored += data.projects.length;
      }

      // Restore habits (needed for completions)
      if (data.habits?.length) {
        const { error } = await supabase.from('habits').insert(
          data.habits.map((h: any) => ({
            ...h,
            user_id: user.id,
          }))
        );
        if (!error) restored += data.habits.length;
      }

      // Restore tasks
      if (data.tasks?.length) {
        const { error } = await supabase.from('tasks').insert(
          data.tasks.map((t: any) => ({
            ...t,
            user_id: user.id,
          }))
        );
        if (!error) restored += data.tasks.length;
      }

      // Restore notes (excluding encrypted content for vault notes)
      if (data.notes?.length) {
        const { error } = await supabase.from('notes').insert(
          data.notes.map((n: any) => ({
            ...n,
            user_id: user.id,
            content: n.is_vault ? null : n.content,
          }))
        );
        if (!error) restored += data.notes.length;
      }

      // Restore remaining main data
      const restorePromises = [];

      if (data.transactions?.length) {
        restorePromises.push(
          supabase.from('transactions').insert(
            data.transactions.map((t: any) => ({ ...t, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.transactions.length; })
        );
      }

      if (data.investments?.length) {
        restorePromises.push(
          supabase.from('investments').insert(
            data.investments.map((i: any) => ({ ...i, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.investments.length; })
        );
      }

      if (data.salaries?.length) {
        restorePromises.push(
          supabase.from('salary_entries').insert(
            data.salaries.map((s: any) => ({ ...s, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.salaries.length; })
        );
      }

      if (data.familyEvents?.length) {
        restorePromises.push(
          supabase.from('family_events').insert(
            data.familyEvents.map((e: any) => ({ ...e, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.familyEvents.length; })
        );
      }

      if (data.budgets?.length) {
        restorePromises.push(
          supabase.from('budgets').insert(
            data.budgets.map((b: any) => ({ ...b, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.budgets.length; })
        );
      }

      // Restore dependent data (milestones, completions)
      if (data.goalMilestones?.length) {
        restorePromises.push(
          supabase.from('goal_milestones').insert(
            data.goalMilestones.map((m: any) => ({ ...m, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.goalMilestones.length; })
        );
      }

      if (data.projectMilestones?.length) {
        restorePromises.push(
          supabase.from('project_milestones').insert(
            data.projectMilestones.map((m: any) => ({ ...m, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.projectMilestones.length; })
        );
      }

      if (data.habitCompletions?.length) {
        restorePromises.push(
          supabase.from('habit_completions').insert(
            data.habitCompletions.map((c: any) => ({ ...c, user_id: user.id }))
          ).then(({ error }) => { if (!error) restored += data.habitCompletions.length; })
        );
      }

      await Promise.all(restorePromises);

      toast({ 
        title: language === 'bn' ? 'পুনরুদ্ধার সম্পন্ন' : 'Restore Complete',
        description: language === 'bn' 
          ? `${restored} আইটেম পুনরুদ্ধার হয়েছে। পেজ রিফ্রেশ করুন।`
          : `${restored} items restored. Please refresh the page.`
      });

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to restore data', 
        variant: 'destructive' 
      });
    } finally {
      setRestoring(false);
      setPendingRestoreData(null);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesBn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  return (
    <div className="space-y-6">
      {/* Database Backup Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="h-5 w-5" /> 
            {language === 'bn' ? 'ডাটাবেস ব্যাকআপ' : 'Database Backup'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Backup */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <h4 className="font-medium text-foreground">
                {language === 'bn' ? 'সম্পূর্ণ ব্যাকআপ নিন' : 'Create Full Backup'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' 
                  ? 'সমস্ত ডেটা সহ একটি সম্পূর্ণ ব্যাকআপ ফাইল ডাউনলোড করুন।'
                  : 'Download a complete backup file with all your data.'
                }
              </p>
            </div>
            <Button 
              onClick={runManualBackup} 
              disabled={exporting === 'manual'}
              className="flex items-center gap-2"
            >
              {exporting === 'manual' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {language === 'bn' ? 'ব্যাকআপ নিন' : 'Backup Now'}
            </Button>
          </div>

          {/* Backup Status */}
          {schedule && (
            <div className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {language === 'bn' ? 'ব্যাকআপ স্ট্যাটাস' : 'Backup Status'}
                </h4>
                <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                  {schedule.is_active 
                    ? (language === 'bn' ? 'সক্রিয়' : 'Active') 
                    : (language === 'bn' ? 'বন্ধ' : 'Inactive')
                  }
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{language === 'bn' ? 'শেষ ব্যাকআপ:' : 'Last Backup:'}</span>
                  <p className="font-medium">
                    {schedule.last_backup_at 
                      ? format(new Date(schedule.last_backup_at), 'PPp')
                      : (language === 'bn' ? 'এখনো হয়নি' : 'Never')
                    }
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{language === 'bn' ? 'পরবর্তী ব্যাকআপ:' : 'Next Backup:'}</span>
                  <p className="font-medium">
                    {format(new Date(schedule.next_backup_at), 'PPp')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {language === 'bn' ? 'স্বয়ংক্রিয় ব্যাকআপ শিডিউল' : 'Automatic Backup Schedule'}
              </h4>
              <div className="flex items-center gap-2">
                <Label htmlFor="backup-active" className="text-sm">
                  {language === 'bn' ? 'সক্রিয়' : 'Enabled'}
                </Label>
                <Switch
                  id="backup-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'ফ্রিকোয়েন্সি' : 'Frequency'}</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{language === 'bn' ? 'প্রতিদিন' : 'Daily'}</SelectItem>
                    <SelectItem value="weekly">{language === 'bn' ? 'সাপ্তাহিক' : 'Weekly'}</SelectItem>
                    <SelectItem value="monthly">{language === 'bn' ? 'মাসিক' : 'Monthly'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>{language === 'bn' ? 'দিন' : 'Day'}</Label>
                  <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayNames.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {language === 'bn' ? dayNamesBn[i] : day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>{language === 'bn' ? 'তারিখ' : 'Day of Month'}</Label>
                  <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button 
              onClick={saveBackupSchedule} 
              disabled={savingSchedule || loadingSchedule}
              className="w-full sm:w-auto"
            >
              {savingSchedule ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {language === 'bn' ? 'শিডিউল সেভ করুন' : 'Save Schedule'}
            </Button>

            <p className="text-xs text-muted-foreground">
              {language === 'bn' 
                ? 'দ্রষ্টব্য: স্বয়ংক্রিয় ব্যাকআপ শুধুমাত্র অ্যাপ খোলা থাকলে কাজ করবে। নির্ধারিত সময়ে ব্যাকআপ রিমাইন্ডার পাবেন।'
                : 'Note: Automatic backups will remind you when the app is open at the scheduled time.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Export & Import Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Download className="h-5 w-5" /> 
            {language === 'bn' ? 'ডেটা এক্সপোর্ট ও ইমপোর্ট' : 'Data Export & Import'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {language === 'bn' 
              ? 'আপনার সমস্ত ডেটা বিভিন্ন ফরম্যাটে এক্সপোর্ট করুন বা পূর্বের ব্যাকআপ থেকে ইমপোর্ট করুন।'
              : 'Export all your data in various formats or import from a previous backup.'
            }
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              onClick={exportJSON} 
              disabled={exporting !== null}
              className="flex items-center gap-2"
            >
              {exporting === 'json' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              JSON
            </Button>
            <Button 
              variant="outline" 
              onClick={exportCSV} 
              disabled={exporting !== null}
              className="flex items-center gap-2"
            >
              {exporting === 'csv' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={exportPDF} 
              disabled={exporting !== null}
              className="flex items-center gap-2"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              PDF
            </Button>
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            {/* Additive Import */}
            <div>
              <Label htmlFor="import-file" className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {language === 'bn' ? 'JSON ব্যাকআপ ইমপোর্ট করুন (যোগ করুন)' : 'Import JSON Backup (Add)'}
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={importJSON}
                  disabled={importing || restoring}
                  className="flex-1"
                />
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' 
                  ? 'ইমপোর্ট করা ডেটা বিদ্যমান ডেটার সাথে যুক্ত হবে।'
                  : 'Imported data will be added to existing data.'
                }
              </p>
            </div>

            {/* Full Restore */}
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Label htmlFor="restore-file" className="text-sm font-medium flex items-center gap-2 text-destructive">
                <RotateCcw className="h-4 w-4" />
                {language === 'bn' ? 'সম্পূর্ণ পুনরুদ্ধার (সবকিছু প্রতিস্থাপন করুন)' : 'Full Restore (Replace All Data)'}
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  id="restore-file"
                  ref={restoreInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFileSelect}
                  disabled={importing || restoring}
                  className="flex-1"
                />
                {restoring && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-xs text-destructive/80 mt-1 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                {language === 'bn' 
                  ? 'সতর্কতা: এটি আপনার সমস্ত বিদ্যমান ডেটা মুছে ফেলবে এবং ব্যাকআপ থেকে প্রতিস্থাপন করবে!'
                  : 'Warning: This will DELETE all your existing data and replace with backup!'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === 'bn' ? 'সম্পূর্ণ পুনরুদ্ধার নিশ্চিত করুন' : 'Confirm Full Restore'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {language === 'bn' 
                  ? 'এই অপারেশন আপনার সমস্ত বিদ্যমান ডেটা স্থায়ীভাবে মুছে ফেলবে এবং নির্বাচিত ব্যাকআপ ফাইল থেকে প্রতিস্থাপন করবে।'
                  : 'This operation will permanently DELETE all your existing data and replace it with the selected backup file.'
                }
              </p>
              {pendingRestoreData && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium mb-2">
                    {language === 'bn' ? 'ব্যাকআপ তথ্য:' : 'Backup Info:'}
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>{language === 'bn' ? 'তারিখ' : 'Date'}: {new Date(pendingRestoreData.exportedAt).toLocaleString()}</li>
                    <li>{language === 'bn' ? 'কাজ' : 'Tasks'}: {pendingRestoreData.tasks?.length || 0}</li>
                    <li>{language === 'bn' ? 'নোট' : 'Notes'}: {pendingRestoreData.notes?.length || 0}</li>
                    <li>{language === 'bn' ? 'গোল' : 'Goals'}: {pendingRestoreData.goals?.length || 0}</li>
                    <li>{language === 'bn' ? 'প্রজেক্ট' : 'Projects'}: {pendingRestoreData.projects?.length || 0}</li>
                    <li>{language === 'bn' ? 'লেনদেন' : 'Transactions'}: {pendingRestoreData.transactions?.length || 0}</li>
                    <li>{language === 'bn' ? 'অভ্যাস' : 'Habits'}: {pendingRestoreData.habits?.length || 0}</li>
                  </ul>
                </div>
              )}
              <p className="font-semibold text-destructive">
                {language === 'bn' 
                  ? 'এই অপারেশন পূর্বাবস্থায় ফেরানো যাবে না!'
                  : 'This action cannot be undone!'
                }
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'হ্যাঁ, সম্পূর্ণ পুনরুদ্ধার করুন' : 'Yes, Full Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
