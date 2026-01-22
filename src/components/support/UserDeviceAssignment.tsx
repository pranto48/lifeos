import { useState } from 'react';
import { Plus, Trash2, HardDrive, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface Device {
  id: string;
  device_name: string;
  device_number?: string | null;
  category_id?: string | null;
  status: string;
  support_user_id?: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface UserDeviceAssignmentProps {
  devices: Device[];
  categories: Category[];
  selectedDeviceIds: string[];
  onChange: (deviceIds: string[]) => void;
}

export function UserDeviceAssignment({ devices, categories, selectedDeviceIds, onChange }: UserDeviceAssignmentProps) {
  const { language } = useLanguage();
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Get available devices (not already selected and not disposed/retired)
  const availableDevices = devices.filter(d => 
    !selectedDeviceIds.includes(d.id) && 
    d.status !== 'disposed' && 
    d.status !== 'retired' &&
    (selectedCategory === 'all' || d.category_id === selectedCategory)
  );

  // Get selected device details
  const selectedDevices = devices.filter(d => selectedDeviceIds.includes(d.id));

  const handleAddDevice = () => {
    if (!selectedDeviceId) return;
    onChange([...selectedDeviceIds, selectedDeviceId]);
    setSelectedDeviceId('');
    setShowAddDevice(false);
  };

  const handleRemoveDevice = (deviceId: string) => {
    onChange(selectedDeviceIds.filter(id => id !== deviceId));
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {language === 'bn' ? 'বরাদ্দকৃত ডিভাইস' : 'Assigned Devices'}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddDevice(true)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          {language === 'bn' ? 'ডিভাইস যোগ করুন' : 'Add Device'}
        </Button>
      </div>

      {selectedDevices.length === 0 && !showAddDevice && (
        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
          <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {language === 'bn' ? 'কোন ডিভাইস বরাদ্দ করা হয়নি' : 'No devices assigned'}
        </div>
      )}

      {selectedDevices.map(device => (
        <Card key={device.id} className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <HardDrive className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{device.device_name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {device.device_number && (
                    <Badge variant="outline" className="text-[10px]">
                      #{device.device_number}
                    </Badge>
                  )}
                  {device.category_id && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {getCategoryName(device.category_id)}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive shrink-0"
                onClick={() => handleRemoveDevice(device.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {showAddDevice && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-3">
            {/* Category Filter */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ক্যাটাগরি ফিল্টার' : 'Filter by Category'}</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Device Selection */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ডিভাইস নির্বাচন করুন' : 'Select Device'} *</Label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'ডিভাইস নির্বাচন করুন' : 'Select a device'} />
                </SelectTrigger>
                <SelectContent>
                  {availableDevices.length === 0 ? (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      {language === 'bn' ? 'কোন উপলব্ধ ডিভাইস নেই' : 'No available devices'}
                    </div>
                  ) : (
                    availableDevices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        <div className="flex items-center gap-2">
                          <span>{device.device_name}</span>
                          {device.device_number && (
                            <span className="text-muted-foreground text-xs">#{device.device_number}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddDevice(false);
                  setSelectedDeviceId('');
                  setSelectedCategory('all');
                }}
                className="h-7 text-xs"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddDevice}
                disabled={!selectedDeviceId}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {language === 'bn' ? 'যোগ করুন' : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
