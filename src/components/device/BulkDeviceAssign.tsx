import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, HardDrive, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_name: string;
  device_number?: string | null;
  serial_number?: string | null;
  status: string;
  support_user_id?: string | null;
}

interface SupportUser {
  id: string;
  name: string;
  is_active: boolean;
}

interface BulkDeviceAssignProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: Device[];
  supportUsers: SupportUser[];
  onAssign: (deviceIds: string[], userId: string | null) => Promise<boolean>;
}

export function BulkDeviceAssign({ open, onOpenChange, devices, supportUsers, onAssign }: BulkDeviceAssignProps) {
  const { language } = useLanguage();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('none');
  const [isAssigning, setIsAssigning] = useState(false);

  const availableDevices = devices.filter(d => d.status !== 'disposed' && d.status !== 'retired');

  const handleSelectAll = () => {
    if (selectedDevices.length === availableDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(availableDevices.map(d => d.id));
    }
  };

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleAssign = async () => {
    if (selectedDevices.length === 0) {
      toast.error(language === 'bn' ? 'অন্তত একটি ডিভাইস নির্বাচন করুন' : 'Select at least one device');
      return;
    }

    setIsAssigning(true);
    try {
      const success = await onAssign(
        selectedDevices, 
        selectedUser === 'none' ? null : selectedUser
      );
      
      if (success) {
        toast.success(
          language === 'bn' 
            ? `${selectedDevices.length}টি ডিভাইস বরাদ্দ হয়েছে` 
            : `${selectedDevices.length} devices assigned`
        );
        setSelectedDevices([]);
        setSelectedUser('none');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(language === 'bn' ? 'বরাদ্দ করতে ব্যর্থ' : 'Failed to assign');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedDevices([]);
    setSelectedUser('none');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'bn' ? 'ব্যাচ ডিভাইস বরাদ্দ' : 'Bulk Device Assignment'}
          </DialogTitle>
          <DialogDescription>
            {language === 'bn' 
              ? 'একাধিক ডিভাইস একসাথে একজন ব্যবহারকারীকে বরাদ্দ করুন'
              : 'Assign multiple devices to a user at once'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === 'bn' ? 'ব্যবহারকারী নির্বাচন করুন' : 'Select User'}
            </label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী নির্বাচন' : 'Select user'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {language === 'bn' ? 'বরাদ্দ সরান (আনঅ্যাসাইন)' : 'Remove Assignment (Unassign)'}
                </SelectItem>
                {supportUsers.filter(u => u.is_active).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Device Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {language === 'bn' ? 'ডিভাইস নির্বাচন করুন' : 'Select Devices'}
              </label>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedDevices.length === availableDevices.length 
                  ? (language === 'bn' ? 'সব বাতিল করুন' : 'Deselect All')
                  : (language === 'bn' ? 'সব নির্বাচন করুন' : 'Select All')
                }
              </Button>
            </div>
            
            <ScrollArea className="h-[300px] border rounded-lg p-2">
              <div className="space-y-2">
                {availableDevices.map(device => (
                  <div 
                    key={device.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedDevices.includes(device.id) 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleDevice(device.id)}
                  >
                    <Checkbox 
                      checked={selectedDevices.includes(device.id)}
                      onCheckedChange={() => toggleDevice(device.id)}
                    />
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{device.device_name}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {device.device_number && <span>#{device.device_number}</span>}
                        {device.serial_number && <span>SN: {device.serial_number}</span>}
                      </div>
                    </div>
                    {device.support_user_id && (
                      <Badge variant="outline" className="text-[10px]">
                        {language === 'bn' ? 'বরাদ্দ' : 'Assigned'}
                      </Badge>
                    )}
                  </div>
                ))}
                {availableDevices.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {language === 'bn' ? 'কোন ডিভাইস উপলব্ধ নেই' : 'No devices available'}
                  </div>
                )}
              </div>
            </ScrollArea>

            {selectedDevices.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedDevices.length} {language === 'bn' ? 'টি ডিভাইস নির্বাচিত' : 'devices selected'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={selectedDevices.length === 0 || isAssigning}
          >
            {isAssigning ? (
              <span className="animate-pulse">{language === 'bn' ? 'বরাদ্দ হচ্ছে...' : 'Assigning...'}</span>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                {language === 'bn' ? 'বরাদ্দ করুন' : 'Assign'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
