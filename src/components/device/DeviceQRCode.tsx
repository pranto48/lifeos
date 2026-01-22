import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeviceQRCodeProps {
  device: {
    id: string;
    device_name: string;
    device_number?: string | null;
    serial_number?: string | null;
  };
}

export function DeviceQRCode({ device }: DeviceQRCodeProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  // Generate QR data - includes device ID, number, and serial for identification
  const qrData = JSON.stringify({
    id: device.id,
    device_number: device.device_number || '',
    serial_number: device.serial_number || '',
    name: device.device_name,
  });

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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = document.getElementById(`qr-${device.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${device.device_name}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            h2 { margin-bottom: 10px; font-size: 18px; }
            p { margin: 5px 0; font-size: 14px; color: #666; }
            .qr { margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${device.device_name}</h2>
            ${device.device_number ? `<p><strong>Device #:</strong> ${device.device_number}</p>` : ''}
            ${device.serial_number ? `<p><strong>Serial:</strong> ${device.serial_number}</p>` : ''}
            <div class="qr">${svgData}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {language === 'bn' ? 'ডিভাইস QR কোড' : 'Device QR Code'}
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

            <div className="text-center space-y-1">
              <p className="font-medium text-sm">{device.device_name}</p>
              {device.device_number && (
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'ডিভাইস নম্বর' : 'Device #'}: {device.device_number}
                </p>
              )}
              {device.serial_number && (
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'সিরিয়াল' : 'Serial'}: {device.serial_number}
                </p>
              )}
            </div>

            <div className="flex gap-2">
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
    </>
  );
}
