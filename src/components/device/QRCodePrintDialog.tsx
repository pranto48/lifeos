import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PrintInfo {
  label: string;
  value: string;
}

type PrintSize = 'small' | 'medium' | 'large';

interface PrintSizeConfig {
  label: string;
  labelBn: string;
  description: string;
  descriptionBn: string;
  qrSize: number; // px in print
  width: string; // mm
  height: string; // mm
  fontSize: string;
  showInfo: boolean;
  maxInfoLines: number;
}

const PRINT_SIZES: Record<PrintSize, PrintSizeConfig> = {
  small: {
    label: 'Small Sticker',
    labelBn: 'ছোট স্টিকার',
    description: '50×25mm – Device label',
    descriptionBn: '৫০×২৫মিমি – ডিভাইস লেবেল',
    qrSize: 60,
    width: '50mm',
    height: '25mm',
    fontSize: '6px',
    showInfo: true,
    maxInfoLines: 2,
  },
  medium: {
    label: 'Medium Label',
    labelBn: 'মাঝারি লেবেল',
    description: '70×40mm – Asset tag',
    descriptionBn: '৭০×৪০মিমি – অ্যাসেট ট্যাগ',
    qrSize: 90,
    width: '70mm',
    height: '40mm',
    fontSize: '8px',
    showInfo: true,
    maxInfoLines: 4,
  },
  large: {
    label: 'Large Card',
    labelBn: 'বড় কার্ড',
    description: '90×55mm – Full details',
    descriptionBn: '৯০×৫৫মিমি – সম্পূর্ণ বিবরণ',
    qrSize: 120,
    width: '90mm',
    height: '55mm',
    fontSize: '9px',
    showInfo: true,
    maxInfoLines: 8,
  },
};

interface QRCodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  qrSvgId: string;
  displayInfo: PrintInfo[];
}

export function QRCodePrintDialog({
  open,
  onOpenChange,
  deviceName,
  qrSvgId,
  displayInfo,
}: QRCodePrintDialogProps) {
  const { language } = useLanguage();
  const [size, setSize] = useState<PrintSize>('medium');

  const handlePrint = () => {
    const svg = document.getElementById(qrSvgId);
    if (!svg) {
      console.error('QR SVG element not found:', qrSvgId);
      return;
    }

    const config = PRINT_SIZES[size];
    const svgClone = svg.cloneNode(true) as Element;
    const svgData = new XMLSerializer().serializeToString(svgClone);

    const visibleInfo = displayInfo.slice(0, config.maxInfoLines);
    const infoHtml = config.showInfo
      ? visibleInfo
          .map(
            (item) =>
              `<p style="margin:1px 0;font-size:${config.fontSize};color:#333;"><strong>${item.label}:</strong> ${item.value}</p>`
          )
          .join('')
      : '';

    const htmlContent = `<!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${deviceName}</title>
          <style>
            @page { size: ${config.width} ${config.height}; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: ${config.width};
              height: ${config.height};
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
              padding: 2mm;
            }
            .card {
              display: flex;
              align-items: center;
              gap: ${size === 'small' ? '2mm' : '3mm'};
              width: 100%;
              height: 100%;
            }
            .qr svg { 
              width: ${config.qrSize}px; 
              height: ${config.qrSize}px; 
            }
            .info { 
              flex: 1; 
              min-width: 0; 
              overflow: hidden; 
            }
            .name {
              font-weight: 700;
              font-size: ${size === 'small' ? '7px' : size === 'medium' ? '9px' : '11px'};
              margin-bottom: 1px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="qr">${svgData}</div>
            <div class="info">
              <div class="name">${deviceName}</div>
              ${infoHtml}
            </div>
          </div>
        </body>
      </html>`;

    // Use iframe approach to avoid popup blockers
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Printer className="h-4 w-4" />
            {language === 'bn' ? 'প্রিন্ট সাইজ' : 'Print Size'}
          </DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={size}
          onValueChange={(v) => setSize(v as PrintSize)}
          className="space-y-2"
        >
          {(Object.entries(PRINT_SIZES) as [PrintSize, PrintSizeConfig][]).map(
            ([key, config]) => (
              <label
                key={key}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  size === key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <RadioGroupItem value={key} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {language === 'bn' ? config.labelBn : config.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? config.descriptionBn : config.description}
                  </p>
                </div>
              </label>
            )
          )}
        </RadioGroup>

        <Button onClick={handlePrint} className="w-full mt-2">
          <Printer className="h-4 w-4 mr-2" />
          {language === 'bn' ? 'প্রিন্ট করুন' : 'Print'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
