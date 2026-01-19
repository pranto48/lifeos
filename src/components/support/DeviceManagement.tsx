import { useState } from 'react';
import { Plus, Trash2, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export interface DeviceEntry {
  id?: string;
  device_name: string;
  device_handover_date: string;
  notes: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface DeviceManagementProps {
  devices: DeviceEntry[];
  onChange: (devices: DeviceEntry[]) => void;
  language?: 'en' | 'bn';
}

export function DeviceManagement({ devices, onChange, language = 'en' }: DeviceManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState<DeviceEntry>({
    device_name: '',
    device_handover_date: '',
    notes: '',
    isNew: true,
  });

  const handleAddDevice = () => {
    if (!newDevice.device_name.trim()) return;
    
    onChange([...devices, { ...newDevice, id: `temp-${Date.now()}` }]);
    setNewDevice({
      device_name: '',
      device_handover_date: '',
      notes: '',
      isNew: true,
    });
    setShowAddForm(false);
  };

  const handleRemoveDevice = (index: number) => {
    const device = devices[index];
    if (device.id && !device.isNew) {
      // Mark existing device as deleted
      const updated = [...devices];
      updated[index] = { ...device, isDeleted: true };
      onChange(updated);
    } else {
      // Remove new device entirely
      onChange(devices.filter((_, i) => i !== index));
    }
  };

  const activeDevices = devices.filter(d => !d.isDeleted);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {language === 'bn' ? 'ডিভাইস তালিকা' : 'Device List'}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          {language === 'bn' ? 'ডিভাইস যোগ করুন' : 'Add Device'}
        </Button>
      </div>

      {activeDevices.length === 0 && !showAddForm && (
        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
          <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {language === 'bn' ? 'কোন ডিভাইস যোগ করা হয়নি' : 'No devices added yet'}
        </div>
      )}

      {activeDevices.map((device, index) => {
        const realIndex = devices.findIndex(d => d === device || (d.id === device.id && !d.isDeleted));
        return (
          <Card key={device.id || index} className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <HardDrive className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{device.device_name}</p>
                  {device.device_handover_date && (
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' ? 'হ্যান্ডওভার' : 'Handover'}: {format(new Date(device.device_handover_date), 'dd MMM yyyy')}
                    </p>
                  )}
                  {device.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{device.notes}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive shrink-0"
                  onClick={() => handleRemoveDevice(realIndex)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {showAddForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ডিভাইস নাম/মডেল' : 'Device Name/Model'} *</Label>
              <Input
                value={newDevice.device_name}
                onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })}
                placeholder={language === 'bn' ? 'ল্যাপটপ, ডেস্কটপ, মডেল নম্বর' : 'Laptop, Desktop, Model number'}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'হ্যান্ডওভার তারিখ' : 'Handover Date'}</Label>
              <Input
                type="date"
                value={newDevice.device_handover_date}
                onChange={(e) => setNewDevice({ ...newDevice, device_handover_date: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'নোট' : 'Notes'}</Label>
              <Input
                value={newDevice.notes}
                onChange={(e) => setNewDevice({ ...newDevice, notes: e.target.value })}
                placeholder={language === 'bn' ? 'সিরিয়াল নম্বর, অবস্থা' : 'Serial number, condition'}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
                className="h-7 text-xs"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddDevice}
                disabled={!newDevice.device_name.trim()}
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
