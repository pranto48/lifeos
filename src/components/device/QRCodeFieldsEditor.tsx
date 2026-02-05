import { useState, useEffect } from 'react';
import { Settings2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export interface QRCodeField {
  key: string;
  label: string;
  labelBn: string;
  enabled: boolean;
}

const DEFAULT_QR_FIELDS: QRCodeField[] = [
  { key: 'device_name', label: 'Device Name', labelBn: 'ডিভাইস নাম', enabled: true },
  { key: 'device_number', label: 'Device Number', labelBn: 'ডিভাইস নম্বর', enabled: true },
  { key: 'serial_number', label: 'Serial Number', labelBn: 'সিরিয়াল নম্বর', enabled: true },
  { key: 'support_user_name', label: 'Assigned User', labelBn: 'বরাদ্দকৃত ব্যবহারকারী', enabled: false },
  { key: 'unit_name', label: 'Unit', labelBn: 'ইউনিট', enabled: false },
  { key: 'department_name', label: 'Department', labelBn: 'বিভাগ', enabled: false },
  { key: 'ip_address', label: 'IP Address', labelBn: 'আইপি ঠিকানা', enabled: false },
  { key: 'warranty_date', label: 'Warranty Date', labelBn: 'ওয়ারেন্টি তারিখ', enabled: false },
  { key: 'purchase_date', label: 'Purchase Date', labelBn: 'ক্রয় তারিখ', enabled: false },
  { key: 'category_name', label: 'Category', labelBn: 'ক্যাটাগরি', enabled: false },
  { key: 'status', label: 'Status', labelBn: 'স্ট্যাটাস', enabled: false },
  { key: 'supplier_name', label: 'Supplier', labelBn: 'সরবরাহকারী', enabled: false },
  { key: 'ram_info', label: 'RAM', labelBn: 'র‍্যাম', enabled: false },
  { key: 'storage_info', label: 'Storage', labelBn: 'স্টোরেজ', enabled: false },
  { key: 'monitor_info', label: 'Monitor', labelBn: 'মনিটর', enabled: false },
];

const STORAGE_KEY = 'qr_code_fields_config';

export function getQRCodeFieldsConfig(): QRCodeField[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return DEFAULT_QR_FIELDS.map(defaultField => {
        const storedField = parsed.find((f: QRCodeField) => f.key === defaultField.key);
        return storedField ? { ...defaultField, enabled: storedField.enabled } : defaultField;
      });
    }
  } catch (e) {
    console.error('Error loading QR fields config:', e);
  }
  return DEFAULT_QR_FIELDS;
}

export function saveQRCodeFieldsConfig(fields: QRCodeField[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
}

interface QRCodeFieldsEditorProps {
  trigger?: React.ReactNode;
  onSettingsChange?: () => void;
}

export function QRCodeFieldsEditor({ trigger, onSettingsChange }: QRCodeFieldsEditorProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<QRCodeField[]>([]);

  useEffect(() => {
    setFields(getQRCodeFieldsConfig());
  }, [open]);

  const handleToggle = (key: string) => {
    setFields(prev =>
      prev.map(field =>
        field.key === key ? { ...field, enabled: !field.enabled } : field
      )
    );
  };

  const handleSave = () => {
    saveQRCodeFieldsConfig(fields);
    toast.success(language === 'bn' ? 'QR কোড সেটিংস সংরক্ষিত হয়েছে' : 'QR code settings saved');
    setOpen(false);
    onSettingsChange?.();
  };

  const handleReset = () => {
    setFields(DEFAULT_QR_FIELDS);
  };

  const enabledCount = fields.filter(f => f.enabled).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7" title={language === 'bn' ? 'QR কোড সেটিংস' : 'QR Code Settings'}>
            <Settings2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {language === 'bn' ? 'QR কোড ফিল্ড সেটিংস' : 'QR Code Field Settings'}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-2">
          {language === 'bn'
            ? `QR কোডে কোন তথ্য দেখাবে তা নির্বাচন করুন (${enabledCount} টি নির্বাচিত)`
            : `Select which information to show in QR codes (${enabledCount} selected)`}
        </div>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {fields.map(field => (
              <div
                key={field.key}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer hover:bg-muted/50 ${
                  field.enabled ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleToggle(field.key)}
              >
                <Checkbox
                  id={field.key}
                  checked={field.enabled}
                  onCheckedChange={() => handleToggle(field.key)}
                />
                <Label htmlFor={field.key} className="flex-1 cursor-pointer text-sm">
                  {language === 'bn' ? field.labelBn : field.label}
                </Label>
                {field.enabled && <Check className="h-4 w-4 text-primary" />}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleReset}>
            {language === 'bn' ? 'রিসেট' : 'Reset to Default'}
          </Button>
          <Button size="sm" onClick={handleSave}>
            {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
