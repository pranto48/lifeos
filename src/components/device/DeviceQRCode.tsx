import { useState, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer, ExternalLink } from 'lucide-react';
import { QRCodePrintDialog } from './QRCodePrintDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { getQRCodeFieldsConfig, QRCodeFieldsEditor } from './QRCodeFieldsEditor';
import { format } from 'date-fns';

interface DeviceQRCodeProps {
  device: {
    id: string;
    device_name: string;
    device_number?: string | null;
    serial_number?: string | null;
    warranty_date?: string | null;
    purchase_date?: string | null;
    status?: string;
    ram_info?: string | null;
    storage_info?: string | null;
    monitor_info?: string | null;
    supplier_name?: string | null;
    // Optional nested objects (may not always be available)
    support_user?: {
      name: string;
      ip_address?: string | null;
      department?: {
        name: string;
        unit?: {
          name: string;
        };
      };
    } | null;
    category?: {
      name: string;
    } | null;
  };
  // Allow passing related data separately for when device doesn't have nested objects
  supportUserName?: string;
  supportUserIp?: string;
  departmentName?: string;
  unitName?: string;
  categoryName?: string;
}

export function DeviceQRCode({ 
  device, 
  supportUserName,
  supportUserIp,
  departmentName,
  unitName,
  categoryName 
}: DeviceQRCodeProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0);

  const handleSettingsChange = useCallback(() => {
    setSettingsVersion(v => v + 1);
  }, []);

   // Build device profile URL
   const getDeviceProfileUrl = () => {
     if (!device.device_number) return null;
     const baseUrl = window.location.origin;
     return `${baseUrl}/device/${encodeURIComponent(device.device_number)}`;
   };
 
  // Helper to get values from nested objects or passed props
  const getUserName = () => device.support_user?.name || supportUserName || null;
  const getUserIp = () => device.support_user?.ip_address || supportUserIp || null;
  const getDeptName = () => device.support_user?.department?.name || departmentName || null;
  const getUnitName = () => device.support_user?.department?.unit?.name || unitName || null;
  const getCategoryName = () => device.category?.name || categoryName || null;

   // Build QR data - now uses URL instead of JSON
  const qrData = useMemo(() => {
     // If device has a device_number, use URL format
     const profileUrl = getDeviceProfileUrl();
     if (profileUrl) {
       return profileUrl;
     }
 
     // Fallback to JSON format if no device number
    const fields = getQRCodeFieldsConfig();
    const enabledFields = fields.filter(f => f.enabled);
    
    const data: Record<string, string> = {};
    
    enabledFields.forEach(field => {
      switch (field.key) {
        case 'device_name':
          data.name = device.device_name;
          break;
        case 'device_number':
          if (device.device_number) data.device_no = device.device_number;
          break;
        case 'serial_number':
          if (device.serial_number) data.serial = device.serial_number;
          break;
        case 'support_user_name':
          const userName = getUserName();
          if (userName) data.user = userName;
          break;
        case 'unit_name':
          const uName = getUnitName();
          if (uName) data.unit = uName;
          break;
        case 'department_name':
          const dName = getDeptName();
          if (dName) data.dept = dName;
          break;
        case 'ip_address':
          const ip = getUserIp();
          if (ip) data.ip = ip;
          break;
        case 'warranty_date':
          if (device.warranty_date) data.warranty = format(new Date(device.warranty_date), 'dd/MM/yyyy');
          break;
        case 'purchase_date':
          if (device.purchase_date) data.purchased = format(new Date(device.purchase_date), 'dd/MM/yyyy');
          break;
        case 'category_name':
          const catName = getCategoryName();
          if (catName) data.category = catName;
          break;
        case 'status':
          if (device.status) data.status = device.status;
          break;
        case 'supplier_name':
          if (device.supplier_name) data.supplier = device.supplier_name;
          break;
        case 'ram_info':
          if (device.ram_info) data.ram = device.ram_info;
          break;
        case 'storage_info':
          if (device.storage_info) data.storage = device.storage_info;
          break;
        case 'monitor_info':
          if (device.monitor_info) data.monitor = device.monitor_info;
          break;
      }
    });

    // Always include ID for identification
    data.id = device.id;
    
    return JSON.stringify(data);
  }, [device, supportUserName, supportUserIp, departmentName, unitName, categoryName, open, settingsVersion]);

   const profileUrl = getDeviceProfileUrl();
 
  // Build display info for the dialog
  const displayInfo = useMemo(() => {
    const fields = getQRCodeFieldsConfig();
    const enabledFields = fields.filter(f => f.enabled);
    const info: { label: string; value: string }[] = [];

    enabledFields.forEach(field => {
      const label = language === 'bn' ? field.labelBn : field.label;
      let value: string | null = null;

      switch (field.key) {
        case 'device_name':
          value = device.device_name;
          break;
        case 'device_number':
          value = device.device_number || null;
          break;
        case 'serial_number':
          value = device.serial_number || null;
          break;
        case 'support_user_name':
          value = getUserName();
          break;
        case 'unit_name':
          value = getUnitName();
          break;
        case 'department_name':
          value = getDeptName();
          break;
        case 'ip_address':
          value = getUserIp();
          break;
        case 'warranty_date':
          value = device.warranty_date ? format(new Date(device.warranty_date), 'dd MMM yyyy') : null;
          break;
        case 'purchase_date':
          value = device.purchase_date ? format(new Date(device.purchase_date), 'dd MMM yyyy') : null;
          break;
        case 'category_name':
          value = getCategoryName();
          break;
        case 'status':
          value = device.status || null;
          break;
        case 'supplier_name':
          value = device.supplier_name || null;
          break;
        case 'ram_info':
          value = device.ram_info || null;
          break;
        case 'storage_info':
          value = device.storage_info || null;
          break;
        case 'monitor_info':
          value = device.monitor_info || null;
          break;
      }

      if (value) {
        info.push({ label, value });
      }
    });

    return info;
  }, [device, language, supportUserName, supportUserIp, departmentName, unitName, categoryName, open, settingsVersion]);

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${device.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `device-${device.device_number || device.id}.png`;
      link.href = pngUrl;
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    setPrintOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setOpen(true)}
        title={language === 'bn' ? 'QR কোড দেখুন' : 'View QR Code'}
      >
        <QrCode className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {language === 'bn' ? 'ডিভাইস QR কোড' : 'Device QR Code'}
              </span>
              <QRCodeFieldsEditor onSettingsChange={handleSettingsChange} />
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                id={`qr-${device.id}`}
                value={qrData}
                size={200}
                level="H"
                includeMargin
              />
            </div>

            <div className="text-center space-y-1 w-full">
               {profileUrl && (
                 <a 
                   href={profileUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                 >
                   <ExternalLink className="h-3 w-3" />
                   {language === 'bn' ? 'প্রোফাইল দেখুন' : 'View Profile'}
                 </a>
               )}
              <p className="font-medium text-sm">{device.device_name}</p>
              {displayInfo.slice(1, 4).map((item, idx) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  {item.label}: {item.value}
                </p>
              ))}
              {displayInfo.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{displayInfo.length - 4} {language === 'bn' ? 'আরও ফিল্ড' : 'more fields'}
                </p>
              )}
            </div>

            <div className="flex gap-2">
               {profileUrl && (
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => window.open(profileUrl, '_blank')}
                 >
                   <ExternalLink className="h-4 w-4 mr-1" />
                   {language === 'bn' ? 'খুলুন' : 'Open'}
                 </Button>
               )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                {language === 'bn' ? 'ডাউনলোড' : 'Download'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                {language === 'bn' ? 'প্রিন্ট' : 'Print'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <QRCodePrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        deviceName={device.device_name}
        qrSvgId={`qr-${device.id}`}
        displayInfo={displayInfo}
      />
    </>
  );
}
