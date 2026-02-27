import { useState, useRef } from 'react';
import { Download, Upload, FileJson, FileCode, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { exportData, importData, downloadBlob, type ExportFormat, EXPORT_PRESETS } from '@/lib/dataExportImport';

interface DataExportImportButtonProps {
  /** Which preset to export/import (e.g. 'tasks', 'notes', 'devices') */
  preset: string;
  /** Optional custom label */
  label?: string;
}

export function DataExportImportButton({ preset, label }: DataExportImportButtonProps) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = EXPORT_PRESETS[preset];
  const displayLabel = label || config?.label || preset;

  const handleExport = async (format: ExportFormat) => {
    if (!user) return;
    setExporting(format);
    try {
      const { blob, filename } = await exportData(preset, user.id, format);
      downloadBlob(blob, filename);
      toast.success(`${displayLabel} exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.xml')) {
      toast.error('Please select a JSON or XML file');
      return;
    }

    setImporting(true);
    setProgressMsg('Reading file...');
    setImportResult(null);

    try {
      const result = await importData(file, user.id, (msg) => setProgressMsg(msg));
      setImportResult(result);
      setShowResult(true);

      if (result.errors.length === 0) {
        toast.success(`Imported ${result.imported} items successfully`);
        // Trigger page reload after import
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.warning(`Imported ${result.imported} items with ${result.errors.length} errors`);
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      setProgressMsg('');
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!!exporting || importing}>
            {exporting || importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {importing ? progressMsg || 'Importing...' : exporting ? 'Exporting...' : 'Export / Import'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Export {displayLabel}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleExport('json')}>
            <FileJson className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('xml')}>
            <FileCode className="h-4 w-4 mr-2" />
            Export as XML
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Import {displayLabel}</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Import from JSON / XML
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Import Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult?.errors.length ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <Check className="h-5 w-5 text-green-500" />
              )}
              Import Result
            </DialogTitle>
            <DialogDescription>
              {importResult?.imported || 0} items imported
              {importResult?.errors.length ? ` with ${importResult.errors.length} error(s)` : ' successfully'}
            </DialogDescription>
          </DialogHeader>
          {importResult?.errors.length ? (
            <div className="max-h-48 overflow-auto text-sm space-y-1">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-destructive text-xs">{err}</p>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
