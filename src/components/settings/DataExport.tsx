import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function DataExport() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchAllData = async () => {
    const [tasks, notes, transactions, goals, investments, projects, salaries, habits, family, familyEvents] = await Promise.all([
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
      exportedAt: new Date().toISOString(),
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
            ${data.habits.map((h: any) => `<tr><td>${h.name}</td><td>${h.frequency || 'daily'}</td><td>${new Date(h.created_at).toLocaleDateString()}</td></tr>`).join('')}
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

  return (
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

        <div className="pt-4 border-t border-border">
          <Label htmlFor="import-file" className="text-sm font-medium">
            {language === 'bn' ? 'JSON ব্যাকআপ ইমপোর্ট করুন' : 'Import JSON Backup'}
          </Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={importJSON}
              disabled={importing}
              className="flex-1"
            />
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'bn' 
              ? 'দ্রষ্টব্য: ইমপোর্ট করা ডেটা বিদ্যমান ডেটার সাথে যুক্ত হবে, প্রতিস্থাপিত হবে না।'
              : 'Note: Imported data will be added to existing data, not replaced.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
