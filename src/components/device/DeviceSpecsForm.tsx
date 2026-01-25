import { useState, useEffect } from 'react';
import { Plus, X, Cpu, HardDrive, Monitor, Headphones, Video, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeviceSpecs {
  ram_info: string;
  storage_info: string;
  has_ups: boolean;
  ups_info: string;
  monitor_info: string;
  webcam_info: string;
  headset_info: string;
  custom_specs: Record<string, string>;
}

interface DeviceSpecsFormProps {
  categoryName: string | null;
  specs: DeviceSpecs;
  onChange: (specs: DeviceSpecs) => void;
}

// Categories that show hardware specs
const COMPUTER_CATEGORIES = [
  'Desktop',
  'Desktop Clone PC',
  'Desktop Clone',
  'Clone PC',
  'Laptop',
  'Notebook',
  'Computer',
  'PC',
  'Workstation',
  'All-in-One',
];

export function DeviceSpecsForm({ categoryName, specs, onChange }: DeviceSpecsFormProps) {
  const { language } = useLanguage();
  const [newCustomField, setNewCustomField] = useState('');
  const [newCustomValue, setNewCustomValue] = useState('');

  // Check if this category should show hardware specs
  const showHardwareSpecs = categoryName && COMPUTER_CATEGORIES.some(
    cat => categoryName.toLowerCase().includes(cat.toLowerCase())
  );

  if (!showHardwareSpecs) {
    return null;
  }

  const handleAddCustomField = () => {
    if (!newCustomField.trim()) return;
    onChange({
      ...specs,
      custom_specs: {
        ...specs.custom_specs,
        [newCustomField.trim()]: newCustomValue.trim(),
      },
    });
    setNewCustomField('');
    setNewCustomValue('');
  };

  const handleRemoveCustomField = (key: string) => {
    const newSpecs = { ...specs.custom_specs };
    delete newSpecs[key];
    onChange({ ...specs, custom_specs: newSpecs });
  };

  const handleCustomFieldChange = (key: string, value: string) => {
    onChange({
      ...specs,
      custom_specs: {
        ...specs.custom_specs,
        [key]: value,
      },
    });
  };

  return (
    <Card className="md:col-span-2 bg-muted/30 border-dashed">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Cpu className="h-4 w-4" />
          {language === 'bn' ? 'হার্ডওয়্যার স্পেসিফিকেশন' : 'Hardware Specifications'}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* RAM */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" />
              {language === 'bn' ? 'RAM' : 'RAM'}
            </Label>
            <Input
              value={specs.ram_info}
              onChange={(e) => onChange({ ...specs, ram_info: e.target.value })}
              placeholder={language === 'bn' ? '8GB DDR4' : '8GB DDR4'}
              className="text-sm"
            />
          </div>

          {/* Storage */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              {language === 'bn' ? 'স্টোরেজ' : 'Storage'}
            </Label>
            <Input
              value={specs.storage_info}
              onChange={(e) => onChange({ ...specs, storage_info: e.target.value })}
              placeholder={language === 'bn' ? '256GB SSD + 1TB HDD' : '256GB SSD + 1TB HDD'}
              className="text-sm"
            />
          </div>

          {/* Monitor */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              {language === 'bn' ? 'মনিটর' : 'Monitor'}
            </Label>
            <Input
              value={specs.monitor_info}
              onChange={(e) => onChange({ ...specs, monitor_info: e.target.value })}
              placeholder={language === 'bn' ? 'Dell 24" FHD' : 'Dell 24" FHD'}
              className="text-sm"
            />
          </div>

          {/* UPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                {language === 'bn' ? 'UPS আছে' : 'Has UPS'}
              </Label>
              <Switch
                checked={specs.has_ups}
                onCheckedChange={(checked) => onChange({ ...specs, has_ups: checked })}
              />
            </div>
            {specs.has_ups && (
              <Input
                value={specs.ups_info}
                onChange={(e) => onChange({ ...specs, ups_info: e.target.value })}
                placeholder={language === 'bn' ? 'APC 650VA' : 'APC 650VA'}
                className="text-sm"
              />
            )}
          </div>

          {/* Webcam */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" />
              {language === 'bn' ? 'ওয়েবক্যাম' : 'Webcam'}
            </Label>
            <Input
              value={specs.webcam_info}
              onChange={(e) => onChange({ ...specs, webcam_info: e.target.value })}
              placeholder={language === 'bn' ? 'Logitech C920' : 'Logitech C920'}
              className="text-sm"
            />
          </div>

          {/* Headset */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Headphones className="h-3.5 w-3.5" />
              {language === 'bn' ? 'হেডসেট' : 'Headset'}
            </Label>
            <Input
              value={specs.headset_info}
              onChange={(e) => onChange({ ...specs, headset_info: e.target.value })}
              placeholder={language === 'bn' ? 'Jabra Evolve2 40' : 'Jabra Evolve2 40'}
              className="text-sm"
            />
          </div>
        </div>

        {/* Custom Fields */}
        <div className="space-y-3 pt-2 border-t border-dashed">
          <Label className="text-xs text-muted-foreground">
            {language === 'bn' ? 'কাস্টম ফিল্ড' : 'Custom Fields'}
          </Label>

          {/* Existing custom fields */}
          {Object.entries(specs.custom_specs || {}).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Input
                value={key}
                disabled
                className="text-sm flex-1 bg-muted"
              />
              <Input
                value={value}
                onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                className="text-sm flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleRemoveCustomField(key)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Add new custom field */}
          <div className="flex items-center gap-2">
            <Input
              value={newCustomField}
              onChange={(e) => setNewCustomField(e.target.value)}
              placeholder={language === 'bn' ? 'ফিল্ড নাম' : 'Field name'}
              className="text-sm flex-1"
            />
            <Input
              value={newCustomValue}
              onChange={(e) => setNewCustomValue(e.target.value)}
              placeholder={language === 'bn' ? 'মান' : 'Value'}
              className="text-sm flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleAddCustomField}
              disabled={!newCustomField.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
